import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  fixtureProperty,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

const baseline = process.env.SAQ_SQ_LAYOUT_BASELINE === "1";
const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;
const sourceName =
  "DEMO Өскемен · Ә Ғ Қ Ң Ө Ұ Ү Һ І · ұзақ атауы сақталған құрылыс кешенінің бірінші кезегі · длинное исходное название";
const documentNumber =
  "DEMO SQ14 құжаттың сақталған ұзақ нөмірі · длинный номер документа";
const controlSelectors = {
  buttons: ".dossier-workspace .button",
  tabs: ".dossier-header .workspace-tabs [role=tab]",
  compactAction: ".dossier-header .dossier-compact-state > button",
  searchSubmit: ".shell-redesign .topbar-search button",
  searchToggle: ".shell-redesign .global-search-toggle",
  locale: ".shell-locale select",
  interfaceToggle: ".interface-toggle",
  backAction: ".dossier-actionbar .back",
  recordAction: ".dossier-record-button",
  drawerClose: ".detail-drawer[open] .detail-drawer-close",
} as const;

async function measure(page: Page) {
  return page.evaluate((selectors) => {
    const visible = (node: HTMLElement) =>
      node.getBoundingClientRect().width > 0 &&
      node.getBoundingClientRect().height > 0 &&
      getComputedStyle(node).visibility !== "hidden";
    const rect = (node: Element | null) => {
      if (!node) return null;
      const bounds = node.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    };
    return {
      pageOverflow: document.documentElement.scrollWidth - innerWidth,
      header: rect(document.querySelector(".dossier-header")),
      actionbar: rect(document.querySelector(".dossier-actionbar")),
      tabs: rect(document.querySelector(".dossier-header .workspace-tabs")),
      controls: Object.entries(selectors).flatMap(([group, selector]) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter(visible)
          .map((node) => ({
            group,
            text: node.getAttribute("aria-label") || node.textContent?.trim(),
            ...rect(node)!,
            textOverflow: node.scrollWidth - node.clientWidth,
          })),
      ),
    };
  }, controlSelectors);
}

async function mount(page: Page, locale: "ru" | "kk") {
  const fixture = functionalSafetyFixture();
  fixture.detail.property.name = sourceName;
  fixture.detail.property.address =
    "DEMO Өскемен, ұзақ мекенжай · длинный адрес с неизменёнными исходными сведениями";
  fixture.detail.unknown_information = [
    "DEMO UNKNOWN · правовой статус источника не установлен · дереккөздің құқықтық мәртебесі анықталмаған",
  ];
  fixture.detail.legal_bases = [
    {
      id: "76000000-0000-4000-8000-000000000001",
      mechanism: "KZHK_GUARANTEE",
      document_number: documentNumber,
      document_date: "2026-10-19",
      issuer: "DEMO ғана · только учебный источник",
      scope_description: "DEMO первая очередь · бірінші кезек",
      asset_id: "76000000-0000-4000-8000-000000000002",
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
  const methods: string[] = [];
  await page.addInitScript(
    (language) => localStorage.setItem("saq-locale", language),
    locale,
  );
  await page.route("**/api/v1/**", (route) => {
    const request = route.request();
    methods.push(request.method());
    return route.fulfill(
      fixture.response(request.method(), new URL(request.url()).pathname),
    );
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/properties/${fixtureProperty.id}`);
  await expect(
    page.getByRole("heading", { name: sourceName, exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  return { fixture, methods };
}

for (const locale of ["ru", "kk"] as const) {
  for (const viewport of viewports) {
    test(`SQ14 primary targets and wrapped source labels ${locale} ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const { fixture, methods } = await mount(page, locale);
      const measurements: Record<
        string,
        Awaited<ReturnType<typeof measure>>
      > = {};
      const capture = async (phase: string) => {
        const metrics = await measure(page);
        measurements[phase] = metrics;
        expect(
          metrics.pageOverflow,
          `${phase} page overflow`,
        ).toBeLessThanOrEqual(1);
        if (!baseline) {
          for (const control of metrics.controls) {
            expect(
              control.width,
              `${phase} ${control.group}: ${control.text} width`,
            ).toBeGreaterThanOrEqual(43.9);
            expect(
              control.height,
              `${phase} ${control.group}: ${control.text} height`,
            ).toBeGreaterThanOrEqual(43.9);
            expect(
              control.textOverflow,
              `${phase} ${control.group}: ${control.text} clipped text`,
            ).toBeLessThanOrEqual(1);
          }
        }
        await page.screenshot({
          path: testInfo.outputPath(
            `${baseline ? "baseline" : "after"}-${phase}.png`,
          ),
        });
      };
      try {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await capture("overview");
        const searchToggle = page.locator(".global-search-toggle");
        if (await searchToggle.isVisible()) await searchToggle.click();
        await expect(page.locator(".topbar-search button")).toBeVisible();
        await capture("search-open");
        if (await searchToggle.isVisible()) {
          await page.locator("#global-property-search").press("Escape");
          await expect(searchToggle).toBeFocused();
        }
        const reportTrigger = page.getByRole("button", {
          name: locale === "ru" ? "Скачать отчёт" : "Есепті жүктеу",
          exact: true,
        });
        await reportTrigger.click();
        const report = page.getByRole("dialog", {
          name: locale === "ru" ? "Отчёт по объекту" : "Нысан бойынша есеп",
          exact: true,
        });
        await expect(report).toBeVisible();
        await expect(report).toContainText(sourceName);
        await capture("report-options");
        await page.keyboard.press("Escape");
        await expect(reportTrigger).toBeFocused();
        await page.locator("#dossier-tab-documents").click();
        const documentTrigger = page
          .locator(".dossier-record-button")
          .filter({ hasText: documentNumber });
        await expect(documentTrigger).toBeVisible();
        await capture("documents");
        await documentTrigger.click();
        await expect(
          page.getByRole("dialog", { name: documentNumber, exact: true }),
        ).toBeVisible();
        await capture("document-drawer");
        await page.keyboard.press("Escape");
        await expect(documentTrigger).toBeFocused();
        expect(fixture.writes).toEqual([]);
        expect(methods.every((method) => method === "GET")).toBe(true);
      } finally {
        const output = process.env.SAQ_SQ_LAYOUT_EVIDENCE;
        const file = output
          ? path.join(
              output,
              `${baseline ? "baseline" : "after"}-${locale}-${viewport.width}x${viewport.height}.json`,
            )
          : testInfo.outputPath("measurements.json");
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(
          file,
          JSON.stringify(
            { baseline, locale, viewport, sourceName, measurements },
            null,
            2,
          ),
          "utf8",
        );
      }
    });
  }
}
