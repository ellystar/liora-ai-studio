import {
  ANGLES,
  SAMPLE_PRO,
  SAMPLE_SHOOT,
  type Angle,
  type FlowDef,
  type Frame,
  type Job,
  type NodeKind,
  type Ratio,
  type Upload,
} from "@/lib/data";
import { exploreOut, setById, type SetId } from "../explore/sets";

/* ─────────────────────────────────────────────────────────────
   One surface, many flows. A flow is only its node skeleton; the
   steps on the left are derived from it, so a new flow is data.
   ───────────────────────────────────────────────────────────── */

export type StepId = NodeKind | "summary";
export type Phase = "intro" | "setup" | "producing" | "done";

export interface FlowState {
  phase: Phase;
  step: StepId;
  editing: boolean;
  uploadStage: "empty" | "analyzing" | "review";
  uploads: Upload[];
  errors: string[];
  isFlat: boolean;
  ghost: "none" | "suggested" | "accepted" | "skipped";
  castId?: string;
  settingId?: string;
  angles: Angle[];
  styling: string;
  ratio: Ratio;
  quality: "standard" | "high";
  confirmed: NodeKind[];
  jobId?: string;
  sampleSet?: SetId; // Explore: a sample set, one free frame
}

export const emptyState = (intro: boolean): FlowState => ({
  phase: intro ? "intro" : "setup",
  step: "product",
  editing: false,
  uploadStage: "empty",
  uploads: [],
  errors: [],
  isFlat: false,
  ghost: "none",
  angles: ["front", "threeQuarter", "back"],
  styling: "",
  ratio: "3:4",
  quality: "standard",
  confirmed: [],
});

/* The chain actually shown: campaign grows a GHOST node when the system
   detects a flat shot (C1-F-02); the user can take it out again. */
export function chainFor(flow: FlowDef, st: FlowState): NodeKind[] {
  if (flow.slug === "campaign" && (st.ghost === "suggested" || st.ghost === "accepted")) {
    return ["product", "ghost", ...flow.nodes.slice(1)];
  }
  return flow.nodes;
}

/* Nodes that are decisions the user makes on the left. */
export function decisionNodes(flow: FlowDef, st: FlowState): NodeKind[] {
  return chainFor(flow, st).filter((n) => {
    if (n === "result") return false;
    if (flow.locked?.includes(n)) return false;
    if (flow.slug === "ghost" && n === "ghost") return false; // process node, no decision
    return true;
  });
}

export function firstInput(flow: FlowDef): NodeKind {
  return flow.nodes[0];
}

export function isFilled(n: NodeKind, flow: FlowDef, st: FlowState): boolean {
  if (flow.locked?.includes(n)) return true;
  if (n === "result") return false;
  if (flow.slug === "ghost" && n === "ghost") return false;
  return st.confirmed.includes(n);
}

export function nextStep(flow: FlowDef, st: FlowState): StepId {
  const d = decisionNodes(flow, st);
  const open = d.find((n) => !st.confirmed.includes(n));
  return open ?? "summary";
}

export function frameCount(flow: FlowDef, st: FlowState): number {
  if (flow.slug === "ghost") return Math.max(1, st.uploads.length);
  if (flow.slug === "recast") return Math.max(1, st.uploads.length);
  return st.angles.length;
}

export function cost(flow: FlowDef, st: FlowState) {
  return frameCount(flow, st) * flow.creditPerFrame;
}

/* What the production delivers. The prototype has one art-directed shoot,
   so outputs are fixed images; the meta still reflects the user's choices. */
export function plannedFrames(flow: FlowDef, st: FlowState, jobId: string, failOne: boolean): Frame[] {
  let frames: Frame[];
  if (st.sampleSet) return [{ id: `${jobId}-1`, angle: "front", src: exploreOut(st.sampleSet, flow.slug) }];
  if (flow.slug === "ghost") {
    const srcs = ["/img/home/ghost-in.jpg", "/img/flow/coat-back.jpg", "/img/flow/coat-detail.jpg"];
    frames = st.uploads.map((u, i) => ({
      id: `${jobId}-${i + 1}`,
      angle: "front" as Angle,
      src: u.src.includes("flat-in") ? "/img/home/ghostflow-out.jpg" : srcs[i % srcs.length],
    }));
  } else if (flow.slug === "recast") {
    frames = st.uploads.map((u, i) => ({ id: `${jobId}-${i + 1}`, angle: "front" as Angle, src: "/img/home/recast-out.jpg" }));
  } else {
    /* one art-directed shoot per sample: the camel coat on Ada, or the cardigan */
    const knit = st.uploads[0]?.src.includes("flat-in");
    frames = st.angles.map((a, i) => ({
      id: `${jobId}-${i + 1}`,
      angle: a,
      src: knit ? "/img/home/campaignflat-out.jpg" : ANGLES.find((x) => x.id === a)!.out,
    }));
  }
  if (failOne && frames.length > 1) frames[frames.length - 1] = { ...frames[frames.length - 1], failed: true };
  return frames;
}

/* Seeded drafts from the dashboard carry no saved state; rebuild one so
   "Continue" opens with the nodes already filled (D-F-22). */
export function stateFromDraft(job: Job, flow: FlowDef): FlowState {
  if (job.draftState) return { ...(job.draftState as FlowState), phase: "setup", editing: false };
  const st = emptyState(false);
  if (job.id === "j-belt") {
    return {
      ...st,
      uploads: [{ id: "b1", src: "/img/flow/belt.jpg", name: "belt.jpg", slot: "front" }],
      uploadStage: "review",
      castId: "ada",
      confirmed: ["product", "cast"],
      step: "setting",
    };
  }
  if (job.id === "j-dress") {
    return { ...st, uploads: SAMPLE_SHOOT, uploadStage: "review", confirmed: ["shoot"], step: "cast" };
  }
  return { ...st, step: firstInput(flow) };
}

export function sampleFor(flow: FlowDef, set?: string | null): Upload[] {
  const fromExplore = setById(set);
  if (fromExplore) return fromExplore.uploads;
  if (flow.slug === "recast" || flow.slug === "restyle") return SAMPLE_SHOOT;
  return SAMPLE_PRO;
}
