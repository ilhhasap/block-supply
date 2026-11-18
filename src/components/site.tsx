import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { BLOCKS, GROUPS, GROUP_CATEGORIES, groupOf, type Block, type Category, type Group } from "@/data/blocks";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authEnabled, signOut } from "@/lib/auth/client";
import { releaseCopy, reserveCopy } from "@/lib/copy-gate";
import { blockPopularity } from "@/lib/popularity";
import { isSortMode, needsCounts, sortBlocks, type Popularity, type SortMode } from "@/lib/sort-blocks";
import { FREE_COPIES } from "@/lib/copy-limit";
import { listSavedBlocks, mergeSavedBlocks, setSavedBlock } from "@/lib/saved";
import { recordCopyEvent, recordCopyFailureEvent } from "@/lib/stats";
import { BlockView } from "@/components/block-view";
import { SortMenu } from "@/components/sort-menu";
import { Editor } from "@/components/editor";
import { AuthModal } from "@/components/auth-modal";
import { Footer } from "@/components/footer";
import { FigmaMark } from "@/components/figma-mark";
import { MIMIC_ENABLED, MimicPage } from "@/components/mimic";
import { QcLayer, QcToggle } from "@/components/qc";
import { hostOf, isControlEvent, kitIn } from "@/components/shadow-host";

const LOCAL_SAVED = "block-supply-saved";
const TOAST_TEXT: Record<string, string> = {
  "Couldn’t copy": "Couldn’t copy",
  "Link copied": "Link copied",
  "HTML copied": "HTML copied",
  "React copied": "React copied",
  "Log in": "Log in to keep copying",
  Saved: "Saved to your list",
  "Welcome back": "You’re in. Copy it again",
  "Couldn’t save": "Couldn’t save, try again",
};
/** Messages that report a failure rather than a success. */
const ERROR_TOASTS = new Set(["Couldn’t copy", "Couldn’t save"]);
const PENDING_SAVE = "supply-pending-save";
const PENDING_COPY = "supply-pending-copy";

function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.12)} viewBox="0 0 32 36" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1.4 28.6 8.6c1.1.63 1.8 1.82 1.8 3.1v12.6c0 1.28-.7 2.47-1.8 3.1L16 34.6c-1.05.6-2.35.6-3.4 0L3.4 27.4c-1.1-.63-1.8-1.82-1.8-3.1V11.7c0-1.28.7-2.47 1.8-3.1L12.6 1.4c1.05-.6 2.35-.6 3.4 0Z"
      />
      <rect x="11.2" y="11" width="9.6" height="14" rx="2" fill="#fff" />
    </svg>
  );
}

function columnsFor(width: number) {
  if (width < 740) return 1;
  if (width < 1100) return 2;
  return 3;
}

function pack(items: Block[], n: number) {
  const cols: Block[][] = Array.from({ length: n }, () => []);
  const heights = Array.from({ length: n }, () => 0);
  for (const item of items) {
    let at = 0;
    for (let i = 1; i < n; i++) if (heights[i]! < heights[at]!) at = i;
    cols[at]!.push(item);
    heights[at] += item.h + 12;
  }
  return cols;
}

/** An opaque colour so close to white that the converter treats it as no fill. */
function nearWhite(color: string) {
  const match = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)/.exec(color);
  if (!match) return false;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  return alpha >= 0.95 && Math.min(Number(match[1]), Number(match[2]), Number(match[3])) >= 245;
}

/**
 * A live text field draws its placeholder as a separate, absolutely placed span next to an empty editable
 * one. The converter puts such a span far outside the field. Fold the placeholder into the editable span
 * (in the placeholder's colour) so it pastes as ordinary text inside the field.
 */
function foldPlaceholders(root: Element) {
  for (const edit of Array.from(root.querySelectorAll<HTMLElement>("[contenteditable]"))) {
    const next = edit.nextElementSibling;
    if (edit.textContent || !(next instanceof HTMLElement)) continue;
    const style = next.getAttribute("style") ?? "";
    if (!/position:\s*absolute/.test(style)) continue;
    edit.textContent = next.textContent ?? "";
    const color = /(?:^|;)\s*color:\s*([^;]+)/.exec(style)?.[1];
    if (color) edit.setAttribute("style", `${edit.getAttribute("style") ?? ""};color:${color}`);
    next.remove();
  }
}

/**
 * A one-line text whose box is wider than the text (a table cell that takes half the row, a label pushed to
 * the end) pastes as a text layer that hugs the text, so its cell loses its width and the columns slide
 * together. Wrapping the text in a span turns the box into a frame that keeps its measured width; the
 * frame's alignment follows `text-align`. Returns a function that puts everything back.
 */
function pinTextBoxes(kit: HTMLElement): () => void {
  const undo: Array<() => void> = [];
  for (const el of Array.from(kit.querySelectorAll<HTMLElement>("*"))) {
    if (el instanceof SVGElement || el.children.length) continue;
    const texts = Array.from(el.childNodes).filter(
      (node): node is Text => node.nodeType === 3 && Boolean(node.textContent?.trim()),
    );
    if (!texts.length || texts.length !== el.childNodes.length) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "inline") continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects());
    const box = el.getBoundingClientRect();
    const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    const textWidth = Math.max(...rects.map((rect) => rect.width), 0);
    const padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    if (!textWidth || box.height > line * 1.5 + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) continue;
    if (box.width - padding - textWidth < 2) continue;
    const span = document.createElement("span");
    const before = el.getAttribute("style");
    for (const text of texts) span.appendChild(text);
    el.appendChild(span);
    const align = cs.textAlign;
    const justify = align === "center" ? "center" : align === "right" || align === "end" ? "flex-end" : "flex-start";
    el.style.display = "flex";
    el.style.justifyContent = justify;
    undo.push(() => {
      for (const text of Array.from(span.childNodes)) el.insertBefore(text, span);
      span.remove();
      if (before === null) el.removeAttribute("style");
      else el.setAttribute("style", before);
    });
  }
  return () => undo.reverse().forEach((fn) => fn());
}

/**
 * Draws the block the way the editor panel does (same frame, same sizing) in a hidden spot, so a copy from a
 * homepage card pastes at exactly the size the panel gives, not at the size of the card preview.
 */
async function mountLikeEditor(id: string): Promise<{ kit: HTMLElement | null; dispose: () => void }> {
  const host = document.createElement("div");
  host.className = "bench-frame";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;top:0;left:-10000px;pointer-events:none";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<BlockView id={id} />);
  let kit: HTMLElement | null = null;
  for (let waited = 0; waited < 2000 && !kit; waited += 30) {
    await new Promise((resolve) => window.setTimeout(resolve, 30));
    const found = kitIn(host);
    if (found && found.offsetWidth > 0) kit = found;
  }
  // Let the block settle (fonts, the fit-to-frame measurement) before it is read.
  if (kit) await new Promise((resolve) => window.setTimeout(resolve, 150));
  return {
    kit,
    dispose: () => {
      root.unmount();
      host.remove();
    },
  };
}

/** The block as Figma clipboard HTML. Throws when it cannot be built. */
async function buildFigmaHtml(block: Block, kit: HTMLElement): Promise<string> {
  const inEditor = Boolean(hostOf(kit)?.closest(".bench-frame"));
  if (inEditor || block.id.startsWith("mimic-")) return convertKit(block, kit);
  const copy = await mountLikeEditor(block.id);
  try {
    return await convertKit(block, copy.kit ?? kit);
  } finally {
    copy.dispose();
  }
}

async function convertKit(block: Block, kit: HTMLElement): Promise<string> {
  const { generateFromElement, inlineComputedStyles } = await import("@magicpatterns/html-to-figma");
  // A block shown scaled down is copied at its real size.
  // The Mimic canvas zooms its whole world; measuring through that scale would shrink every box but not its text.
  const scaled: Array<[HTMLElement, string]> = [];
  for (let node: Element | null = hostOf(kit) ?? kit; node; node = node.parentElement) {
    if (node instanceof HTMLElement && node.matches("[data-fit-inner], .mimic-world")) {
      scaled.push([node, node.style.transform]);
      node.style.transform = "none";
    }
  }
  // The converter gives a frame with no fill an opaque white one, which shows up in Figma as a
  // white box behind blocks that only have shadows. An almost-invisible fill keeps it clear.
  const bgBefore = kit.style.backgroundColor;
  const rootFill = getComputedStyle(kit).backgroundColor;
  const clearRoot = /^(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/.test(getComputedStyle(kit).backgroundColor);
  if (clearRoot) kit.style.backgroundColor = block.id.startsWith("mimic-") ? "#ffffff" : "rgba(255, 255, 255, 0.004)";
  let inlined: string;
  const unpin = block.id.startsWith("mimic-") ? pinTextBoxes(kit) : () => {};
  try {
    inlined = inlineComputedStyles(kit);
  } finally {
    unpin();
    for (const [node, before] of scaled) node.style.transform = before;
    if (clearRoot) kit.style.backgroundColor = bgBefore;
  }
  const clone = new DOMParser().parseFromString(inlined, "text/html").body.firstElementChild;
  if (!clone) throw new Error("empty frame");
  foldPlaceholders(clone);
  // The converter drops a solid white (or nearly white) fill on the outer frame, so the pasted frame
  // is see-through. A white-to-white gradient survives and looks the same.
  // Every block with a white card (forms, pricing, dialogs) needs it; a Mimic block with no fill gets one too.
  if (clone instanceof HTMLElement && ((clearRoot && block.id.startsWith("mimic-")) || nearWhite(rootFill))) {
    // Appended as text: going through `style` would merge the longhands the converter reads.
    clone.setAttribute("style", `${clone.getAttribute("style") ?? ""};background-image:linear-gradient(#ffffff, #ffffff)`);
  }
  return generateFromElement(clone, { topLayerName: block.name });
}

export function Site() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  // The shortcut hint reads ⌘ K on a Mac; detected after mount so the server and first render agree.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform;
    setIsMac(/mac|iphone|ipad/i.test(platform));
  }, []);
  // The page comes from the URL: `/library` components, `/sections`, `/pricing`.
  // `/b/<id>` is the same library with that block's editor open on top.
  const { page: pageParam, id: blockParam } = useParams({ strict: false }) as { page?: string; id?: string };
  const editing = BLOCKS.some((block) => block.id === blockParam) ? (blockParam ?? null) : null;
  const editingGroup = editing ? groupOf(BLOCKS.find((block) => block.id === editing)!.cat) : null;
  const page: "components" | "sections" | "pricing" | "mimic" =
    editingGroup === "Sections"
      ? "sections"
      : editingGroup
        ? "components"
        : pageParam === "sections" || pageParam === "pricing" || pageParam === "mimic"
          ? pageParam
          : "components";
  const group: Group = page === "sections" ? "Sections" : "Components";
  // Pages that are not a block library: no group tab is active on them.
  const ownPage = page === "pricing" || page === "mimic";
  const [cat, setCat] = useState<Category | null>(null);
  const [sort, setSort] = useState<SortMode>("featured");
  const [counts, setCounts] = useState<Popularity | null>(null);
  const [cols, setCols] = useState(3);
  const [saved, setSaved] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  // The last message stays on screen while the toast fades out.
  const lastToast = useRef("");
  if (toast) lastToast.current = toast;
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const findRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user: currentUser, isPending: authPending } = useCurrentUserState();
  const [showTop, setShowTop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // The navbar tucks away while the page scrolls down and returns when scrolling stops or reverses.
  const [navHidden, setNavHidden] = useState(false);
  const lastTop = useRef(0);
  const idleTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(idleTimer.current), []);
  const [gate, setGate] = useState<"save" | "copy" | null>(null);
  const [auth, setAuth] = useState<{ mode: "login" | "signup"; note?: string } | null>(null);
  const { auth: authParam } = useSearch({ strict: false }) as { auth?: string };

  // `/?auth=login` (the old /login link, emails) opens the modal, then drops the parameter.
  useEffect(() => {
    if (authParam !== "login" && authParam !== "signup") return;
    if (authPending) return;
    if (!currentUser) setAuth({ mode: authParam });
    void navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, auth: undefined }), replace: true });
  }, [authParam, authPending, currentUser, navigate]);

  useEffect(() => {
    const sync = () => setCols(columnsFor(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // Saved blocks live on the account. When a visitor is signed in, pull their list, folding in
  // anything saved in this browser before (or the block they tried to save when asked to log in).
  const userId = currentUser?.id ?? null;
  useEffect(() => {
    if (authPending) return;
    if (!userId) {
      setSaved([]);
      setOnlySaved(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      let local: string[] = [];
      let pendingSave: string | null = null;
      let copyRetry = false;
      try {
        const raw = localStorage.getItem(LOCAL_SAVED);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) local = parsed.filter((id): id is string => typeof id === "string");
        pendingSave = window.sessionStorage.getItem(PENDING_SAVE);
        copyRetry = window.sessionStorage.getItem(PENDING_COPY) === "1";
      } catch {
        /* storage unavailable */
      }
      const known = new Set(BLOCKS.map((block) => block.id));
      const ids = [...local, ...(pendingSave ? [pendingSave] : [])].filter((id) => known.has(id));
      try {
        const list = ids.length ? await mergeSavedBlocks({ data: { ids } }) : await listSavedBlocks();
        if (cancelled) return;
        setSaved(list);
        try {
          localStorage.removeItem(LOCAL_SAVED);
          window.sessionStorage.removeItem(PENDING_SAVE);
          window.sessionStorage.removeItem(PENDING_COPY);
        } catch {
          /* storage unavailable */
        }
        if (pendingSave && list.includes(pendingSave)) setToast("Saved");
        else if (copyRetry) setToast("Welcome back");
      } catch {
        if (cancelled) return;
        setSaved(local);
        setToast("Couldn’t save");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authPending, userId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        findRef.current?.focus();
        findRef.current?.select();
      }
      if (event.key === "Escape") {
        setGate(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  // The sort the visitor chose last time, kept in this browser.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("supply-sort");
      if (isSortMode(stored)) setSort(stored);
    } catch {
      /* storage can be blocked */
    }
  }, []);

  function chooseSort(next: SortMode) {
    setSort(next);
    try {
      localStorage.setItem("supply-sort", next);
    } catch {
      /* storage can be blocked */
    }
  }

  // Copy and save counts are only fetched when a sort needs them.
  useEffect(() => {
    if (!needsCounts(sort) || counts) return;
    let cancelled = false;
    blockPopularity()
      .then((next) => !cancelled && setCounts(next))
      .catch(() => !cancelled && setCounts({}));
    return () => {
      cancelled = true;
    };
  }, [sort, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortBlocks(BLOCKS, sort, counts).filter((block) => {
      // A search looks through everything; otherwise only the chosen group.
      if (!q && groupOf(block.cat) !== group) return false;
      if (cat && block.cat !== cat) return false;
      if (onlySaved && !saved.includes(block.id)) return false;
      if (!q) return true;
      return (
        block.name.toLowerCase().includes(q) ||
        block.cat.toLowerCase().includes(q) ||
        block.id.includes(q)
      );
    });
  }, [query, group, cat, onlySaved, saved, sort, counts]);

  // Sections are wide layouts, so they get at most two columns; a search mixes groups and keeps the usual grid.
  // Nothing left to show in Saved (the last one was unsaved): go back to browsing everything.
  useEffect(() => {
    if (onlySaved && saved.length === 0) setOnlySaved(false);
  }, [onlySaved, saved.length]);

  const wallCols = group === "Sections" && !query.trim() ? Math.min(cols, 2) : cols;
  const packed = useMemo(() => pack(filtered, wallCols), [filtered, wallCols]);

  function goLibrary() {
    setCat(null);
    void navigate({ to: "/{-$page}", params: { page: "library" } });
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  // A new page starts at the top with no category chosen.
  useEffect(() => {
    setCat(null);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  /** Saving needs an account; signed-out visitors get the log-in prompt instead. */
  function requestSave(id: string) {
    if (!currentUser) {
      if (!authPending) {
        try {
          window.sessionStorage.setItem(PENDING_SAVE, id);
        } catch {
          /* storage unavailable */
        }
        setGate("save");
      }
      return;
    }
    toggleSave(id);
  }

  function toggleSave(id: string) {
    const on = !saved.includes(id);
    setSaved((prev) => (on ? [...prev, id] : prev.filter((item) => item !== id)));
    setSavedBlock({ data: { id, on } })
      .then((list) => setSaved(list))
      .catch(() => {
        setSaved((prev) => (on ? prev.filter((item) => item !== id) : [...prev, id]));
        setToast("Couldn’t save");
      });
  }

  async function onCopy(block: Block, kit: HTMLElement | null) {
    if (!kit || busy) return;
    setBusy(block.id);
    // What happened on the way, so a failure can undo exactly what was done.
    const state: { gate: Awaited<ReturnType<typeof reserveCopy>> | null; reserved: boolean } = { gate: null, reserved: false };
    const job = (async () => {
      const gate = await reserveCopy();
      state.gate = gate;
      if (!gate.ok) throw new Error("free copies used");
      state.reserved = true;
      return buildFigmaHtml(block, kit);
    })();
    job.catch(() => {});
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("clipboard");
      // The write starts now, while the click still counts, and waits for the block to be ready. Writing
      // after the server and the converter had answered could be refused once the click had expired.
      const blob = job.then((html) => new Blob([html], { type: "text/html" }));
      let item: ClipboardItem;
      try {
        item = new ClipboardItem({ "text/html": blob });
      } catch {
        item = new ClipboardItem({ "text/html": await blob });
      }
      await navigator.clipboard.write([item]);
    } catch (error) {
      setBusy(null);
      if (state.gate && !state.gate.ok) {
        setGate("copy");
        return;
      }
      console.error(error);
      // Tell the owner's dashboard which block failed and why; never let that bother the visitor.
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      void recordCopyFailureEvent({ data: { id: block.id, message: reason } }).catch(() => {});
      // The copy did not reach the clipboard, so it must not count against the free copies.
      if (state.reserved) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await releaseCopy();
            break;
          } catch {
            /* try once more */
          }
        }
      }
      setToast("Couldn’t copy");
      return;
    }
    setBusy(null);
    const gate = state.gate;
    setCopied(block.id);
    // Count the copy for the owner's stats; a failure here must never affect the visitor.
    void recordCopyEvent({ data: { id: block.id } }).catch(() => {});
    setToast(gate && gate.ok && !gate.signedIn && gate.used >= gate.limit ? "Last free copy" : block.name);
    window.setTimeout(() => setCopied((curr) => (curr === block.id ? null : curr)), 1600);
  }

  // The pill behind the active tab slides to the new tab instead of jumping.
  const tabsRef = useRef<HTMLElement>(null);
  const [tabPill, setTabPill] = useState<{ x: number; w: number } | null>(null);
  const tabKey = `${page}|${ownPage}|${group}`;
  useLayoutEffect(() => {
    const nav = tabsRef.current;
    if (!nav) return;
    const place = () => {
      const on = nav.querySelector<HTMLElement>('[data-on="true"]');
      setTabPill(on ? { x: on.offsetLeft, w: on.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    void document.fonts?.ready.then(place);
    return () => window.removeEventListener("resize", place);
  }, [tabKey]);

  const editingBlock = BLOCKS.find((block) => block.id === editing) ?? null;

  async function onShare(block: Block) {
    const url = `${window.location.origin}/b/${block.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast("Couldn’t copy");
    }
  }

  return (
    <div className="app">
      <header className="top" data-scrolled={scrolled ? "true" : "false"} data-hidden={navHidden ? "true" : "false"}>
        <div className="lead">
          <Link
            to="/{-$page}"
            params={{ page: "library" }}
            className="logo"
            aria-label="Block Supply home"
            onClick={() => {
              setOnlySaved(false);
              setQuery("");
            }}
          >
            <Logo />
          </Link>
          <nav className="groups" aria-label="Browse by group" ref={tabsRef}>
            <span
              className="tab-pill"
              aria-hidden="true"
              data-ready={tabPill ? "true" : "false"}
              style={tabPill ? { transform: `translateX(${tabPill.x}px)`, width: tabPill.w } : undefined}
            />
            {GROUPS.map((name) => (
              <Link
                key={name}
                to="/{-$page}"
                params={{ page: name === "Sections" ? "sections" : "library" }}
                className="group-tab"
                data-on={!ownPage && group === name ? "true" : "false"}
                aria-current={!ownPage && group === name ? "page" : undefined}
                onClick={() => {
                  setOnlySaved(false);
                  setQuery("");
                }}
              >
                {name}
              </Link>
            ))}
            <Link
              to="/{-$page}"
              params={{ page: "mimic" }}
              className="group-tab"
              data-on={page === "mimic" ? "true" : "false"}
              aria-current={page === "mimic" ? "page" : undefined}
              onClick={() => {
                setOnlySaved(false);
                setQuery("");
              }}
            >
              Mimic
              <span className="ai-pill" title="Made with AI">
                <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M6 0.6 7.2 4.8 11.4 6 7.2 7.2 6 11.4 4.8 7.2 0.6 6 4.8 4.8Z" fill="currentColor" />
                </svg>
                AI
              </span>
            </Link>
          </nav>
        </div>
        <label className="find">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5 13 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={findRef}
            value={query}
            placeholder="Search"
            aria-label="Search blocks"
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value) setCat(null);
              if (ownPage) void navigate({ to: "/{-$page}", params: { page: "library" } });
            }}
          />
          {query ? (
            <button
              type="button"
              className="kbd"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          ) : (
            <span className="kbd">{isMac ? "⌘ K" : "Ctrl K"}</span>
          )}
        </label>
        <div className="tools">
          <AuthSlot
            onLogin={() => setAuth({ mode: "login" })}
            savedCount={saved.length}
            onSaved={() => {
              setOnlySaved(true);
              if (ownPage) void navigate({ to: "/{-$page}", params: { page: "library" } });
              scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
          {!currentUser && !authPending ? (
            <Link to="/{-$page}" params={{ page: "pricing" }} className="join">
              <span>Use for free</span>
            </Link>
          ) : null}
        </div>
      </header>

      <div
        className="scroll"
        ref={scrollRef}
        onScroll={(event) => {
          const top = event.currentTarget.scrollTop;
          setShowTop(top > 520);
          setScrolled(top > 6);
          const delta = top - lastTop.current;
          lastTop.current = top;
          if (top <= 24 || delta < -4) setNavHidden(false);
          else if (delta > 4) setNavHidden(true);
          window.clearTimeout(idleTimer.current);
          idleTimer.current = window.setTimeout(() => setNavHidden(false), 220);
        }}
      >
        <div className={page === "mimic" ? "body body-canvas" : "body"}>
          {page === "pricing" ? (
            <FreePage onBrowse={goLibrary} signedIn={Boolean(currentUser)} onSignup={() => setAuth({ mode: "signup" })} />
          ) : page === "mimic" ? (
            <MimicPage signedIn={Boolean(currentUser)} userId={currentUser?.id ?? null} pending={authPending} onLogin={() => setAuth({ mode: "login" })} onCopy={(block, kit) => void onCopy(block, kit)} onNotify={setToast} busy={busy} copied={copied} />
          ) : (
            <>
              <header className="hero">
                <div className="hero-dots" aria-hidden="true" />
                <span className="hero-pill">
                  {currentUser ? "Unlimited copies, free" : `First ${FREE_COPIES} blocks free, no account`}
                </span>
                <h1 className="hero-head">Editable UI Components</h1>
                <p className="hero-sub">
                  A library of <b>editable UI blocks</b>. Copy one and paste it into Figma as{" "}
                  <b>auto layout</b>, play with <b>Geist</b>.
                </p>
                <button
                  type="button"
                  className="hero-join"
                  onClick={() => document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Explore blocks
                </button>
              </header>

              <div className="bar-wrap">
              <div className="bar" role="toolbar" aria-label="Filter by kind">
                {GROUP_CATEGORIES[group].map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="chip"
                    data-on={cat === name ? "true" : "false"}
                    onClick={() => {
                      // Saved and a category are separate filters; picking a category leaves Saved.
                      setOnlySaved(false);
                      setCat((curr) => (curr === name ? null : name));
                    }}
                  >
                    {name}
                  </button>
                ))}
                {saved.length > 0 || onlySaved ? (
                  <button
                    type="button"
                    className="chip"
                    data-on={onlySaved ? "true" : "false"}
                    onClick={() => {
                      setCat(null);
                      setOnlySaved((on) => !on);
                    }}
                  >
                    Saved ({saved.length})
                  </button>
                ) : null}
              </div>
              <SortMenu value={sort} onChange={chooseSort} />
              </div>

              {filtered.length === 0 ? (
                <div className="empty" id="library">
                  <p>No blocks match that.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCat(null);
                      setOnlySaved(false);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="wall" id="library">
                  {packed.map((column, index) => (
                    <div className="col" key={index}>
                      {column.map((block) => (
                        <article
                          key={block.id}
                          className="card"
                          id={`block-${block.id}`}
                          style={{ ["--h" as string]: `${block.h}px` }}
                          onClick={(event) => {
                            // Clicks on a live control interact with it; clicks elsewhere open the editor.
                            const target = event.target as HTMLElement;
                            if (isControlEvent(event.nativeEvent) || target.closest(".ix, [contenteditable], [role=slider], [role=textbox]")) return;
                            void navigate({ to: "/b/$id", params: { id: block.id } });
                          }}
                        >
                          {block.badge ? <span className="badge">{block.badge}</span> : null}
                          <button
                            type="button"
                            className="save"
                            data-on={saved.includes(block.id) ? "true" : "false"}
                            aria-label={saved.includes(block.id) ? `Unsave ${block.name}` : `Save ${block.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              requestSave(block.id);
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                              <path
                                d="M4 2.5h8a1 1 0 0 1 1 1V14l-5-2.6L3 14V3.5a1 1 0 0 1 1-1Z"
                                fill={saved.includes(block.id) ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <div className="stage">
                            <BlockView id={block.id} />
                          </div>
                          <QcLayer blockId={block.id} blockName={block.name} where="card" />
                          <span className="cname">{block.name}</span>
                          <button
                            type="button"
                            className="copy"
                            data-on={copied === block.id ? "true" : "false"}
                            aria-label={`Copy ${block.name} to Figma`}
                            onClick={(event) => {
                              event.stopPropagation();
                              const kit = kitIn(event.currentTarget.closest("article"));
                              void onCopy(block, kit instanceof HTMLElement ? kit : null);
                            }}
                          >
                            <FigmaMark />
                            {busy === block.id ? "Copying" : copied === block.id ? "Copied" : "Copy"}
                          </button>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <Questions />
            </>
          )}
        </div>
        {page === "mimic" ? null : <Footer />}
      </div>

      {editingBlock ? (
        <Editor
          key={editingBlock.id}
          block={editingBlock}
          saved={saved.includes(editingBlock.id)}
          busy={busy === editingBlock.id}
          copied={copied === editingBlock.id}
          onClose={() =>
            void navigate({ to: "/{-$page}", params: { page: page === "sections" ? "sections" : "library" } })
          }
          onSave={() => requestSave(editingBlock.id)}
          onCopy={(kit) => void onCopy(editingBlock, kit)}
          onNotify={setToast}
          onShare={() => void onShare(editingBlock)}
        />
      ) : null}

      <QcToggle />

      <button
        type="button"
        className="to-top"
        data-on={showTop ? "true" : "false"}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
          <path d="M4 3h12M10 17V6.5M5.5 10.5 10 6l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {gate ? (
        <LoginGate
          title={gate === "copy" ? `You’ve used your\n${FREE_COPIES} free copies` : "Log in to save blocks"}
          body={
            gate === "copy"
              ? "Log in to keep copying blocks into Figma. It stays free."
              : "Bookmark the blocks you like and find them again anytime. It stays free."
          }
          onClose={() => setGate(null)}
          onLogin={() => {
            try {
              if (gate === "copy") window.sessionStorage.setItem(PENDING_COPY, "1");
            } catch {
              /* storage unavailable */
            }
            setAuth({
              mode: "login",
              note:
                gate === "copy"
                  ? `You’ve used your ${FREE_COPIES} free copies. Log in to keep copying. It stays free.`
                  : "Log in to save blocks and find them again anywhere. It stays free.",
            });
            setGate(null);
          }}
        />
      ) : null}

      {auth ? <AuthModal initialMode={auth.mode} note={auth.note} onClose={() => setAuth(null)} /> : null}

      <div className="toast" data-on={toast ? "true" : "false"} data-tone={ERROR_TOASTS.has(lastToast.current) ? "error" : "ok"} role="status" aria-live="polite">
        {ERROR_TOASTS.has(lastToast.current) ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#17181A" />
            <path d="M8 4.6v4.2M8 11.2v.2" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#17181A" />
            <path d="M5 8.2 7.1 10.2 11 6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
        {TOAST_TEXT[lastToast.current] || "Ready for Figma"}
        <em>{lastToast.current && !TOAST_TEXT[lastToast.current] ? `· ${lastToast.current}` : ""}</em>
      </div>
    </div>
  );
}

function LoginGate({ title, body, onClose, onLogin }: { title: string; body: string; onClose: () => void; onLogin: () => void }) {
  return (
    <div
      className="gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="gate-body">
        <h2 id="gate-title">{title}</h2>
        <p>{body}</p>
        <button type="button" className="gate-cta" onClick={onLogin} autoFocus>
          <span>Log in</span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
            <path d="M6 3.2 10.8 8 6 12.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Questions() {
  return (
    <section className="questions" id="questions">
      <h2>Questions</h2>
      <dl>
        <div className="qa">
          <dt>What do I get?</dt>
          <dd>
            Every block on this page, as a Figma frame. Paste it and the stack, padding, and gap
            are already auto layout. Labels stay Geist text, so you can retype them.
          </dd>
        </div>
        <div className="qa">
          <dt>How do I paste into Figma?</dt>
          <dd>
            Press Copy Figma on a card. In Figma, select the canvas and press Cmd V or Ctrl V. The
            frame is auto layout. Nested rows and columns stay editable.
          </dd>
        </div>
        <div className="qa">
          <dt>What can I use the blocks for?</dt>
          <dd>
            Anything you make: apps, sites, decks, and client work. No credit required. Don’t
            resell the set unchanged as a kit of your own.
          </dd>
        </div>
        <div className="qa">
          <dt>Do I need to sign in?</dt>
          <dd>
            Not for your first {FREE_COPIES} copies. After that, log in with your email to keep copying. It
            stays free: there is no paid plan.
          </dd>
        </div>
        <div className="qa">
          <dt>What is Mimic?</dt>
          <dd>
            {MIMIC_ENABLED
              ? "Upload a screenshot of one component and Mimic rebuilds it as an editable block you can tune and paste into Figma as auto layout. It is free with an account, with a few rebuilds a day."
              : "Upload a screenshot of one component and get it back as an editable block you can paste into Figma. It is coming soon, and it will be free with an account."}
          </dd>
        </div>
        <div className="qa">
          <dt>Will the text stay editable?</dt>
          <dd>
            Yes. Every label is a Geist text layer, not outlines, inside an auto-layout frame.
          </dd>
        </div>
      </dl>
    </section>
  );
}

function FreePage({ onBrowse, signedIn, onSignup }: { onBrowse: () => void; signedIn: boolean; onSignup: () => void }) {
  const steps: [string, string, string][] = [
    ["1", "Copy a block", `Press Copy Figma on any block. The first ${FREE_COPIES} copies need no account.`],
    ["2", "Log in, it’s free", `After ${FREE_COPIES} copies, log in with your email or Google to keep going. There is nothing to pay.`],
    ["3", "Paste into Figma", "You get a real auto layout frame with live Geist text, ready to edit."],
  ];
  return (
    <>
      <header className="hero free-hero">
        <div className="hero-dots" aria-hidden="true" />
        <span className="hero-pill">{signedIn ? "You’re logged in · unlimited copies" : `Free · ${FREE_COPIES} copies without an account`}</span>
        <h1 className="hero-head">Free to use. Always.</h1>
        <p className="hero-sub">
          Every block is free to copy into Figma. {signedIn ? "Your account is free too, so copy as much as you like." : `After ${FREE_COPIES} copies, log in with a free account to keep copying.`}
        </p>
        <div className="free-cta">
          <button type="button" className="hero-join" onClick={onBrowse}>
            Browse the blocks
          </button>
          {signedIn ? null : (
            <button type="button" className="free-ghost" onClick={onSignup}>
              Create a free account
            </button>
          )}
        </div>
      </header>

      <ol className="steps" aria-label="How it works">
        {steps.map(([n, title, text]) => (
          <li key={n}>
            <span className="step-n" aria-hidden="true">
              {n}
            </span>
            <strong>{title}</strong>
            <p>{text}</p>
          </li>
        ))}
      </ol>

      <div className="plans">
        <article className="plan" data-on="true">
          <h3>Free plan</h3>
          <strong>$0</strong>
          <p>No card, no trial. This is the only plan.</p>
          <ul>
            <li>All {BLOCKS.length} blocks</li>
            <li>Unlimited copies with a free account</li>
            <li>{FREE_COPIES} copies without an account</li>
            <li>Save blocks to your account</li>
            <li>{MIMIC_ENABLED ? "Mimic: turn a screenshot into a block, a few a day" : "Mimic, screenshot to block (coming soon)"}</li>
          </ul>
        </article>
        <article className="plan">
          <h3>What you get when you paste</h3>
          <strong>A real frame</strong>
          <p>Figma reads the paste as layers you can edit.</p>
          <ul>
            <li>Auto layout rows and columns</li>
            <li>Padding, gap, and alignment</li>
            <li>Geist text you can retype</li>
            <li>Fills you can recolor</li>
          </ul>
        </article>
        <article className="plan">
          <h3>What is not here</h3>
          <strong>No paid tier</strong>
          <p>Nothing is locked behind a subscription.</p>
          <ul>
            <li>No trial</li>
            <li>No watermark</li>
            <li>No download limit</li>
            <li>No seat license</li>
          </ul>
        </article>
      </div>
      <Questions />
    </>
  );
}

function AuthSlot({ savedCount, onSaved, onLogin }: { savedCount: number; onSaved: () => void; onLogin: () => void }) {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  if (isPending) return <span className="auth-skel" aria-hidden="true" />;
  if (!user) {
    return (
      <button type="button" className="login-link" onClick={onLogin}>
        Log in
      </button>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="acct" ref={rootRef}>
      <button
        type="button"
        className="acct-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${label}`}
        onClick={() => setOpen((on) => !on)}
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span>{label.charAt(0).toUpperCase()}</span>
        )}
      </button>
      {open ? (
        <div className="acct-menu" role="menu">
          <div className="acct-who">
            <b>{label}</b>
            {user.primaryEmail && user.primaryEmail !== label ? <small>{user.primaryEmail}</small> : null}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSaved();
            }}
          >
            Saved ({savedCount})
          </button>
          {authEnabled ? (
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut().catch(() => setSigningOut(false));
              }}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

