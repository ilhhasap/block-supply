import { createHmac, timingSafeEqual } from "node:crypto";
import { FREE_COPIES } from "@/lib/copy-limit";

const PREFIX = "v1";

export function copyCookieSecret() {
  return process.env.BETTER_AUTH_SECRET || process.env.GROK_AUTH_SECRET || "supply-copy-gate-v1";
}

export function sealCopyCount(count: number, secret = copyCookieSecret()) {
  const mac = createHmac("sha256", secret).update(`${PREFIX}:${count}`).digest("hex").slice(0, 32);
  return `${PREFIX}.${count}.${mac}`;
}

/** Valid count, or `FREE_COPIES` when the cookie was tampered with. Missing cookie is 0. */
export function openCopyCount(raw: string | undefined, secret = copyCookieSecret()) {
  if (!raw) return 0;
  const [prefix, countText, sig] = raw.split(".");
  const count = Number(countText);
  if (prefix !== PREFIX || !Number.isInteger(count) || count < 0 || count > FREE_COPIES || !sig) {
    return FREE_COPIES;
  }
  const expected = createHmac("sha256", secret).update(`${PREFIX}:${count}`).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return FREE_COPIES;
  return count;
}
