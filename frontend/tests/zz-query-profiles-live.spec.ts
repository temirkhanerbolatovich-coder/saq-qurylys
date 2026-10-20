import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { login, openMonitoringTool, testOrigin } from "./support";

test("live query profile saves immutable versions and reloads without search", async ({
  page,
}) => {
  test.skip(
    process.env.SAQ_QUERY_PROFILES_LIVE !== "1",
    "Opt-in: creates DEMO profiles on disposable QA only",
  );
  expect(new URL(testOrigin).port).toBe("3090");
  await login(page);
  const posts: { url: string; key: string; body: unknown }[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST")
      posts.push({
        url: new URL(request.url()).pathname,
        key: request.headers()["idempotency-key"],
        body: request.postDataJSON(),
      });
  });
  await page.goto("/monitoring?section=sources&q=retained");
  await openMonitoringTool(page, "threads");
  const builder = page.locator(".monitoring-query-builder");
  await builder.locator(":scope > summary").click();
  const panel = page.getByRole("region", {
    name: "Сохранённые поисковые профили",
  });
  const name = `DEMO profile ${crypto.randomUUID().slice(0, 8)}`;
  await page
    .getByRole("combobox", { name: "Тема поиска", exact: true })
    .selectOption("installment");
  await page.getByLabel("Название ЖК (необязательно)").fill("DEMO Әділет");
  await panel.getByLabel("Название поискового профиля").fill(name);
  await panel
    .getByRole("button", { name: "Сохранить как новый профиль", exact: true })
    .click();
  await expect(page).toHaveURL(/query_profile_revision=1/);
  const id = new URL(page.url()).searchParams.get("query_profile_id")!;
  const first = await (
    await page.request.get(`/api/v1/monitoring/query-profiles/${id}?revision=1`)
  ).json();
  expect(first.compiled_queries).toEqual(["Өскемен ЖК DEMO Әділет рассрочка"]);
  const sha = createHash("sha256")
    .update(readFileSync("lib/monitoring-dictionary-v1.json"))
    .digest("hex");
  expect(first.dictionary_sha256).toBe(sha);
  await page
    .getByLabel("Название ЖК (необязательно)")
    .fill("DEMO новая очередь");
  await panel
    .getByRole("button", { name: "Сохранить новую версию", exact: true })
    .click();
  await expect(page).toHaveURL(/query_profile_revision=2/);
  await page.reload();
  await openMonitoringTool(page, "threads");
  await builder.locator(":scope > summary").click();
  await expect(panel).toContainText("Версия 2 / 2");
  await panel
    .getByRole("button", { name: "Применить параметры", exact: true })
    .click();
  await expect(page.getByLabel("Название ЖК (необязательно)")).toHaveValue(
    "DEMO новая очередь",
  );
  await panel.getByLabel("Номер версии профиля").fill("1");
  await panel
    .getByRole("button", { name: "Показать версию", exact: true })
    .click();
  await expect(panel).toContainText("Версия 1 / 2");
  await panel
    .getByRole("button", { name: "Применить параметры", exact: true })
    .click();
  await expect(page.getByLabel("Название ЖК (необязательно)")).toHaveValue(
    "DEMO Әділет",
  );
  await expect(
    panel.getByRole("button", { name: "Сохранить новую версию", exact: true }),
  ).toBeDisabled();
  expect(posts.map((p) => p.url)).toEqual([
    "/api/v1/monitoring/query-profiles",
    `/api/v1/monitoring/query-profiles/${id}/versions`,
  ]);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const replay = await page.request.post(posts[1].url, {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": posts[1].key,
    },
    data: posts[1].body,
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).revision).toBe(2);
  const old = await (
    await page.request.get(`/api/v1/monitoring/query-profiles/${id}?revision=1`)
  ).json();
  expect(old.parameters).toEqual(first.parameters);
  expect(old.compiled_queries).toEqual(first.compiled_queries);
  for (const locale of ["ru", "kk"]) {
    await page.evaluate((l) => localStorage.setItem("saq-locale", l), locale);
    await page.reload();
    const tool = page
      .locator(".monitoring-tool")
      .filter({ has: page.locator("#monitoring-threads") });
    await tool.locator(":scope > summary").click();
    await builder.locator(":scope > summary").click();
    await expect(page.locator(".monitoring-profile-detail")).toContainText(
      name,
    );
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: `../.local/open-source-20261019/profiles-live-${locale}-${width}.png`,
          fullPage: true,
        });
    }
  }
  expect(posts).toHaveLength(2);
});
