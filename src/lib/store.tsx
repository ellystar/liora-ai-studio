"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  OWN_CASTS,
  castById,
  seedJobs,
  type Angle,
  type Cast,
  type Slot,
  type InputType,
  type Job,
  type L,
  type Lang,
  type Role,
  type FlowSlug,
} from "./data";
import { normalizeProfile, type BrandProfile } from "./brand";
import { readAccount } from "./live";
import { createClient, hasBackend } from "./supabase/client";

/* ─────────────────────────────────────────────────────────────
   One client store for the whole prototype, persisted to
   localStorage so a review session survives a reload. The demo
   controls (session, role, credits, language) live here too —
   they stand in for what the backend would answer.
   ───────────────────────────────────────────────────────────── */

export type Session = "first" | "returning";

export interface Notice {
  id: string;
  title: L;
  sub: L;
  href: string;
  at: number;
  read?: boolean;
}

/* an image the user brought into a flow, kept small enough to survive a reload */
export interface Shot {
  id: string;
  src: string; // a data URL (uploaded) or a path (sample)
  name: string;
  slot: Slot | "other";
  product?: string; // which product it shows, when the flow keeps products apart
}

/* a flow's setup on the canvas: every decision, the images, where the nodes
   sit — saved as it changes, so a draft opens where it was left (W-F-16, D-F-22) */
export interface Setup {
  id: string;
  flow: FlowSlug;
  item?: string;
  shots?: Shot[];
  products?: { id: string; category?: "top" | "bottom" | "outer" | "onepiece" | "shoes" | "acc" }[];
  tuck?: "in" | "out";
  myPoses?: string[]; // kept poses chosen for this run
  customPose?: string | null; // a pose described for this run
  ghostSkip?: boolean; // a restyle that used its shoot as it was
  shotsOk?: boolean;
  castId?: string;
  settingId?: string;
  described?: string | null;
  angles?: Angle[];
  ratio?: string;
  framesOk?: boolean;
  pick?: { front: string; back: string };
  phase?: string;
  redo?: Record<string, number>;
  rows?: Record<string, string>;
  stray?: boolean;
  grouped?: boolean;
  moved?: Record<string, { x: number; y: number }>;
  query?: { sample: string | null; from: string | null; product: string | null };
  ran?: boolean; // a run was made from it — it is no longer listed as a draft
  createdAt: string;
}

export interface State {
  lang: Lang;
  session: Session;
  role: Role;
  credits: number;
  failOne: boolean; // demo: make one frame fail in the next production
  lastInput: InputType | null;
  onboarded: boolean;
  seenIntro: FlowSlug[];
  hiddenDrafts: string[];
  jobs: Job[];
  notices: Notice[];
  brand: string;
  username: string;
  name: string; // the person's name, when known (Google gives it; manual sign-up asks only a username)
  website: string;
  provider: "email" | "google";
  casts: Cast[]; // the user's own cast, from Cast Studio
  prefs: Record<string, { panel: boolean; mail: boolean }>; // notification settings, by kind (wf-12)
  setups: Record<string, Setup>;
  cancelled: boolean; // the subscription ends with the period
  profile: BrandProfile | null; // what onboarding learned about the brand
  guest: boolean; // looking around before an account: no balance, no menu, making asks for an account
  favorites: string[]; // "cast:ada", "pose:front" — the favourites filters
  poses: { id: string; name: string; img: string }[]; // poses described and kept (Partner)
  themes: { id: string; name: L; img: string }[]; // settings described and kept (Partner)
  live: { id: string; email: string } | null; // signed in to the live backend: the balance is the server's
}

/* wf-12 · 02: mail is on by default only where the user may have left the panel */
export const NOTICE_KINDS: { id: string; label: L; mail: boolean }[] = [
  { id: "done", label: { en: "Production finished", tr: "Üretim tamamlandı" }, mail: true },
  { id: "failed", label: { en: "Production failed", tr: "Üretim başarısız" }, mail: true },
  { id: "salon", label: { en: "Salon post approved or declined", tr: "Salon paylaşımı onayı / reddi" }, mail: false },
  { id: "cast", label: { en: "Cast approved or declined", tr: "Cast onayı / reddi" }, mail: true },
  { id: "review", label: { en: "Review result and refund", tr: "İnceleme sonucu ve kredi iadesi" }, mail: false },
  { id: "expiring", label: { en: "Frames about to leave", tr: "Kareler silinmeden önce" }, mail: true },
  { id: "low", label: { en: "Credits running low", tr: "Kredi azaldı" }, mail: false },
];

const STORAGE_KEY = "liora-atelier-proto-v1";

function initialState(session: Session = "returning", lang: Lang = "en"): State {
  const returning = session === "returning";
  return {
    lang,
    session,
    role: returning ? "creator" : "explorer",
    credits: returning ? 142 : 5,
    failOne: false,
    lastInput: returning ? "product" : null,
    onboarded: returning,
    seenIntro: returning ? ["campaign"] : [],
    hiddenDrafts: [],
    jobs: returning ? seedJobs() : [],
    notices: returning
      ? [
          {
            id: "n1",
            title: { en: "3 frames leave in 2 days", tr: "3 kare 2 gün sonra siliniyor" },
            sub: { en: "Camel wool coat · not downloaded", tr: "Kamel yün kaban · indirilmedi" },
            href: "/jobs/j-coat",
            at: Date.now() - 1000 * 60 * 60 * 20,
          },
          {
            id: "n2",
            title: { en: "Your post is live in the Salon", tr: "Paylaşımın Salon'da yayında" },
            sub: { en: "Approved by the Liora team", tr: "Liora ekibi onayladı" },
            href: "/salon",
            at: Date.now() - 1000 * 60 * 60 * 30,
            read: true,
          },
        ]
      : [],
    brand: returning ? "Atelier Doğan" : "",
    username: returning ? "melis.dogan" : "",
    name: returning ? "Melis Doğan" : "",
    website: "",
    provider: "email",
    casts: returning ? OWN_CASTS : [],
    prefs: Object.fromEntries(NOTICE_KINDS.map((k) => [k.id, { panel: true, mail: k.mail }])),
    /* the seed drafts open where they were left */
    setups: returning
      ? {
          "j-belt": {
            id: "j-belt",
            flow: "campaign",
            item: "Deri kemer",
            shots: [{ id: "b1", src: "/img/flow/belt.jpg", name: "belt.jpg", slot: "front" }],
            shotsOk: true,
            castId: "ada",
            createdAt: "2026-09-25T15:40:00",
          },
          "j-dress": {
            id: "j-dress",
            flow: "recast",
            item: "Siyah fitilli elbise",
            shots: [
              { id: "d1", src: "/img/home/onmodel-in.jpg", name: "shoot_01.jpg", slot: "front" },
              { id: "d2", src: "/img/explore/dress-turn.jpg", name: "shoot_02.jpg", slot: "other" },
              { id: "d3", src: "/img/explore/dress-back.jpg", name: "shoot_03.jpg", slot: "back" },
            ],
            shotsOk: true,
            createdAt: "2026-09-24T11:05:00",
          },
        }
      : {},
    cancelled: false,
    guest: false,
    favorites: returning ? ["cast:ada", "pose:threeQuarter"] : [],
    poses: [],
    themes: [],
    live: null,
    profile: returning ? { for: "own", rack: ["outer", "knit"], who: ["women"], ages: ["25-35", "35-50"], tier: "premium", style: ["catalog", "light"], where: ["site", "social"] } : null,
  };
}

type Action =
  | { type: "set"; patch: Partial<State> }
  | { type: "reset"; session: Session }
  | { type: "upsertJob"; job: Job }
  | { type: "patchJob"; id: string; patch: Partial<Job> }
  | { type: "removeJob"; id: string }
  | { type: "spend"; amount: number }
  | { type: "notify"; notice: Notice }
  | { type: "complete"; id: string }
  | { type: "readAll" }
  | { type: "saveSetup"; setup: Setup; draft: Job | null }
  | { type: "read"; id: string };

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "set":
      return { ...state, ...a.patch };
    case "reset":
      return initialState(a.session, state.lang);
    case "upsertJob": {
      const exists = state.jobs.some((j) => j.id === a.job.id);
      return {
        ...state,
        jobs: exists ? state.jobs.map((j) => (j.id === a.job.id ? a.job : j)) : [a.job, ...state.jobs],
      };
    }
    case "patchJob":
      return { ...state, jobs: state.jobs.map((j) => (j.id === a.id ? { ...j, ...a.patch } : j)) };
    case "removeJob":
      return { ...state, jobs: state.jobs.filter((j) => j.id !== a.id) };
    case "spend":
      /* signed in live, the balance is the server's: a demo run never touches it */
      if (state.live) return state;
      return { ...state, credits: Math.max(0, state.credits - a.amount) };
    case "notify":
      return { ...state, notices: [a.notice, ...state.notices] };
    case "readAll":
      return { ...state, notices: state.notices.map((n) => ({ ...n, read: true })) };
    case "saveSetup": {
      /* the setup, and its draft in Jobs: kept while nothing was made from it */
      const jobs = state.jobs.filter((j) => j.id !== a.setup.id);
      return { ...state, setups: { ...state.setups, [a.setup.id]: a.setup }, jobs: a.draft ? [a.draft, ...jobs] : jobs };
    }
    case "read":
      return { ...state, notices: state.notices.map((n) => (n.id === a.id ? { ...n, read: true } : n)) };
    case "complete": {
      /* Idempotent: the flow screen and the background ticker may both
         call it. Credits are spent only for frames that arrived (W-B-07). */
      const job = state.jobs.find((j) => j.id === a.id);
      if (!job || job.status !== "running" || !job.planned) return state;
      const ok = job.planned.filter((f) => !f.failed).length;
      const failed = job.planned.length - ok;
      const done: Job = {
        ...job,
        status: "done",
        frames: job.planned,
        progress: job.planned.length,
        expiresInDays: 7,
        planned: undefined,
        finishAt: undefined,
      };
      const notice: Notice = {
        id: `n-${job.id}`,
        title:
          failed > 0
            ? { en: `${ok} of ${job.planned.length} frames are ready`, tr: `${job.planned.length} karenin ${ok} tanesi hazır` }
            : { en: `Production finished — ${ok} frames`, tr: `Üretim tamamlandı — ${ok} kare` },
        sub: { en: `${job.title.en} · see the results`, tr: `${job.title.tr} · sonuçları gör` },
        href: `/jobs/${job.id}`,
        at: Date.now(),
      };
      const spent = job.cost !== undefined ? Math.round((job.cost * ok) / job.planned.length) : ok * (job.creditPerFrame ?? 1);
      return {
        ...state,
        credits: state.live ? state.credits : Math.max(0, state.credits - spent),
        jobs: state.jobs.map((j) => (j.id === job.id ? done : j)),
        notices: [notice, ...state.notices.filter((n) => n.id !== notice.id)],
      };
    }
  }
}

interface Ctx {
  s: State;
  ready: boolean;
  dispatch: (a: Action) => void;
  set: (patch: Partial<State>) => void;
  t: (l: L) => string;
}

const AtelierCtx = createContext<Ctx | null>(null);

function load(): State {
  /* Server render: defaults. Client: whatever the last review session left.
     Nothing reads this state until `ready`, so hydration never mismatches. */
  if (typeof window === "undefined") return initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      /* answers saved in an older shape are read in today's */
      /* `live` is never trusted from storage: the session check below sets it */
      return { ...initialState(), ...saved, live: null, profile: saved.profile ? normalizeProfile(saved.profile) : (saved.profile ?? null) };
    }
  } catch {
    /* private mode or blocked storage: run on defaults */
  }
  /* no stored state yet: follow the browser's language */
  return initialState("returning", navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en");
}

const noop = () => () => {};

export function AtelierProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, load);
  /* false on the server and during hydration, true once mounted */
  const ready = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
    document.documentElement.lang = s.lang;
  }, [s, ready]);

  /* Live session: who is signed in and their balance come from the backend.
     Checked on mount, on every sign-in or sign-out, and when the tab comes
     back into view, so the balance follows what the MVP spends too. */
  useEffect(() => {
    if (!ready || !hasBackend) return;
    let gone = false;
    const sync = async () => {
      try {
        const account = await readAccount();
        if (gone) return;
        if (!account) {
          dispatch({ type: "set", patch: { live: null } });
          return;
        }
        dispatch({
          type: "set",
          patch: {
            live: { id: account.id, email: account.email },
            credits: account.credits,
            name: account.name,
            username: account.email.split("@")[0],
            provider: "email",
            session: "returning",
            onboarded: true,
            guest: false,
          },
        });
      } catch (e) {
        console.error("live account read failed", e);
      }
    };
    void sync();
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event) => {
      /* deferred: calling the auth client inside its own callback can deadlock */
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => void sync(), 0);
    });
    const onFocus = () => void sync();
    window.addEventListener("focus", onFocus);
    return () => {
      gone = true;
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [ready]);

  /* Background ticker: a production keeps running when its screen is
     closed (W-F-14) and lands as a notification when it ends (W-F-15). */
  const runningIds = s.jobs
    .filter((j) => j.status === "running" && j.finishAt)
    .map((j) => `${j.id}:${j.finishAt}`)
    .join(",");
  useEffect(() => {
    if (!runningIds) return;
    const iv = setInterval(() => {
      const now = Date.now();
      runningIds.split(",").forEach((entry) => {
        const [id, at] = entry.split(":");
        if (Number(at) <= now) dispatch({ type: "complete", id });
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [runningIds]);

  const set = useCallback((patch: Partial<State>) => dispatch({ type: "set", patch }), []);
  const t = useCallback((l: L) => l[s.lang], [s.lang]);

  const value = useMemo(() => ({ s, ready, dispatch, set, t }), [s, ready, set, t]);
  return <AtelierCtx.Provider value={value}>{children}</AtelierCtx.Provider>;
}

export function useAtelier() {
  const ctx = useContext(AtelierCtx);
  if (!ctx) throw new Error("useAtelier outside AtelierProvider");
  return ctx;
}

/* who is signed in: the name if known, else the username */
export const displayName = (s: State) => s.name || (s.username ? `@${s.username}` : "Liora");
export const initials = (s: State) => {
  const words = (s.name || s.username || "L").split(/[\s._-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toLocaleUpperCase(s.lang === "tr" ? "tr" : "en");
};

/* a cast by id: the user's own first (Cast Studio), then the catalogue */
export const findCast = (s: State, id?: string) => s.casts.find((c) => c.id === id) ?? castById(id);

/* Small formatting helpers shared by screens. */
export function fmtDate(iso: string, lang: Lang) {
  const d = new Date(iso);
  return d
    .toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function timeAgo(at: number, lang: Lang) {
  const m = Math.round((Date.now() - at) / 60000);
  if (m < 1) return lang === "tr" ? "şimdi" : "now";
  if (m < 60) return lang === "tr" ? `${m} dk önce` : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return lang === "tr" ? `${h} sa önce` : `${h} h ago`;
  const d = Math.round(h / 24);
  return lang === "tr" ? `${d} gün önce` : `${d} d ago`;
}
