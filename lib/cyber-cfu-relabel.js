'use strict';
// -----------------------------------------------------------------------------
//  MAKE A CFU SHELL TELL THE STUDENT THE TRUTH
//
//  The repair half of lib/cyber-denominator-gate.js, and deliberately the
//  smallest one that works. It rewrites what the page SAYS: the per-question
//  counters and the printed total. It touches no id, no data-num, no handler.
//
//  ── WHY DISPLAY ONLY, WHEN RENUMBERING LOOKS TIDIER ─────────────────────────
//  On ap-cybersecurity-unit-1-password-attacks (lesson 1.2) the blocks carry
//  data-num 2 through 10 under a printed total of 10. The tidy-looking repair is
//  to renumber the blocks 1 through 9. That repair was written, tested, and
//  thrown away, because the id numbers are load bearing in ways the markup does
//  not advertise. SEVEN id families embed the question number, and the page's
//  own script rebuilds them at runtime:
//
//      getElementById('cfu-' + num + '-verdict')      cfu-N, cfu-N-{btn,feedback,opts,verdict,match}
//      getElementById('cr-'  + num + '-count')        cr-N-{count,text}
//      getElementById('seq-' + num + '-list')         seq-N-list, seq-N-item-{A..E}
//      querySelectorAll('[id^="dtb-blank-' + num)     dtb-N-bank, dtb-blank-N-X, dtb-chip-N-X
//      querySelectorAll('#cfu-' + num + '-match ...') mr-N-M, ms-N-M
//
//  Note dtb puts the question number SECOND (`dtb-blank-5-A`) while its bank
//  puts it first (`dtb-5-bank`). Miss one family, or one position, and a widget
//  stops scoring on a live lesson while the page still renders and every other
//  question still works. Nothing about that failure is loud.
//
//  Sitting next to those, and looking exactly like them, are numbers that must
//  never move: `ucnToggle(1..5)` with `ucn-l1..5` and `ucn-s1..5` is the unit
//  NAVIGATION (lessons 1.1 to 1.5, not questions); `data-step-id` is the correct
//  ORDER inside the sequence question; `ek12-body` is a section; and `rgba(`
//  appears 128 times with `repeat(` 8 more, all CSS carrying digits in
//  parentheses. An earlier pass renumbered ucnToggle on the strength of its name
//  and would have shipped two nav entries firing the same handler.
//
//  A student sees none of that. They see "Q 2 of 10" and a tracker reading
//  "/ 10". Those two things are the entire defect, they are pure text, and
//  nothing in the page reads them back. So this file changes those and stops.
//  Twelve edits instead of ninety, and no way to break a question.
//
//  ── WHAT THIS DOES NOT CLAIM TO FIX ─────────────────────────────────────────
//  data-num stays 2 through 10. That is invisible, it is internally consistent,
//  and lib/cyber-denominator-gate.js treats it as harmless precisely when the
//  displayed numbering is coherent, which is what this produces.
//
//  There is no missing question to restore. Every stored snapshot of 1.2,
//  including the oldest, already carries blocks 2 through 10 and a total of 10,
//  so nothing was ever lost. Nine is what this lesson has always asked.
// -----------------------------------------------------------------------------

const { blocks, denominator } = require('./cyber-denominator-gate');

//  What the repair would say, without saying it. null when nothing needs fixing.
function plan(html) {
  const nums = blocks(html).filter((n) => n != null).sort((a, b) => a - b);
  if (!nums.length) return null;

  const total = nums.length;
  const den = denominator(html);

  //  Each block's DISPLAY rank: the first block on the page is question 1,
  //  whatever its data-num happens to be.
  const rank = new Map();
  nums.forEach((n, i) => rank.set(n, i + 1));

  const counters = [...String(html).matchAll(/Q (\d+) of (\d+)/g)]
    .map((m) => ({ num: Number(m[1]), total: Number(m[2]) }));
  const countersOk = counters.length === total
    && counters.every((c) => c.total === total && rank.get(c.num) != null)
    && new Set(counters.map((c) => rank.get(c.num))).size === total;

  if (den.value === total && countersOk) return null;   // already honest

  return { rank, total, printed: den.value, printedSource: den.source, counters: counters.length };
}

//  One pass. Both shapes are display text: a counter label and a printed total.
function apply(html) {
  const p = plan(html);
  if (!p) return { html, plan: null, changes: null };

  const { rank, total } = p;
  const changes = { counters: 0, totals: 0 };

  const out = String(html).replace(
    /Q (\d+) of (\d+)|score \+ '\s*\/\s*(\d+)'|>(\d+)\s*\/\s*(\d+)</g,
    (m, qN, qTot, sTot, pNum, pTot) => {
      if (qN !== undefined) {
        const r = rank.get(Number(qN));
        if (r == null) return m;                  // not one of our blocks
        changes.counters++;
        return `Q ${r} of ${total}`;
      }
      if (sTot !== undefined) { changes.totals++; return `score + ' / ${total}'`; }
      if (pTot !== undefined) { changes.totals++; return `>${pNum} / ${total}<`; }
      return m;
    });

  return { html: out, plan: p, changes };
}

module.exports = { plan, apply };
