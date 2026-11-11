import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { BLOCKS, GROUPS, GROUP_CATEGORIES, groupOf, type Block, type Category, type Group } from "@/data/blocks";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authEnabled, signOut } from "@/lib/auth/client";
import { releaseCopy, reserveCopy } from "@/lib/copy-gate";
import { FREE_COPIES } from "@/lib/copy-limit";
import { listSavedBlocks, mergeSavedBlocks, setSavedBlock } from "@/lib/saved";
import { recordCopyEvent } from "@/lib/stats";
import { BlockView } from "@/components/block-view";
import { Editor } from "@/components/editor";
import { AuthModal } from "@/components/auth-modal";
import { Footer } from "@/components/footer";

const LOCAL_SAVED = "block-supply-saved";
const TOAST_TEXT: Record<string, string> = {
  "Couldn’t copy": "Couldn’t copy",
  "Link copied": "Link copied",
  "Log in": "Log in to keep copying",
  Saved: "Saved to your list",
  "Welcome back": "You’re in. Copy it again",
  "Couldn’t save": "Couldn’t save, try again",
};
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

async function copyBlock(block: Block, kit: HTMLElement) {
  try {
    const { generateFromElement, inlineComputedStyles } = await import("@magicpatterns/html-to-figma");
    // A block shown scaled down is copied at its real size.
    const fit = kit.closest<HTMLElement>("[data-fit-inner]");
    const scaleBefore = fit?.style.transform ?? "";
    if (fit) fit.style.transform = "none";
    // The converter gives a frame with no fill an opaque white one, which shows up in Figma as a
    // white box behind blocks that only have shadows. An almost-invisible fill keeps it clear.
    const bgBefore = kit.style.backgroundColor;
    const clearRoot = /^(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/.test(getComputedStyle(kit).backgroundColor);
    if (clearRoot) kit.style.backgroundColor = "rgba(255, 255, 255, 0.004)";
    let inlined: string;
    try {
      inlined = inlineComputedStyles(kit);
    } finally {
      if (fit) fit.style.transform = scaleBefore;
      if (clearRoot) kit.style.backgroundColor = bgBefore;
    }
    const clone = new DOMParser().parseFromString(inlined, "text/html").body.firstElementChild;
    if (!clone) throw new Error("empty frame");
    const html = await generateFromElement(clone, { topLayerName: block.name });
    if (!navigator.clipboard?.write) throw new Error("clipboard");
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function Site() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  // The page comes from the URL: `/` components, `/sections`, `/pricing`.
  // `/b/<id>` is the same library with that block's editor open on top.
  const { page: pageParam, id: blockParam } = useParams({ strict: false }) as { page?: string; id?: string };
  const editing = BLOCKS.some((block) => block.id === blockParam) ? (blockParam ?? null) : null;
  const editingGroup = editing ? groupOf(BLOCKS.find((block) => block.id === editing)!.cat) : null;
  const page: "components" | "sections" | "pricing" =
    editingGroup === "Sections"
      ? "sections"
      : editingGroup
        ? "components"
        : pageParam === "sections" || pageParam === "pricing"
          ? pageParam
          : "components";
  const group: Group = page === "sections" ? "Sections" : "Components";
  const [cat, setCat] = useState<Category | null>(null);
  const [cols, setCols] = useState(3);
  const [saved, setSaved] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOCKS.filter((block) => {
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
  }, [query, group, cat, onlySaved, saved]);

  // Sections are wide layouts, so they get at most two columns; a search mixes groups and keeps the usual grid.
  // Nothing left to show in Saved (the last one was unsaved): go back to browsing everything.
  useEffect(() => {
    if (onlySaved && saved.length === 0) setOnlySaved(false);
  }, [onlySaved, saved.length]);

  const wallCols = group === "Sections" && !query.trim() ? Math.min(cols, 2) : cols;
  const packed = useMemo(() => pack(filtered, wallCols), [filtered, wallCols]);

  function goLibrary() {
    setCat(null);
    void navigate({ to: "/{-$page}", params: { page: undefined } });
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
    let gate: Awaited<ReturnType<typeof reserveCopy>>;
    try {
      gate = await reserveCopy();
    } catch {
      setBusy(null);
      setToast("Couldn’t copy");
      return;
    }
    if (!gate.ok) {
      setBusy(null);
      setGate("copy");
      return;
    }
    const ok = await copyBlock(block, kit);
    setBusy(null);
    if (!ok) {
      try {
        await releaseCopy();
      } catch {
        /* the copy failed; the quota stays if release doesn't land */
      }
      setToast("Couldn’t copy");
      return;
    }
    setCopied(block.id);
    // Count the copy for the owner's stats; a failure here must never affect the visitor.
    void recordCopyEvent({ data: { id: block.id } }).catch(() => {});
    setToast(!gate.signedIn && gate.used >= gate.limit ? "Last free copy" : block.name);
    window.setTimeout(() => setCopied((curr) => (curr === block.id ? null : curr)), 1600);
  }

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
            params={{ page: undefined }}
            className="logo"
            aria-label="Block Supply home"
            onClick={() => {
              setOnlySaved(false);
              setQuery("");
            }}
          >
            <Logo />
          </Link>
          <nav className="groups" aria-label="Browse by group">
            {GROUPS.map((name) => (
              <Link
                key={name}
                to="/{-$page}"
                params={{ page: name === "Sections" ? "sections" : undefined }}
                className="group-tab"
                data-on={page !== "pricing" && group === name ? "true" : "false"}
                aria-current={page !== "pricing" && group === name ? "page" : undefined}
                onClick={() => {
                  setOnlySaved(false);
                  setQuery("");
                }}
              >
                {name}
              </Link>
            ))}
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
              if (page === "pricing") void navigate({ to: "/{-$page}", params: { page: undefined } });
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
            <span className="kbd">Ctrl K</span>
          )}
        </label>
        <div className="tools">
          <AuthSlot
            onLogin={() => setAuth({ mode: "login" })}
            savedCount={saved.length}
            onSaved={() => {
              setOnlySaved(true);
              if (page === "pricing") void navigate({ to: "/{-$page}", params: { page: undefined } });
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
        <div className="body">
          {page === "pricing" ? (
            <FreePage onBrowse={goLibrary} signedIn={Boolean(currentUser)} onSignup={() => setAuth({ mode: "signup" })} />
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
                            if (target.closest(".ix, [contenteditable], [role=slider], [role=textbox]")) return;
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
                          <span className="cname">{block.name}</span>
                          <button
                            type="button"
                            className="copy"
                            data-on={copied === block.id ? "true" : "false"}
                            onClick={(event) => {
                              event.stopPropagation();
                              const kit = event.currentTarget.closest("article")?.querySelector(".kit");
                              void onCopy(block, kit instanceof HTMLElement ? kit : null);
                            }}
                          >
                            {busy === block.id ? "Copying" : copied === block.id ? "Copied" : "Copy Figma"}
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
        <Footer />
      </div>

      {editingBlock ? (
        <Editor
          key={editingBlock.id}
          block={editingBlock}
          saved={saved.includes(editingBlock.id)}
          busy={busy === editingBlock.id}
          copied={copied === editingBlock.id}
          onClose={() =>
            void navigate({ to: "/{-$page}", params: { page: page === "sections" ? "sections" : undefined } })
          }
          onSave={() => requestSave(editingBlock.id)}
          onCopy={(kit) => void onCopy(editingBlock, kit)}
          onShare={() => void onShare(editingBlock)}
        />
      ) : null}

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

      <div className="toast" data-on={toast ? "true" : "false"} role="status" aria-live="polite">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="#17181A" />
          <path d="M5 8.2 7.1 10.2 11 6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {(toast && TOAST_TEXT[toast]) || "Ready for Figma"}
        <em>
          {toast && !TOAST_TEXT[toast] ? `· ${toast}` : ""}
        </em>
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
        <dt>What do I get?</dt>
        <dd>
          Every block on this page, as a Figma frame. Paste it and the stack, padding, and gap
          are already auto layout. Labels stay Geist text, so you can retype them.
        </dd>
        <dt>How do I paste into Figma?</dt>
        <dd>
          Press Copy Figma on a card. In Figma, select the canvas and press Cmd V or Ctrl V. The
          frame is auto layout. Nested rows and columns stay editable.
        </dd>
        <dt>What can I use the blocks for?</dt>
        <dd>
          Anything you make: apps, sites, decks, and client work. No credit required. Don’t
          resell the set unchanged as a kit of your own.
        </dd>
        <dt>Do I need to sign in?</dt>
        <dd>
          Not for your first {FREE_COPIES} copies. After that, log in with your email to keep copying. It
          stays free: there is no paid plan.
        </dd>
        <dt>Will the text stay editable?</dt>
        <dd>
          Yes. Every label is a Geist text layer, not outlines, inside an auto-layout frame.
        </dd>
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

