-- Migration 006: Enable Row Level Security on player_snapshots.
-- Players can only read/write their own row (matched by auth.uid).

-- 1. Enable RLS
ALTER TABLE player_snapshots ENABLE ROW LEVEL SECURITY;

-- 2. Players can SELECT their own row
CREATE POLICY "players_read_own"
  ON player_snapshots
  FOR SELECT
  USING (auth.uid()::text = auth_uid);

-- 3. Players can UPDATE their own row
CREATE POLICY "players_update_own"
  ON player_snapshots
  FOR UPDATE
  USING (auth.uid()::text = auth_uid)
  WITH CHECK (auth.uid()::text = auth_uid);

-- 4. Players can INSERT their own row (sign-up / first login)
CREATE POLICY "players_insert_own"
  ON player_snapshots
  FOR INSERT
  WITH CHECK (auth.uid()::text = auth_uid);

-- 5. Service role bypasses RLS automatically (for server-side admin ops).
-- No explicit policy needed for service_role — it ignores RLS by default.

-- 6. Verify: anon users CANNOT delete (DELETE is server-only via service_role).
-- No DELETE policy = anon cannot delete any rows.
