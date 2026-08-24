'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: an import must never silently delete live page content.
//
//  WHY THIS SUITE EXISTS
//  On 2026-08-22 an import of shopify/join.html replaced /pages/join and deleted
//  the entire self-study tab, along with the Continue My Course button and two
//  display helpers. The four guards in scripts/page-body-csv.js were green the
//  whole time, because not one of them asked what the live body held that the
//  file did not. The tab had been authored in the Shopify admin and no revision
//  of the repo file had ever contained it, so the file was not a stale copy of
//  the live page: it was a different page sharing a handle.
//
//  Shopify keeps no page history, so that content was recoverable only because a
//  snapshot happened to be committed first. This suite is the check that would
//  have refused the import, plus the lock that stops the same content going
//  missing from the repo file again.
//
//  Zero PII: page markup only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:pageimportguard
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { contentLoss } = require('../scripts/page-body-csv');

const ROOT = path.join(__dirname, '..');
let pass = 0;
const fail = [];

function ok(cond, label) {
  if (cond) { pass++; return; }
  fail.push(label);
}

// ── 1. THE MECHANISM ─────────────────────────────────────────────────────────
//  A live body carrying an id, a function and an API path the file does not.
{
  const live = `<div id="keepMe"></div><script>var A={ doThing() { fetch('/api/student/solo-init'); } };</script>`;
  const file = `<div id="other"></div><script>var A={ somethingElse() { fetch('/api/student/login'); } };</script>`;
  const lost = contentLoss(live, file);
  ok(lost.some((l) => l === 'element id keepMe'), 'a deleted element id is reported');
  ok(lost.some((l) => l === 'function doThing'), 'a deleted function is reported');
  ok(lost.some((l) => l === 'API path /api/student/solo-init'), 'a deleted API path is reported');
  ok(lost.length === 3, `exactly the three losses are reported, got ${lost.length}`);
}

// ── 2. AN IMPORT THAT ADDS IS NOT AN IMPORT THAT DELETES ─────────────────────
//  The guard must not fire on the normal case, or it becomes noise and gets
//  turned off, which is how the page got overwritten in the first place.
{
  const live = `<div id="a"></div>`;
  const file = `<div id="a"></div><div id="b"></div><script>var A={ extra() {} };</script>`;
  ok(contentLoss(live, file).length === 0, 'adding content is not reported as loss');
  ok(contentLoss(live, live).length === 0, 'an identical body reports no loss');
}

// ── 3. THE REAL INCIDENT, REPLAYED ───────────────────────────────────────────
//  The committed snapshot of the live body, against the file that replaced it.
//  This is the assertion the 2026-08-22 import needed and did not have.
{
  const snap = path.join(ROOT, 'shopify/page-snapshots/join.2026-08-22.before-multi-course.html');
  ok(fs.existsSync(snap), 'the pre-import snapshot of /pages/join is still committed');
  if (fs.existsSync(snap)) {
    const live = fs.readFileSync(snap, 'utf8');
    const now = fs.readFileSync(path.join(ROOT, 'shopify/join.html'), 'utf8');

    // The lock. If self-study, the personal-code box or Continue My Course ever
    // leave shopify/join.html again, this fails here rather than on a live page.
    const lost = contentLoss(live, now);
    ok(lost.length === 0, `shopify/join.html still carries everything the live page had (missing: ${lost.join(', ')})`);

    // Named explicitly, so the reason survives even if the snapshot is ever
    // pruned and section 3's diff stops covering it.
    for (const needle of ['step-solo', 'soloCodeValue', 'completeSolo', 'solo-init', 'solo-login', 'continueCourseBtn']) {
      ok(now.includes(needle), `join.html still contains ${needle}`);
    }
    // The ME- branch is the difference between a self-study student signing in
    // and being told their name is not in the class.
    ok(/startsWith\('ME-'\)/.test(now), 'join.html routes a ME- code to solo-login');
  }
}

// ── 4. THE OTHER PAGE THIS SCRIPT SHIPS ──────────────────────────────────────
{
  const snap = path.join(ROOT, 'shopify/page-snapshots/my-progress.2026-08-22.before-multi-course.html');
  if (fs.existsSync(snap)) {
    const live = fs.readFileSync(snap, 'utf8');
    const now = fs.readFileSync(path.join(ROOT, 'shopify/my-progress.html'), 'utf8');
    ok(contentLoss(live, now).length === 0,
      `shopify/my-progress.html still carries everything its live page had (missing: ${contentLoss(live, now).join(', ')})`);
  }
}

// ── 5. SOLO IS A COURSE VALUE, NOT A FALLTHROUGH ─────────────────────────────
//  Both pages render a course name from the same kind of table. Neither mapped
//  'solo', so a self-study student was shown the word "solo".
{
  for (const f of ['shopify/join.html', 'shopify/my-progress.html']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    ok(/'solo'\s*:\s*'Self-Study'/.test(src), `${f} maps solo to a course name`);
  }
}

console.log(`\n  page-import-guard: ${pass} passed, ${fail.length} failed`);
for (const f of fail) console.log(`    FAIL  ${f}`);
console.log('');
process.exit(fail.length ? 1 : 0);
