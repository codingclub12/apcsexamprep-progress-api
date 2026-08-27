#!/usr/bin/env node
// Drive the rebuilt exercise in a real browser and confirm it still grades.
//
//   node scripts/cyber-u1-l4-ex1-grade-check.cjs [body.html]
//
// The static gate proves each credited value names an option that exists. That
// is not the same as proving a student who picks it gets the point: the scoring
// runs inside a click handler, and a splice landing one character wrong in a JS
// string literal produces valid HTML that renders a dead Check button.
//
// So this selects every credited answer, clicks Check Part 1, and asserts the
// score is the full 12. Then it selects every wrong answer and asserts 0. Both
// directions, because a handler that always awards full marks would pass the
// first check alone.

const { chromium } = require('../smoke/node_modules/playwright');
const fs = require('fs');

const FILE = process.argv[2]
  || 'shopify/page-snapshots/ap-cyber-unit-1-lesson-4-exercise-1.after-ced-realignment.html';

// The nine credited answers, from the scoring code.
const CORRECT = {
  'p1a-technique': 'personalized',
  'p1a-defense': 'secret',
  'p1b-technique': 'voiceClone',
  'p1b-outcome': 'wire',
  'p1c-technique': 'evasion',
  'p1c-arms': 'arms',
  'p1d-dual': 'dual',
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const body = fs.readFileSync(FILE, 'utf8');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    { waitUntil: 'domcontentloaded' });

  const result = await page.evaluate((correct) => {
    const out = {};
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return `missing select ${id}`;
      el.value = v;
      if (el.value !== v) return `${id} would not take value ${v}`;
      return null;
    };

    // ---- all correct -------------------------------------------------------
    out.setErrors = Object.entries(correct).map(([id, v]) => set(id, v)).filter(Boolean);
    window.checkPart(1);
    out.scoreAllCorrect = document.getElementById('totalScore').textContent;
    out.feedbackCorrect = (document.getElementById('p1-feedback') || document.body).innerText
      .split('\n').filter((l) => /\+\d/.test(l)).length;
    return out;
  }, CORRECT);

  console.log('all-correct run');
  console.log('  select errors      :', result.setErrors.length ? result.setErrors.join('; ') : 'none');
  console.log('  Part 1 score       :', result.scoreAllCorrect, '(expected 12)');
  console.log('  scoring lines +N   :', result.feedbackCorrect, '(expected 7)');

  // A fresh page: checkPart refuses to run twice on the same part.
  const page2 = await browser.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await page2.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    { waitUntil: 'domcontentloaded' });
  const wrong = await page2.evaluate(() => {
    // every select set to an option that is NOT the credited one
    const wrongPick = {
      'p1a-technique': 'malware', 'p1a-defense': 'grammar', 'p1b-technique': 'personalized',
      'p1b-outcome': 'ignore', 'p1c-technique': 'phishing', 'p1c-arms': 'defeat', 'p1d-dual': 'stop',
    };
    for (const [id, v] of Object.entries(wrongPick)) {
      const el = document.getElementById(id);
      if (el) el.value = v;
    }
    window.checkPart(1);
    return document.getElementById('totalScore').textContent;
  });
  console.log('');
  console.log('all-wrong run');
  console.log('  Part 1 score       :', wrong, '(expected 0)');

  console.log('');
  console.log('page errors          :', errors.length ? errors.join('; ') : 'none');

  await browser.close();

  const ok = result.setErrors.length === 0
    && result.scoreAllCorrect === '12'
    && wrong === '0'
    && errors.length === 0;
  console.log('\n' + (ok ? 'grade check passed' : 'GRADE CHECK FAILED'));
  process.exit(ok ? 0 : 1);
})();
