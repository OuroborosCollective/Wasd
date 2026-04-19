import { createClient } from "@supabase/supabase-js";

// Der Client für das Frontend nutzt die Umgebungsvariablen von Vite.
// Die tatsächlichen Werte werden auf dem VPS in der .env-Datei gesetzt.
const env =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env ?? {};

export const supabase = createClient(
  env.VITE_SUPABASE_URL ?? "",
  env.VITE_SUPABASE_ANON_KEY ?? "",
);
