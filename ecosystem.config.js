module.exports = {
  apps: [
    {
      name: 'wasd-areloria',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      exp_backoff_restart_delay: 100
    }
  ]
};