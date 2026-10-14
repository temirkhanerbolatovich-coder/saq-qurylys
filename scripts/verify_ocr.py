"""Exercise the running API + worker with two synthetic RU/KZ banners, never seed answers.

Run with the development venv from the repository root after docker compose up.
Artifacts under output/qa are local test evidence, not a production accuracy claim.
"""

import hashlib
import json
import sys
import time
from pathlib import Path
from uuid import uuid4

import httpx
from PIL import Image, ImageDraw, ImageFont
from rapidfuzz.distance import Levenshtein

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.config import Settings  # noqa: E402


def main():
    settings = Settings()
    output = ROOT / 'output/qa'
    output.mkdir(parents=True, exist_ok=True)
    font_path = next(
        (
            p
            for p in [Path('C:/Windows/Fonts/arial.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
            if p.is_file()
        ),
        None,
    )
    if not font_path:
        raise SystemExit('A Cyrillic/Kazakh font is needed to generate synthetic test banners')
    font = ImageFont.truetype(str(font_path), 48)
    fixtures = {
        'ru': ['DEMO. ЖК Арман', 'Первоначальный взнос 20%', 'Бронь 500 000 тенге', 'Строящийся дом'],
        'kz': ['DEMO. ТК Арман', 'Бастапқы жарна 20%', 'Ақылы брондау 500 000 теңге', 'Үй салынып жатыр'],
    }
    report = []
    with httpx.Client(base_url=settings.app_origin, timeout=30) as client:

        def headers():
            token = client.get('/api/v1/auth/csrf').json()['csrf_token']
            return {'Origin': settings.app_origin, 'X-CSRF-Token': token, 'Idempotency-Key': str(uuid4())}

        response = client.post(
            '/api/v1/auth/login',
            headers=headers(),
            json={'username': settings.bootstrap_analyst_username, 'password': settings.bootstrap_analyst_password},
        )
        assert response.status_code == 200, 'API login failed'
        for language, lines in fixtures.items():
            path = output / f'ocr-{language}.png'
            image = Image.new('RGB', (1600, 480), 'white')
            draw = ImageDraw.Draw(image)
            for index, line in enumerate(lines):
                draw.text((50, 35 + 100 * index), line, font=font, fill='black')
            image.save(path)
            content = path.read_bytes()
            response = client.post(
                '/api/v1/advertisements/upload',
                headers=headers(),
                files={'file': (path.name, content, 'image/png')},
                data={'source_label': f'DEMO synthetic OCR {language} {uuid4()}', 'is_demo': 'true'},
            )
            assert response.status_code == 201, f'Upload failed: {response.status_code}'
            ad = response.json()
            response = client.post(
                f'/api/v1/advertisements/{ad["id"]}/analyze',
                headers=headers(),
                json={'expected_advertisement_revision': ad['revision']},
            )
            assert response.status_code == 202, f'Queue failed: {response.status_code}'
            job = response.json()
            deadline = time.monotonic() + 100
            while job['state'] in {'QUEUED', 'RUNNING'} and time.monotonic() < deadline:
                time.sleep(1)
                job = client.get(f'/api/v1/analysis-jobs/{job["id"]}').json()
            assert job['state'] == 'SUCCEEDED', f'OCR not successful: {job["state"]}'
            extraction = client.get(f'/api/v1/advertisements/{ad["id"]}/extractions').json()[0]
            payments = [h for h in extraction['hypotheses'] if h['field'] == 'PAYMENT_TERM']
            assert len(payments) == 2, f'Expected two payment clauses, found {len(payments)}'
            assert all(h['fragment']['bbox'] and h['review_status'] == 'PENDING' for h in payments)
            original = client.get(f'/api/v1/assets/{ad["assets"][0]["id"]}').content
            assert hashlib.sha256(original).hexdigest() == hashlib.sha256(content).hexdigest()
            expected = '\n'.join(lines)
            report.append(
                {
                    'language': language,
                    'advertisement_id': ad['id'],
                    'job_id': job['id'],
                    'original_sha256': hashlib.sha256(content).hexdigest(),
                    'original_download_identical': True,
                    'raw_ocr': extraction['original_ocr_text'],
                    'payment_clauses': len(payments),
                    'all_pending_with_boxes': True,
                    'character_error_rate': round(
                        Levenshtein.distance(expected, extraction['analysis_text']) / len(expected), 4
                    ),
                }
            )
    (output / 'ocr-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
