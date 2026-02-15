module.exports = {
  apps: [
    {
      name: "heritage-heist-server",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
