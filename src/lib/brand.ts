import { CASTS, ROLE_RANK, SETTINGS, type Cast, type L, type Role, type Setting } from "./data";

const canUse = (role: Role, min: Role) => ROLE_RANK[role] >= ROLE_RANK[min];

/* The brand, as onboarding learns it. Every answer changes something the
   user will see later — the cast offered first, the setting, the style —
   and each one says so in a single line the moment it is given. */

export type ShootFor = "own" | "employer" | "agency" | "explore";
export type Tier = "daily" | "considered" | "premium" | "luxury";
export type StyleDim = "shoot" | "pose" | "light" | "frame";

export interface BrandProfile {
  for?: ShootFor;
  brands?: string; // agencies: how many brands
  rack: string[]; // what the site read found on the rail (no longer asked: each product carries its category)
  who: string[]; // women · men · kids — several
  ages: string[];
  kidAges?: string[]; // only when children are among them
  tier?: Tier;
  style: string[]; // one per dimension: shoot, pose, light, frame (see styleParams)
  where: string[];
  vertical?: string; // what they show — "fashion" until other worlds open
  waitlist?: string; // the world they are waiting for, when it is not fashion
  /* "just looking": who they are, and whether we may write */
  job?: string;
  jobOther?: string;
  why?: string;
  tools?: string[];
  talk?: string[];
  company?: string;
  read?: string; // the site the answers were read from
  prefilled?: string[]; // which questions came filled from the site
}

export const EMPTY_PROFILE: BrandProfile = { rack: [], who: [], ages: [], style: [], where: [] };

export interface Answer {
  id: string;
  label: L;
  sub?: L;
  echo?: L; // what this answer changes, said once
  img?: string;
  dim?: StyleDim;
}

export const FOR: Answer[] = [
  { id: "own", label: { en: "My own brand", tr: "Kendi markam" }, sub: { en: "My own collection", tr: "Kendi koleksiyonum" } },
  { id: "employer", label: { en: "The brand I work for", tr: "Çalıştığım marka için" }, sub: { en: "E-commerce or brand team", tr: "E-ticaret ya da marka ekibi" } },
  { id: "agency", label: { en: "My clients", tr: "Müşterilerim" }, sub: { en: "Agency, studio, photographer", tr: "Ajans, stüdyo, fotoğrafçı" } },
  { id: "explore", label: { en: "Just looking", tr: "Sadece bakıyorum" }, sub: { en: "Benchmark, curiosity, ideas", tr: "Benchmark, merak, ilham" } },
];

export const BRANDS: Answer[] = [
  { id: "1-3", label: { en: "1–3", tr: "1–3" } },
  { id: "4-10", label: { en: "4–10", tr: "4–10" } },
  { id: "10+", label: { en: "10+", tr: "10+" } },
];

/* what a site read reports it found — shown while reading, not asked */
export const RACK: Answer[] = [
  { id: "suit", label: { en: "Suits & jackets", tr: "Takım ve ceket" } },
  { id: "dress", label: { en: "Dresses", tr: "Elbise" } },
  { id: "knit", label: { en: "Knitwear", tr: "Triko" } },
  { id: "outer", label: { en: "Outerwear", tr: "Dış giyim" } },
  { id: "shirt", label: { en: "Shirts & blouses", tr: "Gömlek ve bluz" } },
  { id: "denim", label: { en: "Denim", tr: "Denim" } },
  { id: "evening", label: { en: "Eveningwear", tr: "Abiye" } },
  { id: "modest", label: { en: "Modest wear", tr: "Tesettür" } },
  { id: "acc", label: { en: "Accessories & bags", tr: "Aksesuar ve çanta" } },
  { id: "shoes", label: { en: "Shoes", tr: "Ayakkabı" } },
];

/* the worlds after fashion — asked now, so we know which opens next */
export const VERTICALS: Answer[] = [
  { id: "beauty", label: { en: "Beauty", tr: "Güzellik ve kozmetik" } },
  { id: "jewelry", label: { en: "Jewellery", tr: "Takı" } },
  { id: "home", label: { en: "Home and decor", tr: "Ev ve dekor" } },
  { id: "food", label: { en: "Food", tr: "Yiyecek" } },
  { id: "else", label: { en: "Something else", tr: "Başka" } },
];

export const waitEcho = (id: string): L => {
  const v = VERTICALS.find((x) => x.id === id);
  if (!v || id === "else") return { en: "We start with fashion; you'll hear first when yours opens.", tr: "Şimdilik modayla başlıyoruz; seninki açılınca ilk sen duyarsın." };
  return { en: `We start with fashion; you'll hear first when ${v.label.en.toLowerCase()} opens.`, tr: `Şimdilik modayla başlıyoruz; ${v.label.tr.toLowerCase()} açılınca ilk sen duyarsın.` };
};

export const waitLine = (id?: string): L => {
  const v = VERTICALS.find((x) => x.id === id);
  if (!v || id === "else") return { en: "You'll hear first when yours opens.", tr: "Seninki açılınca ilk sen duyarsın." };
  return { en: `You'll hear first when ${v.label.en.toLowerCase()} opens.`, tr: `${v.label.tr} açılınca ilk sen duyarsın.` };
};

/* ── just looking ── */

export const JOBS: Answer[] = [
  { id: "designer", label: { en: "Designer", tr: "Tasarımcı" } },
  { id: "developer", label: { en: "Developer", tr: "Yazılımcı" } },
  { id: "pm", label: { en: "Product manager", tr: "Ürün yöneticisi" } },
  { id: "photographer", label: { en: "Photographer", tr: "Fotoğrafçı" } },
  { id: "content", label: { en: "Content / marketing", tr: "İçerik / pazarlama" } },
  { id: "founder", label: { en: "Founder", tr: "Kurucu" } },
  { id: "student", label: { en: "Student / intern", tr: "Öğrenci / stajyer" } },
  { id: "other", label: { en: "Something else", tr: "Başka" } },
];

export const WHY: Answer[] = [
  { id: "benchmark", label: { en: "Benchmark", tr: "Benchmark" }, echo: { en: "Sample sets are ready — try the canvas without uploading.", tr: "Örnek setler hazır; yüklemeden kanvası denersin." } },
  { id: "ideas", label: { en: "Ideas", tr: "İlham" }, echo: { en: "The Salon is open too — other people's frames live there.", tr: "Salon da açık; başkalarının kareleri orada." } },
  { id: "client", label: { en: "For a client or a job", tr: "Bir müşteri ya da iş için" }, echo: { en: "When you bring their product, we'll ask about the brand.", tr: "Müşterinin ürününü getirdiğinde markayı sorarız." } },
  { id: "team", label: { en: "To suggest it to my team", tr: "Ekibime önermek için" }, echo: { en: "Results can be shared with your team as they are.", tr: "Sonuçları ekibinle olduğu gibi paylaşabilirsin." } },
  { id: "curious", label: { en: "Curious", tr: "Merak" }, echo: { en: "Every flow is open; start with one frame.", tr: "Bütün akışlar açık; bir kareyle başla." } },
];

export const TOOLS: Answer[] = [
  { id: "figma", label: { en: "Figma", tr: "Figma" } },
  { id: "photoshop", label: { en: "Photoshop", tr: "Photoshop" } },
  { id: "midjourney", label: { en: "Midjourney", tr: "Midjourney" } },
  { id: "flora", label: { en: "Flora", tr: "Flora" } },
  { id: "krea", label: { en: "Krea", tr: "Krea" } },
  { id: "comfy", label: { en: "ComfyUI", tr: "ComfyUI" } },
  { id: "other", label: { en: "Something else", tr: "Başka" } },
];

/* node tools: the canvas will feel familiar — said in the words of the difference */
export const toolsEcho = (tools: string[]): L | null =>
  tools.some((x) => x === "flora" || x === "comfy")
    ? { en: "You know node canvases — here each node is a decision, not a model.", tr: "Düğümlü kanvası tanırsın; burada her düğüm bir model değil, bir karar." }
    : tools.length
      ? { en: "The canvas reads left to right: product, cast, setting, frames.", tr: "Kanvas soldan sağa okunur: ürün, kast, ortam, kareler." }
      : null;

export const TALK: Answer[] = [
  { id: "news", label: { en: "Tell me when something's new", tr: "Yeni bir şey çıkınca haber ver" }, echo: { en: "At most one email a month.", tr: "Ayda en fazla bir e-posta." } },
  { id: "chat", label: { en: "Open to a 15-minute chat", tr: "15 dakikalık sohbete açığım" }, echo: { en: "We'll write for a short research call.", tr: "Kısa bir araştırma görüşmesi için yazarız." } },
  { id: "partner", label: { en: "Let's talk partnership", tr: "Ortaklık konuşalım" }, echo: { en: "Someone from the team writes to you.", tr: "Ekipten biri sana yazar." } },
  { id: "no", label: { en: "Not now", tr: "Şimdilik hayır" }, echo: { en: "Fine — you can change it in settings any time.", tr: "Tamam; ayarlardan istediğin an değiştirirsin." } },
];

/* ── who wears it: several; children open their own ages ── */

export const WHO: Answer[] = [
  { id: "women", label: { en: "Women", tr: "Kadın" } },
  { id: "men", label: { en: "Men", tr: "Erkek" } },
  { id: "kids", label: { en: "Children", tr: "Çocuk" } },
];

export const AGES: Answer[] = [
  { id: "18-25", label: { en: "18–25", tr: "18–25" } },
  { id: "25-35", label: { en: "25–35", tr: "25–35" } },
  { id: "35-50", label: { en: "35–50", tr: "35–50" } },
  { id: "50+", label: { en: "50+", tr: "50+" } },
];

/* no gaps between them — a child of any age has one place */
export const KID_AGES: Answer[] = [
  { id: "0-12m", label: { en: "0–12 months", tr: "0–12 ay" } },
  { id: "1-4", label: { en: "1–4 yrs", tr: "1–4 yaş" } },
  { id: "5-11", label: { en: "5–11 yrs", tr: "5–11 yaş" } },
  { id: "12-17", label: { en: "12–17 yrs", tr: "12–17 yaş" } },
];

export const adults = (p: BrandProfile) => p.who.filter((x) => x !== "kids");

export const TIERS: Answer[] = [
  { id: "daily", label: { en: "Everyday", tr: "Gündelik" }, sub: { en: "up to $50", tr: "₺1.500'e kadar" }, echo: { en: "Bright, open light.", tr: "Aydınlık, ferah bir ışık." } },
  { id: "considered", label: { en: "Considered", tr: "Özenli" }, sub: { en: "$50–150", tr: "₺1.500–5.000" }, echo: { en: "Soft, natural light.", tr: "Yumuşak, doğal bir ışık." } },
  { id: "premium", label: { en: "Premium", tr: "Premium" }, sub: { en: "$150–500", tr: "₺5.000–15.000" }, echo: { en: "Quiet settings, controlled light.", tr: "Sakin ortamlar, kontrollü ışık." } },
  { id: "luxury", label: { en: "Luxury", tr: "Lüks" }, sub: { en: "$500 and up", tr: "₺15.000 üstü" }, echo: { en: "Few objects, deep shadow, a lot of air.", tr: "Az eşya, derin gölge, bol boşluk." } },
];

/* ── style: shoot, pose, light and frame are different things (Elif's note).
   The screen shows one row of pictures; each picture belongs to one
   dimension, one per dimension can be held, and the backend gets them apart. ── */

export const STYLES: (Answer & { dim: StyleDim; means: L })[] = [
  { id: "catalog", dim: "shoot", label: { en: "Clean Catalog", tr: "Clean Catalog" }, sub: { en: "Neutral pose, the whole product", tr: "Nötr poz, ürün eksiksiz" }, means: { en: "a clean ground", tr: "sade fon" }, img: "/img/home/sample-out.jpg" },
  { id: "lookbook", dim: "shoot", label: { en: "Modern Lookbook", tr: "Modern Lookbook" }, sub: { en: "Relaxed stance, the full look", tr: "Rahat duruş, kombin bütün" }, means: { en: "relaxed stances", tr: "rahat duruşlar" }, img: "/img/flow/out-three-quarter.jpg" },
  { id: "editorial", dim: "shoot", label: { en: "Fashion Editorial", tr: "Fashion Editorial" }, sub: { en: "Bold body, dramatic frame", tr: "Cesur beden dili, dramatik kadraj" }, means: { en: "a dramatic composition", tr: "dramatik kompozisyon" }, img: "/img/salon/a4-s.jpg" },
  { id: "lifestyle", dim: "shoot", label: { en: "Lifestyle", tr: "Lifestyle" }, sub: { en: "Natural movement, a real place", tr: "Doğal hareket, gerçek mekân" }, means: { en: "a real place", tr: "mekân bağlamı" }, img: "/img/salon-cardigan.jpg" },
  { id: "concept", dim: "shoot", label: { en: "Conceptual Campaign", tr: "Conceptual Campaign" }, sub: { en: "Set, concept, composition", tr: "Dekor, konsept, kompozisyon" }, means: { en: "a concept set", tr: "konsept dekor" }, img: "/img/salon/r3-s.jpg" },
  { id: "dynamic", dim: "pose", label: { en: "Dynamic Posing", tr: "Dynamic Posing" }, sub: { en: "Asymmetry, weight shift", tr: "Asimetri, ağırlık kaydırma" }, means: { en: "dynamic poses", tr: "dinamik pozlar" }, img: "/img/salon/d1-s.jpg" },
  { id: "light", dim: "light", label: { en: "Light & Shadow", tr: "Light & Shadow" }, sub: { en: "Directional light, contrast", tr: "Belirgin ışık, kontrast" }, means: { en: "strong light and shadow", tr: "belirgin ışık ve gölge" }, img: "/img/salon/a1-s.jpg" },
  { id: "detail", dim: "frame", label: { en: "Detail Focus", tr: "Detail Focus" }, sub: { en: "Close frame, texture", tr: "Yakın kadraj, doku" }, means: { en: "close frames", tr: "yakın kadraj" }, img: "/img/flow/coat-detail.jpg" },
];

/* picking a second shoot style replaces the first; other dimensions add */
export function pickStyle(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((x) => x !== id);
  const dim = STYLES.find((s) => s.id === id)?.dim;
  return [...current.filter((x) => STYLES.find((s) => s.id === x)?.dim !== dim), id];
}

/* what is sent apart: { shoot, pose, light, frame } */
export const styleParams = (p: BrandProfile) =>
  Object.fromEntries((["shoot", "pose", "light", "frame"] as StyleDim[]).map((d) => [d, STYLES.find((s) => s.dim === d && p.style.includes(s.id))?.id ?? null])) as Record<StyleDim, string | null>;

export const WHERE: Answer[] = [
  { id: "site", label: { en: "My site", tr: "Kendi sitem" } },
  { id: "social", label: { en: "Social media", tr: "Sosyal medya" } },
  { id: "market", label: { en: "Marketplace", tr: "Pazaryeri" }, sub: { en: "Amazon, Zalando…", tr: "Trendyol, Hepsiburada…" } },
  { id: "catalog", label: { en: "Catalogue", tr: "Katalog" }, sub: { en: "wholesale, lookbook", tr: "toptan, lookbook" } },
  { id: "ads", label: { en: "Ads", tr: "Reklam" } },
];

const pick = (list: Answer[], ids: string[]) => list.filter((a) => ids.includes(a.id));
export const answerOf = (list: Answer[], id?: string) => list.find((a) => a.id === id);

/* ── what the answers lead to ── */

const CAST_ORDER: Record<string, string[]> = {
  "women:18-25": ["imani", "ada"],
  "women:25-35": ["ada", "noor", "imani"],
  "women:35-50": ["yuki", "noor", "ada"],
  "women:50+": ["liv", "yuki", "ada"],
  "men:18-25": ["mateo", "arjun"],
  "men:25-35": ["arjun", "mateo"],
  "men:35-50": ["elias", "mateo"],
  "men:50+": ["elias", "mateo"],
};

/* the best fit the user's plan can use — a suggestion never opens on a lock,
   and never on a child (there is no children's cast) */
export function suggestCast(p: BrandProfile, role: Role): Cast | null {
  const who = adults(p)[0];
  if (!who) return null;
  const order = CAST_ORDER[`${who}:${p.ages[0] ?? "25-35"}`] ?? ["ada"];
  const ok = (id: string) => CASTS.find((c) => c.id === id && canUse(role, c.minRole));
  return order.map(ok).find(Boolean) ?? CASTS.find((c) => canUse(role, c.minRole)) ?? null;
}

const SETTING_ORDER: Record<string, string[]> = {
  catalog: ["studio", "travertine"],
  lookbook: ["courtyard", "studio"],
  editorial: ["travertine", "studio"],
  lifestyle: ["courtyard", "rooftop"],
  concept: ["dunes", "travertine"],
  light: ["travertine", "studio"],
};

export function suggestSetting(p: BrandProfile, role: Role): Setting | null {
  const { shoot, light } = styleParams(p);
  const key = shoot ?? light;
  if (!key) return null;
  const order = SETTING_ORDER[key] ?? ["studio"];
  const ok = (id: string) => SETTINGS.find((x) => x.id === id && canUse(role, x.minRole));
  return order.map(ok).find(Boolean) ?? SETTINGS[0];
}

export const castEcho = (p: BrandProfile, role: Role): L | null => {
  const c = suggestCast(p, role);
  const kids = p.who.includes("kids");
  if (!c) return kids ? { en: "No children's cast — children's pieces are shot on a ghost mannequin.", tr: "Çocuk kastı yok; çocuk ürünleri cansız mankende çekilir." } : null;
  const line = { en: `Suggested cast: ${c.name} — ${c.note.en}.`, tr: `Kast önerisi: ${c.name} — ${c.note.tr}.` };
  return kids ? { en: `${line.en} Children's pieces on a ghost mannequin.`, tr: `${line.tr} Çocuk ürünleri cansız mankende.` } : line;
};

/* "a clean ground · dynamic poses · setting: Plaster studio" */
export const styleEcho = (p: BrandProfile, role: Role): L | null => {
  const chosen = STYLES.filter((s) => p.style.includes(s.id));
  if (!chosen.length) return null;
  const x = suggestSetting(p, role);
  const join = (lang: "en" | "tr") => chosen.map((s) => s.means[lang]).join(" · ");
  return x ? { en: `${join("en")} · setting: ${x.name.en}.`, tr: `${join("tr")} · ortam: ${x.name.tr}.` } : { en: `${join("en")}.`, tr: `${join("tr")}.` };
};

export const styleNames = (p: BrandProfile) =>
  STYLES.filter((s) => p.style.includes(s.id))
    .map((s) => s.label.en)
    .join(" + ");

/* the profile in its own words: "Women, Men · 25–35 · Premium · Clean Catalog + Dynamic Posing" */
export function summary(p: BrandProfile): { en: string; tr: string } {
  const parts = (lang: "en" | "tr") =>
    [
      p.who.length ? pick(WHO, p.who).map((a) => a.label[lang]).join(", ") : undefined,
      p.ages.length ? pick(AGES, p.ages).map((a) => a.label[lang]).join(", ") : undefined,
      p.kidAges?.length ? pick(KID_AGES, p.kidAges).map((a) => a.label[lang]).join(", ") : undefined,
      answerOf(TIERS, p.tier)?.label[lang],
      p.style.length ? styleNames(p) : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
  return { en: parts("en"), tr: parts("tr") };
}

export const listOf = (list: Answer[], ids: string[], lang: "en" | "tr") => pick(list, ids).map((a) => a.label[lang]).join(", ");

/* ── older saved answers, in today's shape ── */

const OLD_STYLE: Record<string, string> = { plain: "catalog", tailored: "catalog", covered: "catalog", romantic: "lookbook", natural: "lifestyle", street: "dynamic", evening: "light" };

export function normalizeProfile(raw: unknown): BrandProfile {
  const p = { ...EMPTY_PROFILE, ...(raw as Partial<BrandProfile> & { who?: unknown }) } as BrandProfile & { who: unknown; white?: unknown };
  const who = Array.isArray(p.who) ? (p.who as string[]) : typeof p.who === "string" ? (p.who === "all" ? ["women", "men"] : [p.who]) : [];
  const style = (p.style ?? []).map((x) => OLD_STYLE[x] ?? x).filter((x) => STYLES.some((s) => s.id === x));
  const where = (p.where ?? []).map((x) => (x === "ig" ? "social" : x));
  const forId = (p.for as string) === "agency" || (p.for as string) === "own" || (p.for as string) === "explore" || (p.for as string) === "employer" ? p.for : undefined;
  const { white: _white, ...rest } = p;
  void _white;
  return { ...rest, for: forId, who, style: style.reduce<string[]>((acc, id) => pickStyle(acc, id), []), where };
}

/* ── reading the site (mocked: the backend reads the real one) ── */

const READS: Omit<BrandProfile, "read" | "prefilled" | "for" | "brands">[] = [
  { rack: ["dress", "knit"], who: ["women"], ages: ["25-35"], tier: "premium", style: ["catalog", "light"], where: ["site", "social"] },
  { rack: ["suit", "shirt"], who: ["men"], ages: ["25-35", "35-50"], tier: "considered", style: ["lookbook"], where: ["site", "market"] },
  { rack: ["modest", "dress"], who: ["women"], ages: ["25-35"], tier: "considered", style: ["lifestyle", "dynamic"], where: ["social", "market"] },
];

export function readSite(site: string): BrandProfile {
  const n = [...site.toLowerCase()].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { ...READS[n % READS.length], read: site, prefilled: ["wear", "tier", "style", "where"] };
}

export const cleanSite = (v: string) =>
  v
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
