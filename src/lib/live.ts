import type { L } from "./data";
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
