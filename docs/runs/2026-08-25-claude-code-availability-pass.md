# Availability pass: pages that survive their API

Follows the cyber practice hubs work in the same session. Prompted by Tanner:
major pages went down the other day and cannot again.

## What actually happened

progress.apcsexamprep.com went down. The pages did NOT 404. They served HTTP
200, rendered heading and prose, and sat on "Loading the practice question..."
indefinitely. To a teacher in front of a class that is worse than a 404: a
spinner reads as the school's wifi rather than as our outage. Any uptime check
asking for a status code would have been green for the whole event.

## Three failure modes, one handled

Reading the players rather than assuming:

- **(a) player script never loads.** The inline `APCSFrq.mountById(...)` throws
  ReferenceError and the mount point keeps its loading text. UNHANDLED.
- **(b) spec fetch rejects.** Both players catch and write one bare sentence.
  Handled, but with no way out of the page.
- **(c) API accepts and never answers.** fetch never settles, no catch runs, the
  spinner is permanent. UNHANDLED, and the worst of the three because it has no
  end.

## What changed

`lib/page-bootstrap.js` is the shared inline bootstrap, generated into every
mounting page. It handles all three plus a synchronous throw, and renders a
fallback that says what is wrong, says the student has lost nothing (these are
self-scored and transmit nothing), and links to a hub that is static HTML and
keeps working while the API is entirely down.

**The timeout asks a structural question, not a textual one.** The tempting
check is "if the container still says Loading, fall back". That matches TEXT
rather than a FACT, and this workstream has been bitten five separate times by
exactly that. So the mount point ships a sentinel element with its own id; the
players replace the container contents on success, which removes it. "Is the
sentinel still in the DOM" has a yes or no answer.

`public/frq-player.js` now rethrows after writing its message, so a caller can
tell a failed mount from a successful one. It previously swallowed, which is why
the page had no way to know. `lab-player.js` always rethrew, which meant
`lab.html` had a pre-existing unhandled rejection; both standalone pages now
catch explicitly.

`lib/live-body-guard.js` extends `contentLoss()` to every generator. It was only
ever wired into `page-body-csv.js`, the one generator involved in the
2026-08-22 `/pages/join` incident. Every other generator MERGEd over live pages
while checking the generated body only against itself. It also adds a
truncation check, because `contentLoss` inventories ids, functions and API paths
and is therefore thin on a simple page: a gutted practice page that kept its
mount id scored a single loss. A body more than 50% smaller than live is
refused.

`scripts/page-availability.js` asks the student's question rather than the
status code question: it checks the endpoint each page actually mounts from,
because `/api/health` can be happy while `/api/frq` is broken by one bad spec.
It also reports any mounting page with no fallback.

`docs/availability.md` is the runbook.

## Evidence

- `smoke/page-outage.js` pulls the real inline bootstrap out of a genuinely
  generated body and EXECUTES it in a DOM under each failure mode. 29 checks.
  Asserting the body merely CONTAINS a fallback would prove nothing, since a
  fallback that never fires is the bug.
- The happy-path assertion is the important one: a fallback that fired on a
  healthy API would replace every working practice question on the site with an
  outage notice.
- The live guard was tested against the real storefront on three bodies: a real
  regenerate (safe), a body truncated to half (lossy, 84% shrink), and a gutted
  body (lossy, 99% shrink plus a lost element id).
- 108 offline smoke suites pass.
- Before any of this, all six pages the sheets overwrite were confirmed
  byte-identical to what the generators produce, so nothing had been hand-edited
  in the Shopify admin and no content was at risk.

## One bug caught in my own test harness

The first outage test reported the happy path as failing. The cause was in the
test, not the page: it selected the bootstrap script for BOTH the definition and
the call, since both contain `APCSPageGo[`, so the mount never ran and the
sentinel timeout fired correctly. Worth recording because the instinct on a red
test is to change the product.

## Still open

- The sheets are generated but not imported. The two live DSA and lab pages
  still carry no fallback until they are, and `page-availability.js` reports
  exactly that today.
- The four ap-networking lab pages now change too. They previously produced
  byte-identical bodies and needed no re-import; they get the outage fallback,
  so they do now.
- `page-availability.js` is not wired into a schedule. The overnight sweep is
  the natural home.
