import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Dashboard, Range } from "@/lib/stats.server";

/** Log a successful copy. Best effort: the caller ignores failures. */
export const recordCopyEvent = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const stats = await import("@/lib/stats.server");
    return stats.recordCopy(data.id);
  });

/** Log a copy that failed. Best effort: the caller ignores failures. */
export const recordCopyFailureEvent = createServerFn({ method: "POST" })
  .validator((data: { id: string; message: string }) => data)
  .handler(async ({ data }) => {
    const stats = await import("@/lib/stats.server");
    return stats.recordCopyFailure(data.id, data.message);
  });

/** The owner's dashboard. Throws for anyone who is not listed in ADMIN_EMAILS. */
export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { range: Range }) => data)
  .handler(async ({ context, data }): Promise<Dashboard> => {
    const stats = await import("@/lib/stats.server");
    return stats.getDashboard(context.userId, data.range);
  });
