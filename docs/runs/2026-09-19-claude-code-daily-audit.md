# Daily site audit, 2026-09-19

Read-only routine: crawl and report, no board tasks, no imports.

## What ran

`.github/workflows/site-audit.yml` had not produced a run for today at session
start (last completed run was #26, 2026-09-18, shard 3/7; nothing queued or
in-progress). So this session ran the crawl locally, exactly as instructed:
`node scripts/site-crawl.js --out /tmp/today.json --budget 400 --max-minutes 30`,
no `--previous` (no local baseline file existed to pass one).

Shard 4/7. Crawled 324 of 2122 sitemap URLs in 797s across 601 requests.
API build `d454c9c`, confirmed current against `origin/main` after
`git fetch origin main` (no stale-deploy gap). Exit 0: no P0-triggered abort,
`aborted: null`, `truncated: null`, so this is a usable run on its own terms,
though it did not get GitHub's cached hot-set continuity since it ran outside
the workflow.

## Is anything on fire

Yes. One page is actively serving broken graded content.

## P0 (3 findings, 1 page, confirmed live)

All three are on `https://www.apcsexamprep.com/pages/ap-cyber-unit-1-lesson-1-lab`
(`#cyber-lab-11`), and they are the same failure class as the 2026-09-03
incident that cost 27 of 32 students in CYBER-T5KR their lab score
(`docs/runs/2026-09-03-claude-code-cyber-lab11-palette.md`, board #202):
white text painted on a `var()` background that does not resolve, so the
background declaration drops entirely and the element goes invisible.

- `.score-bar .score-num` reads `var(--purple)`
- `.check-btn` reads `var(--purple)`
- `.rubric-table th` reads `var(--dark)`

**This is not a new instance of the bug class. It is the September 3 fix,
gone.** That fix inserted one rule declaring ten custom properties on
`#cyber-lab-11`. Fetched live today: that declaration block does not exist
anywhere on the page. `--purple` and `--dark` are referenced 7 times each and
defined nowhere.

I ran the live verifier built for that fix, `scripts/verify-cyber-lab11-palette-live.js`,
against production. It failed 15 of 16 assertions, and the failures go past
CSS:

```
FAIL every custom property the page reads is defined on the page
       still unresolvable: --dark --gray-border --gray-light --green-bg
       --green-border --purple --purple-bg --purple-border --purple-light
       --purple-mid
FAIL all four email specimens survived the import
       found 0
FAIL the check and continue buttons are still in the markup
       found 1
ok    the gradebook lesson id is intact
```

The live page also carries two conflicting H1s: Shopify's own page-title
element renders "AP Cybersecurity 1.1 Lab: Tactic and Impact Analysis" (the
page's Title field), while the body's own first heading still reads "Lab:
Phishing Email Dissection". The widget's header comment is unchanged
("Purple theme matching course hub + all lesson pages," "Unique wrapper:
#cyber-lab-11"), but the four phishing email specimens the lab is built
around are gone (`email-specimen` class: 1 occurrence, should be ~4; "Check
Email #N" phrase: 0 occurrences).

I asked a subagent to check both repos' history for a documented redesign of
this page under a "Tactic and Impact Analysis" framing, since that would
change the read from regression to in-progress migration. It found none:
zero matches for that phrase or for `cyber-lab-11` in any commit, PR, or run
note after the 9/3 fix, in either repo, on either branch. `config/cyber-topics.json`
still lists Topic 1.1 under its original title and a different handle
entirely.

What it did find: progress-api PR #371 (2026-08-27, merged) reframed the
Topic 1.1 *lesson* content around a "tactic and impact" model, and that PR's
own "Still open" section flagged a companion lab sheet, WO-2, as "unimported"
and built in a gitignored `out/` directory, so it was never committed, never
run through `validate_csv.py` / `verify_import.py`, and no later run note
records it landing. The most likely mechanism, consistent with every symptom
at once (old CSS back, specimens mostly gone, two H1s, check-btn markup
partially intact): that stale, never-validated sheet (or an equivalent ad hoc
edit toward the same reframing) got imported at some point after 2026-09-03
without being regenerated first, exactly the failure `CONVENTIONS.md` already
warns about with a sheet that goes stale before it is used. This is a
hypothesis from git history, not a confirmed mechanism; nothing here reaches
the Shopify Admin API to check the page's actual revision history.

**This is reporting only, per today's routine scope.** No board task filed,
nothing imported, nothing fixed. Pushed a proactive notification given the
severity (graded content, not just cosmetic) rather than waiting for this
note. Recommend: rebuild the lab sheet fresh against the current live body
(never the stale `out/` copy), reapply the 9/3 palette fix inside it, and
import once, verified before and after with `verify-cyber-lab11-palette-live.js`.

## New since last night

No true delta: this run had no `--previous` baseline (ran outside the
workflow, no cached previous-crawl.json available locally), so "new" cannot
be computed mechanically. Qualitatively, against 2026-09-18's GitHub Actions
run (shard 3/7, 3 P0 / 244 P1 / 410 P2 / 35 P3, 400 of 2113 URLs): today's
shard (4/7) covers a different roughly-one-seventh of the site, so P1-P3
totals are not comparable page-for-page, matching the same shard-noise
pattern documented on 2026-09-06. Whether yesterday's 3 P0 were these same 3
or a different 3 cannot be determined without the artifact; shard rotation
means this page is only body-checked once every ~7 nights unless it is in
the crawler's hot set (it is not: not a course hub/command center, not one of
`grade-path-audit.js`'s SAMPLES). So this regression's actual start date is
unknown and could predate today by more than a week.

## Resolved (tentative, not confirmed)

The 21-day-old standing P0 (`ap-cyber-unit-1-frq-practice`, reporter-missing,
first seen 2026-08-29) produced zero findings today, and this page was in
today's shard. But the reason is not "a reporter got added": the live page
now carries zero `data-item-id` attributes at all, so the check
(`reporter-missing` fires only when `data-item-id` widgets are present)
no longer has anything to flag. The page still has substantial score/quiz
related text. Whether this is a genuine fix, a restructure to an ungraded
format, or another partial content change deserves a direct look; not
verified further this pass, per scope (no fixing, no filing).

## P1 (44 findings this shard)

Same standing bucket as every prior night: pages advertising the expired
2025-2026 school year (41 of 44 today's shard instances). Root cause and fix
path unchanged from 2026-08-26 (body sheet, out of scope for a metadata-only
pass).

## P2 / P3 (249 / 92 findings this shard)

Same standing kinds as prior audits: duplicate H1 from the shared
contact-section template, meta descriptions that are scraped page furniture,
titles long enough to be truncated in search results, and one probable
duplicate-content pair worth flagging rather than patching:
`/blogs/ap-csa-daily-practice/unit-4-cycle-2-day-18-arraylist-autoboxing` and
`/blogs/ap-csa-daily-practice/unit4-cycle2-day-18-arraylist-autoboxing` share
a title and, going by the URL slugs, are likely the same post under two
handles. A metadata-only fix (retitling one) would mask a structural
duplicate-content question (which handle is canonical, whether the other
should redirect) that this routine is not positioned to decide unilaterally,
so no `seed/seo-rewrites.js` row was added for it this pass.

## Standing findings, otherwise unchanged from the 2026-08-26 baseline

- `h1-duplicate` on the shared contact-section template, still present
  (e.g. the homepage itself, in today's shard). Pending the theme edit.
- `h1-is-title` still present on template pages that do not suppress the
  default page-title element. Needs a body sheet.
- `robots.txt` remains fixed (theme `90c36ea`, 2026-09-02); not rechecked
  today, no report suggests regression.
- The eight competing AP Cybersecurity overview URLs are still blocked on
  Search Console being connected.

## Deeper pass this rotation: external check, College Board and competitors

Storefront checks were kept to what the crawl and the two live verifications
above already needed, to avoid a second full drive of the site in one
morning. Instead this rotation went external:

- Re-checked AP Cybersecurity and AP Networking status against College
  Board's own current public pages. Nothing in either repo's CED snapshot is
  stale: nationwide launch for AP Cybersecurity fall 2026, first exam May 5,
  2027; AP Networking's 2026-27 pilot is restricted to schools that already
  ran a prior AP Networking or AP Cybersecurity pilot, full launch 2027-28,
  first exam May 7, 2027, Session 2. Matches `docs/ced-snapshot/` and this
  file's own numbers; no drift.
- Competitor scan: JuiceMind, CodeHS, and UTeach remain the named AP
  Cybersecurity curriculum competitors. One third-party page (JuiceMind's own
  comparison post) describes this site as having "Units 1-3 currently live"
  for its practice exam; worth a human glance to confirm that description is
  still accurate, but it is a competitor's characterization, not this site's
  own claim, so not actioned here.

## Morning report review (`npm run morning`)

Could not run: no `ADMIN_READ_KEY` on this environment, as expected and
already documented. Per repo convention, not raising this again beyond this
one line.

## Metadata fixes this pass

None. The one candidate (`seed/seo-rewrites.js` row for the duplicate CSA
Unit 4 Day 18 title) was judged to need a human decision on canonical handle
first; see P2/P3 above. No sheet generated, no draft PR against the theme
repo for metadata.

## What is still open

- **The cyber-lab-11 regression, described above under P0.** This is the one
  item from today that needs a person, soon: it is graded content that is
  currently either invisible or missing for any student who opens the page.
- The stale-year P1 bucket, the shared-template H1 duplication, and the
  Search-Console-gated overview URLs: all unchanged, same blockers as every
  prior audit.
- Whether the `ap-cyber-unit-1-frq-practice` reporter-missing resolution is a
  real fix or a restructure: not confirmed this pass.
- The CSA Unit 4 Day 18 duplicate-title/duplicate-handle pair: flagged, not
  fixed, needs a canonical-handle decision.

## Artifact

This run note. `/tmp/today.json` and `/tmp/crawl-report.txt` are local to this
session's container and will not survive it; nothing else from today's crawl
was committed, per scope. The live-verifier output quoted above
(`scripts/verify-cyber-lab11-palette-live.js` against production, 2026-09-19)
is the evidence for the P0 claim and can be reproduced by anyone with network
access to the storefront by re-running that script.
