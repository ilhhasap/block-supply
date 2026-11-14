export const num = (value: number) => value.toLocaleString("en-US");

/** 1,284 stays whole; 12,900 becomes 12.9K. */
export function compact(value: number) {
  if (Math.abs(value) < 10_000) return num(Math.round(value));
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export type Delta = { text: string; dir: "up" | "down" | "flat" | "none" };

/** The change against the period before, as the tile shows it. */
export function delta(now: number, prev: number | null): Delta {
  if (prev === null) return { text: "", dir: "none" };
  if (prev === 0) return now === 0 ? { text: "No change", dir: "flat" } : { text: "New", dir: "up" };
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return { text: "No change", dir: "flat" };
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, dir: pct > 0 ? "up" : "down" };
}

export function ago(iso: string | null, now = Date.now()) {
  if (!iso) return "Never";
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fullTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}

/** "2026-11-12" as "Nov 12". */
export function shortDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** A round number at or above `max`, so the top gridline is clean (1, 2, 5, 10, 20, 50, ...). */
export function niceMax(max: number) {
  if (max <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 4, 5, 10].find((option) => option * power >= max) ?? 10;
  return step * power;
}

export type Point = { label: string; value: number };

/** Daily values, or weekly sums once there are too many days for readable columns. */
export function toPoints(days: { day: string; [key: string]: number | string }[], key: string, weekly: boolean): Point[] {
  if (!weekly) return days.map((row) => ({ label: shortDay(row.day), value: Number(row[key]) }));
  const out: Point[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    const first = chunk[0]?.day ?? "";
    const last = chunk[chunk.length - 1]?.day ?? first;
    out.push({
      label: chunk.length > 1 ? `${shortDay(first)} – ${shortDay(last)}` : shortDay(first),
      value: chunk.reduce((sum, row) => sum + Number(row[key]), 0),
    });
  }
  return out;
}

function cell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const body = [headers, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
