import type { FlowSlug, L } from "@/lib/data";

/* The Salon's mock register. Shapes follow community_posts (CM-B-01):
   image, account, brand, cast, flow, date, website, publication link.
   The brand is stored on the post, so a later profile change never
   rewrites history (CM-B-15). */

export type PostRole = "creator" | "partner" | "enterprise";

export interface Brand {
  id: string;
  name: string;
  site: string;
  by: string; // the sharing account; @liora publishes for enterprise clients
  role: PostRole; // the badge at the time of sharing (CM-B-10)
}

export interface Post {
  id: string;
  brand: string;
  cast: string | "private" | null; // a library cast, a partner's own cast, or none (packshots)
  flow: FlowSlug;
  date: string;
  live?: string; // where it was published, when the brand added it
}

export const ISSUE = { no: 40, week: 40, year: 2026, date: "2026-10-02" };

export const BRANDS: Brand[] = [
  { id: "atelier-rue", name: "Atelier Rue", site: "atelierrue.com", by: "@atelierrue", role: "partner" },
  { id: "kigili", name: "Kığılı", site: "kigili.com", by: "@liora", role: "enterprise" },
  { id: "nordwol", name: "Nordwol", site: "nordwol.com", by: "@nordwol", role: "partner" },
  { id: "derimod", name: "Derimod", site: "derimod.com.tr", by: "@liora", role: "enterprise" },
  { id: "sahil-keten", name: "Sahil & Keten", site: "sahilketen.com", by: "@sahilketen", role: "creator" },
  { id: "aveline", name: "Maison Aveline", site: "maisonaveline.com", by: "@aveline.studio", role: "creator" },
];

/* Newest first — the register's own order. Each brand keeps four frames,
   lettered (A)–(D) in the order the brand shot them. */
export const POSTS: Post[] = [
  { id: "r1", brand: "atelier-rue", cast: "private", flow: "campaign", date: "2026-10-01", live: "atelierrue.com/aw26" },
  { id: "s1", brand: "sahil-keten", cast: "imani", flow: "campaign", date: "2026-10-01" },
  { id: "k1", brand: "kigili", cast: "elias", flow: "campaign", date: "2026-09-30", live: "kigili.com/sonbahar" },
  { id: "n4", brand: "nordwol", cast: "liv", flow: "campaign", date: "2026-09-30" },
  { id: "d2", brand: "derimod", cast: "mateo", flow: "campaign", date: "2026-09-29" },
  { id: "a2", brand: "aveline", cast: "yuki", flow: "campaign", date: "2026-09-29", live: "instagram.com/aveline.studio" },
  { id: "r2", brand: "atelier-rue", cast: "private", flow: "campaign", date: "2026-09-28" },
  { id: "k3", brand: "kigili", cast: "elias", flow: "campaign", date: "2026-09-28" },
  { id: "n1", brand: "nordwol", cast: "liv", flow: "campaign", date: "2026-09-27", live: "nordwol.com/fisherman" },
  { id: "s2", brand: "sahil-keten", cast: "imani", flow: "campaign", date: "2026-09-27" },
  { id: "d1", brand: "derimod", cast: "mateo", flow: "recast", date: "2026-09-26", live: "derimod.com.tr/erkek" },
  { id: "a1", brand: "aveline", cast: "yuki", flow: "campaign", date: "2026-09-26" },
  { id: "k2", brand: "kigili", cast: "elias", flow: "campaign", date: "2026-09-25" },
  { id: "r4", brand: "atelier-rue", cast: "private", flow: "campaign", date: "2026-09-25" },
  { id: "n2", brand: "nordwol", cast: "liv", flow: "campaign", date: "2026-09-24" },
  { id: "d3", brand: "derimod", cast: "mateo", flow: "recast", date: "2026-09-24" },
  { id: "s3", brand: "sahil-keten", cast: "imani", flow: "campaign", date: "2026-09-23" },
  { id: "a3", brand: "aveline", cast: "yuki", flow: "campaign", date: "2026-09-23" },
  { id: "k4", brand: "kigili", cast: null, flow: "ghost", date: "2026-09-22" },
  { id: "r3", brand: "atelier-rue", cast: "private", flow: "campaign", date: "2026-09-22" },
  { id: "n3", brand: "nordwol", cast: null, flow: "ghost", date: "2026-09-21" },
  { id: "s4", brand: "sahil-keten", cast: null, flow: "ghost", date: "2026-09-21" },
  { id: "d4", brand: "derimod", cast: "mateo", flow: "recast", date: "2026-09-20" },
  { id: "a4", brand: "aveline", cast: "yuki", flow: "campaign", date: "2026-09-20" },
];

/* The week's selection, laid out as a spread: one page, then four. */
export const SPREAD = ["r1", "n4", "d2", "s2", "a2"];

export const ROLE_LABEL: Record<PostRole, L> = {
  creator: { en: "Creator", tr: "Creator" },
  partner: { en: "Partner", tr: "Partner" },
  enterprise: { en: "Enterprise", tr: "Enterprise" },
};

export const img = (id: string) => `/img/salon/${id}.jpg`;
export const thumb = (id: string) => `/img/salon/${id}-s.jpg`;

export const postById = (id?: string | null) => POSTS.find((p) => p.id === id);
export const brandById = (id?: string | null) => BRANDS.find((b) => b.id === id);

/* a brand's frames in the order it shot them: (A) is the oldest */
export const framesOf = (brand: string) =>
  POSTS.filter((p) => p.brand === brand).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

export const letter = (i: number) => String.fromCharCode(65 + i);
export const pad = (n: number, w = 2) => String(n).padStart(w, "0");
