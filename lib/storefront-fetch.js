'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ONE DOOR TO THE STOREFRONT, AND IT REFUSES TO HAND BACK A PAGE IT DID NOT GET.
//
//  ── THE INCIDENT, 2026-09-03 ───────────────────────────────────────────────
//  Every live verifier in this repo sent a browser User-Agent, because the
//  storefront used to answer scripted clients with a challenge. scripts/
//  verify-artifact.js still carries the comment: "user-agent with error 1010.
//  Every request from here carries a browser UA."
//
//  That rule has INVERTED. Measured across three pages and two rounds:
//
//      User-Agent: Mozilla/5.0 (compatible; apcse-link-graph/1.0) ...   403
//      User-Agent: Mozilla/5.0 (Macintosh; ... Chrome/120 Safari/537)   403
//      no User-Agent override, so curl sends curl/8.5.0                 200
//
//  Bot management now blocks the SPOOF and allows the honest client. Every
//  script here was carrying a workaround that had become the bug.
//
//  ── WHY THAT WAS WORSE THAN AN OUTAGE ──────────────────────────────────────
//  The 403 body is a 4.5KB "Verifying your connection..." page. It contains
//  none of the strings a verifier looks for. So every assertion of the shape
//  "this string is GONE" passes on it, vacuously, and every assertion of the
//  shape "this string is PRESENT" fails. The result is not a clean failure. It
//  is a plausible-looking partial regression:
//
//    verify-cc-pacing-live.js        reported 4 of 8 failed. Nothing had
//                                    regressed; the strip is live and correct.
//    verify-csp-applied-cards-live   reported all 17 Applied Challenge pages
//                                    serving 0 of 6 questions and all 17 lesson
//                                    cards missing. All 17 serve 6. Measured.
//
//  An agent trusting the second one re-ships 17 pages that were already right.
//  That is the cost, and it is why the guard is a REFUSAL rather than a warning.
//
//  ── THE RULE ───────────────────────────────────────────────────────────────
//  A live check may not believe anything about a body until it has proved the
//  body is the page it asked for. So page() asserts a POSITIVE marker that the
//  challenge cannot fake, and throws otherwise. A negative assertion can never
//  again pass because the fetch quietly failed.
//
//  Shopify.theme is that marker: 3 occurrences on every real storefront page
//  measured (home, a page template, a lab page, a blog index), 0 on the
//  challenge. cdn/shopifycloud behaves identically and is checked with it, so
//  a single marker going away does not silently disable the guard.
//
//  Zero PII: public page markup only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

//  Distinguishes concurrent fetches inside one process.
let SEQ = 0;

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');

//  Markers a real storefront page always carries and the bot challenge never
//  does. Both must be present: one of them being retired by a theme change
//  should break this loudly rather than half-disable it.
const MARKERS = ['Shopify.theme', '/cdn/shopifycloud/'];
const CHALLENGE = /<title>\s*Verifying your connection/i;


class NotThePage extends Error {
  constructor(msg, meta) { super(msg); this.name = 'NotThePage'; Object.assign(this, meta); }
}

//  DELIBERATELY NO User-Agent OVERRIDE. See the header. curl sends its own and
//  that is the one that is allowed today. If this ever needs a UA again, change
//  it here, once, and not in thirty two scripts.
//  ---------------------------------------------------------------------------
//  A 429 IS NOT AN ANSWER ABOUT THE PAGE.
//
//  refusal() treats every non-200 the same, which is right for a 404 and wrong
//  for a 429: one says the page is not there, the other says ask again. A
//  verifier that walks a set of pages hits the limit partway through and then
//  reports a CONTENT failure for a page that is fine.
//
//  Measured 2026-09-04: verify-cyber-qotd-live walks 14 storefront requests and
//  was throttled on the sixth, calling a correct import broken. Fetched on its
//  own a moment later the same page answered 200 with all 27 questions.
//
//  So a 429 is retried here, in the one door, rather than in each verifier. It
//  is deliberately narrow: only 429, a small bounded number of attempts, and a
//  growing wait. Everything else still fails on the first answer, because a 404
//  retried three times is still a 404 and waiting on it only makes a red check
//  slower. After the attempts are spent the 429 is returned like any other code
//  and refusal() rejects it, so this can hide nothing; it can only stop a
//  transient limit from being read as a fact about the page.
//  ---------------------------------------------------------------------------
const RETRY_CODES = new Set(['429']);
const RETRY_ATTEMPTS = 4;
const RETRY_WAIT_MS = 1500;

function sleepSync(ms) {
  //  Sync, because raw() is sync and every caller of this module is too.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function raw(target, opts) {
  const o = opts || {};
  const attempts = o.retryAttempts == null ? RETRY_ATTEMPTS : o.retryAttempts;
  let r = rawOnce(target, o);
  for (let i = 1; i < attempts && RETRY_CODES.has(r.code); i += 1) {
    sleepSync(RETRY_WAIT_MS * i);
    r = rawOnce(target, o);
  }
  return r;
}

function rawOnce(target, opts) {
  const o = opts || {};
  const url = /^https?:\/\//.test(target) ? target : STORE + target;
  //  The body goes to a file and the status to stdout, so the two can never be
  //  confused. Two earlier cuts of this function got that wrong in two
  //  different ways: one split on the last newline and read "</html>" as the
  //  status code, the other lost its separator to the shell and got no status
  //  at all. There is nothing to parse apart here.
  const tmp = path.join(os.tmpdir(),
    'apcse-sf-' + process.pid + '-' + (SEQ++) + '-' + Date.now() + '.html');
  const args = ['-sS', '--max-time', String(o.timeout || 45), '--compressed',
    '-o', tmp, '-w', '%{http_code} %{url_effective}'];
  if (o.follow !== false) args.push('-L');
  args.push(url);
  //  execFileSync, not a shell: a command string let the shell eat the -w format.
  let status;
  try {
    status = cp.execFileSync('curl', args, { encoding: 'utf8' }).trim().split(/\s+/);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (e2) {}
    throw new NotThePage(url + ': curl failed (' + String(e.message).split('\n')[0] + ')',
      { code: null, url });
  }
  let body = '';
  try { body = fs.readFileSync(tmp, 'utf8'); } catch (e) { body = ''; }
  try { fs.unlinkSync(tmp); } catch (e) {}
  return { url, code: status[0], finalUrl: status[1] || url, body };
}

//  Is this the storefront answering, or something in front of it?
//
//  This deliberately does NOT test for the challenge title. One cut of it did,
//  and mutation testing proved that branch hollow: the challenge page carries
//  none of the markers, so the marker test already refuses it and removing the
//  title test changed no verdict. A branch that cannot decide anything reads as
//  safety and provides none, so it is gone rather than decorated.
//
//  The title test survives in refusal() below, where it does real work: it is
//  what turns "this is not a page" into "you are being challenged, stop sending
//  a browser User-Agent", and section 2.3 of the suite holds it to that.
function looksReal(body) {
  if (!body) return false;
  return MARKERS.every((m) => body.includes(m));
}

//  Why this body is not the page asked for, or null if it is. Separated from
//  page() so a caller that wants to survey rather than throw can ask.
function refusal(r) {
  if (r.code !== '200') return 'answered ' + r.code + ' rather than 200';
  if (CHALLENGE.test(r.body)) {
    return 'served the bot challenge ("Verifying your connection"), not the page. '
      + 'A User-Agent claiming to be a browser is refused by this storefront; send none.';
  }
  const missing = MARKERS.filter((m) => !r.body.includes(m));
  if (missing.length) {
    return 'body carries none of the storefront markers (' + missing.join(', ')
      + '), so it is not a rendered page and no assertion about its contents means anything';
  }
  return null;
}

//  The one callers should use. Returns a body only when it is provably the page.
function page(target, opts) {
  const r = raw(target, opts);
  const why = refusal(r);
  if (why) throw new NotThePage(r.url + ': ' + why, { code: r.code, url: r.url, bytes: r.body.length });
  return r;
}

//  ── A RENDERED BODY IS NOT ALWAYS THE STORED BODY ──────────────────────────
//  Cloudflare rewrites addresses at RENDER time into
//      <a class="__cf_email__" data-cfemail="HEX">[email protected]</a>
//  with a key that rotates per render. A body extracted from that is not what
//  Shopify stores, and importing it replaces the real text with a permanent
//  dead placeholder.
//
//  On THIS site that is not cosmetic. The AP Cybersecurity phishing exercises
//  are built on lookalike domains a student is asked to spot, so writing
//  'do-not-reply@g00gle.com' out as '[email protected]' does not damage the
//  question, it deletes it. Measured 2026-09-03: ap-cyber-unit-5-lesson-5 has a
//  quiz option rendering as '[email protected]' where a password example
//  belongs.
//
//  scripts/fetch-page-bodies.js has refused on this since it was written. It
//  lives here now so every generator gets it from the one door rather than each
//  remembering. READING such a page is fine; WRITING it back is the danger, so
//  page() does not refuse and a generator must ask.
const CF_REWRITE = /__cf_email__|\/cdn-cgi\/l\/email-protection|data-cfemail|email-decode\.min\.js/;

//  Null when the body is safe to write back, else why it is not.
function cloudflareRewritten(body) {
  if (!CF_REWRITE.test(body || '')) return null;
  const which = ['__cf_email__', '/cdn-cgi/l/email-protection', 'data-cfemail', 'email-decode.min.js']
    .filter((k) => (body || '').includes(k));
  return 'Cloudflare rewrote this body at render time (' + which.join(', ') + '), so it is not '
    + 'the body Shopify stores. Importing it would make that rewrite permanent and replace real '
    + 'text with a dead placeholder. The body has to come from the Admin API instead.';
}

//  ── A THIRD WAY IN, AND THE ONE THAT NEVER HITS EITHER TRAP ────────────────
//  Two routes to a body already exist above: the rendered page (page(), then
//  scripts/extract-live-body.js pulls the rte wrapper back out), and the Admin
//  API, which needs SHOPIFY_ADMIN_TOKEN and this environment does not carry
//  one. The rendered route has TWO separate failure modes, both proven live on
//  2026-09-03, and neither is the Cloudflare rewrite this file already guards:
//
//    Cloudflare email obfuscation   cloudflareRewritten() above. Confirmed on
//                                   ap-csp-filtering-sorting-practice AND
//                                   ap-cyber-unit-5-lesson-5 the same day: on
//                                   lesson-5 it lands on quiz option (C) for
//                                   w5q4, turning the password example
//                                   'alice@example.com' into a dead
//                                   '[email protected]' cipher span (board 179).
//    extraction boundary drift     scripts/extract-live-body.js bounds the
//                                   body by counting <div> opens and closes
//                                   from the theme's own wrapper. That count
//                                   assumes the PAGE's own markup is
//                                   div-balanced at every point, and
//                                   ap-cyber-unit-5-lesson-6 is not: the
//                                   counter reaches zero 4081 bytes before the
//                                   real end of the body, silently dropping
//                                   its own closing lesson-nav block. Proven by
//                                   diffing this function's own output against
//                                   extract-live-body.js's: byte-identical for
//                                   68309 bytes, then the rendered copy just
//                                   stops and this one goes on for one more
//                                   <!--APCYBER-LESSON-NAV-START--> section.
//
//  /pages/<handle>.json answers with the Page resource as JSON, unauthenticated,
//  same body_html field the Admin API would return, and it never passes through
//  the theme's Liquid rendering: no HTML for Cloudflare to rewrite, no wrapper
//  div for a counter to miscount. Cross-checked against the rendered route on a
//  page neither hazard touches (ap-cyber-unit-5-lesson-4): byte-identical,
//  67971 bytes both ways.
//
//  This is now the preferred source for any generator that will WRITE a body
//  back. page() above stays useful for a different question: what a browser
//  actually receives, UA challenges and all.
function pageBody(handle) {
  const r = raw('/pages/' + handle + '.json');
  if (r.code !== '200') {
    throw new NotThePage(handle + ': page json answered ' + r.code + ' rather than 200',
      { code: r.code, url: r.url });
  }
  let obj;
  try { obj = JSON.parse(r.body); }
  catch (e) { throw new NotThePage(handle + ': page json did not parse: ' + e.message); }
  if (!obj || !obj.page || typeof obj.page.body_html !== 'string') {
    throw new NotThePage(handle + ': page json carried no page.body_html');
  }
  //  Never measured to fire on this route (that is the whole point of using
  //  it), but a generator must still ask rather than assume, the same rule
  //  page() itself follows for the rendered route.
  const cf = cloudflareRewritten(obj.page.body_html);
  if (cf) throw new NotThePage(handle + ': page json body_html ' + cf);
  return obj.page;
}

module.exports = { STORE, MARKERS, CHALLENGE, NotThePage, raw, rawOnce, page, looksReal, refusal,
  RETRY_CODES, RETRY_ATTEMPTS,
  CF_REWRITE, cloudflareRewritten, pageBody };

