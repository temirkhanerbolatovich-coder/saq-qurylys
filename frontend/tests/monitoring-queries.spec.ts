import { expect, test } from "@playwright/test";
import {
  buildMonitoringQueries,
  cityAliases,
  searchTopics,
} from "../lib/monitoring-queries";
import { login, openMonitoringTool } from "./support";

test("query dictionary preserves city context, language, topic and bounded names", () => {
  for (const city of cityAliases)
    for (const language of ["ru", "kk"] as const) {
      const queries = buildMonitoringQueries(
        city,
        language,
        "all",
        "  DEMO   Әділет  ",
      );
      expect(queries.length).toBeGreaterThan(4);
      expect(new Set(queries).size).toBe(queries.length);
      for (const query of queries) {
        expect(query).toContain(city);
        expect(query).toContain("DEMO Әділет");
        expect(query).toContain(language === "ru" ? "ЖК" : "тұрғын үй кешені");
        expect(query.length).toBeLessThanOrEqual(300);
      }
      for (const topic of searchTopics) {
        const selected = buildMonitoringQueries(
          city,
          language,
          topic.id,
          "x".repeat(200),
        );
        expect(selected).toHaveLength(topic.phrases[language].length);
        selected.forEach((query, index) => {
          expect(query.endsWith(topic.phrases[language][index])).toBe(true);
          expect(query.length).toBeLessThanOrEqual(300);
        });
      }
    }
});

test("query preparation only changes draft; tabs and IDs survive without POST", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/v1/monitoring/threads/status", (route) =>
    route.fulfill({
      json: {
        state: "CONFIGURED_UNVERIFIED",
        busy: false,
        retry_after_seconds: 0,
        last_attempt: "NOT_RUN",
      },
    }),
  );
  await page.route("**/api/v1/monitoring/threads/search", (route) =>
    route.abort(),
  );
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto(
    "/monitoring?section=sources&candidate_id=11111111-1111-4111-8111-111111111111&q=keep",
  );
  await openMonitoringTool(page, "threads");
  const builder = page.locator(".monitoring-query-builder");
  await builder.locator("summary").focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Вариант города / региона").selectOption("ВКО");
  await page.getByLabel("Язык поисковой фразы").selectOption("kk");
  await page.getByLabel("Тема поиска").selectOption("payment");
  await page
    .getByLabel("Название ЖК (необязательно)")
    .fill("  DEMO   Әділет  ");
  await page.getByLabel("Название ЖК (необязательно)").press("Enter");
  expect(posts).toEqual([]);
  const query = "ВКО тұрғын үй кешені DEMO Әділет алғашқы жарна";
  await builder.getByRole("button", { name: query, exact: true }).click();
  const input = page.getByLabel("Поисковая фраза Threads", { exact: true });
  await expect(input).toHaveValue(query);
  await expect(input).toBeFocused();
  await page.getByRole("tab", { name: "Запуски", exact: true }).click();
  await page.getByRole("tab", { name: "Источники", exact: true }).click();
  await expect(input).toHaveValue(query);
  await expect(page).toHaveURL(/candidate_id=11111111/);
  await expect(page).toHaveURL(/q=keep/);
  expect(posts).toEqual([]);
  for (const locale of ["ru", "kk"]) {
    await page.evaluate((l) => localStorage.setItem("saq-locale", l), locale);
    await page.reload();
    const tool = page
      .locator(".monitoring-tool")
      .filter({ has: page.locator("#monitoring-threads") });
    if ((await tool.getAttribute("open")) === null)
      await tool.locator(":scope > summary").click();
    const summary = builder.locator("summary");
    if ((await builder.getAttribute("open")) === null) await summary.click();
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  }
  expect(posts).toEqual([]);
});
