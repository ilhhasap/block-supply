import { createFileRoute, notFound } from "@tanstack/react-router";
import { BLOCKS, groupOf } from "@/data/blocks";

export const Route = createFileRoute("/_site/b/$id")({
  beforeLoad: ({ params }) => {
    if (!BLOCKS.some((block) => block.id === params.id)) throw notFound();
  },
  head: ({ params }) => {
    const block = BLOCKS.find((item) => item.id === params.id);
    if (!block) return {};
    const kind = groupOf(block.cat) === "Sections" ? "section" : "component";
    const title = `${block.name} — Block Supply`;
    const description = `${block.name}: a free ${block.cat.toLowerCase()} ${kind} for Figma. Tune it, copy it and paste it as auto layout.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
});
