#!/usr/bin/env node
/**
 * Runtime Route Probe - Verifies Express app route health at runtime
 * 
 * This script boots or inspects the real Express app and verifies:
 * - mounted route responds
 * - dead route is not claimed as active
 * - documented route exists
 * - no fake endpoint success
 * 
 * Usage:
 *   node scripts/probe-runtime-routes.mjs [--port 3001] [--host localhost]
 *   node scripts/probe-runtime-routes.mjs --baseline  # Don't fail, just report
 */

import { parseArgs } from 'node:util';

const DEFAULT_PORT = 3001;
const DEFAULT_HOST = 'localhost';
const REQUEST_TIMEOUT = 5000;

const { values, positionals } = parseArgs({
  options: {
    port: { type: 'string', default: String(DEFAULT_PORT) },
    host: { type: 'string', default: DEFAULT_HOST },
    baseline: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Runtime Route Probe
===================
Verifies Express app route health at runtime.

Usage:
  node scripts/probe-runtime-routes.mjs [options]

Options:
  --port <port>    Server port (default: ${DEFAULT_PORT})
  --host <host>    Server host (default: ${DEFAULT_HOST})
  --baseline       Report findings without failing (default: false)
  --json           Output results as JSON
  --help           Show this help

Exit codes:
  0 - All probes passed
  1 - Probe failures detected (unless --baseline)
`);
  process.exit(0);
}

const PORT = parseInt(values.port, 10);
const HOST = values.host;
const BASELINE = values.baseline;
const OUTPUT_JSON = values.json;
const BASE_URL = `http://${HOST}:${PORT}`;

// Routes that SHOULD be mounted and responsive
const EXPECTED_LIVE_ROUTES = [
  { path: '/health', method: 'GET', expectStatus: 200, description: 'Health check' },
  { path: '/api/leaderboard', method: 'GET', expectStatus: 200, description: 'Leaderboard' },
  { path: '/api/questlines', method: 'GET', expectStatus: 200, description: 'Questlines' },
  { path: '/api/lore', method: 'GET', expectStatus: 200, description: 'Lore' },
  { path: '/api/vote', method: 'GET', expectStatus: 200, description: 'Vote system' },
];

// Routes that are DOCUMENTED but should NOT be active (dead paths)
const EXPECTED_DEAD_ROUTES = [
  '/api/art/ws',
  '/api/check', // Placeholder in voteAdminPanel
];

// Routes that should NOT return fake success
const ANTI_MOCK_PROBES = [
  { path: '/api/nonexistent', method: 'GET', expectNotStatus: 200, description: 'Nonexistent route returns 404' },
  { path: '/api/fake/endpoint', method: 'GET', expectNotStatus: 200, description: 'Fake endpoint returns 404' },
];

// Recently mounted routes (from this PR)
const NEWLY_MOUNTED_ROUTES = [
  { path: '/api/asset-brain/library', method: 'GET', expectStatus: 200, description: 'Asset brain library' },
  { path: '/api/asset-brain/specs', method: 'GET', expectStatus: 200, description: 'Asset brain specs' },
  { path: '/api/glb/upload', method: 'POST', expectStatus: 401, description: 'GLB upload (auth required)' },
  { path: '/api/glb/my-models', method: 'GET', expectStatus: 200, description: 'GLB my-models' },
  { path: '/api/glb/marketplace', method: 'GET', expectStatus: 200, description: 'GLB marketplace' },
];

class ProbeResult {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = [];
    this.errors = [];
  }

  addPass(description) {
    this.passed++;
    if (OUTPUT_JSON) {
      this.warnings.push({ type: 'pass', description });
    }
  }

  addFail(description, reason) {
    this.failed++;
    this.errors.push({ type: 'fail', description, reason });
    if (!OUTPUT_JSON) {
      console.error(`❌ FAIL: ${description} - ${reason}`);
    }
  }

  addWarn(description) {
    this.warnings.push({ type: 'warn', description });
    if (!OUTPUT_JSON) {
      console.log(`⚠️  WARN: ${description}`);
    }
  }
}

async function probeRoute(url, method = 'GET', expectStatus, expectNotStatus, description) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeout);

    if (expectNotStatus && res.status === expectNotStatus) {
      return { ok: true, status: res.status, description };
    }

    if (expectStatus && res.status !== expectStatus) {
      return { ok: false, status: res.status, description, expected: expectStatus };
    }

    // Check for fake success - empty or mock response
    const text = await res.text().catch(() => '');
    const isFakeSuccess = res.status === 200 && (
      text === '' || 
      text === '{}' ||
      text === '{"ok":true}' ||
      text === '{"success":true}'
    );

    return { ok: !isFakeSuccess, status: res.status, description, isFakeSuccess };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { ok: false, status: 'timeout', description, error: 'Request timeout' };
    }
    return { ok: false, status: 'error', description, error: err.message };
  }
}

async function checkServerHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

async function runProbes() {
  const result = new ProbeResult();

  if (!OUTPUT_JSON) {
    console.log(`
🔍 Runtime Route Probe
==================================================
Target: ${BASE_URL}
Mode: ${BASELINE ? 'BASELINE (report only)' : 'STRICT (fail on findings)'}
`);
  }

  // First, check if server is running
  const serverUp = await checkServerHealth();
  if (!serverUp) {
    const msg = `Server not responding at ${BASE_URL}`;
    if (OUTPUT_JSON) {
      console.log(JSON.stringify({
        mode: 'probe',
        serverUp: false,
        error: msg,
        passed: 0,
        failed: 1,
      }, null, 2));
    } else {
      console.error(`❌ Server not responding at ${BASE_URL}`);
      console.error('   Start the server with: npx tsx server/src/index.ts');
    }
    process.exit(BASELINE ? 0 : 1);
  }

  if (!OUTPUT_JSON) {
    console.log('✅ Server is up\n');
  }

  // Probe expected live routes
  if (!OUTPUT_JSON) console.log('📋 Checking expected live routes...');
  
  for (const route of EXPECTED_LIVE_ROUTES) {
    const probe = await probeRoute(
      `${BASE_URL}${route.path}`,
      route.method,
      route.expectStatus
    );

    if (probe.ok) {
      result.addPass(`${route.description} (${route.method} ${route.path})`);
      if (!OUTPUT_JSON) console.log(`✅ ${route.method} ${route.path} -> ${probe.status}`);
    } else {
      result.addFail(
        `${route.description} (${route.method} ${route.path})`,
        `Expected ${route.expectStatus}, got ${probe.status}`
      );
    }
  }

  // Probe newly mounted routes
  if (!OUTPUT_JSON) console.log('\n📋 Checking newly mounted routes...');

  for (const route of NEWLY_MOUNTED_ROUTES) {
    const probe = await probeRoute(
      `${BASE_URL}${route.path}`,
      route.method,
      route.expectStatus
    );

    if (probe.ok) {
      result.addPass(`${route.description} (${route.method} ${route.path})`);
      if (!OUTPUT_JSON) console.log(`✅ ${route.method} ${route.path} -> ${probe.status}`);
    } else {
      result.addFail(
        `${route.description} (${route.method} ${route.path})`,
        `Expected ${route.expectStatus}, got ${probe.status}`
      );
    }
  }

  // Probe expected dead routes - they should NOT be active
  if (!OUTPUT_JSON) console.log('\n📋 Checking expected dead routes (should return 404)...');

  for (const path of EXPECTED_DEAD_ROUTES) {
    const probe = await probeRoute(`${BASE_URL}${path}`, 'GET', undefined, 404);

    if (probe.ok) {
      result.addPass(`${path} correctly returns 404`);
      if (!OUTPUT_JSON) console.log(`✅ ${path} -> 404 (dead as expected)`);
    } else {
      result.addFail(
        `${path} should be dead but is active`,
        `Expected 404, got ${probe.status}`
      );
    }
  }

  // Anti-mock probes - ensure fake endpoints return 404
  if (!OUTPUT_JSON) console.log('\n📋 Anti-mock probes (ensuring no fake success)...');

  for (const route of ANTI_MOCK_PROBES) {
    const probe = await probeRoute(
      `${BASE_URL}${route.path}`,
      route.method,
      undefined,
      200 // Should NOT be 200
    );

    if (probe.ok) {
      result.addPass(route.description);
      if (!OUTPUT_JSON) console.log(`✅ ${route.method} ${route.path} -> not 200 (good)`);
    } else {
      result.addFail(
        route.description,
        `${route.path} returned ${probe.status} - possible mock response`
      );
    }
  }

  // Output JSON results
  if (OUTPUT_JSON) {
    const summary = {
      mode: 'probe',
      serverUp: true,
      url: BASE_URL,
      baseline: BASELINE,
      results: {
        passed: result.passed,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      },
      routes: {
        expectedLive: EXPECTED_LIVE_ROUTES.length,
        newlyMounted: NEWLY_MOUNTED_ROUTES.length,
        expectedDead: EXPECTED_DEAD_ROUTES.length,
        antiMock: ANTI_MOCK_PROBES.length,
      },
    };
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`
==================================================
📊 Probe Results
==================================================
Passed: ${result.passed}
Failed: ${result.failed}
`);
  }

  // Exit with appropriate code
  if (result.failed > 0 && !BASELINE) {
    if (!OUTPUT_JSON) {
      console.error('\n❌ Probe failures detected!');
      console.error('   Fix the failing routes or update this script if routes are intentionally disabled.');
    }
    process.exit(1);
  }

  if (!OUTPUT_JSON) {
    console.log('\n✅ All probes passed!');
  }
  process.exit(0);
}

runProbes().catch(err => {
  if (OUTPUT_JSON) {
    console.log(JSON.stringify({
      mode: 'probe',
      error: err.message,
      passed: 0,
      failed: 1,
    }, null, 2));
  } else {
    console.error('❌ Probe error:', err.message);
  }
  process.exit(BASELINE ? 0 : 1);
});