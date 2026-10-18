import { expect, type Page } from "@playwright/test";

export const testOrigin = new URL(
  process.env.SAQ_E2E_BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    "http://localhost:3000",
).origin;
// The existing regression suite covers specialist workflows. New simple-view
// scenarios opt out and exercise the actual default interface separately.
export async function login(page: Page, options: { detailed?: boolean } = {}) {
  const password = process.env.BOOTSTRAP_ANALYST_PASSWORD;
  if (!password)
    throw new Error(
      "Set BOOTSTRAP_ANALYST_PASSWORD in the private environment",
    );
  const csrf = await page.request.get("/api/v1/auth/csrf");
  const token = (await csrf.json()).csrf_token;
  const response = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: testOrigin, "X-CSRF-Token": token },
    data: {
      username: process.env.BOOTSTRAP_ANALYST_USERNAME || "analyst",
      password,
    },
  });
  expect(response.status()).toBe(200);
  await page.goto("/dashboard");
  const detailed = options.detailed !== false;
  const toggle = page.locator(".interface-toggle");
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-pressed")) !== String(detailed))
    await toggle.click();
  await expect(
    page.getByRole("heading", { name: "Рабочий обзор", exact: true }),
  ).toBeVisible();
}

/** Opens the real mounted dossier editor disclosure without submitting any command. */
export async function openDossierTools(page: Page) {
  const tools = page.locator("#dossier-materials");
  await expect(tools).toBeVisible();
  if ((await tools.getAttribute("open")) === null)
    await tools.locator(":scope > summary").click();
}
