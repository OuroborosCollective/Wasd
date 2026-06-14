#!/usr/bin/env node
/**
 * Runtime Route Probe - Verifies Express app route health at runtime
 * 
 * This script boots or inspects the real Express app and verifies:
 * - mounted route responds correctly (200 for public, 401/403 for auth-protected)
 * - dead route is not claimed as active (returns 404)
 * - no fake endpoint success (anti-mock probes)
 * 
 * Usage:
 *   node scripts/probe-runtime-routes.mjs [--port 3001] [--host localhost]
 *   node scripts/probe-runtime-routes.mjs --baseline  # Don't fail, just report
 */

import { parseArgs } from 'node:util';

const DEFAULT_PORT = 3001;
const DEFAULT_HOST = 'localhost';
const REQUEST_TIMEOUT = 5000;

const { values } = parseArgs({
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

// Routes that SHOULD be mounted and public (no auth required)
const EXPECTED_PUBLIC_ROUTES = [
  { path: '/health', method: 'GET', expectStatus: 200, description: 'Health check' },
  { path: '/api/leaderboard', method: 'GET', expectStatus: 200, description: 'Leaderboard' },
  { path: '/api/questlines', method: 'GET', expectStatus: 200, description: 'Questlines' },
  { path: '/api/lore', method: 'GET', expectStatus: 200, description: 'Lore' },
  { path: '/api/vote', method: 'GET', expectStatus: 200, description: 'Vote system' },
  { path: '/api/glb/marketplace', method: 'GET', expectStatus: 200, description: 'GLB marketplace (public read-only)' },
  { path: '/api/glb/land/test-player', method: 'GET', expectStatus: 200, description: 'GLB land models (public read-only)' },
];

// Routes that SHOULD be mounted but require auth (expect 401/403 without auth)
const EXPECTED_AUTH_ROUTES = [
  { path: '/api/asset-brain/library', method: 'GET', expectStatus: 401, description: 'Asset brain library (auth required)' },
  { path: '/api/glb/my-models', method: 'GET', expectStatus: 401, description: 'GLB my-models (auth required)' },
  { path: '/api/glb/upload', method: 'POST', expectStatus: 401, description: 'GLB upload (auth required)' },
  { path: '/api/glb/subscription-status', method: 'GET', expectStatus: 401, description: 'GLB subscription-status (auth required)' },
  { path: '/api/glb/marketplace/buy', method: 'POST', expectStatus: 401, description: 'GLB marketplace buy (auth required)' },
];

// Routes that should NOT exist (expect 404)
const EXPECTED_DEAD_ROUTES = [
  { path: '/api/art/ws', description: 'Art WebSocket (deprecated - no server impl)' },
  { path: '/api/check', description: 'Vote check placeholder (not a real endpoint)' },
];

// Anti-mock probes - ensure these fake paths return 404, not 200
const ANTI_MOCK_PROBES = [
  { path: '/api/nonexistent', description: 'Nonexistent route returns 404' },
  { path: '/api/fake/endpoint', description: 'Fake endpoint returns 404' },
  { path: '/api/asset-brain/specs', description: 'Asset brain specs without :id returns 404' },
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
    } else {
      console.log(`✅ ${description}`);
    }
  }

  addFail(description, reason) {
    this.failed++;
    this.errors.push({ type: 'fail', description, reason });
    if (!OUTPUT_JSON) {
      console.error(`❌ FAIL: ${description} - ${reason}`);
    }
  }
}

/**
 * Probe a single route
 * @returns { ok: boolean, status: number, description: string, reason?: string }
 */
async function probeRoute(url, method = 'GET', expectStatus, description) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeout);
    const status = res.status;

    // Check if status matches expectation
    if (expectStatus && status !== expectStatus) {
      return { 
        ok: false, 
        status, 
        description, 
        reason: `Expected ${expectStatus}, got ${status}` 
      };
    }

    // Check for fake success - empty or mock response on 200
    if (status === 200) {
      const text = await res.text().catch(() => '');
      const isFakeSuccess = text === '' || 
        text === '{}' ||
        text === '{"ok":true}' ||
        text === '{"success":true}';
      
      if (isFakeSuccess) {
        return { 
          ok: false, 
          status, 
          description, 
          reason: 'Fake/mock 200 response detected (empty or placeholder JSON)' 
        };
      }
    }

    return { ok: true, status, description };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { 
        ok: false, 
        status: 'timeout', 
        description, 
        reason: 'Request timeout' 
      };
    }
    return { 
      ok: false, 
      status: 'error', 
      description, 
      reason: err.message 
    };
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

  // Probe expected public routes (no auth required)
  if (!OUTPUT_JSON) console.log('📋 Checking expected public routes...');
  
  for (const route of EXPECTED_PUBLIC_ROUTES) {
    const probe = await probeRoute(
      `${BASE_URL}${route.path}`,
      route.method,
      route.expectStatus,
      route.description
    );

    if (probe.ok) {
      result.addPass(probe.description);
    } else {
      result.addFail(probe.description, probe.reason);
    }
  }

  // Probe expected auth-protected routes (expect 401/403 without auth)
  if (!OUTPUT_JSON) console.log('\n📋 Checking expected auth-protected routes...');

  for (const route of EXPECTED_AUTH_ROUTES) {
    const probe = await probeRoute(
      `${BASE_URL}${route.path}`,
      route.method,
      route.expectStatus,
      route.description
    );

    if (probe.ok) {
      result.addPass(probe.description);
    } else {
      result.addFail(probe.description, probe.reason);
    }
  }

  // Probe expected dead routes - they should NOT exist (expect 404)
  if (!OUTPUT_JSON) console.log('\n📋 Checking expected dead routes (should return 404)...');

  for (const route of EXPECTED_DEAD_ROUTES) {
    const probe = await probeRoute(
      `${BASE_URL}${route.path}`,
      'GET',
      404,  // Expect 404 for dead routes
      route.description
    );

    if (probe.ok) {
      result.addPass(`${route.description} (correctly returns 404)`);
    } else {
      result.addFail(`${route.description} should be dead`, probe.reason);
    }
  }

  // Anti-mock probes - ensure fake endpoints return 404, not 200
  if (!OUTPUT_JSON) console.log('\n📋 Anti-mock probes (ensuring no fake 200 success)...');

  for (const route of ANTI_MOCK_PROBES) {
    const probe = await probeRoute(
      `${BASE_URL}${route.path}`,
      'GET',
      404,  // Should return 404, not 200
      route.description
    );

    if (probe.ok) {
      result.addPass(route.description);
    } else {
      result.addFail(route.description, probe.reason);
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
        public: EXPECTED_PUBLIC_ROUTES.length,
        authProtected: EXPECTED_AUTH_ROUTES.length,
        dead: EXPECTED_DEAD_ROUTES.length,
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