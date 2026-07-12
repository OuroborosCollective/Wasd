import { readFile } from "node:fs/promises";
import path from "node:path";

function envFlag(key: string): boolean {
  return ["1", "true", "yes", "on"].includes((process.env[key] ?? "").trim().toLowerCase());
}

async function readRepoFile(relativePath: string): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), "..", relativePath),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      // Try the next repository-root candidate.
    }
  }
  throw new Error(`Unable to resolve repository file: ${relativePath}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  if (!envFlag("DATABASE_CONTRACT_ALLOW_DDL")) {
    throw new Error("DATABASE_CONTRACT_ALLOW_DDL=1 is required for the disposable contract database.");
  }

  process.env.PERSISTENCE_DRIVER = "postgres";
  process.env.DATABASE_RUNTIME_REQUIRED = "1";
  process.env.SUPABASE_REQUIRE_RLS = "1";

  const [{ db }, { PostgresPersistenceBackend }, { checkDatabaseRuntimeContract }] = await Promise.all([
    import("../core/Database.js"),
    import("../modules/persistence/postgresPersistenceBackend.js"),
    import("../config/databaseRuntimeContract.js"),
  ]);

  try {
    await db.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await db.query("CREATE SCHEMA IF NOT EXISTS auth");
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN BYPASSRLS;
        END IF;
      END
      $$;
    `);
    await db.query(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    `);

    const profileMigration = await readRepoFile("migrations/001_create_players.sql");
    await db.query(profileMigration);
    await db.query(profileMigration);

    const rlsMigration = await readRepoFile("migrations/006_player_rls.sql");
    await db.query(rlsMigration);
    await db.query(rlsMigration);

    const backend = new PostgresPersistenceBackend();
    await backend.init();
    await backend.init();

    await db.query(
      `INSERT INTO player_snapshots (player_id, display_name, auth_uid)
       VALUES ($1, $2, $3)
       ON CONFLICT (player_id) DO UPDATE SET display_name = EXCLUDED.display_name`,
      ["profile-ci-player", "Profile Canary", "00000000-0000-0000-0000-000000000001"],
    );

    await backend.save({
      "runtime-ci-player": {
        id: "runtime-ci-player",
        name: "Runtime Canary",
        position: { x: 1, y: 0, z: 2 },
        level: 3,
      },
    });

    const loaded = await backend.load();
    assert(loaded["runtime-ci-player"], "Runtime player snapshot roundtrip failed.");

    const profileCount = await db.query(
      "SELECT COUNT(*)::int AS count FROM player_snapshots WHERE player_id = $1",
      ["profile-ci-player"],
    );
    const runtimeCount = await db.query(
      "SELECT COUNT(*)::int AS count FROM runtime_player_snapshots WHERE id = $1",
      ["runtime-ci-player"],
    );
    assert(Number(profileCount.rows?.[0]?.count) === 1, "Supabase profile row was not persisted.");
    assert(Number(runtimeCount.rows?.[0]?.count) === 1, "Engine runtime snapshot row was not persisted.");

    const evidence = await checkDatabaseRuntimeContract({
      configured: true,
      required: true,
      requireRls: true,
      requireVector: false,
    });
    console.log(JSON.stringify(evidence, null, 2));
    assert(evidence.ok, `Database runtime contract failed with status ${evidence.status}.`);
  } finally {
    await db.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
