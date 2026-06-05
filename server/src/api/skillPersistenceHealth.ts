/**
 * SKILL PERSISTENCE HEALTH CHECK
 *
 * Runtime diagnostic for skill state volume mount.
 * Verifies that the skill persistence path is writable.
 *
 * Rules:
 * - No secrets logged
 * - No chmod 777 unless necessary (minimize permissions)
 * - Deterministic - no Math.random() or Date.now()
 */

import { access, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { resolveSkillStateFilePath } from "../skills/JsonSkillPersistenceAdapter.js";

export interface SkillPersistenceHealthResult {
  ok: boolean;
  filePath: string;
  dir: string;
  writable: boolean;
  error?: string;
}

/**
 * Check if the skill persistence path is writable.
 * Tests directory creation and file write permissions.
 */
export async function checkSkillPersistenceWritable(): Promise<SkillPersistenceHealthResult> {
  const filePath = resolveSkillStateFilePath();
  const dir = path.dirname(filePath);
  const testPath = path.join(dir, ".skill-write-test");

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