import { useState } from "react";
import { Arrow, Box, Caret, Check, Chevron, CloseIcon, CORAL, GREEN, INK, LINE, MUTE, PAPER, Spin, Txt, WASH, BLUE } from "@/components/kits";
import { Editable, act, pick, useFlow, useLater } from "@/components/live-core";

const CARD = { bg: PAPER, border: "1px solid rgba(23,24,26,0.08)", shadow: true } as const;

/* ── Navigation ───────────────────────────────────────────────── */

export function Tabs() {
  const tabs: [string, string, string][] = [
    ["Overview", "A quiet card with one action.", "Radius 22. Ink #17181A. Geist throughout."],
    ["Specs", "Spacing sits on a 4px grid.", "Padding 20, gap 14, radius 22."],
    ["Type", "Geist, 15 on 22.", "Weights 400, 500, and 600."],
  ];
  const [on, setOn] = useState(0);
  return (
    <Box layer="Tabs" root fill dir="col" gap={16}>
      <Box layer="Tab list" dir="col" fill gap={0} ui={{ role: "tablist" }}>
        <Box layer="Labels" dir="row" align="center" gap={18}>
          {tabs.map(([label], i) => (
            <Box key={label} layer={label} dir="col" align="stretch" gap={6} ui={pick(() => setOn(i), i === on, "tab")}>
              <Txt size={15} weight={i === on ? 600 : 500} color={i === on ? INK : MUTE}>
                {label}
              </Txt>
              <Box layer="Indicator" fill h={2} radius={1} bg={i === on ? INK : "transparent"} />
            </Box>
          ))}
        </Box>
        <Box layer="Rule" fill h={1} bg={LINE} />
      </Box>
      <Box layer="Panel" dir="col" gap={6}>
        <Txt size={16} weight={500}>
          {tabs[on]![1]}
        </Txt>
        <Txt size={14} weight={400} color={MUTE}>
          {tabs[on]![2]}
        </Txt>
      </Box>
    </Box>
  );
}

export function Breadcrumb() {
  const crumbs = ["Supply", "Inputs", "Text field"];
  const [cur, setCur] = useState(2);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Box layer="Breadcrumb" root dir="row" hug="both" align="center" gap={8} ui={{ role: "navigation", "aria-label": "Breadcrumb" }}>
      {crumbs.map((label, i) => (
        <Box key={label} layer={label} dir="row" align="center" gap={8}>
          {i > 0 ? (
            <Txt size={15} weight={400} color="#C8C7C2">
              /
            </Txt>
          ) : null}
          <Box layer={`${label} link`} dir="row" align="center" ui={{ ...act(() => setCur(i), label), onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null) }}>
            <Txt size={15} weight={i === cur ? 600 : 500} color={i === cur || hover === i ? INK : MUTE}>
              {label}
            </Txt>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function pageWindow(cur: number, total: number): (number | "gap")[] {
  const set = new Set([1, total, cur - 1, cur, cur + 1]);
  if (cur <= 3) [1, 2, 3].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1]! > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export function Pagination() {
  const total = 8;
  const [cur, setCur] = useState(1);
  const key = (label: string, on: boolean, node: React.ReactNode, fn: () => void, disabled = false) => (
    <Box key={label} layer={label} dir="row" w={40} h={40} radius={12} align="center" justify="center" bg={on ? INK : WASH} style={{ opacity: disabled ? 0.45 : 1 }} ui={disabled ? { "aria-disabled": true } : { ...act(fn, label), "aria-current": on ? "page" : undefined }}>
      {node}
    </Box>
  );
  return (
    <Box layer="Pagination" root dir="row" hug="both" align="center" gap={8} ui={{ role: "navigation", "aria-label": "Pagination" }}>
      {key("Previous", false, <Arrow dir="left" />, () => setCur((c) => Math.max(1, c - 1)), cur === 1)}
      {pageWindow(cur, total).map((n, i) =>
        n === "gap" ? (
          <Txt key={`gap${i}`} size={14} weight={500} color={MUTE}>
            …
          </Txt>
        ) : (
          key(String(n), n === cur, <Txt size={14} weight={n === cur ? 600 : 500} color={n === cur ? PAPER : MUTE}>{String(n)}</Txt>, () => setCur(n)))
      )}
      {key("Next", false, <Arrow dir="right" />, () => setCur((c) => Math.min(total, c + 1)), cur === total)}
    </Box>
  );
}

export function Sidebar() {
  const items = ["Blocks", "Voice", "Forms", "Overlays", "Navigation", "Free"];
  const [on, setOn] = useState(0);
  return (
    <Box layer="Sidebar" root dir="col" gap={6} pad={14} radius={20} w={220} {...CARD} ui={{ role: "tablist", "aria-orientation": "vertical" }}>
      <Box layer="Label" dir="row" pad="4px 8px 8px">
        <Txt size={12} weight={600} color={MUTE}>
          Library
        </Txt>
      </Box>
      {items.map((item, i) => (
        <Box key={item} layer={item} dir="row" fill align="center" pad="8px 12px" radius={10} bg={i === on ? INK : "transparent"} ui={pick(() => setOn(i), i === on, "tab")}>
          <Txt size={14} weight={i === on ? 600 : 500} color={i === on ? PAPER : i === 5 ? MUTE : INK}>
            {item}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

export function Navbar() {
  const links = ["Blocks", "Voice", "Forms"];
  const [on, setOn] = useState(0);
  const [state, run] = useFlow(500, 1100);
  return (
    <Box layer="Navbar" root fill dir="row" align="center" justify="space-between" pad="12px 14px" radius={18} {...CARD}>
      <Box layer="Brand" dir="row" align="center" gap={8}>
        <Box layer="Mark" dir="row" w={22} h={26} radius={6} align="center" justify="center" bg={INK}>
          <Box layer="Slot" w={10} h={12} radius={2} bg={PAPER} />
        </Box>
        <Txt size={15} weight={600}>
          Supply
        </Txt>
      </Box>
      <Box layer="Links" dir="row" align="center" gap={14} ui={{ role: "tablist" }}>
        {links.map((l, i) => (
          <Box key={l} layer={l} dir="row" align="center" ui={pick(() => setOn(i), i === on, "tab")}>
            <Txt size={14} weight={i === on ? 600 : 500} color={i === on ? INK : MUTE}>
              {l}
            </Txt>
          </Box>
        ))}
      </Box>
      <Box layer="Copy" dir="row" hug="both" align="center" justify="center" gap={6} pad="8px 14px" radius={999} bg={state === "done" ? GREEN : INK} ui={act(run, "Copy")}>
        {state === "busy" ? <Spin size={12} color={PAPER} /> : state === "done" ? <Check /> : null}
        <Txt size={13} weight={600} color={PAPER}>
          {state === "done" ? "Copied" : "Copy"}
        </Txt>
      </Box>
    </Box>
  );
}

export function BottomTabs() {
  const tabs = ["Home", "Search", "Saved", "Profile"];
  const [on, setOn] = useState(0);
  return (
    <Box layer="Bottom tabs" root fill dir="row" align="center" justify="space-between" pad="10px 12px" radius={26} gap={0} {...CARD} ui={{ role: "tablist" }}>
      {tabs.map((tab, i) => (
        <Box key={tab} layer={tab} dir="col" align="center" gap={4} pad="4px 12px" style={{ flex: 1 }} ui={pick(() => setOn(i), i === on, "tab")}>
          <Box layer="Icon" dir="row" w={26} h={26} radius={13} bg={i === on ? INK : WASH} align="center" justify="center" style={{ transition: "background-color 0.16s ease" }} />
          <Txt size={11} weight={i === on ? 600 : 500} color={i === on ? INK : MUTE}>
            {tab}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

export function FilterChips() {
  const chips = ["All", "Design", "Code", "Voice", "Data"];
  const [on, setOn] = useState<string[]>(["All"]);
  const toggle = (c: string) =>
    setOn((cur) => {
      if (c === "All") return ["All"];
      const next = cur.filter((x) => x !== "All");
      const has = next.includes(c);
      const out = has ? next.filter((x) => x !== c) : [...next, c];
      return out.length ? out : ["All"];
    });
  return (
    <Box layer="Filter chips" root dir="row" hug="both" align="center" gap={8}>
      {chips.map((chip) => {
        const sel = on.includes(chip);
        return (
          <Box key={chip} layer={chip} dir="row" hug="both" align="center" pad="8px 14px" radius={999} bg={sel ? INK : PAPER} border={sel ? undefined : `1px solid ${LINE}`} ui={pick(() => toggle(chip), sel, "checkbox")}>
            <Txt size={13} weight={500} color={sel ? PAPER : INK}>
              {chip}
            </Txt>
          </Box>
        );
      })}
    </Box>
  );
}

/* ── Overlays ─────────────────────────────────────────────────── */

function Reopen({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Box layer={label} dir="row" hug="both" align="center" justify="center" pad="10px 18px" radius={999} bg={WASH} ui={act(onClick, label)}>
      <Txt size={14} weight={600}>
        {label}
      </Txt>
    </Box>
  );
}

export function Alert() {
  const [open, setOpen] = useState(true);
  const [retry, run] = useFlow(900, 1200);
  if (!open) {
    return (
      <Box layer="Alert" root dir="row" hug="both" align="center">
        <Reopen label="Show alert" onClick={() => setOpen(true)} />
      </Box>
    );
  }
  return (
    <Box layer="Alert" root fill dir="row" align="center" gap={12} pad={16} radius={18} {...CARD} ui={{ role: "alert" }}>
      <Box layer="Accent" w={4} h={48} radius={2} bg={retry === "done" ? GREEN : CORAL} />
      <Box layer="Copy" dir="col" gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} weight={600}>
          {retry === "done" ? "Payment received" : "Payment declined"}
        </Txt>
        <Txt size={13} weight={400} color={MUTE}>
          {retry === "done" ? "Thanks, you are all set." : "Try another card, or copy a free block."}
        </Txt>
      </Box>
      <Box layer="Retry" dir="row" hug="both" align="center" justify="center" gap={6} pad="6px 12px" radius={999} bg={WASH} ui={act(run, "Retry")}>
        {retry === "busy" ? <Spin size={12} /> : null}
        <Txt size={13} weight={600}>
          {retry === "busy" ? "Retrying" : retry === "done" ? "Done" : "Retry"}
        </Txt>
      </Box>
      <Box layer="Close" dir="row" align="center" ui={act(() => setOpen(false), "Dismiss")}>
        <CloseIcon />
      </Box>
    </Box>
  );
}

export function Toast() {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <Box layer="Toast" root dir="row" hug="both" align="center">
        <Reopen label="Show toast" onClick={() => setOpen(true)} />
      </Box>
    );
  }
  return (
    <Box layer="Toast" root dir="row" hug="both" align="center" gap={12} pad="12px 16px" radius={999} {...CARD} ui={{ ...act(() => setOpen(false), "Dismiss toast"), role: "status" }}>
      <Box layer="Mark" dir="row" w={28} h={28} radius={14} align="center" justify="center" bg="#E7F6F2">
        <Check color={GREEN} />
      </Box>
      <Box layer="Copy" dir="col" gap={0}>
        <Txt size={14} weight={600}>
          Ready for Figma
        </Txt>
        <Txt size={12} weight={400} color={MUTE}>
          Click to dismiss
        </Txt>
      </Box>
    </Box>
  );
}

export function Tooltip() {
  const [tip, setTip] = useState(true);
  return (
    <Box layer="Tooltip" root dir="col" hug="both" align="center" gap={10}>
      <Box layer="Tip stack" dir="col" hug="both" align="center" style={{ visibility: tip ? "visible" : "hidden" }}>
        <Box layer="Tip" dir="row" hug="both" align="center" justify="center" pad="12px 14px" radius={12} bg={INK}>
          <Txt size={13} weight={500} color={PAPER}>
            Sends the frame
          </Txt>
        </Box>
        <Caret />
      </Box>
      <Box layer="Publish" dir="row" hug="both" align="center" justify="center" pad="10px 18px" radius={999} bg={WASH} ui={{ ...act(() => undefined, "Publish"), onMouseEnter: () => setTip(true), onMouseLeave: () => setTip(false), onFocus: () => setTip(true), onBlur: () => setTip(false), "aria-describedby": undefined }}>
        <Txt size={14} weight={600}>
          Publish
        </Txt>
      </Box>
    </Box>
  );
}

export function Dropdown() {
  const items: [string, string, number][] = [
    ["Duplicate", "Duplicated", 500],
    ["Copy for Figma", "Copied", 600],
    ["Bring forward", "Moved forward", 500],
  ];
  const [open, setOpen] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const later = useLater();
  const choose = (msg: string) => {
    setDone(msg);
    setOpen(false);
    later(() => setDone(null), 1400);
  };
  return (
    <Box layer="Dropdown" root dir="col" hug="x" align="flex-start" gap={8} ui={{ onKeyDown: (e) => { if (e.key === "Escape") setOpen(false); } }}>
      <Box layer="Trigger" dir="row" hug="both" align="center" gap={8} pad="10px 14px" radius={999} bg={done ? GREEN : INK} ui={{ ...act(() => setOpen((v) => !v), "Actions"), "aria-expanded": open, "aria-haspopup": "menu" }}>
        {done ? <Check /> : null}
        <Txt size={14} weight={500} color={PAPER}>
          {done ?? "Actions"}
        </Txt>
        {done ? null : (
          <Box layer="Chevron" dir="row" align="center" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.18s ease" }}>
            <Chevron color={PAPER} />
          </Box>
        )}
      </Box>
      {open ? (
        <Box layer="Menu" dir="col" w={220} gap={2} pad={8} radius={16} {...CARD} ui={{ role: "menu" }}>
          {items.map(([label, msg, weight]) => (
            <Box key={label} layer={label} dir="row" fill pad="8px 10px" radius={8} ui={{ ...act(() => choose(msg), label), role: "menuitem" }}>
              <Txt size={14} weight={weight} color={label === "Bring forward" ? MUTE : INK}>
                {label}
              </Txt>
            </Box>
          ))}
          <Box layer="Rule row" fill dir="row" pad="4px 8px">
            <Box layer="Rule" fill h={1} bg={LINE} />
          </Box>
          <Box layer="Delete" dir="row" fill pad="8px 10px" radius={8} ui={{ ...act(() => choose("Deleted"), "Delete"), role: "menuitem" }}>
            <Txt size={14} weight={500} color={CORAL}>
              Delete
            </Txt>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export function Dialog() {
  const [open, setOpen] = useState(true);
  const [state, run] = useFlow(600, 900);
  if (!open) {
    return (
      <Box layer="Dialog" root dir="row" hug="both" align="center">
        <Reopen label="Open dialog" onClick={() => setOpen(true)} />
      </Box>
    );
  }
  return (
    <Box layer="Dialog" root fill dir="col" gap={14} pad={20} radius={22} {...CARD} ui={{ role: "dialog", "aria-label": "Paste into Figma?", onKeyDown: (e) => { if (e.key === "Escape") setOpen(false); } }}>
      <Txt size={18} weight={600}>
        Paste into Figma?
      </Txt>
      <Box layer="Body" dir="col" gap={4}>
        <Txt size={14} weight={400} color={MUTE}>
          This block arrives as auto layout.
        </Txt>
        <Txt size={14} weight={400} color={MUTE}>
          Type is Geist. You can recolor fills.
        </Txt>
      </Box>
      <Box layer="Actions" dir="row" fill gap={10}>
        <Box layer="Not now" dir="row" align="center" justify="center" h={44} radius={999} bg={WASH} style={{ flex: 1 }} ui={act(() => setOpen(false), "Not now")}>
          <Txt size={14} weight={600}>
            Not now
          </Txt>
        </Box>
        <Box layer="Copy" dir="row" align="center" justify="center" gap={6} h={44} radius={999} bg={state === "done" ? GREEN : INK} style={{ flex: 1 }} ui={act(run, "Copy")}>
          {state === "busy" ? <Spin size={14} color={PAPER} /> : state === "done" ? <Check /> : null}
          <Txt size={14} weight={600} color={PAPER}>
            {state === "done" ? "Copied" : "Copy"}
          </Txt>
        </Box>
      </Box>
    </Box>
  );
}

export function Command() {
  const all: [string, string][] = [
    ["Primary button", "Button"],
    ["Voice button", "Voice"],
    ["Stat card", "Card"],
    ["Navbar", "Nav"],
    ["Login form", "Form"],
    ["Calendar", "Data"],
  ];
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const rows = all.filter(([n]) => n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 4);
  const at = Math.min(idx, Math.max(0, rows.length - 1));
  return (
    <Box
      layer="Command bar"
      root
      fill
      dir="col"
      gap={8}
      pad={12}
      radius={18}
      {...CARD}
      ui={{
        onKeyDown: (e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setIdx(Math.min(rows.length - 1, at + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(Math.max(0, at - 1)); }
          else if (e.key === "Enter" && rows[at]) { e.preventDefault(); setChosen(rows[at]![0]); }
        },
      }}
    >
      <Box layer="Search" dir="row" fill pad="8px 10px" h={36}>
        <Editable placeholder="Search blocks" size={15} weight={400} onText={(t) => { setQ(t); setIdx(0); setChosen(null); }} />
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      {rows.length === 0 ? (
        <Box layer="No results" dir="row" fill pad="8px 10px">
          <Txt size={14} weight={400} color={MUTE}>
            No blocks match
          </Txt>
        </Box>
      ) : (
        rows.map(([name, kind], i) => (
          <Box key={name} layer={name} dir="row" fill align="center" justify="space-between" pad="8px 10px" radius={8} bg={i === at ? WASH : "transparent"} ui={{ ...pick(() => setChosen(name), i === at), onMouseEnter: () => setIdx(i) }}>
            <Txt size={14} weight={i === at ? 600 : 500}>
              {name}
            </Txt>
            {chosen === name ? <Check color={GREEN} /> : i === at ? (
              <Txt size={12} weight={500} color={MUTE}>
                {kind}
              </Txt>
            ) : null}
          </Box>
        ))
      )}
    </Box>
  );
}

function AccordionList({ layer, items, initial }: { layer: string; items: [string, string][]; initial: number | null }) {
  const [open, setOpen] = useState<number | null>(initial);
  return (
    <Box layer={layer} root fill dir="col" gap={0} pad={8} radius={18} {...CARD}>
      {items.map(([q, a], i) => (
        <Box key={q} layer={q} dir="col" fill>
          {i > 0 ? <Box layer="Rule" fill h={1} bg={LINE} /> : null}
          <Box layer="Item" dir="col" fill gap={8} pad="14px 12px">
            <Box layer="Question row" dir="row" fill align="center" justify="space-between" ui={{ ...act(() => setOpen(open === i ? null : i), q), "aria-expanded": open === i }}>
              <Txt size={15} weight={open === i ? 600 : 500}>
                {q}
              </Txt>
              <Txt size={18} weight={400} color={MUTE}>
                {open === i ? "–" : "+"}
              </Txt>
            </Box>
            {open === i ? (
              <Txt size={13} weight={400} color={MUTE} wrap>
                {a}
              </Txt>
            ) : null}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function Accordion() {
  return (
    <AccordionList
      layer="Accordion"
      initial={0}
      items={[
        ["Is the text editable?", "Yes. Figma keeps Geist as live text."],
        ["Do I need an account?", "Your first three copies need none. After that, log in; it stays free."],
        ["Can I recolor it?", "Yes. Fills are normal Figma fills."],
      ]}
    />
  );
}

export function Faq() {
  return (
    <AccordionList
      layer="FAQ"
      initial={null}
      items={[
        ["How does billing work?", "There is nothing to bill. Every block is free."],
        ["Can I cancel anytime?", "Yes. There is no plan to cancel."],
        ["Do you offer refunds?", "Nothing is charged, so there is nothing to refund."],
      ]}
    />
  );
}

export function Notification() {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <Box layer="Notification" root dir="row" hug="both" align="center">
        <Reopen label="Show notification" onClick={() => setOpen(true)} />
      </Box>
    );
  }
  return (
    <Box layer="Notification" root fill dir="row" align="flex-start" gap={12} pad={16} radius={20} {...CARD}>
      <Box layer="Icon" dir="row" w={36} h={36} radius={12} bg="#E7EEFE" align="center" justify="center">
        <Box layer="Dot" w={10} h={10} radius={5} bg={BLUE} />
      </Box>
      <Box layer="Text" dir="col" gap={2} style={{ flex: 1 }}>
        <Txt size={14} weight={600}>
          New comment on Hero
        </Txt>
        <Txt size={13} weight={400} color={MUTE} wrap>
          Jamie asked to tighten the spacing under the heading.
        </Txt>
      </Box>
      <Box layer="Dismiss" dir="row" align="center" ui={act(() => setOpen(false), "Dismiss")}>
        <CloseIcon />
      </Box>
    </Box>
  );
}
