import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { BlockView } from "@/components/block-view";
import { Editor } from "@/components/editor";
import { kitIn } from "@/components/shadow-host";
import type { Block } from "@/data/blocks";
import { registerGenerated } from "@/lib/generated";
import { mimicGenerate, mimicStatus } from "@/lib/mimic";
import type { MimicStatus } from "@/lib/mimic.server";
import { sanitizeBlockHtml } from "@/lib/mimic-html";

/**
 * Mimic turns a screenshot of a component into an editable block. It is built behind a flag: in
 * production the page only says it is coming soon; set `VITE_MIMIC_ENABLED=true` to work on it locally.
 */
export const MIMIC_ENABLED = import.meta.env.VITE_MIMIC_ENABLED === "true";

type Result = { id: string; name: string; html: string; note: string };

const STORE_KEY = "block-supply-mimic";
const KEEP = 8;
const MAX_EDGE = 1568;

type Props = {
  signedIn: boolean;
  onLogin: () => void;
  onCopy: (block: Block, kit: HTMLElement | null) => void;
  busy: string | null;
  copied: string | null;
};

export function MimicPage(props: Props) {
  return MIMIC_ENABLED ? <MimicTool {...props} /> : <ComingSoon />;
}

function ComingSoon() {
  return (
    <section className="mimic">
      <p className="mimic-soon" aria-hidden="true">
        Soon
      </p>
      <h1 className="mimic-title">Mimic</h1>
      <p className="mimic-sub">Upload a screenshot of a component and get it back as an editable block, ready to paste into Figma.</p>
      <span className="hero-pill mimic-pill">Coming soon</span>
    </section>
  );
}

/** Shrink a screenshot to what the model can use and encode it, so the upload stays small. */
async function prepare(file: File): Promise<{ image: string; mime: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot read the image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.92, 0.82, 0.7]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    const image = url.slice(url.indexOf(",") + 1);
    if (image.length < 4_000_000) return { image, mime: "image/jpeg" };
  }
  throw new Error("That image is too large. Crop it to just the component.");
}

function loadSaved(): Result[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    const out: Result[] = [];
    for (const item of raw as Partial<Result>[]) {
      if (typeof item?.id !== "string" || !item.id.startsWith("mimic-") || typeof item.html !== "string") continue;
      const html = sanitizeBlockHtml(item.html);
      if (!html) continue;
      registerGenerated(item.id, html);
      out.push({ id: item.id, name: String(item.name ?? "Mimic block").slice(0, 40), html, note: String(item.note ?? "") });
    }
    return out.slice(0, KEEP);
  } catch {
    return [];
  }
}

const asBlock = (result: Result): Block => ({ id: result.id, name: result.name, cat: "Card", h: 240 });

function MimicTool({ signedIn, onLogin, onCopy, busy, copied }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState<MimicStatus | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setResults(loadSaved()), []);

  useEffect(() => {
    if (!signedIn) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    mimicStatus()
      .then((next) => !cancelled && setStatus(next))
      .catch(() => !cancelled && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const pick = useCallback((next: File | null | undefined) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Choose an image file: PNG, JPEG, WebP or GIF.");
      return;
    }
    if (next.size > 15 * 1024 * 1024) {
      setError("That file is over 15 MB. Crop it to just the component.");
      return;
    }
    setError(null);
    setFile(next);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(next);
    });
  }, []);

  // A screenshot pasted from the clipboard works anywhere on the page.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith("image/"));
      const pasted = item?.getAsFile();
      if (pasted) {
        event.preventDefault();
        pick(pasted);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pick]);

  function remember(list: Result[]) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch {
      /* storage can be blocked */
    }
  }

  async function generate() {
    if (!file || working) return;
    setWorking(true);
    setError(null);
    try {
      const { image, mime } = await prepare(file);
      const out = await mimicGenerate({ data: { image, mime, hint } });
      const html = sanitizeBlockHtml(out.html);
      if (!html) throw new Error("The result could not be drawn. Try again.");
      const id = `mimic-${Date.now().toString(36)}`;
      registerGenerated(id, html);
      const next = [{ id, name: out.name, html, note: out.note }, ...results].slice(0, KEEP);
      setResults(next);
      remember(next);
      setStatus((old) => (old ? { ...old, used: out.used, limit: out.limit } : old));
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : "Something went wrong. Try again.");
      void mimicStatus().then(setStatus).catch(() => {});
    } finally {
      setWorking(false);
    }
  }

  function remove(id: string) {
    const next = results.filter((item) => item.id !== id);
    setResults(next);
    remember(next);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    pick(event.dataTransfer.files[0]);
  }

  const left = status ? Math.max(0, status.limit - status.used) : null;
  const ready = signedIn && status?.configured !== false;
  const open = results.find((item) => item.id === openId) ?? null;

  return (
    <section className="mimic-tool">
      <header className="mimic-head">
        <h1 className="mimic-title">Mimic</h1>
        <p className="mimic-sub">Upload a screenshot of one component. Mimic rebuilds it as an editable block you can tune and paste into Figma as auto layout.</p>
      </header>

      <div
        className="mimic-drop"
        data-over={over ? "true" : "false"}
        data-filled={preview ? "true" : "false"}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img src={preview} alt="The screenshot you chose" />
        ) : (
          <p>
            Drop a screenshot here, paste it with <kbd>⌘ V</kbd>, or choose a file.
          </p>
        )}
        <button type="button" className="mimic-choose" onClick={() => input.current?.click()}>
          {preview ? "Choose another" : "Choose a file"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      <div className="mimic-form">
        <input
          className="mimic-hint"
          value={hint}
          maxLength={200}
          placeholder="What is it? (optional, e.g. pricing card, dark login form)"
          aria-label="What the component is"
          onChange={(event) => setHint(event.target.value)}
        />
        {signedIn ? (
          <button type="button" className="hero-join mimic-go" disabled={!file || working || !ready || left === 0} onClick={() => void generate()}>
            {working ? "Rebuilding…" : "Rebuild it"}
          </button>
        ) : (
          <button type="button" className="hero-join mimic-go" onClick={onLogin}>
            Log in to use Mimic
          </button>
        )}
      </div>

      <p className="mimic-meta" aria-live="polite">
        {!signedIn
          ? "Free with an account."
          : status?.configured === false
            ? "Mimic is not set up on this server: add ANTHROPIC_API_KEY."
            : status
              ? left === 0
                ? `You have used all ${status.limit} for today${status.resetsAt ? `. More after ${new Date(status.resetsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` : "."}`
                : `${left} of ${status.limit} left today${status.mock ? " · mock mode, no model is called" : ""}`
              : ""}
      </p>
      {error ? (
        <p className="mimic-error" role="alert">
          {error}
        </p>
      ) : null}

      {results.length ? (
        <div className="mimic-results">
          <h2>Your blocks</h2>
          <div className="mimic-grid">
            {results.map((item) => (
              <article
                key={item.id}
                id={`block-${item.id}`}
                className="card"
                style={{ ["--h" as string]: "240px" }}
                onClick={() => setOpenId(item.id)}
              >
                <div className="stage">
                  <BlockView id={item.id} />
                </div>
                <span className="cname">{item.name}</span>
                <button
                  type="button"
                  className="mimic-x"
                  aria-label={`Remove ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(item.id);
                  }}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className="copy"
                  data-on={copied === item.id ? "true" : "false"}
                  aria-label={`Copy ${item.name} to Figma`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCopy(asBlock(item), kitIn(event.currentTarget.closest("article")));
                  }}
                >
                  {busy === item.id ? "Copying" : copied === item.id ? "Copied" : "Copy"}
                </button>
              </article>
            ))}
          </div>
          <p className="mimic-meta">Kept in this browser only. {results[0]?.note ? `Note: ${results[0].note}` : ""}</p>
        </div>
      ) : null}

      {open ? (
        <Editor
          key={open.id}
          block={asBlock(open)}
          saved={false}
          busy={busy === open.id}
          copied={copied === open.id}
          onClose={() => setOpenId(null)}
          onSave={() => {}}
          onCopy={(kit) => onCopy(asBlock(open), kit)}
          onShare={() => {}}
        />
      ) : null}
    </section>
  );
}
