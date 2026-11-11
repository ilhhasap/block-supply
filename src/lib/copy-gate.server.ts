import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { hashIp, newDeviceId, openDeviceId } from "@/lib/copy-cookie";
import { FREE_COPIES, FREE_COPIES_PER_IP, IP_WINDOW_DAYS } from "@/lib/copy-limit";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getSql, type Sql } from "@/lib/db";

const COOKIE = "supply_device";
const YEAR = 60 * 60 * 24 * 400;

export type CopyGateResult =
  | { ok: true; signedIn: boolean; used: number; limit: number }
  | { ok: false; signedIn: false; used: number; limit: number };

/** The visitor's device id (minting and setting the cookie on first sight). */
function deviceId(): string {
  const existing = openDeviceId(getCookie(COOKIE));
  if (existing) return existing;
  const sealed = newDeviceId();
  const request = getRequest();
  const secure = request ? new URL(request.url).protocol === "https:" : false;
  setCookie(COOKIE, sealed, { path: "/", httpOnly: true, sameSite: "lax", secure, maxAge: YEAR });
  return openDeviceId(sealed) as string;
}

/** Best-effort client address from the proxy headers, or null. */
function clientIp(): string | null {
  const h = getRequest()?.headers;
  if (!h) return null;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || null;
}

/**
 * Atomically add one to `key` unless it is already at `limit`. Rows older than
 * `windowDays` (when given) start over. Returns the new count, or null when blocked.
 */
async function take(sql: Sql, key: string, limit: number, windowDays?: number): Promise<number | null> {
  const stale = windowDays ? `updated_at < now() - interval '${Math.floor(windowDays)} days'` : "false";
  const rows = await sql.query<{ count: number }>(
    `insert into copy_usage (key, count) values ($1, 1)
     on conflict (key) do update
       set count = case when ${stale} then 1 else copy_usage.count + 1 end,
           updated_at = now()
       where ${stale} or copy_usage.count < $2
     returning count`,
    [key, limit],
  );
  return rows[0]?.count ?? null;
}

async function give(sql: Sql, keys: string[]) {
  await sql.query(
    "update copy_usage set count = greatest(count - 1, 0) where key = any($1::text[])",
    [keys],
  );
}

export async function reserveAnonymousCopy(): Promise<CopyGateResult> {
  const user = await getSessionUser();
  if (user) return { ok: true, signedIn: true, used: 0, limit: FREE_COPIES };

  const sql = await getSql();
  const dKey = `d:${deviceId()}`;
  const ip = clientIp();
  const iKey = ip ? `i:${hashIp(ip)}` : null;

  const used = await take(sql, dKey, FREE_COPIES);
  if (used === null) return { ok: false, signedIn: false, used: FREE_COPIES, limit: FREE_COPIES };

  if (iKey && (await take(sql, iKey, FREE_COPIES_PER_IP, IP_WINDOW_DAYS)) === null) {
    await give(sql, [dKey]);
    return { ok: false, signedIn: false, used: FREE_COPIES, limit: FREE_COPIES };
  }
  return { ok: true, signedIn: false, used, limit: FREE_COPIES };
}

export async function releaseAnonymousCopy() {
  const user = await getSessionUser();
  if (user) return { ok: true as const };
  const sql = await getSql();
  const ip = clientIp();
  await give(sql, [`d:${deviceId()}`, ...(ip ? [`i:${hashIp(ip)}`] : [])]);
  return { ok: true as const };
}
