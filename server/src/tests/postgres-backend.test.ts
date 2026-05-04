// @ts-nocheck
import { describe, it, expect } from "vitest";
import { resolvePersistenceDriver } from "../modules/persistence/persistenceBackend.js";

describe("PostgreSQL persistence driver resolution", () => {
  it("resolves 'postgres' when PERSISTENCE_DRIVER is set", () => {
    const original = process.env.PERSISTENCE_DRIVER;
    try {
      process.env.PERSISTENCE_DRIVER = "postgres";
      expect(resolvePersistenceDriver()).toBe("postgres");
    } finally {
      if (original === undefined) delete process.env.PERSISTENCE_DRIVER;
      else process.env.PERSISTENCE_DRIVER = original;
    }
  });

  it("resolves 'auto' when PERSISTENCE_DRIVER is unset", () => {
    const original = process.env.PERSISTENCE_DRIVER;
    try {
      delete process.env.PERSISTENCE_DRIVER;
      expect(resolvePersistenceDriver()).toBe("auto");
    } finally {
      if (original !== undefined) process.env.PERSISTENCE_DRIVER = original;
    }
  });

  it("resolves 'file' for explicit file driver", () => {
    const original = process.env.PERSISTENCE_DRIVER;
    try {
      process.env.PERSISTENCE_DRIVER = "file";
      expect(resolvePersistenceDriver()).toBe("file");
    } finally {
      if (original === undefined) delete process.env.PERSISTENCE_DRIVER;
      else process.env.PERSISTENCE_DRIVER = original;
    }
  });
});
