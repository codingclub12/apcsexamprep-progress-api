# Cyber 1.2: making the page say what it actually asks

Date: 2026-08-31
Agent: Claude Code (follow-on to the denominator gate, PR #411)

## Where this picks up

The grade on lesson 1.2 was fixed earlier today and is live: the reporter now
grades out of the blocks actually served, so a perfect paper returns 100 instead
of 90. Verified against the storefront, not GitHub.

That left the page itself still lying to the student. It serves nine questions
labelled "Q 2 of 10" through "Q 10 of 10" under a tracker reading "/ 10". After
the reporter fix those two things actively disagreed: a student answering
everything correctly saw **9 / 10 on the page and 100 percent in the gradebook**.
The fix made the grade right and made the page contradict it.

## There is no missing question

The obvious reading is that CFU 1 was lost and should be restored. It was not.
Running the new gate over every stored snapshot of the page:

```
before-ced-realignment   blocks=9  nums=2-10  denom=10
after-ced-realignment    blocks=9  nums=2-10  denom=10
after-ced-thin           blocks=9  nums=2-10  denom=10
live-after-import        blocks=9  nums=2-10  denom=10
live-after-thin          blocks=9  nums=2-10  denom=10
```

The oldest snapshot already has it. No CFU 1 exists in any recorded state, so
nothing was lost and there is no authored question to recover. Writing a tenth
would be new assessment content, which is a curriculum decision rather than a bug
fix. Nine is what this lesson has always asked. The only untrue thing is the 10.

## The repair that was written, tested, and thrown away

The tidy-looking fix is to renumber the blocks 1 through 9. That was built with a
smoke suite, and abandoned on the evidence. The id numbers are load bearing in
ways the markup does not advertise: SEVEN id families embed the question number,
and the page's own script rebuilds them at runtime.

```
getElementById('cfu-' + num + '-verdict')       cfu-N, cfu-N-{btn,feedback,opts,verdict,match}
getElementById('cr-'  + num + '-count')         cr-N-{count,text}
getElementById('seq-' + num + '-list')          seq-N-list, seq-N-item-{A..E}
querySelectorAll('[id^="dtb-blank-' + num)      dtb-N-bank, dtb-blank-N-X, dtb-chip-N-X
querySelectorAll('#cfu-' + num + '-match ...')  mr-N-M, ms-N-M
```

`dtb` puts the number SECOND (`dtb-blank-5-A`) while its bank puts it first
(`dtb-5-bank`). Miss one family or one position and a widget stops scoring on a
live lesson while the page still renders and every other question still works.

Sitting next to those and looking identical are numbers that must never move:

- `ucnToggle(1..5)` with `ucn-l1..5` / `ucn-s1..5` is the unit NAVIGATION,
  lessons 1.1 to 1.5, not questions
- `data-step-id` is the correct ORDER inside the sequence question
- `ek12-body` is a section, `data-lesson-id="1.2"` is the lesson
- `rgba(` appears 128 times and `repeat(` 8 more, all CSS carrying digits in
  parentheses

The first version of that transform had `ucnToggle` on its allowlist, on the
strength of the name and of sitting near the option markup. It rewrote the nav to
`1,1,2,3,4`: two entries firing the same handler and lesson 1.5 collapsed onto
1.4. Every CFU would still have worked. Nothing about that fails loudly.

## What shipped instead

**Display text only.** Twelve edits, no ids, no handlers.

`lib/cyber-cfu-relabel.js` rewrites the counter labels and the printed total, and
nothing else. `data-num` stays at 2 through 10, which is invisible, internally
consistent, and the thing renumbering would have broken.

The exact diff against the live 276KB body, in full:

```
- <span id="cfu-score-num">0 / 10        ->  0 / 9      (x2)
- <span class="cfu-counter">Q 2 of 10    ->  Q 1 of 9
  ... nine counters, 2-10 of 10          ->  1-9 of 9
- scoreNum.textContent = state.score + ' / 10';  ->  ' / 9';
```

Asserted byte-identical across the whole body: every `id`, every `data-num`,
every `onclick`, every `data-step-id`, and all 136 `rgba(`/`repeat(`.

### The gate learned the same lesson

`lib/cyber-denominator-gate.js` used to demand contiguous `data-num`, which would
have demanded exactly the dangerous repair. It now reads what the STUDENT reads:

- new `cfu-counter-mismatch` (P1): the "Q n of N" labels do not cover the
  questions served, or advertise a total the page does not have. Student visible.
- `cfu-numbering-gap` is now diagnostic only, and fires ONLY when the display is
  already wrong, where it names the question to go looking for. A page whose
  labels read 1..N of N is honest, and an internal `data-num` gap behind it is
  not a defect.
- `cfu-denominator-mismatch` (P0) is unchanged. It is the grade.

## Evidence

- Relabel applied to the real 276KB body: gate goes
  `[cfu-denominator-mismatch, cfu-counter-mismatch, cfu-numbering-gap]` -> **CLEAN**.
- Full diff is **12 fragments**, all display text, listed above and nothing else.
- Repo pre-import gates on the output all pass: nothing unhidden, tags balanced,
  scripts compile, no new non-ASCII, answer keys unchanged.
- `smoke/cyber-cfu-relabel.js`, 14 assertions, most of them pinning what must NOT
  change: every id family, every handler, the nav, the step order, the CSS.
- `smoke/cyber-denominator-gate.js` extended to 19, including that a `data-num`
  gap is silent once the labels read 1..N of N, and still reported when they do not.
- The generator refuses on a bad output: verified by sabotage (breaking a script
  in the source makes it exit 1 and write nothing).
- Full CI-derived offline suite: **144 suites, all passed.**

## The sheet

`imports/2026-08-31/cyber-1-2-question-labels.csv`, one MERGE row, 278KB.
Generated by `node scripts/cyber-cfu-relabel-csv.js <handle> <out.csv>`.

**Not imported.** Per the repo convention a sheet is generated, read, and
imported once by a human. Import it in MERGE mode and re-run the gate against the
live page afterwards; a stale read inside the ~64 minute edge cache tail is not a
failed write.

## Still open

- Board task 141, the theme deploy recipe: the connected branch is 40 commits
  ahead of `main`, so the documented fast-forward would rewind the live theme.
  Untouched here.
- The 10 cyber columns with no authored denominator, in
  `docs/cyber-denominator-gaps.md`.
- Board task 142 (Railway drift) resolved itself when PR #411 merged: the API now
  serves `ab5e3ac` and is 0 commits behind `main`. Owned by Tanner, left for him
  to close.
