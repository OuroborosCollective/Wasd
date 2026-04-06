import { getDb } from "../../config/firebase.js";
import type { IPersistenceBackend, PersistenceDriverName } from "./persistenceBackend.js";
import { resolvePersistenceDriver } from "./persistenceBackend.js";
import { FilePersistenceBackend } from "./filePersistenceBackend.js";
import { FirestorePersistenceBackend } from "./firestorePersistenceBackend.js";
import { SpacetimePersistenceBackend } from "./spacetimePersistenceBackend.js";

export function createPersistenceBackend(): IPersistenceBackend {
  const driver = resolvePersistenceDriver();
  if (driver === "spacetime") {
    return new SpacetimePersistenceBackend();
  }
  if (driver === "file") {
    return new FilePersistenceBackend();
  }
  if (driver === "firestore") {
    return new FirestorePersistenceBackend();
  }
  /** auto */
  return pickAutoBackend();
}

function pickAutoBackend(): IPersistenceBackend {
  if (getDb()) {
    return new FirestorePersistenceBackend();
  }
  return new FilePersistenceBackend();
}

/** For tests: inject a backend without env */
export function createPersistenceBackendForTest(driver: PersistenceDriverName): IPersistenceBackend {
  if (driver === "file") return new FilePersistenceBackend();
  if (driver === "firestore") return new FirestorePersistenceBackend();
  if (driver === "spacetime") return new SpacetimePersistenceBackend();
  return pickAutoBackend();
}
