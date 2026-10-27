"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useAtelier } from "@/lib/store";
import { Chevron, Lock } from "../icons";
import { MARKS, Stitch, type Mark } from "./Stitch";
import base from "./Concept.module.css";
import css from "./Choice.module.css";

/* The vocabulary for choosing, shared by the flow concepts (D, E):
   one question, its answers as large images on a shelf, the mark that
   says "this one", and the picture's way down to its node. */

/* the same face, in a shoot — taken from the Salon, where these casts were worn */
export const EDITORIAL: Record<string, string> = {
  mateo: "/img/salon/d1.jpg",
  imani: "/img/salon/s1.jpg",
  elias: "/img/salon/k1.jpg",
  yuki: "/img/salon/a4.jpg",
  liv: "/img/salon/n1.jpg",
};

export const FLY = 620; // the picture's way down to its node

export const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* layout changes between planes morph into each other in place */
export function morph(fn: () => void) {
  type VT = { ready: Promise<void>; finished: Promise<void> };
  const d = document as Document & { startViewTransition?: (cb: () => void) => VT };
  if (!d.startViewTransition || reduced()) return fn();
  /* a transition can be skipped (e.g. the tab is hidden); the update still runs */
  const vt = d.startViewTransition(() => flushSync(fn));
  vt.ready.catch(() => {});
  vt.finished.catch(() => {});
}

/* the chosen picture travels from its card to its node; onLand fires when it arrives */
export function flyTo(from: HTMLElement | null, target: HTMLElement | null | undefined, src: string, onLand: () => void) {
  if (!from || !target || reduced()) return false;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = document.createElement("img");
  ghost.src = src;
  ghost.alt = "";
  ghost.className = css.ghost;
  document.body.appendChild(ghost);
  const anim = ghost.animate(
    [
      { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` },
      { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` },
    ],
    { duration: FLY, delay: 140, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" },
  );
  anim.onfinish = () => {
    onLand();
    requestAnimationFrame(() => ghost.remove());
  };
  return true;
}

export function Ask({ no, q, hint, side }: { no: string; q: string; hint?: string; side?: ReactNode }) {
  return (
    <header className={css.ask}>
      <div className={css.askMain}>
        <span className={base.num}>{no}</span>
        <h1 className={css.q}>{q}</h1>
      </div>
      <div className={css.askSide}>
        {hint && <p className={css.hint}>{hint}</p>}
        {side}
      </div>
    </header>
  );
}

/* a row of answers that scrolls sideways; arrows appear only where there is more.
   layout="grid" lays the same cards out in rows instead — for a panel that is
   narrower than the screen but tall enough to show every answer at once. */
export function Shelf({
  children,
  layout = "row",
  ratio = "3 / 4",
  min = 190,
}: {
  children: ReactNode;
  layout?: "row" | "grid";
  ratio?: string; // the frame's ratio in the grid
  min?: number; // the narrowest a grid column may get, in px
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const check = () => {
    const el = ref.current;
    if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useLayoutEffect(() => {
    check();
    const ro = new ResizeObserver(check);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const move = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  if (layout === "grid") {
    return (
      <div className={css.grid} style={{ "--ratio": ratio, "--min": `${min}px` } as CSSProperties}>
        {children}
      </div>
    );
  }
  return (
    <div className={css.shelfWrap}>
      <div className={css.shelf} ref={ref} onScroll={check} data-l={edge.l || undefined} data-r={edge.r || undefined}>
        {children}
      </div>
      {edge.l && (
        <button className={`${css.nav} ${css.navL}`} onClick={() => move(-1)} aria-label="Previous">
          <Chevron dir="left" />
        </button>
      )}
      {edge.r && (
        <button className={`${css.nav} ${css.navR}`} onClick={() => move(1)} aria-label="Next">
          <Chevron />
        </button>
      )}
    </div>
  );
}

export function Card({
  img,
  alt,
  name,
  note,
  sel,
  lock,
  badge,
  mark,
  still,
  developing,
  tag,
  plain,
  onPick,
}: {
  img: string;
  alt?: string; // the editorial frame shown on hover
  name: string;
  note?: string;
  sel?: boolean;
  lock?: string;
  badge?: string;
  still?: boolean;
  developing?: boolean; // the image is still being made
  tag?: string; // lets a flow find this card's frame, e.g. to fly from it
  plain?: boolean; // the quiet hand: a gold outline for the choice, words in sans, the lock said in text
  mark?: Mark;
  onPick?: (frame: HTMLElement | null) => void;
}) {
  const frame = useRef<HTMLSpanElement>(null);
  const Tag = still ? "div" : "button";
  return (
    <Tag
      className={css.card}
      data-tag={tag}
      data-sel={sel || undefined}
      data-locked={lock ? true : undefined}
      data-plain={plain || undefined}
      onClick={still || lock || developing ? undefined : () => onPick?.(frame.current)}
      aria-pressed={still ? undefined : !!sel}
      aria-disabled={lock || developing ? true : undefined}
    >
      <span className={css.figure}>
        <span className={css.frame} ref={frame} data-frame data-developing={developing || undefined}>
          {!developing && <img className={css.base} src={img} alt="" />}
          {alt && !developing && <img className={css.alt} src={alt} alt="" />}
          {lock && !plain && (
            <span className={css.lock}>
              <Lock size={10} /> {lock}
            </span>
          )}
          {badge && <span className={`${css.badge} ${base.num}`}>{badge}</span>}
        </span>
        {sel && !plain && <Stitch key={mark} mark={mark ?? "teyel"} />}
      </span>
      <span className={css.cardText}>
        <span className={css.name}>{name}</span>
        {lock && plain ? (
          <span className={css.lockNote}>
            <Lock size={10} /> {lock}
          </span>
        ) : (
          note && <span className={css.note}>{note}</span>
        )}
      </span>
    </Tag>
  );
}

/* review tool, not product UI: switch the selection mark to compare */
export function MarkPicker({ mark, setMark }: { mark: Mark; setMark: (m: Mark) => void }) {
  const { t } = useAtelier();
  return (
    <div className={css.picker} role="radiogroup" aria-label={t({ en: "Selection mark", tr: "Seçim işareti" })}>
      <span>{t({ en: "Mark", tr: "İşaret" })}</span>
      {MARKS.map((m) => (
        <button key={m.id} role="radio" aria-checked={mark === m.id} className={mark === m.id ? css.on : undefined} onClick={() => setMark(m.id)}>
          {t(m.label)}
        </button>
      ))}
    </div>
  );
}
