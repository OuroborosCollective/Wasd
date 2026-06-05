-- Player Inventory State Migration
-- Stores persistent player inventory for gathered resource items.

CREATE TABLE IF NOT EXISTS player_inventory_state (
  player_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  inventory_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_inventory_state_updated_at
ON player_inventory_state(updated_at);