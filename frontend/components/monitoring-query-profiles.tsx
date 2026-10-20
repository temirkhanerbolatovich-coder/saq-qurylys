"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { date } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useMonitoringCommand } from "@/lib/use-monitoring-command";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { LoadState, Notice, useData } from "@/components/workspace";

export type QueryParameters = {
  dictionary_version: "1.0";
  city: string;
  language: "ru" | "kk";
  topic: string;
  project: string;
};
type ProfileSummary = { id: string; name: string; revision: number };
type ProfileDetail = ProfileSummary & {
  current_revision: number;
  parameters: QueryParameters;
  compiled_queries: string[];
  dictionary_sha256: string;
  created_at: string;
};
type ProfilePage = {
  items: ProfileSummary[];
  total: number;
  page: number;
  page_size: number;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads and saves parameter snapshots. No search/import/scheduling commands. */
export function MonitoringQueryProfiles({
  parameters,
  disabled,
  onApply,
}: {
  parameters: QueryParameters;
  disabled: boolean;
  onApply: (parameters: QueryParameters) => void;
}) {
  const { t } = useLocale();
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const action = useMonitoringCommand("query-profile");
  const profiles = useData<ProfilePage>(
    `/monitoring/query-profiles?page=${page}&page_size=20`,
  );
  const id = params.get("query_profile_id");
  const revision = params.get("query_profile_revision");
  const valid =
    id !== null &&
    uuid.test(id) &&
    params.getAll("query_profile_id").length === 1 &&
    (revision === null ||
      (/^[1-9]\d{0,8}$/.test(revision) &&
        params.getAll("query_profile_revision").length === 1));
  const busy = disabled || action.busy;
  function select(id: string | null, revision?: number) {
    // Read current URL so late command results cannot restore obsolete filters.
    const next = new URLSearchParams(window.location.search);
    if (id) next.set("query_profile_id", id);
    else next.delete("query_profile_id");
    if (revision) next.set("query_profile_revision", String(revision));
    else next.delete("query_profile_revision");
    router.replace(`${pathname}?${next}`, { scroll: false });
    setMessage("");
  }
  async function save(detail?: ProfileDetail) {
    const selected = params.get("query_profile_id");
    const selectedRevision = params.get("query_profile_revision");
    const result = await action.run<ProfileDetail>(
      detail
        ? `/monitoring/query-profiles/${detail.id}/versions`
        : "/monitoring/query-profiles",
      {
        name,
        parameters,
        ...(detail ? { expected_revision: detail.current_revision } : {}),
      },
    );
    if (!result) return;
    profiles.reload();
    const now = new URLSearchParams(window.location.search);
    if (
      now.get("query_profile_id") !== selected ||
      now.get("query_profile_revision") !== selectedRevision
    )
      return;
    select(result.id, result.revision);
    setMessage(
      t(
        "Профиль сохранён. Поиск и расписание не запускались.",
        "Профиль сақталды. Іздеу мен кесте іске қосылған жоқ.",
      ),
    );
  }
  return (
    <section
      className="monitoring-saved-profiles"
      aria-label={t(
        "Сохранённые поисковые профили",
        "Сақталған іздеу профильдері",
      )}
    >
      <h4>{t("Сохранённые профили", "Сақталған профильдер")}</h4>
      <p className="field-help">
        {t(
          "Общие для команды параметры словаря1.0. Новая версия сохраняет историю; сохранение не запускает сбор.",
          "Командаға ортақ сөздік1.0 параметрлері. Жаңа нұсқа тарихты сақтайды; сақтау дерек жинауды бастамайды.",
        )}
      </p>
      <fieldset disabled={busy}>
        <legend>
          {t("Выбор и сохранение профиля", "Профильді таңдау және сақтау")}
        </legend>
        {profiles.resolvedPath ===
          `/monitoring/query-profiles?page=${page}&page_size=20` &&
        !profiles.error &&
        profiles.data ? (
          <>
            <label className="monitoring-field">
              <span>{t("Выбрать профиль", "Профиль таңдау")}</span>
              <select
                value={valid ? id! : ""}
                onChange={(event) => select(event.target.value || null)}
              >
                <option value="">{t("Новый профиль", "Жаңа профиль")}</option>
                {valid &&
                  !profiles.data.items.some((item) => item.id === id) && (
                    <option value={id!}>
                      {t(
                        "Выбранный профиль по ссылке",
                        "Сілтемедегі таңдалған профиль",
                      )}
                    </option>
                  )}
                {profiles.data.items.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · v{item.revision}
                  </option>
                ))}
              </select>
            </label>
            {profiles.data.total > 20 && (
              <Pagination
                label={t("Страницы профилей", "Профильдер беттері")}
                page={page}
                pageSize={20}
                total={profiles.data.total}
                onPageChange={setPage}
              />
            )}
            {profiles.data.total === 0 && (
              <p>
                {t(
                  "Сохранённых профилей пока нет.",
                  "Сақталған профильдер әзірге жоқ.",
                )}
              </p>
            )}
          </>
        ) : (
          <LoadState error={profiles.error} retry={profiles.reload} />
        )}
        <label className="monitoring-field">
          <span>
            {t("Название поискового профиля", "Іздеу профилінің атауы")}
          </span>
          <input
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!name.trim()}
          onClick={() => void save()}
        >
          {action.busy
            ? t("Сохранение…", "Сақталуда…")
            : t("Сохранить как новый профиль", "Жаңа профиль ретінде сақтау")}
        </Button>
        {id !== null && !valid && (
          <Notice
            error={t(
              "Некорректная ссылка профиля или версии.",
              "Профиль немесе нұсқа сілтемесі қате.",
            )}
          />
        )}
        {valid && (
          <SelectedProfile
            key={`${id}:${revision || "current"}`}
            id={id!}
            revision={revision}
            name={name}
            onSelectVersion={(value) => select(id, value)}
            onApply={(detail) => {
              setName(detail.name);
              onApply(detail.parameters);
              setMessage(
                t(
                  "Параметры загружены в конструктор. Поиск запускается отдельно.",
                  "Параметрлер құрастырғышқа жүктелді. Іздеу бөлек іске қосылады.",
                ),
              );
            }}
            onSave={save}
          />
        )}
      </fieldset>
      {action.error && <Notice error={action.error} />}
      {action.storageError && <Notice error={action.storageError} />}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

function SelectedProfile({
  id,
  revision,
  name,
  onApply,
  onSelectVersion,
  onSave,
}: {
  id: string;
  revision: string | null;
  name: string;
  onApply: (profile: ProfileDetail) => void;
  onSelectVersion: (revision: number) => void;
  onSave: (profile: ProfileDetail) => Promise<void>;
}) {
  const { t } = useLocale();
  const path = `/monitoring/query-profiles/${id}${revision ? `?revision=${revision}` : ""}`;
  const result = useData<ProfileDetail>(path);
  const [version, setVersion] = useState(revision || "");
  const current =
    result.resolvedPath === path && !result.error ? result.data : null;
  if (!current) return <LoadState error={result.error} retry={result.reload} />;
  return (
    <div className="monitoring-profile-detail">
      <p>
        <strong>{current.name}</strong> · {t("Версия", "Нұсқа")}{" "}
        {current.revision} / {current.current_revision} ·{" "}
        {date(current.created_at)}
      </p>
      <p className="field-help">
        {t("Словарь", "Сөздік")} {current.parameters.dictionary_version} ·
        SHA-256:{" "}
        <span style={{ overflowWrap: "anywhere" }}>
          {current.dictionary_sha256}
        </span>
      </p>
      <label className="monitoring-field">
        <span>{t("Номер версии профиля", "Профиль нұсқасының нөмірі")}</span>
        <input
          type="number"
          min={1}
          max={current.current_revision}
          value={version || current.revision}
          onChange={(event) => setVersion(event.target.value)}
        />
      </label>
      <div className="action-row">
        <Button
          type="button"
          variant="outline"
          disabled={
            !/^[1-9]\d*$/.test(version || String(current.revision)) ||
            Number(version || current.revision) > current.current_revision
          }
          onClick={() => onSelectVersion(Number(version || current.revision))}
        >
          {t("Показать версию", "Нұсқаны көрсету")}
        </Button>
        <Button type="button" variant="outline" onClick={result.reload}>
          {t("Обновить сохранённую версию", "Сақталған нұсқаны жаңарту")}
        </Button>
        <Button type="button" onClick={() => onApply(current)}>
          {t("Применить параметры", "Параметрлерді қолдану")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={
            !name.trim() || current.revision !== current.current_revision
          }
          onClick={() => void onSave(current)}
        >
          {t("Сохранить новую версию", "Жаңа нұсқаны сақтау")}
        </Button>
      </div>
      <details>
        <summary>
          {t("Сохранённые фразы", "Сақталған тіркестер")} (
          {current.compiled_queries.length})
        </summary>
        <ul>
          {current.compiled_queries.map((query) => (
            <li key={query}>{query}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
