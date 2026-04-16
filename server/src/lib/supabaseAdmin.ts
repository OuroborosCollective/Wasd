import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Die Umgebungsvariablen werden auf dem Server über .env geladen.
dotenv.config();

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
