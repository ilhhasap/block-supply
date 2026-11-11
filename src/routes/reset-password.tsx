import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({ meta: [{ title: "New password — Block Supply" }] }),
});

function ResetPasswordPage() {
  const { token, error: linkError } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token || linkError) {
    return (
      <AuthCard title="Link expired">
        <p className="login-error">This reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="login-send">
          Get a new link
        </Link>
      </AuthCard>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: err } = await authClient.resetPassword({ newPassword: password, token: token as string });
    setBusy(false);
    if (err) {
      setError(err.message || "Could not reset the password. The link may have expired.");
      return;
    }
    setDone(true);
    window.setTimeout(() => void navigate({ to: "/login" }), 1800);
  }

  return (
    <AuthCard title="Choose a new password">
      {done ? (
        <p className="login-note">Password updated. Taking you to log in…</p>
      ) : (
        <form onSubmit={onSubmit}>
          <label className="login-field">
            <span>New password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="login-field">
            <span>Confirm password</span>
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" className="login-send" disabled={busy}>
            {busy ? "Please wait" : "Update password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
