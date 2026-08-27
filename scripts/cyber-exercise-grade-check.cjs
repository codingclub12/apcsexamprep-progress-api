#!/usr/bin/env node
// Drive a rebuilt exercise in a real browser and confirm it still grades.
//
//   node scripts/cyber-exercise-grade-check.cjs <body.html> [partNumber]
//
// The static gate proves each credited value names an option that exists. That
// is not the same as proving a student who picks it gets the point: the scoring
// runs inside a click handler, and a splice landing one character wrong in a JS
// string literal produces valid HTML that renders a dead Check button.
//
// The credited answers are read out of the page itself rather than hardcoded,
// so this works on any of the Topic 1.4 exercises without editing.
//
// Both directions are checked. A handler that always awarded full marks would
// pass an all-correct run on its own, so an all-wrong run has to score lower.

const { chromium } = require('../smoke/node_modules/playwright');
const fs = require('fs');
const exgate = require('../lib/cyber-exercise-gate');

const FILE = process.argv[2];
const PART = Number(process.argv[3] || 1);
if (!FILE) {
  console.error('usage: node scripts/cyber-exercise-grade-check.cjs <body.html> [partNumber]');
  process.exit(2);
}

const body = fs.readFileSync(FILE, 'utf8');

//  What the page itself says the answers are.
const sel = exgate.selects(body);
const correct = {};
for (const k of exgate.credited(body)) correct[k.select] = k.value;

//  For each keyed select, any option that is NOT the credited one.
const wrong = {};
for (const [id, v] of Object.entries(correct)) {
  const other = (sel[id] || []).find((o) => o.value !== v);
  if (other) wrong[id] = other.value;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const errors = [];

  //  checkPart refuses to run twice on the same part, so each run gets its own
  //  page rather than trying to reset state.
  const run = async (picks) => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
      { waitUntil: 'domcontentloaded' });
    return page.evaluate(({ picks: p, part }) => {
      const bad = [];
      for (const [id, v] of Object.entries(p)) {
        const el = document.getElementById(id);
        if (!el) { bad.push(`missing ${id}`); continue; }
        el.value = v;
        if (el.value !== v) bad.push(`${id} would not take ${v}`);
      }
      if (typeof window.checkPart !== 'function') return { bad, score: null, err: 'no checkPart' };
      window.checkPart(part);
      const t = document.getElementById('totalScore');
      return { bad, score: t ? t.textContent : null };
    }, { picks, part: PART });
  };

  console.log(`${FILE}`);
  console.log(`credited answers read from the page: ${Object.entries(correct).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  console.log('');

  const right = await run(correct);
  console.log('all-correct run');
  console.log('  select errors :', right.bad.length ? right.bad.join('; ') : 'none');
  console.log('  Part', PART, 'score :', right.score);

  const bad = await run(wrong);
  console.log('');
  console.log('all-wrong run');
  console.log('  Part', PART, 'score :', bad.score);

  console.log('');
  console.log('page errors     :', errors.length ? errors.join('; ') : 'none');

  await browser.close();

  const nRight = Number(right.score);
  const nWrong = Number(bad.score);
  const ok = right.bad.length === 0
    && errors.length === 0
    && Number.isFinite(nRight) && Number.isFinite(nWrong)
    && nRight > 0
    && nWrong < nRight;
  if (!ok) {
    console.log('\nGRADE CHECK FAILED');
    if (nRight === 0) console.log('  the all-correct run scored nothing, so at least one key is unreachable');
    if (nWrong >= nRight) console.log('  wrong answers scored as well as right ones, so the handler is not discriminating');
    process.exit(1);
  }
  console.log(`\ngrade check passed (${nRight} correct vs ${nWrong} wrong)`);
})();
