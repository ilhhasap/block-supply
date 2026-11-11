import { createHash } from "node:crypto";
import { getCookie } from "@tanstack/react-start/server";
import { BLOCKS } from "@/data/blocks";
import { openDeviceId } from "@/lib/copy-cookie";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";

const KNOWN = new Set(BLOCKS.map((block) => block.id));
const DEVICE_COOKIE = "supply_device";

/**
 * Log one successful copy. Only counts a signed-in user or a device the copy gate has already
 * seen, and only for real block ids, so the numbers cannot be padded from outside.
 */
export async function recordCopy(blockId: unknown): Promise<{ ok: boolean }> {
  if (typeof blockId !== "string" || !KNOWN.has(blockId)) return { ok: false };
  const user = await getSessionUser();
  const device = openDeviceId(getCookie(DEVICE_COOKIE));
  if (!user && !device) return { ok: false };
  const actor = user
    ? `u:${user.id}`
    : `d:${createHash("sha256").update(device as string).digest("hex").slice(0, 16)}`;
  const sql = await getSql();
  await sql.query("insert into copy_events (block_id, user_id, actor) values ($1, $2, $3)", [
    blockId,
    user?.id ?? null,
    actor,
  ]);
  return { ok: true };
}

/** Who may open the stats page: the emails in ADMIN_EMAILS, and (in production) only if verified. */
async function isAdmin(userId: string): Promise<boolean> {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return false;
  const sql = await getSql();
  const rows = await sql.query<{ email: string; emailVerified: boolean }>(
    'select email, "emailVerified" from "user" where id = $1',
    [userId],
  );
  const row = rows[0];
  if (!row) return false;
  const verified = row.emailVerified || process.env.NODE_ENV !== "production";
  return verified && allowed.includes(row.email.toLowerCase());
}

export type Stats = {
  totals: { users: number; copies: number; copies7d: number; copiesToday: number; anonymousCopiers: number; savedBlocks: number };
  topBlocks: { id: string; name: string; count: number }[];
  perDay: { day: string; count: number }[];
  users: { id: string; name: string; email: string; provider: string; joined: string; copies: number }[];
};

export async function getStats(userId: string): Promise<Stats> {
  if (!(await isAdmin(userId))) throw new Error("Not found");
  const sql = await getSql();
  const num = (value: unknown) => Number(value ?? 0);

  const totalsRow = (
    await sql.query<Record<string, unknown>>(`
      select
        (select count(*) from "user") as users,
        (select count(*) from copy_events) as copies,
        (select count(*) from copy_events where created_at > now() - interval '7 days') as copies7d,
        (select count(*) from copy_events where created_at >= date_trunc('day', now())) as copies_today,
        (select count(distinct actor) from copy_events where user_id is null) as anonymous_copiers,
        (select count(*) from saved_blocks) as saved_blocks
    `)
  )[0] ?? {};

  const top = await sql.query<{ block_id: string; n: string }>(
    "select block_id, count(*) as n from copy_events group by block_id order by n desc, block_id limit 20",
  );
  const names = new Map(BLOCKS.map((block) => [block.id, block.name]));

  const days = await sql.query<{ day: string; n: string }>(`
    select to_char(d::date, 'YYYY-MM-DD') as day, coalesce(c.n, 0) as n
    from generate_series(now()::date - 13, now()::date, interval '1 day') as d
    left join (
      select created_at::date as day, count(*) as n from copy_events
      where created_at > now() - interval '14 days' group by 1
    ) c on c.day = d::date
    order by d
  `);

  const users = await sql.query<{ id: string; name: string; email: string; provider: string | null; joined: string; copies: string }>(`
    select u.id, u.name, u.email,
      (select a."providerId" from "account" a where a."userId" = u.id order by a."createdAt" limit 1) as provider,
      to_char(u."createdAt" at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as joined,
      (select count(*) from copy_events c where c.user_id = u.id) as copies
    from "user" u order by u."createdAt" desc limit 200
  `);

  return {
    totals: {
      users: num(totalsRow.users),
      copies: num(totalsRow.copies),
      copies7d: num(totalsRow.copies7d),
      copiesToday: num(totalsRow.copies_today),
      anonymousCopiers: num(totalsRow.anonymous_copiers),
      savedBlocks: num(totalsRow.saved_blocks),
    },
    topBlocks: top.map((row) => ({ id: row.block_id, name: names.get(row.block_id) ?? row.block_id, count: num(row.n) })),
    perDay: days.map((row) => ({ day: row.day, count: num(row.n) })),
    users: users.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      provider: row.provider === "credential" ? "email" : (row.provider ?? "email"),
      joined: row.joined,
      copies: num(row.copies),
    })),
  };
}
