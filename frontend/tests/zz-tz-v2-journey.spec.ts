import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MonitoringCandidate } from "../lib/monitoring-types";
import type {
  Advertisement,
  Extraction,
  PropertyDetail,
  Signal,
  SignalDetail,
} from "../lib/types";
import { login, testOrigin } from "./support";

test.skip(
  process.env.SAQ_ISOLATED_ACCEPTANCE !== "1" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(testOrigin).hostname,
    ) ||
    (new URL(testOrigin).port !== "3090" &&
      !(
        process.env.GITHUB_ACTIONS === "true" &&
        new URL(testOrigin).port === "3000"
      )),
  "The full journey requires disposable QA port 3090 or the ephemeral GitHub Actions runner.",
);

async function uiCommand(page: Page, control: Locator, endpoint: string) {
  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/v1${endpoint}` &&
      response.request().method() === "POST",
  );
  await control.click();
  const response = await saved;
  expect(response.ok(), `${endpoint}: ${await response.text()}`).toBe(true);
  return response;
}

test("isolated DEMO CSV intake reaches a confirmed R2 signal and an immutable downloaded PDF through separate UI decisions", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);
  const name = `DEMO Маршрут Ә ${crypto.randomUUID()}`;
  const address = "DEMO ул. Учебная, 127";
  const paymentText =
    "Перечислите 500 000 тенге для закрепления квартиры за вами.";
  const originalText = `${name}. Өскемен, ${address}, очередь 1.\n${paymentText}\nDEMO Оқу материалы, нақты компания туралы қорытынды емес.`;
  const originalBytes = Buffer.from(originalText, "utf8");
  const originalSha = createHash("sha256").update(originalBytes).digest("hex");
  const artifactDir = path.resolve(
    `../output/qa/intake-journey-20261019/${crypto.randomUUID()}`,
  );
  await mkdir(artifactDir, { recursive: true });
  const sourceLabel = `${name} · исходный CSV материал`;
  const sourceUrl = `https://example.org/demo/${crypto.randomUUID()}`;
  const publishedAt = new Date(Date.now() - 3600_000).toISOString();
  const csvField = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const csvBytes = Buffer.from(
    "source_label,source_url,published_at,text\r\n" +
      [sourceLabel, sourceUrl, publishedAt, originalText]
        .map(csvField)
        .join(",") +
      "\r\n",
    "utf8",
  );
  const intakeWrites: string[] = [];
  const observeIntake = (request: import("@playwright/test").Request) => {
    if (request.method() === "POST")
      intakeWrites.push(new URL(request.url()).pathname);
  };
  page.on("request", observeIntake);
  await page.goto("/monitoring?section=imports&q=retained-intake-context");
  await page.getByLabel("CSV-файл", { exact: true }).setInputFiles({
    name: "DEMO-intake-Ә.csv",
    mimeType: "text/csv",
    buffer: csvBytes,
  });
  await page
    .getByRole("combobox", { name: "Тип данных", exact: true })
    .selectOption("true");
  expect(intakeWrites).toEqual([]);
  const matchingAds = async () =>
    (
      await (
        await page.request.get(
          `/api/v1/advertisements?${new URLSearchParams({ q: name })}`,
        )
      ).json()
    ).total;
  expect(await matchingAds()).toBe(0);
  const preview = await uiCommand(
    page,
    page.getByRole("button", { name: "Проверить файл", exact: true }),
    "/monitoring/csv-imports/preview",
  );
  expect((await preview.json()).entries[0].status).toBe("NEW");
  expect(await matchingAds()).toBe(0);
  const receipt = await (
    await uiCommand(
      page,
      page.getByRole("button", { name: "Сохранить пакет", exact: true }),
      "/monitoring/csv-imports",
    )
  ).json();
  expect(receipt.is_demo).toBe(true);
  expect(receipt.created_count).toBe(1);
  expect(receipt.file_sha256).toBe(
    createHash("sha256").update(csvBytes).digest("hex"),
  );
  const adId = receipt.entries[0].advertisement_id;
  await expect(page).toHaveURL(new RegExp(`csv_batch_id=${receipt.id}`));
  await expect(page).toHaveURL(/q=retained-intake-context/);
  const receiptUrl = page.url();
  const receiptPanel = page.getByRole("region", {
    name: "Сохранённый пакет",
    exact: true,
  });
  const csvDownloadEvent = page.waitForEvent("download");
  await receiptPanel
    .getByRole("link", { name: "Скачать исходный CSV", exact: true })
    .click();
  const csvDownload = await csvDownloadEvent;
  expect(await csvDownload.failure()).toBeNull();
  const csvPath = path.join(artifactDir, "intake-original.csv");
  await csvDownload.saveAs(csvPath);
  expect(await readFile(csvPath)).toEqual(csvBytes);
  await page.reload();
  await expect(receiptPanel).toContainText("Сохранено новых: 1");
  expect(page.url()).toBe(receiptUrl);
  await receiptPanel
    .getByRole("link", { name: "Открыть материал", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/advertisements/${adId}`));
  expect(intakeWrites).toEqual([
    "/api/v1/monitoring/csv-imports/preview",
    "/api/v1/monitoring/csv-imports",
  ]);
  page.off("request", observeIntake);
  const ad: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${adId}`)
  ).json();
  expect(ad.is_demo).toBe(true);
  expect(ad.status).toBe("NEW");
  expect(ad.confirmed_property_id).toBeNull();
  expect(ad.source_label).toBe(sourceLabel);
  expect(ad.source_url).toBe(sourceUrl);
  expect(new Date(ad.published_at!).toISOString()).toBe(publishedAt);
  expect(ad.original_text).toBe(originalText);
  expect(ad.assets).toHaveLength(1);
  expect(ad.assets[0].sha256).toBe(originalSha);
  expect(
    await (
      await page.request.get(`/api/v1/advertisements/${ad.id}/extractions`)
    ).json(),
  ).toEqual([]);
  const originalResponse = await page.request.get(
    `/api/v1/assets/${ad.assets[0].id}`,
  );
  expect(originalResponse.ok()).toBe(true);
  const downloadedOriginal = await originalResponse.body();
  expect(downloadedOriginal.equals(originalBytes)).toBe(true);

  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/v1/"))
      writes.push(new URL(request.url()).pathname);
  });
  await page.goto(`/advertisements/${ad.id}`);
  await expect(page.locator(".original-text")).toContainText(paymentText);
  await page
    .getByRole("link", { name: "Сверить объект с реестром", exact: true })
    .click();
  await page
    .getByText("Добавить кандидата из публикации", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Проверить публикацию", exact: true })
    .click();
  await expect(page.locator(".monitoring-preview")).toContainText(
    ad.source_label,
  );
  await page.getByLabel("Название кандидата", { exact: true }).fill(name);
  await page.getByLabel("Город кандидата", { exact: true }).fill("Өскемен");
  await page
    .getByLabel("Адрес кандидата (если известен)", { exact: true })
    .fill(address);
  await page
    .getByLabel("Очередь / корпус кандидата (если известны)", { exact: true })
    .fill("очередь 1");
  await page
    .getByRole("textbox", {
      name: "Обоснование выделения объекта",
      exact: true,
    })
    .fill("DEMO название, адрес и очередь проверены в оригинальном материале");
  expect(writes).toEqual([]);
  const candidate: MonitoringCandidate = await (
    await uiCommand(
      page,
      page.getByRole("button", { name: "Сохранить кандидата", exact: true }),
      "/monitoring/candidates",
    )
  ).json();
  await expect(page).toHaveURL(new RegExp(`candidate_id=${candidate.id}`));
  expect(candidate.property_id).toBeNull();

  await page.getByText("Создать досье объекта", { exact: true }).click();
  const dossierForm = page.getByRole("form", {
    name: "Создание досье из кандидата",
    exact: true,
  });
  await dossierForm
    .getByRole("textbox", { name: "Название застройщика", exact: true })
    .fill(`${name} застройщик`);
  await dossierForm
    .getByRole("textbox", { name: "Основание создания досье", exact: true })
    .fill("DEMO проверены первоисточник, очередь и отсутствие дубля");
  await dossierForm.getByRole("checkbox").check();
  expect(writes).toHaveLength(1);
  const created: MonitoringCandidate = await (
    await uiCommand(
      page,
      dossierForm.getByRole("button", {
        name: "Создать новое досье",
        exact: true,
      }),
      `/monitoring/candidates/${candidate.id}/dossier`,
    )
  ).json();
  const propertyId = created.property_id!;
  expect(propertyId).toBeTruthy();
  const detail = async (): Promise<PropertyDetail> =>
    (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
  const initial = await detail();
  expect(initial.source_candidate_id).toBe(candidate.id);
  expect(initial.property.legal_verification_status).toBe("UNKNOWN");
  expect(initial.property.stage).toBe("UNKNOWN");
  expect(initial.property.risk.score).toBe(0);
  expect(initial.property.risk.confirmed_codes).toEqual([]);
  expect(initial.factors).toEqual([]);
  expect(initial.advertisement_ids).toEqual([]);

  await page.getByRole("link", { name: ad.source_label, exact: true }).click();
  await page
    .getByRole("link", { name: "Открыть анализ и проверку", exact: true })
    .click();
  await uiCommand(
    page,
    page.getByRole("button", { name: "Запустить анализ", exact: true }),
    `/advertisements/${ad.id}/analyze`,
  );
  const payment = page
    .locator(".hypothesis")
    .filter({ hasText: "Условие оплаты" });
  await expect(payment).toHaveCount(1, { timeout: 30_000 });
  await expect(payment.locator(".status")).toHaveText("На проверке");
  expect((await detail()).property.risk.score).toBe(0);
  const picker = page.getByRole("region", {
    name: "Поиск объекта для привязки",
    exact: true,
  });
  await picker.getByRole("searchbox").fill(name);
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await picker.getByRole("combobox").selectOption(propertyId);
  await page
    .getByLabel("Обоснование выбора / отклонения", { exact: true })
    .fill("DEMO адрес и очередь сопоставлены вручную с исходным материалом");
  await uiCommand(
    page,
    page.getByRole("button", { name: "Подтвердить привязку", exact: true }),
    `/advertisements/${ad.id}/matches`,
  );
  expect((await detail()).advertisement_ids).toEqual([ad.id]);
  expect((await detail()).property.risk.score).toBe(0);
  const extractions: Extraction[] = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}/extractions`)
  ).json();
  const extraction = extractions[0];
  const hypothesis = extraction.hypotheses.find(
    (row) => row.field === "PAYMENT_TERM",
  )!;
  expect(hypothesis.review_status).toBe("PENDING");
  await payment.getByRole("button", { name: /показать в оригинале/ }).click();
  await expect(page.locator("mark")).toContainText(paymentText.slice(0, -1));
  await payment
    .getByLabel("Обоснование проверки", { exact: true })
    .fill("DEMO сумма и прямое предложение оплаты сверены с оригиналом");
  await uiCommand(
    page,
    payment.getByRole("button", { name: "Подтвердить гипотезу", exact: true }),
    `/extractions/${extraction.id}/review`,
  );
  await expect(payment.locator(".status")).toHaveText("Подтверждено");
  expect((await detail()).property.risk.score).toBe(0);

  await page
    .getByLabel("Проверенное условие оплаты")
    .selectOption(hypothesis.id);
  await page
    .getByLabel("Обоснование решения по R2", { exact: true })
    .fill("DEMO проверено прямое предложение перевода 500000 тенге");
  await uiCommand(
    page,
    page.getByRole("button", {
      name: "Сохранить доказательство R2",
      exact: true,
    }),
    "/evidence",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Доказательство сохранено" }),
  ).toBeVisible();
  const pending = await detail();
  expect(pending.factors).toHaveLength(1);
  const factor = pending.factors[0];
  expect(factor.code).toBe("R2");
  expect(factor.status).toBe("PENDING");
  expect(factor.evidence_ids).toHaveLength(1);
  expect(pending.property.risk.score).toBe(0);
  await uiCommand(
    page,
    page.getByRole("button", { name: "Подтвердить R2 · +25", exact: true }),
    `/risk-factors/${factor.id}/review`,
  );
  const confirmed = await detail();
  expect(confirmed.property.risk.score).toBe(25);
  expect(confirmed.property.risk.confirmed_codes).toEqual(["R2"]);
  expect(confirmed.property.legal_verification_status).toBe("UNKNOWN");

  await page.goto(`/properties/${propertyId}`);
  await page
    .getByRole("tab", { name: "Сигналы и отчёты", exact: true })
    .click();
  const draft: Signal = await (
    await uiCommand(
      page,
      page.getByRole("button", {
        name: "Создать черновик сигнала",
        exact: true,
      }),
      "/signals",
    )
  ).json();
  expect(draft.state).toBe("DRAFT");
  expect(draft.pdf_state).toBe("NOT_REQUESTED");
  expect(draft.risk_snapshot.score).toBe(25);
  await expect(page).toHaveURL(new RegExp(`signal_id=${draft.id}`));
  const signalPanel = page.getByTestId("signal-detail");
  await signalPanel
    .getByLabel("Обоснование решения по сигналу", { exact: true })
    .fill(
      "DEMO подтверждён только R2; основание UNKNOWN требует отдельной проверки",
    );
  await uiCommand(
    page,
    signalPanel.getByRole("button", {
      name: "Подтвердить сигнал",
      exact: true,
    }),
    `/signals/${draft.id}/decision`,
  );
  const signalDetail = async (): Promise<SignalDetail> =>
    (await page.request.get(`/api/v1/signals/${draft.id}`)).json();
  await expect
    .poll(async () => (await signalDetail()).signal.pdf_state, {
      timeout: 60_000,
    })
    .toBe("READY");
  const final = await signalDetail();
  expect(final.signal.state).toBe("CONFIRMED");
  expect(final.decisions).toHaveLength(1);
  expect(final.decisions[0].action).toBe("CONFIRM");
  expect(final.signal.risk_snapshot.confirmed_codes).toEqual(["R2"]);
  expect(final.snapshot.property.legal_verification_status).toBe("UNKNOWN");
  expect(
    final.snapshot.assets.find((asset) => asset.id === ad.assets[0].id)?.sha256,
  ).toBe(originalSha);
  expect(final.snapshot.evidence).toHaveLength(1);
  expect(final.snapshot.evidence[0].advertisement_id).toBe(ad.id);

  const pdfLink = signalPanel.getByRole("link", {
    name: "Скачать PDF этой версии",
    exact: true,
  });
  await expect(pdfLink).toBeVisible({ timeout: 15_000 });
  const downloadEvent = page.waitForEvent("download");
  await pdfLink.click();
  const download = await downloadEvent;
  expect(await download.failure()).toBeNull();
  const pdfPath = path.join(artifactDir, "signal-archived.pdf");
  await download.saveAs(pdfPath);
  const pdf = await readFile(pdfPath);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(1000);
  const persistedOriginal = await page.request.get(
    `/api/v1/assets/${ad.assets[0].id}`,
  );
  expect((await persistedOriginal.body()).equals(originalBytes)).toBe(true);
  expect(
    (await (await page.request.get(`/api/v1/advertisements/${ad.id}`)).json())
      .original_text,
  ).toBe(originalText);
  const confirmedUrl = page.url();
  const successor: Signal = await (
    await uiCommand(
      page,
      signalPanel.getByRole("button", {
        name: "Создать новую версию из текущих фактов",
        exact: true,
      }),
      "/signals",
    )
  ).json();
  expect(successor.previous_signal_id).toBe(draft.id);
  expect(successor.state).toBe("DRAFT");
  const historical = await signalDetail();
  expect(historical.snapshot).toEqual(final.snapshot);
  expect(historical.decisions).toEqual(final.decisions);
  expect(historical.signal.state).toBe("CONFIRMED");
  expect(historical.signal.is_stale).toBe(true);
  const archivedAgain = await page.request.get(
    `/api/v1/signals/${draft.id}/pdf`,
  );
  expect(archivedAgain.status()).toBe(200);
  expect(await archivedAgain.body()).toEqual(pdf);
  const csvAgain = await page.request.get(
    `/api/v1/assets/${receipt.original_asset_id}`,
  );
  expect(await csvAgain.body()).toEqual(csvBytes);
  await page.goto(confirmedUrl);
  await expect(
    signalPanel.getByRole("heading", {
      name: `Сигнал · версия ${draft.version}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    signalPanel.getByRole("link", {
      name: "Скачать PDF этой версии",
      exact: true,
    }),
  ).toBeVisible();
  expect(writes).toEqual([
    "/api/v1/monitoring/candidates",
    `/api/v1/monitoring/candidates/${candidate.id}/dossier`,
    `/api/v1/advertisements/${ad.id}/analyze`,
    `/api/v1/advertisements/${ad.id}/matches`,
    `/api/v1/extractions/${extraction.id}/review`,
    "/api/v1/evidence",
    `/api/v1/properties/${propertyId}/risk-factors`,
    `/api/v1/risk-factors/${factor.id}/review`,
    "/api/v1/signals",
    `/api/v1/signals/${draft.id}/decision`,
    "/api/v1/signals",
  ]);
  await writeFile(
    path.join(artifactDir, "original-downloaded.txt"),
    downloadedOriginal,
  );
  await writeFile(
    path.join(artifactDir, "evidence.json"),
    JSON.stringify(
      {
        intake: {
          batch_id: receipt.id,
          receipt_url: receiptUrl,
          original_csv_asset_id: receipt.original_asset_id,
          csv_sha256: receipt.file_sha256,
          published_at: ad.published_at,
          captured_at: ad.captured_at,
          source_url: ad.source_url,
          writes: intakeWrites,
        },
        successor_signal_id: successor.id,
        historical_snapshot_unchanged: true,
        historical_pdf_unchanged: true,
        historical_signal: historical,
        advertisement_id: ad.id,
        candidate_id: candidate.id,
        property_id: propertyId,
        signal_id: draft.id,
        original_sha256: originalSha,
        pdf_sha256: createHash("sha256").update(pdf).digest("hex"),
        pdf_bytes: pdf.length,
        suggested_filename: download.suggestedFilename(),
        writes,
        signal: final,
      },
      null,
      2,
    ),
  );
  console.log(`Intake journey evidence: ${artifactDir}`);
  await expect(
    page.getByLabel("Очередь сигналов", { exact: true }),
  ).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: path.join(artifactDir, `signal-${width}.png`),
      fullPage: true,
    });
  }
});
