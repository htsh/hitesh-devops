module.exports = {
  apps: [
    {
      name: "hitesh-monitor",
      script: "dist/server/index.js",
      cwd: __dirname,
      node_args: "--env-file=.env",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
