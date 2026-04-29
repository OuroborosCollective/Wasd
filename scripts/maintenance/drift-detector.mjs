import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Drift Detector for pnpm environments.
 * Identifies discrepancies between package.json and pnpm-lock.yaml.
 */

const paths = {
  packageJson: path.resolve(process.cwd(), 'package.json'),
  lockfile: path.resolve(process.cwd(), 'pnpm-lock.yaml'),
};

function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function parsePnpmError(stderr) {
  const affected = [];
  // Pattern match for common pnpm lockfile out-of-date errors
  // Example: "ERR_PNPM_OUTDATED_LOCKFILE Your lockfile is out of date"
  // Example: "Missing or invalid dependency: X"
  
  const lines = stderr.split('\n');
  const packageRegex = /"([^"]+)" is in the lockfile but not in package\.json/g;
  const versionRegex = /specifier "([^"]+)" for "([^"]+)"/g;

  let match;
  while ((match = packageRegex.exec(stderr)) !== null) {
    affected.push({ package: match[1], reason: 'Orphaned in lockfile' });
  }

  const linesToScan = lines.filter(l => l.includes('ERR_PNPM_') || l.includes('mismatch') || l.includes('missing'));
  
  return {
    raw: stderr,
    extracted: affected,
    summary: linesToScan.join('\n').trim()
  };
}

function runDriftDetection() {
  console.log('--- Drift Detection Initialized ---');

  // 1. Hash Check (Metadata comparison)
  const pkgHash = calculateHash(paths.packageJson);
  const lockHash = calculateHash(paths.lockfile);

  console.log(`Package Hash: ${pkgHash}`);
  console.log(`Lockfile Hash: ${lockHash}`);

  // 2. Execute Frozen Lockfile Check
  try {
    console.log('Running frozen-lockfile validation...');
    execSync('pnpm install --frozen-lockfile', {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    console.log('SUCCESS: No drift detected. Lockfile is synchronized.');
    process.exit(0);
  } catch (error) {
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';
    
    console.error('DRIFT DETECTED: The lockfile is out of sync with package.json.');
    
    const parsed = parsePnpmError(stderr + stdout);
    
    const report = {
      timestamp: new Date().toISOString(),
      status: 'error',
      hashes: {
        packageJson: pkgHash,
        pnpmLock: lockHash
      },
      errorSummary: parsed.summary,
      affectedPackages: parsed.extracted
    };

    console.log('--- Drift Analysis Report ---');
    console.log(JSON.stringify(report, null, 2));

    if (parsed.extracted.length === 0 && !parsed.summary) {
        console.log('Detailed extraction failed. Raw output snippet:');
        console.log(stderr.slice(0, 500));
    }

    process.exit(1);
  }
}

runDriftDetection();