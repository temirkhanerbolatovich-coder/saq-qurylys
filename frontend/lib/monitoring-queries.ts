import dictionary from "@/lib/monitoring-dictionary-v1.json";

/** Search suggestions only; no classification or risk changes. */
export const keywordVersion = dictionary.version;
export const cityAliases = dictionary.city_aliases;
export const searchTopics = dictionary.topics;
export type QueryLanguage = "ru" | "kk";

export function buildMonitoringQueries(
  city: string,
  language: QueryLanguage,
  topic: string,
  project: string,
) {
  const name = project.replace(/\s+/g, " ").trim().slice(0, 100);
  const context = language === "ru" ? "ЖК" : "тұрғын үй кешені";
  const phrases = searchTopics
    .filter((item) => topic === "all" || item.id === topic)
    .flatMap((item) => [...item.phrases[language]]);
  // Each alias, including short УКА/ВКО/ШҚО, always has construction context.
  return [
    ...new Set(
      phrases.map((phrase) =>
        [city, context, name, phrase].filter(Boolean).join(" "),
      ),
    ),
  ];
}
