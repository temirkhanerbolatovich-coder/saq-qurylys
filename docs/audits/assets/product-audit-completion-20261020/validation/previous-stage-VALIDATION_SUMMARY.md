# Independent project audit validation — 20.10.2026

Scope: current local source and existing tests only. No SSH, cloud mutation,
working/QA database access or production browser commands. No product source
changes and no dependency installation. All evidence below is from fresh checks.

## Results

| Check | Result |
|---|---|
| `npm.cmd run typecheck`, cwd `frontend` | exit 0, 4.75 s |
| `npm.cmd run lint`, cwd `frontend` | exit 0, 19.11 s |
| `.venv/Scripts/python.exe -m ruff check .`, cwd `backend` | exit 0, 0.56 s |
| `node --test scripts/test-pdf-proxy.mjs`, cwd `frontend` | 2 passed, exit 0 |
| Focused backend, 12 existing files | 199 passed / 8 failed / 3 skipped, 122.29 s, exit 1 |
| The 8 failed legal cases alone, new empty DB | 8 passed / 35 deselected, 9.07 s, exit 0 |
| Minimal two-test order reproduction, another empty DB | 1 passed / 1 failed, 3.04 s, exit 1 |
| OpenAPI route/method/operationId parity | 89 documented / 89 actual; zero missing/extra/mismatched IDs |
| Source versus saved final deployment manifest | all 449 SHA256 values match, no missing files or extra runtime source |
| Existing mocked Playwright presentation tests, final frontend image | 17 passed, 12.9 s, exit 0 |

No new production build was run; browser regression used the existing final
production image named below. Full exact commands, exit codes and durations: `checks.json` and
`presentation-receipt-bridge.json`. Backend scope: risk, API authentication/
CSRF/viewer/provenance/idempotency, contract response samples, property search,
review queue, immutable signals/PDF workflows, document timeout/export/dossier
reports, legal bases and legal absence. Full suite was not run.

The three skipped cases need native Linux PDF runtime: one real signal renderer
and two RU/KZ real dossier render cases. Windows mock/API tests do not prove fresh
native rendering. No new production load, security penetration or six-viewport
live acceptance is claimed.

## Confirmed test isolation defect (P2)

The combined focused run is not green. This is an order-dependent test isolation
failure, reproduced by running:

```
pytest tests/test_signal_pdf.py::test_pdf_get_is_read_only_and_queue_is_idempotent tests/test_legal_absence.py::test_matching_absence_and_payment_are_red_in_either_order[absence-first] -q -ra
```

The first test leaves a queued PDF job (`backend/tests/test_signal_pdf.py:40`).
All tests in one invocation share a session database schema
(`backend/tests/conftest.py:16`). The helper `analyzed()` runs `process_one()`
once and assumes its new ANALYZE job has completed
(`backend/tests/test_analysis.py:86`). The worker correctly selects the oldest
queued job (`backend/app/worker.py:54`), so it processes the preceding PDF and
the new job remains QUEUED. All eight affected legal cases pass in an otherwise
empty schema. This evidence confirms test-order dependence, not a legal/risk
calculation failure in the product. A test-only fix should isolate queued jobs
per case or explicitly process/wait for the target job, while preserving FIFO.

## Presentation regression boundary

Final local image `saq-oracle-frontend:20261020-micro-v2`, image ID
`sha256:09385a26c7109ce8adff29160c0020d32a1f40dd2678d680e7d1ba7e8330a90a`.
New disposable frontend, dedicated Docker bridge, `127.0.0.1:65444` only,
`API_INTERNAL_URL=http://127.0.0.1:9`, no backend service. Existing fixtures
intercept every `/api/v1/**` call. No real login/data/command was sent.

Ran shell-redesign (three cases without fixed screenshot paths), report-options
(two cases without fixed screenshots), and functional-safety (12 cases including
parameterizations). Covered draft preservation, logout/401 isolation, conflicts,
viewer controls, exact R1/R3–R6 editor navigation, report retry/cancel, language,
search and recoverable authentication. Default viewport was 1280×720: no viewport
override in `frontend/playwright.config.ts`, verified against installed
`frontend/node_modules/playwright/lib/index.js:257`. The five parameterized
R1/R3–R6 next-action cases additionally set 375/768/1024/1440×1000 and check page
overflow (`functional-safety.spec.ts:209`). Other selected cases keep the default.
Map/dossier-sections were excluded because their support helper uses real API;
V2 was excluded from this bounded run because it has fallback routes. Existing
fixed user screenshots were not overwritten. Results use unique
`output/qa/product-audit-20261020-56c0963268bc`.

The manifest check verifies local source against the saved release manifest;
it does not independently re-read the current remote server filesystem.

## Safety and harness notes

Each DB had a new random password/container/port and `127.0.0.1` binding. Before
pytest a guard asserted expected host, assigned port, database and user. Only
own exact containers and anonymous volumes were removed. Dedicated UI network
and container were also removed; filtered Docker inventory confirmed no own
audit resources remained. Working/QA containers were untouched.

One attempted order-reproduction database guard caught PostgreSQL initialization
socket readiness before final TCP startup. Tests did not start. The ignored
helper now waits for TCP readiness; the next new database reproduced the order
failure. One UI setup attempt on a Docker internal network lacked the required
loopback published binding and safely aborted before tests; the separate bridge
attempt passed. An initial cp1251 console-output error after successful static
checks was corrected only in the ignored helper, with no repeated static checks.
These harness failures are retained in evidence and are not product findings.
