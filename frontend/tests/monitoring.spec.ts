import { expect, test } from "@playwright/test";
import type { Advertisement, Page as ResultPage, Property } from "../lib/types";
import type { MonitoringCandidateDetail } from "../lib/monitoring-types";
import { openMonitoringTool, login, testOrigin } from "./support";

test("manual DEMO monitoring preserves registry versions, deduplicates the preliminary case and records human decisions without changing risk", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const before: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const risks = (rows: Property[]) =>
    rows.map(({ id, risk }) => ({
      id,
      score: risk.score,
      revision: risk.revision,
      confirmed_codes: risk.confirmed_codes,
    }));
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const name = `DEMO Әділет ${Date.now()}`;
  const create = await page.request.post("/api/v1/advertisements", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      source_label: `${name} — ручной учебный материал`,
      source_url: null,
      published_at: new Date(Date.now() - 3600_000).toISOString(),
      text: `${name}. Өскемен, ул. Учебная, 1, очередь 1. Учебная реклама строящегося жилья.`,
      is_demo: true,
    },
  });
  expect(create.status()).toBe(201);
  const ad: Advertisement = await create.json();
  await page.goto(`/monitoring?advertisement_id=${ad.id}`);
  await expect(
    page.getByRole("heading", { name: "Мониторинг рекламы", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".monitoring-boundary")).toContainText(
    "Закрытый реестр недоступен. Сверка DEMO.",
  );
  await page
    .getByText("Добавить кандидата из публикации", { exact: true })
    .click();
  await expect(
    page.getByLabel("ID сохранённой публикации", { exact: true }),
  ).toHaveValue(ad.id);
  await page
    .getByRole("button", { name: "Проверить публикацию", exact: true })
    .click();
  await expect(page.locator(".monitoring-preview")).toContainText(
    ad.source_label,
  );
  await page.getByLabel("Название кандидата", { exact: true }).fill(name);
  await page.getByLabel("Город кандидата", { exact: true }).fill("Өскемен");
  await page
    .getByLabel("Адрес кандидата (если известен)", { exact: true })
    .fill("ул. Учебная, 1");
  await page
    .getByLabel("Очередь / корпус кандидата (если известны)", { exact: true })
    .fill("очередь 1");
  await page
    .getByLabel("Обоснование выделения объекта", { exact: true })
    .fill(
      "DEMO: название, адрес и очередь прочитаны в сохранённой публикации.",
    );
  await page
    .getByRole("button", { name: "Сохранить кандидата", exact: true })
    .click();
  await expect(page).toHaveURL(/candidate_id=/);
  const candidateId = new URL(page.url()).searchParams.get("candidate_id")!;
  const detail = page.getByRole("region", {
    name: "Сверка кандидата",
    exact: true,
  });
  await expect(
    detail.getByRole("heading", { name, exact: false }),
  ).toBeVisible();
  const compare = detail.getByRole("form", {
    name: "Выполнить сверку кандидата",
  });
  await compare
    .getByLabel("Основание запуска сверки", { exact: true })
    .fill("DEMO проверка без доступного реестра");

  // One explicit presentation/transport failure verifies reuse of the command key.
  const keys: string[] = [];
  await page.route(
    `**/api/v1/monitoring/candidates/${candidateId}/compare`,
    async (route) => {
      keys.push(route.request().headers()["idempotency-key"]);
      if (keys.length === 1)
        return route.fulfill({
          status: 503,
          json: {
            error: { message: "DEMO: временный отказ доставки команды" },
          },
        });
      return route.continue();
    },
  );
  await compare
    .getByRole("button", { name: "Выполнить сверку", exact: true })
    .click();
  await expect(compare.getByRole("alert")).toContainText("временный отказ");
  await compare
    .getByRole("button", { name: "Выполнить сверку", exact: true })
    .click();
  await expect(
    detail.locator(".monitoring-success[role=status]").first(),
  ).toContainText("Ожидает доступного реестра");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
  await page.unroute(`**/api/v1/monitoring/candidates/${candidateId}/compare`);

  await openMonitoringTool(page, "registry");
  await page.getByText("Создать версию DEMO-реестра", { exact: true }).click();
  const snapshot = page.getByRole("form", {
    name: "Новая версия DEMO-реестра",
  });
  await snapshot
    .getByRole("button", { name: "Заполнить DEMO-пример", exact: true })
    .click();
  await snapshot
    .getByLabel("Название DEMO-версии", { exact: true })
    .fill(`${name} — пустой полный список`);
  await snapshot
    .getByRole("button", { name: "Удалить DEMO-документ 1", exact: true })
    .click();
  await snapshot
    .getByRole("button", { name: "Сохранить DEMO-версию", exact: true })
    .click();
  await expect(snapshot.getByRole("status")).toContainText("Документов: 0");
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  await expect(
    compare.getByLabel("ID DEMO-версии реестра (пусто — реестр недоступен)", {
      exact: true,
    }),
  ).not.toHaveValue("");
  await compare
    .getByLabel("Основание запуска сверки", { exact: true })
    .fill("DEMO сверка с полным учебным списком");
  await compare
    .getByRole("button", { name: "Выполнить сверку", exact: true })
    .click();
  await expect(
    detail.locator(".monitoring-success[role=status]").first(),
  ).toContainText("Совпадение в полном DEMO-списке не найдено");
  const incident = detail.getByRole("article", { name: /^Инцидент / });
  await expect(incident).toHaveCount(1);
  await compare
    .getByRole("button", { name: "Выполнить сверку", exact: true })
    .click();
  await expect(incident).toHaveCount(1);
  const firstDetail: MonitoringCandidateDetail = await (
    await page.request.get(`/api/v1/monitoring/candidates/${candidateId}`)
  ).json();
  expect(firstDetail.comparisons).toHaveLength(2);
  expect(firstDetail.incidents).toHaveLength(1);

  const review = incident.getByRole("form", {
    name: "Решение по предварительному инциденту",
  });
  await review
    .getByLabel("Обоснование решения по инциденту", { exact: true })
    .fill("DEMO аналитик запросил дополнительные документы");
  await review
    .getByRole("combobox", { name: "Новое состояние инцидента", exact: true })
    .selectOption("WAITING_DATA");
  await review
    .getByRole("button", {
      name: "Сохранить решение по инциденту",
      exact: true,
    })
    .click();
  await expect(incident.locator("strong").first()).toHaveText("Ожидает данных");

  await openMonitoringTool(page, "registry");

  await snapshot
    .getByRole("button", { name: "Заполнить DEMO-пример", exact: true })
    .click();
  await snapshot
    .getByLabel("Название DEMO-версии", { exact: true })
    .fill(`${name} — найден документ`);
  await snapshot
    .getByLabel("Название объекта, документ 1", { exact: true })
    .fill(name);
  await snapshot
    .getByRole("button", { name: "Сохранить DEMO-версию", exact: true })
    .click();
  await expect(snapshot.getByRole("status")).toContainText("Документов: 1");
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  await compare
    .getByLabel("Основание запуска сверки", { exact: true })
    .fill("DEMO получена новая версия списка с применимым документом");
  await compare
    .getByRole("button", { name: "Выполнить сверку", exact: true })
    .click();
  await expect(
    detail.locator(".monitoring-success[role=status]").first(),
  ).toContainText("Найдена применимая запись");
  await review
    .getByRole("combobox", { name: "Новое состояние инцидента", exact: true })
    .selectOption("CLOSED");
  await review
    .getByRole("combobox", { name: "Причина закрытия инцидента", exact: true })
    .selectOption("MATCH_FOUND");
  await review
    .getByLabel("Обоснование решения по инциденту", { exact: true })
    .fill(
      "DEMO применимый документ найден в новой версии, результат проверен вручную",
    );
  await review
    .getByRole("button", {
      name: "Сохранить решение по инциденту",
      exact: true,
    })
    .click();
  await expect(incident.locator("strong").first()).toHaveText("Закрыт");
  await expect(incident.getByRole("form")).toHaveCount(0);
  await incident
    .getByText("История решений инцидента", { exact: true })
    .click();
  await expect(
    incident.getByRole("list", { name: "История предварительного инцидента" }),
  ).toContainText("запросил дополнительные документы");

  await page.reload();
  await expect(detail).toContainText("Найдена применимая запись");
  const finalDetail: MonitoringCandidateDetail = await (
    await page.request.get(`/api/v1/monitoring/candidates/${candidateId}`)
  ).json();
  expect(finalDetail.comparisons).toHaveLength(3);
  expect(finalDetail.incidents).toHaveLength(1);
  expect(finalDetail.incidents[0].state).toBe("CLOSED");
  expect(finalDetail.advertisement_total).toBe(1);
  const after: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  expect(risks(after.items)).toEqual(risks(before.items));
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page
        .getByRole("navigation", { name: "Проверки", exact: true })
        .getByRole("link", { name: "Сверка", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("candidate filters survive reload and hide previous results during delayed errors", async ({
  page,
}) => {
  await login(page);
  const candidate = {
    id: "20000000-0000-4000-8000-000000000001",
    name: "DEMO <img src=x onerror=alert(1)>",
    city: "Өскемен",
    address: null,
    phase: null,
    is_demo: true,
    revision: 1,
    created_at: "2026-10-16T08:00:00Z",
    last_result: null,
  };
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  // Presentation fixtures only: no collector, real registry or business writes.
  await page.route("**/api/v1/monitoring/candidates?*", async (route) => {
    const current = new URL(route.request().url()).searchParams;
    if (current.get("q") === "nothing" && ++attempts === 1) {
      await gate;
      return route.fulfill({
        status: 503,
        json: { error: { message: "DEMO очередь временно недоступна" } },
      });
    }
    return route.fulfill({
      json: {
        page: 1,
        page_size: 10,
        total: current.get("q") ? 0 : 1,
        items: current.get("q") ? [] : [candidate],
      },
    });
  });
  await page.goto("/monitoring");
  const queue = page.getByRole("region", {
    name: "Кандидаты объектов",
    exact: true,
  });
  await expect(queue).toContainText(candidate.name);
  expect(await queue.locator("img").count()).toBe(0);
  await queue.getByLabel("Поиск кандидата", { exact: true }).fill("nothing");
  await queue
    .getByRole("button", { name: "Применить фильтры", exact: true })
    .click();
  await expect(page).toHaveURL(/q=nothing/);
  try {
    await expect(queue.getByRole("status")).toContainText("Загрузка данных");
    await expect(queue.getByRole("table")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(queue.getByRole("alert")).toContainText("временно недоступна");
  await queue
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(queue).toContainText("Кандидатов по этим условиям нет");
  await page.reload();
  await expect(
    queue.getByLabel("Поиск кандидата", { exact: true }),
  ).toHaveValue("nothing");
});
