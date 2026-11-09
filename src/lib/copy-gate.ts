import { createMiddleware, createServerFn } from "@tanstack/react-start";
import type { CopyGateResult } from "@/lib/copy-gate.server";

function gated(kind: "reserve" | "release") {
  return createMiddleware({ type: "function" })
    .client(async ({ next }) => {
      const { getBearerToken } = await import("@/lib/auth/client");
      return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
    })
    .server(async ({ next, context }) => {
      const gate = await import("@/lib/copy-gate.server");
      const result =
        kind === "reserve"
          ? await gate.reserveAnonymousCopy(context.bearerToken)
          : await gate.releaseAnonymousCopy(context.bearerToken);
      return next({ context: { result } });
    });
}

export const reserveCopy = createServerFn({ method: "POST" })
  .middleware([gated("reserve")])
  .handler(({ context }) => context.result as CopyGateResult);

export const releaseCopy = createServerFn({ method: "POST" })
  .middleware([gated("release")])
  .handler(({ context }) => context.result as { ok: true });
