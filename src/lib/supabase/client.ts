import { createBrowserClient } from "@supabase/ssr";

/* The live backend: the MVP's Supabase project, shared until the cut-over.
   Its keys are set only where the app is deployed (the Vercel preview and
   production); without them the atelier runs on its demo data. */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasBackend = Boolean(url && key);

/* one client per browser tab: createBrowserClient keeps a singleton */
export function createClient() {
  return createBrowserClient(url!, key!);
}
