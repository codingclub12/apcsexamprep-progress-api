#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  The thinning gate, proven in the failing direction.
//
//  NOT a smoke:* script, deliberately. Its checks read what a browser PAINTS,
//  and CI never runs `npm run smoke:install`, so smoke/node_modules and the
//  Playwright it holds do not exist there. Wiring this into the auto-discovered
//  suite list would add a check that is red on every PR for a reason that has
//  nothing to do with the PR. It runs by hand before the sheet ships, in the
//  same category as the render check and the grade check.
//
//    node scripts/cyber-u1-topic12-thin-sabotage.js
//
//  Every sabotage below is a way this specific sheet could go wrong:
//
//    * a CED mention left in content, which is the whole job
//    * the framing mention removed, which would ALSO satisfy "no CED in
//      content" and is the failure a naive count would happily wave through
//    * the coverage table stripped or un-collapsed, which turns a teacher's
//      audit surface into an EK code dump in front of students
//    * a graded key moved, on a sheet that has no business touching one
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mod = require('../lib/cyber-u1-topic12-thin');
const { gate } = require('./cyber-u1-topic12-thin-csv');

const SNAP = path.join(__dirname, '..', 'shopify', 'page-snapshots',
  'ap-cybersecurity-unit-1-password-attacks.live-after-import.html');

const SABOTAGES = [
  {
    name: 'a CED mention left in the exit ticket',
    want: 'still reaches a reader',
    apply: (b) => b.replace('What happened, and which signs give it away?',
      'What happened? Map it to CED concepts.'),
  },
  {
    name: 'a CED mention left in a table cell',
    want: 'still reaches a reader',
    apply: (b) => b.replace('There are three signs, not two.', 'The CED lists all three.'),
  },
  {
    name: 'the framing mention removed as well',
    want: 'nothing tells a student where this topic sits',
    apply: (b) => b.replace('College Board Essential Knowledge Coverage', 'Coverage'),
  },
  {
    name: 'the coverage table stripped of its references',
    want: 'lost its CED references entirely',
    apply: (b) => b.replace(/CED Ref/g, 'Ref').replace(/AP Cybersecurity CED Effective/g, 'AP Cybersecurity Effective'),
  },
  {
    name: 'the coverage table served open',
    want: 'no longer collapsed',
    apply: (b) => b.replace('<div id="ek12-body" style="display:none!important;', '<div id="ek12-body" style="'),
  },
  {
    name: 'an MCQ key moved',
    want: 'MCQ keys changed',
    apply: (b) => b.replace('id="cfu-10" data-answer="D"', 'id="cfu-10" data-answer="C"'),
  },
  {
    name: 'a dtb chip renamed on one side only',
    want: 'dtb chips changed',
    apply: (b) => b.replace('data-val="targeted wordlist"', 'data-val="targeted word list"'),
  },
  {
    name: 'a CFU feedback box unhidden',
    want: 'painted on load',
    apply: (b) => b.replace('<div class="cfu-feedback" id="cfu-5-feedback" style="display:none!important;">',
      '<div class="cfu-feedback" id="cfu-5-feedback" style="">'),
  },
  {
    name: 'an exam claim reintroduced',
    want: 'a claim about what the exam does',
    apply: (b) => b.replace('There are three signs, not two.',
      'Missing the third sign is a commonly tested AP exam trap.'),
  },
  {
    name: 'new non-ASCII introduced',
    want: 'introduced non-ASCII',
    //  A real non-ASCII byte. The first version of this sabotage typed
    //  "signes", which is pure ASCII, so it tested nothing and reported the
    //  gate as broken. The suite has to be wrong loudly, not quietly.
    apply: (b) => b.replace('There are three signs, not two.', 'There are three sign\u00e9s, not two.'),
  },
];

(async () => {
  const before = fs.readFileSync(SNAP, 'utf8');
  const { body: clean } = mod.applySplices(before);

  console.log('thinning gate sabotage\n');

  const base = await gate(before, clean);
  if (base.fail.length) {
    console.log('  FAIL  the honest build does not pass its own gate');
    base.fail.forEach((f) => console.log(`        ${f}`));
    process.exit(1);
  }
  console.log('  ok    the honest build passes\n');

  let missed = 0;
  for (const s of SABOTAGES) {
    const broken = s.apply(clean);
    if (broken === clean) {
      missed++;
      console.log(`  NOT APPLIED  ${s.name}  (the anchor no longer matches; the sabotage is stale)`);
      continue;
    }
    const r = await gate(before, broken);
    const caught = r.fail.find((f) => f.includes(s.want));
    if (caught) {
      console.log(`  caught  ${s.name}`);
      console.log(`          ${caught.slice(0, 110)}`);
    } else {
      missed++;
      console.log(`  MISSED  ${s.name}`);
      console.log(`          wanted a failure mentioning ${JSON.stringify(s.want)}`);
      console.log(`          got: ${r.fail.length ? r.fail.map((f) => f.slice(0, 80)).join(' | ') : '(no failures at all)'}`);
    }
  }

  console.log('');
  if (missed) { console.error(`${missed} sabotage(s) not caught`); process.exit(1); }
  console.log(`every sabotage was caught (${SABOTAGES.length} applied)`);
})();
