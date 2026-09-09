'use strict';
// -----------------------------------------------------------------------------
//  TAKE THE CED OUT OF FIVE QUIZ STEMS, SO THE EXTRACTOR CAN LIFT THEM.
//
//  ── WHY THIS EXISTS ────────────────────────────────────────────────────────
//  `ap-cyber-unit-2-lesson-3-quiz` and `ap-cyber-unit-4-lesson-1-quiz` are two
//  of the three cyber quizzes still scored in the browser, with their answer key
//  in page source. They are stuck there because `lib/quiz-citation.js` refuses a
//  stem that names the CED to a student, and five of theirs do. The extractor
//  holds the whole quiz back rather than seeding it one item short.
//
//  ── WHY THE LIVE PAGE HAS TO CHANGE, RATHER THAN THE SEED ──────────────────
//  `seed/cyber-units-2-5-web-quizzes.js` is GENERATED from live page bodies and
//  says "do not hand edit"; `build-cyber-quiz-seed.js --check` re-derives it to
//  prove it still matches. So a corrected stem has to exist in a body the
//  extractor actually reads.
//
//  It would have been half the work to patch a local copy of the body, run the
//  extractor on that, and skip this sheet entirely. That is routing around a
//  guard to get the output it was refusing, and the fact that the result would
//  look identical is exactly what makes it the wrong habit to leave behind.
//
//  ── WHAT THIS DOES NOT TOUCH ───────────────────────────────────────────────
//  EXPLANATIONS. `lib/quiz-citation.js` applies to prompts and options only, and
//  says why: an explanation ships after a teacher releases the key, and naming
//  the EK there is the useful thing to do. 2.3 carries fourteen EK codes in its
//  feedback blocks and every one of them stays.
//
//  Nor the "Beyond CED" nav label on 4.1, nor 2.3's subtitle. Neither is a stem.
//  Both disappear anyway when the mount replaces the body, which is the pass
//  after this one.
//
//  ── THE REWORDINGS ARE TANNER'S, NOT MINE ──────────────────────────────────
//  Four are deletions where the citation carries no meaning. The fifth, 4.1 Q6,
//  is a real rewrite: dropping "the CED" from "which CIA principle does the CED
//  most directly associate with it" leaves a broken sentence, so a verb had to
//  be chosen. They were written out in docs/cyber-last-three-quizzes-decision.md
//  and approved before this ran.
//
//  THIS WRITES A FILE AND NOTHING ELSE. Importing is a human action, and MERGE
//  overwrites a live body with no undo.
//
//  Run: node scripts/cyber-quiz-stem-reword.js --live <out.csv>
//       node scripts/cyber-quiz-stem-reword.js <bodies-dir> <out.csv>
//       node scripts/cyber-quiz-stem-reword.js --verify <sheet.csv>
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { hasCitation } = require('../lib/quiz-citation');

const PUBLISHED_AT = '2026-03-01 12:00:00';

//  Each edit names the page, the exact bytes on the page today, and what they
//  become. `find` is matched ONCE or the transform refuses: a stem that has
//  already been reworded, or one whose wording drifted, must not be guessed at.
const EDITS = [
  {
    handle: 'ap-cyber-unit-2-lesson-3-quiz',
    title: 'AP Cybersecurity Unit 2 Lesson 3 Quiz',
    q: 'Q4',
    find: 'Exactly one row is ranked wrongly under EK 2.3.B.8, which prioritizes mitigations by the severity of the risk and the cost of the mitigation.',
    repl: 'Exactly one row is ranked wrongly. Mitigations are prioritized by the severity of the risk and the cost of the mitigation.',
  },
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    title: 'AP Cybersecurity Unit 4 Lesson 1 Quiz',
    q: 'Q2',
    find: 'are <strong>TRUE</strong> according to the AP CED?',
    repl: 'are <strong>TRUE</strong>?',
  },
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    title: 'AP Cybersecurity Unit 4 Lesson 1 Quiz',
    q: 'Q3',
    find: 'with a valid CED defense <strong>EXCEPT</strong>:',
    repl: 'with a valid defense <strong>EXCEPT</strong>:',
  },
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    title: 'AP Cybersecurity Unit 4 Lesson 1 Quiz',
    q: 'Q5',
    find: 'Using the CED High/Moderate/Low device-risk framework,',
    repl: 'Using the High/Moderate/Low device-risk framework,',
  },
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    title: 'AP Cybersecurity Unit 4 Lesson 1 Quiz',
    q: 'Q6',
    find: 'which CIA principle does the CED most directly associate with it?',
    repl: 'which CIA principle is most directly affected?',
  },
];

const HANDLES = [...new Set(EDITS.map((e) => e.handle))];

function fail(msg) {
  console.error(`REFUSED  ${msg}`);
  process.exitCode = 1;
  return null;
}

//  The stem elements, per markup generation. Used to prove each edit lands in a
//  stem rather than in an explanation, and to check the result afterwards.
const STEM_RX = [
  /<span class="l-q-stem">([\s\S]*?)<\/span>/g,      // unit 4
  /<div class="q-stem">([\s\S]*?)<\/div>/g,          // the q-stem generation
  /<div class="q-block"[\s\S]*?(?=<label|<li|<input)/g, // units 2 and 3
];
function stemsOf(body) {
  const out = [];
  for (const rx of STEM_RX) { rx.lastIndex = 0; for (const m of body.matchAll(rx)) out.push({ text: m[1] || m[0], at: m.index }); }
  return out;
}

function rewrite(bodies) {
  const out = {};
  const applied = [];
  for (const handle of HANDLES) {
    let body = bodies[handle];
    if (body == null) return fail(`no body supplied for ${handle}`);
    for (const e of EDITS.filter((x) => x.handle === handle)) {
      const n = body.split(e.find).length - 1;
      if (n !== 1) {
        return fail(`${handle} ${e.q}: expected the stem text exactly once, found ${n}. `
          + 'Either the page changed or it has already been reworded; guessing is not an option here.');
      }
      //  Prove the hit is inside a stem, not an explanation. An explanation may
      //  keep its EK codes and this must never reach one.
      const at = body.indexOf(e.find);
      const inStem = stemsOf(body).some((s) => s.at <= at && at < s.at + s.text.length + 400);
      if (!inStem) return fail(`${handle} ${e.q}: the text is not inside a stem element`);
      body = body.replace(e.find, () => e.repl);
      applied.push(`${handle} ${e.q}`);
    }
    out[handle] = body;
  }
  if (applied.length !== EDITS.length) return fail(`applied ${applied.length} edits, expected ${EDITS.length}`);
  return { out, applied };
}

function transform(bodies) {
  const r = rewrite(bodies);
  if (!r) return null;
  const a = assertions(bodies, r.out);
  if (a) return fail(a);
  return r;
}
transform.raw = (bodies) => { const r = rewrite(bodies); return r ? r.out : null; };

function assertions(before, after) {
  for (const handle of HANDLES) {
    const b = before[handle], a = after[handle];

    // 1. No stem on the page names the CED any more. Run the module the
    //    extractor runs, not a second opinion about it.
    for (const s of stemsOf(a)) {
      if (hasCitation(s.text)) {
        return `assertion 1: ${handle} still has a stem naming the CED: ${JSON.stringify(s.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90))}`;
      }
    }

    // 2. Every stem DID carry one before, or this edit was pointless.
    const hadBefore = stemsOf(b).filter((s) => hasCitation(s.text)).length;
    if (hadBefore === 0) return `assertion 2: ${handle} had no offending stem to begin with`;

    // 3. THE EXPLANATIONS ARE UNTOUCHED. This is the assertion that matters:
    //    an EK code in an explanation is correct and useful, and a sloppy
    //    replace would strip them along with the stems.
    //  Explanation text, bounded by MARKUP rather than by a character count.
    //  The first version took a 400-character window after each feedback marker,
    //  which on 4.1 ran past the feedback div and into the next question's stem,
    //  so a correct stem edit read as a changed explanation. A window is a guess
    //  about length; `[^<]*` stops where the explanation actually stops.
    const expl = (s) => (s.match(/(?:Incorrect|Correct)\s*[^<\w][^<]*/g) || []).join('|');
    if (expl(b) !== expl(a)) return `assertion 3: ${handle} changed an explanation`;
    //  EK codes: the only ones that may disappear are the ones the named edits
    //  remove from a STEM. Counting them across the whole body was the first
    //  version of this and it fired on 2.3, correctly: Q4's stem legitimately
    //  loses "EK 2.3.B.8". The rule is not "no EK code moves", it is "no EK
    //  code moves except the ones these five edits account for", so the
    //  expected delta is derived from the edits rather than assumed to be zero.
    const ekList = (s) => (s.match(/\bEK\s*\d\.\d\.[A-Z]\.\d+/g) || []);
    const mine = EDITS.filter((x) => x.handle === handle);
    const expectRemoved = mine.reduce((n, e) => n + ekList(e.find).length - ekList(e.repl).length, 0);
    const removed = ekList(b).length - ekList(a).length;
    if (removed !== expectRemoved) {
      return `assertion 3: ${handle} lost ${removed} EK codes, the edits account for ${expectRemoved}. `
        + 'Explanations keep theirs on purpose.';
    }
    const gained = ekList(a).filter((x) => !ekList(b).includes(x));
    if (gained.length) return `assertion 3: ${handle} gained EK codes ${JSON.stringify(gained)}`;

    // 4. Nothing else moved. Only the five spans of text may differ, so putting
    //    them back must reproduce the original byte for byte.
    let undo = a;
    for (const e of EDITS.filter((x) => x.handle === handle)) undo = undo.replace(e.repl, () => e.find);
    if (undo !== b) return `assertion 4: ${handle} changed something other than the named stem text`;

    // 5. The answer key and the options are untouched.
    const key = (s) => (s.match(/checkMCQ\([^)]*\)|ANSWERS\s*=\s*\{[^}]*\}|checkQ\([^)]*\)/g) || []).join('|');
    if (key(b) !== key(a)) return `assertion 5: ${handle} changed an answer key`;
    const opts = (s) => (s.match(/<li><label[\s\S]{0,200}?<\/label>|<div class="opt"[\s\S]{0,200}?<\/div>/g) || []).length;
    if (opts(b) !== opts(a)) return `assertion 5: ${handle} changed the option count`;
  }
  return null;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function loadLive() {
  const sf = require('../lib/storefront-fetch');
  const out = {};
  for (const h of HANDLES) out[h] = sf.pageBody(h).body_html;
  return out;
}

function verify(sheetPath) {
  const { parseSheet } = require('./cyber-cc-unit3-ced-numbers');
  const rows = parseSheet(fs.readFileSync(sheetPath, 'utf8'));
  const live = loadLive();
  const r = transform(live);
  const expected = r ? r.out : live;
  let bad = 0;
  for (const row of rows) {
    const same = row['Body HTML'] === expected[row.Handle];
    if (!same) bad++;
    console.log(`${row.Handle} bytes=${row['Body HTML'].length} parse-back-diff=${same ? 0 : 1}`);
  }
  console.log(`rows=${rows.length} parse-back-diff=${bad}`);
  if (bad) process.exitCode = 1;
}

function main() {
  const [src, out] = process.argv.slice(2);
  if (src === '--verify') { verify(out); return; }
  if (!src || !out) {
    console.error('usage: node scripts/cyber-quiz-stem-reword.js <bodies-dir|--live> <out.csv>');
    console.error('       node scripts/cyber-quiz-stem-reword.js --verify <sheet.csv>');
    process.exit(2);
  }
  const bodies = {};
  if (src === '--live') Object.assign(bodies, loadLive());
  else for (const h of HANDLES) bodies[h] = fs.readFileSync(path.join(src, `${h}.body.html`), 'utf8');

  const r = transform(bodies);
  if (!r) { console.error('\nNo sheet written.'); return; }

  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  for (const h of HANDLES) {
    const title = EDITS.find((e) => e.handle === h).title;
    lines.push([h, 'MERGE', title, r.out[h], 'TRUE', PUBLISHED_AT].map(csvCell).join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${out}`);
  for (const h of HANDLES) console.log(`  ${h}  ${bodies[h].length} -> ${r.out[h].length} bytes`);
  for (const a of r.applied) console.log(`  reworded ${a}`);
  console.log('\nMERGE overwrites the live body and Shopify keeps no undo.');
}

if (require.main === module) main();
module.exports = { transform, rewrite, assertions, EDITS, HANDLES, stemsOf };
