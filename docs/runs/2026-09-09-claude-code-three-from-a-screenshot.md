# Three reports off one gradebook screenshot, and only one of them was what it looked like

**Board:** 289. Tanner, 2026-09-09, with two phone screenshots: "29% not 7/24. I
also have students able to retry assignments as many times as they want. 1.2
terminal lab is not correct and should move to unit 4."

Three sentences, three unrelated causes. One is a missing row, one is a control
that was never wired up, and one is a fix that was built days ago and never
imported.

## 1. "29% not 7/24"

`'1.3|lab'` was in NEITHER table in `scripts/seed-cyber-denominators.js`. Not
priced, and not parked in `MEASURED_UNPRICEABLE` with a blocker either. Just
absent.

An unpriced column keeps its percent, gets the provisional marker, and is left
OUT of the points total. So his 1.3 row read `12/53` with the lab excluded while
the unit percentage above it counted the lab in. Every other cell in that row
showed a pair.

The number came from the page, which is the rule this seeder states about every
value it holds: `/pages/ap-cyber-unit-1-lesson-3-lab` carries
`<span id="labTotal">0</span> / 24 pts` in its `#labDone` panel. Same shape and
same number as `'1.4|lab'`, whose comment already reads "labTotal sums all parts,
rendered / 24 pts". 29 percent of 24 is 6.96, which rounds to the 7 he expected.

**The guard was asserting the bug.** `smoke/cyber-denominators.js` pinned lesson
1.3 at THREE priced columns, so the missing lab was not merely uncaught, it was
required. The comment ten lines above it describes this exact failure about 1.1
lab: "in NEITHER table, which is the quietest way for a column to go missing".
A bare count of what was authored on the day cannot tell "all of them" from "all
the ones we happened to write down". It names the four columns now, and the
mutation that proves it swaps the lab for a different 1.3 column so the count
stays at four while the lab is gone.

## 2. "students able to retry assignments as many times as they want"

Not a bug in the retry engine. The four toggles he is looking at do not do
anything to students.

`shopify/cyber-dashboard.html` renders "Retry until mastery, by assignment type"
with switches for Lesson CFUs, Exercises, Quizzes and Unit tests, tagged
`SAVING SOON`. `bindRetry` writes them to `S.state.retryTypes` and calls
`renderAll()`. Nothing else reads them. There is no request. Grep the whole page
for the retry endpoint and there is no hit: `setStuRetry` still carries a
`/* TODO PATCH .../students/:id retry_modes */`.

What makes this worse than an inert control is that it is not inert. Those
toggles feed `retryOn()`, which feeds the grade the page DISPLAYS. Turn Quizzes
off and the numbers move, because the view recomputes on first-attempt instead of
best-attempt. A teacher gets exactly the feedback they would expect from a
setting that saved, and nothing about what students can do has changed. Same
shape as the padlock that read open while the student was refused.

The real control is `classes.retry_mode`, and it is not per type. Three modes,
in `retry-policy.js`: `all` (retries on everything), `practice` (practice
redoable, quiz and exam one shot) and `none`. His class is evidently on `all`:
the screenshot shows a quiz at `4/5 3x`, and under `practice` the quiz route
refuses the retake.

    PATCH /api/teacher/classes/<CODE>/retry   {"retry_mode":"practice"}

That is the whole lever, and it is one call. **Nothing in this branch changes his
class**, because a class's grading policy mid-course is his to set and I have no
teacher credential here.

**The open decision, and it is his.** The panel promises per-type retry, which
the server does not have. Two ways out and they are different sizes:

- wire the panel to the three modes it can nearly express (all four on = `all`,
  CFUs and Exercises on with Quizzes and Unit tests off = `practice`, all off =
  `none`), and refuse the combinations that are not a mode. Small, honest, and
  it makes the switches real today.
- build per-type retry for real. A column, a resolver change, and the panel
  works as drawn.

Either way the `SAVING SOON` tag comes off, because a control that silently
moves the displayed grade should not be shipped as a preview. I did not pick;
the first is a day, the second is a feature.

## 3. "1.2 terminal lab is not correct and should move to unit 4"

The spec has been right the whole time. `config/labs/ap-cybersecurity-1.2-lab.json`
has said `unit-4` / `4.3` since its first commit, so the manifest row, the
gradebook column and `/api/labs` all file it at 4.3 already. I went looking for a
stale manifest row and there is none; that hypothesis was wrong and the file
history settled it in one read.

What is wrong is every surface that LINKS it, and the item id it kept.

The handle moved on 2026-09-06 with `redirectNewHandle:true`, so the old URL
301s and nothing is broken. `scripts/gen-cyber-lab-handle-repoint.js` built a
sheet for the seven pages that still name the old handle. **That sheet was never
imported.** Measured today, all seven still point at
`ap-cyber-unit-1-lesson-2-terminal-lab`, and `ap-cybersecurity-practice` still
carries a card reading `<span class="ph-card-focus">Unit 1</span>` over "Find the
tournament code".

**But the sheet as it stood would not have fixed what he reported.** A repoint
corrects the URL and leaves the lab exactly where it is filed, and the filing is
the complaint. Two surfaces file it under Topic 1.2 and would have gone on doing
so:

    cyber-command-center              STU map: "1.2":{ ..., termlab:"/pages/..." }
    ap-cybersecurity-unit-1-practice  <li>Lesson 2 terminal lab</li>, in a list of Unit 1 labs

So the generator does the move as well now. The `termlab` entry lifts off `"1.2"`
and lands on `"4.3"`, which already existed and had no lab of its own, and the
chip comes out of the Unit 1 list rather than being relabelled, because a Unit 1
practice page listing a Unit 4 lab is wrong whichever URL it points at.

One sheet, not two, and that is deliberate: Matrixify MERGE replaces the whole
body, so a second sheet built before the first was imported would silently undo
it.

## Evidence

- `smoke:cyberdenoms` 76 of 76, up from 74. `smoke:myprogress` 31 of 31,
  `smoke:denomsafety` 11 of 11, `smoke:contract` 49 of 49, `smoke:gradebook`
  58 of 58, and the other ten denominator suites green.
- `deploy-gates/2026-09-09-cyber-13-lab-denominator.json` passes `--pre`: three
  suites and three mutations, each mutation tripping its own assertion. The live
  check is deferred and asserts `total=96 would_add=0` from `/api/health`, which
  read `total=95` this morning.
- The sheet was regenerated from current live bodies and every change it makes
  was enumerated rather than sampled: ten edits across seven pages, every one of
  them a 1.2-to-4.3 or Unit-1-to-Unit-4 correction and nothing else.
- `matrixify-preflight --expect-command MERGE --carrying <originals>`: clear to
  import, 69 emoji carried through and none added.
- The generator now checks its own output before writing, and that caught my
  first attempt at stating the rule: I wrote "every page names the new handle"
  and it failed on the Unit 1 page, which by design ends up naming neither
  because its link is removed rather than repointed.

## What I got wrong on the way

Three things, all worth writing down because all three looked like findings.

**The stale manifest row that never existed.** I read
`retypeTerminalLabManifest`, saw it says in as many words that it does not touch
`lesson_id` or `unit`, and concluded the 1.2 lab's manifest row had been left
behind at Unit 1 when the spec moved. It reads exactly like a bug. Then I looked
at the spec's history: it has said `unit-4` since the first commit, so there was
never a move for the migration to miss. The comment was describing a real
limitation of a migration that had nothing to do with this lab.

**A live assertion that failed on a deploy that had worked.** The gate's live
check asserted `would_add=0` from `/api/health`, and the deploy came back
`total=96 changed=1 would_add=1`. `seedCyberDenominators` computes `wouldAdd`
BEFORE it inserts and returns it unchanged, so on the very boot that adds a row
it necessarily reads 1 and only reaches 0 on the NEXT boot. I had read a
pre-insert snapshot as post-state. `changed` is the field that says a row reached
the volume, and the assertion is pinned to it now. The gate caught this on the
one assertion nobody had run yet, which is the argument for the second run
existing at all: a deferred live check that never runs is decoration.

**A sheet that disagreed with my re-derivation, twice.** The parse-back diff on
`ap-cybersecurity-practice` came back DIFFER, and both times it was my copy of
the rules that was short: the generator also corrects the blurb and the card meta
line, not only the focus label. Enumerating every difference between live and
sheet is what settled it, and that is the better check anyway. Chasing a
generator's rules one at a time is how you talk yourself into believing a correct
sheet is wrong.

## Still open

- ~~The sheet needs a human to import it.~~ **Imported 2026-09-09**, and
  verified against the bytes Shopify stored rather than against the sheet. All
  fourteen assertions pass: no page names the old handle, the Command Center's
  STU map carries the lab under `"4.3"` and no longer under `"1.2"`, the Unit 1
  chip is gone while the four real Unit 1 labs remain, and the practice card
  reads Unit 4 with nothing on the page still saying Topic 1.2. The old URL still
  answers 200 and canonicals to the Unit 4 handle, so existing bookmarks and
  anything a student wrote down still work.

  Six of the seven stored bodies are byte-identical to the sheet. The seventh
  differs by ONE character: a non-breaking space between two nav anchors on
  `ap-cybersecurity-complete-course-guide` came back as a normal space. That is
  Shopify normalising on import, the same documented class as the entity
  decoding on `my-progress`, and the nbsp was in the live body before the sheet
  was built, so the sheet did not introduce it. Cosmetic: it allows a line wrap
  between two links where one was previously prevented. Not worth an import
  cycle to restore, and recorded here so the next regeneration is not surprised
  to find the live body one character off.
- **The denominator half IS live.** `ae51060` deployed and the boot seed wrote
  the row: `cyber_denominators total=96 changed=1`. The gate passes with three
  kinds agreeing. The 1.3 Lab cell should read points now rather than `29%*`.
- **The retry panel is a decision, above.** Nothing shipped for it.
- **The item id is still `1.2-lab`.** Deliberately.
  `scripts/gen-cyber-lab-topic-retarget.js` records why: changing it is a data
  change that would orphan every attempt already recorded against it. It shows
  in `/api/labs` and in the `/lab/ap-cybersecurity/1.2-lab` player URL, and
  nowhere a student or teacher reads a topic number.
- **1.2's Lesson cell reads `20%*`** in the same screenshot, for the same reason
  the lab did: no authored total for the lesson-score carrier on that lesson. Not
  reported, not fixed, and it needs the same treatment: read the page, price it
  or park it with a blocker.
- I cannot verify my own work. 289 goes to `needs_verification`.
