'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE GATE FOR A "STOP CITING THE CED AND THE EXAM AT STUDENTS" SHEET, ON THE
//  PAGE SHAPES THAT ARE NOT LESSONS.
//
//  ── WHY NOT cyber-thin-gate ────────────────────────────────────────────────
//  The thinning gate asserts that the accordion header "College Board Essential
//  Knowledge Coverage" SURVIVES and that "CED" still appears in the source: on a
//  lesson page the coverage table is a teacher's audit surface and deleting it
//  would satisfy "no CED in content" the wrong way.
//
//  Exercises, labs, quizzes, the case file and the unit exam have no coverage
//  table. Running the lesson gate against them fails on the framing check for a
//  header that was never there, and the honest fix is a gate that knows which
//  question it is asking, not an allowance bolted onto the other one.
//
//  So: on these pages ZERO is simply zero. Nothing about the course description
//  survives in what a student reads, because there is no teacher surface here
//  for it to survive in. Where a page DOES carry a coverage accordion, pass
//  framing:true and the lesson rule applies instead.
//
//  ── WHAT "A CLAIM ABOUT THE EXAM" MEANS HERE, AND WHAT IT DOES NOT ─────────
//  These pages are exam practice. "AP Exam Tip" as a heading over advice about
//  how to read a question is not the defect and is not removed. The defect is an
//  assertion about what the exam DOES: what it tests, how often, what it always
//  asks. AP Cybersecurity has not been administered, so a frequency claim about
//  it describes nothing that has happened. Advice survives; the frequency claim
//  does not. `allowLabel` says a page's own tip headings may stay.
//
//  ── PAINTED TEXT, NOT MARKUP ───────────────────────────────────────────────
//  document.body.innerText from a real browser. Reading markup cannot tell a
//  collapsed panel from content, and getComputedStyle on a child of a
//  display:none parent returns the CHILD's display. Both traps have produced a
//  confident wrong answer in this repo.
// ─────────────────────────────────────────────────────────────────────────────

const gate0 = require('./cyber-page-gate');
const tg = require('./cyber-thin-gate');
const exgate = require('./cyber-exercise-gate');

const EK = /\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g;

//  ── THE SENTENCE WINDOW ────────────────────────────────────────────────────
//  A claim is looked for in the sentence around a mention of the exam, so the
//  window runs to the nearest sentence end. The obvious spelling, [^.!?], also
//  breaks on the dot in "Topic 1.3", which silently split
//  "The hardest Topic 1.3 AP exam questions combine two attack types" into two
//  windows with "hardest" in one and "exam questions" in the other. The claim
//  was invisible to the check on exactly the pages that name their topic.
//
//  So a period is a sentence end only when a digit does not follow it.
const SENTENCE_CHAR = '(?:[^.!?]|\\.(?=\\d))';
const claimWindow = () => new RegExp(
  `${SENTENCE_CHAR}{0,120}\\b(?:AP )?exam${SENTENCE_CHAR}{0,120}`, 'gi');
const FRAMING = /College Board Essential Knowledge Coverage/i;

//  ── THE CLAIM PATTERNS, AND WHY THEY ARE A LIST ────────────────────────────
//  The lesson gate's ASSERTS was written against lesson prose and does not see
//  the constructions these pages use. Run against the nine exercise and lab
//  pages it reported zero claims BEFORE any edit, because their only trip was
//  the "AP Exam Tip" heading, which this pass deliberately keeps: a heading over
//  advice is not a claim. "AP exam wireless questions always give you a
//  scenario" went straight through it.
//
//  A check that passes a page before and after an edit has not checked the edit.
//  So this is the list of constructions actually found on these pages, and it
//  grows when a new one is found rather than being widened on a guess.
//
//  KNOWN GAP, stated rather than papered over: a claim phrased in words not on
//  this list passes. The alternative, requiring only the co-occurrence of "exam"
//  with an assertion word, flags "VPN is almost always the answer for data
//  theft", which is advice about VPNs sitting near a tip heading and is not a
//  claim about anything. That trade drives edits to copy that was never broken,
//  which is the more expensive failure. Reading the page is still the standard;
//  this stops a known construction coming back.
const CLAIM_PATTERNS = [
  //  Bare \bfrequently\b was too blunt: a lesson page's own contents list reads
  //  "1.1.9: AP Exam Strategy ... 1.1.10: Frequently Asked Questions", which
  //  puts "exam" and "frequently" in one window and flagged three clean lesson
  //  pages. Every real claim removed in this pass was "frequently <verb>":
  //  frequently tested, frequently presents, frequently gives, frequently asks.
  /\bfrequently (?:tested|tests?|presents?|gives?|asks?|appears?|shows?|used)\b/i,
  /\bcommonly (?:tested|tests?|presents?|appears?|asked on)\b/i,
  /\balmost always (?:give|gives|test|tests|ask|asks|present|presents)\b/i,
  /\balways (?:give|gives|test|tests|ask|asks|present|presents|involve|involves|associate|asks)\b/i,
  /\b(?:high[- ]frequency|most heavily tested|heavily tested|tested most on)\b/i,
  /\bappears? (?:together )?on (?:real|actual|the) exams?\b/i,
  /\bappears? (?:in|on) almost every\b/i,
  /\bexams? (?:tests?|treats?|presents?|gives?|asks?|includes?|will test)\b/i,
  /\bon the (?:AP )?exam,? (?:tests?|appears?)\b/i,
  /\bspecifically tests\b/i,
  /\bexpect (?:scenario|question|to see)\b/i,
  /\bExample AP question\b/i,
  /\bclassic exam pairing\b/i,
  /\bnuanced AP exam topic\b/i,
  /\bhigh-value AP exam concept\b/i,
  /\bthe (?:AP )?exam (?:frequently|often|usually|typically|will|treats)\b/i,
  //  [^.] here would break on "Topic 1.3" for the same reason the window did.
  /\bhardest\b.{0,30}?\bAP exam questions\b/i,
];
const ASSERTS_NO_LABEL = {
  //  Same shape as a RegExp for the caller: .exec returns a match-like array.
  exec(s) {
    for (const re of CLAIM_PATTERNS) {
      const m = re.exec(s);
      if (m) return m;
    }
    return null;
  },
  test(s) { return this.exec(s) !== null; },
};

async function citeGate(chromium, exec, before, after, opts = {}) {
  const fail = [];
  const note = [];

  const pb = await tg.painted(chromium, exec, before);
  const pa = await tg.painted(chromium, exec, after);
  const claimRe = opts.allowLabel ? ASSERTS_NO_LABEL : tg.ASSERTS;

  // ---- 1. the course description, by name ---------------------------------
  const cedBefore = (pb.text.match(/\bCED\b/g) || []).length;
  const cedAfter = (pa.text.match(/\bCED\b/g) || []).length;
  note.push(`"CED" in painted text: ${cedBefore} -> ${cedAfter}`);
  for (const m of pa.text.matchAll(/[^.!?\n]{0,90}\bCED\b[^.!?\n]{0,90}/g)) {
    fail.push(`"CED" still reaches a reader: ${JSON.stringify(m[0].trim().slice(0, 120))}`);
  }

  // ---- 2. the codes -------------------------------------------------------
  const ekBefore = (pb.text.match(EK) || []).length;
  const ekAfter = pa.text.match(EK) || [];
  note.push(`EK codes in painted text: ${ekBefore} -> ${ekAfter.length}`);
  if (ekAfter.length > (opts.allowPaintedEk || 0)) {
    fail.push(`${ekAfter.length} EK code(s) still painted, allowance is `
      + `${opts.allowPaintedEk || 0}: ${[...new Set(ekAfter)].join(' ')}`);
  }

  // ---- 3. claims about what the exam does ---------------------------------
  const claimsBefore = [];
  const claimsAfter = [];
  for (const [src, into] of [[before, claimsBefore], [after, claimsAfter]]) {
    for (const m of tg.flat(src).matchAll(claimWindow())) {
      const hit = claimRe.exec(m[0]);
      if (hit) into.push({ hit: hit[0], where: m.index + m[0].indexOf(hit[0]) });
    }
  }
  note.push(`claims about what the exam does: ${claimsBefore.length} -> ${claimsAfter.length}`);
  const f = tg.flat(after);
  for (const c of claimsAfter) {
    //  Centred on the phrase that tripped it. Sliced from the start of the
    //  window it shows a hundred characters of unrelated text and reads as a
    //  false positive, which is how real findings get waved through.
    fail.push('a claim about what the exam does: '
      + JSON.stringify(f.slice(Math.max(0, c.where - 60), c.where + c.hit.length + 60).trim()));
  }

  // ---- 4. the framing mention, where a page has one -----------------------
  if (opts.framing) {
    if (!FRAMING.test(pa.text)) fail.push('the coverage accordion header is gone');
    else note.push('framing mention intact: the coverage accordion header');
    if (pa.coverageOpen) fail.push('the coverage table is no longer collapsed');
  }

  // ---- 5. nothing graded moved --------------------------------------------
  fail.push(...gate0.keysUnchanged(before, after));
  note.push('every graded key unchanged');

  //  These pages grade in JavaScript by comparing <select> VALUES, and this
  //  pass rewrites option LABELS. Nothing connects the two, so an edit that
  //  slipped into a value would leave a credited branch that never fires: the
  //  student cannot score the point however well they understand it, and
  //  nothing throws. cyber-exercise-gate already walks every credited value
  //  back to the select it reads, so it runs wherever there is a select to
  //  check rather than being reimplemented here.
  if (Object.keys(exgate.selects(after)).length) {
    const ex = exgate.check(before, after);
    fail.push(...ex.fail);
    note.push(...ex.note);
  }

  // ---- 6. no answer becomes visible ---------------------------------------
  fail.push(...gate0.nothingUnhidden(before, after));
  if (pa.feedbackVisible.length) {
    fail.push(`CFU feedback painted on load: ${pa.feedbackVisible.join(', ')}`);
  }
  note.push(`feedback boxes painted on load: ${pa.feedbackVisible.length} (want 0)`);

  // ---- 7. structure, scripts, house rules ---------------------------------
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'table', 'tr', 'td', 'th',
    'select', 'option', 'label', 'ol', 'ul', 'li', 'p']));
  fail.push(...gate0.scriptsParse(after));
  fail.push(...gate0.noNewNonAscii(before, after));
  if (opts.moduleSource) fail.push(...gate0.unwiredSplices(opts.moduleSource));

  const changed = gate0.changedSentences(before, after, tg.flat);
  note.push(`sentences changed: ${changed.length}`);
  return { fail: fail.filter(Boolean), note, changed };
}

module.exports = { citeGate, EK, ASSERTS_NO_LABEL, CLAIM_PATTERNS, claimWindow };
