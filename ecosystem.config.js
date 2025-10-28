module.exports = {
  apps: [
    {
      name: 'hilites-api',
      script: 'server.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'hilites-scheduler',
      script: 'scheduler.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    }
  ]
};
