import { afterEach, describe, expect, it } from "vitest";
import {
  isPersistenceFailClosed,
  requirePostgresDatabaseUrl,
  resolveScopedPersistenceDriver,
} from "../modules/persistence/persistencePolicy.js";

const ORIGINAL_ENV = { ...process.env };

function clearDatabaseEnv(): void {
  for (const key of [
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "PGHOST",
    "POSTGRES_HOST",
    "PGPASSWORD",
    "POSTGRES_PASSWORD",
    "PGPORT",
    "POSTGRES_PORT",
    "PGDATABASE",
    "POSTGRES_DB",
    "PGUSER",
    "POSTGRES_USER",
  ]) {
    delete process.env[key];
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("persistence driver policy", () => {
  it("resolves auto to postgres only with connection evidence", () => {
    clearDatabaseEnv();
    process.env.PERSISTENCE_DRIVER = "auto";
    expect(resolveScopedPersistenceDriver([])).toBe("json");

    process.env.DATABASE_URL = "postgresql://example.invalid/db";
    expect(resolveScopedPersistenceDriver([])).toBe("postgres");
  });

  it("builds the same connection contract from Docker POSTGRES fields", () => {
    clearDatabaseEnv();
    process.env.POSTGRES_HOST = "supabase-db";
    process.env.POSTGRES_PORT = "5432";
    process.env.POSTGRES_DB = "postgres";
    process.env.POSTGRES_USER = "postgres";
    process.env.POSTGRES_PASSWORD = "p@ss word";

    expect(requirePostgresDatabaseUrl("inventory-persist")).toBe(
      "postgresql://postgres:p%40ss%20word@supabase-db:5432/postgres",
    );
  });

  it("rejects an explicit postgres driver without connection evidence", () => {
    clearDatabaseEnv();
    expect(() => requirePostgresDatabaseUrl("inventory-persist")).toThrow(
      /complete POSTGRES_\* connection fields/,
    );
  });

  it("fails closed by default in production and allows an explicit override", () => {
    process.env.NODE_ENV = "production";
    delete process.env.PERSISTENCE_FAIL_CLOSED;
    expect(isPersistenceFailClosed()).toBe(true);

    process.env.PERSISTENCE_FAIL_CLOSED = "false";
    expect(isPersistenceFailClosed()).toBe(false);
  });
});
