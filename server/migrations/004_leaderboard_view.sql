-- Optional leaderboard acceleration on PostgreSQL.
-- Safe to run multiple times.

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_top100 AS
SELECT
  id AS player_id,
  COALESCE(NULLIF(snapshot->>'name', ''), id) AS display_name,
  COALESCE(NULLIF(snapshot->>'level', '')::int, 1) AS character_level,
  COALESCE(NULLIF(snapshot->>'xp', '')::bigint, 0) AS xp,
  COALESCE(NULLIF(snapshot->>'gold', '')::bigint, 0) AS gold,
  COALESCE(NULLIF(snapshot->>'kills', '')::bigint, 0) AS kills,
  COALESCE(NULLIF(snapshot->>'deaths', '')::bigint, 0) AS deaths,
  last_updated AS updated_at
FROM player_snapshots
ORDER BY xp DESC, last_updated DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_top100_player_id_idx
  ON leaderboard_top100 (player_id);

CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE sql
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_top100;
$$;
