import { createMiddleware, createServerFn } from "@tanstack/react-start";
import type { CopyGateResult } from "@/lib/copy-gate.server";

function gated(kind: "reserve" | "release") {
  return createMiddleware({ type: "function" })
    .server(async ({ next }) => {
      const gate = await import("@/lib/copy-gate.server");
      const result =
        kind === "reserve"
          ? await gate.reserveAnonymousCopy()
          : await gate.releaseAnonymousCopy();
      return next({ context: { result } });
    });
}

export const reserveCopy = createServerFn({ method: "POST" })
  .middleware([gated("reserve")])
  .handler(({ context }) => context.result as CopyGateResult);

export const releaseCopy = createServerFn({ method: "POST" })
  .middleware([gated("release")])
  .handler(({ context }) => context.result as { ok: true });
