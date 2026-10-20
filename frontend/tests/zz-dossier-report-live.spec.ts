import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Property, PropertyDetail } from "../lib/types";
import { login, testOrigin } from "./support";

test.skip(
  process.env.SAQ_ISOLATED_ACCEPTANCE !== "1" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(testOrigin).hostname),
  "The live PDF check requires an explicitly isolated local runtime.",
);

test("current dossier report downloads actual RU and KK PDFs through read-only UI", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const rows: Property[] = (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items;
  const row = rows.find(
    (item) => item.legal_verification_status === "UNKNOWN",
  )!;
  expect(row).toBeTruthy();
  const before: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${row.id}`)
  ).json();
  const writes: string[] = [];
  const downloads: URL[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
    if (new URL(request.url()).pathname.endsWith("/report.pdf"))
      downloads.push(new URL(request.url()));
  });
  await page.goto(`/properties/${row.id}`);
  await page
    .getByRole("button", { name: "Скачать отчёт", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Отчёт по объекту",
    exact: true,
  });
  expect(downloads).toEqual([]);
  const output = path.resolve("../output/qa/dossier-report");
  await mkdir(output, { recursive: true });
  for (const language of ["ru", "kk"]) {
    await dialog
      .getByRole("combobox", { name: "Язык отчёта", exact: true })
      .selectOption(language);
    const downloaded = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Сформировать и скачать PDF", exact: true })
      .click();
    const download = await downloaded;
    expect(await download.failure()).toBeNull();
    const target = path.join(output, `live-${language}.pdf`);
    await download.saveAs(target);
    const bytes = await readFile(target);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  }
  expect(downloads).toHaveLength(2);
  expect(downloads.map((url) => url.searchParams.get("language"))).toEqual([
    "ru",
    "kk",
  ]);
  for (const url of downloads)
    expect(url.searchParams.get("sections")).toBe(
      "summary,documents,risk,publications,evidence,history,signals,sources",
    );
  expect(writes).toEqual([]);
  const after: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${row.id}`)
  ).json();
  expect(after.property.revision).toBe(before.property.revision);
  expect(after.property.risk.score).toBe(before.property.risk.score);
  expect(after.property.risk.confirmed_codes).toEqual(
    before.property.risk.confirmed_codes,
  );
  expect(after.property.legal_verification_status).toBe("UNKNOWN");
  expect(after.factors).toEqual(before.factors);
});
