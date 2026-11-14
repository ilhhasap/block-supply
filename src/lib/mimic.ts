import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { MimicResult, MimicStatus } from "@/lib/mimic.server";

/** Whether Mimic is on, how many runs are left today. Only asked for by signed-in visitors. */
export const mimicStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MimicStatus> => {
    const mimic = await import("@/lib/mimic.server");
    return mimic.getMimicStatus(context.userId);
  });

/** Turn a screenshot into a block. Signed-in only, and limited per day. */
export const mimicGenerate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { image: string; mime: string; hint: string }) => data)
  .handler(async ({ context, data }): Promise<MimicResult> => {
    const mimic = await import("@/lib/mimic.server");
    return mimic.generateMimic(context.userId, data);
  });
