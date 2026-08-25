# When pages go down

Written 2026-08-25, after progress.apcsexamprep.com went down and took the
practice pages with it.

## The thing that makes this confusing

The pages did not go down. They returned HTTP 200 the entire time, rendered
their heading and their prose, and then sat on "Loading the practice
question..." forever.

That is worse than a 404 for the person in front of a class. A 404 is
unambiguous and everyone knows whose fault it is. A spinner looks like the
school's wifi. An uptime check that asks for a status code would have been green
throughout.

So the first rule: **HTTP 200 is not health on this site.** Most content pages
are a mount point plus a script tag, and the content arrives from the API at
render time.

## What depends on what

```
Shopify page (www.apcsexamprep.com)     content lives in the page body
  |
  |  <script src="progress.apcsexamprep.com/...-player.js">
  |  fetch("progress.apcsexamprep.com/api/...")
  v
Railway container (progress.apcsexamprep.com)   one container, 1 vCPU, 1 GB
```

Pages that are **fully static** and survive the API being completely down:

- `ap-cybersecurity-frq-practice`, `ap-cybersecurity-labs`,
  `ap-cybersecurity-practice`. Every card is real HTML in the page body. This is
  deliberate and is why they are safe to send people to during an outage.
- The complete course guide and the practice exam page.

Pages that **need the API to show their main content**:

- The Device Security Analysis pages (`/api/frq/...`)
- The terminal labs (`/api/labs/...`)
- The Command Center, for live student progress. Its pacing and lesson structure
  are static, so it degrades rather than dying.

## The four ways it breaks

| Mode | What the student sees | Handled by |
|---|---|---|
| Player script never loads | spinner forever | `lib/page-bootstrap.js`, global missing check |
| Spec fetch rejects | one bare sentence | bootstrap replaces it with a fallback that links out |
| API accepts and never answers | spinner forever | 12 second sentinel timeout |
| Page body truncated by an import | page renders short or blank | `lib/live-body-guard.js` |

The third is the worst, because nothing ever rejects and no `catch` ever runs.
It has no natural end.

## Checking

```
node scripts/page-availability.js          # is the site usable right now
node scripts/page-availability.js --json   # same, for a workflow
```

It checks the endpoint each page actually mounts from, not a generic health
route: `/api/health` can be perfectly happy while `/api/frq` is broken by one
bad spec. It also reports any mounting page that lacks an outage fallback.

For deploy staleness specifically, `/api/health` reports the serving commit and
`.github/workflows/deploy-drift.yml` compares it to main every 30 minutes. On
2026-08-25 the serving commit sat two behind main for roughly 25 minutes after a
merge; that was a slow Railway queue and it cleared on its own. Deploy drift
tolerates a young head commit on purpose, so a fresh merge does not alarm.

## If it happens again

1. `node scripts/page-availability.js`. It will say whether this is the API, one
   endpoint, or one page.
2. If the API is down: pages with the fallback now show an explanation and a
   link to a static hub, so this is degraded rather than down. Say so, and point
   people at `/pages/ap-cybersecurity-practice`.
3. Check `/api/health` for the serving commit. If it is behind main, this is a
   deploy problem rather than a crash, and the Railway build log is the place to
   look.
4. If one endpoint is bad while the rest are fine, suspect a spec: `/api/frq`
   and `/api/labs` both report `spec_errors`, and a malformed spec file breaks
   only its own course.

## Never do these

**Never import a sheet without the live check.** Shopify keeps no usable page
history. A Matrixify import that replaces a body is not undoable, and Matrixify
reports the replacement as a success either way. On 2026-08-22 an import of
`shopify/join.html` deleted the entire self-study tab from `/pages/join`, along
with the Continue My Course button, and every guard in the generator was green
because none of them looked at the live page.

Every generator now runs `lib/live-body-guard.js` before writing, and refuses on
content loss or on a body that shrank by more than half. `--allow-content-loss`
exists for when you genuinely mean it. `--no-live-check` exists for when the
storefront is unreachable, and should be read as "I accept that this may delete
live content".

Snapshot first when in doubt: `node scripts/snapshot-live-page.js`.

**Never add a mounting page without a fallback.** `lib/page-bootstrap.js` gives
you the mount point, the bootstrap and the script tags. `smoke/page-outage.js`
executes them under all four failure modes and fails the build if a student
would be left looking at a spinner.

**Never test a fallback by grepping for it.** A fallback that is present and
never fires is exactly the bug. The smoke suite runs the real bootstrap in a
DOM and asks whether the explanation actually landed in the mount point, and it
also asserts the fallback does NOT fire when the API is healthy, which is the
assertion that stops a bad edit replacing every working page with an outage
notice.
