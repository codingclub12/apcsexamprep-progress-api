'use strict';
// -----------------------------------------------------------------------------
//  THE DENOMINATOR A CYBER LESSON PAGE PROMISES, AGAINST THE QUESTIONS IT SERVES
//
//  A cyber lesson page grades itself in the browser and hands the percent to
//  apcs-grade-reporter, which posts it as activity_type 'lesson'. The percent is
//  the ONLY thing that reaches the gradebook: there is no per-question payload
//  to reconcile against later, and no human sees the page and the gradebook at
//  the same time. So a denominator that disagrees with the page is not a display
//  bug. It is the grade.
//
//  ── THE DEFECT THIS EXISTS FOR ──────────────────────────────────────────────
//  Measured 2026-08-31 on ap-cybersecurity-unit-1-password-attacks (lesson 1.2):
//
//    <div class="cfu-block" id="cfu-2" ... data-num="2">   <- first block is 2
//    ... blocks 2 through 10, nine of them, no cfu-1 anywhere on the page
//    scoreNum.textContent = state.score + ' / 10';         <- promises ten
//
//  Nine questions, a denominator of ten, and no way for a student to find the
//  tenth. Every student on that page was capped at 90 percent, a perfect paper
//  included, and at a mastery threshold of 90 a perfect paper also read as not
//  passing. Nothing anywhere failed: the page rendered, the reporter posted, the
//  gradebook stored and displayed exactly what it was handed.
//
//  ── WHY A GATE AND NOT A ONE LINE PAGE FIX ──────────────────────────────────
//  The page fix is a body import and belongs in the Matrixify pipeline. What
//  belongs HERE is the reason it went unnoticed: the denominator is a string
//  literal typed next to the questions, and nothing has ever compared the two.
//  Any future import that drops a block, or any author who renumbers one,
//  reintroduces it silently. Counting is cheap and the pages are already
//  crawled.
//
//  ── WHAT IS DELIBERATELY NOT FAILED ─────────────────────────────────────────
//  A page whose denominator is COMPUTED at runtime (`sc + '/' + tot`, the
//  grade-all shells on unit 4 lesson 5 and all of unit 5) cannot be checked from
//  the source and does not need to be: a denominator derived from the question
//  set cannot disagree with it. Those report source 'dynamic' and pass. The
//  check fires only where a human typed a number.
//
//  Offline: pure functions over HTML. No network, no database, no browser.
// -----------------------------------------------------------------------------

//  Every opening tag carrying the cfu-block class, with its data-num. Scoped to
//  the tag rather than grepping data-num across the page: the attribute is not
//  reserved to these blocks, and a stray one elsewhere would inflate the count
//  and turn this gate into a liar in the expensive direction.
function blocks(html) {
  const out = [];
  const tag = /<[a-z]+[^>]*\bclass\s*=\s*"[^"]*\bcfu-block\b[^"]*"[^>]*>/gi;
  for (const m of String(html || '').matchAll(tag)) {
    const num = /\bdata-num\s*=\s*"(\d+)"/i.exec(m[0]);
    out.push(num ? Number(num[1]) : null);
  }
  return out;
}

//  What the page will actually put on screen as the total, and where it came
//  from. Order matters: a declared total outranks a literal in the tracker,
//  because the tracker renders the declared one.
//
//    cfuState-total    var cfuState = { score: 0, total: 10, ... }
//    tracker-literal   scoreNum.textContent = state.score + ' / 10'
//    initial-text      <span id="cfu-score-num">0 / 10</span>
//    dynamic           ... + '/' + tot        (computed, nothing to check)
function denominator(html) {
  const h = String(html || '');

  const declared = /\b(?:var|let|const)\s+cfuState\s*=\s*\{[^}]*?\btotal\s*:\s*(\d+(?:\.\d+)?)/i.exec(h);
  if (declared) return { value: Number(declared[1]), source: 'cfuState-total' };

  const literal = /\.score\s*\+\s*'\s*\/\s*(\d+(?:\.\d+)?)\s*'/i.exec(h);
  if (literal) return { value: Number(literal[1]), source: 'tracker-literal' };

  //  A denominator assembled from a variable is computed from the question set.
  //  Readable only at runtime, and honest by construction.
  if (/\+\s*'\s*\/\s*'\s*\+/.test(h) || /\+\s*'\/'\s*\+/.test(h)) {
    return { value: null, source: 'dynamic' };
  }

  const initial = /id\s*=\s*"(?:cfu-)?score-num"[^>]*>\s*[\d.]+\s*\/\s*(\d+(?:\.\d+)?)/i.exec(h);
  if (initial) return { value: Number(initial[1]), source: 'initial-text' };

  return { value: null, source: null };
}

//  Findings, most severe first. Shape matches lib/site-crawl.js checkPage:
//  { kind, detail, evidence }. Never throws; a page it cannot parse is a page
//  with nothing to say about it, not a crash in the crawler.
function check(html) {
  const out = [];
  const nums = blocks(html);
  if (!nums.length) return out;            // not a cfu shell; other gates cover it

  const den = denominator(html);
  const seen = nums.filter((n) => n != null);

  if (den.source === 'dynamic') return out;

  if (den.value == null) {
    out.push({
      kind: 'cfu-no-denominator',
      detail: `${nums.length} graded blocks and no readable total`,
      evidence: `${nums.length} cfu-block, denominator unreadable`,
    });
    return out;
  }

  //  THE GRADE ITSELF. Counting blocks is the honest total: it is what a student
  //  can actually answer.
  if (seen.length !== den.value) {
    const cap = Math.round((seen.length / den.value) * 100);
    out.push({
      kind: 'cfu-denominator-mismatch',
      detail: `${seen.length} graded blocks but the page reports out of ${den.value}`
        + `, so a perfect paper scores ${cap} percent`,
      evidence: `blocks=${seen.length} denominator=${den.value} (${den.source})`,
    });
  }

  //  WHICH question went missing. Reported separately because it names the fix,
  //  and because a page can be renumbered into agreement while still skipping a
  //  question a student was told exists ("Q 2 of 10" with no Q 1).
  const sorted = seen.slice().sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i <= (sorted[sorted.length - 1] || 0); i++) {
    if (!sorted.includes(i)) gaps.push(i);
  }
  if (gaps.length) {
    out.push({
      kind: 'cfu-numbering-gap',
      detail: `graded blocks skip ${gaps.map((g) => `#${g}`).join(', ')}`
        + ` (present: ${sorted[0]} to ${sorted[sorted.length - 1]})`,
      evidence: `missing data-num ${gaps.join(',')}`,
    });
  }

  return out;
}

module.exports = { blocks, denominator, check };
