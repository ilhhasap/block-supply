import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import appCss from "../styles.css?url";
import geist400 from "@fontsource/geist/files/geist-latin-400-normal.woff2?url";
import geist500 from "@fontsource/geist/files/geist-latin-500-normal.woff2?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Block Supply — Free UI blocks for Figma" },
      {
        name: "description",
        content:
          "A library of UI blocks. Copy a component and paste it into Figma as auto layout, set in Geist. Three copies are free, then log in to keep copying.",
      },
      { name: "theme-color", content: "#ffffff" },
      { property: "og:title", content: "Block Supply — Free UI blocks for Figma" },
      { property: "og:description", content: "Free SVG UI blocks for Figma" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preload", as: "font", type: "font/woff2", href: geist400, crossOrigin: "anonymous" },
      { rel: "preload", as: "font", type: "font/woff2", href: geist500, crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
