import { expect, test, type Page } from "@playwright/test";
import { login } from "./support";
import type { Property } from "../lib/types";

async function properties(page: Page) {
  return (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items as Property[];
}

async function leaveAndReturn(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Объекты", exact: true })
    .click();
  await page.getByRole("link", { name, exact: true }).first().click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

test("dossier fields and files survive other objects and Back; reload explains missing files without commands", async ({
  page,
}) => {
  await login(page);
  const rows = await properties(page);
  const row = rows.find((item) => item.name.includes("Ертіс"))!;
  const other = rows.find((item) => item.name.includes("Нұрлы"))!;
  await page.goto(`/properties/${row.id}`);
  await expect(page.locator("#appeal-reason")).toBeVisible();
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  const fields: Record<string, string> = {
    "appeal-reason": "DEMO RU/KZ: себепті тексеру",
    "appeal-source": "DEMO dossier source",
    "appeal-date": "2026-10-13T12:00",
    "appeal-count": "3",
    "appeal-method": "DEMO methodology",
    "absence-source": "DEMO R1 source",
    "absence-decision-reason": "DEMO R1 draft",
    "absence-scope": "DEMO очередь 1",
    "absence-as-of": "2026-10-13T12:00",
    "absence-check-reason-KZHK_GUARANTEE": "DEMO source unavailable",
    "r5-comparison": "DEMO comparison scope",
    "r5-declared": "70",
    "r5-verified": "40",
    "R5-reason": "DEMO R5 draft",
    "r6-planned": "2026-10-12T12:00",
    "r6-actual": "2026-10-13T12:00",
    "R6-reason": "DEMO R6 draft",
    "basis-source": "DEMO basis source",
    "basis-scope": "DEMO basis scope",
    "basis-from": "2026-10-13T12:00",
  };
  await page
    .getByText("Проверить три механизма на дату", { exact: true })
    .click();
  await page.locator('[data-testid="construction-R5"] > summary').click();
  await page.locator('[data-testid="construction-R6"] > summary').click();
  await page.locator("#r6-status").selectOption("COMPLETED_LATE");
  await page
    .getByText("Ввести реквизиты и загрузить документ", { exact: true })
    .click();
  await page
    .locator("#absence-result-KZHK_GUARANTEE")
    .selectOption("UNAVAILABLE");
  for (const [id, value] of Object.entries(fields))
    await page.locator(`#${id}`).fill(value);
  const fileContent = "PRIVATE FILE CONTENT ONLY IN MEMORY 54321";
  await page.locator("#appeal-file").setInputFiles({
    name: "dossier-private.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(fileContent),
  });
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...sessionStorage }),
  );
  expect(stored).not.toContain(fileContent);

  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Объекты", exact: true })
    .click();
  await page
    .getByRole("link", { name: other.name, exact: true })
    .first()
    .click();
  await expect(page.locator("#appeal-reason")).toHaveValue("");
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/properties/${row.id}`));
  for (const [id, value] of Object.entries(fields))
    await expect(page.locator(`#${id}`)).toHaveValue(value);
  await expect(page.locator("#r6-status")).toHaveValue("COMPLETED_LATE");
  await expect(page.locator("#absence-result-KZHK_GUARANTEE")).toHaveValue(
    "UNAVAILABLE",
  );
  expect(
    await page
      .locator("#appeal-file")
      .evaluate((input: HTMLInputElement) =>
        Array.from(input.files || []).map((file) => file.name),
      ),
  ).toEqual(["dossier-private.txt"]);

  let reloadWarned = false;
  page.on("dialog", (dialog) => {
    if (dialog.type() === "beforeunload") reloadWarned = true;
    return dialog.accept();
  });
  await page.reload();
  expect(reloadWarned).toBe(true);
  for (const [id, value] of Object.entries(fields))
    await expect(page.locator(`#${id}`)).toHaveValue(value);
  await expect(
    page.getByText("Выберите файл повторно: dossier-private.txt."),
  ).toBeVisible();
  expect(
    await page
      .locator("#appeal-file")
      .evaluate((input: HTMLInputElement) => input.files?.length),
  ).toBe(0);
  expect(commands).toEqual([]);
});

test("R4 conflict keeps input and retry key through navigation; successful decision clears the draft", async ({
  page,
}) => {
  await login(page);
  const row = (await properties(page)).find((item) =>
    item.name.includes("Самал"),
  )!;
  await page.goto(`/properties/${row.id}`);
  await page.locator("#appeal-source").fill("DEMO draft conflict source");
  await page.locator("#appeal-file").setInputFiles({
    name: "appeal-draft.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO collective appeal, two fictional signatories"),
  });
  await page.locator("#appeal-date").fill("2026-10-13T12:00");
  await page.locator("#appeal-count").fill("2");
  await page
    .locator("#appeal-method")
    .fill("DEMO two synthetic signatories checked");
  await page.locator("#appeal-reason").fill("DEMO initial document capture");
  const captured = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/evidence") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Сохранить документ обращения", exact: true })
    .click();
  const newEvidenceId = (await (await captured).json()).id;
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Документ и доказательство сохранены" }),
  ).toBeVisible();
  const keys: string[] = [];
  const targets: string[][] = [];
  await page.route("**/api/v1/risk-factors/*/review", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    targets.push(route.request().postDataJSON().evidence_ids);
    if (keys.length <= 2)
      await route.fulfill({
        status: 409,
        json: { error: { message: "DEMO conflict" } },
      });
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Подтвердить R4 · +15", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "DEMO conflict" }),
  ).toBeVisible();
  await leaveAndReturn(page, row.name);
  await expect(page.locator("#appeal-reason")).toHaveValue(
    "DEMO initial document capture",
  );
  await page
    .getByRole("button", { name: "Подтвердить R4 · +15", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "DEMO conflict" }),
  ).toBeVisible();
  expect(keys[1]).toBe(keys[0]);
  await page
    .locator("#appeal-reason")
    .fill("DEMO revised review after conflict");
  await leaveAndReturn(page, row.name);
  await expect(page.locator("#appeal-reason")).toHaveValue(
    "DEMO revised review after conflict",
  );
  await page
    .getByRole("button", { name: "Подтвердить R4 · +15", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "R4 подтверждён" }),
  ).toBeVisible();
  expect(keys).toHaveLength(3);
  expect(keys[2]).not.toBe(keys[1]);
  expect(targets).toEqual([[newEvidenceId], [newEvidenceId], [newEvidenceId]]);
  // Leave the isolated DEMO factor rejected for the rest of the suite.
  await page.getByRole("button", { name: "Отклонить R4", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "R4 отклонён" }),
  ).toBeVisible();
  await leaveAndReturn(page, row.name);
  await expect(page.locator("#appeal-reason")).toHaveValue("");
  await page
    .locator("#appeal-source")
    .fill("DEMO new document not yet uploaded");
  await page
    .locator("#appeal-reason")
    .fill("DEMO reject old factor, retain new capture");
  await expect(
    page.getByRole("button", { name: "Подтвердить R4 · +15", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Отклонить R4", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "R4 отклонён" }),
  ).toBeVisible();
  await leaveAndReturn(page, row.name);
  await expect(page.locator("#appeal-source")).toHaveValue(
    "DEMO new document not yet uploaded",
  );
  await expect(
    page.getByRole("button", { name: "Подтвердить R4 · +15", exact: true }),
  ).toBeDisabled();
});

test("logout clears dossier text and in-memory selected files", async ({
  page,
}) => {
  await login(page);
  const row = (await properties(page)).find((item) =>
    item.name.includes("Ертіс"),
  )!;
  await page.goto(`/properties/${row.id}`);
  await page.locator("#appeal-reason").fill("DEMO private draft before logout");
  await page.locator("#appeal-file").setInputFiles({
    name: "logout-private.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO discarded at logout"),
  });
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith("saq:review-draft:"),
      ),
    ),
  ).toEqual([]);
  await login(page);
  await page.goto(`/properties/${row.id}`);
  await expect(page.locator("#appeal-reason")).toHaveValue("");
  expect(
    await page
      .locator("#appeal-file")
      .evaluate((input: HTMLInputElement) => input.files?.length),
  ).toBe(0);
});

test("legal basis decision restores its own reason and date after navigation and a newer revision without submitting", async ({
  page,
}) => {
  await login(page);
  const row = (await properties(page)).find((item) =>
    item.name.includes("Өркен"),
  )!;
  let revision = 1;
  // Presentation-only evidence fixture exposes seed document controls; no decision is sent.
  await page.route(`**/api/v1/properties/${row.id}`, async (route) => {
    const response = await route.fetch();
    const detail = await response.json();
    expect(detail.legal_bases.length).toBeGreaterThan(0);
    detail.legal_bases[0].evidence_ids = [
      "10000000-0000-4000-8000-000000000001",
    ];
    detail.legal_bases[0].revision = revision;
    await route.fulfill({ response, json: detail });
  });
  await page.goto(`/properties/${row.id}`);
  const reason = page
    .getByLabel("Обоснование проверки основания", { exact: true })
    .first();
  const asOf = page
    .getByLabel("Дата проверки применимости · +05:00", { exact: true })
    .first();
  await reason.fill("DEMO basis review stays a draft after revision change");
  await asOf.fill("2026-10-13T12:00");
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  revision = 2;
  await leaveAndReturn(page, row.name);
  await expect(reason).toHaveValue(
    "DEMO basis review stays a draft after revision change",
  );
  await expect(asOf).toHaveValue("2026-10-13T12:00");
  await expect(
    page
      .getByText("Восстановлен несохранённый ввод этой формы.", { exact: true })
      .first(),
  ).toBeVisible();
  expect(commands).toEqual([]);
});
