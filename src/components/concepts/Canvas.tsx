"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { EMPTY_PROFILE, suggestCast, suggestSetting } from "@/lib/brand";
import { readGuest, writeGuest } from "@/lib/guest";
import { ANGLES, RATIOS, ROLE_META, SAMPLE_PRO, SLOTS, type Angle, type NodeKind, type Frame as JobFrame, type Job, type L, type Ratio, type Setting } from "@/lib/data";
import { catalogOf, useAtelier, type Setup, type Shot } from "@/lib/store";
import { downloadImage, fileName } from "@/lib/download";
import { CATEGORY_LABEL, SLOT_LABEL, Upload, guessCategory, looksFlat, readShots, type Asset, type Category, type Product as Piece, type Rules, type ShotSlot } from "./Upload";
import { Seam } from "../Seam";
import { Arrow, ArrowLeft, Check, Chevron, Close, Lock } from "../icons";
import { ConceptShell } from "./Chrome";
import { Card, EDITORIAL, FLY, flyTo, morph } from "./Choice";
import { canUse } from "./useConcept";
import base from "./Concept.module.css";
import ch from "./Choice.module.css";
import css from "./Canvas.module.css";

/* Concept E — the canvas. Behaviour: docs/kanvas-davranis.md.

   One selection pattern for every production flow: the canvas holds still;
   on desktop a step opens in a fixed layer on the right, below 1200 px as a
   full-screen step. A flow only says which nodes it has, of which kind and
   where they sit; the panel's content follows the node's kind, its
   behaviour never changes.

   Kinds of node:
   · input    what the user brought (a product, a shoot, frames) — shown, not chosen
   · upload   the same, when the user brings their own: dropped, placed, confirmed
   · group    many products at once (batch): the grouping is checked and approved
   · check    something the system made that the user approves or remakes (a ghost)
   · cast     choose who wears it            (decision)
   · setting  choose where it is shot        (decision)
   · frames   choose which frames and ratio  (decision, several at once)
   · pick     choose one frame of the input  (decision, set for you)
   · kept     taken from the input and kept as it is — shown, not chosen */

type Node = "product" | "shoot" | "ghost" | "cast" | "setting" | "frames" | "pose" | "source" | "front" | "back";
type Kind = "input" | "upload" | "group" | "check" | "cast" | "setting" | "frames" | "pick" | "kept";
type St = "empty" | "next" | "set" | "attention" | "kept" | "working" | "review";
type Phase = "idle" | "making" | "review" | "approved";
export type FlowId = "campaign" | "recast" | "ghost" | "restyle" | "turn" | "batch";

interface Frame {
  id: string;
  label: L;
  img: string;
}
interface Ghost {
  id: string;
  label: L;
  before: string;
  out: string;
  redo: string; // what a remake brings
}
/* where a node sits. x, y: centre in % of the canvas; w: picture width in
   cqw, capped by ih (picture height in cqh). fx: on desktop, a fraction of
   the room left of the panel. cx, cy, cw: beside the split panel (compare). */
interface Place {
  x: number;
  fx: number;
  y: number;
  w: number;
  ih: number;
  ar: string;
  cx: number;
  cy: number;
  cw: number;
}
interface Step {
  id: Node;
  kind: Kind;
  at: Place;
  label: L;
}
interface FlowSpec {
  id: FlowId;
  name: L;
  item: L;
  steps: Step[];
  result: string; // where the result leads
  input: Frame[];
  inputQ: L;
  per: number; // credits a frame
  fixed?: number; // or one price for the run (video)
  outs?: Partial<Record<Angle, string>>; // this product's own frames, by angle (a sample set)
  out?: string; // …and the one used where an angle has none
  ghosts?: Ghost[]; // a ghost to approve
  auto?: boolean; // the ghost is prepared on arrival, before any decision
  output: Place;
  coach: [L, L][];
}

/* Desktop: decisions are placed by fx, a fraction of the room left of the
   panel (the screen minus the panel and 62 px), so the panel never touches
   them. x is the plain % used below 1200 px. */
const P = {
  product: { x: 14, fx: 0.24, y: 50, w: 18, ih: 62, ar: "3 / 4", cx: 27, cy: 34, cw: 36 },
  cast: { x: 33, fx: 0.55, y: 35, w: 10, ih: 30, ar: "3 / 4", cx: 73, cy: 20, cw: 21 },
  setting: { x: 47, fx: 0.785, y: 64, w: 12, ih: 24, ar: "4 / 3", cx: 73, cy: 51, cw: 26 },
  frames: { x: 57, fx: 0.92, y: 36, w: 8.5, ih: 18, ar: "4 / 3", cx: 27, cy: 77, cw: 22 },
  output: { x: 82, fx: 0, y: 55, w: 12, ih: 24, ar: "4 / 3", cx: 73, cy: 80, cw: 26 },
  previous: { x: 82, fx: 0, y: 24, w: 8, ih: 14, ar: "4 / 3", cx: 0, cy: 0, cw: 0 },
  tall: { x: 82, fx: 0, y: 50, w: 11, ih: 40, ar: "3 / 4", cx: 73, cy: 78, cw: 20 },
  /* ghost */
  gFlat: { x: 24, fx: 0.3, y: 50, w: 20, ih: 62, ar: "3 / 4", cx: 27, cy: 38, cw: 34 },
  gGhost: { x: 54, fx: 0.78, y: 50, w: 14, ih: 46, ar: "3 / 4", cx: 73, cy: 34, cw: 26 },
  /* restyle */
  rShoot: { x: 13, fx: 0.18, y: 40, w: 13, ih: 44, ar: "3 / 4", cx: 25, cy: 26, cw: 28 },
  rGhost: { x: 13, fx: 0.18, y: 81, w: 10, ih: 17, ar: "4 / 3", cx: 73, cy: 20, cw: 24 },
  rCast: { x: 34, fx: 0.46, y: 33, w: 9, ih: 28, ar: "3 / 4", cx: 25, cy: 70, cw: 18 },
  rSetting: { x: 49, fx: 0.69, y: 64, w: 11, ih: 22, ar: "4 / 3", cx: 73, cy: 52, cw: 24 },
  rFrames: { x: 61, fx: 0.9, y: 34, w: 8, ih: 17, ar: "4 / 3", cx: 73, cy: 84, cw: 20 },
  /* turn */
  tSource: { x: 16, fx: 0.2, y: 50, w: 17, ih: 36, ar: "4 / 3", cx: 27, cy: 30, cw: 34 },
  tFront: { x: 40, fx: 0.56, y: 33, w: 10, ih: 32, ar: "3 / 4", cx: 73, cy: 26, cw: 20 },
  tBack: { x: 56, fx: 0.84, y: 65, w: 10, ih: 32, ar: "3 / 4", cx: 27, cy: 74, cw: 20 },
} satisfies Record<string, Place>;

const placeVars = (p: Place) => {
  const [w, h] = p.ar.split("/").map(Number);
  return { "--x": p.x, "--fx": p.fx, "--y": p.y, "--w": p.w, "--ih": p.ih, "--ar": p.ar, "--arn": w / h, "--cx": p.cx, "--cy": p.cy, "--cw": p.cw } as CSSProperties;
};

const LBL = {
  product: { en: "Product", tr: "Ürün" },
  shoot: { en: "Shoot", tr: "Çekim" },
  flat: { en: "Flat lay", tr: "Flat çekim" },
  ghost: { en: "Ghost", tr: "Ghost" },
  cast: { en: "Cast", tr: "Cast" },
  setting: { en: "Setting", tr: "Ortam" },
  frames: { en: "Frames", tr: "Kareler" },
  pose: { en: "Pose and light", tr: "Poz ve ışık" },
  front: { en: "Front", tr: "Ön" },
  back: { en: "Back", tr: "Arka" },
  turn: { en: "Three-quarter", tr: "Üç çeyrek" },
} satisfies Record<string, L>;

const COAT: L = { en: "Camel wool coat", tr: "Kamel yün kaban" };

/* the shoot a Recast starts from: one model, one backdrop, three poses */
const SHOOT = [
  { id: "front", label: LBL.front, img: "/img/home/onmodel-in.jpg", out: "/img/home/recast-out.jpg" },
  { id: "turn", label: LBL.turn, img: "/img/explore/dress-turn.jpg", out: "/img/explore/dress-turn.jpg" },
  { id: "back", label: LBL.back, img: "/img/explore/dress-back.jpg", out: "/img/explore/dress-back.jpg" },
];
const SHOOT_SETTING: L = { en: "Paper backdrop studio", tr: "Kâğıt fon stüdyo" };

/* a batch: products grouped from their file names; one has no front, two images match nothing (wf-13 · 02) */
interface Product {
  code: string;
  name: L;
  img: string;
  frames: L[];
  outs: Partial<Record<Angle, string>>;
  out: string; // the frame used where an angle has none of its own
}
const DETAIL: L = { en: "Detail", tr: "Detay" };
const BATCH: Product[] = [
  { code: "LW-201", name: COAT, img: "/img/home/ghost-in.jpg", frames: [LBL.front, LBL.back, DETAIL], outs: Object.fromEntries(ANGLES.map((a) => [a.id, a.out])), out: "/img/flow/out-front.jpg" },
  { code: "LW-202", name: { en: "Cream cable cardigan", tr: "Krem örgü hırka" }, img: "/img/home/ghostflow-out.jpg", frames: [LBL.front], outs: {}, out: "/img/home/campaignflat-out.jpg" },
  { code: "LW-203", name: { en: "White poplin shirt", tr: "Beyaz poplin gömlek" }, img: "/img/explore/shirt-front.jpg", frames: [LBL.front, LBL.back, DETAIL], outs: {}, out: "/img/home/sample-out.jpg" },
  { code: "LW-204", name: { en: "Black turtleneck", tr: "Siyah balıkçı" }, img: "/img/flow/knit.jpg", frames: [LBL.front], outs: {}, out: "/img/flow/out-seated.jpg" },
  { code: "LW-205", name: { en: "Leather belt", tr: "Deri kemer" }, img: "/img/flow/belt.jpg", frames: [DETAIL], outs: {}, out: "/img/flow/out-detail.jpg" },
];
const UNMATCHED = ["/img/flow/coat-detail.jpg", "/img/explore/shirt-detail.jpg"];
type Row = "ok" | "front" | "out"; // ready · no front frame · left out of this batch

const TOUCH: [L, L] = [
  { en: "Touch a node.", tr: "Bir node'a dokun." },
  { en: "Choosing is enough; the next step comes on its own.", tr: "Seçmen yeterli; sonraki adım kendiliğinden gelir." },
];
const MAKE: [L, L] = [
  { en: "Make it when ready.", tr: "Hazır olunca üret." },
  { en: "Results are added here; earlier ones stay.", tr: "Sonuç buraya eklenir; öncekiler kalır." },
];

type Opts = { sample: string | null; from: string | null; product?: string | null };

/* an approved ghost carried into a campaign: which product it is (G-F-05) */
const GHOSTED: Record<string, { item: L; out?: string }> = {
  "/img/home/ghost-in.jpg": { item: COAT },
  "/img/product-coat-front.jpg": { item: COAT },
  "/img/home/ghostflow-out.jpg": { item: { en: "Cream cable cardigan", tr: "Krem örgü hırka" }, out: "/img/home/campaignflat-out.jpg" },
};

const FLOWS: Record<FlowId, (o: Opts) => FlowSpec> = {
  campaign: ({ sample, product }) => ({
    id: "campaign",
    name: { en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" },
    ...(product && GHOSTED[product]
      ? { item: GHOSTED[product].item, input: [{ id: "front", label: LBL.front, img: product }], out: GHOSTED[product].out }
      : sample === "shirt"
      ? {
          item: { en: "White poplin shirt", tr: "Beyaz poplin gömlek" },
          input: [
            { id: "front", label: LBL.front, img: "/img/explore/shirt-front.jpg" },
            { id: "back", label: LBL.back, img: "/img/explore/shirt-back.jpg" },
            { id: "detail", label: { en: "Detail", tr: "Detay" }, img: "/img/explore/shirt-detail.jpg" },
          ],
          out: "/img/home/sample-out.jpg",
        }
      : {
          item: COAT,
          input: SAMPLE_PRO.map((u) => ({ id: u.id, label: SLOTS.find((x) => x.id === u.slot)!.label, img: u.src })),
        }),
    steps: [
      { id: "product", kind: "input", at: P.product, label: LBL.product },
      { id: "cast", kind: "cast", at: P.cast, label: LBL.cast },
      { id: "setting", kind: "setting", at: P.setting, label: LBL.setting },
      { id: "frames", kind: "frames", at: P.frames, label: LBL.frames },
    ],
    result: "/jobs/j-coat",
    inputQ: { en: "Your product.", tr: "Ürünün." },
    per: 1,
    output: P.output,
    coach: [[{ en: "A system for this product.", tr: "Bu ürün için bir sistem kuruldu." }, { en: "Product, cast, setting, frames.", tr: "Ürün, cast, ortam, kareler." }], TOUCH, MAKE],
  }),
  recast: () => ({
    id: "recast",
    name: { en: "Model Swap", tr: "Model Swap" },
    item: { en: "Black rib dress", tr: "Siyah fitilli elbise" },
    steps: [
      { id: "shoot", kind: "input", at: P.product, label: LBL.shoot },
      { id: "cast", kind: "cast", at: P.cast, label: LBL.cast },
      { id: "setting", kind: "kept", at: P.setting, label: LBL.setting },
      { id: "pose", kind: "kept", at: P.frames, label: LBL.pose },
    ],
    result: "/jobs",
    input: SHOOT,
    inputQ: { en: "Your shoot.", tr: "Çekimin." },
    per: 1,
    output: P.output,
    coach: [[{ en: "Only the model changes.", tr: "Yalnızca manken değişir." }, { en: "Setting, pose and light stay as shot.", tr: "Ortam, poz ve ışık çekildiği gibi kalır." }], TOUCH, MAKE],
  }),
  ghost: ({ sample }) => {
    const knit = sample === "cardigan";
    const flat = knit ? "/img/home/flat-in.jpg" : "/img/input-flat.jpg";
    return {
      id: "ghost",
      name: { en: "Flat to Ghost", tr: "Flat'ten Ghost'a" },
      item: knit ? { en: "Cream cable cardigan", tr: "Krem örgü hırka" } : COAT,
      steps: [
        { id: "product", kind: "input", at: P.gFlat, label: LBL.flat },
        { id: "ghost", kind: "check", at: P.gGhost, label: LBL.ghost },
      ],
      result: "/library",
      input: [{ id: "front", label: LBL.front, img: flat }],
      inputQ: { en: "Your flat lay.", tr: "Flat çekimin." },
      per: 1,
      ghosts: [
        knit
          ? { id: "front", label: LBL.front, before: flat, out: "/img/home/ghostflow-out.jpg", redo: "/img/home/ghostflow-out.jpg" }
          : { id: "front", label: LBL.front, before: flat, out: "/img/home/ghost-in.jpg", redo: "/img/product-coat-front.jpg" },
      ],
      output: P.tall,
      coach: [
        [{ en: "From a phone photo to a packshot.", tr: "Telefon fotoğrafından katalog karesi." }, { en: "Make it, then check the ghost.", tr: "Üret, sonra ghost'u kontrol et." }],
        [{ en: "Check the ghost.", tr: "Ghost'u kontrol et." }, { en: "Approve it, or make that frame again.", tr: "Doğruysa onayla, değilse yeniden üret." }],
        [{ en: "The approved ghost is yours.", tr: "Onaylanan ghost senin." }, { en: "Download it, or take it to a campaign.", tr: "İndir ya da kampanyaya taşı." }],
      ],
    };
  },
  restyle: () => ({
    id: "restyle",
    name: { en: "Look Composer", tr: "Look Composer" },
    item: COAT,
    steps: [
      { id: "shoot", kind: "input", at: P.rShoot, label: LBL.shoot },
      { id: "ghost", kind: "check", at: P.rGhost, label: LBL.ghost },
      { id: "cast", kind: "cast", at: P.rCast, label: LBL.cast },
      { id: "setting", kind: "setting", at: P.rSetting, label: LBL.setting },
      { id: "frames", kind: "frames", at: P.rFrames, label: LBL.frames },
    ],
    result: "/jobs",
    input: [
      { id: "front", label: LBL.front, img: "/img/out-front-edit.jpg" },
      { id: "back", label: LBL.back, img: "/img/flow/out-back.jpg" },
    ],
    inputQ: { en: "Your shoot.", tr: "Çekimin." },
    per: 2,
    ghosts: [
      { id: "front", label: LBL.front, before: "/img/out-front-edit.jpg", out: "/img/product-coat-front.jpg", redo: "/img/home/ghost-in.jpg" },
      { id: "back", label: LBL.back, before: "/img/flow/out-back.jpg", out: "/img/product-coat-back.jpg", redo: "/img/flow/coat-back.jpg" },
    ],
    auto: true,
    output: P.output,
    coach: [[{ en: "Start from your shoot.", tr: "Çekiminden başla." }, { en: "Turn it into a ghost if you like; then a new cast, setting and frames.", tr: "İstersen ghost'a dönüştür; sonra yeni kast, ortam ve kareler." }], TOUCH, MAKE],
  }),
  batch: () => ({
    id: "batch",
    name: { en: "Batch campaign", tr: "Toplu kampanya" },
    item: { en: "Winter ’26 drop", tr: "Kış ’26 serisi" },
    steps: [
      { id: "product", kind: "group", at: P.product, label: { en: "Products", tr: "Ürünler" } },
      { id: "cast", kind: "cast", at: P.cast, label: LBL.cast },
      { id: "setting", kind: "setting", at: P.setting, label: LBL.setting },
      { id: "frames", kind: "frames", at: P.frames, label: LBL.frames },
    ],
    result: "/jobs",
    input: BATCH.map((b) => ({ id: b.code, label: b.name, img: b.img })),
    inputQ: { en: "Are the products grouped right?", tr: "Ürünler doğru gruplandı mı?" },
    per: 1,
    output: P.output,
    coach: [[{ en: "Many products, one setup.", tr: "Çok ürün, tek kurulum." }, { en: "Check the grouping; the cast, setting and frames apply to all.", tr: "Gruplamayı onayla; cast, ortam ve kareler hepsine uygulanır." }], TOUCH, MAKE],
  }),
  turn: ({ from }) => {
    const coat = from === "campaign";
    return {
      id: "turn",
      name: { en: "180° Product Video", tr: "180° Ürün Videosu" },
      item: coat ? COAT : { en: "Black rib dress", tr: "Siyah fitilli elbise" },
      steps: [
        { id: "source", kind: "input", at: P.tSource, label: LBL.frames },
        { id: "front", kind: "pick", at: P.tFront, label: LBL.front },
        { id: "back", kind: "pick", at: P.tBack, label: LBL.back },
      ],
      result: "/jobs",
      input: coat
        ? ANGLES.map((a) => ({ id: a.id, label: a.label, img: a.out }))
        : [
            { id: "front", label: LBL.front, img: "/img/home/onmodel-in.jpg" },
            { id: "turn", label: LBL.turn, img: "/img/explore/dress-turn.jpg" },
            { id: "back", label: LBL.back, img: "/img/explore/dress-back.jpg" },
          ],
      inputQ: coat ? { en: "From your campaign.", tr: "Kampanyandan." } : { en: "Your frames.", tr: "Karelerin." },
      per: 0,
      fixed: 4,
      output: P.tall,
      coach: [[{ en: "Front and back, turned into 5 seconds.", tr: "Ön ve arkadan 5 saniyelik dönüş." }, { en: "Frames are picked for you; change them if you like.", tr: "Kareler seçildi; istersen değiştir." }], TOUCH, MAKE],
    };
  },
};

const DECIDE: Kind[] = ["upload", "group", "check", "cast", "setting", "frames", "pick"];
const COUNT: Record<number, L> = {
  1: { en: "One decision", tr: "Tek karar" },
  2: { en: "Two decisions", tr: "İki karar" },
  3: { en: "Three decisions", tr: "Üç karar" },
  4: { en: "Four decisions", tr: "Dört karar" },
  5: { en: "Five decisions", tr: "Beş karar" },
  6: { en: "Six decisions", tr: "Altı karar" },
};
const countOf = (n: number): L => COUNT[n] ?? { en: `${n} decisions`, tr: `${n} karar` };

interface RunRec {
  id: number;
  key: string;
  cast: string;
  setting: L;
  frames: { id: string; out: string; before: string }[];
  done: number;
  finished: boolean;
  video?: string[]; // a turn: the frames it passes through
  meta?: L;
  jobId?: string; // the job it became, in Jobs
}

const STATE: Record<St, L> = {
  empty: { en: "Waiting", tr: "Bekliyor" },
  next: { en: "Up next", tr: "Sırada" },
  set: { en: "Set", tr: "Hazır" },
  attention: { en: "Check", tr: "Kontrol et" },
  kept: { en: "From the shoot", tr: "Çekimden" },
  working: { en: "Preparing", tr: "Hazırlanıyor" },
  review: { en: "To approve", tr: "Onay bekliyor" },
};

/* below 1200 px the panel cannot sit beside the decisions: it becomes a full-screen step */
const NARROW = "(max-width: 1199px)";
const onNarrow = (cb: () => void) => {
  const m = window.matchMedia(NARROW);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/* on a phone, flows are not set up (wf-14): the screen says so and points to what does work there */
const PHONE = "(max-width: 767px)";
const onPhone = (cb: () => void) => {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/* a setting described in words — a Partner capability */
const CUSTOM_POSE_IMG = "/img/salon/r1-s.jpg"; // placeholder until a described pose is really made
const CUSTOM: Setting = { id: "custom", name: { en: "Your setting", tr: "Senin ortamın" }, img: "/img/flow/set-library.jpg", minRole: "partner", own: true };

/* a new job's id and times — only ever called from an action, never while rendering */
const now = () => Date.now();
const newJobId = (flow: string) => `j-${flow}-${now().toString(36)}`;

const ADVANCE = 540;
const PREPARE = 2600;
const FIRST = { cast: 6, setting: 4 }; // how many answers show before "See all" (split only)

interface Cable {
  id: string;
  d: string;
  a: [number, number]; // where it leaves a node
  b: [number, number]; // where it meets the next
  v: boolean; // one node under the other: the bars lie flat
  la: number; // the port bars' length at each end
  lb: number;
}

/* the dashboard's cable: a soft S between two ports */
const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const k = Math.max(50, Math.abs(x2 - x1) * 0.5) * (x2 >= x1 ? 1 : -1);
  return `M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
};

/* the canvas can be zoomed and moved; at rest it fits the screen */
type View = { z: number; x: number; y: number };
const REST: View = { z: 1, x: 0, y: 0 };
const ZMIN = 0.5;
const ZMAX = 2;
const clampZ = (z: number) => Math.min(ZMAX, Math.max(ZMIN, z));

export function Canvas({
  flow: flowId = "campaign",
  mod = false,
  sample = null,
  from = null,
  split = false,
  initialCast = null,
  initialSetting = null,
  product = null,
  draft = null,
}: {
  flow?: FlowId;
  mod?: boolean; // ?mod — review tools (the concept and flow switchers, the panel comparison)
  sample?: string | null; // ?sample — arriving from a sample set: the product is ours, the first frame is free
  from?: string | null; // ?from — where the input comes from (a turn from a campaign result)
  split?: boolean; // ?panel=split — open with the earlier half-and-half panel
  initialCast?: string | null; // ?cast — arriving from the library or Cast Studio: the cast node comes set (K-F-11)
  initialSetting?: string | null; // ?setting — the same for a setting (L-F-03)
  product?: string | null; // ?product — an approved ghost carried in from Flat to Ghost
  draft?: string | null; // ?draft — a saved setup, opened where it was left
}) {
  const { t, s, set, dispatch } = useAtelier();
  const router = useRouter();
  const partner = canUse(s.role, "partner");
  /* a saved setup opens where it was left (?draft) — read once, on arrival */
  const [boot] = useState<Setup | undefined>(() => (draft ? s.setups[draft] : undefined));
  const q = boot?.query ?? { sample, from, product };
  const flow = useMemo(() => FLOWS[flowId]({ sample: q.sample, from: q.from, product: q.product }), [flowId, q.sample, q.from, q.product]);
  const isSample = q.sample !== null;
  /* the user brings their own unless the flow already has it (a sample, a carried ghost, a campaign's frames) */
  const wantsUpload = flowId !== "batch" && !isSample && !q.product && q.from !== "campaign";
  const steps = useMemo(() => flow.steps.map((st) => (st.kind === "input" && wantsUpload ? { ...st, kind: "upload" as Kind } : st)), [flow, wantsUpload]);
  const kindOf = (x: Node) => steps.find((st) => st.id === x)!.kind;
  const labelOf = (x: Node) => t(steps.find((st) => st.id === x)!.label);
  const decisions = steps.filter((st) => DECIDE.includes(st.kind)).map((st) => st.id);

  /* the first visit to a flow: a short walk-through (W-F-03), once per flow, reopenable */
  const [introStep, setIntroStep] = useState(0);
  /* the selection panel, two ways, to compare: "overlay" floats over a canvas
     that never moves; "split" is the earlier half-and-half. */
  const [panel, setPanel] = useState<"overlay" | "split">(split ? "split" : "overlay");
  const [leaving, setLeaving] = useState(false);
  const [open, setOpen] = useState<Node | null>(null);
  const [allFor, setAllFor] = useState<Node | null>(null); // the step whose full list is showing (split)
  const narrow = useSyncExternalStore(onNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const phone = useSyncExternalStore(onPhone, () => window.matchMedia(PHONE).matches, () => false);
  const layout: "overlay" | "sheet" | "split" = panel === "split" ? "split" : narrow ? "sheet" : "overlay";
  const all = layout !== "split" || (allFor !== null && allFor === open);
  const setAll = (v: boolean) => setAllFor(v ? open : null);
  const [castId, setCastId] = useState<string | undefined>(boot?.castId ?? initialCast ?? undefined);
  const [settingId, setSettingId] = useState<string | undefined>(boot?.settingId ?? initialSetting ?? undefined);
  const [prompt, setPrompt] = useState("");
  const [described, setDescribed] = useState<string | null>(boot?.described ?? null);
  const [making, setMaking] = useState(false);
  /* the panels' filters, and what a Partner describes or keeps */
  const [castFilter, setCastFilter] = useState<"all" | "woman" | "man" | "fav" | "own">("all");
  const [settingFilter, setSettingFilter] = useState<"all" | "studio" | "outdoor" | "own">("all");
  const [poseFilter, setPoseFilter] = useState<"all" | "mine" | "fav">("all");
  const [myPoses, setMyPoses] = useState<string[]>(boot?.myPoses ?? []);
  const [customPose, setCustomPose] = useState<string | null>(boot?.customPose ?? null);
  const [posePrompt, setPosePrompt] = useState("");
  const [poseMaking, setPoseMaking] = useState(false);
  const [angles, setAngles] = useState<Angle[]>(boot?.angles ?? ["front", "threeQuarter", "back"]);
  const [ratio, setRatio] = useState<string>(boot?.ratio ?? "3:4");
  const [framesOk, setFramesOk] = useState(boot?.framesOk ?? false);
  /* what the user brought: dropped, placed, confirmed */
  /* a campaign keeps its products apart: a draft from before products existed becomes one product */
  const legacy = flowId === "campaign" && !boot?.products && !!boot?.shots?.length;
  const [shots, setShots] = useState<Shot[]>(() => (legacy ? boot!.shots!.map((x) => ({ ...x, product: x.product ?? "p1", slot: x.slot === "complement" || x.slot === "accessory" ? "detail" : x.slot })) : (boot?.shots ?? [])));
  const [products, setProducts] = useState<Piece[]>(() => boot?.products ?? (legacy ? [{ id: "p1", category: guessCategory(boot?.item ?? "") }] : []));
  const [tuck, setTuck] = useState<"in" | "out" | undefined>(boot?.tuck);
  const [shotsOk, setShotsOk] = useState(boot?.shotsOk ?? false);
  const [uploadErrors, setUploadErrors] = useState<L[]>([]);
  const [itemName, setItemName] = useState(boot?.item ?? "");
  /* where the user moved the nodes (W-F-09 relaxed: move only — no wiring, adding or deleting) */
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>(boot?.moved ?? {});
  const [runs, setRuns] = useState<RunRec[]>([]);
  const [landing, setLanding] = useState<Node | null>(null);
  const [busy, setBusy] = useState(false);
  /* a ghost to approve: made on "make" (ghost) or on arrival (restyle) */
  const optionalGhost = flowId === "restyle"; // turning the shoot into a ghost is the user's choice here (Elif)
  const [phase, setPhase] = useState<Phase>(() => (boot?.phase as Phase | undefined) ?? (flow.ghosts ? (flow.auto && !wantsUpload && !optionalGhost ? "making" : "idle") : "approved"));
  const [ghostSkip, setGhostSkip] = useState<boolean>(boot?.ghostSkip ?? false);
  const [redo, setRedo] = useState<Record<string, number>>(boot?.redo ?? {});
  const [remaking, setRemaking] = useState<string | null>(null);
  /* a turn: front and back, picked for the user */
  const [pick, setPick] = useState(
    () =>
      boot?.pick ?? {
        front: flow.input.find((f) => f.id === "front")?.id ?? flow.input[0].id,
        back: flow.input.find((f) => f.id === "back")?.id ?? flow.input[flow.input.length - 1].id,
      },
  );
  const [downloaded, setDownloaded] = useState(false);
  /* a batch: each product's state, the stray images, and whether the grouping is approved */
  const [rows, setRows] = useState<Record<string, Row>>(() => (boot?.rows as Record<string, Row>) ?? Object.fromEntries(BATCH.map((b) => [b.code, b.code === "LW-205" ? "front" : "ok"])));
  const [stray, setStray] = useState(boot?.stray ?? true);
  const [grouped, setGrouped] = useState(boot?.grouped ?? false);

  const [canvas, setCanvas] = useState<HTMLElement | null>(null);
  const [world, setWorld] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<View>(REST);
  const [panning, setPanning] = useState(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const thumbs = useRef<Record<string, HTMLElement | null>>({});
  const mini = useRef<Record<string, HTMLElement | null>>({}); // the flow strip on the full-screen step
  const panelEl = useRef<HTMLElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [cables, setCables] = useState<Cable[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => void timers.current.push(setTimeout(fn, ms));

  /* restyle: the ghost is being prepared when the user arrives */
  useEffect(() => {
    if (!flow.auto || phase !== "making") return;
    const id = setTimeout(() => setPhase((p) => (p === "making" ? "review" : p)), PREPARE);
    return () => clearTimeout(id);
  }, [flow.auto, phase]);

  /* live: the backend's cast and settings; demo: the prototype's */
  const cat = catalogOf(s);
  const own = cat.ownCasts;
  /* the brand's fit comes first and says why — the rest keep their order.
     Live, the fit waits: the suggestions name demo cards the catalogue lacks. */
  const fitCast = s.profile && !s.catalog ? suggestCast(s.profile, s.role) : null;
  const fitSetting = s.profile && !s.catalog ? suggestSetting(s.profile, s.role) : null;
  const castList = fitCast ? [fitCast, ...cat.casts.filter((x) => x.id !== fitCast.id)] : cat.casts;
  const settingList = fitSetting ? [fitSetting, ...cat.settings.filter((x) => x.id !== fitSetting.id)] : cat.settings;
  const FIT = { en: "Fits your brand", tr: "Markana göre" };
  const cast = [...own, ...cat.casts].find((x) => x.id === castId && !x.pending);
  const setting = settingId === "custom" ? CUSTOM : [...cat.ownSettings, ...cat.settings].find((x) => x.id === settingId);
  const ownSetting = settingId === "custom" || cat.ownSettings.some((o) => o.id === settingId);
  const angleOuts = angles.map((a) => ANGLES.find((x) => x.id === a)!);
  /* a restyle's own pieces sit beside the shoot, not in it */
  const baseShots = flowId === "campaign" ? shots : shots.filter((x) => !x.product);
  const own_ = wantsUpload && baseShots.length > 0;
  const input: Frame[] = own_ ? baseShots.map((sh) => ({ id: sh.id, label: SLOT_LABEL[sh.slot], img: sh.src })) : flow.input;
  const shoot = own_ ? input : SHOOT;
  const ghosts = flow.ghosts?.map((g, i) => (own_ ? { ...g, before: (baseShots.find((x) => x.slot === g.id) ?? baseShots[i] ?? baseShots[0]).src } : g));
  /* the name is optional (Elif): without one, the product is called by what it is */
  const mainCat = products[0]?.category;
  const itemL: L = itemName.trim()
    ? { en: itemName.trim(), tr: itemName.trim() }
    : wantsUpload
      ? mainCat
        ? { en: `${CATEGORY_LABEL[mainCat].en} piece`, tr: `${CATEGORY_LABEL[mainCat].tr} ürünü` }
        : { en: "New product", tr: "Yeni ürün" }
      : flow.item;
  const frameOf = (id: string) => input.find((f) => f.id === id) ?? input[0];
  const ghostOut = (g: Ghost) => ((redo[g.id] ?? 0) % 2 ? g.redo : g.out);
  /* what one run makes */
  const inBatch = BATCH.filter((b) => rows[b.code] === "ok");
  const problems = BATCH.filter((b) => rows[b.code] === "front").length + (stray ? 1 : 0);
  const outputs =
    flowId === "batch"
      ? inBatch.flatMap((b) => angleOuts.map((o) => ({ id: o.id, out: b.outs[o.id] ?? b.out, before: b.img })))
      : flowId === "recast"
      ? shoot.map((f, i) => ({ id: f.id, out: SHOOT[i % SHOOT.length].out, before: f.img }))
      : flowId === "turn"
        ? [{ id: "video", out: frameOf(pick.front).img, before: frameOf(pick.front).img }]
        : flowId === "ghost"
          ? ghosts!.map((g) => ({ id: g.id, out: ghostOut(g), before: g.before }))
          : [
              ...angleOuts.map((o) => ({ id: o.id, out: flow.outs?.[o.id] ?? flow.out ?? o.out, before: input[0].img })),
              ...myPoses.flatMap((id) => s.poses.filter((x) => x.id === id)).map((x) => ({ id: x.id, out: x.img, before: input[0].img })),
              ...(customPose ? [{ id: "custom-pose", out: CUSTOM_POSE_IMG, before: input[0].img }] : []),
            ];
  const n = outputs.length;
  /* the turn passes front → three-quarter → back */
  const spin = () => {
    const mid = input.find((x) => x.id !== pick.front && x.id !== pick.back && (own_ || x.id === "turn" || x.id === "threeQuarter"));
    return [frameOf(pick.front).img, (mid ?? frameOf(pick.front)).img, frameOf(pick.back).img];
  };

  /* ── states ── */
  const configured = (x: Node) => {
    const k = kindOf(x);
    return (
      k === "input" ||
      k === "kept" ||
      k === "pick" ||
      (k === "upload" && shotsOk) ||
      (k === "group" && grouped) ||
      (k === "check" && phase === "approved") ||
      (k === "cast" && !!cast) ||
      (k === "setting" && !!setting) ||
      (k === "frames" && framesOk)
    );
  };
  const issue = (x: Node) => {
    const k = kindOf(x);
    if (k === "cast") return !!cast?.own && !partner;
    if (k === "setting") return ownSetting && !partner;
    if (k === "pick") return x === "back" && pick.front === pick.back;
    return false;
  };
  const nextUp = decisions.find((x) => !configured(x)) ?? null;
  const attention = decisions.find(issue) ?? null;
  const state = (x: Node): St => {
    const k = kindOf(x);
    if (k === "kept") return "kept";
    if (k === "check") return phase === "idle" ? "empty" : phase === "making" ? "working" : phase === "review" ? "review" : "set";
    return issue(x) ? "attention" : configured(x) ? "set" : x === nextUp ? "next" : "empty";
  };
  const stateLabel = (x: Node, st: St) => (kindOf(x) === "check" && st === "set" ? (ghostSkip ? t({ en: "Skipped", tr: "Atlandı" }) : t({ en: "Approved", tr: "Onaylandı" })) : t(STATE[st]));
  const remaining = decisions.filter((x) => !configured(x)).length;

  const key =
    flowId === "recast"
      ? `cast:${castId}`
      : flowId === "turn"
        ? `${pick.front}|${pick.back}`
        : flowId === "ghost"
          ? "ghost"
          : `${flowId === "batch" ? inBatch.map((b) => b.code).join(",") : ""}|${castId}|${settingId}:${described ?? ""}|${angles.join(",")}|${ratio}`;
  const latest = runs.at(-1);
  const previous = runs.length > 1 ? runs.at(-2) : undefined;
  const running = !!latest && !latest.finished;
  const changed = !!latest && latest.key !== key;
  const compact = open !== null && layout === "split";

  /* what it costs: per frame (2 for a restyle), one price for a video; the first frame free on a sample set */
  const credits = flow.fixed ?? (isSample ? Math.max(0, n - 1) : n) * flow.per;
  const short = credits > s.credits;

  /* ── relations: thin lines between pictures, in the flow's order; vertical when one sits under the other ── */
  const measure = useCallback(() => {
    if (!world) return;
    const root = world.getBoundingClientRect();
    const z = root.width / world.offsetWidth || 1; // the zoom, read from the layer itself
    const X = (v: number) => (v - root.left) / z;
    const Y = (v: number) => (v - root.top) / z;
    const box = (id: string) => {
      const el = thumbs.current[id];
      const r = el?.getBoundingClientRect();
      if (!r || !r.width) return null;
      const c = el!.parentElement!.getBoundingClientRect(); // the plate: picture and words
      return { l: X(c.left), r: X(c.right), t: Y(c.top), b: Y(c.bottom), cx: X(r.left + r.width / 2), cy: Y(r.top + r.height / 2), w: r.width / z };
    };
    const next: Cable[] = [];
    const bar = (len: number) => Math.min(120, len * 0.42);
    const link = (a: string, b: string, id: string) => {
      const A = box(a);
      const B = box(b);
      if (!A || !B) return;
      /* one under the other: straight down, bars along the edges */
      if (Math.abs(B.cx - A.cx) < Math.min(A.w, B.w) / 2) {
        const down = B.cy > A.cy;
        const y1 = down ? A.b : A.t;
        const y2 = down ? B.t : B.b;
        const k = Math.max(30, Math.abs(y2 - y1) * 0.5) * (down ? 1 : -1);
        next.push({ id, d: `M ${A.cx} ${y1} C ${A.cx} ${y1 + k}, ${B.cx} ${y2 - k}, ${B.cx} ${y2}`, a: [A.cx, y1], b: [B.cx, y2], v: true, la: bar(A.r - A.l), lb: bar(B.r - B.l) });
        return;
      }
      /* side by side: from the middle of one edge to the middle of the next */
      const dir = B.cx >= A.cx ? 1 : -1;
      const x1 = dir > 0 ? A.r : A.l;
      const x2 = dir > 0 ? B.l : B.r;
      const [y1, y2] = [(A.t + A.b) / 2, (B.t + B.b) / 2];
      next.push({ id, d: curve(x1, y1, x2, y2), a: [x1, y1], b: [x2, y2], v: false, la: bar(A.b - A.t), lb: bar(B.b - B.t) });
    };
    const chain = flow.steps;
    chain.slice(1).forEach((st, i) => link(chain[i].id, st.id, st.id));
    const last = chain[chain.length - 1].id;
    link(last, "output", "output");
    if (!compact) link(last, "previous", "previous");
    setCables(next);
  }, [world, compact, flow]);

  useLayoutEffect(() => {
    measure();
  }, [measure, open, castId, settingId, framesOk, partner, runs.length, latest?.finished, phase, moved, shots.length]);
  useLayoutEffect(() => {
    if (!canvas) return;
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    canvas.querySelectorAll("[data-card]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [canvas, measure, open, runs.length]);

  /* ── zoom and move: pinch or ⌘/Ctrl + wheel zooms at the pointer, the wheel or a drag on the ground moves ── */
  const fitView = (v: View): View => {
    const w = canvas?.clientWidth ?? 0;
    const h = canvas?.clientHeight ?? 0;
    return { z: v.z, x: Math.min(w - 120, Math.max(-w * v.z + 120, v.x)), y: Math.min(h - 120, Math.max(-h * v.z + 120, v.y)) };
  };
  const zoomAt = (k: number, px?: number, py?: number) =>
    setView((v) => {
      const cx = px ?? (canvas?.clientWidth ?? 0) / 2;
      const cy = py ?? (canvas?.clientHeight ?? 0) / 2;
      const z = clampZ(v.z * k);
      const f = z / v.z;
      return fitView({ z, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f });
    });
  useEffect(() => {
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const k = Math.exp(-e.deltaY * 0.01);
        const [px, py] = [e.clientX - r.left, e.clientY - r.top];
        setView((v) => {
          const z = clampZ(v.z * k);
          const f = z / v.z;
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const x = px - (px - v.x) * f;
          const y = py - (py - v.y) * f;
          return { z, x: Math.min(w - 120, Math.max(-w * z + 120, x)), y: Math.min(h - 120, Math.max(-h * z + 120, y)) };
        });
      } else {
        setView((v) => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          return { ...v, x: Math.min(w - 120, Math.max(-w * v.z + 120, v.x - e.deltaX)), y: Math.min(h - 120, Math.max(-h * v.z + 120, v.y - e.deltaY)) };
        });
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvas]);
  const atRest = view.z === 1 && view.x === 0 && view.y === 0;
  const isGround = (el: EventTarget) => el === canvas || el === world;

  /* ── the selection panel ── */
  /* on desktop the panel always opens on the right; the canvas is never moved
     or scaled to make room — the decisions are placed so the panel leaves them in view. */
  const show = (x: Node) => {
    panelEl.current?.scrollTo({ top: 0 }); // each step starts at its question
    setLeaving(false);
    setOpen(x);
  };
  const openNode = (x: Node) => {
    if (busy || running || x === open) return;
    if (!seen) endIntro();
    if (layout === "split" && open === null) morph(() => setOpen(x));
    else show(x);
  };
  const close = useCallback(() => {
    if (layout === "split") return morph(() => setOpen(null));
    setLeaving(true);
    timers.current.push(
      setTimeout(() => {
        setOpen(null);
        setLeaving(false);
      }, 220),
    );
  }, [layout]);
  const switchPanel = (p: "overlay" | "split") => {
    setOpen(null);
    setLeaving(false);
    setPanel(p);
  };
  /* step to the neighbouring decision without choosing */
  const goStep = (from: Node, d: -1 | 1) => {
    const to = decisions[decisions.indexOf(from) + d];
    if (to && !busy) show(to);
  };
  const stepOf = (x: Node) => ({ at: decisions.indexOf(x) + 1, of: decisions.length, label: labelOf(x) });

  /* keyboard users land in the step that just opened */
  useEffect(() => {
    if (open) panelEl.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, close]);

  /* after a decision: the next undecided node, or the whole canvas again */
  const advance = (from: Node, flew: boolean) => {
    const nxt = decisions.find((x) => x !== from && !configured(x)) ?? null;
    setBusy(true);
    later(
      () => {
        setBusy(false);
        if (nxt) show(nxt);
        else close();
      },
      nxt ? ADVANCE : flew ? 140 + FLY + 160 : ADVANCE,
    );
  };

  const land = (node: Node, from: HTMLElement | null, src: string) => {
    const flew = flyTo(from, (layout === "sheet" ? mini : thumbs).current[node], src, () => setLanding(null));
    if (flew) setLanding(node);
    advance(node, flew);
  };

  const choose = (node: "cast" | "setting", id: string, from: HTMLElement | null, src: string) => {
    if (busy) return;
    if (node === "cast") setCastId(id);
    else setSettingId(id);
    land(node, from, src);
  };

  const choosePick = (node: "front" | "back", id: string, from: HTMLElement | null, src: string) => {
    if (busy) return;
    setPick((p) => ({ ...p, [node]: id }));
    land(node, from, src);
  };

  const describe = (e: FormEvent) => {
    e.preventDefault();
    const words = prompt.trim();
    if (!words || making || busy) return;
    setMaking(true);
    later(() => document.querySelector('[data-tag="custom"]')?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 40);
    later(() => {
      setDescribed(words);
      setMaking(false);
    }, 1800);
    later(() => {
      const frame = document.querySelector<HTMLElement>('[data-tag="custom"] [data-frame]');
      choose("setting", "custom", frame, CUSTOM.img);
    }, 2100);
  };

  /* a pose in one's own words (Partner): made, then kept from the result if it is right */
  const describePose = (e: FormEvent) => {
    e.preventDefault();
    const words = posePrompt.trim();
    if (!words || poseMaking) return;
    setPoseMaking(true);
    later(() => {
      setCustomPose(words);
      setPoseMaking(false);
      setPosePrompt("");
    }, 1600);
  };
  const toggleMyPose = (id: string) => setMyPoses((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const isFav = (key: string) => s.favorites.includes(key);
  const toggleFav = (key: string) => set({ favorites: isFav(key) ? s.favorites.filter((x) => x !== key) : [...s.favorites, key] });

  const toggleAngle = (a: Angle) =>
    setAngles((cur) =>
      cur.includes(a) ? (cur.length > 1 ? cur.filter((x) => x !== a) : cur) : ANGLES.map((x) => x.id).filter((x) => x === a || cur.includes(x)),
    );

  const framesDone = () => {
    setFramesOk(true);
    advance("frames", false);
  };

  /* ── a run becomes a job: it keeps going when this screen closes, lands in Jobs and spends its credits when it ends ── */
  const framesOf = (jobId: string): JobFrame[] =>
    outputs.map((o, i) => ({
      id: `${jobId}-${i + 1}`,
      angle: ANGLES.some((a) => a.id === o.id) ? (o.id as Angle) : undefined,
      label: o.id === "video" ? { en: "180° video", tr: "180° video" } : (input.find((f) => f.id === o.id)?.label ?? ghosts?.find((g) => g.id === o.id)?.label),
      src: o.out,
    }));
  const jobOf = (jobId: string, status: "running" | "done"): Job => ({
    id: jobId,
    title: flowId === "batch" ? { en: `Batch · ${inBatch.length} products`, tr: `Toplu · ${inBatch.length} ürün` } : itemL,
    flow: flowId,
    status,
    castId: cast?.id,
    settingId: settingId === "custom" ? undefined : settingId,
    ratio: flowId === "campaign" || flowId === "restyle" ? (ratio as Ratio) : undefined,
    custom: settingId === "custom" || customPose ? { setting: settingId === "custom" ? (described ?? undefined) : undefined, pose: customPose ?? undefined } : undefined,
    frames: [],
    progress: 0,
    createdAt: new Date(now()).toISOString(),
    cover: outputs[0].out,
    creditPerFrame: flow.fixed ?? flow.per,
    setupId: sidRef.current ?? undefined,
  });

  /* ── bringing your own (W-F-19…22) ── */
  const rules: Rules =
    flowId === "campaign"
      ? { slots: ["front", "back", "detail"], max: 6, needs: ["front"] }
      : flowId === "ghost"
        ? { slots: ["front", "back"], max: 4, needs: ["front"] }
        : { slots: ["front", "back", "other"], max: 6, needs: flowId === "recast" ? ["front"] : ["front", "back"] };
  const PIECE: Rules = { slots: ["front", "back", "detail"], max: 6, needs: [] };
  const productMode = flowId === "campaign" ? "all" : flowId === "restyle" ? "complements" : undefined;
  const piecesOk = products.every((pr) => pr.category && shots.some((x) => x.product === pr.id));
  const canConfirm =
    flowId === "campaign"
      ? products.length > 0 && piecesOk && shots.some((x) => x.product === products[0].id && x.slot === "front")
      : baseShots.length > 0 && rules.needs.every((sl) => baseShots.some((x) => x.slot === sl)) && piecesOk;
  const uploadHint =
    productMode && products.some((pr) => !pr.category)
      ? t({ en: "Pick each product's category.", tr: "Her ürünün kategorisini seç." })
      : flowId === "campaign" && products.length && !shots.some((x) => x.product === products[0].id && x.slot === "front")
        ? t({ en: "The main product needs a front.", tr: "Ana ürün için bir ön kare gerekli." })
        : baseShots.length && !rules.needs.every((sl) => baseShots.some((x) => x.slot === sl))
          ? rules.needs.length > 1
            ? t({ en: "A front and a back are needed.", tr: "Bir ön ve bir arka kare gerekli." })
            : t({ en: "A front is needed.", tr: "Bir ön kare gerekli." })
          : undefined;
  /* things brought before: earlier campaign products, ready to use again */
  const assets: Asset[] =
    flowId === "campaign"
      ? Object.values(s.setups)
          .filter((x) => x.id !== boot?.id && x.flow === "campaign" && x.shots?.length)
          .map((x) => ({ id: x.id, name: x.item || t({ en: "Product", tr: "Ürün" }), shots: x.shots! }))
      : [];
  const uploadNode = steps.find((st) => st.kind === "upload")?.id ?? null;
  const uploadPending = !!uploadNode && !shotsOk; // nothing is made before the user's own images are confirmed
  const addFiles = async (files: File[], product?: string) => {
    /* "new" opens a product; a campaign's first images always make one */
    const pid = product === "new" || (productMode === "all" && !product) ? `p${now().toString(36)}` : product;
    const existing = pid ? shots.filter((x) => x.product === pid) : baseShots;
    const res = await readShots(files, existing, pid ? PIECE : rules, pid);
    if (pid && !products.some((pr) => pr.id === pid) && res.shots.length) {
      setProducts((ps) => [...ps, { id: pid, category: guessCategory(files[0]?.name ?? "") ?? (ps.length === 0 ? guessCategory(itemName) : undefined) }]);
    }
    setShots((sh) => [...sh, ...res.shots]);
    setUploadErrors(res.errors);
    setShotsOk(false);
  };
  const setCategory = (id: string, category: Category) => {
    setProducts((ps) => ps.map((pr) => (pr.id === id ? { ...pr, category } : pr)));
    setShotsOk(false);
  };
  const removeProduct = (id: string) => {
    setProducts((ps) => ps.filter((pr) => pr.id !== id));
    setShots((sh) => sh.filter((x) => x.product !== id));
    setShotsOk(false);
  };
  const addAsset = (a: Asset) => {
    const pid = `p${now().toString(36)}`;
    setProducts((ps) => [...ps, { id: pid, category: guessCategory(a.name) }]);
    setShots((sh) => [...sh, ...a.shots.map((x, i) => ({ ...x, id: `${pid}-${i}`, product: pid, slot: PIECE.slots.includes(x.slot) ? x.slot : i === 0 ? ("front" as const) : ("detail" as const) }))]);
    setShotsOk(false);
  };
  const setSlot = (id: string, slot: ShotSlot) => {
    setShots((sh) => sh.map((x) => (x.id === id ? { ...x, slot } : x)));
    setShotsOk(false);
  };
  const confirmShots = () => {
    if (!canConfirm || !uploadNode) return;
    setShotsOk(true);
    if (flowId === "turn") setPick({ front: baseShots.find((x) => x.slot === "front")!.id, back: baseShots.find((x) => x.slot === "back")!.id });
    if (flow.auto && !optionalGhost && phase === "idle") setPhase("making");
    advance(uploadNode, false);
  };
  const sampleShots = () => {
    if (flowId === "campaign") {
      /* the sample coat, the knit under it, the belt with it: three products */
      const ps: Piece[] = [{ id: "p1", category: guessCategory(flow.item.en) ?? "outer" }];
      const sh: Shot[] = flow.input.map((f, i) => {
        const slot = SAMPLE_PRO.find((u) => u.id === f.id)?.slot ?? (PIECE.slots.includes(f.id as ShotSlot) ? (f.id as ShotSlot) : "front");
        if (slot === "complement" || slot === "accessory") {
          const id = `p${ps.length + 1}`;
          ps.push({ id, category: slot === "accessory" ? "acc" : "top" });
          return { id: `s${i}-${f.id}`, src: f.img, name: `${f.id}.jpg`, slot: "front", product: id };
        }
        return { id: `s${i}-${f.id}`, src: f.img, name: `${f.id}.jpg`, slot, product: "p1" };
      });
      setProducts(ps);
      setShots(sh);
    } else {
      setShots(flow.input.map((f, i) => ({ id: `s${i}-${f.id}`, src: f.img, name: `${f.id}.jpg`, slot: (rules.slots.includes(f.id as ShotSlot) ? f.id : "other") as ShotSlot })));
    }
    setUploadErrors([]);
    setShotsOk(false);
  };

  /* the setup, saved as it changes: a draft in Jobs until something is made from it */
  const sidRef = useRef<string | null>(boot?.id ?? null);
  const createdRef = useRef<string>(boot?.createdAt ?? "");
  const ranRef = useRef(boot?.ran ?? false);
  const snapKey = JSON.stringify({ flow: flowId, item: itemName, shots, products, tuck, myPoses, customPose, ghostSkip, shotsOk, castId, settingId, described, angles, ratio, framesOk, pick, phase, redo, rows, stray, grouped, moved, query: q });
  const userKey = JSON.stringify({ item: itemName, shots, products, tuck, myPoses, customPose, ghostSkip, shotsOk, castId, settingId, described, angles, ratio, framesOk, pick, rows, stray, grouped, moved, phase: flow.auto ? null : phase });
  const [freshKey] = useState(userKey);
  const nextKind: NodeKind = !nextUp ? "result" : nextUp === "shoot" || nextUp === "source" ? "shoot" : nextUp === "front" || nextUp === "back" || nextUp === "frames" ? "framing" : nextUp === "pose" ? "setting" : (nextUp as NodeKind);
  const coverSrc = input[0]?.img ?? flow.input[0].img;
  const titleEn = flowId === "batch" ? `Batch · ${inBatch.length} products` : itemL.en;
  const titleTr = flowId === "batch" ? `Toplu · ${inBatch.length} ürün` : itemL.tr;
  useEffect(() => {
    if (!sidRef.current && userKey === freshKey) return; // nothing decided yet: no draft
    if (!sidRef.current) {
      sidRef.current = `s-${flowId}-${now().toString(36)}`;
      createdRef.current = new Date(now()).toISOString();
      window.history.replaceState(null, "", `${window.location.pathname}?draft=${sidRef.current}`);
    }
    const id = sidRef.current;
    const setup: Setup = { ...(JSON.parse(snapKey) as Omit<Setup, "id" | "createdAt">), id, ran: ranRef.current, createdAt: createdRef.current };
    const draftJob = ranRef.current
      ? null
      : { id, title: { en: titleEn, tr: titleTr }, flow: flowId, status: "draft" as const, draftStep: nextKind, frames: [], createdAt: createdRef.current, cover: coverSrc, setupId: id };
    dispatch({ type: "saveSetup", setup, draft: draftJob });
  }, [snapKey, userKey, freshKey, flowId, nextKind, coverSrc, titleEn, titleTr, dispatch]);
  /* something was made from it: it stays as the job's setup, no longer a draft */
  const settle = () => {
    ranRef.current = true;
    if (sidRef.current) dispatch({ type: "saveSetup", setup: { ...(JSON.parse(snapKey) as Omit<Setup, "id" | "createdAt">), id: sidRef.current, ran: true, createdAt: createdRef.current }, draft: null });
  };

  /* ── moving nodes: a drag moves, a click opens ── */
  const nodeDrag = useRef<{ id: string; x: number; y: number; ox: number; oy: number; z: number; moved: boolean } | null>(null);
  const swallow = useRef(false);
  const onNodeDown = (e: RPointerEvent<HTMLElement>) => {
    const id = e.currentTarget.dataset.drag;
    if (e.button !== 0 || compact || !id) return;
    const m = moved[id] ?? { x: 0, y: 0 };
    nodeDrag.current = { id, x: e.clientX, y: e.clientY, ox: m.x, oy: m.y, z: view.z, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  const onNodeMove = (e: RPointerEvent<HTMLElement>) => {
    const d = nodeDrag.current;
    if (!d || d.id !== e.currentTarget.dataset.drag) return;
    const [dx, dy] = [e.clientX - d.x, e.clientY - d.y];
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setMoved((m) => ({ ...m, [d.id]: { x: Math.round(d.ox + dx / d.z), y: Math.round(d.oy + dy / d.z) } }));
  };
  const onNodeUp = () => {
    swallow.current = !!nodeDrag.current?.moved;
    nodeDrag.current = null;
  };
  const onNodeClickCapture = (e: RMouseEvent) => {
    if (!swallow.current) return;
    swallow.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const offset = (id: string) => (moved[id] ? ({ "--dx": `${moved[id].x}px`, "--dy": `${moved[id].y}px` } as CSSProperties) : {});

  /* a guest looks around freely; making spends credits, so it asks for the
     account — and comes back here once it is open */
  const askAccount = () => {
    writeGuest({ ...(readGuest() ?? { profile: EMPTY_PROFILE }), next: window.location.pathname + window.location.search });
    router.push("/signup?from=make");
  };

  /* ── the ghost: made, checked, approved ── */
  const prepare = () => {
    if (s.guest) return askAccount();
    if (phase !== "idle" || short || uploadPending) return;
    setPhase("making");
    later(() => {
      setPhase("review");
      dispatch({ type: "spend", amount: credits });
      show("ghost");
    }, PREPARE);
  };
  /* a remake costs a frame in the ghost flow; inside a restyle it is part of the run (W-B-09) */
  const remakeCost = flowId === "ghost" ? flow.per : 0;
  const remake = (g: Ghost) => {
    if (remaking || phase !== "review" || remakeCost > s.credits) return;
    setRemaking(g.id);
    later(() => {
      setRedo((r) => ({ ...r, [g.id]: (r[g.id] ?? 0) + 1 }));
      setRemaking(null);
      if (remakeCost) dispatch({ type: "spend", amount: remakeCost });
    }, 1800);
  };
  const approve = () => {
    if (phase !== "review" || remaking) return;
    setPhase("approved");
    if (flowId === "ghost") {
      const jobId = newJobId("ghost");
      dispatch({ type: "upsertJob", job: { ...jobOf(jobId, "done"), frames: framesOf(jobId), expiresInDays: 7 } });
      settle();
      setRuns([{ id: 1, key, cast: "", setting: itemL, frames: outputs, done: n, finished: true, meta: { en: "In your jobs", tr: "İşlerimde" }, jobId }]);
      close();
    } else advance("ghost", false);
  };

  const make = () => {
    if (s.guest && remaining === 0 && !attention) return askAccount();
    if (remaining > 0 || short || attention) return;
    if (flowId === "ghost") return prepare();
    if (flowId !== "turn" && !cast) return;
    const id = runs.length + 1;
    const where = flowId === "recast" ? SHOOT_SETTING : flowId === "turn" ? { en: "5 s · 1080p", tr: "5 sn · 1080p" } : setting!.name;
    const step = flowId === "turn" ? 3200 : flowId === "batch" ? 320 : 1100;
    const total = 1500 + step * n + 300;
    const jobId = newJobId(flowId);
    const video = flowId === "turn" ? spin() : undefined;
    dispatch({ type: "upsertJob", job: { ...jobOf(jobId, "running"), finishAt: now() + total, planned: framesOf(jobId), cost: credits, video } });
    settle();
    setRuns((r) => [...r, { id, key, cast: cast?.name ?? "", setting: where, frames: outputs, done: 0, finished: false, video, jobId }]);
    const tick = (fn: (x: RunRec) => RunRec) => setRuns((r) => r.map((x) => (x.id === id ? fn(x) : x)));
    outputs.forEach((_, i) => later(() => tick((x) => ({ ...x, done: i + 1 })), 1500 + step * i));
    later(() => tick((x) => ({ ...x, finished: true })), total);
  };

  const value = (x: Node) => {
    const k = kindOf(x);
    if (k === "group") return t({ en: `${inBatch.length} products`, tr: `${inBatch.length} ürün` });
    if (k === "upload" && !shotsOk) return shots.length ? t({ en: `${shots.length} images · to confirm`, tr: `${shots.length} görsel · onay bekliyor` }) : "—";
    if (k === "input" || k === "upload") return flowId === "campaign" || flowId === "ghost" ? t(itemL) : t({ en: `${input.length} frames`, tr: `${input.length} kare` });
    if (k === "check") return phase === "review" || phase === "approved" ? t({ en: `${ghosts!.length} ghost`, tr: `${ghosts!.length} ghost` }) : "—";
    if (k === "cast") return cast?.name ?? "—";
    if (k === "setting") return setting ? t(setting.name) : "—";
    if (k === "frames") return framesOk ? t({ en: `${n} frames · ${ratio}`, tr: `${n} kare · ${ratio}` }) : "—";
    if (k === "pick") return t(frameOf(pick[x as "front" | "back"]).label);
    return x === "setting" ? t(SHOOT_SETTING) : t({ en: `${shoot.length} poses · light kept`, tr: `${shoot.length} poz · ışık korunur` });
  };

  /* a node's picture: the same on the canvas and in the flow strip */
  const picture = (x: Node, small?: boolean) => {
    const k = kindOf(x);
    if (k === "upload" && !shots.length) return small ? null : <span className={css.drop}>{t({ en: "Drop images", tr: "Görselleri bırak" })}</span>;
    if (k === "input" || k === "group" || k === "upload") return small || input.length < 2 ? <img src={input[0].img} alt="" /> : stack(input.map((f) => f.img));
    if (k === "check") {
      if (phase === "idle") return null;
      if (phase === "making") return <span className={css.slices}><span className={css.waiting} /></span>;
      const gs = ghosts!;
      if (small || gs.length < 2) return remaking ? <span className={css.slices}><span className={css.waiting} /></span> : <img key={ghostOut(gs[0])} src={ghostOut(gs[0])} alt="" />;
      return (
        <span className={css.stack}>
          {gs.map((g, i) =>
            remaking === g.id ? (
              <span key={g.id} className={`${css.layer} ${css.waiting}`} style={{ "--i": i } as CSSProperties} />
            ) : (
              <img key={g.id + ghostOut(g)} className={css.layer} src={ghostOut(g)} alt="" style={{ "--i": i } as CSSProperties} />
            ),
          )}
        </span>
      );
    }
    if (k === "pick") {
      const f = frameOf(pick[x as "front" | "back"]);
      return <img key={f.id} src={f.img} alt="" />;
    }
    if (k === "cast") return cast ? <img key={cast.id} src={cast.img} alt="" /> : null;
    if (k === "setting") return setting ? <img key={setting.id} src={setting.img} alt="" /> : null;
    if (k === "frames") {
      if (!framesOk) return null;
      return small ? (
        <span className={base.num}>{n}</span>
      ) : (
        <span className={css.blanks}>
          {angleOuts.map((o) => (
            <span key={o.id} style={{ aspectRatio: ratio.replace(":", " / ") }}>
              <span className={base.num}>{o.short}</span>
            </span>
          ))}
        </span>
      );
    }
    /* kept: the shoot itself — its backdrop, or its poses side by side */
    if (x === "setting") return <img className={css.backdrop} src={shoot[0].img} alt="" />;
    return small ? <img src={shoot[0].img} alt="" /> : stack(shoot.map((f) => f.img));
  };
  /* several pictures: the first on top, two more peeking behind */
  const stack = (srcs: string[]) => (
    <span className={css.stack}>
      {srcs.slice(0, 3).map((src, i) => (
        <img key={src + i} className={css.layer} src={src} alt="" style={{ "--i": i } as CSSProperties} />
      ))}
    </span>
  );

  /* a relation is gold once everything up to it is decided, or it leads to the open step */
  const cableOn = (id: string) => {
    if (id === "previous") return false;
    if (id === "output") return !!latest && !changed;
    const i = steps.findIndex((st) => st.id === id);
    const before = steps.slice(0, i).every((st) => configured(st.id));
    return before && (configured(id as Node) || id === open || (kindOf(id as Node) === "check" && phase !== "idle"));
  };

  /* said at the head of every step: what the system will make */
  const summary =
    flowId === "batch"
      ? t({ en: `${inBatch.length} products × ${angles.length} frames = ${n} frames · ${credits} credits`, tr: `${inBatch.length} ürün × ${angles.length} kare = ${n} kare · ${credits} kredi` })
      : flowId === "turn"
      ? t({ en: `1 video · 5 s · 1080p · ${credits} credits`, tr: `1 video · 5 sn · 1080p · ${credits} kredi` })
      : flow.per > 1
        ? t({ en: `${n} frames · ${flow.per} credits each · ${credits} credits`, tr: `${n} kare · kare başı ${flow.per} kredi · ${credits} kredi` })
        : isSample
          ? t({ en: `${n} frames · first one free · ${credits} credits`, tr: `${n} kare · ilk kare ücretsiz · ${credits} kredi` })
          : t({ en: `${n} frames · ${credits} credits`, tr: `${n} kare · ${credits} kredi` });

  /* ── the first-visit walk-through ── */
  const seen = s.seenIntro.includes(flowId);
  /* "How it works" shows even with a panel open — beside it, never under it (Elif) */
  const coach = !seen && !phone ? introStep : null;
  const endIntro = () => {
    if (!s.seenIntro.includes(flowId)) set({ seenIntro: [...s.seenIntro, flowId] });
  };
  const replayIntro = () => {
    setIntroStep(0);
    set({ seenIntro: s.seenIntro.filter((x) => x !== flowId) });
  };
  const hinted = (x: Node | "result") => (coach === 1 ? x === (nextUp ?? decisions[0]) : coach === 2 ? x === "result" : false);

  const shown = <T,>(list: T[], first: number) => (all ? list : list.slice(0, first));
  const openKind = open ? kindOf(open) : null;
  /* the next press of the main action would spend credits */
  const makeable = flowId === "ghost" ? phase === "idle" && !uploadPending : !running && !attention && remaining === 0 && (!latest || changed);

  if (flowId === "batch" && !partner) {
    return (
      <ConceptShell active="e" switcher={false} crumb={flow.name}>
        <main className={css.desk}>
          <img src={BATCH[0].img} alt="" />
          <h1>{t({ en: "Batch opens with Partner.", tr: "Toplu üretim Partner'da açılır." })}</h1>
          <p>{t({ en: "Up to 20 products, one setup.", tr: "20 ürüne kadar, tek kurulum." })}</p>
          <span className={css.deskActions}>
            <Link href="/packages?from=%2Fconcepts%2Fe%2Fbatch" className={`${base.primary} ${css.deskButton}`}>
              {t({ en: "See Partner", tr: "Partner'ı gör" })} <Arrow />
            </Link>
            <Link href="/concepts/e" className={base.ghostBtn}>
              {t({ en: "One product", tr: "Tek ürün" })}
            </Link>
          </span>
        </main>
      </ConceptShell>
    );
  }

  if (phone) {
    return (
      <ConceptShell active="e" switcher={false} crumb={flow.name}>
        <main className={css.desk}>
          <img src={input[0].img} alt="" />
          <p className={css.deskMeta}>
            {t(itemL)} · {t(flow.name)}
          </p>
          <h1>{t({ en: "Making happens on desktop.", tr: "Üretim masaüstünde." })}</h1>
          <p>{t({ en: "On your phone you can follow your jobs and download your frames.", tr: "Telefondan işlerini takip edip karelerini indirebilirsin." })}</p>
          <span className={css.deskActions}>
            <Link href="/jobs" className={`${base.primary} ${css.deskButton}`}>
              {t({ en: "My jobs", tr: "İşlerim" })} <Arrow />
            </Link>
            <Link href="/salon" className={base.ghostBtn}>
              Salon
            </Link>
          </span>
        </main>
      </ConceptShell>
    );
  }

  return (
    <ConceptShell active="e" switcher={mod} crumb={flow.name}>
      <main className={css.e} data-open={open !== null} data-panel={panel}>
        {mod && (
          <div className={css.review}>
            <FlowPicker flow={flowId} />
            <PanelPicker panel={panel} onChange={switchPanel} />
          </div>
        )}
        {/* ═════════ the canvas: over it, the panel; clicking the open ground closes it ═════════ */}
        <section
          className={css.canvas}
          ref={setCanvas}
          data-compact={compact}
          data-fit={!narrow ? "panel" : undefined}
          data-panning={panning || undefined}
          onDragOver={(e) => wantsUpload && e.preventDefault()}
          onDrop={(e) => {
            if (!wantsUpload || !uploadNode || !e.dataTransfer.files.length) return;
            e.preventDefault();
            void addFiles([...e.dataTransfer.files]);
            openNode(uploadNode);
          }}
          onPointerDown={(e) => {
            if (e.button !== 0 || !isGround(e.target)) return;
            drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const [dx, dy] = [e.clientX - d.x, e.clientY - d.y];
            if (!d.moved && Math.hypot(dx, dy) < 4) return;
            if (!d.moved) setPanning(true);
            d.moved = true;
            setView((v) => fitView({ ...v, x: d.vx + dx, y: d.vy + dy }));
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            setPanning(false);
            /* a click on the open ground closes the panel; a drag only moves */
            if (d && !d.moved && open && layout === "overlay") close();
          }}
        >
          {!compact && (
            <header className={`${css.identity} fade-in`} data-float={!atRest || undefined}>
              <h1>{t(itemL)}</h1>
              <p>
                {isSample ? t({ en: "Sample set", tr: "Örnek set" }) : t({ en: "Winter ’26", tr: "Kış ’26" })} · {t(flow.name)}
                {seen && (
                  <button className={css.how} onClick={replayIntro}>
                    {t({ en: "How it works", tr: "Nasıl çalışır?" })}
                  </button>
                )}
              </p>
            </header>
          )}

          <div className={css.dots} style={{ "--z": view.z, "--gx": `${view.x}px`, "--gy": `${view.y}px` } as CSSProperties} aria-hidden />
          <div className={css.world} ref={setWorld} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          <svg className={css.cables} aria-hidden>
            {cables.map((c) => (
              <path key={c.id} className={css.cable} pathLength={1} data-on={cableOn(c.id) || undefined} data-faint={c.id === "previous" || undefined} d={c.d} />
            ))}
          </svg>
          {/* a sliver of light where a cable meets a card — the dashboard's port bars */}
          <svg className={css.ports} aria-hidden>
            <defs>
              <linearGradient id="bar-v" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#efe8da" stopOpacity="0" />
                <stop offset="0.5" stopColor="#efe8da" stopOpacity="0.95" />
                <stop offset="1" stopColor="#efe8da" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="bar-h" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#efe8da" stopOpacity="0" />
                <stop offset="0.5" stopColor="#efe8da" stopOpacity="0.95" />
                <stop offset="1" stopColor="#efe8da" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="bar-v-on" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d69f52" stopOpacity="0" />
                <stop offset="0.5" stopColor="#d69f52" stopOpacity="1" />
                <stop offset="1" stopColor="#d69f52" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="bar-h-on" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#d69f52" stopOpacity="0" />
                <stop offset="0.5" stopColor="#d69f52" stopOpacity="1" />
                <stop offset="1" stopColor="#d69f52" stopOpacity="0" />
              </linearGradient>
            </defs>
            {cables.flatMap((c) =>
              ([[c.a, c.la], [c.b, c.lb]] as const).map(([p, len], k) => {
                const on = cableOn(c.id);
                const fill = `url(#bar-${c.v ? "h" : "v"}${on ? "-on" : ""})`;
                return c.v ? (
                  <rect key={`${c.id}${k}`} className={css.port} data-on={on || undefined} data-faint={c.id === "previous" || undefined} x={p[0] - len / 2} y={p[1] - 1} width={len} height={2} rx={1} fill={fill} />
                ) : (
                  <rect key={`${c.id}${k}`} className={css.port} data-on={on || undefined} data-faint={c.id === "previous" || undefined} x={p[0] - 1} y={p[1] - len / 2} width={2} height={len} rx={1} fill={fill} />
                );
              }),
            )}
          </svg>

          {steps.map(({ id: x, at, kind }) => {
            const st = state(x);
            return (
              <button
                key={x}
                className={css.node}
                data-card
                data-node={x}
                data-kind={kind}
                data-state={st}
                data-open={x === open || undefined}
                data-landing={landing === x || undefined}
                data-hint={hinted(x) || undefined}
                onClick={() => openNode(x)}
                data-drag={x}
                onPointerDown={onNodeDown} onPointerMove={onNodeMove} onPointerUp={onNodeUp} onClickCapture={onNodeClickCapture}
                aria-current={x === open ? "step" : undefined}
                style={{ ...placeVars(at), ...offset(x), viewTransitionName: `e-node-${x}`, viewTransitionClass: "vt-card" } as CSSProperties}
              >
                <span className={css.thumb} ref={(el) => void (thumbs.current[x] = el)} style={{ viewTransitionName: `e-img-${x}` } as CSSProperties}>
                  {picture(x)}
                </span>
                <span className={css.text} style={{ viewTransitionName: `e-txt-${x}`, viewTransitionClass: "vt-text" } as CSSProperties}>
                  <span className={css.line}>
                    <span className={css.label}>{labelOf(x)}</span>
                    <span className={css.state} data-state={st}>
                      {stateLabel(x, st)}
                    </span>
                  </span>
                  <span className={css.value}>{value(x)}</span>
                  {issue(x) && (
                    <span className={css.issue}>
                      {kind === "pick" ? t({ en: "Same as the front", tr: "Ön kareyle aynı" }) : t({ en: "Partner only", tr: "Partner'a ait" })}
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {/* ── the result: a destination until the first run, then versions ── */}
          {latest ? (
            <Output key={latest.id} run={latest} outdated={changed} place={flow.output} href={latest.jobId ? `/jobs/${latest.jobId}` : flow.result} setThumb={(el) => void (thumbs.current.output = el)} name="output" offset={offset("output")} onDown={onNodeDown} onMove={onNodeMove} onUp={onNodeUp} onClickCap={onNodeClickCapture} />
          ) : (
            <div className={`${css.node} ${css.slot}`} data-card data-zone="result" data-hint={hinted("result") || undefined} data-drag="output" onPointerDown={onNodeDown} onPointerMove={onNodeMove} onPointerUp={onNodeUp} onClickCapture={onNodeClickCapture} style={{ ...placeVars(flow.output), ...offset("output"), viewTransitionName: "e-node-output", viewTransitionClass: "vt-card" } as CSSProperties}>
              <span className={css.thumb} ref={(el) => void (thumbs.current.output = el)} style={{ viewTransitionName: "e-img-output" } as CSSProperties} />
              <span className={css.text} style={{ viewTransitionName: "e-txt-output", viewTransitionClass: "vt-text" } as CSSProperties}>
                <span className={css.line}>
                  <span className={css.label}>{t({ en: "Result", tr: "Sonuç" })}</span>
                </span>
                <span className={css.value}>{flowId === "turn" ? t({ en: "1 video", tr: "1 video" }) : t({ en: `${n} frames`, tr: `${n} kare` })}</span>
              </span>
            </div>
          )}

          {previous && !compact && (
            <Output key={previous.id} run={previous} outdated older={runs.length - 2} place={P.previous} href={previous.jobId ? `/jobs/${previous.jobId}` : flow.result} setThumb={(el) => void (thumbs.current.previous = el)} name="previous" small />
          )}

          </div>

          {/* zoom: out, back to fit, in */}
          {!(open && layout === "sheet") && (
            <div className={css.zoom} role="group" aria-label={t({ en: "Zoom", tr: "Yakınlaştırma" })}>
              <button onClick={() => zoomAt(1 / 1.25)} disabled={view.z <= ZMIN} aria-label={t({ en: "Zoom out", tr: "Uzaklaş" })}>
                −
              </button>
              <button className={css.zoomPct} onClick={() => setView(REST)} disabled={atRest} title={t({ en: "Fit to screen", tr: "Ekrana sığdır" })}>
                {Math.round(view.z * 100)}%
              </button>
              <button onClick={() => zoomAt(1.25)} disabled={view.z >= ZMAX} aria-label={t({ en: "Zoom in", tr: "Yakınlaş" })}>
                +
              </button>
              {Object.keys(moved).length > 0 && (
                <button className={css.zoomReset} onClick={() => setMoved({})} title={t({ en: "Put the nodes back", tr: "Node'ları yerine koy" })}>
                  {t({ en: "Reset layout", tr: "Düzeni sıfırla" })}
                </button>
              )}
            </div>
          )}

          {/* the first visit: three short steps, then out of the way (W-F-03) */}
          {coach !== null && (
            <aside className={css.coach} key={coach} aria-live="polite" data-beside={open ? "" : undefined}>
              <span className={`${css.coachStep} ${base.num}`}>{coach + 1}/3</span>
              <h2>{t(flow.coach[coach][0])}</h2>
              <p>{t(flow.coach[coach][1])}</p>
              <span className={css.coachActions}>
                <button className={base.ghostBtn} onClick={endIntro}>
                  {t({ en: "Skip", tr: "Atla" })}
                </button>
                {coach < 2 ? (
                  <button className={`${base.primary} ${css.slim}`} onClick={() => setIntroStep(coach + 1)}>
                    {t({ en: "Next", tr: "Sonraki" })} <Arrow />
                  </button>
                ) : (
                  <button
                    className={`${base.primary} ${css.slim}`}
                    onClick={() => {
                      endIntro();
                      if (nextUp && !(kindOf(nextUp) === "check" && phase === "idle")) openNode(nextUp);
                    }}
                  >
                    {t({ en: "Start", tr: "Başlayalım" })} <Arrow />
                  </button>
                )}
              </span>
            </aside>
          )}
        </section>

        {/* ═════════ the selection panel: the same for every flow; its content follows the node's kind ═════════ */}
        {open && (
          <aside
            ref={panelEl}
            tabIndex={-1}
            aria-label={labelOf(open)}
            className={css.inspector}
            data-mode={layout}
            data-leaving={leaving || undefined}
            data-busy={busy || undefined}
            style={layout === "split" ? ({ viewTransitionName: "e-inspector" } as CSSProperties) : undefined}
          >
            {/* full-screen step (below 1200 px): the flow in miniature, and the way back */}
            {layout === "sheet" && (
              <nav className={css.strip} aria-label={t({ en: "Flow", tr: "Akış" })}>
                <button className={css.stripBack} onClick={close}>
                  <ArrowLeft size={13} />
                  {t({ en: "Canvas", tr: "Kanvas" })}
                </button>
                <ol>
                  {steps.map(({ id: x }) => (
                    <li key={x} data-open={x === open || undefined} data-state={state(x)}>
                      <button onClick={() => x !== open && show(x)} aria-current={x === open ? "step" : undefined}>
                        <span className={css.stripThumb} ref={(el) => void (mini.current[x] = el)} data-landing={landing === x || undefined}>
                          {picture(x, true)}
                        </span>
                        <span className={css.stripText}>
                          <b>{labelOf(x)}</b>
                          <em>{configured(x) ? value(x) : stateLabel(x, state(x))}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                  <li data-result>
                    <span className={css.stripThumb} />
                    <span className={css.stripText}>
                      <b>{t({ en: "Result", tr: "Sonuç" })}</b>
                      <em>{flowId === "turn" ? "1 video" : t({ en: `${n} frames`, tr: `${n} kare` })}</em>
                    </span>
                  </li>
                </ol>
              </nav>
            )}
            <div className={css.panelBody} key={open}>
              {/* ── cast: who wears it ── */}
              {openKind === "cast" && (
                <>
                  <Head
                    summary={summary}
                    sheet={layout === "sheet"}
                    step={stepOf("cast")}
                    onStep={(d) => goStep("cast", d)}
                    q={flowId === "recast" ? t({ en: "Who wears it instead?", tr: "Yerine kim giysin?" }) : t({ en: "Who wears it?", tr: "Kim giyiyor?" })}
                    onClose={close}
                  />
                  <Filters
                    value={castFilter}
                    onChange={setCastFilter}
                    items={[
                      ["all", { en: "All", tr: "Tümü" }],
                      ["woman", { en: "Women", tr: "Kadın" }],
                      ["man", { en: "Men", tr: "Erkek" }],
                      ["fav", { en: "Favourites", tr: "Favorilerim" }],
                      ["own", { en: "My own cast", tr: "Kendi kadrom" }],
                    ]}
                  />
                  {castFilter === "own" ? (
                    /* Partner capability: its own place, never mixed into Liora's curated list */
                    <Tier title={t({ en: "Your own cast", tr: "Kendi kadron" })} line={t({ en: "Models for your brand alone.", tr: "Yalnızca markana ait mankenler." })} example="/img/cast-selin.jpg" unlocked={partner}>
                      <div className={ch.grid} style={{ "--ratio": "3 / 4", "--min": "170px" } as CSSProperties}>
                        {own.map((x) => (
                          <Faved key={x.id} on={isFav(`cast:${x.id}`)} onToggle={() => toggleFav(`cast:${x.id}`)}>
                            <Card plain img={x.img} name={x.name} note={t(x.note)} sel={castId === x.id} lock={x.pending ? t({ en: "In review", tr: "Onay bekliyor" }) : undefined} onPick={(el) => choose("cast", x.id, el, x.img)} />
                          </Faved>
                        ))}
                        {/* C1-F-04b: make a new one, come back with it set */}
                        <Link href={`/studio?from=${encodeURIComponent(flowId === "campaign" ? "/concepts/e" : `/concepts/e/${flowId}`)}`} className={css.newCast}>
                          <span>+</span>
                          {t({ en: "New cast", tr: "Yeni cast" })}
                          <em>{t({ en: "1 credit a try", tr: "deneme başı 1 kredi" })}</em>
                        </Link>
                      </div>
                    </Tier>
                  ) : (
                    <>
                      {(() => {
                        const list = castFilter === "all" ? shown(castList, FIRST.cast) : castFilter === "fav" ? [...castList, ...own].filter((x) => isFav(`cast:${x.id}`)) : castList.filter((x) => x.gender === castFilter);
                        return list.length ? (
                          <div className={ch.grid} style={{ "--ratio": "3 / 4", "--min": "170px" } as CSSProperties}>
                            {list.map((x) => {
                              const ok = canUse(s.role, x.minRole);
                              return (
                                <Faved key={x.id} on={isFav(`cast:${x.id}`)} onToggle={() => toggleFav(`cast:${x.id}`)}>
                                  {/* the headshot first; the editorial pose on hover */}
                                  <Card
                                    plain
                                    img={x.img}
                                    alt={EDITORIAL[x.id]}
                                    name={x.name}
                                    note={x.id === fitCast?.id ? `${t(FIT)} · ${t(x.note)}` : t(x.note)}
                                    sel={castId === x.id}
                                    lock={x.pending ? t({ en: "In review", tr: "Onay bekliyor" }) : ok ? undefined : t(ROLE_META[x.minRole].label)}
                                    onPick={(el) => choose("cast", x.id, el, x.img)}
                                  />
                                </Faved>
                              );
                            })}
                          </div>
                        ) : (
                          <p className={css.emptyLine}>{castFilter === "fav" ? t({ en: "No favourites yet — tap a card's star.", tr: "Henüz favorin yok; bir kartın yıldızına dokun." }) : t({ en: "No one here yet.", tr: "Burada henüz kimse yok." })}</p>
                        );
                      })()}
                      {layout === "split" && castFilter === "all" && <More count={cat.casts.length} first={FIRST.cast} all={all} setAll={setAll} />}
                    </>
                  )}
                </>
              )}

              {/* ── setting: where it is shot ── */}
              {openKind === "setting" && (
                <>
                  <Head summary={summary} sheet={layout === "sheet"} step={stepOf("setting")} onStep={(d) => goStep("setting", d)} q={t({ en: "Where is it shot?", tr: "Nerede çekiliyor?" })} onClose={close} />
                  <Filters
                    value={settingFilter}
                    onChange={setSettingFilter}
                    items={[
                      ["all", { en: "All", tr: "Tümü" }],
                      /* live backgrounds carry no studio/outdoor mark yet: those filters wait */
                      ...(s.catalog
                        ? []
                        : ([
                            ["studio", { en: "Studio", tr: "Stüdyo" }],
                            ["outdoor", { en: "Outdoor", tr: "Dış mekân" }],
                          ] as ["studio" | "outdoor", L][])),
                      ["own", { en: "My themes", tr: "Kendi temalarım" }],
                    ]}
                  />
                  {settingFilter === "own" ? (
                    <Tier title={t({ en: "Your themes", tr: "Kendi temaların" })} line={t({ en: "Describe a setting in your words; keep it when it's right.", tr: "Ortamı kendi cümlenle tarif et; beğenirsen kaydet." })} example={CUSTOM.img} unlocked={partner}>
                      <div className={ch.grid} style={{ "--ratio": "4 / 3", "--min": "200px" } as CSSProperties}>
                        {[...cat.ownSettings, ...s.themes.map((x) => ({ ...x, minRole: "partner" as const, own: true }))].map((x) => (
                          <Card key={x.id} plain img={x.img} name={t(x.name)} sel={settingId === x.id} onPick={(el) => choose("setting", x.id, el, x.img)} />
                        ))}
                        {(making || described) && (
                          <Card
                            tag="custom"
                            plain
                            img={CUSTOM.img}
                            name={t(CUSTOM.name)}
                            note={making ? t({ en: "Being made…", tr: "Hazırlanıyor…" }) : `“${described}”`}
                            sel={settingId === "custom"}
                            developing={making}
                            onPick={(el) => choose("setting", "custom", el, CUSTOM.img)}
                          />
                        )}
                      </div>
                      <form className={css.describe} onSubmit={describe}>
                        <input className={css.prompt} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t({ en: "A limestone courtyard in morning light", tr: "Sabah ışığında taş bir avlu" })} disabled={making} />
                        <button className={`${base.primary} ${css.slim}`} disabled={!prompt.trim() || making}>
                          {making ? t({ en: "Making", tr: "Hazırlanıyor" }) : t({ en: "Make setting", tr: "Ortamı kur" })}
                        </button>
                      </form>
                      <p className={css.tierNote}>{t({ en: "Happy with the background? Keep it from the result; it appears here next time.", tr: "Arkaplanı beğenirsen sonuç ekranından kaydet; bir dahaki sefere burada olur." })}</p>
                    </Tier>
                  ) : (
                    <>
                      <div className={ch.grid} style={{ "--ratio": "4 / 3", "--min": "200px" } as CSSProperties}>
                        {(settingFilter === "all" ? shown(settingList, FIRST.setting) : settingList.filter((x) => x.place === settingFilter)).map((x) => {
                          const ok = canUse(s.role, x.minRole);
                          return (
                            /* the empty set first; a frame shot there on hover */
                            <Card
                              key={x.id}
                              plain
                              img={x.img}
                              alt={x.example}
                              name={t(x.name)}
                              note={x.id === fitSetting?.id ? t(FIT) : undefined}
                              sel={settingId === x.id}
                              lock={ok ? undefined : t(ROLE_META[x.minRole].label)}
                              onPick={(el) => choose("setting", x.id, el, x.img)}
                            />
                          );
                        })}
                      </div>
                      {layout === "split" && settingFilter === "all" && <More count={cat.settings.length} first={FIRST.setting} all={all} setAll={setAll} />}
                    </>
                  )}
                </>
              )}

              {/* ── frames: which poses, at what ratio ── */}
              {openKind === "frames" && (
                <>
                  <Head
                    summary={summary}
                    sheet={layout === "sheet"}
                    step={stepOf("frames")}
                    onStep={(d) => goStep("frames", d)}
                    q={t({ en: "Which frames?", tr: "Hangi kareler?" })}
                    hint={t({ en: "Every frame is made at 2K.", tr: "Her kare 2K hazırlanır." })}
                    onClose={close}
                    side={
                      <>
                        <span className={ch.ratios} role="radiogroup" aria-label={t({ en: "Ratio", tr: "Oran" })}>
                          {RATIOS.map((r) => (
                            <button key={r} role="radio" aria-checked={ratio === r} className={ratio === r ? ch.on : undefined} onClick={() => setRatio(r)}>
                              <i style={{ aspectRatio: r.replace(":", " / ") }} />
                              <span className={base.num}>{r}</span>
                            </button>
                          ))}
                        </span>
                        <button className={`${base.primary} ${css.slim}`} onClick={framesDone}>
                          {framesOk ? t({ en: "Done", tr: "Tamam" }) : t({ en: "Continue", tr: "Devam" })} <Arrow />
                        </button>
                      </>
                    }
                  />
                  <Filters
                    value={poseFilter}
                    onChange={setPoseFilter}
                    items={[
                      ["all", { en: "All", tr: "Tümü" }],
                      ["mine", { en: "My poses", tr: "Pozlarım" }],
                      ["fav", { en: "Favourites", tr: "Favorilerim" }],
                    ]}
                  />
                  {(() => {
                    const order = [...angles, ...myPoses, ...(customPose ? ["custom-pose"] : [])];
                    const badge = (id: string) => (order.includes(id) ? String(order.indexOf(id) + 1).padStart(2, "0") : undefined);
                    const angleCard = (a: (typeof ANGLES)[number]) => (
                      <Faved key={a.id} on={isFav(`pose:${a.id}`)} onToggle={() => toggleFav(`pose:${a.id}`)}>
                        <Card plain img={flow.outs?.[a.id] ?? flow.out ?? a.out} name={t(a.label)} sel={angles.includes(a.id)} badge={badge(a.id)} onPick={() => toggleAngle(a.id)} />
                      </Faved>
                    );
                    const keptCard = (x: { id: string; name: string; img: string }) => (
                      <Faved key={x.id} on={isFav(`pose:${x.id}`)} onToggle={() => toggleFav(`pose:${x.id}`)}>
                        <Card plain img={x.img} name={x.name} sel={myPoses.includes(x.id)} badge={badge(x.id)} onPick={() => toggleMyPose(x.id)} />
                      </Faved>
                    );
                    if (poseFilter === "mine")
                      return (
                        <Tier title={t({ en: "Your poses", tr: "Pozların" })} line={t({ en: "Describe a pose in your words; keep it when it's right.", tr: "Pozu kendi cümlenle tarif et; beğenirsen kaydet." })} example={CUSTOM_POSE_IMG} unlocked={partner}>
                          <div className={ch.grid} style={{ "--ratio": "3 / 4", "--min": "170px" } as CSSProperties}>
                            {s.poses.map(keptCard)}
                            {(poseMaking || customPose) && (
                              <Card
                                plain
                                img={CUSTOM_POSE_IMG}
                                name={t({ en: "Your pose", tr: "Senin pozun" })}
                                note={poseMaking ? t({ en: "Being made…", tr: "Hazırlanıyor…" }) : `“${customPose}”`}
                                sel={!!customPose}
                                badge={customPose ? badge("custom-pose") : undefined}
                                developing={poseMaking}
                                onPick={() => setCustomPose(null)}
                              />
                            )}
                          </div>
                          <form className={css.describe} onSubmit={describePose}>
                            <input className={css.prompt} value={posePrompt} onChange={(e) => setPosePrompt(e.target.value)} placeholder={t({ en: "Sitting on a low stool, one knee up", tr: "Alçak bir taburede, bir dizi yukarıda" })} disabled={poseMaking} />
                            <button className={`${base.primary} ${css.slim}`} disabled={!posePrompt.trim() || poseMaking}>
                              {poseMaking ? t({ en: "Making", tr: "Hazırlanıyor" }) : t({ en: "Add pose", tr: "Pozu ekle" })}
                            </button>
                          </form>
                          <p className={css.tierNote}>{t({ en: "Happy with the pose? Keep it from the result; it appears here next time.", tr: "Pozu beğenirsen sonuç ekranından kaydet; bir dahaki sefere burada olur." })}</p>
                        </Tier>
                      );
                    const list = poseFilter === "fav" ? [...ANGLES.filter((a) => isFav(`pose:${a.id}`)).map(angleCard), ...s.poses.filter((x) => isFav(`pose:${x.id}`)).map(keptCard)] : ANGLES.map(angleCard);
                    return list.length ? (
                      <div className={ch.grid} style={{ "--ratio": "3 / 4", "--min": "170px" } as CSSProperties}>
                        {list}
                      </div>
                    ) : (
                      <p className={css.emptyLine}>{t({ en: "No favourite poses yet — tap a card's star.", tr: "Henüz favori pozun yok; bir kartın yıldızına dokun." })}</p>
                    );
                  })()}
                </>
              )}

              {/* ── pick: one frame of the input (a turn's front, its back) ── */}
              {openKind === "pick" && open && (
                <>
                  <Head
                    summary={summary}
                    sheet={layout === "sheet"}
                    step={stepOf(open)}
                    onStep={(d) => goStep(open, d)}
                    q={open === "front" ? t({ en: "Which is the front?", tr: "Ön kare hangisi?" }) : t({ en: "Which is the back?", tr: "Arka kare hangisi?" })}
                    onClose={close}
                  />
                  <div className={ch.grid} style={{ "--ratio": "3 / 4", "--min": "150px" } as CSSProperties}>
                    {input.map((f) => (
                      <Card
                        key={f.id}
                        plain
                        img={f.img}
                        name={t(f.label)}
                        sel={pick[open as "front" | "back"] === f.id}
                        onPick={(el) => choosePick(open as "front" | "back", f.id, el, f.img)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* ── upload: the user's own images — dropped, placed, confirmed ── */}
              {openKind === "upload" && open && (
                <Upload
                  head={
                    <Head
                      summary={summary}
                      sheet={layout === "sheet"}
                      step={stepOf(open)}
                      onStep={(d) => goStep(open, d)}
                      q={
                        flowId === "campaign"
                          ? t({ en: "Your product's images.", tr: "Ürününün görselleri." })
                          : flowId === "ghost"
                            ? t({ en: "Your flat lay.", tr: "Flat çekimin." })
                            : flowId === "turn"
                              ? t({ en: "Front and back.", tr: "Ön ve arka kare." })
                              : t({ en: "Your shoot.", tr: "Çekimin." })
                      }
                      hint={shots.length && !canConfirm ? uploadHint : undefined}
                      onClose={close}
                      side={
                        <button className={`${base.primary} ${css.slim}`} disabled={!canConfirm || shotsOk} onClick={confirmShots}>
                          {shotsOk ? t({ en: "Confirmed", tr: "Onaylandı" }) : t({ en: "Confirm", tr: "Onayla" })} {!shotsOk && <Arrow />}
                        </button>
                      }
                    />
                  }
                  shots={shots}
                  errors={uploadErrors}
                  rules={rules}
                  item={flowId === "campaign" || flowId === "ghost" || flowId === "restyle" ? itemName : undefined}
                  onItem={flowId === "campaign" || flowId === "ghost" || flowId === "restyle" ? setItemName : undefined}
                  onFiles={(f, pr) => void addFiles(f, pr)}
                  onSlot={setSlot}
                  productMode={productMode}
                  products={products}
                  onCategory={setCategory}
                  onRemoveProduct={removeProduct}
                  tuck={tuck}
                  onTuck={(v) => {
                    setTuck(v);
                    setShotsOk(false);
                  }}
                  assets={assets}
                  onAsset={addAsset}
                  onRemove={(id) => {
                    setShots((sh) => sh.filter((x) => x.id !== id));
                    setShotsOk(false);
                  }}
                  onSample={sampleShots}
                  flatHint={flowId === "campaign" && looksFlat(shots)}
                />
              )}

              {/* ── group: many products — the grouping is checked before anything is made (wf-13 · 02) ── */}
              {openKind === "group" && open && (
                <>
                  <Head
                    summary={summary}
                    sheet={layout === "sheet"}
                    step={stepOf(open)}
                    onStep={(d) => goStep(open, d)}
                    q={t(flow.inputQ)}
                    hint={problems ? t({ en: `${problems} to resolve first`, tr: `Önce ${problems} satırı çöz` }) : t({ en: "Grouped by file name", tr: "Dosya adına göre gruplandı" })}
                    onClose={close}
                    side={
                      <button
                        className={`${base.primary} ${css.slim}`}
                        disabled={problems > 0 || inBatch.length === 0}
                        onClick={() => {
                          setGrouped(true);
                          advance(open, false);
                        }}
                      >
                        {grouped ? t({ en: "Approved", tr: "Onaylandı" }) : t({ en: "Approve", tr: "Onayla" })} <Arrow />
                      </button>
                    }
                  />
                  <ul className={css.batch}>
                    {stray && (
                      <li data-issue>
                        <span className={css.batchThumbs}>
                          {UNMATCHED.map((src) => (
                            <img key={src} src={src} alt="" />
                          ))}
                        </span>
                        <span className={css.batchName}>
                          <b>{t({ en: `${UNMATCHED.length} images match no product`, tr: `${UNMATCHED.length} görsel eşleşmedi` })}</b>
                          <em>{t({ en: "Which product are they?", tr: "Hangi ürüne ait?" })}</em>
                        </span>
                        <span className={css.batchActs}>
                          <button onClick={() => setStray(false)}>{t({ en: "Assign", tr: "Ürünlere ata" })}</button>
                        </span>
                      </li>
                    )}
                    {[...BATCH]
                      .sort((a, b) => Number(rows[b.code] === "front") - Number(rows[a.code] === "front"))
                      .map((b) => (
                        <li key={b.code} data-issue={rows[b.code] === "front" || undefined} data-out={rows[b.code] === "out" || undefined}>
                          <span className={css.batchThumbs}>
                            <img src={b.img} alt="" />
                          </span>
                          <span className={css.batchName}>
                            <b>
                              <span className={base.num}>{b.code}</span> {t(b.name)}
                            </b>
                            <em>{b.frames.map((f) => t(f)).join(" · ")}</em>
                          </span>
                          <span className={css.batchActs}>
                            {rows[b.code] === "ok" && (
                              <>
                                <span className={css.batchOk}>{t({ en: "Ready", tr: "Hazır" })}</span>
                                <button onClick={() => setRows((r) => ({ ...r, [b.code]: "out" }))}>{t({ en: "Leave out", tr: "Çıkar" })}</button>
                              </>
                            )}
                            {rows[b.code] === "front" && (
                              <>
                                <span className={css.batchWarn}>{t({ en: "No front frame", tr: "Ön kare eksik" })}</span>
                                <button onClick={() => setRows((r) => ({ ...r, [b.code]: "ok" }))}>{t({ en: "Add it", tr: "Kare ekle" })}</button>
                                <button onClick={() => setRows((r) => ({ ...r, [b.code]: "out" }))}>{t({ en: "Leave out", tr: "Çıkar" })}</button>
                              </>
                            )}
                            {rows[b.code] === "out" && (
                              <>
                                <span>{t({ en: "Not in this batch", tr: "Bu batch'te yok" })}</span>
                                <button onClick={() => setRows((r) => ({ ...r, [b.code]: "ok" }))}>{t({ en: "Put back", tr: "Geri al" })}</button>
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <p className={css.keptNote}>
                    {t({ en: "One setup for every product; products that need another go in another batch.", tr: "Tüm ürünler aynı kurulumla üretilir; farklı kurulum isteyenler ayrı batch olur." })}
                  </p>
                </>
              )}

              {/* ── check: what the system made — approve it, or make a frame again ── */}
              {openKind === "check" && open && (
                <>
                  <Head
                    summary={summary}
                    sheet={layout === "sheet"}
                    step={stepOf(open)}
                    onStep={(d) => goStep(open, d)}
                    q={phase === "idle" ? (optionalGhost ? t({ en: "Turn it into a ghost?", tr: "Ghost'a dönüştürelim mi?" }) : t({ en: "Make the ghost.", tr: "Ghost'u üret." })) : ghostSkip ? t({ en: "The shoot is used as it is.", tr: "Çekim olduğu gibi kullanılıyor." }) : t({ en: "Is the ghost right?", tr: "Ghost doğru mu?" })}
                    hint={optionalGhost && phase === "idle" ? t({ en: "An amateur shoot comes out better as a clean ghost; skip it if yours is already clean.", tr: "Amatör bir çekim temiz bir ghost'la daha iyi sonuç verir; çekimin zaten temizse atla." }) : undefined}
                    onClose={close}
                    side={
                      optionalGhost && phase === "idle" ? (
                        <>
                          <button
                            className={base.ghostBtn}
                            onClick={() => {
                              setGhostSkip(true);
                              setPhase("approved");
                              advance(open, false);
                            }}
                          >
                            {t({ en: "Skip", tr: "Atla" })}
                          </button>
                          <button
                            className={`${base.primary} ${css.slim}`}
                            onClick={() => {
                              setGhostSkip(false);
                              setPhase("making");
                            }}
                            disabled={uploadPending}
                          >
                            {t({ en: "Turn into a ghost", tr: "Ghost'a dönüştür" })} <Arrow />
                          </button>
                        </>
                      ) : phase === "idle" ? (
                        <button className={`${base.primary} ${css.slim}`} onClick={prepare} disabled={!s.guest && (short || uploadPending)}>
                          {s.guest ? t({ en: "Open an account and make", tr: "Hesap aç ve üret" }) : t({ en: "Make", tr: "Üret" })} <Arrow />
                        </button>
                      ) : (
                        <button className={`${base.primary} ${css.slim}`} onClick={approve} disabled={phase !== "review" || !!remaking}>
                          {phase === "approved" ? t({ en: "Approved", tr: "Onaylandı" }) : phase === "making" ? t({ en: "Preparing", tr: "Hazırlanıyor" }) : t({ en: "Approve", tr: "Onayla" })}
                          {phase === "review" && <Arrow />}
                        </button>
                      )
                    }
                  />
                  <div className={css.checks}>
                    {ghosts!.map((g) => (
                      <figure key={g.id} className={css.pair}>
                        <img className={css.pairFrom} src={g.before} alt="" />
                        <span className={css.pairTo}>
                          {phase === "making" || remaking === g.id ? <span className={css.waiting} /> : phase === "idle" ? null : <img key={ghostOut(g)} src={ghostOut(g)} alt="" />}
                        </span>
                        <figcaption>
                          <span>{t(g.label)}</span>
                          {phase === "review" && (
                            <button onClick={() => remake(g)} disabled={!!remaking}>
                              {remaking === g.id
                                ? t({ en: "Remaking…", tr: "Yeniden üretiliyor…" })
                                : remakeCost
                                  ? t({ en: `Make again · ${remakeCost} credit`, tr: `Yeniden üret · ${remakeCost} kredi` })
                                  : t({ en: "Make again", tr: "Yeniden üret" })}
                            </button>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  {flow.auto && (
                    <p className={css.keptNote}>
                      {t({ en: "This ghost can't be downloaded.", tr: "Bu ghost indirilemez." })}
                      <Link href="/concepts/e/ghost">{t({ en: "Flat to Ghost", tr: "Flat'ten Ghost'a" })}</Link>
                    </p>
                  )}
                </>
              )}

              {/* ── input: what the user brought — shown, not chosen ── */}
              {openKind === "input" && (
                <>
                  <Head summary={summary} sheet={layout === "sheet"} q={t(flow.inputQ)} onClose={close} />
                  {flowId === "campaign" && (
                    /* wf-13 · 01: batch is this flow run for many products — a mode, not another flow */
                    <nav className={css.mode} aria-label={t({ en: "Mode", tr: "Mod" })}>
                      <span aria-current="true">{t({ en: "One product", tr: "Tek ürün" })}</span>
                      {partner ? (
                        <Link href="/concepts/e/batch">{t({ en: "Batch · up to 20", tr: "Toplu · 20 ürüne kadar" })}</Link>
                      ) : (
                        <Link href="/packages?from=%2Fconcepts%2Fe" data-locked>
                          <Lock size={10} /> {t({ en: "Batch · Partner", tr: "Toplu · Partner" })}
                        </Link>
                      )}
                    </nav>
                  )}
                  <div className={ch.grid} style={{ "--ratio": "3 / 4", "--min": "170px" } as CSSProperties}>
                    {input.map((f) => (
                      <Card key={f.id} plain img={f.img} name={t(f.label)} still />
                    ))}
                  </div>
                </>
              )}

              {/* ── kept: taken from the shoot and kept — nothing to choose ── */}
              {openKind === "kept" && (
                <>
                  <Head
                    summary={summary}
                    sheet={layout === "sheet"}
                    q={open === "setting" ? t({ en: "The setting stays.", tr: "Ortam çekimden gelir." }) : t({ en: "Pose and light stay.", tr: "Poz ve ışık çekimden gelir." })}
                    onClose={close}
                  />
                  <div className={ch.grid} style={{ "--ratio": "3 / 4", "--min": "170px" } as CSSProperties}>
                    {shoot.map((f) => (
                      <Card key={f.id} plain img={f.img} name={t(f.label)} note={open === "setting" ? t(SHOOT_SETTING) : undefined} still />
                    ))}
                  </div>
                  <p className={css.keptNote}>
                    {t({ en: "To change these too:", tr: "Bunları da değiştirmek için:" })}
                    <Link href="/concepts/e/restyle">{t({ en: "Look Composer", tr: "Look Composer" })}</Link>
                  </p>
                </>
              )}
            </div>
          </aside>
        )}

        {/* ═════════ the production bar: scanned at a glance, never louder than the canvas ═════════ */}
        <footer className={css.bar}>
          <span className={css.barLeft}>
            <Progress configured={decisions.length - remaining} total={decisions.length} />
            <span className={css.status}>
              {running
                ? flowId === "turn"
                  ? t({ en: "Making the video", tr: "Video hazırlanıyor" })
                  : t({ en: `Making v${latest!.id} · ${latest!.done}/${n}`, tr: `v${latest!.id} üretiliyor · ${latest!.done}/${n}` })
                : phase === "making"
                  ? t({ en: "Preparing the ghost", tr: "Ghost hazırlanıyor" })
                  : attention
                    ? kindOf(attention) === "pick"
                      ? t({ en: "Front and back are the same frame", tr: "Ön ve arka aynı kare" })
                      : t({ en: `${labelOf(attention)} belongs to Partner`, tr: `${labelOf(attention)} Partner'a ait` })
                    : makeable && short
                      ? t({ en: `Not enough credits · ${credits} needed`, tr: `Kredi yetmiyor · ${credits} gerekli` })
                      : flowId === "ghost" && phase === "idle" && !uploadPending
                        ? t({ en: "Ready to make", tr: "Üretime hazır" })
                        : nextUp
                          ? kindOf(nextUp) === "check"
                            ? t({ en: "The ghost is waiting for you", tr: "Ghost onay bekliyor" })
                            : remaining === decisions.length
                              ? t({ en: `${t(countOf(decisions.length))} and the system is ready`, tr: `${t(countOf(decisions.length))} ve sistem hazır` })
                              : t({ en: `${labelOf(nextUp)} is next`, tr: `Sırada: ${labelOf(nextUp).toLowerCase()}` })
                          : flowId === "ghost"
                            ? t({ en: "Ghost ready · in your jobs", tr: "Ghost hazır · İşlerim'de" })
                            : !latest
                              ? flowId === "turn"
                                ? t({ en: "Front and back are picked", tr: "Ön ve arka seçildi" })
                                : t({ en: "Ready to make", tr: "Üretime hazır" })
                              : changed
                                ? t({ en: "Decisions changed", tr: "Kararlar değişti" })
                                : isSample
                                  ? t({ en: "Your first frames are ready", tr: "İlk karelerin hazır" })
                                  : t({ en: `v${latest.id} ready · kept 7 days`, tr: `v${latest.id} hazır · 7 gün saklanır` })}
            </span>
          </span>
          <span className={css.barRight}>
            <span className={css.saved}>
              <Check size={11} /> {t({ en: "Saved", tr: "Kaydedildi" })}
            </span>
            <span className={css.cost}>
              <span className={base.num}>{credits}</span> {t({ en: "credits", tr: "kredi" })}
              {isSample && <em>{t({ en: " · first frame free", tr: " · ilk kare ücretsiz" })}</em>}
            </span>
            {/* after the run: what comes next */}
            {!open && isSample && latest?.finished && !changed && (
              <Link href="/" className={base.ghostBtn}>
                {t({ en: "Try your own product", tr: "Kendi ürününle dene" })} →
              </Link>
            )}
            {!open && (flowId === "campaign" || flowId === "restyle") && latest?.finished && !changed && (
              <Link href="/concepts/e/turn?from=campaign" className={base.ghostBtn}>
                {t({ en: "180° video", tr: "180° video" })}
              </Link>
            )}
            {!open && flowId === "ghost" && phase === "approved" && (
              <button
                className={base.ghostBtn}
                onClick={() => {
                  setDownloaded(true);
                  void downloadImage(ghostOut(ghosts![0]), fileName(t(flow.item), 0), s.role === "explorer");
                }}
              >
                {downloaded ? t({ en: "Downloaded", tr: "İndirildi" }) : t({ en: "Download", tr: "İndir" })}
              </button>
            )}
            {/* while a step is open, its own panel carries the action; the bar only reports */}
            {open ? null : running || phase === "making" ? (
              <button className={`${base.primary} ${css.slim}`} disabled>
                {running ? t({ en: "Making", tr: "Üretiliyor" }) : t({ en: "Preparing", tr: "Hazırlanıyor" })}
              </button>
            ) : attention ? (
              <button className={`${base.primary} ${css.slim}`} onClick={() => openNode(attention)}>
                {t({ en: "Check", tr: "Kontrol et" })} <Arrow />
              </button>
            ) : makeable && short && !s.guest ? (
              <Link href={`/packages?from=${encodeURIComponent(flowId === "campaign" ? "/concepts/e" : `/concepts/e/${flowId}`)}`} className={`${base.primary} ${css.slim}`}>
                {t({ en: "Add credits", tr: "Kredi ekle" })} <Arrow />
              </Link>
            ) : flowId === "ghost" && phase === "idle" && !uploadPending ? (
              <button className={`${base.primary} ${css.slim}`} onClick={prepare}>
                {s.guest ? t({ en: "Open an account and make", tr: "Hesap aç ve üret" }) : t({ en: "Make", tr: "Üret" })} <Arrow />
              </button>
            ) : nextUp ? (
              <button className={`${base.primary} ${css.slim} ${remaining === decisions.length ? css.lit : ""}`} onClick={() => openNode(nextUp)}>
                {kindOf(nextUp) === "check"
                  ? t({ en: "Check", tr: "Kontrol et" })
                  : remaining === decisions.length
                    ? t({ en: "Start building", tr: "Kurmaya başla" })
                    : t({ en: "Continue", tr: "Devam et" })}{" "}
                <Arrow />
              </button>
            ) : flowId === "ghost" ? (
              <Link href={`/concepts/e?product=${encodeURIComponent(ghostOut(ghosts![0]))}`} className={`${base.primary} ${css.slim}`}>
                {t({ en: "On to a campaign", tr: "Kampanyaya devam et" })} <Arrow />
              </Link>
            ) : latest && !changed ? (
              /* the frames are ready: the way to them lights up like a finished cable (Elif) */
              <Link href={latest.jobId ? `/jobs/${latest.jobId}` : flow.result} className={`${base.primary} ${css.slim} ${css.lit}`}>
                {flowId === "turn" ? t({ en: "See the video", tr: "Videoya git" }) : t({ en: "See the frames", tr: "Karelere git" })} <Arrow />
              </Link>
            ) : (
              <button className={`${base.primary} ${css.slim}`} onClick={make}>
                {s.guest ? t({ en: "Open an account and make", tr: "Hesap aç ve üret" }) : latest ? t({ en: "Make a new version", tr: "Yeni versiyon üret" }) : flowId === "turn" ? t({ en: "Make the video", tr: "Videoyu hazırla" }) : t({ en: "Make", tr: "Üret" })} <Arrow />
              </button>
            )}
          </span>
        </footer>
      </main>
    </ConceptShell>
  );
}

/* ───────────── parts ───────────── */

function Head({
  q,
  hint,
  side,
  step,
  onStep,
  onClose,
  summary,
  sheet,
}: {
  q: string;
  hint?: string;
  side?: ReactNode;
  summary: string;
  sheet?: boolean; // on the full-screen step the way back lives in the flow strip
  step?: { at: number; of: number; label: string };
  onStep?: (d: -1 | 1) => void;
  onClose: () => void;
}) {
  const { t } = useAtelier();
  return (
    <header className={css.head}>
      <div className={css.headBar}>
        {step && step.of > 1 ? (
          <span className={css.stepNav}>
            <button onClick={() => onStep?.(-1)} disabled={step.at <= 1} aria-label={t({ en: "Previous step", tr: "Önceki adım" })}>
              <Chevron dir="left" size={12} />
            </button>
            <span>
              {step.label}{" "}
              <span className={base.num}>
                {step.at}/{step.of}
              </span>
            </span>
            <button onClick={() => onStep?.(1)} disabled={step.at >= step.of} aria-label={t({ en: "Next step", tr: "Sonraki adım" })}>
              <Chevron size={12} />
            </button>
          </span>
        ) : (
          <span />
        )}
        <span className={css.summary}>{summary}</span>
        {!sheet && (
          <button className={css.back} onClick={onClose} aria-label={t({ en: "Close", tr: "Kapat" })}>
            <Close size={12} />
            {t({ en: "Canvas", tr: "Kanvas" })}
          </button>
        )}
      </div>
      <h1 className={css.q}>{q}</h1>
      {(hint || side) && (
        <div className={css.headSub}>
          <p>{hint}</p>
          {side}
        </div>
      )}
    </header>
  );
}

function More({ count, first, all, setAll }: { count: number; first: number; all: boolean; setAll: (v: boolean) => void }) {
  const { t } = useAtelier();
  if (count <= first) return null;
  return (
    <button className={css.more} onClick={() => setAll(!all)}>
      {all ? t({ en: "Show fewer", tr: "Daha az göster" }) : t({ en: `See all ${count}`, tr: `Tümünü gör (${count})` })}
    </button>
  );
}

function Progress({ configured, total }: { configured: number; total: number }) {
  const { t } = useAtelier();
  return (
    <span className={css.progress} aria-label={t({ en: `${configured} of ${total} decisions`, tr: `${total} karardan ${configured}` })}>
      {Array.from({ length: total }, (_, k) => (
        <i key={k} data-on={k < configured || undefined} />
      ))}
      <span className={base.num}>
        {configured}/{total}
      </span>
    </span>
  );
}

/* a result: added when a run finishes, kept when a newer version comes */
function Output({
  run,
  outdated,
  older = 0,
  place,
  href,
  setThumb,
  name,
  small,
  offset,
  onDown,
  onMove,
  onUp,
  onClickCap,
}: {
  run: RunRec;
  outdated: boolean;
  older?: number;
  place: Place;
  href: string;
  setThumb: (el: HTMLElement | null) => void;
  name: string;
  small?: boolean;
  offset?: CSSProperties;
  /* moving the result like any node */
  onDown?: (e: RPointerEvent<HTMLElement>) => void;
  onMove?: (e: RPointerEvent<HTMLElement>) => void;
  onUp?: () => void;
  onClickCap?: (e: RMouseEvent) => void;
}) {
  const { t, s } = useAtelier();
  const n = run.frames.length;
  const style = { ...placeVars(place), ...offset, viewTransitionName: `e-node-${name}`, viewTransitionClass: "vt-card" } as CSSProperties;
  const marked = s.role === "explorer" && run.finished; // the free plan's mark, as it will download
  const st = !run.finished ? "working" : outdated ? "old" : "ready";
  const body = (
    <>
      <span className={css.thumb} ref={setThumb} style={{ viewTransitionName: `e-img-${name}` } as CSSProperties}>
        {marked && <span className={css.wm} aria-hidden />}
        {run.video ? (
          run.finished ? (
            <span className={css.spin}>
              {run.video.map((src, k) => (
                <img key={k} src={src} alt="" style={{ "--k": k } as CSSProperties} />
              ))}
            </span>
          ) : (
            <span className={css.slices}>
              <span className={css.waiting} />
            </span>
          )
        ) : run.frames.length > 6 ? (
          <span className={css.stack}>
            {run.frames.slice(0, 3).map((f, k) =>
              run.finished || k < run.done ? (
                <img key={f.id + k} className={css.layer} src={f.out} alt="" style={{ "--i": k } as CSSProperties} />
              ) : (
                <span key={f.id + k} className={`${css.layer} ${css.waiting}`} style={{ "--i": k } as CSSProperties} />
              ),
            )}
          </span>
        ) : (
          <span className={css.slices}>
            {run.frames.map((f, k) =>
              run.finished || k < run.done ? <Seam key={f.id} before={f.before} after={f.out} mode="reveal" className={css.slice} /> : <span key={f.id} className={css.waiting} />,
            )}
          </span>
        )}
      </span>
      <span className={css.text} style={{ viewTransitionName: `e-txt-${name}`, viewTransitionClass: "vt-text" } as CSSProperties}>
        <span className={css.line}>
          <span className={css.label}>
            {t({ en: "Result", tr: "Sonuç" })} {!run.meta && <span className={base.num}>v{run.id}</span>}
            {older > 0 && <span className={css.older}> +{older}</span>}
          </span>
          <span className={css.state} data-state={st}>
            {st === "working" ? t({ en: "Making", tr: "Üretiliyor" }) : st === "old" ? t({ en: "Earlier", tr: "Önceki" }) : t({ en: "Ready", tr: "Hazır" })}
          </span>
        </span>
        {!small && (
          <span className={css.value}>
            {run.video ? t({ en: "1 video", tr: "1 video" }) : run.finished ? t({ en: `${n} frames`, tr: `${n} kare` }) : `${run.done} / ${n}`}
          </span>
        )}
        {!small && <span className={css.meta}>{run.meta ? t(run.meta) : run.cast ? `${run.cast} · ${t(run.setting)}` : t(run.setting)}</span>}
      </span>
    </>
  );
  const cls = `${css.node} ${css.output} ${small ? css.small : ""}`;
  return run.finished ? (
    <Link href={href} className={cls} data-card data-zone="result" style={style} data-drag={onDown ? name : undefined} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onClickCapture={onClickCap}>
      {body}
    </Link>
  ) : (
    <div className={cls} data-card data-zone="result" style={style} data-drag={onDown ? name : undefined} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onClickCapture={onClickCap}>
      {body}
    </div>
  );
}

/* a Partner capability: a section of its own, marked as Partner's, below the
   curated choices — open for Partner, one line and one example otherwise */
function Tier({ title, line, example, unlocked, children }: { title: string; line: string; example: string; unlocked: boolean; children: ReactNode }) {
  const { t } = useAtelier();
  return (
    <section className={css.tier} data-unlocked={unlocked || undefined}>
      <header className={css.tierHead}>
        <span>
          {!unlocked && <Lock size={10} />}
          {t({ en: "Partner", tr: "Partner'a özel" })}
        </span>
        <h2>{title}</h2>
      </header>
      {unlocked ? (
        children
      ) : (
        <div className={css.locked}>
          <img src={example} alt="" />
          <span>{line}</span>
          <em>{t({ en: "Opens with Partner", tr: "Partner'da açılır" })}</em>
        </div>
      )}
    </section>
  );
}

/* review tools, not product UI: every flow on the canvas, and the two ways the panel can open */
const FLOW_ORDER: FlowId[] = ["campaign", "batch", "recast", "restyle", "ghost", "turn"];
function FlowPicker({ flow }: { flow: FlowId }) {
  const { t } = useAtelier();
  return (
    <nav className={ch.picker} aria-label={t({ en: "Flow", tr: "Akış" })}>
      <span>{t({ en: "Flow", tr: "Akış" })}</span>
      {FLOW_ORDER.map((id) => (
        <Link key={id} href={`/concepts/e${id === "campaign" ? "" : `/${id}`}?mod`} className={flow === id ? ch.on : undefined} aria-current={flow === id ? "page" : undefined}>
          {t(FLOWS[id]({ sample: null, from: null }).name)}
        </Link>
      ))}
    </nav>
  );
}

function PanelPicker({ panel, onChange }: { panel: "overlay" | "split"; onChange: (p: "overlay" | "split") => void }) {
  const { t } = useAtelier();
  return (
    <div className={ch.picker} role="radiogroup" aria-label={t({ en: "Selection panel", tr: "Seçim paneli" })}>
      <span>{t({ en: "Panel", tr: "Panel" })}</span>
      {(["overlay", "split"] as const).map((p) => (
        <button key={p} role="radio" aria-checked={panel === p} className={panel === p ? ch.on : undefined} onClick={() => onChange(p)}>
          {p === "overlay" ? t({ en: "Over the canvas", tr: "Katman" }) : t({ en: "Split (before)", tr: "Bölünmüş (önceki)" })}
        </button>
      ))}
    </div>
  );
}

/* a panel's filter: words, the chosen one underlined in gold */
function Filters<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, L][] }) {
  const { t } = useAtelier();
  return (
    <nav className={css.filters} aria-label={t({ en: "Filter", tr: "Filtre" })}>
      {items.map(([id, label]) => (
        <button key={id} aria-pressed={value === id} onClick={() => onChange(id)}>
          {t(label)}
        </button>
      ))}
    </nav>
  );
}

/* a card with a star beside it — kept as a sibling, so the card stays one button */
function Faved({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: ReactNode }) {
  const { t } = useAtelier();
  return (
    <div className={css.faved}>
      {children}
      <button className={css.fav} aria-pressed={on} aria-label={on ? t({ en: "Remove from favourites", tr: "Favorilerden çıkar" }) : t({ en: "Add to favourites", tr: "Favorilere ekle" })} onClick={onToggle}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
