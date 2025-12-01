module.exports = {
  apps: [{
    name: 'api-curah-hujan',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8001,
      TZ: 'UTC'  // PENTING: Memaksa environment PM2 menggunakan UTC
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8001,
      TZ: 'UTC'  // PENTING: Memaksa environment PM2 menggunakan UTC
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true // Menampilkan timestamp di log PM2
  }]
};
