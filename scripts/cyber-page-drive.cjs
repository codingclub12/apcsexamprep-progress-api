#!/usr/bin/env node
// -----------------------------------------------------------------------------
//  DRIVE A UNIT 1 PAGE IN A REAL BROWSER AND COMPARE TWO VERSIONS OF IT.
//
//    node scripts/cyber-page-drive.cjs <before.html> <after.html>
//    node scripts/cyber-page-drive.cjs <body.html>            # score one body
//
//  WHY THIS EXISTS
//
//  A static gate proves the answer keys did not move. It does not prove a
//  student who picks the right answer still gets the point, and those are not
//  the same claim: the scoring runs inside a click handler, and a splice landing
//  one character wrong inside a JS string produces valid HTML and a dead Check
//  button. cyber-exercise-grade-check.cjs already makes the stronger claim, but
//  only for pages that grade with `x === '...'` comparisons.
//
//  Unit 1 has SIX grading shapes and that checker recognises one. Run against
//  the other five it reports "credited answers read from the page:" empty,
//  selects nothing, scores zero, and prints GRADE CHECK FAILED for three labs
//  that are in perfect working order. A checker that cries wolf gets ignored,
//  so this dispatches on the shape it finds instead.
//
//  ── THE SHAPES, AND HOW EACH IS RECOGNISED ─────────────────────────────────
//   x2      rendered buttons .x2-opt[data-q][data-i] against `var Q=[...]`
//   radio   <input type=radio name="q<key>" value="A"> against ANSWERS, checkQ()
//   selopt  onclick="selectOpt(n,'A')" against ANSWERS, checkQ(n)
//   table   `var ANSWERS = {1:{field:'value'}}` filling <select>s by value
//   emails  `var answers = {1:{tactic,type,senderKey}}` plus free-text fields
//   tools   `var TOOLS={} / var CLASSES={}` keyed by alert number
//
//  ── BOTH DIRECTIONS, ALWAYS ────────────────────────────────────────────────
//  A handler that awarded full marks unconditionally would pass an all-correct
//  run. So every shape is also run all-wrong, and a page that scores the same
//  either way is reported as not discriminating.
// -----------------------------------------------------------------------------

const fs = require('fs');
const { chromium } = require('../smoke/node_modules/playwright');
const EXEC = process.env.CHROMIUM_EXEC || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

//  Runs in page scope. The answer data lives inside the page's own IIFE, so it
//  is recovered from the script text rather than read off window.
function driveInPage(wrong) {
  const src = [...document.querySelectorAll('script')].map((s) => s.textContent).join('\n');
  const LET = ['A', 'B', 'C', 'D', 'E'];
  const grab = (re) => { const m = src.match(re); return m ? m[1] : null; };
  //  A non-greedy /\{[\s\S]*?\}/ stops at the first inner brace, so
  //  ANSWERS = {1:{type:'evil',...},...} came back as an unbalanced fragment and
  //  eval threw. Scan for the matching brace instead. This is why 1.3's lab
  //  reported no recognised shape while grading perfectly well.
  const balanced = (re) => {
    const m = src.match(re);
    if (!m) return null;
    let i = src.indexOf('{', m.index + m[0].length - 1);
    if (i < 0) return null;
    let depth = 0, inStr = null;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (inStr) { if (c === '\\') j++; else if (c === inStr) inStr = null; continue; }
      if (c === '"' || c === "'") { inStr = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (!depth) return src.slice(i, j + 1); }
    }
    return null;
  };
  const score = () => {
    const el = document.querySelector('#x2pt, #score-display, #qzScore, #labTotal, #totalScore, #labScore');
    return el ? el.textContent.trim() : '(no score element)';
  };
  const clickChecks = (re) => [...document.querySelectorAll('button')]
    .filter((b) => re.test(b.getAttribute('onclick') || ''))
    .map((b) => { try { b.click(); } catch (e) { /* the page's own error */ } return 1; }).length;

  // ---- x2: rendered option buttons against a Q array -----------------------
  const qArr = grab(/var Q=(\[[\s\S]*?\]);/);
  if (qArr && document.querySelector('.x2-opt')) {
    const Q = JSON.parse(qArr);
    let n = 0;
    for (const q of Q) {
      const want = wrong ? (q.key === 0 ? 1 : 0) : q.key;
      const b = document.querySelector(`.x2-opt[data-q="${q.id}"][data-i="${want}"]`);
      if (b) { b.click(); n++; }
    }
    //  onPick only records the pick; the score is written by the page's own
    //  Check button. Without this the page scores 0 and looks broken.
    [...document.querySelectorAll('button')]
      .filter((b) => /check|score|submit/i.test(b.textContent || ''))
      .forEach((b) => { try { b.click(); } catch (e) { /* page's own */ } });
    return { shape: 'x2', items: Q.length, answered: n, score: score() };
  }

  const ansSrc = balanced(/(?:var|const)\s+ANSWERS\s*=\s*\{/);
  let ANS = null;
  if (ansSrc) { try { ANS = eval(`(${ansSrc})`); } catch (e) { return { err: `ANSWERS parse: ${e.message}` }; } }

  // ---- radio: one radio group per question ---------------------------------
  if (ANS && document.querySelector('input[type="radio"]')) {
    let n = 0;
    for (const [q, key] of Object.entries(ANS)) {
      const want = wrong ? LET.find((l) => l !== key) : key;
      const r = document.querySelector(`input[name="q${q}"][value="${want}"]`)
        || document.querySelector(`input[name="${q}"][value="${want}"]`);
      if (r) { r.click(); n++; }
    }
    const checks = clickChecks(/checkQ/);
    return { shape: 'radio', items: Object.keys(ANS).length, answered: n, checks, score: score() };
  }

  // ---- selopt: onclick="selectOpt(n,'A')" ----------------------------------
  if (ANS && document.querySelector('[onclick^="selectOpt("]')) {
    let n = 0;
    for (const [q, key] of Object.entries(ANS)) {
      const want = wrong ? LET.find((l) => l !== key) : key;
      const el = document.querySelector(`[onclick="selectOpt(${q},'${want}')"]`);
      if (el) { el.click(); n++; }
      const cb = document.querySelector(`[onclick="checkQ(${q})"]`);
      if (cb) cb.click();
    }
    return { shape: 'selopt', items: Object.keys(ANS).length, answered: n, score: score() };
  }

  // ---- table: ANSWERS[n] = {field: optionValue}, filling selects ------------
  if (ANS && typeof Object.values(ANS)[0] === 'object') {
    let n = 0;
    for (const row of Object.values(ANS)) {
      for (const val of Object.values(row)) {
        const sel = [...document.querySelectorAll('select')].find((s) => !s.dataset.driven
          && [...s.options].some((o) => o.value === val));
        if (!sel) continue;
        sel.dataset.driven = '1';
        const opts = [...sel.options].map((o) => o.value).filter(Boolean);
        sel.value = wrong ? (opts.find((v) => v !== val) || val) : val;
        n++;
      }
    }
    const checks = clickChecks(/check/i);
    return { shape: 'table', items: Object.keys(ANS).length, answered: n, checks, score: score() };
  }

  // ---- emails: answers = {n:{tactic,type,senderKey}} plus free text ---------
  const emailSrc = balanced(/var answers\s*=\s*\{/);
  if (emailSrc) {
    let A; try { A = eval(`(${emailSrc})`); } catch (e) { return { err: `answers parse: ${e.message}` }; }
    const looksLikeEmails = Object.values(A).every((v) => v && typeof v === 'object' && 'senderKey' in v);
    if (!looksLikeEmails) return { shape: 'none', note: 'a variable named answers, but not the email-lab shape' };
    let n = 0;
    for (const [num, a] of Object.entries(A)) {
      const pre = `e${num}-`;
      const put = (id, v) => { const el = document.getElementById(pre + id); if (el) { el.value = v; n++; } };
      put('sender', wrong ? 'zzzzzzzzzz' : ((a.senderKey || [])[0] || ''));
      put('flags', 'aaaaaaaaaaaa');
      put('impact', 'aaaaaaaaaaaa');
      for (const [field, want] of [['tactic', a.tactic], ['type', a.type]]) {
        const el = document.getElementById(pre + field);
        if (!el) continue;
        const opts = [...el.options].map((o) => o.value).filter(Boolean);
        el.value = wrong ? (opts.find((v) => v !== want) || want) : want;
        n++;
      }
    }
    const checks = clickChecks(/checkEmail/);
    return { shape: 'emails', items: Object.keys(A).length, answered: n, checks, score: score() };
  }

  // ---- tools: TOOLS/CLASSES keyed by alert number ---------------------------
  const T = grab(/var TOOLS\s*=\s*(\{[^}]*\})/);
  const C = grab(/var CLASSES\s*=\s*(\{[^}]*\})/);
  if (T && C) {
    const tools = eval(`(${T})`); const classes = eval(`(${C})`);
    let n = 0;
    for (const num of Object.keys(tools)) {
      for (const [suffix, want] of [['tool', tools[num]], ['class', classes[num]]]) {
        const el = document.getElementById(`alert${num}-${suffix}`);
        if (!el) continue;
        const opts = [...el.options].map((o) => o.value).filter(Boolean);
        el.value = wrong ? (opts.find((v) => v !== want) || want) : want;
        n++;
      }
      const a = document.getElementById(`alert${num}-action`);
      if (a) {
        if (a.tagName === 'SELECT') { const o = [...a.options].map((x) => x.value).filter(Boolean); a.value = o[0] || ''; }
        else a.value = 'aaaaaaaaaaaa';
      }
    }
    const checks = clickChecks(/checkAlert/);
    return { shape: 'tools', items: Object.keys(tools).length, answered: n, checks, score: score() };
  }

  return { shape: 'none', note: 'no grading shape recognised on this page' };
}

async function drive(browser, body, wrong) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(driveInPage, wrong);
  await page.close();
  return { ...r, errors: errs };
}

async function main() {
  const [beforeFile, afterFile] = process.argv.slice(2);
  if (!beforeFile) {
    console.error('usage: node scripts/cyber-page-drive.cjs <before.html> [<after.html>]');
    process.exit(2);
  }
  const browser = await chromium.launch({ executablePath: EXEC });
  try {
    const B = fs.readFileSync(beforeFile, 'utf8');
    const bc = await drive(browser, B, false);
    const bw = await drive(browser, B, true);
    if (!afterFile) {
      console.log(`${beforeFile}\n  ${JSON.stringify(bc)}\n  all-wrong score: ${bw.score}`);
      process.exit(bc.shape === 'none' ? 0 : (bc.score === bw.score ? 1 : 0));
    }
    const A = fs.readFileSync(afterFile, 'utf8');
    const ac = await drive(browser, A, false);
    const aw = await drive(browser, A, true);
    const same = JSON.stringify(bc) === JSON.stringify(ac) && bw.score === aw.score;
    const discriminates = bc.shape !== 'none' && bc.score !== bw.score;
    console.log(`shape           ${bc.shape}`);
    console.log(`all-correct     before ${bc.score}   after ${ac.score}`);
    console.log(`all-wrong       before ${bw.score}   after ${aw.score}`);
    console.log(`answered        before ${bc.answered}   after ${ac.answered}`);
    console.log(`page errors     before ${bc.errors.length}   after ${ac.errors.length}`);
    console.log(`identical       ${same}`);
    console.log(`discriminates   ${discriminates}${bc.shape === 'none' ? ' (no grading on this page)' : ''}`);
    if (!same) {
      console.error('\nTHE EDIT CHANGED WHAT THE PAGE DOES');
      console.error(`  before ${JSON.stringify(bc)}`);
      console.error(`  after  ${JSON.stringify(ac)}`);
    }
    process.exit(same ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e.message); process.exit(2); });
