import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync("../.env")) process.loadEnvFile("../.env");
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "only-on-failure",
  },
});
