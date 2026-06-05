-- Player Skill State Migration
-- Adds table for persisting player skill progression state.

CREATE TABLE IF NOT EXISTS player_skill_state (
  player_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  skills_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_skill_state_updated_at
ON player_skill_state(updated_at);