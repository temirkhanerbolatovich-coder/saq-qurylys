import { expect, test } from "@playwright/test";
import { login, openDossierTools, testOrigin } from "./support";

const labels = [
  "Обзор",
  "Документы",
  "Проверка и риски",
  "Публикации",
  "Сигналы и отчёты",
  "История",
];

test("real tabs preserve drafts and files, support keyboard, URL, Back and legacy links without commands", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const rows = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const row = rows.items.find((value: { name: string }) =>
    value.name.includes("Ертіс"),
  );
  const before = await (
    await page.request.get(`/api/v1/properties/${row.id}/risk`)
  ).json();
  await page.goto(
    `/properties/${row.id}?registry=${encodeURIComponent("q=Ертіс&page=1")}`,
  );
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  const tabs = page.getByRole("tablist", { name: "Разделы карточки объекта" });
  await expect(tabs.getByRole("tab")).toHaveText(labels);
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(page.locator(".factor-row").first()).toBeHidden();
  await tabs.getByRole("tab", { name: "Обзор", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "Документы", exact: true }),
  ).toBeFocused();
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
    "Документы",
  );
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText("История");
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText("Обзор");
  await openDossierTools(page);
  await page.getByRole("link", { name: "Проверить R4", exact: true }).click();
  await expect(page.locator("#dossier-editor-R4")).toBeFocused();
  const reason = page.locator("#appeal-reason");
  await reason.fill("DEMO Әділет: черновик вкладки");
  await page.locator("#appeal-file").setInputFiles({
    name: "tab-memory.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO saved only in browser"),
  });
  await tabs.getByRole("tab", { name: "Документы", exact: true }).click();
  await expect(reason).toBeHidden();
  await tabs
    .getByRole("tab", { name: "Проверка и риски", exact: true })
    .click();
  await expect(reason).toHaveValue("DEMO Әділет: черновик вкладки");
  expect(
    await page
      .locator("#appeal-file")
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe("tab-memory.txt");
  await tabs.getByRole("tab", { name: "История", exact: true }).click();
  await page.goBack();
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
    "Проверка и риски",
  );
  await page.goForward();
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText("История");
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText("История");
  await page.goto(`/properties/${row.id}#dossier-editor-R4`);
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
    "Проверка и риски",
  );
  await expect(page.locator("#dossier-editor-R4")).toBeFocused();
  await expect(reason).toHaveValue("DEMO Әділет: черновик вкладки");
  await expect(
    page.getByText("Выберите файл повторно: tab-memory.txt.", { exact: true }),
  ).toBeVisible();
  expect(commands).toEqual([]);
  const after = await (
    await page.request.get(`/api/v1/properties/${row.id}/risk`)
  ).json();
  // With no saved factor the server stamps its read time; compare stored state.
  expect({
    ...after,
    summary: { ...after.summary, as_of: before.summary.as_of },
  }).toEqual(before);
});

test("viewer sees one panel, reads selected evidence and tabs reflow at required widths", async ({
  page,
}) => {
  await login(page);
  const user = await (await page.request.get("/api/v1/auth/me")).json();
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...user, role: "viewer" } }),
  );
  const rows = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const row = rows.items.find((value: { name: string }) =>
    value.name.includes("Бәйтерек"),
  );
  const detail = await (
    await page.request.get(`/api/v1/properties/${row.id}`)
  ).json();
  const factor = detail.factors.find(
    (value: { evidence_ids: string[] }) => value.evidence_ids.length,
  );
  const reads: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/v1\/evidence\//.test(request.url())) reads.push(request.url());
  });
  await page.goto(`/properties/${row.id}`);
  await expect(page.locator("#dossier-materials")).toHaveCount(0);
  const tabs = page.getByRole("tablist", { name: "Разделы карточки объекта" });
  await tabs
    .getByRole("tab", { name: "Проверка и риски", exact: true })
    .click();
  await page
    .locator(".factor-row")
    .filter({ has: page.getByText(factor.code, { exact: true }) })
    .getByRole("button", { name: "Доказательства", exact: true })
    .click();
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
    "Документы",
  );
  await expect(page.locator("#dossier-evidence")).toBeFocused();
  await expect(page.locator("#dossier-evidence .evidence")).toHaveCount(
    new Set(factor.evidence_ids).size,
  );
  expect([...new Set(reads)].sort()).toEqual(
    [...new Set(factor.evidence_ids)]
      .map((id) => `${testOrigin}/api/v1/evidence/${id}`)
      .sort(),
  );
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of await tabs.getByRole("tab").all()) {
      await tab.click();
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await tabs.getByRole("tab", { name: "Обзор", exact: true }).click();
    await expect(tabs.getByRole("tab", { selected: true })).toHaveText("Обзор");
    await page.screenshot({
      path: `../output/qa/tabs-pdf-20261018/overview-${width}.png`,
    });
    await tabs.getByRole("tab", { name: "Документы", exact: true }).click();
    await expect(tabs.getByRole("tab", { selected: true })).toHaveText(
      "Документы",
    );
    await page.screenshot({
      path: `../output/qa/tabs-pdf-20261018/documents-${width}.png`,
    });
  }
});
