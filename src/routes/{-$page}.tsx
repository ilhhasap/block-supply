import { createFileRoute, notFound } from "@tanstack/react-router";
import { Site } from "@/components/site";

/** `/` is the component library; `/sections` and `/pricing` are the other two pages. */
const PAGES = ["sections", "pricing"];

const TITLES: Record<string, { title: string; description: string }> = {
  sections: {
    title: "Sections — Block Supply",
    description: "Hero, features, call to action, FAQ and footer sections. Copy one and paste it into Figma as auto layout.",
  },
  pricing: {
    title: "Pricing — Block Supply",
    description: "Block Supply is free. The first three blocks need no account; after that, log in with a free account to keep copying.",
  },
};

export const Route = createFileRoute("/{-$page}")({
  validateSearch: (search: Record<string, unknown>): { auth?: "login" | "signup" } => ({
    auth: search.auth === "login" || search.auth === "signup" ? search.auth : undefined,
  }),
  beforeLoad: ({ params }) => {
    if (params.page && !PAGES.includes(params.page)) throw notFound();
  },
  head: ({ params }) => {
    const page = params.page ? TITLES[params.page] : undefined;
    if (!page) return {};
    return {
      meta: [
        { title: page.title },
        { name: "description", content: page.description },
        { property: "og:title", content: page.title },
        { property: "og:description", content: page.description },
      ],
    };
  },
  component: Site,
});
