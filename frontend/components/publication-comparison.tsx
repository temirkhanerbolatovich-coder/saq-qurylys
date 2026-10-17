"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type CSSProperties } from "react";
import { date } from "@/lib/api";
import type { Advertisement, Asset, Extraction, Page } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TableRegion } from "@/components/ui/table-region";
import { Demo, LoadState, PageTitle, useData } from "@/components/workspace";

type ComparisonSide = {
  advertisement_id: string;
  advertisement_revision: number;
  source_label: string;
  source_url: string | null;
  published_at: string | null;
  captured_at: string;
  is_demo: boolean;
  text_basis: "ORIGINAL" | "EXTRACTION";
  extraction_id: string | null;
  extraction_revision: number | null;
  pipeline_version: string | null;
  analysis_created_at: string | null;
  source_asset_id: string | null;
  original_assets: Asset[];
  text: string | null;
  text_sha256: string | null;
};
type TextChange = {
  kind: "REPLACE" | "INSERT" | "DELETE";
  left_start_line: number;
  left_end_line: number;
  right_start_line: number;
  right_end_line: number;
  left_text: string;
  right_text: string;
};
type Comparison = {
  left: ComparisonSide;
  right: ComparisonSide;
  status: "IDENTICAL_TEXT" | "DIFFERENT_TEXT" | "TEXT_UNAVAILABLE";
  same_advertisement: boolean;
  same_source_url: boolean | null;
  changes: TextChange[];
};

const textStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  font: "inherit",
  margin: 0,
};
const metadataStyle: CSSProperties = { overflowWrap: "anywhere" };
const columnsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: "var(--space-4)",
};

function SourceUrl({ value }: { value: string | null }) {
  if (!value) return <>Не указан</>;
  // URL is source metadata, not trusted markup or a navigation scheme.
  return /^https?:\/\//i.test(value) ? (
    <a href={value} target="_blank" rel="noreferrer">
      {value}
    </a>
  ) : (
    <>{value}</>
  );
}

function SourcePicker({
  side,
  id,
  extractionId,
  pending,
  onVersion,
  onClear,
}: {
  side: "left" | "right";
  id: string;
  extractionId: string;
  pending: boolean;
  onVersion: (value: string) => void;
  onClear: () => void;
}) {
  const adPath = `/advertisements/${encodeURIComponent(id)}`;
  const versionPath = `${adPath}/extractions`;
  const material = useData<Advertisement>(adPath);
  const versions = useData<Extraction[]>(versionPath);
  const label = side === "left" ? "Слева" : "Справа";
  const ad = material.resolvedPath === adPath ? material.data : null;
  const available =
    versions.resolvedPath === versionPath && !versions.error
      ? versions.data
      : null;
  return (
    <section
      className="panel padded"
      style={{ minWidth: 0 }}
      aria-label={`Выбор текста: ${label}`}
    >
      <h2>{label}</h2>
      {material.resolvedPath !== adPath || material.error || !ad ? (
        <LoadState
          error={material.resolvedPath === adPath ? material.error : ""}
          retry={material.reload}
        />
      ) : (
        <p>
          <Demo value={ad.is_demo} /> {ad.source_label}{" "}
          <Link className="text-link" href={`/advertisements/${id}`}>
            Открыть оригинал
          </Link>
        </p>
      )}
      <p className="field-help" style={metadataStyle}>
        ID материала: {id}
      </p>
      <label htmlFor={`comparison-${side}-version`}>
        Текст {label.toLowerCase()}
      </label>
      <select
        id={`comparison-${side}-version`}
        value={extractionId}
        disabled={pending}
        onChange={(event) => onVersion(event.target.value)}
        aria-describedby={`comparison-${side}-help`}
      >
        <option value="">Оригинальный текст</option>
        {extractionId &&
          !available?.some((item) => item.id === extractionId) && (
            <option value={extractionId}>
              Выбранная версия: {extractionId}
            </option>
          )}
        {available?.map((item) => (
          <option key={item.id} value={item.id}>
            {date(item.created_at)} · {item.pipeline_version} · {item.id}
          </option>
        ))}
      </select>
      <p id={`comparison-${side}-help`} className="field-help">
        OCR и ручные расшифровки выбираются явно. Оригинал изображения может не
        содержать текста. Архивные версии доступны для чтения.
      </p>
      {versions.resolvedPath !== versionPath || versions.error ? (
        <LoadState
          error={versions.resolvedPath === versionPath ? versions.error : ""}
          retry={versions.reload}
        />
      ) : available?.length === 0 ? (
        <p className="muted">Сохранённых версий анализа нет.</p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={pending}
      >
        Очистить выбор {label.toLowerCase()}
      </Button>
    </section>
  );
}

function SelectedText({
  side,
  label,
}: {
  side: ComparisonSide;
  label: string;
}) {
  return (
    <section
      className="panel padded"
      style={{ minWidth: 0 }}
      aria-label={`Сравниваемый источник: ${label}`}
    >
      <h3>
        {label}: {side.source_label}
      </h3>
      <Demo value={side.is_demo} />
      <p>
        <Link
          className="text-link"
          href={`/advertisements/${side.advertisement_id}`}
        >
          Оригинал материала
        </Link>
      </p>
      <dl
        className="review-provenance"
        style={{ ...metadataStyle, display: "block" }}
      >
        <div>
          <dt>Публикация</dt>
          <dd>{date(side.published_at)}</dd>
        </div>
        <div>
          <dt>Зафиксировано</dt>
          <dd>{date(side.captured_at)}</dd>
        </div>
        <div>
          <dt>URL</dt>
          <dd>
            <SourceUrl value={side.source_url} />
          </dd>
        </div>
        <div>
          <dt>Текст</dt>
          <dd>
            {side.text_basis === "ORIGINAL"
              ? "Оригинальный текст"
              : "Версия анализа / расшифровки"}
          </dd>
        </div>
        <div>
          <dt>Материал</dt>
          <dd>
            {side.advertisement_id} · ревизия {side.advertisement_revision}
          </dd>
        </div>
        {side.extraction_id && (
          <>
            <div>
              <dt>Версия</dt>
              <dd>
                {side.extraction_id} · ревизия {side.extraction_revision}
              </dd>
            </div>
            <div>
              <dt>Обработка</dt>
              <dd>{side.pipeline_version}</dd>
            </div>
            <div>
              <dt>Создан анализ</dt>
              <dd>{date(side.analysis_created_at)}</dd>
            </div>
          </>
        )}
        <div>
          <dt>SHA-256 текста</dt>
          <dd>{side.text_sha256 || "Недоступен: текст отсутствует"}</dd>
        </div>
        <div>
          <dt>Исходник текста</dt>
          <dd>{side.source_asset_id || "Связанный исходник не установлен"}</dd>
        </div>
      </dl>
      <details>
        <summary>Полный выбранный текст</summary>
        {side.text !== null && side.text.trim() ? (
          <pre style={textStyle}>{side.text}</pre>
        ) : (
          <p className="muted">Выбранный текст отсутствует или пуст.</p>
        )}
      </details>
      <details>
        <summary>
          Сохранённые оригинальные файлы ({side.original_assets.length})
        </summary>
        <p className="field-help">
          Это metadata сохранённых файлов. Доступность и целостность файла
          повторно не проверялись.
        </p>
        {side.original_assets.length === 0 && (
          <p className="muted">Оригинальных файлов нет.</p>
        )}
        {side.original_assets.map((asset) => (
          <div className="asset" key={asset.id} style={metadataStyle}>
            <a className="text-link" href={`/api/v1/assets/${asset.id}`}>
              Скачать исходник {asset.kind}
            </a>{" "}
            <Demo value={asset.is_demo} />
            <p>SHA-256 файла: {asset.sha256}</p>
            <p>
              {asset.byte_size} байт · зафиксировано {date(asset.captured_at)}
            </p>
          </div>
        ))}
      </details>
    </section>
  );
}

const resultLabels: Record<Comparison["status"], string> = {
  IDENTICAL_TEXT: "Выбранные тексты совпадают посимвольно",
  DIFFERENT_TEXT: "В выбранных текстах есть различия",
  TEXT_UNAVAILABLE: "Сравнение недоступно: выбранный текст отсутствует",
};
const changeLabels: Record<TextChange["kind"], string> = {
  REPLACE: "Замена",
  INSERT: "Добавление справа",
  DELETE: "Удаление справа",
};

function ComparisonResult({ path }: { path: string }) {
  const result = useData<Comparison>(path);
  if (result.resolvedPath !== path || result.error || !result.data)
    return (
      <LoadState
        error={result.resolvedPath === path ? result.error : ""}
        retry={result.reload}
      />
    );
  const comparison = result.data;
  return (
    <section aria-label="Результат сравнения">
      <h2 aria-live="polite">{resultLabels[comparison.status]}</h2>
      <p>
        {comparison.same_advertisement
          ? "Выбран один материал с двух сторон."
          : "Выбраны два разных сохранённых материала."}{" "}
        {comparison.same_source_url === null
          ? "Один или оба URL неизвестны."
          : comparison.same_source_url
            ? "Сохранённые URL совпадают буквально."
            : "Сохранённые URL различаются."}
      </p>
      <p className="field-help">
        SHA-256 относится к выбранному DB-тексту, а не к файлу. Слева → справа —
        заданное направление сравнения, а не доказательство хронологии.
      </p>
      <div style={columnsStyle}>
        <SelectedText side={comparison.left} label="Слева" />
        <SelectedText side={comparison.right} label="Справа" />
      </div>
      {comparison.status === "TEXT_UNAVAILABLE" && (
        <p className="notice">
          Для изображения явно выберите сохранённую версию OCR / расшифровки.
          Отсутствие текста не означает совпадение.
        </p>
      )}
      {comparison.status === "DIFFERENT_TEXT" && (
        <>
          <h3>Изменённые блоки: {comparison.changes.length}</h3>
          <p className="field-help">
            Индексы строк с нуля, конец диапазона не включён: [начало, конец).
            Пробелы и окончания строк учитываются. Неизменённый контекст
            доступен в полных текстах выше.
          </p>
          <TableRegion label="Различия текстов — таблица с горизонтальной прокруткой">
            <table>
              <thead>
                <tr>
                  <th scope="col">Изменение</th>
                  <th scope="col">Слева</th>
                  <th scope="col">Справа</th>
                </tr>
              </thead>
              <tbody>
                {comparison.changes.map((change, index) => (
                  <tr key={index}>
                    <td>{changeLabels[change.kind]}</td>
                    <td>
                      <p>
                        Строки [{change.left_start_line}, {change.left_end_line}
                        )
                      </p>
                      <pre style={textStyle}>{change.left_text}</pre>
                    </td>
                    <td>
                      <p>
                        Строки [{change.right_start_line},{" "}
                        {change.right_end_line})
                      </p>
                      <pre style={textStyle}>{change.right_text}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        </>
      )}
    </section>
  );
}

export function PublicationComparisonView() {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const left = params.get("left_id") || "";
  const right = params.get("right_id") || "";
  const leftVersion = params.get("left_extraction_id") || "";
  const rightVersion = params.get("right_extraction_id") || "";
  const pageInput = Number(params.get("catalog_page") || 1);
  const page = Number.isSafeInteger(pageInput) && pageInput > 0 ? pageInput : 1;
  const catalogPath = `/advertisements?page=${page}&page_size=20`;
  const catalog = useData<Page<Advertisement>>(catalogPath);
  const entries =
    catalog.resolvedPath === catalogPath && !catalog.error
      ? catalog.data
      : null;
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() =>
      router.push(`/comparison?${next}`, { scroll: false }),
    );
  }
  function choose(side: "left" | "right", value: string) {
    update({ [`${side}_id`]: value, [`${side}_extraction_id`]: "" });
  }
  const query = new URLSearchParams({ left_id: left, right_id: right });
  if (leftVersion) query.set("left_extraction_id", leftVersion);
  if (rightVersion) query.set("right_extraction_id", rightVersion);
  const comparisonPath = `/advertisements/compare?${query}`;
  return (
    <>
      <PageTitle
        eyebrow="СОХРАНЁННЫЕ ИСТОЧНИКИ"
        title="Сравнение публикаций"
        description="Выберите два сохранённых текста или две версии одного материала. Сравнение только читает данные и не принимает решений."
        action={false}
      />
      <p className="notice">
        Совпадение текста / URL не доказывает дубль, авторство, связь с ЖК или
        нарушение. DEMO и реальные материалы сравниваются раздельно. Лимит: 100
        000 символов и 1 000 строк на сторону; текст не обрезается.
      </p>
      <div style={columnsStyle}>
        {(["left", "right"] as const).map((side) => {
          const id = side === "left" ? left : right;
          const version = side === "left" ? leftVersion : rightVersion;
          return id ? (
            <SourcePicker
              key={`${side}:${id}`}
              side={side}
              id={id}
              extractionId={version}
              pending={pending}
              onVersion={(value) =>
                update({ [`${side}_extraction_id`]: value })
              }
              onClear={() => choose(side, "")}
            />
          ) : (
            <section className="panel padded" key={side}>
              <h2>{side === "left" ? "Слева" : "Справа"}</h2>
              <p className="muted">Выберите материал в списке ниже.</p>
            </section>
          );
        })}
      </div>
      {left && right ? (
        <ComparisonResult key={comparisonPath} path={comparisonPath} />
      ) : (
        <p className="muted" role="status">
          Для сравнения выберите материал слева и справа.
        </p>
      )}
      <section className="panel" aria-label="Выбор сохранённых материалов">
        <div className="panel-heading">
          <div>
            <h2>Сохранённые материалы</h2>
            <p>
              Выбор стороны не запускает анализ. Можно выбрать один материал
              дважды.
            </p>
          </div>
        </div>
        {!entries ? (
          <LoadState
            error={catalog.resolvedPath === catalogPath ? catalog.error : ""}
            retry={catalog.reload}
          />
        ) : (
          <>
            {entries.items.length === 0 ? (
              <p className="empty">
                На этой странице нет сохранённых материалов.
              </p>
            ) : (
              <TableRegion label="Материалы для сравнения — таблица с горизонтальной прокруткой">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Материал</th>
                      <th scope="col">Публикация / фиксация</th>
                      <th scope="col">Выбор стороны</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Demo value={item.is_demo} />{" "}
                          <Link href={`/advertisements/${item.id}`}>
                            {item.source_label}
                          </Link>
                          <p className="field-help" style={metadataStyle}>
                            {item.id}
                          </p>
                        </td>
                        <td>
                          {date(item.published_at)}
                          <br />
                          {date(item.captured_at)}
                        </td>
                        <td>
                          <div className="review-actions">
                            <Button
                              type="button"
                              variant="outline"
                              aria-label={`Выбрать слева: ${item.source_label}`}
                              aria-pressed={left === item.id}
                              disabled={pending}
                              onClick={() => choose("left", item.id)}
                            >
                              Слева
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              aria-label={`Выбрать справа: ${item.source_label}`}
                              aria-pressed={right === item.id}
                              disabled={pending}
                              onClick={() => choose("right", item.id)}
                            >
                              Справа
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
            )}
            <Pagination
              label="Страницы материалов для сравнения"
              page={entries.page}
              pageSize={entries.page_size}
              total={entries.total}
              onPageChange={(value) => update({ catalog_page: String(value) })}
            />
          </>
        )}
      </section>
    </>
  );
}
