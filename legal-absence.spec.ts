import { test, expect } from "@playwright/test";
import { login } from "./support";

const mechanisms = [
  "Гарантия КЖК",
  "Банковский механизм + разрешение МИО",
  "Каркас + разрешение МИО",
];

test("R1 requires three documented absence findings and a separate dated decision", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const property = registry.items.find((row: { name: string }) =>
    row.name.includes("Ертіс"),
  );
  const initial = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  const initialR1 = initial.factors.find(
    (row: { code: string }) => row.code === "R1",
  );
  expect(initial.property.risk.score).toBe(0);
  await page.goto(`/properties/${property.id}`);
  const panel = page.getByTestId("legal-absence-review");
  await panel
    .getByText("Проверить три механизма на дату", { exact: true })
    .click();
  const suffix = Date.now();
  await panel
    .getByLabel("Документ проверки отсутствия · TXT / PNG / JPEG")
    .setInputFiles({
      name: "incomplete-check.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        `DEMO ${suffix}: учебная неполная проверка очереди 1. Сведения о трёх механизмах пока не проверены.`,
      ),
    });
  await panel
    .getByLabel("Источник проверки отсутствия", { exact: true })
    .fill("DEMO учебное заключение о трёх механизмах");
  await panel
    .getByLabel("Точная область проверки: объект / очередь / корпус")
    .fill("Только DEMO Ертіс, очередь 1, DEMO участок 04");
  await panel
    .getByLabel("Состояние оснований на дату · +05:00")
    .fill("2026-10-13T12:00");
  await panel
    .getByLabel("Дата сведений документа проверки · +05:00")
    .fill("2026-10-14T12:00");
  await panel
    .getByLabel("Что и как проверено по трём механизмам")
    .fill(
      "Учебная ручная сверка трёх механизмов по отдельным разделам документа для одной очереди и исторической даты",
    );
  for (const mechanism of mechanisms) {
    await panel
      .getByLabel(`Обоснование результата · ${mechanism}`, { exact: true })
      .fill(`DEMO: ${mechanism} пока не проверен; отсутствие не установлено`);
  }
  await panel
    .getByLabel("Обоснование решения R1")
    .fill(
      "DEMO: сохранить неполную проверку; неизвестность не подтверждает R1",
    );
  await panel
    .getByRole("button", { name: "Сохранить проверку отсутствия", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Неполная проверка сохранена",
  );
  const incomplete = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  expect(
    incomplete.factors.filter((row: { code: string }) => row.code === "R1"),
  ).toHaveLength(initialR1 ? 1 : 0);
  expect(incomplete.property.risk.confirmed_codes).not.toContain("R1");
  expect(incomplete.property.risk.score).toBe(0);

  await panel
    .getByLabel("Документ проверки отсутствия · TXT / PNG / JPEG")
    .setInputFiles({
      name: "documented-absence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        `DEMO ${suffix}: для учебной очереди 1 Ертіс на 13 октября документировано отсутствие гарантии КЖК, банковского механизма с разрешением МИО и каркаса с разрешением МИО. Синтетический документ без юридической силы.`,
      ),
    });
  for (const mechanism of mechanisms) {
    await panel
      .getByLabel(`Результат · ${mechanism}`, { exact: true })
      .selectOption("DOCUMENTED_ABSENT");
    await panel
      .getByLabel(`Обоснование результата · ${mechanism}`, { exact: true })
      .fill(
        `DEMO: отсутствие механизма «${mechanism}» документировано в соответствующем разделе заключения для очереди 1 на 13 октября`,
      );
  }
  await panel
    .getByLabel("Обоснование решения R1")
    .fill(
      "DEMO: все три механизма проверены на историческую дату; подтверждение R1 принимается отдельно",
    );
  await panel
    .getByRole("button", { name: "Сохранить проверку отсутствия", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Проверка 3/3 сохранена",
  );
  const pending = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  const factor = pending.factors.find(
    (row: { code: string }) => row.code === "R1",
  );
  expect(factor.status).toBe(initialR1 ? initialR1.status : "PENDING");
  expect(pending.property.risk.score).toBe(0);
  await panel
    .getByRole("button", { name: "Подтвердить R1 · +35", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "R1 подтверждён на указанную дату: +35 баллов",
  );
  await expect(panel).toContainText("Текущий статус R1: Подтверждён");
  const confirmed = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  expect(confirmed.property.risk.score).toBe(35);
  expect(confirmed.property.risk.confirmed_codes).toContain("R1");
  const confirmedFactor = confirmed.factors.find(
    (row: { code: string }) => row.code === "R1",
  );
  expect(new Date(confirmedFactor.as_of).toISOString()).toBe(
    "2026-10-13T07:00:00.000Z",
  );

  await page.reload();
  await expect(panel).toContainText("Текущий статус R1: Подтверждён");
  await panel
    .getByText("Проверить три механизма на дату", { exact: true })
    .click();
  await panel
    .getByLabel("Обоснование решения R1")
    .fill(
      "DEMO повторная проверка: отклонить R1, сохранить историческую дату и аудит",
    );
  await panel
    .getByRole("button", { name: "Отклонить R1", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "R1 отклонён: 0 баллов",
  );
  const rejected = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  expect(rejected.property.risk.score).toBe(0);
  expect(rejected.property.risk.confirmed_codes).not.toContain("R1");
  expect(
    new Date(
      rejected.factors.find((row: { code: string }) => row.code === "R1").as_of,
    ).toISOString(),
  ).toBe("2026-10-13T07:00:00.000Z");
  const events = await (
    await page.request.get(
      `/api/v1/properties/${property.id}/audit?page_size=100`,
    )
  ).json();
  expect(
    events.items.filter(
      (event: { action: string; entity_id: string }) =>
        event.action === "RISK_FACTOR_REVIEWED" &&
        event.entity_id === confirmedFactor.id,
    ).length,
  ).toBeGreaterThanOrEqual(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../output/qa/legal-absence-review.png",
    fullPage: true,
  });
});
