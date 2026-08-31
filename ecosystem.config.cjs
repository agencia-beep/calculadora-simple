module.exports = {
  apps: [
    {
      name: "leadfinder-backend",
      script: ".venv\\Scripts\\python.exe",
      args: "-m uvicorn app.main:app --host 0.0.0.0 --port 8000",
      cwd: "C:\\Users\\jcvar\\Desktop\\leadfinder-backend\\backend",
      interpreter: "none",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
