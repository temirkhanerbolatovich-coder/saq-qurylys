import { expect, test } from "@playwright/test";
import { login } from "./support";

test("CSV preview, explicit save, duplicate receipt and mounted file draft", async ({
  page,
}) => {
  await login(page);
  await page.goto("/monitoring?section=imports&q=retain");
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  const file = {
    name: "DEMO-Әділет.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `source_label,source_url,text\r\nDEMO CSV,https://example.org/${crypto.randomUUID()},DEMO Өскемен без решения\r\n`,
    ),
  };
  await page.getByLabel("CSV-файл", { exact: true }).setInputFiles(file);
  await page
    .getByRole("combobox", { name: "Тип данных", exact: true })
    .selectOption("true");
  await page.getByRole("tab", { name: "Источники", exact: true }).click();
  await page.getByRole("tab", { name: "Импорт CSV", exact: true }).click();
  expect(
    await page
      .locator("#csv-file")
      .evaluate((el: HTMLInputElement) => el.files?.[0]?.name),
  ).toBe(file.name);
  expect(posts).toEqual([]);
  await expect(page).toHaveURL(/q=retain/);
  await page
    .getByRole("button", { name: "Проверить файл", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Предпросмотр · DEMO" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Новый материал", exact: true }),
  ).toBeVisible();
  expect(posts.filter((url) => url.endsWith("/csv-imports"))).toHaveLength(0);
  await page
    .getByRole("button", { name: "Сохранить пакет", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Пакет сохранён" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/csv_batch_id=/);
  const receiptUrl = page.url();
  const receipt = page.getByRole("region", {
    name: "Сохранённый пакет",
    exact: true,
  });
  await expect(receipt).toContainText("Сохранено новых: 1");
  const downloadEvent = page.waitForEvent("download");
  await receipt.getByRole("link", { name: "Скачать исходный CSV" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  const { readFile } = await import("node:fs/promises");
  expect(await readFile((await download.path())!)).toEqual(file.buffer);
  await page
    .getByRole("button", { name: "Проверить файл", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Пакет уже сохранён — открыть" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Сохранить пакет", exact: true }),
  ).toHaveCount(0);
  expect(posts.filter((url) => url.endsWith("/csv-imports"))).toHaveLength(1);
  await page.reload();
  await expect(receipt).toBeVisible();
  await expect(page).toHaveURL(receiptUrl);
  const before = posts.length;
  await receipt.getByText("Посмотреть текст", { exact: true }).click();
  await expect(receipt.locator("pre")).toContainText("DEMO Өскемен");
  expect(posts.length).toBe(before);
});

test("CSV invalid input, RU/KZ responsive preview and keyboard tabs", async ({
  page,
}) => {
  await login(page);
  await page.goto("/monitoring?section=imports");
  await page.locator("#csv-file").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("wrong\na\n"),
  });
  await page
    .getByRole("button", { name: "Проверить файл", exact: true })
    .click();
  await expect(
    page.locator("#monitoring-panel-imports").getByRole("alert"),
  ).toContainText("Заголовки CSV не поддерживаются");
  await expect(
    page.getByLabel("Ошибка импорта", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Сохранить пакет", exact: true }),
  ).toHaveCount(0);
  await page.locator("#csv-file").setInputFiles({
    name: "DEMO-links.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "source_label,source_url,text\nDEMO Материал с длинным названием Әділет Өскемен,https://example.org/test,\n",
    ),
  });
  await page.locator("#csv-mode").selectOption("true");
  await page
    .getByRole("button", { name: "Проверить файл", exact: true })
    .click();
  await expect(
    page.getByText("Ссылка без оригинала", { exact: true }),
  ).toBeVisible();
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  for (const locale of ["ru", "kk"]) {
    if (locale === "kk") {
      await page.evaluate(() => {
        localStorage.setItem("saq-locale", "kk");
        window.dispatchEvent(
          new StorageEvent("storage", { key: "saq-locale", newValue: "kk" }),
        );
      });
      await expect(page.locator("html")).toHaveAttribute("lang", "kk");
    }
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const table = page.getByRole("region", {
        name: locale === "ru" ? "Материалы CSV" : "CSV материалдары",
        exact: true,
      });
      await table.focus();
      await expect(table).toBeFocused();
      await page.screenshot({
        path: `../output/qa/csv-import-20261019/${locale}-${width}.png`,
        fullPage: true,
      });
    }
  }
  const tab = page.locator("#monitoring-tab-imports");
  await tab.focus();
  await tab.press("ArrowLeft");
  await expect(page.locator("#monitoring-tab-registry")).toBeFocused();
  await page.locator("#monitoring-tab-registry").press("ArrowRight");
  await expect(tab).toBeFocused();
  expect(
    await page
      .locator("#csv-file")
      .evaluate((el: HTMLInputElement) => el.files?.[0]?.name),
  ).toBe("DEMO-links.csv");
  expect(posts).toEqual([]);
});
