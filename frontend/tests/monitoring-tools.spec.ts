import { expect, test } from "@playwright/test";
import { login, testOrigin } from "./support";
import type { Property } from "../lib/types";

function riskDecisions(rows: Property[]) {
  return rows.map(({ id, risk }) => ({
    id,
    score: risk.score,
    zone: risk.zone,
    revision: risk.revision,
    confirmed_codes: risk.confirmed_codes,
    unknown_codes: risk.unknown_codes,
    rules_version: risk.rules_version,
  }));
}

const navigation = [
  "Кандидаты объектов",
  "Сверка кандидата",
  "Предварительные инциденты",
  "Открытый документ КЖК",
  "Поиск Threads",
  "Версии DEMO-реестра",
];

test("queue comes first and auxiliary disclosures preserve candidate, input and selected file without commands", async ({
  page,
}) => {
  await login(page);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const ads = await (
    await page.request.get("/api/v1/advertisements?is_demo=true&page_size=1")
  ).json();
  const response = await page.request.post("/api/v1/monitoring/candidates", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      advertisement_id: ads.items[0].id,
      name: `DEMO B3 Өскемен ${Date.now()}`,
      city: "Өскемен",
      address: null,
      phase: null,
      reason: "DEMO: UI grouping acceptance, not a legal finding",
    },
  });
  expect(response.status()).toBe(201);
  const candidate = await response.json();
  const risks = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  await page.goto(`/monitoring?q=B3&is_demo=true&candidate_id=${candidate.id}`);
  const nav = page.getByRole("navigation", { name: "Разделы мониторинга" });
  await expect(nav.getByRole("link")).toHaveText(navigation);
  await expect(page.locator(".monitoring-tool[open]")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: candidate.name, exact: false }),
  ).toBeVisible();
  expect(
    await page
      .locator("#monitoring-candidates")
      .evaluate(
        (element) =>
          !!(
            element.compareDocumentPosition(
              document.querySelector(".monitoring-tools")!,
            ) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  ).toBe(true);
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  const reason = page.getByLabel("Основание запуска сверки", { exact: true });
  await reason.fill("DEMO: незавершённая сверка / аяқталмаған тексеру");
  const snapshot = page.getByLabel(
    "ID DEMO-версии реестра (пусто — реестр недоступен)",
    { exact: true },
  );
  const draftSnapshot = crypto.randomUUID();
  await snapshot.fill(draftSnapshot); // Local input only: no comparison is submitted.
  await nav.getByRole("link", { name: "Поиск Threads", exact: true }).click();
  const query = page.getByLabel("Поисковая фраза Threads", { exact: true });
  await query.fill("Өскемен ЖК B3");
  const threadsTool = page
    .locator(".monitoring-tool")
    .filter({ has: page.locator("#monitoring-threads") });
  await threadsTool.locator(":scope > summary").click();
  await expect(query).toBeHidden();
  await nav
    .getByRole("link", { name: "Открытый документ КЖК", exact: true })
    .click();
  await page.getByText("Добавить новую версию PDF", { exact: true }).click();
  await page.locator("#open-register-file").setInputFiles({
    name: "DEMO-local-only.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF- DEMO selected but never uploaded"),
  });
  await page
    .locator("#open-register-source")
    .fill("https://khc.kz/upload/demo-local-only.pdf");
  const registryTool = page
    .locator(".monitoring-tool")
    .filter({ has: page.locator("#open-register-title") });
  await registryTool.locator(":scope > summary").click();
  await nav
    .getByRole("link", { name: "Версии DEMO-реестра", exact: true })
    .click();
  await page.getByText("Создать версию DEMO-реестра", { exact: true }).click();
  await page
    .getByLabel("Название DEMO-версии", { exact: true })
    .fill("DEMO B3 unsaved version");
  await page
    .locator(".monitoring-tool")
    .filter({ has: page.locator("#monitoring-registry") })
    .locator(":scope > summary")
    .click();
  await nav.getByRole("link", { name: "Поиск Threads", exact: true }).click();
  await expect(query).toHaveValue("Өскемен ЖК B3");
  await nav
    .getByRole("link", { name: "Открытый документ КЖК", exact: true })
    .click();
  expect(
    await page
      .locator("#open-register-file")
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe("DEMO-local-only.pdf");
  await expect(page.locator("#open-register-source")).toHaveValue(
    "https://khc.kz/upload/demo-local-only.pdf",
  );
  await nav
    .getByRole("link", { name: "Версии DEMO-реестра", exact: true })
    .click();
  await expect(
    page.getByLabel("Название DEMO-версии", { exact: true }),
  ).toHaveValue("DEMO B3 unsaved version");
  await nav
    .getByRole("link", { name: "Сверка кандидата", exact: true })
    .click();
  await expect(reason).toHaveValue(
    "DEMO: незавершённая сверка / аяқталмаған тексеру",
  );
  await expect(snapshot).toHaveValue(draftSnapshot);
  expect(new URL(page.url()).searchParams.get("candidate_id")).toBe(
    candidate.id,
  );
  expect(new URL(page.url()).searchParams.get("q")).toBe("B3");
  expect(commands).toEqual([]);
  const after = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  expect(riskDecisions(after.items)).toEqual(riskDecisions(risks.items));
});

test("viewer deep links open the correct tool through reload and Back while a reference failure leaves queues available", async ({
  page,
}) => {
  await login(page);
  const user = await (await page.request.get("/api/v1/auth/me")).json();
  // Presentation fixture checks visibility only, not server authorization.
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...user, role: "viewer" } }),
  );
  await page.route("**/api/v1/monitoring/open-registry?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "DEMO reference unavailable" } },
    }),
  );
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.goto("/monitoring?q=B3#open-register-title");
  await expect(page.locator("#open-register-title")).toBeFocused();
  await expect(
    page.getByRole("alert").filter({ hasText: "DEMO reference unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Обновить кандидатов", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Добавить кандидата из публикации", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Создать версию DEMO-реестра", { exact: true }),
  ).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Разделы мониторинга" });
  await expect(nav.getByRole("link")).toHaveText(navigation);
  await nav.getByRole("link", { name: "Поиск Threads", exact: true }).click();
  await nav
    .getByRole("link", { name: "Версии DEMO-реестра", exact: true })
    .click();
  await page.goBack();
  await expect(page.locator("#monitoring-threads")).toBeFocused();
  await page.reload();
  await expect(page.locator("#monitoring-threads")).toBeFocused();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const link of await nav.getByRole("link").all()) {
      const target = await link.getAttribute("href");
      await link.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(target!)).toBeFocused();
      expect(
        await page.locator(target!).evaluate((element) => {
          const header = document.querySelector(".topbar")!;
          return (
            getComputedStyle(header).position !== "sticky" ||
            element.getBoundingClientRect().top >=
              header.getBoundingClientRect().bottom
          );
        }),
      ).toBe(true);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await nav
      .getByRole("link", { name: "Кандидаты объектов", exact: true })
      .click();
    await page.screenshot({
      path: `../output/qa/monitoring-tools-20261018/queue-${width}.png`,
    });
  }
  expect(new URL(page.url()).searchParams.get("q")).toBe("B3");
  expect(commands).toEqual([]);
});
