import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildWasdAurionSourceLedger } from "../build-wasd-aurion-source-ledger.mjs";

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

async function fixtureRepository() {
  const root = await mkdtemp(join(tmpdir(), "wasd-aurion-source-ledger-"));
  await mkdir(join(root, "server", "src", "auth"), { recursive: true });
  await mkdir(join(root, "server", "src", "world"), { recursive: true });
  await mkdir(join(root, "server", "src", "quests", "__tests__"), { recursive: true });
  await writeFile(join(root, "server", "src", "auth", "PlayerIdentity.ts"), "export const identity = true;\n");
  await writeFile(join(root, "server", "src", "world", "WorldTick.ts"), "export const world = true;\n");
  await writeFile(join(root, "server", "src", "quests", "QuestState.ts"), "export const quest = true;\n");
  await writeFile(join(root, "server", "src", "quests", "__tests__", "QuestState.test.ts"), "export const testOnly = true;\n");
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "ledger@example.test"]);
  git(root, ["config", "user.name", "Source Ledger Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  return root;
}

test("source ledger is revision-bound, deterministic, and excludes test-only files", async testContext => {
  const root = await fixtureRepository();
  testContext.after(() => rm(root, { recursive: true, force: true }));
  const result = await buildWasdAurionSourceLedger({ root, out: ".ledger" });
  const ledger = JSON.parse(await readFile(join(root, ".ledger", "source-ledger.json"), "utf8"));
  const expectedRevision = git(root, ["rev-parse", "HEAD"]);

  assert.equal(result.sourceRevision, expectedRevision);
  assert.equal(ledger.source.revision, expectedRevision);
  assert.equal(ledger.recordType, "wasd_aurion_source_ledger");
  assert.deepEqual(ledger.files.map(file => file.path), [
    "server/src/auth/PlayerIdentity.ts",
    "server/src/quests/QuestState.ts",
    "server/src/world/WorldTick.ts",
  ]);
  assert.equal(ledger.files.find(file => file.path.endsWith("PlayerIdentity.ts"))?.domain, "identity");
  assert.equal(ledger.policy.databaseConnectionsOpened, false);
  assert.deepEqual(ledger.policy.automaticActions, ["discover_source", "hash_source", "emit_receipt"]);
  assert.match(await readFile(join(root, ".ledger", "checksums.sha256"), "utf8"), /^[a-f0-9]{64}  source-ledger\.json\n$/u);
});

test("source ledger fails closed when a caller supplies a different immutable revision", async testContext => {
  const root = await fixtureRepository();
  testContext.after(() => rm(root, { recursive: true, force: true }));
  const originalRevision = process.env.WASD_SOURCE_SHA;
  process.env.WASD_SOURCE_SHA = "0".repeat(40);
  testContext.after(() => {
    if (originalRevision === undefined) delete process.env.WASD_SOURCE_SHA;
    else process.env.WASD_SOURCE_SHA = originalRevision;
  });

  await assert.rejects(() => buildWasdAurionSourceLedger({ root, out: ".ledger" }), /SOURCE_REVISION_MISMATCH/);
});
