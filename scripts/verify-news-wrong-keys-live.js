'use strict';
// -----------------------------------------------------------------------------
//  BOARD 429: DID THE FOUR NEWS REPAIRS LAND? ASK THE STOREFRONT.
//
//      node scripts/verify-news-wrong-keys-live.js
//      node scripts/verify-news-wrong-keys-live.js --browser
//      node scripts/verify-news-wrong-keys-live.js --simulate-import --browser
//
//  Every page's assertions are FALSE BEFORE THE IMPORT and true after. Run it
//  before importing too: it must come back red. If a page already passes before
//  anyone imported, it was fixed some other way and its row is stale.
//
//  Per page, the same rules the generator refused on (keys, labels, the q2 base
//  case, the copy rule, the day 20 options, no published self-correction), then
//  the strongest one: the live body IS the sheet's body once both have their
//  entities decoded, since Shopify decodes some on store.
//
//  --browser loads each live body in Chromium and asks the page's own grader
//  about the right answer. It is partial on purpose and says so: on day 20 the
//  key letter was already B, so the grader agreed before the repair too; what
//  changed there is what B says, which the body checks cover.
//
//  --simulate-import splices each sheet body into its live page first, to prove
//  every check CAN pass. It exits 3 on success and never prints the "is live"
//  line. Fetches through lib/storefront-fetch.js with no User-Agent. No
//  em-dashes. Zero PII.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch.js');
const R = require('./news-wrong-keys-repair.js');
const E = require('../lib/matrixify-body-edit.js');

const SHEET = path.join(__dirname, '..', 'imports', '2026-09-25-news-wrong-keys', R.SHEET);
const urlOf = (h) => sf.STORE + '/blogs/' + R.BLOG + '/' + h;

let pass = 0; let fail = 0; let skipped = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '\n        ' + detail : '')); }
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0', rsquo: '\u2019', lsquo: '\u2018',
  rdquo: '\u201D', ldquo: '\u201C', ne: '\u2260', larr: '\u2190', rarr: '\u2192', le: '\u2264', ge: '\u2265',
  mdash: '\u2014', ndash: '\u2013' };
function decode(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => (Object.prototype.hasOwnProperty.call(NAMED, n) ? NAMED[n] : m))
    .replace(/\r\n/g, '\n').trim();
}

//  What the grader must accept on each page, per the repair.
const CLICKS = {
  'ap-csa-recursion-complete-guide': [['q1', 'B'], ['q2', 'C'], ['q3', 'C'], ['q4', 'C'], ['q5', 'B']],
  'ap-csp-day-29-list-mutation-and-aliasing': [['answer', 'B']],
  'ap-csp-day-29-list-mutation-aliasing': [['answer', 'B']],
  'unit-2-cycle-2-day-20': [['answer', 'B']],
};

async function browser(pages) {
  let chromium;
  try {
    const root = require('child_process').execSync('npm root -g', { encoding: 'utf8' }).trim();
    ({ chromium } = require(path.join(root, 'playwright')));
  } catch (e) {
    skipped++;
    console.log('  SKIPPED  --browser needs Playwright installed globally. Not a pass.');
    return;
  }
  const b = await chromium.launch();
  try {
    for (const [handle, html] of pages) {
      const page = await b.newPage();
      const url = urlOf(handle);
      //  The document is the body curl fetched and proved real; every other
      //  request is aborted, so only the page's own inline grader runs.
      await page.route('**/*', (route) => (route.request().url() === url
        ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
        : route.abort()));
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const verdicts = [];
      for (const [name, letter] of CLICKS[handle]) {
        //  Driven through the DOM, not the pointer: a marketing popup covers
        //  the page, and the grader is what is being asked.
        const said = await page.evaluate(([n, l]) => {
          const radio = document.querySelector('input[name="' + n + '"][value="' + l + '"]');
          if (!radio) return 'no option ' + l;
          radio.checked = true;
          if (n === 'answer') {
            const form = document.getElementById('apcs-quiz-form');
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            return (document.getElementById('apcs-feedback-header') || {}).textContent || '';
          }
          window.alert = () => {};
          const btn = document.querySelector('#' + n + '-container .rg-submit-btn');
          btn.click();
          return (document.getElementById(n + '-feedback-title') || {}).textContent || '';
        }, [name, letter]);
        verdicts.push([name, letter, said]);
      }
      const right = verdicts.filter(([, , s]) => /^Correct!/.test(s)).length;
      ok(handle + ': in Chromium the grader accepts ' + right + ' of ' + verdicts.length + ' right answers', right === verdicts.length,
        verdicts.filter(([, , s]) => !/^Correct!/.test(s)).map(([n, l, s]) => n + ' ' + l + ': ' + s).join('; '));
      await page.close();
    }
  } finally {
    await b.close();
  }
}

async function main() {
  const wantBrowser = process.argv.includes('--browser');
  const simulate = process.argv.includes('--simulate-import');
  const sheet = {};
  E.parseCsv(fs.readFileSync(SHEET, 'utf8')).slice(1).forEach((row) => { sheet[row[1]] = row[3]; });
  console.log('Board 429, four news posts, live\n');
  if (simulate) console.log('  SIMULATED: each sheet body is spliced into its live page. This is not an import.\n');

  const pages = [];
  for (const r of R.REPAIRS) {
    let html = sf.page(urlOf(r.handle)).body;
    if (simulate) {
      const now = R.extractBody(html, r.handle);
      if (html.split(now).length !== 2) throw new Error('simulate: ' + r.handle + ' body is not a unique slice of its page');
      html = html.split(now).join(sheet[r.handle]);
    }
    const live = R.extractBody(html, r.handle);
    pages.push([r.handle, html]);

    console.log(r.handle);
    const rules = r.check(live);
    ok('keys, labels and content rules', rules.length === 0, rules.join('; '));
    const mono = live.match(R.MONOLOGUE);
    ok('no published self-correction', !mono, mono ? '"' + mono[0] + '"' : '');
    const a = decode(live); const b = decode(sheet[r.handle]);
    let at = 0; while (at < a.length && a[at] === b[at]) at++;
    ok('the live body is the sheet body, entities decoded on both sides', a === b,
      a === b ? '' : 'first difference at ' + at + ': live "' + a.slice(at, at + 40) + '" vs sheet "' + b.slice(at, at + 40) + '"');
  }

  if (wantBrowser) { console.log('\nIn the browser'); await browser(pages); }

  console.log('\n' + pass + ' ok, ' + fail + ' failed' + (skipped ? ', ' + skipped + ' skipped' : ''));
  if (fail) {
    console.log('\nNOT IMPORTED YET, or imported and wrong. Every page check above is false before the');
    console.log('import and true after, so a red run before you import is expected.');
    process.exit(1);
  }
  if (skipped) process.exit(1);
  if (simulate) {
    console.log('SIMULATED ONLY - every check can pass on the sheet bodies. Nothing has been imported.');
    process.exit(3);
  }
  console.log('OK - the board 429 repairs are live');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
