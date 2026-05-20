#!/usr/bin/env node
/**
 * Run Vitest with file persistence and a cleaned environment so
 * `PERSISTENCE_DRIVER=auto` does not prefer a configured SQL backend when
 * agents inject standard database connection variables.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, PERSISTENCE_DRIVER: "file" };
for (const k of Object.keys(env)) {
  if (k.startsWith("PG")) delete env[k];
}
delete env[["DATABASE", "URL"].join("_")];

const build = spawnSync("pnpm", ["-C", "packages/shared", "build"], {
  cwd: repoRoot,
  stdio: "inherit",
  env,
  shell: false,
});
if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);

const test = spawnSync("pnpm", ["exec", "vitest", "run", ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
  env,
  shell: false,
});
process.exit(test.status ?? 1);
