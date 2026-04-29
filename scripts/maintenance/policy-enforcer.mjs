import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/**
 * Policy Enforcer: Checks for major version jumps in package-lock.json
 * Usage: node scripts/maintenance/policy-enforcer.mjs --policy=no-auto-major
 */

const POLICY_NO_AUTO_MAJOR = '--policy=no-auto-major';
const args = process.argv.slice(2);
const isNoAutoMajorActive = args.includes(POLICY_NO_AUTO_MAJOR);

if (!isNoAutoMajorActive) {
  process.exit(0);
}

function getMajorVersion(version) {
  if (!version) return null;
  const cleanVersion = version.replace(/^[\^~]/, '');
  const parts = cleanVersion.split('.');
  return parts.length > 0 ? parseInt(parts[0], 10) : null;
}

function getLockfileFromGit() {
  try {
    return execSync('git show HEAD:package-lock.json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (e) {
    return null;
  }
}

function runCheck() {
  let currentLockContent;
  try {
    currentLockContent = readFileSync('package-lock.json', 'utf8');
  } catch (e) {
    console.error('Error: package-lock.json not found.');
    process.exit(1);
  }

  const previousLockContent = getLockfileFromGit();
  if (!previousLockContent) {
    process.exit(0);
  }

  const currentLock = JSON.parse(currentLockContent);
  const previousLock = JSON.parse(previousLockContent);

  const currentPkgs = currentLock.packages || {};
  const previousPkgs = previousLock.packages || {};

  const violations = [];

  // Iterate over all packages in the current lockfile
  for (const [pkgPath, pkgData] of Object.entries(currentPkgs)) {
    if (pkgPath === '' || !pkgData.version) continue;

    const prevData = previousPkgs[pkgPath];
    if (prevData && prevData.version) {
      const currentMajor = getMajorVersion(pkgData.version);
      const previousMajor = getMajorVersion(prevData.version);

      if (
        currentMajor !== null && 
        previousMajor !== null && 
        currentMajor > previousMajor
      ) {
        const pkgName = pkgPath.replace('node_modules/', '');
        violations.push(`${pkgName} (${prevData.version} -> ${pkgData.version})`);
      }
    }
  }

  if (violations.length > 0) {
    console.error('POLICY FAILURE: Major version upgrades are not allowed under "no-auto-major" policy.');
    violations.forEach(v => console.error(` - Illegal upgrade: ${v}`));
    process.exit(1);
  }
}

runCheck();