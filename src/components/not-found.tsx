import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <main className="nf">
      <p className="nf-code" aria-hidden="true">
        404
      </p>
      <h1 className="nf-title">Page not found</h1>
      <p className="nf-sub">That page does not exist or has moved.</p>
      <Link to="/{-$page}" params={{ page: undefined }} className="hero-join nf-btn">
        Back to the blocks
      </Link>
    </main>
  );
}
