"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useAtelier } from "@/lib/store";
import { Arrow } from "../icons";
import type { Door, Option } from "./options";
import css from "./NodeCanvas.module.css";

/* What you have, wired to what it can become — with as few words as
   possible. A cable comes in from the edge of the screen to your input,
   runs on to every flow it opens, and leaves again towards the next step.
   Hovering a flow lights its cable. */

interface Geo {
  w: number;
  lead: string;
  wires: { id: string; d: string; off: boolean }[];
  tails: { id: string; d: string; off: boolean }[];
  inX: number;
  tailX: number;
}

const s = (x1: number, y1: number, x2: number, y2: number) => {
  const k = Math.max(50, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
};

/* anything with a picture, a name and doors: a dashboard answer, an Explore set */
export function NodeCanvas({ option }: { option: Pick<Option, "example" | "label" | "doors"> }) {
  const { t } = useAtelier();
  const box = useRef<HTMLDivElement>(null);
  const inL = useRef<HTMLSpanElement>(null);
  const inR = useRef<HTMLSpanElement>(null);
  const ports = useRef<Record<string, { l: HTMLSpanElement | null; r: HTMLSpanElement | null }>>({});
  const [geo, setGeo] = useState<Geo | null>(null);
  const [lit, setLit] = useState<string | null>(null);

  /* cables are measured from the ports, so they hold at any size */
  const measure = useCallback(() => {
    const root = box.current?.getBoundingClientRect();
    const a = inL.current?.getBoundingClientRect();
    const b = inR.current?.getBoundingClientRect();
    if (!root || !a || !b) return;
    const c = (r: DOMRect) => ({ x: r.left + r.width / 2 - root.left, y: r.top + r.height / 2 - root.top });
    const pa = c(a);
    const pb = c(b);
    const wires: Geo["wires"] = [];
    const tails: Geo["tails"] = [];
    let tailX = root.width;
    option.doors.forEach((door, i) => {
      const p = ports.current[door.id];
      if (!p?.l || !p.r) return;
      const l = c(p.l.getBoundingClientRect());
      const r = c(p.r.getBoundingClientRect());
      const off = door.status !== "open";
      tailX = Math.min(tailX, r.x);
      wires.push({ id: door.id, d: s(pb.x, pb.y, l.x, l.y), off });
      tails.push({ id: door.id, d: s(r.x, r.y, root.width + 40, r.y + (i - (option.doors.length - 1) / 2) * 60 + 90), off });
    });
    setGeo({
      w: root.width,
      lead: s(-40, pa.y + 110, pa.x, pa.y),
      wires,
      tails,
      inX: pa.x,
      tailX,
    });
  }, [option]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    const settle = setTimeout(measure, 900);
    return () => {
      ro.disconnect();
      clearTimeout(settle);
    };
  }, [measure]);

  return (
    <div className={css.canvas} ref={box} onAnimationEnd={measure}>
      {geo && (
        <svg className={css.wires} aria-hidden>
          <defs>
            <linearGradient id="nc-lead" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={geo.inX} y2="0">
              <stop offset="0" stopColor="#efe8da" stopOpacity="0" />
              <stop offset="1" stopColor="#efe8da" stopOpacity="0.32" />
            </linearGradient>
            <linearGradient id="nc-tail" gradientUnits="userSpaceOnUse" x1={geo.tailX} y1="0" x2={geo.w} y2="0">
              <stop offset="0" stopColor="#efe8da" stopOpacity="0.22" />
              <stop offset="1" stopColor="#efe8da" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className={css.lead} d={geo.lead} stroke="url(#nc-lead)" />
          {geo.tails.map((w) => (
            <path key={`t-${w.id}`} className={`${css.tail} ${w.off ? css.off : ""}`} d={w.d} stroke="url(#nc-tail)" />
          ))}
          {geo.wires.map((w, i) => (
            <path
              key={w.id}
              d={w.d}
              pathLength={1}
              className={`${css.wire} ${w.off ? css.off : ""} ${lit === w.id ? css.lit : ""} ${lit && lit !== w.id ? css.dim : ""}`}
              style={{ "--i": i } as CSSProperties}
            />
          ))}
        </svg>
      )}

      {/* ── the input ── */}
      <article className={css.input}>
        <span className={`${css.bar} ${css.left}`} ref={inL} />
        <img src={option.example} alt="" />
        <p className={css.inputLabel}>{t(option.label)}</p>
        <span className={`${css.bar} ${css.right}`} ref={inR} />
      </article>

      {/* ── what it can become ── */}
      <div className={css.flows}>
        {option.doors.map((door, i) => (
          <FlowNode
            key={door.id}
            door={door}
            i={i}
            setPorts={(l, r) => {
              ports.current[door.id] = { ...ports.current[door.id], ...(l !== undefined ? { l } : {}), ...(r !== undefined ? { r } : {}) } as {
                l: HTMLSpanElement | null;
                r: HTMLSpanElement | null;
              };
            }}
            onLight={setLit}
            lit={lit === door.id}
          />
        ))}
      </div>
    </div>
  );
}

function FlowNode({
  door,
  i,
  setPorts,
  onLight,
  lit,
}: {
  door: Door;
  i: number;
  setPorts: (l?: HTMLSpanElement | null, r?: HTMLSpanElement | null) => void;
  onLight: (id: string | null) => void;
  lit: boolean;
}) {
  const { t } = useAtelier();
  const open = door.status === "open" && door.href;
  const body = (
    <>
      <span className={`${css.bar} ${css.left}`} ref={(el) => setPorts(el, undefined)} />
      {/* the result carries the card; words: a name, what it does, a price */}
      <img className={css.flowImg} src={door.after} alt="" />
      <span className={css.flowText}>
        <span className={css.flowHead}>
          <span className={css.flowName}>{t(door.name)}</span>
          <span className={css.flowLine}>{t(door.line)}</span>
        </span>
        <span className={css.flowFoot}>
          <span className={css.credit}>
            {open ? door.credit && t(door.credit) : door.status === "soon" ? t({ en: "Soon", tr: "Yakında" }) : t({ en: "Draft", tr: "Taslak" })}
          </span>
          {open && <Arrow size={15} className={css.arrow} />}
        </span>
      </span>
      <span className={`${css.bar} ${css.right}`} ref={(el) => setPorts(undefined, el)} />
    </>
  );
  const common = {
    className: `${css.flow} ${open ? "" : css.flowOff} ${lit ? css.flowLit : ""}`,
    style: { "--i": i } as CSSProperties,
    onMouseEnter: () => onLight(door.id),
    onMouseLeave: () => onLight(null),
    onFocus: () => onLight(door.id),
    onBlur: () => onLight(null),
  };
  return open ? (
    <Link href={door.href!} {...common}>
      {body}
    </Link>
  ) : (
    <div {...common} aria-disabled tabIndex={0}>
      {body}
    </div>
  );
}
