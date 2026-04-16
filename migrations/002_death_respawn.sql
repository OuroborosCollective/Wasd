-- Migration 002: death/respawn tracking columns.

ALTER TABLE player_snapshots
  ADD COLUMN IF NOT EXISTS last_death_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS respawn_zone_id TEXT,
  ADD COLUMN IF NOT EXISTS respawn_at_x    FLOAT,
  ADD COLUMN IF NOT EXISTS respawn_at_z    FLOAT;
