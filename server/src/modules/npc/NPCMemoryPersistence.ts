// @ts-nocheck
/** @are-telemetry-side-channel */
/**
 * NPCMemoryPersistence — Layer 2: Supabase-backed long-term NPC memory.
 *
 * Loads on NPC init, saves on significant events and periodic flush.
 * Gracefully degrades when Supabase is unavailable.
 */

import { type NPCMemoryCache, type NPCMemoryState } from "./NPCMemoryCache.js";

type SupabaseClient = {
  from: (table: string) => {
    select: (cols?: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }> } };
    upsert: (row: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};

const TABLE = "npc_memory";

let supabase: SupabaseClient | null = null;

/** Inject the Supabase admin client (called once at boot). */
export function setSupabaseClient(client: SupabaseClient | null): void {
  supabase = client;
}

/**
 * Load a single NPC's persisted memory into the cache.
 * @returns true if a row was found and hydrated.
 */
export async function loadNpcMemory(cache: NPCMemoryCache, npcId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("npc_id", npcId)
      .maybeSingle();
    if (error || !data) return false;
    cache.hydrate(npcId, {
      heuristicWeights: data.heuristic_weights as NPCMemoryState["heuristicWeights"] | undefined,
      longTermGoals: data.long_term_goals as string[] | undefined,
      tradeHistory: data.trade_history as NPCMemoryState["tradeHistory"] | undefined,
      reputation: data.reputation as NPCMemoryState["reputation"] | undefined,
      eventLog: data.event_log as NPCMemoryState["eventLog"] | undefined,
    });
    return true;
  } catch (e) {
    console.warn(`[NPCMemoryPersistence] load failed for ${npcId}:`, e);
    return false;
  }
}

/** Save a single dirty entry to Supabase. */
export async function saveNpcMemory(state: NPCMemoryState): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        npc_id: state.npcId,
        heuristic_weights: state.heuristicWeights,
        long_term_goals: state.longTermGoals,
        trade_history: state.tradeHistory.slice(-50),
        reputation: state.reputation,
        event_log: state.eventLog.slice(-100),
        last_updated: new Date().toISOString(), // @are-determinism-allow - telemetry side-channel
      },
      { onConflict: "npc_id" },
    );
    if (error) {
      console.warn(`[NPCMemoryPersistence] save failed for ${state.npcId}:`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[NPCMemoryPersistence] save error for ${state.npcId}:`, e);
    return false;
  }
}

/**
 * Flush all dirty cache entries to Supabase.
 * Marks successfully saved entries as clean.
 */
export async function flushDirtyEntries(cache: NPCMemoryCache): Promise<number> {
  const dirty = cache.getDirtyEntries();
  if (!dirty.length) return 0;
  let saved = 0;
  for (const state of dirty) {
    const ok = await saveNpcMemory(state);
    if (ok) {
      cache.markSaved(state.npcId);
      saved++;
    }
  }
  return saved;
}
