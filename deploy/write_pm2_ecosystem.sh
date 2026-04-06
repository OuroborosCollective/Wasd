#!/bin/bash
# Writes PM2 ecosystem for Areloria with correct repo root cwd and CLIENT_ROOT_DIR.
# Usage: APP_DIR=/opt/areloria ./deploy/write_pm2_ecosystem.sh
#        (default APP_DIR: /opt/areloria)

set -e
APP_DIR="${APP_DIR:-/opt/areloria}"

mkdir -p /var/log/areloria

cat > "$APP_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [{
    name: 'areloria',
    script: './server/dist/index.js',
    cwd: '${APP_DIR}',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      CLIENT_ROOT_DIR: '${APP_DIR}/client',
    },
    env_file: '${APP_DIR}/.env',
    error_file: '/var/log/areloria/error.log',
    out_file: '/var/log/areloria/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
EOF

echo "Wrote $APP_DIR/ecosystem.config.cjs (cwd=${APP_DIR}, CLIENT_ROOT_DIR=${APP_DIR}/client)"
