#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  How much of the AP Networking framework do the published pages actually cite?
//
//  WHY THIS REPLACED A GUESS
//    The 2026-08-17 depth audit could only report FLOORS: apcentral.collegeboard.org
//    was egress-blocked, so the framework PDF could not be read and there was no
//    denominator. It inferred 53 missing Essential Knowledge codes from breaks in
//    the sequences the pages themselves cited.
//
//    With the framework readable, the real number is 118 of 284. The floor was a
//    genuine floor, and it was less than half the truth. That is the difference
//    between "at least this bad" and "this bad", and it is why the denominator
//    was worth waiting for.
//
//  WHERE THE DENOMINATOR COMES FROM
//    config/networking-framework-ek.json, extracted from the published PDF and
//    pinned by sha256. Re-extract when ced-watch.yml reports that PDF changed.
//    Keeping the codes as data rather than parsing the PDF on every run means this
//    needs no PDF library and no network trip to College Board.
//
//  Usage:
//    node scripts/networking-ek-coverage.js          # fetch live pages, report
//    node scripts/networking-ek-coverage.js --json   # machine-readable
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const FW = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'networking-framework-ek.json'), 'utf8'));
const BASE = 'https://www.apcsexamprep.com/pages/';
const SLUGS = {
  '1.1': 'ap-networking-lesson-1-1-troubleshooting-slow-device',
  '1.2': 'ap-networking-lesson-1-2-connecting-optimizing-device',
  '1.3': 'ap-networking-lesson-1-3-security-needs-device',
  '1.4': 'ap-networking-lesson-1-4-securing-my-device',
  '2.1': 'ap-networking-lesson-2-1-troubleshooting-soho-network',
  '2.2': 'ap-networking-lesson-2-2-mac-ip-addresses',
  '2.3': 'ap-networking-lesson-2-3-upgrading-soho-network',
  '2.4': 'ap-networking-lesson-2-4-media-server-ai-network',
  '2.5': 'ap-networking-lesson-2-5-soho-security-vulnerabilities',
  '2.6': 'ap-networking-lesson-2-6-firewalls-network-segmentation',
  '3.1': 'ap-networking-lesson-3-1-planning-network-devices',
  '3.2': 'ap-networking-lesson-3-2-switching-network-topologies',
  '3.3': 'ap-networking-lesson-3-3-configuring-verifying-access',
  '3.4': 'ap-networking-lesson-3-4-network-segmentation-security',
  '3.5': 'ap-networking-lesson-3-5-firewalls-traffic-filtering',
  '3.6': 'ap-networking-lesson-3-6-troubleshooting-segmented-lan',
  '4.1': 'ap-networking-lesson-4-1-network-failures-cia',
  '4.2': 'ap-networking-lesson-4-2-protocols-osi-tcp-ip-models',
  '4.3': 'ap-networking-lesson-4-3-cli-commands',
  '4.4': 'ap-networking-lesson-4-4-routing-data-paths',
  '4.5': 'ap-networking-lesson-4-5-monitoring-defending-network',
  '4.6': 'ap-networking-lesson-4-6-ipv6-reliability-growth',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function citedCodes(topic, slug) {
  const res = await fetch(BASE + slug, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const own = new Set();
  for (const m of html.matchAll(/\b([1-4]\.[1-6]\.[A-F]\.\d+)\b/g)) {
    if (m[1].startsWith(`${topic}.`)) own.add(m[1]);
  }
  return own;
}

(async () => {
  const json = process.argv.includes('--json');
  const rows = [];
  const failures = [];

  for (const [topic, slug] of Object.entries(SLUGS)) {
    try {
      const cited = await citedCodes(topic, slug);
      const framework = new Set(FW.by_topic[topic] || []);
      // A cited code that is NOT in the framework is the alarming case: it means
      // a page invented an identifier. Reported separately, never folded into
      // coverage, because it is a correctness problem rather than a gap.
      const stray = [...cited].filter((c) => !framework.has(c));
      const hit = [...cited].filter((c) => framework.has(c));
      const missing = [...framework].filter((c) => !cited.has(c));
      rows.push({ topic, slug, framework: framework.size, cited: hit.length, missing, stray });
    } catch (e) {
      failures.push({ topic, error: e.message });
    }
    await sleep(400);
  }

  if (failures.length === rows.length + failures.length) {
    console.error('::error title=Coverage read nothing::Every page fetch failed. Nothing was measured.');
    process.exit(1);
  }

  const totFw = rows.reduce((a, r) => a + r.framework, 0);
  const totCited = rows.reduce((a, r) => a + r.cited, 0);
  const strays = rows.filter((r) => r.stray.length);

  if (json) {
    console.log(JSON.stringify({ source: FW.source, rows, failures, totals: { framework: totFw, cited: totCited } }, null, 2));
    process.exit(0);
  }

  console.log(`AP Networking Essential Knowledge coverage`);
  console.log(`Denominator: ${FW.totals.essential_knowledge} EK codes from the framework PDF (sha256 ${FW.source.sha256.slice(0, 12)}, extracted ${FW.source.extracted_on})\n`);
  console.log('topic  framework  cited  coverage   missing');
  for (const r of rows) {
    const pct = r.framework ? (r.cited / r.framework) * 100 : 0;
    const show = r.missing.slice(0, 6).join(' ') + (r.missing.length > 6 ? ` ... +${r.missing.length - 6}` : '');
    console.log(`${r.topic.padEnd(6)} ${String(r.framework).padStart(9)} ${String(r.cited).padStart(6)} ${pct.toFixed(0).padStart(8)}%   ${show}`);
  }
  const byUnit = {};
  for (const r of rows) {
    const u = r.topic[0];
    byUnit[u] = byUnit[u] || [0, 0];
    byUnit[u][0] += r.framework; byUnit[u][1] += r.cited;
  }
  console.log('\nBy unit:');
  for (const u of Object.keys(byUnit).sort()) {
    const [f, c] = byUnit[u];
    console.log(`  Unit ${u}: ${String(c).padStart(3)}/${String(f).padEnd(3)} = ${((c / f) * 100).toFixed(0)}%`);
  }
  console.log(`\nOVERALL: ${totCited}/${totFw} = ${((totCited / totFw) * 100).toFixed(1)}%   (${totFw - totCited} codes uncited)`);
  console.log(strays.length
    ? `\nWARNING: pages cite ${strays.reduce((a, r) => a + r.stray.length, 0)} code(s) absent from the framework:\n` +
      strays.map((r) => `   ${r.topic}: ${r.stray.join(' ')}`).join('\n')
    : '\nNo page cites a code absent from the framework. Every identifier on the site is real.');
  if (failures.length) {
    console.log('\nUnreachable this run (excluded from the totals above):');
    for (const f of failures) console.log(`   ${f.topic}: ${f.error}`);
  }
})();
