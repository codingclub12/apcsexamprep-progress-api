'use strict';
// -----------------------------------------------------------------------------
//  STATUS CODES FOR EXACTLY THE PATHS AND TARGETS OF A REDIRECTS SHEET.
//
//  The house rule is that every Target is verified 200 before its row is
//  written. That verification has to be a separate, timestamped artifact rather
//  than something the generator does inline, for two reasons:
//
//    a generator that fetches while it writes produces a sheet that is a
//    function of the network at that instant, and nobody can re-read it later
//    to see what was actually observed;
//
//    the same pass has to record the PATH's status too, because a Path that
//    still answers 200 is a redirect that cannot fire. Shopify: "If the URL
//    still loads a valid webpage, then the URL redirect won't work."
//
//  redirect: 'manual', so a 301 is reported as a 301 rather than followed and
//  reported as the 200 at the end of it. Following would have made a path that
//  ALREADY redirects look like a live page.
//
//  Single threaded with a pause. Board item #79 records 46 pages returning 429
//  during a parallel crawl of this storefront, and Cloudflare answers 1010 to a
//  non-browser User-Agent. Reads only. Zero PII.
//
//    node scripts/verify-redirect-targets.js --paths <file> --out <verification.json>
// -----------------------------------------------------------------------------
const fs = require('fs');

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const list = opt('paths'), out = opt('out');
  const delay = Number(opt('delay', '1200'));
  if (!list || !out) { console.error('need --paths and --out'); process.exit(2); }
  const paths = [...new Set(fs.readFileSync(list, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean))];

  const checks = [];
  for (const p of paths) {
    let res, html = '';
    try {
      res = await fetch(STORE + p, { headers: { 'User-Agent': UA }, redirect: 'manual' });
      html = await res.text();
    } catch (e) {
      checks.push({ path: p, status: 0, why: e.message });
      console.log(`  ERR  ${p}  ${e.message}`);
      await sleep(delay); continue;
    }
    const rec = { path: p, status: res.status, bytes: Buffer.byteLength(html) };
    const loc = res.headers.get('location');
    if (loc) rec.location = loc;
    //  A Cloudflare interstitial is a 200 that is not the page. Recording it as
    //  200 would let a challenged Target pass as verified.
    if (/cf-browser-verification|Just a moment|Attention Required|Error 1010/i.test(html)) {
      rec.status = 0; rec.why = 'Cloudflare challenge, so this is not the page';
    }
    checks.push(rec);
    console.log(`  ${String(rec.status).padStart(3)}  ${p}${loc ? '  -> ' + loc : ''}`
      + `  ${rec.bytes} bytes${rec.why ? '  (' + rec.why + ')' : ''}`);
    await sleep(delay);
  }

  fs.writeFileSync(out, JSON.stringify({
    at: new Date().toISOString(), store: STORE, method: 'GET, redirect: manual', checks,
  }, null, 2) + '\n');
  console.log(`\n  ${checks.length} checked -> ${out}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
