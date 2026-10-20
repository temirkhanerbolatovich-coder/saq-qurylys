import { expect, test, type Page } from "@playwright/test";
import type { PropertyDetail, User } from "../lib/types";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

const savedReviewer: User = {
  ...fixtureUser,
  id: "75000000-0000-4000-8000-000000000001",
  display_name: "DEMO сохранённый автор · Ә Ғ Қ Ң Ө Ұ Ү Һ І",
};
const legacyReviewer = "75000000-0000-4000-8000-000000000002";
const basisId = "75000000-0000-4000-8000-000000000003";

function basis(): PropertyDetail["legal_bases"][number] {
  return {
    id: basisId,
    mechanism: "KZHK_GUARANTEE",
    document_number: "DEMO SQ11 historical basis",
    document_date: "2020-01-01",
    issuer: "DEMO источник",
    scope_description: "DEMO очередь · сақталған аясы",
    asset_id: "75000000-0000-4000-8000-000000000004",
    is_demo: true,
    revision: 2,
    verification_status: "VERIFIED_VALID",
    applies_from: "2020-01-01T12:00:00+05:00",
    applies_until: null,
    verification_as_of: "2021-02-03T12:00:00+05:00",
    reviewed_at: "2022-03-04T12:00:00+05:00",
    reviewed_by: savedReviewer.id,
    reviewed_by_details: savedReviewer,
    evidence_ids: [],
  };
}

async function mount(page: Page, locale: "ru" | "kk") {
  const fixture = functionalSafetyFixture();
  const snapshot = fixture.signals[0].snapshot;
  snapshot.legal_bases = [
    basis(),
    { ...basis(), id: legacyReviewer, reviewed_by: legacyReviewer },
  ];
  delete snapshot.legal_bases[1].reviewed_by_details;
  snapshot.factors = [
    {
      ...fixture.detail.factors[0],
      status: "CONFIRMED",
      as_of: "2021-02-03T12:00:00+05:00",
      reviewed_at: "2022-03-04T12:00:00+05:00",
      reviewed_by: savedReviewer.id,
      reviewed_by_details: savedReviewer,
      reason: "DEMO сохранённое решение · жеке шешім",
    },
    {
      ...fixture.detail.factors[0],
      id: legacyReviewer,
      code: "R5",
      reviewed_by: legacyReviewer,
      reviewed_at: null,
    },
  ];
  fixture.detail.legal_bases = [
    { ...basis(), reviewed_by: legacyReviewer, reviewed_by_details: null },
  ];
  const reads: string[] = [];
  await page.addInitScript(
    (language) => localStorage.setItem("saq-locale", language),
    locale,
  );
  await page.route("**/api/v1/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    reads.push(path);
    return route.fulfill(fixture.response(request.method(), path));
  });
  return { fixture, reads };
}

for (const locale of ["ru", "kk"] as const) {
  test(`SQ11 frozen reviewer, decision time and assessment date stay adjacent with legacy ID fallback in ${locale}`, async ({
    page,
  }, testInfo) => {
    const { fixture, reads } = await mount(page, locale);
    await page.goto(`/signals?signal_id=${fixture.signals[0].signal.id}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const panel = page.getByTestId("signal-detail");
    const factors = panel.locator("details").filter({
      has: page.locator("summary", { hasText: /^Факторы риска/ }),
    });
    const bases = panel.locator("details").filter({
      has: page.locator("summary", { hasText: /^Правовые основания/ }),
    });
    await factors.locator("summary").click();
    await bases.locator("summary").click();
    for (const group of [factors, bases]) {
      const saved = group.locator("article").first();
      await expect(saved).toContainText(savedReviewer.id);
      await expect(saved).toContainText(savedReviewer.display_name);
      await expect(saved).toContainText("2021");
      await expect(saved).toContainText("2022");
      await expect(saved).not.toContainText(fixtureUser.display_name);
      const legacy = group.locator("article").nth(1);
      await expect(legacy).toContainText(legacyReviewer);
      await expect(legacy).not.toContainText(savedReviewer.display_name);
      await expect(legacy).not.toContainText(fixtureUser.display_name);
    }
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(`sq11-${locale}-${width}.png`),
        fullPage: true,
      });
    }
    expect(reads.some((path) => /\/users\//.test(path))).toBe(false);
    expect(fixture.writes).toEqual([]);
  });

  test(`SQ11 current legal result shows reviewer ID and decision date without a profile lookup in ${locale}`, async ({
    page,
  }) => {
    const { fixture, reads } = await mount(page, locale);
    await page.goto(
      `/properties/${fixtureProperty.id}?section=documents#dossier-document-${basisId}`,
    );
    const dialog = page.getByRole("dialog", {
      name: "DEMO SQ11 historical basis",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const review = dialog.locator(".document-review");
    await expect(review).toContainText(legacyReviewer);
    await expect(review).toContainText("2021");
    await expect(review).toContainText("2022");
    await expect(review).toContainText(
      locale === "ru" ? "Проверивший:" : "Тексеруші:",
    );
    await expect(review).not.toContainText(savedReviewer.display_name);
    await expect(review).not.toContainText(fixtureUser.display_name);
    expect(reads.some((path) => /\/users\//.test(path))).toBe(false);
    expect(fixture.writes).toEqual([]);
  });
}
