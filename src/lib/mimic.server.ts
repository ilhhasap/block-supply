import Anthropic from "@anthropic-ai/sdk";
import { getSql } from "@/lib/db";
import { MIMIC_SCHEMA, MIMIC_SYSTEM } from "@/lib/mimic-prompt";

/** Mimic is built behind a flag: it only exists where VITE_MIMIC_ENABLED=true (local, for now). */
export const mimicEnabled = () => process.env.VITE_MIMIC_ENABLED === "true";

const MODEL = process.env.MIMIC_MODEL || "claude-sonnet-5-5";
const PER_DAY = Math.max(1, Number(process.env.MIMIC_PER_DAY) || 3);
const MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BASE64 = 4_200_000; // about 3 MB of image
const MAX_HTML = 60_000;

export type MimicStatus = { enabled: boolean; configured: boolean; mock: boolean; used: number; limit: number; resetsAt: string | null };
export type MimicResult = { name: string; html: string; note: string; used: number; limit: number };

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic());

const mockOn = () => process.env.NODE_ENV !== "production" && process.env.MIMIC_MOCK === "true";

export async function getMimicStatus(userId: string): Promise<MimicStatus> {
  if (!mimicEnabled()) throw new Error("Not found");
  const sql = await getSql();
  const rows = await sql.query<{ n: string; first: string | null }>(
    `select count(*) as n, min(created_at) as first from mimic_runs
     where user_id = $1 and status <> 'failed' and created_at > now() - interval '24 hours'`,
    [userId],
  );
  const used = Number(rows[0]?.n ?? 0);
  const first = rows[0]?.first ? new Date(rows[0].first) : null;
  return {
    enabled: true,
    configured: Boolean(process.env.ANTHROPIC_API_KEY) || mockOn(),
    mock: mockOn(),
    used,
    limit: PER_DAY,
    resetsAt: used >= PER_DAY && first ? new Date(first.getTime() + 24 * 3600 * 1000).toISOString() : null,
  };
}

const SAMPLE = `<div class="kit" data-layer="Sample card" style="display:flex;flex-direction:column;gap:12px;padding:24px;width:320px;background:#ffffff;border-radius:20px;border:1px solid #e6e5e2;box-shadow:0 12px 32px rgba(23,24,26,0.08);">
<div data-layer="Title" style="font-family:Geist, sans-serif;font-size:18px;font-weight:600;line-height:24px;color:#17181a;">Mock result</div>
<div data-layer="Body" style="font-family:Geist, sans-serif;font-size:14px;font-weight:400;line-height:20px;color:#6f6e68;">MIMIC_MOCK is on, so this card is a stand-in and no model was called.</div>
<div data-layer="Primary button" style="display:flex;align-items:center;justify-content:center;height:40px;padding:0px 18px;border-radius:999px;background:#17181a;align-self:flex-start;"><span style="font-family:Geist, sans-serif;font-size:14px;font-weight:500;line-height:20px;color:#ffffff;">Continue</span></div>
</div>`;

/** Run one generation for a signed-in user. The daily limit is checked and taken before anything is sent. */
export async function generateMimic(userId: string, input: { image: unknown; mime: unknown; hint: unknown }): Promise<MimicResult> {
  if (!mimicEnabled()) throw new Error("Not found");
  const { image, mime } = input;
  if (typeof image !== "string" || typeof mime !== "string" || !MIMES.has(mime) || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    throw new Error("Send a PNG, JPEG, WebP or GIF image.");
  }
  if (image.length > MAX_BASE64) throw new Error("That image is too large. Use one under 3 MB.");
  const hint = typeof input.hint === "string" ? input.hint.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  if (!mockOn() && !process.env.ANTHROPIC_API_KEY) throw new Error("Mimic is not set up on this server yet.");

  const sql = await getSql();
  const taken = await sql.query<{ id: string }>(
    `insert into mimic_runs (user_id, model)
     select $1, $2
     where (select count(*) from mimic_runs where user_id = $1 and status <> 'failed' and created_at > now() - interval '24 hours') < $3
       and not exists (select 1 from mimic_runs where user_id = $1 and status = 'pending' and created_at > now() - interval '3 minutes')
     returning id`,
    [userId, MODEL, PER_DAY],
  );
  const runId = taken[0]?.id;
  if (!runId) {
    const status = await getMimicStatus(userId);
    throw new Error(status.used >= PER_DAY ? `You have used your ${PER_DAY} generations for today.` : "A generation is already running.");
  }

  const finish = async (status: string, usage?: { input: number; output: number; cached: number }) =>
    sql.query(
      "update mimic_runs set status = $2, input_tokens = $3, output_tokens = $4, cache_read_tokens = $5 where id = $1",
      [runId, status, usage?.input ?? null, usage?.output ?? null, usage?.cached ?? null],
    );

  try {
    if (mockOn()) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await finish("failed"); // a mock run costs nothing, so it does not use up the limit
      return { name: "Mock result", html: SAMPLE, note: "Mock mode.", used: 0, limit: PER_DAY };
    }

    const response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // A safety decline is retried on another model inside the same call.
      fallbacks: "default",
      system: [{ type: "text", text: MIMIC_SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: MIMIC_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime as "image/png", data: image } },
            { type: "text", text: hint ? `Rebuild this component. What it is: ${hint}` : "Rebuild this component." },
          ],
        },
      ],
    } as Parameters<ReturnType<typeof anthropic>["beta"]["messages"]["create"]>[0]);

    if (!("content" in response)) throw new Error("No answer came back.");
    const usage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cached: response.usage.cache_read_input_tokens ?? 0,
    };
    if (response.stop_reason === "refusal") {
      await finish("failed", usage);
      throw new Error("That image could not be rebuilt. Try a different one.");
    }
    const text = response.content.find((block) => block.type === "text");
    const parsed = text && text.type === "text" ? (JSON.parse(text.text) as { name?: unknown; html?: unknown; note?: unknown }) : null;
    const html = typeof parsed?.html === "string" ? parsed.html.trim() : "";
    const note = typeof parsed?.note === "string" ? parsed.note.slice(0, 240) : "";
    if (!html) {
      await finish("failed", usage);
      throw new Error(note || "No component could be rebuilt from that image.");
    }
    if (html.length > MAX_HTML) {
      await finish("failed", usage);
      throw new Error("That component is too detailed to rebuild. Try a simpler crop.");
    }
    await finish("done", usage);
    const status = await getMimicStatus(userId);
    return { name: typeof parsed?.name === "string" && parsed.name.trim() ? parsed.name.trim().slice(0, 40) : "Mimic block", html, note, used: status.used, limit: status.limit };
  } catch (error) {
    // Anything that did not hand back a block gives the run back.
    await finish("failed").catch(() => {});
    if (error instanceof Anthropic.APIError) {
      console.error("[mimic]", error.status, error.message);
      throw new Error(error.status === 429 ? "Mimic is busy. Try again in a minute." : "The model could not be reached. Try again.");
    }
    throw error;
  }
}
