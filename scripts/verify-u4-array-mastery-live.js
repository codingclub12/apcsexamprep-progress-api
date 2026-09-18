'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Board 352. Run this BEFORE the import and again AFTER.
//
//  ── WHY BEFORE ─────────────────────────────────────────────────────────────
//  A generated sheet goes stale. On 2026-09-08 a sheet repointing the Command
//  Center's Unit 3 links sat unimported for a day while somebody renumbered
//  that page onto CED lesson ids, and importing it would have MERGED the older
//  body over the better one with nothing anywhere saying so. So the pre-import
//  run answers one question: is the defect this sheet fixes still there? A
//  clean PRE run means DELETE THE SHEET AND REBUILD, not import it anyway.
//
//  ── WHAT IT ASSERTS, AND WHY NOT THE EASY THING ────────────────────────────
//  The easy check is "does the hub mention the handle". That would pass on a
//  sheet that added the card and also mangled the deck. So it asks four:
//
//    1. the target page itself still serves a real rendered page
//    2. the hub links it exactly ONCE from its STORED body, not from chrome
//    3. the deck holds exactly five cards, so nothing was duplicated or lost
//    4. the four cards that were already there are all still there
//
//  Assertion 2 reads the stored body via /pages/<handle>.json on purpose. The
//  rendered page carries ~135 mega-menu anchors, and grepping THAT for a
//  handle reports it present when it lives only in the nav. That mistake was
//  made on this task on 2026-09-10.
//
//  Zero PII: public page content only, and no User-Agent is sent.
// ─────────────────────────────────────────────────────────────────────────────
const sf = require('../lib/storefront-fetch');

const HUB = 'ap-csa-unit-4-course';
const TARGET = 'ap-csa-array-mastery-interactive-practice';
const INCUMBENTS = [
  'ap-csa-unit-4-data-collections-study-guide',
  'ap-csa-test-builder',
  'ap-csa-frqs-by-topic',
  'ap-computer-science-a-tutor',
];

const results = [];
const assert = (name, cond, detail) => { results.push({ name, ok: !!cond, detail }); };

(function main() {
  const phase = process.argv.includes('--post') ? 'POST' : 'PRE';

  let target = null;
  try {
    const r = sf.page('/pages/' + TARGET);
    target = r.body;
    assert('target page serves a real rendered page', sf.looksReal(r.body),
      `code ${r.code}, ${r.body.length} bytes`);
  } catch (e) {
    assert('target page serves a real rendered page', false, e.message);
  }
  if (target) {
    //  The reason this page is worth rescuing: it is not a stub.
    const editors = (target.match(/id="editor\d+"/g) || []).length;
    assert('target still carries its 7 practice editors', editors === 7, `found ${editors}`);
  }

  let body = null;
  try {
    const p = sf.pageBody(HUB);
    body = p.body_html;
    console.log(`  ${HUB} stored body: ${body.length} chars, updated_at ${p.updated_at}`);
  } catch (e) {
    assert('hub stored body readable', false, e.message);
  }

  if (body) {
    const inbound = (body.match(new RegExp('/pages/' + TARGET, 'g')) || []).length;
    //  ANCHORS, not raw occurrences of the class token. The string
    //  u4-resource-card appears four times in the page's own CSS as well, so a
    //  naive count reads 8 for a four-card deck. The generator's matching
    //  guard is a DELTA, so the CSS cancels out there; an absolute count here
    //  has to be specific about what it is counting.
    const cards = (body.match(/<a class="u4-resource-card"/g) || []).length;
    if (phase === 'POST') {
      assert('hub links the target exactly once', inbound === 1, `found ${inbound}`);
      assert('resource deck holds five cards', cards === 5, `found ${cards}`);
    } else {
      //  PRE: the defect must still be present, or this sheet is stale.
      assert('the defect is still live (hub does NOT link the target)', inbound === 0,
        inbound > 0 ? 'ALREADY LINKED. This sheet is stale: delete it and rebuild.' : 'not linked');
      assert('resource deck holds the four cards this sheet extends', cards === 4, `found ${cards}`);
    }
    for (const h of INCUMBENTS) {
      assert(`incumbent card survives: ${h}`, body.includes('/pages/' + h), 'missing');
    }
  }

  console.log(`\nVERIFY u4 array mastery [${phase}]`);
  let bad = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : '  <- ' + r.detail}`);
    if (!r.ok) bad++;
  }
  console.log(`\n  ${results.length - bad} of ${results.length} assertions passed`);
  if (bad) process.exit(1);
})();
