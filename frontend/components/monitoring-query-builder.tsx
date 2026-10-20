"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { MonitoringQueryProfiles } from "@/components/monitoring-query-profiles";
import {
  buildMonitoringQueries,
  cityAliases,
  keywordVersion,
  searchTopics,
  type QueryLanguage,
} from "@/lib/monitoring-queries";

export function MonitoringQueryBuilder({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (query: string) => void;
}) {
  const { t } = useLocale();
  const [city, setCity] = useState<string>("Өскемен");
  const [language, setLanguage] = useState<QueryLanguage>("ru");
  const [topic, setTopic] = useState("all");
  const [project, setProject] = useState("");
  const [applied, setApplied] = useState(false);
  const queries = buildMonitoringQueries(city, language, topic, project);
  return (
    <details className="monitoring-query-builder">
      <summary>
        {t("Подготовить фразы RU/KZ", "RU/KZ іздеу тіркестерін дайындау")}
      </summary>
      <p className="field-help">
        {t("Словарь", "Сөздік")} {keywordVersion}.{" "}
        {t(
          "Подстановка меняет только черновик. Поиск запускается отдельно и требует доступа к источнику.",
          "Қою тек жоба мәтінін өзгертеді. Іздеу бөлек іске қосылады және дереккөзге қолжетімділікті талап етеді.",
        )}
      </p>
      <fieldset disabled={disabled} onChange={() => setApplied(false)}>
        <legend>
          {t("Параметры поисковых фраз", "Іздеу тіркестерінің параметрлері")}
        </legend>
        <div className="monitoring-fields">
          <label className="monitoring-field">
            <span>
              {t("Вариант города / региона", "Қала / өңір атауының нұсқасы")}
            </span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              {cityAliases.map((alias) => (
                <option key={alias}>{alias}</option>
              ))}
            </select>
          </label>
          <label className="monitoring-field">
            <span>{t("Язык поисковой фразы", "Іздеу тіркесінің тілі")}</span>
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as QueryLanguage)
              }
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
            </select>
          </label>
          <label className="monitoring-field">
            <span>{t("Тема поиска", "Іздеу тақырыбы")}</span>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            >
              <option value="all">{t("Все темы", "Барлық тақырыптар")}</option>
              {searchTopics.map((item) => (
                <option value={item.id} key={item.id}>
                  {t(item.ru, item.kk)}
                </option>
              ))}
            </select>
          </label>
          <label className="monitoring-field">
            <span>
              {t("Название ЖК (необязательно)", "ТК атауы (міндетті емес)")}
            </span>
            <input
              value={project}
              maxLength={100}
              onChange={(event) => setProject(event.target.value)}
            />
          </label>
        </div>
        <ul
          className="monitoring-query-list"
          aria-label={t("Подготовленные фразы", "Дайындалған тіркестер")}
        >
          {queries.map((query) => (
            <li key={query}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onSelect(query);
                  setApplied(true);
                }}
              >
                {query}
              </Button>
            </li>
          ))}
        </ul>
      </fieldset>
      <MonitoringQueryProfiles
        disabled={disabled}
        parameters={{
          dictionary_version: "1.0",
          city,
          language,
          topic,
          project,
        }}
        onApply={(parameters) => {
          setCity(parameters.city);
          setLanguage(parameters.language);
          setTopic(parameters.topic);
          setProject(parameters.project);
          setApplied(false);
        }}
      />
      {applied && (
        <p role="status">
          {t(
            "Фраза подставлена. Проверьте её перед отдельным запуском поиска.",
            "Тіркес қойылды. Іздеуді бөлек іске қоспас бұрын оны тексеріңіз.",
          )}
        </p>
      )}
    </details>
  );
}
