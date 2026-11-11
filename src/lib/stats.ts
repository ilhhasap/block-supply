import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Stats } from "@/lib/stats.server";

/** Log a successful copy. Best effort: the caller ignores failures. */
export const recordCopyEvent = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const stats = await import("@/lib/stats.server");
    return stats.recordCopy(data.id);
  });

/** The owner's numbers. Throws for anyone who is not listed in ADMIN_EMAILS. */
export const adminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Stats> => {
    const stats = await import("@/lib/stats.server");
    return stats.getStats(context.userId);
  });
