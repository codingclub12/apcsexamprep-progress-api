'use strict';
// -----------------------------------------------------------------------------
//  WHICH LIVE PAGES STORE NO AUTHORED BODY?
//
//  ── THE MISTAKE THIS IS BUILT NOT TO MAKE ───────────────────────────────────
//  A rendered page is mostly theme. /pages/ap-csa renders 354 KB and reads as a
//  real page: it has an H1, a contact form, a footer, a nav. Measuring rendered
//  bytes, or even rendered <main> text, therefore reports the THEME and calls it
//  content. The only honest question is what the page itself stores.
//
//  So this does not invent a measurement. It goes through the function whose job
//  is already exactly this: scripts/extract-live-body.js recovers page.content
//  verbatim out of the theme's rte wrapper, and was proved byte-exact against
//  the CSV that was imported into csp-command-center. Stored body length is the
//  discriminator; everything else here is context printed alongside it.
//
//  ── THREE OUTCOMES, DELIBERATELY NOT TWO ────────────────────────────────────
//    stored     the rte wrapper was found and bounded. `stored_chars` is exact.
//    template   no rte wrapper. That is a DIFFERENT PAGE TEMPLATE, not an empty
//               page, and calling it empty is the failure this repo keeps
//               repeating. Reported as unresolved, never as a finding.
//    http       non-200, or a Cloudflare challenge. Reported, never guessed at.
//
//  ── THROTTLE ────────────────────────────────────────────────────────────────
//  Board item #79 records 46 pages returning 429 during a parallel crawl of this
//  storefront, and Cloudflare answers 1010 to a non-browser User-Agent. Single
//  threaded, browser UA, adaptive backoff. Reads only. Zero PII.
//
//    node scripts/empty-page-sweep.js --handles <file> --out <file.jsonl>
// -----------------------------------------------------------------------------
const fs = require('fs');
const { extract } = require('./extract-live-body');
const C = require('../lib/site-crawl');

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const HANDLES = opt('handles', '');
const OUT = opt('out', '');
const DELAY = Number(opt('delay', '800'));
const MAX_MINUTES = Number(opt('max-minutes', '90'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Authored TEXT inside the stored body, with tags gone and whitespace collapsed.
// A body of `<p>&nbsp;</p>` stores 14 characters and says nothing, so raw stored
// length alone would miss it. Entities are decoded for the common cases only:
// the point is to separate "nothing" from "something", not to render.
function authoredText(body) {
  let t = C.visibleText(body);
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, 'x')
       .replace(/&[a-zA-Z]+;/g, 'x');
  return t.replace(/\s+/g, ' ').trim();
}

// Authored internal links, so that "is anything pointing at this page" is a
// measured number rather than an impression. Same exclusion the dead-link tool
// established and had to learn: a href inside a <script> or a <style> is not a
// link, because this storefront builds prev/next buttons at runtime and
// `href="/pages/'+prev.handle+'"` is JavaScript, not a target.
const SECTIONS = 'pages|products|collections|blogs';
function authoredLinks(body) {
  const clean = C.stripCode(body);
  const re = new RegExp('href="(\\/(?:' + SECTIONS + ')\\/[^"#?]*)', 'g');
  const out = [];
  let m;
  while ((m = re.exec(clean))) out.push(m[1].replace(/\/+$/, ''));
  return out;
}

function mainText(html) {
  const i = html.indexOf('<main');
  const j = html.indexOf('</main>');
  if (i === -1 || j === -1 || j < i) return null;
  return C.visibleText(html.slice(i, j + 7)).replace(/\s+/g, ' ').trim().length;
}

async function main() {
  if (!HANDLES || !OUT) { console.error('need --handles and --out'); process.exit(2); }
  const handles = fs.readFileSync(HANDLES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

  const seen = new Set();
  if (fs.existsSync(OUT)) {
    for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { seen.add(JSON.parse(line).handle); } catch (e) { /* partial last line */ }
    }
  }
  const fd = fs.openSync(OUT, 'a');
  const deadline = Date.now() + MAX_MINUTES * 60000;

  let delay = DELAY, strikes = 0, clean = 0, done = 0;
  for (const handle of handles) {
    if (seen.has(handle)) continue;
    if (Date.now() > deadline) { console.error('wall clock reached at ' + handle); break; }
    if (strikes >= 6) { console.error('throttled six times, stopping at ' + handle); break; }

    let res, html;
    try {
      res = await fetch(`${STORE}/pages/${handle}`, { headers: { 'User-Agent': UA }, redirect: 'manual' });
      html = await res.text();
    } catch (e) {
      fs.writeSync(fd, JSON.stringify({ handle, outcome: 'http', status: 0, why: e.message }) + '\n');
      await sleep(delay); continue;
    }

    if (res.status === 429 || res.status === 503 || C.looksLikeChallenge(html, res.status)) {
      strikes++; clean = 0; delay = Math.min(delay * 2, 30000);
      console.error(`throttled ${res.status} on ${handle}, delay now ${delay}ms`);
      await sleep(delay); continue;                       // retried on the next run
    }
    if (res.status !== 200) {
      fs.writeSync(fd, JSON.stringify({ handle, outcome: 'http', status: res.status,
        location: res.headers.get('location') || null }) + '\n');
      clean++; await sleep(delay); continue;
    }
    clean++;
    if (clean >= 12 && delay > DELAY) { delay = Math.max(DELAY, Math.floor(delay / 2)); clean = 0; }

    let rec;
    try {
      const body = extract(html);
      const text = authoredText(body);
      rec = { handle, outcome: 'stored', status: 200, rendered: Buffer.byteLength(html),
        stored_chars: body.length, text_chars: text.length,
        main_text_chars: mainText(html), head: text.slice(0, 90),
        links: authoredLinks(body) };
    } catch (e) {
      rec = { handle, outcome: 'template', status: 200, rendered: Buffer.byteLength(html),
        why: e.message, main_text_chars: mainText(html) };
    }
    fs.writeSync(fd, JSON.stringify(rec) + '\n');
    if (++done % 50 === 0) console.error(`  ${done} fetched, delay ${delay}ms, last ${handle}`);
    await sleep(delay);
  }
  fs.closeSync(fd);
  console.error(`done: ${done} fetched this run`);
}

main().catch((e) => { console.error(e); process.exit(1); });
