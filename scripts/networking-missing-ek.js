#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  The authoring worklist: which Essential Knowledge statements are missing from
//  the published AP Networking pages, and what each one actually says.
//
//  WHY THIS EXISTS
//    networking-ek-coverage.js answers "how much is missing" (118 of 284).
//    That is a number to worry about, not a thing to do. This turns it into the
//    work: the exact text of every uncited statement, grouped by topic, worst
//    topic first, each with its page number in the framework PDF.
//
//  IT DOES NOT WRITE CONTENT. It says what has to be covered. Page bodies live
//  in Shopify and ship through Matrixify, which stays a human step.
//
//  Usage:
//    node scripts/networking-missing-ek.js            # whole worklist
//    node scripts/networking-missing-ek.js 1.4        # one topic
//    node scripts/networking-missing-ek.js --unit 1   # one unit
//    node scripts/networking-missing-ek.js --json
// ─────────────────────────────────────────────────────────────────────────────
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ST = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'networking-framework-statements.json'), 'utf8'));

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const unitIdx = argv.indexOf('--unit');
const unit = unitIdx >= 0 ? argv[unitIdx + 1] : null;
const topic = argv.find((a) => /^\d\.\d$/.test(a)) || null;

// Coverage is measured live rather than cached, so this worklist shrinks as
// pages are authored instead of reporting a stale snapshot forever.
let coverage;
try {
  const out = execFileSync('node', [path.join(__dirname, 'networking-ek-coverage.js'), '--json'], {
    encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
  coverage = JSON.parse(out);
} catch (e) {
  console.error('::error title=Could not measure coverage::' + e.message);
  console.error('This needs to reach apcsexamprep.com to see what the pages currently cite.');
  process.exit(1);
}

let rows = coverage.rows.filter((r) => r.missing.length);
if (topic) rows = rows.filter((r) => r.topic === topic);
if (unit) rows = rows.filter((r) => r.topic.startsWith(`${unit}.`));
rows.sort((a, b) => a.cited / a.framework - b.cited / b.framework);

if (asJson) {
  console.log(JSON.stringify(rows.map((r) => ({
    topic: r.topic,
    coverage: r.cited / r.framework,
    missing: r.missing.map((c) => ({ code: c, ...ST.essential_knowledge[c] })),
  })), null, 2));
  process.exit(0);
}

const total = rows.reduce((a, r) => a + r.missing.length, 0);
console.log(`AP Networking authoring worklist`);
console.log(`${total} uncited Essential Knowledge statements across ${rows.length} topics, worst coverage first.`);
console.log(`Statement text from the framework PDF, sha256 ${ST.source.sha256.slice(0, 12)}.\n`);

for (const r of rows) {
  const pct = ((r.cited / r.framework) * 100).toFixed(0);
  console.log(`${'='.repeat(72)}`);
  console.log(`TOPIC ${r.topic}   ${r.cited}/${r.framework} cited (${pct}%)   ${r.missing.length} to author`);
  console.log(`${'='.repeat(72)}`);
  for (const code of r.missing) {
    const e = ST.essential_knowledge[code];
    if (!e) { console.log(`\n  ${code}  (no statement on file)`); continue; }
    const warn = e.verbatim === false ? '  [word order disturbed by inline code, read the page]' : '';
    console.log(`\n  ${code}   framework p.${e.page}${warn}`);
    for (const line of wrap(e.statement, 68)) console.log(`     ${line}`);
  }
  console.log('');
}

function wrap(s, w) {
  const out = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const word of para.trim().split(/\s+/)) {
      if ((line + ' ' + word).trim().length > w) { out.push(line.trim()); line = word; }
      else line += ' ' + word;
    }
    if (line.trim()) out.push(line.trim());
  }
  return out;
}
