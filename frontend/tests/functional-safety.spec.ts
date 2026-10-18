import { expect, test, type Page } from "@playwright/test";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

async function mount(page: Page, code = "R4") {
  const fixture = functionalSafetyFixture(code);
  page.on("dialog", (dialog) => dialog.accept());
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const result = fixture.response(
      request.method(),
      new URL(request.url()).pathname,
      request.postData() ? request.postDataJSON() : null,
    );
    await route.fulfill(result);
  });
  return fixture;
}

const source = "DEMO личный черновик · Ә Ғ Қ Ң Ө Ұ Ү Һ І";
const original = "DEMO оригинал: материал ещё не сохранён.";
const sourceField = (page: Page) =>
  page.getByLabel("Источник / описание происхождения", { exact: true });
const textField = (page: Page) =>
  page.getByLabel("Оригинальный текст", { exact: true });

test("publication draft survives navigation and reload and clears only after successful saving", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto("/advertisements/new");
  await sourceField(page).fill(source);
  await textField(page).fill(original);
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Объекты", exact: true })
    .click();
  await expect(page).toHaveURL(/\/properties$/);
  await page.goBack();
  await expect(sourceField(page)).toHaveValue(source);
  await page.reload();
  await expect(textField(page)).toHaveValue(original);
  expect(fixture.writes).toEqual([]);
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Публикация добавлена" }),
  ).toBeVisible();
  await page.goto("/advertisements/new");
  await expect(textField(page)).toHaveValue("");
  expect(fixture.writes).toEqual(["/api/v1/advertisements"]);
});

for (const boundary of ["logout", "401"] as const) {
  test(`publication draft is isolated and legacy input is cleared at ${boundary}`, async ({
    page,
  }) => {
    const fixture = await mount(page);
    await page.addInitScript(() => {
      if (sessionStorage.getItem("demo-legacy-seeded")) return;
      sessionStorage.setItem("demo-legacy-seeded", "true");
      sessionStorage.setItem(
        "saq-ad-draft",
        JSON.stringify({ text: "UNSCOPED LEGACY" }),
      );
    });
    await page.goto("/advertisements/new");
    await expect(textField(page)).toHaveValue("");
    await sourceField(page).fill(source);
    await textField(page).fill(original);
    if (boundary === "logout")
      await page.getByRole("button", { name: "Выйти", exact: true }).click();
    else {
      fixture.setActor(null);
      await page.reload();
    }
    await expect(page).toHaveURL(/\/login/);
    expect(
      await page.evaluate(() => sessionStorage.getItem("saq-ad-draft")),
    ).toBeNull();
    // End the anonymous document before replacing the synthetic session;
    // its pending login redirect must not race the next account's navigation.
    await page.goto("about:blank");
    fixture.setActor({
      ...fixtureUser,
      id: "60000000-0000-4000-8000-000000000099",
      username: "other",
    });
    await page.goto("/advertisements/new");
    await expect(sourceField(page)).toHaveValue("");
    await expect(textField(page)).toHaveValue("");
    const storage = await page.evaluate(() =>
      JSON.stringify({ ...sessionStorage }),
    );
    expect(storage).not.toContain(original);
    expect(fixture.writes).toEqual(
      boundary === "logout" ? ["/api/v1/auth/logout"] : [],
    );
  });
}

test("blocked Web Storage retains publication input during navigation with an explicit fallback notice", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("DEMO storage blocked", "SecurityError");
    };
  });
  await page.goto("/advertisements/new");
  await sourceField(page).fill(source);
  await textField(page).fill(original);
  await expect(
    page.getByText(/Черновик хранится только в памяти приложения/),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Объекты", exact: true })
    .click();
  await expect(page).toHaveURL(/\/properties$/);
  await page.goBack();
  await expect(textField(page)).toHaveValue(original);
  expect(fixture.writes).toEqual([]);
});

test("signal reasons stay with their exact versions across navigation, reload and a conflict, and clear after a saved decision", async ({
  page,
}) => {
  const fixture = await mount(page);
  const [first] = fixture.signals;
  const reason = page.getByLabel("Обоснование решения по сигналу", {
    exact: true,
  });
  await page.goto(`/signals?signal_id=${first.signal.id}`);
  await reason.fill("DEMO причина первой версии · тексеру");
  await page
    .getByRole("button", { name: "Открыть версию 2", exact: true })
    .click();
  await expect(reason).toHaveValue("");
  await reason.fill("DEMO причина второй версии");
  await page
    .getByRole("button", { name: "Открыть версию 1", exact: true })
    .click();
  await expect(reason).toHaveValue("DEMO причина первой версии · тексеру");
  await page.reload();
  await expect(reason).toHaveValue("DEMO причина первой версии · тексеру");
  expect(fixture.writes).toEqual([]);
  fixture.setConflict(true);
  await page
    .getByRole("button", { name: "Подтвердить сигнал", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "DEMO версия изменилась" }),
  ).toBeVisible();
  await expect(reason).toHaveValue("DEMO причина первой версии · тексеру");
  fixture.setConflict(false);
  await page
    .getByRole("button", { name: "Подтвердить сигнал", exact: true })
    .click();
  await expect(reason).toHaveCount(0);
  const storage = await page.evaluate(() =>
    JSON.stringify({ ...sessionStorage }),
  );
  expect(storage).not.toContain("DEMO причина первой версии");
  expect(storage).toContain("DEMO причина второй версии");
  expect(fixture.writes).toHaveLength(2);
});

for (const code of ["R1", "R3", "R4", "R5", "R6"]) {
  test(`dossier next action opens the exact ${code} editor even without publications and performs no command`, async ({
    page,
  }) => {
    const fixture = await mount(page, code);
    await page.goto(`/properties/${fixtureProperty.id}`);
    await page
      .getByRole("button", { name: new RegExp(`^Проверить ${code}:`) })
      .click();
    const target = page.locator(`#dossier-editor-${code}`);
    await expect(
      page.getByRole("tab", { name: "Проверка и риски", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(target).toBeVisible();
    await expect(target).toBeFocused();
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(fixture.writes).toEqual([]);
  });
}

test("viewer retains read-only dossier navigation and never receives the factor editor action", async ({
  page,
}) => {
  const fixture = await mount(page);
  fixture.setActor({ ...fixtureUser, role: "viewer" });
  await page.goto(`/properties/${fixtureProperty.id}`);
  await expect(
    page.getByRole("heading", { name: fixtureProperty.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Проверить R4:/ }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});
