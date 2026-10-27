import type { L } from "@/lib/data";

/* The dashboard's one question and its four answers. Each answer carries
   what it is (said in one sentence, shown in one image pair) and the doors
   it opens. Hrefs point at the newest version of each surface. */

export type Have = "ghost" | "onModel" | "flat" | "nothing";

export interface Door {
  id: string;
  name: L;
  line: L; // what the flow does — one short, verb-led line (not what the input is)
  credit?: L;
  status: "open" | "soon" | "draft";
  href?: string;
  before: string;
  after: string;
}

export interface Option {
  id: Have;
  label: L;
  sub: L;
  peek: L;
  thumb: string;
  example: string; // "what this looks like" — shown on hover
  before: string;
  after: string;
  world: string; // variant B: the world this answer opens onto
  doors: Door[];
  draft?: boolean;
}

const CAMPAIGN: Door = {
  id: "campaign",
  name: { en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" },
  line: { en: "Dresses your product on a model, in a setting.", tr: "Ürünü seçtiğin mankene, seçtiğin ortamda giydirir." },
  credit: { en: "1 credit / frame", tr: "1 kredi / kare" },
  status: "open",
  href: "/concepts/e",
  before: "/img/home/ghost-in.jpg",
  after: "/img/home/campaign-out.jpg",
};

const TURN: Door = {
  id: "turn",
  name: { en: "180° Product Video", tr: "180° Ürün Videosu" },
  line: { en: "Turns a front and a back frame into a 5-second spin.", tr: "Ön ve arka kareyi 5 saniyelik bir dönüşe çevirir." },
  credit: { en: "4 credits / video", tr: "4 kredi / video" },
  status: "open",
  href: "/concepts/e/turn",
  before: "/img/home/campaign-out.jpg",
  after: "/img/home/turn-out.jpg",
};

export const OPTIONS: Option[] = [
  {
    id: "ghost",
    label: { en: "A ghost shot", tr: "Ghost çekim" },
    sub: { en: "Product photo, no model", tr: "Mankensiz ürün fotoğrafı" },
    peek: {
      en: "A clean product photo, shot as if worn by no one. We dress it on a cast of your choosing.",
      tr: "Ürün, sanki görünmez biri giymiş gibi temiz çekilir. Biz onu seçtiğin bir cast'e giydiririz.",
    },
    thumb: "/img/home/ghost-in.jpg",
    example: "/img/home/ghost-in.jpg",
    before: "/img/home/ghost-in.jpg",
    after: "/img/home/campaign-out.jpg",
    world: "/img/home/campaign-out.jpg",
    doors: [CAMPAIGN, TURN],
  },
  {
    id: "onModel",
    label: { en: "A model shoot", tr: "Mankenli çekim" },
    sub: { en: "The product, already worn", tr: "Ürün bir mankenin üzerinde" },
    peek: {
      en: "Frames where the product is already worn. We change the model, the setting or the pose — the product stays.",
      tr: "Ürünün zaten giyildiği kareler. Mankeni, ortamı ya da pozu değiştiririz — ürün aynı kalır.",
    },
    thumb: "/img/home/onmodel-in.jpg",
    example: "/img/home/onmodel-in.jpg",
    before: "/img/home/onmodel-in.jpg",
    after: "/img/home/recast-out.jpg",
    world: "/img/home/restyle-out.jpg",
    doors: [
      {
        id: "recast",
        name: { en: "Model Swap", tr: "Model Swap" },
        line: { en: "Swaps only the model; light and pose stay.", tr: "Yalnızca mankeni değiştirir; ışık ve poz aynı kalır." },
        credit: { en: "1 credit / frame", tr: "1 kredi / kare" },
        status: "open",
        href: "/concepts/e/recast",
        before: "/img/home/onmodel-in.jpg",
        after: "/img/home/recast-out.jpg",
      },
      {
        id: "restyle",
        name: { en: "Look Composer", tr: "Look Composer" },
        line: { en: "Restages it: new model, setting and pose.", tr: "Aynı ürünle yeni manken, ortam ve poz kurar." },
        credit: { en: "2 credits / frame", tr: "2 kredi / kare" },
        status: "open",
        href: "/concepts/e/restyle",
        before: "/img/home/onmodel-in.jpg",
        after: "/img/home/restyle-out.jpg",
      },
      TURN,
    ],
  },
  {
    id: "flat",
    label: { en: "A flat lay", tr: "Flat çekim" },
    sub: { en: "On a floor or a table", tr: "Yerde ya da masada çekilmiş" },
    peek: {
      en: "Laid on a floor, bed or table and shot on a phone. We clean it into a ghost shot first.",
      tr: "Yerde, yatakta ya da masada, telefonla çekilmiş. Önce temiz bir ghost çekime çeviririz.",
    },
    thumb: "/img/home/flat-in.jpg",
    example: "/img/home/flat-in.jpg",
    before: "/img/home/flat-in.jpg",
    after: "/img/home/ghostflow-out.jpg",
    world: "/img/home/campaignflat-out.jpg",
    doors: [
      {
        id: "ghostFlow",
        name: { en: "Flat to Ghost", tr: "Flat'ten Ghost'a" },
        line: { en: "Turns a phone photo into a clean packshot.", tr: "Telefon fotoğrafını temiz katalog karesine çevirir." },
        credit: { en: "1 credit / frame", tr: "1 kredi / kare" },
        status: "open",
        href: "/concepts/e/ghost",
        before: "/img/home/flat-in.jpg",
        after: "/img/home/ghostflow-out.jpg",
      },
      {
        ...CAMPAIGN,
        id: "campaignFlat",
        href: "/concepts/e/ghost",
        line: { en: "Cleans it first, then dresses it on a model.", tr: "Önce temizler, sonra seçtiğin mankene giydirir." },
        before: "/img/home/flat-in.jpg",
        after: "/img/home/campaignflat-out.jpg",
      },
    ],
  },
  {
    id: "nothing",
    label: { en: "Nothing yet", tr: "Henüz bir şey yok" },
    sub: { en: "Start without a photo", tr: "Fotoğrafsız başla" },
    peek: {
      en: "No product photo yet. Start from a sample set, or design your own cast.",
      tr: "Henüz ürün fotoğrafın yok. Örnek bir setle başla ya da kendi kadronu tasarla.",
    },
    thumb: "/img/home/nothing.jpg",
    example: "/img/home/nothing.jpg",
    before: "/img/home/nothing.jpg",
    after: "/img/home/sample-out.jpg",
    world: "/img/home/nothing.jpg",
    draft: true,
    doors: [
      {
        id: "sample",
        name: { en: "Try a sample set", tr: "Örnek setle dene" },
        line: { en: "A ready product, a free first frame.", tr: "Hazır bir ürünle ücretsiz ilk kare." },
        credit: { en: "First frame free", tr: "İlk kare ücretsiz" },
        status: "open",
        href: "/explore",
        before: "/img/home/nothing.jpg",
        after: "/img/home/sample-out.jpg",
      },
      {
        id: "studio",
        name: { en: "Design your own cast", tr: "Kendi kadronu tasarla" },
        line: { en: "Designs a model only you can use.", tr: "Yalnızca sana ait bir manken tasarlar." },
        status: "open",
        href: "/studio",
        before: "/img/home/nothing.jpg",
        after: "/img/home/studio-out.jpg",
      },
    ],
  },
];

export const optionById = (id: string | null) => OPTIONS.find((o) => o.id === id) ?? null;
