# AP Cyber Unit 1 navigator: 1.4 has been running 1.3's activities

Board 279. 2026-09-08, Claude Code.

## What I was handed, and what turned out to be true

A report on `/pages/ap-cybersecurity-unit-1-practice` and `/pages/ap-cyber-unit-1-exam`
naming three problems. Two of the three do not exist, the third is real and about
four times bigger than described, and there is a fourth nobody mentioned that is
worse than any of them.

**The Unit 1 exam key is fine.** Reported as 60% B, A=2 B=12 C=5 D=1, with five
consecutive B's. The live key is `BDBADABBDCBDCCADBCCA`: A:4 B:6 C:5 D:5, longest
run 2, worst self-similarity 37% against the repo's 55% limit, and `audit()` in
`tools/ap-cyber-ced/rebalance-exam-key.js` returns no problems. Re-derived a second
way out of the `fb-distractors` blocks, which explain every wrong option: on 16 of
20 questions exactly one letter is left unexplained and it is the keyed answer every
time, and on all 20 the keyed answer is never itself explained as a distractor. So
nothing is mis-keyed. The 4 that do not resolve are questions carrying fewer than
three distractor rationales, which is a content gap worth someone's time and is not
a key defect. Both handles were checked, `ap-cyber-unit-1-exam` and
`ap-cybersecurity-unit-1-exam`; they serve the same 72076 byte body.

Worth noting the Unit 3 gate merged three hours earlier says the same thing in its
`not_covered`: units 1, 2, 4 and 5 were audited on 09-01 and their keys are fine.
That was already written down.

**The exam page is not serving a stale theme.** It reports the same
`Shopify.theme` id as the practice hub, 163294281943, on the connected branch. Both
pages carry 14 AP Networking links, 9 Intro to Java, 9 Teacher Bundle, and both
carry both popup strings, so the "two contradictory pricing messages one click
apart" is one theme serving both pages identically. The "AP Exam MCQ Bootcamp Mar
25/26 announcement bar" is not an announcement bar: the only occurrence of the
string on either page is `frq-bootcamp` inside a skip list in a theme script.

**The 1.3 / 1.4 cross is real**, and so are the greyed-out steps.

## The census

28 Unit 1 pages carry the rail. 18 are correct. 10 are wrong, and the same 10
carry every defect below.

    1.3 / 1.4 crossed lesson tabs        20   across 10 pages
    step links pointing at the wrong page 71  across 10 pages
    steps greyed out as unbuilt           26  across 2 pages

I got the third number wrong twice before getting it right, and both mistakes are
instructive. The first regex matched `class="ucn-steps"` as well as
`class="ucn-step"`, so the containers counted as steps. The second fixed that and
then missed 12 disabled steps on `lesson-2-lab`, because that page writes
`opacity: 0.4` with spaces and the exam page writes `opacity:0.4` without. A check
written against one spelling reports the other page clean. That one is now a
mutation in the gate, because it is the shape of mistake that looks finished.

## The one nobody reported

Nine nav hrefs use a retired handle convention. Following each to where it actually
lands today:

    1.4 Ex 1 / Ex 2 / Lab / Quiz   ->  1.3's exercise, lab and quiz    on 8 pages
    1.2 Quiz                       ->  the 1.2 LESSON page             on 7 pages

So on eight pages, all four of 1.4's activities run 1.3's. A student who clicks
"1.4 Lab" does the 1.3 lab, and the attempt is recorded against 1.3's item ids, so
1.4 stays empty in the gradebook while the student is certain they did it. That is
worse than the crossed lesson tabs, which at least land on a lesson.

Classifying all 91 href changes by following the old target: **79 are real
misroutes, 12 are a retired handle that already redirects to the right page** and
is only being shortened by one hop.

## What shipped

`imports/2026-09-08/cyber-u1-nav-repair-pages.csv`, 10 rows, MERGE. Not imported;
that is a human action.

The target table is built from two sources authored independently: the five CED
topics from `config/cyber-topics.json`, and all 25 activity rows from a majority
vote of every self-consistent live rail. They agree on every row. Nothing here
retypes a handle, because retyping is how the site ended up teaching 3.3 under
3.4's title.

The rewrite changes three kinds of byte and no others: a lesson anchor href, a step
anchor href, and a disabled span becoming an anchor. Every byte outside the rail
comes out identical, proved by re-parsing the output rather than by the rewriter
saying so. The 10 pages keep their older rail generation; replacing it with the
newer one would change markup nobody has measured on pages that are otherwise fine.

## Two things I got wrong on the way

**The disagreement check was hollow, and a mutation caught it.** The first
`buildTable` picked its witnesses by agreement with the CED taxonomy and then
checked the survivors against that same taxonomy. Breaking the taxonomy on purpose
excluded every page and produced "no live page supplies a target" instead of a
disagreement: the CED could not be contradicted by the thing built to contradict
it. The live pages now vote with the CED nowhere near the eligibility rule, which
is why the 10 swapped pages get a vote and lose it 18 to 10.

**The sheet was built from the wrong source.** Generating it twice from the
rendered page produced two different files:

    data-cfemail="3f535550515a4c7f4c5c57505053115a5b4a"   first run
    data-cfemail="325e585d5c57417241515a5d5d5e1c575647"   second run

Cloudflare obfuscates addresses at render time and rerolls the XOR key per
response, so the rendered body is neither stable nor the body Shopify stores.
Importing it would have made that rewrite permanent and left a dead
`[email protected]` span where an address used to be, which
`lib/storefront-fetch.js` records happening to a quiz option on
`ap-cyber-unit-5-lesson-5`. The generator reads `/pages/<handle>.json` now, which
that module already names the preferred source for anything writing a body back.
Two live runs produce the same md5 and the sheet carries zero Cloudflare artefacts.

I only found it because I diffed a live-generated sheet against a fixture-generated
one on a hunch about a byte count. There is no guard in this repo that would have
stopped it, and there is one now: the generator refuses any row `cloudflareRewritten()`
flags, on the way out, after `pageBody()` has already refused on the way in.

## Evidence

    npm run smoke:cyberu1nav                        26 passed, 0 failed
    python3 scripts/cyber-u1-nav-rederive.py        17 passed, 0 failed
    node scripts/matrixify-preflight.js ... --carrying   clear to import
    node scripts/verify-cyber-u1-nav-live.js        1 passed, 5 failed   (live, expected)
    same command --from the repaired bodies         6 passed, 0 failed
    node scripts/deploy-gate.js ... --pre           suite, rederive, mutation

The Python re-derivation walks the `ucn-steps` containers where the JavaScript
slices between lesson anchors, parses the style attribute into properties instead
of regexing it, and reads the topic titles out of `CED-UNIT1-EXTRACT.txt` rather
than the taxonomy JSON. It arrives at the same 26, 2, 20 and 71.

Five mutations, each red by its own rule and no other. The generator produces a
byte-identical sheet from the fixtures and from live, md5
`1abe0ab1d2e0e9ed999335412d43d284`.

## Still open

- **The sheet needs importing.** After it lands, `verify-cyber-u1-nav-live.js` has
  to go 6/6 and the gate has to be re-run without `--pre`. It is not finished until
  that second run passes.
- **Units 2 to 5 were never looked at.** Only Unit 1 rails were read. The same
  three defects could sit in any of them and nothing here says otherwise.
- **`ap-cyber-unit-1-lesson-2-terminal-lab` is not a shell, and my first reading of
  it was wrong.** I measured a 4510 byte body and called it suspicious. It 301s to
  `ap-cyber-unit-4-lesson-3-terminal-lab`, so I was following a redirect and
  measuring a Unit 4 page. The handle was renamed on 2026-09-06 on Tanner's
  explicit instruction (commit de5b360), and the Unit 1 practice hub is one of the
  seven pages still naming the old one. It is already row 7 of
  `matrixify/cyber-lab-handle-repoint-pages.csv`, pending import, so there is
  nothing here for this branch to do. The rail never linked it either way.
- **Tooltip wording is inconsistent across the unit.** The 10 repaired pages carry
  the CED titles, the 18 correct ones carry site nicknames, so 1.3 reads "Public
  Wi-Fi Dangers" on most pages and "Best Practices for Public Networks" on the
  rest. Both point at the right page now. Picking one is a content call.
- **Five questions on the Unit 1 exam have no distractor rationale**: e4 (C),
  e8 (C), e12 (B), e18 (A and B).
- **Units 2 to 5 are not gated.** `ap-cyber-unit-2-exam`,
  `ap-cyber-unit-2-lesson-1-quiz`, `ap-cyber-unit-2-lesson-1-exercise-1` and
  `ap-cybersecurity-unit-2-practice` all answer 200 to an anonymous request,
  exactly as Unit 1 does. Unit 1 being free is deliberate and is the funnel; the
  other four resolving the same way is a pricing decision for Tanner, not a link
  fix, and it is worth a look before Cyber goes from $249 to $349.
