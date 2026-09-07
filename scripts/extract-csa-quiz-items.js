'use strict';
/*
 *  Pull the auto-graded MCQ items off a CSA lesson page into the kit's quiz
 *  shape: { stem, options[], answer_index, why }.
 *
 *      node scripts/extract-csa-quiz-items.js [topic ...] > items.json
 *
 *  WHY THIS EXISTS
 *  The Unit 1 teacher bundle shipped topic quizzes with NO ANSWER OPTIONS. Every
 *  one of the fifteen prints stems like "Which of these is a behavior?" and then
 *  stops, while the teacher key says "Answer: C" of a list that is not there. A
 *  student cannot answer it and a teacher cannot grade it. Items 4 to 7 are worse
 *  than missing: they read "Explain why this is wrong: <misconception heading>",
 *  and those headings hold the TRUE rule, so the sheet asks a student to refute
 *  "A constructor has no return type" and "Integer division truncates".
 *
 *  The options are not recoverable from the documents, because they were never in
 *  them. They ARE on the lesson pages, which is where the same students meet the
 *  auto-graded version. So the quiz is rebuilt from the page rather than repaired.
 *
 *  WHAT THAT CHANGES, stated because it is not a restoration
 *  The printed quiz becomes the page's items, which are NOT the docx key's items:
 *  live 1.7 question 1 is a different stem answered B where the old key says C. So
 *  the old keys do not carry over and are replaced wholesale. The upside is that
 *  the header line finally becomes true: the printed questions really are the ones
 *  auto-graded at the handle.
 *
 *  Fetches through lib/storefront-fetch.js and sends no User-Agent, per the repo
 *  rule. No em-dashes.
 */

const sf = require('../lib/storefront-fetch.js');
const { UNITS } = require('../lib/csa-nav.js');

//  The block runs to the START of the next exercise, not to the button: the
//  feedback div that carries the rationale sits AFTER the button, and stopping
//  at it silently produced fifteen quizzes with an empty Why on every item.
const BLOCK = /<div class="apcs-ex"([^>]*)>([\s\S]*?)(?=<div class="apcs-ex"|<\/section>|$)/g;
const OPT = /<div class="apcs-opt" data-letter="([A-Z])">([\s\S]*?)<\/div>/g;

//  Entities that appear in these bodies. Kept explicit rather than pulling a
//  parser in: a wrong expansion here becomes a wrong answer on a printed quiz.
//
//  NEWLINES ARE CONTENT HERE AND COLLAPSING THEM LOSES THE QUESTION. The output
//  options on 1.3 are <pre> blocks that differ ONLY in where the line breaks
//  fall: "Status: \nOK\nDone" against "Status: OK\nDone" against
//  "Status: \nOKDone". Flattening whitespace turned three distinct choices into
//  the same string, which a duplicate-option check caught and nothing else would
//  have. Horizontal space is collapsed; newlines survive.
function detag(s) {
  return s
    .replace(/<span class="apcs-opt-letter">[^<]*<\/span>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|pre|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function itemsFor(handle) {
  const body = sf.pageBody(handle).body_html;
  const out = [];
  let m;
  BLOCK.lastIndex = 0;
  while ((m = BLOCK.exec(body))) {
    const attrs = m[1], inner = m[2];
    if (!/data-type="mcq"/.test(attrs)) continue;
    const ans = (attrs.match(/data-answer="([A-Z])"/) || [])[1];
    const stem = detag((inner.match(/<div class="apcs-ex-stem">([\s\S]*?)<\/div>\s*<div class="apcs-ex-options">/) || [])[1] || '');
    const opts = [];
    OPT.lastIndex = 0;
    let o;
    const optBlock = (inner.match(/<div class="apcs-ex-options">([\s\S]*?)<\/div>\s*<button/) || inner.match(/<div class="apcs-ex-options">([\s\S]*)$/) || [])[1] || '';
    while ((o = OPT.exec(optBlock))) opts.push({ letter: o[1], text: detag(o[2]) });
    const fb = detag((inner.match(/<div class="apcs-ex-feedback">([\s\S]*?)<\/div>/) || [])[1] || '');
    if (!ans || !stem || opts.length < 2) continue;
    const idx = opts.findIndex((x) => x.letter === ans);
    if (idx < 0) continue;
    //  the feedback opens by repeating the letter; the reason is what follows
    const why = fb.replace(new RegExp('^' + ans + '\\.\\s*'), '').trim();
    out.push({
      item_id: (attrs.match(/data-item-id="([^"]+)"/) || [])[1] || null,
      stem,
      options: opts.map((x) => x.text),
      answer_index: idx,
      why,
    });
  }
  return out;
}

function main() {
  const want = process.argv.slice(2);
  const rows = UNITS['unit-1'].lessons
    .map((l) => [l.id, l.lessonHandle, l.title])
    .filter((l) => !want.length || want.includes(l[0]));
  const result = {};
  for (const [topic, handle, title] of rows) {
    let items = [];
    let err = null;
    try {
      items = itemsFor(handle);
    } catch (e) {
      err = String(e.message || e).slice(0, 120);
    }
    result[topic] = { handle, title, items, error: err };
    process.stderr.write(`${topic.padEnd(6)} ${String(items.length).padStart(2)} items  ${err || ''}\n`);
  }
  process.stdout.write(JSON.stringify(result, null, 1));
}

main();
