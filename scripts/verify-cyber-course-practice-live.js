'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE LIVE CHECK FOR THE PRACTICE BAND AT THE TOP OF THE COURSE.
//
//  ── WHAT IT ASSERTS, AND WHY POSITION RATHER THAN PRESENCE ─────────────────
//  "The course guide links the practice hub" was ALREADY TRUE before this
//  change, and it was true from anchor 247 of 247, at the very bottom of a
//  105 KB page. An assertion of presence would have passed on that and reported
//  a fix that had not happened. So the assertion is ordinal: the practice hub
//  must be inside the first few anchors of the body.
//
//  Measured on the served bodies 2026-09-04, before the import:
//
//      ap-cybersecurity                        72 anchors   hub ABSENT
//      ap-cybersecurity-complete-course-guide 247 anchors   hub 247 of 247
//
//  ── NO USER-AGENT ──────────────────────────────────────────────────────────
//  Through lib/storefront-fetch.js, which refuses a body it cannot prove is a
//  rendered page. The bot management inverted on 2026-09-03: a browser UA gets
//  403, and the 403 body contains none of the strings a check looks for, so a
//  negative assertion passes on it vacuously.
//
//  Run AFTER importing imports/2026-09-04e/cyber-course-practice-cta-pages.csv:
//    node scripts/verify-cyber-course-practice-live.js
// ─────────────────────────────────────────────────────────────────────────────

const sf = require('../lib/storefront-fetch.js');
const extractBody = require('./extract-live-body.js');
const gen = require('../tools/ap-cyber-ced/generate-course-practice-cta.js');

//  The band sits directly under the hero on both pages. Anything inside the
//  first handful of body anchors is above the fold on a laptop; a link at 247
//  of 247 is not, and that distinction is the entire change.
const TOP_N = 4;

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function body(handle) {
  let last;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const r = await sf.page(`/pages/${handle}`);
      return extractBody.extract(typeof r === 'string' ? r : r.body);
    } catch (e) {
      last = e;
      if (/answered 404/.test(e.message)) throw e;
      if (!/answered 429|answered 5\d\d/.test(e.message)) throw e;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw last;
}

const anchorsOf = (s) => [...s.matchAll(/href="[^"]*\/pages\/([^"'#?]+)/g)].map((m) => m[1]);

async function main() {
  console.log('\nthe practice band at the top of the AP Cybersecurity course\n');

  for (const page of gen.PAGES) {
    const b = await body(page.handle);
    const anchors = anchorsOf(b);
    const at = anchors.indexOf(gen.HUB);

    ok(`${page.handle}: the band is on the page`, b.includes(gen.MARK));
    ok(`${page.handle}: the practice hub is inside the first ${TOP_N} anchors, not at the bottom`,
      at >= 0 && at < TOP_N,
      at < 0 ? 'absent' : `${at + 1} of ${anchors.length}`);
    //  Scoped to the BAND, not to the page. Both pages already linked the
    //  practice exam from the bottom before this change, so a page-wide
    //  presence check passes pre-import and proves nothing. This is the same
    //  trap as the health check that expected a status it already returned.
    const band = b.includes(gen.MARK) ? b.slice(b.indexOf(gen.MARK), b.indexOf(gen.MARK) + 900) : '';
    ok(`${page.handle}: the band itself links both the hub and the full practice exam`,
      band.includes(`/pages/${gen.HUB}`) && band.includes(`/pages/${gen.EXAM}`));
    ok(`${page.handle}: and states the item bank's own question count`,
      band.includes(`${gen.MCQ} multiple choice`));

    //  Preservation. A MERGE republishes the whole body, so these are what rule
    //  out a band that shipped and took the page with it. All four are true
    //  before the import as well, which is what makes them preservation checks
    //  rather than decoration.
    ok(`${page.handle}: the page still has its own heading`,
      /<h1|ch-h1|hero-title/.test(b));
    ok(`${page.handle}: the unit links survived`,
      /ap-cybersecurity-unit-\d/.test(b) || /ap-cyber-unit-\d/.test(b));
    ok(`${page.handle}: the page's own stylesheet survived`, b.includes('<style'));

    await sleep(1600);
  }

  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) {
    for (const f of fails) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('the practice hub is at the top of the course, and both pages came through intact');
}

main().catch((e) => { console.error(`\nverify failed: ${e.message}`); process.exit(1); });
