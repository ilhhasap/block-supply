import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing";

/** The landing page. The block library lives at `/library`. */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Block Supply — Copy UI blocks, paste into Figma as auto layout" },
      {
        name: "description",
        content:
          "A free library of SVG UI blocks for designers and developers. Copy a block and paste it into Figma as auto layout. No plugin needed.",
      },
    ],
  }),
  component: Landing,
});
