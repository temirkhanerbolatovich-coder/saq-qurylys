"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/lib/locale";

/** Names the actual intake paths without claiming an automatic source connection. */
export function SourceSummary() {
  const { t } = useLocale();
  return (
    <section
      className="panel source-summary"
      aria-labelledby="overview-sources-title"
    >
      <header>
        <h2 id="overview-sources-title">
          {t("Наши источники", "Біздің дереккөздер")}
        </h2>
        <Link href="/sources">
          {t("Все источники и ограничения", "Барлық дереккөздер мен шектеулер")}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </header>
      <dl>
        <div>
          <dt>
            <a
              href="https://www.angroups.kz/payment"
              target="_blank"
              rel="noreferrer"
            >
              AN GROUPS
            </a>
          </dt>
          <dd>
            {t(
              "Условия оплаты: импорт по ссылке с HTML-оригиналом. ЖК и очередь проверяются отдельно.",
              "Төлем шарттары: HTML түпнұсқасымен сілтеме арқылы импорттау. ТК мен кезек бөлек тексеріледі.",
            )}
          </dd>
        </div>
        <div>
          <dt>
            <a href="https://www.gov.kz/" target="_blank" rel="noreferrer">
              Gov.kz
            </a>
          </dt>
          <dd>
            {t(
              "Атрибуция переданной выгрузки. Первичные документы проверяются отдельно.",
              "Берілген файлдағы дереккөз. Бастапқы құжаттар бөлек тексеріледі.",
            )}
          </dd>
        </div>
        <div>
          <dt>
            <a
              href="https://primeminister.kz/"
              target="_blank"
              rel="noreferrer"
            >
              Primeminister.kz
            </a>
          </dt>
          <dd>
            {t(
              "Ограниченный импорт информационных публикаций по ссылке · CC BY 4.0.",
              "Ақпараттық жарияланымдардың сілтеме арқылы шектеулі импорты · CC BY 4.0.",
            )}
          </dd>
        </div>
        <div>
          <dt>
            <a href="https://khc.kz/" target="_blank" rel="noreferrer">
              {t(
                "Казахстанская Жилищная Компания",
                "Қазақстан Тұрғын үй Компаниясы",
              )}
            </a>
          </dt>
          <dd>
            {t(
              "PDF загружает оператор. Найденная строка не подтверждает применимость основания.",
              "PDF файлын оператор жүктейді. Табылған жол негіздің қолданылуын растамайды.",
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
