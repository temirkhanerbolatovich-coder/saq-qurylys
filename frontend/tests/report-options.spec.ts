import { expect, test, type Page } from "@playwright/test";
import {
  fixtureProperty,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

async function mount(page: Page) {
  const fixture = functionalSafetyFixture();
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    await route.fulfill(fixture.response(request.method(), url.pathname));
  });
  await page.goto(`/properties/${fixtureProperty.id}`);
  const trigger = page.getByRole("button", {
    name: "Скачать отчёт",
    exact: true,
  });
  await expect(trigger).toBeVisible();
  return { fixture, trigger };
}

test("report options keep mandatory summary, readable sections, keyboard focus and no commands", async ({
  page,
}) => {
  const { fixture, trigger } = await mount(page);
  const reportReads: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/report.pdf"))
      reportReads.push(request.url());
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Отчёт по объекту",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("checkbox")).toHaveCount(8);
  for (const checkbox of await dialog.getByRole("checkbox").all())
    await expect(checkbox).toBeChecked();
  await expect(
    dialog.getByRole("checkbox", { name: /Сводка и ограничения/ }),
  ).toBeDisabled();
  await dialog
    .getByRole("checkbox", { name: "История решений", exact: true })
    .uncheck();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/dossier-report/options-${width}.png`,
    });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(
    dialog.getByRole("checkbox", { name: "История решений", exact: true }),
  ).not.toBeChecked();
  expect(reportReads).toEqual([]);
  expect(fixture.writes).toEqual([]);
});

test("selected report uses one GET, preserves choices after error and downloads PDF on explicit retry", async ({
  page,
}) => {
  const { fixture, trigger } = await mount(page);
  const reads: URL[] = [];
  let unavailable = true;
  await page.route("**/api/v1/properties/*/report.pdf?*", (route) => {
    reads.push(new URL(route.request().url()));
    expect(route.request().method()).toBe("GET");
    return route.fulfill(
      unavailable
        ? {
            status: 503,
            json: { error: { message: "Подготовка PDF занята" } },
          }
        : {
            contentType: "application/pdf",
            headers: {
              "Content-Disposition": "attachment; filename=saq-dossier.pdf",
            },
            body: Buffer.from("%PDF-presentation-download"),
          },
    );
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Отчёт по объекту",
    exact: true,
  });
  for (const checkbox of await dialog.getByRole("checkbox").all())
    if (await checkbox.isEnabled()) await checkbox.uncheck();
  await dialog
    .getByRole("combobox", { name: "Язык отчёта", exact: true })
    .selectOption("kk");
  const generate = dialog.getByRole("button", {
    name: "Сформировать и скачать PDF",
    exact: true,
  });
  await generate.click();
  await expect(dialog.getByRole("alert")).toHaveText("Подготовка PDF занята");
  await expect(dialog.getByRole("combobox")).toHaveValue("kk");
  unavailable = false;
  const saved = page.waitForEvent("download");
  await generate.click();
  const download = await saved;
  expect(download.suggestedFilename()).toBe("saq-dossier.pdf");
  expect(await download.failure()).toBeNull();
  expect(reads).toHaveLength(2);
  for (const read of reads) {
    expect(read.searchParams.get("sections")).toBe("summary");
    expect(read.searchParams.get("language")).toBe("kk");
  }
  await expect(dialog.getByRole("status")).toContainText("PDF скачан");
  expect(fixture.writes).toEqual([]);
});

test("cancelling and closing report abort stale reads and never download their late PDF", async ({
  page,
}) => {
  const { fixture, trigger } = await mount(page);
  let release!: () => void;
  let entered = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.route("**/api/v1/properties/*/report.pdf?*", async (route) => {
    entered = true;
    await gate;
    await route.fulfill({
      contentType: "application/pdf",
      body: Buffer.from("%PDF-late"),
    });
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Отчёт по объекту",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Сформировать и скачать PDF", exact: true })
    .click();
  await expect.poll(() => entered).toBe(true);
  await expect(dialog.getByRole("checkbox").last()).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Отменить подготовку", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Подготовка PDF отменена",
  );
  await page.keyboard.press("Escape");
  release();
  await expect(trigger).toBeFocused();
  expect(downloads).toBe(0);
  expect(fixture.writes).toEqual([]);
});
