'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHICH LIVE PAGES CAN THE TRACKER MIS-SCORE?
//
//  apcs-tracker.js decides on its own when a non-quiz activity is complete and
//  what score to post. Both halves of that decision read the page's DOM, so a
//  page whose markup does not match what the tracker expects is mis-scored
//  silently. Two distinct failure modes exist, and they look identical to a
//  teacher (an activity that never shows a real grade):
//
//    A  FABRICATED ZERO. Every `.check-btn` gets disabled, so completion fires,
//       but the page exposes no `#score-display` and no `.answered-correct`.
//       `activityScorePct` then returns Math.round(0 / total * 100) = 0 and the
//       tracker posts `completed: true, score: 0`. A student who scored full
//       marks is stored as a zero, and it counts against the class average.
//
//    B  NEVER COMPLETES. The page carries an `<a class="check-btn">` NAV LINK
//       alongside its real buttons. `total` counts it, but an anchor has no
//       `.disabled` property, so `answered` can never reach `total` and
//       markComplete is never called. Nothing is recorded but the initial
//       visit. This is the mode behind the 2026-08-21 teacher report on 1.2.
//
//  WHY THE CLASS TOKEN MATTERS. Several pages style buttons `l-check-btn`.
//  `querySelectorAll('.check-btn')` does NOT match that (CSS matches whole
//  class tokens), so those pages take the reading path and are SAFE. A naive
//  substring or \bcheck-btn\b regex reports them as at-risk; the first run of
//  this scan did exactly that and produced 20 false positives. Class attributes
//  are therefore split on whitespace and compared token-wise.
//
//  WHY THE RENDERED PAGE, NOT THE Shopify BODY. Completion is decided against
//  the real DOM, nav links and all, and the nav block is injected by the theme
//  rather than stored in the page body. Reading the body alone cannot see mode
//  B at all. The two probe strings used here (`id="score-display"` and
//  `answered-correct`) do not appear in the theme's inline scripts, so the
//  rendered page is safe to search for them; `.check-btn` DOES appear there, so
//  it is matched as an element class token only, never as a bare string.
//
//  Read-only. Fetches public storefront pages, writes nothing, needs no key.
//
//  Run: node scripts/scan-tracker-score-risk.js [--json]
// ─────────────────────────────────────────────────────────────────────────────
const { COURSES } = require('../utils');

const ORIGIN = 'https://www.apcsexamprep.com';
const CONCURRENCY = 8;

// Handles the theme wiring sets APCS_PAGE for, MINUS quizzes (they take the
// separate quiz branch in the tracker and never reach trackActivityCompletion)
// and MINUS unit exams (deliberately never wired). Cyber 2.5 is retired.
function cyberHandles() {
  const out = [];
  const units = COURSES['ap-cybersecurity'].units;
  for (const [unitKey, unit] of Object.entries(units)) {
    const u = unitKey.replace('unit-', '');
    unit.lessons.forEach((lesson, i) => {
      const l = i + 1;
      if (u === '2' && l === 5) return;              // retired page set
      const base = `ap-cyber-unit-${u}-lesson-${l}`;
      for (const suffix of ['', '-exercise-1', '-exercise-2', '-lab']) out.push(base + suffix);
    });
  }
  return out;
}

// An element carries a class only if the token matches exactly.
function elementsWithClass(html, token) {
  const out = [];
  const tag = /<\s*([a-zA-Z]+)([^>]*)>/g;
  let m;
  while ((m = tag.exec(html))) {
    const cls = /class\s*=\s*"([^"]*)"/.exec(m[2]);
    if (cls && cls[1].split(/\s+/).includes(token)) out.push(m[1].toLowerCase());
  }
  return out;
}

function classify(html) {
  const els = elementsWithClass(html, 'check-btn');
  const total = els.length;
  const anchors = els.filter((t) => t === 'a').length;
  const buttons = els.filter((t) => t === 'button').length;
  const hasScoreUi = html.includes('id="score-display"') || html.includes('answered-correct');

  if (total === 0) return { verdict: 'SAFE_READING', total, buttons, anchors, hasScoreUi };
  if (hasScoreUi)  return { verdict: 'OK_SCORED',    total, buttons, anchors, hasScoreUi };
  if (anchors > 0) return { verdict: 'NEVER_COMPLETES', total, buttons, anchors, hasScoreUi };
  return { verdict: 'FABRICATED_ZERO', total, buttons, anchors, hasScoreUi };
}

async function scan() {
  const handles = cyberHandles();
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < handles.length) {
      const handle = handles[cursor++];
      try {
        const res = await fetch(`${ORIGIN}/pages/${handle}`);
        if (!res.ok) { results.push({ handle, verdict: 'ABSENT', status: res.status }); continue; }
        results.push({ handle, ...classify(await res.text()) });
      } catch (e) {
        results.push({ handle, verdict: 'FETCH_FAILED', error: String(e && e.message) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  results.sort((a, b) => a.handle.localeCompare(b.handle));
  return results;
}

const ORDER = ['FABRICATED_ZERO', 'NEVER_COMPLETES', 'OK_SCORED', 'SAFE_READING', 'ABSENT', 'FETCH_FAILED'];

if (require.main === module) {
  scan().then((results) => {
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    for (const verdict of ORDER) {
      const rows = results.filter((r) => r.verdict === verdict);
      if (!rows.length) continue;
      console.log(`\n=== ${verdict}: ${rows.length}`);
      for (const r of rows) {
        const detail = r.total === undefined ? '' :
          ` total=${r.total} buttons=${r.buttons} anchors=${r.anchors}`;
        console.log(`  ${r.handle}${detail}`);
      }
    }
    const bad = results.filter((r) => r.verdict === 'FABRICATED_ZERO' || r.verdict === 'NEVER_COMPLETES');
    console.log(`\n${bad.length} of ${results.length} pages mis-score.`);
    process.exitCode = bad.length ? 1 : 0;
  });
}

module.exports = { scan, classify, elementsWithClass, cyberHandles };
