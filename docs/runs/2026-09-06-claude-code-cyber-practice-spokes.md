# The practice spokes called the unit exam "the full unit test", and it is not

2026-09-06. Board 253. Started as three questions from Tanner about
`/pages/ap-cybersecurity-unit-1-practice`: should a unit test be on a practice
page, why is the page not styled, and is the linking any good otherwise.

The third answer is the short one. The linking is fine. All 35 internal links on
the Unit 1 page answer 200, the asset list matches `config/cyber-practice-hubs.json`
exactly, and the page is reachable from the practice umbrella and from the unit
study page. Nothing there needed fixing. The other two did.

## 1. The unit exam is a different instrument, and the page said the opposite

Tanner's rule was that a unit test does not belong on a practice page unless it
is different from the one the course uses, and if it is, the page has to say so.
It is different, and this was already established twice:

    docs/cyber-unit1-bundle-vs-online.md    paper Unit 1 Test 22 MCQ + 3 FRQ
                                            online 20 MCQ, 0 shared items, 0.24
    docs/cyber-unit-tests-availability.md   same result for units 2 to 5

Re-measured today against the third instrument nobody had compared it to, the
five server-side lesson quizzes in `seed/cyber-unit-1-web-quizzes.js`: zero exact
stems and highest token overlap 0.15, which is shared vocabulary rather than a
shared item. The closest pair is the exam's evil twin question against the 1.3
quiz's war driving question, and they are not the same question.

So the exam earns its place. What the card said was:

    Unit exam
    The full unit test, once you have done the rest.

That is false in the direction that costs a teacher. A student who reads it
believes they have just seen the test they are about to sit, and the whole reason
the online and paper instruments were kept disjoint was so that could not happen.
The card now names it a unit practice exam and says in one sentence that these
are not the questions on the graded test.

It also says the exam tells you the answer as soon as you check one, because it
does. Units 1 and 2 carry `ANSWERS = {"e1":"B", ...}` in the page body. Units 4
and 5 pass the letter and the rationale as arguments to `checkMCQ()` on every
option. Unit 3 passes a correctness flag as the fourth argument of
`qzu3exam(this,n,idx,correct)`. Whatever those pages are, they are not something
to sit under exam conditions, and a student should not have to read the source to
find that out.

**What this does NOT settle.** Board 228 noindexed all five exams on the reasoning
that CLAUDE.md's tier 3 wants unit tests gated and premium. Noindex landed:
`ap-cyber-unit-1-exam` serves `<meta name="robots" content="noindex,nofollow">`
today. But the practice spoke is indexed and links straight to it, and the spoke's
own meta description ends "Free and auto-scored". Whether these five exams are
public practice or premium assessment is a positioning decision, not a patch, and
this pass deliberately did not make it. Labelling them honestly is right under
either answer.

## 2. "Not styled at all" has a mechanism, and it is one line of theme CSS

The pages are not unstyled. They carry their own stylesheet and it is written in
`rem`. The theme sets

    html { font-size: calc(var(--font-body-scale) * 62.5%) }

so a rem on this storefront is about ten pixels, not sixteen. Every size in that
body rendered at roughly 62.5% of what it asked for. The clearest symptom is the
lede: it asked for `1.05rem` and got 10.5px, while the paragraph directly under it
had no `font-size` at all and inherited the container's 16px, so the page's
summary line rendered smaller than the body text below it. Nothing about the CSS
looks wrong. It is valid, it parses, it serves, and it is only wrong by a factor
the stylesheet never mentions.

The second half is that the spokes were in a different design system from the
course. Measured on the live bodies: `ucnav`, the purple unit rail every cyber
page carries, appears 29 times on `ap-cyber-unit-1-exam` and 52 times on a lesson
quiz, and zero times on any of the five spokes. So did the Georgia stack and the
gradient hero. A student clicking from the unit study page to its practice page
landed somewhere that did not look like the same course, and because the content
ended above the fold, the largest thing on the page was the theme's contact form.

The rebuilt body takes its tokens from the live exam body rather than inventing a
sixth opinion about what purple means: the gradient, the badge, Georgia, `#1E1B4B`
on `#F5F0FF` over `#DDD6FE`, `#6b21a8` for links. Every length is px. The `#ucnav`
rail is deliberately not reproduced, because it is inlined per page with its own
script and a hand-copied sixth instance would be a maintenance debt with no owner.

## 3. Two more things the audit turned up

**The only structured data on these pages named the wrong course.** The theme
emits one `BreadcrumbList` into every page head and its second item is hardcoded:

    Home                    -> https://apcsexamprep.com/
    AP Computer Science A   -> https://apcsexamprep.com/pages/ap-csa-exam-prep
    <this page>

Every real cyber page answers that with a correct `BreadcrumbList` in its body.
The five spokes carried none, so on an AP Cybersecurity practice page the CSA
claim stood unopposed. The spokes now emit the same block the exam pages do. This
does not fix the theme tag, which is theme work and belongs with board 148.

**The outline was upside down.** h1, then eight h3 cards, then the page's only h2
at the very bottom. Now h1 then h2s.

**A label read as a slug.** `Unit 1 frq practice`. The label builder ran its caps
pass only on the branch that handles lesson-page handles, so FRQ, scenario, exam
and project labels came out raw. Fixed in the caps set rather than by special
casing the one string.

## Evidence

    parse-back     5 rows, MERGE, Body HTML only, clean
    preflight      clear to import
    mutation       13 of 13 red in the suite, each by the rule that claims it
    rederive       82 checks, Python, no shared code with the generator
    live (pre)     36 of 41 assertions fail, exactly the ones the import flips
    offline suite  205 of 206 green; csakitstyle needs python-pptx, absent here
                   and absent before this branch
    deploy gate    --pre passes on three kinds: suite, rederive, mutation

`deploy-gates/2026-09-06-cyber-practice-spokes.json`. The live check in it is
deferred until the IMPORT rather than until the deploy, and that distinction is
written into the manifest: merging ships a generator, a checker, a suite, a
verifier and a CSV to Railway, none of which is on the server render path. The
pages change when the sheet is imported.

The rederive is a second implementation in Python with its own CSV reader and no
import of the generator or the JS spec. Proved not hollow by mutating the SHEET
itself five ways, unmark the exam card, put a rem back, restore the false claim,
name the CSA hub, drop a link; all five go red.

`imports/2026-09-06/cyber-practice-restyle-pages.csv` is generated, preflighted
and not imported. Importing is Tanner's, once, in MERGE mode. Then
`node scripts/verify-cyber-practice-spokes-live.js` has to go green; it exits 1
today and that red run is the pre-check.

### The mutation run found two things, and one of them was mine

The check that the exam card is marked apart was written as
`next.includes('grp--exam')`. The stylesheet at the top of every one of these
bodies defines `.grp--exam`, so the check could not fail while the CSS was
present. Stripping the modifier off the div left the suite green. It tests the
class attribute now. That is the fourth hollow guard this repo has caught by
mutation and the first one caught in the same hour it was written.

The other was a link-loss mutation that also tripped the coverage rule, because
it removed an asset chip. A mutation that fires two rules cannot tell you which
one is doing the work, so it removes a "Keep going" link instead.

### The gate refused twice before it passed, and both refusals were right

The first run failed all six mutation checks with "the suite went red, but NOT
for" the assertion each one named. That is the guard-subsumption test doing its
job: I had written the `expect_failure` strings from the suite's PASS message
rather than from its red output, so every mutation was going red for a real
reason and none of them proved the rule it aimed at.

The sixth was a different and better catch: "the suite still PASSED with the
guard broken, so it does not test it." The inert-mutation guard I had just added
to the sibling suite was a bare `if` inside the mutation loop, and every case in
that loop does mutate, so the branch never ran and deleting it changed no
verdict. A guard no test can reach is decoration however true it is. It is a
named `didMutate` now, asserted in both directions, which is what makes it
breakable and therefore worth having.

### And the new heading broke four mutations in the sibling suite

`smoke/cyber-practice-hub.js` spliced four of its sixteen mutations against the
literal string `<h2>Keep going</h2>`. Adding a class to that heading made all
four replacements match nothing, and the suite reported four rules as MISSED with
"nothing fired". The rules were fine. The mutations had quietly stopped being
mutations, and the message pointed at the wrong half of the repo.

The anchor is a regex that survives an attribute now, and the loop refuses a case
that changed no bytes, reporting it as INERT rather than as a missed rule. Proved
by breaking the anchor on purpose: four INERT lines and a named failure, instead
of four rules looking hollow.

## What is still open

- **The sheet is not imported.** One import, MERGE mode, Body HTML only, so no
  Title or SEO column is touched.
- **Whether the unit exams are public practice or premium.** Section 1. Board 228
  noindexed them; nothing has decided what they are.
- **The Unit 3 exam key is still guessable.** Answering B twenty times scores
  16/20 and there is no D anywhere in the key.
  `docs/cyber-unit-tests-availability.md` found it on 2026-09-01 and it is
  unchanged on the body served today. Out of scope here, still true.
- **The theme's head breadcrumb still says AP Computer Science A on every page**
  of every course. Board 148 owns the neighbouring liquid problem.
- **The exam pages carry em-dashes** in their own hero copy ("Unit 4 &mdash;
  Securing Devices"). Not touched: those are page bodies this package does not
  own, and rewriting them is its own sheet.

## What I could not measure

Whether the restyle helps. The spokes went live on 2026-09-04, board 227 is
already watching them for practice-keyword cannibalisation, and there is no
baseline to compare a look against. The claims here are about what the pages say
and how they are built, which is a different question from whether they work.
