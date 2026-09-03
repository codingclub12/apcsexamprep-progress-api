# The live checks had gone blind, and they reported it as the site being broken

Date: 2026-09-03
Agent: Claude Code (session: CEO agent setup)
Boards: 170, and the Unit 1 terminal lab
Gate: `deploy-gates/2026-09-03-cyber-labs-and-blind-live-checks.json`

## What I was doing when I found it

Tanner imported two sheets and said "Imported". I probed the new Unit 1 lab page
and reported to myself that it was serving 8880 bytes with none of its content.
That was wrong. The page was 91KB and correct. My probe was the first of three
bad measurements in twenty minutes, and the second and third were in the repo
rather than in my shell.

## The defect, in the bytes

The storefront's bot management has inverted. It used to challenge scripted
clients, which is why every live verifier in this repo sends a browser
User-Agent; `scripts/verify-artifact.js` still carries the comment "user-agent
with error 1010. Every request from here carries a browser UA."

Measured, three pages, two rounds, deterministic:

    -H "User-Agent: Mozilla/5.0 (compatible; apcse-link-graph/1.0) Chrome/120"   403
    -H "User-Agent: Mozilla/5.0 (Macintosh; ... Chrome/120 Safari/537.36)"       403
    no User-Agent override, so curl sends curl/8.5.0                             200

Every verifier was carrying a workaround that had become the bug.

## Why that is worse than an outage

The 403 body is a 4.5KB "Verifying your connection" page. It contains none of
the strings a verifier looks for. So an assertion of the form "this string is
GONE now" passes on it, vacuously, and "this string is PRESENT now" fails. The
output is not a clean failure. It is a plausible partial regression.

What the repo's own instruments reported, on work that was live and correct:

    verify-cc-pacing-live.js         4 of 8 failed        truth: 8 of 8 pass
    verify-csp-applied-cards-live    17 pages serving     truth: all 17 serve
                                     0 of 6 questions,    their six questions
                                     17 cards missing     and carry their card
    verify-code-repair-live.js       could not read       truth: 25 of 25 agree
                                     any of 25 articles   with their answer keys

I checked all three against live by hand before believing any of them. An agent
that did not would have re-shipped seventeen pages that were already right, and
the sheet would have imported cleanly.

## The rule

A live check may not believe anything about a body until it has proved the body
is the page it asked for. `lib/storefront-fetch.js` is the one door: it sends no
User-Agent, and it refuses a response that is not a rendered storefront page.
The proof is a POSITIVE marker the challenge cannot fake, so a negative
assertion can never again pass because the fetch quietly failed.

Two markers, both required: `Shopify.theme` and `/cdn/shopifycloud/`. Three
occurrences each on every real page measured (home, a page template, a lab page,
a blog index), zero on the challenge. Both are required so that a theme upgrade
retiring one breaks the guard loudly instead of half-disabling it.

The status is checked separately from the shape, because Shopify renders its 404
through the theme: a missing page carries every marker a real one does.

## What this did NOT touch, and why that is safe

Twenty eight other scripts still send a browser User-Agent. They are not
repaired here. They are also not silently broken: the CSV generators reach the
page through `scripts/extract-live-body.js`, which throws "no rte wrapper on
this page" on the challenge body. Verified by feeding it the saved fixture. They
fail loudly rather than writing a Matrixify sheet from a challenge page, which
is the outcome that would actually have cost something.

The sweeps (`link-graph`, `site-crawl`, `empty-page-sweep`, `cyber-unit-sweep`)
will report the whole site as broken until they move onto the shared fetch.
Filed rather than fixed, because the change is mechanical and the audit trail
matters more than the speed.

## The other half: a lab shipped in two halves and only one landed

The Unit 1 terminal lab page was imported and is live and correct: right title,
and a mount div with id `apcs-lab-1-2-auth-lab`. The SPEC that fills that mount
was still sitting on a branch, so `/api/labs` answered 404 and a student opening
the page got a socket with no appliance in it.

Neither half is wrong on its own. The page is a valid page, the spec is a valid
spec, and every check on either side of the fence passed. What was broken was
the BINDING, and that is a sequencing error I made: I handed over a page sheet
whose backing spec was not yet deployed.

So the live check now asserts the binding directly, going through the same
transform `scripts/lab-pages-csv.js` used to write the mount id:

    the mount id on the LIVE page must equal apcs-lab-<item_id> for an
    item_id the LIVE API actually serves

## Two mutations the gate refused, and what each taught

**A branch that could not decide anything.** `looksReal()` tested for the
challenge title AND for the markers. Breaking the title test changed no verdict,
because the challenge page carries no markers either, so the marker test already
refused it. The gate reported the suite still green with the guard broken. The
branch was deleted rather than decorated, the same call as
`cyber-cc-extra-practice.js` on 2026-09-02. The title test survives in
`refusal()`, where it does real work: it turns "this is not a page" into "stop
sending a browser User-Agent", and a mutation now holds it to that.

**A guard that was real but was not the one I named.** I mutated the new lab's
points from 8 to 7 and expected the per-spec points assertion. The gate refused
it: the suite went red on `every spec in config/labs passes validation`, because
`lib/lab-spec.js` rejects the spec at load and it never reaches the per-spec
line. The guard doing the work is the loader's. The manifest now names it.

The same one-character edit is also required to turn the Python rederive red, by
a different route, which is the only reason to call it independent.

## Instruments that were wrong before they were right

Worth more than the repair list, because it is how the next builder avoids
spending a pass proving its own bug.

1. **My own first probe of the lab page** reported 8880 bytes and zero matches
   on a page that is 91KB and correct. I did not record which flags produced it.
   That is the lesson: an unreproducible measurement is not a measurement, and I
   nearly reported a working page as dead.
2. **The `-w` format got eaten by the shell.** Building a curl command as a
   string meant bash swallowed the backslash, so curl was handed `n%{http_code}`
   and emitted no status trailer at all. `execFileSync`, not a shell.
3. **Splitting the response on the last newline** read `</html>` as the status
   code, because a rendered page is full of newlines. The body now goes to a
   file and the status to stdout, so there is nothing to parse apart.
4. **A null byte sentinel** is rejected by `execFile`. Two cuts wasted on
   separating body from status before giving up on mixing them at all.
5. **A 12KB head of a real page** does not contain both markers; the second
   appears at byte 14659. The fixture had to be 20KB. A fixture trimmed by
   guess is a fixture that tests the trimming.

## Still with a human

- The two head-term redirects for board 158 did not take. `/pages/ap-csa` and
  `/pages/ap-csp` both still answer 200 and resolve to themselves, so the
  redirect never fires. Matrixify will have logged both rows as created and
  nothing changed. Unpublishing has to happen first, and choosing which hub
  survives is a judgement call.
- The permissions lab's Shopify page still reads "Topic 1.2" ten times. The
  spec's `page_title` moves with this deploy; the PAGE title is a Matrixify
  import and is not in this change. Its handle stays
  `ap-cyber-unit-1-lesson-2-terminal-lab` on purpose: renaming a live handle is
  a human action.
- The new Unit 1 lab's prose, questions and explanations are AUTHORED, not
  sourced. Nobody has taught from them. The spec header says so.

## The blocker this run ended on

The work is committed and pushed to `claude/ceo-agent-setup-sv4e61` at `07ee4f3`.
It is NOT merged and NOT deployed, because GitHub is unreachable from this
session:

    git ls-remote origin              works, the branch is pushed
    GET /repos/... with GH_TOKEN      403 "GitHub access is not enabled for
                                      this session. An org admin must connect
                                      the Claude GitHub App for this
                                      organization."
    the GitHub MCP tools              not present in this session at all

Earlier in the same session seven pull requests were opened and merged through
the MCP tools, so this changed mid-session rather than being how it started. A
run note on 2026-09-02 records a subagent claiming GitHub was impossible and my
correcting it; that correction was right at the time and is wrong now. Both
states are real and the tooling has to be checked rather than remembered.

Consequences, stated plainly rather than worked around:

- The `live` half of the gate CANNOT run. Nothing has deployed, so there is
  nothing new to observe. `--pre` passed; the gate is not satisfied.
- The Unit 1 lab page stays a socket with no appliance until this merges. The
  page is live and correct and its mount id is `apcs-lab-1-2-auth-lab`;
  `/api/labs/ap-cybersecurity/1.2-auth-lab` still answers 404.
- Pushing this to `main` directly would skip the ruleset that requires the
  offline suites, and that ruleset exists because a convention did not survive a
  busy afternoon. Not done.
