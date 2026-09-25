'use strict';
// -----------------------------------------------------------------------------
//  BOARD 425: DID THE PSEUDOCODE POST REPAIR LAND? ASK THE STOREFRONT.
//
//      node scripts/verify-csp-pseudocode-post-live.js
//      node scripts/verify-csp-pseudocode-post-live.js --browser
//      node scripts/verify-csp-pseudocode-post-live.js --simulate-import --browser
//
//  The third splices the sheet's body into the live page first, to prove every
//  check CAN pass. It exits 3 on success and never prints the "is live" line,
//  so it cannot be mistaken for the real run.
//
//  Every assertion is FALSE BEFORE THE IMPORT and true after. Run it before
//  importing too: it must come back red. If it passes before anyone has
//  imported the sheet, the page was fixed some other way and the sheet is
//  stale, so delete it rather than import it over a newer body.
//
//  The last assertion is the strongest: the live body IS the sheet's body, once
//  both have their HTML entities decoded (Shopify decodes some on store, so the
//  bytes can differ where the meaning cannot).
//
//  --browser also loads the live body in Chromium and clicks the right answer
//  on every question, asking the page's own grader for its verdict. Before the
//  repair it accepts 1 of 8. It needs Playwright; without it the section says
//  SKIPPED, which is never a pass.
//
//  Fetches through lib/storefront-fetch.js, which refuses a body it cannot prove
//  is a rendered page, so a bot challenge cannot pass for a clean result. No
//  em-dashes. Zero PII.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch.js');
const R = require('./csp-pseudocode-post-repair.js');
const E = require('../lib/matrixify-body-edit.js');

const URL = sf.STORE + R.URL_PATH;
const SHEET = path.join(__dirname, '..', 'imports', '2026-09-25-csp-pseudocode-post', R.SHEET);

let pass = 0; let fail = 0; let skipped = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail !== undefined ? '\n        ' + detail : '')); }
}

//  Named and numeric entities, decoded on both sides before comparing.
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0', rsquo: '\u2019', lsquo: '\u2018',
  rdquo: '\u201D', ldquo: '\u201C', ne: '\u2260', larr: '\u2190', rarr: '\u2192', le: '\u2264', ge: '\u2265',
  mdash: '\u2014', ndash: '\u2013', times: '\u00D7', rArr: '\u21D2', hellip: '\u2026' };
function decode(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (Object.prototype.hasOwnProperty.call(NAMED, n) ? NAMED[n] : m))
    .replace(/\r\n/g, '\n').trim();
}

async function browser(body) {
  let chromium;
  try {
    const root = require('child_process').execSync('npm root -g', { encoding: 'utf8' }).trim();
    ({ chromium } = require(path.join(root, 'playwright')));
  } catch (e) {
    skipped++;
    console.log('  SKIPPED  --browser needs Playwright installed globally. Not a pass.');
    return;
  }
  //  The document is the body curl already fetched and proved real; every other
  //  request is aborted, so nothing but the page's own inline grader runs.
  const b = await chromium.launch();
  try {
    const page = await b.newPage();
    await page.route('**/*', (route) => (route.request().url() === URL
      ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body })
      : route.abort()));
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let accepted = 0;
    for (const q of Object.keys(R.KEY)) {
      const idx = R.LETTERS.indexOf(R.KEY[q]);
      const lis = page.locator('#' + q + '-opts li');
      //  Dispatched, not clicked: a marketing popup covers the options after
      //  the first, and the grader is what is being asked, not the pointer.
      await lis.nth(idx).dispatchEvent('click');
      const cls = await lis.evaluateAll((els) => els.map((e) => e.className || ''));
      if (cls[idx] === 'correct') accepted++;
      else console.log('        ' + q + ': clicked ' + R.KEY[q] + ', the page said ' + (cls[idx] || 'nothing'));
    }
    ok('in Chromium, the page accepts the right answer on 8 of 8', accepted === 8, 'accepted ' + accepted + ' of 8');
  } finally {
    await b.close();
  }
}

async function main() {
  const wantBrowser = process.argv.includes('--browser');
  //  --simulate-import splices the sheet's body into the live page and runs the
  //  same checks. It proves the checks CAN pass, which a check written to be
  //  false beforehand has to prove somehow, and it is never evidence of an
  //  import. It says so on every line of output that could be mistaken for one.
  const simulate = process.argv.includes('--simulate-import');
  console.log('AP CSP pseudocode post, live: ' + URL + '\n');
  let html = sf.page(URL).body;
  if (simulate) {
    const now = R.extractBody(html);
    const body = E.parseCsv(fs.readFileSync(SHEET, 'utf8'))[1][3];
    if (html.split(now).length !== 2) throw new Error('simulate: the live body is not a unique slice of the page');
    html = html.split(now).join(body);
    console.log('  SIMULATED: the sheet body is spliced into the live page. This is not an import.\n');
  }
  const live = R.extractBody(html);

  ok('the Exam Reality Check says 70 questions in 120 minutes',
    live.includes('Section I of the AP CSP exam is 70 multiple-choice questions in 120 minutes'));
  ok('the 40-question and 10-to-15 claims are gone', !/approximately 40 MCQ|10 to 15 questions/.test(live));
  ok('REPEAT UNTIL is taught as checking before each pass, everywhere',
    live.includes('checks its condition BEFORE each pass')
    && !/at the END of each iteration|condition AFTER each iteration|checked AFTER the block|always runs at least once/.test(live));
  ok('lists and operators: no angle brackets, three Boolean operators',
    !/angle brackets/.test(live) && live.includes('three Boolean operators'));
  ok('RANDOM(a, b) is on the cheat sheet', live.includes('<span class="cs-syntax">RANDOM(a, b)</span>'));
  R.questions(live).forEach(({ q, opts, label }) => {
    const want = R.LETTERS.indexOf(R.KEY[q]);
    const graded = opts.length === 4 && opts.every((o) => o.correct === want);
    ok(q + ' grades ' + R.KEY[q] + ' as right and prints it', graded && label === R.KEY[q],
      'grades index ' + (opts[0] ? opts[0].correct : '?') + ', prints ' + label);
  });
  ok('no explanation argues with itself', !/\bWait\b|\bWAIT\b|Correction verified/.test(live));

  const sheetBody = E.parseCsv(fs.readFileSync(SHEET, 'utf8'))[1][3];
  const a = decode(live); const b = decode(sheetBody);
  let at = 0; while (at < a.length && a[at] === b[at]) at++;
  ok('the live body is the sheet body, entities decoded on both sides', a === b,
    a === b ? '' : 'first difference at ' + at + ': live "' + a.slice(at, at + 40) + '" vs sheet "' + b.slice(at, at + 40) + '"');

  if (wantBrowser) await browser(html);

  console.log('\n' + pass + ' ok, ' + fail + ' failed' + (skipped ? ', ' + skipped + ' skipped' : ''));
  if (fail) {
    console.log('\nNOT IMPORTED YET, or imported and wrong. Every assertion above is false before the');
    console.log('import and true after, so a red run before you import is expected.');
    process.exit(1);
  }
  if (skipped) process.exit(1);
  if (simulate) {
    console.log('SIMULATED ONLY - every check can pass on the sheet body. Nothing has been imported.');
    process.exit(3);
  }
  console.log('OK - the pseudocode post repair is live');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
