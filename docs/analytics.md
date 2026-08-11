# PostHog analytics

Product analytics for the progress API and its admin/teacher pages. Server-side
events via `posthog-node`, browser-side autocapture and session replay via
`posthog-js`.

## Turning it on

Set one variable:

```
POSTHOG_API_KEY=phc_...
```

That is the entire switch. With it unset the server never constructs a client,
`/posthog-init.js` serves an inert stub, and nothing leaves the box. Local runs,
CI and every smoke test are silent by default because none of them set it.

The key is the **public project API key** (`phc_...`) from PostHog under
Settings > Project. It is write-only by design and is embedded in the admin
pages' JavaScript, which is the intended use. Never put a personal (`phx_`) or
secret (`phs_`) key in this variable.

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTHOG_API_KEY` | unset (off) | Public project key. Unset means fully off. |
| `POSTHOG_HOST` | `https://us.i.posthog.com` | Ingestion host. EU projects use `https://eu.i.posthog.com`. |
| `POSTHOG_ASSETS_HOST` | derived | Browser bundle origin. Only set for a self-hosted instance that splits ingestion from static assets. |
| `POSTHOG_CAPTURE_REQUESTS` | on | Set to `0` to stop the per-request firehose while keeping domain events. |

Railway: set these in the service Variables tab. Changing them restarts the
service, which is enough to pick them up.

## What gets collected

### Server (`lib/posthog.js`)

- `api_request`, one per `/api/*` call, recorded on response finish. Carries
  method, normalized path, status, duration, role, and class id.
- `attempt_recorded`, one per CFU or quiz submission through
  `POST /api/progress/attempt`. Carries course, lesson, item, score, max score,
  percent, passed, attempt number, retry policy, duration, and the resulting
  grade of record.
- `$exception`, from `enableExceptionAutocapture`, for uncaught exceptions and
  unhandled rejections.

Server events are keyed by internal row IDs (`student_id`, `class_id`,
`teacher_id`). This module does not read `display_name` or teacher email, so the
server-side stream carries no names. The browser side is a different story, below.

### Browser (`public/posthog-init.js`)

Everything the SDK offers is on: autocapture, pageviews, pageleaves, heatmaps,
web vitals, and session replay. The script is loaded by every page in `public/`.

**Session replay records the rendered DOM, and the teacher gradebook renders
student display names.** `routes/teacher.js` builds the gradebook with
`reveal: true`, and `lib/admin-gradebook.js` renders `display_name` when reveal
is on; the admin pages do the same under `?reveal=1`. So replay sends roster
names to PostHog. That is a deliberate, informed choice, not an oversight. How
much it matters depends on what teachers type into `display_name`: a roster of
"Student 12" carries nothing, a roster of full legal names is student PII under
FERPA and, for under-13s, COPPA. If that becomes a problem the fix is one line:
set `maskTextSelector: '*'` in the `session_recording` block, or
`disable_session_recording: true`.

The one carve-out already in place: **password inputs stay masked**
(`maskInputOptions: { password: true }`). Those fields hold the admin key and
teacher passwords, and shipping live credentials to a third party is a security
bug rather than a privacy preference. `smoke/posthog.js` asserts both the mask
setting and that every credential input on every page is still `type="password"`,
so a future page that uses `type="text"` for a credential fails the smoke test
instead of silently recording it.

## Cost and the 1 GB box

Two things here exist because of the Railway constraints in CLAUDE.md.

**Bounded queue.** `maxQueueSize` is pinned to 500, far below the SDK default of
10000. If PostHog is unreachable the queue fills and drops the oldest events
rather than growing. Same reasoning as the wire-log ring buffer.

**Circuit breaker.** `posthog-node` logs a full stack trace plus a dumped
`Response` object through a bare `console.error` it does not let you replace, on
every failed flush. An outage or a mistyped key would otherwise produce about 25
log lines every 10 seconds, forever, burying the Railway boot log. The `fetch`
option is the only injectable seam, so the breaker lives there: after two
consecutive failures it stops calling the network for five minutes and hands the
SDK a synthetic 200, which makes it drop the batch quietly. Events are lost while
the circuit is open. That trade is deliberate; the alternative is a log nobody
reads. One `[posthog]` warning line per cooldown keeps a wrong key visible.

**Event volume.** `api_request` is one event per API call and is the main driver
of the PostHog bill. Thirty students working through a lesson generate a lot of
calls. If the bill or the ingest quota becomes the constraint, set
`POSTHOG_CAPTURE_REQUESTS=0`: domain events and browser analytics keep working,
and only the firehose stops.

## Failure posture

Analytics must never fail a student's submission. Every entry point in
`lib/posthog.js` swallows its own errors, the client is built lazily inside a
try/catch, and a transport `error` listener is attached because `posthog-node`
emits rather than throws (without the listener a transport failure would take the
process down). `smoke/posthog.js` asserts that `capture()` survives a circular
payload and a null distinct id, and that the middleware still calls `next()`.

Verified against a genuinely unreachable host: the API kept serving requests and
exited cleanly on SIGTERM.

## Shutdown

`server.js` traps SIGTERM and SIGINT and awaits `posthog.shutdown()` so events
buffered since the last flush survive a Railway redeploy, with a 4 second hard
stop so a hung flush cannot block the container from exiting.

## Adding an event

```js
const posthog = require('../lib/posthog');

posthog.capture('event_name', studentId, { course, lesson_id, score });
// or, to take identity from the request:
posthog.captureRequest(req, 'event_name', { ... });
```

Keep property values low cardinality. An unbounded property value is the
analytics equivalent of an unbounded array: it makes every chart useless and
every query slow. Paths are normalized in `normalizePath()` for exactly this
reason, and that normalization is asserted in the smoke test.

From a page, `window.phCapture('event_name', { ... })` is safe to call before the
SDK has loaded, and is a no-op when analytics is off.

## Run the checks

```
npm run smoke:posthog
```

## What is not wired

The student-facing lesson pages on apcsexamprep.com are Shopify theme assets and
live in the **APCSExamPrep-theme** repo, not here. Nothing in this pass touches
them. Instrumenting student pages would mean minors' browsing behavior in
PostHog, which is a materially bigger decision than instrumenting the operator
and teacher surface, and it should be made on its own.
