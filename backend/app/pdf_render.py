"""Trusted text-only signal PDF template. No user HTML or fetched resources."""

import html
import json
import subprocess
import sys

from app.ocr import AnalysisError


def text(value):
    return html.escape(str(value if value is not None else 'Не указано'), quote=True)


def fields(values):
    return '<dl>' + ''.join(f'<dt>{text(label)}</dt><dd>{text(value)}</dd>' for label, value in values) + '</dl>'


def evidence_dates(evidence):
    if evidence.get('kind') not in {'ADVERTISEMENT_FRAGMENT', 'ADVERTISEMENT_PUBLICATION'}:
        return [('Дата события', evidence.get('event_at')), ('Получен', evidence.get('captured_at'))]
    basis = evidence.get('date_basis', 'LEGACY_UNSPECIFIED')
    values = [
        (
            'Дата публикации',
            evidence.get('published_at')
            if basis == 'PUBLICATION' and evidence.get('published_at')
            else 'Дата публикации неизвестна',
        ),
        ('Зафиксировано', evidence.get('captured_at')),
    ]
    if basis == 'LEGACY_UNSPECIFIED':
        values.append(('Историческая дата', 'Дата публикации не подтверждена; тип даты исторически не определён'))
        if evidence.get('event_at'):
            values.append(('Сохранённое значение даты (тип не определён)', evidence['event_at']))
    return values


def signal_html(payload):
    """Render only escaped scalar values from the saved snapshot and decision."""
    snapshot, signal = payload['snapshot'], payload['signal']
    prop = snapshot['property']
    risk = signal['risk_snapshot']
    pieces = [
        '<!doctype html><html lang="ru"><meta charset="utf-8"><title>SAQ QURYLYS - сигнал</title>',
        '<style>@page{size:A4;margin:17mm 16mm 19mm;@bottom-right{content:"Страница " counter(page) " / " counter(pages);font-size:9pt;color:#526275}}'
        'body{font:10pt "DejaVu Sans",sans-serif;color:#17283d;line-height:1.45}'
        'h1{font-size:22pt;margin:0 0 6mm}h2{font-size:14pt;margin:7mm 0 3mm;break-after:avoid}'
        'h3{font-size:11pt;margin:5mm 0 2mm;break-after:avoid}'
        'p,li,dd{overflow-wrap:anywhere;white-space:pre-wrap}dl{margin:2mm 0 4mm}'
        'dt{color:#526275;font-size:9pt;margin-top:2mm}dd{margin:0}'
        '.banner{border:1pt solid #226b67;background:#eaf6f4;padding:4mm;margin:3mm 0}'
        '.item{border-top:0.6pt solid #ccd7df;padding-top:2mm;margin-top:3mm}'
        '.hash{font:8pt "DejaVu Sans Mono",monospace;overflow-wrap:anywhere}'
        '.muted{color:#526275}strong{font-weight:bold}</style><body>',
        '<h1>SAQ QURYLYS</h1><p class="muted">Сигнальная карточка - исторический снимок</p>',
    ]
    if signal['is_demo']:
        pieces.append('<div class="banner"><strong>DEMO - синтетические данные</strong></div>')
    pieces.append('<p>' + text(snapshot['disclaimer']) + '</p>')
    pieces.append(
        fields(
            [
                ('Объект', prop['name']),
                ('Адрес / город', f'{prop["city"]}, {prop["address"]}'),
                ('Идентификатор сигнала', signal['id']),
                ('Версия / ревизия решения', f'{signal["version"]} / {signal["revision"]}'),
                ('Снимок создан', signal['created_at']),
                ('Автор', signal['created_by']['display_name']),
                (
                    'Статус',
                    {
                        'DRAFT': 'Черновик - решение не принято',
                        'CONFIRMED': 'Подтверждён человеком',
                        'RETURNED': 'Возвращён на доработку',
                    }[signal['state']],
                ),
                ('Баллы / зона', f'{risk["score"]} / {risk["zone"]}'),
                ('Правила', risk['rules_version']),
                ('Ревизия данных объекта', risk['revision']),
                ('Дата оценки риска', risk['as_of']),
                ('Предыдущая версия', signal.get('previous_signal_id')),
            ]
        )
    )
    pieces.append(
        fields(
            [
                ('Подтверждённые коды', ', '.join(risk['confirmed_codes']) or 'Нет'),
                ('Неустановленные коды', ', '.join(risk['unknown_codes']) or 'Нет'),
            ]
        )
    )
    pieces.append(
        '<p>Баллы учитывают только подтверждённые факторы. Нулевой результат означает '
        'отсутствие подтверждённых факторов, а не полноту проверки. '
        'Список записей ниже может не содержать всех шести кодов.</p>'
    )
    if risk['zone'] == 'GREEN':
        pieces.append('<p class="banner">Зелёная зона не подтверждает безопасность объекта</p>')
    pieces.append('<h2>Решение человека</h2>')
    for decision in payload['decisions']:
        pieces.append(
            fields(
                [
                    ('Действие', 'Подтвердить' if decision['action'] == 'CONFIRM' else 'Вернуть'),
                    ('Кто / когда', f'{decision["actor"]["display_name"]} / {decision["decided_at"]}'),
                    ('Причина', decision['reason']),
                ]
            )
        )
    if not payload['decisions']:
        pieces.append('<p>Решение ещё не принято. Черновик не является утверждением.</p>')
    pieces.append('<h2>Неизвестные сведения</h2><ul>')
    pieces.extend('<li>' + text(value) + '</li>' for value in snapshot['unknown_information'])
    pieces.append('</ul><h2>Факторы</h2>')
    for factor in snapshot['factors']:
        pieces.append(
            '<div class="item">'
            + fields(
                [
                    ('Код / статус / вес', f'{factor["code"]} / {factor["status"]} / {factor["weight"]}'),
                    ('Момент оценки', factor['as_of']),
                    ('Проверено', factor.get('reviewed_at')),
                    ('Проверяющий (исторический ID)', factor.get('reviewed_by')),
                    ('Имя проверяющего в снимке', (factor.get('reviewed_by_details') or {}).get('display_name')),
                    ('Обоснование', factor.get('reason')),
                    ('Доказательства', ', '.join(factor['evidence_ids'])),
                ]
            )
            + '</div>'
        )
    pieces.append('<h2>Правовые основания</h2>')
    for basis in snapshot['legal_bases']:
        pieces.append(
            '<div class="item">'
            + fields(
                [
                    ('Механизм / статус', f'{basis["mechanism"]} / {basis["verification_status"]}'),
                    ('Номер / дата', f'{basis.get("document_number")} / {basis.get("document_date")}'),
                    ('Издатель', basis['issuer']),
                    ('Область', basis['scope_description']),
                    ('Источник', basis.get('source_url')),
                    ('Получен', basis.get('captured_at')),
                    ('Период действия с', basis.get('applies_from')),
                    ('Период действия по', basis.get('applies_until')),
                    ('Проверено на дату', basis.get('verification_as_of')),
                    ('Решение принято', basis.get('reviewed_at')),
                    ('Проверяющий (исторический ID)', basis.get('reviewed_by')),
                    ('Имя проверяющего в снимке', (basis.get('reviewed_by_details') or {}).get('display_name')),
                ]
            )
            + '</div>'
        )
    pieces.append('<h2>Доказательства и происхождение</h2>')
    for evidence in snapshot['evidence']:
        fragment = evidence.get('fragment') or {}
        pieces.append(
            '<div class="item">'
            + fields(
                [
                    ('ID / вид', f'{evidence["id"]} / {evidence["kind"]}'),
                    ('Описание', evidence['description']),
                    ('Источник', evidence.get('source_label')),
                    ('URL', evidence.get('source_url')),
                    *evidence_dates(evidence),
                    ('Проверяемое отсутствие на', evidence.get('absence_as_of')),
                    ('Область', evidence.get('scope_description')),
                    ('Методика', evidence.get('methodology')),
                    ('Фрагмент', fragment.get('quote')),
                    ('Оригинал / asset ID', evidence['asset_id']),
                ]
            )
        )
        # Preserve typed construction/absence facts instead of silently dropping them from the report.
        typed = {
            key: value
            for key, value in evidence.items()
            if value is not None
            and key
            in {
                'legal_checks',
                'signatory_count',
                'construction_stage',
                'measurement_percent',
                'measurement_role',
                'comparison_key',
                'planned_completion_at',
                'actual_completion_at',
                'delay_status',
            }
        }
        if typed:
            pieces.append('<p>' + text(json.dumps(typed, ensure_ascii=False, indent=2)) + '</p>')
        pieces.append('</div>')
    pieces.append('<h2>Сохранённые файлы</h2>')
    for asset in snapshot['assets']:
        pieces.append(
            '<div class="item">'
            + fields(
                [
                    ('ID / формат', f'{asset["id"]} / {asset["mime_type"]}'),
                    ('Размер / получен', f'{asset["byte_size"]} байт / {asset["captured_at"]}'),
                ]
            )
            + '<p class="hash">SHA-256: '
            + text(asset['sha256'])
            + '</p></div>'
        )
    pieces.append(
        '<p class="muted">Снимок не обновляется после изменения текущих данных. '
        'SHA-256 позволяет проверить целостность копии, но не устанавливает подлинность источника. '
        'Автоматическая отправка в органы не выполняется.</p></body></html>'
    )
    return ''.join(pieces)


def render_pdf(payload, settings):
    """Bound a separate native renderer process so a slow layout cannot stall the worker."""
    encoded = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    if len(encoded) > 5_000_000:
        raise AnalysisError('PDF_TOO_LARGE', 'Снимок слишком большой для PDF. Сохранённый сигнал доступен.')
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'app.pdf_render'],
            input=encoded,
            capture_output=True,
            timeout=settings.pdf_timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise AnalysisError('PDF_TIMEOUT', 'Генерация PDF превысила время ожидания. Можно повторить.') from None
    if result.returncode or not result.stdout.startswith(b'%PDF-'):
        raise AnalysisError('PDF_FAILED', 'PDF недоступен. Проверьте WeasyPrint/Pango и повторите генерацию.')
    if len(result.stdout) > settings.max_upload_bytes:
        raise AnalysisError('PDF_TOO_LARGE', 'PDF превышает допустимый размер. Сигнал сохранён.')
    return result.stdout


def main():
    from weasyprint import HTML
    from weasyprint.urls import FatalURLFetchingError, URLFetcher

    class NoResources(URLFetcher):
        def fetch(self, url, headers=None):
            raise FatalURLFetchingError('External and local resources are disabled')

    payload = json.load(sys.stdin)
    # System DejaVu fonts are selected by fontconfig; arbitrary file/network URLs are denied.
    document = HTML(string=signal_html(payload), url_fetcher=NoResources()).write_pdf()
    sys.stdout.buffer.write(document)


if __name__ == '__main__':
    main()
