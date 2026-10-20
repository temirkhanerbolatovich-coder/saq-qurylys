import { expect, test, type Page } from "@playwright/test";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";
import type {
  MonitoringCandidateDetail,
  MonitoringIncident,
} from "../lib/monitoring-types";
import type { AuditEvent } from "../lib/types";

const candidateIds = [
  "70000000-0000-4000-8000-000000000001",
  "70000000-0000-4000-8000-000000000002",
];
const adIds = [
  "70000000-0000-4000-8000-000000000011",
  "70000000-0000-4000-8000-000000000012",
];
const snapshotId = "70000000-0000-4000-8000-000000000020";
const now = "2026-10-19T00:00:00Z";
const routeTo = (index = 0) =>
  `/monitoring?candidate_id=${candidateIds[index]}`;
const compareForm = (page: Page) =>
  page.getByRole("form", { name: "Выполнить сверку кандидата" });
const reason = (page: Page) =>
  compareForm(page).getByRole("textbox", {
    name: "Основание запуска сверки",
    exact: true,
  });
const version = (page: Page) =>
  page.getByRole("combobox", { name: "DEMO-версия реестра", exact: true });
const incidentForm = (page: Page) =>
  page.getByRole("form", { name: "Решение по предварительному инциденту" });

/** Synthetic API responses: these tests exercise the real UI, not backend decisions. */
async function mount(page: Page) {
  const base = functionalSafetyFixture();
  const incident: MonitoringIncident = {
    id: "70000000-0000-4000-8000-000000000030",
    candidate_id: candidateIds[0],
    candidate_name: "DEMO кандидат А",
    is_demo: true,
    rule_code: "NO_MATCH_IN_APPROVED_SNAPSHOT",
    state: "OPEN",
    revision: 1,
    created_at: now,
    updated_at: now,
    close_reason: null,
    latest_comparison_id: "70000000-0000-4000-8000-000000000040",
    history: [],
  };
  const details: MonitoringCandidateDetail[] = candidateIds.map(
    (id, index) => ({
      candidate: {
        id,
        name: `DEMO кандидат ${index ? "Б" : "А"}`,
        city: "Өскемен",
        address: null,
        phase: null,
        is_demo: true,
        revision: 1,
        created_at: now,
        last_result: null,
      },
      advertisement_total: 2,
      advertisements: adIds.map((id, index) => ({
        id,
        source_label: `DEMO публикация ${index + 1}`,
        source_url: null,
        published_at: now,
        captured_at: now,
      })),
      comparisons: [],
      incidents: index ? [] : [incident],
    }),
  );
  let failure = 0;
  const history: Record<string, AuditEvent[]> = Object.fromEntries(
    candidateIds.map((id) => [id, []]),
  );
  function event(
    candidateId: string,
    action: string,
    propertyId: string,
    reason: string,
  ) {
    history[candidateId].unshift({
      id: crypto.randomUUID(),
      actor_id: fixtureUser.id,
      actor_display_name: "DEMO аналитик",
      risk_code: null,
      occurred_at: now,
      action,
      entity_type: "monitoring_candidates",
      entity_id: candidateId,
      old_revision: 1,
      new_revision: 2,
      reason,
      details: {
        property_id: propertyId,
        property_identity: { name: base.detail.property.name },
      },
    });
  }
  const writes: { path: string; key: string; body: Record<string, unknown> }[] =
    [];
  const paged = (items: unknown[]) => ({
    items,
    page: 1,
    page_size: 10,
    total: items.length,
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    if (!path.startsWith("/monitoring/")) {
      return route.fulfill(
        base.response(
          request.method(),
          `/api/v1${path}`,
          request.postData() ? request.postDataJSON() : null,
        ),
      );
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      writes.push({ path, key: request.headers()["idempotency-key"], body });
      if (failure)
        return route.fulfill({
          status: failure,
          json: { error: { message: "DEMO конфликт или отказ доставки" } },
        });
      if (path.endsWith("/link-dossier")) {
        const selected = details.find((d) => path.includes(d.candidate.id))!;
        selected.candidate.property_id = body.property_id;
        selected.candidate.property_link_kind = "LINKED";
        selected.candidate.revision++;
        base.detail.linked_candidate_count = 1;
        event(
          selected.candidate.id,
          "MONITORING_DOSSIER_LINKED",
          body.property_id,
          body.reason,
        );
        return route.fulfill({ status: 200, json: selected.candidate });
      }
      if (path.endsWith("/unlink-dossier")) {
        const selected = details.find((d) => path.includes(d.candidate.id))!;
        event(
          selected.candidate.id,
          "MONITORING_DOSSIER_UNLINKED",
          body.property_id,
          body.reason,
        );
        selected.candidate.property_id = null;
        selected.candidate.property_link_kind = null;
        selected.candidate.revision++;
        base.detail.linked_candidate_count = 0;
        return route.fulfill({ status: 200, json: selected.candidate });
      }
      if (path.endsWith("/dossier")) {
        const selected = details.find((d) => path.includes(d.candidate.id))!;
        selected.candidate.property_id = "70000000-0000-4000-8000-000000000099";
        selected.candidate.revision++;
        selected.candidate.property_link_kind = "CREATED";
        return route.fulfill({ status: 201, json: selected.candidate });
      }
      if (path.endsWith("/review")) {
        Object.assign(incident, {
          state: body.state,
          close_reason: body.close_reason,
          revision: incident.revision + 1,
        });
        return route.fulfill({ json: incident });
      }
      return route.fulfill({
        json: {
          id: incident.latest_comparison_id,
          candidate_id: candidateIds[0],
          advertisement_id: body.advertisement_id,
          snapshot_id: body.snapshot_id,
          result: "REGISTRY_UNAVAILABLE",
          explanation: "DEMO результат",
          matched_entries: [],
          created_at: now,
          algorithm_version: "demo",
        },
      });
    }
    if (path === "/monitoring/candidates") {
      const propertyId = new URL(request.url()).searchParams.get("property_id");
      return route.fulfill({
        json: paged(
          details
            .map((d) => d.candidate)
            .filter((row) => !propertyId || row.property_id === propertyId),
        ),
      });
    }
    const detail = details.find(
      (d) => path === `/monitoring/candidates/${d.candidate.id}`,
    );
    if (detail) return route.fulfill({ json: detail });
    const historyCandidate = candidateIds.find(
      (id) => path === `/monitoring/candidates/${id}/dossier-history`,
    );
    if (historyCandidate)
      return route.fulfill({ json: paged(history[historyCandidate]) });
    if (path === "/monitoring/registry-snapshots")
      return route.fulfill({
        json: paged([
          {
            id: snapshotId,
            label: "DEMO версия Өскемен",
            city: "Өскемен",
            is_demo: true,
            coverage_from: now,
            coverage_until: now,
            expires_at: now,
            complete: false,
            entries: [],
            created_at: now,
            created_by: fixtureUser.id,
            sha256: "0".repeat(64),
          },
        ]),
      });
    if (path === "/monitoring/threads/status")
      return route.fulfill({
        json: {
          state: "DISABLED",
          busy: false,
          retry_after_seconds: 0,
          last_attempt: "NOT_RUN",
        },
      });
    return route.fulfill({ json: paged([]) });
  });
  return {
    base,
    writes,
    details,
    incident,
    linkInitial(kind: "CREATED" | "LINKED" = "LINKED") {
      Object.assign(details[0].candidate, {
        property_id: fixtureProperty.id,
        property_link_kind: kind,
        revision: 2,
      });
      event(
        candidateIds[0],
        kind === "LINKED"
          ? "MONITORING_DOSSIER_LINKED"
          : "MONITORING_DOSSIER_CREATED",
        fixtureProperty.id,
        "DEMO исходное решение",
      );
    },
    fail(status: number) {
      failure = status;
    },
  };
}

test("cancellation draft and immutable history survive reload and a conflict without transferring work", async ({
  page,
}) => {
  const fixture = await mount(page);
  fixture.linkInitial();
  await page.goto(routeTo());
  const open = async () => {
    const summary = page.getByText("Исправить ошибочную связь", {
      exact: true,
    });
    await expect(summary).toBeVisible();
    if ((await summary.locator("..").getAttribute("open")) === null)
      await summary.click();
  };
  const form = page.getByRole("form", {
    name: "Отмена ошибочной связи с досье",
  });
  await open();
  await form
    .getByRole("textbox", { name: "Причина отмены связи", exact: true })
    .fill("DEMO ошибочная очередь · тексеру");
  await form.getByRole("checkbox").check();
  await page.reload();
  await open();
  await expect(form.getByRole("textbox")).toHaveValue(
    "DEMO ошибочная очередь · тексеру",
  );
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  expect(fixture.writes).toEqual([]);
  fixture.fail(409);
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Отменить ошибочную связь", exact: true })
    .click();
  await expect(
    page.getByText("DEMO конфликт или отказ доставки", { exact: true }),
  ).toBeVisible();
  await expect(form.getByRole("textbox")).toHaveValue(
    "DEMO ошибочная очередь · тексеру",
  );
  fixture.base.detail.property.revision = 2;
  await form
    .getByRole("button", {
      name: "Обновить сведения связанного досье",
      exact: true,
    })
    .click();
  await expect(form.getByRole("textbox")).toBeVisible();
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  fixture.fail(0);
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Отменить ошибочную связь", exact: true })
    .click();
  await expect(
    page.getByText("Связать с существующим досье", { exact: true }),
  ).toBeVisible();
  await expect(form).toHaveCount(0);
  const history = page
    .getByText("История связей с досье", { exact: true })
    .locator("..");
  if ((await history.getAttribute("open")) === null)
    await history.locator(":scope > summary").click();
  await expect(
    history.getByText("DEMO ошибочная очередь · тексеру", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText("DEMO исходное решение", { exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toHaveLength(2);
  expect(fixture.writes[1].body).toMatchObject({
    property_id: fixtureProperty.id,
    expected_revision: 2,
    expected_property_revision: 2,
    unlink_confirmed: true,
  });
  expect(fixture.writes[1].key).not.toBe(fixture.writes[0].key);
});

for (const sameTarget of [false, true])
  test(`cancellation waits for refreshed relation snapshot and isolates old reason (same target: ${sameTarget})`, async ({
    page,
  }) => {
    const fixture = await mount(page);
    fixture.linkInitial();
    await page.goto(routeTo());
    await page.getByText("Исправить ошибочную связь", { exact: true }).click();
    const form = page.getByRole("form", {
      name: "Отмена ошибочной связи с досье",
    });
    await form
      .getByRole("textbox", { name: "Причина отмены связи", exact: true })
      .fill("DEMO причина прежней связи");
    await form.getByRole("checkbox").check();
    const nextId = sameTarget
      ? fixtureProperty.id
      : "60000000-0000-4000-8000-000000000099";
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/v1/properties/${nextId}`, async (route) => {
      await held;
      await route.fulfill({
        json: {
          ...fixture.base.detail,
          property: {
            ...fixture.base.detail.property,
            id: nextId,
            name: "DEMO актуальное досье",
            revision: 1,
          },
        },
      });
    });
    Object.assign(fixture.details[0].candidate, {
      property_id: nextId,
      revision: 4,
    });
    await page
      .getByRole("button", { name: "Обновить карточку кандидата", exact: true })
      .click();
    await expect(
      page.getByText(`ID ${candidateIds[0]} · ревизия 4`, { exact: true }),
    ).toBeVisible();
    const summary = page.getByText("Исправить ошибочную связь", {
      exact: true,
    });
    if ((await summary.locator("..").getAttribute("open")) === null)
      await summary.click();
    await expect(form).toHaveCount(0);
    expect(fixture.writes).toEqual([]);
    release();
    await expect(form.getByRole("textbox")).toHaveValue("");
    await expect(form.getByRole("checkbox")).not.toBeChecked();
    await form
      .getByRole("textbox")
      .fill("DEMO новая проверка актуальной связи");
    await form.getByRole("checkbox").check();
    await form
      .getByRole("button", { name: "Отменить ошибочную связь", exact: true })
      .click();
    await expect(
      page.getByText("Связать с существующим досье", { exact: true }),
    ).toBeVisible();
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0].body).toMatchObject({
      property_id: nextId,
      expected_revision: 4,
      expected_property_revision: 1,
      reason: "DEMO новая проверка актуальной связи",
    });
  });

test("created origin and viewer relations retain readable history without cancellation controls", async ({
  page,
}) => {
  const fixture = await mount(page);
  fixture.linkInitial("CREATED");
  await page.goto(routeTo());
  await expect(
    page.getByRole("link", { name: "Открыть созданное досье", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Исправить ошибочную связь", { exact: true }),
  ).toHaveCount(0);
  fixture.linkInitial();
  fixture.base.setActor({ ...fixtureUser, role: "viewer" });
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Открыть связанное досье", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Исправить ошибочную связь", { exact: true }),
  ).toHaveCount(0);
  await page.getByText("История связей с досье", { exact: true }).click();
  await expect(
    page.getByText("Кандидат связан с досье", { exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toEqual([]);
});

test("existing dossier link preserves candidate drafts and requires a fresh identity check after conflict", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(routeTo());
  const open = async () => {
    const summary = page.getByText("Связать с существующим досье", {
      exact: true,
    });
    await expect(summary).toBeVisible();
    if ((await summary.locator("..").getAttribute("open")) === null)
      await summary.click();
  };
  const form = page.getByRole("form", { name: "Связь кандидата с досье" });
  await open();
  await page
    .getByRole("combobox", {
      name: "ЖК / очередь · можно выбрать вручную",
      exact: true,
    })
    .selectOption(fixtureProperty.id);
  await form
    .getByLabel("Основание связи с досье", { exact: true })
    .fill("DEMO объект и очередь сверены · тексеру");
  await form.getByRole("checkbox").check();
  await page
    .getByRole("link", { name: "DEMO кандидат Б", exact: true })
    .click();
  await open();
  await expect(form).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(candidateIds[0]));
  await expect(
    page.getByRole("heading", { name: "DEMO кандидат А", exact: false }),
  ).toBeVisible();
  await page.reload();
  await open();
  await expect(form).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Основание связи с досье", exact: true }),
  ).toHaveValue("DEMO объект и очередь сверены · тексеру");
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  expect(fixture.writes).toEqual([]);
  fixture.fail(409);
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Подтвердить связь с досье", exact: true })
    .click();
  await expect(
    page.getByText("DEMO конфликт или отказ доставки", { exact: true }),
  ).toBeVisible();
  fixture.base.detail.property.revision = 2;
  await page
    .getByRole("button", { name: "Обновить сведения досье", exact: true })
    .click();
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await expect(
    form.getByRole("textbox", { name: "Основание связи с досье", exact: true }),
  ).toHaveValue("DEMO объект и очередь сверены · тексеру");
  fixture.fail(0);
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Подтвердить связь с досье", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Открыть связанное досье", exact: true }),
  ).toHaveAttribute("href", `/properties/${fixtureProperty.id}`);
  expect(fixture.writes).toHaveLength(2);
  expect(fixture.writes[1].key).not.toBe(fixture.writes[0].key);
  expect(fixture.writes[1].body).toMatchObject({
    property_id: fixtureProperty.id,
    expected_revision: 1,
    expected_property_revision: 2,
    identity_checked: true,
  });
  await page
    .getByRole("link", { name: "Открыть связанное досье", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Связанные кандидаты: 1", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`property_id=${fixtureProperty.id}`));
  await expect(
    page.getByText("Найдено кандидатов: 1", { exact: true }),
  ).toBeVisible();
});

test("link fields remain fixed while the command is in flight", async ({
  page,
}) => {
  await mount(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/monitoring/candidates/*/link-dossier", async (route) => {
    await held;
    await route.fallback();
  });
  await page.goto(routeTo());
  await page.getByText("Связать с существующим досье", { exact: true }).click();
  const picker = page.getByRole("combobox", {
    name: "ЖК / очередь · можно выбрать вручную",
    exact: true,
  });
  await picker.selectOption(fixtureProperty.id);
  const form = page.getByRole("form", { name: "Связь кандидата с досье" });
  await form
    .getByRole("textbox", { name: "Основание связи с досье", exact: true })
    .fill("DEMO проверено");
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Подтвердить связь с досье", exact: true })
    .click();
  await expect(picker).toBeDisabled();
  await expect(form.getByRole("textbox")).toBeDisabled();
  await expect(form.getByRole("checkbox")).toBeDisabled();
  release();
  await expect(
    page.getByRole("link", { name: "Открыть связанное досье", exact: true }),
  ).toBeVisible();
});

test("dossier creation preserves draft, requires explicit confirmation and retains provenance link", async ({
  page,
}) => {
  const fixture = await mount(page);
  fixture.details[0].candidate.phase = "очередь 1";
  await page.goto(routeTo());
  const open = () =>
    page.getByText("Создать досье объекта", { exact: true }).click();
  const form = page.getByRole("form", { name: "Создание досье из кандидата" });
  await open();
  const duplicateLink = form
    .locator("..")
    .getByRole("link", { name: "Проверить дубли в реестре (новая вкладка)" });
  const duplicateUrl = new URL(
    (await duplicateLink.getAttribute("href"))!,
    "http://localhost",
  );
  expect(duplicateUrl.searchParams.get("q")).toBe(
    fixture.details[0].candidate.name,
  );
  expect(duplicateUrl.searchParams.get("is_demo")).toBe("true");
  await form
    .getByLabel("Адрес объекта", { exact: true })
    .fill("DEMO мекенжай 77");
  await form
    .getByLabel("Название застройщика", { exact: true })
    .fill("DEMO застройщик");
  await form
    .getByLabel("Основание создания досье", { exact: true })
    .fill("DEMO проверены источники");
  await form.getByRole("checkbox").check();
  await page.reload();
  await open();
  await expect(form.getByLabel("Адрес объекта", { exact: true })).toHaveValue(
    "DEMO мекенжай 77",
  );
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  expect(fixture.writes).toEqual([]);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await form.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/candidate-dossier-20261019/form-${width}.png`,
    });
  }
  fixture.fail(409);
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Создать новое досье", exact: true })
    .click();
  await expect(
    form.getByText("DEMO конфликт или отказ доставки"),
  ).toBeVisible();
  await expect(form.getByLabel("Адрес объекта", { exact: true })).toHaveValue(
    "DEMO мекенжай 77",
  );
  fixture.fail(0);
  await form
    .getByRole("button", { name: "Создать новое досье", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Открыть созданное досье" }),
  ).toHaveAttribute("href", /000099$/);
  expect(fixture.writes).toHaveLength(2);
  expect(fixture.writes[1].key).toBe(fixture.writes[0].key);
  expect(fixture.writes[1].body).toMatchObject({
    identity_checked: true,
    expected_revision: 1,
    address: "DEMO мекенжай 77",
  });
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Открыть созданное досье" }),
  ).toBeVisible();
  await expect(form).toHaveCount(0);
});

test("comparison draft survives tabs, candidate changes, navigation and reload without commands", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(routeTo());
  await compareForm(page)
    .getByRole("combobox", { name: "Публикация для сверки", exact: true })
    .selectOption(adIds[1]);
  await version(page).selectOption(snapshotId);
  await reason(page).fill("DEMO причина · тексеру");
  await page.getByRole("tab", { name: "Источники", exact: true }).click();
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  await expect(reason(page)).toHaveValue("DEMO причина · тексеру");
  await page
    .getByRole("link", { name: "DEMO кандидат Б", exact: true })
    .click();
  await expect(reason(page)).toHaveValue("");
  await expect(version(page)).toHaveValue("");
  await reason(page).fill("DEMO другой кандидат");
  await page.goBack();
  await expect(reason(page)).toHaveValue("DEMO причина · тексеру");
  await expect(version(page)).toHaveValue(snapshotId);
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Объекты", exact: true })
    .click();
  await expect(page).toHaveURL(/\/properties$/);
  await page.goBack();
  await page.reload();
  await expect(reason(page)).toHaveValue("DEMO причина · тексеру");
  await expect(
    compareForm(page).getByRole("combobox", {
      name: "Публикация для сверки",
      exact: true,
    }),
  ).toHaveValue(adIds[1]);
  await expect(version(page)).toHaveValue(snapshotId);
  expect(fixture.writes).toEqual([]);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await reason(page).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `../output/qa/monitoring-drafts-20261019/restored-${width}.png`,
      fullPage: true,
    });
  }
});

test("version selected before a candidate is assigned only to that candidate", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto("/monitoring");
  await page.getByRole("tab", { name: "Версии реестра", exact: true }).click();
  await page
    .locator("summary")
    .filter({ hasText: "Учебные версии реестра" })
    .click();
  await page
    .getByRole("button", {
      name: "Выбрать DEMO-версию для сверки",
      exact: true,
    })
    .click();
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  await page
    .getByRole("link", { name: "DEMO кандидат А", exact: true })
    .click();
  await expect(version(page)).toHaveValue(snapshotId);
  await page
    .getByRole("link", { name: "DEMO кандидат Б", exact: true })
    .click();
  await expect(version(page)).toHaveValue("");
  expect(fixture.writes).toEqual([]);
});

test("viewer can navigate monitoring without decision forms or commands", async ({
  page,
}) => {
  const fixture = await mount(page);
  fixture.base.setActor({ ...fixtureUser, role: "viewer" });
  await page.goto(routeTo());
  await expect(
    page.getByRole("heading", { name: "Мониторинг рекламы", exact: true }),
  ).toBeVisible();
  await expect(compareForm(page)).toHaveCount(0);
  await expect(incidentForm(page)).toHaveCount(0);
  await expect(
    page.getByText("Связать с существующим досье", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Создать досье объекта", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Источники", exact: true }).click();
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  expect(fixture.writes).toEqual([]);
});

test("explicit retry after reload reuses the command key; changed payload rotates it; success clears reason", async ({
  page,
}) => {
  const fixture = await mount(page);
  fixture.fail(503);
  await page.goto(routeTo());
  await reason(page).fill("DEMO retry");
  const submit = compareForm(page).getByRole("button", {
    name: "Выполнить сверку",
    exact: true,
  });
  await submit.click();
  await expect(compareForm(page).getByRole("alert")).toContainText(
    "отказ доставки",
  );
  await page.reload();
  await expect(reason(page)).toHaveValue("DEMO retry");
  expect(fixture.writes).toHaveLength(1);
  await submit.click();
  await expect(compareForm(page).getByRole("alert")).toContainText(
    "отказ доставки",
  );
  expect(fixture.writes[1].key).toBe(fixture.writes[0].key);
  fixture.fail(409);
  await reason(page).fill("DEMO changed");
  await submit.click();
  await expect(compareForm(page).getByRole("alert")).toContainText("конфликт");
  expect(fixture.writes[2].key).not.toBe(fixture.writes[1].key);
  fixture.details[0].candidate.revision = 2;
  fixture.fail(0);
  await page.reload();
  await expect(reason(page)).toHaveValue("DEMO changed");
  await submit.click();
  await expect(reason(page)).toHaveValue("");
  expect(fixture.writes[3].body.expected_revision).toBe(2);
  expect(fixture.writes[3].key).not.toBe(fixture.writes[2].key);
  await page.reload();
  await expect(reason(page)).toHaveValue("");
});

test("incident reason, target and close reason remain scoped and clear only after success", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(routeTo());
  await incidentForm(page)
    .getByRole("combobox", { name: "Новое состояние инцидента", exact: true })
    .selectOption("CLOSED");
  await incidentForm(page)
    .getByRole("combobox", { name: "Причина закрытия инцидента", exact: true })
    .selectOption("NOT_APPLICABLE");
  const input = incidentForm(page).getByRole("textbox", {
    name: "Обоснование решения по инциденту",
    exact: true,
  });
  await input.fill("DEMO не применимо · қолданылмайды");
  await page.reload();
  await expect(input).toHaveValue("DEMO не применимо · қолданылмайды");
  await expect(
    incidentForm(page).getByRole("combobox", {
      name: "Причина закрытия инцидента",
      exact: true,
    }),
  ).toHaveValue("NOT_APPLICABLE");
  expect(fixture.writes).toEqual([]);
  fixture.fail(409);
  await incidentForm(page)
    .getByRole("button", { name: "Сохранить решение по инциденту" })
    .click();
  await expect(incidentForm(page).getByRole("alert")).toContainText("конфликт");
  fixture.incident.revision = 2;
  fixture.fail(0);
  await page.reload();
  await expect(input).toHaveValue("DEMO не применимо · қолданылмайды");
  await incidentForm(page)
    .getByRole("button", { name: "Сохранить решение по инциденту" })
    .click();
  await expect(incidentForm(page)).toHaveCount(0);
  expect(fixture.writes[1].body).toMatchObject({
    expected_revision: 2,
    state: "CLOSED",
    close_reason: "NOT_APPLICABLE",
  });
  const records = await page.evaluate(() =>
    Object.entries(sessionStorage).filter(([key]) =>
      key.includes("monitoring:incident:"),
    ),
  );
  expect(records).toEqual([]);
});

test("removed selected publication is not silently replaced or submitted", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(routeTo());
  await compareForm(page)
    .getByRole("combobox", { name: "Публикация для сверки", exact: true })
    .selectOption(adIds[1]);
  await reason(page).fill("DEMO exact source");
  fixture.details[0].advertisements.pop();
  await page.reload();
  await expect(reason(page)).toHaveValue("DEMO exact source");
  await expect(
    compareForm(page).getByRole("button", {
      name: "Выполнить сверку",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    compareForm(page).getByRole("combobox", {
      name: "Публикация для сверки",
      exact: true,
    }),
  ).toHaveValue(adIds[1]);
  expect(fixture.writes).toEqual([]);
});

test("drafts stay isolated by user and authentication cleanup removes them", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(routeTo());
  await reason(page).fill("DEMO private input");
  await version(page).selectOption(snapshotId);
  fixture.base.setActor({
    ...fixtureUser,
    id: "70000000-0000-4000-8000-000000000099",
  });
  await page.reload();
  await expect(reason(page)).toHaveValue("");
  await expect(version(page)).toHaveValue("");
  fixture.base.setActor(fixtureUser);
  await page.reload();
  await expect(reason(page)).toHaveValue("DEMO private input");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith("saq:review-draft:"),
      ),
    ),
  ).toEqual([]);
  fixture.base.setActor(fixtureUser);
  await page.goto(routeTo());
  await expect(reason(page)).toHaveValue("");
  await expect(version(page)).toHaveValue("");
});

test("storage failure keeps drafts during app navigation and reports the reload limitation", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("DEMO quota", "QuotaExceededError");
    };
  });
  await page.goto(routeTo());
  await reason(page).fill("DEMO memory fallback");
  await expect(compareForm(page).getByRole("alert").first()).toContainText(
    "памяти",
  );
  await page
    .getByRole("link", { name: "DEMO кандидат Б", exact: true })
    .click();
  await expect(reason(page)).toHaveValue("");
  await page.goBack();
  await expect(reason(page)).toHaveValue("DEMO memory fallback");
  expect(fixture.writes).toEqual([]);
});
