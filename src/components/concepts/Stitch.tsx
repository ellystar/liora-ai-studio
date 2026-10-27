"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import css from "./Stitch.module.css";

/* The selection mark, in three hands so they can be judged side by side:

   teyel   a basting stitch run around the frame in gold thread — the same
           stitch that later joins the nodes, so choosing and building
           speak one language
   line    a plain gold hairline, the quietest answer
   pencil  concept C's grease-pencil loop, kept for comparison

   The mark is measured in pixels so stitches keep one length on every
   side, and it is drawn once, the way a hand would. */

export type Mark = "teyel" | "line" | "pencil";

export const MARKS: { id: Mark; label: { en: string; tr: string } }[] = [
  { id: "teyel", label: { en: "Basting", tr: "Teyel" } },
  { id: "line", label: { en: "Line", tr: "Çizgi" } },
  { id: "pencil", label: { en: "Pencil", tr: "Kalem" } },
];

const LOOP = "M9 7 C30 2 70 3 92 8 C98 30 97 70 93 92 C70 98 30 97 8 94 C3 70 2 30 7 9 C10 4 16 4 22 6";

const OUT = 8; // how far outside the frame the thread runs

export function Stitch({ mark }: { mark: Mark }) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const mask = useId().replace(/:/g, "");

  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (mark === "pencil") {
    return (
      <svg ref={ref} className={`${css.mark} ${css.pencil}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={LOOP} pathLength={1} />
      </svg>
    );
  }

  const o = mark === "teyel" ? OUT : 5;
  const w = (box?.w ?? 0) + o * 2;
  const h = (box?.h ?? 0) + o * 2;
  /* one rectangle, started at the top-left and run clockwise */
  const d = `M 1.5 ${o + 4} V 1.5 H ${w - 1.5} V ${h - 1.5} H 1.5 Z`;

  return (
    <svg
      ref={ref}
      className={`${css.mark} ${css[mark]}`}
      style={{ inset: -o }}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      {box && (
        <>
          <defs>
            <mask id={mask} maskUnits="userSpaceOnUse" x="-4" y="-4" width={w + 8} height={h + 8}>
              <path className={css.reveal} d={d} pathLength={1} />
            </mask>
          </defs>
          <path className={css.thread} d={d} mask={`url(#${mask})`} />
        </>
      )}
    </svg>
  );
}
