module.exports = {
  apps: [
    {
      name: "leadfinder-backend",
      cwd: "./backend",
      interpreter: "python",
      script: "-m",
      args: "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
    {
      name: "leadfinder-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
