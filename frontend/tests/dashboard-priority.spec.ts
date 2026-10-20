import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Property } from "../lib/types";
import { login } from "./support";

for (const detailed of [false, true]) {
  test(`dashboard ${detailed ? "detailed" : "simple"} keeps server order across a large registry`, async ({
    page,
  }) => {
    await login(page, { detailed });
    const registry = await (
      await page.request.get("/api/v1/properties?page_size=5")
    ).json();
    const rows = registry.items as Property[];
    // Presentation-only payload deliberately disagrees with the old client
    // comparator: the browser must render server order without recalculating it.
    const supplied = rows.map((row, index) => ({
      ...row,
      name: `DEMO Өркен объект ${index === 0 ? "101" : index}`,
      legal_verification_status: index === 0 ? "VERIFIED_VALID" : "PENDING",
      risk: { ...row.risk, score: index === 0 ? 0 : 35 },
    }));
    const requests: string[] = [];
    const commands: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") commands.push(request.url());
    });
    await page.route("**/api/v1/properties?*", (route) => {
      const params = new URL(route.request().url()).searchParams;
      requests.push(params.toString());
      expect(params.get("order")).toBe("work_priority");
      expect(params.get("page_size")).toBe("5");
      return route.fulfill({
        json: { items: supplied, total: 205, page: 1, page_size: 5 },
      });
    });
    await page.reload();
    const panel = page.locator(".priority-panel");
    const names = panel.locator(".object-name");
    const count = detailed ? 5 : 3;
    await expect(names).toHaveText(
      supplied.slice(0, count).map((row) => row.name),
    );
    await expect(panel.locator(".zone strong")).toHaveText(
      supplied.slice(0, count).map((row) => String(row.risk.score)),
    );
    await expect(panel).toContainText(`Показано ${count} из 205`);
    await expect(panel).toContainText("по всему доступному реестру");
    await expect(panel).not.toContainText("среди первых");
    await expect(names.first()).toHaveAttribute(
      "href",
      `/properties/${supplied[0].id}`,
    );
    expect(requests.length).toBeGreaterThan(0);
    expect([...new Set(requests)]).toEqual(["order=work_priority&page_size=5"]);
    expect(commands).toEqual([]);
  });

  test(`dashboard ${detailed ? "detailed" : "simple"} separates priority failure and empty result with retry`, async ({
    page,
  }) => {
    await login(page, { detailed });
    let failed = true;
    await page.route(
      "**/api/v1/properties?order=work_priority&page_size=5",
      (route) =>
        failed
          ? route.fulfill({
              status: 503,
              json: {
                error: { message: "DEMO очередь объектов временно недоступна" },
              },
            })
          : route.fulfill({
              json: { items: [], total: 0, page: 1, page_size: 5 },
            }),
    );
    await page.reload();
    const panel = page.locator(".priority-panel");
    await expect(panel.getByRole("alert")).toContainText(
      "очередь объектов временно недоступна",
    );
    await expect(panel.locator(".empty")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Открыть новые материалы", exact: true }),
    ).toBeVisible();
    failed = false;
    await panel
      .getByRole("button", { name: "Повторить загрузку", exact: true })
      .click();
    await expect(panel.locator(".empty")).toBeVisible();
    await expect(panel.getByRole("alert")).toHaveCount(0);
    await expect(panel).toContainText("Показано 0 из 0");
  });
}

test("real dashboard priority remains readable across responsive widths", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page, { detailed: false });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const folder = path.resolve("../output/qa/dashboard-priority-20261018");
  await mkdir(folder, { recursive: true });
  const errors: string[] = [];
  const commands: string[] = [];
  const observations: object[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  for (const detailed of [false, true]) {
    const toggle = page.locator(".interface-toggle");
    if ((await toggle.getAttribute("aria-pressed")) !== String(detailed))
      await toggle.click();
    for (const width of [360, 375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.reload();
      await expect(toggle).toHaveAttribute("aria-pressed", String(detailed));
      const panel = page.locator(".priority-panel");
      await expect(panel).toContainText("по всему доступному реестру");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      if (detailed && width < 640) {
        const action = panel.locator(".priority-action").first();
        const actionBox = await action.boundingBox();
        const descriptionBox = await action
          .locator(".field-help")
          .boundingBox();
        expect(descriptionBox!.width).toBeGreaterThanOrEqual(
          actionBox!.width * 0.9,
        );
      }
      const mode = detailed ? "detailed" : "simple";
      await page.screenshot({
        path: path.join(folder, `${mode}-${width}.png`),
        fullPage: true,
      });
      observations.push({ width, mode, overflow });
    }
  }
  await writeFile(
    path.join(folder, "observations.json"),
    JSON.stringify({ observations, errors, commands }, null, 2),
  );
  expect(errors).toEqual([]);
  expect(commands).toEqual([]);
});
