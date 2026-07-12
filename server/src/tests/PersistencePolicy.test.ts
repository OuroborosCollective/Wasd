import { afterEach, describe, expect, it } from "vitest";
import {
  isPersistenceFailClosed,
  requirePostgresDatabaseUrl,
  resolveScopedPersistenceDriver,
} from "../modules/persistence/persistencePolicy.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("persistence driver policy", () => {
  it("resolves auto to postgres only with a database URL", () => {
    process.env.PERSISTENCE_DRIVER = "auto";
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_DB_URL;
    expect(resolveScopedPersistenceDriver([])).toBe("json");

    process.env.DATABASE_URL = "postgresql://example.invalid/db";
    expect(resolveScopedPersistenceDriver([])).toBe("postgres");
  });

  it("rejects an explicit postgres driver without connection evidence", () => {
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_DB_URL;
    expect(() => requirePostgresDatabaseUrl("inventory-persist")).toThrow(
      /DATABASE_URL\/SUPABASE_DB_URL is missing/,
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
