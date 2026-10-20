import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  fixtureProperty,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

type DownloadKind = "record" | "report";
const pdf = "%PDF-1.7\n% DEMO synthetic download fixture\n%%EOF";

async function mount(
  page: Page,
  kind: DownloadKind,
  locale: "ru" | "kk" = "ru",
) {
  const fixture = functionalSafetyFixture();
  await page.addInitScript(
    (language) => localStorage.setItem("saq-locale", language),
    locale,
  );
  await page.route("**/api/v1/**", (route) => {
    const request = route.request();
    return route.fulfill(
      fixture.response(request.method(), new URL(request.url()).pathname),
    );
  });
  await page.goto(
    `/properties/${fixtureProperty.id}${kind === "record" ? "?section=signals" : ""}`,
  );
  let scope: Locator = page.locator("#dossier-panel-signals > .pdf-download");
  if (kind === "report") {
    await page
      .getByRole("button", {
        name: locale === "ru" ? "Скачать отчёт" : "Есепті жүктеу",
        exact: true,
      })
      .click();
    scope = page.getByRole("dialog");
  }
  const button = scope.getByRole("button", {
    name:
      kind === "record"
        ? locale === "ru"
          ? "Скачать отчёт по объекту"
          : "Нысан есебін жүктеу"
        : locale === "ru"
          ? "Сформировать и скачать PDF"
          : "PDF жасау және жүктеу",
    exact: true,
  });
  await expect(button).toBeVisible();
  return {
    fixture,
    scope,
    button,
    url:
      kind === "record"
        ? `**/api/v1/exports/properties/${fixtureProperty.id}/pdf`
        : `**/api/v1/properties/${fixtureProperty.id}/report.pdf?*`,
  };
}

for (const kind of ["record", "report"] as const) {
  test(`${kind} PDF completes after a real 26 second response without the former 25 second abort`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const { fixture, button, url } = await mount(page, kind);
    const body = process.env.SAQ_SQ_NATIVE_PDF_PATH
      ? await readFile(process.env.SAQ_SQ_NATIVE_PDF_PATH)
      : Buffer.from(pdf);
    let reads = 0;
    await page.route(url, async (route) => {
      expect(route.request().method()).toBe("GET");
      reads++;
      await new Promise((resolve) => setTimeout(resolve, 26_000));
      await route.fulfill({
        contentType: "application/pdf",
        headers: {
          "Content-Disposition": "attachment; filename=demo-delayed.pdf",
        },
        body,
      });
    });
    const saved = page.waitForEvent("download", { timeout: 40_000 });
    await button.click();
    const download = await saved;
    expect(download.suggestedFilename()).toBe("demo-delayed.pdf");
    expect(await download.failure()).toBeNull();
    const savedPath = testInfo.outputPath("delayed-native.pdf");
    await download.saveAs(savedPath);
    expect(await readFile(savedPath)).toEqual(body);
    await expect(button).toBeEnabled();
    expect(reads).toBe(1);
    expect(fixture.writes).toEqual([]);
  });

  test(`${kind} cancellation prevents a late download and allows explicit retry`, async ({
    page,
  }) => {
    const { fixture, button, scope, url } = await mount(page, kind);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let entered = false;
    let reads = 0;
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.route(url, async (route) => {
      reads++;
      const attempt = reads;
      if (attempt === 1) {
        entered = true;
        await gate;
      }
      await route.fulfill({
        contentType: "application/pdf",
        headers: {
          "Content-Disposition": `attachment; filename=${attempt === 1 ? "late" : "retry"}.pdf`,
        },
        body: pdf,
      });
    });
    await button.click();
    await expect.poll(() => entered).toBe(true);
    await scope
      .getByRole("button", { name: "Отменить подготовку", exact: true })
      .click();
    await expect(scope.getByRole("alert")).toContainText(
      "Подготовка PDF отменена",
    );
    release();
    await expect(button).toBeEnabled();
    expect(downloads).toBe(0);
    const saved = page.waitForEvent("download");
    await button.click();
    const download = await saved;
    expect(download.suggestedFilename()).toBe("retry.pdf");
    expect(await download.failure()).toBeNull();
    expect(reads).toBe(2);
    expect(downloads).toBe(1);
    expect(fixture.writes).toEqual([]);
  });

  for (const locale of ["ru", "kk"] as const) {
    test(`${kind} timeout is distinct from cancellation in ${locale} and does not retry automatically`, async ({
      page,
    }) => {
      const { fixture, button, scope, url } = await mount(page, kind, locale);
      await page.clock.install();
      let reads = 0;
      await page.route(url, () => {
        reads++;
        // Intentionally pending; the browser helper must enforce its deadline.
      });
      await button.click();
      await expect.poll(() => reads).toBe(1);
      await page.clock.fastForward(90_001);
      await expect(scope.getByRole("alert")).toHaveText(
        locale === "ru"
          ? "Время ожидания PDF истекло. Повторите скачивание."
          : "PDF күту уақыты аяқталды. Қайта жүктеп көріңіз.",
      );
      await expect(button).toBeEnabled();
      await page.clock.fastForward(90_001);
      expect(reads).toBe(1);
      expect(fixture.writes).toEqual([]);
    });
  }

  test(`${kind} 503, non-PDF and empty PDF responses require an explicit GET retry`, async ({
    page,
  }) => {
    const { fixture, button, scope, url } = await mount(page, kind);
    let reads = 0;
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.route(url, (route) => {
      expect(route.request().method()).toBe("GET");
      reads++;
      if (reads === 1)
        return route.fulfill({
          status: 503,
          json: { error: { message: "DEMO PDF временно недоступен" } },
        });
      return route.fulfill({
        contentType: reads === 2 ? "text/html" : "application/pdf",
        body: reads === 3 ? "" : pdf,
      });
    });
    for (const expected of [
      "DEMO PDF временно недоступен",
      "Сервер не вернул PDF. Повторите скачивание.",
      "Сервер не вернул PDF. Повторите скачивание.",
    ]) {
      const before = reads;
      await button.click();
      await expect(scope.getByRole("alert")).toHaveText(expected);
      expect(reads).toBe(before + 1);
      expect(downloads).toBe(0);
      await expect(button).toBeEnabled();
    }
    const saved = page.waitForEvent("download");
    await button.click();
    expect(await (await saved).failure()).toBeNull();
    expect(reads).toBe(4);
    expect(downloads).toBe(1);
    expect(fixture.writes).toEqual([]);
  });
}
