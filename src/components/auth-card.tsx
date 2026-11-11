import type { ReactNode } from "react";

/** Shared card shell for the account pages (same look as the login page). */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="auth-title">
        <div className="login-body">
          <div className="login-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
              <rect x="9" y="8" width="6" height="8" rx="1" fill="#fff" />
            </svg>
            <span>Supply</span>
          </div>
          <h1 id="auth-title">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
