import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { assertIsolatedE2E } from "./scripts/e2e-safety.mjs";

if (existsSync("../.env")) process.loadEnvFile("../.env");
const baseURL = assertIsolatedE2E(process.env);
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
  },
});
