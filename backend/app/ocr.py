import csv
import io
import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

from app.config import Settings


class AnalysisError(Exception):
    def __init__(self, code: str, message: str, *, blocked: bool = False):
        self.code, self.message, self.blocked = code, message, blocked
        super().__init__(message)


def parse_tsv(value: str) -> tuple[str, list[dict]]:
    parts, words, offset, last_line = [], [], 0, None
    for row in csv.DictReader(io.StringIO(value), delimiter='\t'):
        if row.get('level') != '5' or not row.get('text', '').strip():
            continue
        content = row['text'].strip()
        line = tuple(row[name] for name in ['page_num', 'block_num', 'par_num', 'line_num'])
        if parts:
            separator = '\n' if line != last_line else ' '
            parts.append(separator)
            offset += len(separator)
        start = offset
        parts.append(content)
        offset += len(content)
        words.append(
            {
                'start': start,
                'end': offset,
                'x': max(0, int(row['left'])),
                'y': max(0, int(row['top'])),
                'width': max(1, int(row['width'])),
                'height': max(1, int(row['height'])),
                'confidence': max(0, min(100, float(row['conf']))) / 100,
            }
        )
        last_line = line
    return ''.join(parts), words


def recognize(content: bytes, settings: Settings) -> tuple[str, list[dict]]:
    with tempfile.TemporaryDirectory(prefix='saq-ocr-') as folder:
        source, target = Path(folder) / 'source.png', Path(folder) / 'output'
        with Image.open(io.BytesIO(content)) as image:
            oriented = ImageOps.exif_transpose(image)
            if oriented.mode in {'RGBA', 'LA', 'P'}:
                rgba = oriented.convert('RGBA')
                background = Image.new('RGB', rgba.size, 'white')
                background.paste(rgba, mask=rgba.getchannel('A'))
                background.save(source)
            else:
                oriented.convert('RGB').save(source)
        try:
            process = subprocess.run(
                [
                    settings.tesseract_command,
                    str(source),
                    str(target),
                    '-l',
                    settings.ocr_languages,
                    '--oem',
                    '1',
                    '--psm',
                    '6',
                    'tsv',
                ],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                timeout=settings.ocr_timeout_seconds,
                check=False,
                env={**os.environ, 'OMP_THREAD_LIMIT': '1'},
            )
        except FileNotFoundError:
            raise AnalysisError(
                'OCR_UNAVAILABLE', 'Tesseract недоступен в worker. Проверьте установку и языки.', blocked=True
            ) from None
        except subprocess.TimeoutExpired:
            raise AnalysisError(
                'OCR_TIMEOUT', 'OCR превысил время обработки. Попробуйте более чёткий или меньший файл.'
            ) from None
        if process.returncode:
            raise AnalysisError('OCR_FAILED', 'Tesseract не обработал изображение. Проверьте языковые модели и файл.')
        output = target.with_suffix('.tsv')
        if not output.is_file() or output.stat().st_size > 8_388_608:
            raise AnalysisError('OCR_OUTPUT_LIMIT', 'Результат OCR отсутствует или слишком велик.')
        try:
            text, words = parse_tsv(output.read_text(encoding='utf-8'))
        except (ValueError, KeyError, UnicodeDecodeError):
            raise AnalysisError('OCR_FORMAT', 'Не удалось прочитать результат OCR.') from None
        if len(text) > 100_000:
            raise AnalysisError('OCR_TEXT_LIMIT', 'Распознанный текст превышает допустимый объём.')
        return text, words
