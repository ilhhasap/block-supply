/** Most blocks one account can hold; bounds payloads and rows. */
export const MAX_SAVED = 500;

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Keep only well-formed, unique block ids, capped at `MAX_SAVED`. */
export function cleanIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value === "string" && ID.test(value)) seen.add(value);
    if (seen.size >= MAX_SAVED) break;
  }
  return [...seen];
}
