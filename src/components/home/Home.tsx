"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { NODE_LABEL, flowBySlug } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Masthead } from "../chrome/Masthead";
import { Arrow, Close } from "../icons";
import { setupHref } from "../review/Jobs";
import { NodeCanvas } from "./NodeCanvas";
import { OPTIONS, optionById, type Have, type Option } from "./options";
import css from "./Home.module.css";

/* The dashboard has two jobs: choose what you have, or continue what you
   left. Everything else steps back, and words are kept to the few that
   carry a decision — the images do the explaining.

   idle   → the question over slow-moving linen; four answers spread across
            the foot of the screen in one wide, low band
   peek   → hover or focus: the answer's line turns gold, the others step
            back, the linen stills. No preview here — choosing is one cheap,
            reversible click, and the canvas shows the image in context.
   chosen → the page opens in place onto a node canvas — what you have,
            wired to every flow it allows. The choice lives in the URL. */

function readHave(): Have | null {
  if (typeof window === "undefined") return null;
  return (optionById(new URLSearchParams(window.location.search).get("have"))?.id ?? null) as Have | null;
}

export function Home() {
  const { s, t, set, ready } = useAtelier();
  const [have, setHave] = useState<Have | null>(readHave);
  const [peek, setPeek] = useState<Have | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  /* Back/forward walk between the question and an opened answer */
  useEffect(() => {
    const sync = () => setHave(readHave());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const go = useCallback((next: Have | null) => {
    window.history.pushState(null, "", next ? `/?have=${next}` : "/");
    setHave(next);
  }, []);

  const choose = (id: Have) => {
    setPeek(null);
    go(id);
    /* answering the question is the end of onboarding (D-F-20) */
    set({ onboarded: true, ...(id !== "nothing" ? { lastInput: id === "ghost" ? "product" : id } : {}) });
  };

  /* the linen rests when the tab is hidden, and for reduced motion */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = () => (document.hidden || reduce ? v.pause() : v.play().catch(() => {}));
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, [ready]);

  useEffect(() => {
    const v = video.current;
    if (v) v.playbackRate = peek || have ? 0.35 : 0.8;
  }, [peek, have, ready]);

  if (!ready) return <main className={`${css.home} ink`} />;

  const chosen = optionById(have);
  const returning = s.session === "returning";
  const drafts = s.jobs.filter((j) => j.status === "draft").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastUsed: Have | null = s.lastInput === "product" ? "ghost" : (s.lastInput as Have | null);
  const state = chosen ? "chosen" : peek ? "peek" : "idle";

  const subFor = (o: Option) => (lastUsed === o.id && returning ? t({ en: "Last used", tr: "Son kullandığın" }) : t(o.sub));

  return (
    <main className={`${css.home} ink`} data-state={state}>
      {/* ── the ground ── */}
      <div className={css.ground} aria-hidden>
        {/* the still frame sits under the video, so the ground is never empty —
            before the video loads, when it can't play, or when it is paused */}
        <img className={css.silk} src="/img/bg-silk.jpg" alt="" />
        <video ref={video} className={css.silk} src="/video/silk.mp4" poster="/img/bg-silk.jpg" muted loop playsInline preload="auto" />
        <div className={css.scrim} />
        <div className={css.dots} />
        <div className="grain" />
      </div>

      {/* ── chrome: name and balance, nothing else ── */}
      <Masthead section={{ en: "Atelier", tr: "Atelier" }} onMark={(e) => (e.preventDefault(), go(null))} />

      {/* ── the question, or what was chosen ── */}
      <section className={css.stage}>
        {!chosen && (
          <>
            {returning && drafts[0] && (
              <p className={css.resume}>
                <Link href={`${setupHref(drafts[0].flow)}?draft=${drafts[0].setupId ?? drafts[0].id}`}>
                  <span>{t({ en: "Continue", tr: "Devam et" })}</span>
                  {t(drafts[0].title)} · {t(NODE_LABEL[drafts[0].draftStep ?? "product"])}
                  <Arrow size={13} />
                </Link>
                {drafts.length > 1 && (
                  <Link href="/jobs" className={css.more} title={t(flowBySlug(drafts[1].flow)!.name)}>
                    +{drafts.length - 1}
                  </Link>
                )}
              </p>
            )}
            <h1 className={css.question}>{t({ en: "What do you have?", tr: "Elinde ne var?" })}</h1>
          </>
        )}

        {chosen && (
          <div className={css.chosen}>
            <div className={css.switch} role="tablist" aria-label={t({ en: "What you have", tr: "Elindeki" })}>
              {OPTIONS.map((o) => (
                <button key={o.id} role="tab" aria-selected={o.id === chosen.id} className={o.id === chosen.id ? css.on : undefined} onClick={() => o.id !== chosen.id && choose(o.id)}>
                  {t(o.label)}
                </button>
              ))}
              <button className={css.close} onClick={() => go(null)} aria-label={t({ en: "Back to the question", tr: "Soruya dön" })}>
                <Close size={13} />
              </button>
            </div>
            <NodeCanvas key={chosen.id} option={chosen} />
          </div>
        )}
      </section>

      {/* ── the four answers: one wide, low band across the foot ── */}
      <div className={css.strip} role="list" aria-hidden={!!chosen}>
        {OPTIONS.map((o, i) => (
          <div key={o.id} role="listitem" className={`${css.col} ${peek === o.id ? css.on : ""}`} style={{ "--i": i } as CSSProperties}>
            <button
              className={css.band}
              onMouseEnter={() => setPeek(o.id)}
              onMouseLeave={() => setPeek((p) => (p === o.id ? null : p))}
              onFocus={() => setPeek(o.id)}
              onBlur={() => setPeek((p) => (p === o.id ? null : p))}
              onClick={() => choose(o.id)}
              tabIndex={chosen ? -1 : 0}
            >
              <span className={css.idx}>{String(i + 1).padStart(2, "0")}</span>
              <span className={css.label}>{t(o.label)}</span>
              <span className={css.sub}>{subFor(o)}</span>
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
