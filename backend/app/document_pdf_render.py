"""Bounded PDF copies. No user HTML, file URLs or network resources enter the renderer."""

import json
import subprocess
import sys
from threading import BoundedSemaphore

from starlette.exceptions import HTTPException

from app.pdf_render import text

_SLOTS = BoundedSemaphore(2)
MAX_PAYLOAD_BYTES = 20_971_520
TIMEOUT_SECONDS = 12

LABELS = {
    'id': 'Идентификатор',
    'kind': 'Вид материала',
    'name': 'Название',
    'city': 'Город',
    'address': 'Адрес',
    'phase': 'Очередь / корпус',
    'property': 'Объект',
    'source_label': 'Источник',
    'source_url': 'Ссылка на источник',
    'source': 'Сведения источника',
    'published_at': 'Дата публикации',
    'captured_at': 'Дата фиксации',
    'created_at': 'Создано',
    'original_text': 'Оригинальный текст',
    'analysis_text': 'Проверяемая версия текста',
    'original_ocr_text': 'Исходная расшифровка OCR',
    'pipeline_version': 'Версия анализа',
    'status': 'Статус',
    'state': 'Состояние',
    'verification_status': 'Статус проверки документа',
    'review_status': 'Решение по гипотезе',
    'reason': 'Обоснование',
    'description': 'Описание',
    'is_demo': 'Учебные данные',
    'revision': 'Ревизия',
    'version': 'Версия',
    'reviewed_at': 'Дата решения',
    'reviewed_by': 'Кто принял решение',
    'as_of': 'По состоянию на',
    'actor': 'Сотрудник',
    'occurred_at': 'Дата события',
    'action': 'Действие',
    'code': 'Фактор',
    'weight': 'Вес подтверждённого фактора',
    'score': 'Серверный балл',
    'zone': 'Зона проверки',
    'confirmed_codes': 'Подтверждённые факторы',
    'unknown_codes': 'Не установлены',
    'risk': 'Профиль проверки',
    'rules_version': 'Правила оценки',
    'factors': 'Факторы и решения',
    'legal_bases': 'Правовые основания',
    'document_number': 'Номер документа',
    'document_date': 'Дата документа',
    'issuer': 'Кем выдан',
    'mechanism': 'Механизм основания',
    'scope_description': 'Область применения',
    'applies_from': 'Применим с',
    'applies_until': 'Применим до',
    'valid_from': 'Действует с',
    'valid_until': 'Действует до',
    'verification_as_of': 'Применимость проверена на',
    'evidence_ids': 'Связанные доказательства',
    'event_at': 'Дата сведений источника',
    'absence_as_of': 'Отсутствие проверено на',
    'methodology': 'Что проверено в источнике',
    'hypotheses': 'Гипотезы и отдельные решения',
    'field': 'Признак',
    'value': 'Значение',
    'reviewed_value': 'Принятое значение',
    'fragment': 'Фрагмент оригинала',
    'quote': 'Цитата',
    'text': 'Текст',
    'money': 'Сумма',
    'amount': 'Размер',
    'currency': 'Валюта',
    'percent': 'Процент',
    'warnings': 'Ограничения анализа',
    'assets': 'Сохранённые исходники',
    'mime_type': 'Формат',
    'byte_size': 'Размер в байтах',
    'sha256': 'SHA-256 исходника',
    'asset_id': 'Сохранённый файл',
    'property_id': 'Идентификатор объекта',
    'company_id': 'Идентификатор организации',
    'advertisement_id': 'Идентификатор публикации',
    'source_asset_id': 'Исходный файл анализа',
    'extraction_id': 'Версия извлечения',
    'candidate_id': 'Идентификатор кандидата',
    'snapshot_id': 'Версия реестра',
    'latest_comparison_id': 'Последняя сверка',
    'candidate_revision': 'Ревизия кандидата',
    'advertisement_revision': 'Ревизия публикации',
    'algorithm_version': 'Версия алгоритма сверки',
    'created_by': 'Автор записи',
    'purpose': 'Назначение',
    'updated_at': 'Обновлено',
    'candidate_name': 'Название кандидата',
    'rule_code': 'Основание предварительной проверки',
    'close_reason': 'Причина закрытия',
    'last_result': 'Последний результат сверки',
    'old_revision': 'Предыдущая ревизия',
    'new_revision': 'Новая ревизия',
    'entity_type': 'Вид записи',
    'entity_id': 'Идентификатор записи',
    'details': 'Сведения события',
    'result': 'Результат',
    'explanation': 'Основание результата',
    'matched_entries': 'Найденные записи',
    'identity_snapshot': 'Сохранённые сведения об объекте',
    'entries': 'Записи сохранённой версии',
    'label': 'Название версии',
    'coverage_from': 'Начало охвата',
    'coverage_until': 'Конец охвата',
    'expires_at': 'Использовать до',
    'complete': 'Полнота выборки заявлена',
    'limitation': 'Ограничение вывода',
    'left': 'Первый материал',
    'right': 'Второй материал',
    'changes': 'Изменения текста',
    'old_text': 'Прежний текст',
    'new_text': 'Новый текст',
    'history': 'История решений',
    'developer': 'Застройщик',
    'bin': 'БИН',
    'stage': 'Стадия',
    'progress_percent': 'Готовность, %',
    'legal_verification_status': 'Правовой статус',
    'last_reviewed_at': 'Последняя проверка',
    'signatory_count': 'Количество заявителей',
    'construction_stage': 'Стадия строительства',
    'measurement_percent': 'Измеренная готовность, %',
    'measurement_role': 'Вид измерения',
    'comparison_key': 'Область сравнения',
    'planned_completion_at': 'Плановое завершение',
    'actual_completion_at': 'Фактическое завершение',
    'delay_status': 'Статус завершения',
    'legal_checks': 'Проверки механизмов основания',
    'before': 'До решения',
    'after': 'После решения',
}
VALUES = {
    'UNKNOWN': 'Не установлено',
    'PENDING': 'Ожидает решения',
    'CONFIRMED': 'Подтверждено человеком',
    'REJECTED': 'Отклонено',
    'VERIFIED_VALID': 'Документ подтверждён',
    'VERIFIED_ABSENT': 'Отсутствие установлено',
    'NOT_FOUND': 'Не найдено в выборке - недостаточно для вывода об отсутствии',
    'UNAVAILABLE': 'Источник недоступен',
    'DRAFT': 'Черновик',
    'RETURNED': 'Возвращено на доработку',
    'GREEN': 'Зелёная',
    'YELLOW': 'Жёлтая',
    'RED': 'Красная',
    'READY_FOR_REVIEW': 'Обработка завершена',
    'REVIEWED': 'Решение сохранено',
    'NEW': 'Новый материал',
    'FAILED': 'Ошибка обработки',
    'ANALYZING': 'Обрабатывается',
    'KZHK_GUARANTEE': 'Гарантия КЖК',
    'BANK_WITH_MIO_PERMIT': 'Банковский механизм + разрешение МИО',
    'FRAME_WITH_MIO_PERMIT': 'Каркас + разрешение МИО',
    'LEGAL_BASIS': 'Документ правового основания',
    'GUARANTEE': 'Гарантия',
    'MIO_PERMIT': 'Разрешение МИО',
    'ACTIVE': 'Действует',
    'REVOKED': 'Отозван',
    'DOCUMENT': 'Документ',
    'IMAGE': 'Изображение',
    'TEXT': 'Текст',
    'OPEN': 'Открыт',
    'IN_REVIEW': 'Проверяется',
    'WAITING_DATA': 'Ожидает данных',
    'CLOSED': 'Закрыт',
    'REGISTRY_UNAVAILABLE': 'Реестр недоступен; отсутствие основания не установлено',
    'MATCHED_APPLICABLE_RECORD': 'Найдена применимая запись в выбранной версии',
    'NO_MATCH_IN_APPROVED_SNAPSHOT': 'Совпадение в полном DEMO-списке не найдено; нужен анализ',
    'RECORD_SCOPE_OR_STATUS_CONFLICT': 'Различаются область или статус документа',
    'COVERAGE_OR_DATE_UNKNOWN': 'Дата или полнота охвата не установлены',
    'ENTITY_AMBIGUOUS': 'Объект не определён однозначно',
}


def record_html(value, depth=0):
    if depth > 20:
        raise ValueError('Record nesting limit exceeded')
    if isinstance(value, dict):
        return (
            '<dl>'
            + ''.join(
                f'<div class="field"><dt>{text(LABELS.get(key, key.replace("_", " ")))}</dt><dd>{record_html(item, depth + 1)}</dd></div>'
                for key, item in value.items()
            )
            + '</dl>'
        )
    if isinstance(value, list):
        return (
            '<ol>' + ''.join(f'<li>{record_html(item, depth + 1)}</li>' for item in value) + '</ol>'
            if value
            else 'Нет записей'
        )
    if value is None:
        return 'Не указано'
    if isinstance(value, bool):
        return 'Да' if value else 'Нет'
    return text(VALUES.get(str(value), value))


def document_html(payload):
    """All record values are escaped. The only images are explicitly supplied saved bytes."""
    output = [
        '<!doctype html><html lang="ru"><meta charset="utf-8"><title>SAQ QURYLYS</title><style>',
        '@page{size:A4;margin:16mm;@bottom-right{content:"Страница " counter(page) " / " counter(pages);font-size:8pt}}',
        'body{font:10pt "DejaVu Sans",sans-serif;color:#202721;line-height:1.45}h1{font-size:19pt}h2{font-size:13pt;break-after:avoid}',
        'p,dd,li{white-space:pre-wrap;overflow-wrap:anywhere}dl{margin:0 0 2mm}dt{color:#59685f;font-size:9pt;margin-top:1.4mm}',
        'dd{margin:0 0 1.2mm 3mm}.field{break-inside:avoid}li{margin-bottom:3mm}dl dl{border-left:1pt solid #dfe5de;padding-left:3mm}',
        '.notice{border:1pt solid #dfe5de;padding:3mm}.source-text{white-space:pre-wrap;overflow-wrap:anywhere}',
        '.source-image{break-before:page}.source-image img{max-width:100%;max-height:245mm;object-fit:contain}',
        '</style><body><h1>' + text(payload['title']) + '</h1>',
        '<p>SAQ QURYLYS - производная PDF-копия, подготовленная системой. Не официальный документ источника.</p>',
        '<p>Сформировано: '
        + text(payload['exported_at'])
        + '. Дата формирования не заменяет даты исходных сведений.</p>',
    ]
    if payload.get('is_demo'):
        output.append(
            '<p class="notice"><strong>DEMO - синтетические данные, не сведения о реальном нарушении.</strong></p>'
        )
    elif payload.get('is_demo') is None:
        output.append('<p class="notice">Режим DEMO/REAL для этой записи не установлен.</p>')
    output.append(
        '<p class="notice">Гипотеза, источник и подтверждённое решение различаются. Неизвестные сведения не подтверждают риск. '
        'Красная зона не устанавливает нарушение; зелёная не гарантирует безопасность. Экспорт не принимает решения.</p>'
    )
    if payload.get('object'):
        output.append('<h2>Объект</h2>' + record_html(payload['object']))
    output.append('<h2>Содержание и статус записи</h2>' + record_html(payload['record']))
    if payload['sources']:
        output.append('<h2>Сохранённые исходники и происхождение</h2>' + record_html(payload['sources']))
    for value in payload['texts']:
        output.append('<h2>Содержание исходника</h2><div class="source-text">' + text(value) + '</div>')
    for image in payload['images']:
        output.append(
            '<div class="source-image"><h2>Копия сохранённого изображения</h2><img alt="Сохранённый исходник" src="'
            + text(image)
            + '"></div>'
        )
    output.append(
        '<p>Это экспорт записи на указанное время. Он не создаёт сохранённое доказательство. '
        'Оригиналы доступны отдельно; сформированная копия не удостоверяет подлинность источника.</p></body></html>'
    )
    return ''.join(output)


def render_document_pdf(payload, settings):
    if sys.platform != 'linux':
        raise HTTPException(503, 'Подготовка PDF требует локальный Linux Docker runtime')
    encoded = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    if len(encoded) > MAX_PAYLOAD_BYTES:
        raise HTTPException(413, 'Материал превышает размер PDF-экспорта. Скачайте исходники отдельно.')
    if not _SLOTS.acquire(blocking=False):
        raise HTTPException(
            503, 'Подготовка PDF занята. Повторите через несколько секунд.', headers={'Retry-After': '2'}
        )
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'app.document_pdf_render'],
            input=encoded,
            capture_output=True,
            # A throttled demo VM needs more wall time without a larger child CPU budget.
            timeout=min(settings.pdf_timeout_seconds, settings.document_pdf_timeout_seconds),
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            503, 'Подготовка PDF превысила время ожидания. Исходник сохранён; можно повторить.'
        ) from None
    finally:
        _SLOTS.release()
    if result.returncode or not result.stdout.startswith(b'%PDF-'):
        raise HTTPException(503, 'Не удалось подготовить PDF. Исходные сведения не изменены.')
    if len(result.stdout) > settings.max_upload_bytes:
        raise HTTPException(413, 'PDF превышает допустимый размер. Скачайте исходники отдельно.')
    return result.stdout


def main():
    import resource

    resource.setrlimit(resource.RLIMIT_AS, (1_073_741_824, 1_073_741_824))
    resource.setrlimit(resource.RLIMIT_CPU, (TIMEOUT_SECONDS, TIMEOUT_SECONDS))
    from weasyprint import HTML
    from weasyprint.urls import FatalURLFetchingError, URLFetcher

    from app.pdf_render import signal_html

    payload = json.load(sys.stdin)
    allowed = frozenset(payload.get('images', []))

    class SavedImagesOnly(URLFetcher):
        def fetch(self, url, headers=None):
            if url in allowed and url.startswith(('data:image/png;base64,', 'data:image/jpeg;base64,')):
                return super().fetch(url, headers)
            raise FatalURLFetchingError('Only explicit saved image bytes are allowed')

    if 'signal_payload' in payload:
        content = signal_html(payload['signal_payload']).replace(
            '</body>',
            '<p>Производная PDF-копия исторического снимка. Сформировано: '
            + text(payload['exported_at'])
            + '. Дата формирования не заменяет дату снимка.</p></body>',
        )
    elif 'dossier_report' in payload:
        from app.dossier_report_render import report_html

        content = report_html(payload['dossier_report'])
    else:
        content = document_html(payload)
    document = HTML(string=content, url_fetcher=SavedImagesOnly()).write_pdf()
    sys.stdout.buffer.write(document)


if __name__ == '__main__':
    main()
