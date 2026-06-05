/**
 * INVENTORY PERSISTENCE HEALTH CHECK
 *
 * Runtime diagnostic for inventory state volume mount.
 * Verifies that the inventory persistence path is writable.
 *
 * Rules:
 * - No secrets logged
 * - No chmod 777 unless necessary (minimize permissions)
 * - Deterministic - no Math.random() or Date.now()
 */

import { access, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { resolveInventoryStateFilePath } from "../inventory/JsonInventoryPersistenceAdapter.js";

export interface InventoryPersistenceHealthResult {
  ok: boolean;
  filePath: string;
  dir: string;
  writable: boolean;
  error?: string;
}

/**
 * Check if the inventory persistence path is writable.
 * Tests directory creation and file write permissions.
 */
export async function checkInventoryPersistenceWritable(): Promise<InventoryPersistenceHealthResult> {
  const filePath = resolveInventoryStateFilePath();
  const dir = path.dirname(filePath);
  const testPath = path.join(dir, ".inventory-write-test");

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(testPath, "ok\n", "utf8");
    await access(testPath);
    await rm(testPath, { force: true });

    return {
      ok: true,
      filePath,
      dir,
      writable: true,
    };
  } catch (error) {
    return {
      ok: false,
      filePath,
      dir,
      writable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}