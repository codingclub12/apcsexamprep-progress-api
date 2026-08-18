#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Build the AP Networking certification crosswalk.
//
//  WHAT THIS IS FOR
//    Zero of the 22 published AP Networking topic pages mention CompTIA Network+
//    or Cisco CCST, despite College Board's own alignment statement naming them.
//    This turns config/networking-cert-crosswalk.json into the block that goes on
//    each topic page, and into the coverage summary a teacher can hand upward.
//
//  WHY GENERATED AND NOT HAND-WRITTEN
//    22 blocks written by hand drift. One data file plus a generator means a
//    correction is made once and re-emitted, and it means the VALIDATION below
//    runs every time rather than never. A typo'd domain key in the data would
//    otherwise ship as a silently missing line on a live page.
//
//  IT WRITES NOTHING ON ITS OWN. Page bodies live in Shopify, not in this repo,
//  and reach the storefront through Matrixify. This prints; a human ships.
//
//  Usage:
//    node scripts/build-cert-crosswalk.js            # validate + coverage summary
//    node scripts/build-cert-crosswalk.js --html     # emit the per-topic blocks
//    node scripts/build-cert-crosswalk.js --html 3.3 # emit one topic's block
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const CFG = path.join(__dirname, '..', 'config', 'networking-cert-crosswalk.json');
const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
const { certs, topics } = cfg;

// ── validation ──────────────────────────────────────────────────────────────
// A typo'd key is the failure mode that matters: it renders as nothing on a live
// page, so nobody notices the topic quietly lost a claim. Fail loud instead.
function validate() {
  const errors = [];
  const seen = new Set();
  for (const t of topics) {
    if (seen.has(t.id)) errors.push(`duplicate topic id ${t.id}`);
    seen.add(t.id);
    for (const cert of ['netplus', 'ccst']) {
      const known = Object.keys(certs[cert].domains);
      for (const tier of ['primary', 'secondary']) {
        for (const k of (t[cert] || {})[tier] || []) {
          if (!known.includes(k)) errors.push(`topic ${t.id}: unknown ${cert} domain "${k}"`);
        }
      }
      const prim = (t[cert] || {}).primary || [];
      if (!prim.length) errors.push(`topic ${t.id}: no primary ${cert} domain`);
      const both = prim.filter((k) => ((t[cert] || {}).secondary || []).includes(k));
      if (both.length) errors.push(`topic ${t.id}: ${cert} domain "${both[0]}" listed as both primary and secondary`);
    }
  }
  const w = Object.values(certs.netplus.domains).reduce((a, d) => a + d.weight, 0);
  if (w !== 100) errors.push(`Network+ domain weights sum to ${w}, not 100`);
  return errors;
}

const name = (cert, key) => certs[cert].domains[key].name;

// ── coverage ────────────────────────────────────────────────────────────────
function coverage() {
  const out = {};
  for (const cert of ['netplus', 'ccst']) {
    const counts = {};
    for (const k of Object.keys(certs[cert].domains)) counts[k] = { primary: 0, secondary: 0 };
    for (const t of topics) {
      for (const k of (t[cert] || {}).primary || []) counts[k].primary++;
      for (const k of (t[cert] || {}).secondary || []) counts[k].secondary++;
    }
    out[cert] = counts;
  }
  return out;
}

// ── the page block ──────────────────────────────────────────────────────────
// Follows the theme's CONVENTIONS.md: scoped under one unique id, `all: initial`
// reset on the wrapper so theme styles cannot bleed in, every colour pinned with
// !important AND -webkit-text-fill-color because `all: initial` can leave a stale
// fill colour that wins in WebKit. Pure ASCII throughout.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function block(t) {
  const line = (cert, tier) => ((t[cert] || {})[tier] || []).map((k) => esc(name(cert, k)));
  const np = line('netplus', 'primary');
  const npS = line('netplus', 'secondary');
  const cc = line('ccst', 'primary');
  const ccS = line('ccst', 'secondary');

  const li = (label, main, also) => {
    const parts = [`<strong>${esc(label)}</strong>: ${main.join(', ')}`];
    if (also.length) parts.push(`<span class="cm-also">also touches ${also.join(', ')}</span>`);
    return `      <li>${parts.join(' ')}</li>`;
  };

  return `<div id="apcs-certmap">
  <style>
    #apcs-certmap { all: initial !important; display: block !important; font-family: inherit !important;
      border: 1px solid #d3dce4 !important; border-left: 3px solid #a85a32 !important;
      border-radius: 3px !important; padding: 16px 18px !important; margin: 28px 0 !important;
      background: #f7f9fb !important; }
    #apcs-certmap h3 { all: initial !important; display: block !important; font-family: inherit !important;
      font-size: 15px !important; font-weight: 700 !important; margin: 0 0 8px 0 !important;
      color: #a85a32 !important; -webkit-text-fill-color: #a85a32 !important; }
    #apcs-certmap ul { all: initial !important; display: block !important; margin: 0 !important;
      padding: 0 0 0 18px !important; list-style: disc !important; }
    #apcs-certmap li { all: initial !important; display: list-item !important; font-family: inherit !important;
      font-size: 15px !important; line-height: 1.6 !important; margin: 0 0 5px 0 !important;
      color: #16202b !important; -webkit-text-fill-color: #16202b !important; }
    #apcs-certmap strong { font-weight: 700 !important; color: #16202b !important;
      -webkit-text-fill-color: #16202b !important; }
    #apcs-certmap .cm-also { color: #46586a !important; -webkit-text-fill-color: #46586a !important; }
    #apcs-certmap p { all: initial !important; display: block !important; font-family: inherit !important;
      font-size: 13px !important; line-height: 1.5 !important; margin: 10px 0 0 0 !important;
      color: #46586a !important; -webkit-text-fill-color: #46586a !important; }
  </style>
  <h3>Where topic ${esc(t.id)} sits in industry certifications</h3>
  <ul>
${li(`${certs.netplus.label} (${certs.netplus.exam_code})`, np, npS)}
${li(`${certs.ccst.label} (${certs.ccst.exam_code})`, cc, ccS)}
  </ul>
  <p>AP Networking was developed with industry partners including Cisco. This topic maps to the certification domains above. Mapping is at domain level; consult the official exam blueprints for individual objectives.</p>
</div>`;
}

// ── main ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const errors = validate();
if (errors.length) {
  for (const e of errors) console.error(`::error title=Crosswalk invalid::${e}`);
  process.exit(1);
}

if (argv.includes('--html')) {
  const only = argv.find((a) => /^\d\.\d$/.test(a));
  const wanted = only ? topics.filter((t) => t.id === only) : topics;
  if (!wanted.length) {
    console.error(`No such topic: ${only}`);
    process.exit(1);
  }
  for (const t of wanted) {
    console.log(`<!-- ===== AP Networking ${t.id} ${t.title} ===== -->`);
    console.log(block(t));
    console.log('');
  }
  process.exit(0);
}

const cov = coverage();
console.log(`AP Networking certification crosswalk: ${topics.length} topics, validated OK\n`);

for (const cert of ['netplus', 'ccst']) {
  const c = certs[cert];
  console.log(`${c.label} (${c.exam_code})`);
  const rows = Object.entries(c.domains).map(([k, d]) => {
    const n = cov[cert][k];
    return { name: d.name, weight: d.weight, primary: n.primary, secondary: n.secondary };
  }).sort((a, b) => b.primary - a.primary);
  const uncovered = rows.filter((r) => r.primary === 0 && r.secondary === 0);
  for (const r of rows) {
    const w = r.weight === undefined ? '     ' : `${String(r.weight).padStart(3)}% `;
    console.log(`  ${w}${r.name.padEnd(30)} primary in ${String(r.primary).padStart(2)} topics, secondary in ${String(r.secondary).padStart(2)}`);
  }
  console.log(`  ${uncovered.length ? `UNCOVERED: ${uncovered.map((r) => r.name).join(', ')}` : 'Every domain is reached by at least one topic.'}`);
  if (c.exam_code === 'N10-009') {
    const reached = rows.filter((r) => r.primary > 0).reduce((a, r) => a + r.weight, 0);
    console.log(`  Domains reached as a PRIMARY mapping account for ${reached}% of the exam by weight.`);
    console.log('  (Reaching a domain is not the same as covering all of its objectives. Say the first, never the second.)');
  }
  console.log('');
}
