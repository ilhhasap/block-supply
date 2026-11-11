import { useRef, useState, type PointerEvent } from "react";
import { Box, Check, INK, LINE, MUTE, PAPER, Txt, WASH } from "@/components/kits";
import { Editable, act, pick, useLater } from "@/components/live-core";

const CARD = { bg: PAPER, border: "1px solid rgba(23,24,26,0.08)", shadow: true } as const;
const GREY_1 = "#D7D6D2";
const GREY_2 = "#B9B8B3";
const GREY_3 = "#8E8D88";
const GREY_4 = "#3A3A38";

function Heart({ on, size = 16 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 13.5S2 10 2 6a3 3 0 0 1 6-.8A3 3 0 0 1 14 6c0 4-6 7.5-6 7.5Z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spark({ on, size = 16 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.8 9.7 6.3 14.2 8 9.7 9.7 8 14.2 6.3 9.7 1.8 8 6.3 6.3Z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Card ─────────────────────────────────────────────────────── */

export function CardStack() {
  const items: [string, string][] = [
    ["Design review", "Thursday, 10:00"],
    ["Sprint planning", "Friday, 14:30"],
    ["Team lunch", "Monday, 12:00"],
  ];
  const [order, setOrder] = useState([0, 1, 2]);
  const next = () => setOrder((o) => [...o.slice(1), o[0] as number]);
  return (
    <Box layer="Card stack" root dir="col" hug="both" align="center" gap={-58}>
      {order.map((idx, depth) => {
        const [title, time] = items[idx] as [string, string];
        return (
          <Box
            key={title}
            layer={title}
            dir="col"
            gap={4}
            pad="16px 18px"
            radius={20}
            w={280 - depth * 36}
            h={96}
            {...CARD}
            style={{ position: "relative", zIndex: 10 - depth, opacity: 1 - depth * 0.12, transition: "width 0.3s ease, opacity 0.3s ease" }}
            ui={depth === 0 ? act(next, "Next card") : undefined}
          >
            <Txt size={11} weight={500} color={MUTE}>{`${idx + 1} of ${items.length}`}</Txt>
            <Txt size={16} weight={600}>
              {title}
            </Txt>
            <Txt size={13} weight={400} color={MUTE}>
              {time}
            </Txt>
          </Box>
        );
      })}
    </Box>
  );
}

export function Reactions() {
  const [counts, setCounts] = useState({ like: 24, love: 12, spark: 5 });
  const [mine, setMine] = useState({ like: false, love: true, spark: false });
  const toggle = (key: "like" | "love" | "spark") => {
    setMine((m) => ({ ...m, [key]: !m[key] }));
    setCounts((c) => ({ ...c, [key]: c[key] + (mine[key] ? -1 : 1) }));
  };
  const rows: ["like" | "love" | "spark", string, boolean][] = [
    ["like", "Like", false],
    ["love", "Love", false],
    ["spark", "Wow", true],
  ];
  return (
    <Box layer="Reactions" root dir="row" hug="both" align="center" gap={8}>
      {rows.map(([key, label, isSpark]) => {
        const on = mine[key];
        return (
          <Box
            key={key}
            layer={label}
            dir="row"
            align="center"
            gap={6}
            pad="8px 14px"
            radius={999}
            bg={on ? INK : WASH}
            style={{ color: on ? PAPER : INK, transition: "background-color 0.16s ease" }}
            ui={{ ...act(() => toggle(key), label), "aria-pressed": on }}
          >
            {isSpark ? <Spark on={on} /> : key === "love" ? <Heart on={on} /> : <Check color={on ? PAPER : INK} />}
            <Txt size={13} weight={600} color={on ? PAPER : INK}>
              {String(counts[key])}
            </Txt>
          </Box>
        );
      })}
    </Box>
  );
}

export function TiltCard() {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - r.left) / r.width - 0.5;
    const py = (event.clientY - r.top) / r.height - 0.5;
    setTilt({ x: px, y: py, active: true });
  };
  return (
    <Box layer="Tilt card" root dir="col" hug="both" style={{ perspective: 800 }}>
      <Box
        layer="Card"
        dir="col"
        justify="space-between"
        w={270}
        h={168}
        pad={20}
        radius={22}
        bg={INK}
        style={{
          transform: `rotateX(${-tilt.y * 14}deg) rotateY(${tilt.x * 16}deg)`,
          transition: tilt.active ? "transform 0.08s linear" : "transform 0.4s ease",
          backgroundImage: tilt.active
            ? `radial-gradient(circle at ${(tilt.x + 0.5) * 100}% ${(tilt.y + 0.5) * 100}%, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%)`
            : undefined,
        }}
        ui={{ onPointerMove: onMove, onPointerLeave: () => setTilt({ x: 0, y: 0, active: false }) }}
      >
        <Txt size={13} weight={500} color={GREY_2}>
          Block Supply
        </Txt>
        <Box layer="Body" dir="col" gap={2}>
          <Txt size={22} weight={600} color={PAPER}>
            Free forever
          </Txt>
          <Txt size={13} weight={400} color={GREY_2}>
            Member since 2026
          </Txt>
        </Box>
      </Box>
    </Box>
  );
}

function Scene({ dark }: { dark: boolean }) {
  const sky = dark ? INK : GREY_1;
  const ink = dark ? GREY_4 : GREY_2;
  const sun = dark ? PAPER : PAPER;
  return (
    <Box layer={dark ? "After" : "Before"} dir="col" align="flex-start" justify="flex-end" w={300} h={190} bg={sky} style={{ position: "relative", overflow: "hidden" }}>
      <Box layer="Sun" w={44} h={44} radius={22} bg={sun} style={{ position: "absolute", top: 34, right: 56 }} />
      <Box layer="Hill" w={210} h={96} radius={96} bg={ink} style={{ position: "absolute", bottom: -44, left: -30 }} />
      <Box layer="Hill small" w={170} h={72} radius={72} bg={dark ? GREY_3 : GREY_3} style={{ position: "absolute", bottom: -34, right: -20 }} />
    </Box>
  );
}

export function ImageCompare() {
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const set = (clientX: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))));
  };
  return (
    <Box layer="Image compare" root dir="col" hug="both" radius={20} style={{ overflow: "hidden" }}>
      <div
        ref={frame}
        role="slider"
        tabIndex={0}
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pos}
        style={{ position: "relative", width: 300, height: 190, cursor: "ew-resize", touchAction: "none", borderRadius: 20, overflow: "hidden" }}
        onPointerDown={(e) => { e.stopPropagation(); drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX); }}
        onPointerMove={(e) => { if (drag.current) set(e.clientX); }}
        onPointerUp={() => { drag.current = false; }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
          else if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
        }}
      >
        <Scene dark />
        <div style={{ position: "absolute", inset: 0, width: `${pos}%`, overflow: "hidden" }}>
          <Scene dark={false} />
        </div>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2, marginLeft: -1, background: PAPER }} />
        <div style={{ position: "absolute", top: "50%", left: `${pos}%`, width: 32, height: 32, marginLeft: -16, marginTop: -16, borderRadius: 16, background: PAPER, boxShadow: "0 4px 12px rgba(23,24,26,0.2)", display: "grid", placeItems: "center", fontFamily: "Geist", fontSize: 12, color: INK }}>
          ↔
        </div>
      </div>
    </Box>
  );
}

export function ExpandingPanels() {
  const panels: [string, string, string, string][] = [
    ["Sketch", "Rough out the idea", INK, PAPER],
    ["Build", "Turn it into blocks", GREY_4, PAPER],
    ["Review", "Share and refine", GREY_3, PAPER],
    ["Ship", "Hand it to the team", GREY_1, INK],
  ];
  const [open, setOpen] = useState(0);
  return (
    <Box layer="Expanding panels" root dir="row" hug="both" gap={8}>
      {panels.map(([title, sub, bg, fg], i) => (
        <Box
          key={title}
          layer={title}
          dir="col"
          justify="flex-end"
          gap={2}
          pad={16}
          radius={20}
          h={190}
          bg={bg}
          style={{ width: i === open ? 150 : 52, overflow: "hidden", transition: "width 0.35s ease" }}
          ui={{ ...pick(() => setOpen(i), i === open, "tab"), onMouseEnter: () => setOpen(i) }}
        >
          <Txt size={15} weight={600} color={fg}>
            {i === open ? title : title.charAt(0)}
          </Txt>
          {i === open ? (
            <Txt size={12} weight={400} color={fg}>
              {sub}
            </Txt>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

/* ── Input ────────────────────────────────────────────────────── */

export function SignaturePad() {
  const [strokes, setStrokes] = useState<string[]>([]);
  const area = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const point = (e: PointerEvent<HTMLDivElement>) => {
    const r = area.current?.getBoundingClientRect();
    return r ? `${Math.round(e.clientX - r.left)} ${Math.round(e.clientY - r.top)}` : "0 0";
  };
  return (
    <Box layer="Signature pad" root dir="col" w={300} gap={10}>
      <div
        ref={area}
        role="img"
        aria-label="Signature area"
        style={{ position: "relative", width: 300, height: 132, borderRadius: 18, background: WASH, cursor: "crosshair", touchAction: "none", overflow: "hidden" }}
        onPointerDown={(e) => { e.stopPropagation(); drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); setStrokes((s) => [...s, `M${point(e)}`]); }}
        onPointerMove={(e) => { if (drawing.current) setStrokes((s) => s.map((d, i) => (i === s.length - 1 ? `${d} L${point(e)}` : d))); }}
        onPointerUp={() => { drawing.current = false; }}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="300" height="132" viewBox="0 0 300 132" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          <line x1="24" y1="96" x2="276" y2="96" stroke={GREY_1} strokeWidth="1.5" />
          {strokes.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
        {strokes.length === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "Geist", fontSize: 14, color: GREY_3, pointerEvents: "none" }}>Sign here</div>
        ) : null}
      </div>
      <Box layer="Actions" dir="row" fill align="center" justify="space-between">
        <Txt size={12} weight={400} color={MUTE}>
          {strokes.length ? `${strokes.length} stroke${strokes.length === 1 ? "" : "s"}` : "Draw with mouse or touch"}
        </Txt>
        <Box layer="Clear" dir="row" hug="both" align="center" pad="6px 12px" radius={999} bg={WASH} ui={act(() => setStrokes([]), "Clear")}>
          <Txt size={12} weight={600}>
            Clear
          </Txt>
        </Box>
      </Box>
    </Box>
  );
}

export function SlideConfirm() {
  const TRACK = 280;
  const KNOB = 48;
  const MAXX = TRACK - KNOB - 8;
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const start = useRef(0);
  const later = useLater();
  const release = () => {
    setDragging(false);
    if (x >= MAXX * 0.85) {
      setX(MAXX);
      setDone(true);
      later(() => { setDone(false); setX(0); }, 1800);
    } else {
      setX(0);
    }
  };
  return (
    <Box layer="Slide to confirm" root dir="row" hug="both" align="center" justify="flex-start" w={TRACK} h={56} pad={4} radius={28} bg={WASH} style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "Geist", fontSize: 14, fontWeight: 500, color: done ? INK : MUTE, opacity: done ? 1 : 1 - Math.min(1, x / (MAXX * 0.7)), pointerEvents: "none" }}>
        {done ? "Confirmed" : "Slide to confirm"}
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Slide to confirm"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((x / MAXX) * 100)}
        style={{ position: "relative", width: KNOB, height: KNOB, borderRadius: KNOB / 2, background: INK, color: PAPER, display: "grid", placeItems: "center", cursor: "grab", touchAction: "none", transform: `translateX(${x}px)`, transition: dragging ? "none" : "transform 0.25s ease" }}
        onPointerDown={(e) => { if (done) return; e.stopPropagation(); setDragging(true); start.current = e.clientX - x; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (dragging) setX(Math.min(MAXX, Math.max(0, e.clientX - start.current))); }}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "ArrowRight") setX((v) => Math.min(MAXX, v + 40)); else if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - 40)); else if (e.key === "Enter" && x >= MAXX * 0.85) release(); }}
      >
        {done ? <Check color={PAPER} /> : <span style={{ fontFamily: "Geist", fontSize: 18 }}>→</span>}
      </div>
    </Box>
  );
}

export function LabelInput() {
  const [focus, setFocus] = useState(false);
  const [text, setText] = useState("");
  const up = focus || text.length > 0;
  return (
    <Box
      layer="Label input"
      root
      dir="col"
      w={280}
      justify="flex-end"
      h={60}
      pad="0 16px 8px"
      radius={16}
      bg={PAPER}
      border={`1.5px solid ${focus ? INK : LINE}`}
      style={{ position: "relative", transition: "border-color 0.16s ease" }}
      ui={{ onFocus: () => setFocus(true), onBlur: () => setFocus(false), onClick: (e) => e.stopPropagation() }}
    >
      <div
        style={{ position: "absolute", left: 16, top: up ? 9 : 20, fontFamily: "Geist", fontSize: up ? 11 : 15, fontWeight: 500, color: up ? MUTE : GREY_3, transition: "all 0.16s ease", pointerEvents: "none" }}
      >
        Full name
      </div>
      <Editable placeholder="" size={15} weight={500} label="Full name" onText={setText} />
    </Box>
  );
}

/* ── Data ─────────────────────────────────────────────────────── */

export function RollingCounter() {
  const [value, setValue] = useState(128);
  const digits = String(value).split("");
  return (
    <Box layer="Rolling counter" root dir="col" hug="both" align="center" gap={14}>
      <Txt size={12} weight={500} color={MUTE}>
        Blocks copied today
      </Txt>
      <Box layer="Digits" dir="row" align="center" gap={2}>
        {digits.map((d, i) => (
          <div key={digits.length - i} style={{ height: 52, width: 32, overflow: "hidden", position: "relative" }} aria-hidden={i > 0}>
            <div style={{ transform: `translateY(${-Number(d) * 52}px)`, transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}>
              {Array.from({ length: 10 }, (_, n) => (
                <div key={n} style={{ height: 52, display: "grid", placeItems: "center", fontFamily: "Geist", fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", color: INK }}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Box>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }} aria-live="polite">{`${value} blocks copied`}</span>
      <Box layer="Controls" dir="row" align="center" gap={8}>
        {(
          [
            ["Subtract 10", "−", -10],
            ["Subtract 1", "−1", -1],
            ["Add 1", "+1", 1],
            ["Add 10", "+", 10],
          ] as [string, string, number][]
        ).map(([label, glyph, delta]) => (
          <Box key={label} layer={label} dir="row" align="center" justify="center" w={44} h={36} radius={18} bg={WASH} ui={act(() => setValue((v) => Math.max(0, Math.min(9999, v + delta))), label)}>
            <Txt size={14} weight={600}>
              {glyph}
            </Txt>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function HeatMap() {
  const ROWS = 7;
  const COLS = 14;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const seed = (r: number, c: number) => ((r * 31 + c * 17 + r * c * 7) % 11) % 5;
  const [bump, setBump] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<[number, number] | null>(null);
  const tones = [WASH, GREY_1, GREY_2, GREY_3, INK];
  const level = (r: number, c: number) => Math.min(4, seed(r, c) + (bump[`${r}-${c}`] ?? 0));
  return (
    <Box layer="Heat map" root dir="col" hug="both" gap={12}>
      <Box layer="Grid" dir="col" gap={4}>
        {Array.from({ length: ROWS }, (_, r) => (
          <Box key={r} layer={days[r] as string} dir="row" gap={4}>
            {Array.from({ length: COLS }, (_, c) => (
              <Box
                key={c}
                layer={`Cell ${r + 1}-${c + 1}`}
                w={16}
                h={16}
                radius={5}
                bg={tones[level(r, c)] as string}
                ui={{ ...act(() => setBump((b) => ({ ...b, [`${r}-${c}`]: (b[`${r}-${c}`] ?? 0) + 1 })), `${days[r]}, week ${c + 1}`), onMouseEnter: () => setHover([r, c]), onMouseLeave: () => setHover(null) }}
              />
            ))}
          </Box>
        ))}
      </Box>
      <Box layer="Footer" dir="row" fill align="center" justify="space-between">
        <Txt size={12} weight={500} color={hover ? INK : MUTE}>
          {hover ? `${level(hover[0], hover[1])} copies · ${days[hover[0]]}, week ${hover[1] + 1}` : "Copies per day"}
        </Txt>
        <Box layer="Legend" dir="row" align="center" gap={3}>
          {tones.map((tone) => (
            <Box key={tone} layer="Swatch" w={10} h={10} radius={3} bg={tone} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export function StackedBars() {
  const weeks = ["W1", "W2", "W3", "W4", "W5"];
  const data: [number, number, number][] = [
    [40, 24, 16],
    [52, 20, 22],
    [34, 30, 26],
    [60, 26, 14],
    [46, 34, 30],
  ];
  const series: [string, string][] = [
    ["Design", INK],
    ["Code", GREY_3],
    ["Media", GREY_1],
  ];
  const [active, setActive] = useState<number | null>(null);
  return (
    <Box layer="Stacked bars" root dir="col" hug="both" gap={14}>
      <Box layer="Bars" dir="row" align="flex-end" justify="space-between" gap={14} h={130} w={264}>
        {data.map((vals, i) => (
          <Box key={weeks[i]} layer={weeks[i] as string} dir="col" align="center" gap={6}>
            <Box layer="Stack" dir="col" gap={2} justify="flex-end" w={34} h={108}>
              {vals.map((v, s) => (
                <Box
                  key={s}
                  layer={(series[s] as [string, string])[0]}
                  w={34}
                  h={v}
                  radius={s === 0 ? 8 : 4}
                  bg={(series[s] as [string, string])[1]}
                  style={{ opacity: active === null || active === s ? 1 : 0.28, transition: "opacity 0.16s ease" }}
                  ui={{ onMouseEnter: () => setActive(s), onMouseLeave: () => setActive(null), ...act(() => setActive((a) => (a === s ? null : s)), `${(series[s] as [string, string])[0]}, ${weeks[i]}: ${v}`) }}
                />
              ))}
            </Box>
            <Txt size={11} weight={500} color={MUTE}>
              {weeks[i] as string}
            </Txt>
          </Box>
        ))}
      </Box>
      <Box layer="Legend" dir="row" align="center" gap={14}>
        {series.map(([name, tone], s) => (
          <Box key={name} layer={name} dir="row" align="center" gap={6} ui={{ onMouseEnter: () => setActive(s), onMouseLeave: () => setActive(null) }}>
            <Box layer="Swatch" w={10} h={10} radius={3} bg={tone} />
            <Txt size={12} weight={active === s ? 600 : 500} color={active === s ? INK : MUTE}>
              {name}
            </Txt>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ── Overlay ──────────────────────────────────────────────────── */

export function ToastStack() {
  const messages = ["Block copied to Figma", "Saved to your list", "Link copied", "Settings updated", "Export finished"];
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([
    { id: 1, text: "Saved to your list" },
    { id: 0, text: "Block copied to Figma" },
  ]);
  const nextId = useRef(2);
  const add = () => {
    const id = nextId.current++;
    setToasts((t) => [{ id, text: messages[id % messages.length] as string }, ...t].slice(0, 4));
  };
  return (
    <Box layer="Toast stack" root dir="col" hug="both" align="center" gap={16}>
      <Box layer="Stack" dir="col" align="center" gap={-34} w={280} h={120}>
        {toasts.map((toast, depth) => (
          <Box
            key={toast.id}
            layer={toast.text}
            dir="row"
            align="center"
            justify="space-between"
            gap={10}
            pad="0 16px"
            h={52}
            radius={16}
            w={280 - depth * 24}
            bg={INK}
            style={{ position: "relative", zIndex: 10 - depth, opacity: 1 - depth * 0.2, transition: "width 0.25s ease, opacity 0.25s ease" }}
            ui={depth === 0 ? act(() => setToasts((t) => t.slice(1)), "Dismiss toast") : undefined}
          >
            <Txt size={13} weight={500} color={PAPER}>
              {toast.text}
            </Txt>
            {depth === 0 ? (
              <Txt size={12} weight={500} color={GREY_2}>
                Dismiss
              </Txt>
            ) : null}
          </Box>
        ))}
      </Box>
      <Box layer="Show toast" dir="row" hug="both" align="center" pad="10px 16px" radius={999} bg={WASH} ui={act(add, "Show toast")}>
        <Txt size={13} weight={600}>
          {toasts.length ? "Show another" : "Show toast"}
        </Txt>
      </Box>
    </Box>
  );
}

export function DynamicIsland() {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  return (
    <Box layer="Dynamic island" root dir="col" hug="both" align="center">
      <Box
        layer="Island"
        dir="col"
        justify="center"
        gap={10}
        pad={open ? "14px 16px" : "0 16px"}
        radius={open ? 28 : 20}
        bg={INK}
        w={open ? 280 : 150}
        h={open ? 96 : 40}
        style={{ overflow: "hidden", transition: "width 0.3s ease, height 0.3s ease, padding 0.3s ease, border-radius 0.3s ease" }}
        ui={{ ...act(() => setOpen((v) => !v), open ? "Collapse" : "Expand"), "aria-expanded": open }}
      >
        <Box layer="Row" dir="row" fill align="center" justify="space-between" gap={10}>
          <Box layer="Info" dir="row" align="center" gap={8}>
            <Box layer="Dot" w={8} h={8} radius={4} bg={playing ? PAPER : GREY_3} />
            <Box layer="Copy" dir="col" gap={1}>
              <Txt size={13} weight={600} color={PAPER}>
                {open ? "Evening mix" : playing ? "Playing" : "Paused"}
              </Txt>
              {open ? (
                <Txt size={11} weight={400} color={GREY_2}>
                  Block Supply Radio
                </Txt>
              ) : null}
            </Box>
          </Box>
          {open ? (
            <Box layer="Play" dir="row" align="center" justify="center" w={32} h={32} radius={16} bg={PAPER} ui={act(() => setPlaying((v) => !v), playing ? "Pause" : "Play")}>
              <Txt size={11} weight={700}>
                {playing ? "II" : "▶"}
              </Txt>
            </Box>
          ) : null}
        </Box>
        {open ? (
          <Box layer="Progress" dir="row" fill h={4} radius={2} bg={GREY_4}>
            <Box layer="Filled" h={4} radius={2} bg={PAPER} w={playing ? "62%" : "40%"} style={{ transition: "width 0.3s ease" }} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

/* ── Nav ──────────────────────────────────────────────────────── */

export function Dock() {
  const items = ["Files", "Search", "Mail", "Notes", "Music"];
  const [pointer, setPointer] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const scaleFor = (i: number) => {
    if (pointer === null || !row.current) return 1;
    const r = row.current.getBoundingClientRect();
    const slot = r.width / items.length;
    const center = r.left + slot * (i + 0.5);
    const dist = Math.abs(pointer - center);
    return 1 + 0.55 * Math.max(0, 1 - dist / (slot * 1.6));
  };
  const glyph = (i: number) =>
    i === 0 ? <Box layer="Glyph" w={16} h={13} radius={3} bg={INK} /> :
    i === 1 ? <Box layer="Glyph" w={15} h={15} radius={8} bg="transparent" border={`2.5px solid ${INK}`} /> :
    i === 2 ? <Box layer="Glyph" w={18} h={12} radius={3} bg="transparent" border={`2.5px solid ${INK}`} /> :
    i === 3 ? <Box layer="Glyph" w={13} h={17} radius={3} bg={INK} /> :
    <Box layer="Glyph" w={16} h={16} radius={8} bg={INK} />;
  return (
    <Box layer="Dock" root dir="col" hug="both" align="center" gap={8}>
      <div
        ref={row}
        style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: "10px 12px", borderRadius: 24, background: WASH, height: 78, boxSizing: "border-box" }}
        onPointerMove={(e) => setPointer(e.clientX)}
        onPointerLeave={() => setPointer(null)}
      >
        {items.map((name, i) => (
          <div key={name} style={{ transform: `scale(${scaleFor(i)})`, transformOrigin: "50% 100%", transition: pointer === null ? "transform 0.25s ease" : "transform 0.06s linear" }}>
            <Box layer={name} dir="col" align="center" justify="center" w={46} h={46} radius={14} bg={PAPER} shadow ui={{ ...act(() => setActive(i), name), "aria-pressed": active === i }}>
              {glyph(i)}
            </Box>
          </div>
        ))}
      </div>
      <Txt size={12} weight={500} color={MUTE}>
        {items[active] as string}
      </Txt>
    </Box>
  );
}

/* ── Button ───────────────────────────────────────────────────── */

export function LikeButton() {
  const [liked, setLiked] = useState(false);
  const [pulse, setPulse] = useState(false);
  const later = useLater();
  const toggle = () => {
    setLiked((v) => !v);
    setPulse(true);
    later(() => setPulse(false), 220);
  };
  return (
    <Box
      layer="Like button"
      root
      dir="row"
      hug="both"
      align="center"
      gap={8}
      pad="12px 18px"
      radius={999}
      bg={liked ? INK : WASH}
      style={{ color: liked ? PAPER : INK, transform: pulse ? "scale(1.08)" : "scale(1)", transition: "transform 0.2s ease, background-color 0.16s ease" }}
      ui={{ ...act(toggle, liked ? "Unlike" : "Like"), "aria-pressed": liked }}
    >
      <Heart on={liked} size={18} />
      <Txt size={15} weight={600} color={liked ? PAPER : INK}>
        {String(liked ? 1249 : 1248)}
      </Txt>
    </Box>
  );
}

