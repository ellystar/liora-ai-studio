"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { NodeKind } from "@/lib/data";
import css from "./Chain.module.css";

/* The chain: one card per node, in a line across the canvas.
   Before production the nodes only sit in order — a faint dashed guide
   between them, nothing wired. Wiring is the production itself (wf-03 · 10):
   cables draw node to node as the work runs, then a light passes along. */

export type NodeState = "empty" | "next" | "filled" | "editing" | "locked" | "planned";

export interface ChainNode {
  id: NodeKind;
  label: string;
  value?: string;
  state: NodeState;
  media?: ReactNode;
  tag?: string;
  peeking?: boolean; // the media is a hover preview, not a choice
  onOpen?: () => void;
}

export interface Wiring {
  wired: number; // segments drawn
  passed: number; // segments the light has passed
  done: boolean;
}

interface Geo {
  w: number;
  lead: string;
  segs: string[];
  tail: string;
  firstX: number;
  lastX: number;
}

const s = (x1: number, y1: number, x2: number, y2: number) => {
  const k = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
};

export function Chain({ nodes, wiring, focus }: { nodes: ChainNode[]; wiring: Wiring | null; focus?: NodeKind }) {
  const box = useRef<HTMLDivElement>(null);
  const ports = useRef<Record<string, { l?: HTMLSpanElement | null; r?: HTMLSpanElement | null }>>({});
  const [geo, setGeo] = useState<Geo | null>(null);
  const ids = nodes.map((n) => n.id).join(",");

  const measure = useCallback(() => {
    const root = box.current?.getBoundingClientRect();
    if (!root) return;
    const c = (el?: HTMLSpanElement | null) => {
      const r = el?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2 - root.left, y: r.top + r.height / 2 - root.top } : null;
    };
    const list = ids.split(",").map((id) => ({ l: c(ports.current[id]?.l), r: c(ports.current[id]?.r) }));
    if (list.some((p) => !p.l || !p.r)) return;
    const segs = list.slice(0, -1).map((p, i) => s(p.r!.x, p.r!.y, list[i + 1].l!.x, list[i + 1].l!.y));
    const first = list[0].l!;
    const last = list[list.length - 1].r!;
    setGeo({
      w: root.width,
      lead: s(-60, first.y + 70, first.x, first.y),
      segs,
      tail: s(last.x, last.y, root.width + 60, last.y + 70),
      firstX: first.x,
      lastX: last.x,
    });
  }, [ids]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    const settle = setTimeout(measure, 700);
    return () => {
      ro.disconnect();
      clearTimeout(settle);
    };
  }, [measure]);

  return (
    <div className={css.chain} ref={box} onTransitionEnd={measure}>
      {geo && (
        <svg className={css.wires} aria-hidden>
          <defs>
            <linearGradient id="ch-lead" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={geo.firstX} y2="0">
              <stop offset="0" stopColor="#efe8da" stopOpacity="0" />
              <stop offset="1" stopColor="#efe8da" stopOpacity="0.34" />
            </linearGradient>
            <linearGradient id="ch-tail" gradientUnits="userSpaceOnUse" x1={geo.lastX} y1="0" x2={geo.w} y2="0">
              <stop offset="0" stopColor="#d69f52" stopOpacity="0.7" />
              <stop offset="1" stopColor="#d69f52" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* the cable that brought you here from the Atelier */}
          <path className={css.lead} d={geo.lead} stroke="url(#ch-lead)" />
          {geo.segs.map((d, i) => (
            <g key={i}>
              <path className={css.guide} d={d} />
              {wiring && i < wiring.wired && (
                <path
                  className={`${css.wire} ${i < wiring.passed ? css.passed : ""}`}
                  d={d}
                  pathLength={1}
                  style={{ "--i": i } as CSSProperties}
                />
              )}
            </g>
          ))}
          {wiring?.done && <path className={css.tail} d={geo.tail} stroke="url(#ch-tail)" pathLength={1} />}
        </svg>
      )}

      <ol className={css.nodes}>
        {nodes.map((n, i) => (
          <li
            key={n.id}
            className={`${css.node} ${css[n.state]} ${focus === n.id ? css.focus : ""} ${wiring && i <= wiring.passed ? css.lit : ""}`}
            style={{ "--i": i } as CSSProperties}
          >
            <button className={css.card} onClick={n.onOpen} disabled={!n.onOpen} aria-label={`${n.label}${n.value ? ` — ${n.value}` : ""}`}>
              <span className={`${css.bar} ${css.left}`} ref={(el) => void (ports.current[n.id] = { ...ports.current[n.id], l: el })} />
              <span className={`${css.media} ${n.peeking ? css.peeking : ""}`}>
                {n.media ?? <span className={css.no}>{String(i + 1).padStart(2, "0")}</span>}
              </span>
              <span className={css.meta}>
                <span className={css.label}>{n.label}</span>
                <span className={css.value}>{n.value ?? "—"}</span>
              </span>
              {n.tag && <span className={css.tag}>{n.tag}</span>}
              <span className={`${css.bar} ${css.right}`} ref={(el) => void (ports.current[n.id] = { ...ports.current[n.id], r: el })} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
