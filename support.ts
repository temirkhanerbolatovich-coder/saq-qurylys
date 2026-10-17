import { expect, type Page } from "@playwright/test";
export async function login(page: Page) {
  const password = process.env.BOOTSTRAP_ANALYST_PASSWORD;
  if (!password)
    throw new Error(
      "Set BOOTSTRAP_ANALYST_PASSWORD in the private environment",
    );
  const csrf = await page.request.get("/api/v1/auth/csrf");
  const token = (await csrf.json()).csrf_token;
  const response = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3000", "X-CSRF-Token": token },
    data: {
      username: process.env.BOOTSTRAP_ANALYST_USERNAME || "analyst",
      password,
    },
  });
  expect(response.status()).toBe(200);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Обзор мониторинга" }),
  ).toBeVisible();
}
