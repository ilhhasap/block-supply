import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Forgot password — Block Supply" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const next = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      setError("Enter a valid email.");
      return;
    }
    setBusy(true);
    const { error: err } = await authClient.requestPasswordReset({ email: next, redirectTo: "/reset-password" });
    setBusy(false);
    // Same answer whether or not the account exists, so emails cannot be probed.
    if (err && err.status !== 400) {
      setError("Could not send the email. Try again in a moment.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard title="Reset your password">
      {sent ? (
        <>
          <p className="login-note">
            If an account exists for {email.trim()}, we sent a link to choose a new password. It is valid for one
            hour.
          </p>
          <Link to="/login" className="login-switch">
            Back to log in
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit}>
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
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" className="login-send" disabled={busy}>
            {busy ? "Please wait" : "Send reset link"}
          </button>
          <Link to="/login" className="login-switch">
            Back to log in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
