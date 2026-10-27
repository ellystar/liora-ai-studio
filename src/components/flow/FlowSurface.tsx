"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FLOWS, flowBySlug, type FlowSlug, type Job, type L, type NodeKind } from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { setById } from "../explore/sets";
import { TopBar } from "../TopBar";
import { Arrow } from "../icons";
import {
  chainFor,
  decisionNodes,
  emptyState,
  firstInput,
  nextStep,
  plannedFrames,
  sampleFor,
  stateFromDraft,
  type FlowState,
  type StepId,
} from "./model";
import { NodeSheet, type Run } from "./NodeSheet";
import {
  CastStep,
  FramingStep,
  GhostSuggest,
  Intro,
  QualityStep,
  SettingStep,
  StepShell,
  SummaryStep,
  UploadStep,
} from "./Steps";
import css from "./Flow.module.css";

const STITCH_MS = 280;
const PASS_MS = 420;
const FRAME_MS = 1100;

function titleFor(st: FlowState): L {
  const first = st.uploads[0];
  if (!first) return { en: "Untitled", tr: "Adsız" };
  if (first.src.includes("belt")) return { en: "Leather belt", tr: "Deri kemer" };
  if (first.src.includes("coat") || first.src.includes("flat")) return { en: "Camel wool coat", tr: "Kamel yün kaban" };
  if (first.src.includes("onmodel")) return { en: "Black rib dress", tr: "Siyah fitilli elbise" };
  const name = first.name.replace(/\.[a-z]+$/i, "");
  return { en: name, tr: name };
}

export interface FlowQuery {
  draft?: string;
  from?: string;
  sample?: string;
}

export function FlowSurface({ slug, query = {} }: { slug: FlowSlug; query?: FlowQuery }) {
  const flow = flowBySlug(slug)!;
  const { s, t, dispatch, set, ready } = useAtelier();
  const router = useRouter();
  /* initial state: fresh, from a sample, a draft to continue, or a finished
     job's setup reopened. Read once, on the client, from the URL. */
  const [init] = useState(() => {
    if (typeof window === "undefined") return null;
    /* the query comes from the page: on a client-side visit window.location
       still shows the page you came from when this first runs */
    const q = { get: (k: keyof FlowQuery) => query[k] ?? null };
    const draft = s.jobs.find((j) => j.id === q.get("draft") && j.status === "draft");
    if (draft) return { st: stateFromDraft(draft, flow), draftId: draft.id };
    const done = s.jobs.find((j) => j.id === q.get("from") && j.draftState);
    if (done) {
      return {
        st: { ...(done.draftState as FlowState), phase: "setup", step: "summary", editing: false, jobId: undefined } as FlowState,
        draftId: null,
      };
    }
    let fresh = emptyState(!s.seenIntro.includes(flow.slug));
    fresh.step = firstInput(flow);
    const sample = q.get("sample");
    if (sample) {
      /* from Explore: the set comes in, framing fixed to one frame (wf-10 · 03) */
      const set = setById(sample);
      fresh = {
        ...fresh,
        phase: "setup",
        uploads: sampleFor(flow, sample),
        uploadStage: "review",
        ...(set ? { sampleSet: set.id, isFlat: !!set.isFlat, angles: ["front" as const] } : {}),
      };
    }
    return { st: fresh, draftId: null };
  });
  const [st, setSt] = useState<FlowState | null>(init?.st ?? null);
  const [run, setRun] = useState<Run | null>(null);
  const [tick, setTick] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(init?.draftId ?? null);
  const [saved, setSaved] = useState(false);
  const started = useRef(false);
  const leftRef = useRef<HTMLElement>(null);

  /* each decision starts at the top of the left column */
  useEffect(() => {
    leftRef.current?.scrollTo({ top: 0 });
  }, [st?.step, st?.phase, st?.uploadStage, saved]);

  const up = useCallback((patch: Partial<FlowState>) => setSt((p) => (p ? { ...p, ...patch } : p)), []);

  const chain = st ? chainFor(flow, st) : flow.nodes;

  /* ── intro preview: the sheet fills itself, to show how it works (W-F-03) ── */
  const intro = st?.phase === "intro";
  useEffect(() => {
    if (!intro) return;
    const iv = setInterval(() => setTick((i) => i + 1), 650);
    return () => clearInterval(iv);
  }, [intro]);
  const demo = intro ? Math.min(tick % (chain.length + 2), chain.length - 1) : null;

  /* ── production timeline: stitch, pass the thread, deliver frames ── */
  useEffect(() => {
    if (!st || st.phase !== "producing" || !run || started.current) return;
    started.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 150;
    for (let i = 1; i < chain.length; i++) {
      at += STITCH_MS;
      const k = i;
      timers.push(setTimeout(() => setRun((r) => r && { ...r, stitched: k }), at));
    }
    at += 250;
    for (let i = 1; i < chain.length; i++) {
      at += PASS_MS;
      const k = i;
      timers.push(setTimeout(() => setRun((r) => r && { ...r, passed: k }), at));
    }
    for (let f = 1; f <= run.planned.length; f++) {
      at += FRAME_MS;
      const k = f;
      timers.push(setTimeout(() => setRun((r) => r && { ...r, framesDone: k }), at));
    }
    at += 450;
    const jobId = st.jobId!;
    timers.push(
      setTimeout(() => {
        dispatch({ type: "complete", id: jobId });
        setRun((r) => r && { ...r, passed: chain.length });
        setSt((p) => (p ? { ...p, phase: "done" } : p));
      }, at),
    );
    return () => timers.forEach(clearTimeout);
    // the timeline is scheduled once per run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.phase, run === null]);

  if (!ready || !st) return <main className={css.page} />;

  const decisions = decisionNodes(flow, st);
  const indexOf = (n: NodeKind) => chain.indexOf(n) + 1;

  const confirm = (node: NodeKind, extra: Partial<FlowState> = {}) =>
    setSt((p) => {
      if (!p) return p;
      const next: FlowState = {
        ...p,
        ...extra,
        editing: false,
        confirmed: p.confirmed.includes(node) ? p.confirmed : [...p.confirmed, node],
      };
      next.step = nextStep(flow, next);
      return next;
    });

  const open = (n: StepId) => setSt((p) => (p ? { ...p, step: n, editing: n !== "summary" } : p));

  const begin = () => {
    set({ seenIntro: [...s.seenIntro, flow.slug] });
    up({ phase: "setup" });
  };

  const start = () => {
    const jobId = `j-${Date.now()}`;
    const planned = plannedFrames(flow, st, jobId, s.failOne);
    const duration = 150 + (chain.length - 1) * (STITCH_MS + PASS_MS) + 250 + planned.length * FRAME_MS + 450;
    const job: Job = {
      id: jobId,
      title: titleFor(st),
      flow: flow.slug,
      status: "running",
      castId: st.castId,
      settingId: st.settingId,
      ratio: st.ratio,
      frames: [],
      progress: 0,
      planned,
      finishAt: Date.now() + duration + 1500,
      creditPerFrame: flow.creditPerFrame,
      createdAt: new Date().toISOString(),
      cover: planned[0]?.src ?? "/img/out-front.jpg",
      draftState: { ...st, phase: "setup", editing: false },
    };
    dispatch({ type: "upsertJob", job });
    if (draftId) dispatch({ type: "removeJob", id: draftId });
    if (s.failOne) set({ failOne: false });
    started.current = false;
    setRun({ stitched: 0, passed: 0, framesDone: 0, planned });
    setSt({ ...st, phase: "producing", jobId, editing: false });
  };

  const save = () => {
    const id = draftId ?? `j-${Date.now()}`;
    const step = st.step === "summary" ? decisions[decisions.length - 1] : st.step;
    dispatch({
      type: "upsertJob",
      job: {
        id,
        title: titleFor(st),
        flow: flow.slug,
        status: "draft",
        draftStep: step,
        draftState: { ...st, editing: false },
        frames: [],
        createdAt: new Date().toISOString(),
        cover: st.uploads[0]?.src ?? flow.before,
      },
    });
    set({ hiddenDrafts: s.hiddenDrafts.filter((h) => h !== id) });
    setDraftId(id);
    setSaved(true);
  };

  /* ── left: one decision at a time ── */
  const left = () => {
    if (saved) {
      return (
        <StepShell
          label={t({ en: "Draft", tr: "Taslak" })}
          title={t({ en: "Saved as a draft.", tr: "Taslak olarak kaydedildi." })}
          lede={t({
            en: "Every filled node is kept. It waits on the Atelier as a Continue line, and in Jobs.",
            tr: "Dolu node'ların hepsi korunuyor. Atölye'de bir Devam et satırı olarak ve İşlerim'de seni bekliyor.",
          })}
          actions={
            <>
              <Link href="/" className="btn btn-primary">
                {t({ en: "Back to the Atelier", tr: "Atölye'ye dön" })} <Arrow className="ar" />
              </Link>
              <button className="btn btn-ghost" onClick={() => setSaved(false)}>
                {t({ en: "Keep working", tr: "Çalışmaya devam et" })}
              </button>
            </>
          }
        />
      );
    }

    if (st.phase === "intro") return <Intro flow={flow} onBegin={begin} />;

    if (st.phase === "producing" || st.phase === "done") {
      const total = run?.planned.length ?? 0;
      const doneN = run?.framesDone ?? 0;
      const failed = run?.planned.filter((f) => f.failed).length ?? 0;
      if (st.phase === "done") {
        return (
          <StepShell
            label={t({ en: "Finished", tr: "Tamamlandı" })}
            title={
              failed
                ? t({ en: `${total - failed} of ${total} frames arrived.`, tr: `${total} karenin ${total - failed} tanesi geldi.` })
                : t({ en: `${total} frames are ready.`, tr: `${total} kare hazır.` })
            }
            lede={
              failed
                ? t({
                    en: "The missing frame cost nothing. You can retry it on its own from the results — same inputs, same choices.",
                    tr: "Gelmeyen kare için kredi yakılmadı. Sonuç ekranından tek başına yeniden deneyebilirsin — aynı girdiler, aynı seçimler.",
                  })
                : t({ en: "Judge them on the dark table. Keep, redo or refine each one.", tr: "Onları koyu masada değerlendir. Her birini tut, yeniden üret ya da düzelt." })
            }
            actions={
              <button className="btn btn-primary" onClick={() => router.push(`/jobs/${st.jobId}`)}>
                {t({ en: "See the results", tr: "Sonuçları gör" })} <Arrow className="ar" />
              </button>
            }
          />
        );
      }
      return (
        <StepShell
          label={t({ en: "Running", tr: "Üretimde" })}
          title={
            s.lang === "tr" ? (
              <>
                Birbirine <span className="soul">dikiliyor.</span>
              </>
            ) : (
              <>
                Sewing it <span className="soul">together.</span>
              </>
            )
          }
          lede={t({
            en: "You can close this screen. The work carries on, and you'll hear from us when it's done.",
            tr: "Bu ekranı kapatabilirsin. İş arka planda sürer, bittiğinde haber veririz.",
          })}
          actions={
            <>
              <Link href="/" className="btn btn-secondary">
                {t({ en: "Close the screen", tr: "Ekranı kapat" })}
              </Link>
              <Link href="/jobs" className="btn btn-ghost">
                {t({ en: "Go to Jobs", tr: "İşlerim'e git" })}
              </Link>
            </>
          }
        >
          <div className={css.progress}>
            <div className={css.progressHead}>
              <span className="meta">{t({ en: "Frames", tr: "Kareler" })}</span>
              <span className="meta-num">
                {doneN} / {total}
              </span>
            </div>
            <div className={css.track}>
              <span style={{ width: `${total ? (doneN / total) * 100 : 0}%` }} />
            </div>
          </div>
        </StepShell>
      );
    }

    const step = st.step;
    if (step === "summary")
      return <SummaryStep flow={flow} st={st} chain={chain} onJump={open} onStart={start} onSave={save} />;
    if (step === "product" || step === "shoot")
      return (
        <UploadStep
          flow={flow}
          st={st}
          up={up}
          index={indexOf(step)}
          onConfirm={(flat) =>
            confirm(step, flow.slug === "campaign" ? { ghost: flat ? (st.ghost === "skipped" ? "skipped" : "suggested") : "none" } : {})
          }
        />
      );
    if (step === "ghost")
      return (
        <GhostSuggest
          index={indexOf("ghost")}
          onAccept={() => confirm("ghost", { ghost: "accepted" })}
          onSkip={() =>
            setSt((p) => {
              if (!p) return p;
              const next: FlowState = { ...p, ghost: "skipped", editing: false };
              next.step = nextStep(flow, next);
              return next;
            })
          }
        />
      );
    if (step === "cast") return <CastStep st={st} up={up} index={indexOf("cast")} onConfirm={() => confirm("cast")} />;
    if (step === "setting") return <SettingStep st={st} up={up} index={indexOf("setting")} onConfirm={() => confirm("setting")} />;
    if (step === "framing") return <FramingStep st={st} up={up} index={indexOf("framing")} onConfirm={() => confirm("framing")} />;
    if (step === "quality") return <QualityStep st={st} up={up} index={indexOf("quality")} onConfirm={() => confirm("quality")} />;
    return null;
  };

  const setup = st.phase === "setup" && !saved;

  return (
    <main className={css.page}>
      <TopBar />
      {/* switch strip — the other flows, one line (W-F-04) */}
      <div className={css.strip}>
        <nav className={css.stripFlows} aria-label={t({ en: "Flows", tr: "Akışlar" })}>
          {FLOWS.map((f) =>
            f.status === "open" ? (
              <Link key={f.slug} href={`/flow/${f.slug}`} className={f.slug === flow.slug ? css.here : undefined}>
                {t(f.name)}
              </Link>
            ) : (
              <span key={f.slug} className={css.stripSoon}>
                {t(f.name)} <em>{t({ en: "soon", tr: "yakında" })}</em>
              </span>
            ),
          )}
        </nav>
        {setup && st.confirmed.length > 0 && (
          <button className={css.stripSave} onClick={save}>
            {t({ en: "Save and exit", tr: "Kaydet ve çık" })}
          </button>
        )}
      </div>

      <div className={css.surface}>
        <section className={css.left} ref={leftRef}>
          {left()}
        </section>
        <NodeSheet
          flow={flow}
          st={st}
          chain={chain}
          step={st.step}
          run={run}
          demo={demo}
          onOpen={(n) => open(n)}
        />
      </div>
    </main>
  );
}
