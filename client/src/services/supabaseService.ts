import { supabase } from "../lib/supabase";

/**
 * Service für Datenbankoperationen im Frontend.
 * Nutzt den Anon-Key und respektiert RLS-Regeln.
 */
export const databaseService = {
  async fetchData(table: string) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    return data;
  },

  async insertData(table: string, payload: any) {
    const { data, error } = await supabase.from(table).insert([payload]).select();
    if (error) throw error;
    return data;
  },

  async updateData(table: string, id: string | number, payload: any) {
    const { data, error } = await supabase.from(table).update(payload).eq("id", id).select();
    if (error) throw error;
    return data;
  },

  async deleteData(table: string, id: string | number) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};

/**
 * Service für Authentifizierung.
 */
export const authService = {
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
};

/**
 * Service für Echtzeit-Updates (Realtime).
 */
export const realtimeService = {
  subscribeToTable(table: string, callback: (payload: any) => void) {
    return supabase
      .channel(`${table}_changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, callback)
      .subscribe();
  }
};

/**
 * Service für Asset-Uploads (Storage).
 */
export const storageService = {
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return data;
  },

  async getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
};
