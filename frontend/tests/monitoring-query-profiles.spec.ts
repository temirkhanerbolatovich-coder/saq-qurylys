import { expect, test, type Page } from "@playwright/test";
import { openMonitoringTool } from "./support";

const id = "44444444-4444-4444-8444-444444444444";
const candidate = "11111111-1111-4111-8111-111111111111";
const body = {
  dictionary_version: "1.0",
  city: "Өскемен",
  language: "ru",
  topic: "payment",
  project: "DEMO Әділет",
};
function snapshot(revision = 1, currentRevision = revision) {
  return {
    id,
    name: "DEMO профиль",
    revision,
    current_revision: currentRevision,
    parameters: {
      ...body,
      project: revision === 1 ? "DEMO Әділет" : "DEMO новая очередь",
    },
    compiled_queries: ["Өскемен ЖК DEMO Әділет первоначальный взнос"],
    dictionary_sha256: "a".repeat(64),
    created_at: "2026-10-19T12:00:00Z",
  };
}
async function setup(page: Page) {
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: candidate,
        username: "presentation",
        role: "analyst",
        display_name: "DEMO",
      },
    }),
  );
  await page.route("**/api/v1/auth/csrf", (route) =>
    route.fulfill({ json: { csrf_token: "presentation" } }),
  );
  await page.route("**/api/v1/monitoring/threads/status", (route) =>
    route.fulfill({
      json: {
        state: "DISABLED",
        busy: false,
        retry_after_seconds: 0,
        last_attempt: "NOT_RUN",
      },
    }),
  );
}
async function open(page: Page, suffix = "") {
  await page.goto(
    `/monitoring?section=sources&q=keep&candidate_id=${candidate}${suffix}`,
  );
  await openMonitoringTool(page, "threads");
  await page.locator(".monitoring-query-builder > summary").click();
  const panel = page.getByRole("region", {
    name: "Сохранённые поисковые профили",
  });
  await expect(panel).toBeVisible();
  return panel;
}

test("profile save retries the same intent; reload restores an explicit version without search", async ({
  page,
}) => {
  await setup(page);
  let saved = false;
  const keys: string[] = [];
  await page.route("**/api/v1/monitoring/query-profiles**", async (route) => {
    if (route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      expect(route.request().postDataJSON()).toEqual({
        name: "DEMO профиль",
        parameters: body,
      });
      if (keys.length === 1) {
        await route.fulfill({
          status: 503,
          json: { error: { message: "DEMO временная ошибка" } },
        });
        return;
      }
      saved = true;
      await route.fulfill({ status: 201, json: snapshot() });
      return;
    }
    if (new URL(route.request().url()).pathname.endsWith(id))
      await route.fulfill({ json: snapshot() });
    else
      await route.fulfill({
        json: {
          items: saved ? [snapshot()] : [],
          page: 1,
          page_size: 20,
          total: saved ? 1 : 0,
        },
      });
  });
  const panel = await open(page);
  await page
    .getByRole("combobox", { name: "Тема поиска", exact: true })
    .selectOption("payment");
  await page.getByLabel("Название ЖК (необязательно)").fill("DEMO Әділет");
  await panel.getByLabel("Название поискового профиля").fill("DEMO профиль");
  await panel
    .getByRole("button", { name: "Сохранить как новый профиль", exact: true })
    .click();
  await expect(panel).toContainText("DEMO временная ошибка");
  await expect(panel.getByLabel("Название поискового профиля")).toHaveValue(
    "DEMO профиль",
  );
  await panel
    .getByRole("button", { name: "Сохранить как новый профиль", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`query_profile_id=${id}`));
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await expect(page).toHaveURL(/q=keep/);
  await expect(page).toHaveURL(new RegExp(`candidate_id=${candidate}`));
  await page.reload();
  await openMonitoringTool(page, "threads");
  await page.locator(".monitoring-query-builder > summary").click();
  await expect(panel).toContainText("Версия 1 / 1");
  await panel
    .getByRole("button", { name: "Применить параметры", exact: true })
    .click();
  await expect(page.getByLabel("Название ЖК (необязательно)")).toHaveValue(
    "DEMO Әділет",
  );
  await expect(
    page.getByRole("combobox", { name: "Тема поиска", exact: true }),
  ).toHaveValue("payment");
  expect(keys).toHaveLength(2);
});

test("history, conflict refresh and draft edits never overwrite a stored version implicitly", async ({
  page,
}) => {
  await setup(page);
  let currentRevision = 1;
  const posts: unknown[] = [];
  await page.route("**/api/v1/monitoring/query-profiles**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      posts.push(route.request().postDataJSON());
      currentRevision = 2;
      await route.fulfill({
        status: 409,
        json: {
          error: { message: "Профиль изменён. Обновите сохранённую версию" },
        },
      });
      return;
    }
    await route.fulfill({
      json: url.pathname.endsWith(id)
        ? snapshot(
            Number(url.searchParams.get("revision") || currentRevision),
            currentRevision,
          )
        : {
            items: [snapshot(currentRevision)],
            page: 1,
            page_size: 20,
            total: 1,
          },
    });
  });
  const panel = await open(
    page,
    `&query_profile_id=${id}&query_profile_revision=1`,
  );
  await panel
    .getByRole("button", { name: "Применить параметры", exact: true })
    .click();
  await page.getByLabel("Название ЖК (необязательно)").fill("DEMO мой ввод");
  await panel
    .getByRole("button", { name: "Сохранить новую версию", exact: true })
    .click();
  await expect(panel).toContainText("Профиль изменён");
  await panel
    .getByRole("button", { name: "Обновить сохранённую версию", exact: true })
    .click();
  await expect(panel).toContainText("Версия 1 / 2");
  await expect(page.getByLabel("Название ЖК (необязательно)")).toHaveValue(
    "DEMO мой ввод",
  );
  await expect(
    panel.getByRole("button", { name: "Сохранить новую версию", exact: true }),
  ).toBeDisabled();
  await panel.getByLabel("Номер версии профиля").fill("2");
  await panel
    .getByRole("button", { name: "Показать версию", exact: true })
    .click();
  await expect(panel).toContainText("Версия 2 / 2");
  await expect(page.getByLabel("Название ЖК (необязательно)")).toHaveValue(
    "DEMO мой ввод",
  );
  expect(posts).toHaveLength(1);
});

test("invalid profile links keep context and issue no commands", async ({
  page,
}) => {
  await setup(page);
  const paths: string[] = [];
  await page.route("**/api/v1/monitoring/query-profiles**", async (route) => {
    paths.push(new URL(route.request().url()).pathname);
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      json: { items: [], page: 1, page_size: 20, total: 0 },
    });
  });
  const panel = await open(
    page,
    "&query_profile_id=invalid&query_profile_revision=0",
  );
  await expect(panel).toContainText("Некорректная ссылка");
  expect(paths.every((path) => path.endsWith("/query-profiles"))).toBe(true);
});
