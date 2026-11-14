import { createFileRoute } from "@tanstack/react-router";

/** Dev-only storage for QC comments (`.qc/comments.json`). In a production build this is a 404. */
const FILE = ".qc/comments.json";

async function read(): Promise<unknown[]> {
  const fs = await import("node:fs/promises");
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(list: unknown[]) {
  const fs = await import("node:fs/promises");
  await fs.mkdir(".qc", { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2) + "\n");
}

const notFound = () => new Response("Not found", { status: 404 });
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/api/qc")({
  server: {
    handlers: {
      GET: async () => {
        if (!import.meta.env.DEV) return notFound();
        return json(await read());
      },
      POST: async ({ request }) => {
        if (!import.meta.env.DEV) return notFound();
        const body = (await request.json()) as
          | { op: "upsert"; comment: { id: string } }
          | { op: "delete"; id: string };
        const list = (await read()) as { id: string }[];
        if (body.op === "delete") {
          await write(list.filter((item) => item.id !== body.id));
        } else {
          const at = list.findIndex((item) => item.id === body.comment.id);
          if (at >= 0) list[at] = body.comment;
          else list.push(body.comment);
          await write(list);
        }
        return json({ ok: true });
      },
    },
  },
});
