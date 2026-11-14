/**
 * The model's HTML is rebuilt element by element from an allow-list before it is drawn, so nothing it
 * writes can run code, load anything or reach outside its own box.
 */
const HTML_TAGS = new Set(["div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "b", "strong", "i", "em", "small", "label", "ul", "ol", "li"]);
const SVG_TAGS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);
const SVG_NS = "http://www.w3.org/2000/svg";

const ATTRS = new Set([
  "style", "data-layer",
  "viewBox", "width", "height", "d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "fill-opacity", "fill-rule", "clip-rule",
  "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "points", "opacity",
]);

const BAD_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding|\\/i;
const BAD_PROPS = new Set(["position", "float", "z-index", "pointer-events", "content", "transform", "inset", "top", "left", "right", "bottom", "animation", "transition"]);
const MAX_NODES = 1500;

/** Keep only declarations that cannot load or place anything outside the block. */
function cleanStyle(style: string) {
  const kept: string[] = [];
  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 1) continue;
    const prop = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (!/^[a-z-]+$/.test(prop) || BAD_PROPS.has(prop) || prop.startsWith("-") || BAD_VALUE.test(value)) continue;
    kept.push(`${prop}: ${value}`);
  }
  return kept.join("; ");
}

function rebuild(source: Element, count: { n: number }): Element | null {
  const name = source.localName;
  const svg = source.namespaceURI === SVG_NS;
  if (!(svg ? SVG_TAGS.has(name) : HTML_TAGS.has(name))) return null;
  if (++count.n > MAX_NODES) return null;
  const out = svg ? document.createElementNS(SVG_NS, name) : document.createElement(name);
  for (const attr of Array.from(source.attributes)) {
    if (!ATTRS.has(attr.name)) continue;
    const value = attr.name === "style" ? cleanStyle(attr.value) : attr.value.slice(0, 2000);
    if (attr.name !== "style" && BAD_VALUE.test(value)) continue;
    if (value) out.setAttribute(attr.name, value);
  }
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) out.appendChild(document.createTextNode(child.textContent ?? ""));
    else if (child instanceof Element) {
      const clean = rebuild(child, count);
      if (clean) out.appendChild(clean);
    }
  }
  return out;
}

/** Clean HTML for one block, always a single `div.kit` root; null when nothing usable is left. */
export function sanitizeBlockHtml(html: string): string | null {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const count = { n: 0 };
  const parts = Array.from(doc.body.children)
    .map((element) => rebuild(element, count))
    .filter((element): element is Element => element !== null);
  if (!parts.length) return null;
  let root: Element;
  if (parts.length === 1 && parts[0]?.localName === "div") root = parts[0];
  else {
    root = document.createElement("div");
    root.setAttribute("style", "display: flex; flex-direction: column; gap: 8px");
    for (const part of parts) root.appendChild(part);
  }
  root.setAttribute("class", "kit");
  return root.outerHTML;
}
