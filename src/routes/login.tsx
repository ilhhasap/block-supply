import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient, authEnabled, AUTH_PROVIDERS, signIn } from "@/lib/auth/client";
import { FREE_COPIES } from "@/lib/copy-limit";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Log in — Supply" }],
  }),
});

const COPY_GATE_FLAG = "supply-copy-gate";

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gated] = useState(() => {
    if (typeof window === "undefined") return false;
    const on = window.sessionStorage.getItem(COPY_GATE_FLAG) === "1";
    if (on) window.sessionStorage.removeItem(COPY_GATE_FLAG);
    return on;
  });

  if (isPending) return <main className="login-page" />;
  if (user) return <Navigate to="/" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setNeedsVerify(false);
    const nextEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    const name = nextEmail.split("@")[0]?.slice(0, 32) || "Supply";
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ email: nextEmail, password, name, callbackURL: "/" })
        : await authClient.signIn.email({ email: nextEmail, password, callbackURL: "/" });
    setBusy(false);
    if (result.error) {
      if (result.error.status === 403) {
        setNeedsVerify(true);
        setError("Verify your email first. Check your inbox for the link.");
        return;
      }
      setError(result.error.message || (mode === "signup" ? "Could not create the account." : "Could not log in."));
      return;
    }
    // Sign-up with required verification returns no session token.
    if (mode === "signup" && !(result.data as { token?: string | null } | null)?.token) {
      setNotice(`We sent a verification link to ${nextEmail}. Open it, then log in.`);
      setMode("login");
      setPassword("");
      return;
    }
    await navigate({ to: "/" });
  }

  async function resendVerification() {
    setBusy(true);
    const { error: err } = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: "/" });
    setBusy(false);
    if (err) setError(err.message || "Could not send the email.");
    else {
      setError("");
      setNeedsVerify(false);
      setNotice("Verification email sent. Check your inbox.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-body">
          <div className="login-brand">
            <Mark />
            <span>Supply</span>
          </div>
          <h1 id="login-title">{mode === "signup" ? "Create your account" : "Log in or sign up"}</h1>
          {gated ? <p className="login-note">{FREE_COPIES} free copies used. Log in to keep copying into Figma. It stays free.</p> : null}

          {authEnabled ? (
            <form onSubmit={onSubmit}>
              {AUTH_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={provider.id === "github" ? "login-x" : "login-google"}
                  onClick={() => {
                    setError("");
                    void signIn(provider.id, { callbackURL: "/" }).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Could not sign in.");
                    });
                  }}
                >
                  {provider.id === "github" ? <GithubMark /> : <GoogleMark />}
                  <span>Continue with {provider.label}</span>
                </button>
              ))}
              <div className="login-or" aria-hidden="true">
                <i />
                <span>OR</span>
                <i />
              </div>
              <label className="login-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="login-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {mode === "login" ? (
                <Link to="/forgot-password" className="login-link">
                  Forgot password?
                </Link>
              ) : null}
              {notice ? <p className="login-note">{notice}</p> : null}
              {error ? <p className="login-error">{error}</p> : null}
              {needsVerify ? (
                <button type="button" className="login-switch" disabled={busy} onClick={() => void resendVerification()}>
                  Resend verification email
                </button>
              ) : null}
              <button type="submit" className="login-send" disabled={busy}>
                {busy ? "Please wait" : mode === "signup" ? "Create account" : "Log in"}
              </button>
              <button
                type="button"
                className="login-switch"
                onClick={() => {
                  setError("");
                  setMode((current) => (current === "login" ? "signup" : "login"));
                }}
              >
                {mode === "signup" ? "I already have an account" : "Create an account"}
              </button>
            </form>
          ) : (
            <p className="login-note">Sign-in is turned off.</p>
          )}
        </div>
        <p className="login-foot">New to Supply? Create an account and keep copying.</p>
      </section>
    </main>
  );
}

function Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
      <rect x="9" y="8" width="6" height="8" rx="1" fill="#fff" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}
