import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { openCopyCount, sealCopyCount } from "@/lib/copy-cookie";
import { FREE_COPIES } from "@/lib/copy-limit";
import { getSessionUser } from "@/lib/auth/verify.server";

const COOKIE = "supply_copies";
const YEAR = 60 * 60 * 24 * 400;

export type CopyGateResult =
  | { ok: true; signedIn: boolean; used: number; limit: number }
  | { ok: false; signedIn: false; used: number; limit: number };

function readCount() {
  return openCopyCount(getCookie(COOKIE));
}

function writeCount(count: number) {
  const request = getRequest();
  const secure = request ? new URL(request.url).protocol === "https:" : false;
  setCookie(COOKIE, sealCopyCount(count), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: YEAR,
  });
}

export async function reserveAnonymousCopy(bearerToken?: string): Promise<CopyGateResult> {
  const user = await getSessionUser(bearerToken);
  if (user) return { ok: true, signedIn: true, used: 0, limit: FREE_COPIES };
  const used = readCount();
  if (used >= FREE_COPIES) return { ok: false, signedIn: false, used, limit: FREE_COPIES };
  const next = used + 1;
  writeCount(next);
  return { ok: true, signedIn: false, used: next, limit: FREE_COPIES };
}

export async function releaseAnonymousCopy(bearerToken?: string) {
  const user = await getSessionUser(bearerToken);
  if (user) return { ok: true as const };
  writeCount(Math.max(0, readCount() - 1));
  return { ok: true as const };
}
