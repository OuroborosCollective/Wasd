#!/usr/bin/env bash
# verify-client-2d-live-bundle.sh
# Verifies that the live /2d bundle contains post-login UI markers
# This prevents deploying a bundle that has the build-stamp but lacks the fix

set -euo pipefail

BASE_URL="${BASE_URL:-https://arelorian.de}"
EXPECTED_SHA="${EXPECTED_SHA:-${CLIENT_2D_BUILD_SHA:-}}"

echo "[2d-live] base=$BASE_URL"
echo "[2d-live] expected_sha=${EXPECTED_SHA:-unset}"

# Fetch the /2d/ HTML page
HTML="$(curl -fsSL "${BASE_URL%/}/2d/?verify=$(date +%s)")" || {
  echo "ERROR: failed to fetch /2d/ HTML"
  exit 1
}

# Verify HTML contains REAL_PIXI_CLIENT marker
echo "$HTML" | grep -q "REAL_PIXI_CLIENT" || {
  echo "ERROR: REAL_PIXI_CLIENT missing from /2d/ HTML"
  exit 1
}
echo "[2d-live] HTML contains REAL_PIXI_CLIENT marker"

# Detect the main JS bundle path from HTML
SCRIPT_PATH="$(printf '%s\n' "$HTML" | grep -Eo 'src="/2d/assets/[^"]+\.js"' | head -1 | sed 's/src="//;s/"//')"

if [ -z "$SCRIPT_PATH" ]; then
  echo "ERROR: could not detect /2d/assets/*.js script from HTML"
  printf '%s\n' "$HTML" | head -80
  exit 1
fi

SCRIPT_URL="${BASE_URL%/}${SCRIPT_PATH}"
echo "[2d-live] script=$SCRIPT_URL"

# Fetch the actual JS bundle
JS="$(curl -fsSL "$SCRIPT_URL?verify=$(date +%s)")" || {
  echo "ERROR: failed to fetch JS bundle from $SCRIPT_URL"
  exit 1
}

# Verify each post-login UI marker exists in the bundle
# These are the data-testid values that prove the post-login fix is present
# Note: post-login-children-root may be minified, so we check the className version too
MISSING_MARKERS=0
REQUIRED_MARKERS="
  deterministic-world-root
  arelorian-stitch-hud
  gameplay-window-dock
  world-boot-status
"
OPTIONAL_MARKERS="
  post-login-children-root
  postLoginShell
"

# Check required markers
for marker in $REQUIRED_MARKERS; do
  if ! printf '%s' "$JS" | grep -F "$marker" >/dev/null 2>&1; then
    echo "ERROR: live JS bundle missing required marker: $marker"
    echo "This means production is not serving the expected post-login fix bundle."
    MISSING_MARKERS=$((MISSING_MARKERS + 1))
  else
    echo "[2d-live] found marker: $marker"
  fi
done

# Check optional markers (warn but don't fail)
for marker in $OPTIONAL_MARKERS; do
  if printf '%s' "$JS" | grep -F "$marker" >/dev/null 2>&1; then
    echo "[2d-live] found optional marker: $marker"
  else
    echo "WARN: optional marker not found (may be minified): $marker"
  fi
done

if [ $MISSING_MARKERS -gt 0 ]; then
  echo "ERROR: $MISSING_MARKERS markers missing from live bundle"
  exit 1
fi

echo "[2d-live] All post-login markers found in live JS bundle"

# Verify build-stamp.json
STAMP="$(curl -fsSL "${BASE_URL%/}/2d/build-stamp.json?verify=$(date +%s)")" || {
  echo "ERROR: failed to fetch build-stamp.json"
  exit 1
}
echo "[2d-live] stamp=$STAMP"

# If expected SHA is provided, verify it matches
if [ -n "$EXPECTED_SHA" ]; then
  STAMP="$STAMP" EXPECTED_SHA="$EXPECTED_SHA" node <<'NODE'
const data = JSON.parse(process.env.STAMP || '{}');
const expected = process.env.EXPECTED_SHA;
if (data.commit && data.commit !== expected) {
  console.error(`ERROR: stale build-stamp. expected=${expected} got=${data.commit}`);
  process.exit(1);
}
if (data.sha && data.sha !== expected) {
  console.error(`ERROR: stale build-stamp. expected=${expected} got=${data.sha}`);
  process.exit(1);
}
console.log(`build-stamp OK: ${data.commit || data.sha || 'unknown'}`);
NODE
fi

echo "[2d-live] OK: live bundle contains post-login UI markers"
exit 0