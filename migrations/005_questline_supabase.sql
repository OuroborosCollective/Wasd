-- Questline progress for Supabase Postgres (stack B): one row per player + questline id.
-- Run on your Supabase SQL editor or via node-pg-migrate.

CREATE TABLE IF NOT EXISTS questline_progress (
  player_id     TEXT NOT NULL,
  questline_id  TEXT NOT NULL,
  strand_key    TEXT NOT NULL DEFAULT 'A',
  current_node  TEXT NOT NULL DEFAULT 'start',
  state_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, questline_id)
);

CREATE INDEX IF NOT EXISTS questline_progress_player_idx
  ON questline_progress (player_id);

CREATE INDEX IF NOT EXISTS questline_progress_updated_idx
  ON questline_progress (updated_at DESC);
