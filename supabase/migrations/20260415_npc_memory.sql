-- NPC long-term memory table for the MEMCACHE + Supabase persistence layer.
-- Upserted by npc_id; each NPC gets exactly one row.

CREATE TABLE IF NOT EXISTS npc_memory (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  npc_id        text UNIQUE NOT NULL,
  heuristic_weights jsonb DEFAULT '{}'::jsonb,
  long_term_goals   jsonb DEFAULT '[]'::jsonb,
  trade_history     jsonb DEFAULT '[]'::jsonb,
  reputation        jsonb DEFAULT '[]'::jsonb,
  event_log         jsonb DEFAULT '[]'::jsonb,
  last_updated      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_npc_memory_npc_id ON npc_memory (npc_id);
