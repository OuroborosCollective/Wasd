-- Migration 003: party system tables.

CREATE TABLE IF NOT EXISTS parties (
  id          TEXT PRIMARY KEY,
  leader_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  disbanded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS party_members (
  party_id   TEXT  NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  player_id  TEXT  NOT NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  role       TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (party_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_party_members_player ON party_members(player_id);
