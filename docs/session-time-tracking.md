# Session time tracking (time on site + active time)

Measures, per student browser visit: **time on site** (foreground seconds),
**active time** (foreground AND interacting within a 30s idle window), and
**page views**. Rolled up per student, class, and paid tier so the admin
dashboard can separate premium engagement from the ad-supported population.

Additive only. No existing route, table, or the page-visit tracking changes.

## Data model

`sessions` (in `db.js`): one row per visit (browser tab), keyed by a
client-generated id kept in `sessionStorage`.

| column | meaning |
|---|---|
| `id` | client-generated session id (per tab) |
| `student_id`, `class_id`, `course` | derived server-side from the JWT / class |
| `active_seconds` | engaged time (visible AND not idle) |
| `total_seconds` | foreground time on site |
| `page_views` | pages viewed in the visit |
| `ua` | User-Agent, truncated to 120 chars |
| `channel` | acquisition channel: Direct / Organic Search / Social / Referral / Email / Paid / Other (first-touch, entry channel) |
| `referrer_host` | referring domain only (no path, query, or full URL) |
| `started_at`, `last_beat_at` | first and most recent heartbeat |

Counters are **cumulative** on the client and the server keeps the **MAX** on
upsert, so a retried or out-of-order flush can never double count.

## Endpoint

`POST /api/progress/heartbeat` (student JWT auth, rate limited 40/min per
student).

Request:
```json
{
  "session_id": "8-64 url-safe chars",
  "course": "ap-csa",
  "active_seconds": 300,
  "total_seconds": 500,
  "page_views": 3,
  "channel": "Organic Search",
  "referrer_host": "google.com"
}
```
`channel` is classified by the reporter from `document.referrer` + UTM tags and is
validated server-side against the fixed enum (anything else becomes `Other`);
`referrer_host` is stored as a domain only. Both are first-write-wins, so they
record the visit's ENTRY channel. Powers the analytics acquisition report
(new vs returning users by channel, top referrers).
The server derives `student_id` / `class_id` from the token and captures the
User-Agent itself. `active_seconds` / `total_seconds` are clamped to `[0, 86400]`
and the session row is UPSERTed monotonically (bound to the owning student).
Response: `{ "ok": true }`.

### Write volume (why it is cheap)

The reporter flushes ~1-2 times a minute per open tab plus once on page hide, and
every flush UPDATEs the **one** session row. There is no per-heartbeat insert.
This is the guard that keeps heartbeats off the Railway bill; do not change the
reporter to insert per beat.

## Zero PII

Only a random session id, durations, a page-view count, and a truncated
User-Agent are stored. No URL, no page title, no student input. Consistent with
the repo's zero-PII posture for minors.

## Reporter

`public/heartbeat-reporter.js` is the canonical reference implementation (the
theme repo is maintained separately; copy it there or serve it from the API
origin, and include it on lesson pages after login). It:

- keeps one session id per tab and cumulative `active` / `total` counters across
  page navigations within the tab;
- counts a second as *active* only while the tab is visible and the user has
  interacted within the last 30s; *total* counts foreground seconds;
- flushes every 45s and on `visibilitychange`/`pagehide` via `fetch(...,
  { keepalive: true })` so the final flush survives unload while still sending
  the `Authorization: Bearer` header.

Wire it up by setting `window.APCS_HEARTBEAT` before the script runs:
```html
<script>
  window.APCS_HEARTBEAT = {
    getToken: () => localStorage.getItem('apcs_student_token'), // your auth key
    course:   document.body.dataset.course,                     // or a literal
    base:     'https://progress.apcsexamprep.com'
  };
</script>
<script src="/heartbeat-reporter.js" defer></script>
```
`getToken` must return the same student JWT the existing tracker sends. If it is
absent the reporter stays silent (no course / no token => no-op).

## Admin surfacing

`GET /api/admin/summary` gains two blocks (rendered on the admin dashboard):

- **`engagement`**: `sessions_total`, `avg_active_min_per_session`,
  `active_share_pct` (engaged / foreground), `active_minutes_total`, a `by_tier`
  split (premium vs free), and a `last_7d` window.
- **`monetization`**: premium (paid-seat) vs free/ad-supported counts of
  teachers, classes, and students, plus `premium_student_share_pct`. Premium =
  a class whose teacher holds a live entitlement for the class course; free =
  everyone else (including all solo accounts). Real users only (owner / prober /
  audit excluded). The free tier is the ad-supported population.
