import { describe, expect, it } from "vitest";
import { checkDatabaseRuntimeContract } from "../config/databaseRuntimeContract.js";

const COMPLETE_COLUMNS: Record<string, string[]> = {
  player_snapshots: ["player_id", "auth_uid", "updated_at"],
  runtime_player_snapshots: ["id", "snapshot", "last_updated"],
  world_object_snapshots: ["id", "snapshot", "last_updated"],
  questline_progress: ["player_id", "questline_id", "state_json", "updated_at"],
};

function queryFor(columns: Record<string, string[]>) {
  return async (sql: string) => {
    if (sql.includes("SELECT 1 AS ok")) {
      return { rows: [{ ok: 1, database: "areloria_test", server_version_num: "160004" }] };
    }
    if (sql.includes("information_schema.columns")) {
      return {
        rows: Object.entries(columns).flatMap(([table_name, names]) =>
          names.map((column_name) => ({ table_name, column_name })),
        ),
      };
    }
    if (sql.includes("FROM pg_extension")) {
      return { rows: [{ extname: "pgcrypto" }] };
    }
    if (sql.includes("FROM pg_class")) {
      return { rows: [{ enabled: true }] };
    }
    if (sql.includes("FROM pg_policies")) {
      return {
        rows: [
          { policyname: "players_insert_own" },
          { policyname: "players_read_own" },
          { policyname: "players_update_own" },
        ],
      };
    }
    throw new Error(`Unexpected SQL in test: ${sql}`);
  };
}

describe("database runtime contract", () => {
  it("accepts separated Supabase profile and engine runtime snapshot schemas", async () => {
    const evidence = await checkDatabaseRuntimeContract({
      configured: true,
      required: true,
      requireRls: true,
      query: queryFor(COMPLETE_COLUMNS),
    });

    expect(evidence.ok).toBe(true);
    expect(evidence.status).toBe("ok");
    expect(evidence.schema.missingColumns).toEqual([]);
    expect(evidence.schema.conflictingColumns).toEqual([]);
    expect(evidence.rls.enabled).toBe(true);
  });

  it("rejects the former runtime shape when it occupies player_snapshots", async () => {
    const evidence = await checkDatabaseRuntimeContract({
      configured: true,
      required: true,
      requireRls: true,
      query: queryFor({
        player_snapshots: ["id", "snapshot", "last_updated"],
        world_object_snapshots: ["id", "snapshot", "last_updated"],
        questline_progress: ["player_id", "questline_id", "state_json", "updated_at"],
      }),
    });

    expect(evidence.ok).toBe(false);
    expect(evidence.status).toBe("schema_mismatch");
    expect(evidence.schema.conflictingColumns).toEqual([
      "player_snapshots.id",
      "player_snapshots.last_updated",
      "player_snapshots.snapshot",
    ]);
    expect(evidence.schema.missingColumns).toContain("runtime_player_snapshots.id");
    expect(evidence.schema.missingColumns).toContain("player_snapshots.player_id");
  });

  it("reports an optional absent database without inventing connectivity", async () => {
    const evidence = await checkDatabaseRuntimeContract({
      configured: false,
      required: false,
    });

    expect(evidence.ok).toBe(true);
    expect(evidence.configured).toBe(false);
    expect(evidence.status).toBe("not_configured");
    expect(evidence.canary.selectOne).toBe(false);
  });
});
