# Backend audit continuation — 2026-10-20

Scope: current dirty checkout at `C:\Users\Админ\Desktop\УС ВТиПО-25-2\Хакатоны\Хакатон 8.0 Оскемен Октябрь`, read-only code/doc review and tests against a newly created disposable PostgreSQL container. No application or repository documentation edits. Existing containers, databases, schedules, `.env`, storage, remote services and SSH were untouched.

## Confirmed findings

1. **SQ-01 / P1 — publication/capture dates merge in evidence.** `backend/app/api/reviews.py:421` persists `event_at=(ad.published_at or ad.captured_at)`, while the signal contains `EvidenceOut`, not both original Advertisement dates (`backend/app/signal_dto.py:35`). With unknown publication date, the PDF labels this as the event date (`backend/app/pdf_render.py:123`). This is a provenance/presentation defect, **not a demonstrated R1/R2 bypass**: `backend/app/legal_absence.py:144` requires known exact `ad.published_at == absence_at` for the red pair.

2. **SQ-02 / P1 — signal PDF drops temporal limits of legal basis.** The snapshot includes `applies_from`, `applies_until`, `verification_as_of` (`backend/app/dto.py:149`), but the renderer prints only mechanism/status, document date, issuer, scope, source and capture (`backend/app/pdf_render.py:96`). A fresh pure `signal_html` probe prints `VERIFIED_VALID` but none of three supplied temporal markers. Evidence: `pure-probes.json`.

3. **SQ-03 / P1 — zero/GREEN signal PDF omits unknown factor coverage.** `backend/app/pdf_render.py:58` prints score/zone; its unknown-information section (`:79`) comes from legal/progress notes and does not print `risk.unknown_codes`. With six unknown factors and a valid basis/known progress, a fresh template probe shows `0 / GREEN` with no R1–R6 names and no green-zone caveat. Calculation itself is correct: confirmed unique codes only and R1+R2 red guard in `backend/app/risk.py:9`–`:12`.

4. **SQ-04 / P1 — payment false negatives lack an independent manual annotation path.** Review selects an existing hypothesis (`backend/app/api/analysis.py:259`); evidence requires PAYMENT_TERM and `payment_offer` success (`backend/app/api/reviews.py:359`–`:369`). Transcription reruns the same parser (`backend/app/worker.py:23`–`:37`). Fresh pure probe `DEMO: ЖК «Оқу». Оплатите первый этап 2 млн тенге сегодня, дом ещё строится.` yields `payment_offer=false` and PROPERTY_NAME/AMOUNT/STAGE only. This proves a workflow gap for this synthetic false negative, not a measured error rate on real RU/KZ advertising. Evidence: `pure-probes.json`.

5. **SQ-15 / P2 — queued jobs leak across tests.** Session database fixture (`backend/tests/conftest.py:18`) shares queue state; `test_signal_pdf.py:38` leaves a queued PDF; `test_analysis.py:86` runs `process_one()` once and assumes its own new ANALYZE is finished; worker correctly takes the oldest job (`backend/app/worker.py:54`). Fresh two-case order reproduction yields **1 passed / 1 failed, 4.82s**, with new ANALYZE still QUEUED. This is a test-isolation bug, not a legal calculation defect. Evidence: `order-reproduction.log`. Legal-only recheck follows below.

## False positives rejected / positive implementation evidence

- Late capture does not replace more recent observed content. The service chooses latest by captured_at and version; explicit regression exists at `backend/tests/test_monitoring_findings.py:435`.
- Capture reads frozen successful run/profile/dictionary provenance, does not accept client post payloads or issue a second source call (`backend/app/monitoring_findings.py:69`). Explicit imports bind exact version and observation, serialize per version and create a NEW material (`backend/app/api/monitoring_findings.py:355`). Analysis, matching and risk remain separate.
- Reads/role restrictions, deduplication under concurrency, corrupt provenance, version reversions and preserved originals have targeted tests in `backend/tests/test_monitoring_findings.py` and `test_monitoring_dictionaries.py`; they are included in the full run.
- SSRF transport pins validated public IP addresses with original TLS hostname, revalidates redirects and applies an overall subprocess deadline (`backend/app/url_fetcher.py`). This code/test review is not penetration testing or live source access verification.
- Alembic has a single current head **ef90fc78b461**. Migration tests preserve prior rows and refuse destructive downgrade after findings/dictionary history exists. Full run covers those tests.

## Fresh validation

- New PostgreSQL container `saq-audit-db-65cf3012`, image `postgres:17.9-bookworm`, only `127.0.0.1:62781`, synthetic credentials. `pg_isready`: ready. Existing database containers untouched.
- Full backend started with overridden disposable DATABASE_URL, synthetic session/bootstrap values, Telegram/Threads disabled, `PYTHONDONTWRITEBYTECODE=1`, `-B`, pytest cache disabled, base temp and logs below `ns/work/backend-audit`.
- Command from backend: `../.venv/Scripts/python.exe -B -m pytest -q -p no:cacheprovider --basetemp <scratch>/pytest-temp --tb=short -rs`: **1180 passed / 20 skipped / 0 failed, 520.18s (8m40s), exit 0**, `full-backend.log`. A green default-order full run does not negate SQ-15's independently reproduced order-dependent failure.
- SQ-15 exact command: `pytest tests/test_signal_pdf.py::test_pdf_get_is_read_only_and_queue_is_idempotent tests/test_legal_absence.py::test_matching_absence_and_payment_are_red_in_either_order[absence-first] -q -p no:cacheprovider --basetemp <scratch>/order-temp --tb=short -ra`: 1 PASS / 1 FAIL, 4.82s.
- Legal-only independent schema recheck: `pytest tests/test_legal_absence.py -k 'matching_absence_and_payment_are_red_in_either_order or mixed_or_unknown_event_dates_cannot_confirm_a_red_pair' -q -p no:cacheprovider --basetemp <scratch>/legal-temp --tb=short -ra`: **8 passed / 35 deselected, 13.66s**. This verifies exact-date R1/R2 behavior for both confirmation orders and rejection of unknown/different dates.
- `python -B -m alembic heads`: one head, ef90fc78b461.
- Fresh dedicated schema on the same disposable DB: `alembic upgrade head` followed by `alembic check` **PASS**, "No new upgrade operations detected". The schema was dropped afterwards; the full-suite test schema is separate. Evidence: `migration-model-parity.log`.
- Backend `python -B -m ruff check --no-cache .` **PASS**; `python -B -m ruff format --check --no-cache .` **PASS**, 139 files already formatted.
- Pure parser/HTML probes: no database or network; `pure-probes.json`.
- Skipped 20 Windows cases: dossier real PDF 2; open-registry PDF decoding 1; PDF validation native resource limits 2; signal native Pango 1; supporting-document PDF inspection/resource limits 14. They remain unverified in this fresh run.
- Cleanup: all own test/migration schemas had been dropped (remaining matching schema count 0). After asserting the exact container ID/name/disposable label, only `saq-audit-db-65cf3012` and its anonymous volume were removed. No own database resource remains; existing working/QA containers were not used.

## External acceptance still required

Real permitted Threads access and real-source behavior, independent RU/KZ OCR and parser holdout measurements, authenticated document/legal/domain acceptance, finding resolution/priority review and broader scheduler/paging P0 requirements, second physical PC installation, final agreed SHA/CI and actual submission remain separate gates. Windows tests skip real native Linux PDF render cases; pure HTML probes do not replace page-by-page PDF visual acceptance. No new production load test, security penetration test or source access spike was performed.
