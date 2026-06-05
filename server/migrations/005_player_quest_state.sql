-- =============================================================================
-- QUEST STATE PERSISTENCE TABLE
--
-- This migration creates the player_quest_state table for DB-backed quest
-- persistence. It is safe to run multiple times (IF NOT EXISTS).
--
-- The server also auto-creates this table on startup via ensurePlayerQuestStateTable()
-- if it doesn't exist. This migration provides explicit control and documentation.
--
-- Usage:
--   psql -d "$DATABASE_URL" -f server/migrations/005_player_quest_state.sql
--
-- Verification:
--   psql -d "$DATABASE_URL" -c "\d player_quest_state"
-- =============================================================================

-- Player Quest State Table
-- Stores quest state for each player with schema versioning for future migrations.
CREATE TABLE IF NOT EXISTS player_quest_state (
  player_id       TEXT        NOT NULL PRIMARY KEY,
  schema_version  INTEGER     NOT NULL DEFAULT 1,
  quests_json     JSONB       NOT NULL,
  updated_tick    INTEGER     NULL,           -- Game tick for determinism
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying recently updated players (useful for analytics/cleanup)
CREATE INDEX IF NOT EXISTS idx_player_quest_state_updated_at
  ON player_quest_state(updated_at DESC);

-- Optional: Index for players with active quests (quests_json != '[]')
-- Uncomment if you need to query players with active quests frequently:
-- CREATE INDEX IF NOT EXISTS idx_player_quest_state_active
--   ON player_quest_state((quests_json != '[]'::jsonb))
--   WHERE quests_json != '[]'::jsonb;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE player_quest_state IS 'Stores quest progression state for each player';
COMMENT ON COLUMN player_quest_state.player_id IS 'Player unique identifier (matches auth provider)';
COMMENT ON COLUMN player_quest_state.schema_version IS 'Schema version for future migrations';
COMMENT ON COLUMN player_quest_state.quests_json IS 'Quest state as JSONB array';
COMMENT ON COLUMN player_quest_state.updated_tick IS 'Server game tick when last updated (determinism)';
COMMENT ON COLUMN player_quest_state.created_at IS 'When this record was first created';
COMMENT ON COLUMN player_quest_state.updated_at IS 'When this record was last modified';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check table exists
-- SELECT 1 FROM player_quest_state LIMIT 1;

-- Check row count
-- SELECT COUNT(*) FROM player_quest_state;

-- Check recent updates
-- SELECT player_id, updated_at FROM player_quest_state ORDER BY updated_at DESC LIMIT 10;

-- =============================================================================
-- ROLLBACK (use only if necessary)
-- =============================================================================

-- This migration is idempotent (IF NOT EXISTS), so rollback is safe.
-- To drop the table:
-- DROP TABLE IF EXISTS player_quest_state;
-- =============================================================================