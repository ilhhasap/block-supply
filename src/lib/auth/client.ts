import { createAuthClient } from "better-auth/react";
import { AUTH_PROVIDERS, type SocialProviderId } from "./providers";

/**
 * Better Auth client for the browser. Talks to this app's own Better Auth at
 * same-origin `/api/auth/*`; the session is an HttpOnly cookie, so there is
 * nothing to attach to requests.
 */
export const authClient = createAuthClient();

/**
 * True when sign-in UI should be shown — i.e. whenever `VITE_AUTH_ENABLED` is
 * not `"false"`. With `"false"` the app uses a shared dev user instead
 * (see `use-current-user`).
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/** The social providers to render sign-in buttons for. */
export { AUTH_PROVIDERS };

/** Start social sign-in (full-page redirect to the provider). */
export async function signIn(
  provider: SocialProviderId,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  const { error } = await authClient.signIn.social({
    provider,
    callbackURL: opts.callbackURL ?? "/",
    errorCallbackURL: opts.errorCallbackURL ?? "/login",
  });
  if (error) throw new Error(error.message ?? "Sign-in failed");
}

/**
 * Sign out, then redirect. Rejects if the server does not confirm, so the
 * caller can let the visitor retry (the cookie is HttpOnly — only the server
 * can clear it).
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Sign-out failed");
  window.location.href = redirectTo;
}
