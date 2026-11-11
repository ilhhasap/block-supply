import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { INK, MUTE, Box, Txt } from "@/components/kits";

/** Props that make a block element a keyboard- and pointer-operable control. */
export function act(fn: () => void, label?: string): HTMLAttributes<HTMLDivElement> {
  return {
    className: "ix",
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    onClick: (event) => {
      event.stopPropagation();
      fn();
    },
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fn();
      }
    },
  };
}

/** Like `act` for elements that are selectable options. */
export function pick(fn: () => void, selected: boolean, role: "tab" | "radio" | "option" | "checkbox" = "option"): HTMLAttributes<HTMLDivElement> {
  return { ...act(fn), role, "aria-selected": role === "tab" || role === "option" ? selected : undefined, "aria-checked": role === "radio" || role === "checkbox" ? selected : undefined } as HTMLAttributes<HTMLDivElement>;
}

/** Run `fn` after `ms`, cancelling on unmount or when `deps` change. */
export function useLater() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => ids.current.forEach((id) => window.clearTimeout(id)), []);
  return (fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms));
  };
}

/** Single-source-of-truth selection state. */
export function useChoice<T>(initial: T) {
  return useState<T>(initial);
}

/**
 * Editable text that stays a plain text node in the DOM, so "Copy to Figma"
 * copies exactly what the visitor typed. The placeholder is a real element that
 * shows only while empty.
 */
export function Editable({
  initial = "",
  placeholder,
  size = 15,
  weight = 500,
  color = INK,
  multiline = false,
  onText,
  label,
}: {
  initial?: string;
  placeholder: string;
  size?: number;
  weight?: number;
  color?: string;
  multiline?: boolean;
  onText?: (text: string) => void;
  label?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (ref.current) ref.current.textContent = initial;
  }, [initial]);
  const font = {
    fontFamily: "Geist",
    fontSize: size,
    fontWeight: weight,
    lineHeight: 1.3,
    letterSpacing: "-0.011em",
  } as const;
  return (
    <span
      style={{ position: "relative", display: "flex", flex: 1, minWidth: 0, alignSelf: "stretch", alignItems: multiline ? "flex-start" : "center" }}
      onClick={(event) => {
        event.stopPropagation();
        ref.current?.focus();
      }}
    >
      <span
        ref={ref}
        className="ix-edit"
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-label={label ?? placeholder}
        aria-multiline={multiline}
        onInput={(event) => {
          const next = event.currentTarget.textContent ?? "";
          setText(next);
          onText?.(next);
        }}
        onKeyDown={(event) => {
          if (!multiline && event.key === "Enter") event.preventDefault();
        }}
        style={{
          ...font,
          flex: 1,
          minWidth: 1,
          color,
          outline: "none",
          whiteSpace: multiline ? "pre-wrap" : "nowrap",
          overflow: "hidden",
          caretColor: INK,
          cursor: "text",
        }}
      />
      {text === "" ? (
        <span aria-hidden="true" style={{ ...font, position: "absolute", left: 0, top: multiline ? 0 : undefined, color: MUTE, pointerEvents: "none", whiteSpace: "nowrap" }}>
          {placeholder}
        </span>
      ) : null}
    </span>
  );
}

/** Transient "busy then done" flow for buttons: idle -> busy -> done -> idle. */
export function useFlow(busyMs = 900, doneMs = 1200) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const later = useLater();
  function run() {
    if (state !== "idle") return;
    setState("busy");
    later(() => {
      setState("done");
      later(() => setState("idle"), doneMs);
    }, busyMs);
  }
  return [state, run] as const;
}

export type { ReactNode };
export { Box, Txt };
