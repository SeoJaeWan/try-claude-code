import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  baseURL: "http://localhost:3000",
  use: {
    headless: true,
  },
  timeout: 30000,
});
