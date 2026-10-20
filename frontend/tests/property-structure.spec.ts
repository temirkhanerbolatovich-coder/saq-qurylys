import { expect, test } from "@playwright/test";
import { login } from "./support";
import { mockPropertyStructure } from "./property-structure.fixture";

test("saved structure navigates parent, child 101 and siblings with registry return context", async ({
  page,
}) => {
  await login(page);
  const { root, phase, buildings } = await mockPropertyStructure(page);
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  const registry = new URLSearchParams({
    q: "Өркен",
    view: "map",
    page: "2",
  }).toString();
  await page.goto(
    `/properties/${root.id}?${new URLSearchParams({ registry, section: "history" })}`,
  );
  const structure = page.getByRole("region", {
    name: "Структура жилого комплекса",
    exact: true,
  });
  await structure.locator("summary").click();
  await expect(
    structure.getByText("Родительский объект не указан.", { exact: true }),
  ).toBeVisible();
  await structure
    .getByRole("link", { name: `Очередь · ${phase.name}`, exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: phase.name, exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("registry"))
    .toBe(registry);
  await expect(
    page.getByRole("tab", { name: "Обзор", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await structure.locator("summary").click();
  const children = structure.getByRole("region", {
    name: "В составе этого объекта",
    exact: true,
  });
  for (let number = 1; number <= 10; number++) {
    await expect(
      children.getByText(`Страница ${number} из 11`, { exact: true }),
    ).toBeVisible();
    await children
      .getByRole("button", { name: "Следующая страница", exact: true })
      .click();
  }
  await expect(
    children.getByText("Страница 11 из 11", { exact: true }),
  ).toBeVisible();
  await expect(structure.locator(".property-structure-content")).toBeFocused();
  await children
    .getByRole("link", {
      name: `Корпус · ${buildings[100].name}`,
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: buildings[100].name, exact: true }),
  ).toBeVisible();
  const breadcrumb = structure.getByRole("navigation", {
    name: "Положение объекта в структуре",
  });
  await expect(breadcrumb.getByRole("link")).toHaveCount(2);
  await expect(breadcrumb.getByRole("link").first()).toHaveText(
    `Жилой комплекс: ${root.name} · DEMO`,
  );
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
    "Корпус",
  );
  await structure.locator("summary").click();
  const siblings = structure.getByRole("region", {
    name: "С тем же родительским объектом",
    exact: true,
  });
  await expect(
    siblings.getByRole("link", { name: buildings[100].name, exact: false }),
  ).toHaveCount(0);
  await siblings
    .getByRole("link", { name: `Корпус · ${buildings[0].name}`, exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: buildings[0].name, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(breadcrumb.getByRole("link")).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "К реестру", exact: true }),
  ).toHaveAttribute("href", `/properties?${registry}`);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: buildings[100].name, exact: true }),
  ).toBeVisible();
  expect(commands).toEqual([]);
});

test("structure error remains separate from usable dossier and supports retry", async ({
  page,
}) => {
  await login(page);
  const fixture = await mockPropertyStructure(page);
  fixture.setUnavailable(true);
  await page.goto(`/properties/${fixture.phase.id}`);
  const structure = page.getByRole("region", {
    name: "Структура жилого комплекса",
    exact: true,
  });
  await expect(structure.locator("summary")).toContainText(
    "связи не загружены",
  );
  await expect(
    page.getByRole("heading", { name: fixture.phase.name, exact: true }),
  ).toBeVisible();
  await structure.locator("summary").click();
  await expect(structure.getByRole("alert")).toContainText(
    "связи временно недоступны",
  );
  await expect(
    structure.getByText("Связанные объекты не указаны.", { exact: true }),
  ).toHaveCount(0);
  fixture.setUnavailable(false);
  await structure
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(
    structure.getByRole("link", {
      name: `Жилой комплекс: ${fixture.root.name}`,
      exact: false,
    }),
  ).toBeVisible();
  await expect(structure.getByRole("alert")).toHaveCount(0);
});

test("real structure API remains available for the current dossier", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=1")
  ).json();
  const row = registry.items[0];
  const response = await page.request.get(
    `/api/v1/properties/${row.id}/structure`,
  );
  expect(response.status()).toBe(200);
  const data = await response.json();
  await page.goto(`/properties/${row.id}`);
  const structure = page.getByRole("region", {
    name: "Структура жилого комплекса",
    exact: true,
  });
  await structure.locator("summary").click();
  await expect(
    structure
      .getByRole("navigation", { name: "Положение объекта в структуре" })
      .getByRole("link"),
  ).toHaveCount(data.ancestors.length);
  await expect(
    structure.getByRole("heading", {
      name: `В составе этого объекта · ${data.children.total}`,
      exact: true,
    }),
  ).toBeVisible();
});
