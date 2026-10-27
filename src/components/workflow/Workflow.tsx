"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ANGLES,
  FLOWS,
  NODE_LABEL,
  allSettings,
  castById,
  flowBySlug,
  settingById,
  type FlowSlug,
  type Frame,
  type Job,
  type L,
  type NodeKind,
} from "@/lib/data";
import { useAtelier } from "@/lib/store";
import { Masthead } from "../chrome/Masthead";
import { Chevron, Lock } from "../icons";
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
} from "../flow/model";
import { Chain, type ChainNode, type NodeState, type Wiring } from "./Chain";
import {
  CastPanel,
  FramingPanel,
  GhostPanel,
  IntroPanel,
  QualityPanel,
  ReadyPanel,
  RunPanel,
  SavedPanel,
  SettingPanel,
  UploadPanel,
} from "./Panels";
import css from "./Workflow.module.css";

/* PARKED (2026-10-05): a rough v2 of the flow surface, not routed yet —
   the workflow page waits on decisions with the PM. /flow/[slug] still
   renders the v1 FlowSurface.

   The flow surface. You step out of the dashboard's node canvas into one
   flow: the same cards, now in a chain across the middle; the question
   sits in a band at the foot, like the dashboard's answers. Nodes fill as
   you decide; they are wired only when the system runs (wf-03). */

const WIRE_MS = 300;
const PASS_MS = 380;
const FRAME_MS = 1100;

interface Run {
  wired: number;
  passed: number;
  framesDone: number;
  planned: Frame[];
}

function titleFor(st: FlowState): L {
  const src = st.uploads[0]?.src ?? "";
  if (src.includes("belt")) return { en: "Leather belt", tr: "Deri kemer" };
  if (src.includes("flat-in")) return { en: "Cream cable cardigan", tr: "Krem örgü hırka" };
  if (src.includes("ghost-in") || src.includes("coat")) return { en: "Camel wool coat", tr: "Kamel yün kaban" };
  if (src.includes("onmodel")) return { en: "Black rib dress", tr: "Siyah fitilli elbise" };
  const name = st.uploads[0]?.name.replace(/\.[a-z]+$/i, "") ?? "";
  return name ? { en: name, tr: name } : { en: "Untitled", tr: "Adsız" };
}

export function Workflow({ slug, cast }: { slug: FlowSlug; cast?: string }) {
  const flow = flowBySlug(slug)!;
  const { s, t, dispatch, set, ready } = useAtelier();
  const router = useRouter();

  /* where you arrive from: fresh, a sample, a draft, a finished job's setup,
     or the Salon with a cast already chosen. Read once, on the client. */
  const [init] = useState(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search);
    const draft = s.jobs.find((j) => j.id === q.get("draft") && j.status === "draft");
    if (draft) return { st: stateFromDraft(draft, flow), draftId: draft.id };
    const done = s.jobs.find((j) => j.id === q.get("from") && j.draftState);
    if (done)
      return { st: { ...(done.draftState as FlowState), phase: "setup", step: "summary", editing: false, jobId: undefined } as FlowState, draftId: null };
    let fresh = emptyState(!s.seenIntro.includes(flow.slug));
    fresh.step = firstInput(flow);
    if (q.get("sample")) fresh = { ...fresh, phase: "setup", uploads: sampleFor(flow), uploadStage: "review" };
    if (cast && castById(cast) && flow.nodes.includes("cast")) fresh = { ...fresh, phase: "setup", castId: cast, confirmed: ["cast"] };
    return { st: fresh, draftId: null };
  });
  const [st, setSt] = useState<FlowState | null>(init?.st ?? null);
  const [run, setRun] = useState<Run | null>(null);
  const [draftId, setDraftId] = useState<string | null>(init?.draftId ?? null);
  const [saved, setSaved] = useState(false);
  const [peek, setPeek] = useState<{ kind: "cast" | "setting"; id: string } | null>(null);
  const [tick, setTick] = useState(0);
  const started = useRef(false);

  const up = useCallback((patch: Partial<FlowState>) => setSt((p) => (p ? { ...p, ...patch } : p)), []);
  const chain = st ? chainFor(flow, st) : flow.nodes;

  /* the intro shows the chain filling itself once, then holds (W-F-03) */
  const intro = st?.phase === "intro";
  useEffect(() => {
    if (!intro) return;
    const iv = setInterval(() => setTick((i) => i + 1), 700);
    return () => clearInterval(iv);
  }, [intro]);
  const demo = intro ? Math.min(tick, chain.length - 1) : -1;

  /* production: wire node to node, pass the light along, deliver frames */
  useEffect(() => {
    if (!st || st.phase !== "producing" || !run || started.current) return;
    started.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 200;
    for (let i = 1; i < chain.length; i++) {
      at += WIRE_MS;
      const k = i;
      timers.push(setTimeout(() => setRun((r) => r && { ...r, wired: k }), at));
    }
    at += 300;
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
    at += 500;
    const jobId = st.jobId!;
    timers.push(
      setTimeout(() => {
        dispatch({ type: "complete", id: jobId });
        setSt((p) => (p ? { ...p, phase: "done" } : p));
      }, at),
    );
    return () => timers.forEach(clearTimeout);
    // scheduled once per run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.phase, run === null]);

  if (!ready || !st) return <main className={`${css.page} ink`} />;

  const decisions = decisionNodes(flow, st);
  const idxOf = (n: NodeKind) => `${String(decisions.indexOf(n) + 1).padStart(2, "0")} / ${String(decisions.length).padStart(2, "0")}`;
  const setup = st.phase === "setup" && !saved;

  const confirm = (node: NodeKind, extra: Partial<FlowState> = {}) => {
    setPeek(null);
    setSt((p) => {
      if (!p) return p;
      const next: FlowState = { ...p, ...extra, editing: false, confirmed: p.confirmed.includes(node) ? p.confirmed : [...p.confirmed, node] };
      next.step = nextStep(flow, next);
      return next;
    });
  };
  const open = (n: StepId) => setSt((p) => (p ? { ...p, step: n, editing: n !== "summary" } : p));

  const begin = () => {
    set({ seenIntro: [...s.seenIntro, flow.slug] });
    up({ phase: "setup" });
  };

  const start = () => {
    const jobId = `j-${Date.now()}`;
    const planned = plannedFrames(flow, st, jobId, s.failOne);
    const duration = 200 + (chain.length - 1) * (WIRE_MS + PASS_MS) + 300 + planned.length * FRAME_MS + 500;
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
      cover: planned[0]?.src ?? flow.after,
      draftState: { ...st, phase: "setup", editing: false },
    };
    dispatch({ type: "upsertJob", job });
    if (draftId) dispatch({ type: "removeJob", id: draftId });
    if (s.failOne) set({ failOne: false });
    started.current = false;
    setRun({ wired: 0, passed: 0, framesDone: 0, planned });
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

  /* ── the chain, node by node ── */
  const producing = st.phase === "producing" || st.phase === "done";
  const delivered = run ? run.planned.slice(0, run.framesDone) : [];
  const img = (src: string) => <img src={src} alt="" />;

  const nodeFor = (n: NodeKind, i: number): ChainNode => {
    const locked = !!flow.locked?.includes(n);
    const process = n === "ghost" && flow.slug === "ghost";
    const filled = locked || st.confirmed.includes(n);
    const current = !producing && !saved && st.phase === "setup" && st.step === n;
    let state: NodeState = filled ? "filled" : current ? "next" : "empty";
    if (current && st.editing) state = "editing";
    if (locked) state = "locked";
    if (n === "ghost" && !st.confirmed.includes("ghost")) state = current ? "next" : "planned";
    if (process) state = producing ? "filled" : "planned";
    if (intro && i <= demo) state = "filled";

    let media: ReactNode = null;
    let value: string | undefined;
    let tag: string | undefined;
    let peeking = false;
    const front = st.uploads.find((u) => u.slot === "front") ?? st.uploads[0];

    switch (n) {
      case "product":
      case "shoot":
        if (front && (filled || st.uploadStage === "review")) {
          media = img(front.src);
          value = `${st.uploads.length} ${t({ en: st.uploads.length === 1 ? "image" : "images", tr: "görsel" })}`;
        } else if (intro && i <= demo) media = img(flow.before);
        break;
      case "ghost":
        media = img(flow.slug === "ghost" && producing && delivered[0] ? delivered[0].src : "/img/home/ghostflow-out.jpg");
        value = flow.slug === "ghost" ? t({ en: "Made in the run", tr: "Üretimde" }) : t({ en: "Cleaned first", tr: "Önce temizlenir" });
        if (flow.slug !== "ghost") tag = t({ en: "System added", tr: "Sistem ekledi" });
        if (intro && i > demo) media = null;
        break;
      case "cast": {
        const shown = peek?.kind === "cast" && current ? castById(peek.id) : castById(st.castId);
        peeking = !!(peek?.kind === "cast" && current);
        if (shown && (filled || current)) {
          media = img(shown.img);
          value = shown.name;
        } else if (intro && i <= demo) media = img("/img/cast-ada.jpg");
        break;
      }
      case "setting": {
        if (locked) {
          media = front ? img(front.src) : null;
          value = t({ en: "From your shoot", tr: "Çekiminden" });
          tag = t({ en: "Kept", tr: "Korunur" });
          break;
        }
        const shown = peek?.kind === "setting" && current ? allSettings().find((x) => x.id === peek.id) : settingById(st.settingId);
        peeking = !!(peek?.kind === "setting" && current);
        if (shown && (filled || current)) {
          media = img(shown.img);
          value = t(shown.name);
        } else if (intro && i <= demo) media = img("/img/flow/set-studio.jpg");
        break;
      }
      case "framing":
        if (locked) {
          value = t({ en: "From your shoot", tr: "Çekiminden" });
          tag = t({ en: "Kept", tr: "Korunur" });
          media = <Lock size={14} />;
          break;
        }
        if (filled || current || (intro && i <= demo)) {
          media = <Schema angles={st.angles} />;
          value = `${st.angles.length} ${t({ en: st.angles.length === 1 ? "frame" : "frames", tr: "kare" })}`;
        }
        break;
      case "quality":
        if (filled || current || (intro && i <= demo)) {
          media = <RatioMark ratio={st.ratio} />;
          value = `${st.ratio} · ${st.quality === "high" ? "2K" : t({ en: "Standard", tr: "Standart" })}`;
        }
        break;
      case "result":
        if (producing && run) {
          media = <Developing planned={run.planned} done={run.framesDone} />;
          value = `${run.framesDone} / ${run.planned.length}`;
          state = st.phase === "done" ? "filled" : "next";
        } else if (intro && i <= demo) media = img(flow.after);
        break;
    }

    const clickable =
      !producing && !saved && st.phase === "setup" && filled && !locked && !process && n !== "result" && st.step !== n;
    const toResults = st.phase === "done" && n === "result" && st.jobId;
    return {
      id: n,
      label: t(NODE_LABEL[n]),
      value,
      state,
      media,
      tag,
      peeking,
      onOpen: clickable ? () => open(n) : toResults ? () => router.push(`/jobs/${st.jobId}`) : undefined,
    };
  };

  const wiring: Wiring | null = run ? { wired: run.wired, passed: run.passed, done: st.phase === "done" } : null;

  /* ── the band: one decision at a time ── */
  const band = () => {
    if (saved) return <SavedPanel onKeep={() => setSaved(false)} />;
    if (st.phase === "intro") return <IntroPanel flow={flow} onBegin={begin} />;
    if (producing && run) {
      const failed = run.planned.filter((f) => f.failed).length;
      return <RunPanel done={st.phase === "done"} total={run.planned.length} failed={failed} frames={delivered} jobId={st.jobId} />;
    }
    const step = st.step;
    if (step === "summary")
      return (
        <ReadyPanel
          flow={flow}
          st={st}
          onStart={start}
          onSave={save}
          onFewer={flow.nodes.includes("framing") && !flow.locked?.includes("framing") ? () => open("framing") : undefined}
        />
      );
    if (step === "product" || step === "shoot")
      return (
        <UploadPanel
          flow={flow}
          st={st}
          up={up}
          idx={idxOf(step)}
          onConfirm={(flat) => confirm(step, flow.slug === "campaign" ? { ghost: flat ? (st.ghost === "skipped" ? "skipped" : "suggested") : "none" } : {})}
        />
      );
    if (step === "ghost")
      return (
        <GhostPanel
          idx={idxOf("ghost")}
          flat={st.uploads[0]?.src ?? flow.before}
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
    if (step === "cast") return <CastPanel st={st} up={up} idx={idxOf("cast")} peek={setPeek} onConfirm={() => confirm("cast")} />;
    if (step === "setting") return <SettingPanel st={st} up={up} idx={idxOf("setting")} peek={setPeek} onConfirm={() => confirm("setting")} />;
    if (step === "framing") return <FramingPanel st={st} up={up} idx={idxOf("framing")} onConfirm={() => confirm("framing")} />;
    if (step === "quality") return <QualityPanel st={st} up={up} idx={idxOf("quality")} onConfirm={() => confirm("quality")} />;
    return null;
  };

  const bandKey = saved ? "saved" : `${st.phase}-${st.step}-${st.step === "product" || st.step === "shoot" ? st.uploadStage : ""}`;

  return (
    <main className={`${css.page} ink`}>
      {/* the dashboard's ground, at rest */}
      <div className={css.ground} aria-hidden>
        <img src="/img/bg-silk.jpg" alt="" />
        <div className={css.dots} />
        <div className="grain" />
      </div>

      <Masthead
        section={{ en: "Atelier", tr: "Atelier" }}
        center={<FlowSwitch current={flow.slug} />}
        aside={
          setup && st.confirmed.length > 0 ? (
            <button className={css.save} onClick={save}>
              {t({ en: "Save and exit", tr: "Kaydet ve çık" })}
            </button>
          ) : null
        }
      />

      <section className={css.canvas} aria-label={t({ en: "The chain", tr: "Zincir" })}>
        <Chain nodes={chain.map(nodeFor)} wiring={wiring} focus={setup ? (st.step as NodeKind) : undefined} />
      </section>

      <div className={css.foot}>
        <div key={bandKey} className={css.bandWrap}>
          {band()}
        </div>
      </div>
    </main>
  );
}

/* the flow you are in, and a way across to the others (W-F-04) */
function FlowSwitch({ current }: { current: FlowSlug }) {
  const { t } = useAtelier();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const flow = flowBySlug(current)!;
  return (
    <div className={css.switch} ref={box}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        {t(flow.name)} <Chevron size={11} dir="down" />
      </button>
      {open && (
        <ul className={css.switchList} role="menu">
          {FLOWS.map((f) => (
            <li key={f.slug} role="none">
              {f.status === "open" ? (
                <Link role="menuitem" href={`/flow/${f.slug}`} className={f.slug === current ? css.here : undefined} onClick={() => setOpen(false)}>
                  {t(f.name)}
                  <span>{t(f.caption)}</span>
                </Link>
              ) : (
                <span className={css.soon}>
                  {t(f.name)}
                  <span>{t({ en: "Soon", tr: "Yakında" })}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* framing, drawn: one small frame per angle */
function Schema({ angles }: { angles: string[] }) {
  return (
    <span className={css.schema}>
      {angles.map((a) => (
        <span key={a}>{ANGLES.find((x) => x.id === a)?.short}</span>
      ))}
    </span>
  );
}

function RatioMark({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(":").map(Number);
  return (
    <span className={css.ratioMark} style={{ aspectRatio: `${w} / ${h}` }}>
      {ratio}
    </span>
  );
}

/* the result node while the work runs: frames develop one by one */
function Developing({ planned, done }: { planned: Frame[]; done: number }) {
  return (
    <span className={css.dev} data-n={Math.min(planned.length, 4)}>
      {planned.slice(0, 4).map((f, i) => (
        <span key={f.id} className={i < done ? css.in : undefined}>
          {i < done && !f.failed && <img src={f.src} alt="" />}
        </span>
      ))}
    </span>
  );
}
