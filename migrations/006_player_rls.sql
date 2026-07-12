-- Migration 006: Enable Row Level Security on player_snapshots.
-- Players can only read/write their own row (matched by auth.uid).
-- Safe to apply repeatedly.

ALTER TABLE player_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "players_read_own" ON player_snapshots;
CREATE POLICY "players_read_own"
  ON player_snapshots
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = auth_uid);

DROP POLICY IF EXISTS "players_update_own" ON player_snapshots;
CREATE POLICY "players_update_own"
  ON player_snapshots
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = auth_uid)
  WITH CHECK (auth.uid()::text = auth_uid);

DROP POLICY IF EXISTS "players_insert_own" ON player_snapshots;
CREATE POLICY "players_insert_own"
  ON player_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = auth_uid);

-- DELETE intentionally has no authenticated policy.
-- Supabase service_role bypasses RLS through its BYPASSRLS role.
