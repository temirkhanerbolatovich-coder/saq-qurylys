"use client";
import { useLocale } from "@/lib/locale";

import Link from "next/link";
import { useRef, useState } from "react";
import type {
  Page,
  Property,
  PropertyReference,
  PropertyStructure as Structure,
} from "@/lib/types";
import { propertyDossierUrl, propertyLevelLabels } from "@/lib/presentation";
import { LoadState, useData } from "@/components/workspace";
import { Pagination } from "@/components/ui/pagination";

/** Navigation follows saved relationships; names never establish a relationship. */
export function PropertyStructure({
  row,
  registryQuery,
}: {
  row: Property;
  registryQuery: string;
}) {
  const { t } = useLocale();
  const [childrenPage, setChildrenPage] = useState(1);
  const [siblingsPage, setSiblingsPage] = useState(1);
  const content = useRef<HTMLDivElement>(null);
  const path = `/properties/${row.id}/structure?children_page=${childrenPage}&siblings_page=${siblingsPage}&page_size=10`;
  const result = useData<Structure>(path);
  const settled = result.resolvedPath === path;
  const data = settled && !result.error ? result.data : null;
  function changePage(kind: "children" | "siblings", page: number) {
    if (kind === "children") setChildrenPage(page);
    else setSiblingsPage(page);
    content.current?.focus();
  }
  return (
    <section
      className="property-structure"
      aria-label={t("Структура жилого комплекса")}
    >
      <nav aria-label={t("Положение объекта в структуре")}>
        <ol className="property-ancestors">
          {data?.ancestors.map((ancestor) => (
            <li key={ancestor.id}>
              <Link href={propertyDossierUrl(ancestor.id, registryQuery)}>
                {propertyLevelLabels[ancestor.level]}: {ancestor.name}
                {ancestor.is_demo && " · DEMO"}
              </Link>
              <span aria-hidden="true">›</span>
            </li>
          ))}
          <li aria-current="page">
            {propertyLevelLabels[row.level] || "Объект"}
          </li>
        </ol>
      </nav>
      <details>
        <summary>
          {t("Очереди и корпуса")}
          {settled && result.error ? " · связи не загружены" : ""}
        </summary>
        <div
          ref={content}
          tabIndex={-1}
          className="property-structure-content"
          aria-busy={!settled}
        >
          {!data ? (
            <LoadState
              error={settled ? result.error : ""}
              retry={result.reload}
            />
          ) : (
            <>
              <p className="field-help">
                {t(
                  "Только сохранённые связи. Документы, правовой статус и риск проверяются отдельно для каждого объекта.",
                )}
              </p>
              {!data.ancestors.length && (
                <p>{t("Родительский объект не указан.")}</p>
              )}
              <RelatedObjects
                title={t("В составе этого объекта")}
                rows={data.children}
                registryQuery={registryQuery}
                onPage={(page) => changePage("children", page)}
              />
              {!!data.ancestors.length && (
                <RelatedObjects
                  title={t("С тем же родительским объектом")}
                  rows={data.siblings}
                  registryQuery={registryQuery}
                  onPage={(page) => changePage("siblings", page)}
                />
              )}
            </>
          )}
        </div>
      </details>
    </section>
  );
}

function RelatedObjects({
  title,
  rows,
  registryQuery,
  onPage,
}: {
  title: string;
  rows: Page<PropertyReference>;
  registryQuery: string;
  onPage: (page: number) => void;
}) {
  const { t } = useLocale();
  return (
    <section aria-label={title}>
      <h2>
        {title} · {rows.total}
      </h2>
      {!rows.total ? (
        <p>{t("Связанные объекты не указаны.")}</p>
      ) : !rows.items.length ? (
        <p>
          {t(
            "На этой странице нет объектов. Вернитесь на предыдущую страницу.",
          )}
        </p>
      ) : (
        <ul className="property-relations">
          {rows.items.map((item) => (
            <li key={item.id}>
              <Link href={propertyDossierUrl(item.id, registryQuery)}>
                <span>
                  {propertyLevelLabels[item.level]} · {item.name}
                  {item.is_demo && " · DEMO"}
                </span>
                <small>{item.address}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(rows.total > rows.page_size || rows.page > 1) && (
        <Pagination
          page={rows.page}
          pageSize={rows.page_size}
          total={rows.total}
          onPageChange={onPage}
          label={`Страницы: ${title}`}
        />
      )}
    </section>
  );
}
