import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { login } from "./support";

function demoPdf() {
  const stream =
    "BT /F1 14 Tf 40 250 Td (DEMO supporting document. Fictional only.) Tj ET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let document = "%PDF-1.7\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  document += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  document += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(document);
}

test("supporting PDF preserves original bytes and stays pending until human review", async ({
  page,
  request,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const property = registry.items.find((row: { name: string }) =>
    row.name.includes("Ертіс"),
  );
  const risk = async () =>
    (
      await (
        await page.request.get(`/api/v1/properties/${property.id}/risk`)
      ).json()
    ).summary;
  const before = await risk();
  const number = `DEMO-PDF-${randomUUID()}`;
  const pdf = demoPdf();

  await page.goto(`/properties/${property.id}`);
  await page
    .getByText("Ввести реквизиты и загрузить документ", { exact: true })
    .click();
  const file = page.getByLabel("Документ основания · TXT / PNG / JPEG / PDF");
  await expect(file).toHaveAttribute("accept", /application\/pdf/);
  await file.setInputFiles({
    name: "demo-legal-basis.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByLabel("Механизм основания").selectOption("KZHK_GUARANTEE");
  await page
    .getByLabel("Источник документа основания")
    .fill("Собственный синтетический DEMO PDF");
  await page.getByLabel("Номер документа", { exact: true }).fill(number);
  await page.getByLabel("Дата документа", { exact: true }).fill("2026-10-13");
  await page
    .getByLabel("Дата сведений источника · +05:00")
    .fill("2026-10-13T12:00");
  await page.getByLabel("Кем выдан документ").fill("DEMO учебный издатель");
  await page
    .getByLabel("Область: очередь / корпус / адрес")
    .fill("DEMO Ертіс, очередь 1; только синтетический тест PDF");
  await page
    .getByLabel("Применим с · +05:00", { exact: true })
    .fill("2026-10-13T00:00");
  await page
    .getByLabel("Что проверено в источнике основания")
    .fill("Учебный PDF без юридической силы, сохранение отдельного оригинала");
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
  expect((await risk()).score).toBe(before.score);
  expect((await risk()).confirmed_codes).toEqual(before.confirmed_codes);

  const original = card.getByRole("link", {
    name: "Открыть сохранённый материал",
  });
  const originalUrl = (await original.getAttribute("href"))!;
  const download = await page.request.get(originalUrl);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-type"]).toContain(
    "application/octet-stream",
  );
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect(await download.body()).toEqual(pdf);
  expect((await request.get(originalUrl)).status()).toBe(401);

  await page.reload();
  await expect(card).toContainText("На проверке");
  await card.locator(":scope > summary").click();
  await expect(original).toHaveAttribute("href", originalUrl);
  expect(await (await page.request.get(originalUrl)).body()).toEqual(pdf);
  await card
    .getByLabel("Обоснование проверки основания")
    .fill("DEMO: отклонён учебный PDF без юридической силы; история сохранена");
  await card
    .getByRole("button", { name: "Отклонить документ", exact: true })
    .click();
  await expect(card).toContainText("Документ отклонён");
  expect((await risk()).score).toBe(before.score);
  expect((await risk()).confirmed_codes).toEqual(before.confirmed_codes);
  expect(await (await page.request.get(originalUrl)).body()).toEqual(pdf);
});
