import { test, expect } from "@playwright/test";
import { login } from "./support";

test("legal document stays pending until a dated human review, rejection never creates R1", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const id = registry.items.find((p: { name: string }) =>
    p.name.includes("Алтай"),
  ).id;
  await page.goto(`/properties/${id}`);
  await page.getByRole("tab", { name: "Документы", exact: true }).click();
  const number = `DEMO-BASIS-${Date.now()}`;
  await page
    .getByText("Ввести реквизиты и загрузить документ", { exact: true })
    .click();
  await page
    .getByLabel("Механизм основания")
    .selectOption("BANK_WITH_MIO_PERMIT");
  await page.getByLabel("Документ основания · TXT / PNG / JPEG").setInputFiles({
    name: "basis.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "DEMO учебное разрешение для корпуса Б. Без юридической силы.",
    ),
  });
  await page
    .getByLabel("Источник документа основания")
    .fill("Собственный DEMO документ");
  await page.getByLabel("Номер документа", { exact: true }).fill(number);
  await page.getByLabel("Дата документа", { exact: true }).fill("2026-10-13");
  await page
    .getByLabel("Дата сведений источника · +05:00")
    .fill("2026-10-14T12:00");
  await page.getByLabel("Кем выдан документ").fill("DEMO issuer");
  await page
    .getByLabel("Область: очередь / корпус / адрес")
    .fill("DEMO Алтай, только корпус Б");
  await page
    .getByLabel("Применим с · +05:00", { exact: true })
    .fill("2026-10-13T00:00");
  await page
    .getByLabel("Что проверено в источнике основания")
    .fill("Сверены тип механизма, номер и область синтетического документа");
  const before = await (
    await page.request.get(`/api/v1/properties/${id}/risk`)
  ).json();
  await page
    .getByRole("button", {
      name: "Сохранить основание на проверку",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Основание сохранено" }),
  ).toContainText("Основание сохранено");
  const card = page
    .locator(".document")
    .filter({ has: page.getByRole("heading", { name: new RegExp(number) }) });
  await expect(card).toContainText("На проверке");
  await card.locator(":scope > summary").click();
  await card
    .getByLabel("Обоснование проверки основания")
    .fill("Применимость к корпусу Б и дате подтверждена по оригиналу");
  await card
    .getByRole("button", { name: "Подтвердить применимость", exact: true })
    .click();
  await expect(card).toContainText("Документ подтверждён");
  const detail = await (
    await page.request.get(`/api/v1/properties/${id}`)
  ).json();
  expect(detail.property.legal_verification_status).toBe("VERIFIED_VALID");
  expect(detail.property.risk.score).toBe(before.summary.score);
  expect(detail.property.risk.confirmed_codes).not.toContain("R1");
  await page.reload();
  await expect(card).toContainText("Документ подтверждён");
  await card.locator(":scope > summary").click();
  await card
    .getByLabel("Обоснование проверки основания")
    .fill("Учебная повторная проверка: документ отклонён");
  await card
    .getByRole("button", { name: "Отклонить документ", exact: true })
    .click();
  await expect(card).toContainText("Документ отклонён");
  const after = await (
    await page.request.get(`/api/v1/properties/${id}`)
  ).json();
  expect(after.property.legal_verification_status).not.toBe("VERIFIED_ABSENT");
  expect(after.property.risk.score).toBe(before.summary.score);
  const events = await (
    await page.request.get(`/api/v1/properties/${id}/audit?page_size=100`)
  ).json();
  expect(
    events.items.filter(
      (e: { action: string; entity_id: string }) =>
        e.action === "LEGAL_BASIS_REVIEWED" &&
        e.entity_id ===
          detail.legal_bases.find(
            (b: { document_number: string }) => b.document_number === number,
          ).id,
    ),
  ).toHaveLength(2);
  await page.screenshot({
    path: "../output/qa/legal-basis-review.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
