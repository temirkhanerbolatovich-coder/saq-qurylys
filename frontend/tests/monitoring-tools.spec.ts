import { expect, test } from "@playwright/test";
import { login, openMonitoringTool, testOrigin } from "./support";

test("monitoring tabs retain candidate, source drafts and selected file without commands", async ({
  page,
}) => {
  await login(page);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const ads = await (
    await page.request.get("/api/v1/advertisements?is_demo=true&page_size=1")
  ).json();
  const result = await page.request.post("/api/v1/monitoring/candidates", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      advertisement_id: ads.items[0].id,
      name: `DEMO TABS Әділет ${Date.now()}`,
      city: "Өскемен",
      address: null,
      phase: null,
      reason: "DEMO local tab acceptance",
    },
  });
  expect(result.status()).toBe(201);
  const candidate = await result.json();
  await page.goto(`/monitoring?q=TABS&candidate_id=${candidate.id}`);
  const tabs = page.getByRole("tablist", { name: "Разделы мониторинга" });
  await expect(tabs.getByRole("tab")).toHaveText([
    "Кандидаты",
    "Инциденты",
    "Источники",
    "Версии реестра",
    "Импорт CSV",
    "Запуски",
    "Parser V2",
  ]);
  const reason = page.getByRole("textbox", {
    name: "Основание запуска сверки",
    exact: true,
  });
  await reason.fill("DEMO незавершённая сверка");
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await openMonitoringTool(page, "threads");
  const query = page.getByLabel("Поисковая фраза Threads", { exact: true });
  await query.fill("Өскемен ЖК TABS");
  await openMonitoringTool(page, "open");
  await page.getByText("Добавить новую версию PDF", { exact: true }).click();
  await page.locator("#open-register-file").setInputFiles({
    name: "DEMO-local.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF- DEMO never submitted"),
  });
  await page
    .locator("#open-register-source")
    .fill("https://khc.kz/upload/demo-local.pdf");
  await openMonitoringTool(page, "registry");
  await page.getByText("Создать версию DEMO-реестра", { exact: true }).click();
  await page
    .getByLabel("Название DEMO-версии", { exact: true })
    .fill("DEMO unsaved version");
  await tabs.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  await expect(reason).toHaveValue("DEMO незавершённая сверка");
  await openMonitoringTool(page, "threads");
  await expect(query).toHaveValue("Өскемен ЖК TABS");
  await expect(page.locator("#open-register-source")).toHaveValue(
    "https://khc.kz/upload/demo-local.pdf",
  );
  expect(
    await page
      .locator("#open-register-file")
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe("DEMO-local.pdf");
  await openMonitoringTool(page, "registry");
  await expect(
    page.getByLabel("Название DEMO-версии", { exact: true }),
  ).toHaveValue("DEMO unsaved version");
  expect(new URL(page.url()).searchParams.get("candidate_id")).toBe(
    candidate.id,
  );
  expect(commands).toEqual([]);
});

test("monitoring legacy links, Back, reload and responsive single panels remain accessible to viewer", async ({
  page,
}) => {
  await login(page);
  const user = await (await page.request.get("/api/v1/auth/me")).json();
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...user, role: "viewer" } }),
  );
  await page.goto("/monitoring?q=DEMO#open-register-title");
  const tabs = page.getByRole("tablist", { name: "Разделы мониторинга" });
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
    "Источники",
  );
  await expect(page.locator("#open-register-title")).toBeFocused();
  await tabs.getByRole("tab", { name: "Версии реестра", exact: true }).click();
  await page.goBack();
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
    "Источники",
  );
  await page.reload();
  await expect(page.locator("#open-register-title")).toBeFocused();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of await tabs.getByRole("tab").all()) {
      await tab.click();
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await tabs.getByRole("tab", { name: "Кандидаты", exact: true }).click();
    await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
      "Кандидаты",
    );
    await page.screenshot({
      path: `../output/qa/tabs-pdf-20261018/monitoring-${width}.png`,
    });
  }
  await expect(
    page.getByText("Создать версию DEMO-реестра", { exact: true }),
  ).toHaveCount(0);
});
