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

const { blocks, denominator, counters } = require('./cyber-denominator-gate');

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

  const shown = counters(html);
  const countersOk = shown.length === total
    && shown.every((c, i) => c.total === total && c.num === i + 1);

  if (den.value === total && countersOk) return null;   // already honest

  //  Counters are relabelled BY ORDER: the first counter span on the page is
  //  question 1. That works for both label shapes without having to map a
  //  displayed number back to a block. It is only sound while there is exactly
  //  one counter per block, so that is a precondition, not an assumption.
  if (shown.length && shown.length !== total) {
    throw new Error(
      `refusing to relabel: ${shown.length} counter spans for ${total} graded blocks`);
  }

  return { rank, total, printed: den.value, printedSource: den.source, counters: shown.length };
}

//  One pass. Both shapes are display text: a counter label and a printed total.
function apply(html) {
  const p = plan(html);
  if (!p) return { html, plan: null, changes: null };

  const { rank, total } = p;
  const changes = { counters: 0, totals: 0 };

  //  ── SCOPED TO THE ELEMENT THAT OWNS THE NUMBER ─────────────────────────────
  //  An earlier version rewrote any `>n / m<` text node. On
  //  ap-cyber-unit-3-lesson-1 that also matched `<td class="port-num">143/993`
  //  and `20/21`, the IMAP/IMAPS and FTP rows of the lesson's port reference
  //  table, and would have rewritten them to 143/10 and 20/10: real content
  //  corrupted on a networking lesson, by a transform whose entire claim is
  //  that it only touches display text. A number is only a question label
  //  because of the element it sits in, so each rewrite is anchored to that
  //  element and nothing is matched loose in the body.
  let n = 0;
  let out = String(html)
    //  The per-question label, in either shape, inside its own span.
    .replace(/(<span[^>]*\bclass\s*=\s*"[^"]*\bcfu-counter\b[^"]*"[^>]*>)([^<]*)(<)/gi,
      (m, open, text, close) => {
        const q = /^\s*Q\s*\d+\s*of\s*\d+\s*$/i.test(text);
        const slash = /^\s*\d+\s*\/\s*\d+\s*$/.test(text);
        if (!q && !slash) return m;               // not a label, leave it alone
        n += 1;
        changes.counters++;
        return open + (q ? `Q ${n} of ${total}` : `${n} / ${total}`) + close;
      })
    //  The running score readout, inside the span that holds it.
    .replace(/(<span[^>]*\bid\s*=\s*"(?:cfu-)?score-num"[^>]*>)([^<]*)(<)/gi,
      (m, open, text, close) => {
        const hit = /^\s*([\d.]+)\s*\/\s*\d+\s*$/.exec(text);
        if (!hit) return m;
        changes.totals++;
        return `${open}${hit[1]} / ${total}${close}`;
      })
    //  The total the tracker writes back, where it is a literal rather than a
    //  field on a state object.
    .replace(/score \+ '\s*\/\s*(\d+)\s*'/g, () => {
      changes.totals++;
      return `score + ' / ${total}'`;
    });

  return { html: out, plan: p, changes };
}

module.exports = { plan, apply };
