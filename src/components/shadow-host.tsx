import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Blocks are drawn inside a closed shadow root. From the page's DOM a block is one empty element,
 * so tools that pick or walk elements (such as Figma capture extensions) do not see its parts.
 * Our own code keeps the root and reads the block through `kitIn`.
 */
const roots = new WeakMap<Element, ShadowRoot>();

/** Clicks on a live control inside a block: the card must not treat them as "open the editor". */
const CONTROLS = ".ix, [contenteditable], [role=slider], [role=textbox]";
const control = new WeakSet<Event>();
export function isControlEvent(event: Event) {
  return control.has(event);
}

let sheet: CSSStyleSheet | null = null;

/** The site's CSS, built once and shared by every block's shadow root. */
function sharedSheet() {
  if (sheet) return sheet;
  const next = new CSSStyleSheet();
  const css: string[] = [];
  for (const source of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(source.cssRules)) css.push(rule.cssText);
    } catch {
      // A cross-origin sheet cannot be read; the blocks do not use one.
    }
  }
  next.replaceSync(css.join("\n"));
  // The page-level rule `[data-noshadow] .kit` cannot reach into a shadow root.
  next.insertRule(":host([data-noshadow]) .kit, :host([data-noshadow]) .kit * { box-shadow: none !important; }");
  sheet = next;
  return next;
}

/** The block (`.kit`) drawn inside the shadow host found under `container`. */
export function kitIn(container: ParentNode | null | undefined): HTMLElement | null {
  const host = container?.querySelector("[data-shadow-host]");
  const kit = host ? roots.get(host)?.querySelector(".kit") : null;
  return kit instanceof HTMLElement ? kit : null;
}

/** The part of the block under a screen point, found inside its shadow root. */
export function elementAt(container: ParentNode | null | undefined, x: number, y: number): HTMLElement | null {
  const host = container?.querySelector("[data-shadow-host]");
  const el = host ? roots.get(host)?.elementFromPoint(x, y) : null;
  return el instanceof HTMLElement ? el : null;
}

/** The element in the page that holds the block, for a node inside its shadow root. */
export function hostOf(node: Node): Element | null {
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

export function ShadowHost({
  children,
  noShadow,
  onReady,
}: {
  children: ReactNode;
  noShadow?: boolean;
  onReady?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    let shadow = roots.get(host);
    if (!shadow) {
      shadow = host.attachShadow({ mode: "closed" });
      shadow.adoptedStyleSheets = [sharedSheet()];
      shadow.addEventListener(
        "click",
        (event) => {
          const target = event.target;
          if (target instanceof Element && target.closest(CONTROLS)) control.add(event);
        },
        true,
      );
      roots.set(host, shadow);
    }
    setRoot(shadow);
  }, []);

  // Once the block is in the root, let the parent measure it.
  useLayoutEffect(() => {
    if (!root) return;
    onReady?.();
    // Lets an ancestor (the editor) know the block now exists.
    ref.current?.dispatchEvent(new CustomEvent("block-ready", { bubbles: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  return (
    <div ref={ref} data-shadow-host="" data-noshadow={noShadow ? "" : undefined} style={{ display: "contents" }}>
      {root ? createPortal(children, root as unknown as Element) : null}
    </div>
  );
}
