#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Is a missing Essential Knowledge statement a WRITING job or a CITING job?
//
//  WHY THIS CHANGES THE PLAN
//    The coverage script says 118 of 284 statements are uncited, which reads as
//    118 pieces to write. It is not. The pages are structurally identical to each
//    other: 10 to 13 h2s, 222 to 237 list items, 385 to 405 KB, whether a topic
//    sits at 33 percent or 100 percent. Completeness is not a structural
//    property, so it cannot be fixed structurally.
//
//    Comparing the vocabulary of each uncited statement against the prose already
//    on its page suggests most of them are already taught and simply not cited.
//    That turns a content project into an annotation project, which is a
//    different size of job and a different person's afternoon.
//
//  WHAT THE MEASURE IS, AND WHAT IT IS NOT
//    Term overlap is a PROXY for conceptual coverage, not proof of it. A page can
//    share vocabulary with a statement without actually teaching it, and a page
//    can teach a concept in words the framework did not use. So this triages and
//    ranks; it does not decide. Every item still needs a human to look.
//
//    It is reported in bands rather than as a score for that reason. A single
//    number would invite treating it as a verdict.
//
//  Usage:
//    node scripts/networking-gap-triage.js           # banded summary + the real gaps
//    node scripts/networking-gap-triage.js --full    # every item, per topic
//    node scripts/networking-gap-triage.js --json
// ─────────────────────────────────────────────────────────────────────────────
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ST = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'networking-framework-statements.json'), 'utf8'));
const BASE = 'https://www.apcsexamprep.com/pages/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const STOP = new Set(('the a an and or of to in on for with is are be can that this which as by from at it its their they ' +
  'you your we our not but if then than when where how what who whom whose all any each more most other some such only own ' +
  'same so too very will just should now use used using include includes including may might must into over under between ' +
  'during before after above below off out about against because while both few nor').split(' '));

const terms = (s) => new Set((s.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) || []).filter((w) => !STOP.has(w)));

function pageTerms(html) {
  const stripped = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return terms(stripped);
}

const BANDS = [
  { min: 0.80, key: 'cite', label: 'CITE     already on the page, just uncited' },
  { min: 0.60, key: 'cite-ish', label: 'CITE?    mostly present, check and cite' },
  { min: 0.40, key: 'deepen', label: 'DEEPEN   partly present, needs a paragraph' },
  { min: 0.00, key: 'write', label: 'WRITE    genuinely absent' },
];
const band = (o) => BANDS.find((b) => o >= b.min);

(async () => {
  const asJson = process.argv.includes('--json');
  const full = process.argv.includes('--full');

  let coverage;
  try {
    coverage = JSON.parse(execFileSync('node', [path.join(__dirname, 'networking-ek-coverage.js'), '--json'],
      { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
  } catch (e) {
    console.error('::error title=Could not measure coverage::' + e.message);
    process.exit(1);
  }

  const results = [];
  for (const row of coverage.rows) {
    if (!row.missing.length) continue;
    // The slug comes from the coverage run rather than a second copy of the map,
    // so the two scripts can never disagree about which page a topic is.
    const res = await fetch(BASE + row.slug, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    const pt = pageTerms(await res.text());
    for (const code of row.missing) {
      const st = ST.essential_knowledge[code];
      if (!st) continue;
      const t = terms(st.statement);
      if (!t.size) continue;
      let hit = 0;
      for (const w of t) if (pt.has(w)) hit++;
      const overlap = hit / t.size;
      results.push({
        topic: row.topic, code, overlap, band: band(overlap).key, page: st.page,
        absentTerms: [...t].filter((w) => !pt.has(w)).sort().slice(0, 8),
        statement: st.statement,
      });
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  if (asJson) { console.log(JSON.stringify(results, null, 2)); return; }

  results.sort((a, b) => a.overlap - b.overlap);
  const counts = {};
  for (const r of results) counts[r.band] = (counts[r.band] || 0) + 1;

  console.log('AP Networking gap triage');
  console.log(`${results.length} uncited statements, banded by how much of their vocabulary already appears on the page.\n`);
  for (const b of BANDS) {
    const n = counts[b.key] || 0;
    console.log(`  ${b.label.padEnd(46)} ${String(n).padStart(4)}  ${((n / results.length) * 100).toFixed(1)}%`);
  }
  const annot = (counts.cite || 0) + (counts['cite-ish'] || 0);
  console.log(`\n  ${annot} of ${results.length} (${((annot / results.length) * 100).toFixed(0)}%) look like annotation rather than authoring.`);
  console.log('  Term overlap is a proxy for coverage, not proof. Treat it as a queue, not a verdict.\n');

  const write = results.filter((r) => r.band === 'write');
  if (write.length) {
    console.log(`The genuinely absent (${write.length}), which are the real content gaps:\n`);
    for (const r of write) {
      console.log(`  ${r.code}  topic ${r.topic}  overlap ${(r.overlap * 100).toFixed(0)}%  framework p.${r.page}`);
      console.log(`     absent terms: ${r.absentTerms.join(', ')}`);
      console.log(`     ${r.statement.slice(0, 160).replace(/\n/g, ' ')}\n`);
    }
  }

  if (full) {
    const byTopic = {};
    for (const r of results) (byTopic[r.topic] = byTopic[r.topic] || []).push(r);
    for (const t of Object.keys(byTopic).sort()) {
      console.log(`${'='.repeat(60)}\nTOPIC ${t}`);
      for (const r of byTopic[t].sort((a, b) => a.overlap - b.overlap)) {
        console.log(`  ${r.band.toUpperCase().padEnd(9)} ${r.code}  ${(r.overlap * 100).toFixed(0)}%  p.${r.page}`);
      }
    }
  }
})();
