'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DID THE PRACTICE SPOKE RESTYLE ACTUALLY LAND ON THE STOREFRONT?
//
//  Every assertion here is FALSE on the pages as they serve today and TRUE once
//  imports/2026-09-06/cyber-practice-restyle-pages.csv is imported in MERGE
//  mode. That is the whole design. The deploy gate's own first manifest asserted
//  "status":"ok" from /api/health, which was true beforehand, true during, and
//  true if the deploy never happened, so it read like proof and verified
//  nothing. An assertion that would have passed yesterday is decoration.
//
//  So this is EXPECTED TO BE RED until the import, and its red output is the
//  pre-check. Run it again afterwards; the same command has to go green.
//
//  ── NO User-Agent ──────────────────────────────────────────────────────────
//  Through lib/storefront-fetch.js, which sends none. The bot management on
//  this storefront inverted on 2026-09-03: a request claiming to be a browser
//  gets a 403 challenge page, and the challenge body contains none of the
//  strings a check looks for, so every "this string is gone now" assertion
//  passes on it vacuously. The module refuses a body it cannot prove is the
//  page, which is what stops that from being reported as a live regression.
//
//  Run: node scripts/verify-cyber-practice-spokes-live.js
// ─────────────────────────────────────────────────────────────────────────────

const sf = require('../lib/storefront-fetch.js');
const extract = require('./extract-live-body.js');
const spec = require('../lib/cyber-practice-spec');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

console.log('\ncyber practice spokes, live\n');

for (const s of spec.spokes()) {
  const url = `/pages/${s.handle}`;
  let body;
  try {
    body = extract.extract(sf.page(url).body);
  } catch (e) {
    fails.push(`${s.handle}: ${e.message}`);
    console.log(`  FAIL  ${s.handle} could not be read: ${e.message.slice(0, 120)}`);
    continue;
  }
  const u = s.unit_no;

  //  1. THE SENTENCE THAT WAS FALSE IS GONE, AND THE TRUE ONE IS THERE.
  //     The online unit exam shares no items with the paper unit test a teacher
  //     grades (docs/cyber-unit1-bundle-vs-online.md, and units 2 to 5 in
  //     docs/cyber-unit-tests-availability.md), so it belongs on a practice
  //     page. Calling it "the full unit test" told a student the opposite.
  ok(`unit ${u} no longer calls the exam "the full unit test"`,
    !/the full unit test/i.test(body));
  ok(`unit ${u} says the exam is not the graded instrument`,
    /not the questions on the test your teacher grades/.test(body));
  ok(`unit ${u} marks the exam card apart from the practice cards`,
    body.includes('class="grp grp--exam"'));

  //  2. THE COURSE'S OWN LOOK, not a second design system. The gradient and the
  //     Georgia stack are lifted from the live exam pages, so a match here is a
  //     match with the rest of the course rather than with a spec.
  ok(`unit ${u} carries the course hero`,
    body.includes('#4C1D95') && body.includes('font-family:Georgia,serif'));
  //  3. The theme root is 62.5%, so a rem in this body renders at about 10px.
  ok(`unit ${u} uses no rem`, !/[\d.]+rem/.test(body),
    (body.match(/[\d.]+rem/g) || []).slice(0, 3).join(', '));

  //  4. THE PAGE ANSWERS THE THEME'S BREADCRUMB. The theme emits one
  //     BreadcrumbList per page with AP Computer Science A hardcoded as item 2;
  //     without one of its own, that was the only structured data on an AP
  //     Cybersecurity page.
  ok(`unit ${u} supplies its own BreadcrumbList`, /"@type": "BreadcrumbList"/.test(body));

  //  5. OUTLINE: one h1, then h2s. It used to go h1 to h3 and put its only h2
  //     at the bottom.
  const levels = [...body.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  ok(`unit ${u} outline skips no heading level`,
    levels.filter((n) => n === 1).length === 1
      && levels.every((n, i) => i === 0 || n - levels[i - 1] <= 1),
    levels.join(','));

  //  6. LABELS. "Unit N frq practice" reads as a handle nobody finished.
  if ((s.assets.frq || []).length) {
    ok(`unit ${u} labels the FRQ page in capitals`, body.includes(`Unit ${u} FRQ practice`));
  }

  //  7. NOTHING WAS LOST. A MERGE republishes the whole body, so the count of
  //     asset links is checked against the canonical data rather than assumed.
  const declared = Object.values(s.assets).flat();
  const missing = declared.filter((h) => !body.includes(`/pages/${h}`));
  ok(`unit ${u} still links all ${declared.length} of its assets`, missing.length === 0,
    missing.join(', '));
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}
