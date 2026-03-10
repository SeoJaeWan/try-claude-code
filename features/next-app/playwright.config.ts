import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  baseURL: "http://localhost:3000",
  use: {
    headless: true,
  },
  timeout: 30000,
  webServer: {
    command: "npm run dev -- --port 3000",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
