import { createRouter, Link } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: () => (
      <main className="login-page">
        <section className="login-card">
          <div className="login-body">
            <h1>Page not found</h1>
            <p>That page does not exist.</p>
            <Link to="/{-$page}" params={{ page: undefined }} className="login-link">
              Back to the blocks
            </Link>
          </div>
        </section>
      </main>
    ),
  });
}
