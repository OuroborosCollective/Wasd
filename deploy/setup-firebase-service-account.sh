#!/bin/bash
# Place Firebase Admin SDK JSON on the VPS and wire .env (no secrets in git).
# Usage (on VPS after first deploy):
#   chmod +x deploy/setup-firebase-service-account.sh
#   ./deploy/setup-firebase-service-account.sh /path/to/downloaded-adminsdk.json
#
# Default target: /opt/areloria/secrets/firebase-adminsdk.json

set -e
APP_DIR="${APP_DIR:-/opt/areloria}"
SECRETS_DIR="$APP_DIR/secrets"
DEST="$SECRETS_DIR/firebase-adminsdk.json"
SRC="${1:-}"

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

if [ -n "$SRC" ]; then
  if [ ! -f "$SRC" ]; then
    echo "Error: source file not found: $SRC"
    exit 1
  fi
  install -m 600 "$SRC" "$DEST"
  echo "Installed service account JSON -> $DEST"
else
  echo "No source file given. Do one of:"
  echo "  1) From your laptop: scp firebase-adminsdk-*.json root@YOUR_VPS:$DEST"
  echo "  2) Or run: $0 /path/to/local-adminsdk.json"
  echo ""
  if [ -f "$DEST" ]; then
    echo "Existing file OK: $DEST"
  else
    echo "Expected file missing: $DEST"
    exit 1
  fi
fi

ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: $ENV_FILE missing — create it (see .env.example) then re-run deploy or add:"
  echo "  FIREBASE_SERVICE_ACCOUNT_KEY=$DEST"
  exit 0
fi

# Remove old lines if re-running
for key in FIREBASE_SERVICE_ACCOUNT_KEY GOOGLE_APPLICATION_CREDENTIALS; do
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    grep -v "^${key}=" "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
  fi
done

{
  echo ""
  echo "# Firebase Admin SDK (server) — set by setup-firebase-service-account.sh"
  echo "# Uses explicit cert path (Option A). For applicationDefault() instead, comment the next line and use:"
  echo "# GOOGLE_APPLICATION_CREDENTIALS=$DEST"
  echo "FIREBASE_SERVICE_ACCOUNT_KEY=$DEST"
  echo "GOOGLE_APPLICATION_CREDENTIALS=$DEST"
} >> "$ENV_FILE"

echo "Updated $ENV_FILE: FIREBASE_SERVICE_ACCOUNT_KEY and GOOGLE_APPLICATION_CREDENTIALS -> $DEST"
echo "Note: Server prefers FIREBASE_SERVICE_ACCOUNT_KEY when set; GOOGLE_APPLICATION_CREDENTIALS enables ADC-style tools too."
echo "Restart: cd $APP_DIR && pm2 restart areloria"
echo "Check:   curl -s http://127.0.0.1:3000/health | head -c 500"
