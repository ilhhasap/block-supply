/**
 * Social sign-in providers offered on the login page.
 *
 * Client-safe (no server imports). Email + password is always available; social
 * buttons appear only for providers listed in `VITE_AUTH_PROVIDERS`
 * (comma-separated, e.g. `google,github`). The server enables a provider only
 * when its credentials are also set (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`,
 * `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`) — see `server.ts`.
 *
 * To add another Better Auth social provider: add it to `KNOWN` here and to
 * `socialProviders` in `server.ts`.
 */
export type SocialProviderId = "google" | "github";

export type AuthProvider = {
  /** Better Auth social provider id; also the OAuth callback path segment. */
  id: SocialProviderId;
  /** Human label for the sign-in button. */
  label: string;
};

const KNOWN: Record<SocialProviderId, AuthProvider> = {
  google: { id: "google", label: "Google" },
  github: { id: "github", label: "GitHub" },
};

const raw: string =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_AUTH_PROVIDERS ?? "";

export const AUTH_PROVIDERS: readonly AuthProvider[] = raw
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s): s is SocialProviderId => s in KNOWN)
  .map((s) => KNOWN[s]);
