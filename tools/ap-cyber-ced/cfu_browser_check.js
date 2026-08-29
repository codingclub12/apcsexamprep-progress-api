'use strict';
//  Drive every check on the rebuilt page in a real browser. The question this
//  answers is not "does it render" but "does a student who clicks through it
//  get graded", which no amount of markup inspection can establish.
const { chromium } = require('playwright-core');
const fs = require('fs');

const PAGE = process.argv[2];
let failures = 0;
const fail = (m) => { console.log(`FAIL  ${m}`); failures += 1; };
const ok = (m) => console.log(`ok    ${m}`);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.setContent(fs.readFileSync(PAGE, 'utf8'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  //  1. the grader ran and wired every block
  const blocks = await page.$$eval('.cfu-block', (els) => els.map((e) => ({
    id: e.id, type: e.dataset.type, num: e.dataset.num,
    btn: !!e.querySelector('.cfu-submit-btn'),
    btnText: (e.querySelector('.cfu-submit-btn') || {}).textContent || null,
  })));
  console.log(`blocks found: ${blocks.length}`);
  if (blocks.length !== 10) fail(`expected 10 blocks, found ${blocks.length}`);
  else ok('10 check blocks present in the DOM');
  const noBtn = blocks.filter((b) => !b.btn);
  if (noBtn.length) fail(`blocks with no submit button: ${noBtn.map((b) => b.id).join(', ')}`);
  else ok('the grader created a submit button on every block');
  const labels = [...new Set(blocks.map((b) => `${b.type}=${b.btnText}`))];
  ok(`button labels by type: ${labels.join('  ')}`);

  //  2. the score tracker exists and starts hidden
  const trackerStart = await page.evaluate(() => {
    const t = document.getElementById('cfu-score-tracker');
    const n = document.getElementById('cfu-score-num');
    return { exists: !!t, visible: t ? t.classList.contains('visible') : null, text: n ? n.textContent : null };
  });
  if (!trackerStart.exists) fail('score tracker element missing (every sibling has one)');
  else ok(`score tracker present, starts hidden=${!trackerStart.visible}, reads "${trackerStart.text}"`);

  //  3. answer every check CORRECTLY and confirm the score reaches 10 / 10
  //  Every answer is read off the page's own data-answer rather than hardcoded,
  //  so this harness works against any version of the page and cannot silently
  //  pass by testing a key it supplied itself.
  for (const b of blocks) {
    const n = Number(b.num);
    const key = await page.getAttribute(`#cfu-${n}`, 'data-answer');
    if (b.type === 'mcq') {
      await page.click(`#cfu-${n} .cfu-opt[data-val="${key}"]`);
    } else if (b.type === 'cloze') {
      const parts = key.split(',');
      for (let i = 0; i < parts.length; i += 1) await page.fill(`#cfu${n}-c${i + 1}`, parts[i]);
    } else if (b.type === 'matching') {
      const parts = key.split(',');
      for (let i = 0; i < parts.length; i += 1) {
        await page.selectOption(`#cfu${n}-m${i + 1}`, parts[i]);
      }
    } else if (b.type === 'checkbox') {
      for (const v of key.split(',')) {
        await page.check(`#cfu-${n} .cfu-cb[value="${v}"]`);
      }
    }
    await page.click(`#cfu-${n} .cfu-submit-btn`);
    await page.waitForTimeout(60);
  }

  const after = await page.evaluate(() => ({
    num: (document.getElementById('cfu-score-num') || {}).textContent || '(no tracker)',
    visible: !!(document.getElementById('cfu-score-tracker') || {}).classList
      && document.getElementById('cfu-score-tracker').classList.contains('visible'),
    feedbackShown: [...document.querySelectorAll('.cfu-feedback')].filter((f) => f.style.display === 'block').length,
    correctShown: [...document.querySelectorAll('.cfu-fb-correct')].filter((f) => f.style.display === 'block').length,
    btnsDisabled: [...document.querySelectorAll('.cfu-submit-btn')].filter((b) => b.disabled).length,
  }));
  if (after.num === '10 / 10') ok(`all correct answers score ${after.num}`);
  else fail(`all correct answers scored ${after.num}, expected 10 / 10`);
  if (after.visible) ok('score tracker became visible after the first answer');
  else fail('score tracker never became visible');
  if (after.feedbackShown === 10) ok('feedback opened on all 10 checks');
  else fail(`feedback opened on ${after.feedbackShown} of 10`);
  if (after.correctShown === 10) ok('the correct-answer explanation showed on all 10');
  else fail(`correct explanation showed on ${after.correctShown} of 10`);
  if (after.btnsDisabled === 10) ok('every submit button disabled after use (no double scoring)');
  else fail(`${after.btnsDisabled} of 10 buttons disabled`);

  //  4. a WRONG answer must score 0 and show the matching distractor feedback
  const p2 = await browser.newPage();
  p2.on('pageerror', (e) => errors.push(`p2: ${e}`));
  await p2.setContent(fs.readFileSync(PAGE, 'utf8'), { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(500);
  await p2.click('#cfu-1 .cfu-opt[data-val="C"]');   // a distractor
  await p2.click('#cfu-1 .cfu-submit-btn');
  await p2.waitForTimeout(80);
  const wrong = await p2.evaluate(() => ({
    score: (document.getElementById('cfu-score-num') || {}).textContent || '(no tracker)',
    distractorShown: !!document.querySelector('#cfu-fb-1 .cfu-fb-wrong[data-a="C"]')
      && document.querySelector('#cfu-fb-1 .cfu-fb-wrong[data-a="C"]').style.display === 'block',
    correctAlsoShown: document.querySelector('#cfu-fb-1 .cfu-fb-correct').style.display === 'block',
    optMarked: !!document.querySelector('#cfu-1 .cfu-opt-correct') && !!document.querySelector('#cfu-1 .cfu-opt-wrong'),
  }));
  if (wrong.score === '0 / 10') ok('a wrong answer scores 0 and does not increment');
  else fail(`wrong answer scored ${wrong.score}`);
  if (wrong.distractorShown) ok('the specific distractor feedback opened');
  else fail('distractor feedback did not open');
  if (wrong.correctAlsoShown) ok('the correct explanation is also revealed after a wrong answer');
  else fail('correct explanation not revealed after a wrong answer');
  if (wrong.optMarked) ok('right option marked correct and chosen option marked wrong');
  else fail('option highlighting did not apply');

  //  5. the collapsed panels open
  const panels = await p2.evaluate(() => {
    const out = {};
    for (const id of ['ek36-body', 'apx-body']) {
      const el = document.getElementById(id);
      out[id] = el ? el.style.display : 'MISSING';
    }
    return out;
  });
  ok(`collapsed panels start hidden: ${JSON.stringify(panels)}`);
  const opened = await p2.evaluate(() => {
    const hdr = document.querySelector('[onclick*="apx-body"]');
    if (!hdr) return 'no toggle found';
    hdr.click();
    return document.getElementById('apx-body').style.display;
  });
  if (opened === 'block') ok('the background appendix opens when its header is clicked');
  else fail(`appendix toggle produced display="${opened}"`);

  const ekOpened = await p2.evaluate(() => {
    const hdr = document.querySelector('[onclick*="ek36-body"]');
    if (!hdr) return 'no toggle found';
    hdr.click();
    return document.getElementById('ek36-body').style.display;
  });
  if (ekOpened === 'block') ok('the teacher coverage table opens when its header is clicked');
  else fail(`coverage toggle produced display="${ekOpened}"`);

  if (errors.length) { fail(`${errors.length} page error(s):`); errors.slice(0, 6).forEach((e) => console.log(`        ${e.slice(0, 150)}`)); }
  else ok('no page errors or console errors during the whole run');

  await browser.close();
  console.log(failures ? `\n${failures} assertion(s) failed` : '\nevery check grades correctly in a real browser');
  process.exit(failures ? 1 : 0);
})();
