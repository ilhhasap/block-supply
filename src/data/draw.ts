const INK = "#17181A";
const MUTE = "#6F6E68";

const AMP = String.fromCharCode(38);

export function esc(s: string) {
  return s
    .replaceAll(AMP, AMP + "amp;")
    .replaceAll("<", AMP + "lt;")
    .replaceAll(">", AMP + "gt;")
    .replaceAll('"', AMP + "quot;");
}

export function doc(id: string, w: number, h: number, body: string, title: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
<title>${esc(title)}</title>
<defs>
<filter id="sh-${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#17181A" flood-opacity="0.08"/></filter>
</defs>
${body}
</svg>`;
}

export function card(id: string, x: number, y: number, w: number, h: number, r = 18) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#FFFFFF" filter="url(#sh-${id})"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#17181A" stroke-opacity="0.08"/>`;
}

export function R(
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
  fill: string,
  extra = "",
) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" fill="${fill}" ${extra}/>`;
}

export function C(cx: number, cy: number, r: number, fill: string, extra = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
}

export function T(
  x: number,
  y: number,
  text: string,
  size = 14,
  fill = INK,
  weight = 500,
  anchor: "start" | "middle" | "end" = "start",
) {
  return `<text x="${x}" y="${y}" font-family="Geist, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(text)}</text>`;
}

export function mid(x: number, cy: number, text: string, size = 14, fill = INK, weight = 500) {
  return T(x, cy + size * 0.35, text, size, fill, weight, "middle");
}

export { INK, MUTE };
