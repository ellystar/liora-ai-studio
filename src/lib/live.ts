import type { Cast, L, Setting } from "./data";
import { createClient } from "./supabase/client";

/* Aşama 1 · Okuma — what the atelier reads from the live backend. Reads only:
   RLS shows a person their own profile and their own credit ledger. The
   package is not stored yet (accounts.plan arrives in Aşama 2), so it stays
   with the demo controls until then. */

export interface LiveAccount {
  id: string;
  email: string;
  name: string;
  credits: number;
}

export interface LedgerRow {
  at: string;
  amount: number;
  type: "topup" | "usage" | "refund";
  tool: string | null;
}

/* the signed-in person, or null when nobody is */
export async function readAccount(): Promise<LiveAccount | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("email, full_name, credits").eq("id", user.id).single();
  if (error) throw error;
  return { id: user.id, email: data.email ?? user.email ?? "", name: data.full_name ?? "", credits: data.credits };
}

/* the person's credit ledger, newest first */
export async function readLedger(limit = 50): Promise<LedgerRow[]> {
  const { data, error } = await createClient()
    .from("credit_transactions")
    .select("created_at, amount, type, tool")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ at: r.created_at, amount: r.amount, type: r.type, tool: r.tool }));
}

/* The catalogue: models are the cast, backgrounds the settings. RLS shows the
   shared catalogue (no owner) and what belongs to the person — models made or
   assigned for their brand, backgrounds they saved. Nothing is tiered yet:
   min_plan arrives with Aşama 2, so every card is open until then. */
export interface LiveCatalog {
  casts: Cast[];
  ownCasts: Cast[];
  settings: Setting[];
  ownSettings: Setting[];
}

type ModelRow = { id: string; name: string; gender: string | null; image_url: string; owner_id: string | null; source: string };
type BackgroundRow = { id: string; name: string; thumbnail_url: string; image_path: string | null; owner_id: string | null };

export async function readCatalog(userId: string): Promise<LiveCatalog> {
  const supabase = createClient();
  const [models, backgrounds] = await Promise.all([
    supabase.from("models").select("id, name, gender, image_url, owner_id, source").eq("is_active", true).order("created_at"),
    supabase.from("backgrounds").select("id, name, thumbnail_url, image_path, owner_id").eq("is_active", true).order("created_at"),
  ]);
  if (models.error) throw models.error;
  if (backgrounds.error) throw backgrounds.error;

  const toCast = (m: ModelRow): Cast => ({
    id: m.id,
    name: m.name,
    img: m.image_url,
    minRole: "explorer",
    gender: m.gender === "male" ? "man" : m.gender === "female" ? "woman" : undefined,
    own: m.owner_id === userId || undefined,
    note:
      m.owner_id === userId
        ? m.source === "user"
          ? { en: "Your upload", tr: "Senin yüklediğin" }
          : { en: "Made for your brand", tr: "Markana özel" }
        : m.gender === "male"
          ? { en: "Man", tr: "Erkek" }
          : { en: "Woman", tr: "Kadın" },
  });

  /* a saved background has no public thumbnail: its file is private, read signed */
  const rows = (backgrounds.data ?? []) as BackgroundRow[];
  const privatePaths = rows.filter((b) => !b.thumbnail_url && b.image_path).map((b) => b.image_path!);
  const signed: Record<string, string> = {};
  if (privatePaths.length) {
    const { data, error } = await supabase.storage.from("backgrounds").createSignedUrls(privatePaths, 3600);
    if (error) throw error;
    data?.forEach((d) => d.path && d.signedUrl && (signed[d.path] = d.signedUrl));
  }
  const toSetting = (b: BackgroundRow): Setting => ({
    id: b.id,
    name: { en: b.name, tr: b.name },
    img: b.thumbnail_url || (b.image_path ? (signed[b.image_path] ?? "") : ""),
    minRole: "explorer",
    own: b.owner_id === userId || undefined,
  });

  const castRows = (models.data ?? []) as ModelRow[];
  return {
    casts: castRows.filter((m) => !m.owner_id).map(toCast),
    ownCasts: castRows.filter((m) => m.owner_id === userId).map(toCast),
    settings: rows.filter((b) => !b.owner_id).map(toSetting),
    ownSettings: rows.filter((b) => b.owner_id === userId).map(toSetting),
  };
}

/* the MVP's tools, as the ledger names them (deduct_credits p_tool) */
const TOOL: Record<string, L> = {
  ecom_studio: { en: "Ecom Studio", tr: "Ecom Studio" },
  pose_generator: { en: "Pose generator", tr: "Poz üretici" },
  flat_to_ghost: { en: "Flat to ghost", tr: "Flat'ten Ghost'a" },
  edit_photo: { en: "Photo edit", tr: "Fotoğraf düzenleme" },
  style_transfer: { en: "Style transfer", tr: "Stil transferi" },
  ai_video: { en: "180° video", tr: "180° video" },
};

export function ledgerLabel(row: LedgerRow): L {
  if (row.type === "topup") return { en: "Credits added", tr: "Kredi yüklendi" };
  if (row.type === "refund") return { en: "Refund", tr: "İade" };
  return (row.tool && TOOL[row.tool]) || { en: "Production", tr: "Üretim" };
}
