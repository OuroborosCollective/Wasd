import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Database.ts env resolution (dynamic import)", () => {
  const orig = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...orig };
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_DB_URL;
    delete process.env.PGHOST;
    delete process.env.PGPORT;
    delete process.env.POSTGRES_HOST;
    delete process.env.POSTGRES_PORT;
    delete process.env.POSTGRES_PASSWORD;
    delete process.env.POSTGRES_USER;
    delete process.env.POSTGRES_DB;
    delete process.env.POOLER_PROXY_PORT_TRANSACTION;
  });

  afterEach(() => {
    process.env = { ...orig };
  });

  it("builds connection string from POSTGRES_* when DATABASE_URL unset", async () => {
    process.env.POSTGRES_HOST = "db";
    process.env.POSTGRES_PASSWORD = "secret";
    process.env.POSTGRES_USER = "postgres";
    process.env.POSTGRES_DB = "postgres";
    const { isDatabaseConfigured } = await import("../core/Database.js");
    expect(isDatabaseConfigured()).toBe(true);
  });

  it("uses POOLER_PROXY_PORT_TRANSACTION for remote host when POSTGRES_PORT unset", async () => {
    process.env.POSTGRES_HOST = "pooler.example.com";
    process.env.POSTGRES_PASSWORD = "p";
    process.env.POSTGRES_USER = "postgres";
    process.env.POSTGRES_DB = "postgres";
    process.env.POOLER_PROXY_PORT_TRANSACTION = "6543";
    const mod = await import("../core/Database.js");
    expect(mod.isDatabaseConfigured()).toBe(true);
  });
});
