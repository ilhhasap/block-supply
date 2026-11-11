import { getSql } from "@/lib/db";
import { MAX_SAVED } from "@/lib/saved-ids";

export async function listSaved(userId: string): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql.query<{ block_id: string }>(
    "select block_id from saved_blocks where user_id = $1 order by created_at, block_id",
    [userId],
  );
  return rows.map((row) => row.block_id);
}

/** Add `ids` to the account's saved list (existing rows are left alone). */
export async function mergeSaved(userId: string, ids: string[]): Promise<string[]> {
  const sql = await getSql();
  const current = await listSaved(userId);
  const room = Math.max(0, MAX_SAVED - current.length);
  const fresh = ids.filter((id) => !current.includes(id)).slice(0, room);
  if (fresh.length) {
    await sql.query(
      `insert into saved_blocks (user_id, block_id)
       select $1, unnest($2::text[])
       on conflict do nothing`,
      [userId, fresh],
    );
  }
  return listSaved(userId);
}

export async function setSaved(userId: string, id: string, on: boolean): Promise<string[]> {
  const sql = await getSql();
  if (on) return mergeSaved(userId, [id]);
  await sql.query("delete from saved_blocks where user_id = $1 and block_id = $2", [userId, id]);
  return listSaved(userId);
}
