"use client";

import { useContext, useState } from "react";
import { useLocale } from "@/lib/locale";
import { date } from "@/lib/api";
import type { Page } from "@/lib/types";
import { useReviewDraft } from "@/lib/use-review-draft";
import { useMonitoringCommand } from "@/lib/use-monitoring-command";
import {
  useV2Navigation,
  uuid,
  positive,
  type Activation,
  type Dictionary,
  type V2Profile,
} from "@/lib/monitoring-v2";
import { Auth, LoadState, useData } from "@/components/workspace";
import { V2Notice as Notice } from "@/components/monitoring-v2-feedback";
import { Button } from "@/components/ui/button";
import { V2Pagination as Pagination } from "@/components/monitoring-v2-feedback";
import { V2ProfileEditor } from "@/components/monitoring-v2-profile-editor";
import { MonitoringV2Profile } from "@/components/monitoring-v2-profile";
import { MonitoringFindings } from "@/components/monitoring-findings";

export function MonitoringV2() {
  const { t } = useLocale();
  // This capability read also gives older installations an explicit, read-only failure state.
  const bundle = useData<{
    content_sha256: string;
    dictionary_version: string;
  }>("/monitoring/dictionaries/bundled");
  return (
    <section className="monitoring-v2" aria-label="Parser V2">
      <h2>Parser V2</h2>
      <p>
        {t(
          "Профиль → один поиск → сохранение находок → отдельный импорт. Приоритет — гипотеза для проверки, не подтверждённый риск R1–R6. Объект, очередь и правовое основание требуют проверки аналитиком.",
          "Профиль → бір іздеу → табылғандарды сақтау → бөлек импорт. Басымдық — тексеруге арналған болжам, расталған R1–R6 тәуекелі емес. Нысанды, кезекті және құқықтық негізді талдаушы тексереді.",
        )}
      </p>
      {!bundle.data || bundle.error ? (
        <>
          <p className="field-help">
            {t(
              "V2 требует обновлённого сервера. Ошибка загрузки не означает отсутствие находок.",
              "V2 үшін жаңартылған сервер қажет. Жүктеу қатесі табылған деректер жоқ дегенді білдірмейді.",
            )}
          </p>
          <LoadState error={bundle.error} retry={bundle.reload} />
        </>
      ) : (
        <>
          <V2Setup bundle={bundle.data} />
          <MonitoringFindings />
        </>
      )}
    </section>
  );
}

function V2Setup({
  bundle,
}: {
  bundle: { content_sha256: string; dictionary_version: string };
}) {
  const { user } = useContext(Auth);
  const { t } = useLocale();
  const { params, select } = useV2Navigation();
  const analyst = user?.role === "analyst";
  const activation = useData<Activation>("/monitoring/dictionaries/activation");
  const [dictionaryPage, setDictionaryPage] = useState(1);
  const dictionaryPath = `/monitoring/dictionaries?page=${dictionaryPage}&page_size=10`;
  const dictionaries = useData<Page<Dictionary>>(dictionaryPath);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPath = `/monitoring/dictionaries/activations?page=${historyPage}&page_size=10`;
  const history = useData<Page<Activation>>(historyPath);
  const draft = useReviewDraft(user?.id || "", "v2:dictionary", {
    reason: "",
    dictionary: "",
  });
  const action = useMonitoringCommand("v2:dictionary");
  const [message, setMessage] = useState("");
  const active = !activation.error ? activation.data : null;
  const dicts =
    dictionaries.resolvedPath === dictionaryPath && !dictionaries.error
      ? dictionaries.data
      : null;
  async function register() {
    const result = await action.run<Dictionary>("/monitoring/dictionaries", {
      expected_sha256: bundle.content_sha256,
      reason: draft.values.reason.trim(),
    });
    if (!result) return;
    dictionaries.reload();
    draft.update({ dictionary: result.id });
    setMessage(
      t(
        "Словарь сохранён. Для новых профилей нужна отдельная активация.",
        "Сөздік сақталды. Жаңа профильдер үшін бөлек белсендіру қажет.",
      ),
    );
  }
  async function activate(id: string | null) {
    if (!active) return;
    const result = await action.run<Activation>(
      "/monitoring/dictionaries/activations",
      {
        dictionary_id: id,
        expected_revision: active.revision,
        reason: draft.values.reason.trim(),
      },
    );
    if (!result) return;
    activation.reload();
    history.reload();
    setMessage(
      t(
        "Решение сохранено. История профилей и находок сохранена; поиск не запускался.",
        "Шешім сақталды. Профильдер мен табылғандардың тарихы сақталды; іздеу басталмады.",
      ),
    );
  }
  const profilePage = positive(params.get("v2_profiles_page"))
    ? Number(params.get("v2_profiles_page"))
    : 1;
  const profilesPath = `/monitoring/query-profiles?dictionary_version=2.0&page=${profilePage}&page_size=10`;
  const profiles = useData<Page<V2Profile>>(profilesPath);
  const profilesData =
    profiles.resolvedPath === profilesPath && !profiles.error
      ? profiles.data
      : null;
  const id = params.get("v2_profile_id");
  const revision = params.get("v2_profile_revision");
  const valid =
    !!id &&
    uuid.test(id) &&
    params.getAll("v2_profile_id").length === 1 &&
    (revision === null ||
      (positive(revision) &&
        params.getAll("v2_profile_revision").length === 1));
  return (
    <>
      <details className="monitoring-tool">
        <summary>
          {t("Словарь V2 и активация", "V2 сөздігі және белсендіру")}
        </summary>
        <p>
          {t(
            "Активация разрешает сохранение новых профилей. Она не подтверждает доступ к Threads и не запускает сбор.",
            "Белсендіру жаңа профильдерді сақтауға мүмкіндік береді. Ол Threads қолжетімділігін растамайды және жинауды бастамайды.",
          )}
        </p>
        <p>
          {t("Поставляемая версия", "Жеткізілген нұсқа")}:{" "}
          {bundle.dictionary_version}
        </p>
        <p className="monitoring-url">SHA256: {bundle.content_sha256}</p>
        {active ? (
          <p>
            {t("Ревизия активации", "Белсендіру ревизиясы")}: {active.revision}{" "}
            ·{" "}
            {active.dictionary_id
              ? t("Активен", "Белсенді")
              : t("Выключен", "Өшірілген")}
            <br />
            <span className="monitoring-url">{active.dictionary_id}</span>
          </p>
        ) : (
          <LoadState error={activation.error} retry={activation.reload} />
        )}
        <Button variant="outline" onClick={activation.reload}>
          {t("Обновить активацию", "Белсендіруді жаңарту")}
        </Button>
        {analyst && (
          <fieldset disabled={action.busy}>
            <legend>
              {t("Явное решение о словаре", "Сөздік туралы жеке шешім")}
            </legend>
            <label className="monitoring-field">
              <span>
                {t("Причина изменения словаря", "Сөздікті өзгерту себебі")}
              </span>
              <textarea
                maxLength={1000}
                value={draft.values.reason}
                onChange={(e) => draft.update({ reason: e.target.value })}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={!draft.values.reason.trim()}
              onClick={() => void register()}
            >
              {t(
                "Сохранить поставляемый словарь",
                "Жеткізілген сөздікті сақтау",
              )}
            </Button>
            {dicts ? (
              <>
                <label className="monitoring-field">
                  <span>
                    {t(
                      "Версия словаря для активации",
                      "Белсендіру үшін сөздік нұсқасы",
                    )}
                  </span>
                  <select
                    value={draft.values.dictionary}
                    onChange={(e) =>
                      draft.update({ dictionary: e.target.value })
                    }
                  >
                    <option value="">
                      {t("Выберите версию", "Нұсқаны таңдаңыз")}
                    </option>
                    {draft.values.dictionary &&
                      !dicts.items.some(
                        (d) => d.id === draft.values.dictionary,
                      ) && (
                        <option value={draft.values.dictionary}>
                          {draft.values.dictionary}
                        </option>
                      )}
                    {dicts.items.map((d) => (
                      <option value={d.id} key={d.id}>
                        {d.dictionary_version} · {date(d.created_at)} ·{" "}
                        {d.content_sha256.slice(0, 12)}
                      </option>
                    ))}
                  </select>
                </label>
                <Pagination
                  page={dictionaryPage}
                  pageSize={10}
                  total={dicts.total}
                  onPageChange={setDictionaryPage}
                  label={t("Страницы словарей", "Сөздік беттері")}
                />
              </>
            ) : (
              <LoadState
                error={dictionaries.error}
                retry={dictionaries.reload}
              />
            )}
            <div className="monitoring-actions">
              <Button
                disabled={
                  !active ||
                  !draft.values.dictionary ||
                  !draft.values.reason.trim()
                }
                onClick={() => void activate(draft.values.dictionary)}
              >
                {t(
                  "Активировать выбранный словарь",
                  "Таңдалған сөздікті белсендіру",
                )}
              </Button>
              <Button
                variant="outline"
                disabled={!active?.dictionary_id || !draft.values.reason.trim()}
                onClick={() => void activate(null)}
              >
                {t("Выключить словарь V2", "V2 сөздігін өшіру")}
              </Button>
            </div>
          </fieldset>
        )}
        <Notice
          error={action.error || action.storageError || draft.storageError}
        />
        {message && <p role="status">{message}</p>}
        <details>
          <summary>{t("История активаций", "Белсендіру тарихы")}</summary>
          {history.resolvedPath === historyPath &&
          history.data &&
          !history.error ? (
            <>
              <ul>
                {history.data.items.map((h) => (
                  <li key={h.revision} className="monitoring-url">
                    v{h.revision} · {date(h.created_at)} ·{" "}
                    {h.dictionary_id || t("Выключен", "Өшірілген")} · {h.reason}
                  </li>
                ))}
              </ul>
              <Pagination
                page={historyPage}
                pageSize={10}
                total={history.data.total}
                onPageChange={setHistoryPage}
                label={t("Страницы активаций", "Белсендіру беттері")}
              />
            </>
          ) : (
            <LoadState error={history.error} retry={history.reload} />
          )}
        </details>
      </details>
      <section
        className="panel v2-panel"
        aria-label={t("Поисковые профили V2", "V2 іздеу профильдері")}
      >
        <h3>{t("Поисковые профили V2", "V2 іздеу профильдері")}</h3>
        <p>
          {t(
            "Сохранение параметров не выполняет поиск. Каждый запуск обрабатывает одну фразу и одну страницу; hashtags здесь не поддерживаются.",
            "Параметрлерді сақтау іздеуді орындамайды. Әр іске қосу бір тіркес пен бір бетті өңдейді; мұнда хэштегтер қолданылмайды.",
          )}
        </p>
        {profilesData ? (
          <>
            <label className="monitoring-field">
              <span>{t("Выбрать профиль V2", "V2 профилін таңдау")}</span>
              <select
                value={valid ? id! : ""}
                onChange={(e) =>
                  select({
                    v2_profile_id: e.target.value || null,
                    v2_profile_revision: null,
                  })
                }
              >
                <option value="">{t("Новый профиль", "Жаңа профиль")}</option>
                {valid && !profilesData.items.some((p) => p.id === id) && (
                  <option value={id!}>
                    {t("Профиль по ссылке", "Сілтемедегі профиль")}
                  </option>
                )}
                {profilesData.items.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name} · v{p.revision}
                  </option>
                ))}
              </select>
            </label>
            <Pagination
              page={profilePage}
              pageSize={10}
              total={profilesData.total}
              onPageChange={(p) => select({ v2_profiles_page: String(p) })}
              label={t("Страницы профилей V2", "V2 профильдерінің беттері")}
            />
          </>
        ) : (
          <LoadState error={profiles.error} retry={profiles.reload} />
        )}
        {id && !valid && (
          <Notice
            error={t(
              "Некорректная ссылка профиля V2.",
              "V2 профилінің сілтемесі қате.",
            )}
          />
        )}
        {analyst && (
          <details className="v2-editor">
            <summary>
              {t("Параметры нового профиля", "Жаңа профиль параметрлері")}
            </summary>
            <V2ProfileEditor
              active={active}
              onSaved={(p) => {
                profiles.reload();
                const now = new URLSearchParams(window.location.search);
                if (
                  now.get("v2_profile_id") !== id ||
                  now.get("v2_profile_revision") !== revision
                )
                  return;
                select({
                  v2_profile_id: p.id,
                  v2_profile_revision: String(p.revision),
                });
              }}
            />
          </details>
        )}
        {valid && (
          <MonitoringV2Profile
            key={`${id}:${revision || "current"}`}
            id={id!}
            revision={revision}
            active={active}
            onChanged={profiles.reload}
          />
        )}
      </section>
    </>
  );
}
