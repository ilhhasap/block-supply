import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { groupOf, type Block } from "@/data/blocks";
import { BlockView } from "@/components/block-view";
import { kitIn } from "@/components/shadow-host";
import { QcLayer } from "@/components/qc";

type Tune = {
  fill: "light" | "dark";
  corner: number;
  /** Largest corner that still changes the look: past this the rounded part is already a pill. */
  cornerMax: number;
  /** The Corner slider does something for this block. */
  hasCorner: boolean;
  /** The Gap slider does something for this block (more than one part to space out). */
  hasGap: boolean;
  gap: number;
  shadow: number;
  opacity: number;
};

type Limits = {
  corner: number;
  gapMin: number;
  gapMax: number;
  shadow: number;
};

type Snap = {
  style: string | null;
  gap: string | null;
  fill: string | null;
  stroke: string | null;
};

function blurb(block: Block) {
  const kind = `${block.cat.toLowerCase()} ${groupOf(block.cat) === "Sections" ? "section" : "block"}`;
  const article = "aeiou".includes(kind[0] ?? "") ? "An" : "A";
  return [
    `${article} ${kind}. Drag a bar to tune it,`,
    "then copy this version into Figma.",
  ];
}

/**
 * Light colours used in the blocks and the dark colour each one becomes. A dark colour is never also
 * a light one, so swapping twice (React rewrites a style) changes nothing the second time.
 */
const PALETTE: [string, string][] = [
  ["#ffffff", "#2C2C2E"],
  ["#17181a", "#F4F4F2"],
  ["#f3f3f2", "#3A3A3C"],
  ["#6f6e68", "#C2C1BA"],
  ["#e6e5e2", "#545456"],
  ["#f0f0ef", "#3C3C3F"],
  ["#d7d6d2", "#4A4A4D"],
  ["#c9c8c4", "#565658"],
  ["#c8c7c2", "#575759"],
  ["#b9b8b3", "#636365"],
  ["#8e8d88", "#9A9AA0"],
  ["#8a8984", "#9D9DA3"],
  ["#5a5a57", "#A8A8AC"],
  ["#3a3a38", "#C6C6CA"],
];

const SWAPS = PALETTE.map(([light, dark], index) => {
  const n = parseInt(light.slice(1), 16);
  const rgb = `${(n >> 16) & 255}\\s*,\\s*${(n >> 8) & 255}\\s*,\\s*${n & 255}`;
  const hex = light === "#ffffff" ? "#(?:ffffff|fff)\\b" : `${light}\\b`;
  return {
    from: new RegExp(`${hex}|rgba?\\(\\s*${rgb}\\s*(?:,\\s*(?:1|1\\.0+))?\\s*\\)`, "gi"),
    mark: `§${index}§`,
    dark,
  };
});

function swapColors(value: string) {
  let out = value;
  for (const swap of SWAPS) out = out.replace(swap.from, swap.mark);
  // Ink with an alpha (shadows, hairlines) turns white with the same alpha.
  out = out.replace(/rgba\(\s*23\s*,\s*24\s*,\s*26\s*,/gi, "rgba(255,255,255,");
  for (const swap of SWAPS) out = out.replaceAll(swap.mark, swap.dark);
  return out;
}

function shadowBlur(shadow: string) {
  if (!shadow || shadow === "none") return 0;
  const px = [...shadow.matchAll(/(-?\d+\.?\d*)px/g)].map((match) =>
    Number(match[1]),
  );
  return Math.round(px[2] ?? 0);
}

type Round = { el: HTMLElement; half: number; eff: number };

/**
 * Every rounded part of a block (the block itself, inputs, menus, buttons, code boxes). `eff` is the
 * radius it really draws: a 999px pill is only as round as half its shortest side. Tiny parts (dots,
 * thumbs) are left alone.
 */
function roundsOf(kit: HTMLElement): Round[] {
  const found: Round[] = [];
  for (const el of [kit, ...kit.querySelectorAll<HTMLElement>("*")]) {
    const short = Math.min(el.offsetWidth, el.offsetHeight);
    const half = short / 2;
    if (half < 8) continue;
    const raw = getComputedStyle(el).borderTopLeftRadius;
    const radius = raw.endsWith("%")
      ? (parseFloat(raw) / 100) * short
      : parseFloat(raw);
    if (!(radius > 0)) continue;
    found.push({ el, half, eff: Math.min(radius, half) });
  }
  return found;
}

/** The part the Corner slider reads: the roundest one, or the block itself when nothing is rounded. */
function cornerTarget(kit: HTMLElement, rounds: Round[]) {
  if (!rounds.length)
    return { half: Math.min(kit.offsetWidth, kit.offsetHeight) / 2, eff: 0 };
  return rounds.reduce((best, item) =>
    item.eff > best.eff || (item.eff === best.eff && item.half > best.half)
      ? item
      : best,
  );
}

type Container = { el: HTMLElement; gap: number };

/** Layout containers with a gap (a block's own `data-gap` wins over the computed value). */
function gapsOf(kit: HTMLElement): Container[] {
  const found: Container[] = [];
  for (const el of [kit, ...kit.querySelectorAll<HTMLElement>("*")]) {
    const attr = el.getAttribute("data-gap");
    const cs = getComputedStyle(el);
    if (attr == null && !/flex|grid/.test(cs.display)) continue;
    const gap =
      attr != null && Number.isFinite(Number(attr))
        ? Number(attr)
        : parseFloat(cs.columnGap) || parseFloat(cs.rowGap) || 0;
    if (gap !== 0 || el === kit) found.push({ el, gap });
  }
  return found;
}

/** The gap the slider shows: the block's own, else the widest one inside it. */
function mainGap(list: Container[]) {
  const root = list[0];
  if (root && root.gap > 0) return { value: root.gap, source: "root" as const };
  const inner = list.slice(1).filter((item) => item.gap > 0);
  if (inner.length)
    return {
      value: Math.max(...inner.map((item) => item.gap)),
      source: "inner" as const,
    };
  return { value: root?.gap ?? 0, source: "none" as const };
}

function setGap(el: HTMLElement, value: number, force = false) {
  if (force || el.hasAttribute("data-gap"))
    el.setAttribute("data-gap", String(value));
  if (value < 0) {
    el.style.gap = "0px";
    el.style.setProperty("--ax-gap", `${value}px`);
  } else {
    el.style.gap = `${value}px`;
    el.style.removeProperty("--ax-gap");
  }
}

/** Whether an element draws anything of its own, so rounding it would show. */
function paints(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const bg = cs.backgroundColor;
  const filled =
    bg !== "transparent" && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/.test(bg);
  return (
    filled ||
    cs.backgroundImage !== "none" ||
    parseFloat(cs.borderTopWidth) > 0 ||
    cs.boxShadow !== "none"
  );
}

function geometry(kit: HTMLElement) {
  return [kit, ...kit.querySelectorAll<HTMLElement>("*")]
    .map((el) => {
      const box = el.getBoundingClientRect();
      return `${Math.round(box.width)}x${Math.round(box.height)}@${Math.round(box.left)},${Math.round(box.top)}`;
    })
    .join("|");
}

function measure(kit: HTMLElement): Tune {
  const cs = getComputedStyle(kit);
  const rounds = roundsOf(kit);
  const target = cornerTarget(kit, rounds);
  const corner = Math.round(target.eff);
  // A pill needs no more than half its height; a block with other rounding (a menu inside a field)
  // does not need more than a few times what it has.
  const cornerMax = Math.max(corner, Math.min(100, Math.ceil(target.half), Math.max(32, corner * 3)));
  const gap = Math.round(mainGap(gapsOf(kit)).value);
  return {
    fill: "light",
    corner,
    cornerMax,
    hasCorner: rounds.length > 0 || paints(kit),
    hasGap: true,
    gap,
    shadow: shadowBlur(cs.boxShadow),
    opacity: 100,
  };
}

function limitsFor(tune: Tune): Limits {
  return {
    corner: tune.cornerMax,
    gapMin: Math.min(-24, tune.gap),
    gapMax: Math.max(40, tune.gap),
    shadow: Math.max(64, tune.shadow),
  };
}

function takeSnap(kit: HTMLElement) {
  const map = new Map<HTMLElement, Snap>();
  const nodes = [kit, ...kit.querySelectorAll<HTMLElement>("*")];
  for (const el of nodes) {
    map.set(el, {
      style: el.getAttribute("style"),
      gap: el.getAttribute("data-gap"),
      fill: el.getAttribute("fill"),
      stroke: el.getAttribute("stroke"),
    });
  }
  return map;
}

function restore(map: Map<HTMLElement, Snap>) {
  for (const [el, snap] of map) {
    if (snap.style == null) el.removeAttribute("style");
    else el.setAttribute("style", snap.style);
    if (snap.gap == null) el.removeAttribute("data-gap");
    else el.setAttribute("data-gap", snap.gap);
    if (snap.fill == null) el.removeAttribute("fill");
    else el.setAttribute("fill", snap.fill);
    if (snap.stroke == null) el.removeAttribute("stroke");
    else el.setAttribute("stroke", snap.stroke);
  }
}

function retintNode(el: Element) {
  const style = el.getAttribute("style");
  if (style) {
    const next = swapColors(style);
    if (next !== style) el.setAttribute("style", next);
  }
  for (const name of ["fill", "stroke"] as const) {
    const value = el.getAttribute(name);
    if (!value || value === "none" || value === "currentColor") continue;
    const next = swapColors(value);
    if (next !== value) el.setAttribute(name, next);
  }
}

function retint(root: Element) {
  retintNode(root);
  for (const el of root.querySelectorAll("*")) retintNode(el);
}

function applyTune(kit: HTMLElement, edit: Tune, base: Tune) {
  const originalShadow = getComputedStyle(kit).boxShadow;
  if (edit.fill === "dark") {
    retint(kit);
    // Text that names no colour takes the page ink; on the dark canvas it must be light.
    if (!kit.style.color) kit.style.color = "#F4F4F2";
  }
  // Every rounded part moves by the amount the slider moved from where it started, but never past
  // a pill. With nothing rounded inside, the block itself takes the radius.
  const rounds = roundsOf(kit);
  const cornerDelta = edit.corner - base.corner;
  if (rounds.length) {
    if (cornerDelta !== 0) {
      for (const item of rounds) {
        item.el.style.borderRadius = `${Math.min(item.half, Math.max(0, Math.round(item.eff + cornerDelta)))}px`;
      }
    }
  } else {
    kit.style.borderRadius = `${edit.corner}px`;
  }

  // Gaps work the same way: every container shifts by the slider's travel.
  const gaps = gapsOf(kit);
  const main = mainGap(gaps);
  const gapDelta = edit.gap - base.gap;
  for (const item of gaps) {
    if (item.el === kit) {
      if (item.gap > 0) setGap(kit, Math.max(-24, item.gap + gapDelta), true);
      else if (main.source === "none") setGap(kit, edit.gap, true);
    } else if (gapDelta !== 0) {
      setGap(item.el, Math.max(0, item.gap + gapDelta));
    }
  }
  kit.style.opacity = String(edit.opacity / 100);

  const shadowChanged = edit.shadow !== base.shadow;
  const drop = shadowChanged
    ? edit.shadow > 0
      ? `0 ${Math.max(6, Math.round(edit.shadow / 3))}px ${edit.shadow}px rgba(23,24,26,${edit.fill === "dark" ? 0.5 : 0.16})`
      : ""
    : originalShadow && originalShadow !== "none"
      ? originalShadow
      : "";
  if (shadowChanged) {
    kit.style.boxShadow = drop || "none";
  }
}

export function Editor({
  block,
  saved,
  busy,
  copied,
  onClose,
  onSave,
  onCopy,
  onShare,
}: {
  block: Block;
  saved: boolean;
  busy: boolean;
  copied: boolean;
  onClose: () => void;
  onSave: () => void;
  onCopy: (kit: HTMLElement | null) => void;
  onShare: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<Map<HTMLElement, Snap> | null>(null);
  const baseRef = useRef<Tune | null>(null);
  const [edit, setEdit] = useState<Tune | null>(null);
  // The modal grows out of its card and shrinks back into it: "enter" and "exit" are the card pose.
  const [phase, setPhase] = useState<"enter" | "open" | "exit">("enter");
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [limits, setLimits] = useState<Limits>({
    corner: 48,
    gapMin: -24,
    gapMax: 40,
    shadow: 64,
  });

  // The block is drawn in a shadow root made after the first render, and drawn again when it is
  // remounted; run the setup again each time it appears.
  const [kitVersion, setKitVersion] = useState(0);
  const [rev, setRev] = useState(0);
  const dirtyRef = useRef(false);
  const fillRef = useRef<"light" | "dark">("light");
  const watchRef = useRef<{
    kit: HTMLElement;
    observer: MutationObserver;
  } | null>(null);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onReady = () => setKitVersion((n) => n + 1);
    frame.addEventListener("block-ready", onReady);
    if (kitIn(frame)) setKitVersion((n) => n + 1);
    return () => {
      frame.removeEventListener("block-ready", onReady);
      watchRef.current?.observer.disconnect();
    };
  }, []);

  /**
   * Live blocks redraw themselves when used (a box ticks, a menu opens). Watch for that: in the dark
   * preview React writes the light colours again, so they are swapped back at once, and the next
   * tune starts from a fresh copy of the block so nothing is left half-edited.
   */
  function watch(kit: HTMLElement) {
    if (watchRef.current?.kit === kit) return;
    watchRef.current?.observer.disconnect();
    const options: MutationObserverInit = {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "fill", "stroke"],
    };
    const observer = new MutationObserver((records) => {
      dirtyRef.current = true;
      if (fillRef.current !== "dark") return;
      observer.disconnect();
      for (const record of records) {
        if (record.type === "attributes") retintNode(record.target as Element);
        for (const node of record.addedNodes)
          if (node instanceof Element) retint(node);
      }
      observer.observe(kit, options);
    });
    observer.observe(kit, options);
    watchRef.current = { kit, observer };
  }

  useLayoutEffect(() => {
    const kit = kitIn(frameRef.current);
    if (!(kit instanceof HTMLElement)) return;
    fillRef.current = edit?.fill ?? "light";
    if (!snapRef.current) {
      snapRef.current = takeSnap(kit);
      if (!baseRef.current) {
        const measured = measure(kit);
        // A gap slider that moves nothing (a lone label, parts placed by hand) is left out.
        const before = geometry(kit);
        applyTune(kit, { ...measured, gap: measured.gap + 12 }, measured);
        measured.hasGap = geometry(kit) !== before;
        restore(snapRef.current);
        baseRef.current = measured;
        setLimits(limitsFor(measured));
        setEdit(measured);
        applyTune(kit, measured, measured);
        watch(kit);
        return;
      }
    } else if (dirtyRef.current) {
      // The block was used since the last tune: draw a fresh one and tune that.
      dirtyRef.current = false;
      snapRef.current = null;
      setRev((n) => n + 1);
      return;
    }
    restore(snapRef.current);
    applyTune(kit, edit ?? baseRef.current!, baseRef.current!);
    watch(kit);
    // Our own writes are not changes made by the block.
    watchRef.current?.observer.takeRecords();
    dirtyRef.current = false;
  }, [edit, kitVersion]);

  const tune = edit;

  /** Point the card pose at the card as it is on the page right now. */
  const aim = () => {
    const overlay = overlayRef.current;
    const sheet = sheetRef.current;
    if (!overlay || !sheet) return;
    const card = document.getElementById(`block-${block.id}`);
    if (!card) {
      overlay.style.setProperty("--ox", "0px");
      overlay.style.setProperty("--oy", "0px");
      overlay.style.setProperty("--os", "0.94");
      return;
    }
    const from = card.getBoundingClientRect();
    // Layout size and position ignore the transform, so this works mid-animation too.
    const centerX = sheet.offsetLeft + sheet.offsetWidth / 2;
    const centerY =
      sheet.offsetTop + sheet.offsetHeight / 2 - overlay.scrollTop;
    const scale = Math.min(
      0.95,
      Math.max(0.25, from.width / Math.max(1, sheet.offsetWidth)),
    );
    overlay.style.setProperty(
      "--ox",
      `${Math.round(from.left + from.width / 2 - centerX)}px`,
    );
    overlay.style.setProperty(
      "--oy",
      `${Math.round(from.top + from.height / 2 - centerY)}px`,
    );
    overlay.style.setProperty("--os", scale.toFixed(3));
  };

  useLayoutEffect(() => {
    aim();
    // `aim` has already resolved the card pose, so a short timeout is enough to start the transition
    // (unlike animation frames, it also fires when the tab is in the background).
    const id = window.setTimeout(() => setPhase("open"), 24);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    aim();
    setPhase("exit");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.setTimeout(onClose, reduce ? 0 : 340);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // An account modal opened over the editor takes the Escape first.
      if (
        event.key === "Escape" &&
        !document.querySelector(".auth-overlay, [data-qc-pop]")
      )
        requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={overlayRef}
      className="bench"
      data-phase={phase}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={sheetRef}
        className="bench-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bench-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bench-canvas" data-fill={tune?.fill ?? "light"}>
          <div className="bench-toggle" role="group" aria-label="Preview fill">
            {(["light", "dark"] as const).map((id) => (
              <button
                key={id}
                type="button"
                data-on={(tune?.fill ?? "light") === id ? "true" : "false"}
                onClick={() => tune && setEdit({ ...tune, fill: id })}
              >
                {id === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
          <div className="bench-frame" ref={frameRef}>
            <BlockView key={rev} id={block.id} />
          </div>
          <QcLayer blockId={block.id} blockName={block.name} where="editor" />
          {tune &&
          baseRef.current &&
          JSON.stringify(tune) !== JSON.stringify(baseRef.current) ? (
            <button
              type="button"
              className="bench-reset"
              aria-label="Reset changes"
              title="Reset"
              onClick={() => setEdit({ ...(baseRef.current as Tune) })}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v3h3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            className="bench-save"
            data-on={saved ? "true" : "false"}
            aria-label={saved ? `Unsave ${block.name}` : `Save ${block.name}`}
            onClick={onSave}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 2h8a1 1 0 0 1 1 1v12l-5-3-5 3V3a1 1 0 0 1 1-1Z"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <aside className="bench-panel">
          <div className="bench-head">
            <h2 id="bench-title">{block.name}</h2>
            <button
              type="button"
              className="bench-x"
              aria-label="Close"
              onClick={requestClose}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3 3 13 13M13 3 3 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <p>
            {blurb(block).map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>

          {tune ? (
            <div className="bench-tunes">
              {tune.hasCorner ? (
                <Bar
                  label="Corner"
                  min={0}
                  max={limits.corner}
                  value={tune.corner}
                  text={`${tune.corner}px`}
                  onChange={(corner) => setEdit({ ...tune, corner })}
                />
              ) : null}
              {tune.hasGap ? (
                <Bar
                  label="Gap"
                  min={limits.gapMin}
                  max={limits.gapMax}
                  value={tune.gap}
                  text={`${tune.gap}px`}
                  onChange={(gap) => setEdit({ ...tune, gap })}
                />
              ) : null}
              {block.cat === "Card" ? (
                <Bar
                  label="Shadow"
                  min={0}
                  max={limits.shadow}
                  value={tune.shadow}
                  text={`${tune.shadow}`}
                  onChange={(shadow) => setEdit({ ...tune, shadow })}
                />
              ) : null}
              <Bar
                label="Opacity"
                min={20}
                max={100}
                value={tune.opacity}
                text={`${tune.opacity}%`}
                onChange={(opacity) => setEdit({ ...tune, opacity })}
              />
            </div>
          ) : null}

          <div className="bench-actions">
            <button type="button" className="bench-share" onClick={onShare}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M6 3H3v10h10V9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 3h4v4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 3 7 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Share
            </button>
            <button
              type="button"
              className="bench-copy"
              onClick={() => {
                const kit = kitIn(frameRef.current);
                onCopy(kit instanceof HTMLElement ? kit : null);
              }}
            >
              {busy ? "Copying" : copied ? "Copied" : "Copy to Figma"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Bar({
  label,
  min,
  max,
  value,
  text,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  text: string;
  onChange: (value: number) => void;
}) {
  const span = Math.max(1, max - min);
  const p = Math.min(100, Math.max(0, ((value - min) / span) * 100));
  return (
    <label className="bar-row" style={{ ["--p" as string]: `${p}%` }}>
      <span className="bar-fill" aria-hidden="true" />
      <span className="bar-label">{label}</span>
      <span className="bar-value">{text}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

// Local QC only: lets the review sweep run the editor's tuning over every block from the console.
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_QC_ENABLED === "true" &&
  typeof window !== "undefined"
) {
  (window as unknown as Record<string, unknown>).__bsEditor = {
    measure,
    applyTune,
    takeSnap,
    restore,
    kitIn,
    roundsOf,
    gapsOf,
  };
}
