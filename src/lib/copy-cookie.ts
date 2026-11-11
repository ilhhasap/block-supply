import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const PREFIX = "d1";

export function copySecret() {
  return process.env.BETTER_AUTH_SECRET || "supply-copy-gate-dev";
}

function mac(value: string, secret: string) {
  return createHmac("sha256", secret).update(`${PREFIX}:${value}`).digest("hex").slice(0, 32);
}

/** A fresh signed device id: `d1.<uuid>.<mac>`. */
export function newDeviceId(secret = copySecret()) {
  const id = randomUUID();
  return `${PREFIX}.${id}.${mac(id, secret)}`;
}

/** The device id inside a signed cookie value, or null when missing or tampered with. */
export function openDeviceId(raw: string | undefined, secret = copySecret()): string | null {
  if (!raw) return null;
  const [prefix, id, sig] = raw.split(".");
  if (prefix !== PREFIX || !id || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(id, secret));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

/** Stable, non-reversible key for a network address. */
export function hashIp(ip: string, secret = copySecret()) {
  return createHmac("sha256", secret).update(`ip:${ip}`).digest("hex").slice(0, 32);
}
