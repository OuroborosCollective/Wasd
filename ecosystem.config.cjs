module.exports = {
  apps: [{
    name: 'areloria',
    script: './server/dist/index.js',
    cwd: '/opt/areloria',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=2048',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      CLIENT_ROOT_DIR: '/opt/areloria/client',
    },
    env_file: '/opt/areloria/.env',
    error_file: '/var/log/areloria/error.log',
    out_file: '/var/log/areloria/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
