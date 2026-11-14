import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { elementAt } from "@/components/shadow-host";
import { loadComments, QC_ENABLED, sendOp, type QcComment, type QcElement } from "@/lib/qc";

type Qc = {
  enabled: boolean;
  on: boolean;
  setOn: (on: boolean) => void;
  comments: QcComment[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
  add: (comment: Omit<QcComment, "id" | "status" | "page" | "viewport" | "createdAt" | "updatedAt">) => string;
  update: (id: string, patch: Partial<Pick<QcComment, "text" | "status">>) => void;
  remove: (id: string) => void;
};

const Ctx = createContext<Qc | null>(null);
const MODE_KEY = "block-supply-qc";

export function useQc() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useQc outside QcProvider");
  return value;
}

export function QcProvider({ children }: { children: ReactNode }) {
  const [comments, setComments] = useState<QcComment[]>([]);
  const [on, setOnState] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!QC_ENABLED) return;
    try {
      setOnState(localStorage.getItem(MODE_KEY) === "1");
    } catch {
      /* storage can be blocked */
    }
    void loadComments().then(setComments);
    // Pick up replies Claude writes into the file while the page is open.
    const timer = window.setInterval(() => void loadComments().then(setComments), 4000);
    return () => window.clearInterval(timer);
  }, []);

  const setOn = useCallback((next: boolean) => {
    setOnState(next);
    setOpenId(null);
    try {
      localStorage.setItem(MODE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const add = useCallback<Qc["add"]>((input) => {
    const now = new Date().toISOString();
    const comment: QcComment = {
      ...input,
      id: Math.random().toString(36).slice(2, 10),
      status: "open",
      page: window.location.pathname,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      createdAt: now,
      updatedAt: now,
    };
    setComments((list) => [...list, comment]);
    void sendOp({ op: "upsert", comment });
    return comment.id;
  }, []);

  const update = useCallback<Qc["update"]>((id, patch) => {
    setComments((list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch, updatedAt: new Date().toISOString() };
        void sendOp({ op: "upsert", comment: next });
        return next;
      }),
    );
  }, []);

  const remove = useCallback<Qc["remove"]>((id) => {
    setComments((list) => list.filter((item) => item.id !== id));
    setOpenId((curr) => (curr === id ? null : curr));
    void sendOp({ op: "delete", id });
  }, []);

  const value = useMemo<Qc>(
    () => ({ enabled: QC_ENABLED, on, setOn, comments, openId, setOpenId, add, update, remove }),
    [on, setOn, comments, openId, add, update, remove],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Floating switch for review mode, with the number of open comments. */
export function QcToggle() {
  const { enabled, on, setOn, comments } = useQc();
  if (!enabled) return null;
  const open = comments.filter((item) => item.status === "open").length;
  return (
    <button type="button" className="qc-toggle" data-on={on ? "true" : "false"} onClick={() => setOn(!on)}>
      <span className="qc-dot" />
      {on ? "Reviewing" : "Review"}
      <b>{open}</b>
    </button>
  );
}

function describe(el: HTMLElement | null): QcElement | null {
  if (!el) return null;
  const layers: string[] = [];
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const layer = node.getAttribute("data-layer");
    if (layer) layers.push(layer);
  }
  return {
    layer: layers.length ? layers.reverse().join(" > ") : null,
    tag: el.tagName.toLowerCase(),
    text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
  };
}

/** Pins and the click-to-comment surface for one block, drawn over `where`. */
export function QcLayer({ blockId, blockName, where }: { blockId: string; blockName: string; where: "card" | "editor" }) {
  const qc = useQc();
  const surface = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; element: QcElement | null } | null>(null);
  if (!qc.enabled) return null;

  const mine = qc.comments.filter((item) => item.blockId === blockId && item.where === where);

  function place(event: React.MouseEvent) {
    // Option-click is the way through: it opens the card's editor as usual.
    if (event.altKey) return;
    event.stopPropagation();
    const box = surface.current?.getBoundingClientRect();
    if (!box) return;
    const holder = surface.current?.parentElement ?? null;
    // The surface sits on top, so let the hit test pass through it to reach the block underneath.
    const layer = surface.current;
    if (layer) layer.style.pointerEvents = "none";
    const hit = elementAt(holder, event.clientX, event.clientY);
    if (layer) layer.style.pointerEvents = "";
    setDraft({
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
      element: describe(hit),
    });
    qc.setOpenId(null);
  }

  return (
    <div ref={surface} className="qc-layer" data-on={qc.on ? "true" : "false"} onClick={qc.on ? place : undefined}>
      {mine.map((item, index) => (
        <Pin key={item.id} comment={item} number={index + 1} />
      ))}
      {draft ? (
        <Draft
          x={draft.x}
          y={draft.y}
          onCancel={() => setDraft(null)}
          onSave={(text) => {
            const id = qc.add({ blockId, blockName, where, x: draft.x, y: draft.y, element: draft.element, text });
            setDraft(null);
            qc.setOpenId(id);
          }}
        />
      ) : null}
    </div>
  );
}

function Pin({ comment, number }: { comment: QcComment; number: number }) {
  const qc = useQc();
  const ref = useRef<HTMLButtonElement>(null);
  const open = qc.openId === comment.id;
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="qc-pin"
        data-status={comment.status}
        style={{ left: `${comment.x * 100}%`, top: `${comment.y * 100}%` }}
        aria-label={`Comment ${number}`}
        onClick={(event) => {
          event.stopPropagation();
          qc.setOpenId(open ? null : comment.id);
        }}
      >
        {number}
      </button>
      {open ? <Popover anchor={ref}><Thread comment={comment} /></Popover> : null}
    </>
  );
}

function Draft({ x, y, onSave, onCancel }: { x: number; y: number; onSave: (text: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState("");
  return (
    <>
      <span ref={ref} className="qc-pin" data-status="draft" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />
      <Popover anchor={ref}>
        <textarea
          autoFocus
          className="qc-text"
          placeholder="Leave a comment"
          value={text}
          rows={3}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
            if (event.key === "Enter" && !event.shiftKey && text.trim()) {
              event.preventDefault();
              onSave(text.trim());
            }
          }}
        />
        <div className="qc-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" data-primary="true" disabled={!text.trim()} onClick={() => onSave(text.trim())}>
            Comment
          </button>
        </div>
      </Popover>
    </>
  );
}

function Thread({ comment }: { comment: QcComment }) {
  const qc = useQc();
  const [text, setText] = useState(comment.text);
  return (
    <>
      {comment.element ? (
        <p className="qc-meta">
          {comment.element.layer ?? comment.element.tag}
          {comment.element.text ? ` · “${comment.element.text}”` : ""}
        </p>
      ) : null}
      <textarea
        className="qc-text"
        value={text}
        rows={3}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => text.trim() && text !== comment.text && qc.update(comment.id, { text: text.trim() })}
        onKeyDown={(event) => {
          if (event.key === "Escape") qc.setOpenId(null);
        }}
      />
      {comment.reply ? (
        <p className="qc-reply">
          <b>Claude</b> {comment.reply}
        </p>
      ) : null}
      <div className="qc-actions">
        <button type="button" onClick={() => qc.remove(comment.id)}>
          Delete
        </button>
        <button
          type="button"
          data-primary="true"
          onClick={() => {
            qc.update(comment.id, { status: comment.status === "open" ? "resolved" : "open" });
            qc.setOpenId(null);
          }}
        >
          {comment.status === "open" ? "Resolve" : "Reopen"}
        </button>
      </div>
    </>
  );
}

/** A small card next to a pin. It is drawn in the page body so cards and the editor never clip it. */
function Popover({ anchor, children }: { anchor: React.RefObject<HTMLElement | null>; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const pin = anchor.current?.getBoundingClientRect();
    const pop = box.current?.getBoundingClientRect();
    if (!pin || !pop) return;
    const left = pin.right + 8 + pop.width > window.innerWidth ? pin.left - 8 - pop.width : pin.right + 8;
    const top = Math.min(Math.max(8, pin.top - 8), window.innerHeight - pop.height - 8);
    setAt({ left: Math.max(8, left), top });
  }, [anchor]);
  return createPortal(
    <div
      ref={box}
      className="qc-pop"
      data-qc-pop=""
      style={{ left: at?.left ?? 0, top: at?.top ?? 0, opacity: at ? 1 : 0 }}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
