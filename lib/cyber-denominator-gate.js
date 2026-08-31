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

//  ── COMMENTS ARE NOT CODE, AND THIS GATE HAS BEEN FOOLED BY THAT ───────────
//  Everything below parses the RENDERED page, which carries theme chrome as well
//  as the page body. `apcs-grade-reporter.liquid` ships a header comment that
//  quotes this very defect, including the literal `state.score + ' / 10'`, and it
//  renders on every cyber lesson page. Reading it as the page's own total made
//  this gate emit a false P0 on a page with no tracker of its own: "3 graded
//  blocks but the page reports out of 10, so a perfect paper scores 30 percent".
//
//  That is the worst possible failure for a P0. A gate that cries wolf gets
//  switched off, and then the real defect it exists for goes back to shipping
//  unnoticed. So comments come out before anything is read, which also covers
//  commented-out old widget code on any page, not just the one snippet that
//  exposed it. lib/cyber-page-gate.js strips comments before counting tags for
//  the same reason.
//
//  Line comments are matched only at the start of a line so that a `//` inside
//  a URL (`https://...`) is left alone.
function stripComments(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

//  Every opening tag carrying the cfu-block class, with its data-num. Scoped to
//  the tag rather than grepping data-num across the page: the attribute is not
//  reserved to these blocks, and a stray one elsewhere would inflate the count
//  and turn this gate into a liar in the expensive direction.
function blocks(html) {
  const out = [];
  const tag = /<[a-z]+[^>]*\bclass\s*=\s*"[^"]*\bcfu-block\b[^"]*"[^>]*>/gi;
  for (const m of stripComments(html).matchAll(tag)) {
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
  const h = stripComments(html);

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

//  What the page TELLS the student, block by block: the "Q 3 of 10" labels.
//  This is the numbering a student actually reads. `data-num` is an internal
//  handle they never see, and the two are allowed to differ.
//  Cyber pages write this label in two shapes, both inside the same span:
//
//      <span class="cfu-counter">Q 2 of 10</span>     unit 1 and 2 lessons
//      <span class="cfu-counter">1 / 13</span>        unit 3 lessons
//
//  Reading only the first shape reported "no counters at all" on twelve pages
//  that have them, which is the same kind of false alarm the comment stripping
//  above exists to prevent.
//
//  Scoped to the span rather than scanned across the page. A bare "n / N" is far
//  too common in prose and markup to match globally: the span is what makes it
//  unambiguously a question label.
function counters(html) {
  const out = [];
  const span = /<span[^>]*\bclass\s*=\s*"[^"]*\bcfu-counter\b[^"]*"[^>]*>([^<]*)</gi;
  for (const m of stripComments(html).matchAll(span)) {
    const t = m[1];
    const q = /Q\s*(\d+)\s*of\s*(\d+)/i.exec(t) || /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(t);
    if (q) out.push({ num: Number(q[1]), total: Number(q[2]) });
  }
  return out;
}

//  True when the labels read as a complete, correctly totalled set: one per
//  block, every total equal to the block count, and the labels covering 1..N
//  with no repeat and no gap.
//
//  A page with NO counters is not incoherent, it is silent, so this is only ever
//  asked once there is at least one label to judge. Several cyber lessons label
//  no questions at all (ap-cybersecurity-unit-1-ai-cyber-defense is one) and
//  they are not misinforming anyone: nothing is claimed, so nothing can be
//  wrong. Their grade is still covered by the denominator check above, which is
//  the one that matters.
function displayCoherent(html, blockCount) {
  const c = counters(html);
  if (!c.length) return true;                 // silent, not wrong
  if (c.length !== blockCount) return false;
  if (!c.every((x) => x.total === blockCount)) return false;
  const shown = [...new Set(c.map((x) => x.num))].sort((a, b) => a - b);
  return shown.length === blockCount && shown.every((n, i) => n === i + 1);
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

  //  WHAT THE STUDENT READS. The counters are the numbering they actually see,
  //  and a set that does not cover 1..N, or that advertises the wrong total, is
  //  a defect on the page whatever the internal ids say.
  const coherent = displayCoherent(html, seen.length);
  if (!coherent) {
    const c = counters(html);
    out.push({
      kind: 'cfu-counter-mismatch',
      detail: `${seen.length} graded blocks but the counters read `
        + `${c.map((x) => `${x.num} of ${x.total}`).slice(0, 3).join(', ')}`
        + (c.length > 3 ? ', ...' : ''),
      evidence: `blocks=${seen.length} counters=${c.length}`,
    });
  }

  //  WHICH data-num is missing. Diagnostic, and ONLY meaningful when the display
  //  is already wrong: it names the question to look for. A page whose labels
  //  read 1..N of N is honest to the student, and a gap in the internal
  //  data-num behind it is invisible, internally consistent, and not a defect.
  //  Renumbering those ids is how you break a live widget (see
  //  lib/cyber-cfu-relabel.js for the seven id families that embed the number),
  //  so this must not demand it.
  if (!coherent) {
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
  }

  return out;
}

module.exports = { blocks, denominator, counters, displayCoherent, stripComments, check };
