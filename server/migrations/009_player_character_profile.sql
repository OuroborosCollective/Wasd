-- Migration: 009_player_character_profile
-- Creates player_character_profile table for character profile persistence

CREATE TABLE IF NOT EXISTS player_character_profile (
  player_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  character_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  created_at_tick INTEGER NOT NULL DEFAULT 0,
  selected BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_character_profile_updated_at
ON player_character_profile(updated_at);