import type { L } from "./data";

/* What the backend would answer during sign-up, mocked: the username rules
   (A-B-02), the availability check (A-B-05), the suggestion it derives from a
   name (A-B-08) and the Google profile that comes back from OAuth (A-B-07). */

const RESERVED = ["admin", "liora", "atelier", "support", "root", "help", "salon", "studio", "api", "www"];
const TAKEN = ["melis", "dogan", "elif", "atelier.dogan", "maison", "lumen", "noir", "studio.one"];

export type Check =
  | { state: "empty" }
  | { state: "checking" }
  | { state: "invalid"; why: L }
  | { state: "taken"; why: L; offer: string[] }
  | { state: "ok" };

/* ç ğ ı ö ş ü (and the dot a lower-cased İ leaves behind) → their plain letters */
export const plainTr = (v: string) =>
  v
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[âîû]/g, (c) => ({ â: "a", î: "i", û: "u" })[c] ?? c)
    .replace(/\u0307/g, "");

const TURKISH = /[çğıöşüâîû\u0307]/;

export function rule(name: string): L | null {
  /* said first and by name — "only a–z" alone does not tell a Turkish speaker what went wrong (Elif) */
  if (TURKISH.test(name)) {
    const plain = plainTr(name);
    return { en: `No Turkish characters — try "${plain}"`, tr: `Türkçe karakter kullanılmaz — "${plain}" olabilir` };
  }
  if (name.length < 3) return { en: "At least 3 characters", tr: "En az 3 karakter" };
  if (name.length > 20) return { en: "At most 20 characters", tr: "En fazla 20 karakter" };
  if (!/^[a-z0-9._]+$/.test(name))
    return { en: "Only a–z, 0–9, dot and underscore", tr: "Yalnızca a–z, 0–9, nokta ve alt çizgi" };
  return null;
}

/* the answer the rate-limited endpoint would give, after a short wait */
export function check(name: string): Check {
  if (!name) return { state: "empty" };
  const broken = rule(name);
  if (broken) return { state: "invalid", why: broken };
  if (RESERVED.includes(name) || TAKEN.includes(name)) {
    return { state: "taken", why: { en: "This name is taken", tr: "Bu ad kullanılıyor" }, offer: suggest(name) };
  }
  return { state: "ok" };
}

const free = (n: string) => !RESERVED.includes(n) && !TAKEN.includes(n) && !rule(n);

function suggest(name: string): string[] {
  const base = name.replace(/[._]+$/, "");
  return [`${base}.atelier`, `${base}_studio`, `${base}${(base.length % 7) + 2}`].filter(free).slice(0, 3);
}

/* "Melis Doğan" → "melis.dogan"; a number is added if the name is taken */
export function fromName(full: string): string {
  const flat = plainTr(full.toLocaleLowerCase("tr"))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 20);
  if (free(flat)) return flat;
  for (let i = 2; i < 100; i++) if (free(`${flat.slice(0, 18)}${i}`)) return `${flat.slice(0, 18)}${i}`;
  return flat;
}

export const GOOGLE = {
  name: "Melis Doğan",
  email: "melis.dogan@gmail.com",
  initials: "MD",
};

/* Mock: the one address that came in through Google, so password reset can
   show its other answer (A-F-12). A Gmail address alone does not mean a
   Google account — plenty sign up with a password on one. */
export const openedWithGoogle = (email: string) => email.trim().toLowerCase() === GOOGLE.email;

/* where the reset link landed: a shortcut to the inbox, for the common one */
export const inboxFor = (email: string) => (/@gmail\.com$/i.test(email.trim()) ? { name: "Gmail", href: "https://mail.google.com/mail/u/0/#inbox" } : null);

export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const MIN_PASSWORD = 8;
