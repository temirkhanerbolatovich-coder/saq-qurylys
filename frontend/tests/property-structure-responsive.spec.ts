import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { login } from "./support";
import { mockPropertyStructure } from "./property-structure.fixture";

test("structure is readable in both modes across responsive widths", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page, { detailed: false });
  const fixture = await mockPropertyStructure(page);
  const folder = path.resolve("../output/qa/property-structure-20261018");
  await mkdir(folder, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
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
      for (const [name, row] of [
        ["phase", fixture.phase],
        ["building", fixture.buildings[100]],
      ] as const) {
        await page.goto(`/properties/${row.id}`);
        await expect(page.locator(".interface-toggle")).toHaveAttribute(
          "aria-pressed",
          String(detailed),
        );
        const structure = page.getByRole("region", {
          name: "Структура жилого комплекса",
          exact: true,
        });
        const summary = structure.locator("summary");
        await summary.focus();
        await page.keyboard.press("Enter");
        await expect(
          structure.getByRole("region", {
            name: "В составе этого объекта",
            exact: true,
          }),
        ).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
        const links = structure.getByRole("link");
        for (const link of await links.all()) {
          const bounds = await link.boundingBox();
          expect(bounds?.height).toBeGreaterThanOrEqual(44);
        }
        const actualDetailed = await page
          .locator(".interface-toggle")
          .getAttribute("aria-pressed");
        const mode = detailed ? "detailed" : "simple";
        await page.screenshot({
          path: path.join(folder, `${name}-${mode}-${width}.png`),
          fullPage: true,
        });
        observations.push({ name, width, mode, actualDetailed, overflow });
      }
    }
  }
  await page.unroute("**/api/v1/properties/**");
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=1")
  ).json();
  for (const detailed of [false, true]) {
    const toggle = page.locator(".interface-toggle");
    if ((await toggle.getAttribute("aria-pressed")) !== String(detailed))
      await toggle.click();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/properties/${registry.items[0].id}`);
      const structure = page.getByRole("region", {
        name: "Структура жилого комплекса",
        exact: true,
      });
      await structure.locator("summary").click();
      await expect(
        structure.getByRole("heading", {
          name: "В составе этого объекта",
          exact: false,
        }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      const actualDetailed = await page
        .locator(".interface-toggle")
        .getAttribute("aria-pressed");
      expect(actualDetailed).toBe(String(detailed));
      const mode = detailed ? "detailed" : "simple";
      await page.screenshot({
        path: path.join(folder, `real-dossier-${mode}-${width}.png`),
        fullPage: true,
      });
      observations.push({
        name: "real-dossier",
        width,
        mode,
        actualDetailed,
        overflow,
      });
    }
  }
  await writeFile(
    path.join(folder, "observations.json"),
    JSON.stringify({ observations, errors, commands }, null, 2),
  );
  expect(errors).toEqual([]);
  expect(commands).toEqual([]);
});
