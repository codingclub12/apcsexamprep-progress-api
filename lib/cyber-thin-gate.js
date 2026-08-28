'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE GATE FOR A "STOP SAYING THE CED TO STUDENTS" SHEET.
//
//  Written once for Topic 1.2, and then four more pages needed it. The repo's
//  own history says what happens next if it is copied: the 1.1 gate's
//  stayed_hidden check printed its warning and returned 0, and the 1.4 gate's
//  \bPrediction:\b could never match. Both were copies of a check that worked
//  somewhere else. So this moves before the fourth copy exists, not after.
//
//  ── THE RULE, AND WHY A COUNT CANNOT EXPRESS IT ────────────────────────────
//  Naming the course description where a topic BEGINS is fine: it tells a
//  student where this fits. Using it inside the teaching is not.
//
//  Some occurrences must therefore SURVIVE. Every one of these pages has a
//  coverage table headed "College Board Essential Knowledge Coverage", carrying
//  a "CED Ref" column and a source footnote, and shipping display:none. A gate
//  that counted occurrences would demand their removal and take the teacher's
//  audit surface with them.
//
//  So the rule is stated the way the house rule is written: ZERO in what a
//  reader sees, ANY NUMBER in what only a teacher opens. That distinction
//  cannot be made by reading markup, so this loads the body in a real browser
//  and reads document.body.innerText.
//
//  Reading the DOM instead is the trap. An earlier probe on 1.2 walked
//  elements, filtered to leaves, and reported a painted EK code as hidden
//  because it sat in a div that also held a <strong>. getComputedStyle on a
//  child of a display:none parent returns the CHILD's own display, not none.
//  innerText is the only thing that answers the question being asked.
//
//  ── WHAT ELSE IT REFUSES ───────────────────────────────────────────────────
//  Removing every reference would also satisfy "no CED in content", and would
//  be wrong, so the framing header is asserted to survive. Nothing graded may
//  move on a sheet that is only supposed to touch prose. And no AP claim may
//  come back: these pages had eleven between them and a copy pass is an easy
//  place to put one back without noticing.
// ─────────────────────────────────────────────────────────────────────────────

const gate0 = require('./cyber-page-gate');

const FRAMING = /College Board Essential Knowledge Coverage/i;

//  A claim about what the exam DOES, as opposed to a mention of the exam.
const ASSERTS = /\b(?:is|are|remain|tend to be|will be)\s+(?:a\s+)?(?:high[- ]frequency|very\s+)?(?:common|frequent|typical|favou?rite)|\bfrequently\b|\bcommonly\b|\bexpect\s+(?:scenario|question|to see)|\bhigh-frequency\b|\balways asks\b|\bspecifically tests\b|\balways involve\b|\bexam (?:signal|angle|tip)\b|\bExample AP question\b|\btested most on\b/i;

const flat = (s) => s
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

//  What a reader actually sees, from a real layout engine.
async function painted(chromium, exec, body) {
  const browser = await chromium.launch({ executablePath: exec });
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
      { waitUntil: 'domcontentloaded' });
    //  AWAITED, not returned. Returning the promise lets finally close the
    //  browser mid-evaluate, which fails with "Target page, context or browser
    //  has been closed" and reads like a Playwright problem rather than the
    //  ordinary try/finally bug it is.
    const r = await page.evaluate(() => ({
      text: document.body.innerText,
      feedbackVisible: [...document.querySelectorAll('.cfu-feedback')]
        .filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.id),
      coverageOpen: [...document.querySelectorAll('[id^="ek"][id$="-body"]')]
        .some((e) => getComputedStyle(e).display !== 'none'),
    }));
    return r;
  } finally {
    await browser.close();
  }
}

//  opts.modulePath  - checked for splices defined but never wired
//  opts.allowPaintedEk - pages whose thinning is staged may still paint codes
async function thinGate(chromium, exec, before, after, opts = {}) {
  const fail = [];
  const note = [];

  const pb = await painted(chromium, exec, before);
  const pa = await painted(chromium, exec, after);

  // ---- 1. zero in what a reader sees --------------------------------------
  const seenBefore = (pb.text.match(/\bCED\b/g) || []).length;
  const seenAfter = (pa.text.match(/\bCED\b/g) || []).length;
  note.push(`"CED" in painted text: ${seenBefore} -> ${seenAfter}`);
  if (seenAfter) {
    for (const m of pa.text.matchAll(/[^.!?\n]{0,90}\bCED\b[^.!?\n]{0,90}/g)) {
      fail.push(`"CED" still reaches a reader: ${JSON.stringify(m[0].trim().slice(0, 120))}`);
    }
  }

  // ---- 2. any number in what only a teacher opens -------------------------
  const srcAfter = (after.match(/\bCED\b/g) || []).length;
  note.push(`"CED" in source: ${(before.match(/\bCED\b/g) || []).length} -> ${srcAfter} `
    + '(the survivors are the coverage table, which ships collapsed)');
  if (srcAfter === 0) fail.push('the teacher coverage table lost its CED references entirely');

  // ---- 3. the framing mention has to survive ------------------------------
  if (!FRAMING.test(pa.text)) {
    fail.push('the coverage accordion header is gone, so nothing tells a student where this topic sits');
  } else {
    note.push('framing mention intact: the coverage accordion header');
  }
  if (pa.coverageOpen) fail.push('the coverage table is no longer collapsed');

  // ---- 4. EK codes a reader can see ---------------------------------------
  const ekBefore = (pb.text.match(/\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g) || []).length;
  const ekAfter = (pa.text.match(/\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g) || []).length;
  note.push(`EK codes in painted text: ${ekBefore} -> ${ekAfter}`);
  const allowed = opts.allowPaintedEk || 0;
  if (ekAfter > allowed) {
    fail.push(`${ekAfter} EK code(s) still painted, allowance is ${allowed}: `
      + [...new Set(pa.text.match(/\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g) || [])].join(' '));
  }

  // ---- 5. nothing graded moved --------------------------------------------
  for (const [label, re] of [
    ['MCQ keys', /id="(cfu-\d+)"[^>]*data-answer="([A-E])"/g],
    ['sequence order', /data-correct-order="([^"]+)"/g],
    ['match row keys', /id="mr-(\d+-\d+)"[^>]*data-correct="([^"]+)"/g],
    ['dtb blanks', /class="dtb-blank"[^>]*data-correct="([^"]+)"/g],
    ['dtb chips', /class="dtb-chip"[^>]*data-val="([^"]+)"/g],
    ['quiz answer key', /ANSWERS\s*=\s*\{([^}]*)\}/g],
  ]) {
    const g = (b) => [...b.matchAll(re)].map((m) => m.slice(1).join('=')).join(' ');
    if (g(before) !== g(after)) fail.push(`${label} changed: ${g(before)} -> ${g(after)}`);
  }
  note.push('MCQ, sequence, match, dtb and quiz keys all unchanged');

  // ---- 6. no answer becomes visible ---------------------------------------
  fail.push(...gate0.nothingUnhidden(before, after));
  if (pa.feedbackVisible.length) {
    fail.push(`CFU feedback painted on load: ${pa.feedbackVisible.join(', ')}`);
  }
  note.push(`feedback boxes painted on load: ${pa.feedbackVisible.length} (want 0)`);

  // ---- 7. no AP claim comes back ------------------------------------------
  for (const m of flat(after).matchAll(/[^.!?]{0,120}\b(?:AP )?exam[^.!?]{0,120}/gi)) {
    if (ASSERTS.test(m[0])) fail.push(`a claim about what the exam does: ${JSON.stringify(m[0].trim().slice(0, 90))}`);
  }

  // ---- 8. structure, scripts, house rules ---------------------------------
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'table', 'tr', 'td', 'th', 'select', 'label', 'ol', 'ul', 'li', 'p']));
  fail.push(...gate0.scriptsParse(after));
  fail.push(...gate0.noNewNonAscii(before, after));
  if (opts.moduleSource) fail.push(...gate0.unwiredSplices(opts.moduleSource));

  const changed = gate0.changedSentences(before, after, flat);
  note.push(`sentences changed: ${changed.length}`);
  return { fail: fail.filter(Boolean), note, changed };
}

module.exports = { thinGate, painted, flat, FRAMING, ASSERTS };
