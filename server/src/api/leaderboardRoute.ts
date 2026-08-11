import { Router, type Request, type Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
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

type LeaderboardPayload = { sort: LeaderboardSort; rows: LeaderboardRow[] };
type CacheEntry = { expiresAt: number; payload: LeaderboardPayload };
const leaderboardCache = new Map<string, CacheEntry>();

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

function resolveCacheTtlMs(): number {
  const raw = Number(process.env.LEADERBOARD_CACHE_TTL_MS);
  if (!Number.isFinite(raw)) {
    return 30_000;
  }
  return Math.max(0, Math.min(10 * 60_000, Math.floor(raw)));
}

function shouldForceRefresh(input: unknown): boolean {
  if (typeof input !== "string") {
    return false;
  }
  const normalized = input.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function cacheKey(sort: LeaderboardSort, limit: number): string {
  return `${sort}:${limit}`;
}

function expectedRefreshToken(): string {
  const primary = process.env.ADMIN_PANEL_TOKEN?.trim() || "";
  if (primary) return primary;
  return process.env.AUTH_FALLBACK_PANEL_TOKEN?.trim() || "";
}

function providedRefreshToken(req: Request): string {
  const direct = req.header("x-admin-token")?.trim();
  if (direct) return direct;
  const auth = req.header("authorization")?.trim() || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

function hashBuffer(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqualText(a: string, b: string): boolean {
  const left = hashBuffer(a);
  const right = hashBuffer(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isRefreshAuthorized(req: Request): boolean {
  const expected = expectedRefreshToken();
  if (!expected) {
    return true;
  }
  const provided = providedRefreshToken(req);
  return provided.length > 0 && safeEqualText(provided, expected);
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
    const forceRefresh = shouldForceRefresh(req.query.refresh);
    const key = cacheKey(sort, limit);
    const now = Date.now();
    if (!forceRefresh) {
      const existing = leaderboardCache.get(key);
      if (existing && existing.expiresAt > now) {
        return res.json({ ...existing.payload, cached: true });
      }
    }

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
      const payload: LeaderboardPayload = { sort, rows: normalizedRows };
      const ttlMs = resolveCacheTtlMs();
      if (ttlMs > 0) {
        leaderboardCache.set(key, { expiresAt: now + ttlMs, payload });
      }
      return res.json({ ...payload, cached: false });
    } catch (error) {
      console.error("[leaderboard] query failed:", error);
      return res.status(500).json({ error: "db_error" });
    }
  });

  // POST /api/leaderboard/refresh
  // Clears in-memory cache and (if available) refreshes the optional materialized view helper.
  router.post("/refresh", async (req: Request, res: Response) => {
    if (!isRefreshAuthorized(req)) {
      return res.status(403).json({ error: "forbidden" });
    }

    leaderboardCache.clear();
    let materializedRefresh: "ok" | "unavailable" | "skipped" = "skipped";
    if (isDatabaseConfigured()) {
      try {
        await db.query("SELECT refresh_leaderboard()");
        materializedRefresh = "ok";
      } catch {
        materializedRefresh = "unavailable";
      }
    }

    return res.json({
      ok: true,
      cacheCleared: true,
      materializedRefresh,
      cacheTtlMs: resolveCacheTtlMs(),
    });
  });

  return router;
}
