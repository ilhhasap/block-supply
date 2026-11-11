/**
 * Self-hosted Better Auth for this app (server-only).
 *
 * Standard setup: email + password, plus optional Google / GitHub with your own
 * OAuth apps. The session is a same-origin cookie stored in Postgres
 * (`DATABASE_URL`) or, locally, the embedded PGLite DB.
 *
 * Environment:
 *   BETTER_AUTH_SECRET   required in production (32+ random chars)
 *   BETTER_AUTH_URL      public origin in production, e.g. https://supply.example.com
 *   DATABASE_URL         Postgres connection string (omit locally -> PGLite)
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   optional
 *   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET   optional
 *   RESEND_API_KEY / EMAIL_FROM   enable verification emails (see `email.server.ts`);
 *                        when set, sign-in requires a verified email
 *   VITE_AUTH_PROVIDERS  which social buttons to show, e.g. "google,github"
 *   AUTH_RATE_LIMIT      "on" to enforce the login rate limits outside production (always on in production)
 *   VITE_AUTH_ENABLED    "false" turns auth off (shared dev user)
 *
 * NEVER import this from client code. The client uses `@/lib/auth/client`;
 * components read the user via `@/lib/auth/use-current-user`; server functions
 * get a verified id via `@/lib/auth/middleware`.
 */
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { emailConfigured, resetPasswordEmail, sendEmail, verificationEmail } from "./email.server";
import { pgliteDialect } from "./pglite-dialect";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !emailConfigured) {
  console.error("[auth] RESEND_API_KEY is not set — email verification is NOT enforced.");
}

/**
 * Dev secret must outlive module reloads (HMR) or every session dies mid-dev,
 * so it lives on `globalThis`. Production must set BETTER_AUTH_SECRET.
 */
const globalAuthRef = globalThis as typeof globalThis & { __authDevSecret__?: string };
function authSecret(): string {
  const configured = env("BETTER_AUTH_SECRET");
  if (configured) return configured;
  if (isProduction) {
    // A per-instance random secret breaks sessions on serverless and is not a safe default.
    throw new Error("[auth] BETTER_AUTH_SECRET is required in production.");
  }
  globalAuthRef.__authDevSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__authDevSecret__;
}

// Explicit off-switch: `VITE_AUTH_ENABLED=false` forces auth off (dev user).
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

/** True when real sign-in is active. */
export const authConfigured = !authDisabled;

const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

const explicitBaseURL = env("BETTER_AUTH_URL");
if (isProduction && !explicitBaseURL) {
  console.error("[auth] BETTER_AUTH_URL is not set — OAuth callbacks and CSRF checks need it.");
}
const baseURL = explicitBaseURL ?? {
  allowedHosts: ["localhost:8080", "127.0.0.1:8080", "[::1]:8080"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};
const trustedOrigins: string[] = explicitBaseURL
  ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
  : LOCAL_DEV_ORIGINS;

const databaseUrl = env("DATABASE_URL");
const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

// Social providers turn on only when their credentials are present.
const googleId = env("GOOGLE_CLIENT_ID");
const googleSecret = env("GOOGLE_CLIENT_SECRET");
const githubId = env("GITHUB_CLIENT_ID");
const githubSecret = env("GITHUB_CLIENT_SECRET");
const socialProviders = {
  ...(googleId && googleSecret ? { google: { clientId: googleId, clientSecret: googleSecret } } : {}),
  ...(githubId && githubSecret ? { github: { clientId: githubId, clientSecret: githubSecret } } : {}),
};

export const auth = betterAuth({
  baseURL,
  secret: authSecret(),
  database,
  trustedOrigins,
  socialProviders,
  account: { encryptOAuthTokens: true },

  // Throttle by client IP. The counters live in the database because serverless instances do not
  // share memory, which made the in-memory default ineffective. On in production; set
  // AUTH_RATE_LIMIT=on to try it locally.
  rateLimit: {
    enabled: isProduction || env("AUTH_RATE_LIMIT") === "on",
    storage: "database",
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/sign-up/email": { window: 3600, max: 8 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/send-verification-email": { window: 3600, max: 5 },
      "/reset-password": { window: 3600, max: 10 },
    },
  },

  // Cache the session in a short-lived signed cookie so reads skip the DB.
  session: { cookieCache: { enabled: true, maxAge: 300 } },

  // With an email provider configured, accounts must verify their address
  // before signing in. Without one (local dev) the link is logged instead and
  // verification is not enforced, so nobody gets locked out.
  ...(emailAndPasswordEnabled
    ? {
        emailAndPassword: {
          enabled: true,
          requireEmailVerification: emailConfigured,
          resetPasswordTokenExpiresIn: 60 * 60,
          revokeSessionsOnPasswordReset: true,
          sendResetPassword: async ({ user, url }) => {
            await sendEmail({ to: user.email, ...resetPasswordEmail(url) });
          },
        },
      }
    : {}),
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: emailConfigured,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...verificationEmail(url) });
    },
  },

  advanced: { cookiePrefix: "supply-auth" },

  // MUST be last so it runs after every other plugin's hooks.
  plugins: [tanstackStartCookies()],
});
