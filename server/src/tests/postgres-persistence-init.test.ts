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

  it("creates isolated runtime snapshots, world objects, and questline progress", async () => {
    const backend = new PostgresPersistenceBackend();
    await backend.init();
    const calls = querySpy.mock.calls.map((call: unknown[]) => String(call[0]));

    expect(
      calls.some((sql: string) => sql.includes("runtime_player_snapshots")),
    ).toBe(true);
    expect(
      calls.some((sql: string) =>
        /CREATE TABLE IF NOT EXISTS\s+player_snapshots\s*\(/i.test(sql),
      ),
    ).toBe(false);
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

  it("propagates initialization failures", async () => {
    querySpy.mockRejectedValueOnce(new Error("schema conflict"));
    const backend = new PostgresPersistenceBackend();

    await expect(backend.init()).rejects.toThrow("schema conflict");
  });
});
