import { expect, test } from "@playwright/test";
import { login } from "./support";
import type { PropertyDetail } from "../lib/types";

test("document archive searches, filters and pages mounted forms; legacy document link reveals its page", async ({
  page,
}) => {
  await login(page);
  const rows = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  let detail: PropertyDetail | undefined;
  for (const row of rows.items) {
    const value = await (
      await page.request.get(`/api/v1/properties/${row.id}`)
    ).json();
    if (value.legal_bases.length) {
      detail = value;
      break;
    }
  }
  expect(detail).toBeTruthy();
  if (!detail) throw new Error("A saved document fixture is required");
  const original = detail.legal_bases[0];
  const bases = Array.from({ length: 25 }, (_, index) => ({
    ...original,
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    document_number: `DEMO №${index + 1} Әділет`,
    verification_status: "PENDING",
    // This presentation-only decision form needs an evidence reference, even on a clean seed.
    evidence_ids: ["20000000-0000-4000-8000-000000000001"],
    revision: 1,
  }));
  // Large-archive presentation fixture; no evidence or business command is created.
  await page.route(`**/api/v1/properties/${detail.property.id}`, (route) =>
    route.fulfill({ json: { ...detail, legal_bases: bases } }),
  );
  await page.goto(`/properties/${detail.property.id}?section=documents`);
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  const cards = page.locator(".dossier-document:visible");
  await expect(cards).toHaveCount(10);
  await cards.first().locator(":scope > summary").click();
  const reason = cards
    .first()
    .getByLabel("Обоснование проверки основания", { exact: true });
  await reason.fill("DEMO сохраняется при фильтре и странице");
  const pages = page.getByRole("navigation", { name: "Страницы документов" });
  await pages.getByRole("button", { name: "Следующая страница" }).click();
  await expect(cards.first()).toContainText("DEMO №11");
  await pages.getByRole("button", { name: "Предыдущая страница" }).click();
  await expect(reason).toHaveValue("DEMO сохраняется при фильтре и странице");
  await page.getByLabel("Найти документ", { exact: true }).fill("№25");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("DEMO №25");
  await page.getByRole("tab", { name: "Обзор", exact: true }).click();
  await page.getByRole("tab", { name: "Документы", exact: true }).click();
  await expect(page.getByLabel("Найти документ", { exact: true })).toHaveValue(
    "№25",
  );
  await page.getByLabel("Найти документ", { exact: true }).fill("");
  await page
    .getByLabel("Статус документа", { exact: true })
    .selectOption("VERIFIED_VALID");
  await expect(cards).toHaveCount(0);
  await page.evaluate((id) => {
    window.location.hash = `dossier-document-${id}`;
  }, bases[24].id);
  await expect(page.locator(`#dossier-document-${bases[24].id}`)).toBeFocused();
  await expect(page.locator(`#dossier-document-${bases[24].id}`)).toBeVisible();
  await expect(pages.getByRole("status")).toHaveText("Страница 3 из 3");
  expect(commands).toEqual([]);
});
