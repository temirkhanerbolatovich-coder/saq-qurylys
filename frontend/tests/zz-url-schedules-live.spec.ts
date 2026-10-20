import { expect, test } from "@playwright/test";
import { login, testOrigin } from "./support";

test("live URL schedule stays OFF until explicit enable, reloads and disables without import", async ({
  page,
}) => {
  test.skip(
    process.env.SAQ_URL_SCHEDULES_LIVE !== "1",
    "Opt-in: disposable QA only",
  );
  expect(new URL(testOrigin).port).toBe("3090");
  await login(page);
  const before = await (
    await page.request.get("/api/v1/advertisements?page_size=100")
  ).json();
  const name = `DEMO schedule ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/monitoring?section=sources&q=retained");
  const tool = page
    .locator("details.monitoring-tool")
    .filter({ has: page.locator("#monitoring-schedules-title") });
  await tool.locator(":scope > summary").click();
  await tool
    .locator("summary")
    .filter({ hasText: /^Добавить расписание$/ })
    .click();
  await tool.getByLabel("Название расписания", { exact: true }).fill(name);
  await tool
    .getByLabel("Точный URL страницы", { exact: true })
    .fill(
      `https://primeminister.kz/ru/news/demo-schedule-${crypto.randomUUID()}`,
    );
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(new URL(r.url()).pathname);
  });
  await tool
    .getByRole("button", { name: "Создать выключенное расписание" })
    .click();
  await expect(
    tool.getByRole("button", { name: "Включить расписание", exact: true }),
  ).toBeVisible();
  const id = new URL(page.url()).searchParams.get("schedule_id")!;
  await expect(page).toHaveURL(/q=retained/);
  expect(
    (
      await (
        await page.request.get(`/api/v1/monitoring/url-schedules/${id}`)
      ).json()
    ).enabled,
  ).toBe(false);
  try {
    await tool
      .getByRole("button", { name: "Включить расписание", exact: true })
      .click();
    await expect(
      tool.getByRole("button", { name: "Выключить расписание", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      tool.getByRole("button", { name: "Выключить расписание", exact: true }),
    ).toBeVisible();
    await tool
      .getByRole("button", { name: "Выключить расписание", exact: true })
      .click();
    await expect(
      tool.getByRole("button", { name: "Включить расписание", exact: true }),
    ).toBeVisible();
    const history = await (
      await page.request.get(`/api/v1/monitoring/url-schedules/${id}/runs`)
    ).json();
    expect(history.total).toBe(0);
    expect(posts).toEqual([
      "/api/v1/monitoring/url-schedules",
      `/api/v1/monitoring/url-schedules/${id}/state`,
      `/api/v1/monitoring/url-schedules/${id}/state`,
    ]);
    expect(
      await (
        await page.request.get("/api/v1/advertisements?page_size=100")
      ).json(),
    ).toEqual(before);
  } finally {
    const current = await (
      await page.request.get(`/api/v1/monitoring/url-schedules/${id}`)
    ).json();
    if (current.enabled) {
      const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
        .csrf_token;
      expect(
        (
          await page.request.post(
            `/api/v1/monitoring/url-schedules/${id}/state`,
            {
              headers: {
                Origin: testOrigin,
                "X-CSRF-Token": csrf,
                "Idempotency-Key": crypto.randomUUID(),
              },
              data: { expected_revision: current.revision, enabled: false },
            },
          )
        ).status(),
      ).toBe(200);
    }
  }
});
