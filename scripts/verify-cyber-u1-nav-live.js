'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DOES THE UNIT 1 NAVIGATOR STILL SEND STUDENTS TO THE WRONG LESSON?
//
//  Every assertion here is FALSE on the pages as they serve today and TRUE once
//  imports/2026-09-08/cyber-u1-nav-repair-pages.csv is imported in MERGE mode. That
//  is deliberate: an assertion that would have passed yesterday is decoration.
//  So this is EXPECTED TO BE RED before the import, and its red run is the
//  pre-check. Run the same command afterwards; it has to go green.
//
//  ── IT DOES NOT SHARE THE REWRITER'S OPINION ───────────────────────────────
//  lib/cyber-u1-nav.js is used for one thing only, parsing markup into steps.
//  The TARGET each step should carry is rebuilt here from the CED taxonomy and
//  the activity handle convention, without reference to the table the
//  generator built. If the two ever disagree, one of them is wrong and this
//  goes red, which is the entire point of not sharing it.
//
//  NO User-Agent, through lib/storefront-fetch.js. The bot management on this
//  storefront has been in three states in one week and the challenge body
//  contains none of the strings a check looks for, so a negative assertion
//  passes on it vacuously.
//
//  Run: node scripts/verify-cyber-u1-nav-live.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch.js');
const extract = require('./extract-live-body.js');
const nav = require('../lib/cyber-u1-nav.js');

const ROOT = path.join(__dirname, '..');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

//  ---------------------------------------------------------------------------
//  The target table, rebuilt from first principles.
//  Lessons come from the CED taxonomy. Activities follow the convention every
//  correct page already serves: ap-cyber-unit-1-lesson-N-<thing>.
const topics = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'cyber-topics.json'), 'utf8'));
  return (raw.topics || raw).filter((t) => String(t.topic).startsWith('1.'));
})();

const TABLE = {};
for (const t of topics) {
  const n = String(t.topic).split('.')[1];
  TABLE[`lesson${n}`] = `/pages/${t.handles[0]}`;
  TABLE[`${n}|Lesson`] = `/pages/${t.handles[0]}`;
  TABLE[`${n}|Ex 1`] = `/pages/ap-cyber-unit-1-lesson-${n}-exercise-1`;
  TABLE[`${n}|Ex 2`] = `/pages/ap-cyber-unit-1-lesson-${n}-exercise-2`;
  TABLE[`${n}|Lab`] = `/pages/ap-cyber-unit-1-lesson-${n}-lab`;
  TABLE[`${n}|Quiz`] = `/pages/ap-cyber-unit-1-lesson-${n}-quiz`;
}

const PAGES = (() => {
  const p = ['ap-cyber-unit-1-exam', 'ap-cyber-unit-1-project', 'ap-cyber-unit-1-scenario-practice'];
  topics.forEach((t) => p.push(t.handles[0]));
  for (const n of nav.LESSONS) {
    p.push(`ap-cyber-unit-1-lesson-${n}-exercise-1`, `ap-cyber-unit-1-lesson-${n}-exercise-2`,
      `ap-cyber-unit-1-lesson-${n}-lab`, `ap-cyber-unit-1-lesson-${n}-quiz`);
  }
  return [...new Set(p)];
})();

console.log('\nap cyber unit 1 navigator, live\n');

//  --from <dir> reads bodies off disk instead of the storefront. It exists so
//  the SAME assertions that judge the deploy can be run against the repaired
//  bodies before the import, which is the only honest way to claim the sheet
//  turns this green. Without it the pre-check would be a different program.
const FROM = (() => { const i = process.argv.indexOf('--from'); return i === -1 ? null : process.argv[i + 1]; })();

const bodies = {};
if (FROM) {
  for (const f of fs.readdirSync(FROM)) if (f.endsWith('.html')) bodies[f.replace(/\.html$/, '')] = fs.readFileSync(path.join(FROM, f), 'utf8');
  console.log(`  reading bodies from ${FROM} instead of the storefront\n`);
} else {
  for (const h of PAGES) {
    try { bodies[h] = extract.extract(sf.page(`/pages/${h}`).body); } catch (e) {
      console.log(`  note  could not read ${h}: ${e.message.slice(0, 60)}`);
    }
  }
}
console.log(`  read ${Object.keys(bodies).length} of ${PAGES.length} pages\n`);

const railed = {};
for (const [h, b] of Object.entries(bodies)) {
  try { railed[h] = nav.parse(b); } catch (e) { /* no rail on this page */ }
}
ok('every page that carries a rail still parses as one', Object.keys(railed).length >= 28,
  `${Object.keys(railed).length} parsed`);

//  1. No step anywhere is greyed out as unbuilt.
const dead = [];
for (const [h, p] of Object.entries(railed)) {
  for (const g of p.groups) for (const s of g.steps) if (s.disabled) dead.push(`${h} 1.${g.n} ${s.label}`);
}
ok('no navigator step is disabled', dead.length === 0,
  `${dead.length} disabled across ${new Set(dead.map((d) => d.split(' ')[0])).size} pages`);

//  2. Every step that is not the page itself is a link.
const notLinked = [];
for (const [h, p] of Object.entries(railed)) {
  for (const g of p.groups) for (const s of g.steps) if (!s.current && s.tag !== 'a') notLinked.push(`${h} 1.${g.n} ${s.label}`);
}
ok('every step other than the current page is a link', notLinked.length === 0, `${notLinked.length} are not`);

//  3. 1.3 and 1.4 are not crossed.
const crossed = [];
for (const [h, p] of Object.entries(railed)) {
  for (const g of p.groups) {
    if (g.lessonHref && g.lessonHref !== TABLE[`lesson${g.n}`]) crossed.push(`${h} 1.${g.n} -> ${g.lessonHref}`);
  }
}
ok('every lesson tab points at its own CED topic', crossed.length === 0,
  `${crossed.length} wrong, e.g. ${crossed.slice(0, 2).join(' ; ')}`);

//  4. Every step href is the canonical target for that (topic, activity).
const wrong = [];
for (const [h, p] of Object.entries(railed)) {
  for (const g of p.groups) {
    for (const s of g.steps) {
      if (s.tag !== 'a') continue;
      const want = TABLE[`${g.n}|${s.label}`];
      if (s.href !== want) wrong.push(`${h} 1.${g.n} ${s.label} -> ${s.href}`);
    }
  }
}
ok('every step href is the canonical page for that activity', wrong.length === 0,
  `${wrong.length} wrong, e.g. ${wrong.slice(0, 2).join(' ; ')}`);

//  5. The thing a teacher actually notices: 1.4's activities must not be 1.3's.
const fourOnThree = wrong.filter((w) => / 1\.4 /.test(w) && /lesson-3-/.test(w));
ok('1.4 activities do not send students to 1.3', fourOnThree.length === 0, `${fourOnThree.length} do`);

console.log(`\n  ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  console.log('  This is the expected state BEFORE the import. After importing');
  console.log('  imports/2026-09-08/cyber-u1-nav-repair-pages.csv in MERGE mode, all of');
  console.log('  the above must go green.\n');
}
process.exit(fails.length ? 1 : 0);
