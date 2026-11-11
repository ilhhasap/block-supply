import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LIVE } from "@/components/live";
import { VIEWS } from "@/components/kits";
import { BLOCKS } from "@/data/blocks";

/**
 * Fits a block into its card. A block wider than the room it has (or narrower than the width it is
 * laid out for, `minW`) is drawn at that width and scaled down, so nothing is clipped or overlaps.
 * Copy to Figma lifts the scale first (see `copyBlock`), so the copied frame keeps its real size.
 */
function Fit({ minW, children }: { minW?: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, width: 0, height: 0 });

  useLayoutEffect(() => {
    const outerEl = outer.current;
    const innerEl = inner.current;
    if (!outerEl || !innerEl) return;
    const measure = () => {
      const kit = innerEl.firstElementChild as HTMLElement | null;
      const avail = outerEl.clientWidth;
      // `offsetWidth` ignores the transform, so this is the block's real width.
      const natural = Math.max(minW ?? 0, kit?.offsetWidth ?? 0);
      const scale = avail > 0 && natural > avail + 1 ? avail / natural : 1;
      const height = scale < 1 ? Math.round(innerEl.offsetHeight * scale) : 0;
      const width = scale < 1 ? natural : 0;
      setFit((prev) => (prev.scale === scale && prev.width === width && prev.height === height ? prev : { scale, width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outerEl);
    observer.observe(innerEl);
    const kit = innerEl.firstElementChild;
    if (kit) observer.observe(kit);
    return () => observer.disconnect();
  }, [minW]);

  const scaled = fit.scale < 1;
  return (
    <div ref={outer} data-fit="" style={{ width: "100%", height: scaled ? fit.height : undefined }}>
      <div
        ref={inner}
        data-fit-inner=""
        style={{
          display: "flex",
          justifyContent: "center",
          width: scaled ? fit.width : "100%",
          transform: scaled ? `scale(${fit.scale})` : undefined,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Interactive version of a block when one exists, otherwise the static one. */
export function BlockView({ id }: { id: string }) {
  const View = LIVE[id] ?? VIEWS[id];
  if (!View) return null;
  const minW = BLOCKS.find((block) => block.id === id)?.minW;
  return (
    <Fit minW={minW}>
      <View />
    </Fit>
  );
}
