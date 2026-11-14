import { createHash } from "node:crypto";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { BLOCKS } from "@/data/blocks";
import { FREE_COPIES } from "@/lib/copy-limit";
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


/** A short browser label for the failures table, e.g. "Chrome 157 · macOS". */
function browserOf(agent: string | undefined): string {
  if (!agent) return "unknown";
  const pick = (re: RegExp) => agent.match(re)?.[1];
  const name =
    (pick(/Edg\/(\d+)/) && `Edge ${pick(/Edg\/(\d+)/)}`) ||
    (pick(/Firefox\/(\d+)/) && `Firefox ${pick(/Firefox\/(\d+)/)}`) ||
    (pick(/Chrome\/(\d+)/) && `Chrome ${pick(/Chrome\/(\d+)/)}`) ||
    (pick(/Version\/(\d+)[^ ]* .*Safari/) && `Safari ${pick(/Version\/(\d+)[^ ]* .*Safari/)}`) ||
    "other";
  const os = /iPhone|iPad/.test(agent) ? "iOS" : /Android/.test(agent) ? "Android" : /Mac OS X/.test(agent) ? "macOS" : /Windows/.test(agent) ? "Windows" : /Linux/.test(agent) ? "Linux" : "";
  return os ? `${name} · ${os}` : name;
}

/**
 * Log one failed copy. Open to anyone (the visitor is the one who sees the failure), so it is capped
 * per visitor and per hour, only accepts real block ids and keeps a short message.
 */
export async function recordCopyFailure(blockId: unknown, message: unknown): Promise<{ ok: boolean }> {
  if (typeof blockId !== "string" || !KNOWN.has(blockId)) return { ok: false };
  const text = (typeof message === "string" ? message : "").replace(/\s+/g, " ").trim().slice(0, 160) || "unknown";
  const user = await getSessionUser();
  const device = openDeviceId(getCookie(DEVICE_COOKIE));
  const actor = user
    ? `u:${user.id}`
    : device
      ? `d:${createHash("sha256").update(device).digest("hex").slice(0, 16)}`
      : "anon";
  const sql = await getSql();
  const recent = await sql.query<{ n: string }>(
    "select count(*) as n from copy_failures where actor = $1 and created_at > now() - interval '1 hour'",
    [actor],
  );
  if (Number(recent[0]?.n ?? 0) >= (actor === "anon" ? 200 : 30)) return { ok: false };
  await sql.query("insert into copy_failures (block_id, user_id, actor, message, browser) values ($1, $2, $3, $4, $5)", [
    blockId,
    user?.id ?? null,
    actor,
    text,
    browserOf(getRequestHeader("user-agent")),
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

/** Date ranges the dashboard offers, in days; 0 is "all time" (charts then show the last 26 weeks). */
export const RANGES = [7, 30, 90, 0] as const;
export type Range = (typeof RANGES)[number];

export type Dashboard = {
  range: Range;
  /** Days shown in the charts. */
  days: number;
  generatedAt: string;
  /** Each pair is the current period and the one before it (null for all time). */
  kpis: {
    members: { total: number; now: number; prev: number | null };
    copies: { now: number; prev: number | null };
    copiers: { now: number; prev: number | null };
    saves: { now: number; prev: number | null };
    failures: { now: number; prev: number | null };
  };
  series: { day: string; copies: number; copiers: number; signups: number; saves: number; failures: number }[];
  funnel: { anonymousCopiers: number; reachedLimit: number; signedUp: number; signedUpCopied: number };
  blocks: { id: string; name: string; cat: string; copies: number; total: number; copiers: number; saves: number; failures: number; last: string | null }[];
  members: { id: string; name: string; email: string; provider: string; verified: boolean; joined: string; last: string | null; copies: number; total: number; saves: number }[];
  recent: { at: string; blockId: string; blockName: string; member: string | null }[];
  failures: { at: string; blockId: string; blockName: string; message: string; browser: string; member: string | null }[];
  reasons: { message: string; count: number }[];
};

const DAY = 86_400_000;

export async function getDashboard(userId: string, range: Range): Promise<Dashboard> {
  if (!(await isAdmin(userId))) throw new Error("Not found");
  if (!RANGES.includes(range)) throw new Error("Bad range");
  const sql = await getSql();
  const num = (value: unknown) => Number(value ?? 0);
  const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);

  // Whole UTC days, so "last 7 days" always means seven bars.
  const today = new Date(Math.floor(Date.now() / DAY) * DAY);
  const days = range === 0 ? 182 : range;
  const start = new Date(today.getTime() - (days - 1) * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  // The charts show a window of days; every other number covers the whole range (all time starts at 0).
  const windowIso = start.toISOString();
  const startIso = (range === 0 ? new Date(0) : start).toISOString();
  const prevIso = prevStart.toISOString();
  const compare = range !== 0;

  const names = new Map(BLOCKS.map((block) => [block.id, block.name]));

  // Current period and the one before it, for the headline numbers.
  const copies = (
    await sql.query<Record<string, unknown>>(
      `select
         count(*) filter (where created_at >= $1::timestamptz) as now,
         count(*) filter (where created_at >= $2::timestamptz and created_at < $1::timestamptz) as prev,
         count(distinct actor) filter (where created_at >= $1::timestamptz) as copiers_now,
         count(distinct actor) filter (where created_at >= $2::timestamptz and created_at < $1::timestamptz) as copiers_prev
       from copy_events`,
      [startIso, prevIso],
    )
  )[0] ?? {};
  const members = (
    await sql.query<Record<string, unknown>>(
      `select count(*) as total,
         count(*) filter (where "createdAt" >= $1::timestamptz) as now,
         count(*) filter (where "createdAt" >= $2::timestamptz and "createdAt" < $1::timestamptz) as prev
       from "user"`,
      [startIso, prevIso],
    )
  )[0] ?? {};
  const saves = (
    await sql.query<Record<string, unknown>>(
      `select count(*) filter (where created_at >= $1::timestamptz) as now,
         count(*) filter (where created_at >= $2::timestamptz and created_at < $1::timestamptz) as prev
       from saved_blocks`,
      [startIso, prevIso],
    )
  )[0] ?? {};
  const failed = (
    await sql.query<Record<string, unknown>>(
      `select count(*) filter (where created_at >= $1::timestamptz) as now,
         count(*) filter (where created_at >= $2::timestamptz and created_at < $1::timestamptz) as prev
       from copy_failures`,
      [startIso, prevIso],
    )
  )[0] ?? {};

  const perDay = await sql.query<Record<string, unknown>>(
    `select to_char(d::date, 'YYYY-MM-DD') as day,
       coalesce(c.copies, 0) as copies, coalesce(c.copiers, 0) as copiers,
       coalesce(u.n, 0) as signups, coalesce(s.n, 0) as saves, coalesce(f.n, 0) as failures
     from generate_series($1::date, $1::date + ($2::int - 1), interval '1 day') as d
     left join (select (created_at at time zone 'UTC')::date as day, count(*) as copies, count(distinct actor) as copiers
                from copy_events where created_at >= $1::timestamptz group by 1) c on c.day = d::date
     left join (select ("createdAt" at time zone 'UTC')::date as day, count(*) as n
                from "user" where "createdAt" >= $1::timestamptz group by 1) u on u.day = d::date
     left join (select (created_at at time zone 'UTC')::date as day, count(*) as n
                from saved_blocks where created_at >= $1::timestamptz group by 1) s on s.day = d::date
     left join (select (created_at at time zone 'UTC')::date as day, count(*) as n
                from copy_failures where created_at >= $1::timestamptz group by 1) f on f.day = d::date
     order by d`,
    [windowIso, days],
  );

  const funnelRow = (
    await sql.query<Record<string, unknown>>(
      `select
         (select count(distinct actor) from copy_events where user_id is null and created_at >= $1::timestamptz) as anonymous,
         (select count(*) from (select actor from copy_events where user_id is null group by actor
            having count(*) >= $2 and max(created_at) >= $1::timestamptz) x) as reached,
         (select count(*) from "user" where "createdAt" >= $1::timestamptz) as signed_up,
         (select count(distinct e.user_id) from copy_events e join "user" u on u.id = e.user_id
            where u."createdAt" >= $1::timestamptz and e.created_at >= $1::timestamptz) as signed_up_copied`,
      [startIso, FREE_COPIES],
    )
  )[0] ?? {};

  const copyRows = await sql.query<Record<string, unknown>>(
    `select block_id, count(*) filter (where created_at >= $1::timestamptz) as cur, count(*) as total,
       count(distinct actor) filter (where created_at >= $1::timestamptz) as copiers, max(created_at) as last
     from copy_events group by block_id`,
    [startIso],
  );
  const saveRows = await sql.query<Record<string, unknown>>(
    "select block_id, count(*) filter (where created_at >= $1::timestamptz) as cur, count(*) as total from saved_blocks group by block_id",
    [startIso],
  );
  const failRows = await sql.query<Record<string, unknown>>(
    "select block_id, count(*) filter (where created_at >= $1::timestamptz) as cur from copy_failures group by block_id",
    [startIso],
  );
  const byCopy = new Map(copyRows.map((row) => [String(row.block_id), row]));
  const bySave = new Map(saveRows.map((row) => [String(row.block_id), row]));
  const byFail = new Map(failRows.map((row) => [String(row.block_id), row]));

  const memberRows = await sql.query<Record<string, unknown>>(
    `select u.id, u.name, u.email, u."emailVerified" as verified, u."createdAt" as joined,
       (select a."providerId" from "account" a where a."userId" = u.id order by a."createdAt" limit 1) as provider,
       c.cur, c.total, c.last, s.total as saves
     from "user" u
     left join (select user_id, count(*) filter (where created_at >= $1::timestamptz) as cur, count(*) as total, max(created_at) as last
                from copy_events where user_id is not null group by user_id) c on c.user_id = u.id
     left join (select user_id, count(*) as total from saved_blocks group by user_id) s on s.user_id = u.id
     order by u."createdAt" desc limit 500`,
    [startIso],
  );

  const recentRows = await sql.query<Record<string, unknown>>(
    `select e.created_at, e.block_id, u.name from copy_events e left join "user" u on u.id = e.user_id
     order by e.created_at desc limit 60`,
  );
  const failureRows = await sql.query<Record<string, unknown>>(
    `select f.created_at, f.block_id, f.message, f.browser, u.name from copy_failures f left join "user" u on u.id = f.user_id
     order by f.created_at desc limit 40`,
  );
  const reasonRows = await sql.query<Record<string, unknown>>(
    `select message, count(*) as n from copy_failures where created_at >= $1::timestamptz
     group by message order by n desc, message limit 8`,
    [startIso],
  );

  const pair = (row: Record<string, unknown>, now = "now", prev = "prev") => ({
    now: num(row[now]),
    prev: compare ? num(row[prev]) : null,
  });

  return {
    range,
    days,
    generatedAt: new Date().toISOString(),
    kpis: {
      members: { total: num(members.total), ...pair(members) },
      copies: pair(copies),
      copiers: pair(copies, "copiers_now", "copiers_prev"),
      saves: pair(saves),
      failures: pair(failed),
    },
    series: perDay.map((row) => ({
      day: String(row.day),
      copies: num(row.copies),
      copiers: num(row.copiers),
      signups: num(row.signups),
      saves: num(row.saves),
      failures: num(row.failures),
    })),
    funnel: {
      anonymousCopiers: num(funnelRow.anonymous),
      reachedLimit: num(funnelRow.reached),
      signedUp: num(funnelRow.signed_up),
      signedUpCopied: num(funnelRow.signed_up_copied),
    },
    blocks: BLOCKS.map((block) => ({
      id: block.id,
      name: block.name,
      cat: block.cat,
      copies: num(byCopy.get(block.id)?.cur),
      total: num(byCopy.get(block.id)?.total),
      copiers: num(byCopy.get(block.id)?.copiers),
      saves: num(bySave.get(block.id)?.total),
      failures: num(byFail.get(block.id)?.cur),
      last: iso(byCopy.get(block.id)?.last),
    })),
    members: memberRows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      provider: row.provider === "credential" || !row.provider ? "email" : String(row.provider),
      verified: Boolean(row.verified),
      joined: iso(row.joined) ?? "",
      last: iso(row.last),
      copies: num(row.cur),
      total: num(row.total),
      saves: num(row.saves),
    })),
    recent: recentRows.map((row) => ({
      at: iso(row.created_at) ?? "",
      blockId: String(row.block_id),
      blockName: names.get(String(row.block_id)) ?? String(row.block_id),
      member: row.name ? String(row.name) : null,
    })),
    failures: failureRows.map((row) => ({
      at: iso(row.created_at) ?? "",
      blockId: String(row.block_id),
      blockName: names.get(String(row.block_id)) ?? String(row.block_id),
      message: String(row.message),
      browser: String(row.browser ?? "unknown"),
      member: row.name ? String(row.name) : null,
    })),
    reasons: reasonRows.map((row) => ({ message: String(row.message), count: num(row.n) })),
  };
}
