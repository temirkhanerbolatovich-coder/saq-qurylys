import { expect, test } from "@playwright/test";
import { login } from "./support";
import type { AuditEvent, Page as ResultPage, Property } from "../lib/types";

test("dossier history reads real events with the recorded author and keeps the risk unchanged", async ({
  page,
}) => {
  await login(page);
  const registry: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties")
  ).json();
  const property = registry.items[0];
  const before = await (
    await page.request.get(`/api/v1/properties/${property.id}/risk`)
  ).json();
  const history: ResultPage<AuditEvent> = await (
    await page.request.get(
      `/api/v1/properties/${property.id}/audit?page_size=10`,
    )
  ).json();
  expect(history.items.length).toBeGreaterThan(0);
  await page.goto(`/properties/${property.id}`);
  await page
    .getByRole("link", { name: "История объекта", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "История объекта",
    exact: true,
  });
  await expect(region).toBeFocused();
  await expect(region).toContainText(`Всего событий: ${history.total}`);
  await expect(
    region
      .getByRole("list", { name: "События по объекту" })
      .getByRole("listitem"),
  ).toHaveCount(history.items.length);
  await expect(region).toContainText(history.items[0].actor_display_name!);
  await region.getByRole("button", { name: "Обновить историю" }).click();
  const after = await (
    await page.request.get(`/api/v1/properties/${property.id}/risk`)
  ).json();
  expect(after).toEqual(before);
});

test("history pagination preserves context and handles delayed errors, retry, empty and unknown events", async ({
  page,
}) => {
  await login(page);
  const registry: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties")
  ).json();
  const property = registry.items[0];
  const event: AuditEvent = {
    id: "10000000-0000-4000-8000-000000000001",
    actor_id: "10000000-0000-4000-8000-000000000002",
    actor_display_name: "DEMO <img src=x onerror=alert(1)>",
    risk_code: "R2",
    occurred_at: "2026-10-16T08:00:00Z",
    action: "RISK_FACTOR_REVIEWED",
    entity_type: "risk_factors",
    entity_id: "10000000-0000-4000-8000-000000000003",
    old_revision: 1,
    new_revision: 2,
    reason: "DEMO Причина повторной проверки",
    details: { before: { status: "CONFIRMED" }, after: { status: "PENDING" } },
  };
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let secondPageAttempt = 0;
  // Presentation fixtures exercise page/error states; business data stays in the real API.
  await page.route(
    `**/api/v1/properties/${property.id}/audit?*`,
    async (route) => {
      const current = Number(
        new URL(route.request().url()).searchParams.get("page") || "1",
      );
      if (current === 2 && ++secondPageAttempt === 1) {
        await gate;
        return route.fulfill({
          status: 503,
          json: { error: { message: "DEMO История временно недоступна" } },
        });
      }
      return route.fulfill({
        json: {
          page: current,
          page_size: 10,
          total: 20,
          items: current === 1 ? [event] : [],
        },
      });
    },
  );
  await page.goto(
    `/properties/${property.id}?registry=${encodeURIComponent("q=DEMO&page=2")}`,
  );
  const region = page.getByRole("region", {
    name: "История объекта",
    exact: true,
  });
  const pagination = region.getByRole("navigation", {
    name: "Страницы истории объекта",
  });
  await expect(region).toContainText("Подтверждено → На проверке");
  await expect(region).toContainText("DEMO <img src=x onerror=alert(1)>");
  await expect(region.locator("img")).toHaveCount(0);
  await pagination.getByRole("button", { name: "Следующая страница" }).click();
  await expect(page).toHaveURL(/history_page=2/);
  await expect(
    region.getByRole("heading", { name: "История объекта" }),
  ).toBeFocused();
  try {
    await expect(region.getByRole("status")).toContainText("Загрузка данных");
    await expect(region.locator(".history-timeline li")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(region.getByRole("alert")).toContainText(
    "DEMO История временно недоступна",
  );
  await expect(region.locator(".history-timeline li")).toHaveCount(0);
  await region.getByRole("button", { name: "Повторить загрузку" }).click();
  await expect(region).toContainText("На этой странице событий нет");
  await page.reload();
  await expect(pagination.getByRole("status")).toHaveText("Страница 2 из 2");
  await pagination.getByRole("button", { name: "Предыдущая страница" }).click();
  await expect(region).toContainText(event.reason!);
  await expect(page).not.toHaveURL(/history_page=/);
  await page.getByRole("link", { name: "К реестру", exact: true }).click();
  await expect(page).toHaveURL(/\/properties\?q=DEMO&page=2$/);

  await page.unrouteAll({ behavior: "wait" });
  await page.route(`**/api/v1/properties/${property.id}/audit?*`, (route) =>
    route.fulfill({
      json: {
        page: 1,
        page_size: 10,
        total: 1,
        items: [
          {
            ...event,
            action: "FUTURE_EVENT",
            actor_display_name: null,
            risk_code: null,
            reason: null,
            details: {},
          },
        ],
      },
    }),
  );
  await page.goto(`/properties/${property.id}?history_page=invalid`);
  await expect(region).toContainText("Сохранено событие");
  await expect(region).toContainText("Имя не указано");
  await expect(region).toContainText("Причина в событии не записана");
  await region.getByText("Запись аудита", { exact: true }).click();
  await expect(region).toContainText("FUTURE_EVENT");
});
