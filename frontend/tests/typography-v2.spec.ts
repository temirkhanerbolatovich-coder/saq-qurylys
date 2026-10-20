import { chromium, expect, firefox, test, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { login, testOrigin } from "./support";

// Explicit local comparison only: never adds a runtime font or changes the master.
const enabled = process.env.SAQ_TYPOGRAPHY_AB === "1";
const fontPath = path.resolve(
  process.env.SAQ_TYPOGRAPHY_FONT ||
    "../.local/typography-v2/InterVariable.woff2",
);
const output = path.resolve("../output/qa/typography-v2-20261019");
const glyphs = "ӘәҒғҚқҢңӨөҰұҮүҺһІі";
const kz =
  "Құрылыс нысаны: Өскемен, Қостанай, Іле ауданы. Ғимараттың құжаттары";
const ru =
  "Источник, дата получения и самостоятельное решение по проверке объекта. DEMO · UNKNOWN · PDF";
const weights = [400, 500, 600, 700];
const interCss = `
  @font-face { font-family: SAQInterAB; src: url('/__qa_typography__/InterVariable.woff2') format('woff2'); font-style: normal; font-weight: 100 900; font-display: swap; }
  :root { --font-sans: SAQInterAB, "Segoe UI", Roboto, Arial, sans-serif !important; }
`;

async function specimen(page: Page) {
  await page.evaluate(
    ({ glyphs, kz, ru, weights }) => {
      const section = document.createElement("section");
      section.className = "panel padded";
      section.id = "typography-ab-specimen";
      section.setAttribute("aria-label", "Локальный образец типографики QA");
      const title = document.createElement("h2");
      title.textContent = "Локальный QA-образец RU / KZ · не данные досье";
      section.append(title);
      for (const weight of weights) {
        const sample = document.createElement("p");
        sample.id = `typography-ab-${weight}`;
        sample.style.fontWeight = String(weight);
        sample.textContent = `${weight}: ${glyphs} · ${kz} · ${ru} · 0123456789`;
        section.append(sample);
      }
      document.querySelector("main")!.append(section);
    },
    { glyphs, kz, ru, weights },
  );
}

async function capture(page: Page, file: string, inter: boolean) {
  const style = inter ? await page.addStyleTag({ content: interCss }) : null;
  if (inter)
    await page.evaluate(
      async ({ glyphs, weights }) => {
        await Promise.all(
          weights.map((weight) =>
            document.fonts.load(`${weight} 14px SAQInterAB`, glyphs),
          ),
        );
        await document.fonts.ready;
      },
      { glyphs, weights },
    );
  const measurements = await page.evaluate(
    ({ glyphs, weights }) => {
      const visible = (element: Element) =>
        element.getBoundingClientRect().width > 0;
      const boxes = (selector: string) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter(visible)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const range = document.createRange();
            range.selectNodeContents(element);
            return {
              text: element.textContent,
              width: rect.width,
              height: rect.height,
              font: style.fontFamily,
              weight: style.fontWeight,
              lineHeight: style.lineHeight,
              textFragments: range.getClientRects().length,
            };
          });
      // A missing glyph would render through two different fallback fonts.
      const noFallback = weights.map((weight) => ({
        weight,
        glyphs: Array.from(glyphs).map((glyph) => {
          const draw = (fallback: string) => {
            const canvas = document.createElement("canvas");
            canvas.width = 90;
            canvas.height = 90;
            const ctx = canvas.getContext("2d")!;
            ctx.font = `${weight} 40px SAQInterAB, ${fallback}`;
            ctx.fillText(glyph, 8, 58);
            return ctx.getImageData(0, 0, 90, 90).data;
          };
          const serif = draw("serif"),
            mono = draw("monospace");
          return {
            glyph,
            sameRaster: serif.every((value, index) => value === mono[index]),
          };
        }),
      }));
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        headings: boxes("h1,h2"),
        rows: boxes("tbody tr"),
        labels: boxes("label"),
        specimens: boxes("#typography-ab-specimen p"),
        noFallback,
        tableRegions: Array.from(
          document.querySelectorAll<HTMLElement>(".table-scroll"),
        )
          .filter(visible)
          .map((element) => ({
            width: element.clientWidth,
            content: element.scrollWidth,
          })),
      };
    },
    { glyphs, weights },
  );
  expect(measurements.pageOverflow).toBeLessThanOrEqual(1);
  if (inter)
    expect(
      measurements.noFallback.every((row) =>
        row.glyphs.every((item) => item.sameRaster),
      ),
    ).toBe(true);
  // Locator screenshots scroll; reset before the paired full-page capture.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(output, `${file}.png`),
    fullPage: true,
  });
  await page
    .locator("#typography-ab-specimen")
    .screenshot({ path: path.join(output, `${file}-weights.png`) });
  const platformFonts: unknown[] = [];
  if (inter && page.context().browser()?.browserType().name() === "chromium") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const document = await cdp.send("DOM.getDocument");
    for (const weight of weights) {
      const node = await cdp.send("DOM.querySelector", {
        nodeId: document.root.nodeId,
        selector: `#typography-ab-${weight}`,
      });
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", {
        nodeId: node.nodeId,
      });
      expect(
        fonts.every(
          (font) => font.isCustomFont && font.familyName.includes("Inter"),
        ),
      ).toBe(true);
      platformFonts.push({ weight, fonts });
    }
    await cdp.detach();
  }
  await style?.evaluate((element) => element.parentNode?.removeChild(element));
  return { ...measurements, platformFonts };
}

for (const engine of [chromium, firefox]) {
  test(`typography A/B ${engine.name()}: real RU/KZ registry, forms, glyphs and print`, async () => {
    test.skip(!enabled, "Explicit SAQ_TYPOGRAPHY_AB=1 local font comparison");
    expect(
      existsSync(fontPath),
      "Download and inspect the official local font first",
    ).toBe(true);
    test.setTimeout(240_000);
    await mkdir(output, { recursive: true });
    const browser = await engine.launch();
    const context = await browser.newContext({ baseURL: testOrigin });
    const page = await context.newPage();
    const report: unknown[] = [];
    try {
      await context.route("**/__qa_typography__/InterVariable.woff2", (route) =>
        route.fulfill({ path: fontPath, contentType: "font/woff2" }),
      );
      await context.route("https://tile.openstreetmap.org/**", (route) =>
        route.abort(),
      );
      await login(page);
      const writes: string[] = [];
      await context.route("**/api/v1/**", (route) => {
        if (route.request().method() !== "GET") {
          writes.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      const response = await page.request.get(
        "/api/v1/properties?is_demo=true&page_size=5",
      );
      expect(response.ok()).toBe(true);
      const properties = (await response.json()).items;
      expect(properties.length).toBeGreaterThan(0);
      for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const screen of ["registry", "form", "dossier"]) {
          await page.goto(
            screen === "registry"
              ? "/properties?is_demo=true&page_size=5"
              : screen === "form"
                ? "/advertisements/new"
                : `/properties/${properties[0].id}`,
          );
          if (screen === "registry")
            await expect(
              page.locator(".registry-panel a.object-name").first(),
            ).toBeVisible();
          if (screen === "form") {
            await page
              .getByRole("textbox", {
                name: "Источник / описание происхождения",
                exact: true,
              })
              .fill(`DEMO · ${kz}`);
            await page
              .getByRole("textbox", { name: "Оригинальный текст", exact: true })
              .fill(`${kz}\n${ru}\n${glyphs}`);
          }
          await expect(page.locator("h1")).toBeVisible();
          await specimen(page);
          for (const inter of [false, true]) {
            const name = `${engine.name()}-${screen}-${width}-${inter ? "inter" : "current"}`;
            report.push({
              screen,
              width,
              mode: inter ? "inter" : "current",
              ...(await capture(page, name, inter)),
            });
          }
        }
      }
      for (const inter of [false, true]) {
        await page.emulateMedia({ media: "print" });
        const name = `${engine.name()}-print-${inter ? "inter" : "current"}`;
        report.push({
          screen: "print",
          mode: inter ? "inter" : "current",
          ...(await capture(page, name, inter)),
        });
        if (engine.name() === "chromium") {
          const style = inter
            ? await page.addStyleTag({ content: interCss })
            : null;
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
          await page.pdf({
            path: path.join(output, `${name}.pdf`),
            format: "A4",
            printBackground: true,
          });
          await style?.evaluate((element) =>
            element.parentNode?.removeChild(element),
          );
        }
      }
      expect(writes).toEqual([]);
      await writeFile(
        path.join(output, `${engine.name()}-measurements.json`),
        JSON.stringify(
          {
            engine: engine.name(),
            browserVersion: browser.version(),
            fontPath,
            businessWrites: writes,
            report,
          },
          null,
          2,
        ),
      );
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
