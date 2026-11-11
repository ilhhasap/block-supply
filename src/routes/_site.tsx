import { createFileRoute } from "@tanstack/react-router";
import { Site } from "@/components/site";

/** Layout shared by the library pages and `/b/<id>`, so opening a block keeps the page, filters and scroll. */
export const Route = createFileRoute("/_site")({
  // `?auth=login` or `?auth=signup` opens the account modal on any library page.
  validateSearch: (search: Record<string, unknown>): { auth?: "login" | "signup" } => ({
    auth: search.auth === "login" || search.auth === "signup" ? search.auth : undefined,
  }),
  component: Site,
});
