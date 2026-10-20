import type { Page as BrowserPage } from "@playwright/test";
import type {
  Property,
  PropertyDetail,
  PropertyReference,
  PropertyStructure,
} from "../lib/types";

/** Presentation-only tree. No seed, evidence, risk or relationship is written. */
export async function mockPropertyStructure(page: BrowserPage) {
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=1")
  ).json();
  const template: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${registry.items[0].id}`)
  ).json();
  function row(
    index: number,
    name: string,
    level: Property["level"],
    parent_id: string | null,
  ): Property {
    return {
      ...template.property,
      id: `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      name,
      level,
      parent_id,
      address: "DEMO проспект Өскемен, 17 · синтетическая структура",
      is_demo: true,
    };
  }
  const root = row(1, "DEMO Жилой комплекс Өркен", "PROJECT", null);
  const phase = row(2, "DEMO Очередь 1", "PHASE", root.id);
  const buildings = Array.from({ length: 103 }, (_, index) =>
    row(
      index + 3,
      `DEMO Корпус ${String(index).padStart(3, "0")}`,
      "BUILDING",
      phase.id,
    ),
  );
  const rows = [root, phase, ...buildings];
  function reference(item: Property): PropertyReference {
    const { id, parent_id, name, address, level, is_demo } = item;
    return { id, parent_id, name, address, level, is_demo };
  }
  let unavailable = false;
  await page.route("**/api/v1/properties/**", (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.split("/")[4];
    const current = rows.find((item) => item.id === id);
    if (!current) return route.continue();
    if (url.pathname.endsWith("/structure")) {
      if (unavailable)
        return route.fulfill({
          status: 503,
          json: { error: { message: "DEMO связи временно недоступны" } },
        });
      const ancestors =
        current.id === root.id
          ? []
          : current.id === phase.id
            ? [root]
            : [root, phase];
      function related(items: Property[], key: string) {
        const number = Number(url.searchParams.get(key) || 1);
        return {
          items: items.slice((number - 1) * 10, number * 10).map(reference),
          page: number,
          page_size: 10,
          total: items.length,
        };
      }
      const data: PropertyStructure = {
        ancestors: ancestors.map(reference),
        children: related(
          rows.filter((item) => item.parent_id === id),
          "children_page",
        ),
        siblings: related(
          current.parent_id
            ? rows.filter(
                (item) =>
                  item.parent_id === current.parent_id && item.id !== id,
              )
            : [],
          "siblings_page",
        ),
      };
      return route.fulfill({ json: data });
    }
    if (url.pathname === `/api/v1/properties/${id}`)
      return route.fulfill({
        json: {
          ...template,
          property: current,
          legal_bases: [],
          factors: [],
          advertisement_ids: [],
        },
      });
    return route.continue();
  });
  return {
    root,
    phase,
    buildings,
    setUnavailable: (value: boolean) => {
      unavailable = value;
    },
  };
}
