import { test, expect } from "@playwright/test";
import { functionalSafetyFixture } from "./functional-safety.fixture";

test("work entry, history and stale presets preserve selected snapshot and draft", async ({
  page,
}) => {
  const fixture = functionalSafetyFixture();
  const reads: URL[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.pathname === "/api/v1/signals" &&
      url.searchParams.get("page_size") === "25"
    )
      reads.push(url);
    await route.fulfill(fixture.response(request.method(), url.pathname));
  });
  await page.goto("/signals");
  await expect
    .poll(() => reads.at(-1)?.searchParams.get("state"))
    .toBe("DRAFT");
  expect(reads.at(-1)?.searchParams.get("is_stale")).toBe("false");
  const id = fixture.signals[0].signal.id;
  const reason = page.getByLabel("Обоснование решения по сигналу", {
    exact: true,
  });
  await reason.fill("DEMO причина для точного снимка");
  const views = page.getByRole("group", { name: "Виды очереди сигналов" });
  await views.getByRole("button", { name: "Все версии", exact: true }).click();
  await expect.poll(() => reads.at(-1)?.searchParams.get("state")).toBe(null);
  expect(new URL(page.url()).searchParams.get("signal_id")).toBe(id);
  await expect(reason).toHaveValue("DEMO причина для точного снимка");
  await views.getByRole("button", { name: "Устаревшие", exact: true }).click();
  await expect
    .poll(() => reads.at(-1)?.searchParams.get("is_stale"))
    .toBe("true");
  await expect(reason).toHaveValue("DEMO причина для точного снимка");
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await views.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/queue-views-20261019/signals-${width}.png`,
    });
  }
  await page.goto(`/signals?signal_id=${id}`);
  await expect
    .poll(() => reads.at(-1)?.searchParams.get("is_stale"))
    .toBe(null);
  expect(fixture.writes).toEqual([]);
});
