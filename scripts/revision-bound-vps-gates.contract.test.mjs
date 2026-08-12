import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guardian = readFileSync(".github/workflows/wasd-revision-guardian.yml", "utf8");
const readback = readFileSync(".github/workflows/wasd-vps-revision-readback.yml", "utf8");
const dockerfile = readFileSync("Dockerfile.vps", "utf8");
const guardianScript = readFileSync("scripts/revision-guardian.mjs", "utf8");

test("revision guardian checks out and attests the exact PR or main SHA", () => {
  assert.match(guardian, /ref: \$\{\{ env\.EXPECTED_REVISION \}\}/);
  assert.match(guardian, /--expected-revision "\$EXPECTED_REVISION"/);
  assert.match(guardianScript, /PR_HEAD_NOT_BASED_ON_CURRENT_MAIN/);
  assert.match(guardianScript, /wasd\.revision-guardian-evidence\.v1/);
});

test("runtime readback is host-pinned, revision-bound, and verifies a receipt before publishing", () => {
  assert.match(readback, /test "\$SSH_HOST" = "46\.202\.154\.25"/);
  assert.match(readback, /StrictHostKeyChecking=yes/);
  assert.match(readback, /--expected-revision "\$EXPECTED_REVISION"/);
  assert.match(readback, /verify-wasd-vps-runtime-receipt\.mjs/);
  assert.match(readback, /Publish verified production deployment status/);
});

test("final production image carries the build revision as an OCI label", () => {
  assert.match(dockerfile, /LABEL org\.opencontainers\.image\.revision=\$BUILD_COMMIT_SHA/);
});
