import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LIVE } from "@/components/live";
import { VIEWS } from "@/components/kits";
import { BLOCKS } from "@/data/blocks";

/**
 * Some blocks are laid out for a minimum width. When the space is narrower the block is drawn at
 * that width and scaled down to fit, instead of its text running into its neighbours. Copy to
 * Figma lifts the scale first (see `copyBlock`), so the copied frame keeps its real size.
 */
function Fit({ minW, children }: { minW: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const outerEl = outer.current;
    const innerEl = inner.current;
    if (!outerEl || !innerEl) return;
    const measure = () => {
      const avail = outerEl.clientWidth;
      const scale = avail > 0 && avail < minW ? avail / minW : 1;
      setFit((prev) => {
        const height = scale < 1 ? Math.round(innerEl.offsetHeight * scale) : 0;
        return prev.scale === scale && prev.height === height ? prev : { scale, height };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outerEl);
    observer.observe(innerEl);
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
          width: scaled ? minW : "100%",
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
  return minW ? (
    <Fit minW={minW}>
      <View />
    </Fit>
  ) : (
    <View />
  );
}
