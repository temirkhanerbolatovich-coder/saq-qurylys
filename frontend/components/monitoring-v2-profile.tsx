"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale";
import { useMonitoringCommand } from "@/lib/use-monitoring-command";
import { useReviewDraft } from "@/lib/use-review-draft";
import {
  positive,
  useV2Navigation,
  type Activation,
  type V2Profile,
} from "@/lib/monitoring-v2";
import { Auth, LoadState, useData } from "@/components/workspace";
import { V2Notice as Notice } from "@/components/monitoring-v2-feedback";
import { Button } from "@/components/ui/button";
import { V2ProfileEditor } from "@/components/monitoring-v2-profile-editor";

export function MonitoringV2Profile({
  id,
  revision,
  active,
  onChanged,
}: {
  id: string;
  revision: string | null;
  active: Activation | null;
  onChanged: () => void;
}) {
  const { user } = useContext(Auth);
  const { t } = useLocale();
  const { select, href } = useV2Navigation();
  const path = `/monitoring/query-profiles/${id}?dictionary_version=2.0${revision ? `&revision=${revision}` : ""}`;
  const detail = useData<V2Profile>(path);
  const connection = useData<{
    state: string;
    busy: boolean;
    retry_after_seconds: number;
  }>("/monitoring/threads/status");
  const [versionInput, setVersionInput] = useState(revision || "1");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    setCooldown(connection.data?.retry_after_seconds || 0);
  }, [connection.data]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const action = useMonitoringCommand(`v2:run:${id}:${revision || "current"}`);
  const draft = useReviewDraft(
    user?.id || "",
    `v2:run:${id}:${revision || "current"}`,
    { query: "", reason: "", order: "RECENT", limit: "20" },
  );
  if (!detail.data || detail.error || detail.resolvedPath !== path)
    return <LoadState error={detail.error} retry={detail.reload} />;
  const profile = detail.data;
  const latest = profile.revision === profile.current_revision;
  const queries = profile.compiled_preview.queries;
  const query = queries.find((q) => q.id === draft.values.query);
  const supported =
    query?.discovery === "keyword" &&
    query.capability_status === "LOCAL_FILTER_ONLY" &&
    query.text.length <= 300;
  const access =
    !connection.error &&
    (connection.data?.state === "ACCESS_VERIFIED" ||
      connection.data?.state === "CONFIGURED_UNVERIFIED");
  const limit = Number(draft.values.limit);
  async function run() {
    const result = await action.run<{ run_id: string }>(
      `/monitoring/query-profiles/${id}/runs`,
      {
        expected_revision: profile.revision,
        query_id: draft.values.query,
        reason: draft.values.reason.trim(),
        search_type: draft.values.order,
        limit,
      },
    );
    connection.reload();
    if (result) select({ v2_run_id: result.run_id });
  }
  function selectedStillCurrent() {
    const now = new URLSearchParams(window.location.search);
    return (
      now.get("v2_profile_id") === id &&
      now.get("v2_profile_revision") === revision
    );
  }
  return (
    <section
      className="v2-profile"
      aria-label={t("Выбранный профиль V2", "Таңдалған V2 профилі")}
    >
      <h4>
        {profile.name} · {t("Версия", "Нұсқа")} {profile.revision} /{" "}
        {profile.current_revision}
      </h4>
      <div className="monitoring-actions">
        <Button variant="outline" onClick={detail.reload}>
          {t("Обновить профиль V2", "V2 профилін жаңарту")}
        </Button>
        <Button
          variant="outline"
          onClick={() => select({ v2_profile_revision: null })}
        >
          {t("Текущая версия V2", "V2 ағымдағы нұсқасы")}
        </Button>
      </div>
      <div className="monitoring-fields">
        <label className="monitoring-field">
          <span>{t("Номер версии V2", "V2 нұсқасының нөмірі")}</span>
          <input
            type="number"
            min={1}
            max={profile.current_revision}
            value={versionInput}
            onChange={(e) => setVersionInput(e.target.value)}
          />
        </label>
        <Button
          variant="outline"
          disabled={
            !positive(versionInput) ||
            Number(versionInput) > profile.current_revision
          }
          onClick={() => select({ v2_profile_revision: versionInput })}
        >
          {t("Показать версию V2", "V2 нұсқасын көрсету")}
        </Button>
      </div>
      {!latest && (
        <p>
          {t(
            "Исторический снимок. Для нового поиска выберите текущую версию; сохранённые находки доступны независимо.",
            "Тарихи көшірме. Жаңа іздеу үшін ағымдағы нұсқаны таңдаңыз; сақталған табылғандар бөлек қолжетімді.",
          )}
        </p>
      )}
      <details>
        <summary>
          {t(
            "Параметры и происхождение профиля",
            "Профиль параметрлері мен шығу тегі",
          )}
        </summary>
        <p className="monitoring-url">SHA256: {profile.dictionary_sha256}</p>
        <pre className="v2-original">
          {JSON.stringify(profile.parameters, null, 2)}
        </pre>
        <p>
          {t(
            "Сохранённый набор не доказывает доступ к источнику. Не вошедших фраз",
            "Сақталған жиын дереккөзге қолжетімділікті растамайды. Енбеген тіркестер",
          )}
          : {profile.compiled_preview.omitted_queries.length}
        </p>
        <ul>
          {profile.compiled_preview.omitted_queries.map((q) => (
            <li key={q.id}>
              {q.text} · {q.skip_reason}
            </li>
          ))}
        </ul>
      </details>
      {user?.role === "analyst" && latest && (
        <details className="v2-editor">
          <summary>
            {t(
              "Изменить параметры новой версии V2",
              "V2 жаңа нұсқасының параметрлерін өзгерту",
            )}
          </summary>
          <V2ProfileEditor
            existing={profile}
            active={active}
            onSaved={(p) => {
              onChanged();
              detail.reload();
              if (selectedStillCurrent())
                select({ v2_profile_revision: String(p.revision) });
            }}
          />
        </details>
      )}
      <h4>{t("Один явный поиск Threads", "Threads арқылы бір іздеу")}</h4>
      <p>
        {t(
          "Не подтверждает географию, ЖК или правовой статус. Получение страницы ещё не создаёт находки или материалы.",
          "Географияны, тұрғын үй кешенін немесе құқықтық мәртебені растамайды. Бетті алу табылғандарды немесе материалдарды әлі жасамайды.",
        )}
      </p>
      {connection.data && !connection.error ? (
        <p>
          {t("Состояние источника", "Дереккөз күйі")}: {connection.data.state}
          {cooldown > 0 &&
            ` · ${t("Пауза, секунд", "Үзіліс, секунд")}: ${cooldown}`}
        </p>
      ) : (
        <LoadState error={connection.error} retry={connection.reload} />
      )}
      <Button variant="outline" onClick={connection.reload}>
        {t("Обновить доступ Threads", "Threads қолжетімділігін жаңарту")}
      </Button>
      <Link href={href({ section: "runs", run_source: "THREADS" })}>
        {t(
          "История запусков Threads, включая ошибки",
          "Threads іске қосу тарихы, қателермен бірге",
        )}
      </Link>
      {user?.role === "analyst" && (
        <fieldset disabled={action.busy}>
          <legend>
            {t(
              "Параметры одного запуска V2",
              "V2 бір іске қосудың параметрлері",
            )}
          </legend>
          <label className="monitoring-field">
            <span>{t("Сохранённая фраза V2", "V2 сақталған тіркесі")}</span>
            <select
              value={draft.values.query}
              onChange={(e) => draft.update({ query: e.target.value })}
            >
              <option value="">
                {t("Выберите фразу", "Тіркесті таңдаңыз")}
              </option>
              {queries.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text}
                  {q.discovery !== "keyword" ? " · UNSUPPORTED" : ""}
                </option>
              ))}
            </select>
          </label>
          {query && <p className="v2-original">{query.text}</p>}
          <div className="monitoring-fields">
            <label className="monitoring-field">
              <span>{t("Порядок V2", "V2 реті")}</span>
              <select
                value={draft.values.order}
                onChange={(e) => draft.update({ order: e.target.value })}
              >
                <option value="RECENT">RECENT</option>
                <option value="TOP">TOP</option>
              </select>
            </label>
            <label className="monitoring-field">
              <span>{t("Лимит одной страницы V2", "V2 бір бетінің шегі")}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={draft.values.limit}
                onChange={(e) => draft.update({ limit: e.target.value })}
              />
            </label>
          </div>
          <label className="monitoring-field">
            <span>{t("Причина поиска V2", "V2 іздеу себебі")}</span>
            <textarea
              maxLength={2000}
              value={draft.values.reason}
              onChange={(e) => draft.update({ reason: e.target.value })}
            />
          </label>
          <Button
            disabled={
              !latest ||
              !active?.dictionary_id ||
              active.dictionary_id !== profile.parameters.dictionary_id ||
              !access ||
              connection.data?.busy ||
              cooldown > 0 ||
              !supported ||
              !draft.values.reason.trim() ||
              !Number.isInteger(limit) ||
              limit < 1 ||
              limit > 50
            }
            onClick={() => void run()}
          >
            {action.busy
              ? t("Поиск…", "Ізделуде…")
              : t("Выполнить один поиск V2", "V2 бір іздеуді орындау")}
          </Button>
          <Notice
            error={action.error || action.storageError || draft.storageError}
          />
          {!access && (
            <p>
              {t(
                "Поиск недоступен. История и сохранённые находки остаются доступны; фиктивный поиск не выполняется.",
                "Іздеу қолжетімсіз. Тарих пен сақталған табылғандар қолжетімді; жалған іздеу орындалмайды.",
              )}
            </p>
          )}
        </fieldset>
      )}
    </section>
  );
}
