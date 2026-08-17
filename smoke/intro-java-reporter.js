'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the intro-java reporter and POST /api/progress/choice.
//
//  WHY THIS EXISTS
//  The reporter is the only piece of this course that lives half in one repo and
//  half in another. shopify/intro-java-reporter.js reaches into markup that
//  lib/intro-java-page.js writes, across a Shopify import that happens weeks
//  apart from any code change here. Nothing in either file forces them to agree,
//  and a disagreement does not throw: the button simply does nothing. A hundred
//  and twenty five inert buttons look exactly like a hundred and twenty five
//  working ones until a teacher opens an empty gradebook.
//
//  So section 1 renders real pages from the real bank, reads the selectors and
//  attributes straight out of the reporter SOURCE, and checks each one against
//  what actually got rendered. It runs in BOTH directions: a class the reporter
//  binds must exist in the page, and a data-role the page emits must be handled
//  by the reporter. One direction alone misses the case where a page grows a
//  fourth widget nobody wired up.
//
//  Section 2 drives POST /api/progress/choice for real, because the reporter's
//  whole design rests on the server holding the key. Three properties, each of
//  which fails quietly:
//
//    1. THE SCORE IS COMPUTED SERVER SIDE. The route has no score field. A
//       student who sends one is sending nothing.
//    2. THE RESPONSE NEVER CARRIES THE ANSWER. A wrong submission is told it is
//       wrong and no more. Returning the right option would turn every concept
//       check into a reveal button and make retrying pointless.
//    3. THE MANIFEST IS THE DENOMINATOR AUTHORITY. A key that has drifted from
//       it must refuse to score rather than quietly grade the class out of a
//       different total.
//
//  Zero PII: synthetic students, option indices only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:ijreporter
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-ij-reporter.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-secret';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const { renderLesson } = require('../lib/intro-java-page');
const { BANKS, allLessons } = require('../seed/intro-java-banks');
const choiceGrader = require('../lib/choice-grader');
const gapGrader = require('../lib/gap-grader');
const { introJavaRows } = require('../scripts/seed-manifest');

const REPORTER_PATH = path.join(__dirname, '..', 'shopify', 'intro-java-reporter.js');
const REPORTER = fs.readFileSync(REPORTER_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// ── The pages under test ─────────────────────────────────────────────────────
// One lesson per unit, so a widget that only appears in the later units is
// covered too, plus the whole course for the coverage counts further down.
const ALL = allLessons();
const SAMPLE = BANKS.map((b) => ({ bank: b, lesson: b.lessons[0] }));

function render(entry) {
  return renderLesson(entry.lesson, {
    unitKey: entry.bank.unit,
    unitLabel: entry.bank.label,
    helpIndex: {},
  });
}
const SAMPLE_HTML = SAMPLE.map((e) => ({ lesson: e.lesson.lesson, html: render(e).bodyHtml }));

// ── A very small matcher ─────────────────────────────────────────────────────
// No DOM library here on purpose: the smoke deps are deliberately thin and this
// only has to answer "could this selector match something on the page". It reads
// tags, so a class named inside prose or a comment cannot satisfy a check.
function tagsOf(html) {
  const out = [];
  const re = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) out.push({ tag: m[1].toLowerCase(), attrs: m[2] });
  return out;
}
function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}
function hasClass(attrs, cls) {
  const c = attr(attrs, 'class');
  return !!c && c.split(/\s+/).indexOf(cls) !== -1;
}
/** Elements matching `.cls` optionally carrying every attribute in `attrs`. */
function find(html, cls, needAttrs) {
  return tagsOf(html).filter((t) => hasClass(t.attrs, cls)
    && (needAttrs || []).every((a) => attr(t.attrs, a) !== null));
}

// What the reporter actually asks the page for, read out of its source rather
// than retyped here. Retyping is how this test would drift from the file it is
// supposed to be pinning.
function literals(src, fnNames) {
  const found = new Set();
  const re = new RegExp(`\\.(?:${fnNames.join('|')})\\(\\s*'([^']+)'`, 'g');
  let m;
  while ((m = re.exec(src))) found.add(m[1]);
  return [...found];
}
const SELECTORS = literals(REPORTER, ['querySelector', 'querySelectorAll', 'closest']);
const ATTRS_READ = literals(REPORTER, ['getAttribute']);

(async () => {
  // ── 1. The reporter and the renderer describe the same page ────────────────
  section('1. Reporter and renderer agree on the markup');

  ok('1.1 the reporter source was found and is not empty', REPORTER.length > 1000);
  ok('1.2 it reads at least five distinct selectors', SELECTORS.length >= 5, SELECTORS);

  // The wrapper the reporter bails out on. No wrapper, no reporter, and the
  // page silently becomes read-only.
  const wrapId = (REPORTER.match(/getElementById\('([^']+)'\)/) || [])[1];
  ok('1.3 the reporter looks for a wrapper id', !!wrapId, wrapId);
  ok('1.4 every rendered page carries that wrapper id',
    SAMPLE_HTML.every((p) => p.html.includes(`id="${wrapId}"`)), wrapId);

  // Selectors, one at a time. `:checked` is runtime state and cannot be checked
  // against static HTML, so those are reduced to the element they select.
  const UNCHECKABLE = new Set(['input[type="radio"]:checked']);
  for (const sel of SELECTORS) {
    if (UNCHECKABLE.has(sel)) continue;
    const m = sel.match(/^\.([a-z0-9-]+)((?:\[[a-z-]+\])*)$/i);
    if (!m) { ok(`1.5 selector ${sel} is a shape this test understands`, false, sel); continue; }
    const cls = m[1];
    const need = (m[2].match(/\[([a-z-]+)\]/g) || []).map((a) => a.slice(1, -1));
    const hit = SAMPLE_HTML.filter((p) => find(p.html, cls, need).length > 0);
    ok(`1.5 selector ${sel} matches rendered markup`, hit.length > 0,
      { selector: sel, matchedLessons: hit.length });
  }

  // Radio inputs, since the :checked selector above could not be tested.
  ok('1.6 options render as radio inputs with a numeric value',
    SAMPLE_HTML.every((p) => /<input type="radio" name="[^"]+" value="\d+">/.test(p.html)));

  // Attributes the reporter reads off elements it found.
  const RUNTIME_ATTRS = new Set([]);
  for (const a of ATTRS_READ) {
    if (RUNTIME_ATTRS.has(a)) continue;
    const seen = SAMPLE_HTML.filter((p) => new RegExp(`\\b${a}="`).test(p.html));
    ok(`1.7 attribute ${a} is emitted by the renderer`, seen.length > 0, a);
  }

  // ── Both directions on data-role ───────────────────────────────────────────
  // A role the reporter handles must exist on a page, AND a role a page emits
  // must be handled. The second half is the one that catches a widget added to
  // the renderer that nobody wired up.
  const handled = new Set();
  const roleRe = /role === '([a-z-]+)'/g;
  let rm;
  while ((rm = roleRe.exec(REPORTER))) handled.add(rm[1]);
  ok('1.8 the reporter handles three roles', handled.size === 3, [...handled]);

  const emitted = new Set();
  for (const p of SAMPLE_HTML) {
    for (const t of tagsOf(p.html)) {
      const r = attr(t.attrs, 'data-role');
      if (r) emitted.add(r);
    }
  }
  for (const r of handled) {
    ok(`1.9 role '${r}' exists in rendered markup`, emitted.has(r));
  }
  for (const r of emitted) {
    ok(`1.10 role '${r}' emitted by the page is handled by the reporter`, handled.has(r));
  }

  // Every button the reporter binds must also carry the class it delegates on.
  const delegate = (REPORTER.match(/closest\('\.([a-z0-9-]+)\[data-role\]'\)/) || [])[1];
  ok('1.11 the delegated listener binds one button class', !!delegate, delegate);
  for (const p of SAMPLE_HTML) {
    const buttons = tagsOf(p.html).filter((t) => attr(t.attrs, 'data-role') !== null);
    ok(`1.12 lesson ${p.lesson}: every data-role button carries .${delegate}`,
      buttons.length > 0 && buttons.every((b) => hasClass(b.attrs, delegate)),
      buttons.map((b) => b.attrs.trim()));
  }

  // ── The two feedback slots ─────────────────────────────────────────────────
  // The bug this pins: a whole-item message written to `.ij-feedback` lands on
  // question one's paragraph and erases that question's own mark. The summary
  // slot has to exist, and it has to sit OUTSIDE the question list.
  ok('1.13 the reporter writes whole-item messages to a summary slot',
    /summaryOf\s*\(/.test(REPORTER) && REPORTER.includes(".querySelector('.ij-summary')"));
  for (const p of SAMPLE_HTML) {
    const summaries = find(p.html, 'ij-summary');
    const sections = ['ij-cfu', 'ij-gap', 'ij-quiz'].filter((c) => find(p.html, c).length > 0);
    ok(`1.14 lesson ${p.lesson}: one summary slot per interactive section`,
      summaries.length === sections.length, { summaries: summaries.length, sections });
    // A summary inside <ol class="ij-qs"> would be inside a question.
    const listBody = (p.html.match(/<ol class="ij-qs">([\s\S]*?)<\/ol>/g) || []).join('\n');
    ok(`1.15 lesson ${p.lesson}: no summary slot inside the question list`,
      !listBody.includes('ij-summary'));
  }

  // ── The ids the reporter posts ─────────────────────────────────────────────
  // Everything the page can submit must have a key AND a manifest row. An id in
  // the page with no key is a 404 on click; an id with no manifest row is a 400.
  const MANIFEST = new Map(introJavaRows().map((r) => [r.item_id, r]));
  let idsChecked = 0, idProblems = [];
  for (const entry of ALL) {
    const html = render(entry).bodyHtml;
    const ids = [];
    for (const q of find(html, 'ij-q', ['data-item-id'])) ids.push({ id: attr(q.attrs, 'data-item-id'), kind: 'cfu' });
    for (const cls of ['ij-quiz', 'ij-gap']) {
      for (const s of find(html, cls, ['data-item-id'])) {
        ids.push({ id: attr(s.attrs, 'data-item-id'), kind: cls === 'ij-gap' ? 'gap' : 'quiz' });
      }
    }
    for (const { id, kind } of ids) {
      idsChecked++;
      const hasKey = kind === 'gap' ? gapGrader.hasKey('intro-java', id) : choiceGrader.hasKey('intro-java', id);
      if (!hasKey) idProblems.push(`${id}: no ${kind} key`);
      const row = MANIFEST.get(id);
      if (!row) idProblems.push(`${id}: no manifest row`);
      else if (row.item_type !== kind) idProblems.push(`${id}: manifest says ${row.item_type}, page says ${kind}`);
      else {
        const points = kind === 'gap'
          ? gapGrader.KEY.get(`intro-java|${id}`).holes.length
          : choiceGrader.questionCount('intro-java', id);
        if (points !== row.points) idProblems.push(`${id}: key has ${points}, manifest says ${row.points}`);
      }
    }
  }
  ok('1.16 every page posts to a real item', idProblems.length === 0, idProblems.slice(0, 6));
  ok('1.17 the whole course was walked, not one lesson', idsChecked > 100, idsChecked);

  // ── Nothing about the reporter may reveal an answer ────────────────────────
  ok('1.18 the reporter never reads an answer field from a response',
    !/\.answer\b|correct_option|\bkey\b\s*=/.test(REPORTER));
  ok('1.19 the reporter never computes a score itself',
    !/score\s*\+\+|score\s*\+=/.test(REPORTER));
  // ── Developer strings must never reach a student ───────────────────────────
  // A student on a live lesson page was shown "Not saved: course must be
  // 'ap-cybersecurity' for this class". That is a good wire-log line and a
  // terrible thing to put in front of a fourteen year old. The route's other
  // strings are worse: "detail must be an array of {q, sel, ok}".
  //
  // The fix is structural rather than a rewording. The reporter does not render
  // res.body.error AT ALL, so a new server error added later cannot leak onto a
  // page just because nobody remembered to translate it. It renders
  // student_message when the server supplies one, and otherwise says one honest
  // sentence.
  ok('1.19b the reporter never renders the server error string',
    !/body\s*&&\s*res\.body\.error|say\([^)]*\.error/.test(REPORTER)
    && !/'Not saved: '/.test(REPORTER));
  ok('1.19c it renders student_message when the server sends one',
    REPORTER.includes('student_message'));

  ok('1.20 a failed submission is reported, never swallowed',
    /function reportFailure/.test(REPORTER)
    && (REPORTER.match(/reportFailure\(/g) || []).length >= 4);
  // STRICT ASCII, with no exemption for the box-drawing banners the rest of this
  // repo uses. This file also ships to the theme repo as assets/
  // intro-java-reporter.js, and that repo requires pure ASCII in every file:
  // every reporter already there has zero non-ASCII bytes. One file has to
  // satisfy both conventions, so it satisfies the stricter one.
  ok('1.21 strictly pure ASCII, because the theme repo requires it',
    // eslint-disable-next-line no-control-regex
    !/[^\x00-\x7F]/.test(REPORTER), (REPORTER.match(/[^\x00-\x7F]/g) || []).slice(0, 5));
  ok('1.22 no em-dashes, per repo convention', !REPORTER.includes('—'));

  // ── The two copies ─────────────────────────────────────────────────────────
  // This file ships to the theme repo as assets/intro-java-reporter.js and that
  // is the copy the storefront actually loads. shopify/ here is the mirror.
  // Editing one and not the other means the tests pin a file no browser runs,
  // which is the single most useless place a green suite can be. Checked only
  // when the theme repo is checked out beside this one; skipped, loudly, when it
  // is not, because a check that silently passes on absence is not a check.
  const THEME_ASSET = '/workspace/apcsexamprep-theme/assets/intro-java-reporter.js';
  if (fs.existsSync(THEME_ASSET)) {
    ok('1.23 the theme asset is byte-identical to this mirror',
      fs.readFileSync(THEME_ASSET, 'utf8') === REPORTER);
  } else {
    console.log('  [SKIP] 1.23 theme repo not checked out, mirror sync unverified');
  }

  // ── 2. POST /api/progress/choice ───────────────────────────────────────────
  section('2. POST /api/progress/choice');

  // Fixtures. classes.teacher_id is a real foreign key.
  const tCols = db.prepare('PRAGMA table_info(teachers)').all().map((c) => c.name);
  const tVals = { id: 't-ijr', name: 'Test Teacher', email: 'teacher-ijr@example.invalid',
    password_hash: 'x', school: 'Test School' };
  const useCols = tCols.filter((c) => tVals[c] !== undefined);
  db.prepare(`INSERT OR REPLACE INTO teachers (${useCols.join(', ')}) `
    + `VALUES (${useCols.map(() => '?').join(', ')})`).run(...useCols.map((c) => tVals[c]));
  db.prepare(`INSERT OR REPLACE INTO classes
    (id, class_code, class_name, course, teacher_id, active, mastery_threshold, retry_allowed)
    VALUES ('c-ijr', 'JAVA-0002', 'Period 2', 'intro-java', 't-ijr', 1, 80, 1)`).run();
  db.prepare(`INSERT OR REPLACE INTO students (id, class_id, display_name, pin_hash, active)
    VALUES ('s-ijr', 'c-ijr', 'Test Student', 'x', 1)`).run();

  // Real rows for a real lesson, taken from the derivation the seed uses so the
  // test cannot pass against a shape the seed would never write.
  const QUIZ_ID = '1.1-quiz';
  const quizRow = MANIFEST.get(QUIZ_ID);
  const cfuRow = introJavaRows().find((r) => r.item_type === 'cfu' && r.lesson_id === '1.1');
  const ins = db.prepare(`INSERT OR REPLACE INTO course_manifest
    (course, unit, lesson_id, item_id, item_type, points) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const r of [quizRow, cfuRow]) ins.run(r.course, r.unit, r.lesson_id, r.item_id, r.item_type, r.points);
  // An item with a manifest row and deliberately no key, for the 404 path.
  ins.run('intro-java', 'unit-1', '9.9', '9.9-quiz', 'quiz', 3);
  // An item whose manifest points disagree with the key, for the 500 path.
  ins.run('intro-java', 'unit-1', '1.2', '1.2-quiz', 'quiz', 999);

  const app = express();
  app.use(express.json());
  app.use('/api/progress', require('../routes/progress'));
  const server = app.listen(0);
  const PORT = server.address().port;
  const TOKEN = signStudentToken({ id: 's-ijr', class_id: 'c-ijr', display_name: 'Test Student' });

  // Counted rather than hardcoded, so adding a case below cannot quietly turn
  // the one-insert-per-submission check into a check of nothing.
  let accepted = 0;
  async function post(body, token) {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/progress/choice`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token === null ? {} : { authorization: `Bearer ${token || TOKEN}` }),
      },
      body: JSON.stringify(body),
    });
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (r.status === 200) accepted++;
    return { status: r.status, body: j };
  }

  const QUIZ_KEY = choiceGrader.KEY.get(`intro-java|${QUIZ_ID}`);
  const rightAll = QUIZ_KEY.questions.map((q) => q.answer);
  const wrongAll = QUIZ_KEY.questions.map((q) => (q.answer + 1) % q.options);

  ok('2.1 no token is rejected', (await post({ course: 'intro-java', item_id: QUIZ_ID, selections: rightAll }, null)).status === 401);

  const perfect = await post({ course: 'intro-java', item_id: QUIZ_ID, selections: rightAll, duration_seconds: 120 });
  ok('2.2 an all-correct quiz scores full marks',
    perfect.status === 200 && perfect.body.score === quizRow.points
    && perfect.body.max_score === quizRow.points, perfect.body);
  ok('2.3 the response marks every question', perfect.body.questions.length === quizRow.points);
  ok('2.4 passed is computed against the class threshold', perfect.body.passed === true);
  ok('2.5 attempt_no starts at one', perfect.body.attempt_no === 1);

  const zero = await post({ course: 'intro-java', item_id: QUIZ_ID, selections: wrongAll });
  ok('2.6 an all-wrong quiz scores zero and is still recorded',
    zero.status === 200 && zero.body.score === 0 && zero.body.recorded === true, zero.body);
  ok('2.7 attempt_no increments', zero.body.attempt_no === 2);
  ok('2.8 retry on keeps the best attempt as the grade of record',
    zero.body.grade_of_record.score === quizRow.points, zero.body.grade_of_record);

  // The property the whole design rests on.
  ok('2.9 a client-sent score changes nothing',
    (await post({ course: 'intro-java', item_id: QUIZ_ID, selections: wrongAll, score: quizRow.points,
      max_score: quizRow.points })).body.score === 0);

  // The response for a WRONG submission must not contain the right answer in any
  // form: not as a field, not as an index, not as the option text.
  const wrongJson = JSON.stringify(zero.body);
  ok('2.10 the response has no answer field',
    !/"answer"|"correct"|"sel"|"key"/.test(wrongJson), wrongJson.slice(0, 200));
  const optionText = [];
  for (const b of BANKS) {
    for (const l of b.lessons) {
      if (l.lesson !== '1.1' || !l.quiz) continue;
      for (const q of l.quiz) optionText.push(String(q.options[q.answer]));
    }
  }
  ok('2.11 the response quotes no option text',
    optionText.length > 0 && optionText.every((t) => !wrongJson.includes(t)),
    optionText.slice(0, 2));

  // Unanswered questions.
  const blank = await post({ course: 'intro-java', item_id: QUIZ_ID, selections: rightAll.map(() => null) });
  ok('2.12 an all-blank quiz scores zero rather than erroring',
    blank.status === 200 && blank.body.score === 0, blank.body);
  const outOfRange = await post({ course: 'intro-java', item_id: QUIZ_ID, selections: rightAll.map(() => 99) });
  ok('2.13 an out of range option scores zero rather than 500',
    outOfRange.status === 200 && outOfRange.body.score === 0, outOfRange.body);

  // A concept check is its own item with one question, which is what keeps a
  // thirty student class at thirty inserts rather than thirty times the count.
  const cfuKey = choiceGrader.KEY.get(`intro-java|${cfuRow.item_id}`);
  const cfu = await post({ course: 'intro-java', item_id: cfuRow.item_id,
    selections: [cfuKey.questions[0].answer] });
  ok('2.14 a concept check grades on its own', cfu.status === 200 && cfu.body.score === 1, cfu.body);
  ok('2.15 a concept check is worth exactly one point', cfu.body.max_score === 1);

  // Rejections.
  ok('2.16 an unknown item is rejected, not recorded',
    (await post({ course: 'intro-java', item_id: '4.4-nope', selections: [0] })).status === 400);
  ok('2.17 a manifest row with no key is a 404, not a silent zero',
    (await post({ course: 'intro-java', item_id: '9.9-quiz', selections: [0, 0, 0] })).status === 404);
  const drift = await post({ course: 'intro-java', item_id: '1.2-quiz', selections: [0] });
  ok('2.18 a key that disagrees with the manifest refuses to score',
    drift.status === 500 && !/\d+ questions/.test(drift.body.error || ''), drift.body);
  ok('2.19 the wrong course for the class is rejected',
    (await post({ course: 'ap-csa', item_id: QUIZ_ID, selections: rightAll })).status === 400);
  ok('2.20 a non-integer selection is rejected',
    (await post({ course: 'intro-java', item_id: QUIZ_ID, selections: ['1'] })).status === 400);
  ok('2.21 an unbounded selections payload is rejected',
    (await post({ course: 'intro-java', item_id: QUIZ_ID,
      selections: new Array(500).fill(0) })).status === 400);

  // ── What actually landed in the database ──────────────────────────────────
  section('3. What was stored');

  const rows = db.prepare(
    'SELECT item_id, item_type, score, max_score, attempt_no, detail, ua FROM attempts WHERE student_id = ? ORDER BY id'
  ).all('s-ijr');
  ok('3.1 one row per accepted submission, never one per question',
    rows.length === accepted && accepted > 4, { rows: rows.length, accepted });
  ok('3.1b a five question quiz is still one row',
    rows.filter((r) => r.item_type === 'quiz').every((r) => r.max_score === quizRow.points));
  ok('3.2 every row names a manifest item type',
    rows.every((r) => r.item_type === 'quiz' || r.item_type === 'cfu'));

  const detail = JSON.parse(rows[0].detail);
  ok('3.3 detail is the documented shape and nothing else',
    detail.every((d) => Object.keys(d).sort().join(',') === 'ok,q,sel'
      && Number.isInteger(d.q) && typeof d.ok === 'boolean'
      && (d.sel === null || Number.isInteger(d.sel))), detail[0]);
  ok('3.4 the selection IS kept, because an option index is not free text',
    detail.some((d) => Number.isInteger(d.sel)));
  ok('3.5 detail holds no strings at all',
    !/"[a-z]+":"/i.test(rows[0].detail), rows[0].detail.slice(0, 120));

  // Nothing a student could type may exist anywhere in the file. The quiz route
  // never accepts text, so this is a standing guard rather than a live risk.
  server.close();
  db.close();
  const raw = fs.readFileSync(process.env.DB_PATH, 'latin1');
  const leaked = optionText.filter((t) => t.length > 12 && raw.includes(t));
  ok('3.6 no option text reached the database', leaked.length === 0, leaked.slice(0, 2));

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
