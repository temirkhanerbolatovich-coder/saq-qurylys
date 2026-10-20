import { expect, test } from "@playwright/test";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

test("imported dossier leads to its saved observation without confirming identity or changing drafts", async ({
  page,
}) => {
  const fixture = functionalSafetyFixture();
  const sourceId = "62000000-0000-4000-8000-000000000001";
  const writes: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") writes.push(`${request.method()} ${path}`);
    if (path === "/api/v1/auth/me") return route.fulfill({ json: fixtureUser });
    if (path === `/api/v1/properties/${fixtureProperty.id}`) {
      const value = fixture.response("GET", path);
      return route.fulfill({
        json: {
          ...value.json,
          factors: [],
          legal_bases: [],
          advertisement_ids: [],
        },
      });
    }
    if (path === `/api/v1/properties/${fixtureProperty.id}/provenance`)
      return route.fulfill({
        json: {
          id: "62000000-0000-4000-8000-000000000002",
          actor_id: fixtureUser.id,
          actor: fixtureUser,
          action: "SOURCE_PACKAGE_IMPORTED",
          entity_type: "properties",
          entity_id: fixtureProperty.id,
          occurred_at: "2026-10-19T07:00:00Z",
          reason: "Наблюдение из файла; связь не проверена",
          details: {
            advertisement_id: sourceId,
            source_row: { official_source: "https://example.org/registry" },
          },
        },
      });
    const response = fixture.response(request.method(), path);
    return route.fulfill({ status: response.status, json: response.json });
  });
  await page.goto(`/properties/${fixtureProperty.id}?registry=q%3Dkeep`);
  const next = page.locator(".dossier-next-action dd").first();
  const link = next.getByRole("link", {
    name: "Проверьте сохранённый материал и его связь с объектом",
  });
  await expect(link).toHaveAttribute(
    "href",
    `/review?advertisement_id=${sourceId}`,
  );
  await page.getByLabel("Язык интерфейса").selectOption("kk");
  await expect(next.getByRole("link")).toHaveText(
    "Сақталған материалды және оның нысанмен байланысын тексеріңіз",
  );
  await expect(page).toHaveURL(/registry=q%3Dkeep/);
  expect(writes).toEqual([]);
});
