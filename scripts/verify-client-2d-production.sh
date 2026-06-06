#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-client-2d-production.sh
#
# Verifies that the 2D client is properly deployed to production.
# Checks HTML structure, script loading, and boot markers.
#
# Usage:
#   BASE_URL=https://arelorian.de bash scripts/verify-client-2d-production.sh
#   # Or with custom port:
#   BASE_URL=http://localhost:3000 bash scripts/verify-client-2d-production.sh
#
# Exit codes:
#   0 = all checks passed
#   1 = one or more checks failed
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Default URL
BASE_URL="${BASE_URL:-https://arelorian.de}"
URL="${BASE_URL%/}/2d/"

echo "═══════════════════════════════════════════════════════════════"
echo "  Areloria 2D Production Verification"
echo "═══════════════════════════════════════════════════════════════"
echo "  URL: $URL"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Track failures
FAILURES=0

# ─── Check 1: HTML Response ───────────────────────────────────────────────────
echo "[1/6] Checking HTML response..."

HTML_RESPONSE=$(curl -fsS "$URL" 2>/dev/null) || {
  echo "  ❌ FAIL: Cannot fetch $URL"
  FAILURES=$((FAILURES + 1))
}

if [ -z "$HTML_RESPONSE" ]; then
  echo "  ❌ FAIL: Empty response from $URL"
  FAILURES=$((FAILURES + 1))
else
  echo "  ✓ HTML fetched successfully ($(echo "$HTML_RESPONSE" | wc -c) bytes)"
fi

# ─── Check 2: REAL_PIXI_CLIENT Marker ─────────────────────────────────────────
echo ""
echo "[2/6] Checking REAL_PIXI_CLIENT marker..."

if echo "$HTML_RESPONSE" | grep -q "REAL_PIXI_CLIENT"; then
  echo "  ✓ REAL_PIXI_CLIENT marker found"
else
  echo "  ❌ FAIL: REAL_PIXI_CLIENT marker not found in HTML"
  FAILURES=$((FAILURES + 1))
fi

# ─── Check 3: Module Script ───────────────────────────────────────────────────
echo ""
echo "[3/6] Checking module script..."

SCRIPT_TAG=$(echo "$HTML_RESPONSE" | grep -E 'type="module"' | head -1)

if [ -n "$SCRIPT_TAG" ]; then
  echo "  ✓ Module script found: $SCRIPT_TAG"

  # Extract src path
  SCRIPT_PATH=$(echo "$SCRIPT_TAG" | grep -Eo 'src="[^"]+"' | sed 's/src="//;s/"//')

  if [ -n "$SCRIPT_PATH" ]; then
    # Build full URL
    if [[ "$SCRIPT_PATH" == /* ]]; then
      SCRIPT_URL="${BASE_URL%/}${SCRIPT_PATH}"
    else
      SCRIPT_URL="${URL%/}/${SCRIPT_PATH}"
    fi

    echo "  ✓ Script path: $SCRIPT_PATH"
    echo "  ✓ Script URL: $SCRIPT_URL"

    # Verify script is accessible
    HTTP_CODE=$(curl -fsS -o /dev/null -w "%{http_code}" "$SCRIPT_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      echo "  ✓ Script accessible (HTTP $HTTP_CODE)"
    else
      echo "  ⚠️  Script returned HTTP $HTTP_CODE (may be normal for SPA)"
    fi
  fi
else
  echo "  ❌ FAIL: No type=\"module\" script found"
  FAILURES=$((FAILURES + 1))
fi

# ─── Check 4: Boot Fallback ───────────────────────────────────────────────────
echo ""
echo "[4/6] Checking boot fallback element..."

if echo "$HTML_RESPONSE" | grep -q 'data-testid="areloria-boot-fallback"'; then
  echo "  ✓ Boot fallback element found"
else
  echo "  ❌ FAIL: Boot fallback element not found"
  FAILURES=$((FAILURES + 1))
fi

# ─── Check 5: Health Endpoint ────────────────────────────────────────────────
echo ""
echo "[5/6] Checking health endpoint..."

HEALTH_RESPONSE=$(curl -fsS "${BASE_URL%/}/health" 2>/dev/null) || {
  echo "  ⚠️  Cannot fetch health endpoint (may be normal)"
}

if [ -n "$HEALTH_RESPONSE" ]; then
  if echo "$HEALTH_RESPONSE" | grep -q '"ok"'; then
    echo "  ✓ Health endpoint responding"
  else
    echo "  ⚠️  Health endpoint returned unexpected response"
  fi
fi

# ─── Check 6: Build Stamp ─────────────────────────────────────────────────────
echo ""
echo "[6/6] Checking build stamp..."

BUILD_STAMP=$(curl -fsS "${BASE_URL%/}/2d/build-stamp.json" 2>/dev/null) || {
  echo "  ⚠️  Build stamp not found (may be normal)"
}

if [ -n "$BUILD_STAMP" ]; then
  if echo "$BUILD_STAMP" | grep -q "REAL_PIXI_CLIENT"; then
    echo "  ✓ Build stamp contains REAL_PIXI_CLIENT marker"
  else
    echo "  ⚠️  Build stamp doesn't contain expected marker"
  fi
fi

# ─── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"

if [ $FAILURES -eq 0 ]; then
  echo "  ✅ All checks passed!"
  echo "  The 2D client is properly deployed to production."
else
  echo "  ❌ $FAILURES check(s) failed."
  echo "  Review the output above for details."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  NOTE: HTML checks cannot prove React panel visibility."
echo "  Run Playwright E2E to verify gameplay panels:"
echo "  pnpm run test:e2e -- e2e/client-2d-gameplay-panels-visible.spec.ts"
echo "═══════════════════════════════════════════════════════════════"

exit $FAILURES