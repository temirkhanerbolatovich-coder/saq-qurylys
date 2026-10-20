import { expect, test } from "@playwright/test";
import { login } from "./support";

test("PDF action downloads actual bytes and exposes pending/error without business commands", async ({
  page,
}) => {
  await login(page);
  const rows = await (
    await page.request.get("/api/v1/properties?page_size=1")
  ).json();
  const id = rows.items[0].id;
  await page.goto(`/properties/${id}?section=signals`);
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  const button = page.getByRole("button", {
    name: "Скачать отчёт по объекту",
    exact: true,
  });
  const download = page.waitForEvent("download");
  await button.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Подготовка файла" }),
  ).toBeVisible();
  const file = await download;
  await file.saveAs(`../output/qa/tabs-pdf-20261018/property-report.pdf`);
  expect(file.suggestedFilename()).toContain(id);
  await expect(button).toBeEnabled();
  await page.route("**/api/v1/exports/properties/*/pdf", (route) =>
    route.fulfill({
      status: 409,
      json: { error: { message: "DEMO исходный файл недоступен" } },
    }),
  );
  await button.click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "DEMO исходный файл недоступен" }),
  ).toBeVisible();
  await expect(button).toBeEnabled();
  expect(commands).toEqual([]);
});
