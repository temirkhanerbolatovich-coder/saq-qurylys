import { expect, test } from "@playwright/test";
import { login } from "./support";
import type { Property } from "../lib/types";

const sections = [
  "Обзор",
  "Основания",
  "Реклама",
  "Факторы риска",
  "Доказательства",
  "История",
  "Сигналы",
];

test("seven local sections keep drafts and files mounted; direct editor hashes restore focus without commands", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const row = (registry.items as Property[]).find((item) =>
    item.name.includes("Ертіс"),
  )!;
  const before = await (
    await page.request.get(`/api/v1/properties/${row.id}/risk`)
  ).json();
  await page.goto(
    `/properties/${row.id}?registry=${encodeURIComponent("q=Ертіс&page=1")}`,
  );
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  const nav = page.getByRole("navigation", {
    name: "Разделы карточки объекта",
  });
  await expect(nav.getByRole("link")).toHaveText(sections);
  await expect(page.locator(".factor-row")).toHaveCount(6);
  for (const link of await nav.getByRole("link").all()) {
    const target = await link.getAttribute("href");
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(target!)).toBeFocused();
    expect(
      await page.locator(target!).evaluate((element) => {
        const header = document.querySelector(".topbar")!;
        return (
          getComputedStyle(header).position !== "sticky" ||
          element.getBoundingClientRect().top >=
            header.getBoundingClientRect().bottom
        );
      }),
    ).toBe(true);
  }
  await expect(
    page.getByRole("link", { name: "Открыть версии сигналов", exact: true }),
  ).toHaveAttribute("href", `/signals?property_id=${row.id}`);
  await expect(
    page.getByRole("link", { name: "Открыть публикации объекта", exact: true }),
  ).toHaveAttribute("href", `/advertisements?property_id=${row.id}`);
  await page.getByRole("link", { name: "Проверить R4", exact: true }).click();
  await expect(page.locator("#dossier-editor-R4")).toBeFocused();
  const reason = page.locator("#appeal-reason");
  await reason.fill("DEMO Әділет: local section draft");
  await page.locator("#appeal-file").setInputFiles({
    name: "section-memory.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO selected bytes stay in memory"),
  });
  const tools = page.locator("#dossier-materials");
  await tools.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  await expect(reason).toBeHidden();
  await page.getByRole("link", { name: "Проверить R5", exact: true }).click();
  await expect(page.locator("#dossier-editor-R5")).toBeFocused();
  await expect(page.locator("#dossier-editor-R5")).toHaveAttribute("open", "");
  await expect(reason).toHaveValue("DEMO Әділет: local section draft");
  expect(
    await page
      .locator("#appeal-file")
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe("section-memory.txt");
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.locator("#dossier-editor-R5")).toBeFocused();
  await expect(reason).toHaveValue("DEMO Әділет: local section draft");
  await expect(
    page.getByText("Выберите файл повторно: section-memory.txt.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Краткий вид", exact: true }).click();
  await expect(reason).toBeHidden();
  await page
    .getByRole("button", { name: "Подробный вид", exact: true })
    .click();
  await expect(reason).toHaveValue("DEMO Әділет: local section draft");
  expect(new URL(page.url()).searchParams.get("registry")).toBe(
    "q=Ертіс&page=1",
  );
  expect(commands).toEqual([]);
  expect(
    await (await page.request.get(`/api/v1/properties/${row.id}/risk`)).json(),
  ).toEqual(before);
});

test("viewer reads all sections and requests only selected evidence; sections reflow at target widths", async ({
  page,
}) => {
  await login(page);
  const current = await (await page.request.get("/api/v1/auth/me")).json();
  // Role fixture verifies UI presentation; backend authorization is covered separately.
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...current, role: "viewer" } }),
  );
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const row = (registry.items as Property[]).find((item) =>
    item.name.includes("Бәйтерек"),
  )!;
  const detail = await (
    await page.request.get(`/api/v1/properties/${row.id}`)
  ).json();
  const factor = detail.factors.find(
    (item: { evidence_ids: string[] }) => item.evidence_ids.length > 0,
  );
  expect(factor).toBeTruthy();
  const evidenceReads: string[] = [];
  const commands: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/v1\/evidence\//.test(request.url()))
      evidenceReads.push(request.url());
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.goto(`/properties/${row.id}`);
  const nav = page.getByRole("navigation", {
    name: "Разделы карточки объекта",
  });
  await expect(nav.getByRole("link")).toHaveText(sections);
  await expect(page.locator("#dossier-materials")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Проверить R1", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Создать черновик сигнала", exact: true }),
  ).toHaveCount(0);
  expect(evidenceReads).toEqual([]);
  await page
    .locator(".factor-row")
    .filter({ has: page.getByText(factor.code, { exact: true }) })
    .getByRole("button", { name: "Доказательства", exact: true })
    .click();
  const evidence = page.locator("#dossier-evidence");
  await expect(evidence).toBeFocused();
  await expect(evidence.locator(".evidence")).toHaveCount(
    new Set(factor.evidence_ids).size,
  );
  await expect(
    evidence
      .getByRole("link", { name: "Скачать исходник", exact: true })
      .first(),
  ).toBeVisible();
  expect(evidenceReads).toHaveLength(new Set(factor.evidence_ids).size);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(nav).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/dossier-sections-20261018/dossier-${width}.png`,
      fullPage: true,
    });
    await nav.getByRole("link", { name: "Обзор", exact: true }).click();
    await page.screenshot({
      path: `../output/qa/dossier-sections-20261018/overview-${width}.png`,
    });
    expect(
      await page.locator("#dossier-summary").evaluate((element) => {
        const header = document.querySelector(".topbar")!;
        return (
          getComputedStyle(header).position !== "sticky" ||
          element.getBoundingClientRect().top >=
            header.getBoundingClientRect().bottom
        );
      }),
    ).toBe(true);
  }
  expect(commands).toEqual([]);
});
