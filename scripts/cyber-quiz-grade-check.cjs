#!/usr/bin/env node
// Drive a rebuilt quiz in a real browser and confirm it still grades.
//
//   node scripts/cyber-quiz-grade-check.cjs <body.html>
//
// A quiz grades differently from an exercise: selectOpt(n, letter) records the
// choice and checkQ(n) compares it against ANSWERS[n]. There is no <select> and
// no part-total element, so the exercise checker does not apply. What is the
// same is the reason for looking: the static gate proves each keyed letter has
// an option, not that clicking it scores.
//
// Both directions, because a handler that always said Correct would pass an
// all-correct run on its own.

const { chromium } = require('../smoke/node_modules/playwright');
const fs = require('fs');
const qgate = require('../lib/cyber-quiz-gate');

const FILE = process.argv[2];
if (!FILE) {
  console.error('usage: node scripts/cyber-quiz-grade-check.cjs <body.html>');
  process.exit(2);
}

const body = fs.readFileSync(FILE, 'utf8');
const key = qgate.answerKey(body);
const qs = qgate.questions(body);
if (!key) { console.error(`no answer key found in ${FILE}`); process.exit(1); }

//  For each question, a letter that is NOT the credited one.
const wrong = {};
for (const [n, letter] of Object.entries(key)) {
  const other = (qs[n] || []).find((o) => o.letter !== letter);
  if (other) wrong[n] = other.letter;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const errors = [];

  const run = async (picks) => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
      { waitUntil: 'domcontentloaded' });
    return page.evaluate((p) => {
      const out = { marked: [], missing: [] };
      for (const [n, letter] of Object.entries(p)) {
        const el = document.getElementById(`q${n}-${letter}`);
        if (!el) { out.missing.push(`q${n}-${letter}`); continue; }
        if (typeof window.selectOpt !== 'function' || typeof window.checkQ !== 'function') {
          out.missing.push('selectOpt/checkQ not defined');
          break;
        }
        window.selectOpt(Number(n), letter);
        window.checkQ(Number(n));
        //  checkQ paints the chosen option green when right, red when wrong.
        const fb = document.getElementById(`fb${n}`);
        const text = fb ? fb.innerText : '';
        out.marked.push({ q: n, letter, correct: /Correct/.test(text), shown: /none|^$/.test(text) === false });
      }
      return out;
    }, picks);
  };

  console.log(FILE);
  console.log(`answer key: ${Object.entries(key).map(([n, l]) => n + l).join(' ')}`);
  console.log('');

  const right = await run(key);
  const rightN = right.marked.filter((m) => m.correct).length;
  console.log('all-correct run');
  console.log('  missing elements :', right.missing.length ? right.missing.join(', ') : 'none');
  console.log('  marked correct   :', rightN, 'of', Object.keys(key).length);
  console.log('  feedback shown   :', right.marked.filter((m) => m.shown).length, 'of', right.marked.length);

  const bad = await run(wrong);
  const badN = bad.marked.filter((m) => m.correct).length;
  console.log('');
  console.log('all-wrong run');
  console.log('  marked correct   :', badN, 'of', Object.keys(wrong).length, '(expected 0)');

  console.log('');
  console.log('page errors        :', errors.length ? errors.join('; ') : 'none');

  await browser.close();

  const ok = right.missing.length === 0
    && errors.length === 0
    && rightN === Object.keys(key).length
    && badN === 0
    && right.marked.every((m) => m.shown);
  console.log('\n' + (ok ? `quiz grade check passed (${rightN} correct, ${badN} false positives)` : 'QUIZ GRADE CHECK FAILED'));
  process.exit(ok ? 0 : 1);
})();
