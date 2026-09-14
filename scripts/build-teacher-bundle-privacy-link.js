'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK THE STUDENT DATA PRIVACY PAGE FROM THE TEACHER BUNDLE PRODUCTS
//
//  Four products, one appended block each. MERGE overwrites a live body with no
//  undo, so this generator is built around three properties rather than one:
//
//    APPEND ONLY   the stored body is a byte-exact PREFIX of what ships. The
//                  check below asserts it rather than trusting the string
//                  concatenation above it.
//    IDEMPOTENT    a marker comment means re-running never double-appends, and
//                  re-importing a stale sheet cannot stack two copies.
//    REVERSIBLE    a ROLLBACK sheet carrying the untouched bodies is written in
//                  the same pass, so an import that reads wrong on the live page
//                  is one import away from gone.
//
//  The body comes from /products/<handle>.json, which is what Shopify STORES.
//  The rendered page is the wrong source here: Cloudflare rewrites addresses at
//  render time, and importing a rendered body makes that rewrite permanent. That
//  hazard is why lib/storefront-fetch.js has cloudflareRewritten(), and the
//  cheapest way to not trip it is to never read a rendered body in a generator.
//
//    node scripts/build-teacher-bundle-privacy-link.js          write the sheets
//    node scripts/build-teacher-bundle-privacy-link.js --check  re-verify, no write
//
//  Zero PII. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'matrixify', 'teacher-bundle-privacy-link-products.csv');
const ROLLBACK = path.join(ROOT, 'matrixify', 'teacher-bundle-privacy-link-ROLLBACK-products.csv');

const HANDLES = [
  'ap-csa-teacher-superpack',
  'ap-csp-teacher-superpack',
  'ap-cybersecurity-founding-teacher-bundle',
  'ap-networking-teacher-bundle',
];

const MARKER = 'apcs-sdp-link';
const PAGE_PATH = '/pages/student-data-privacy';

//  The block appended to each description. Written for a department head who is
//  about to be asked by their district what this tool collects, which is the
//  person who actually blocks a bundle purchase.
const BLOCK = [
  ``,
  `<!-- ${MARKER}: appended by scripts/build-teacher-bundle-privacy-link.js. Regenerate, do not hand edit. -->`,
  `<div class="${MARKER}" style="margin:28px 0 0;padding:16px 18px;background:#f9fafb;border-left:3px solid #2D6BC4;font-size:15px;line-height:1.6;">`,
  `<strong>Buying this for a school or district?</strong> `,
  `Students join with a display name and a four digit PIN. There is no student email address and no student account to provision. `,
  `<a href="${PAGE_PATH}">Read what we collect, who processes it, and how to have it deleted</a>, `,
  `or send us your district's data privacy agreement and we will sign it.`,
  `</div>`,
].join('\n');

function cell(s) {
  return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
}

//  A product JSON that parses AND names the handle we asked for is a positive
//  marker a bot challenge cannot fake, which is the same guarantee page() gives
//  for a rendered body. An interstitial is not JSON and fails here loudly.
function storedBody(handle) {
  const r = sf.raw(`/products/${handle}.json`);
  if (r.code !== '200') throw new Error(`${handle}: HTTP ${r.code}`);
  let j;
  try { j = JSON.parse(r.body); }
  catch (e) { throw new Error(`${handle}: response is not JSON (${r.body.length} bytes), probably a challenge`); }
  const p = j && j.product;
  if (!p || p.handle !== handle) throw new Error(`${handle}: JSON did not describe this product`);
  return { handle, title: p.title, body: p.body_html || '' };
}

function withBlock(body) {
  if (body.includes(MARKER)) return body;
  return body + '\n' + BLOCK + '\n';
}

function sheet(rows, key) {
  const header = ['Handle', 'Command', 'Body HTML'];
  const lines = [header.map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r[key]].map(cell).join(','));
  return '﻿' + lines.join('\n') + '\n';
}

function main() {
  const check = process.argv.includes('--check');
  const rows = [];
  for (const h of HANDLES) {
    const p = storedBody(h);
    const next = withBlock(p.body);
    rows.push({ handle: h, title: p.title, before: p.body, after: next });
  }

  //  The three properties, asserted rather than assumed.
  let bad = 0;
  for (const r of rows) {
    const alreadyLinked = r.before.includes(MARKER);
    const appendOnly = r.after.startsWith(r.before);
    const idempotent = withBlock(r.after) === r.after;
    const linked = r.after.includes(PAGE_PATH);
    const grew = r.after.length - r.before.length;
    const ok = appendOnly && idempotent && linked;
    if (!ok) bad++;
    console.log(`  [${ok ? 'OK  ' : 'FAIL'}] ${r.handle}`);
    console.log(`         ${r.before.length}b -> ${r.after.length}b (+${grew})`
      + `  append-only=${appendOnly} idempotent=${idempotent} links=${linked}`
      + (alreadyLinked ? '  ALREADY LINKED, sheet is a no-op for this product' : ''));
  }
  if (bad) {
    console.error(`\n${bad} product(s) failed the append-only checks. Nothing written.`);
    process.exit(1);
  }

  const csv = sheet(rows, 'after');
  const rb = sheet(rows, 'before');

  if (check) {
    for (const [f, want] of [[OUT, csv], [ROLLBACK, rb]]) {
      if (!fs.existsSync(f)) { console.error(`FAIL: ${path.relative(ROOT, f)} missing`); process.exit(1); }
      if (fs.readFileSync(f, 'utf8') !== want) {
        console.error(`FAIL: ${path.relative(ROOT, f)} no longer matches the live product bodies.`);
        console.error('      A product description changed since this sheet was generated. Regenerate.');
        process.exit(1);
      }
    }
    console.log('\nOK: both sheets still match the live product bodies');
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, csv, 'utf8');
  fs.writeFileSync(ROLLBACK, rb, 'utf8');
  console.log(`\nwrote ${path.relative(ROOT, OUT)}  (${Buffer.byteLength(csv)}b)`);
  console.log(`wrote ${path.relative(ROOT, ROLLBACK)}  (${Buffer.byteLength(rb)}b)  import this to undo`);
}

if (require.main === module) main();
module.exports = { HANDLES, MARKER, PAGE_PATH, BLOCK, withBlock, storedBody, sheet };
