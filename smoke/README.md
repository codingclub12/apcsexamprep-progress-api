# Auth + Enrollment Smoke Test

A real-browser (Playwright + Chromium) test that drives the real student auth
and enrollment flow on the live site, so a silent login failure is caught by a
machine on every deploy instead of by a teacher in September.

It exists because login failed silently for two motivated adults in July (form
submit, nothing happened, no error). Static inspection cannot catch that, because
the login IS JavaScript. Only a real browser driving the real flow reveals it.

## Why it is isolated in `smoke/`

Playwright lives in `smoke/package.json`, NOT in the repo-root `package.json`.
Railway builds with `npm ci` at the repo root, so keeping Playwright out of the
root dependency tree means the production deploy never installs a browser
automation stack on the 1 vCPU / 1 GB box. Nothing here touches the deploy.

## Run it

From the repo root:

The suite runs against all five test classes owned by Tanner. None are real
classes - they are all disposable, so `ZZ-SMOKE` test rows are safe to
accumulate (and are cleaned up via `smoke:cleanup`, below).

| Code | Course |
| --- | --- |
| `CYBER-Q9JG` | AP Cybersecurity |
| `CSA-CQ3G` | AP CSA |
| `CSP-CHSH` | AP CSP |
| `CSA-4UC8` | AP CSA |
| `CYBER-U89X` | AP Cybersecurity |

Never point the test at another teacher's class. Every created student is listed
in `created-artifacts.json`. Pass one or more codes, comma-separated; the full
A-E suite runs against each in its own isolated browser context, and the run
fails if ANY class fails.

```bash
npm run smoke:install      # one time: installs Playwright into smoke/
cd smoke && npx playwright install chromium && cd ..   # if the browser did not auto-download
SMOKE_TEST_CLASS_CODE=CYBER-Q9JG,CSA-CQ3G,CSP-CHSH,CSA-4UC8,CYBER-U89X npm run smoke:auth
```

The test exits non-zero if any hard assertion fails, so it can gate CI or a
deploy.

On an image that already ships a Chromium (some CI runners / containers), skip
the browser download and point at it instead:

```bash
SMOKE_CHROMIUM_PATH=/opt/pw-browsers/chromium SMOKE_TEST_CLASS_CODE=CSA-XXXX npm run smoke:auth
```

## Cleanup (deactivate accumulated ZZ-SMOKE students)

Every run adds a `ZZ-SMOKE` student per class, and there is no student
hard-delete API (deactivate only, never hard-delete), so they pile up.
`smoke:cleanup` sweeps each target class's roster for names starting with
`ZZ-SMOKE` and deactivates them via the teacher endpoint (progress rows are
preserved). It sweeps by name prefix, so it cleans everything accumulated, not
just the last run.

```bash
# Dry run first (recommended) - lists, changes nothing:
SMOKE_TEACHER_EMAIL=you@example.com SMOKE_TEACHER_PASSWORD=... \
SMOKE_TEST_CLASS_CODE=CYBER-Q9JG,CSA-CQ3G,CSP-CHSH,CSA-4UC8,CYBER-U89X \
npm run smoke:cleanup -- --dry-run

# Then for real:
SMOKE_TEACHER_EMAIL=you@example.com SMOKE_TEACHER_PASSWORD=... \
SMOKE_TEST_CLASS_CODE=CYBER-Q9JG,CSA-CQ3G,CSP-CHSH,CSA-4UC8,CYBER-U89X \
npm run smoke:cleanup
```

It authenticates as the class owner (`SMOKE_TEACHER_EMAIL` / `SMOKE_TEACHER_PASSWORD`)
and only touches classes that account owns. A run is a good habit after each
smoke run, or on a schedule during the back-to-school window.

## Required / configurable env vars

| Var | Default | Notes |
| --- | --- | --- |
| `SMOKE_TEST_CLASS_CODE` | **(required)** | One or more class codes, comma-separated: `CYBER-Q9JG,CSA-CQ3G,CSP-CHSH,CSA-4UC8,CYBER-U89X` (all owned by Tanner). The full suite runs per class. NEVER point this at another teacher's class. |
| `SMOKE_SITE_BASE` | `https://www.apcsexamprep.com` | The Shopify site. |
| `SMOKE_API_BASE` | `https://progress.apcsexamprep.com` | Only used for the roster-count check (block B9). |
| `SMOKE_PIN` | generated (4 digits) | Reused across join + login in a run. |
| `SMOKE_HEADLESS` | `1` | Set `0` to watch the browser. |
| `SMOKE_NAV_TIMEOUT_MS` | `8000` | The "N seconds" window for the silent-failure guard. |
| `SMOKE_DO_GRADEABLE` | `0` | Optional block C; needs `SMOKE_LESSON_URL` and live lesson selectors wired. |
| `SMOKE_LESSON_URL` | (unset) | Lesson page for block C when enabled. |
| `SMOKE_ARTIFACTS_DIR` | `./artifacts` | Where screenshots + console/network dumps land on failure. |
| `SMOKE_CHROMIUM_PATH` | (unset) | Point at a pre-provisioned Chromium instead of a downloaded one. |
| `SMOKE_TEACHER_EMAIL` / `SMOKE_TEACHER_PASSWORD` | (unset) | Class-owner credentials, `smoke:cleanup` only. |
| `SMOKE_CLEANUP_DRY_RUN` | `0` | `smoke:cleanup` only; `1` (or `--dry-run`) lists without changing anything. |
| `SMOKE_SENTINEL_PREFIX` | `ZZ-SMOKE` | Name prefix `smoke:cleanup` sweeps for. |

## What it asserts (each is a hard assertion, not a "looks ok")

- **A. Register (join)** a new `ZZ-SMOKE <timestamp>` student: reaches the
  name/PIN step, submit surfaces success **or** a visible error within N seconds
  (else FAIL "silent submit"), a token is written to `localStorage[apcse_token]`,
  and the durable student id is captured for cleanup.
- **B. Enrollment** renders on `/pages/my-progress` (`#aprog-main` visible, name
  matches), and exactly one student was created (roster delta == 1).
- **C. Gradeable action** (optional, off by default).
- **D. Logout + login round-trip**: logout clears the token, login submit passes
  the same silent-failure guard, and the dashboard renders again.
- **E. Negatives**: wrong PIN -> visible error; invalid class code -> visible
  error; duplicate join -> graceful "name taken" error (no crash, no duplicate).

## Verified vs assumed

Selectors and the auth contract were read from the canonical page sources that
ship to Shopify from this repo (`shopify/join.html`, `shopify/my-progress.html`,
`routes/student.js`), not scraped from the live DOM. The full verified-vs-assumed
notes live in the header comment of `auth-enrollment.js`. The most important
caveat: the CURRENT live class-login model is `class_code + display_name + PIN`,
not `student_code + PIN`. Login-by-code is the SOLO (`ME-XXXX`) flow / planned
identity refactor. When that refactor lands, only steps D13/D14 change; the
silent-failure guards (A6, D15, E16) stay identical - they are the durable value.

## Test-account hygiene

This writes REAL rows to PRODUCTION. There is no student hard-delete API
(deactivate only, never hard-delete), so the test cannot self-clean. It ALWAYS
writes `created-artifacts.json` (pass or fail) and prints the created ids to
stdout so cleanup is a one-liner. Do not let these accumulate.
