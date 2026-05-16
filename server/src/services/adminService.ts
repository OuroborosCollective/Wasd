import { ServiceRoleAdmin } from "../lib/adminDbClient.js";

/**
 * Service für administrative Datenbankoperationen (Server-side).
 * Nutzt den Service Role Key und umgeht RLS-Regeln.
 */
export const adminDatabaseService = {
  async systemFetch(table: string) {
    const { data, error } = await ServiceRoleAdmin.from(table).select("*");
    if (error) throw error;
    return data;
  },

  async systemInsert(table: string, payload: any) {
    const { data, error } = await ServiceRoleAdmin.from(table).insert([payload]).select();
    if (error) throw error;
    return data;
  },
};
