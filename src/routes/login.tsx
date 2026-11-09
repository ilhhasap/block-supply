import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient, authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
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
      setError(result.error.message || (mode === "signup" ? "Could not create the account." : "Could not log in."));
      return;
    }
    await navigate({ to: "/" });
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
          {gated ? <p className="login-note">3 free copies used. Log in to keep copying into Figma.</p> : null}

          {authEnabled ? (
            <form onSubmit={onSubmit}>
              {GROK_PROVIDERS.map((provider) => (
                <button
                  key={provider.providerId}
                  type="button"
                  className={provider.idp === "twitter" ? "login-x" : "login-google"}
                  onClick={() => {
                    setError("");
                    void signIn(provider.providerId, { callbackURL: "/" }).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Could not sign in.");
                    });
                  }}
                >
                  {provider.idp === "twitter" ? <XMark /> : <GoogleMark />}
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
              {error ? <p className="login-error">{error}</p> : null}
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

function XMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.2 1.5h2.1L9.6 6.9l5.5 7.6h-4.3L7.7 9.9l-3.6 4.6H2l5.1-5.8L1.8 1.5h4.4l3.1 4.3 2.9-4.3Zm-.7 11.8h1.2L4.6 2.7H3.3l8.2 10.6Z"
      />
    </svg>
  );
}
