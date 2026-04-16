import { createClient } from "@supabase/supabase-js";

// Der Client für das Frontend nutzt die Umgebungsvariablen von Vite.
// Die tatsächlichen Werte werden auf dem VPS in der .env-Datei gesetzt.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
