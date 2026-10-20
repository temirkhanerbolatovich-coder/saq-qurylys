import { expect, test, type Page } from "@playwright/test";
import {
  fixtureProperty,
  functionalSafetyFixture,
} from "./functional-safety.fixture";
import type { Advertisement, AuditEvent } from "../lib/types";

const documentId = "60000000-0000-4000-8000-000000000061";
const assetId = "60000000-0000-4000-8000-000000000062";
const advertisementId = "60000000-0000-4000-8000-000000000063";

async function mount(page: Page) {
  const fixture = functionalSafetyFixture();
  const reads: string[] = [];
  const events: AuditEvent[] = [];
  let failAdvertisement = false;
  const advertisement: Advertisement = {
    id: advertisementId,
    revision: 1,
    latest_job_id: null,
    source_label: "DEMO источник · Ә Ғ Қ Ң Ө Ұ Ү Һ І",
    source_url: "https://example.org/saved-source",
    original_text: "DEMO сақталған бастапқы мәтін · исходный текст публикации.",
    published_at: null,
    captured_at: "2026-10-19T00:00:00+05:00",
    status: "NEW",
    assets: [
      {
        id: assetId,
        kind: "TEXT",
        mime_type: "text/plain",
        byte_size: 20,
        sha256: "a".repeat(64),
        captured_at: "2026-10-19T00:00:00+05:00",
        is_demo: true,
      },
    ],
    is_demo: true,
    confirmed_property_id: fixtureProperty.id,
  };
  fixture.detail.advertisement_ids = [advertisementId];
  fixture.detail.legal_bases = [
    {
      id: documentId,
      mechanism: "MIO_PERMIT",
      document_number: "DEMO DOC-61",
      document_date: "2026-10-10",
      issuer: "DEMO орган",
      scope_description: "DEMO объект · очередь 1",
      asset_id: assetId,
      is_demo: true,
      revision: 1,
      verification_status: "PENDING",
      applies_from: null,
      applies_until: null,
      verification_as_of: null,
      reviewed_at: null,
      evidence_ids: [],
    },
  ];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "GET") reads.push(pathname);
    if (pathname === `/api/v1/properties/${fixtureProperty.id}/provenance`)
      return route.fulfill({
        json:
          events.find(
            (event) =>
              event.action === "SOURCE_PACKAGE_IMPORTED" &&
              event.entity_id === fixtureProperty.id,
          ) || null,
      });
    if (pathname.endsWith("/audit"))
      return route.fulfill({
        json: { items: events, total: events.length, page: 1, page_size: 100 },
      });
    if (pathname === "/api/v1/advertisements")
      return route.fulfill({
        json: {
          items: advertisement.confirmed_property_id ? [advertisement] : [],
          total: advertisement.confirmed_property_id ? 1 : 0,
          page: 1,
          page_size: 10,
        },
      });
    if (pathname === `/api/v1/advertisements/${advertisementId}`)
      return route.fulfill(
        failAdvertisement
          ? {
              status: 503,
              json: { error: { message: "DEMO источник временно недоступен" } },
            }
          : { json: advertisement },
      );
    if (pathname.startsWith("/api/v1/exports/"))
      return route.fulfill({
        contentType: "application/pdf",
        headers: {
          "Content-Disposition": 'attachment; filename="demo-record.pdf"',
        },
        body: "%PDF-1.4\nDEMO presentation fixture\n%%EOF",
      });
    return route.fulfill(
      fixture.response(
        request.method(),
        pathname,
        request.postData() ? request.postDataJSON() : null,
      ),
    );
  });
  return {
    reads,
    writes: fixture.writes,
    fail(value: boolean) {
      failAdvertisement = value;
    },
    imported() {
      advertisement.confirmed_property_id = null;
      fixture.detail.advertisement_ids = [];
      events.push({
        id: "60000000-0000-4000-8000-000000000064",
        actor_id: "60000000-0000-4000-8000-000000000001",
        actor_display_name: "DEMO аналитик",
        risk_code: null,
        occurred_at: advertisement.captured_at,
        action: "SOURCE_PACKAGE_IMPORTED",
        entity_type: "properties",
        entity_id: fixtureProperty.id,
        old_revision: null,
        new_revision: 1,
        reason:
          "Материал связан по строке файла; идентичность не подтверждена.",
        details: {
          advertisement_id: advertisementId,
          source_row: {
            record_id: "VKO-01",
            official_source: "https://example.org/imported-source",
          },
          identity_confirmed: false,
        },
      });
    },
  };
}

test("document drawer preserves native focus, exact files and read-only PDF actions", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(`/properties/${fixtureProperty.id}?section=documents`);
  const trigger = page.getByRole("button", {
    name: "Открыть документ: DEMO DOC-61",
    exact: true,
  });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "DEMO DOC-61", exact: true });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("tab", { name: "Источники (1)", exact: true }),
  ).toBeVisible();
  await drawer.getByRole("tab", { name: "Файлы (1)", exact: true }).click();
  await expect(
    drawer.getByRole("link", {
      name: "Скачать сохранённый оригинал",
      exact: true,
    }),
  ).toHaveAttribute("href", `/api/v1/assets/${assetId}`);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const rect = await drawer.boundingBox();
    expect(rect!.width).toBeLessThanOrEqual(width);
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    if (process.env.SAQ_CAPTURE_UI === "1" && (width === 375 || width === 1440))
      await page.screenshot({
        path: `../output/qa/kompra-redesign-20261019/drawer-files-${width}.png`,
      });
  }
  await drawer
    .getByRole("button", { name: "Закрыть карточку записи", exact: true })
    .focus();
  expect(await drawer.evaluate((node) => node.matches(":modal"))).toBe(true);
  await trigger.evaluate((node) => (node as HTMLButtonElement).focus());
  expect(
    await drawer.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  const downloaded = page.waitForEvent("download");
  await drawer
    .getByRole("button", { name: "PDF для печати", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("demo-record.pdf");
  expect(fixture.reads).toContain(
    `/api/v1/exports/legal-bases/${documentId}/pdf`,
  );
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(fixture.writes).toEqual([]);
});

test("imported row opens its saved material without confirming identity or publication match", async ({
  page,
}) => {
  const fixture = await mount(page);
  fixture.imported();
  await page.goto(`/properties/${fixtureProperty.id}?section=publications`);
  const trigger = page.getByRole("button", {
    name: "Материал строки VKO-01",
    exact: true,
  });
  await expect(trigger).toBeVisible();
  expect(fixture.reads).not.toContain(
    `/api/v1/advertisements/${advertisementId}`,
  );
  await trigger.click();
  const drawer = page.getByRole("dialog", {
    name: "Материал строки VKO-01",
    exact: true,
  });
  await expect(
    drawer.getByText(
      "Материал связан по строке файла; идентичность не подтверждена.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    drawer.getByText("Не подтверждена", { exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toEqual([]);
});

test("selected publication reads lazily and retries only GET after an error", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(`/properties/${fixtureProperty.id}?section=publications`);
  const trigger = page.getByRole("button", {
    name: "Открыть запись: DEMO источник · Ә Ғ Қ Ң Ө Ұ Ү Һ І",
    exact: true,
  });
  await expect(trigger).toBeVisible();
  expect(fixture.reads).not.toContain(
    `/api/v1/advertisements/${advertisementId}`,
  );
  fixture.fail(true);
  await trigger.click();
  const drawer = page.getByRole("dialog", {
    name: "DEMO источник · Ә Ғ Қ Ң Ө Ұ Ү Һ І",
    exact: true,
  });
  await expect(
    drawer.getByText("DEMO источник временно недоступен", { exact: true }),
  ).toBeVisible();
  fixture.fail(false);
  await drawer
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(
    drawer.getByText(
      "DEMO сақталған бастапқы мәтін · исходный текст публикации.",
      { exact: true },
    ),
  ).toBeVisible();
  await drawer.getByRole("tab", { name: "Источники (1)", exact: true }).click();
  await expect(
    drawer.getByRole("link", {
      name: "DEMO источник · Ә Ғ Қ Ң Ө Ұ Ү Һ І",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://example.org/saved-source");
  await expect(
    drawer.getByText("Дата исходного источника не указана.", { exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toEqual([]);
});
