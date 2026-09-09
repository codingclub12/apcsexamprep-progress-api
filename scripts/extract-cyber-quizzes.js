'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIFT THE AP CYBER QUIZZES OUT OF THEIR PAGE BODIES.
//
//  21 of the 23 cyber quiz pages grade themselves in the browser and ship their
//  own answer key to do it. A lock on any of them is theatre, because the
//  questions and the key are in the page before any server code runs.
//
//  This reads a page body and produces the rows scripts/seed-quiz-bank.js wants,
//  so the questions can be served from quiz_bank instead. It never invents a
//  question: everything is parsed, and anything it cannot parse cleanly is an
//  error rather than a guess.
//
//  ── THREE MARKUP GENERATIONS, because the pages were authored months apart ──
//    units 2 and 3   .q-block, radio inputs, key in a trailing ANSWERS={1:'B'}
//    unit 4          <li><label><input radio>, key in checkMCQ('q1','C',expl)
//    unit 5          <button class="opt-btn" data-correct="1">
//
//  ── TWO RULES THAT COME FROM HOW routes/quiz.js SERVES A QUESTION ──────────
//  1. OPTIONS ARE STORED WITHOUT THEIR LETTERS. The server reshuffles options on
//     every render, so a stored "(A) ..." would be wrong the moment it moved.
//     Every parser strips the letter it used to identify the option.
//  2. AN EXPLANATION THAT NAMES A LETTER IS UNUSABLE for the same reason.
//     "A and D misstate CED facts" is false once A is somewhere else. Those are
//     FLAGGED, never silently shipped: this script drops the explanation and
//     records the question so a human can decide whether to reword it.
//
//  Run: node scripts/extract-cyber-quizzes.js <bodies-dir> [out.json]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { citationsIn } = require('../lib/quiz-citation');
const { lessonForQuizHandle } = require('../lib/cyber-quiz-lesson');

const COURSE = 'ap-cybersecurity';
//  Every web quiz on the site measures 5 or 6 items. See the refusal below.
const WEB_QUIZ_MAX = 6;
const problems = [];
const note = (handle, msg) => problems.push(`${handle}: ${msg}`);

//  A BLOCK tag becomes a space; an INLINE tag becomes nothing.
//
//  Stripping every tag to '' ran the last word of one block into the first word
//  of the next: a 2.3 stem read "negligible costWhich correction is BEST?" and a
//  3.3 stem ran a hostname into the sentence after it. Stripping every tag to a
//  space instead breaks words that were never separate, because <code>Argon2id
//  </code> and <span class="kw">WRONG</span> sit mid-sentence. So the two are
//  told apart, which is the only version that is right in both places.
const BLOCK = /<\/?(?:div|p|li|ul|ol|tr|td|th|table|h[1-6]|br|section|article|header|footer|blockquote)\b[^>]*>/gi;
const decode = (s) => String(s)
  .replace(BLOCK, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

//  Strip a leading option letter in any of the shapes the three generations use:
//  "(A) text", "A. text", "A) text". Anchored, so a sentence that merely starts
//  with a capital and a bracket later is untouched.
const stripLetter = (s) => s.replace(/^\(?([A-E])[)..]\s*/, '').trim();

//  The stem tag differs by generation and even within one: units 2 and 3 use
//  <div class="q-stem">, 5.6 uses <p class="q-stem">, unit 4 uses
//  <span class="l-q-stem">. Matching the CLASS rather than the tag is what makes
//  one reader work for all of them, and a stem that is missing stays an error.
function stemOf(html) {
  const m = html.match(/<(div|p|span)[^>]*class="[^"]*\bl?-?q-stem\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/);
  return m ? decode(m[2]) : '';
}

const LETTER_REF = /\boption\s+[A-E]\b|\b[A-E]\s+(?:is|are|and|misstate|describes?|would|fails?)\b|\bchoices?\s+[A-E]\b/;

function mkQ(handle, lesson, n, prompt, options, correctIndex, explanation) {
  if (!prompt) { note(handle, `Q${n} has no stem`); return null; }
  if (options.length < 2) { note(handle, `Q${n} has ${options.length} option(s)`); return null; }
  if (!(correctIndex >= 0 && correctIndex < options.length)) {
    note(handle, `Q${n} correct index ${correctIndex} is outside its ${options.length} options`);
    return null;
  }
  if (options.some((o) => !o)) { note(handle, `Q${n} has an empty option`); return null; }
  //  CED CODES MUST NOT REACH A STUDENT. The repo's rule is absolute for prompts
  //  and options; a code is allowed in an EXPLANATION, which is teacher-released.
  //  This is a REFUSAL rather than a strip: rewording a question is a content
  //  decision, and quietly deleting the citation would change what the stem
  //  claims while looking like a migration. 2.3 w4 says a row is "ranked wrongly
  //  under EK 2.3.B.8", which is live on the page today.
  //  The rule lives in lib/quiz-citation.js because it used to live here AND in
  //  smoke/quiz-bank-authoring.js, and the two disagreed: this copy matched only
  //  a numbered code, so four unit-4 stems saying "according to the AP CED"
  //  extracted clean and seeded. One module, both callers.
  const cited = citationsIn({ prompt, options });
  if (cited.length) {
    note(handle, `Q${n} puts a CED citation in student-facing text (${cited[0].where}): ${JSON.stringify(cited[0].text)}`);
    return null;
  }
  if (new Set(options).size !== options.length) { note(handle, `Q${n} has duplicate option text`); return null; }
  const q = {
    qid: `${COURSE}:unit-${lesson.split('.')[0]}:${lesson}:quiz#w${n}`,
    points: 1,
    prompt,
    options,
    correct_index: correctIndex,
  };
  if (explanation) {
    if (LETTER_REF.test(explanation)) q._explanation_names_letters = explanation;
    else q.explanation = explanation;
  }
  return q;
}

//  ── units 2 and 3 ──────────────────────────────────────────────────────────
function parseQBlockRadio(body, handle, lesson) {
  const key = (body.match(/ANSWERS\s*=\s*\{([^}]*)\}/) || [])[1];
  if (!key) { note(handle, 'no ANSWERS object'); return null; }
  //  Two idioms in the wild: unit 1 writes 1:'B', units 2 and 3 write "q1": "B".
  //  Reading only the first parsed every option as wrong and produced a quiz with
  //  no correct answer, which mkQ refused rather than shipped.
  const letters = {};
  for (const m of key.matchAll(/["']?q?(\d+)["']?\s*:\s*["']([A-E])["']/g)) letters[Number(m[1])] = m[2];
  if (!Object.keys(letters).length) { note(handle, 'ANSWERS object parsed to no letters'); return null; }

  const expls = {};
  const em = body.match(/EXPLS\s*=\s*\{([\s\S]*?)\}\s*[;,]/);
  if (em) for (const m of em[1].matchAll(/(\d+)\s*:\s*'((?:[^'\\]|\\.)*)'/g)) expls[Number(m[1])] = m[2].replace(/\\'/g, "'");

  const out = [];
  const blocks = [...body.matchAll(/<div class="q-block"[^>]*>([\s\S]*?)(?=<div class="q-block"|<div class="quiz-actions|<div class="nav-links|$)/g)];
  blocks.forEach((b, i) => {
    const n = i + 1;
    const stem = stemOf(b[1]);
    const opts = [];
    let correct = -1;
    for (const o of b[1].matchAll(/<input type="radio"[^>]*value="([A-E])"[^>]*>\s*<span>([\s\S]*?)<\/span>/g)) {
      const text = stripLetter(decode(o[2]));
      if (o[1] === letters[n]) correct = opts.length;
      opts.push(text);
    }
    const q = mkQ(handle, lesson, n, stem, opts, correct, expls[n] ? decode(expls[n]) : null);
    if (q) out.push(q);
  });
  return out;
}

//  ── unit 4 ─────────────────────────────────────────────────────────────────
function parseCheckMcq(body, handle, lesson) {
  const out = [];
  //  BY BLOCK, not by call. The first version searched backwards from each
  //  checkMCQ call for a stem and found none, because this generation puts the
  //  stem in <span class="l-q-stem"> inside a <div class="l-q" id="qN"> that
  //  already bounds the whole question. Parsing the block that exists is both
  //  simpler and impossible to bleed from one question into the next.
  const blocks = [...body.matchAll(/<div class="l-q"[^>]*id="(q\d+)"[^>]*>([\s\S]*?)(?=<div class="l-q"[^>]*id="q\d+"|<div class="l-cfu-actions|<div class="nav-links|$)/g)];
  if (!blocks.length) { note(handle, 'no l-q blocks'); return null; }
  blocks.forEach((b, i) => {
    const n = i + 1;
    const inner = b[2];
    const call = inner.match(/checkMCQ\('([^']+)','([A-E])','((?:[^'\\]|\\.)*)'\)/);
    if (!call) { note(handle, `Q${n} (${b[1]}) has no checkMCQ call`); return; }
    if (call[1] !== b[1]) { note(handle, `Q${n} block is ${b[1]} but its call names ${call[1]}`); return; }
    const stem = stemOf(inner);
    const opts = [];
    let correct = -1;
    for (const o of inner.matchAll(/<input type="radio"[^>]*value="([A-E])"[^>]*>\s*([\s\S]*?)<\/label>/g)) {
      const text = stripLetter(decode(o[2]));
      if (o[1] === call[2]) correct = opts.length;
      opts.push(text);
    }
    const q = mkQ(handle, lesson, n, stem, opts, correct, decode(call[3].replace(/\\'/g, "'")));
    if (q) out.push(q);
  });
  return out;
}

//  ── unit 5 ─────────────────────────────────────────────────────────────────
function parseOptBtn(body, handle, lesson) {
  const out = [];
  const blocks = [...body.matchAll(/<div class="q-block"[^>]*>([\s\S]*?)(?=<div class="q-block"|<div class="quiz-actions|<div class="nav-links|$)/g)];
  if (!blocks.length) { note(handle, 'no q-block sections'); return null; }
  blocks.forEach((b, i) => {
    const n = i + 1;
    const stem = stemOf(b[1]);
    const opts = [];
    let correct = -1;
    let expl = null;
    for (const o of b[1].matchAll(/<button[^>]*class="opt-btn"[^>]*>([\s\S]*?)<\/button>/g)) {
      const tag = o[0].slice(0, o[0].indexOf('>') + 1);
      const isRight = /data-correct="1"/.test(tag);
      const fb = (tag.match(/data-fb="([^"]*)"/) || [])[1];
      const text = stripLetter(decode(o[1]));
      if (isRight) { correct = opts.length; if (fb) expl = decode(fb); }
      opts.push(text);
    }
    const q = mkQ(handle, lesson, n, stem, opts, correct, expl);
    if (q) out.push(q);
  });
  return out;
}


//  ── A FOURTH GENERATION: q-stem + .opt divs + checkQ ───────────────────────
//  Found on ap-cyber-unit-3-lesson-6-quiz (CED 3.5) and nowhere else so far.
//  Options are DIVS with an onclick rather than radios or buttons, the key is
//  the second argument of checkQ(N,'X'), and the explanations do not live in
//  the markup at all: they sit in an exp[] table inside the page's IIFE, which
//  also assigns window.selectOpt and window.checkQ so the inline handlers
//  resolve. Reading the markup alone would have produced ten questions with no
//  explanations and looked complete.
function parseQStemCheckQ(body, handle, lesson) {
  const out = [];
  //  exp[N]="..." from the script block, before any markup is touched.
  const expl = {};
  for (const m of body.matchAll(/\bexp\[(\d+)\]\s*=\s*"((?:[^"\\]|\\.)*)"/g)) {
    expl[Number(m[1])] = decode(m[2].replace(/\\"/g, '"').replace(/\\n/g, ' '));
  }
  const blocks = [...body.matchAll(
    /<div class="q-block" id="qblock-(\d+)"[\s\S]*?(?=<div class="q-block" id="qblock-\d+"|<div class="quiz-actions|<div class="nav-links|$)/g)];
  if (!blocks.length) { note(handle, 'no qblock sections'); return null; }
  for (const b of blocks) {
    const n = Number(b[1]);
    const stem = stemOf(b[0]);
    //  The key, and the letter it names, before the letters are stripped off.
    const keyM = b[0].match(/checkQ\(\s*\d+\s*,\s*'([A-E])'\s*\)/);
    if (!keyM) { note(handle, `Q${n} has no checkQ key`); return null; }
    const opts = [];
    let correct = -1;
    for (const o of b[0].matchAll(/<div class="opt"[^>]*id="opt-\d+-([A-E])"[^>]*>([\s\S]*?)<\/div>/g)) {
      if (o[1] === keyM[1]) correct = opts.length;
      opts.push(stripLetter(decode(o[2])));
    }
    const q = mkQ(handle, lesson, n, stem, opts, correct, expl[n] || null);
    if (q) out.push(q);
  }
  return out;
}


//  ── PAGES A HUMAN HAS CONFIRMED ARE WEB QUIZZES, DESPITE THE COUNT ─────────
//  NOT a raised ceiling. Every other page is still refused over WEB_QUIZ_MAX,
//  and the count here must match EXACTLY: if the page gains or loses an item
//  the confirmation no longer applies and it goes back to refusing, because
//  what was confirmed was this instrument and not this handle.
//
//  ap-cyber-unit-3-lesson-6-quiz, CED 3.5, ten items. Confirmed 2026-09-09 by
//  Tanner. The evidence that made it answerable rather than a coin flip:
//
//    - Every one of its ten questions carries a "Predict first" prompt. That is
//      PRIMM lesson scaffolding, which is how this site writes a WEB lesson. A
//      gated unit test does not ship per-item predict prompts.
//    - Its ten stems share no meaningful text with the 60-item public practice
//      bank in config/cyber-exam-items.json. Measured as 5-gram overlap: the
//      highest pair scored 5.1% and is on an unrelated topic.
//    - Lesson 3.5 has its own separate teacher Drive quiz doc, so the bundle
//      instrument exists as a different artifact.
//
//  What none of that proves is that the Drive doc holds different items: the
//  .docx files are not in this repo and no diff against them is possible here.
//  If they turn out to be the same instrument, both need re-authoring, and
//  seeding does not make that worse: the page is public today and serves its
//  own answer key, so moving it server-side strictly reduces exposure. A wrong
//  call here is also reversible, because dropping a qid from the seed sets it
//  active = 0 rather than deleting it.
const CONFIRMED = {
  'ap-cyber-unit-3-lesson-6-quiz': 10,
};

const GENERATIONS = [
  { name: 'q-block+radio+ANSWERS', test: (b) => /class="q-block"/.test(b) && /type="radio"/.test(b) && /ANSWERS\s*=/.test(b), parse: parseQBlockRadio },
  { name: 'checkMCQ', test: (b) => /checkMCQ\(/.test(b), parse: parseCheckMcq },
  { name: 'opt-btn+data-correct', test: (b) => /class="opt-btn"/.test(b) && /data-correct=/.test(b), parse: parseOptBtn },
  { name: 'q-stem+opt+checkQ', test: (b) => /class="q-stem"/.test(b) && /class="opt"/.test(b) && /checkQ\(/.test(b), parse: parseQStemCheckQ },
];

function extract(dir) {
  const quizzes = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith('.html')) continue;
    const handle = f.replace(/\.(body\.)?html$/, '');
    const body = fs.readFileSync(path.join(dir, f), 'utf8');
    //  NOT the handle digits. Unit 3 was renumbered onto the CED in the page
    //  bodies and not in the Shopify handles, so every Unit 3 handle is one
    //  lesson higher than the page it names, and reading the digits filed
    //  firewall questions under Segmentation. lib/cyber-quiz-lesson.js makes
    //  the topic taxonomy and the page agree before it answers.
    let loc;
    try { loc = lessonForQuizHandle(handle, body); }
    catch (e) { note(handle, e.message); continue; }
    const lesson = loc.lesson;
    const gen = GENERATIONS.find((g) => g.test(body));
    if (!gen) { note(handle, 'no known markup generation'); continue; }
    const before = problems.length;
    const questions = gen.parse(body, handle, lesson);
    if (!questions || !questions.length) { note(handle, 'no questions parsed'); continue; }
    //  SIZE IS A BUNDLE SIGNAL. seed/cyber-unit-1-web-quizzes.js records the
    //  rule this repo learned the expensive way: never seed a TEACHER BUNDLE
    //  question into an online bank, because a bundle instrument's security is
    //  that it is not published. The bundle instruments are 9 to 24 items and
    //  every web quiz measured here is 5 or 6, so length is the one cheap
    //  discriminator available: the .docx files are not in this repo and no
    //  diff against them is possible. Over the ceiling is a REFUSAL and a
    //  question for a human, not a judgement this script gets to make.
    if (questions.length > WEB_QUIZ_MAX && CONFIRMED[handle] !== questions.length) {
      note(handle, `${questions.length} questions, over the ${WEB_QUIZ_MAX}-item web-quiz ceiling. ` +
        'A teacher bundle instrument is 9 to 24 items, so this needs a human to confirm what it is before it is seeded.');
      continue;
    }
    //  ALL OR NOTHING PER QUIZ. A question refused above leaves this quiz one
    //  item shorter than the page a student has been taking, and seeding that
    //  would change the instrument while reporting success. The whole quiz is
    //  held back instead, so the page keeps working exactly as it does now and
    //  a human can decide what to do about the one question.
    if (problems.length > before) {
      note(handle, `held back: ${problems.length - before} question(s) refused, so the whole quiz is skipped rather than seeded short`);
      continue;
    }
    quizzes.push({
      location: { course: COURSE, unit: loc.unit, lesson, activity_type: 'quiz', serve_count: 0 },
      _handle: handle, _generation: gen.name, questions,
    });
  }
  return quizzes;
}

if (require.main === module) {
  const [dir, out] = process.argv.slice(2);
  if (!dir) { console.error('usage: node scripts/extract-cyber-quizzes.js <bodies-dir> [out.json]'); process.exit(2); }
  const quizzes = extract(dir);
  const flagged = [];
  let n = 0;
  for (const q of quizzes) {
    n += q.questions.length;
    for (const x of q.questions) if (x._explanation_names_letters) flagged.push(`${q.location.lesson} ${x.qid.split('#')[1]}`);
  }
  console.log(`\n  ${quizzes.length} quizzes, ${n} questions`);
  const byGen = {};
  for (const q of quizzes) byGen[q._generation] = (byGen[q._generation] || 0) + 1;
  console.log('  generations:', JSON.stringify(byGen));
  for (const q of quizzes) {
    console.log(`    ${q.location.lesson.padEnd(5)} ${String(q.questions.length).padStart(2)} questions  ${q._generation}`);
  }
  if (flagged.length) {
    console.log(`\n  ${flagged.length} explanation(s) name an option letter and were DROPPED:`);
    console.log('   ', flagged.join(', '));
    console.log('    routes/quiz.js reshuffles options, so a letter reference is false once it moves.');
  }
  if (problems.length) {
    console.log(`\n  ${problems.length} PROBLEM(S):`);
    for (const p of problems) console.log('   ', p);
  }
  if (out) { fs.writeFileSync(out, JSON.stringify(quizzes, null, 1)); console.log(`\n  wrote ${out}`); }
  if (problems.length) process.exitCode = 1;
}

//  `problems` is module-level and ACCUMULATES across calls in one process.
//  It is exported so a caller can say WHY a quiz was refused rather than only
//  that it is missing from the array; snapshot its length before calling.
module.exports = { extract, problems };
