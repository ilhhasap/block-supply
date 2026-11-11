import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { authClient, authEnabled, AUTH_PROVIDERS, signIn } from "@/lib/auth/client";

type Mode = "login" | "signup";

/**
 * Log in / sign up as a modal over the page. Email and password, plus the social providers that are
 * switched on. Closes on success (the session store updates the rest of the app), on Escape, on a
 * click outside the card and on the close button.
 */
export function AuthModal({
  initialMode = "login",
  note,
  onClose,
}: {
  initialMode?: Mode;
  /** One line shown under the title, e.g. why the visitor is being asked to log in. */
  note?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Where the visitor comes back to after a redirect (Google, a verification link). */
  const here = typeof window === "undefined" ? "/" : window.location.pathname;

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
    const name = nextEmail.split("@")[0]?.slice(0, 32) || "Block Supply";
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ email: nextEmail, password, name, callbackURL: here })
        : await authClient.signIn.email({ email: nextEmail, password });
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
    onClose();
  }

  async function resendVerification() {
    setBusy(true);
    const { error: err } = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: here });
    setBusy(false);
    if (err) setError(err.message || "Could not send the email.");
    else {
      setError("");
      setNeedsVerify(false);
      setNotice("Verification email sent. Check your inbox.");
    }
  }

  return (
    <div
      className="auth-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="auth-close" aria-label="Close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="m2 2 10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <svg className="auth-mark" width="44" height="49" viewBox="0 0 32 36" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16 1.4 28.6 8.6c1.1.63 1.8 1.82 1.8 3.1v12.6c0 1.28-.7 2.47-1.8 3.1L16 34.6c-1.05.6-2.35.6-3.4 0L3.4 27.4c-1.1-.63-1.8-1.82-1.8-3.1V11.7c0-1.28.7-2.47 1.8-3.1L12.6 1.4c1.05-.6 2.35-.6 3.4 0Z"
          />
          <rect x="11.2" y="11" width="9.6" height="14" rx="2" fill="#fff" />
        </svg>
        <h2 id="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-sub">
          {mode === initialMode && note
            ? note
            : mode === "signup"
              ? "Create a free account to keep copying blocks into Figma."
              : "Log in to keep copying blocks into Figma. It stays free."}
        </p>

        {authEnabled ? (
          <form onSubmit={onSubmit} noValidate>
            {AUTH_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className="auth-provider"
                onClick={() => {
                  setError("");
                  void signIn(provider.id, { callbackURL: here }).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Could not sign in.");
                  });
                }}
              >
                {provider.id === "github" ? <GithubMark /> : <GoogleMark />}
                <span>Continue with {provider.label}</span>
              </button>
            ))}
            {AUTH_PROVIDERS.length ? (
              <div className="auth-or" aria-hidden="true">
                <i />
                <span>or</span>
                <i />
              </div>
            ) : null}
            <input
              ref={emailRef}
              className="auth-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter email address"
              aria-label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="auth-input"
              type="password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Password, at least 8 characters"
              aria-label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "login" ? (
              <Link to="/forgot-password" className="auth-forgot" onClick={onClose}>
                Forgot password?
              </Link>
            ) : null}
            {notice ? <p className="auth-note">{notice}</p> : null}
            {error ? (
              <p className="auth-error" role="alert">
                {error}
              </p>
            ) : null}
            {needsVerify ? (
              <button type="button" className="auth-link" disabled={busy} onClick={() => void resendVerification()}>
                Resend verification email
              </button>
            ) : null}
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? "Please wait" : mode === "signup" ? "Create account" : "Log in"}
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setError("");
                setNotice("");
                setMode((current) => (current === "login" ? "signup" : "login"));
              }}
            >
              {mode === "signup" ? "I already have an account" : "New here? Create an account"}
            </button>
          </form>
        ) : (
          <p className="auth-note">Sign-in is turned off.</p>
        )}
        <p className="auth-legal">Free forever. No card needed.</p>
      </div>
    </div>
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
