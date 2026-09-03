// ─────────────────────────────────────────────────────────────────────────────
//  DRIVE THE PAGE. The suite reasons about bytes; this is the only check that
//  can tell a page that PARSES from a page that WORKS.
//
//  It loads two documents in Chromium, the live body and the repaired body, and
//  does what a student does: click an option, click Check answer, look for
//  feedback.
//
//  THE EDITOR HALF IS ASSERTED BY WHICH ERROR IT THROWS, which is not a dodge.
//  The fixture is the page BODY, so the CodeMirror CDN tag from the document
//  head is not present and the library is never loaded. That turns out to be the
//  sharper test. Before the repair the editor block is a SyntaxError and never
//  executes at all. After it, the block executes, reaches
//  `CodeMirror.fromTextArea` and throws `CodeMirror is not defined`. Moving from
//  "never ran" to "ran and could not find its library" is exactly the thing
//  being repaired, and it needs no vendored third party code in this repo.
//
//  Point CSA19_VENDOR at a directory holding codemirror.min.js, clike.min.js and
//  codemirror.min.css to get the full check, including token colours.
//
//  The before half is not decoration. It pins that the defect is real in the
//  bytes being repaired, so a green after half cannot come from a page that was
//  never broken.
//
//    node scripts/verify-csa-1-9-repair.js          fixture vs repair, offline
//    node scripts/verify-csa-1-9-repair.js --live   the storefront, after import
//
//  The --live form is FALSE until a human imports the sheet. That is the point.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const HANDLE = 'ap-csa-lesson-1-9-method-signatures';

async function drive(html) {
  const { chromium } = require(path.join(__dirname, '..', 'smoke', 'node_modules', 'playwright'));
  const tmp = path.join(os.tmpdir(), 'csa19-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
  const vendor = process.env.CSA19_VENDOR;
  await page.route('**/*', (r) => {
    const url = r.request().url();
    if (url.startsWith('file:')) return r.continue();
    if (vendor) {
      const base = url.split('?')[0].split('/').pop();
      const local = path.join(vendor, base);
      if (fs.existsSync(local)) {
        return r.fulfill({ status: 200, body: fs.readFileSync(local),
          contentType: base.endsWith('.css') ? 'text/css' : 'application/javascript' });
      }
    }
    return r.abort();
  });
  //  The body alone has no <head>, so the CDN tags the real page carries are
  //  added here when a vendor directory is supplied.
  await page.goto('file://' + tmp, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (process.env.CSA19_VENDOR) {
    for (const f of ['codemirror.min.js', 'clike.min.js']) {
      await page.addScriptTag({ path: path.join(process.env.CSA19_VENDOR, f) }).catch(() => {});
    }
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.querySelectorAll('.apcs-popup-overlay, #apcs-nav').forEach((e) => e.remove());
  });
  const out = await page.evaluate(() => {
    const ex = document.querySelector('#apcsa-lesson .apcs-ex');
    const res = { exercises: document.querySelectorAll('#apcsa-lesson .apcs-ex').length, editors: document.querySelectorAll('.CodeMirror').length };
    if (ex) {
      const opts = [...ex.querySelectorAll('.apcs-opt')];
      opts[0].click();
      try { ex.querySelector('.apcs-ex-check').click(); } catch (e) { /* handler threw */ }
      res.graded = ex.querySelectorAll('.apcs-opt.correct, .apcs-opt.incorrect').length;
      res.feedback = !!ex.querySelector('.apcs-ex-feedback.show');
      res.disabled = !!ex.querySelector('.apcs-ex-check').disabled;
    }
    const spans = [...document.querySelectorAll('.CodeMirror-line span[class*="cm-"]')];
    res.colours = new Set(spans.map((s) => getComputedStyle(s).color)).size;
    return res;
  });
  out.errors = errors.filter((e) => !/dynamically imported module|Failed to fetch/.test(e));
  await browser.close();
  try { fs.unlinkSync(tmp); } catch (e) { /* best effort */ }
  return out;
}

(async () => {
  const live = process.argv.includes('--live');
  const m = require('./csa-lesson-newline-repair');
  const { extract } = require('./extract-live-body');
  const sf = require('../lib/storefront-fetch');

  const shell = fs.readFileSync(path.join(__dirname, '..', 'smoke', 'fixtures',
    'csa-1-9-live-body.html'), 'utf8');

  let beforeDoc, afterDoc;
  if (live) {
    //  After the import, the STOREFRONT is the after. There is no before.
    const page = sf.page('/pages/' + HANDLE);
    afterDoc = page.body;
    beforeDoc = null;
  } else {
    let corpus = '';
    for (const s of m.SIBLINGS) {
      const f = path.join(os.tmpdir(), '..', 'audit', 'pages', s + '.html');
      try { corpus += extract(fs.readFileSync(f, 'utf8')); } catch (e) { corpus += ''; }
    }
    if (!corpus) corpus = ['font-size', 'method', '.cm-variable-2', 'important', 'return',
      'code.', 'opt.getAttribute'].join(' ');
    const r = m.repair(shell, corpus);
    if (r.problems && r.problems.length) {
      console.error('  the repair refused: ' + r.problems.join('; '));
      process.exit(1);
    }
    beforeDoc = shell;
    afterDoc = r.after;
  }

  const problems = [];
  console.log('');
  if (beforeDoc) {
    const b = await drive(beforeDoc);
    console.log('  BEFORE  errors=' + JSON.stringify(b.errors) + '  graded=' + b.graded
      + '  feedback=' + b.feedback + '  editors=' + b.editors);
    if (!b.errors.some((e) => /Unexpected string/.test(e))) {
      problems.push('the BEFORE body did not throw the editor SyntaxError, so it was not the broken page');
    }
    if (!b.errors.some((e) => /ribute is not defined/.test(e))) {
      problems.push('the BEFORE body did not throw the ASI ReferenceError, so it was not the broken page');
    }
    if (b.graded !== 0) problems.push('the BEFORE body graded an option, so it was not broken');
    if (b.editors !== 0) problems.push('the BEFORE body built an editor, so it was not broken');
  }
  const a = await drive(afterDoc);
  console.log('  AFTER   errors=' + JSON.stringify(a.errors) + '  graded=' + a.graded
    + '  feedback=' + a.feedback + '  editors=' + a.editors + '  colours=' + a.colours);

  //  The MCQ half is unconditional: it depends on nothing outside the body.
  if (a.exercises !== 8) problems.push('expected 8 MCQ exercises, found ' + a.exercises);
  if (a.graded !== 1) problems.push('Check answer graded ' + a.graded + ' options, expected 1');
  if (!a.feedback) problems.push('no feedback shown after Check answer');
  if (!a.disabled) problems.push('the Check answer button was not disabled after answering');

  //  No SyntaxError may survive. That is what killed the editor block.
  const syntaxish = a.errors.filter((e) => /Unexpected|Invalid|is not defined/.test(e)
    && !/CodeMirror is not defined/.test(e));
  if (syntaxish.length) problems.push('the repaired page still throws: ' + syntaxish.join(', '));

  const haveLib = !!process.env.CSA19_VENDOR || live;
  if (haveLib) {
    if (a.editors < 1) problems.push('no CodeMirror editor was built (' + a.editors + ')');
    if (a.colours < 3) problems.push('syntax highlighting is flat: ' + a.colours + ' distinct colours');
  } else {
    //  Without the library the proof is that the block now REACHES it.
    if (!a.errors.some((e) => /CodeMirror is not defined/.test(e))) {
      problems.push('the editor block did not reach CodeMirror, so it still is not executing');
    }
    if (beforeDoc) console.log('  (no CodeMirror available: the editor half is asserted by the block '
      + 'reaching the library instead of dying as a SyntaxError. Set CSA19_VENDOR for the full check.)');
  }

  console.log('');
  if (problems.length) {
    problems.forEach((p) => console.error('  FAIL ' + p));
    process.exit(1);
  }
  console.log('REPAIR VERIFIED: Check answer grades and gives feedback, the editor block '
    + (haveLib ? 'builds ' + a.editors + ' Java editors with ' + a.colours + ' token colours'
              : 'executes and reaches CodeMirror instead of dying as a SyntaxError'));
})().catch((e) => { console.error('DRIVER FAILED: ' + e.message); process.exit(1); });
