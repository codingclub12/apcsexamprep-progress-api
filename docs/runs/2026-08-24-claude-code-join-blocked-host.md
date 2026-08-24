# A class of 27 could not join, and the server was fine the whole time

2026-08-24, Claude Code. Reported as "my students are not able to join my class,
they put in the 4 digits and click continue but they receive network connection
error". The screenshot showed step 1 of /pages/join with `JAVA-XCZH` typed and
`Could not reach server. Try again.` under it.

## What was actually broken

Nothing on the server. Measured live, from outside the school network:

| check | result |
|---|---|
| `GET /api/class/JAVA-XCZH/exists` on progress.apcsexamprep.com | `200 {"exists":true,"class_name":"SDGD - 7th Hour","course":"intro-java","student_count":27}` |
| same, on the Railway hostname | identical 200 |
| CORS preflight for `POST /api/student/join`, Origin `https://apcsexamprep.com` | `204`, `access-control-allow-origin` echoed |
| storefront CSP | `block-all-mixed-content; frame-ancestors 'none'; upgrade-insecure-requests` |
| `POST /api/student/join` with a bogus code | `404 {"error":"Class not found or inactive..."}` |

The class row is real and active. CORS is correct on both hostnames. There is no
`connect-src` in the storefront CSP, so nothing there blocks a fetch.

The message the students read comes from exactly one place, the `catch` in
`APJoin.verifyCode()`. It fires only when `fetch()` rejects or `r.json()` throws.
A rejected fetch on a page that loaded fine means the browser could not reach
that host, and the page was calling
`apcsexamprep-progress-api-production.up.railway.app`, the hostname the app
happens to be deployed on. School content filters routinely block
`*.up.railway.app` as an uncategorised cloud host while apcsexamprep.com and its
subdomains are allowed. The page loads, the fetch dies, and the student reads
"Could not reach server".

That is why it was invisible: it reproduces for the students and for nobody else.
The teacher, at home, on the same page, joins fine.

## Why /pages/join specifically

Every other student-facing surface in this repo had already moved to the API's
own name. The join page was the last one that had not, and it is the one page a
student must get through before any other page can matter.

| file | host before |
|---|---|
| my-progress.html, cyber-class.html, cyber-dashboard.html, apcs-score-reporter.js, intro-java-reporter.js, games/_leaderboard.html, heartbeat-reporter.js, lab-player.js | `progress.apcsexamprep.com` |
| **join.html** | **the Railway hostname** |
| **apcs-reporter.js** | **the Railway hostname** |
| apcs-tracker.js | the Railway hostname (theme repo is canonical, not fixed here) |

## What changed

**shopify/join.html.** One hardcoded host became two, tried in order, with
`progress.apcsexamprep.com` first. All five call sites go through one `apiFetch`
helper. The Railway name was kept rather than deleted: it is an independently
routed second way in, and a join page reachable by exactly one route is the
failure being fixed, not a shape to rebuild under a new hostname.

Two smaller things fell out of the same helper. A non-JSON body now yields `{}`
instead of throwing, so school WiFi answering with a captive-portal login page
stops being reported as a connection failure. And an HTTP error is never retried
against the second host, so a 404 "class not found" cannot be re-read as
something else there.

The dead-end message is gone. `Could not reach server. Try again.` was the whole
of what a student got for a failure that would never resolve by trying again.
It now names the school network and tells them to show it to their teacher.

**shopify/apcs-reporter.js.** Same hostname, same students, and it is owned by
this repo. Left alone, the class joins and then their work silently does not
record, because a reporter has nowhere to show an error. One line, matching what
apcs-score-reporter.js and intro-java-reporter.js already do.

**smoke/join-api-host.js**, 32 assertions, wired into CI by its npm script. It
lifts the real `apiFetch` out of the shipped file and runs it against a stubbed
fetch, so what is locked is behaviour and not a string: which host is dialled
first, that a blocked first host still gets the student through, that a working
host is remembered rather than redialled on every click, that a 404 is never
retried, that a captive portal is not an outage, and that no call site below the
helper calls `fetch()` or names a host directly.

Checked against reintroduction: reverting the host order fails 4 assertions, and
a new raw `fetch()` to a hardcoded host fails 2.

## Evidence

- 102 offline smoke suites pass, the new one included.
- `smoke/page-import-guard.js`: 18 passed, so the file still carries everything
  the live page has.
- The repo copy of join.html was byte-identical to the live body before the edit
  (all four flow functions compared after entity normalisation), so this is a
  clean import and not a drift overwrite.
- `scripts/page-body-csv.js --only join --live` passes all five guards against
  the body pulled from the rendered live page, content-loss check included.

## Still open

- **The sheet is not imported.** Generate and import it; the fix is not live
  until then.
- **apcs-reporter.js is not deployed.** It is a theme asset and ships separately.
- **shopify/apcs-tracker.js still names the Railway host.** This repo is not
  canonical for it: the deployed asset lives in APCSExamPrep-theme and reaches
  the storefront through Shopify two-way GitHub sync. It needs a theme PR first,
  then the mirror re-synced in the same pass. Until that lands, visit tracking
  is still single-homed on the blocked hostname for those students.
- **The cause is inferred, not observed.** Everything measurable rules the server
  out, and the blocked-host reading explains every symptom, but confirming it
  needs one look from inside the school network: open the join page there, F12,
  Network tab, press Continue, and read what the request to the API does.

## What this is really about

A hardcoded hostname is a single point of failure that nobody can see from the
outside. The general fix is not "use the right name this time", it is that the
one page a student cannot skip should not be reachable by exactly one route.
