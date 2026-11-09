/**
 * Teaches @magicpatterns/html-to-figma to emit real Figma auto layout.
 * Flex frames hug or fill from data-ax-w / data-ax-h / data-grow.
 * data-gap wins over computed gap so negative spacing (invalid in CSS) still pastes.
 * Children are in flow (no absolute offsets). Text is Geist.
 * Vite appends ?v= to the module id — match the path, not the raw id.
 */
export function figmaAutolayoutPlugin() {
  return {
    name: "block-supply:figma-autolayout",
    enforce: "pre",
    transform(code, id) {
      const clean = id.split("?")[0].split("#")[0];
      if (!clean.includes("@magicpatterns/html-to-figma") || !clean.endsWith("htmlToFigma.js")) {
        return null;
      }
      let next = code;
      const swaps = [
        [
          `function et(A, t, n) {
  const r = Un[A] ?? A.toLowerCase().replace(/\\s+/g, "-");`,
          `function et(A, t, n) {
  if (A === "Geist") return \`/fonts/geist-latin-\${bn(t)}-\${n ? "italic" : "normal"}.woff\`;
  const r = Un[A] ?? A.toLowerCase().replace(/\\s+/g, "-");`,
        ],
        [
          "const U = f(n.gap) ?? f(n.rowGap) ?? f(n.columnGap), b = ie(t, d), u = U != null && U > 0 ? U : b ?? U ?? 0;",
          'const axGap = t && t.getAttribute ? f(t.getAttribute("data-gap")) : null, U = axGap ?? f(n.gap) ?? f(n.rowGap) ?? f(n.columnGap), b = ie(t, d), u = U != null ? U : b ?? 0;',
        ],
        [
          `  if (b.length ? N.fillPaints = b : c && (N.fillPaints = [
    {
      type: "SOLID",
      color: { r: 1, g: 1, b: 1, a: 1 },
      opacity: 1,
      visible: !0,
      blendMode: "NORMAL"
    }
  ]), Z.length && (N.strokePaints = Z, !W)) {`,
          `  if (b.length) N.fillPaints = b;
  if (c && N.fillPaints) {
    const kept = N.fillPaints.filter((paint) => {
      if (!paint || paint.type !== "SOLID" || !paint.color) return true;
      const col = paint.color;
      const white = col.r > 0.97 && col.g > 0.97 && col.b > 0.97 && (col.a == null || col.a > 0.85);
      const opaque = paint.opacity == null || paint.opacity > 0.85;
      return !(white && opaque);
    });
    if (kept.length) N.fillPaints = kept;
    else {
      delete N.fillPaints;
      if (N.effects) N.effects = N.effects.filter((fx) => fx && fx.type !== "DROP_SHADOW" && fx.type !== "INNER_SHADOW");
      if (N.effects && !N.effects.length) delete N.effects;
    }
  }
  if (Z.length && (N.strokePaints = Z, !W)) {`,
        ],
        [
          `function Ve(A) {
  switch (A) {
    case "center":
      return "CENTER";
    case "flex-end":
    case "end":
      return "MAX";
    case "baseline":
      return "BASELINE";
    default:
      return "MIN";
  }
}`,
          `function Ve(A) {
  switch (A) {
    case "center":
      return "CENTER";
    case "flex-end":
    case "end":
      return "MAX";
    case "baseline":
      return "BASELINE";
    default:
      return "MIN";
  }
}`,
        ],
        [
          'name: "SVG",',
          'name: (A.getAttribute("data-layer") || "Icon"),',
        ],
        [
          `function it(A, t, n, r, o, c) {`,
          `function axAlign(v) {
  if (v === "center") return "CENTER";
  if (v === "flex-end" || v === "end") return "MAX";
  if (v === "baseline") return "BASELINE";
  if (v === "stretch") return "STRETCH";
  return "MIN";
}
function axSelf(el) {
  const s = el.getAttribute("style") || "";
  const m = /(?:^|;)\\s*align-self:\\s*([^;]+)/.exec(s);
  return m ? m[1].trim() : "";
}
function flexAL(N, A, i, y, o) {
  if (!i || (i.display !== "flex" && i.display !== "inline-flex")) return;
  ce(N, A, i);
  const hug = A.getAttribute("data-hug") || "";
  const wMode = A.getAttribute("data-ax-w") || (hug === "both" || hug === "x" ? "hug" : "fixed");
  const hMode = A.getAttribute("data-ax-h") || (hug === "both" || hug === "y" ? "hug" : "fixed");
  const horizontal = N.stackMode === "HORIZONTAL";
  N.stackPrimarySizing = (horizontal ? wMode : hMode) === "hug" ? "RESIZE_TO_FIT" : "FIXED";
  N.stackCounterSizing = (horizontal ? hMode : wMode) === "hug" ? "RESIZE_TO_FIT" : "FIXED";
  N.stackPositioning = "AUTO";
  const kids = [];
  for (const node of o.nodes) {
    const p = node.parentIndex;
    if (!p || !p.guid || p.guid.sessionID !== y.sessionID || p.guid.localID !== y.localID) continue;
    kids.push(node);
  }
  const els = Array.from(A.children).filter((el) => {
    const s = el.getAttribute("style") || "";
    return !/(?:^|;)\\s*display:\\s*none/.test(s) && !/(?:^|;)\\s*visibility:\\s*hidden/.test(s);
  });
  const parentStretch = !i.alignItems || i.alignItems === "stretch" || i.alignItems === "normal";
  kids.forEach((node, idx) => {
    node.transform = UA(0, 0);
    node.stackPositioning = "AUTO";
    const el = els[idx];
    if (!el || kids.length !== els.length) return;
    const tag = el.tagName.toLowerCase();
    const text = tag === "span" || node.type === "TEXT";
    const grow = parseFloat(el.getAttribute("data-grow") || "");
    const primary = horizontal
      ? el.getAttribute("data-ax-w") || (text ? "hug" : "fixed")
      : el.getAttribute("data-ax-h") || (text ? "hug" : "fixed");
    let counter = horizontal
      ? el.getAttribute("data-ax-h") || (text ? "hug" : "fixed")
      : el.getAttribute("data-ax-w") || (text ? "hug" : "fixed");
    const self = axSelf(el);
    const opted = self === "flex-start" || self === "start" || self === "center" || self === "flex-end" || self === "end";
    if (counter === "hug" && parentStretch && !opted) counter = "fill";
    if (counter === "fill") node.stackChildAlignSelf = "STRETCH";
    else if (self === "center" || self === "flex-end" || self === "end" || self === "flex-start" || self === "start") node.stackChildAlignSelf = axAlign(self);
    else if (parentStretch) node.stackChildAlignSelf = "MIN";
    if (Number.isFinite(grow) && grow > 0) node.stackChildPrimaryGrow = grow;
    else if (primary === "fill") node.stackChildPrimaryGrow = 1;
    if (node.type === "FRAME") {
      const childHorizontal = node.stackMode === "HORIZONTAL";
      if ((node.stackChildPrimaryGrow || 0) > 0) {
        if (horizontal === childHorizontal) node.stackPrimarySizing = "FIXED";
        else node.stackCounterSizing = "FIXED";
      }
      if (node.stackChildAlignSelf === "STRETCH") {
        if ((!horizontal) === childHorizontal) node.stackPrimarySizing = "FIXED";
        else node.stackCounterSizing = "FIXED";
      }
    }
    const fillsWidth = (horizontal && ((node.stackChildPrimaryGrow || 0) > 0 || primary === "fill")) || (!horizontal && counter === "fill");
    if (node.type === "TEXT" && fillsWidth) node.textAutoResize = "HEIGHT";
  });
}
function it(A, t, n, r, o, c) {`,
        ],
        [
          `    return FA.guid = {
      sessionID: AA,
      localID: o.nextLocalId++
    }, FA.name = "Text", o.nodes.push(FA), 1;`,
          `    FA.guid = {
      sessionID: AA,
      localID: o.nextLocalId++
    }, FA.name = "Text", o.nodes.push(FA);
    flexAL(N, A, i, y, o);
    return 1;`,
        ],
        [
          `      lA += it($, y, g, lA, o, !1);
    }
  return 1;
}
function jn(A, t, n, r, o, c) {`,
          `      lA += it($, y, g, lA, o, !1);
    }
  flexAL(N, A, i, y, o);
  return 1;
}
function jn(A, t, n, r, o, c) {`,
        ],
        [
          `function _n(A, t, n) {
  const r = A.getAttribute("role");`,
          `function _n(A, t, n) {
  const named = A.getAttribute("data-layer");
  if (named) return named;
  const r = A.getAttribute("role");`,
        ],
        [
          `function ke(A) {
  if (!A)
    return "Inter";`,
          `function ke(A) {
  if (!A)
    return "Geist";`,
        ],
        [
          `), V = dt(o.fontWeight), d = (o.fontStyle ?? "").includes("italic"), U = Fn(i.family, V, d) ? rt("Inter", o.fontWeight, o.fontStyle) : i, b = Re(`,
          `), V = dt(o.fontWeight), d = (o.fontStyle ?? "").includes("italic"), U = (i.family === "Geist" || i.family === "Inter" ? rt("Geist", o.fontWeight, o.fontStyle) : Fn(i.family, V, d) ? rt("Geist", o.fontWeight, o.fontStyle) : i), b = Re(`,
        ],
        [
          `  ].includes(t) ? "Inter" : ["serif", "ui-serif", "times new roman", "times", "georgia"].includes(t) ? "Noto Serif" : [`,
          `  ].includes(t) ? "Geist" : ["serif", "ui-serif", "times new roman", "times", "georgia"].includes(t) ? "Noto Serif" : [`,
        ],
        [
          `const ye = {
  "sans-serif": "Inter",
  "ui-sans-serif": "Inter",
  "-apple-system": "Inter",
  blinkmacsystemfont: "Inter",
  "system-ui": "Inter",
  "segoe ui": "Inter",
  arial: "Inter",
  helvetica: "Inter",
  "helvetica neue": "Inter",`,
          `const ye = {
  "sans-serif": "Geist",
  "ui-sans-serif": "Geist",
  "-apple-system": "Geist",
  blinkmacsystemfont: "Geist",
  "system-ui": "Geist",
  "segoe ui": "Geist",
  arial: "Geist",
  helvetica: "Geist",
  "helvetica neue": "Geist",`,
        ],
      ];
      for (const [from, to] of swaps) {
        if (!next.includes(from)) {
          throw new Error("figma autolayout patch missed a target in htmlToFigma.js");
        }
        next = next.replace(from, to);
      }
      return { code: next, map: null };
    },
  };
}
