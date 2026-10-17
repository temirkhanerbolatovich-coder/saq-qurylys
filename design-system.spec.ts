import { test, expect } from "@playwright/test";
import { login } from "./support";

test("responsive workspace preserves navigation, account and readable data at all target widths", async ({
  page,
}) => {
  await login(page);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/properties");
    await expect(page.locator("tbody tr")).toHaveCount(8);
    const nav = page.getByRole("navigation", { name: "Основная навигация" });
    for (const name of ["Обзор", "Объекты", "Реклама", "Проверка", "Сигналы"])
      await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Выйти", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("td")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(13);
    expect(
      await page
        .locator(".demo-badge")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(12);
    await expect(
      page
        .locator(".factor-codes")
        .filter({ hasText: "Прямое предложение внести деньги" })
        .first(),
    ).toBeAttached();
    const table = page.getByRole("region", {
      name: "Реестр объектов — таблица с горизонтальной прокруткой",
      exact: true,
    });
    await table.focus();
    await expect(table).toBeFocused();
    if (width === 375) {
      await table.press("ArrowRight");
      await expect
        .poll(() => table.evaluate((el) => el.scrollLeft))
        .toBeGreaterThan(0);
    }
  }
});

test("keyboard skip link, dossier anchors and R1 reason remain usable without collapsing draft state", async ({
  page,
}) => {
  await login(page);
  await page.goto("/properties");
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Перейти к содержимому", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page
    .getByRole("link", { name: "DEMO Бәйтерек · очередь 2", exact: true })
    .click();
  const reason = page.getByLabel("Обоснование решения R1", { exact: true });
  await expect(reason).toBeVisible();
  await expect(reason).toHaveAttribute(
    "aria-describedby",
    "absence-decision-help",
  );
  await reason.fill("DEMO unsaved interface-only draft");
  await page.getByRole("link", { name: "Основания", exact: true }).click();
  await expect(page.locator("#dossier-bases")).toBeFocused();
  await page
    .getByRole("link", { name: "Материалы и проверки", exact: true })
    .click();
  await expect(reason).toHaveValue("DEMO unsaved interface-only draft");
  await expect(
    page.getByRole("button", { name: "Отклонить R1", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Отклонить R1", exact: true }),
  ).toHaveClass(/button-danger/);
});

test("semantic text and control tokens meet planned contrast thresholds", async ({
  page,
}) => {
  await login(page);
  const ratios = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    function rgb(token: string) {
      const value = css.getPropertyValue(token).trim().replace("#", "");
      const hex =
        value.length === 3
          ? [...value].map((char) => char + char).join("")
          : value;
      return [0, 2, 4]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    }
    function luminance(token: string) {
      const c = rgb(token);
      return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    }
    return [
      ["--color-text", "--color-surface", 4.5],
      ["--color-text-muted", "--color-canvas", 4.5],
      ["--color-text-muted", "--color-surface-subtle", 4.5],
      ["--color-brand", "--color-surface", 4.5],
      ["--color-nav-text", "--color-nav", 4.5],
      ["--color-nav-text", "--color-nav-active", 4.5],
      ["--color-success", "--color-success-bg", 4.5],
      ["--color-warning", "--color-warning-bg", 4.5],
      ["--color-danger", "--color-danger-bg", 4.5],
      ["--color-info", "--color-info-bg", 4.5],
      ["--color-control-border", "--color-surface", 3],
      ["--color-focus", "--color-surface", 3],
      ["--color-focus", "--color-canvas", 3],
    ].map(([fg, bg, threshold]) => {
      const a = luminance(String(fg)),
        b = luminance(String(bg));
      return {
        fg,
        bg,
        threshold: Number(threshold),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
  });
  for (const pair of ratios)
    expect(pair.ratio, `${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(
      pair.threshold,
    );
});

test("request errors and viewer presentation remain explicit on narrow screens", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.route("**/api/v1/properties?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "DEMO temporary UI check" } },
    }),
  );
  await page.goto("/properties?q=DEMO");
  await expect(
    page.getByRole("alert").filter({ hasText: "DEMO temporary UI check" }),
  ).toContainText("DEMO temporary UI check");
  await expect(
    page.getByRole("button", { name: "Повторить загрузку", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/v1/properties?*");
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  // Only the role response is substituted here; this checks presentation, not backend authorization.
  const current = await (await page.request.get("/api/v1/auth/me")).json();
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...current, role: "viewer" } }),
  );
  await page.reload();
  await expect(
    page.locator(".user").getByText("Просмотр", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Добавить публикацию", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Выйти", exact: true }),
  ).toBeVisible();
});

test("loading is announced and an empty filter result keeps the search available", async ({
  page,
}) => {
  await login(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/properties?*", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/properties?q=DEMO");
    await expect(
      page.getByRole("status").filter({ hasText: "Загрузка данных" }),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page.unroute("**/api/v1/properties?*");
  await page
    .getByLabel("Поиск ЖК или адреса")
    .fill("DEMO no matching property 2026");
  await expect(
    page.getByText("Объекты по выбранным фильтрам не найдены.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Поиск ЖК или адреса")).toBeVisible();
});
