import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const deployScriptPath = resolve(process.cwd(), 'scripts/deploy-vps-docker.sh');
const deployScript = readFileSync(deployScriptPath, 'utf8');
const twoDFirstGate = 'if client_shell_ready && client_2d_shell_ready && client_2d_build_stamp_ready && portal_shell_ready; then';

const gateMatches = deployScript.match(new RegExp(twoDFirstGate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? [];

assert.equal(
  gateMatches.length,
  2,
  'Both Docker readiness paths must use the same 2D-first acceptance gate.',
);
assert.equal(
  deployScript.includes('client_2d_shell_ready && client_3d_shell_ready'),
  false,
  'A 3D shell must not block the 2D-first release path.',
);
assert.equal(
  deployScript.includes('echo "  client-3d shell ready"'),
  false,
  'The 2D-first gate must not claim an unchecked 3D shell is ready.',
);
assert.equal(
  deployScript.includes('client_3d_shell_ready()'),
  true,
  'Keep the separate 3D diagnostic helper available for future opt-in validation.',
);

console.log('2D-first readiness gate regression passed.');
