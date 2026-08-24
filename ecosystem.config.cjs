const root = "C:\\Users\\jcvar\\OneDrive\\ClaudeCode\\.claude\\worktrees\\ecstatic-lalande-3376b1";

module.exports = {
  apps: [
    {
      name: "leadfinder-backend",
      cwd: root + "\\backend",
      script: root + "\\backend\\.venv\\Scripts\\python.exe",
      args: "-m uvicorn app.main:app --host 0.0.0.0 --port 8000",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: { PYTHONUNBUFFERED: "1" },
    },
    {
      name: "leadfinder-tunnel",
      script: "C:\\PROGRAM FILES (X86)\\CLOUDFLARED\\CLOUDFLARED.EXE",
      args: "tunnel run leadfinder-api",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
