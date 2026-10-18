import { expect, test } from "@playwright/test";
import { login } from "./support";

test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }),
  );
});

test("registry filters and map work in the default interface with URL context", async ({
  page,
}) => {
  await login(page, { detailed: false });
  await page.goto("/properties");
  await expect(page.getByLabel("Фильтр по городу")).toBeVisible();
  await expect(page.getByLabel("Фильтр по основанию")).toBeVisible();
  await page.getByLabel("Фильтр по зоне").selectOption("RED");
  await page
    .getByRole("button", { name: "Карта и список", exact: true })
    .click();
  await expect(page.locator(".property-marker").first()).toBeVisible();
  await expect(page.locator(".map-count")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Фильтр по зоне")).toHaveValue("RED");
  await expect(page.locator(".property-marker").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Подробный вид", exact: true }),
  ).toBeVisible();
});

test("desktop workspace shows the map and selected review original before the fold", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto("/properties?view=map");
  const map = page.locator(".property-map");
  await expect(map).toBeVisible();
  expect((await map.boundingBox())!.y).toBeLessThan(700);
  const ads = await (
    await page.request.get("/api/v1/advertisements?page_size=1")
  ).json();
  for (const queue of ["", "queue=actions&"]) {
    await page.goto(`/review?${queue}advertisement_id=${ads.items[0].id}`);
    const original = page.locator(`[id="review-original-${ads.items[0].id}"]`);
    await expect(original).toBeVisible();
    expect((await original.boundingBox())!.y).toBeLessThan(900);
    await expect(page.locator(".review-queue > details")).not.toHaveAttribute(
      "open",
      "",
    );
    const commands: string[] = [];
    const observe = (request: import("@playwright/test").Request) => {
      if (request.method() === "POST") commands.push(request.url());
    };
    page.on("request", observe);
    await page
      .getByText("Сменить материал · очередь и фильтры", { exact: true })
      .click();
    await expect(page.locator(".review-queue-filters")).toBeVisible();
    await page
      .getByText("Сменить материал · очередь и фильтры", { exact: true })
      .click();
    await expect(original).toBeVisible();
    expect(commands).toEqual([]);
    page.off("request", observe);
  }
});

test("monitoring shortcuts select the actual panel without clearing the candidate", async ({
  page,
}) => {
  await login(page);
  const candidates = await (
    await page.request.get("/api/v1/monitoring/candidates?page_size=1")
  ).json();
  expect(candidates.items.length).toBeGreaterThan(0);
  const candidate = candidates.items[0];
  await page.goto(`/monitoring?candidate_id=${candidate.id}`);
  await page
    .getByRole("button", { name: "Открыть источники", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Источники", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  const reason = page.getByLabel("Основание запуска сверки", { exact: true });
  await reason.fill("DEMO несохранённый комментарий");
  await page
    .getByRole("button", { name: "Выбрать версию реестра", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Версии реестра", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Версии DEMO-реестра", exact: true }),
  ).toBeVisible();
  const versions = await (
    await page.request.get("/api/v1/monitoring/registry-snapshots?page_size=10")
  ).json();
  await page
    .getByRole("button", {
      name: "Выбрать DEMO-версию для сверки",
      exact: true,
    })
    .first()
    .click();
  await expect(
    page.getByRole("tab", { name: "Кандидаты", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByLabel("ID DEMO-версии реестра (пусто — реестр недоступен)", {
      exact: true,
    }),
  ).toHaveValue(versions.items[0].id);
  await expect(reason).toHaveValue("DEMO несохранённый комментарий");
  expect(new URL(page.url()).searchParams.get("candidate_id")).toBe(
    candidate.id,
  );
});

test("signal copy and archived PDF actions explain different effects", async ({
  page,
}) => {
  await login(page);
  const rows = await (
    await page.request.get("/api/v1/signals?page_size=1")
  ).json();
  const detail = await (
    await page.request.get(`/api/v1/signals/${rows.items[0].id}`)
  ).json();
  detail.signal.pdf_state = "NOT_REQUESTED";
  await page.route(`**/api/v1/signals/${detail.signal.id}`, (route) =>
    route.fulfill({ json: detail }),
  );
  await page.goto(`/signals?signal_id=${detail.signal.id}`);
  const outputs = page.locator(".signal-output-grid");
  await expect(
    page.getByRole("button", { name: "Скачать копию снимка", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Сформировать и сохранить PDF",
      exact: true,
    }),
  ).toBeVisible();
  await expect(outputs).toContainText("без сохранения в системе");
});
