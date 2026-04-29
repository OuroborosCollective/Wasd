module.exports = {
  apps: [
    {
      name: 'wasd-areloria',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};