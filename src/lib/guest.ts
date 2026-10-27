import { normalizeProfile, type BrandProfile } from "./brand";

/* What someone answers before they have an account. It lives apart from the
   account's store, so creating the account (which starts a fresh session)
   can carry it across — the answers, the name, and where they were going. */

export interface Guest {
  profile: BrandProfile;
  brand?: string;
  website?: string;
  next?: string; // where to return after the account opens (e.g. the canvas they tried to make from)
}

const KEY = "liora-atelier-guest-v1";

export function readGuest(): Guest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Guest;
    return { ...g, profile: normalizeProfile(g.profile) };
  } catch {
    return null;
  }
}

export function writeGuest(g: Guest) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    /* blocked storage: the answers live only on this page */
  }
}

export function clearGuest() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
