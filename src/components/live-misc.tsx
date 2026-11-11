import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  AMBER, Arrow, BLUE, Box, Check, CORAL, GREEN, INK, LINE, MUTE, Mic, PAPER, Plus, Spin, Star, TEAL, Txt, VIOLET, WASH,
} from "@/components/kits";
import { Editable, act, pick, useFlow, useLater } from "@/components/live-core";

const CARD = { bg: PAPER, border: "1px solid rgba(23,24,26,0.08)", shadow: true } as const;

/* ── Status ───────────────────────────────────────────────────── */

export function Progress() {
  const [pct, setPct] = useState(62);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setPct((p) => {
        if (p >= 100) { window.clearInterval(id); setRunning(false); return 100; }
        return Math.min(100, p + 4);
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [running]);
  const restart = () => { if (running) return; setPct(pct >= 100 ? 0 : pct); setRunning(true); };
  return (
    <Box layer="Progress" root fill dir="col" gap={10} ui={act(restart, "Export")}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Txt size={14} weight={600}>
          {pct >= 100 ? "Export complete" : "Exporting frame"}
        </Txt>
        <Txt size={14} weight={600} color={MUTE}>
          {`${pct}%`}
        </Txt>
      </Box>
      <Box layer="Track" dir="row" fill h={8} radius={4} bg={WASH}>
        <Box layer="Filled" h={8} radius={4} bg={pct >= 100 ? GREEN : INK} style={{ width: `${pct}%`, transition: "width 0.09s linear" }} />
      </Box>
      <Txt size={13} weight={400} color={MUTE}>
        {pct >= 100 ? "Click to run it again" : running ? "Auto layout, then Geist text" : "Click to continue"}
      </Txt>
    </Box>
  );
}

export function Rating() {
  const [val, setVal] = useState(4);
  const [hover, setHover] = useState(0);
  const shown = hover || val;
  return (
    <Box layer="Rating" root dir="col" hug="both" align="center" gap={8}>
      <Box layer="Stars" dir="row" align="center" gap={4} ui={{ role: "radiogroup", onMouseLeave: () => setHover(0) }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Box key={n} layer={`Star ${n}`} dir="row" align="center" ui={{ ...pick(() => setVal(n), n === val, "radio"), onMouseEnter: () => setHover(n) }}>
            <Star on={n <= shown} />
          </Box>
        ))}
      </Box>
      <Txt size={13} weight={500} color={MUTE}>
        {`${val}.0 from 218 reviews`}
      </Txt>
    </Box>
  );
}

export function StatusPills() {
  const items = [
    ["Active", GREEN, "#F3F3F2"],
    ["Pending", MUTE, "#F3F3F2"],
    ["Failed", CORAL, "#F3F3F2"],
  ] as const;
  const [on, setOn] = useState<string>("Active");
  return (
    <Box layer="Status pills" root dir="row" hug="both" align="center" gap={8} ui={{ role: "radiogroup" }}>
      {items.map(([label, color, bg]) => (
        <Box key={label} layer={label} dir="row" hug="both" align="center" gap={6} pad="6px 12px" radius={999} bg={bg} border={on === label ? `1.5px solid ${color}` : "1.5px solid transparent"} ui={pick(() => setOn(label), on === label, "radio")}>
          <Box layer="Dot" w={7} h={7} radius={4} bg={color} />
          <Txt size={13} weight={600} color={color}>
            {label}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

export function Meter() {
  const parts: [string, number, string][] = [
    ["Design", 46, BLUE],
    ["Code", 20, VIOLET],
    ["Media", 12, AMBER],
  ];
  const [hot, setHot] = useState<string | null>(null);
  const hotPart = parts.find(([n]) => n === hot);
  return (
    <Box layer="Storage meter" root fill dir="col" gap={12}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Txt size={14} weight={600}>
          Storage
        </Txt>
        <Txt size={13} weight={400} color={MUTE}>
          {hotPart ? `${hotPart[0]}: ${(hotPart[1] / 10).toFixed(1)} GB` : "7.8 of 10 GB"}
        </Txt>
      </Box>
      <Box layer="Track" dir="row" fill h={10} radius={5} bg={WASH} gap={2}>
        {parts.map(([name, width, color]) => (
          <Box key={name} layer={name} h={10} bg={color} style={{ width: `${width}%`, opacity: hot && hot !== name ? 0.35 : 1, transition: "opacity 0.16s ease" }} ui={{ className: "ix", onMouseEnter: () => setHot(name), onMouseLeave: () => setHot(null) }} />
        ))}
      </Box>
      <Box layer="Legend" dir="row" align="center" gap={14}>
        {parts.map(([name, , color]) => (
          <Box key={name} layer={`${name} key`} dir="row" align="center" gap={6} ui={{ className: "ix", onMouseEnter: () => setHot(name), onMouseLeave: () => setHot(null) }}>
            <Box layer="Dot" w={8} h={8} radius={4} bg={color} />
            <Txt size={12} weight={500} color={MUTE}>
              {name}
            </Txt>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ── Data ─────────────────────────────────────────────────────── */

export function Stepper() {
  const steps = ["Copy", "Paste", "Edit"];
  const [cur, setCur] = useState(1);
  return (
    <Box layer="Stepper" root fill dir="row" align="flex-start">
      {steps.map((label, i) => {
        const on = i <= cur;
        return (
          <Box key={label} layer={label} dir="col" align="center" gap={8} style={{ flex: 1 }} ui={pick(() => setCur(i === cur ? Math.max(0, i - 1) : i), i === cur, "tab")}>
            <Box layer="Rail" dir="row" fill align="center">
              <Box layer="Before" h={2} radius={1} bg={i === 0 ? "transparent" : on ? INK : LINE} style={{ flex: 1 }} />
              <Box layer="Index" dir="row" w={28} h={28} radius={14} align="center" justify="center" bg={on ? INK : PAPER} border={on ? undefined : `2px solid ${LINE}`}>
                {i < cur ? <Check /> : <Txt size={12} weight={600} color={on ? PAPER : MUTE}>{String(i + 1)}</Txt>}
              </Box>
              <Box layer="After" h={2} radius={1} bg={i === steps.length - 1 ? "transparent" : i < cur ? INK : LINE} style={{ flex: 1 }} />
            </Box>
            <Txt size={13} weight={on ? 600 : 500} color={on ? INK : MUTE}>
              {label}
            </Txt>
          </Box>
        );
      })}
    </Box>
  );
}

export function Table() {
  const rows = [
    ["Primary button", "Button", "Free"],
    ["Orb", "Voice", "Free"],
    ["Navbar", "Nav", "Free"],
    ["Stat card", "Card", "Free"],
  ];
  const [sel, setSel] = useState<string | null>(null);
  return (
    <Box layer="Table" root fill dir="col" gap={0} pad={8} radius={16} {...CARD}>
      <Box layer="Header" dir="row" fill align="center" pad="8px 10px">
        <Box layer="Block" style={{ flex: 1.4 }}>
          <Txt size={12} weight={600} color={MUTE}>Block</Txt>
        </Box>
        <Box layer="Kind" style={{ flex: 0.8 }}>
          <Txt size={12} weight={600} color={MUTE}>Kind</Txt>
        </Box>
        <Box layer="Price" style={{ width: 48 }}>
          <Txt size={12} weight={600} color={MUTE}>Price</Txt>
        </Box>
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      {rows.map(([block, kind, price]) => (
        <Box key={block} layer={block} dir="row" fill align="center" pad="10px" radius={10} bg={sel === block ? WASH : "transparent"} ui={pick(() => setSel(sel === block ? null : block), sel === block, "option")}>
          <Box layer="Name" style={{ flex: 1.4 }}>
            <Txt size={14} weight={sel === block ? 600 : 500}>{block}</Txt>
          </Box>
          <Box layer="Kind value" style={{ flex: 0.8 }}>
            <Txt size={14} weight={400} color={MUTE}>{kind}</Txt>
          </Box>
          <Box layer="Price value" style={{ width: 48 }}>
            <Txt size={14} weight={600}>{price}</Txt>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function BarChart() {
  const days: [string, number][] = [["Mon", 46], ["Tue", 70], ["Wed", 58], ["Thu", 92], ["Fri", 66], ["Sat", 34], ["Sun", 40]];
  const [on, setOn] = useState("Thu");
  const cur = days.find(([d]) => d === on)!;
  return (
    <Box layer="Bar chart" root fill dir="col" gap={18} pad={20} radius={22} {...CARD}>
      <Box layer="Header" dir="col" gap={2}>
        <Txt size={14} weight={600}>{`${cur[0]}: ${cur[1] * 12} visits`}</Txt>
        <Txt size={12} weight={400} color={MUTE}>Compared with last week</Txt>
      </Box>
      <Box layer="Bars" dir="row" fill align="flex-end" gap={10} h={120}>
        {days.map(([day, height]) => (
          <Box key={day} layer={day} dir="col" align="center" gap={8} style={{ flex: 1 }} ui={{ ...pick(() => setOn(day), day === on, "option"), onMouseEnter: () => setOn(day) }}>
            <Box layer={`${day} bar`} fill h={height} radius={6} bg={day === on ? INK : WASH} style={{ transition: "background-color 0.16s ease" }} />
            <Txt size={11} weight={500} color={MUTE}>{day}</Txt>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function Donut() {
  const parts: [string, number, string][] = [["Design", 55, BLUE], ["Build", 30, TEAL], ["Review", 15, AMBER]];
  const [hot, setHot] = useState<string | null>(null);
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Box layer="Donut chart" root dir="row" hug="both" align="center" gap={24} pad={24} radius={22} {...CARD}>
      <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
        <g transform="rotate(-90 56 56)">
          {parts.map(([name, pct, color]) => {
            const len = (pct / 100) * c;
            const node = (
              <circle key={name} cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth={hot === name ? 20 : 16} strokeOpacity={hot && hot !== name ? 0.35 : 1} strokeDasharray={`${len - 2} ${c - len + 2}`} strokeDashoffset={-offset} style={{ transition: "stroke-width 0.16s ease, stroke-opacity 0.16s ease" }} />
            );
            offset += len;
            return node;
          })}
        </g>
      </svg>
      <Box layer="Legend" dir="col" gap={10}>
        {parts.map(([name, pct, color]) => (
          <Box key={name} layer={name} dir="row" align="center" gap={8} ui={{ className: "ix", onMouseEnter: () => setHot(name), onMouseLeave: () => setHot(null) }}>
            <Box layer={`${name} dot`} w={10} h={10} radius={5} bg={color} />
            <Txt size={13} weight={hot === name ? 600 : 500}>{name}</Txt>
            <Txt size={13} weight={400} color={MUTE}>{`${pct}%`}</Txt>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function Calendar() {
  const [month, setMonth] = useState(10); // November
  const [year, setYear] = useState(2026);
  const [day, setDay] = useState<number | null>(12);
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const step = (d: number) => {
    const m = month + d;
    if (m < 0) { setMonth(11); setYear(year - 1); } else if (m > 11) { setMonth(0); setYear(year + 1); } else setMonth(m);
    setDay(null);
  };
  const name = first.toLocaleString("en-US", { month: "long" });
  return (
    <Box layer="Calendar" root fill dir="col" gap={10} pad={16} radius={22} {...CARD}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Txt size={14} weight={600}>{`${name} ${year}`}</Txt>
        <Box layer="Arrows" dir="row" align="center" gap={4}>
          <Box layer="Previous" dir="row" w={28} h={28} radius={14} align="center" justify="center" ui={act(() => step(-1), "Previous month")}>
            <Arrow dir="left" color={MUTE} />
          </Box>
          <Box layer="Next" dir="row" w={28} h={28} radius={14} align="center" justify="center" ui={act(() => step(1), "Next month")}>
            <Arrow dir="right" color={MUTE} />
          </Box>
        </Box>
      </Box>
      <Box layer="Weekdays" dir="row" fill>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <Box key={i} layer={`Weekday ${i + 1}`} dir="row" align="center" justify="center" h={28} style={{ flex: 1 }}>
            <Txt size={11} weight={500} color={MUTE}>{d}</Txt>
          </Box>
        ))}
      </Box>
      {weeks.map((week, w) => (
        <Box key={w} layer={`Week ${w + 1}`} dir="row" fill>
          {week.map((d, i) => (
            <Box key={i} layer={d ? `Day ${d}` : `Empty ${i + 1}`} dir="row" align="center" justify="center" h={34} radius={17} bg={d === day ? INK : undefined} style={{ flex: 1 }} ui={d ? pick(() => setDay(d), d === day, "option") : undefined}>
              <Txt size={13} weight={d === day ? 600 : 400} color={d === day ? PAPER : INK}>{d ? String(d) : ""}</Txt>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function Timeline() {
  const steps: [string, string][] = [["Order placed", "Mon, 9:41"], ["Packed", "Mon, 14:05"], ["Out for delivery", "Tue, 08:30"]];
  const [done, setDone] = useState(2);
  return (
    <Box layer="Timeline" root fill dir="col" gap={0} pad={20} radius={22} {...CARD}>
      {steps.map(([title, time], i) => {
        const on = i < done;
        return (
          <Box key={title} layer={title} dir="row" fill align="flex-start" gap={14} ui={pick(() => setDone(on ? i : i + 1), on, "checkbox")}>
            <Box layer="Rail" dir="col" align="center" gap={0}>
              <Box layer="Dot" dir="row" w={14} h={14} radius={7} bg={on ? INK : PAPER} border={on ? undefined : `2px solid ${LINE}`} />
              {i < steps.length - 1 ? <Box layer="Line" w={2} h={32} bg={i < done - 1 ? INK : LINE} /> : null}
            </Box>
            <Box layer="Text" dir="col" gap={1} pad="0 0 14px 0">
              <Txt size={14} weight={600} color={on ? INK : MUTE}>{title}</Txt>
              <Txt size={12} weight={400} color={MUTE}>{time}</Txt>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export function Activity() {
  const items: [string, string, string][] = [["Alex published a block", "2 min ago", BLUE], ["Jamie left a comment", "18 min ago", CORAL], ["Sam joined the team", "1 hour ago", TEAL]];
  const [read, setRead] = useState<string[]>([]);
  return (
    <Box layer="Activity feed" root fill dir="col" gap={14} pad={20} radius={22} {...CARD}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Txt size={14} weight={600}>Activity</Txt>
        <Box layer="Mark all" dir="row" align="center" ui={act(() => setRead(items.map(([t]) => t)), "Mark all read")}>
          <Txt size={12} weight={500} color={MUTE}>{read.length === items.length ? "All read" : "Mark all read"}</Txt>
        </Box>
      </Box>
      {items.map(([text, time, color]) => {
        const isRead = read.includes(text);
        return (
          <Box key={text} layer={text} dir="row" fill align="center" gap={12} ui={pick(() => setRead((r) => (r.includes(text) ? r.filter((x) => x !== text) : [...r, text])), isRead, "checkbox")}>
            <Box layer="Dot" w={10} h={10} radius={5} bg={isRead ? LINE : color} />
            <Box layer="Text" dir="col" gap={1}>
              <Txt size={13} weight={isRead ? 400 : 500} color={isRead ? MUTE : INK}>{text}</Txt>
              <Txt size={12} weight={400} color={MUTE}>{time}</Txt>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/* ── Voice ────────────────────────────────────────────────────── */

export function VoiceButton() {
  const [on, setOn] = useState(false);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!on) { setSecs(0); return; }
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [on]);
  return (
    <Box layer="Voice button" root dir="col" hug="both" align="center" gap={14}>
      <Box layer="Mic" dir="row" w={92} h={92} radius={46} align="center" justify="center" bg={on ? MUTE : INK} border={`10px solid ${on ? "rgba(23,24,26,0.22)" : "rgba(23,24,26,0.08)"}`} style={{ transition: "background-color 0.2s ease, border-color 0.2s ease" }} ui={{ ...act(() => setOn((v) => !v), "Talk"), "aria-pressed": on }}>
        <Mic />
      </Box>
      <Txt size={14} weight={500}>{on ? `Listening ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : "Tap to talk"}</Txt>
    </Box>
  );
}

export function Orb() {
  const [on, setOn] = useState(true);
  const size = on ? 148 : 128;
  return (
    <Box layer="Orb" root dir="col" hug="both" align="center" gap={16}>
      <Box layer="Stage" dir="row" w={148} h={148} align="center" justify="center">
        <Box layer="Sphere" dir="row" w={size} h={size} radius={size / 2} align="center" justify="center" style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #C9C8C4 42%, #17181A 100%)", transition: "width 0.3s ease, height 0.3s ease, border-radius 0.3s ease" }} ui={{ ...act(() => setOn((v) => !v), "Orb"), "aria-pressed": on }}>
          <Box layer="Highlight" w={36} h={36} radius={18} bg="rgba(255,255,255,0.55)" />
        </Box>
      </Box>
      <Txt size={13} weight={500} color={MUTE}>{on ? "Listening" : "Paused"}</Txt>
    </Box>
  );
}

export function Waveform() {
  const base = [18, 36, 22, 58, 30, 70, 26, 84, 40, 64, 28, 76, 34, 90, 24, 48];
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 110);
    return () => window.clearInterval(id);
  }, [live]);
  const h = (v: number, i: number) => (live ? Math.round(14 + Math.abs(Math.sin((tick + i * 1.7) * 0.7)) * 76 + (v % 7)) : v);
  return (
    <Box layer="Live waveform" root fill dir="row" align="center" justify="center" gap={8} h={120} ui={{ ...act(() => setLive((v) => !v), "Toggle waveform"), "aria-pressed": live }}>
      {base.map((height, i) => (
        <Box key={i} layer={`Bar ${i + 1}`} w={8} h={h(height, i)} radius={4} bg={i % 5 === 0 ? INK : "#B9B8B3"} />
      ))}
    </Box>
  );
}

function useDrag(onValue: (frac: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const at = (x: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r && r.width > 0) onValue(Math.min(1, Math.max(0, (x - r.left) / r.width)));
  };
  return {
    ref,
    props: {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => { e.stopPropagation(); dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); at(e.clientX); },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => { if (dragging.current) at(e.clientX); },
      onPointerUp: () => { dragging.current = false; },
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    },
  };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Player() {
  const total = 220;
  const [t, setT] = useState(72);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setT((x) => (x >= total ? (setPlaying(false), total) : x + 1)), 1000);
    return () => window.clearInterval(id);
  }, [playing]);
  const drag = useDrag((f) => setT(Math.round(f * total)));
  return (
    <Box layer="Audio player" root fill dir="row" align="center" gap={14} pad={16} radius={20} {...CARD}>
      <Box layer="Cover" dir="row" w={84} h={84} radius={14} align="center" justify="center" bg={INK} ui={{ ...act(() => setPlaying((v) => !v), playing ? "Pause" : "Play"), "aria-pressed": playing }}>
        {playing ? (
          <Box layer="Pause" dir="row" align="center" gap={5}>
            <Box layer="Bar" w={5} h={20} radius={2} bg={PAPER} />
            <Box layer="Bar" w={5} h={20} radius={2} bg={PAPER} />
          </Box>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 3.5v15l13-7.5-13-7.5Z" fill={PAPER} /></svg>
        )}
      </Box>
      <Box layer="Meta" dir="col" gap={8} style={{ flex: 1, minWidth: 0 }}>
        <Box layer="Titles" dir="col" gap={2}>
          <Txt size={16} weight={600}>Supply notes</Txt>
          <Txt size={13} weight={400} color={MUTE}>Side A · voice</Txt>
        </Box>
        <div ref={drag.ref} {...drag.props} style={{ width: "100%", padding: "6px 0", cursor: "pointer", touchAction: "none" }} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={total} aria-valuenow={t} tabIndex={0}>
          <Box layer="Track" dir="row" fill h={4} radius={2} bg={WASH}>
            <Box layer="Played" h={4} radius={2} bg={INK} style={{ width: `${(t / total) * 100}%` }} />
          </Box>
        </div>
        <Box layer="Times" dir="row" fill justify="space-between">
          <Txt size={11} weight={500} color={MUTE}>{mmss(t)}</Txt>
          <Txt size={11} weight={500} color={MUTE}>{mmss(total)}</Txt>
        </Box>
      </Box>
    </Box>
  );
}

export function Scrub() {
  const total = 160;
  const [t, setT] = useState(42);
  const drag = useDrag((f) => setT(Math.round(f * total)));
  return (
    <Box layer="Scrub bar" root fill dir="row" align="center" gap={12}>
      <Txt size={12} weight={500} color={MUTE}>{mmss(t)}</Txt>
      <div ref={drag.ref} {...drag.props} style={{ flex: 1, padding: "8px 0", cursor: "ew-resize", touchAction: "none" }} role="slider" aria-label="Scrub" aria-valuemin={0} aria-valuemax={total} aria-valuenow={t} tabIndex={0}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === "ArrowRight") setT((x) => Math.min(total, x + 1)); else if (e.key === "ArrowLeft") setT((x) => Math.max(0, x - 1)); }}>
        <Box layer="Track" dir="row" fill align="center" gap={-8}>
          <Box layer="Played" h={6} radius={3} bg={INK} style={{ width: `${(t / total) * 100}%` }} />
          <Box layer="Knob" w={16} h={16} radius={8} bg={INK} />
          <Box layer="Rest" h={6} radius={3} bg={WASH} style={{ flex: 1 }} />
        </Box>
      </div>
      <Txt size={12} weight={500} color={MUTE}>{mmss(total - t)}</Txt>
    </Box>
  );
}

/* ── Cards ────────────────────────────────────────────────────── */

export function Profile() {
  const [following, setFollowing] = useState(false);
  const stats: [string, string][] = [[following ? "129" : "128", "Copies"], ["46", "Blocks"], ["Free", "Plan"]];
  return (
    <Box layer="Profile card" root fill dir="col" gap={16} pad={20} radius={22} {...CARD}>
      <Box layer="Identity" dir="row" fill align="center" gap={12}>
        <Box layer="Avatar" dir="row" w={56} h={56} radius={28} align="center" justify="center" bg={INK}>
          <Txt size={14} weight={600} color={PAPER}>AM</Txt>
        </Box>
        <Box layer="Name" dir="col" gap={2}>
          <Txt size={16} weight={600}>Alex Morgan</Txt>
          <Txt size={13} weight={400} color={MUTE}>Product design</Txt>
        </Box>
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      <Box layer="Stats" dir="row" fill gap={18}>
        {stats.map(([n, k]) => (
          <Box key={k} layer={k} dir="col" gap={2}>
            <Txt size={16} weight={600}>{n}</Txt>
            <Txt size={12} weight={400} color={MUTE}>{k}</Txt>
          </Box>
        ))}
      </Box>
      <Box layer="Follow" dir="row" fill align="center" justify="center" gap={6} h={40} radius={999} bg={following ? WASH : INK} border={following ? `1px solid ${LINE}` : undefined} ui={{ ...act(() => setFollowing((v) => !v), "Follow"), "aria-pressed": following }}>
        {following ? <Check color={INK} /> : null}
        <Txt size={14} weight={500} color={following ? INK : PAPER}>{following ? "Following" : "Follow"}</Txt>
      </Box>
    </Box>
  );
}

export function PricingCard() {
  const points = ["Unlimited projects", "Team sharing", "Priority support"];
  const [yearly, setYearly] = useState(false);
  const [state, run] = useFlow(600, 1400);
  return (
    <Box layer="Pricing card" root fill dir="col" gap={14} pad={20} radius={22} {...CARD}>
      <Box layer="Head" dir="row" fill align="center" justify="space-between">
        <Txt size={13} weight={500} color={MUTE}>Starter</Txt>
        <Box layer="Billing" dir="row" align="center" gap={4} pad={3} radius={999} bg={WASH} ui={{ role: "tablist" }}>
          {["Monthly", "Yearly"].map((b) => (
            <Box key={b} layer={b} dir="row" align="center" pad="3px 9px" radius={999} bg={(b === "Yearly") === yearly ? PAPER : "transparent"} ui={pick(() => setYearly(b === "Yearly"), (b === "Yearly") === yearly, "tab")}>
              <Txt size={11} weight={600} color={(b === "Yearly") === yearly ? INK : MUTE}>{b}</Txt>
            </Box>
          ))}
        </Box>
      </Box>
      <Box layer="Price" dir="row" align="flex-end" gap={6}>
        <Txt size={40} weight={600}>{yearly ? "$9" : "$12"}</Txt>
        <Txt size={14} weight={400} color={MUTE}>per month</Txt>
      </Box>
      <Box layer="Points" dir="col" gap={8}>
        {points.map((p) => (
          <Box key={p} layer={p} dir="row" align="center" gap={8}>
            <Check color={GREEN} />
            <Txt size={13} weight={400}>{p}</Txt>
          </Box>
        ))}
      </Box>
      <Box layer="Choose plan" dir="row" fill align="center" justify="center" gap={6} h={46} radius={999} bg={state === "done" ? GREEN : INK} ui={act(run, "Choose plan")}>
        {state === "busy" ? <Spin size={14} color={PAPER} /> : state === "done" ? <Check /> : null}
        <Txt size={15} weight={500} color={PAPER}>{state === "done" ? "Selected" : "Choose plan"}</Txt>
      </Box>
    </Box>
  );
}

export function ProductCard() {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  return (
    <Box layer="Product card" root fill dir="col" gap={14} pad={12} radius={24} {...CARD}>
      <Box layer="Image" dir="row" fill h={120} radius={16} bg={WASH} align="center" justify="center">
        <Box layer="Shape" w={44} h={44} radius={12} bg={CORAL} />
        <Box layer="Like" dir="row" w={32} h={32} radius={16} align="center" justify="center" bg={PAPER} style={{ position: "absolute", top: 10, right: 10 }} ui={{ ...act(() => setLiked((v) => !v), "Like"), "aria-pressed": liked }}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.5S2 10 2 6a3 3 0 0 1 6-.8A3 3 0 0 1 14 6c0 4-6 7.5-6 7.5Z" fill={liked ? CORAL : "none"} stroke={liked ? CORAL : MUTE} strokeWidth="1.4" strokeLinejoin="round" /></svg>
        </Box>
      </Box>
      <Box layer="Details" dir="row" fill align="center" justify="space-between" pad="0 6px">
        <Box layer="Title" dir="col" gap={1}>
          <Txt size={14} weight={600}>Desk lamp</Txt>
          <Txt size={12} weight={400} color={MUTE}>Matte coral</Txt>
        </Box>
        <Txt size={15} weight={600}>$48</Txt>
      </Box>
      <Box layer="Add to cart" dir="row" fill align="center" justify="center" gap={6} h={46} radius={999} bg={count ? GREEN : INK} ui={act(() => setCount((c) => c + 1), "Add to cart")}>
        {count ? <Check /> : null}
        <Txt size={15} weight={500} color={PAPER}>{count ? `In cart (${count})` : "Add to cart"}</Txt>
      </Box>
    </Box>
  );
}

/* ── Forms ────────────────────────────────────────────────────── */

function EField({ label, placeholder, initial, onText, secret, invalid }: { label: string; placeholder: string; initial?: string; onText?: (t: string) => void; secret?: boolean; invalid?: boolean }) {
  const [val, setVal] = useState("");
  const [reveal, setReveal] = useState(false);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Backspace") setVal((v) => { const n = v.slice(0, -1); onText?.(n); return n; });
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && val.length < 32) setVal((v) => { const n = v + e.key; onText?.(n); return n; });
    else return;
    e.preventDefault();
  };
  return (
    <Box layer={label} dir="col" fill gap={6}>
      <Txt size={13} weight={500} color={MUTE}>{label}</Txt>
      <Box layer={`${label} input`} dir="row" fill align="center" gap={10} pad="0 14px" h={48} radius={14} bg={PAPER} border={`1px solid ${invalid ? CORAL : LINE}`}>
        {secret ? (
          <Box layer="Secret" dir="row" align="center" gap={6} style={{ flex: 1, alignSelf: "stretch", cursor: "text" }} ui={{ tabIndex: 0, role: "textbox", "aria-label": label, onKeyDown: onKey, onClick: (e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).focus(); } }}>
            {val === "" ? <Txt size={15} weight={400} color={MUTE}>{placeholder}</Txt> : reveal ? <Txt size={15} weight={500}>{val}</Txt> : Array.from({ length: val.length }, (_, i) => <Box key={i} layer="Dot" w={7} h={7} radius={4} bg={INK} />)}
          </Box>
        ) : (
          <Editable initial={initial} placeholder={placeholder} label={label} onText={onText} />
        )}
        {secret ? (
          <Box layer="Reveal" dir="row" align="center" ui={act(() => setReveal((v) => !v), "Show password")}>
            <Txt size={12} weight={500} color={MUTE}>{reveal ? "Hide" : "Show"}</Txt>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function SubmitBtn({ label, doneLabel, onTry }: { label: string; doneLabel: string; onTry: () => boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const later = useLater();
  const run = () => {
    if (state !== "idle" || !onTry()) return;
    setState("busy");
    later(() => { setState("done"); later(() => setState("idle"), 1400); }, 800);
  };
  return (
    <Box layer={label} dir="row" fill align="center" justify="center" gap={6} h={46} radius={999} bg={state === "done" ? GREEN : INK} ui={act(run, label)}>
      {state === "busy" ? <Spin size={14} color={PAPER} /> : state === "done" ? <Check /> : null}
      <Txt size={15} weight={500} color={PAPER}>{state === "done" ? doneLabel : state === "busy" ? "Please wait" : label}</Txt>
    </Box>
  );
}

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function FormShell({ layer, title, subtitle, children }: { layer: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box layer={layer} root fill dir="col" gap={16} pad={24} radius={22} {...CARD}>
      <Box layer="Heading" dir="col" gap={2}>
        <Txt size={20} weight={600}>{title}</Txt>
        {subtitle ? <Txt size={13} weight={400} color={MUTE}>{subtitle}</Txt> : null}
      </Box>
      {children}
    </Box>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <FormShell layer="Login form" title="Welcome back" subtitle="Log in to continue">
      <EField label="Email" placeholder="name@example.com" onText={(t) => { setEmail(t); setBad(false); }} invalid={bad} />
      <EField label="Password" placeholder="Your password" secret />
      {bad ? <Txt size={12} weight={400} color={CORAL}>Enter a valid email address.</Txt> : null}
      <SubmitBtn label="Log in" doneLabel="Welcome back" onTry={() => { const ok = validEmail(email); setBad(!ok); return ok; }} />
      <Box layer="Forgot" dir="row" fill justify="center">
        <Txt size={13} weight={500} color={MUTE}>Forgot password?</Txt>
      </Box>
    </FormShell>
  );
}

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <FormShell layer="Sign-up form" title="Create your account">
      <EField label="Name" placeholder="Alex Morgan" />
      <EField label="Email" placeholder="name@example.com" onText={(t) => { setEmail(t); setBad(false); }} invalid={bad} />
      <EField label="Password" placeholder="At least 8 characters" secret />
      {bad ? <Txt size={12} weight={400} color={CORAL}>Enter a valid email address.</Txt> : null}
      <SubmitBtn label="Create account" doneLabel="Account created" onTry={() => { const ok = validEmail(email); setBad(!ok); return ok; }} />
      <Box layer="Terms" dir="row" fill justify="center">
        <Txt size={12} weight={400} color={MUTE}>By continuing you accept the terms.</Txt>
      </Box>
    </FormShell>
  );
}

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <FormShell layer="Contact form" title="Get in touch">
      <EField label="Name" placeholder="Alex Morgan" />
      <EField label="Email" placeholder="name@example.com" onText={(t) => { setEmail(t); setBad(false); }} invalid={bad} />
      <Box layer="Message" dir="col" fill gap={6}>
        <Txt size={13} weight={500} color={MUTE}>Message</Txt>
        <Box layer="Message input" dir="col" fill h={96} pad="12px 14px" radius={14} bg={PAPER} border={`1px solid ${LINE}`}>
          <Editable placeholder="How can we help?" multiline label="Message" />
        </Box>
      </Box>
      <SubmitBtn label="Send message" doneLabel="Message sent" onTry={() => { const ok = validEmail(email); setBad(!ok); return ok; }} />
    </FormShell>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [bad, setBad] = useState(false);
  const [state, setState] = useState<"idle" | "done">("idle");
  const subscribe = () => {
    const ok = validEmail(email);
    setBad(!ok);
    if (ok) setState("done");
  };
  return (
    <FormShell layer="Newsletter" title={state === "done" ? "You are on the list" : "Stay in the loop"} subtitle={state === "done" ? "Look for one short email a month." : "One short email a month."}>
      <Box layer="Subscribe" dir="row" fill align="center" gap={8} pad={5} h={54} radius={999} bg={WASH} border={bad ? `1px solid ${CORAL}` : undefined}>
        <Box layer="Email" dir="row" align="center" pad="0 12px" style={{ flex: 1 }}>
          <Editable placeholder="name@example.com" label="Email" onText={(t) => { setEmail(t); setBad(false); }} />
        </Box>
        <Box layer="Button" dir="row" hug="both" align="center" justify="center" gap={6} pad="0 18px" h={44} radius={999} bg={state === "done" ? GREEN : INK} ui={act(subscribe, "Subscribe")}>
          {state === "done" ? <Check /> : null}
          <Txt size={14} weight={500} color={PAPER}>{state === "done" ? "Subscribed" : "Subscribe"}</Txt>
        </Box>
      </Box>
      {bad ? <Txt size={12} weight={400} color={CORAL}>Enter a valid email address.</Txt> : null}
    </FormShell>
  );
}

/* ── Sections ─────────────────────────────────────────────────── */

function Pill({ label, tone, onClick }: { label: string; tone: "solid" | "line"; onClick?: () => void }) {
  return (
    <Box layer={label} dir="row" hug="both" align="center" justify="center" pad="12px 18px" radius={999} bg={tone === "solid" ? INK : PAPER} border={tone === "line" ? "1px solid rgba(23,24,26,0.14)" : undefined} ui={act(onClick ?? (() => undefined), label)}>
      <Txt size={15} weight={500} color={tone === "solid" ? PAPER : INK}>{label}</Txt>
    </Box>
  );
}

export function Hero() {
  const [state, run] = useFlow(700, 1200);
  return (
    <Box layer="Hero" root fill dir="col" align="center" gap={18} pad="16px 0">
      <Box layer="Pill" dir="row" hug="both" align="center" pad="6px 14px" radius={999} bg={WASH}>
        <Txt size={12} weight={500} color={MUTE}>New in version 2</Txt>
      </Box>
      <Box layer="Copy" dir="col" align="center" gap={10}>
        <Txt size={34} weight={600}>Build faster, together</Txt>
        <Txt size={15} weight={400} color={MUTE}>Components your whole team can edit.</Txt>
      </Box>
      <Box layer="Actions" dir="row" align="center" gap={10}>
        <Box layer="Get started" dir="row" hug="both" align="center" justify="center" gap={6} pad="12px 18px" radius={999} bg={state === "done" ? GREEN : INK} ui={act(run, "Get started")}>
          {state === "busy" ? <Spin size={14} color={PAPER} /> : state === "done" ? <Check /> : null}
          <Txt size={15} weight={500} color={PAPER}>{state === "done" ? "You are in" : "Get started"}</Txt>
        </Box>
        <Pill label="Learn more" tone="line" />
      </Box>
    </Box>
  );
}

export function FeatureGrid() {
  const items: [string, string, string][] = [["Fast", "Paste in a click", BLUE], ["Editable", "Real auto layout", TEAL], ["Consistent", "One type system", VIOLET]];
  const [on, setOn] = useState<string | null>(null);
  return (
    <Box layer="Feature grid" root fill dir="row" align="flex-start" gap={16}>
      {items.map(([title, body, color]) => (
        <Box key={title} layer={title} dir="col" gap={10} style={{ flex: 1 }} ui={pick(() => setOn(on === title ? null : title), on === title, "option")}>
          <Box layer="Icon" w={40} h={40} radius={on === title ? 20 : 12} bg={color} style={{ transition: "border-radius 0.2s ease" }} />
          <Txt size={15} weight={600}>{title}</Txt>
          <Txt size={13} weight={400} color={on === title ? INK : MUTE} wrap>{body}</Txt>
        </Box>
      ))}
    </Box>
  );
}

export function CtaBanner() {
  const [state, run] = useFlow(600, 1300);
  return (
    <Box layer="CTA banner" root fill dir="row" align="center" justify="space-between" gap={16} pad="24px 28px" radius={24} bg={INK}>
      <Box layer="Copy" dir="col" gap={4}>
        <Txt size={20} weight={600} color={PAPER}>Ready to start?</Txt>
        <Txt size={13} weight={400} color="#C2C1BA">Free to try, no card needed.</Txt>
      </Box>
      <Box layer="Button" dir="row" hug="both" align="center" justify="center" gap={6} pad="12px 20px" radius={999} bg={PAPER} ui={act(run, "Get started")}>
        {state === "busy" ? <Spin size={14} /> : state === "done" ? <Check color={GREEN} /> : null}
        <Txt size={14} weight={600}>{state === "done" ? "Let us go" : "Get started"}</Txt>
      </Box>
    </Box>
  );
}

export function Footer() {
  const cols: [string, string[]][] = [["Product", ["Blocks", "Pricing", "Changelog"]], ["Company", ["About", "Careers", "Contact"]]];
  const [on, setOn] = useState<string | null>(null);
  return (
    <Box layer="Footer" root fill dir="col" gap={20} pad="4px 0">
      <Box layer="Columns" dir="row" fill align="flex-start" justify="space-between" gap={24}>
        <Box layer="Brand" dir="col" gap={4}>
          <Txt size={15} weight={600}>Supply</Txt>
          <Txt size={12} weight={400} color={MUTE}>Blocks for Figma</Txt>
        </Box>
        {cols.map(([title, links]) => (
          <Box key={title} layer={title} dir="col" gap={8}>
            <Txt size={12} weight={600} color={MUTE}>{title}</Txt>
            {links.map((l) => (
              <Box key={l} layer={l} dir="row" align="center" ui={act(() => setOn(l), l)}>
                <Txt size={13} weight={on === l ? 600 : 400}>{l}</Txt>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      <Txt size={12} weight={400} color={MUTE}>© 2026 Supply. All rights reserved.</Txt>
    </Box>
  );
}

export { Plus, Spin };
