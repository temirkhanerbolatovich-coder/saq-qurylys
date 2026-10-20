"""Trusted RU/KZ dossier report template. All data are escaped, resources stay offline."""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.pdf_render import text

KAZAKH_SYSTEM_NOTES = {
    'Нет подтверждённого применимого основания на текущую дату. Это не подтверждает R1.': 'Ағымдағы күнге қолданылатын расталған негіз жоқ. Бұл R1 факторын растамайды.',
    'В общих сведениях готовность не указана. Датированные измерения — в доказательствах факторов.': 'Жалпы мәліметтерде дайындық көрсетілмеген. Күні белгіленген өлшемдер фактор дәлелдерінде берілген.',
}

CAPTIONS = {
    'ru': {
        'title': 'Отчёт по объекту',
        'summary': 'Сводка',
        'documents': 'Документы основания',
        'risk': 'Факторы риска и решения',
        'publications': 'Подтверждённо привязанные публикации',
        'evidence': 'Сохранённые доказательства',
        'history': 'История решений',
        'signals': 'Исторические версии сигналов',
        'sources': 'Источники и происхождение',
        'generated': 'Сформировано',
        'page': 'Страница',
        'field': 'Сведения',
        'value': 'Значение',
        'none': 'Не установлено',
        'empty_list': 'Нет записей',
        'empty': 'Сохранённых записей нет.',
        'yes': 'Да',
        'no': 'Нет',
        'shown': 'Показано',
        'of': 'из',
        'partial': 'Раздел содержит не весь набор. Полные записи доступны в приложении.',
        'current': 'Текущее досье на время формирования. Отчёт не является неизменяемым сигнальным снимком.',
        'disclaimer': 'Сигнал необходимости проверки; не устанавливает факт правонарушения. Красная зона не устанавливает нарушение, зелёная не гарантирует безопасность. Неизвестные сведения не подтверждают R1 или другой фактор.',
        'copy': 'Производный отчёт SAQ QURYLYS. Не официальный документ источника. Экспорт не принимает решений и не создаёт доказательств.',
        'demo': 'DEMO - синтетические данные, не сведения о реальном нарушении.',
        'unknown': 'Что остаётся неизвестным',
        'selected': 'Выбранные разделы',
        'signal_note': 'Ниже сохранённые имена, оценки и решения соответствующих версий. Поздние изменения текущего досье их не переписывают. Оригинальные PDF версий скачиваются отдельно.',
        'source_note': 'SHA-256 приведён из сохранённой метаинформации исходника; файл здесь не приложен. Файловое наблюдение не подтверждает идентичность объекта, правовой статус или привязку рекламы.',
        'publications_note': 'В этом разделе только публикации с отдельным подтверждённым сопоставлением. Непроверенные файловые наблюдения находятся в разделе источников.',
    },
    'kk': {
        'title': 'Нысан бойынша есеп',
        'summary': 'Қысқаша мәлімет',
        'documents': 'Құқықтық негіз құжаттары',
        'risk': 'Тәуекел факторлары және шешімдер',
        'publications': 'Байланысы расталған жарияланымдар',
        'evidence': 'Сақталған дәлелдер',
        'history': 'Шешімдер тарихы',
        'signals': 'Сигналдардың тарихи нұсқалары',
        'sources': 'Дереккөздер және шығу тегі',
        'generated': 'Жасалған уақыты',
        'page': 'Бет',
        'field': 'Мәлімет',
        'value': 'Мәні',
        'none': 'Анықталмаған',
        'empty_list': 'Жазбалар жоқ',
        'empty': 'Сақталған жазбалар жоқ.',
        'yes': 'Иә',
        'no': 'Жоқ',
        'shown': 'Көрсетілді',
        'of': '/',
        'partial': 'Бөлімде барлық жазба көрсетілмеген. Толық жазбалар қолданбада қолжетімді.',
        'current': 'Есеп жасалған сәттегі ағымдағы досье. Бұл есеп өзгермейтін тарихи сигнал көшірмесі емес.',
        'disclaimer': 'Қосымша тексеру қажеттігі туралы сигнал; құқық бұзушылық фактісін анықтамайды. Қызыл аймақ құқық бұзушылықты анықтамайды, жасыл аймақ қауіпсіздікке кепілдік бермейді. Белгісіз мәліметтер R1 немесе басқа факторды растамайды.',
        'copy': 'SAQ QURYLYS жасаған туынды есеп. Дереккөздің ресми құжаты емес. Экспорт шешім қабылдамайды және дәлел жасамайды.',
        'demo': 'DEMO - синтетикалық деректер, нақты құқық бұзушылық туралы мәлімет емес.',
        'unknown': 'Белгісіз болып қалған мәліметтер',
        'selected': 'Таңдалған бөлімдер',
        'signal_note': 'Төменде тиісті нұсқалардың сақталған атаулары, бағалары мен шешімдері берілген. Ағымдағы досьенің кейінгі өзгерістері оларды өзгертпейді. Нұсқалардың бастапқы PDF файлдары бөлек жүктеледі.',
        'source_note': 'SHA-256 бастапқы файлдың сақталған метадеректерінен алынған; файл есепке тіркелмеген. Файлдағы бақылау нысан сәйкестігін, құқықтық мәртебені немесе жарнама байланысын растамайды.',
        'publications_note': 'Бұл бөлімде байланысы бөлек шешіммен расталған жарияланымдар ғана бар. Тексерілмеген файлдық бақылаулар дереккөздер бөлімінде берілген.',
    },
}

# Every report key is owned by the bounded builder; free source text is never translated.
LABELS = {
    'id': ('ID', 'ID'),
    'name': ('Название', 'Атауы'),
    'city': ('Город', 'Қала'),
    'address': ('Адрес / область', 'Мекенжай / аумақ'),
    'level': ('Уровень объекта', 'Нысан деңгейі'),
    'developer': ('Застройщик', 'Құрылыс салушы'),
    'bin': ('БИН', 'БСН'),
    'stage': ('Стадия', 'Кезең'),
    'legal_verification_status': ('Правовой статус', 'Құқықтық мәртебе'),
    'legal_absence_as_of': ('Отсутствие основания установлено на дату', 'Құқықтық негіздің жоқтығы анықталған күн'),
    'last_reviewed_at': ('Последняя проверка', 'Соңғы тексеру'),
    'score': ('Балл проверки', 'Тексеру балы'),
    'zone': ('Зона приоритета', 'Басымдық аймағы'),
    'confirmed_codes': ('Подтверждённые коды', 'Расталған кодтар'),
    'unknown_codes': ('Непроверенные коды', 'Тексерілмеген кодтар'),
    'as_of': ('Оценка на дату', 'Бағалау күні'),
    'rules_version': ('Версия правил', 'Ережелер нұсқасы'),
    'revision': ('Ревизия', 'Ревизия'),
    'version': ('Версия сигнала', 'Сигнал нұсқасы'),
    'is_demo': ('DEMO', 'DEMO'),
    'progress_percent': ('Готовность, %', 'Дайындық, %'),
    'progress_as_of': ('Дата готовности', 'Дайындық күні'),
    'mechanism': ('Механизм основания', 'Құқықтық негіз тетігі'),
    'document_number': ('Номер документа', 'Құжат нөмірі'),
    'document_date': ('Дата документа', 'Құжат күні'),
    'issuer': ('Выдавшая организация', 'Құжат берген ұйым'),
    'asset_id': ('ID исходного файла', 'Бастапқы файл ID'),
    'property_id': ('ID объекта', 'Нысан ID'),
    'source_label': ('Источник', 'Дереккөз'),
    'source_url': ('URL источника', 'Дереккөз URL'),
    'published_at': ('Дата публикации', 'Жарияланған күні'),
    'captured_at': ('Дата получения', 'Алынған күні'),
    'applies_from': ('Применим с', 'Қолданылу басы'),
    'applies_until': ('Применим до', 'Қолданылу соңы'),
    'scope_description': ('Область действия', 'Қолданылу аясы'),
    'verification_status': ('Проверка документа', 'Құжатты тексеру'),
    'reviewed_at': ('Дата решения', 'Шешім күні'),
    'reviewed_by': ('Кто принял решение (ID)', 'Шешімді қабылдаған (ID)'),
    'verification_as_of': ('Проверено на дату', 'Тексерілген күні'),
    'code': ('Код фактора', 'Фактор коды'),
    'status': ('Статус', 'Мәртебесі'),
    'weight': ('Вес при подтверждении', 'Расталғандағы салмағы'),
    'evidence_ids': ('ID доказательств', 'Дәлелдер ID'),
    'reason': ('Обоснование', 'Негіздеме'),
    'original_text': ('Сохранённый текст материала', 'Материалдың сақталған мәтіні'),
    'confirmed_property_id': ('Подтверждённый объект', 'Расталған нысан'),
    'kind': ('Вид материала', 'Материал түрі'),
    'description': ('Описание', 'Сипаттамасы'),
    'event_at': ('Дата сведений источника', 'Дереккөз мәліметінің күні'),
    'advertisement_id': ('ID публикации', 'Жарияланым ID'),
    'extraction_id': ('ID анализа', 'Талдау ID'),
    'hypothesis_id': ('ID гипотезы', 'Болжам ID'),
    'legal_basis_id': ('ID основания', 'Құқықтық негіз ID'),
    'fragment': ('Фрагмент исходника', 'Бастапқы дерек үзіндісі'),
    'quote': ('Цитата', 'Дәйексөз'),
    'start_offset': ('Начало фрагмента', 'Үзінді басы'),
    'end_offset': ('Конец фрагмента', 'Үзінді соңы'),
    'text_version_id': ('Версия текста', 'Мәтін нұсқасы'),
    'bbox': ('Область изображения', 'Сурет аумағы'),
    'methodology': ('Что проверено', 'Тексерілген мәлімет'),
    'signatory_count': ('Заявителей', 'Өтініш берушілер'),
    'construction_stage': ('Стадия строительства', 'Құрылыс кезеңі'),
    'measurement_percent': ('Измеренная готовность, %', 'Өлшенген дайындық, %'),
    'measurement_role': ('Вид измерения', 'Өлшем түрі'),
    'comparison_key': ('Область сравнения', 'Салыстыру аясы'),
    'planned_completion_at': ('Плановое завершение', 'Жоспарлы аяқталу'),
    'actual_completion_at': ('Фактическое завершение', 'Нақты аяқталу'),
    'delay_status': ('Статус завершения', 'Аяқталу мәртебесі'),
    'absence_as_of': ('Проверка отсутствия на дату', 'Жоқтығын тексеру күні'),
    'legal_checks': ('Проверки механизмов основания', 'Құқықтық негіз тетіктерін тексеру'),
    'result': ('Результат проверки', 'Тексеру нәтижесі'),
    'action': ('Действие / сохранённый код', 'Әрекет / сақталған код'),
    'occurred_at': ('Дата события', 'Оқиға күні'),
    'old_revision': ('Прежняя ревизия', 'Алдыңғы ревизия'),
    'new_revision': ('Новая ревизия', 'Жаңа ревизия'),
    'author': ('Автор решения', 'Шешім авторы'),
    'state': ('Состояние сигнала', 'Сигнал күйі'),
    'created_at': ('Создано', 'Жасалған күні'),
    'pdf_state': ('Состояние PDF', 'PDF күйі'),
    'saved_name': ('Имя объекта в снимке', 'Тарихи көшірмедегі нысан атауы'),
    'risk_snapshot': ('Оценка сохранённой версии', 'Сақталған нұсқаның бағасы'),
    'decisions': ('Решения версии', 'Нұсқа шешімдері'),
    'decided_at': ('Дата решения', 'Шешім күні'),
    'mime_type': ('Формат', 'Пішімі'),
    'byte_size': ('Байты', 'Байт'),
    'sha256': ('Сохранённый SHA-256', 'Сақталған SHA-256'),
    'publisher': ('Издатель', 'Жариялаушы'),
    'purpose': ('Назначение источника', 'Дереккөз мақсаты'),
    'identity_confirmed': ('Связь с объектом подтверждена', 'Нысанмен байланысы расталған'),
    'derived_observation': ('Исследовательское наблюдение из файла', 'Файлдан алынған зерттеу бақылауы'),
    'observation': ('Исходная строка наблюдения (не решение)', 'Бақылаудың бастапқы жолы (шешім емес)'),
    'files': ('Файлы пакета', 'Деректер топтамасының файлдары'),
    'files_total': ('Всего файлов пакета (показано до 10)', 'Топтамадағы файл саны (10-ға дейін көрсетіледі)'),
    'record_id': ('ID строки файла', 'Файл жолының ID'),
    'project': ('Название в файле', 'Файлдағы атауы'),
    'basis': ('Опубликованное основание, не проверено', 'Жарияланған негіз, тексерілмеген'),
    'document_reference': ('Реквизиты из вторичного источника', 'Қосымша дереккөздегі реквизиттер'),
    'list_date': ('Дата списка', 'Тізім күні'),
    'legal_status': ('Оговорка исходного файла', 'Бастапқы файл ескертпесі'),
    'review_priority': ('Предложенный приоритет', 'Ұсынылған басымдық'),
    'notes': ('Расхождения и примечания', 'Айырмашылықтар мен ескертпелер'),
    'official_source': ('URL официальной публикации', 'Ресми жарияланым URL'),
    'location_source': ('URL адреса / сведений', 'Мекенжай / мәлімет URL'),
    'other_source': ('Дополнительный URL', 'Қосымша URL'),
}
VALUES = {
    'Нет подтверждённого применимого основания на текущую дату. Это не подтверждает R1.': (
        'Нет подтверждённого применимого основания на текущую дату. Это не подтверждает R1.',
        'Ағымдағы күнге қолданылатын расталған құқықтық негіз жоқ. Бұл R1 факторын растамайды.',
    ),
    'В общих сведениях готовность не указана. Датированные измерения - в доказательствах факторов.': (
        'В общих сведениях готовность не указана. Датированные измерения - в доказательствах факторов.',
        'Жалпы мәліметтерде дайындық көрсетілмеген. Күні белгіленген өлшемдер фактор дәлелдерінде берілген.',
    ),
    'В общих сведениях готовность не указана. Датированные измерения — в доказательствах факторов.': (
        'В общих сведениях готовность не указана. Датированные измерения - в доказательствах факторов.',
        'Жалпы мәліметтерде дайындық көрсетілмеген. Күні белгіленген өлшемдер фактор дәлелдерінде берілген.',
    ),
    'UNKNOWN': ('Не установлено', 'Анықталмаған'),
    'PENDING': ('Ожидает решения', 'Шешімді күтуде'),
    'CONFIRMED': ('Подтверждено аналитиком', 'Сарапшы растаған'),
    'REJECTED': ('Отклонено', 'Қабылданбаған'),
    'VERIFIED_VALID': ('Документ подтверждён', 'Құжат расталған'),
    'VERIFIED_ABSENT': ('Отсутствие установлено на дату', 'Жоқтығы тиісті күнге анықталған'),
    'DOCUMENTED_ABSENT': ('Отсутствие подтверждено документом на дату', 'Жоқтығы тиісті күнге құжатпен расталған'),
    'NOT_FOUND': (
        'Не найдено в проверенной выборке — отсутствие не установлено',
        'Тексерілген тізімнен табылмады — жоқтығы анықталмаған',
    ),
    'UNAVAILABLE': (
        'Источник недоступен — отсутствие не установлено',
        'Дереккөз қолжетімсіз — жоқтығы анықталмаған',
    ),
    'GREEN': ('Зелёная', 'Жасыл'),
    'YELLOW': ('Жёлтая', 'Сары'),
    'RED': ('Красная', 'Қызыл'),
    'PROJECT': ('ЖК', 'ТК'),
    'PHASE': ('Очередь', 'Кезек'),
    'BUILDING': ('Корпус', 'Корпус'),
    'PLANNED': ('Планируется', 'Жоспарланған'),
    'UNDER_CONSTRUCTION': ('Строится', 'Салынып жатыр'),
    'COMPLETED': ('Завершён', 'Аяқталған'),
    'DRAFT': ('Черновик', 'Жоба'),
    'RETURNED': ('Возвращён на доработку', 'Толықтыруға қайтарылған'),
    'NEW': ('Новый материал', 'Жаңа материал'),
    'ANALYZING': ('Анализируется', 'Талданып жатыр'),
    'READY_FOR_REVIEW': ('Готов к проверке', 'Тексеруге дайын'),
    'REVIEWED': ('Решения сохранены', 'Шешімдер сақталған'),
    'NOT_REQUESTED': ('PDF не запрошен', 'PDF сұралмаған'),
    'READY': ('PDF готов', 'PDF дайын'),
    'QUEUED': ('В очереди', 'Кезекте'),
    'FAILED': ('Ошибка', 'Қате'),
    'KZHK_GUARANTEE': ('Гарантия КЖК', 'ҚТК кепілдігі'),
    'BANK_WITH_MIO_PERMIT': ('Банк + разрешение МИО', 'Банк + ЖАО рұқсаты'),
    'FRAME_WITH_MIO_PERMIT': ('Каркас + разрешение МИО', 'Қаңқа + ЖАО рұқсаты'),
}


def label(key, language):
    values = LABELS.get(key)
    return values[language == 'kk'] if values else key.replace('_', ' ')


def display(value, language, depth=0):
    if depth > 8:
        raise ValueError('Report nesting limit exceeded')
    captions = CAPTIONS[language]
    if value is None or value == '':
        return text(captions['none'])
    if isinstance(value, bool):
        return text(captions['yes'] if value else captions['no'])
    if isinstance(value, dict):
        return (
            '<dl>'
            + ''.join(
                f'<dt>{text(label(key, language))}</dt><dd>{display(item, language, depth + 1)}</dd>'
                for key, item in value.items()
            )
            + '</dl>'
        )
    if isinstance(value, list):
        return (
            '<ul>' + ''.join(f'<li>{display(item, language, depth + 1)}</li>' for item in value) + '</ul>'
            if value
            else text(captions['empty_list'])
        )
    shown = VALUES.get(str(value))
    if shown:
        return text(shown[language == 'kk'])
    return text(value)


def record_table(record, language):
    captions = CAPTIONS[language]
    return (
        '<table><colgroup><col class="label"><col></colgroup><thead><tr><th>'
        + text(captions['field'])
        + '</th><th>'
        + text(captions['value'])
        + '</th></tr></thead><tbody>'
        + ''.join(
            '<tr><th scope="row">' + text(label(key, language)) + '</th><td>' + display(value, language) + '</td></tr>'
            for key, value in record.items()
        )
        + '</tbody></table>'
    )


def report_html(payload):
    language = payload['language']
    captions = CAPTIONS[language]
    prop = payload['property']
    generated_at = (
        datetime.fromisoformat(payload['generated_at'])
        .astimezone(ZoneInfo('Asia/Qyzylorda'))
        .strftime('%d.%m.%Y %H:%M:%S UTC+5')
    )
    parts = [
        f'<!doctype html><html lang="{language}"><meta charset="utf-8"><title>SAQ QURYLYS</title><style>',
        '@page{size:A4;margin:19mm 15mm 18mm;@top-left{content:"SAQ QURYLYS";font:8pt "DejaVu Sans";color:#356553}@bottom-right{content:"'
        + captions['page']
        + ' " counter(page) " / " counter(pages);font:8pt "DejaVu Sans";color:#52665c}}',
        'body{font:9pt "DejaVu Sans",sans-serif;color:#172a22;line-height:1.45}h1{font-size:23pt;margin:1mm 0}h2{font-size:14pt;margin:8mm 0 3mm;break-after:avoid}h3{font-size:10pt;break-after:avoid}p{margin:2mm 0}strong{font-weight:700}',
        'p,td,dd,li{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}table{border-collapse:collapse;width:100%;table-layout:fixed;margin:3mm 0 5mm}thead{display:table-header-group}tr{break-inside:avoid}th,td{border-bottom:.5pt solid #dce5df;text-align:left;vertical-align:top;padding:2mm}thead th{background:#eef4f0;color:#355b48;font-size:8pt}.label{width:31%}tbody th{font-size:8pt;font-weight:400;color:#53665b}dl{margin:0}dt{font-weight:700;margin-top:1mm}dd{margin:0 0 2mm}ul{padding-left:4mm;margin:0}.notice{border-left:2pt solid #356553;padding:3mm;background:#f3f7f4}.muted{color:#53665b;font-size:8pt}.brand{font-size:10pt;letter-spacing:1.4pt;color:#356553}.scope{font-size:8pt;color:#53665b;break-after:avoid}h2+.notice{break-after:avoid}',
        '</style><body><p class="brand">SAQ QURYLYS</p><h1>' + text(captions['title']) + '</h1>',
        '<h2>' + text(prop['name']) + '</h2><p>' + text(captions['generated']) + ': ' + text(generated_at) + '</p>',
        '<p><strong>'
        + text(label('score', language))
        + ': '
        + text(prop['risk']['score'])
        + ' / '
        + display(prop['risk']['zone'], language)
        + '. '
        + text(label('legal_verification_status', language))
        + ': '
        + display(prop['legal_verification_status'], language)
        + '</strong></p>',
        '<p class="muted">'
        + text(captions['current'])
        + '</p><p class="notice">'
        + text(captions['disclaimer'])
        + '</p>',
    ]
    if prop['is_demo']:
        parts.append('<p class="notice"><strong>' + text(captions['demo']) + '</strong></p>')
    parts.extend(
        [
            '<h2>' + text(captions['summary']) + '</h2>',
            record_table(
                {
                    key: prop[key]
                    for key in (
                        'id',
                        'name',
                        'level',
                        'city',
                        'address',
                        'developer',
                        'stage',
                        'legal_verification_status',
                        'legal_absence_as_of',
                        'last_reviewed_at',
                        'revision',
                        'is_demo',
                    )
                },
                language,
            ),
            record_table(prop['risk'], language),
            '<h3>'
            + text(captions['unknown'])
            + '</h3>'
            + display(
                [KAZAKH_SYSTEM_NOTES.get(note, note) for note in payload['unknown_information']]
                if language == 'kk'
                else payload['unknown_information'],
                language,
            ),
            '<p class="scope">'
            + text(captions['selected'])
            + ': '
            + text(', '.join([captions['summary'], *[captions[section['id']] for section in payload['sections']]]))
            + '</p>',
        ]
    )
    for section in payload['sections']:
        parts.append('<h2>' + text(captions[section['id']]) + '</h2>')
        note = {'signals': 'signal_note', 'sources': 'source_note', 'publications': 'publications_note'}.get(
            section['id']
        )
        if note:
            parts.append('<p class="notice">' + text(captions[note]) + '</p>')
        parts.append(
            '<p class="scope">'
            + text(f'{captions["shown"]} {section["shown"]} {captions["of"]} {section["total"]}')
            + '</p>'
        )
        if section['shown'] < section['total']:
            parts.append('<p class="notice">' + text(captions['partial']) + '</p>')
        if not section['rows']:
            parts.append('<p>' + text(captions['empty']) + '</p>')
        for row in section['rows']:
            parts.append(record_table(row, language))
    parts.append('<p class="muted">' + text(captions['copy']) + '</p></body></html>')
    return ''.join(parts)
