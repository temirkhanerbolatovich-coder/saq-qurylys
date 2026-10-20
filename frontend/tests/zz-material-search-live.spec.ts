import { expect, test } from "@playwright/test";
import { login, testOrigin } from "./support";

test("isolated API material search agrees with rendered library and action queue", async ({
  page,
}) => {
  test.skip(
    process.env.SAQ_ISOLATED_ACCEPTANCE !== "1" ||
      !["localhost", "127.0.0.1"].includes(new URL(testOrigin).hostname),
    "Requires an explicitly isolated local API with DEMO seed",
  );
  await login(page);
  const response = await page.request.get(
    "/api/v1/advertisements?page_size=100",
  );
  expect(response.ok()).toBeTruthy();
  const all = await response.json();
  const material = all.items.find(
    (item: { is_demo: boolean; source_label: string }) =>
      item.is_demo && item.source_label,
  );
  expect(material).toBeTruthy();
  const q = material.source_label;
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/") && request.method() !== "GET")
      writes.push(request.url());
  });
  const search = page.getByRole("searchbox", {
    name: "Текст публикации или название источника",
    exact: true,
  });
  await page.goto("/advertisements");
  await search.fill(q);
  await search.press("Enter");
  await expect(
    page.getByRole("link", { name: q, exact: true }).first(),
  ).toBeVisible();
  const result = await page.request.get(
    `/api/v1/advertisements?${new URLSearchParams({ q })}`,
  );
  expect(result.ok()).toBeTruthy();
  expect(
    (await result.json()).items.some(
      (item: { id: string }) => item.id === material.id,
    ),
  ).toBe(true);
  await page.goto(`/review?${new URLSearchParams({ queue: "actions", q })}`);
  const queue = await page.request.get(
    `/api/v1/advertisements/review-queue?${new URLSearchParams({ q })}`,
  );
  expect(queue.ok()).toBeTruthy();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Материалов с нерешёнными действиями:" }),
  ).toHaveText(
    `Материалов с нерешёнными действиями: ${(await queue.json()).total}`,
  );
  await expect(search).toHaveValue(q);
  expect(writes).toEqual([]);
});
