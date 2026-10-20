import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fixtureUser } from "./functional-safety.fixture";

/** Presentation responses only: external sources and business commands are not executed. */
async function mountShell(
  page: Page,
  options: { authFails?: boolean; storageFails?: boolean } = {},
) {
  let authFails = options.authFails || false;
  const writes: string[] = [];
  if (options.storageFails)
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("QA preference storage denied");
      };
      Storage.prototype.setItem = () => {
        throw new Error("QA preference storage denied");
      };
    });
  await page.route("**/api/v1/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST") {
      writes.push(path);
      return route.fulfill({
        status: 503,
        json: { error: { message: "QA ошибка выхода" } },
      });
    }
    if (path === "/api/v1/auth/me")
      return authFails
        ? route.fulfill({
            status: 503,
            json: { error: { message: "QA рабочее место недоступно" } },
          })
        : route.fulfill({ json: fixtureUser });
    if (path === "/api/v1/auth/csrf")
      return route.fulfill({ json: { csrf_token: "qa-csrf" } });
    return route.fulfill({
      json: { items: [], page: 1, page_size: 25, total: 0, action_totals: {} },
    });
  });
  return {
    writes,
    recoverAuth: () => {
      authFails = false;
    },
  };
}

test("locale persists without replacing a route, original material or draft", async ({
  page,
}) => {
  const fixture = await mountShell(page);
  await page.goto("/advertisements/new?context=keep");
  await expect(page.locator("#source")).toBeVisible();
  await expect(
    page.getByRole("textbox", {
      name: "Источник / описание происхождения",
      exact: true,
    }),
  ).toBeVisible();
  await page.locator("#source").fill("QA · Өскемен · исходный источник");
  await page
    .locator("#ad-text")
    .fill("Ә Ғ Қ Ң Ө Ұ Ү Һ І · Түпнұсқа өзгермейді");
  await page
    .getByRole("combobox", { name: "Язык интерфейса", exact: true })
    .selectOption("kk");
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(
    page.getByRole("textbox", { name: "Бастапқы мәтін", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Негізгі навигация" })
      .getByRole("link", { name: "Жарнама", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveURL(/\/advertisements\/new\?context=keep$/);
  await expect(page.locator("#source")).toHaveValue(
    "QA · Өскемен · исходный источник",
  );
  await expect(page.locator("#ad-text")).toHaveValue(
    "Ә Ғ Қ Ң Ө Ұ Ү Һ І · Түпнұсқа өзгермейді",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page.locator("#ad-text")).toHaveValue(
    "Ә Ғ Қ Ң Ө Ұ Ү Һ І · Түпнұсқа өзгермейді",
  );
  await page.getByRole("link", { name: "Дереккөз", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Дереккөздер", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("saq-locale"))).toBe(
    "kk",
  );
  expect(fixture.writes).toEqual([]);
});

test("shell keeps five labelled keyboard destinations, readable account and source limits at all widths", async ({
  page,
}) => {
  const fixture = await mountShell(page);
  await page.goto("/sources");
  const nav = page.getByRole("navigation", {
    name: "Основная навигация",
    exact: true,
  });
  await expect(nav.getByRole("link")).toHaveCount(5);
  await mkdir("../output/qa/shell-redesign-20261019", { recursive: true });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("heading", { name: "Источники данных", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Выйти", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".topbar .user small")).toHaveText("Аналитик");
    await expect(page.locator(".topbar .user small")).toBeVisible();
    if (width < 768)
      await page.getByRole("button", { name: "Поиск", exact: true }).click();
    await expect(
      page.getByRole("searchbox", {
        name: "Найти объект или адрес",
        exact: true,
      }),
    ).toBeVisible();
    if (width < 768)
      await page.getByRole("button", { name: "Поиск", exact: true }).click();
    for (const destination of await nav.getByRole("link").all()) {
      await expect(destination).toBeVisible();
      const box = await destination.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await destination.focus();
      await expect(destination).toBeFocused();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.locator("h1").click();
    await page.screenshot({
      path: `../output/qa/shell-redesign-20261019/sources-${width}.png`,
      fullPage: true,
    });
  }
  await nav.getByRole("link", { name: "Объекты", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/properties$/);
  await expect(
    nav.getByRole("link", { name: "Объекты", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto("/sources");
  await expect(
    page.getByText("Предоставленный файл", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Операторский импорт PDF", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("По отдельной настройке", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".source-catalog-card h2")).toHaveText([
    "AN GROUPS",
    "Gov.kz",
    "Primeminister.kz",
    "Казахстанская Жилищная Компания",
    "Публикации и материалы",
    "Threads",
  ]);
  const commercialSource = page.locator(".source-catalog-card").filter({
    has: page.getByRole("heading", { name: "AN GROUPS", exact: true }),
  });
  await expect(
    commercialSource.getByRole("link", { name: "Импортировать страницу" }),
  ).toHaveAttribute("href", "/advertisements/import-url");
  await expect(commercialSource.locator(".source-catalog-limit")).toContainText(
    "Дата публикации, конкретный ЖК и очередь неизвестны",
  );
  await page
    .getByRole("combobox", { name: "Язык интерфейса", exact: true })
    .selectOption("kk");
  await expect(
    page.getByRole("heading", { name: "Дереккөздер", exact: true }),
  ).toBeVisible();
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".topbar .user small")).toHaveText("Талдаушы");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `../output/qa/shell-redesign-20261019/sources-kk-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("combobox", { name: "Интерфейс тілі", exact: true })
    .selectOption("ru");
  await expect(
    page.getByRole("heading", { name: "Источники данных", exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toEqual([]);
});

test("shell search retains entered text and account error preserves the workspace", async ({
  page,
}) => {
  const fixture = await mountShell(page);
  await page.goto("/sources");
  const search = page.getByRole("searchbox", {
    name: "Найти объект или адрес",
    exact: true,
  });
  await search.fill("Өркен & корпус 2");
  await search.press("Enter");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("Өркен & корпус 2");
  await page.evaluate(() =>
    sessionStorage.setItem("saq:review-draft:qa-logout", "preserve"),
  );
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.locator(".shell-account-error [role='alert']")).toHaveText(
    "QA ошибка выхода",
  );
  await expect(
    page.getByRole("button", { name: "Выйти", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("saq:review-draft:qa-logout"),
    ),
  ).toBe("preserve");
  expect(fixture.writes).toEqual(["/api/v1/auth/logout"]);
});

test("preference storage denial keeps local language and auth failure offers retry", async ({
  page,
}) => {
  const fixture = await mountShell(page, {
    authFails: true,
    storageFails: true,
  });
  await page.goto("/sources");
  await expect(page.locator(".boot .notice[role='alert']")).toHaveText(
    "QA рабочее место недоступно",
  );
  fixture.recoverAuth();
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Источники данных", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Язык интерфейса", exact: true })
    .selectOption("kk");
  await expect(
    page.getByRole("heading", { name: "Дереккөздер", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  expect(fixture.writes).toEqual([]);
});
