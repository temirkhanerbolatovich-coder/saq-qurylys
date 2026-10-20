import { expect, test, type Page } from "@playwright/test";
import type { PropertyDetail } from "../lib/types";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

const otherId = "80000000-0000-4000-8000-000000000002";
const savedAt = "2026-10-20T10:00:00+05:00";
const firstName = "DEMO SQ08 первое досье · Бірінші кезек";
const secondName = "DEMO SQ08 другое досье · Екінші кезек";
const documentId = (index: number) =>
  `80000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`;
type Read = { method: string; path: string; query: string };
const section = (page: Page, id: string) =>
  page.locator(`#dossier-panel-${id}`);

async function mount(page: Page) {
  const fixture = functionalSafetyFixture();
  fixture.detail.property.name = firstName;
  fixture.detail.property.parent_id = otherId;
  fixture.detail.legal_bases = Array.from({ length: 12 }, (_, index) => ({
    id: documentId(index),
    mechanism: "KZHK_GUARANTEE",
    document_number: `DEMO lazy document ${String(index + 1).padStart(2, "0")}`,
    document_date: "2026-10-01",
    issuer: "DEMO сохранённый источник",
    scope_description: "DEMO отдельная очередь · өзгермеген дерек",
    asset_id: "80000000-0000-4000-8000-000000000003",
    is_demo: true,
    revision: 1,
    verification_status: "PENDING",
    applies_from: null,
    applies_until: null,
    verification_as_of: null,
    reviewed_at: null,
    reviewed_by: null,
    evidence_ids: [],
  }));
  const other: PropertyDetail = {
    ...structuredClone(fixture.detail),
    property: {
      ...structuredClone(fixture.detail.property),
      id: otherId,
      parent_id: null,
      name: secondName,
    },
    factors: [],
    legal_bases: [],
    advertisement_ids: [],
    unknown_information: [],
  };
  const reads: Read[] = [];
  const state = { failHistory: false };
  const dataPage = (
    items: unknown[],
    current = 1,
    size = 10,
    total = items.length,
  ) => ({ items, total, page: current, page_size: size });
  await page.addInitScript(() => {
    localStorage.setItem("saq-locale", "ru");
    localStorage.setItem("saq-detailed-interface", "true");
  });
  await page.route("**/api/v1/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    reads.push({ method: request.method(), path, query: url.search });
    if (path === `/api/v1/properties/${otherId}`)
      return route.fulfill({ json: other });
    if (path.endsWith("/provenance")) return route.fulfill({ json: null });
    if (path.endsWith("/structure")) {
      const ancestors = path.includes(fixtureProperty.id)
        ? [other.property]
        : [];
      return route.fulfill({
        json: { ancestors, children: dataPage([]), siblings: dataPage([]) },
      });
    }
    if (path.endsWith("/audit")) {
      if (state.failHistory)
        return route.fulfill({
          status: 503,
          json: {
            error: { message: "DEMO lazy history temporarily unavailable" },
          },
        });
      const current = Number(url.searchParams.get("page") || 1);
      const event = {
        id: `80000000-0000-4000-8000-${String(current + 200).padStart(12, "0")}`,
        actor_id: fixtureUser.id,
        actor_display_name: "DEMO сохранённый аналитик",
        occurred_at: savedAt,
        action: "DEMO_SEEDED",
        entity_type: "properties",
        entity_id: path.includes(otherId) ? otherId : fixtureProperty.id,
        old_revision: null,
        new_revision: 1,
        reason: path.includes(otherId)
          ? "DEMO SECOND history"
          : `DEMO FIRST history page ${current}`,
        request_id: "80000000-0000-4000-8000-000000000004",
        details: {},
      };
      return route.fulfill({
        json: dataPage(
          [event],
          current,
          Number(url.searchParams.get("page_size") || 10),
          21,
        ),
      });
    }
    if (path === "/api/v1/advertisements") {
      const prop = url.searchParams.get("property_id");
      return route.fulfill({
        json: dataPage(
          [
            {
              id: "80000000-0000-4000-8000-000000000005",
              revision: 1,
              latest_job_id: null,
              original_text: "DEMO исходник · түпнұсқа",
              source_label:
                prop === otherId
                  ? "DEMO SECOND publication"
                  : "DEMO FIRST publication",
              source_url: null,
              published_at: savedAt,
              captured_at: savedAt,
              status: "READY_FOR_REVIEW",
              assets: [],
              is_demo: true,
              confirmed_property_id: prop,
            },
          ],
          1,
          Number(url.searchParams.get("page_size") || 10),
        ),
      });
    }
    if (path === "/api/v1/signals") {
      const signal = {
        ...fixture.signals[0].signal,
        property_id: url.searchParams.get("property_id") || fixtureProperty.id,
      };
      return route.fulfill({ json: dataPage([signal]) });
    }
    return route.fulfill(fixture.response(request.method(), path));
  });
  return { fixture, other, reads, state };
}

function secondary(reads: Read[]) {
  return reads.filter(
    (read) =>
      read.path.endsWith("/audit") ||
      ["/api/v1/advertisements", "/api/v1/signals"].includes(read.path) ||
      /^\/api\/v1\/(?:evidence|exports)\//.test(read.path),
  );
}

async function openSection(page: Page, id: string) {
  await page.locator(`#dossier-tab-${id}`).click();
  await expect(section(page, id)).toBeVisible();
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
}

test("SQ08 initial overview loads visible context without hidden secondary data or commands", async ({
  page,
}) => {
  const { reads } = await mount(page);
  await page.goto(`/properties/${fixtureProperty.id}`);
  await expect(
    page.getByRole("heading", { name: firstName, exact: true }),
  ).toBeVisible();
  await settle(page);
  expect(secondary(reads)).toEqual([]);
  expect(reads.every((read) => read.method === "GET")).toBe(true);
  expect(
    reads.filter(
      (read) => read.path === `/api/v1/properties/${fixtureProperty.id}`,
    ),
  ).toHaveLength(1);
  expect(reads.some((read) => read.path.endsWith("/provenance"))).toBe(true);
  // Structure is visible header context; it is deliberately allowed at first read.
  expect(
    reads.every(
      (read) =>
        /\/auth\/|\/provenance$|\/structure$/.test(read.path) ||
        read.path === `/api/v1/properties/${fixtureProperty.id}`,
    ),
  ).toBe(true);
  await expect(page.locator("#appeal-reason")).toHaveCount(0);
  await expect(page.locator("#basis-mechanism")).toHaveCount(0);
});

test("SQ08 each secondary section fetches on first visit and revisits preserve its mounted data", async ({
  page,
}) => {
  const { reads } = await mount(page);
  await page.goto(`/properties/${fixtureProperty.id}`);
  await settle(page);
  expect(secondary(reads)).toEqual([]);
  for (const tab of ["publications", "signals", "history"] as const) {
    const before = secondary(reads).length;
    await openSection(page, tab);
    if (tab === "publications")
      await expect(section(page, tab)).toContainText("DEMO FIRST publication");
    if (tab === "signals")
      await expect(section(page, tab).locator(".object-records")).toBeVisible();
    if (tab === "history")
      await expect(section(page, tab)).toContainText(
        "DEMO FIRST history page 1",
      );
    await settle(page);
    expect(secondary(reads).length).toBeGreaterThan(before);
    const loaded = secondary(reads).map((read) => `${read.path}${read.query}`);
    await openSection(page, "overview");
    await openSection(page, tab);
    await settle(page);
    expect(secondary(reads).map((read) => `${read.path}${read.query}`)).toEqual(
      loaded,
    );
  }
  expect(reads.every((read) => read.method === "GET")).toBe(true);
});

test("SQ08 visited documents and review preserve filters, page, fields, files and construction selection", async ({
  page,
}) => {
  const { reads } = await mount(page);
  await page.goto(`/properties/${fixtureProperty.id}`);
  await openSection(page, "documents");
  await page
    .getByRole("searchbox", { name: "Найти документ", exact: true })
    .fill("DEMO lazy");
  await page
    .getByLabel("Статус документа", { exact: true })
    .selectOption("PENDING");
  const documentPages = section(page, "documents").getByRole("navigation", {
    name: "Страницы документов",
    exact: true,
  });
  await documentPages
    .getByRole("button", { name: "Следующая страница", exact: true })
    .click();
  await expect(documentPages).toContainText("Страница 2 из 2");
  const form = section(page, "documents")
    .locator(".legal-review")
    .filter({ has: page.locator("#basis-mechanism") });
  await form.locator("details > summary").click();
  await page.locator("#basis-source").fill("DEMO lazy source draft");
  await page.locator("#basis-file").setInputFiles({
    name: "lazy-basis.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO only in browser memory"),
  });
  await openSection(page, "review");
  const tools = page.locator("#dossier-materials");
  await tools.locator(":scope > summary").click();
  await page.locator("#appeal-reason").fill("DEMO lazy R4 reason · жоба");
  await page.locator("#appeal-file").setInputFiles({
    name: "lazy-appeal.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO retained file"),
  });
  await page.getByTestId("construction-R5").locator(":scope > summary").click();
  await page.locator("#r5-comparison").fill("DEMO exact comparison scope");
  await page.getByTestId("construction-R3").locator(":scope > summary").click();
  await expect(page.locator("#r3-ad option")).toHaveCount(2);
  await page
    .locator("#r3-ad")
    .selectOption("80000000-0000-4000-8000-000000000005");
  await settle(page);
  const existing = secondary(reads).length;
  await page.locator(".shell-locale select").selectOption("kk");
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await page.locator(".shell-locale select").selectOption("ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await openSection(page, "overview");
  await openSection(page, "documents");
  await expect(
    page.getByRole("searchbox", { name: "Найти документ", exact: true }),
  ).toHaveValue("DEMO lazy");
  await expect(
    page.getByLabel("Статус документа", { exact: true }),
  ).toHaveValue("PENDING");
  await expect(documentPages).toContainText("Страница 2 из 2");
  await expect(page.locator("#basis-source")).toHaveValue(
    "DEMO lazy source draft",
  );
  expect(
    await page
      .locator("#basis-file")
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe("lazy-basis.txt");
  await openSection(page, "review");
  await expect(page.locator("#appeal-reason")).toHaveValue(
    "DEMO lazy R4 reason · жоба",
  );
  await expect(page.locator("#r5-comparison")).toHaveValue(
    "DEMO exact comparison scope",
  );
  await expect(page.locator("#r3-ad")).toHaveValue(
    "80000000-0000-4000-8000-000000000005",
  );
  expect(
    await page
      .locator("#appeal-file")
      .evaluate((input: HTMLInputElement) => input.files?.[0]?.name),
  ).toBe("lazy-appeal.txt");
  await settle(page);
  expect(secondary(reads)).toHaveLength(existing);
  expect(reads.every((read) => read.method === "GET")).toBe(true);
});

test("SQ08 client navigation to another property resets visited sections and never renders prior dossier data", async ({
  page,
}) => {
  const { reads } = await mount(page);
  await page.goto(`/properties/${fixtureProperty.id}`);
  await openSection(page, "documents");
  await page
    .getByRole("searchbox", { name: "Найти документ", exact: true })
    .fill("PRIVATE FIRST FILTER");
  await openSection(page, "history");
  await expect(section(page, "history")).toContainText(
    "DEMO FIRST history page 1",
  );
  await openSection(page, "signals");
  await expect(
    section(page, "signals").locator(".object-records"),
  ).toBeVisible();
  const offset = reads.length;
  await page
    .locator(".property-ancestors")
    .getByRole("link", { name: new RegExp(secondName) })
    .click();
  await expect(
    page.getByRole("heading", { name: secondName, exact: true }),
  ).toBeVisible();
  await settle(page);
  await expect(page.locator("#dossier-tab-overview")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#basis-mechanism")).toHaveCount(0);
  await expect(page.locator(".history-timeline")).toHaveCount(0);
  expect(secondary(reads.slice(offset))).toEqual([]);
  await expect(page.locator(".dossier-workspace")).not.toContainText(
    "DEMO FIRST history",
  );
  await expect(page.locator(".dossier-workspace")).not.toContainText(firstName);
  await openSection(page, "documents");
  await expect(
    page.getByRole("searchbox", { name: "Найти документ", exact: true }),
  ).toHaveValue("");
  await expect(section(page, "documents")).not.toContainText(
    "DEMO lazy document",
  );
  await openSection(page, "history");
  await expect(section(page, "history")).toContainText("DEMO SECOND history");
  const scoped = secondary(reads.slice(offset));
  expect(scoped.length).toBeGreaterThan(0);
  expect(
    scoped.every(
      (read) =>
        read.path.includes(otherId) ||
        new URLSearchParams(read.query).get("property_id") === otherId,
    ),
  ).toBe(true);
  expect(reads.every((read) => read.method === "GET")).toBe(true);
});

test("SQ08 a first-visit history failure retries with GET and retains loaded page on later visits", async ({
  page,
}) => {
  const { reads, state } = await mount(page);
  state.failHistory = true;
  await page.goto(`/properties/${fixtureProperty.id}`);
  await openSection(page, "history");
  const history = section(page, "history");
  await expect(history).toContainText(
    "DEMO lazy history temporarily unavailable",
  );
  state.failHistory = false;
  await history
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(history).toContainText("DEMO FIRST history page 1");
  await history
    .getByRole("button", { name: "Следующая страница", exact: true })
    .click();
  await expect(history).toContainText("DEMO FIRST history page 2");
  await settle(page);
  const loaded = secondary(reads).length;
  await openSection(page, "overview");
  await openSection(page, "history");
  await expect(history).toContainText("DEMO FIRST history page 2");
  await settle(page);
  expect(secondary(reads)).toHaveLength(loaded);
  expect(reads.every((read) => read.method === "GET")).toBe(true);
});

test("SQ08 a legacy document link mounts the right page and drawer without loading other sections", async ({
  page,
}) => {
  const { reads } = await mount(page);
  await page.goto(
    `/properties/${fixtureProperty.id}#dossier-document-${documentId(11)}`,
  );
  await expect(page.locator("#dossier-tab-documents")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const drawer = page.getByRole("dialog", {
    name: "DEMO lazy document 12",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await expect(
    section(page, "documents").getByRole("navigation", {
      name: "Страницы документов",
      exact: true,
    }),
  ).toContainText("Страница 2 из 2");
  await page.keyboard.press("Escape");
  await settle(page);
  expect(secondary(reads)).toEqual([]);
  expect(reads.every((read) => read.method === "GET")).toBe(true);
});

test("SQ08 a legacy R1 link mounts the review section and keeps unrelated histories unloaded", async ({
  page,
}) => {
  const { reads } = await mount(page);
  await page.goto(`/properties/${fixtureProperty.id}#dossier-editor-R1`);
  await expect(page.locator("#dossier-tab-review")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#dossier-editor-R1")).toBeFocused();
  await expect(page.getByTestId("legal-absence-review")).toBeVisible();
  await settle(page);
  expect(
    secondary(reads).filter(
      (read) =>
        read.path.endsWith("/audit") ||
        read.path === "/api/v1/signals" ||
        new URLSearchParams(read.query).get("page_size") === "10",
    ),
  ).toEqual([]);
  expect(reads.every((read) => read.method === "GET")).toBe(true);
});
