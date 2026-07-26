import { defineConfig, devices } from "@playwright/test";

/**
 * Two servers: a stub yap (so nothing depends on Postgres or Ollama) and a Vite
 * dev server pointed at it. Both on non-default ports so a normal `pnpm dev`
 * session can stay running while the suite executes.
 */
const STUB_PORT = 4319;
const WEB_PORT = 4318;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "line" : [["list"]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      command: `node e2e/stub-server.mjs`,
      port: STUB_PORT,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
      env: { STUB_PORT: String(STUB_PORT) },
    },
    {
      command: `pnpm vite --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
      env: { VITE_YAP_BASE_URL: `http://localhost:${STUB_PORT}/api/v1` },
    },
  ],
});
