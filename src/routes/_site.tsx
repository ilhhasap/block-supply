import { createFileRoute } from "@tanstack/react-router";
import { Site } from "@/components/site";

/** Layout shared by the library pages and `/b/<id>`, so opening a block keeps the page, filters and scroll. */
export const Route = createFileRoute("/_site")({
  component: Site,
});
