import { expect, test } from "@playwright/test";
import { functionalSafetyFixture } from "./functional-safety.fixture";

test("workflow language changes authored labels and preserves saved facts, selected version and analyst draft without commands", async ({
  page,
}) => {
  const fixture = functionalSafetyFixture();
  const saved = "DEMO исходный факт источника · Ә Ғ Қ Ң Ө Ұ Ү Һ І";
  fixture.signals[0].snapshot.unknown_information = [saved];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    return route.fulfill(
      fixture.response(
        request.method(),
        new URL(request.url()).pathname,
        request.postData() ? request.postDataJSON() : null,
      ),
    );
  });
  await page.goto(`/signals?signal_id=${fixture.signals[0].signal.id}`);
  const field = page.getByLabel("Обоснование решения по сигналу", {
    exact: true,
  });
  await page.getByRole("link", { name: "Решение", exact: true }).click();
  await field.fill("DEMO моя причина без перевода · тексеру");
  await page
    .getByRole("combobox", { name: "Язык интерфейса", exact: true })
    .selectOption("kk");
  await expect(
    page.getByRole("heading", { name: "Тексерілетін сигналдар", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Сигнал шешімінің негіздемесі", { exact: true }),
  ).toHaveValue("DEMO моя причина без перевода · тексеру");
  await page
    .getByRole("navigation", { name: "Сигнал бөлімдері", exact: true })
    .getByRole("link", { name: "Шолу", exact: true })
    .click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(
    new RegExp(`signal_id=${fixture.signals[0].signal.id}`),
  );
  expect(fixture.writes).toEqual([]);
});
