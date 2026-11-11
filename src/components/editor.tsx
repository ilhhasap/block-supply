import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { groupOf, type Block } from "@/data/blocks";
import { BlockView } from "@/components/block-view";

type Tune = {
  fill: "light" | "dark";
  corner: number;
  /** The block has no radius of its own; the corner slider moves the rounded parts inside it. */
  nested: boolean;
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
  fill: string | null;
  stroke: string | null;
};

function blurb(block: Block) {
  const kind = `${block.cat.toLowerCase()} ${groupOf(block.cat) === "Sections" ? "section" : "block"}`;
  const article = "aeiou".includes(kind[0] ?? "") ? "An" : "A";
  return [`${article} ${kind}. Drag a bar to tune it,`, "then copy this version into Figma."];
}

function swapColors(value: string) {
  return value
    .replace(/#ffffff/gi, "§P§")
    .replace(/#fff\b/gi, "§P§")
    .replace(/#17181a/gi, "§I§")
    .replace(/#f3f3f2/gi, "§W§")
    .replace(/#6f6e68/gi, "§M§")
    .replace(/#e6e5e2/gi, "§L§")
    .replace(/rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*(?:1|1\.0+))?\s*\)/gi, "§P§")
    .replace(/rgba?\(\s*23\s*,\s*24\s*,\s*26\s*(?:,\s*(?:1|1\.0+))?\s*\)/gi, "§I§")
    .replace(/rgba?\(\s*243\s*,\s*243\s*,\s*242\s*(?:,\s*(?:1|1\.0+))?\s*\)/gi, "§W§")
    .replace(/rgba?\(\s*111\s*,\s*110\s*,\s*104\s*(?:,\s*(?:1|1\.0+))?\s*\)/gi, "§M§")
    .replace(/rgba?\(\s*230\s*,\s*229\s*,\s*226\s*(?:,\s*(?:1|1\.0+))?\s*\)/gi, "§L§")
    .replace(/rgba\(\s*23\s*,\s*24\s*,\s*26\s*,/gi, "rgba(255,255,255,")
    .replaceAll("§P§", "#2C2C2E")
    .replaceAll("§I§", "#F4F4F2")
    .replaceAll("§W§", "#3A3A3C")
    .replaceAll("§M§", "#C2C1BA")
    .replaceAll("§L§", "#545456");
}

function shadowBlur(shadow: string) {
  if (!shadow || shadow === "none") return 0;
  const px = [...shadow.matchAll(/(-?\d+\.?\d*)px/g)].map((match) => Number(match[1]));
  return Math.round(px[2] ?? 0);
}

/** Rounded parts inside a block (inputs, menus, code boxes). Pills and circles are left alone. */
function nestedRadii(kit: HTMLElement) {
  const found: [HTMLElement, number][] = [];
  for (const el of kit.querySelectorAll<HTMLElement>("*")) {
    const raw = getComputedStyle(el).borderTopLeftRadius;
    if (!raw.endsWith("px")) continue;
    const radius = parseFloat(raw);
    if (!(radius > 0)) continue;
    if (radius >= Math.min(el.offsetWidth, el.offsetHeight) / 2 - 0.5) continue;
    found.push([el, radius]);
  }
  return found;
}

function measure(kit: HTMLElement): Tune {
  const cs = getComputedStyle(kit);
  let radius = Math.round(parseFloat(cs.borderTopLeftRadius) || 0);
  const inner = nestedRadii(kit);
  const nested = radius === 0 && inner.length > 0;
  if (nested) radius = Math.round(Math.max(...inner.map(([, value]) => value)));
  const gapAttr = kit.getAttribute("data-gap");
  const gap = Math.round(gapAttr != null ? Number(gapAttr) : parseFloat(cs.gap) || 0);
  return {
    fill: "light",
    corner: radius,
    nested,
    gap: Number.isFinite(gap) ? gap : 0,
    shadow: shadowBlur(cs.boxShadow),
    opacity: 100,
  };
}

function limitsFor(tune: Tune): Limits {
  return {
    corner: Math.max(48, tune.corner),
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
    if (snap.fill == null) el.removeAttribute("fill");
    else el.setAttribute("fill", snap.fill);
    if (snap.stroke == null) el.removeAttribute("stroke");
    else el.setAttribute("stroke", snap.stroke);
  }
}

function retint(kit: HTMLElement) {
  const nodes = [kit, ...kit.querySelectorAll<HTMLElement>("*")];
  for (const el of nodes) {
    const style = el.getAttribute("style");
    if (style) el.setAttribute("style", swapColors(style));
    for (const name of ["fill", "stroke"] as const) {
      const value = el.getAttribute(name);
      if (!value || value === "none" || value === "currentColor") continue;
      el.setAttribute(name, swapColors(value));
    }
  }
}

function applyTune(kit: HTMLElement, edit: Tune, base: Tune) {
  const originalShadow = getComputedStyle(kit).boxShadow;
  if (edit.fill === "dark") retint(kit);
  // Parts inside the block move by the same amount the slider moved from where it started.
  const inner = nestedRadii(kit);
  const delta = edit.corner - base.corner;
  for (const [el, radius] of inner) el.style.borderRadius = `${Math.max(0, Math.round(radius + delta))}px`;
  if (!base.nested) kit.style.borderRadius = `${edit.corner}px`;
  kit.setAttribute("data-gap", String(edit.gap));
  if (edit.gap < 0) {
    kit.style.gap = "0px";
    kit.style.setProperty("--ax-gap", `${edit.gap}px`);
  } else {
    kit.style.gap = `${edit.gap}px`;
    kit.style.removeProperty("--ax-gap");
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
  const [limits, setLimits] = useState<Limits>({ corner: 48, gapMin: -24, gapMax: 40, shadow: 64 });

  useLayoutEffect(() => {
    const kit = frameRef.current?.querySelector(".kit");
    if (!(kit instanceof HTMLElement)) return;
    if (!snapRef.current || !baseRef.current) {
      snapRef.current = takeSnap(kit);
      const measured = measure(kit);
      baseRef.current = measured;
      setLimits(limitsFor(measured));
      setEdit(measured);
      applyTune(kit, measured, measured);
      return;
    }
    restore(snapRef.current);
    applyTune(kit, edit ?? baseRef.current, baseRef.current);
  }, [edit]);

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
    const centerY = sheet.offsetTop + sheet.offsetHeight / 2 - overlay.scrollTop;
    const scale = Math.min(0.95, Math.max(0.25, from.width / Math.max(1, sheet.offsetWidth)));
    overlay.style.setProperty("--ox", `${Math.round(from.left + from.width / 2 - centerX)}px`);
    overlay.style.setProperty("--oy", `${Math.round(from.top + from.height / 2 - centerY)}px`);
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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onClose, reduce ? 0 : 340);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
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
          <BlockView id={block.id} />
        </div>
        {tune && baseRef.current && JSON.stringify(tune) !== JSON.stringify(baseRef.current) ? (
          <button
            type="button"
            className="bench-reset"
            aria-label="Reset changes"
            title="Reset"
            onClick={() => setEdit({ ...(baseRef.current as Tune) })}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
          <button type="button" className="bench-x" aria-label="Close" onClick={requestClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3 13 13M13 3 3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
            <Bar
              label="Corner"
              min={0}
              max={limits.corner}
              value={tune.corner}
              text={`${tune.corner}px`}
              onChange={(corner) => setEdit({ ...tune, corner })}
            />
            <Bar
              label="Gap"
              min={limits.gapMin}
              max={limits.gapMax}
              value={tune.gap}
              text={`${tune.gap}px`}
              onChange={(gap) => setEdit({ ...tune, gap })}
            />
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
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3H3v10h10V9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 3h4v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 3 7 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Share
          </button>
          <button
            type="button"
            className="bench-copy"
            onClick={() => {
              const kit = frameRef.current?.querySelector(".kit");
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
