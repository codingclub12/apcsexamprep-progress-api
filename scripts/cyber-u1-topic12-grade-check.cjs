#!/usr/bin/env node
// Drive every graded item on the built Topic 1.2 body in a real browser, answer
// each one correctly, and read back what the page says.
//
//   node scripts/cyber-u1-topic12-grade-check.cjs [body.html]
//
// WHY THIS EXISTS. The static gate proved that cfu-5's four blanks resolved
// against six chips, which was true, and the item still shipped broken: the
// question had been rebuilt onto the targeted-dictionary chain while its
// feedback still explained the salting sequence it used to ask about. A student
// who answered correctly was told the answer was "random salt, plaintext
// password, slow hash function". Nothing that reads markup could see that,
// because both halves were individually well formed.
//
// So this answers each item the way the key says to and asserts two things:
// the widget agrees that the answer is right, and the feedback it then reveals
// is talking about THIS question. For fill-in-the-blank that second one is
// exact: every phrase the feedback puts in bold has to be a chip in the item's
// own word bank. For the other widget shapes it prints the pair and leaves the
// judgement to a reader, which is honest about what it can and cannot check.
const { chromium } = require('../smoke/node_modules/playwright');
const fs = require('fs');

const FILE = process.argv[2] || 'out/topic12-preview.html';
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage();
  const body = fs.readFileSync(FILE, 'utf8');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    { waitUntil: 'domcontentloaded' });

  const r = await page.evaluate(() => {
    const out = { items: [], errors: [] };
    const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');

    for (const block of document.querySelectorAll('.cfu-block')) {
      const num = block.dataset.num;
      const type = block.dataset.type
        || (block.dataset.answer ? 'mcq' : (block.querySelector('.match-row') ? 'match' : '?'));
      const item = {
        num,
        type,
        label: txt(block.querySelector('.cfu-label')),
        question: txt(block.querySelector('.cfu-question')) || txt(block.querySelector('.cr-prompt')),
        verdict: '',
        feedback: '',
        strongs: [],
        bank: [],
      };

      try {
        if (type === 'mcq' || block.dataset.answer) {
          const key = block.dataset.answer;
          const opt = block.querySelector(`.cfu-opt[data-val="${key}"]`);
          if (!opt) throw new Error(`no option ${key}`);
          opt.click();
          window.cfuSubmit(Number(num));
          item.bank = [...block.querySelectorAll('.cfu-opt')].map((o) => o.dataset.val);
        } else if (type === 'dtb') {
          const chips = [...block.querySelectorAll('.dtb-chip')];
          item.bank = chips.map((c) => c.dataset.val);
          for (const b of block.querySelectorAll('.dtb-blank')) {
            const want = b.dataset.correct;
            const chip = chips.find((c) => c.dataset.val === want);
            if (!chip) throw new Error(`no chip for ${want}`);
            const chipId = chip.id.split('-').pop();
            const blankId = b.id.split('-').pop();
            window.dtbSelectChip(num, chipId);
            window.dtbPlaceChip(num, blankId);
          }
          window.dtbSubmit(Number(num));
        } else if (type === 'seq') {
          //  Selection sort using only the arrows a student has, so the check
          //  exercises seqMove rather than reaching past it into the DOM.
          const want = block.dataset.correctOrder.split(',');
          const list = document.getElementById(`seq-${num}-list`);
          item.bank = want.slice();
          for (let i = 0; i < want.length; i++) {
            for (;;) {
              const items = [...list.querySelectorAll('.seq-item')];
              const at = items.findIndex((el, j) => j >= i && el.dataset.stepId === want[i]);
              if (at === i) break;
              if (at < 0) throw new Error(`step ${want[i]} missing`);
              window.seqMove(num, items[at].id.split('-').pop(), 'up');
            }
          }
          window.seqSubmit(Number(num));
        } else if (type === 'cr') {
          const ta = document.getElementById(`cr-${num}-text`);
          ta.value = 'A written answer long enough to satisfy the twenty character minimum.';
          window.crSubmit(Number(num));
        } else if (block.querySelector('.match-row')) {
          for (const row of block.querySelectorAll('.match-row')) {
            const sel = row.querySelector('.match-select');
            sel.value = row.dataset.correct;
            item.bank.push(row.dataset.correct);
          }
          window.matchSubmit(Number(num));
        } else {
          throw new Error(`unknown widget type ${type}`);
        }
      } catch (e) {
        out.errors.push(`cfu-${num}: ${e.message}`);
      }

      const fb = document.getElementById(`cfu-${num}-feedback`);
      item.verdict = txt(document.getElementById(`cfu-${num}-verdict`));
      const explain = fb ? fb.querySelector('.cfu-feedback-explain') : null;
      item.feedback = txt(explain);
      item.strongs = explain ? [...explain.querySelectorAll('strong, em')].map((e) => txt(e)) : [];
      item.visible = fb ? getComputedStyle(fb).display !== 'none' : false;
      out.items.push(item);
    }
    return out;
  });

  await browser.close();

  let fails = 0;
  let pageErrors = 0;
  const bad = (m) => { fails++; console.log(`FAIL  ${m}`); };

  //  A verdict that does not say the answer was right means the key and the
  //  item disagree, which is the silent mis-grade this whole suite is about.
  //  The constructed response is effort-graded by design: it has no key, and
  //  "Response submitted" IS its success state.
  const RIGHT = /^(Correct!|Perfect match!|All blanks correct!|Perfect order!|Response submitted)/i;

  for (const it of r.items) {
    console.log(`\ncfu-${it.num}  [${it.type}]  ${it.label}`);
    console.log(`  Q: ${it.question.slice(0, 150)}`);
    console.log(`  verdict: ${JSON.stringify(it.verdict)}`);
    console.log(`  feedback: ${it.feedback.slice(0, 170)}`);
    if (!it.visible) bad(`cfu-${it.num} feedback never opened after a correct answer`);
    if (!RIGHT.test(it.verdict)) bad(`cfu-${it.num} graded the keyed answer as not right: ${JSON.stringify(it.verdict)}`);

    //  The exact check. On a fill-in-the-blank item the feedback's emphasised
    //  phrases ARE the answer, so every one of them has to exist in the bank.
    //  cfu-5 shipped with four bolded phrases, none of which was a chip.
    if (it.type === 'dtb') {
      const bank = it.bank.map((b) => b.toLowerCase());
      for (const sN of it.strongs) {
        const s = sN.toLowerCase().replace(/[.:,]$/, '');
        if (/^(correct sequence|correct answer|the answer)$/.test(s)) continue;
        if (!bank.some((b) => s.includes(b) || b.includes(s))) {
          bad(`cfu-${it.num} feedback emphasises ${JSON.stringify(sN)}, which is not in its word bank `
            + `[${it.bank.join(' | ')}] - the feedback is answering a different question`);
        }
      }
    }
  }

  //  Runtime errors are reported apart from grading errors, because they are a
  //  different fact about the page and conflating them hides both.
  //
  //  The one this finds today is not ours and is not a mis-grade. The page's
  //  updateTracker() is declared inside the IIFE that defines cfuSubmit, while
  //  matchSubmit, dtbSubmit, seqSubmit and crSubmit are declared after that
  //  IIFE closes, so all four throw ReferenceError on the line after they set
  //  the verdict. Grading, the verdict and the feedback all happen first and
  //  are correct; what is lost is the running score display and the scroll to
  //  the feedback. It reproduces identically on the live body with no splices
  //  applied, and on Topic 1.4, which carries the same widget block. Left alone
  //  deliberately: it is shared page JS, it predates the CED work, and fixing
  //  it on one of the two pages that have it would be worse than reporting it.
  for (const e of r.errors) { pageErrors++; console.log(`PAGE ERROR  ${e}`); }

  console.log(`\n${r.items.length} graded items driven`);
  if (fails) console.error(`${fails} grading check(s) failed`);
  if (pageErrors) console.error(`${pageErrors} runtime error(s) in the page's own widget JS`);
  if (fails || pageErrors) process.exit(1);
  console.log('every keyed answer grades as correct, and every blank-fill feedback names its own chips');
})();
