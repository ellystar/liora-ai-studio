/* Mock data for the prototype. Nothing here talks to a backend; the shapes
   follow the user stories so the real endpoints can slot in later. */

export type Lang = "en" | "tr";
export type L = Record<Lang, string>;

export type Role = "explorer" | "creator" | "partner";
export type InputType = "product" | "onModel" | "flat";

export const ROLE_RANK: Record<Role, number> = { explorer: 0, creator: 1, partner: 2 };

/* Users see one name. The stories carry two (package + role); the prototype
   shows the role and keeps the package as a secondary line. */
export const ROLE_META: Record<Role, { package: string; label: L }> = {
  explorer: { package: "Free", label: { en: "Explorer", tr: "Explorer" } },
  creator: { package: "Basic", label: { en: "Creator", tr: "Creator" } },
  partner: { package: "Pro", label: { en: "Partner", tr: "Partner" } },
};

export const INPUTS: { id: InputType; label: L; caption: L; img: string }[] = [
  {
    id: "product",
    label: { en: "A product or ghost shot", tr: "Ürün ya da ghost fotoğrafı" },
    caption: { en: "Product photo", tr: "Ürün fotoğrafı" },
    img: "/img/home/ghost-in.jpg",
  },
  {
    id: "onModel",
    label: { en: "A shoot with a model", tr: "Mankenli bir çekim" },
    caption: { en: "Live model shoot", tr: "Mankenli çekim" },
    img: "/img/home/onmodel-in.jpg",
  },
  {
    id: "flat",
    label: { en: "An amateur flat shot", tr: "Amatör bir flat çekim" },
    caption: { en: "Amateur flat", tr: "Amatör flat" },
    img: "/img/home/flat-in.jpg",
  },
];

/* ───────────── Node skeletons ───────────── */

export type NodeKind =
  | "product"
  | "shoot"
  | "ghost"
  | "cast"
  | "setting"
  | "framing"
  | "quality"
  | "result";

export const NODE_LABEL: Record<NodeKind, L> = {
  product: { en: "Product", tr: "Ürün" },
  shoot: { en: "Shoot", tr: "Çekim" },
  ghost: { en: "Ghost", tr: "Ghost" },
  cast: { en: "Cast", tr: "Cast" },
  setting: { en: "Setting", tr: "Ortam" },
  framing: { en: "Framing", tr: "Kadraj" },
  quality: { en: "Quality", tr: "Kalite" },
  result: { en: "Result", tr: "Sonuç" },
};

export type FlowSlug = "campaign" | "ghost" | "recast" | "restyle" | "turn" | "batch";

export interface FlowDef {
  slug: FlowSlug;
  name: L;
  line: L; // one sentence: what it does
  inputs: InputType[];
  caption: L; // what it takes, shown inside the tile
  status: "open" | "soon";
  credit: L;
  creditPerFrame: number;
  nodes: NodeKind[];
  locked?: NodeKind[]; // filled from source, not editable
  before: string;
  after: string;
}

export const FLOWS: FlowDef[] = [
  {
    slug: "campaign",
    name: { en: "From Ghost to Campaign", tr: "Ghost'tan Kampanyaya" },
    line: {
      en: "Your product photo, worn by a cast of your choosing, in a setting you pick.",
      tr: "Ürün fotoğrafın, seçtiğin bir cast'in üzerinde, seçtiğin bir ortamda.",
    },
    inputs: ["product", "flat"],
    caption: { en: "Ghost or flat shot", tr: "Ghost ya da flat çekim" },
    status: "open",
    credit: { en: "1 credit / frame", tr: "1 kredi / kare" },
    creditPerFrame: 1,
    nodes: ["product", "cast", "setting", "framing", "quality", "result"],
    before: "/img/home/ghost-in.jpg",
    after: "/img/flow/out-three-quarter.jpg",
  },
  {
    slug: "ghost",
    name: { en: "Flat to Ghost", tr: "Flat'ten Ghost'a" },
    line: {
      en: "A phone photo on the floor becomes a clean catalogue packshot.",
      tr: "Yerde çekilmiş bir telefon fotoğrafı temiz bir katalog karesine dönüşür.",
    },
    inputs: ["flat"],
    caption: { en: "Amateur flat shot", tr: "Amatör flat çekim" },
    status: "open",
    credit: { en: "1 credit / frame", tr: "1 kredi / kare" },
    creditPerFrame: 1,
    nodes: ["product", "ghost", "result"],
    before: "/img/home/flat-in.jpg",
    after: "/img/home/ghostflow-out.jpg",
  },
  {
    slug: "restyle",
    name: { en: "Look Composer", tr: "Look Composer" },
    line: {
      en: "A new cast, setting and pose for a shoot you already have.",
      tr: "Elindeki çekim için yeni cast, ortam ve poz.",
    },
    inputs: ["onModel"],
    caption: { en: "Live model shoot", tr: "Mankenli çekim" },
    status: "open",
    credit: { en: "2 credits / frame", tr: "2 kredi / kare" },
    creditPerFrame: 2,
    nodes: ["shoot", "ghost", "cast", "setting", "framing", "quality", "result"],
    before: "/img/home/onmodel-in.jpg",
    after: "/img/home/restyle-out.jpg",
  },
  {
    slug: "recast",
    name: { en: "Model Swap", tr: "Model Swap" },
    line: {
      en: "Only the model changes. Pose, light and background stay exactly as shot.",
      tr: "Yalnızca manken değişir. Poz, ışık ve arka plan çekildiği gibi kalır.",
    },
    inputs: ["onModel"],
    caption: { en: "Live model shoot", tr: "Mankenli çekim" },
    status: "open",
    credit: { en: "1 credit / frame", tr: "1 kredi / kare" },
    creditPerFrame: 1,
    nodes: ["shoot", "cast", "setting", "framing", "result"],
    locked: ["setting", "framing"],
    before: "/img/home/onmodel-in.jpg",
    after: "/img/home/recast-out.jpg",
  },
  {
    slug: "turn",
    name: { en: "180° Product Video", tr: "180° Ürün Videosu" },
    line: {
      en: "A front and a back frame become a five-second turn.",
      tr: "Bir ön ve bir arka kare, beş saniyelik bir dönüşe dönüşür.",
    },
    inputs: ["product", "onModel"],
    caption: { en: "Front and back frame", tr: "Ön ve arka kare" },
    status: "open",
    credit: { en: "4 credits / video", tr: "4 kredi / video" },
    creditPerFrame: 4,
    nodes: ["product", "result"],
    before: "/img/flow/out-front.jpg",
    after: "/img/flow/out-back.jpg",
  },
  {
    slug: "batch",
    name: { en: "Batch campaign", tr: "Toplu kampanya" },
    line: {
      en: "Up to 20 products, one setup: the campaign run for a whole drop.",
      tr: "20 ürüne kadar, tek kurulum: bütün bir seri için kampanya.",
    },
    inputs: ["product"],
    caption: { en: "Many product photos", tr: "Çok ürün fotoğrafı" },
    status: "open",
    credit: { en: "1 credit / frame", tr: "1 kredi / kare" },
    creditPerFrame: 1,
    nodes: ["product", "cast", "setting", "framing", "result"],
    before: "/img/home/ghost-in.jpg",
    after: "/img/flow/out-front.jpg",
  },
];

export const flowBySlug = (slug: string) => FLOWS.find((f) => f.slug === slug);

/* ───────────── Cast ───────────── */

export interface Cast {
  id: string;
  name: string;
  img: string;
  minRole: Role; // lowest role that can use it
  own?: boolean; // partner's private cast from Cast Studio
  pending?: boolean; // reference-based cast awaiting review
  note: L;
  set?: string[]; // the identity set: the same person, other angles and moods
  from?: "text" | "reference"; // how a private cast was made
  ref?: string; // the reference photo it was made from (kept until review)
  archived?: boolean; // removed from the library; past jobs keep its name
  gender?: "woman" | "man"; // for the cast filter (there is no children's cast)
  exclusive?: boolean; // made yours in Cast Studio (30 credits): no one else can use it
}

/* the identity sets the catalogue ships with (Cast Studio makes the rest) */
export const CAST_SET: Record<string, string[]> = {
  ada: ["/img/flow/out-front.jpg", "/img/flow/out-three-quarter.jpg", "/img/flow/out-back.jpg"],
  mateo: ["/img/salon/d1.jpg", "/img/salon/d3.jpg", "/img/salon/d4.jpg"],
  imani: ["/img/salon/s1.jpg", "/img/salon/s2.jpg", "/img/salon/s3.jpg"],
  elias: ["/img/salon/k1.jpg", "/img/salon/k2.jpg", "/img/salon/k4.jpg"],
  yuki: ["/img/salon/a1.jpg", "/img/salon/a2.jpg", "/img/salon/a4.jpg"],
  liv: ["/img/salon/n1.jpg", "/img/salon/n2.jpg"],
  selin: ["/img/salon/r2.jpg", "/img/salon/r1.jpg"],
};

export const CASTS: Cast[] = [
  { id: "ada", name: "Ada", img: "/img/cast-ada.jpg", gender: "woman", minRole: "explorer", note: { en: "Mid-20s · olive · dark hair", tr: "20'ler · buğday ten · koyu saç" } },
  { id: "mateo", name: "Mateo", img: "/img/cast-mateo.jpg", gender: "man", minRole: "explorer", note: { en: "Mid-20s · wavy hair", tr: "20'ler · dalgalı saç" } },
  { id: "imani", name: "Imani", img: "/img/cast-imani.jpg", gender: "woman", minRole: "explorer", note: { en: "Early 20s · deep skin", tr: "20'ler · koyu ten" } },
  { id: "noor", name: "Noor", img: "/img/cast-noor.jpg", gender: "woman", minRole: "creator", note: { en: "Early 30s · curls", tr: "30'lar · kıvırcık" } },
  { id: "elias", name: "Elias", img: "/img/cast-elias.jpg", gender: "man", minRole: "creator", note: { en: "Early 30s · ash blond", tr: "30'lar · kül sarısı" } },
  { id: "yuki", name: "Yuki", img: "/img/cast-yuki.jpg", gender: "woman", minRole: "creator", note: { en: "30s · sleek bob", tr: "30'lar · küt kesim" } },
  { id: "liv", name: "Liv", img: "/img/cast-liv.jpg", gender: "woman", minRole: "partner", note: { en: "Late 50s · silver", tr: "50'ler · gümüş saç" } },
  { id: "arjun", name: "Arjun", img: "/img/cast-arjun.jpg", gender: "man", minRole: "partner", note: { en: "Late 20s · textured hair", tr: "20'ler · dokulu saç" } },
];

export const OWN_CASTS: Cast[] = [
  { id: "selin", name: "Selin", img: "/img/cast-selin.jpg", gender: "woman", minRole: "partner", own: true, from: "text", note: { en: "Private · from text", tr: "Özel · metinden" } },
  { id: "kaan", name: "Kaan", img: "/img/cast-kaan.jpg", gender: "man", minRole: "partner", own: true, pending: true, from: "reference", ref: "/img/cast-kaan.jpg", note: { en: "Private · from reference", tr: "Özel · referanstan" } },
];

export const allCasts = () => [...OWN_CASTS, ...CASTS];
export const castById = (id?: string) => allCasts().find((c) => c.id === id);

/* ───────────── Settings ───────────── */

export interface Setting {
  id: string;
  name: L;
  img: string;
  minRole: Role;
  own?: boolean;
  place?: "studio" | "outdoor"; // for the setting filter
  example?: string; // a frame shot there — shown on hover (placeholders until the real shoots arrive)
}

export const SETTINGS: Setting[] = [
  { id: "studio", name: { en: "Plaster studio", tr: "Alçı stüdyo" }, img: "/img/flow/set-studio.jpg", minRole: "explorer", place: "studio", example: "/img/out-recast.jpg" },
  { id: "courtyard", name: { en: "Limestone courtyard", tr: "Taş avlu" }, img: "/img/flow/set-courtyard.jpg", minRole: "explorer", place: "outdoor", example: "/img/flow/out-front.jpg" },
  { id: "travertine", name: { en: "Travertine room", tr: "Traverten oda" }, img: "/img/flow/set-travertine.jpg", minRole: "creator", place: "studio", example: "/img/out-restyle.jpg" },
  { id: "rooftop", name: { en: "Bosphorus terrace", tr: "Boğaz terası" }, img: "/img/flow/set-rooftop.jpg", minRole: "creator", place: "outdoor", example: "/img/salon-suit.jpg" },
  { id: "dunes", name: { en: "Dunes at dusk", tr: "Akşam kumulları" }, img: "/img/flow/set-dunes.jpg", minRole: "creator", place: "outdoor", example: "/img/salon-gown.jpg" },
];

export const OWN_SETTINGS: Setting[] = [
  { id: "library", name: { en: "The reading room", tr: "Okuma odası" }, img: "/img/flow/set-library.jpg", minRole: "partner", own: true, place: "studio" },
];

export const allSettings = () => [...OWN_SETTINGS, ...SETTINGS];
export const settingById = (id?: string) => allSettings().find((s) => s.id === id);

/* ───────────── Framing ───────────── */

export type Angle = "front" | "threeQuarter" | "back" | "detail" | "seated" | "walking" | "profile" | "leaning";

export const ANGLES: { id: Angle; label: L; short: string; out: string }[] = [
  { id: "front", label: { en: "Front", tr: "Ön" }, short: "F", out: "/img/flow/out-front.jpg" },
  { id: "threeQuarter", label: { en: "Three-quarter", tr: "Üç çeyrek" }, short: "¾", out: "/img/flow/out-three-quarter.jpg" },
  { id: "back", label: { en: "Back", tr: "Arka" }, short: "B", out: "/img/flow/out-back.jpg" },
  { id: "detail", label: { en: "Detail", tr: "Detay" }, short: "D", out: "/img/flow/out-detail.jpg" },
  { id: "seated", label: { en: "Seated", tr: "Oturan" }, short: "S", out: "/img/flow/out-seated.jpg" },
  /* more poses — placeholder pictures until each pose has its own shoot (Elif) */
  { id: "walking", label: { en: "Walking", tr: "Yürüyen" }, short: "W", out: "/img/salon/r3-s.jpg" },
  { id: "profile", label: { en: "Profile", tr: "Profil" }, short: "P", out: "/img/salon/r2-s.jpg" },
  { id: "leaning", label: { en: "Leaning", tr: "Yaslanan" }, short: "L", out: "/img/salon/a1-s.jpg" },
];

export const RATIOS = ["2:3", "4:5", "3:4", "1:1", "9:16"] as const;
export type Ratio = (typeof RATIOS)[number];

/* ───────────── Upload categories ───────────── */

export type Slot = "front" | "back" | "detail" | "complement" | "accessory";
export const SLOTS: { id: Slot; label: L }[] = [
  { id: "front", label: { en: "Front", tr: "Ön" } },
  { id: "back", label: { en: "Back", tr: "Arka" } },
  { id: "detail", label: { en: "Detail", tr: "Detay" } },
  { id: "complement", label: { en: "Complement", tr: "Tamamlayıcı" } },
  { id: "accessory", label: { en: "Accessory", tr: "Aksesuar" } },
];

export interface Upload {
  id: string;
  src: string;
  name: string;
  slot: Slot;
}

export const SAMPLE_PRO: Upload[] = [
  { id: "u1", src: "/img/home/ghost-in.jpg", name: "coat_front.jpg", slot: "front" },
  { id: "u2", src: "/img/flow/coat-back.jpg", name: "coat_back.jpg", slot: "back" },
  { id: "u3", src: "/img/flow/coat-detail.jpg", name: "coat_lapel.jpg", slot: "detail" },
  { id: "u4", src: "/img/flow/knit.jpg", name: "knit_under.jpg", slot: "complement" },
  { id: "u5", src: "/img/flow/belt.jpg", name: "belt.jpg", slot: "accessory" },
];

export const SAMPLE_FLAT: Upload[] = [
  { id: "f1", src: "/img/home/flat-in.jpg", name: "IMG_4471.jpg", slot: "front" },
];

export const SAMPLE_SHOOT: Upload[] = [
  { id: "s1", src: "/img/home/onmodel-in.jpg", name: "shoot_01.jpg", slot: "front" },
];

/* ───────────── Salon (community) ───────────── */

export interface Post {
  id: string;
  img: string;
  brand: string;
  by: string;
  role: "creator" | "partner" | "enterprise";
  cast: string;
  flow: FlowSlug;
  date: string;
}

export const POSTS: Post[] = [
  { id: "p1", img: "/img/salon-suit.jpg", brand: "Kığılı", by: "@liora", role: "enterprise", cast: "Elias", flow: "campaign", date: "2026-09-21" },
  { id: "p2", img: "/img/salon-gown.jpg", brand: "Maison Aveline", by: "@aveline.studio", role: "partner", cast: "Private cast", flow: "restyle", date: "2026-09-20" },
  { id: "p3", img: "/img/salon-cardigan.jpg", brand: "Nordwol", by: "@nordwol", role: "creator", cast: "Liv", flow: "campaign", date: "2026-09-19" },
  { id: "p4", img: "/img/salon-leather.jpg", brand: "Derimod", by: "@liora", role: "enterprise", cast: "Mateo", flow: "recast", date: "2026-09-18" },
  { id: "p5", img: "/img/salon-linen.jpg", brand: "Sahil & Keten", by: "@sahilketen", role: "creator", cast: "Noor", flow: "campaign", date: "2026-09-17" },
  { id: "p6", img: "/img/salon-trench.jpg", brand: "Atelier Rue", by: "@atelierrue", role: "partner", cast: "Yuki", flow: "campaign", date: "2026-09-16" },
];

/* ───────────── Jobs ───────────── */

export type JobStatus = "running" | "done" | "draft";

export interface Frame {
  id: string;
  angle?: Angle;
  label?: L; // when the frame is not one of the angles (a shoot's pose, a ghost)
  src: string;
  failed?: boolean;
  liked?: boolean | null;
  review?: "pending" | "refunded" | "declined";
  reasons?: string[]; // why it was not right, as chosen (S-F-18)
  versions?: string[];
}

export interface Job {
  id: string;
  title: L;
  flow: FlowSlug;
  status: JobStatus;
  castId?: string;
  settingId?: string;
  ratio?: Ratio;
  frames: Frame[];
  createdAt: string; // ISO
  expiresInDays?: number;
  progress?: number; // frames done while running
  draftStep?: NodeKind;
  draftState?: unknown;
  setupId?: string; // the canvas setup this job was made from (S-F-13)
  cover: string;
  finishAt?: number; // simulated completion time for a running job
  planned?: Frame[]; // frames the running job will deliver
  creditPerFrame?: number;
  cost?: number; // what the whole run costs when it is not frames × credit (a sample's free first frame)
  video?: string[]; // a turn: the frames the video passes through
  custom?: { setting?: string; pose?: string }; // what a Partner described for this run — keepable from the result
  seen?: boolean; // results opened at least once (drives the seam reveal)
}

export const ANNOUNCEMENT = {
  date: "2026-09-10",
  text: { en: "180° Product Video enters testing", tr: "180° Ürün Videosu teste girdi" },
};

export function seedJobs(): Job[] {
  return [
    {
      id: "j-coat",
      title: { en: "Camel wool coat", tr: "Kamel yün kaban" },
      flow: "campaign",
      status: "done",
      castId: "ada",
      settingId: "courtyard",
      ratio: "3:4",
      frames: [
        { id: "j-coat-1", angle: "front", src: "/img/flow/out-front.jpg" },
        { id: "j-coat-2", angle: "threeQuarter", src: "/img/flow/out-three-quarter.jpg" },
        { id: "j-coat-3", angle: "back", src: "/img/flow/out-back.jpg" },
      ],
      createdAt: "2026-09-21T10:12:00",
      expiresInDays: 2,
      cover: "/img/flow/out-three-quarter.jpg",
    },
    {
      id: "j-knit",
      title: { en: "Cream cable knit", tr: "Krem örgü kazak" },
      flow: "campaign",
      status: "running",
      castId: "noor",
      settingId: "travertine",
      frames: [],
      progress: 1,
      createdAt: "2026-09-26T18:02:00",
      cover: "/img/home/ghostflow-out.jpg",
    },
    {
      id: "j-belt",
      title: { en: "Leather belt", tr: "Deri kemer" },
      flow: "campaign",
      status: "draft",
      draftStep: "setting",
      frames: [],
      createdAt: "2026-09-25T15:40:00",
      cover: "/img/flow/belt.jpg",
    },
    {
      id: "j-dress",
      title: { en: "Black rib dress", tr: "Siyah fitilli elbise" },
      flow: "recast",
      status: "draft",
      draftStep: "cast",
      frames: [],
      createdAt: "2026-09-24T11:05:00",
      cover: "/img/home/onmodel-in.jpg",
    },
  ];
}
