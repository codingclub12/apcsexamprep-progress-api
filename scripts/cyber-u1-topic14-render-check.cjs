#!/usr/bin/env node
// Render a built lesson body in a real browser and assert that nothing which
// should be hidden is painted.
//
//   node scripts/cyber-u1-topic14-render-check.cjs [body.html] [shot.png]
//
// The 2026-08-27 answer leak on the 1.1 lesson was invisible to every static
// check that ran that day: the markup was well formed, the tags balanced, the
// scripts compiled. Eight feedback boxes had simply lost display:none and the
// page served its answer key on load. Only looking at the rendered page finds
// that, so this exists and runs before any sheet ships.
const { chromium } = require('../smoke/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const FILE = process.argv[2]
  || 'shopify/page-snapshots/ap-cybersecurity-unit-1-ai-driven-threats.after-ced-realignment.html';
const SHOT = process.argv[3] || null;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const body = fs.readFileSync(FILE, 'utf8');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    { waitUntil: 'domcontentloaded' });

  const r = await page.evaluate(() => {
    const vis = (el) => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
    };
    const out = { leaked: [], hiddenOk: [], text: document.body.innerText };
    for (const el of document.querySelectorAll('.cfu-feedback')) {
      (vis(el) ? out.leaked : out.hiddenOk).push(el.id);
    }
    //  The coverage table's id carries the topic number: ek11-body on 1.1,
    //  ek12-body on 1.2, and so on. Pinned to ek14-body this reported an empty
    //  array on every other page, which reads the same as "not collapsed".
    out.ekBody = [...document.querySelectorAll('[id^="ek"][id$="-body"]')].map((e) => vis(e));
    out.cfuBlocks = document.querySelectorAll('.cfu-block').length;
    out.tables = [...document.querySelectorAll('table.vocab-table')].map((t) =>
      [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()).join(' | '));
    out.chips = [...document.querySelectorAll('.dtb-chip')].map((c) => c.dataset.val);
    out.blanks = [...document.querySelectorAll('.dtb-blank')].map((c) => c.dataset.correct);
    return out;
  });

  console.log('cfu blocks rendered      :', r.cfuBlocks);
  console.log('feedback hidden          :', r.hiddenOk.length, '/', r.hiddenOk.length + r.leaked.length);
  console.log('feedback LEAKED          :', r.leaked.length ? r.leaked.join(', ') : 'none');
  console.log('EK coverage table visible:', r.ekBody, '(false = collapsed, correct)');
  console.log('vocab table headers      :');
  r.tables.forEach((t) => console.log('   ', t));
  console.log('dtb chips                :', r.chips.join(' | '));
  console.log('dtb blank answers        :', r.blanks.join(' | '));
  const unresolved = r.blanks.filter((b) => !r.chips.includes(b));
  console.log('blanks with no chip      :', unresolved.length ? unresolved.join(', ') : 'none');

  // Does the painted text give away any answer? Test real answer CONTENT, not
  // labels: "Model Answer" is also the text on cfu-9's submit button, so
  // matching on it flags a button that is supposed to be visible.
  //  Match on the SHAPE of an answer key, not on a phrase that can occur in
  //  ordinary copy. "is correct." matched an option label reading "I is
  //  incorrect and II is correct." and a sentence about a password that is
  //  correct, on a page with no leak at all. A feedback box opens with a bare
  //  option letter, a space, and "is correct." at the start of its text, which
  //  option labels and prose do not do.
  const tells = [
    /(^|\n)\s*[A-E] is correct\./,
    /(^|\n)\s*Correct (?:matches|order|sequence):/,
    /(^|\n)\s*Slash the trash:/,
  ];
  const found = tells.filter((t) => t.test(r.text)).map((t) => String(t));
  console.log('answer-key phrases in painted text :', found.length ? found.join(' / ') : 'none');

  if (SHOT) await page.screenshot({ path: SHOT, fullPage: false });
  await browser.close();

  const bad = r.leaked.length || unresolved.length || found.length || r.ekBody.some(Boolean);
  console.log('\n' + (bad ? 'RENDER CHECK FAILED' : 'render check passed'));
  process.exit(bad ? 1 : 0);
})();
