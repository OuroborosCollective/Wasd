// @ARE-GUARD-EXEMPT: non-sim module
import { db, isDatabaseConfigured } from "../../core/Database.js";

export type QuestlineProgressRow = {
  player_id: string;
  questline_id: string;
  strand_key: string;
  current_node: string;
  state_json: Record<string, unknown>;
  updated_at: string;
};

export async function loadQuestlineProgress(
  playerId: string,
  questlineId: string
): Promise<QuestlineProgressRow | null> {
  if (!isDatabaseConfigured()) return null;
  const r = await db.query(
    `SELECT player_id, questline_id, strand_key, current_node, state_json, updated_at::text
     FROM questline_progress WHERE player_id = $1 AND questline_id = $2`,
    [playerId, questlineId]
  );
  if (r.rows.length === 0) return null;
  const row = r.rows[0] as any;
  return {
    player_id: row.player_id,
    questline_id: row.questline_id,
    strand_key: row.strand_key,
    current_node: row.current_node,
    state_json: typeof row.state_json === "object" && row.state_json ? row.state_json : {},
    updated_at: row.updated_at,
  };
}

export async function upsertQuestlineProgress(row: {
  playerId: string;
  questlineId: string;
  strandKey: string;
  currentNode: string;
  stateJson: Record<string, unknown>;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await db.query(
    `INSERT INTO questline_progress (player_id, questline_id, strand_key, current_node, state_json, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
     ON CONFLICT (player_id, questline_id) DO UPDATE SET
       strand_key = EXCLUDED.strand_key,
       current_node = EXCLUDED.current_node,
       state_json = EXCLUDED.state_json,
       updated_at = NOW()`,
    [row.playerId, row.questlineId, row.strandKey, row.currentNode, JSON.stringify(row.stateJson)]
  );
}

export async function listQuestlinesForPlayer(playerId: string): Promise<QuestlineProgressRow[]> {
  if (!isDatabaseConfigured()) return [];
  const r = await db.query(
    `SELECT player_id, questline_id, strand_key, current_node, state_json, updated_at::text
     FROM questline_progress WHERE player_id = $1 ORDER BY updated_at DESC`,
    [playerId]
  );
  return r.rows.map((row: any) => ({
    player_id: row.player_id,
    questline_id: row.questline_id,
    strand_key: row.strand_key,
    current_node: row.current_node,
    state_json: typeof row.state_json === "object" && row.state_json ? row.state_json : {},
    updated_at: row.updated_at,
  }));
}
