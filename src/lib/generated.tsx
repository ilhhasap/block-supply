import type { ComponentType } from "react";

/** Blocks built by Mimic live here for the session, keyed by id (`mimic-…`), so the editor can draw them. */
const store = new Map<string, string>();
const views = new Map<string, ComponentType>();

export const isGenerated = (id: string) => id.startsWith("mimic-");

export function registerGenerated(id: string, html: string) {
  store.set(id, html);
  views.delete(id);
}

/** The view for a generated block, or undefined for any other id. */
export function generatedView(id: string): ComponentType | undefined {
  const html = store.get(id);
  if (html === undefined) return undefined;
  let view = views.get(id);
  if (!view) {
    view = function GeneratedBlock() {
      return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
    };
    views.set(id, view);
  }
  return view;
}
