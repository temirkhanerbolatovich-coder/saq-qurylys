import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Property } from "../lib/types";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

// Real frontend components with synthetic HTTP responses; no backend decisions.
const rows: Property[] = [
  "DEMO Өркен · очередь 1",
  "DEMO Бәйтерек · корпус Ә",
  "DEMO Восточный квартал · очередь строительства 3",
  "DEMO Самал · Ұлы дала",
  "DEMO Арман · корпус Б",
].map((name, index) => ({
  ...structuredClone(fixtureProperty),
  id: index
    ? `60000000-0000-4000-8000-00000000010${index}`
    : fixtureProperty.id,
  name,
  address: "DEMO участок · длинное название улицы для проверки переноса",
  legal_verification_status: index % 2 ? "PENDING" : "UNKNOWN",
}));

async function mount(page: Page, detailed = false) {
  const fixture = functionalSafetyFixture();
  const requests: string[] = [];
  let priorityFailed = false;
  let queueFailed = false;
  let registryTotal = rows.length;
  await page.addInitScript((mode) => {
    localStorage.setItem("saq-detailed-interface", String(mode));
  }, detailed);
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);
    let result: { status: number; json?: object } = fixture.response(
      request.method(),
      url.pathname,
    );
    if (request.method() === "GET" && url.pathname === "/api/v1/properties") {
      const priority = url.searchParams.get("order") === "work_priority";
      const q = url.searchParams.get("q") || "";
      const matched = rows.filter((row) => row.name.includes(q));
      result =
        priority && priorityFailed
          ? {
              status: 503,
              json: { error: { message: "DEMO очередь недоступна" } },
            }
          : {
              status: 200,
              json: {
                items: matched,
                total: priority || q ? matched.length : registryTotal,
                page: Number(url.searchParams.get("page") || 1),
                page_size: priority ? 5 : 25,
              },
            };
    }
    if (url.pathname.endsWith("/dashboard/summary"))
      result = {
        status: 200,
        json: {
          property_count: 5,
          zones: { GREEN: 5, YELLOW: 0, RED: 0 },
          new_advertisements: 8,
          pending_hypotheses: 0,
          pending_signals: 2,
          unknown_legal_bases: 5,
          calculated_at: fixtureProperty.risk.as_of,
        },
      };
    if (url.pathname.endsWith("/advertisements/review-queue"))
      result = queueFailed
        ? {
            status: 503,
            json: { error: { message: "DEMO решения недоступны" } },
          }
        : { ...result, json: { ...result.json, total: 3 } };
    if (url.searchParams.get("status") === "FAILED")
      result = { ...result, json: { ...result.json, total: 1 } };
    await route.fulfill(result);
  });
  return {
    fixture,
    requests,
    failPriority(value: boolean) {
      priorityFailed = value;
    },
    failQueue(value: boolean) {
      queueFailed = value;
    },
    setRegistryTotal(value: number) {
      registryTotal = value;
    },
  };
}

async function noOverflow(page: Page, width: number) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(width);
}

for (const detailed of [false, true]) {
  test(`approved composition ${detailed ? "detailed" : "brief"} preserves server order, states and responsive content`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const state = await mount(page, detailed);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    const folder = path.resolve("../output/qa/analyst-composition-20261019");
    await mkdir(folder, { recursive: true });
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/dashboard");
      await expect(page.locator(".priority-list .object-name")).toHaveText(
        rows.slice(0, detailed ? 5 : 3).map((row) => row.name),
      );
      await expect(page.locator(".action-queue .rail-number")).toHaveText([
        "8",
        "3",
        "1",
        "2",
      ]);
      const priority = await page.locator(".priority-panel").boundingBox();
      const analytics = await page
        .locator(".dashboard-publication-overview")
        .boundingBox();
      expect(priority!.y).toBeLessThan(analytics!.y);
      if (width < 640) {
        const action = page.locator(".priority-action").first();
        const risk = await action.locator(".property-risk").boundingBox();
        const link = await action.getByRole("link").boundingBox();
        expect(link!.y).toBeGreaterThanOrEqual(risk!.y + risk!.height);
        expect(link!.height).toBeGreaterThanOrEqual(44);
      }
      await expect(
        page
          .getByRole("navigation", { name: "Основная навигация" })
          .getByRole("link"),
      ).toHaveCount(5);
      await noOverflow(page, width);
      await page.screenshot({
        path: path.join(
          folder,
          `overview-${detailed ? "detailed" : "brief"}-${width}.png`,
        ),
        fullPage: true,
      });
      await page.goto("/properties");
      await expect(
        page.getByRole("status").filter({ hasText: "Найдено объектов: 5" }),
      ).toBeVisible();
      const phoneCards = !detailed && width < 640;
      await expect(page.locator("#property-list table")).toBeVisible({
        visible: !phoneCards,
      });
      await expect(page.locator(".registry-phone-cards")).toBeVisible({
        visible: phoneCards,
      });
      const branch = page.locator(
        phoneCards ? ".registry-phone-cards" : "#property-list table",
      );
      await expect(branch).toContainText("Основание не проверено");
      await expect(branch).toContainText("ожидает решения");
      await expect(branch).toContainText("DEMO");
      if (width === 1440)
        expect(
          await page
            .locator("#property-list .table-scroll")
            .evaluate((element) => element.scrollWidth - element.clientWidth),
        ).toBeLessThanOrEqual(1);
      await noOverflow(page, width);
      await page.screenshot({
        path: path.join(
          folder,
          `registry-${detailed ? "detailed" : "brief"}-${width}.png`,
        ),
        fullPage: true,
      });
      await page.goto(`/properties/${fixtureProperty.id}`);
      await expect(
        page.getByRole("heading", { name: "Сведения об объекте" }),
      ).toBeVisible();
      await expect(page.getByRole("tab")).toHaveCount(6);
      await expect(page.locator(".dossier-next-action dt").first()).toHaveText(
        "Что сделать дальше",
      );
      await expect(page.locator(".dossier-next-action")).toContainText(
        "Неизвестность не подтверждает нарушение",
      );
      if (width < 1024) {
        const next = await page.locator(".dossier-next-action").boundingBox();
        const facts = await page.locator(".dossier-object-facts").boundingBox();
        expect(next!.y).toBeLessThan(facts!.y);
      }
      await noOverflow(page, width);
      await page.screenshot({
        path: path.join(
          folder,
          `dossier-${detailed ? "detailed" : "brief"}-${width}.png`,
        ),
        fullPage: true,
      });
      const overview = page.getByRole("tab", { name: "Обзор", exact: true });
      await overview.focus();
      await page.keyboard.press("End");
      await expect(
        page.getByRole("tab", { name: "История", exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole("tab", { name: "История", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("Home");
      await expect(overview).toBeFocused();
      await expect(overview).toHaveAttribute("aria-selected", "true");
    }
    expect(errors).toEqual([]);
    expect(state.fixture.writes).toEqual([]);
    expect(
      state.requests.filter((request) => request.startsWith("POST")),
    ).toEqual([]);
    // Development StrictMode may repeat effects; every read must use server priority.
    const priorityReads = state.requests.filter((request) =>
      request.includes("order="),
    );
    expect(priorityReads.length).toBeGreaterThanOrEqual(4);
    expect([...new Set(priorityReads)]).toEqual([
      "GET /api/v1/properties?order=work_priority&page_size=5",
    ]);
  });
}

for (const width of [375, 1440]) {
  test(`registry restores search and visible focus at ${width}px`, async ({
    page,
  }) => {
    const state = await mount(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/properties");
    const search = page.getByLabel("Поиск ЖК или адреса, застройщика или БИН", {
      exact: true,
    });
    await search.fill("Өркен");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=/);
    await expect(page.locator(".list-caption")).toContainText(
      "Найдено объектов: 1",
    );
    const object = page.getByRole("link", { name: rows[0].name, exact: true });
    await object.click();
    await expect(
      page.getByRole("heading", { name: fixtureProperty.name, exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "К реестру", exact: true }).click();
    await expect(search).toHaveValue("Өркен");
    await expect(object).toBeFocused();
    await page.reload();
    await expect(search).toHaveValue("Өркен");
    await expect(object).toBeFocused();
    expect(state.fixture.writes).toEqual([]);
  });
}

test("independent queue failures retain unknown counts, navigation, retry and empty priority state", async ({
  page,
}) => {
  const state = await mount(page);
  state.failPriority(true);
  state.failQueue(true);
  await page.goto("/dashboard");
  await expect(
    page.locator(".priority-panel").getByRole("alert"),
  ).toContainText("DEMO очередь недоступна");
  const queue = page
    .locator(".action-queue")
    .filter({ hasText: "Материалы с нерешёнными действиями" });
  await expect(queue.locator(".rail-number")).toHaveText("—");
  await expect(
    page.getByRole("link", { name: "Открыть очередь решений", exact: true }),
  ).toHaveAttribute("href", "/review?queue=actions");
  await expect(
    page.locator(".action-queue").last().locator(".rail-number"),
  ).toHaveText("2");
  state.failQueue(false);
  await queue
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(queue.locator(".rail-number")).toHaveText("3");
  state.failPriority(false);
  await page
    .locator(".priority-panel")
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.locator(".priority-list li")).toHaveCount(3);
  await page.route(
    "**/api/v1/properties?order=work_priority&page_size=5",
    (route) =>
      route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 5 } }),
  );
  await page.reload();
  await expect(page.locator(".priority-panel .empty")).toBeVisible();
  await expect(page.locator(".priority-panel")).toContainText(
    "Показано 0 из 0",
  );
  expect(state.fixture.writes).toEqual([]);
});

test("registry pagination preserves its map mode and viewer remains read-only", async ({
  page,
}) => {
  const state = await mount(page);
  state.setRegistryTotal(28);
  state.fixture.setActor({ ...fixtureUser, role: "viewer" });
  await page.goto("/properties?view=map");
  await expect(
    page.getByRole("button", { name: "Карта и список", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Следующая", exact: true }).click();
  await expect(page).toHaveURL(/view=map.*page=2/);
  await expect(page.locator(".list-caption")).toContainText(
    "Найдено объектов: 28",
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: "Добавить публикацию", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Открыть публикации", exact: true }),
  ).toBeVisible();
  expect(state.fixture.writes).toEqual([]);
});

test("light navigation has readable text and visible keyboard focus", async ({
  page,
}) => {
  await mount(page);
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(nav).toBeVisible();
  const ratio = await page.locator(".user strong").evaluate((element) => {
    function luminance(color: string) {
      const values = (color.match(/[\d.]+/g) || []).slice(0, 3).map((value) => {
        const c = Number(value) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    }
    const foreground = luminance(getComputedStyle(element).color);
    const background = luminance(
      getComputedStyle(element.closest(".topbar")!).backgroundColor,
    );
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
  const first = nav.getByRole("link").first();
  await first.focus();
  await expect(first).toBeFocused();
  const focus = await first.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
      height: element.getBoundingClientRect().height,
    };
  });
  expect(focus.outline).not.toBe("none");
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.height).toBeGreaterThanOrEqual(44);
});

test("dense confirmed reasons retain every code, legal status, date and readable columns", async ({
  page,
}) => {
  const state = await mount(page, true);
  const codes = ["R1", "R2", "R3", "R4", "R5", "R6"];
  const row: Property = {
    ...structuredClone(fixtureProperty),
    name: "DEMO ЖК Ә Ғ Қ Ң Ө Ұ Ү Һ І · длинное название очереди строительства",
    legal_verification_status: "VERIFIED_ABSENT",
    last_reviewed_at: fixtureProperty.risk.as_of,
    risk: {
      ...structuredClone(fixtureProperty.risk),
      score: 100,
      zone: "RED",
      confirmed_codes: codes,
      unknown_codes: [],
    },
  };
  await page.route("**/api/v1/properties?*", (route) =>
    route.fulfill({ json: { items: [row], total: 1, page: 1, page_size: 25 } }),
  );
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/properties");
    await expect(page.getByRole("columnheader")).toHaveCount(6);
    const reasons = page.locator("#property-list .factor-codes b");
    await expect(reasons).toHaveText(codes);
    await expect(page.locator("#property-list table")).toContainText(
      "Отсутствие установлено",
    );
    await expect(page.locator("#property-list .zone strong")).toHaveText("100");
    await expect(page.locator("#property-list .date-cell")).not.toHaveText(
      "Не установлена",
    );
    const region = page.getByRole("region", {
      name: "Реестр объектов — таблица с горизонтальной прокруткой",
    });
    await region.focus();
    await expect(region).toBeFocused();
    await noOverflow(page, width);
  }
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.getByRole("button", { name: "Краткий вид", exact: true }).click();
  for (const code of codes)
    await expect(
      page.locator(".registry-phone-cards .property-card-reason"),
    ).toContainText(`${code} ·`);
  await noOverflow(page, 375);
  expect(state.fixture.writes).toEqual([]);
});
