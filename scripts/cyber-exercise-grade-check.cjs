#!/usr/bin/env node
// Drive a rebuilt exercise in a real browser and confirm it still grades.
//
//   node scripts/cyber-exercise-grade-check.cjs <body.html>
//
// The static gate proves each credited value names an option that exists. That
// is not the same as proving a student who picks it gets the point: the scoring
// runs inside a click handler, and a splice landing one character wrong in a JS
// string literal produces valid HTML that renders a dead Check button.
//
// The credited answers, the handler name and the score element are all read out
// of the page itself rather than hardcoded, so this works on any of the Topic
// 1.4 exercises without editing. The first version assumed checkPart and
// totalScore, which are what the two exercises use; the lab calls its handler
// checkSpecimen and its score element labScore, and the checker reported the
// page broken when the page was fine. A checker that cries wolf gets ignored.
//
// Both directions are checked. A handler that always awarded full marks would
// pass an all-correct run on its own, so an all-wrong run has to score lower.

const { chromium } = require('../smoke/node_modules/playwright');
const fs = require('fs');
const exgate = require('../lib/cyber-exercise-gate');

const FILE = process.argv[2];
if (!FILE) {
  console.error('usage: node scripts/cyber-exercise-grade-check.cjs <body.html>');
  process.exit(2);
}

const body = fs.readFileSync(FILE, 'utf8');

//  The page's own handler and score element.
const HANDLER = (/window\.(\w+)\s*=\s*function/.exec(body) || [])[1];
const SCORE_EL = (/getElementById\('(\w*(?:total|Total)\w*)'\)\.textContent/.exec(body)
  || /getElementById\('(\w*(?:score|Score)\w*)'\)\.textContent/.exec(body) || [])[1];
if (!HANDLER) { console.error(`no window.<handler> = function found in ${FILE}`); process.exit(1); }
if (!SCORE_EL) { console.error(`no score element written to in ${FILE}`); process.exit(1); }

//  Every part the page offers a Check button for. All of them get run, in order,
//  because the lab only writes its running total once all four specimens are
//  done: `if(!all)return;` guards the update. Checking a single part there left
//  the total at 0 and looked like a broken page. Running everything is also what
//  a student does, so it is the more honest test.
const PARTS = [...new Set([...body.matchAll(new RegExp(`${HANDLER}\\((\\d+)\\)`, 'g'))]
  .map((m) => Number(m[1])))].sort((a, b) => a - b);
if (!PARTS.length) { console.error(`no ${HANDLER}(n) calls found in ${FILE}`); process.exit(1); }

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

  //  The handler refuses to re-run a part it already scored, so each run gets a
  //  fresh page rather than trying to reset state.
  const run = async (picks) => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
      { waitUntil: 'domcontentloaded' });
    return page.evaluate(({ picks: p, parts, handler, scoreEl }) => {
      const bad = [];
      for (const [id, v] of Object.entries(p)) {
        const el = document.getElementById(id);
        if (!el) { bad.push(`missing ${id}`); continue; }
        el.value = v;
        if (el.value !== v) bad.push(`${id} would not take ${v}`);
      }
      if (typeof window[handler] !== 'function') return { bad, score: null, err: `no window.${handler}` };
      for (const n of parts) window[handler](n);
      const t = document.getElementById(scoreEl);
      return { bad, score: t ? t.textContent : null };
    }, { picks, parts: PARTS, handler: HANDLER, scoreEl: SCORE_EL });
  };

  console.log(`${FILE}`);
  console.log(`handler window.${HANDLER}(), parts ${PARTS.join(',')}, score element #${SCORE_EL}`);
  console.log(`credited answers read from the page: ${Object.entries(correct).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  console.log('');

  const right = await run(correct);
  console.log('all-correct run');
  console.log('  select errors :', right.bad.length ? right.bad.join('; ') : 'none');
  console.log('  total score   :', right.score);

  const bad = await run(wrong);
  console.log('');
  console.log('all-wrong run');
  console.log('  total score   :', bad.score);

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
