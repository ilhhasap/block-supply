/**
 * QC comments: a private review tool for the owner. Comments are pinned to a spot on a block, kept in
 * `.qc/comments.json` by a dev-only endpoint, and never exist in production builds.
 */
export const QC_ENABLED = import.meta.env.DEV && import.meta.env.VITE_QC_ENABLED === "true";

export type QcElement = { layer: string | null; tag: string; text: string };

export type QcComment = {
  id: string;
  blockId: string;
  blockName: string;
  /** Where the pin sits: on the card in the grid, or on the preview in the editor. */
  where: "card" | "editor";
  /** Position inside that surface, 0 to 1. */
  x: number;
  y: number;
  /** The part of the block under the pin, when it could be found. */
  element: QcElement | null;
  text: string;
  status: "open" | "resolved";
  /** The fix or answer written back by Claude. */
  reply?: string;
  page: string;
  viewport: { w: number; h: number };
  createdAt: string;
  updatedAt: string;
};

type Op = { op: "upsert"; comment: QcComment } | { op: "delete"; id: string };

export async function loadComments(): Promise<QcComment[]> {
  const res = await fetch("/api/qc");
  if (!res.ok) return [];
  return (await res.json()) as QcComment[];
}

export async function sendOp(op: Op): Promise<void> {
  await fetch("/api/qc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(op) });
}
