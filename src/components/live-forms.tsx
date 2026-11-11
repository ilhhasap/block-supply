import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  Arrow, Box, Check, Chevron, CloseIcon, CORAL, Dot, Eye, Field, GREEN, Icon, INK, LINE, MUTE, PAPER, Plus, SearchIcon, Spin, Txt, WASH,
} from "@/components/kits";
import { Editable, act, pick, useFlow, useLater } from "@/components/live-core";

/* ── Buttons ──────────────────────────────────────────────────── */

function PillBtn({ label, tone, onClick }: { label: string; tone: "solid" | "line" | "ghost"; onClick: () => void }) {
  const solid = tone === "solid";
  return (
    <Box
      layer={label}
      dir="row"
      hug="both"
      align="center"
      justify="center"
      pad="12px 18px"
      radius={999}
      bg={solid ? INK : tone === "line" ? PAPER : "transparent"}
      border={tone === "line" ? "1px solid rgba(23,24,26,0.14)" : undefined}
      ui={act(onClick, label)}
    >
      <Txt size={15} weight={500} color={solid ? PAPER : tone === "ghost" ? MUTE : INK}>
        {label}
      </Txt>
    </Box>
  );
}

export function Primary() {
  const [state, run] = useFlow();
  return (
    <Box layer="Primary button" root dir="row" hug="both" align="center" justify="center" gap={10} pad="14px 22px" radius={999} bg={INK} ui={act(run, "Continue")}>
      {state === "busy" ? <Spin color={PAPER} /> : state === "done" ? <Check /> : null}
      <Txt size={16} weight={500} color={PAPER}>
        {state === "busy" ? "Working" : state === "done" ? "Done" : "Continue"}
      </Txt>
    </Box>
  );
}

export function ButtonSet() {
  const [state, save] = useFlow(700, 1200);
  const [skipped, setSkipped] = useState(false);
  return (
    <Box layer="Button set" root dir="row" hug="both" align="center" gap={10}>
      <PillBtn label={state === "busy" ? "Saving" : state === "done" ? "Saved" : "Save"} tone="solid" onClick={save} />
      <PillBtn label="Cancel" tone="line" onClick={() => setSkipped(false)} />
      <PillBtn label={skipped ? "Skipped" : "Skip"} tone="ghost" onClick={() => setSkipped((v) => !v)} />
    </Box>
  );
}

export function IconButtons() {
  const [count, setCount] = useState(0);
  const [sent, send] = useFlow(500, 900);
  const [editing, setEditing] = useState(false);
  const base = { dir: "row" as const, w: 52, h: 52, radius: 26, align: "center" as const, justify: "center" as const };
  return (
    <Box layer="Icon buttons" root dir="row" hug="both" align="center" gap={12}>
      <Box layer="Add" {...base} bg={WASH} ui={act(() => setCount((c) => c + 1), "Add")}>
        <Txt size={count > 0 ? 16 : 22} weight={count > 0 ? 600 : 400}>
          {count > 0 ? String(count) : "+"}
        </Txt>
      </Box>
      <Box layer="Send" {...base} bg={INK} ui={act(send, "Send")}>
        {sent === "busy" ? <Spin size={16} color={PAPER} /> : sent === "done" ? <Check /> : <Arrow dir="up" color={PAPER} />}
      </Box>
      <Box layer="Edit" {...base} bg={editing ? WASH : PAPER} border="1px solid rgba(23,24,26,0.12)" ui={act(() => setEditing((v) => !v), "Edit")}>
        <Icon>
          <path d="M9.2 2.6 13.4 6.8 5.6 14.6H1.4V10.4L9.2 2.6Z" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" fill={editing ? INK : "none"} />
        </Icon>
      </Box>
    </Box>
  );
}

export function SplitButton() {
  const items = ["Publish", "Schedule", "Save draft"];
  const [open, setOpen] = useState(false);
  const [pick_, setPick] = useState(0);
  const [state, run] = useFlow(700, 1100);
  return (
    <Box layer="Split button" root dir="col" hug="both" align="flex-start" gap={8}>
      <Box layer="Split" dir="row" hug="both" align="center" bg={INK} radius={999}>
        <Box layer="Publish" dir="row" align="center" justify="center" gap={8} pad="14px 18px 14px 22px" ui={act(run, items[pick_])}>
          {state === "busy" ? <Spin size={14} color={PAPER} /> : state === "done" ? <Check /> : null}
          <Txt size={15} weight={500} color={PAPER}>
            {state === "done" ? "Done" : items[pick_]}
          </Txt>
        </Box>
        <Box layer="Divider" w={1} h={22} bg="rgba(255,255,255,0.28)" />
        <Box layer="Menu" dir="row" align="center" justify="center" pad="0 16px 0 12px" h={48} ui={{ ...act(() => setOpen((v) => !v), "More options"), "aria-expanded": open }}>
          <Chevron color={PAPER} />
        </Box>
      </Box>
      {open ? (
        <Box layer="Options" dir="col" w={180} gap={2} pad={6} radius={14} bg={PAPER} border="1px solid rgba(23,24,26,0.08)" shadow>
          {items.map((item, i) => (
            <Box key={item} layer={item} dir="row" fill align="center" justify="space-between" pad="8px 10px" radius={8} bg={i === pick_ ? WASH : "transparent"} ui={pick(() => { setPick(i); setOpen(false); }, i === pick_)}>
              <Txt size={14} weight={i === pick_ ? 600 : 500}>
                {item}
              </Txt>
              {i === pick_ ? <Check color={INK} /> : null}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

export function LinkButton() {
  const [hover, setHover] = useState(false);
  return (
    <Box layer="Link button" root dir="row" hug="both" align="center" gap={6} ui={{ ...act(() => undefined, "Read the docs"), onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false), onFocus: () => setHover(true), onBlur: () => setHover(false) }}>
      <Txt size={16} weight={500}>
        Read the docs
      </Txt>
      <Box layer="Arrow" dir="row" align="center" style={{ marginLeft: hover ? 4 : 0, transition: "margin 0.18s ease" }}>
        <Arrow dir="right" />
      </Box>
    </Box>
  );
}

export function DangerButton() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const later = useLater();
  function press() {
    if (step === 0) setStep(1);
    else if (step === 1) {
      setStep(2);
      later(() => setStep(0), 1400);
    }
  }
  return (
    <Box layer="Danger buttons" root dir="row" hug="both" align="center" gap={10}>
      <Box layer="Delete" dir="row" hug="both" align="center" justify="center" pad="12px 18px" radius={999} bg={step === 2 ? "#8A8984" : CORAL} ui={act(press, "Delete")}>
        <Txt size={15} weight={500} color={PAPER}>
          {step === 0 ? "Delete" : step === 1 ? "Sure? Delete" : "Deleted"}
        </Txt>
      </Box>
      <PillBtn label="Keep" tone="line" onClick={() => setStep(0)} />
    </Box>
  );
}

export function LoadingButton() {
  const [state, run] = useFlow(1600, 1200);
  return (
    <Box layer="Loading button" root dir="row" hug="both" align="center" justify="center" gap={10} pad="14px 22px" radius={999} bg={INK} ui={act(run, "Save")}>
      {state === "busy" ? <Spin color={PAPER} /> : state === "done" ? <Check /> : null}
      <Txt size={16} weight={500} color={PAPER}>
        {state === "busy" ? "Saving" : state === "done" ? "Saved" : "Save changes"}
      </Txt>
    </Box>
  );
}

export function ButtonGroup() {
  const items = ["Left", "Center", "Right"];
  const [on, setOn] = useState(1);
  return (
    <Box layer="Button group" root dir="row" hug="both" align="center" radius={12} bg={PAPER} border={`1px solid ${LINE}`} ui={{ role: "radiogroup" }}>
      {items.map((item, i) => (
        <Box
          key={item}
          layer={item}
          dir="row"
          align="center"
          justify="center"
          pad="11px 18px"
          bg={i === on ? WASH : PAPER}
          style={{ borderLeft: i === 0 ? undefined : `1px solid ${LINE}`, borderRadius: i === 0 ? "11px 0 0 11px" : i === 2 ? "0 11px 11px 0" : 0 }}
          ui={pick(() => setOn(i), i === on, "radio")}
        >
          <Txt size={14} weight={i === on ? 600 : 500} color={i === on ? INK : MUTE}>
            {item}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

export function Fab() {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const later = useLater();
  return (
    <Box layer="Floating actions" root dir="row" hug="both" align="center" gap={12}>
      <Box layer="Add" dir="row" w={56} h={56} radius={26} bg={INK} align="center" justify="center" shadow ui={{ ...act(() => setOpen((v) => !v), "Add"), "aria-expanded": open }}>
        <Box layer="Plus" dir="row" align="center" justify="center" style={{ transform: open ? "rotate(45deg)" : undefined, transition: "transform 0.2s ease" }}>
          <Plus />
        </Box>
      </Box>
      {open ? (
        ["Photo", "File"].map((name) => (
          <Box key={name} layer={name} dir="row" hug="both" align="center" gap={8} pad="0 18px" h={56} radius={28} bg={chosen === name ? GREEN : PAPER} border={`1px solid ${LINE}`} shadow ui={act(() => { setChosen(name); later(() => { setChosen(null); setOpen(false); }, 800); }, name)}>
            {chosen === name ? <Check /> : null}
            <Txt size={15} weight={500} color={chosen === name ? PAPER : INK}>
              {name}
            </Txt>
          </Box>
        ))
      ) : (
        <Box layer="New block" dir="row" hug="both" align="center" gap={8} pad="0 20px" h={56} radius={28} bg={INK} shadow ui={act(() => setOpen(true), "New block")}>
          <Plus />
          <Txt size={15} weight={500} color={PAPER}>
            New block
          </Txt>
        </Box>
      )}
    </Box>
  );
}

/* ── Inputs ───────────────────────────────────────────────────── */

export function TextField() {
  const [text, setText] = useState("Block Supply");
  const empty = text.trim() === "";
  return (
    <Box layer="Text field" root fill dir="col" gap={8}>
      <Txt size={13} weight={500} color={MUTE}>
        Project name
      </Txt>
      <Box layer="Input" dir="row" fill align="center" gap={10} pad="0 14px" h={48} radius={14} bg={PAPER} border={`1px solid ${empty ? CORAL : LINE}`}>
        <Editable initial="Block Supply" placeholder="Name your project" onText={setText} />
      </Box>
      <Txt size={12} weight={400} color={empty ? CORAL : MUTE}>
        {empty ? "A name is required." : "Shown on the canvas and in exports."}
      </Txt>
    </Box>
  );
}

export function SearchField() {
  const [text, setText] = useState("");
  const [key, setKey] = useState(0);
  return (
    <Box layer="Search field" root fill dir="row" align="center" gap={10} pad="0 16px" h={52} radius={999} bg={WASH}>
      <SearchIcon />
      <Editable key={key} placeholder="Search components" size={15} weight={400} onText={setText} />
      {text ? (
        <Box layer="Clear" dir="row" w={24} h={24} radius={12} align="center" justify="center" ui={act(() => { setText(""); setKey((k) => k + 1); }, "Clear")}>
          <CloseIcon />
        </Box>
      ) : (
        <Txt size={12} weight={500} color="#8A8984">
          Ctrl K
        </Txt>
      )}
    </Box>
  );
}

export function Password() {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [focus, setFocus] = useState(false);
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Backspace") setValue((v) => v.slice(0, -1));
    else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && value.length < 24) setValue((v) => v + event.key);
    else return;
    event.preventDefault();
  };
  const len = value.length;
  const level = Math.min(100, Math.round((len / 12) * 100));
  return (
    <Box layer="Password" root fill dir="col" gap={8}>
      <Txt size={13} weight={500} color={MUTE}>
        Password
      </Txt>
      <Box layer="Input" dir="row" fill align="center" gap={10} pad="0 14px" h={48} radius={14} bg={PAPER} border={`1px solid ${focus ? INK : LINE}`}>
        <Box
          layer="Mask"
          dir="row"
          align="center"
          gap={8}
          style={{ flex: 1, alignSelf: "stretch", cursor: "text" }}
          ui={{ tabIndex: 0, role: "textbox", "aria-label": "Password", onKeyDown: onKey, onFocus: () => setFocus(true), onBlur: () => setFocus(false), onClick: (e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).focus(); } }}
        >
          {len === 0 ? (
            <Txt size={15} weight={400} color={MUTE}>
              Type a password
            </Txt>
          ) : reveal ? (
            <Txt size={15} weight={500}>
              {value}
            </Txt>
          ) : (
            Array.from({ length: len }, (_, i) => <Box key={i} layer="Dot" w={8} h={8} radius={4} bg={INK} />)
          )}
        </Box>
        <Box layer="Reveal" dir="row" align="center" ui={act(() => setReveal((v) => !v), reveal ? "Hide password" : "Show password")}>
          <Eye />
        </Box>
      </Box>
      <Txt size={12} weight={400} color={len >= 8 ? GREEN : MUTE}>
        {len >= 8 ? "Looks good." : "At least 8 characters"}
      </Txt>
      <Box layer="Strength" dir="row" fill h={6} radius={3} bg={WASH}>
        <Box layer="Level" h={6} radius={3} bg={len >= 8 ? GREEN : INK} style={{ width: `${level}%`, transition: "width 0.2s ease" }} />
      </Box>
    </Box>
  );
}

export function Textarea() {
  const [text, setText] = useState("Soft gray cards, black type,\nand a button that copies\nan auto-layout frame.");
  return (
    <Box layer="Textarea" root fill dir="col" gap={8}>
      <Txt size={13} weight={500} color={MUTE}>
        Description
      </Txt>
      <Box layer="Input" fill dir="col" gap={6} pad="14px 16px" h={148} radius={16} bg={PAPER} border={`1px solid ${LINE}`} justify="space-between">
        <Editable initial={"Soft gray cards, black type,\nand a button that copies\nan auto-layout frame."} placeholder="Describe the block" multiline onText={setText} />
        <Box layer="Count row" dir="row" fill justify="flex-end">
          <Txt size={12} weight={500} color={text.length > 140 ? CORAL : MUTE}>
            {String(text.length)}
          </Txt>
        </Box>
      </Box>
    </Box>
  );
}

export function Select() {
  const items = ["Canvas", "Frame", "Component"];
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("Canvas");
  return (
    <Box layer="Select" root fill dir="col" gap={8} ui={{ onKeyDown: (e) => { if (e.key === "Escape") setOpen(false); } }}>
      <Txt size={13} weight={500} color={MUTE}>
        Surface
      </Txt>
      <Box layer="Control" dir="row" fill align="center" gap={10} pad="0 14px" h={48} radius={14} bg={PAPER} border={`1px solid ${open ? INK : LINE}`} ui={{ ...act(() => setOpen((v) => !v), "Surface"), "aria-expanded": open, "aria-haspopup": "listbox" }}>
        <Box layer="Value" dir="row" align="center" style={{ flex: 1 }}>
          <Txt size={15} weight={500}>
            {value}
          </Txt>
        </Box>
        <Box layer="Chevron" dir="row" align="center" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.18s ease" }}>
          <Chevron />
        </Box>
      </Box>
      {open ? (
        <Box layer="Menu" fill dir="col" gap={2} pad={8} radius={14} bg={PAPER} border="1px solid rgba(23,24,26,0.08)" shadow ui={{ role: "listbox" }}>
          {items.map((item) => (
            <Box key={item} layer={item} dir="row" fill align="center" pad="8px 10px" radius={8} bg={item === value ? WASH : "transparent"} ui={pick(() => { setValue(item); setOpen(false); }, item === value)}>
              <Txt size={14} weight={500} color={item === value ? INK : MUTE}>
                {item}
              </Txt>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

export function Otp() {
  const [value, setValue] = useState("482");
  const [focus, setFocus] = useState(false);
  const done = value.length === 6;
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Backspace") setValue((v) => v.slice(0, -1));
    else if (/^\d$/.test(event.key) && !event.metaKey && !event.ctrlKey) setValue((v) => (v.length < 6 ? v + event.key : v));
    else return;
    event.preventDefault();
  };
  return (
    <Box
      layer="One-time code"
      root
      dir="row"
      hug="both"
      align="center"
      gap={10}
      ui={{
        tabIndex: 0,
        role: "textbox",
        "aria-label": "One-time code",
        className: "ix",
        onKeyDown: onKey,
        onFocus: () => setFocus(true),
        onBlur: () => setFocus(false),
        onPaste: (e) => {
          const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
          if (digits) {
            e.preventDefault();
            setValue(digits);
          }
        },
        onClick: (e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).focus(); },
      }}
    >
      {Array.from({ length: 6 }, (_, i) => {
        const ch = value[i] ?? "";
        const active = i === Math.min(value.length, 5) && !done;
        return (
          <Box key={i} layer={`Digit ${i + 1}`} dir="row" w={52} h={60} radius={14} align="center" justify="center" bg={PAPER} border={done ? `1.6px solid ${GREEN}` : active && focus ? `1.6px solid ${INK}` : active ? `1.6px solid ${INK}` : `1px solid ${LINE}`}>
            {ch ? (
              <Txt size={22} weight={500}>
                {ch}
              </Txt>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

export function Checklist() {
  const [done, setDone] = useState<Record<string, boolean>>({ "Copy frame": true, "Paste in Figma": true });
  const rows = ["Copy frame", "Paste in Figma", "Edit the type", "Ship the screen"];
  return (
    <Box layer="Checklist" root fill dir="col" gap={12} pad={20} radius={22} bg={PAPER} border="1px solid rgba(23,24,26,0.08)" shadow>
      {rows.map((label) => {
        const on = Boolean(done[label]);
        return (
          <Box key={label} layer={label} dir="row" fill align="center" gap={12} ui={pick(() => setDone((d) => ({ ...d, [label]: !d[label] })), on, "checkbox")}>
            <Dot on={on} label="Check" />
            <Txt size={15} weight={500} color={on ? MUTE : INK}>
              {label}
            </Txt>
          </Box>
        );
      })}
    </Box>
  );
}

export function Radios() {
  const rows = ["Weekly", "Monthly", "Never"];
  const [on, setOn] = useState(0);
  return (
    <Box layer="Radio group" root fill dir="col" gap={14} ui={{ role: "radiogroup" }}>
      {rows.map((label, i) => (
        <Box key={label} layer={label} dir="row" fill align="center" gap={12} ui={pick(() => setOn(i), i === on, "radio")}>
          <Box layer="Radio" dir="row" w={22} h={22} radius={11} align="center" justify="center" bg={PAPER} border={`1.5px solid ${i === on ? INK : LINE}`}>
            {i === on ? <Box layer="Mark" w={10} h={10} radius={5} bg={INK} /> : null}
          </Box>
          <Txt size={16} weight={500}>
            {label}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

export function Toggle() {
  const [on, setOn] = useState(true);
  return (
    <Box layer="Toggle" root fill dir="row" align="center" justify="space-between" gap={16} ui={{ ...act(() => setOn((v) => !v)), role: "switch", "aria-checked": on }}>
      <Box layer="Copy" dir="col" gap={2}>
        <Txt size={16} weight={500}>
          Editable text
        </Txt>
        <Txt size={13} weight={400} color={MUTE}>
          {on ? "Geist stays the typeface" : "Text is flattened to outlines"}
        </Txt>
      </Box>
      <Box layer="Switch" dir="row" align="center" justify={on ? "flex-end" : "flex-start"} w={64} h={36} pad={4} radius={18} bg={on ? INK : "#D7D6D2"} style={{ transition: "background-color 0.18s ease" }}>
        <Box layer="Knob" w={28} h={28} radius={14} bg={PAPER} />
      </Box>
    </Box>
  );
}

export function Slider() {
  const MAX = 48;
  const [value, setValue] = useState(28);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const set = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    setValue(Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * MAX));
  };
  const pct = (value / MAX) * 100;
  return (
    <Box layer="Slider" root fill dir="col" gap={14}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Txt size={13} weight={500} color={MUTE}>
          Radius
        </Txt>
        <Txt size={13} weight={600}>
          {String(value)}
        </Txt>
      </Box>
      <div
        ref={track}
        style={{ width: "100%", padding: "8px 0", cursor: "ew-resize", touchAction: "none" }}
        role="slider"
        tabIndex={0}
        aria-label="Radius"
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={value}
        onPointerDown={(e: PointerEvent<HTMLDivElement>) => { e.stopPropagation(); drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX); }}
        onPointerMove={(e) => { if (drag.current) set(e.clientX); }}
        onPointerUp={() => { drag.current = false; }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") setValue((v) => Math.min(MAX, v + 1));
          else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setValue((v) => Math.max(0, v - 1));
        }}
      >
        <Box layer="Track row" dir="row" fill align="center" gap={-11}>
          <Box layer="Filled" h={6} radius={3} bg={INK} style={{ width: `${pct}%` }} />
          <Box layer="Thumb" w={22} h={22} radius={11} bg={PAPER} border={`2px solid ${INK}`} />
          <Box layer="Rest" h={6} radius={3} bg={WASH} style={{ flex: 1 }} />
        </Box>
      </div>
    </Box>
  );
}

export function Segmented() {
  const items = ["Day", "Week", "Month"];
  const [on, setOn] = useState(0);
  return (
    <Box layer="Segmented control" root fill dir="row" align="center" gap={4} pad={4} radius={16} bg={WASH} ui={{ role: "tablist" }}>
      {items.map((item, i) => (
        <Box key={item} layer={item} dir="row" align="center" justify="center" pad="10px 0" radius={12} bg={i === on ? PAPER : "transparent"} shadow={i === on} style={{ flex: 1, transition: "background-color 0.16s ease" }} ui={pick(() => setOn(i), i === on, "tab")}>
          <Txt size={14} weight={i === on ? 600 : 500} color={i === on ? INK : MUTE}>
            {item}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

export function Upload() {
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const later = useLater();
  const take = (name: string) => {
    setBusy(true);
    later(() => { setBusy(false); setFile(name); }, 900);
  };
  return (
    <Box
      layer="Upload"
      root
      fill
      dir="col"
      align="center"
      justify="center"
      gap={8}
      pad="28px 16px"
      radius={20}
      bg={over ? WASH : PAPER}
      border={`1px dashed ${over ? INK : LINE}`}
      ui={{
        ...act(() => take("frame.png")),
        onDragOver: (e) => { e.preventDefault(); setOver(true); },
        onDragLeave: () => setOver(false),
        onDrop: (e) => { e.preventDefault(); e.stopPropagation(); setOver(false); const f = e.dataTransfer.files[0]; take(f ? f.name : "frame.png"); },
      }}
    >
      <Box layer="Arrow" dir="row" w={44} h={44} radius={22} align="center" justify="center" bg={file ? "#E7F6F2" : WASH}>
        {busy ? <Spin /> : file ? <Check color={GREEN} /> : <Arrow dir="up" />}
      </Box>
      <Txt size={15} weight={600}>
        {busy ? "Uploading" : file ? file : over ? "Release to upload" : "Drop a frame"}
      </Txt>
      <Txt size={13} weight={400} color={MUTE}>
        {file ? "Click to replace" : "or click to browse"}
      </Txt>
    </Box>
  );
}

export type { ReactNode };
