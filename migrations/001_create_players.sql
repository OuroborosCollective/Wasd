-- Migration 001: player_snapshots base table for PostgreSQL/Supabase persistence.
-- Safe to apply repeatedly.

CREATE TABLE IF NOT EXISTS player_snapshots (
  player_id         TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL DEFAULT 'Adventurer',
  auth_uid          TEXT UNIQUE,

  -- Position
  pos_x             FLOAT   NOT NULL DEFAULT 0,
  pos_z             FLOAT   NOT NULL DEFAULT 0,
  current_zone      TEXT    NOT NULL DEFAULT 'didis_hub',

  -- Vitals
  health            INT     NOT NULL DEFAULT 100,
  max_health        INT     NOT NULL DEFAULT 100,
  mana              INT     NOT NULL DEFAULT 50,
  max_mana          INT     NOT NULL DEFAULT 50,
  stamina           FLOAT   NOT NULL DEFAULT 100,

  -- Progression
  character_level   INT     NOT NULL DEFAULT 1,
  xp                INT     NOT NULL DEFAULT 0,
  gold              INT     NOT NULL DEFAULT 0,
  kills             INT     NOT NULL DEFAULT 0,
  total_deaths      INT     NOT NULL DEFAULT 0,

  -- Equipment (item_ids)
  equipped_weapon   TEXT,
  equipped_armor    TEXT,

  -- Flexible JSONB for inventory, quests, skills, etc.
  inventory         JSONB   NOT NULL DEFAULT '[]',
  active_quests     JSONB   NOT NULL DEFAULT '[]',
  completed_quests  JSONB   NOT NULL DEFAULT '[]',
  skill_cooldowns   JSONB   NOT NULL DEFAULT '{}',
  skills            JSONB   NOT NULL DEFAULT '{"combat":{"level":1}}',
  flags             JSONB   NOT NULL DEFAULT '{}',
  reputation        JSONB   NOT NULL DEFAULT '{}',
  used_choices      JSONB   NOT NULL DEFAULT '[]',

  -- Class / appearance
  character_class   TEXT    NOT NULL DEFAULT 'Novice',
  appearance        TEXT    NOT NULL DEFAULT 'default',
  role              TEXT    NOT NULL DEFAULT 'player',

  -- Scene
  scene_id          TEXT,
  spawn_key         TEXT,
  combat_target_npc TEXT,
  quick_cast_skill  TEXT,

  -- Faction & civilization
  faction           TEXT,
  civilization      TEXT,
  matrix_energy     FLOAT   NOT NULL DEFAULT 0,

  -- Meta
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at     TIMESTAMPTZ,
  is_banned         BOOLEAN NOT NULL DEFAULT false
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_player_snapshots_updated_at ON player_snapshots;
CREATE TRIGGER trg_player_snapshots_updated_at
  BEFORE UPDATE ON player_snapshots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_players_auth_uid    ON player_snapshots(auth_uid);
CREATE INDEX IF NOT EXISTS idx_players_zone        ON player_snapshots(current_zone);
CREATE INDEX IF NOT EXISTS idx_players_level_xp    ON player_snapshots(character_level DESC, xp DESC);
