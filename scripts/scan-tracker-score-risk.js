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
//  WHAT THIS DEPENDS ON, AND WHY IT READS THE DEPLOYED ASSET
//  Both failure modes are a PAGE MARKUP shape meeting a TRACKER RULE. Fixing the
//  tracker retires them without changing a single page, so a scan that looked at
//  markup alone would keep reporting the same pages forever and the number would
//  mean nothing. Theme PR #64 shipped both fixes on 2026-08-21; this scan now
//  fetches the live apcs-tracker.js, detects which rules it actually implements,
//  and judges the pages against those.
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

// Which rules the live tracker implements. Detected from the deployed asset, so
// this cannot drift from what students are actually served.
//  A theme deploy does not reach every edge at once. Immediately after theme PR
//  #64 merged, the SAME page alternated between the old and the new
//  `apcs-tracker.js?v=` on successive requests, so a single probe could report
//  either answer and be believed. While any variant still serves the old asset,
//  some students still get the old behaviour, so the honest reading of a mixed
//  result is NOT FIXED. This samples and requires unanimity.
const PROBE_SAMPLES = 6;

async function deployedRules() {
  const seen = new Map();                       // asset url -> parsed rules
  for (let i = 0; i < PROBE_SAMPLES; i++) {
    const probe = await fetch(`${ORIGIN}/pages/ap-cyber-unit-1-lesson-2-exercise-1`);
    const m = /src="([^"]*apcs-tracker\.js[^"]*)"/.exec(await probe.text());
    if (!m) throw new Error('could not find apcs-tracker.js on a wired page');
    const url = m[1].startsWith('//') ? 'https:' + m[1] : m[1];
    if (seen.has(url)) continue;
    const js = await (await fetch(url)).text();
    seen.set(url, {
      // Counts only elements that can carry a disabled state, so an
      // `a.check-btn` nav link no longer makes the activity unfinishable.
      countsOnlyDisableable: /gradedButtons/.test(js) || /"disabled"\s*in\s/.test(js),
      // Returns null instead of a fabricated 0 when the page exposes no score UI.
      nullWhenNoScoreUi: /answered-wrong/.test(js),
    });
  }
  const variants = Array.from(seen.entries()).map(([url, r]) => ({ url, ...r }));
  // Unanimous or nothing: one stale variant is enough to keep the bug reachable.
  return {
    variants,
    mixed: variants.length > 1,
    countsOnlyDisableable: variants.every((v) => v.countsOnlyDisableable),
    nullWhenNoScoreUi: variants.every((v) => v.nullWhenNoScoreUi),
  };
}

// The SECOND way a page can be scored, and the one this scan used to be blind to.
//
// apcs-tracker.js is not the only writer. assets/apcs-score-reporter.js watches
// whichever element the page renders its score into and hands the result to
// window.APCS_saveLessonScore. A page with no `#score-display` is invisible to
// the tracker's own path and still fully scored through this one, so judging it
// by the tracker alone reports "no score" about a page that reports a real
// grade. This scan said exactly that about thirteen pages after theme PR #68
// fixed them.
//
// Both halves are read from the DEPLOYED assets: the id list the reporter
// actually ships with, and whether the writer it calls actually exists. Until
// #68 the writer was undefined, so this path scored nothing at all.
async function deployedReporter() {
  const probe = await fetch(`${ORIGIN}/pages/ap-cyber-unit-1-lesson-2-exercise-1`);
  const html = await probe.text();
  const m = /src="([^"]*apcs-score-reporter\.js[^"]*)"/.exec(html);
  const t = /src="([^"]*apcs-tracker\.js[^"]*)"/.exec(html);
  if (!m || !t) return { present: false, ids: [], writerExists: false };
  const abs = (u) => (u.startsWith('//') ? 'https:' + u : u);
  const js = await (await fetch(abs(m[1]))).text();
  const trackerJs = await (await fetch(abs(t[1]))).text();
  // The deployed asset is MINIFIED, so match both quote styles: the source
  // writes 'score-display' and the build ships "score-display". Reading only
  // single quotes returned an empty list and silently made every page look
  // uncovered, which is the same shape of bug this scan exists to catch.
  const idsBlock = /SCORE_IDS\s*=\s*\[([\s\S]*?)\]/.exec(js);
  const ids = idsBlock
    ? Array.from(idsBlock[1].matchAll(/['"]([^'"]+)['"]/g)).map((x) => x[1])
    : [];
  return {
    present: true,
    ids,
    writerExists: /APCS_saveLessonScore\s*=/.test(trackerJs),
  };
}

function classify(html, rules, reporter) {
  // Which score-element ids this page actually renders. Matched against the id
  // list the deployed reporter ships with, rather than a list hardcoded here
  // that would drift the moment the reporter learns a new one.
  const scoreIds = new Set(
    Array.from(html.matchAll(/id="([^"]+)"/g)).map((m) => m[1])
  );
  const els = elementsWithClass(html, 'check-btn');
  const total = els.length;
  const anchors = els.filter((t) => t === 'a').length;
  const buttons = els.filter((t) => t === 'button').length;
  const hasScoreUi = html.includes('id="score-display"') || html.includes('answered-correct');

  if (total === 0) return { verdict: 'SAFE_READING', total, buttons, anchors, hasScoreUi };
  if (hasScoreUi)  return { verdict: 'OK_SCORED',    total, buttons, anchors, hasScoreUi };

  // An anchor inflating the count only strands the activity while the tracker
  // still counts elements that can never be disabled.
  if (anchors > 0 && !rules.countsOnlyDisableable) {
    return { verdict: 'NEVER_COMPLETES', total, buttons, anchors, hasScoreUi };
  }
  // No score UI is only a fabricated zero while the tracker guesses 0 there.
  if (!rules.nullWhenNoScoreUi) {
    return { verdict: 'FABRICATED_ZERO', total, buttons, anchors, hasScoreUi };
  }
  // The tracker's own path finds no score here. Before calling that a gap, ask
  // whether the score-reporter path covers the page, because that is a real
  // grade arriving by another route.
  if (reporter && reporter.writerExists && reporter.ids.some((id) => scoreIds.has(id))) {
    return { verdict: 'SCORED_VIA_REPORTER', total, buttons, anchors, hasScoreUi };
  }
  // Neither path can score it. This is the genuine reporter backlog.
  return { verdict: 'NEEDS_REPORTER', total, buttons, anchors, hasScoreUi };
}

async function scan() {
  const handles = cyberHandles();
  const rules = await deployedRules();
  const reporter = await deployedReporter();
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < handles.length) {
      const handle = handles[cursor++];
      try {
        const res = await fetch(`${ORIGIN}/pages/${handle}`);
        if (!res.ok) { results.push({ handle, verdict: 'ABSENT', status: res.status }); continue; }
        results.push({ handle, ...classify(await res.text(), rules, reporter) });
      } catch (e) {
        results.push({ handle, verdict: 'FETCH_FAILED', error: String(e && e.message) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  results.sort((a, b) => a.handle.localeCompare(b.handle));
  results.rules = rules;
  results.reporter = reporter;
  return results;
}

const ORDER = ['FABRICATED_ZERO', 'NEVER_COMPLETES', 'NEEDS_REPORTER', 'SCORED_VIA_REPORTER', 'OK_SCORED', 'SAFE_READING', 'ABSENT', 'FETCH_FAILED'];

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
    const rules = results.rules;
    console.log(`\nDeployed tracker (${rules.variants.length} variant(s) seen in ${PROBE_SAMPLES} probes):`);
    for (const v of rules.variants) {
      console.log(`  ${v.url}`);
      console.log(`      disable-able-only=${v.countsOnlyDisableable} null-when-no-score-ui=${v.nullWhenNoScoreUi}`);
    }
    if (rules.mixed) {
      console.log('  MIXED: the storefront is still serving more than one build of this asset.');
      console.log('  Verdicts below assume the WORST variant, because a student can be served it.');
    }

    const bad = results.filter((r) => r.verdict === 'FABRICATED_ZERO' || r.verdict === 'NEVER_COMPLETES');
    const backlog = results.filter((r) => r.verdict === 'NEEDS_REPORTER');
    const viaReporter = results.filter((r) => r.verdict === 'SCORED_VIA_REPORTER');
    const rep = results.reporter;
    console.log(`\nScore reporter: ${rep.present ? 'loaded' : 'ABSENT'}` +
                `, writer ${rep.writerExists ? 'defined' : 'UNDEFINED (scores nothing)'}` +
                `, ids [${rep.ids.join(', ')}]`);
    console.log(`\n${bad.length} of ${results.length} pages mis-score.`);
    if (viaReporter.length) {
      console.log(`${viaReporter.length} are scored through apcs-score-reporter.js rather than ` +
                  `the tracker's own path. Not a gap.`);
    }
    if (backlog.length) {
      console.log(`${backlog.length} can be scored by NEITHER path ` +
                  `(they read "done, ungraded" until a reporter can read them).`);
    }
    process.exitCode = bad.length ? 1 : 0;
  });
}

module.exports = { scan, classify, elementsWithClass, cyberHandles };
