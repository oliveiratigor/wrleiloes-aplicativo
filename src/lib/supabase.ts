import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Aponta para o MESMO projeto Supabase do Backoffice.
// Defina em .env.local:
//   VITE_SUPABASE_URL=https://<ref>.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? "http://localhost:54321",
  SUPABASE_PUBLISHABLE_KEY ?? "public-anon-key-placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "wr-vistoria-auth",
    },
  },
);
