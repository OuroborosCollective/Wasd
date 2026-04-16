import { Router, type Request, type Response } from "express";
import { db, isDatabaseConfigured } from "../core/Database.js";

export type LeaderboardSort = "xp" | "gold" | "kills";

export interface LeaderboardRow {
  player_id: string;
  display_name: string;
  character_level: number;
  xp: number;
  gold: number;
  kills: number;
  deaths: number;
  updated_at: string;
}

const SORT_COLUMN: Record<LeaderboardSort, string> = {
  xp: "xp",
  gold: "gold",
  kills: "kills",
};

function parseSort(input: unknown): LeaderboardSort {
  if (typeof input !== "string") {
    return "xp";
  }
  const normalized = input.trim().toLowerCase();
  if (normalized === "gold") return "gold";
  if (normalized === "kills") return "kills";
  return "xp";
}

function parseLimit(input: unknown): number {
  const value = Number(input);
  if (!Number.isFinite(value)) {
    return 20;
  }
  return Math.min(Math.max(Math.floor(value), 1), 100);
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function leaderboardRouter(): Router {
  const router = Router();

  // GET /api/leaderboard?limit=20&sort=xp|gold|kills
  router.get("/", async (req: Request, res: Response) => {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({
        error: "db_not_configured",
        message: "Leaderboard requires PostgreSQL connection.",
      });
    }

    const sort = parseSort(req.query.sort);
    const limit = parseLimit(req.query.limit);
    const sortColumn = SORT_COLUMN[sort];

    try {
      const { rows } = await db.query(
        `
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
          ORDER BY ${sortColumn} DESC, last_updated DESC
          LIMIT $1
        `,
        [limit]
      );

      const normalizedRows: LeaderboardRow[] = rows.map((row: Record<string, unknown>) => ({
        player_id: typeof row.player_id === "string" ? row.player_id : "",
        display_name: typeof row.display_name === "string" ? row.display_name : "Unknown",
        character_level: toNumber(row.character_level),
        xp: toNumber(row.xp),
        gold: toNumber(row.gold),
        kills: toNumber(row.kills),
        deaths: toNumber(row.deaths),
        updated_at: row.updated_at ? String(row.updated_at) : "",
      }));

      return res.json({ sort, rows: normalizedRows });
    } catch (error) {
      console.error("[leaderboard] query failed:", error);
      return res.status(500).json({ error: "db_error" });
    }
  });

  return router;
}
