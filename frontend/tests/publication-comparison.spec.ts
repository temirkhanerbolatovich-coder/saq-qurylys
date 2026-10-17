import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Presentation fixtures exercise URL/state/rendering only. Backend comparison,
// authorization and absence of writes are covered by separate API tests.
const leftId = "00000000-0000-4000-8000-000000000001";
const rightId = "00000000-0000-4000-8000-000000000002";
const thirdId = "00000000-0000-4000-8000-000000000003";
const versionId = "00000000-0000-4000-8000-000000000011";
const archivedId = "00000000-0000-4000-8000-000000000012";
const timestamp = "2026-10-17T08:00:00Z";
const originalText = "DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І\nБронь 100 000 ₸\n";
const changedText =
  "DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І\nБронь 200 000 ₸\n<script>alert('DEMO')</script>\n";
const materials = [
  { id: leftId, source_label: "DEMO RU/KZ источник А" },
  { id: rightId, source_label: "DEMO RU/KZ источник Б" },
  { id: thirdId, source_label: "DEMO материал на следующей странице" },
].map((item) => ({
  ...item,
  revision: 1,
  source_url: null,
  published_at: null,
  captured_at: timestamp,
  original_text: originalText,
  is_demo: true,
  status: "READY_FOR_REVIEW",
  assets: [],
  latest_job_id: null,
  confirmed_property_id: null,
}));

function source(id: string, extractionId: string | null, text: string | null) {
  const ad = materials.find((item) => item.id === id) || materials[0];
  return {
    advertisement_id: id,
    advertisement_revision: ad.revision,
    source_label: ad.source_label,
    source_url: "javascript:alert('DEMO')",
    published_at: null,
    captured_at: timestamp,
    is_demo: true,
    text_basis: extractionId ? "EXTRACTION" : "ORIGINAL",
    extraction_id: extractionId,
    extraction_revision: extractionId ? 2 : null,
    pipeline_version: extractionId ? "DEMO historical pipeline" : null,
    analysis_created_at: extractionId ? timestamp : null,
    source_asset_id: null,
    original_assets: [],
    text,
    text_sha256: text ? "a".repeat(64) : null,
  };
}

function comparison(url: URL, status = "DIFFERENT_TEXT") {
  const left = url.searchParams.get("left_id") || leftId;
  const right = url.searchParams.get("right_id") || rightId;
  return {
    status,
    left: source(
      left,
      url.searchParams.get("left_extraction_id"),
      status === "TEXT_UNAVAILABLE" ? null : originalText,
    ),
    right: source(
      right,
      url.searchParams.get("right_extraction_id"),
      status === "IDENTICAL_TEXT" ? originalText : changedText,
    ),
    same_advertisement: left === right,
    same_source_url: null,
    changes:
      status === "DIFFERENT_TEXT"
        ? [
            {
              kind: "REPLACE",
              left_start_line: 1,
              left_end_line: 2,
              right_start_line: 1,
              right_end_line: 3,
              left_text: "Бронь 100 000 ₸\n",
              right_text: "Бронь 200 000 ₸\n<script>alert('DEMO')</script>\n",
            },
          ]
        : [],
  };
}

async function mockPresentation(
  page: Page,
  options: {
    empty?: boolean;
    status?: string;
    viewer?: boolean;
    onCompare?: (route: Route, url: URL) => Promise<void>;
  } = {},
) {
  const requests: { method: string; path: string }[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");
    requests.push({ method: route.request().method(), path });
    if (path === "/auth/me")
      return route.fulfill({
        json: {
          id: leftId,
          username: "DEMO",
          display_name: "DEMO пользователь",
          role: options.viewer ? "viewer" : "analyst",
        },
      });
    if (path === "/advertisements/compare") {
      if (options.onCompare) return options.onCompare(route, url);
      return route.fulfill({ json: comparison(url, options.status) });
    }
    if (path === "/advertisements") {
      const secondPage = url.searchParams.get("page") === "2";
      return route.fulfill({
        json: {
          items: options.empty
            ? []
            : secondPage
              ? [materials[2]]
              : materials.slice(0, 2),
          page: secondPage ? 2 : 1,
          page_size: 20,
          total: options.empty ? 0 : 21,
        },
      });
    }
    if (path.endsWith("/extractions"))
      return route.fulfill({
        json: [versionId, archivedId].map((id) => ({
          id,
          revision: 2,
          parent_extraction_id: null,
          pipeline_version: "DEMO historical pipeline",
          original_ocr_text: originalText,
          analysis_text: originalText,
          hypotheses: [],
          warnings: [],
          created_at: timestamp,
        })),
      });
    const ad = materials.find((item) => path === `/advertisements/${item.id}`);
    if (ad) return route.fulfill({ json: ad });
    return route.fulfill({
      status: 404,
      json: { error: { message: "DEMO fixture not found" } },
    });
  });
  return requests;
}

test("presentation: explicit selection, archived version, pagination, Back and reload preserve context", async ({
  page,
}) => {
  const requests = await mockPresentation(page);
  await page.goto("/comparison");
  await expect(
    page.getByRole("heading", { name: "Сравнение публикаций", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Для сравнения выберите материал слева и справа.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(requests.some((item) => item.path.endsWith("/compare"))).toBe(false);
  await page
    .getByRole("button", {
      name: `Выбрать слева: ${materials[0].source_label}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: `Выбрать справа: ${materials[1].source_label}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "В выбранных текстах есть различия",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Текст слева", { exact: true })
    .selectOption(archivedId);
  await expect(page).toHaveURL(new RegExp(`left_extraction_id=${archivedId}`));
  await expect(
    page.getByRole("region", {
      name: "Сравниваемый источник: Слева",
      exact: true,
    }),
  ).toContainText("DEMO historical pipeline");
  const pagination = page.getByRole("navigation", {
    name: "Страницы материалов для сравнения",
    exact: true,
  });
  await pagination
    .getByRole("button", { name: "Следующая страница", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: `Выбрать справа: ${materials[2].source_label}`,
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: `Выбрать справа: ${materials[2].source_label}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`right_id=${thirdId}`));
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`right_id=${rightId}`));
  await page.reload();
  await expect(page.getByLabel("Текст слева", { exact: true })).toHaveValue(
    archivedId,
  );
  await expect(pagination).toContainText("Страница 2 из 2");
  await expect(
    page.getByRole("heading", {
      name: "В выбранных текстах есть различия",
      exact: true,
    }),
  ).toBeVisible();
  expect(requests.every((item) => item.method === "GET")).toBe(true);
});

test("presentation: exact text remains plain, source metadata and unknown dates are visible", async ({
  page,
}) => {
  await mockPresentation(page);
  await page.goto(`/comparison?left_id=${leftId}&right_id=${rightId}`);
  const result = page.getByRole("region", {
    name: "Результат сравнения",
    exact: true,
  });
  await expect(
    result.getByRole("heading", { name: "Изменённые блоки: 1", exact: true }),
  ).toBeVisible();
  await expect(result).toContainText(
    "SHA-256 относится к выбранному DB-тексту",
  );
  await expect(result.locator("pre").last()).toContainText(
    "<script>alert('DEMO')</script>",
  );
  await expect(result.locator("script")).toHaveCount(0);
  await expect(result.locator('a[href^="javascript:"]')).toHaveCount(0);
  const left = page.getByRole("region", {
    name: "Сравниваемый источник: Слева",
    exact: true,
  });
  await expect(left).toContainText("Не установлена");
  await expect(left).toContainText("a".repeat(64));
  await left.getByText("Полный выбранный текст", { exact: true }).click();
  await expect(left.locator("pre")).toHaveText(originalText);
});

for (const status of [404, 422, 413]) {
  test(`presentation: HTTP ${status} is an explicit error with retry, never an identical result`, async ({
    page,
  }) => {
    let failing = true;
    await mockPresentation(page, {
      onCompare: async (route, url) => {
        if (failing)
          return route.fulfill({
            status,
            json: { error: { message: `DEMO ошибка сравнения ${status}` } },
          });
        return route.fulfill({ json: comparison(url, "IDENTICAL_TEXT") });
      },
    });
    await page.goto(`/comparison?left_id=${leftId}&right_id=${rightId}`);
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: `DEMO ошибка сравнения ${status}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Выбранные тексты совпадают посимвольно",
        exact: true,
      }),
    ).toHaveCount(0);
    failing = false;
    await page
      .getByRole("button", { name: "Повторить загрузку", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Выбранные тексты совпадают посимвольно",
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("presentation: unavailable text does not use OCR automatically or claim equality", async ({
  page,
}) => {
  await mockPresentation(page, { status: "TEXT_UNAVAILABLE" });
  await page.goto(`/comparison?left_id=${leftId}&right_id=${leftId}`);
  await expect(
    page.getByRole("heading", {
      name: "Сравнение недоступно: выбранный текст отсутствует",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Текст слева", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Текст справа", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByText("Выбран один материал с двух сторон.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Отсутствие текста не означает совпадение.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("presentation: empty catalog preserves explanation and no comparison request", async ({
  page,
}) => {
  const requests = await mockPresentation(page, { empty: true });
  await page.goto("/comparison");
  await expect(
    page.getByText("На этой странице нет сохранённых материалов.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(requests.some((item) => item.path.endsWith("/compare"))).toBe(false);
});

test("presentation: loading is announced and clearing a side removes an outdated result", async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockPresentation(page, {
    onCompare: async (route, url) => {
      await gate;
      await route.fulfill({ json: comparison(url) });
    },
  });
  await page.goto(`/comparison?left_id=${leftId}&right_id=${rightId}`);
  await expect(
    page.getByRole("status").filter({ hasText: "Загрузка данных" }).first(),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("heading", {
      name: "В выбранных текстах есть различия",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Очистить выбор справа", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Результат сравнения", exact: true }),
  ).toHaveCount(0);
});

test("presentation: viewer can compare with keyboard and all target widths without page overflow", async ({
  page,
}) => {
  const requests = await mockPresentation(page, { viewer: true });
  await page.goto(
    `/comparison?left_id=${leftId}&right_id=${rightId}&left_extraction_id=${archivedId}`,
  );
  await mkdir("../output/qa/publication-comparison", { recursive: true });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const left = page.getByRole("region", {
      name: "Сравниваемый источник: Слева",
      exact: true,
    });
    await expect(left).toBeVisible();
    expect(
      await left
        .locator("dl > div")
        .first()
        .evaluate(
          (row) =>
            row.clientWidth >= (row.parentElement?.clientWidth || 0) * 0.9,
        ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 375 || width === 1440)
      await page.screenshot({
        path: `../output/qa/publication-comparison/presentation-${width}.png`,
        fullPage: true,
      });
  }
  const select = page.getByLabel("Текст слева", { exact: true });
  await select.focus();
  await expect(select).toBeFocused();
  const diff = page.getByRole("region", {
    name: "Различия текстов — таблица с горизонтальной прокруткой",
    exact: true,
  });
  await diff.focus();
  await expect(diff).toBeFocused();
  expect(requests.every((item) => item.method === "GET")).toBe(true);
});
