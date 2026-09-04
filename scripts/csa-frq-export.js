#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Write config/csa-frq-kit.json from seed/csa-frq, for the teacher kit.
//
//    node scripts/csa-frq-export.js            # write
//    node scripts/csa-frq-export.js --check    # refuse a drift
//
//  WHY A BRIDGE FILE AND NOT A DIRECT READ. The 53 free-response items are
//  authored in JavaScript, under seed/csa-frq/unit<N>.js, because the live
//  exercise pages and the auto-grader read them there. The teacher kit is
//  Python. Rather than have a human retype 53 items, or have the kit shell out
//  to node mid-build, this exports exactly the fields the printable documents
//  need and the Python side reads the JSON. Same shape as
//  config/csa-slide-days.json and for the same reason.
//
//  IT EXPORTS A SUBSET ON PURPOSE. The live grader needs `mutants`, `seo` and
//  the hidden-case flags; a printed FRQ packet does not, and shipping the
//  hidden cases into a student-facing pipeline is how a hidden case stops
//  being hidden. Only what a teacher prints comes across.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const frq = require('../seed/csa-frq');

const OUT = path.join(__dirname, '..', 'config', 'csa-frq-kit.json');

// The four free-response types the CSA exam actually uses, spelled the way
// College Board names them, so a teacher recognises the label.
const TYPE_LABEL = {
  'methods-and-control': 'Methods and Control Structures',
  'class': 'Class',
  'array-arraylist': 'Array / ArrayList',
  'two-d-array': '2D Array',
};

function main() {
  const check = process.argv.includes('--check');
  const items = frq.all().slice().sort((a, b) => {
    const [ua, la] = String(a.lesson).split('.').map(Number);
    const [ub, lb] = String(b.lesson).split('.').map(Number);
    return (ua - ub) || (la - lb);
  });

  const out = {};
  for (const it of items) {
    if (!TYPE_LABEL[it.frqType]) {
      console.error(`unknown frqType ${it.frqType} on ${it.lesson}`);
      process.exit(1);
    }
    out[it.lesson] = {
      lesson: it.lesson,
      title: it.title,
      name: it.name,
      frqType: it.frqType,
      frqTypeLabel: TYPE_LABEL[it.frqType],
      brief: it.brief || '',
      given: it.given || '',
      parts: (it.parts || []).map((p) => ({ label: p.label, text: p.text })),
      // `task` is a string on some items and an array on others.
      // Normalized to a list here rather than split on commas at render
      // time, which would have broken every requirement containing one.
      task: Array.isArray(it.task) ? it.task.filter(Boolean)
            : (it.task ? [it.task] : []),
      starter: it.starter || '',
      reference: it.reference || '',
      hints: it.hints || [],
      // Only the visible cases. A hidden case exists so a student cannot code
      // to it, and printing it in a packet would defeat that.
      sampleCases: (it.cases || []).filter((c) => !c.hidden)
        .map((c) => ({ stdin: c.stdin, part: c.part })),
    };
  }

  const payload = {
    _comment: [
      'GENERATED FILE. Do not hand-edit.',
      'Regenerate with: node scripts/csa-frq-export.js',
      'Verify with:     npm run smoke:csafrqkit',
      '',
      'One free-response item per AP CSA lesson, exported from seed/csa-frq for',
      'the printable teacher kit. Hidden test cases are deliberately excluded.',
    ],
    source: 'seed/csa-frq/unit{1,2,3,4}.js',
    count: Object.keys(out).length,
    items: out,
  };
  const text = JSON.stringify(payload, null, 2) + '\n';

  if (check) {
    if (!fs.existsSync(OUT)) { console.error(`${OUT} missing; run without --check`); process.exit(1); }
    if (fs.readFileSync(OUT, 'utf8') !== text) {
      console.error('config/csa-frq-kit.json is out of date with seed/csa-frq. '
                    + 'Run: node scripts/csa-frq-export.js');
      process.exit(1);
    }
    console.log(`csa-frq-kit.json matches seed/csa-frq (${payload.count} items)`);
    return;
  }
  fs.writeFileSync(OUT, text);
  const per = {};
  for (const k of Object.keys(out)) {
    const u = k.split('.')[0];
    per[u] = (per[u] || 0) + 1;
  }
  console.log(`wrote ${path.relative(process.cwd(), OUT)}  (${payload.count} items)`);
  for (const u of Object.keys(per).sort()) console.log(`  unit ${u}: ${per[u]}`);
}

main();
