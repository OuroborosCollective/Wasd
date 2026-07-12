import { db, isDatabaseConfigured } from "../core/Database.js";

export type DatabaseRuntimeStatus =
  | "ok"
  | "not_configured"
  | "unreachable"
  | "schema_mismatch";

export interface DatabaseRuntimeEvidence {
  readonly ok: boolean;
  readonly required: boolean;
  readonly configured: boolean;
  readonly status: DatabaseRuntimeStatus;
  readonly canary: {
    readonly selectOne: boolean;
    readonly database: string | null;
    readonly serverVersionNum: string | null;
  };
  readonly schema: {
    readonly missingColumns: readonly string[];
    readonly conflictingColumns: readonly string[];
  };
  readonly extensions: {
    readonly required: readonly string[];
    readonly present: readonly string[];
    readonly missing: readonly string[];
  };
  readonly rls: {
    readonly required: boolean;
    readonly enabled: boolean;
    readonly presentPolicies: readonly string[];
    readonly missingPolicies: readonly string[];
  };
  readonly error?: string;
}

type QueryResultLike = { rows?: readonly Record<string, unknown>[] };
type QueryExecutor = (text: string, params?: any[]) => Promise<QueryResultLike>;

const TABLE_CONTRACTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  player_snapshots: Object.freeze(["player_id", "auth_uid", "updated_at"]),
  runtime_player_snapshots: Object.freeze(["id", "snapshot", "last_updated"]),
  world_object_snapshots: Object.freeze(["id", "snapshot", "last_updated"]),
  questline_progress: Object.freeze(["player_id", "questline_id", "state_json", "updated_at"]),
});

const PROFILE_TABLE_FORBIDDEN_RUNTIME_COLUMNS = Object.freeze(["id", "snapshot", "last_updated"]);
const REQUIRED_PLAYER_POLICIES = Object.freeze([
  "players_insert_own",
  "players_read_own",
  "players_update_own",
]);

function envTrim(key: string): string {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

function envFlag(key: string): boolean {
  return ["1", "true", "yes", "on"].includes(envTrim(key).toLowerCase());
}

function selectedPostgresDriver(): boolean {
  const keys = [
    "PERSISTENCE_DRIVER",
    "QUEST_PERSISTENCE_DRIVER",
    "SKILL_PERSISTENCE_DRIVER",
    "INVENTORY_PERSISTENCE_DRIVER",
    "EQUIPMENT_PERSISTENCE_DRIVER",
    "CHARACTER_PERSISTENCE_DRIVER",
  ];
  return keys.some((key) => envTrim(key).toLowerCase() === "postgres");
}

export function isDatabaseRuntimeRequired(): boolean {
  if (envFlag("DATABASE_RUNTIME_REQUIRED")) return true;
  if (selectedPostgresDriver()) return true;
  return process.env.NODE_ENV === "production" && isDatabaseConfigured();
}

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort((a, b) => a.localeCompare(b)));
}

function emptyEvidence(required: boolean, configured: boolean): DatabaseRuntimeEvidence {
  return {
    ok: !required && !configured,
    required,
    configured,
    status: configured ? "unreachable" : "not_configured",
    canary: { selectOne: false, database: null, serverVersionNum: null },
    schema: { missingColumns: [], conflictingColumns: [] },
    extensions: { required: [], present: [], missing: [] },
    rls: { required: false, enabled: false, presentPolicies: [], missingPolicies: [] },
  };
}

export async function checkDatabaseRuntimeContract(options: {
  readonly query?: QueryExecutor;
  readonly configured?: boolean;
  readonly required?: boolean;
  readonly requireRls?: boolean;
  readonly requireVector?: boolean;
} = {}): Promise<DatabaseRuntimeEvidence> {
  const configured = options.configured ?? isDatabaseConfigured();
  const required = options.required ?? isDatabaseRuntimeRequired();
  const requireRls = options.requireRls ?? (envFlag("SUPABASE_REQUIRE_RLS") || envFlag("REQUIRE_SUPABASE_AUTH"));
  const requireVector = options.requireVector ?? envFlag("PGVECTOR_REQUIRED");

  if (!configured) {
    return emptyEvidence(required, false);
  }

  const query = options.query ?? ((text: string, params?: any[]) => db.query(text, params));
  const evidence = emptyEvidence(required, true);

  try {
    const canaryResult = await query(
      "SELECT 1 AS ok, current_database() AS database, current_setting('server_version_num') AS server_version_num",
    );
    const canaryRow = canaryResult.rows?.[0] ?? {};

    const tableNames = Object.keys(TABLE_CONTRACTS);
    const columnResult = await query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
       ORDER BY table_name, ordinal_position`,
      [tableNames],
    );

    const columnsByTable = new Map<string, Set<string>>();
    for (const tableName of tableNames) columnsByTable.set(tableName, new Set<string>());
    for (const row of columnResult.rows ?? []) {
      const tableName = typeof row.table_name === "string" ? row.table_name : "";
      const columnName = typeof row.column_name === "string" ? row.column_name : "";
      if (tableName && columnName && columnsByTable.has(tableName)) {
        columnsByTable.get(tableName)?.add(columnName);
      }
    }

    const missingColumns: string[] = [];
    for (const [tableName, requiredColumns] of Object.entries(TABLE_CONTRACTS)) {
      const actual = columnsByTable.get(tableName) ?? new Set<string>();
      for (const columnName of requiredColumns) {
        if (!actual.has(columnName)) missingColumns.push(`${tableName}.${columnName}`);
      }
    }

    const profileColumns = columnsByTable.get("player_snapshots") ?? new Set<string>();
    const conflictingColumns = PROFILE_TABLE_FORBIDDEN_RUNTIME_COLUMNS
      .filter((columnName) => profileColumns.has(columnName))
      .map((columnName) => `player_snapshots.${columnName}`);

    const requiredExtensions = ["pgcrypto", ...(requireVector ? ["vector"] : [])];
    const extensionResult = await query(
      "SELECT extname FROM pg_extension WHERE extname = ANY($1::text[]) ORDER BY extname",
      [requiredExtensions],
    );
    const presentExtensions = sorted(
      (extensionResult.rows ?? [])
        .map((row) => (typeof row.extname === "string" ? row.extname : ""))
        .filter(Boolean),
    );
    const missingExtensions = requiredExtensions.filter((name) => !presentExtensions.includes(name));

    const rlsResult = await query(
      `SELECT c.relrowsecurity AS enabled
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'player_snapshots'`,
    );
    const rlsEnabled = Boolean(rlsResult.rows?.[0]?.enabled);

    const policyResult = await query(
      `SELECT policyname
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'player_snapshots'
       ORDER BY policyname`,
    );
    const presentPolicies = sorted(
      (policyResult.rows ?? [])
        .map((row) => (typeof row.policyname === "string" ? row.policyname : ""))
        .filter(Boolean),
    );
    const missingPolicies = requireRls
      ? REQUIRED_PLAYER_POLICIES.filter((name) => !presentPolicies.includes(name))
      : [];

    const selectOne = Number(canaryRow.ok) === 1;
    const schemaOk = missingColumns.length === 0 && conflictingColumns.length === 0;
    const extensionsOk = missingExtensions.length === 0;
    const rlsOk = !requireRls || (rlsEnabled && missingPolicies.length === 0);
    const ok = selectOne && schemaOk && extensionsOk && rlsOk;

    return {
      ok,
      required,
      configured: true,
      status: ok ? "ok" : "schema_mismatch",
      canary: {
        selectOne,
        database: typeof canaryRow.database === "string" ? canaryRow.database : null,
        serverVersionNum:
          typeof canaryRow.server_version_num === "string" ? canaryRow.server_version_num : null,
      },
      schema: {
        missingColumns: sorted(missingColumns),
        conflictingColumns: sorted(conflictingColumns),
      },
      extensions: {
        required: sorted(requiredExtensions),
        present: presentExtensions,
        missing: sorted(missingExtensions),
      },
      rls: {
        required: requireRls,
        enabled: rlsEnabled,
        presentPolicies,
        missingPolicies: sorted(missingPolicies),
      },
    };
  } catch (error) {
    return {
      ...evidence,
      ok: false,
      status: "unreachable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
