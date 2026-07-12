import { supabaseAdmin } from "../lib/supabaseAdmin.js";

/**
 * Administrative database operations using the server-only service-role key.
 */
export const adminDatabaseService = {
  async systemFetch(table: string): Promise<unknown[]> {
    const { data, error } = await supabaseAdmin.from(table).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async systemInsert(table: string, payload: unknown): Promise<unknown[]> {
    const { data, error } = await supabaseAdmin.from(table).insert([payload]).select();
    if (error) throw error;
    return data ?? [];
  },
};
