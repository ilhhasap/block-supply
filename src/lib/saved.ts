import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { cleanIds } from "@/lib/saved-ids";

/** The signed-in user's saved block ids. */
export const listSavedBlocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const saved = await import("@/lib/saved.server");
    return saved.listSaved(context.userId);
  });

/** Merge ids (e.g. the ones kept in this browser) into the account; returns the full list. */
export const mergeSavedBlocks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { ids: string[] }) => data)
  .handler(async ({ context, data }) => {
    const saved = await import("@/lib/saved.server");
    return saved.mergeSaved(context.userId, cleanIds(data.ids));
  });

/** Save or unsave one block; returns the full list. */
export const setSavedBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string; on: boolean }) => data)
  .handler(async ({ context, data }) => {
    const saved = await import("@/lib/saved.server");
    const [id] = cleanIds([data.id]);
    if (!id) return saved.listSaved(context.userId);
    return saved.setSaved(context.userId, id, data.on === true);
  });
