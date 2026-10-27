"use client";

import { Fragment } from "react";
import {
  ANGLES,
  NODE_LABEL,
  castById,
  settingById,
  type FlowDef,
  type Frame,
  type NodeKind,
} from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Lock } from "../icons";
import { cost, frameCount, isFilled, type FlowState, type StepId } from "./model";
import css from "./Flow.module.css";

export interface Run {
  stitched: number; // connectors drawn
  passed: number; // nodes the gold thread has reached
  framesDone: number;
  planned: Frame[];
}

/* The production sheet. Not a canvas — a tailor's work order. Nodes are
   read-only summaries of decisions; they fill as the left side is answered
   and are only sewn together when the system starts (W-F-05…13). */
export function NodeSheet({
  flow,
  st,
  chain,
  step,
  run,
  demo,
  onOpen,
}: {
  flow: FlowDef;
  st: FlowState;
  chain: NodeKind[];
  step: StepId;
  run: Run | null;
  demo: number | null; // intro preview: how many nodes to show filled
  onOpen: (n: NodeKind) => void;
}) {
  const { t, s } = useAtelier();
  const producing = st.phase === "producing" || st.phase === "done";
  const n = frameCount(flow, st);

  return (
    <aside className={css.sheet} aria-label={t({ en: "Production sheet", tr: "Üretim föyü" })}>
      <div className={css.sheetBg} aria-hidden>
        <img src="/img/bg-atelier.jpg" alt="" />
        <div className="grain" />
      </div>

      <div className={css.sheetHead}>
        <span className="meta">
          {t({ en: "Production sheet", tr: "Üretim föyü" })} · {t(flow.name)}
        </span>
        <span className="meta">
          {producing
            ? t({ en: "Sewn", tr: "Dikildi" })
            : t({ en: "Not yet sewn", tr: "Henüz dikilmedi" })}
        </span>
      </div>

      <ol className={css.chain}>
        {chain.map((node, i) => {
          const locked = flow.locked?.includes(node);
          const system = flow.slug === "campaign" && node === "ghost";
          const demoFilled = demo !== null && i < demo && node !== "result";
          const filled = demo !== null ? demoFilled : isFilled(node, flow, st);
          const current = demo === null && !producing && step === node;
          const passed = run ? run.passed > i : false;
          const processing = run ? run.passed === i && run.stitched >= chain.length - 1 : false;
          const clickable = demo === null && !producing && filled && !locked;
          const state = locked
            ? css.locked
            : current
              ? css.current
              : passed || (node === "result" && st.phase === "done")
                ? css.lit
                : filled
                  ? css.filled
                  : css.empty;

          return (
            <Fragment key={node}>
              {i > 0 && (
                <li
                  aria-hidden
                  className={`${css.thread} ${run && run.stitched >= i ? css.sewn : ""} ${run && run.passed >= i ? css.goldThread : ""}`}
                  style={{ ["--i" as string]: i }}
                >
                  <span />
                </li>
              )}
              <li
                className={`${css.node} ${state} ${processing ? css.processing : ""} ${system ? css.system : ""}`}
              >
                <button
                  className={css.nodeBtn}
                  onClick={() => clickable && onOpen(node)}
                  disabled={!clickable}
                  aria-current={current ? "step" : undefined}
                >
                  <span className={css.nodeIdx}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={css.nodeMain}>
                    <span className={css.nodeLabel}>
                      {t(NODE_LABEL[node])}
                      {system && <em>{t({ en: "Added by the system", tr: "Sistem ekledi" })}</em>}
                      {current && <em className={css.nextTag}>{t({ en: "Now", tr: "Şimdi" })}</em>}
                    </span>
                    <span className={css.nodeValue}>
                      <NodeValue node={node} flow={flow} st={st} run={run} filled={filled} demo={demo !== null} locked={!!locked} />
                    </span>
                  </span>
                  <span className={css.nodeMark} aria-hidden>
                    {locked ? <Lock size={11} /> : filled || passed ? "●" : "○"}
                  </span>
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>

      <div className={css.sheetFoot}>
        {demo !== null ? (
          <span className="meta">
            {t({
              en: "Each decision fills a node. Filled nodes are sewn together when you start.",
              tr: "Her karar bir node'u doldurur. Başlattığında dolu node'lar birbirine dikilir.",
            })}
          </span>
        ) : (
          <>
            <span className="meta">
              {n} {t({ en: n === 1 ? "frame" : "frames", tr: "kare" })} · {cost(flow, st)} {t({ en: "credits", tr: "kredi" })}
            </span>
            <span className="meta">
              {t({ en: "Balance", tr: "Bakiye" })} {s.credits}
            </span>
          </>
        )}
      </div>
    </aside>
  );
}

function NodeValue({
  node,
  flow,
  st,
  run,
  filled,
  demo,
  locked,
}: {
  node: NodeKind;
  flow: FlowDef;
  st: FlowState;
  run: Run | null;
  filled: boolean;
  demo: boolean;
  locked: boolean;
}) {
  const { t } = useAtelier();

  if (locked) {
    return <span className={css.muted}>{t({ en: "From your shoot · locked", tr: "Çekiminden geldi · kilitli" })}</span>;
  }

  if (node === "result") {
    if (run) {
      const total = run.planned.length;
      return (
        <span className={css.resultRow}>
          <span className="meta-num">
            {run.framesDone} / {total}
          </span>
          <span className={css.thumbs}>
            {run.planned.map((f, i) => (
              <span
                key={f.id}
                className={`${css.thumb} ${i < run.framesDone ? (f.failed ? css.thumbFail : css.thumbIn) : css.thumbWait}`}
              >
                {i < run.framesDone && !f.failed && <img src={f.src} alt="" />}
              </span>
            ))}
          </span>
        </span>
      );
    }
    return <span className={css.muted}>{t({ en: "Waiting for the run", tr: "Üretimi bekliyor" })}</span>;
  }

  if (demo) {
    return filled ? <span className={css.demoBar} /> : <span className={css.muted}>—</span>;
  }

  if (node === "ghost" && flow.slug === "ghost") {
    return <span className={css.muted}>{t({ en: "Made during the run", tr: "Üretimde oluşur" })}</span>;
  }

  if (!filled) {
    if (node === "ghost" && st.ghost === "suggested")
      return <span className={css.warnText}>{t({ en: "Waiting for your answer", tr: "Cevabını bekliyor" })}</span>;
    return <span className={css.muted}>{t({ en: "Empty", tr: "Boş" })}</span>;
  }

  switch (node) {
    case "product":
    case "shoot":
      return (
        <span className={css.valueRow}>
          <span className={css.thumbs}>
            {st.uploads.slice(0, 4).map((u) => (
              <span key={u.id} className={`${css.thumb} ${css.thumbIn}`}>
                <img src={u.src} alt="" />
              </span>
            ))}
          </span>
          <span>
            {st.uploads.length} {t({ en: st.uploads.length === 1 ? "image" : "images", tr: "görsel" })}
            {st.isFlat && ` · ${t({ en: "flat", tr: "flat" })}`}
          </span>
        </span>
      );
    case "ghost":
      return (
        <span className={css.valueRow}>
          <span className={`${css.thumb} ${css.thumbIn}`}>
            <img src="/img/product-coat-front.jpg" alt="" />
          </span>
          <span>{t({ en: "Cleaned before the campaign", tr: "Kampanyadan önce temizlenecek" })}</span>
        </span>
      );
    case "cast": {
      const c = castById(st.castId);
      return (
        <span className={css.valueRow}>
          {c && (
            <span className={`${css.thumb} ${css.thumbIn} ${css.round}`}>
              <img src={c.img} alt="" />
            </span>
          )}
          <span>{c?.name}</span>
        </span>
      );
    }
    case "setting": {
      const se = settingById(st.settingId);
      return (
        <span className={css.valueRow}>
          {se && (
            <span className={`${css.thumb} ${css.thumbIn} ${css.wide}`}>
              <img src={se.img} alt="" />
            </span>
          )}
          <span>{se && t(se.name)}</span>
        </span>
      );
    }
    case "framing":
      return (
        <span className={css.valueRow}>
          <span className={css.schema}>
            {ANGLES.map((a) => (
              <span key={a.id} className={st.angles.includes(a.id) ? css.on : undefined} title={t(a.label)}>
                {a.short}
              </span>
            ))}
          </span>
          <span>
            {st.angles.length} {t({ en: "frames", tr: "kare" })}
            {st.styling && ` · ${t({ en: "note", tr: "not" })}`}
          </span>
        </span>
      );
    case "quality":
      return (
        <span>
          {st.ratio} · {st.quality === "high" ? "2K" : t({ en: "Standard", tr: "Standart" })}
        </span>
      );
  }
  return null;
}
