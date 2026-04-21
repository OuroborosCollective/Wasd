import { supabaseAdmin } from "../lib/supabaseAdmin";

/**
 * Service für administrative Datenbankoperationen (Server-side).
 * Nutzt den Service Role Key und umgeht RLS-Regeln.
 */
export const adminDatabaseService = {
  async systemFetch(table: string) {
    const { data, error } = await supabaseAdmin.from(table).select("*");
    if (error) throw error;
    return data;
  },

  async systemInsert(table: string, payload: any) {
    const { data, error } = await supabaseAdmin.from(table).insert([payload]).select();
    if (error) throw error;
    return data;
  }
};
