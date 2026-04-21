import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Database from "../core/Database.js";
import { PostgresPersistenceBackend } from "../modules/persistence/postgresPersistenceBackend.js";

describe("PostgresPersistenceBackend.init", () => {
  let querySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(Database, "isDatabaseConfigured").mockReturnValue(true);
    querySpy = vi
      .spyOn(Database.db, "query")
      .mockResolvedValue({ rows: [] } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates player_snapshots, world_object_snapshots, and questline_progress", async () => {
    const backend = new PostgresPersistenceBackend();
    await backend.init();
    const calls = querySpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((sql: string) => sql.includes("player_snapshots"))).toBe(
      true,
    );
    expect(
      calls.some((sql: string) => sql.includes("world_object_snapshots")),
    ).toBe(true);
    expect(
      calls.some((sql: string) => sql.includes("questline_progress")),
    ).toBe(true);
    expect(
      calls.some((sql: string) =>
        sql.includes("questline_progress_player_idx"),
      ),
    ).toBe(true);
  });
});
