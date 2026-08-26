import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { canonicalSha256, isFullSha, validateRevisionPair } from "./revision-guardian.mjs";

const repositoryHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

test("guardian accepts the exact checked-out repository revision", () => {
  assert.equal(validateRevisionPair(repositoryHead, repositoryHead), repositoryHead);
  assert.equal(isFullSha(repositoryHead), true);
});

test("guardian rejects non-immutable or mismatched revisions", () => {
  assert.throws(() => validateRevisionPair("short", repositoryHead), /EXPECTED_REVISION_INVALID/);
  assert.throws(() => validateRevisionPair(repositoryHead, "0".repeat(40)), /CHECKED_OUT_REVISION_MISMATCH/);
});

test("guardian evidence hash is independent of object insertion order", () => {
  assert.equal(
    canonicalSha256({ revision: repositoryHead, nested: { b: 2, a: 1 } }),
    canonicalSha256({ nested: { a: 1, b: 2 }, revision: repositoryHead }),
  );
});
