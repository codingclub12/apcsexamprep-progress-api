#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  FETCH STORED PAGE BODIES TO DISK.
//
//  The linking pass has to rewrite live page bodies, and a body has to come off
//  the storefront rather than out of this repo, which is not its source of
//  truth. Two ways to get one:
//
//    Admin API      authoritative, and needs a token this environment does not
//                   carry. Also 20 KB per page through a transcription step.
//    rendered page  scripts/extract-live-body.js recovers page.content verbatim
//                   from the rte wrapper. Proven byte-exact against cc3.csv on
//                   the hardest page available, and re-verified here against
//                   ap-csa-2d-array-cheat-sheet read from the Admin API.
//
//  This uses the second, and writes each body to its own file so that no page
//  body ever passes through a model's context. That is a correctness measure
//  before it is an economy: a body that is read, summarised and retyped is a
//  body with a chance of being altered, and nothing downstream would see it.
//
//  Same throttle as every other crawler here. Reads only.
//
//    node scripts/fetch-page-bodies.js --handles handles.txt --dir bodies/
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { extract } = require('./extract-live-body');
const C = require('../lib/site-crawl');

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; apcse-link-graph/1.0) Chrome/120.0.0.0 Safari/537.36';

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const HANDLES = opt('handles', '');
const DIR = opt('dir', '');
const DELAY = Number(opt('delay', '900'));
const MAX_MINUTES = Number(opt('max-minutes', '40'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let delay = DELAY, strikes = 0, clean = 0;

async function main() {
  if (!HANDLES || !DIR) { console.error('need --handles and --dir'); process.exit(1); }
  fs.mkdirSync(DIR, { recursive: true });
  const handles = fs.readFileSync(HANDLES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  const deadline = Date.now() + MAX_MINUTES * 60000;

  let got = 0, skipped = 0, failed = 0;
  const failures = [];
  for (const handle of handles) {
    const out = path.join(DIR, `${handle}.html`);
    if (fs.existsSync(out)) { skipped++; continue; }
    if (Date.now() > deadline) { console.error('wall clock reached'); break; }
    if (strikes >= 5) { console.error('throttled five times, stopping'); break; }

    let res;
    try {
      res = await fetch(`${STORE}/pages/${handle}`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    } catch (e) {
      failures.push({ handle, why: e.message }); failed++; await sleep(delay); continue;
    }
    const html = await res.text();
    if (res.status === 429 || res.status === 503 || C.looksLikeChallenge(html, res.status)) {
      strikes++; clean = 0; delay = Math.min(delay * 2, 30000);
      failures.push({ handle, why: `throttled ${res.status}` }); failed++; await sleep(delay); continue;
    }
    if (res.status !== 200) { failures.push({ handle, why: `HTTP ${res.status}` }); failed++; await sleep(delay); continue; }
    clean++;
    if (clean >= 10 && delay > DELAY) { delay = Math.max(DELAY, Math.floor(delay / 2)); clean = 0; }

    try {
      const body = extract(html);
      //  ── CLOUDFLARE EMAIL OBFUSCATION MAKES A RENDERED BODY A LIE ─────────
      //  Cloudflare rewrites every mailto and every plain-text address at
      //  render time into
      //      <span class="__cf_email__" data-cfemail="HEX">[email protected]</span>
      //  with a cipher key that ROTATES per render, and restores it in the
      //  browser with its own script. So the rendered HTML does not contain the
      //  address at all, and a body extracted from it is not a faithful copy of
      //  what Shopify stores.
      //
      //  Importing one would replace the real address with a dead placeholder
      //  permanently. On this site that is not cosmetic: the AP Cybersecurity
      //  phishing exercises are BUILT on lookalike domains the student is asked
      //  to spot, and 24 live pages carry them. Writing
      //  'do-not-reply@g00gle.com' out as '[email protected]' does not damage
      //  the page, it deletes the question.
      //
      //  The cipher is trivially reversible, and reversing it is still the
      //  wrong move: what the ORIGINAL markup was (a mailto anchor, a bare
      //  span, anchor text that may or may not have been the address) cannot be
      //  recovered, only guessed. This repo refuses rather than guesses, so the
      //  page is dropped and named. Its body has to come from the Admin API.
      if (/__cf_email__|\/cdn-cgi\/l\/email-protection/.test(body)) {
        throw new Error('Cloudflare email obfuscation present, so this rendered body is not the stored body');
      }
      // A body that came back suspiciously short is a truncated render, not a
      // short page. Writing it would feed the generator a body that is missing
      // its own stylesheet, and the sheet would flatten the live page.
      if (Buffer.byteLength(body) < 500) throw new Error(`only ${Buffer.byteLength(body)} bytes`);
      fs.writeFileSync(out, body);
      got++;
    } catch (e) {
      failures.push({ handle, why: e.message }); failed++;
    }
    if ((got + failed) % 25 === 0) console.error(`  ${got} ok, ${failed} failed, ${handles.length - got - failed - skipped} left`);
    await sleep(delay);
  }

  console.error(`\n${got} bodies written, ${skipped} already present, ${failed} failed`);
  if (failures.length) {
    console.error('\nfailures:');
    for (const f of failures.slice(0, 40)) console.error(`  ${f.handle}: ${f.why}`);
    fs.writeFileSync(path.join(DIR, '_failures.json'), JSON.stringify(failures, null, 2));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
