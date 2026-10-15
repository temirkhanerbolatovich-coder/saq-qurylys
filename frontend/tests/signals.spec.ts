import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { login } from "./support";

async function post(page: Page, path: string, data: unknown) {
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
  return page.request.post(`/api/v1${path}`, {
    headers: {
      Origin: "http://localhost:3000",
      "X-CSRF-Token": csrf.csrf_token,
      "Idempotency-Key": randomUUID(),
    },
    data,
  });
}

test("signals preserve snapshots, decisions, version history and a conflicted reason", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const property = registry.items.find((row: { name: string }) =>
    row.name.includes("Ертіс"),
  );
  const current = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  const history = await (
    await page.request.get(`/api/v1/signals?property_id=${property.id}`)
  ).json();
  const latest = history.items[0];
  const created = await post(page, "/signals", {
    property_id: property.id,
    expected_risk_revision: current.property.risk.revision,
    ...(latest ? { previous_signal_id: latest.id } : {}),
  });
  expect(created.status()).toBe(201);
  const first = await created.json();
  expect(first.state).toBe("DRAFT");
  await page.goto(`/signals?signal_id=${first.id}`);
  const panel = page.getByTestId("signal-detail");
  await expect(
    panel.getByRole("heading", {
      name: `Сигнал · версия ${first.version}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(panel).toContainText(
    "Сигнал необходимости проверки; не устанавливает факт правонарушения",
  );
  await expect(
    panel.getByText("Ожидает решения", { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Подтвердить сигнал", exact: true }),
  ).toBeDisabled();
  await panel
    .getByLabel("Обоснование решения по сигналу")
    .fill(
      "DEMO: проверены сохранённые материалы; сигнал направлен на дополнительную проверку и не устанавливает нарушение",
    );
  await panel
    .getByRole("button", { name: "Подтвердить сигнал", exact: true })
    .click();
  await expect(
    panel
      .getByRole("status")
      .filter({ hasText: "Сигнал подтверждён аналитиком" }),
  ).toBeVisible();
  await expect(
    panel.getByText("Подтверждён аналитиком", { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Подтвердить сигнал", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("link", { name: "Скачать PDF этой версии", exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  const pdf = await page.request.get(`/api/v1/signals/${first.id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const before = await (
    await page.request.get(`/api/v1/signals/${first.id}`)
  ).json();

  await panel
    .getByRole("button", {
      name: "Создать новую версию из текущих фактов",
      exact: true,
    })
    .click();
  await expect(page).not.toHaveURL(new RegExp(`signal_id=${first.id}$`));
  const secondId = new URL(page.url()).searchParams.get("signal_id")!;
  await expect(
    panel.getByRole("heading", {
      name: `Сигнал · версия ${first.version + 1}`,
      exact: true,
    }),
  ).toBeVisible();
  const retainedReason =
    "DEMO: причина должна сохраниться при конфликте с новой версией";
  await panel.getByLabel("Обоснование решения по сигналу").fill(retainedReason);
  const thirdResponse = await post(page, "/signals", {
    property_id: property.id,
    previous_signal_id: secondId,
    expected_risk_revision: current.property.risk.revision,
  });
  expect(thirdResponse.status()).toBe(201);
  const third = await thirdResponse.json();
  const conflict = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/signals/${secondId}/decision`) &&
      response.request().method() === "POST",
  );
  await panel
    .getByRole("button", { name: "Подтвердить сигнал", exact: true })
    .click();
  expect((await conflict).status()).toBe(409);
  await expect(panel).toContainText("Устарел для текущего решения");
  await expect(panel.getByLabel("Обоснование решения по сигналу")).toHaveValue(
    retainedReason,
  );
  await expect(
    panel.getByRole("button", { name: "Подтвердить сигнал", exact: true }),
  ).toBeDisabled();

  await panel
    .getByRole("link", { name: `Версия ${third.version}`, exact: true })
    .click();
  await expect(
    panel.getByRole("heading", {
      name: `Сигнал · версия ${third.version}`,
      exact: true,
    }),
  ).toBeVisible();
  await panel
    .getByLabel("Обоснование решения по сигналу")
    .fill(
      "DEMO: вернуть материал для дополнения неизвестных сведений; исходный снимок сохраняется",
    );
  await panel
    .getByRole("button", { name: "Вернуть на доработку", exact: true })
    .click();
  await expect(
    panel.getByText("Возвращён на доработку", { exact: true }),
  ).toBeVisible();
  const after = await (
    await page.request.get(`/api/v1/signals/${first.id}`)
  ).json();
  expect(after.snapshot).toEqual(before.snapshot);
  expect(after.decisions).toEqual(before.decisions);
  expect(after.signal.state).toBe("CONFIRMED");
  expect(after.signal.is_stale).toBe(true);

  await page.getByLabel("Статус сигнала").selectOption("RETURNED");
  await page.getByLabel("Объект сигнала").selectOption(property.id);
  await expect(page.getByLabel("Очередь сигналов")).toContainText(
    `Версия ${third.version}`,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Объект сигнала")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mkdir("../output/qa", { recursive: true });
  await page.screenshot({
    path: "../output/qa/signals-mobile.png",
    fullPage: true,
  });
});
