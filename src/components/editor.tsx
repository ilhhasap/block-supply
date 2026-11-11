import { useLayoutEffect, useRef, useState } from "react";
import { groupOf, type Block } from "@/data/blocks";
import { BlockView } from "@/components/block-view";

type Tune = {
  fill: "light" | "dark";
  corner: number;
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

function measure(kit: HTMLElement): Tune {
  const cs = getComputedStyle(kit);
  const radius = Math.round(parseFloat(cs.borderTopLeftRadius) || 0);
  const gapAttr = kit.getAttribute("data-gap");
  const gap = Math.round(gapAttr != null ? Number(gapAttr) : parseFloat(cs.gap) || 0);
  return {
    fill: "light",
    corner: radius,
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
  kit.style.borderRadius = `${edit.corner}px`;
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

  return (
    <div
      className="bench"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
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
          <button type="button" className="bench-x" aria-label="Close" onClick={onClose}>
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
            <Bar
              label="Shadow"
              min={0}
              max={limits.shadow}
              value={tune.shadow}
              text={`${tune.shadow}`}
              onChange={(shadow) => setEdit({ ...tune, shadow })}
            />
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
