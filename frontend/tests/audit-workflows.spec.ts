import { expect, test, type Page } from "@playwright/test";
import { login, testOrigin } from "./support";

async function createRecord(page: Page, path: string, data: unknown) {
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const response = await page.request.post(`/api/v1${path}`, {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data,
  });
  expect(response.status()).toBe(201);
  return response.json();
}

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

test("rapid registry choices merge with text debounce and external Back/Forward state", async ({
  page,
}) => {
  await login(page);
  await page.goto("/properties?is_demo=true&page_size=5");
  const zone = page.getByLabel("Фильтр по зоне", { exact: true });
  const search = page.getByRole("searchbox", {
    name: "Поиск ЖК или адреса, застройщика или БИН",
    exact: true,
  });
  const city = page.getByLabel("Фильтр по городу", { exact: true });
  await expect(zone).toBeVisible();
  // Both user handlers run before the router can render a new query snapshot.
  await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>(
      '[aria-label="Фильтр по зоне"]',
    )!;
    select.value = "RED";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(".registry-views button"),
    )
      .find((button) => button.textContent === "Карта и список")!
      .click();
  });
  await expect(zone).toHaveValue("RED");
  await search.fill("DEMO");
  await city.fill("Өскемен");
  await expect
    .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
    .toMatchObject({
      zone: "RED",
      view: "map",
      q: "DEMO",
      city: "Өскемен",
      is_demo: "true",
      page_size: "5",
    });
  await search.fill("Самал");
  await zone.selectOption("GREEN");
  await page.getByRole("button", { name: "Список", exact: true }).click();
  await expect
    .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
    .toMatchObject({ zone: "GREEN", q: "Самал", city: "Өскемен" });
  expect(new URL(page.url()).searchParams.has("view")).toBe(false);

  // A separate history entry represents navigation outside the filter controls.
  await page.evaluate(() => {
    window.history.pushState(
      null,
      "",
      `/properties?${new URLSearchParams({
        zone: "YELLOW",
        view: "map",
        q: "Другой",
        city: "Астана",
        is_demo: "true",
        page_size: "5",
      })}`,
    );
  });
  await expect(search).toHaveValue("Другой");
  await expect(city).toHaveValue("Астана");
  await search.fill("Несохранённый поиск перед возвратом");
  await page.goBack();
  await expect(search).toHaveValue("Самал");
  await expect(city).toHaveValue("Өскемен");
  await expect(zone).toHaveValue("GREEN");
  // Let the abandoned 350ms draft elapse: it must not replace restored history.
  await page.waitForTimeout(450);
  expect(new URL(page.url()).searchParams.get("q")).toBe("Самал");
  await page.goForward();
  await expect(search).toHaveValue("Другой");
  await expect(city).toHaveValue("Астана");
  await expect(zone).toHaveValue("YELLOW");
  await page.reload();
  await expect(search).toHaveValue("Другой");
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(city).toHaveValue("");
  await expect(zone).toHaveValue("");
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
    view: "map",
    is_demo: "true",
    page_size: "5",
  });
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
  const advertisements = await (
    await page.request.get("/api/v1/advertisements?is_demo=true&page_size=1")
  ).json();
  const candidate = await createRecord(page, "/monitoring/candidates", {
    advertisement_id: advertisements.items[0].id,
    name: `DEMO audit navigation ${crypto.randomUUID()}`,
    city: "Өскемен",
    reason: "DEMO independent navigation test setup",
  });
  const now = Date.now();
  const snapshot = await createRecord(page, "/monitoring/registry-snapshots", {
    label: `DEMO audit version ${crypto.randomUUID()}`,
    city: "Өскемен",
    is_demo: true,
    coverage_from: new Date(now - 3600_000).toISOString(),
    coverage_until: new Date(now).toISOString(),
    expires_at: new Date(now + 86400_000).toISOString(),
    complete: false,
    entries: [],
    reason: "DEMO independent version selection test setup",
  });
  await page.goto(`/monitoring?candidate_id=${candidate.id}`);
  await page
    .getByRole("button", { name: "Открыть источники", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Источники", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  const reason = page.getByRole("textbox", {
    name: "Основание запуска сверки",
    exact: true,
  });
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
  ).toHaveValue(snapshot.id);
  await expect(reason).toHaveValue("DEMO несохранённый комментарий");
  expect(new URL(page.url()).searchParams.get("candidate_id")).toBe(
    candidate.id,
  );
});

test("signal copy and archived PDF actions explain different effects", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=1")
  ).json();
  const property = registry.items[0];
  const previous = await (
    await page.request.get(
      `/api/v1/signals?property_id=${property.id}&page_size=1`,
    )
  ).json();
  const signal = await createRecord(page, "/signals", {
    property_id: property.id,
    expected_risk_revision: property.risk.revision,
    ...(previous.items[0] ? { previous_signal_id: previous.items[0].id } : {}),
  });
  const detail = await (
    await page.request.get(`/api/v1/signals/${signal.id}`)
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
