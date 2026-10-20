import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Signal } from "../lib/types";
import { login } from "./support";

test("whole signal search preserves snapshot and URL through pages, reload, Back, errors and reset", async ({
  page,
}) => {
  await login(page);
  const signal: Signal = (
    await (await page.request.get("/api/v1/signals?page_size=1")).json()
  ).items[0];
  const fakeRows = Array.from({ length: 50 }, (_, index) => ({
    ...signal,
    id: `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    version: 1000 + index,
  }));
  let broken = false;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests: string[] = [];
  const commands: string[] = [];
  await page.route(/\/api\/v1\/signals\?/, async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("page_size") !== "25") return route.continue();
    const query = params.get("q") || "";
    requests.push(query);
    if (query === "ожидание") await gate;
    if (query === "ошибка" && broken)
      return route.fulfill({
        status: 503,
        json: { error: { message: "DEMO поиск сигналов недоступен" } },
      });
    const rows =
      query === "пусто" || query === "ожидание"
        ? []
        : query === "по страницам"
          ? [...fakeRows, signal]
          : [signal];
    const number = Number(params.get("page") || 1);
    return route.fulfill({
      json: {
        items: rows.slice((number - 1) * 25, number * 25),
        total: rows.length,
        page: number,
        page_size: 25,
      },
    });
  });
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.goto(
    `/signals?signal_id=${signal.id}&state=${signal.state}&property_id=${signal.property_id}&page=2`,
  );
  const panel = page.getByTestId("signal-detail");
  await expect(panel).toBeVisible();
  await expect(
    page.getByText(
      "На этой странице сигналов нет. Вернитесь на предыдущую страницу.",
      { exact: true },
    ),
  ).toBeVisible();
  const input = page.getByLabel("Поиск по всем сигналам", { exact: true });
  const submit = page.getByRole("button", {
    name: "Найти сигналы",
    exact: true,
  });
  const initialRequests = requests.length;
  await input.fill("по страницам");
  expect(requests).toHaveLength(initialRequests);
  await submit.click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("по страницам");
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  await expect(page.locator(".signal-queue-item")).toHaveCount(25);
  await expect(
    page.getByRole("region", { name: "Сводка сигналов" }),
  ).toContainText("51");
  for (let number = 1; number <= 2; number++) {
    await page
      .getByRole("navigation", { name: "Страницы сигналов", exact: true })
      .getByRole("button", { name: "Следующая страница", exact: true })
      .click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("page"))
      .toBe(String(number + 1));
    await expect(page.locator(".signal-queue-item")).toHaveCount(
      number === 1 ? 25 : 1,
    );
    expect(new URL(page.url()).searchParams.get("signal_id")).toBe(signal.id);
    await expect(panel).toBeVisible();
  }
  await page.reload();
  await expect(input).toHaveValue("по страницам");
  await expect(page.locator(".signal-queue-item")).toHaveCount(1);
  await input.fill("пусто");
  await input.press("Enter");
  await expect(
    page.getByText("По вашему запросу сигналов не найдено.", { exact: false }),
  ).toBeVisible();
  await expect(panel).toBeVisible();
  await page.goBack();
  await expect(input).toHaveValue("по страницам");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("page"))
    .toBe("3");
  await expect(page.locator(".signal-queue-item")).toHaveCount(1);
  broken = true;
  await input.fill("ошибка");
  await input.press("Enter");
  await expect(page.locator(".signals-queue").getByRole("alert")).toContainText(
    "поиск сигналов недоступен",
  );
  await expect(page.locator(".signal-queue-item")).toHaveCount(0);
  await expect(panel).toBeVisible();
  broken = false;
  await page
    .locator(".signals-queue")
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.locator(".signal-queue-item")).toHaveCount(1);
  await input.fill("ожидание");
  await input.press("Enter");
  try {
    await expect(
      page.getByRole("status").filter({ hasText: "Загрузка сигналов" }),
    ).toBeVisible();
    await expect(page.locator(".signal-queue-item")).toHaveCount(0);
    await expect(panel).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByText("По вашему запросу сигналов не найдено.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Сбросить фильтры сигналов", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await expect(
    page.getByLabel("Объект сигнала", { exact: true }),
  ).toBeFocused();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  expect(commands).toEqual([]);
});

test("real server signal search finds an ID and remains readable in both modes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page, { detailed: false });
  const signal: Signal = (
    await (await page.request.get("/api/v1/signals?page_size=1")).json()
  ).items[0];
  const response = await page.request.get(`/api/v1/signals?q=${signal.id}`);
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.total).toBe(1);
  expect(result.items[0].id).toBe(signal.id);
  const folder = path.resolve("../output/qa/signal-search-20261018");
  await mkdir(folder, { recursive: true });
  const observations: object[] = [];
  const errors: string[] = [];
  const commands: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    `/signals?${new URLSearchParams({ q: signal.id, signal_id: signal.id })}`,
  );
  for (const detailed of [false, true]) {
    const toggle = page.locator(".interface-toggle");
    if ((await toggle.getAttribute("aria-pressed")) !== String(detailed))
      await toggle.click();
    for (const width of [360, 375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.reload();
      await expect(toggle).toHaveAttribute("aria-pressed", String(detailed));
      await expect(
        page.getByLabel("Поиск по всем сигналам", { exact: true }),
      ).toHaveValue(signal.id);
      await expect(page.locator(".signal-queue-item")).toHaveCount(1);
      await expect(page.getByTestId("signal-detail")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      const form = page.locator(".signals-queue-search");
      const button = form.getByRole("button", {
        name: "Найти сигналы",
        exact: true,
      });
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const mode = detailed ? "detailed" : "simple";
      await page.screenshot({
        path: path.join(folder, `${mode}-${width}.png`),
        fullPage: true,
      });
      await form.screenshot({
        path: path.join(folder, `form-${mode}-${width}.png`),
      });
      observations.push({ width, mode, overflow });
    }
  }
  await writeFile(
    path.join(folder, "observations.json"),
    JSON.stringify({ observations, errors, commands }, null, 2),
  );
  expect(errors).toEqual([]);
  expect(commands).toEqual([]);
});
