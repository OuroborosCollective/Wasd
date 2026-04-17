import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 3000);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: "bash scripts/e2e-webserver.sh",
        url: `${baseURL}/health`,
        // Default off: a stray Vite dev server on the same port serves HTML for `/health` and breaks JSON checks.
        reuseExistingServer: process.env.E2E_REUSE_WEBSERVER === "1",
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          PORT: String(port),
          NODE_ENV: "production",
          ALLOW_GUEST_LOGIN: "1",
          PLAYER_SAVE_FILE: process.env.PLAYER_SAVE_FILE || "/tmp/areloria-e2e-players.json",
        },
      },
});
