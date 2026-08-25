#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SCORE A CRAWL FOR AUTO-FIX RISK. READS ONLY.
//
//  Answers one question against a real run: of what the crawl found, how much
//  could a robot have safely fixed, and what stopped the rest?
//
//  This exists to be run for a few weeks BEFORE anything is automated, so the
//  decision about what to automate is made from a record rather than an
//  estimate. It edits nothing, opens nothing, and pushes nothing.
//
//  Run:
//    node scripts/autofix-scan.js /tmp/crawl-state-new.json
//    node scripts/autofix-scan.js <state.json> --json
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const R = require('../lib/autofix-risk');

function main(argv) {
  const file = argv.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('usage: node scripts/autofix-scan.js <crawl-state.json> [--json]');
    process.exit(2);
  }
  let state;
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`\n  Could not read ${file}: ${e.message}\n`);
    process.exit(1);
  }

  const findings = Array.isArray(state.findings) ? state.findings : [];
  const rows = findings.map((f) => ({ f, a: R.assess(f) }));

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ file, total: rows.length, eligible: rows.filter((r) => r.a.eligible).length, rows }, null, 2));
    return;
  }

  const L = [];
  L.push(`### Auto-fix risk scan - ${state.started_at ? state.started_at.slice(0, 10) : file}`);
  L.push('');
  const elig = rows.filter((r) => r.a.eligible);
  L.push(`${rows.length} finding(s). **${elig.length} would have been safe to fix automatically.**`);
  L.push('');
  L.push('Nothing here was fixed. This scan scores; it does not act.');
  L.push('');

  for (const { f, a } of rows) {
    const short = String(f.url || '').replace(/^https?:\/\/[^/]+/, '');
    L.push(`- \`${f.tier || '?'}\` **${f.kind}** ${short}`);
    L.push(`  - ${R.verdict(a)}`);
    if (a.note) L.push(`  - ${a.note}`);
  }
  L.push('');

  // The breakdown is the actually useful output over weeks: it names what is
  // BLOCKING automation, which is what tells you where to invest.
  const byReason = new Map();
  for (const { a } of rows.filter((r) => !r.a.eligible)) {
    const key = a.fix_surface ? `fix lands on ${a.fix_surface}` : a.reason;
    byReason.set(key, (byReason.get(key) || 0) + 1);
  }
  if (byReason.size) {
    L.push('**What is blocking the rest:**');
    L.push('');
    for (const [why, n] of Array.from(byReason.entries()).sort((a, b) => b[1] - a[1])) {
      L.push(`- ${n}x ${why}`);
    }
  }
  console.log(L.join('\n'));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { main };
