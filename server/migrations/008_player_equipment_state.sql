-- Migration: 008_player_equipment_state
-- Creates player_equipment_state table for equipment persistence

CREATE TABLE IF NOT EXISTS player_equipment_state (
  player_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  equipment_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_equipment_state_updated_at
ON player_equipment_state(updated_at);