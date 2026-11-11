import type { CSSProperties, ReactNode } from "react";

const INK = "#17181A";
const MUTE = "#6F6E68";
const LINE = "#E6E5E2";
const WASH = "#F3F3F2";
const PAPER = "#FFFFFF";
const BLUE = "#3A6FF0";
const CORAL = "#E15B4A";
const AMBER = "#E59A3C";
const TEAL = "#3AA89A";
const VIOLET = "#7A73E0";
const GREEN = "#1F7A62";
const FONT = "Geist";

type Dir = "row" | "col";
type Hug = "both" | "x" | "y";

function Box({
  layer,
  root,
  dir = "col",
  gap = 0,
  pad = 0,
  align = "flex-start",
  justify = "flex-start",
  bg,
  radius,
  w,
  h,
  fill,
  hug,
  border,
  shadow,
  style,
  children,
}: {
  layer: string;
  root?: boolean;
  dir?: Dir;
  gap?: number;
  pad?: number | string;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  bg?: string;
  radius?: number;
  w?: number | string;
  h?: number | string;
  fill?: boolean;
  hug?: Hug;
  border?: string;
  shadow?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const growRaw = style?.flex ?? style?.flexGrow;
  const grow = typeof growRaw === "number" ? growRaw : 0;
  const widthToken = w ?? (typeof style?.width === "string" ? style.width : undefined);
  const heightToken = h ?? (typeof style?.height === "string" ? style.height : undefined);
  const axW = fill || widthToken === "100%" ? "fill" : widthToken != null ? "fixed" : "hug";
  const axH = heightToken != null && heightToken !== "100%" ? "fixed" : heightToken === "100%" ? "fill" : "hug";
  return (
    <div
      className={root ? "kit" : undefined}
      data-layer={layer}
      data-hug={hug}
      data-gap={String(gap)}
      data-ax-dir={dir}
      data-ax-w={axW}
      data-ax-h={axH}
      data-grow={grow > 0 ? String(grow) : undefined}
      style={{
        display: "flex",
        flexDirection: dir === "row" ? "row" : "column",
        gap: gap < 0 ? 0 : gap,
        padding: pad,
        alignItems: align,
        justifyContent: justify,
        alignSelf: fill && !root ? "stretch" : undefined,
        background: bg,
        borderRadius: radius,
        width: fill ? "100%" : w,
        height: h,
        border,
        boxShadow: shadow ? "0 12px 32px rgba(23,24,26,0.08)" : undefined,
        boxSizing: "border-box",
        fontFamily: FONT,
        flexShrink: 0,
        ...(gap < 0 ? { ["--ax-gap" as string]: `${gap}px` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Txt({
  children,
  size = 14,
  weight = 500,
  color = INK,
  wrap,
}: {
  children: ReactNode;
  size?: number;
  weight?: number;
  color?: string;
  wrap?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.3,
        letterSpacing: "-0.011em",
        whiteSpace: wrap ? "normal" : "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Icon({
  children,
  size = 16,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none">
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="7" cy="7" r="4.4" stroke={MUTE} strokeWidth="1.6" />
      <path d="M10.4 10.4 13 13" stroke={MUTE} strokeWidth="1.6" strokeLinecap="round" />
    </Icon>
  );
}

function Chevron({ color = MUTE }: { color?: string }) {
  return (
    <Icon size={14}>
      <path d="M4 6.2 8 10l4-3.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function Check({ color = PAPER }: { color?: string }) {
  return (
    <Icon size={14}>
      <path d="M3.2 8.2 6.3 11.2 12.6 4.8" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function Mic({ color = PAPER }: { color?: string }) {
  return (
    <Icon>
      <rect x="6" y="2" width="4" height="7" rx="2" fill={color} />
      <path d="M4.2 7.6a3.8 3.8 0 0 0 7.6 0" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 11.4V14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Icon>
  );
}

function Eye() {
  return (
    <Icon>
      <path d="M1.6 8S4.2 4.4 8 4.4 14.4 8 14.4 8 11.8 11.6 8 11.6 1.6 8 1.6 8Z" stroke={MUTE} strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.6" fill={MUTE} />
    </Icon>
  );
}

function CloseIcon() {
  return (
    <Icon>
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" stroke={MUTE} strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  );
}

function Caret() {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true">
      <path d="M1 0h12L7 8 1 0Z" fill={INK} />
    </svg>
  );
}

function Arrow({ dir, color = INK }: { dir: "left" | "right" | "up"; color?: string }) {
  const d = dir === "left" ? "M10 3.2 5.2 8 10 12.8" : dir === "right" ? "M6 3.2 10.8 8 6 12.8" : "M3.2 9.6 8 4.8l4.8 4.8";
  return (
    <Icon>
      <path d={d} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function Dot({ on, label }: { on?: boolean; label: string }) {
  return (
    <Box layer={label} dir="row" w={28} h={28} radius={14} bg={on ? INK : PAPER} align="center" justify="center" border={on ? undefined : `1.5px solid ${LINE}`}>
      {on ? <Check /> : null}
    </Box>
  );
}

function Btn({
  label,
  tone = "solid",
  hug = "both",
}: {
  label: string;
  tone?: "solid" | "line" | "ghost";
  hug?: Hug;
}) {
  const solid = tone === "solid";
  return (
    <Box
      layer={label}
      dir="row"
      hug={hug}
      align="center"
      justify="center"
      pad="12px 18px"
      radius={999}
      bg={solid ? INK : tone === "line" ? PAPER : "transparent"}
      border={tone === "line" ? `1px solid rgba(23,24,26,0.14)` : undefined}
    >
      <Txt size={15} weight={500} color={solid ? PAPER : tone === "ghost" ? MUTE : INK}>
        {label}
      </Txt>
    </Box>
  );
}

function Field({
  layer,
  children,
  h = 48,
}: {
  layer: string;
  children: ReactNode;
  h?: number;
}) {
  return (
    <Box layer={layer} dir="row" fill align="center" gap={10} pad="0 14px" h={h} radius={14} bg={PAPER} border={`1px solid ${LINE}`}>
      {children}
    </Box>
  );
}

function Card({
  layer,
  children,
  pad = 20,
  gap = 14,
  radius = 22,
  dir = "col",
  fill = true,
  w,
  align,
  justify,
}: {
  layer: string;
  children: ReactNode;
  pad?: number | string;
  gap?: number;
  radius?: number;
  dir?: Dir;
  fill?: boolean;
  w?: number | string;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
}) {
  return (
    <Box
      layer={layer}
      root
      fill={fill}
      w={w}
      dir={dir}
      gap={gap}
      pad={pad}
      radius={radius}
      bg={PAPER}
      border="1px solid rgba(23,24,26,0.08)"
      shadow
      align={align ?? (dir === "row" ? "center" : "stretch")}
      justify={justify ?? "flex-start"}
    >
      {children}
    </Box>
  );
}

function Primary() {
  return (
    <Box layer="Primary button" root dir="row" hug="both" align="center" justify="center" pad="14px 22px" radius={999} bg={INK}>
      <Txt size={16} weight={500} color={PAPER}>
        Continue
      </Txt>
    </Box>
  );
}

function ButtonSet() {
  return (
    <Box layer="Button set" root dir="row" hug="both" align="center" gap={10}>
      <Btn label="Save" />
      <Btn label="Cancel" tone="line" />
      <Btn label="Skip" tone="ghost" />
    </Box>
  );
}

function IconBtn({ label, glyph, tone }: { label: string; glyph: ReactNode; tone: "wash" | "ink" | "line" }) {
  return (
    <Box
      layer={label}
      dir="row"
      w={52}
      h={52}
      radius={26}
      align="center"
      justify="center"
      bg={tone === "ink" ? INK : tone === "wash" ? WASH : PAPER}
      border={tone === "line" ? "1px solid rgba(23,24,26,0.12)" : undefined}
    >
      {glyph}
    </Box>
  );
}

function IconButtons() {
  return (
    <Box layer="Icon buttons" root dir="row" hug="both" align="center" gap={12}>
      <IconBtn label="Add" tone="wash" glyph={<Txt size={22} weight={400}>+</Txt>} />
      <IconBtn label="Send" tone="ink" glyph={<Arrow dir="up" color={PAPER} />} />
      <IconBtn
        label="Edit"
        tone="line"
        glyph={
          <Icon>
            <path d="M9.2 2.6 13.4 6.8 5.6 14.6H1.4V10.4L9.2 2.6Z" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          </Icon>
        }
      />
    </Box>
  );
}

function SplitButton() {
  return (
    <Box layer="Split button" root dir="row" hug="both" align="center" bg={INK} radius={999}>
      <Box layer="Publish" dir="row" align="center" justify="center" pad="14px 18px 14px 22px">
        <Txt size={15} weight={500} color={PAPER}>
          Publish
        </Txt>
      </Box>
      <Box layer="Divider" w={1} h={22} bg="rgba(255,255,255,0.28)" />
      <Box layer="Menu" dir="row" align="center" justify="center" pad="0 16px 0 12px" h={48}>
        <Chevron color={PAPER} />
      </Box>
    </Box>
  );
}

function TextField() {
  return (
    <Box layer="Text field" root fill dir="col" gap={8}>
      <Txt size={13} weight={500} color={MUTE}>
        Project name
      </Txt>
      <Field layer="Input">
        <Txt size={16} weight={500}>
          Block Supply
        </Txt>
      </Field>
      <Txt size={12} weight={400} color={MUTE}>
        Shown on the canvas and in exports.
      </Txt>
    </Box>
  );
}

function SearchField() {
  return (
    <Box layer="Search field" root fill dir="row" align="center" gap={10} pad="0 16px" h={52} radius={999} bg={WASH}>
      <SearchIcon />
      <Box layer="Query" dir="row" align="center" style={{ flex: 1 }}>
        <Txt size={15} weight={400} color={MUTE}>
          Search components
        </Txt>
      </Box>
      <Txt size={12} weight={500} color="#8A8984">
        Ctrl K
      </Txt>
    </Box>
  );
}

function Password() {
  return (
    <Box layer="Password" root fill dir="col" gap={8}>
      <Txt size={13} weight={500} color={MUTE}>
        Password
      </Txt>
      <Field layer="Input">
        <Box layer="Mask" dir="row" align="center" gap={8} style={{ flex: 1 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <Box key={i} layer="Dot" w={8} h={8} radius={4} bg={INK} />
          ))}
        </Box>
        <Eye />
      </Field>
      <Txt size={12} weight={400} color={MUTE}>
        At least 8 characters
      </Txt>
      <Box layer="Strength" dir="row" fill h={6} radius={3} bg={WASH}>
        <Box layer="Level" h={6} radius={3} bg={INK} style={{ width: "66%" }} />
      </Box>
    </Box>
  );
}

function Textarea() {
  return (
    <Box layer="Textarea" root fill dir="col" gap={8}>
      <Txt size={13} weight={500} color={MUTE}>
        Description
      </Txt>
      <Box layer="Input" fill dir="col" gap={6} pad="14px 16px" h={148} radius={16} bg={PAPER} border={`1px solid ${LINE}`} justify="space-between">
        <Box layer="Copy" dir="col" gap={4}>
          <Txt size={15} weight={400}>
            Soft gray cards, black type,
          </Txt>
          <Txt size={15} weight={400}>
            and a button that copies
          </Txt>
          <Txt size={15} weight={400}>
            an auto-layout frame.
          </Txt>
        </Box>
        <Box layer="Count row" dir="row" fill justify="flex-end">
          <Txt size={12} weight={500} color={MUTE}>
            64
          </Txt>
        </Box>
      </Box>
    </Box>
  );
}

function Select() {
  return (
    <Box layer="Select" root fill dir="col" gap={8}>
      <Txt size={13} weight={500} color={MUTE}>
        Surface
      </Txt>
      <Field layer="Control">
        <Box layer="Value" dir="row" align="center" style={{ flex: 1 }}>
          <Txt size={15} weight={500}>
            Canvas
          </Txt>
        </Box>
        <Chevron />
      </Field>
      <Box layer="Menu" fill dir="col" gap={2} pad={8} radius={14} bg={PAPER} border="1px solid rgba(23,24,26,0.08)" shadow>
        {["Canvas", "Frame", "Component"].map((item, i) => (
          <Box key={item} layer={item} dir="row" fill align="center" pad="8px 10px" radius={8} bg={i === 0 ? WASH : "transparent"}>
            <Txt size={14} weight={500} color={i === 0 ? INK : MUTE}>
              {item}
            </Txt>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Otp() {
  const cells = ["4", "8", "2", "", "", ""];
  return (
    <Box layer="One-time code" root dir="row" hug="both" align="center" gap={10}>
      {cells.map((ch, i) => (
        <Box
          key={i}
          layer={`Digit ${i + 1}`}
          dir="row"
          w={52}
          h={60}
          radius={14}
          align="center"
          justify="center"
          bg={PAPER}
          border={i === 3 ? `1.6px solid ${INK}` : `1px solid ${LINE}`}
        >
          {ch ? (
            <Txt size={22} weight={500}>
              {ch}
            </Txt>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

function Checklist() {
  const rows = [
    ["Copy frame", true],
    ["Paste in Figma", true],
    ["Edit the type", false],
    ["Ship the screen", false],
  ] as const;
  return (
    <Card layer="Checklist" gap={12}>
      {rows.map(([label, on]) => (
        <Box key={label} layer={label} dir="row" fill align="center" gap={12}>
          <Dot on={on} label="Check" />
          <Txt size={15} weight={500} color={on ? MUTE : INK}>
            {label}
          </Txt>
        </Box>
      ))}
    </Card>
  );
}

function Radios() {
  const rows = ["Weekly", "Monthly", "Never"];
  return (
    <Box layer="Radio group" root fill dir="col" gap={14}>
      {rows.map((label, i) => (
        <Box key={label} layer={label} dir="row" fill align="center" gap={12}>
          <Box layer="Radio" dir="row" w={22} h={22} radius={11} align="center" justify="center" bg={PAPER} border={`1.5px solid ${i === 0 ? INK : LINE}`}>
            {i === 0 ? <Box layer="Mark" w={10} h={10} radius={5} bg={INK} /> : null}
          </Box>
          <Txt size={16} weight={500}>
            {label}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

function Toggle() {
  return (
    <Box layer="Toggle" root fill dir="row" align="center" justify="space-between" gap={16}>
      <Box layer="Copy" dir="col" gap={2}>
        <Txt size={16} weight={500}>
          Editable text
        </Txt>
        <Txt size={13} weight={400} color={MUTE}>
          Geist stays the typeface
        </Txt>
      </Box>
      <Box layer="Switch" dir="row" align="center" justify="flex-end" w={64} h={36} pad={4} radius={18} bg={INK}>
        <Box layer="Knob" w={28} h={28} radius={14} bg={PAPER} />
      </Box>
    </Box>
  );
}

function Slider() {
  return (
    <Box layer="Slider" root fill dir="col" gap={14}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Txt size={13} weight={500} color={MUTE}>
          Radius
        </Txt>
        <Txt size={13} weight={600}>
          28
        </Txt>
      </Box>
      <Box layer="Track row" dir="row" fill align="center" gap={-11}>
        <Box layer="Filled" h={6} radius={3} bg={INK} style={{ width: "58%" }} />
        <Box layer="Thumb" w={22} h={22} radius={11} bg={PAPER} border={`2px solid ${INK}`} />
        <Box layer="Rest" h={6} radius={3} bg={WASH} style={{ flex: 1 }} />
      </Box>
    </Box>
  );
}

function Segmented() {
  const items = ["Day", "Week", "Month"];
  return (
    <Box layer="Segmented control" root fill dir="row" align="center" gap={4} pad={4} radius={16} bg={WASH}>
      {items.map((item, i) => (
        <Box key={item} layer={item} dir="row" align="center" justify="center" pad="10px 0" radius={12} bg={i === 0 ? PAPER : "transparent"} shadow={i === 0} style={{ flex: 1 }}>
          <Txt size={14} weight={i === 0 ? 600 : 500} color={i === 0 ? INK : MUTE}>
            {item}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

function Profile() {
  return (
    <Card layer="Profile card" gap={16}>
      <Box layer="Identity" dir="row" fill align="center" gap={12}>
        <Box layer="Avatar" dir="row" w={56} h={56} radius={28} align="center" justify="center" bg={INK}>
          <Txt size={14} weight={600} color={PAPER}>
            AM
          </Txt>
        </Box>
        <Box layer="Name" dir="col" gap={2}>
          <Txt size={16} weight={600}>
            Alex Morgan
          </Txt>
          <Txt size={13} weight={400} color={MUTE}>
            Product design
          </Txt>
        </Box>
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      <Box layer="Stats" dir="row" fill gap={18}>
        {[
          ["128", "Copies"],
          ["46", "Blocks"],
          ["Free", "Plan"],
        ].map(([n, k]) => (
          <Box key={k} layer={k} dir="col" gap={2}>
            <Txt size={16} weight={600}>
              {n}
            </Txt>
            <Txt size={12} weight={400} color={MUTE}>
              {k}
            </Txt>
          </Box>
        ))}
      </Box>
      <Box layer="Follow" dir="row" fill align="center" justify="center" h={40} radius={999} bg={INK}>
        <Txt size={14} weight={500} color={PAPER}>
          Follow
        </Txt>
      </Box>
    </Card>
  );
}

function Stat() {
  const bars = [40, 70, 52, 88, 36, 64, 48, 92, 44, 76, 58, 84, 30, 68, 50, 96];
  const colors = [BLUE, VIOLET, AMBER, BLUE, CORAL, VIOLET, AMBER, BLUE, CORAL, VIOLET, AMBER, BLUE, CORAL, VIOLET, AMBER, TEAL];
  return (
    <Card layer="Stat card" gap={16}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Box layer="Title" dir="col" gap={2}>
          <Txt size={14} weight={600}>
            Copies
          </Txt>
          <Txt size={12} weight={400} color={MUTE}>
            Last 20 days
          </Txt>
        </Box>
        <Box layer="Range" dir="row" align="center" pad={3} radius={999} bg={WASH}>
          <Box layer="Day" dir="row" align="center" justify="center" pad="4px 10px" radius={999} bg={PAPER}>
            <Txt size={12} weight={600}>
              Day
            </Txt>
          </Box>
          <Box layer="Week" dir="row" align="center" justify="center" pad="4px 10px">
            <Txt size={12} weight={500} color={MUTE}>
              Week
            </Txt>
          </Box>
        </Box>
      </Box>
      <Box layer="Figure" dir="row" align="flex-end" gap={8}>
        <Txt size={32} weight={600}>
          12,480
        </Txt>
        <Txt size={14} weight={400} color={MUTE}>
          pastes
        </Txt>
      </Box>
      <Box layer="Bars" dir="row" fill align="flex-end" gap={6} h={96}>
        {bars.map((height, i) => (
          <Box key={i} layer={`Bar ${i + 1}`} w={8} h={height} radius={3} bg={colors[i]} style={{ flex: 1 }} />
        ))}
      </Box>
    </Card>
  );
}

function FreePlan() {
  return (
    <Card layer="Free plan" gap={12}>
      <Txt size={13} weight={500} color={MUTE}>
        Supply
      </Txt>
      <Box layer="Price" dir="row" align="flex-end" gap={8}>
        <Txt size={40} weight={600}>
          $0
        </Txt>
        <Txt size={14} weight={400} color={MUTE}>
          forever
        </Txt>
      </Box>
      <Box layer="Points" dir="col" gap={6}>
        <Txt size={13} weight={400}>
          Every block, auto layout included
        </Txt>
        <Txt size={13} weight={400}>
          Paste into Figma, type stays Geist
        </Txt>
        <Txt size={13} weight={400}>
          No account and no limits
        </Txt>
      </Box>
      <Box layer="Copy this card" dir="row" fill align="center" justify="center" h={44} radius={999} bg={INK}>
        <Txt size={14} weight={500} color={PAPER}>
          Copy this card
        </Txt>
      </Box>
    </Card>
  );
}

function Badges() {
  const items = [
    ["Free", INK, PAPER],
    ["Ready", "#E7F6F2", GREEN],
    ["Edited", "#FDECEC", CORAL],
    ["Vector", WASH, INK],
  ] as const;
  return (
    <Box layer="Badges" root dir="row" hug="both" align="center" gap={8}>
      {items.map(([label, bg, color]) => (
        <Box key={label} layer={label} dir="row" hug="both" align="center" justify="center" pad="6px 12px" radius={999} bg={bg}>
          <Txt size={13} weight={600} color={color}>
            {label}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

function Avatars() {
  const people = [
    ["A", INK, PAPER],
    ["M", "#3A3A38", PAPER],
    ["K", "#8E8D88", PAPER],
    ["+8", PAPER, INK],
  ] as const;
  return (
    <Box layer="Avatar group" root dir="row" hug="both" align="center" gap={12}>
      <Box layer="Faces" dir="row" hug="both" align="center" gap={-12}>
        {people.map(([label, bg, color]) => (
          <Box key={label} layer={label} dir="row" w={52} h={52} radius={26} align="center" justify="center" bg={bg} border="3px solid #F0F0EF">
            <Txt size={label === "+8" ? 13 : 16} weight={600} color={color}>
              {label}
            </Txt>
          </Box>
        ))}
      </Box>
      <Txt size={14} weight={500} color={MUTE}>
        Designers
      </Txt>
    </Box>
  );
}

function Orb() {
  return (
    <Box layer="Orb" root dir="col" hug="both" align="center" gap={16}>
      <Box
        layer="Sphere"
        dir="row"
        w={148}
        h={148}
        radius={74}
        align="center"
        justify="center"
        style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #C9C8C4 42%, #17181A 100%)" }}
      >
        <Box layer="Highlight" w={36} h={36} radius={18} bg="rgba(255,255,255,0.55)" />
      </Box>
      <Txt size={13} weight={500} color={MUTE}>
        Listening
      </Txt>
    </Box>
  );
}

function VoiceButton() {
  return (
    <Box layer="Voice button" root dir="col" hug="both" align="center" gap={14}>
      <Box layer="Mic" dir="row" w={92} h={92} radius={46} align="center" justify="center" bg={INK} border="10px solid rgba(23,24,26,0.08)">
        <Mic />
      </Box>
      <Txt size={14} weight={500}>
        Tap to talk
      </Txt>
    </Box>
  );
}

function Waveform() {
  const bars = [18, 36, 22, 58, 30, 70, 26, 84, 40, 64, 28, 76, 34, 90, 24, 48];
  return (
    <Box layer="Live waveform" root fill dir="row" align="center" justify="center" gap={8} h={120}>
      {bars.map((height, i) => (
        <Box key={i} layer={`Bar ${i + 1}`} w={8} h={height} radius={4} bg={i % 5 === 0 ? INK : "#B9B8B3"} />
      ))}
    </Box>
  );
}

function Player() {
  return (
    <Card layer="Audio player" dir="row" gap={14} pad={16} radius={20}>
      <Box layer="Cover" dir="row" w={84} h={84} radius={14} align="center" justify="center" bg={INK}>
        <Txt size={16} weight={600} color={PAPER}>
          BS
        </Txt>
      </Box>
      <Box layer="Meta" dir="col" gap={8} style={{ flex: 1, minWidth: 0 }}>
        <Box layer="Titles" dir="col" gap={2}>
          <Txt size={16} weight={600}>
            Supply notes
          </Txt>
          <Txt size={13} weight={400} color={MUTE}>
            Side A · voice
          </Txt>
        </Box>
        <Box layer="Track" dir="row" fill h={4} radius={2} bg={WASH}>
          <Box layer="Played" h={4} radius={2} bg={INK} style={{ width: "42%" }} />
        </Box>
        <Box layer="Times" dir="row" fill justify="space-between">
          <Txt size={11} weight={500} color={MUTE}>
            1:12
          </Txt>
          <Txt size={11} weight={500} color={MUTE}>
            3:40
          </Txt>
        </Box>
      </Box>
    </Card>
  );
}

function Bubble({
  layer,
  bg,
  color,
  lines,
  align,
}: {
  layer: string;
  bg: string;
  color: string;
  lines: string[];
  align: "flex-start" | "flex-end";
}) {
  return (
    <Box layer="Row" dir="row" fill justify={align}>
      <Box layer={layer} dir="col" gap={2} pad="12px 14px" radius={18} bg={bg} hug="x">
        {lines.map((line) => (
          <Txt key={line} size={14} weight={500} color={color}>
            {line}
          </Txt>
        ))}
      </Box>
    </Box>
  );
}

function Conversation() {
  return (
    <Box layer="Conversation" root fill dir="col" gap={10}>
      <Bubble layer="Ask" bg={WASH} color={INK} align="flex-start" lines={["Paste this into Figma?", "Keep the text editable."]} />
      <Bubble layer="Reply" bg={INK} color={PAPER} align="flex-end" lines={["Yes. Auto layout and Geist", "both stay live after paste."]} />
      <Bubble layer="Next" bg={WASH} color={INK} align="flex-start" lines={["Copy the next block."]} />
    </Box>
  );
}

function MicSelect() {
  return (
    <Card layer="Mic selector" dir="row" align="center" gap={12} pad="14px 16px" radius={18}>
      <Box layer="Live" w={10} h={10} radius={5} bg={TEAL} />
      <Box layer="Copy" dir="col" gap={2} style={{ flex: 1 }}>
        <Txt size={12} weight={500} color={MUTE}>
          Microphone
        </Txt>
        <Txt size={15} weight={600}>
          Studio display
        </Txt>
      </Box>
      <Chevron />
    </Card>
  );
}

function Speech() {
  return (
    <Box layer="Speech input" root fill dir="row" align="center" gap={12} pad="0 8px 0 18px" h={64} radius={999} bg={PAPER} border={`1px solid ${LINE}`} shadow>
      <Box layer="Prompt" dir="row" align="center" style={{ flex: 1 }}>
        <Txt size={15} weight={400} color={MUTE}>
          Ask for a pricing card…
        </Txt>
      </Box>
      <Box layer="Talk" dir="row" w={40} h={40} radius={20} align="center" justify="center" bg={INK}>
        <Mic />
      </Box>
    </Box>
  );
}

function Shimmer() {
  return (
    <Box layer="Shimmer text" root dir="row" hug="both" align="center" justify="center">
      <Txt size={28} weight={600}>
        Drafting a reply
      </Txt>
    </Box>
  );
}

function Scrub() {
  return (
    <Box layer="Scrub bar" root fill dir="row" align="center" gap={12}>
      <Txt size={12} weight={500} color={MUTE}>
        0:42
      </Txt>
      <Box layer="Track" dir="row" align="center" gap={-8} style={{ flex: 1 }}>
        <Box layer="Played" h={6} radius={3} bg={INK} style={{ width: "38%" }} />
        <Box layer="Knob" w={16} h={16} radius={8} bg={INK} />
        <Box layer="Rest" h={6} radius={3} bg={WASH} style={{ flex: 1 }} />
      </Box>
      <Txt size={12} weight={500} color={MUTE}>
        2:18
      </Txt>
    </Box>
  );
}

function Alert() {
  return (
    <Card layer="Alert" dir="row" align="center" gap={12} pad={16} radius={18}>
      <Box layer="Accent" w={4} h={48} radius={2} bg={CORAL} />
      <Box layer="Copy" dir="col" gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} weight={600}>
          Payment declined
        </Txt>
        <Txt size={13} weight={400} color={MUTE}>
          Try another card, or copy a free block.
        </Txt>
      </Box>
      <Box layer="Retry" dir="row" hug="both" align="center" justify="center" pad="6px 12px" radius={999} bg={WASH}>
        <Txt size={13} weight={600}>
          Retry
        </Txt>
      </Box>
      <CloseIcon />
    </Card>
  );
}

function Toast() {
  return (
    <Card layer="Toast" dir="row" align="center" gap={12} pad="12px 16px" radius={999}>
      <Box layer="Mark" dir="row" w={28} h={28} radius={14} align="center" justify="center" bg="#E7F6F2">
        <Check color={GREEN} />
      </Box>
      <Box layer="Copy" dir="col" gap={0}>
        <Txt size={14} weight={600}>
          Ready for Figma
        </Txt>
        <Txt size={12} weight={400} color={MUTE}>
          Paste on the canvas
        </Txt>
      </Box>
    </Card>
  );
}

function Tooltip() {
  return (
    <Box layer="Tooltip" root dir="col" hug="both" align="center" gap={10}>
      <Box layer="Tip stack" dir="col" hug="both" align="center">
        <Box layer="Tip" dir="row" hug="both" align="center" justify="center" pad="12px 14px" radius={12} bg={INK}>
          <Txt size={13} weight={500} color={PAPER}>
            Sends the frame
          </Txt>
        </Box>
        <Caret />
      </Box>
      <Box layer="Publish" dir="row" hug="both" align="center" justify="center" pad="10px 18px" radius={999} bg={WASH}>
        <Txt size={14} weight={600}>
          Publish
        </Txt>
      </Box>
    </Box>
  );
}

function Dropdown() {
  return (
    <Box layer="Dropdown" root dir="col" hug="x" align="flex-start" gap={8}>
      <Box layer="Trigger" dir="row" hug="both" align="center" gap={8} pad="10px 14px" radius={999} bg={INK}>
        <Txt size={14} weight={500} color={PAPER}>
          Actions
        </Txt>
        <Chevron color={PAPER} />
      </Box>
      <Box layer="Menu" dir="col" w={220} gap={2} pad={8} radius={16} bg={PAPER} border="1px solid rgba(23,24,26,0.08)" shadow>
        {[
          ["Duplicate", INK, 500],
          ["Copy for Figma", INK, 600],
          ["Bring forward", MUTE, 500],
        ].map(([label, color, weight]) => (
          <Box key={String(label)} layer={String(label)} dir="row" fill pad="8px 10px">
            <Txt size={14} weight={Number(weight)} color={String(color)}>
              {label}
            </Txt>
          </Box>
        ))}
        <Box layer="Rule row" fill dir="row" pad="4px 8px">
          <Box layer="Rule" fill h={1} bg={LINE} />
        </Box>
        <Box layer="Delete" dir="row" fill pad="8px 10px">
          <Txt size={14} weight={500} color={CORAL}>
            Delete
          </Txt>
        </Box>
      </Box>
    </Box>
  );
}

function Dialog() {
  return (
    <Card layer="Dialog" gap={14} radius={22}>
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
        <Box layer="Not now" dir="row" align="center" justify="center" h={44} radius={999} bg={WASH} style={{ flex: 1 }}>
          <Txt size={14} weight={600}>
            Not now
          </Txt>
        </Box>
        <Box layer="Copy" dir="row" align="center" justify="center" h={44} radius={999} bg={INK} style={{ flex: 1 }}>
          <Txt size={14} weight={600} color={PAPER}>
            Copy
          </Txt>
        </Box>
      </Box>
    </Card>
  );
}

function Command() {
  const rows = [
    ["Primary button", "Button", true],
    ["Voice button", "Voice", false],
    ["Stat card", "Card", false],
    ["Navbar", "Nav", false],
  ] as const;
  return (
    <Card layer="Command bar" gap={8} pad={12} radius={18}>
      <Box layer="Search" dir="row" fill pad="8px 10px">
        <Txt size={15} weight={400} color={MUTE}>
          Search blocks
        </Txt>
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      {rows.map(([name, kind, on]) => (
        <Box key={name} layer={name} dir="row" fill align="center" justify="space-between" pad="8px 10px" radius={8} bg={on ? WASH : "transparent"}>
          <Txt size={14} weight={on ? 600 : 500}>
            {name}
          </Txt>
          {on ? (
            <Txt size={12} weight={500} color={MUTE}>
              {kind}
            </Txt>
          ) : null}
        </Box>
      ))}
    </Card>
  );
}

function Navbar() {
  return (
    <Card layer="Navbar" dir="row" align="center" justify="space-between" pad="12px 14px" radius={18}>
      <Box layer="Brand" dir="row" align="center" gap={8}>
        <Box layer="Mark" dir="row" w={22} h={26} radius={6} align="center" justify="center" bg={INK}>
          <Box layer="Slot" w={10} h={12} radius={2} bg={PAPER} />
        </Box>
        <Txt size={15} weight={600}>
          Supply
        </Txt>
      </Box>
      <Box layer="Links" dir="row" align="center" gap={14}>
        <Txt size={14} weight={600}>
          Blocks
        </Txt>
        <Txt size={14} weight={500} color={MUTE}>
          Voice
        </Txt>
        <Txt size={14} weight={500} color={MUTE}>
          Forms
        </Txt>
      </Box>
      <Box layer="Copy" dir="row" hug="both" align="center" justify="center" pad="8px 14px" radius={999} bg={INK}>
        <Txt size={13} weight={600} color={PAPER}>
          Copy
        </Txt>
      </Box>
    </Card>
  );
}

function Tabs() {
  const tabs = [
    ["Overview", true],
    ["Specs", false],
    ["Type", false],
  ] as const;
  return (
    <Box layer="Tabs" root fill dir="col" gap={16}>
      <Box layer="Tab list" dir="col" fill gap={8}>
        <Box layer="Labels" dir="row" align="center" gap={18}>
          {tabs.map(([label, on]) => (
            <Txt key={label} size={15} weight={on ? 600 : 500} color={on ? INK : MUTE}>
              {label}
            </Txt>
          ))}
        </Box>
        <Box layer="Rule" fill h={1} bg={LINE} />
      </Box>
      <Box layer="Panel" dir="col" gap={6}>
        <Txt size={16} weight={500}>
          A quiet card with one action.
        </Txt>
        <Txt size={14} weight={400} color={MUTE}>
          Radius 22. Ink #17181A. Geist throughout.
        </Txt>
      </Box>
    </Box>
  );
}

function Breadcrumb() {
  const bits = [
    ["Supply", MUTE, 500],
    ["/", "#C8C7C2", 400],
    ["Inputs", MUTE, 500],
    ["/", "#C8C7C2", 400],
    ["Text field", INK, 600],
  ] as const;
  return (
    <Box layer="Breadcrumb" root dir="row" hug="both" align="center" gap={8}>
      {bits.map(([label, color, weight], i) => (
        <Txt key={i} size={15} weight={weight} color={color}>
          {label}
        </Txt>
      ))}
    </Box>
  );
}

function PageKey({ label, on, icon }: { label: string; on?: boolean; icon?: ReactNode }) {
  return (
    <Box layer={label} dir="row" w={40} h={40} radius={12} align="center" justify="center" bg={on ? INK : WASH}>
      {icon ?? (
        <Txt size={14} weight={on ? 600 : 500} color={on ? PAPER : MUTE}>
          {label}
        </Txt>
      )}
    </Box>
  );
}

function Pagination() {
  return (
    <Box layer="Pagination" root dir="row" hug="both" align="center" gap={8}>
      <PageKey label="Previous" icon={<Arrow dir="left" />} />
      <PageKey label="1" on />
      <PageKey label="2" />
      <PageKey label="3" />
      <Txt size={14} weight={500} color={MUTE}>
        …
      </Txt>
      <PageKey label="8" />
      <PageKey label="Next" icon={<Arrow dir="right" />} />
    </Box>
  );
}

function Sidebar() {
  const items = ["Blocks", "Voice", "Forms", "Overlays", "Navigation", "Free"];
  return (
    <Card layer="Sidebar" gap={6} pad={14} radius={20} fill={false} w={220}>
      <Box layer="Label" dir="row" pad="4px 8px 8px">
        <Txt size={12} weight={600} color={MUTE}>
          Library
        </Txt>
      </Box>
      {items.map((item, i) => (
        <Box key={item} layer={item} dir="row" fill align="center" pad="8px 12px" radius={10} bg={i === 0 ? INK : "transparent"}>
          <Txt size={14} weight={i === 0 ? 600 : 500} color={i === 0 ? PAPER : i === 5 ? MUTE : INK}>
            {item}
          </Txt>
        </Box>
      ))}
    </Card>
  );
}

function Progress() {
  return (
    <Box layer="Progress" root fill dir="col" gap={10}>
      <Box layer="Header" dir="row" fill align="center" justify="space-between">
        <Txt size={14} weight={600}>
          Exporting frame
        </Txt>
        <Txt size={14} weight={600} color={MUTE}>
          62%
        </Txt>
      </Box>
      <Box layer="Track" dir="row" fill h={8} radius={4} bg={WASH}>
        <Box layer="Filled" h={8} radius={4} bg={INK} style={{ width: "62%" }} />
      </Box>
      <Txt size={13} weight={400} color={MUTE}>
        Auto layout, then Geist text
      </Txt>
    </Box>
  );
}

function Table() {
  const rows = [
    ["Primary button", "Button", "Free"],
    ["Orb", "Voice", "Free"],
    ["Navbar", "Nav", "Free"],
    ["Stat card", "Card", "Free"],
  ];
  return (
    <Card layer="Table" gap={0} pad={8} radius={16}>
      <Box layer="Header" dir="row" fill align="center" pad="8px 10px">
        <Box layer="Block" style={{ flex: 1.4 }}>
          <Txt size={12} weight={600} color={MUTE}>
            Block
          </Txt>
        </Box>
        <Box layer="Kind" style={{ flex: 0.8 }}>
          <Txt size={12} weight={600} color={MUTE}>
            Kind
          </Txt>
        </Box>
        <Box layer="Price" style={{ width: 48 }}>
          <Txt size={12} weight={600} color={MUTE}>
            Price
          </Txt>
        </Box>
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      {rows.map(([block, kind, price]) => (
        <Box key={block} layer={block} dir="row" fill align="center" pad="10px">
          <Box layer="Name" style={{ flex: 1.4 }}>
            <Txt size={14} weight={500}>
              {block}
            </Txt>
          </Box>
          <Box layer="Kind value" style={{ flex: 0.8 }}>
            <Txt size={14} weight={400} color={MUTE}>
              {kind}
            </Txt>
          </Box>
          <Box layer="Price value" style={{ width: 48 }}>
            <Txt size={14} weight={600}>
              {price}
            </Txt>
          </Box>
        </Box>
      ))}
    </Card>
  );
}

function Stepper() {
  const steps = [
    ["1", "Copy", true],
    ["2", "Paste", true],
    ["3", "Edit", false],
  ] as const;
  return (
    <Box layer="Stepper" root fill dir="row" align="flex-start">
      {steps.map(([n, label, on], i) => (
        <Box key={n} layer={label} dir="col" align="center" gap={8} style={{ flex: 1 }}>
          <Box layer="Rail" dir="row" fill align="center">
            <Box layer="Before" h={2} radius={1} bg={i === 0 ? "transparent" : on ? INK : LINE} style={{ flex: 1 }} />
            <Box layer="Index" dir="row" w={28} h={28} radius={14} align="center" justify="center" bg={on ? INK : PAPER} border={on ? undefined : `2px solid ${LINE}`}>
              <Txt size={12} weight={600} color={on ? PAPER : MUTE}>
                {n}
              </Txt>
            </Box>
            <Box layer="After" h={2} radius={1} bg={i === steps.length - 1 ? "transparent" : INK} style={{ flex: 1 }} />
          </Box>
          <Txt size={13} weight={on ? 600 : 500} color={on ? INK : MUTE}>
            {label}
          </Txt>
        </Box>
      ))}
    </Box>
  );
}

function Accordion() {
  return (
    <Card layer="Accordion" gap={0} pad={8} radius={18}>
      <Box layer="Open" dir="col" fill gap={8} pad="12px 12px 14px">
        <Box layer="Question row" dir="row" fill align="center" justify="space-between">
          <Txt size={15} weight={600}>
            Is the text editable?
          </Txt>
          <Txt size={18} weight={400} color={MUTE}>
            –
          </Txt>
        </Box>
        <Txt size={13} weight={400} color={MUTE}>
          Yes. Figma keeps Geist as live text.
        </Txt>
      </Box>
      <Box layer="Rule" fill h={1} bg={LINE} />
      {[
        ["Do I need an account?", "+"],
        ["Can I recolor it?", "+"],
      ].map(([q, mark]) => (
        <Box key={q} layer={q} dir="row" fill align="center" justify="space-between" pad="14px 12px">
          <Txt size={15} weight={500}>
            {q}
          </Txt>
          <Txt size={18} weight={400} color={MUTE}>
            {mark}
          </Txt>
        </Box>
      ))}
    </Card>
  );
}

function Empty() {
  return (
    <Box layer="Empty state" root dir="col" hug="both" align="center" gap={10}>
      <svg width="72" height="64" viewBox="0 0 72 64" aria-hidden="true">
        <path d="M36 4 66 20v24L36 60 6 44V20L36 4Z" fill="none" stroke={INK} strokeOpacity="0.28" strokeWidth="1.4" />
        <rect x="28" y="24" width="16" height="20" rx="2" fill="none" stroke={INK} strokeOpacity="0.5" />
      </svg>
      <Txt size={16} weight={600}>
        Nothing saved yet
      </Txt>
      <Txt size={13} weight={400} color={MUTE}>
        Bookmark a block to find it later.
      </Txt>
    </Box>
  );
}

function Keycap({ children }: { children: ReactNode }) {
  return (
    <Box layer="Key" dir="row" hug="both" align="center" justify="center" pad="8px 12px" h={40} radius={10} bg={WASH} border={`1px solid ${LINE}`}>
      {children}
    </Box>
  );
}

function Keyboard() {
  return (
    <Box layer="Keyboard" root dir="row" hug="both" align="center" gap={8}>
      <Keycap>
        <Txt size={14} weight={500}>
          Cmd
        </Txt>
      </Keycap>
      <Keycap>
        <Txt size={15} weight={600}>
          K
        </Txt>
      </Keycap>
      <Txt size={14} weight={500} color={MUTE}>
        Search
      </Txt>
      <Box layer="Gap" w={12} h={1} />
      <Keycap>
        <Txt size={14} weight={500}>
          Cmd
        </Txt>
      </Keycap>
      <Keycap>
        <Txt size={15} weight={600}>
          C
        </Txt>
      </Keycap>
    </Box>
  );
}

function Upload() {
  return (
    <Box layer="Upload" root fill dir="col" align="center" justify="center" gap={8} pad="28px 16px" radius={20} bg={PAPER} border={`1px dashed ${LINE}`}>
      <Box layer="Arrow" dir="row" w={44} h={44} radius={22} align="center" justify="center" bg={WASH}>
        <Arrow dir="up" />
      </Box>
      <Txt size={15} weight={600}>
        Drop a frame
      </Txt>
      <Txt size={13} weight={400} color={MUTE}>
        or paste from the clipboard
      </Txt>
    </Box>
  );
}

function Bone({ w, h = 12 }: { w: number | string; h?: number }) {
  return <Box layer="Bone" w={w} h={h} radius={h} bg={WASH} />;
}

function Skeleton() {
  return (
    <Box layer="Skeleton" root fill dir="col" gap={12}>
      <Box layer="Head" dir="row" align="center" gap={12}>
        <Box layer="Avatar" w={44} h={44} radius={22} bg={WASH} />
        <Box layer="Lines" dir="col" gap={8}>
          <Bone w={160} />
          <Bone w={110} h={10} />
        </Box>
      </Box>
      <Bone w="100%" />
      <Bone w="86%" />
      <Bone w="64%" />
    </Box>
  );
}

function Notice() {
  return (
    <Box layer="Inline notice" root fill dir="row" align="center" gap={10} pad="12px 14px" radius={16} bg="#F4F7FF">
      <Box layer="Info" dir="row" w={20} h={20} radius={10} align="center" justify="center" bg={BLUE}>
        <Txt size={12} weight={700} color={PAPER}>
          i
        </Txt>
      </Box>
      <Box layer="Copy" dir="col" gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Txt size={14} weight={600}>
          Free for client work
        </Txt>
        <Txt size={12} weight={400} color={MUTE}>
          Use the blocks anywhere. Don’t resell the set as-is.
        </Txt>
      </Box>
    </Box>
  );
}

const VIEWS: Record<string, () => ReactNode> = {
  "primary-button": Primary,
  "button-set": ButtonSet,
  "icon-buttons": IconButtons,
  "split-button": SplitButton,
  "text-field": TextField,
  "search-field": SearchField,
  password: Password,
  textarea: Textarea,
  select: Select,
  otp: Otp,
  checklist: Checklist,
  radios: Radios,
  toggle: Toggle,
  slider: Slider,
  segmented: Segmented,
  profile: Profile,
  stat: Stat,
  "free-plan": FreePlan,
  badges: Badges,
  avatars: Avatars,
  orb: Orb,
  "voice-button": VoiceButton,
  waveform: Waveform,
  player: Player,
  conversation: Conversation,
  mic: MicSelect,
  speech: Speech,
  shimmer: Shimmer,
  scrub: Scrub,
  alert: Alert,
  toast: Toast,
  tooltip: Tooltip,
  dropdown: Dropdown,
  dialog: Dialog,
  command: Command,
  navbar: Navbar,
  tabs: Tabs,
  breadcrumb: Breadcrumb,
  pagination: Pagination,
  sidebar: Sidebar,
  progress: Progress,
  table: Table,
  stepper: Stepper,
  accordion: Accordion,
  empty: Empty,
  keyboard: Keyboard,
  upload: Upload,
  skeleton: Skeleton,
  notice: Notice,
};

export function BlockView({ id }: { id: string }) {
  const View = VIEWS[id];
  return View ? <View /> : null;
}
