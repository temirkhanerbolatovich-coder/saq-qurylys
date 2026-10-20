"use client";
import { useContext } from "react";
import { useLocale } from "@/lib/locale";
import { useReviewDraft } from "@/lib/use-review-draft";
import { useMonitoringCommand } from "@/lib/use-monitoring-command";
import type { Activation, V2Profile, V2Parameters } from "@/lib/monitoring-v2";
import { Auth } from "@/components/workspace";
import { V2Notice as Notice } from "@/components/monitoring-v2-feedback";
import { Button } from "@/components/ui/button";

export function V2ProfileEditor({
  active,
  existing,
  onSaved,
}: {
  active: Activation | null;
  existing?: V2Profile;
  onSaved: (p: V2Profile) => void;
}) {
  const { user } = useContext(Auth);
  const { t } = useLocale();
  const draft = useReviewDraft(
    user?.id || "",
    `v2:profile:${existing ? `${existing.id}:${existing.revision}` : "new"}`,
    {
      name: existing?.name || "",
      language: existing?.parameters.language || "both",
      budget: String(existing?.parameters.budget || 10),
    },
  );
  const action = useMonitoringCommand(`v2:profile:${existing?.id || "new"}`);
  const budget = Number(draft.values.budget);
  async function save() {
    if (!active?.dictionary_id) return;
    const parameters: V2Parameters = {
      dictionary_version: "2.0",
      dictionary_id: active.dictionary_id,
      source_code: "OFFLINE",
      keyword: true,
      hashtag: false,
      budget,
      max_query_length: 300,
      language: draft.values.language as V2Parameters["language"],
    };
    const result = await action.run<V2Profile>(
      existing
        ? `/monitoring/query-profiles/${existing.id}/versions`
        : "/monitoring/query-profiles",
      {
        name: draft.values.name.trim(),
        parameters,
        ...(existing ? { expected_revision: existing.current_revision } : {}),
      },
    );
    if (result) {
      draft.saved();
      onSaved(result);
    }
  }
  return (
    <fieldset disabled={action.busy}>
      <legend>
        {existing
          ? t("Новая версия профиля V2", "V2 профилінің жаңа нұсқасы")
          : t("Создание профиля V2", "V2 профилін жасау")}
      </legend>
      {!active?.dictionary_id && (
        <p>
          {t(
            "Сначала активируйте словарь V2. Доступ к источнику проверяется отдельно.",
            "Алдымен V2 сөздігін белсендіріңіз. Дереккөзге қолжетімділік бөлек тексеріледі.",
          )}
        </p>
      )}
      <div className="monitoring-fields">
        <label className="monitoring-field">
          <span>{t("Название профиля V2", "V2 профилінің атауы")}</span>
          <input
            maxLength={100}
            value={draft.values.name}
            onChange={(e) => draft.update({ name: e.target.value })}
          />
        </label>
        <label className="monitoring-field">
          <span>{t("Язык запросов V2", "V2 сұрауларының тілі")}</span>
          <select
            value={draft.values.language}
            onChange={(e) =>
              draft.update({
                language: e.target.value as V2Parameters["language"],
              })
            }
          >
            <option value="both">RU + KZ</option>
            <option value="ru">RU</option>
            <option value="kk">KZ</option>
          </select>
        </label>
        <label className="monitoring-field">
          <span>{t("Бюджет фраз V2", "V2 тіркестер бюджеті")}</span>
          <input
            type="number"
            min={1}
            max={100}
            value={draft.values.budget}
            onChange={(e) => draft.update({ budget: e.target.value })}
          />
        </label>
      </div>
      <p className="field-help">
        {t(
          "Keyword, до 300 символов. Бюджет ограничивает сохранённый набор фраз, а не запускает их. Исходные параметры исторической версии доступны ниже.",
          "Keyword, 300 таңбаға дейін. Бюджет сақталатын тіркестер санын шектейді, оларды іске қоспайды. Тарихи нұсқаның бастапқы параметрлері төменде берілген.",
        )}
      </p>
      <Button
        disabled={
          !active?.dictionary_id ||
          !draft.values.name.trim() ||
          !Number.isInteger(budget) ||
          budget < 1 ||
          budget > 100
        }
        onClick={() => void save()}
      >
        {action.busy
          ? t("Сохранение…", "Сақталуда…")
          : existing
            ? t("Сохранить новую версию V2", "V2 жаңа нұсқасын сақтау")
            : t("Сохранить профиль V2", "V2 профилін сақтау")}
      </Button>
      <Notice
        error={action.error || action.storageError || draft.storageError}
      />
      {draft.restored && (
        <p role="status">
          {t(
            "Черновик восстановлен. Проверьте параметры.",
            "Жоба қалпына келтірілді. Параметрлерді тексеріңіз.",
          )}
        </p>
      )}
    </fieldset>
  );
}
