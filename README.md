# APCSExamPrep Progress API

Student progress tracking system for APCSExamPrep.com.
Supports AP Cybersecurity, AP CSA, AP CSP.

## Architecture

- **Backend**: Node.js + Express + SQLite (Railway)
- **Frontend**: Vanilla JS pages on Shopify
- **Auth**: JWT (teachers) + long-lived JWT session tokens (students)
- **Database**: SQLite via better-sqlite3 (upgrade to Postgres when needed)

## Deployment: Railway

### Step 1 — Create Railway project

1. Go to railway.app → New Project
2. Deploy from GitHub (push this folder to a repo first)
   OR use the Railway CLI: `railway deploy`
3. Railway auto-detects Node.js from package.json

### Step 2 — Set environment variables in Railway

Go to your Railway project → Variables → Add:

```
JWT_SECRET=<generate a long random string - at least 64 chars>
DB_PATH=/data/progress.db
PORT=4000
```

To generate a JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 3 — Add persistent volume for SQLite

In Railway: Service → Volumes → Add Volume
- Mount path: `/data`
- This ensures the SQLite database survives deployments

### Step 4 — Get your Railway URL

Railway gives you a URL like: `https://progress-api-production-xxxx.up.railway.app`

Update the `API` constant in all Shopify HTML files:
```javascript
const API = 'https://YOUR-RAILWAY-URL.railway.app';
```

Optionally set up a custom subdomain: `progress.apcsexamprep.com`
via Cloudflare → DNS → CNAME → your Railway URL

### Step 5 — Deploy Shopify pages

Create four new Shopify pages with handle = exact URL slug.
Paste the HTML from shopify/ into the page body (template: page.blank).

| File | Shopify Handle |
|------|---------------|
| shopify/join.html | join |
| shopify/my-progress.html | my-progress |
| shopify/cyber-class.html | cyber-class |
| shopify/cyber-dashboard.html | cyber-dashboard |

### Step 6 — Add tracker.js to your theme

1. Upload `shopify/apcs-tracker.js` to Shopify theme → Assets as `apcs-tracker.js`
2. On each lesson/exercise/quiz page, add before the closing `</body>`:

```html
<script>
window.APCS_PAGE = {
  course: 'ap-cybersecurity',
  unit: 'unit-1',
  lesson: '1.1',
  activity: 'lesson', // or exercise-1, exercise-2, quiz
};
</script>
<script src="{{ 'apcs-tracker.js' | asset_url }}"></script>
```

### Step 7 — Integrate quiz scoring

On each quiz page, after the student submits their final score, call:

```javascript
// When student completes quiz and you have their score (0-100):
if (window.APCS_saveQuizScore) {
  await window.APCS_saveQuizScore(score, { q1: 'C', q2: 'B' });
}
```

## API Endpoints

### Public
```
GET  /api/health                    Health check
GET  /api/class/:code/exists        Validate class code
```

### Teacher Auth
```
POST /api/teacher/register          { email, password, name, school }
POST /api/teacher/login             { email, password }
GET  /api/teacher/me                Get teacher profile (auth required)
```

### Teacher Class Management (auth required)
```
GET  /api/teacher/classes           List all classes
POST /api/teacher/classes           Create class { class_name, course }
GET  /api/teacher/classes/:code     Class details + student list
GET  /api/teacher/classes/:code/progress   Full dashboard data
GET  /api/teacher/classes/:code/export     CSV download
PUT  /api/teacher/classes/:code     Update class { class_name, active }
DELETE /api/teacher/classes/:code/students/:id  Remove student
```

### Student Auth
```
POST /api/student/join              { class_code, display_name, pin }
POST /api/student/login             { class_code, display_name, pin }
```

### Student Progress (auth required)
```
GET  /api/student/me                Student profile + class info
GET  /api/student/progress          All progress records + class mastery_threshold
GET  /api/student/attempts          Per-item grade-of-record grid (manifest-scored)
POST /api/student/progress          Save/update progress record
POST /api/student/quiz              Submit quiz attempt with score
POST /api/student/score             Record one graded interaction (rolls up to progress.score)
POST /api/progress/attempt          Record one CFU/quiz attempt (manifest-gated)
```

### Server-side quiz scoring (Phase 2, answer keys never ship to the browser)
```
GET  /api/quiz/:course/:unit/:lesson/:activity_type   Shuffled questions + order_token (no keys). Public.
POST /api/quiz/submit                                  Server-scores against quiz_bank. Optional student auth.
POST /api/teacher/classes/:code/release               Release the answer key for one activity to a class.
GET  /api/teacher/classes/:code/releases              List released activities.
```

The server owns the questions and correct answers in `quiz_bank`; the page renders
prompts and options only. Self-study gets the key immediately with unlimited
attempts; class mode returns correct/incorrect booleans only, one attempt (unless
retry is allowed), and the key is withheld until the teacher releases it. Seed keys
with `node scripts/seed-quiz-bank.js` (never auto-runs on boot). Full request and
response shapes: `docs/phase2-server-scoring-contract.md`.

### Graded reporting: which endpoint per course

There are two graded-reporting paths and each course uses exactly one. Pick by
course; do not mix them for a single course, or the two rollups disagree.

| Course | Endpoint | Denominator authority | Notes |
|--------|----------|-----------------------|-------|
| ap-csa | `POST /api/progress/attempt` | `course_manifest` | Unit 1 pilot. Rejects any `(course, item_id)` not in the manifest. |
| ap-csp | `POST /api/student/score` | client-sent `max_points` | Course-agnostic. No manifest rows required; `(course, unit, lesson)` is validated against the `COURSES` config in `utils.js`. |
| ap-cybersecurity | `POST /api/student/score` | client-sent `max_points` | Same path as CSP; existing grade-reporting flow. |

`/api/student/score` appends to the append-only `score_events` ledger and
recomputes `progress.score` (best points per distinct item, summed, 0-100).
Reporter key strings for `/score` (unit, lesson, activity_type) must match
across the reporter, the rollup, and both dashboards. For CSP: `unit` is
`bi-N`, `lesson` is the lesson slug (e.g. `conditionals`), `activity_type` is
`lesson` | `exercise-1` | `exercise-2` | `quiz`. Send `item` (a stable
per-question id) plus either `correct` (boolean) or `points` + `max_points`.

## Local Development

```bash
cd progress-api
cp .env.example .env
# Edit .env with your JWT_SECRET
node server.js
# API runs at http://localhost:4000
```

## Adding More Courses

The schema and COURSES config in `utils.js` supports all three courses.
To add CSA or CSP lessons, update the `COURSES` object in `utils.js`
and the `COURSE_MAP` in `shopify/my-progress.html`.

## Scaling to Postgres

When SQLite isn't enough (hundreds of concurrent teachers):
1. Add Railway Postgres service
2. Replace `better-sqlite3` with `pg` or `knex`
3. Port schema to Postgres DDL (SERIAL instead of TEXT for IDs, etc.)

SQLite can handle thousands of students easily for V1.
