import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BLOCKS, CATEGORIES, type Block, type Category } from "@/data/blocks";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authEnabled, signOut } from "@/lib/auth/client";
import { releaseCopy, reserveCopy } from "@/lib/copy-gate";
import { FREE_COPIES } from "@/lib/copy-limit";
import { BlockView } from "@/components/block-view";
import { Editor } from "@/components/editor";
import supplyMark from "@/components/supply-mark.svg";

type View = "library" | "free";

const PLAIN_TOASTS = ["Couldn’t copy", "Link copied", "Log in", "Saved", "Welcome back"];
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
    const inlined = inlineComputedStyles(kit);
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
  const [cat, setCat] = useState<Category | null>(null);
  const [view, setView] = useState<View>("library");
  const [cols, setCols] = useState(3);
  const [saved, setSaved] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user: currentUser, isPending: authPending } = useCurrentUserState();
  const [showTop, setShowTop] = useState(false);
  const [gate, setGate] = useState<"save" | "copy" | null>(null);

  useEffect(() => {
    const sync = () => setCols(columnsFor(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("block-supply-saved");
      if (raw) setSaved(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  // Pick up what the visitor was doing before they were sent to log in.
  useEffect(() => {
    if (authPending || !currentUser) return;
    try {
      const pendingSave = window.sessionStorage.getItem(PENDING_SAVE);
      const copyRetry = window.sessionStorage.getItem(PENDING_COPY);
      window.sessionStorage.removeItem(PENDING_SAVE);
      window.sessionStorage.removeItem(PENDING_COPY);
      if (pendingSave && BLOCKS.some((block) => block.id === pendingSave)) {
        setSaved((prev) => {
          if (prev.includes(pendingSave)) return prev;
          const next = [...prev, pendingSave];
          localStorage.setItem("block-supply-saved", JSON.stringify(next));
          return next;
        });
        setToast("Saved");
      } else if (copyRetry) {
        setToast("Welcome back");
      }
    } catch {
      /* storage unavailable */
    }
  }, [authPending, currentUser]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        findRef.current?.focus();
        findRef.current?.select();
      }
      if (event.key === "Escape") {
        setEditing(null);
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
      if (cat && block.cat !== cat) return false;
      if (onlySaved && !saved.includes(block.id)) return false;
      if (!q) return true;
      return (
        block.name.toLowerCase().includes(q) ||
        block.cat.toLowerCase().includes(q) ||
        block.id.includes(q)
      );
    });
  }, [query, cat, onlySaved, saved]);

  const packed = useMemo(() => pack(filtered, cols), [filtered, cols]);

  function goLibrary(next?: Category | null) {
    setView("library");
    setCat(next ?? null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goFree() {
    setView("free");
    setCat(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("block-supply-saved", JSON.stringify(next));
      return next;
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
    setToast(!gate.signedIn && gate.used >= gate.limit ? "Last free copy" : block.name);
    window.setTimeout(() => setCopied((curr) => (curr === block.id ? null : curr)), 1600);
  }

  const editingBlock = BLOCKS.find((block) => block.id === editing) ?? null;

  async function onShare(block: Block) {
    const url = `${window.location.origin}${window.location.pathname}#block-${block.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast("Couldn’t copy");
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div className="lead">
          <button className="logo" type="button" aria-label="Block Supply home" onClick={() => goLibrary(null)}>
            <Logo />
          </button>
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
              if (view !== "library") setView("library");
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
            savedCount={saved.length}
            onSaved={() => {
              setOnlySaved(true);
              setView("library");
              scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
          {!currentUser && !authPending ? (
            <button type="button" className="join" onClick={goFree}>
              <span>Use for free</span>
            </button>
          ) : null}
        </div>
      </header>

      <div
        className="scroll"
        ref={scrollRef}
        onScroll={(event) => setShowTop(event.currentTarget.scrollTop > 520)}
      >
        <div className="body">
          {view === "free" ? (
            <FreePage onBrowse={() => goLibrary(null)} />
          ) : (
            <>
              <header className="hero">
                <div className="hero-dots" aria-hidden="true" />
                <span className="hero-pill">
                  {currentUser ? "Unlimited copies, free" : `${FREE_COPIES} free copies, then log in`}
                </span>
                <h1 className="hero-head">Editable UI Components</h1>
                <p className="hero-sub">
                  A library of <b>editable UI blocks</b>. Copy one and paste it into Figma as{" "}
                  <b>auto layout</b>, set in <b>Geist</b>.
                </p>
                <button
                  type="button"
                  className="hero-join"
                  onClick={() => document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Copy any block
                </button>
              </header>

              <div className="bar" role="toolbar" aria-label="Filter by kind">
                {CATEGORIES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="chip"
                    data-on={cat === name ? "true" : "false"}
                    onClick={() => setCat((curr) => (curr === name ? null : name))}
                  >
                    {name}
                  </button>
                ))}
                {saved.length > 0 || onlySaved ? (
                  <button
                    type="button"
                    className="chip"
                    data-on={onlySaved ? "true" : "false"}
                    onClick={() => setOnlySaved((on) => !on)}
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
                            setEditing(block.id);
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
          onClose={() => setEditing(null)}
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
          title={gate === "copy" ? `You’ve used your ${FREE_COPIES} free copies` : "Log in to save blocks"}
          body={
            gate === "copy"
              ? "Log in to keep copying blocks into Figma. It stays free."
              : "Bookmark the blocks you like and find them again anytime. It stays free."
          }
          onClose={() => setGate(null)}
          onLogin={() => {
            try {
              if (gate === "copy") {
                window.sessionStorage.setItem("supply-copy-gate", "1");
                window.sessionStorage.setItem(PENDING_COPY, "1");
              }
            } catch {
              /* storage unavailable */
            }
            void navigate({ to: "/login" });
          }}
        />
      ) : null}

      <div className="toast" data-on={toast ? "true" : "false"} role="status" aria-live="polite">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="#17181A" />
          <path d="M5 8.2 7.1 10.2 11 6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {toast === "Saved"
          ? "Saved to your list"
          : toast === "Welcome back"
            ? "You’re in. Copy it again"
            : toast === "Couldn’t copy"
          ? "Couldn’t copy"
          : toast === "Log in"
            ? "Log in to keep copying"
            : toast === "Link copied"
              ? "Link copied"
              : "Ready for Figma"}
        <em>
          {toast && !PLAIN_TOASTS.includes(toast) ? `· ${toast}` : ""}
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

function FreePage({ onBrowse }: { onBrowse: () => void }) {
  return (
    <>
      <header className="hero free-hero">
        <div className="hero-dots" aria-hidden="true" />
        <span className="hero-pill">$0 · {FREE_COPIES} copies, then a free account</span>
        <h1 className="hero-head">Everything is free</h1>
        <p className="hero-sub">
          The whole library copies as Figma frames. Paste a block and keep editing the auto layout.
        </p>
        <button type="button" className="hero-join" onClick={onBrowse}>
          Copy any block
        </button>
      </header>
      <div className="plans">
        <article className="plan" data-on="true">
          <h3>Free</h3>
          <strong>$0</strong>
          <p>Forever. The only plan.</p>
          <ul>
            <li>All {BLOCKS.length} blocks</li>
            <li>Auto layout on every block</li>
            <li>Geist on every text layer</li>
            <li>{FREE_COPIES} copies without an account</li>
          </ul>
        </article>
        <article className="plan">
          <h3>What paste keeps</h3>
          <strong>Frame</strong>
          <p>Figma reads the paste as layers.</p>
          <ul>
            <li>Auto layout rows and columns</li>
            <li>Padding, gap, and alignment</li>
            <li>Geist text you can retype</li>
            <li>Fills you can recolor</li>
          </ul>
        </article>
        <article className="plan">
          <h3>What it isn’t</h3>
          <strong>Pro</strong>
          <p>There isn’t a paid tier hiding the rest.</p>
          <ul>
            <li>No trial</li>
            <li>No watermark</li>
            <li>No download cap</li>
            <li>No seat license</li>
          </ul>
        </article>
      </div>
      <Questions />
    </>
  );
}

function AuthSlot({ savedCount, onSaved }: { savedCount: number; onSaved: () => void }) {
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
      <Link to="/login" className="login-link">
        Log in
      </Link>
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

function Footer() {
  return (
    <footer className="supply">
      <div className="supply-top">
        <h2>
          Let’s start
          <br />
          from nothin’
        </h2>
        <nav className="supply-links" aria-label="Social">
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://www.behance.net" target="_blank" rel="noreferrer">
            Behance
          </a>
        </nav>
      </div>
      <img className="supply-mark" src={supplyMark} alt="Supply" />
      <div className="supply-meta">
        <span>©{new Date().getFullYear()} — Founded by Sara Guedj</span>
        <span>Visuals by Guillaume Perrette</span>
        <span>Site by Pierre Patrault & Thomas Carré</span>
      </div>
    </footer>
  );
}
