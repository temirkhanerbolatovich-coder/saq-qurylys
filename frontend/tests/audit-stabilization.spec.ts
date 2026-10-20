import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { login, testOrigin } from "./support";
import type { RegistrySnapshot } from "../lib/monitoring-types";

test("registry coalesces text filters without losing either field or Enter/reset context", async ({
  page,
}) => {
  await login(page);
  await page.goto("/properties?view=map&page=2&page_size=2");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const requests: URL[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/properties") requests.push(url);
  });
  const input = page.getByLabel("Поиск ЖК или адреса");
  const city = page.getByLabel("Фильтр по городу");
  // Keep the debounce interval deterministic even on a busy native-PDF runner.
  await page.clock.install({ time: new Date("2026-10-20T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-20T00:00:01Z"));
  await input.pressSequentially("DEMO", { delay: 15 });
  await city.fill("Усть-Каменогорск");
  expect(requests).toHaveLength(0);
  await page.clock.fastForward(351);
  await page.clock.resume();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("city"))
    .toBe("Усть-Каменогорск");
  expect(new URL(page.url()).searchParams.get("q")).toBe("DEMO");
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  expect(new URL(page.url()).searchParams.get("view")).toBe("map");
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  // StrictMode can repeat reads; every read must use the complete merged filter.
  expect(new Set(requests.map((url) => url.search)).size).toBe(1);
  expect(requests[0].searchParams.get("city")).toBe("Усть-Каменогорск");
  await input.fill("Самал");
  await input.press("Enter");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("Самал");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await expect(city).toHaveValue("");
  await expect(input).toBeFocused();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("city"))
    .toBeNull();
  await page.reload();
  await expect(input).toHaveValue("");
  expect(new URL(page.url()).searchParams.get("q")).toBeNull();
});

test("mobile search opens with focus, Escape closes it, and GREEN retains an explicit unknown basis", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const rows = (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items;
  const row = rows.find(
    (item: { legal_verification_status: string; risk: { zone: string } }) =>
      item.risk.zone === "GREEN" &&
      item.legal_verification_status === "UNKNOWN",
  );
  expect(row).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/properties/${row.id}`);
  const search = page.getByRole("search", {
    name: "Поиск объекта",
    exact: true,
  });
  const toggle = page.getByRole("button", { name: "Поиск", exact: true });
  await expect(search).toBeHidden();
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(search.getByRole("searchbox")).toBeFocused();
  await search.getByRole("searchbox").fill("Өскемен");
  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(
    page.locator(".dossier-compact-state .property-risk-context"),
  ).toHaveText("Основание не проверено");
  await expect(page.locator(".dossier-compact-state .zone strong")).toHaveText(
    String(row.risk.score),
  );
  await toggle.click();
  await expect(search.getByRole("searchbox")).toHaveValue("Өскемен");
  await search.getByRole("searchbox").press("Enter");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("Өскемен");
  await expect(search).toBeHidden();
  expect(commands).toEqual([]);
});

test("version chooser pages complete registry and retains readable selection, reason and command boundary", async ({
  page,
}) => {
  await login(page);
  const advertisements = (
    await (
      await page.request.get("/api/v1/advertisements?is_demo=true&page_size=1")
    ).json()
  ).items;
  expect(advertisements.length).toBeGreaterThan(0);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const created = await page.request.post("/api/v1/monitoring/candidates", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      advertisement_id: advertisements[0].id,
      name: `DEMO выбор версии ${Date.now()}`,
      city: "Өскемен",
      address: null,
      phase: null,
      reason: "DEMO isolated chooser acceptance",
    },
  });
  expect(created.status()).toBe(201);
  const candidate = await created.json();
  // This presentation fixture must work before other monitoring tests create versions.
  const target: RegistrySnapshot = {
    id: crypto.randomUUID(),
    label: "DEMO Өскемен · проверенная учебная версия",
    city: "Өскемен",
    is_demo: true,
    coverage_from: "2026-10-17T00:00:00Z",
    coverage_until: "2026-10-19T00:00:00Z",
    expires_at: "2026-10-25T00:00:00Z",
    complete: false,
    entries: [],
    created_at: "2026-10-18T00:00:00Z",
    created_by: "70000000-0000-4000-8000-000000000001",
    sha256: "0".repeat(64),
  };
  const items = [
    ...Array.from({ length: 100 }, (_, index) => ({
      ...target,
      id: `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      label: `DEMO версия ${index}`,
    })),
    target,
  ];
  let failed = false;
  await page.route("**/api/v1/monitoring/registry-snapshots?*", (route) => {
    if (failed)
      return route.fulfill({
        status: 503,
        json: { error: { message: "DEMO версии недоступны" } },
      });
    const number = Number(
      new URL(route.request().url()).searchParams.get("page") || 1,
    );
    return route.fulfill({
      json: {
        items: items.slice((number - 1) * 10, number * 10),
        total: items.length,
        page: number,
        page_size: 10,
      },
    });
  });
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.goto(`/monitoring?candidate_id=${candidate.id}&snapshot_page=11`);
  const chooser = page.getByRole("region", {
    name: "Выбор версии реестра",
    exact: true,
  });
  const reason = page.getByRole("textbox", {
    name: "Основание запуска сверки",
    exact: true,
  });
  await reason.fill("DEMO неотправленный комментарий");
  await chooser
    .getByRole("combobox", { name: "DEMO-версия реестра", exact: true })
    .selectOption(target.id);
  await expect(
    chooser.getByRole("status").filter({ hasText: target.label }),
  ).toBeVisible();
  await expect(chooser).toContainText("Охват:");
  await expect(chooser).toContainText("Пригоден до:");
  const pages = chooser.getByRole("navigation", {
    name: "Страницы выбора версии реестра",
    exact: true,
  });
  await pages
    .getByRole("button", { name: "Предыдущая страница", exact: true })
    .click();
  await expect(
    chooser.getByText("Страница 10 из 11", { exact: true }),
  ).toBeVisible();
  await expect(
    chooser.getByRole("combobox", { name: "DEMO-версия реестра", exact: true }),
  ).toHaveValue(target.id);
  await expect(
    chooser.getByRole("status").filter({ hasText: target.label }),
  ).toBeVisible();
  failed = true;
  await pages
    .getByRole("button", { name: "Предыдущая страница", exact: true })
    .click();
  await expect(chooser.getByRole("alert")).toContainText("версии недоступны");
  failed = false;
  await chooser
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(
    chooser.getByText("Страница 9 из 11", { exact: true }),
  ).toBeVisible();
  await expect(reason).toHaveValue("DEMO неотправленный комментарий");
  expect(commands).toEqual([]);
});

test("stabilized dossier reflows in both modes and exposes real content on mobile", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page, { detailed: false });
  const rows = (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items;
  const row = rows.find(
    (item: { legal_verification_status: string; risk: { zone: string } }) =>
      item.risk.zone === "GREEN" &&
      item.legal_verification_status === "UNKNOWN",
  );
  const folder = path.resolve("../output/qa/audit-stabilization-20261018");
  await mkdir(folder, { recursive: true });
  const observations: object[] = [];
  const errors: string[] = [];
  const commands: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const detailed of [false, true]) {
    const toggle = page.locator(".interface-toggle");
    if ((await toggle.getAttribute("aria-pressed")) !== String(detailed))
      await toggle.click();
    for (const width of [360, 375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/properties/${row.id}`);
      await expect(toggle).toHaveAttribute("aria-pressed", String(detailed));
      await expect(
        page.getByRole("heading", { name: "Обзор", exact: true }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      const contentTop = (await page.locator("#dossier-summary").boundingBox())!
        .y;
      expect(overflow).toBeLessThanOrEqual(1);
      if (width === 390) expect(contentTop).toBeLessThan(844);
      const mode = detailed ? "detailed" : "simple";
      await page.screenshot({
        path: path.join(folder, `${mode}-${width}.png`),
        fullPage: true,
      });
      observations.push({ mode, width, overflow, contentTop });
    }
  }
  await writeFile(
    path.join(folder, "observations.json"),
    JSON.stringify({ observations, errors, commands }, null, 2),
  );
  expect(errors).toEqual([]);
  expect(commands).toEqual([]);
});
