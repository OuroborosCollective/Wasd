import type { IPersistenceBackend, PersistenceDriverName } from "./persistenceBackend.js";
import { resolvePersistenceDriver } from "./persistenceBackend.js";
import { FilePersistenceBackend } from "./filePersistenceBackend.js";
import { PostgresPersistenceBackend } from "./postgresPersistenceBackend.js";
import { RedisPersistenceBackend } from "./redisPersistenceBackend.js";
import { isDatabaseConfigured } from "../../core/Database.js";
import { isRedisAvailable } from "../../core/RedisClient.js";

export function createPersistenceBackend(): IPersistenceBackend {
  const driver = resolvePersistenceDriver();
  if (driver === "postgres") {
    return new PostgresPersistenceBackend();
  }
  if (driver === "redis") {
    return new RedisPersistenceBackend();
  }
  if (driver === "file") {
    return new FilePersistenceBackend();
  }
  /** auto */
  return pickAutoBackend();
}

function pickAutoBackend(): IPersistenceBackend {
  if (isDatabaseConfigured()) {
    return new PostgresPersistenceBackend();
  }
  if (isRedisAvailable()) {
    return new RedisPersistenceBackend();
  }
  return new FilePersistenceBackend();
}

/** For tests: inject a backend without env */
export function createPersistenceBackendForTest(driver: PersistenceDriverName): IPersistenceBackend {
  if (driver === "file") return new FilePersistenceBackend();
  if (driver === "postgres") return new PostgresPersistenceBackend();
  if (driver === "redis") return new RedisPersistenceBackend();
  return new FilePersistenceBackend();
}
