'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CAN GRADED WORK STILL REACH THE GRADEBOOK? A CONTRACT CHECK.
//
//  WHY THIS EXISTS
//  On 2026-08-21 a teacher reported that finished exercises were not showing.
//  Three defects sat underneath it and every one of them was SILENT: a
//  fabricated zero, a completion threshold that could never be met, and
//  window.APCS_saveLessonScore, which assets/apcs-score-reporter.js called on
//  every graded cyber exercise and lab page and which was defined nowhere. That
//  last one meant NO exercise or lab page in the course had ever recorded a
//  score. Nothing threw. Nothing logged an error a human would see. The only
//  reason any of it surfaced was an email.
//
//  WHAT THIS CHECKS, AND WHY IT IS THE ASSETS AND NOT THE PAGES
//  The failure was a CROSS-FILE CONTRACT break: one file called a function
//  another file was supposed to define. That is visible in the deployed assets
//  alone, in about ten requests. Crawling every graded page nightly would cost
//  250+ requests and trip the storefront's bot protection, which is the mistake
//  .github/workflows/smoke.yml already documents. So this checks the contract
//  and samples one page per course to prove each reporter still loads.
//
//  It reads the DEPLOYED assets, never the repo. A file can be correct on main
//  and absent from the storefront; the theme repo's own CLAUDE.md records main
//  drifting 103 commits from the live branch. Only what Shopify serves counts.
//
//  Read-only. No key. Exits non-zero when a contract is broken.
//
//  Run: node scripts/grade-path-audit.js [--json]
// ─────────────────────────────────────────────────────────────────────────────
const ORIGIN = 'https://www.apcsexamprep.com';

// One live page per course, chosen because each loads that course's reporter.
const SAMPLES = [
  { course: 'ap-cybersecurity', handle: 'ap-cyber-unit-1-lesson-2-exercise-1',
    expect: ['apcs-tracker.js', 'apcs-score-reporter.js'] },
  { course: 'ap-csa',           handle: 'ap-csa-lesson-1-3-expressions-assignment',
    expect: ['apcs-reporter.js'] },
  { course: 'ap-csp',           handle: 'ap-csp-course-bi1-collaboration',
    expect: ['ap-csp-reporter.js'] },
  { course: 'ap-networking',    handle: 'ap-networking-lesson-1-1-troubleshooting-slow-device',
    expect: ['ap-networking-reporter.js'] },
  { course: 'intro-java',       handle: 'intro-java-lesson-1-1-scenarios-worlds-and-actors',
    expect: ['intro-java-reporter.js'] },
];

// Rules the cyber tracker must still implement. Each is a defect that shipped.
const TRACKER_RULES = [
  { name: 'counts only disable-able check buttons',
    test: (js) => /gradedButtons/.test(js) || /["']disabled["']\s*in\s/.test(js),
    broke: 'an a.check-btn nav link made the activity unfinishable' },
  { name: 'reports no score rather than a fabricated 0',
    test: (js) => /answered-wrong/.test(js),
    broke: 'a page with no score UI stored a hard 0 nobody earned' },
];

// Every window.X the assets CALL that none of them DEFINES. This is the exact
// shape of the APCS_saveLessonScore bug: called by two consumers, defined by
// nobody, silently grading nothing. Scoped to the courses' own writer prefixes
// because a broad sweep would flag every DOM global as missing.
function missingWriters(sources) {
  const all = sources.join('\n');
  const defined = new Set(
    Array.from(all.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)).map((m) => m[1])
  );
  const called = new Set(
    Array.from(all.matchAll(/(?:window|root)\.((?:APCS|APNET|INTROJAVA)_[\w$]*)/g)).map((m) => m[1])
  );
  // APCS_PAGE is set by snippets/quiz-tracker-wiring.liquid, not by an asset,
  // so an asset reading it is correct rather than a broken contract.
  return Array.from(called).filter((n) => !defined.has(n) && n !== 'APCS_PAGE');
}

// The id list the deployed reporter ships with. Both quote styles: the source
// writes 'score-display' and the minified build ships "score-display", and
// matching only one returns an empty list and makes every page look uncovered.
function scoreIds(js) {
  const block = /SCORE_IDS\s*=\s*\[([\s\S]*?)\]/.exec(js);
  return block ? Array.from(block[1].matchAll(/['"]([^'"]+)['"]/g)).map((x) => x[1]) : [];
}

const abs = (u) => (u.startsWith('//') ? 'https:' + u : u);
const scriptSrcs = (html) =>
  Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g)).map((m) => abs(m[1]));

async function get(url) {
  const r = await fetch(url);
  return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' };
}

async function main() {
  const findings = [];
  const notes = [];
  const assets = new Map();          // url -> source

  for (const s of SAMPLES) {
    const page = await get(`${ORIGIN}/pages/${s.handle}`);
    if (!page.ok) {
      findings.push(`${s.course}: sample page ${s.handle} returned HTTP ${page.status}`);
      continue;
    }
    const srcs = scriptSrcs(page.text);
    for (const want of s.expect) {
      const hit = srcs.find((u) => u.includes(want));
      if (!hit) {
        findings.push(`${s.course}: ${want} is NOT loaded on ${s.handle}`);
        continue;
      }
      if (!assets.has(hit)) {
        const a = await get(hit);
        if (!a.ok) { findings.push(`${want}: asset fetch returned HTTP ${a.status}`); continue; }
        assets.set(hit, a.text);
      }
    }
    notes.push(`${s.course}: ${s.expect.length} reporter asset(s) loaded on ${s.handle}`);
  }

  // ── THE CONTRACT ──────────────────────────────────────────────────────────
  // Every window.X the assets CALL must be defined by one of them. This is the
  // exact shape of the APCS_saveLessonScore bug, and it is why the check is
  // worth running even when nothing looks wrong.
  const missing = missingWriters(Array.from(assets.values()));
  for (const m of missing) {
    findings.push(`window.${m} is CALLED by a deployed asset and DEFINED by none. ` +
                  `Whatever hands results to it is grading nothing.`);
  }

  // ── THE TRACKER RULES ─────────────────────────────────────────────────────
  const tracker = Array.from(assets.entries()).find(([u]) => u.includes('apcs-tracker.js'));
  if (!tracker) findings.push('apcs-tracker.js was never fetched; cannot check its rules');
  else for (const r of TRACKER_RULES) {
    if (!r.test(tracker[1])) findings.push(`tracker regressed: no longer ${r.name} (${r.broke})`);
    else notes.push(`tracker: ${r.name}`);
  }

  // ── THE SCORE-ELEMENT LIST ────────────────────────────────────────────────
  // Every id a live page uses to show its score must be one the reporter reads.
  // labTotal was missing and three labs were unreadable because of it.
  const rep = Array.from(assets.entries()).find(([u]) => u.includes('apcs-score-reporter.js'));
  const REQUIRED_IDS = module.exports.REQUIRED_SCORE_IDS;
  if (rep) {
    const ids = scoreIds(rep[1]);
    if (!ids.length) findings.push('apcs-score-reporter.js: SCORE_IDS could not be read');
    for (const id of REQUIRED_IDS) {
      if (ids.length && !ids.includes(id)) {
        findings.push(`apcs-score-reporter.js no longer reads #${id}; pages using it score nothing`);
      }
    }
    if (ids.length) notes.push(`score reporter reads: ${ids.join(', ')}`);
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ findings, notes }, null, 2));
  } else {
    for (const n of notes) console.log(`  ok    ${n}`);
    if (findings.length) {
      console.log('');
      for (const f of findings) console.log(`  BROKEN  ${f}`);
    }
    console.log(`\n${findings.length} broken, ${notes.length} checks passed.`);
  }
  process.exitCode = findings.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { SAMPLES, TRACKER_RULES, missingWriters, scoreIds, REQUIRED_SCORE_IDS: ['score-display', 'finalScore', 'totalScore', 'labTotal'] };
