import type { L, Upload } from "@/lib/data";
import type { Door } from "../home/options";

/* Explore's sample sets (wf-10 · 01). Real product photos, grouped by the
   kind of input they are — so picking a set quietly picks the flows it can
   try (wf-10 · 02). The first try is free and one frame: the open decision
   in wf-10 is drawn that way, and so is it here. */

export type SetId = "coat" | "shirt" | "cardigan" | "dress";

export interface SampleSet {
  id: SetId;
  name: L;
  kind: L; // what kind of input it is
  frames: string[]; // what the set holds, shown on its page
  uploads: Upload[]; // what enters the flow
  isFlat?: boolean;
  doors: Door[];
}

const FREE: L = { en: "First frame free", tr: "İlk kare ücretsiz" };
const TURN_SOON = (after: string): Door => ({
  id: "turn",
  name: { en: "180° Product Video", tr: "180° Ürün Videosu" },
  line: { en: "Turns a front and a back frame into a 5-second spin.", tr: "Ön ve arka kareyi 5 saniyelik bir dönüşe çevirir." },
  credit: { en: "4 credits / video", tr: "4 kredi / video" },
  status: "soon",
  before: after,
  after,
});

export const SETS: SampleSet[] = [
  {
    id: "coat",
    name: { en: "Coat", tr: "Kaban" },
    kind: { en: "Ghost · front, back, detail", tr: "Ghost · ön, arka, detay" },
    frames: ["/img/home/ghost-in.jpg", "/img/flow/coat-back.jpg", "/img/flow/coat-detail.jpg"],
    uploads: [
      { id: "x1", src: "/img/home/ghost-in.jpg", name: "coat_front.jpg", slot: "front" },
      { id: "x2", src: "/img/flow/coat-back.jpg", name: "coat_back.jpg", slot: "back" },
      { id: "x3", src: "/img/flow/coat-detail.jpg", name: "coat_lapel.jpg", slot: "detail" },
    ],
    doors: [
      {
        id: "campaign",
        name: { en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" },
        line: { en: "Dresses the coat on a model, in a setting.", tr: "Kabanı seçtiğin mankene, seçtiğin ortamda giydirir." },
        credit: FREE,
        status: "open",
        href: "/concepts/e?sample=coat",
        before: "/img/home/ghost-in.jpg",
        after: "/img/flow/out-front.jpg",
      },
      { ...TURN_SOON("/img/flow/out-back.jpg"), status: "open", href: "/concepts/e/turn?from=campaign" },
    ],
  },
  {
    id: "shirt",
    name: { en: "Shirt", tr: "Gömlek" },
    kind: { en: "Ghost · front, back, detail", tr: "Ghost · ön, arka, detay" },
    frames: ["/img/explore/shirt-front.jpg", "/img/explore/shirt-back.jpg", "/img/explore/shirt-detail.jpg"],
    uploads: [
      { id: "y1", src: "/img/explore/shirt-front.jpg", name: "shirt_front.jpg", slot: "front" },
      { id: "y2", src: "/img/explore/shirt-back.jpg", name: "shirt_back.jpg", slot: "back" },
      { id: "y3", src: "/img/explore/shirt-detail.jpg", name: "shirt_collar.jpg", slot: "detail" },
    ],
    doors: [
      {
        id: "campaign",
        name: { en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" },
        line: { en: "Dresses the shirt on a model, in a setting.", tr: "Gömleği seçtiğin mankene, seçtiğin ortamda giydirir." },
        credit: FREE,
        status: "open",
        href: "/concepts/e?sample=shirt",
        before: "/img/explore/shirt-front.jpg",
        after: "/img/home/sample-out.jpg",
      },
      TURN_SOON("/img/home/sample-out.jpg"),
    ],
  },
  {
    id: "cardigan",
    name: { en: "Cardigan", tr: "Hırka" },
    kind: { en: "Amateur flat · 1 photo", tr: "Amatör flat · 1 fotoğraf" },
    frames: ["/img/home/flat-in.jpg"],
    uploads: [{ id: "z1", src: "/img/home/flat-in.jpg", name: "IMG_4471.jpg", slot: "front" }],
    isFlat: true,
    doors: [
      {
        id: "ghostFlow",
        name: { en: "Flat to Ghost", tr: "Flat'ten Ghost'a" },
        line: { en: "Turns the phone photo into a clean packshot.", tr: "Telefon fotoğrafını temiz katalog karesine çevirir." },
        credit: FREE,
        status: "open",
        href: "/concepts/e/ghost?sample=cardigan",
        before: "/img/home/flat-in.jpg",
        after: "/img/home/ghostflow-out.jpg",
      },
      {
        id: "campaignFlat",
        name: { en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" },
        line: { en: "Cleans it first, then dresses it on a model.", tr: "Önce temizler, sonra seçtiğin mankene giydirir." },
        credit: FREE,
        status: "open",
        href: "/concepts/e/ghost?sample=cardigan",
        before: "/img/home/flat-in.jpg",
        after: "/img/home/campaignflat-out.jpg",
      },
    ],
  },
  {
    id: "dress",
    name: { en: "Model shoot", tr: "Mankenli çekim" },
    kind: { en: "Dress on a model · 3 frames", tr: "Mankenli elbise · 3 kare" },
    frames: ["/img/home/onmodel-in.jpg", "/img/explore/dress-turn.jpg", "/img/explore/dress-back.jpg"],
    uploads: [{ id: "w1", src: "/img/home/onmodel-in.jpg", name: "shoot_01.jpg", slot: "front" }],
    doors: [
      {
        id: "recast",
        name: { en: "Model Swap", tr: "Model Swap" },
        line: { en: "Swaps only the model; light and pose stay.", tr: "Yalnızca mankeni değiştirir; ışık ve poz aynı kalır." },
        credit: FREE,
        status: "open",
        href: "/concepts/e/recast?sample=dress",
        before: "/img/home/onmodel-in.jpg",
        after: "/img/home/recast-out.jpg",
      },
      {
        id: "restyle",
        name: { en: "Look Composer", tr: "Look Composer" },
        line: { en: "Restages it: new model, setting and pose.", tr: "Aynı ürünle yeni manken, ortam ve poz kurar." },
        credit: { en: "2 credits / frame", tr: "2 kredi / kare" },
        status: "soon",
        before: "/img/home/onmodel-in.jpg",
        after: "/img/home/restyle-out.jpg",
      },
    ],
  },
];

export const setById = (id?: string | null) => SETS.find((s) => s.id === id) ?? null;

/* the one frame a free try delivers, per set and flow */
export const exploreOut = (set: SetId, flow: string): string =>
  flow === "ghost"
    ? "/img/home/ghostflow-out.jpg"
    : flow === "recast"
      ? "/img/home/recast-out.jpg"
      : { coat: "/img/flow/out-front.jpg", shirt: "/img/home/sample-out.jpg", cardigan: "/img/home/campaignflat-out.jpg", dress: "/img/home/recast-out.jpg" }[set];
