import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { login, testOrigin } from "./support";

// Ordered after legacy fixtures: this scenario creates its own isolated DEMO records.
test("real API: original texts and explicit analysis version compare without review writes", async ({
  page,
}) => {
  test.skip(
    process.env.SAQ_ISOLATED_ACCEPTANCE !== "1",
    "Creates DEMO records only on an explicitly designated disposable acceptance stack",
  );
  test.setTimeout(90_000);
  expect(["127.0.0.1", "localhost"]).toContain(new URL(testOrigin).hostname);
  await login(page);
  const tokenResponse = await page.request.get("/api/v1/auth/csrf");
  expect(tokenResponse.status()).toBe(200);
  const { csrf_token: csrf } = await tokenResponse.json();
  const headers = () => ({
    Origin: testOrigin,
    "X-CSRF-Token": csrf,
    "Idempotency-Key": randomUUID(),
  });
  const marker = randomUUID();
  const saved: { id: string; revision: number; source_label: string }[] = [];
  for (const [index, amount] of [100_000, 200_000].entries()) {
    const response = await page.request.post("/api/v1/advertisements", {
      headers: headers(),
      data: {
        text: `DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І\nЖК «Бәйтерек», очередь 2.\nБронь ${amount} тенге.\n`,
        source_label: `DEMO comparison acceptance ${marker} ${index + 1}`,
        published_at: index === 0 ? "2026-10-16T08:00:00+05:00" : null,
        is_demo: true,
      },
    });
    expect(response.status()).toBe(201);
    saved.push(await response.json());
  }
  const analyze = await page.request.post(
    `/api/v1/advertisements/${saved[0].id}/analyze`,
    {
      headers: headers(),
      data: { expected_advertisement_revision: saved[0].revision },
    },
  );
  expect(analyze.status()).toBe(202);
  const job = await analyze.json();
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/v1/analysis-jobs/${job.id}`,
        );
        expect(response.status()).toBe(200);
        return (await response.json()).state;
      },
      { timeout: 45_000 },
    )
    .toBe("SUCCEEDED");
  const readSnapshot = async () => {
    const advertisements = await Promise.all(
      saved.map(async (item) => {
        const response = await page.request.get(
          `/api/v1/advertisements/${item.id}`,
        );
        expect(response.status()).toBe(200);
        return response.json();
      }),
    );
    const extractionResponse = await page.request.get(
      `/api/v1/advertisements/${saved[0].id}/extractions`,
    );
    expect(extractionResponse.status()).toBe(200);
    return { advertisements, extractions: await extractionResponse.json() };
  };
  const before = await readSnapshot();
  expect(before.extractions.length).toBeGreaterThan(0);
  const version = before.extractions[0];
  const writes: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/v1/") && request.method() !== "GET")
      writes.push(`${request.method()} ${url.pathname}`);
  });
  await page.goto("/comparison");
  await page
    .getByRole("button", {
      name: `Выбрать слева: ${saved[0].source_label}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: `Выбрать справа: ${saved[1].source_label}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "В выбранных текстах есть различия",
      exact: true,
    }),
  ).toBeVisible();
  const diff = page.getByRole("region", {
    name: "Различия текстов — таблица с горизонтальной прокруткой",
    exact: true,
  });
  await expect(diff).toContainText("Бронь 100000 тенге");
  await expect(diff).toContainText("Бронь 200000 тенге");
  const leftSource = page.getByRole("region", {
    name: "Сравниваемый источник: Слева",
    exact: true,
  });
  const rightSource = page.getByRole("region", {
    name: "Сравниваемый источник: Справа",
    exact: true,
  });
  await expect(leftSource).toContainText(
    before.advertisements[0].assets[0].sha256,
  );
  await expect(rightSource).toContainText("Не установлена");
  await page
    .getByLabel("Текст слева", { exact: true })
    .selectOption(version.id);
  await expect(page).toHaveURL(new RegExp(`left_extraction_id=${version.id}`));
  await expect(leftSource).toContainText(version.pipeline_version);
  await expect(leftSource).toContainText(version.id);
  await page.getByLabel("Текст слева", { exact: true }).selectOption("");
  await expect(page).not.toHaveURL(/left_extraction_id=/);
  await page.goBack();
  await expect(page.getByLabel("Текст слева", { exact: true })).toHaveValue(
    version.id,
  );
  await page.reload();
  await expect(page.getByLabel("Текст слева", { exact: true })).toHaveValue(
    version.id,
  );
  await expect(leftSource).toContainText(version.id);
  await expect(
    page.getByRole("heading", {
      name: "В выбранных текстах есть различия",
      exact: true,
    }),
  ).toBeVisible();
  expect(writes).toEqual([]);
  expect(await readSnapshot()).toEqual(before);
});
