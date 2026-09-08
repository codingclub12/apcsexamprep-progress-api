'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Command Center never offers a key to a quiz it is not the key to.
//
//  This is the assertion the whole feature rests on. A gated key that opens the
//  wrong quiz is not a smaller version of the right one; it is a teacher reading
//  Segmentation answers to a class taking a Firewalls quiz, and nothing throws
//  anywhere along the way.
//
//  Two shapes of that mistake are pinned here, both taken from live measurements
//  rather than imagined:
//
//    the row id is not the bank id   Unit 3 was renumbered onto the CED in the
//                                    page bodies and not in the Shopify handles,
//                                    so the row numbered 3.4 links to a page
//                                    whose bank is 3.3. Keying on the row id
//                                    files five rows one lesson too high.
//    a bank can exist and not be it  cyber 1.3, 1.4 and 1.5 have banks in
//                                    production that are not the questions their
//                                    pages serve. "A bank exists" is exactly
//                                    what lock_enforceable already tests, and it
//                                    is not enough to publish a key on.
//
//  Fixtures only. No network and no database, so it runs in CI beside the rest.
//  Zero PII. No em-dashes, per repo convention.
//
//  Run: npm run smoke:cyberquizkeys
// ─────────────────────────────────────────────────────────────────────────────
const cw = require('../lib/cyber-cc-quiz-keys');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

const loc = (unit, lesson) => ({ course: 'ap-cybersecurity', unit, lesson, activity_type: 'quiz' });
const bank = (unit, lesson, stems) => ({ location: loc(unit, lesson), questions: stems.map((p) => ({ prompt: p })) });

//  Stems long enough to clear STEM_PREFIX, and distinct between banks so a
//  match cannot be an accident of shared boilerplate.
const S = (tag, n) => `Consider the ${tag} scenario number ${n} described in this lesson and decide which single statement below is accurate.`;

const BANKS = [
  bank('unit-3', '3.2', [S('wireless policy', 1), S('wireless policy', 2)]),
  bank('unit-3', '3.3', [S('segmentation', 1), S('segmentation', 2)]),
  bank('unit-3', '3.4', [S('firewall', 1), S('firewall', 2)]),
  bank('unit-1', '1.3', [S('rogue access point', 1), S('rogue access point', 2)]),
  //  The 4.4 shape, verbatim in structure: a name ending in a period, with the
  //  page putting a tag between the name and the period.
  bank('unit-4', '4.4', ['The attack succeeded against r.castellano. Working from that account, the adversary exported the local database.']),
];

const page = (stems) => '<html><body>' + stems.map((s) => `<div class="q"><p>${s}</p></div>`).join('') + '</body></html>';
const mountPage = (unit, lesson) =>
  `<div class="apcs-quiz-mount" data-course="ap-cybersecurity" data-unit="${unit}" data-lesson="${lesson}" data-activity="quiz"></div>`
  + '<script src="https://cdn.shopify.com/apcs-quiz-mount.js"></script>';

console.log('\nCOMMAND CENTER QUIZ KEY CROSSWALK\n');

console.log('1. The row id is not the bank id, and the page is what settles it');
//  The Command Center row 3.4 is titled Segmentation and links to lesson-4,
//  whose page serves the segmentation bank filed under 3.3.
const r34 = cw.decide('3.4', '/pages/ap-cyber-unit-3-lesson-4-quiz', page([S('segmentation', 1), S('segmentation', 2)]), BANKS);
ok('  row 3.4 resolves to bank 3.3, not 3.4', r34.location && r34.location.lesson === '3.3', r34);
ok('  and it says why', r34.basis === 'stems', r34.basis);
const r35 = cw.decide('3.5', '/pages/ap-cyber-unit-3-lesson-5-quiz', page([S('firewall', 1), S('firewall', 2)]), BANKS);
ok('  row 3.5 resolves to bank 3.4', r35.location && r35.location.lesson === '3.4', r35);
ok('  so the off-by-one is reproduced rather than corrected away',
  r34.location.lesson !== '3.4' && r35.location.lesson !== '3.5');

console.log('2. A bank that is only PART of the page is refused');
//  One stem of two. This is the 1.3 case: a re-authored bank waiting on a page
//  mount, sharing a question with the instrument the page still serves.
const partial = cw.decide('1.3', '/pages/ap-cyber-unit-1-lesson-3-quiz',
  page([S('rogue access point', 1), 'Some entirely different question the page asks instead here.']), BANKS);
ok('  a half-matching bank yields no key', partial.location === null, partial);
ok('  and the reason names the count', /1 of its 2/.test(partial.reason), partial.reason);
const none = cw.decide('9.9', '/pages/ap-cyber-unit-9-lesson-9-quiz', page(['Nothing here matches any seeded bank at all, not one.']), BANKS);
ok('  a page sharing nothing yields no key', none.location === null, none);

console.log('3. A mounted page is trusted because it cannot disagree with itself');
const m = cw.decide('3.4', '/pages/ap-cyber-unit-3-lesson-4-quiz', mountPage('unit-3', '3.3'), BANKS);
ok('  the mount names the bank and that is the answer', m.location && m.location.lesson === '3.3', m);
ok('  and the basis says so', m.basis === 'mount', m.basis);
//  A mount asking for something nothing seeds is a live defect, not a reason to
//  fall back to stems: that page is rendering nothing where the quiz belongs.
const mBad = cw.decide('3.4', '/pages/x-quiz', mountPage('unit-3', '3.9'), BANKS);
ok('  a mount pointing at no bank is refused, not silently re-matched', mBad.location === null, mBad);
ok('  and the reason names the location the page asked for', /3\.9/.test(mBad.reason), mBad.reason);

console.log('4. Markup between a word and its punctuation is not a different question');
//  Measured on the live 4.4 page. The stored stem has "r.castellano." and the
//  page renders "<b>r.castellano</b>." which strips to "r.castellano ." A
//  normalizer that collapses whitespace instead of removing it still sees a
//  space the bank does not have, and refuses a bank that is an exact match.
//  That is why this fixture has the period against a tag boundary: a stem
//  merely broken across tags matches under either rule and proves nothing.
const split = '<p>The attack succeeded against <b>r.castellano</b>. Working from that\n  account, the adversary exported the local database.</p>';
const r = cw.decide('4.4', '/pages/x-quiz', split, BANKS);
ok('  a stem whose punctuation sits against a tag still matches', r.location && r.location.lesson === '4.4', r);
//  And entities, which is how a page stores a curly apostrophe.
ok('  an entity decodes to the character the bank stores',
  cw.squash('the portal&rsquo;s database') === cw.squash("the portal's database"));

console.log('5. Ambiguity is refused rather than guessed');
const dupes = [bank('unit-5', '5.1', [S('duplicate', 1)]), bank('unit-5', '5.2', [S('duplicate', 1)])];
const amb = cw.decide('5.1', '/pages/x-quiz', page([S('duplicate', 1)]), dupes);
ok('  two banks matching one page in full yields no key', amb.location === null, amb);
ok('  and the reason names both', /5\.1/.test(amb.reason) && /5\.2/.test(amb.reason), amb.reason);

console.log('6. STU is read out of the page, so it cannot go stale');
const CC = 'var STU = {\n'
  + '    "3.4":{page:"/pages/a",quiz:"/pages/ap-cyber-unit-3-lesson-4-quiz",ex1:"/pages/b"},\n'
  + '    "3.5":{page:"/pages/c",quiz:"/pages/ap-cyber-unit-3-lesson-5-quiz"},\n'
  + '    "9.1":{page:"/pages/d"}\n'
  + '  };';
const stu = cw.parseSTU(CC);
ok('  every lesson is found', Object.keys(stu).length === 3, Object.keys(stu));
ok('  the quiz path is read', stu['3.4'] === '/pages/ap-cyber-unit-3-lesson-4-quiz', stu['3.4']);
ok('  a lesson with no quiz reads null rather than being dropped', stu['9.1'] === null, stu['9.1']);
let stuThrew = null;
try { cw.parseSTU('<html>no stu here</html>'); } catch (e) { stuThrew = e.message; }
ok('  a body with no STU block is a refusal', !!stuThrew, stuThrew);

console.log('7. The whole crosswalk keeps the refusals, it does not drop them');
const bodies = {
  'ap-cyber-unit-3-lesson-4-quiz': page([S('segmentation', 1), S('segmentation', 2)]),
  'ap-cyber-unit-3-lesson-5-quiz': page(['nothing matching anything at all in the banks above.']),
};
const all = cw.crosswalk(CC, bodies, BANKS);
ok('  every STU row comes back', all.length === 3, all.length);
ok('  one has a key', all.filter((x) => x.location).length === 1, all.map((x) => [x.lessonId, !!x.location]));
ok('  and the two without one carry a reason a human can read',
  all.filter((x) => !x.location).every((x) => typeof x.reason === 'string' && x.reason.length > 10),
  all.filter((x) => !x.location).map((x) => x.reason));

console.log('8. The generated panel RUNS, which parsing it does not prove');
//  THE CHECK THAT EARNED ITS PLACE. The first draft closed the injected region
//  with `MARK + " end"`, which emits `/* apcs-quiz-key panel */ end`. A bare
//  `end` is a perfectly valid expression statement, so it is not a syntax error
//  and `new Function(code)` accepts it without complaint. It throws
//  ReferenceError the instant the page's IIFE reaches that line, which aborts
//  the whole Command Center render: no lessons, no materials, no gradebook link.
//  Nothing short of executing the code finds that.
const panel = require('../scripts/cyber-cc-quiz-key-panel');
const CODE = panel.panelCode({ '3.4': loc('unit-3', '3.3') });
const esc = (x) => String(x == null ? '' : x)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const noop = () => {};
//  The closure the IIFE actually provides. Anything the panel reaches for that
//  is not in this list is a name it would not find on the live page either.
const load = (entitled) => new Function('esc', 'STATE', 'document', 'CFG', 'labKeyStyles', 'fetch',
  CODE + '\n; return { quizKeyButton: quizKeyButton, quizKeyHTML: quizKeyHTML };')(
  esc, { entitled, token: 't' }, { addEventListener: noop, getElementById: () => null },
  { API: 'https://progress.apcsexamprep.com' }, noop, noop);

let ranErr = null, api = null;
try { api = load(true); } catch (e) { ranErr = e.message; }
ok('  it executes in the closure the page provides', !ranErr, ranErr);

const btn = api.quizKeyButton({ id: '3.4' }, 'quiz');
ok('  an entitled teacher gets a button carrying the LOCATION and no answer',
  /quiz-key-btn/.test(btn) && /data-qk-lesson="3\.3"/.test(btn), btn);
ok('  a non-quiz destination gets nothing', api.quizKeyButton({ id: '3.4' }, 'page') === '');
ok('  a row with no justified bank gets nothing', api.quizKeyButton({ id: '9.9' }, 'quiz') === '');
const locked = load(false).quizKeyButton({ id: '3.4' }, 'quiz');
ok('  an unentitled visitor gets a locked chip, not a button that can only fail',
  /mat disabled/.test(locked) && !/quiz-key-btn/.test(locked), locked);

//  And the modal, rendered from a key the real projector built from a real bank.
const qk = require('../lib/quiz-answer-key');
const real = require('../seed/cyber-units-2-5-web-quizzes.js').find((b) => b.location.lesson === '3.3');
const key = qk.build(real.location, real.questions.map((q, i) => ({
  qid: q.qid, prompt: q.prompt, options: JSON.stringify(q.options),
  correct_index: q.correct_index, explanation: q.explanation || null, points: q.points || 1, q_order: i,
})));
let html = null, htmlErr = null;
try { html = api.quizKeyHTML(key); } catch (e) { htmlErr = e.message; }
ok('  the modal renders', !htmlErr && html && html.length > 500, htmlErr || (html || '').length);
ok('  exactly one option per question is marked correct',
  (html.match(/lk-right/g) || []).length === key.pool, (html.match(/lk-right/g) || []).length);
ok('  and the marked option is the one the bank keys',
  key.questions.every((q) => html.includes(esc(q.correct_text) + ' &check;')),
  key.questions.map((q) => q.correct_text).slice(0, 2));
ok('  the disclosure is on it', html.includes('Teacher copy'));
const tags = (re) => (html.match(re) || []).length;
ok('  its tags balance', tags(/<(p|ul|li|b|span|h3)\b/g) === tags(/<\/(p|ul|li|b|span|h3)>/g),
  { open: tags(/<(p|ul|li|b|span|h3)\b/g), close: tags(/<\/(p|ul|li|b|span|h3)>/g) });

console.log('9. The quiz is premium in BOTH places, and nothing else in a free unit is');
//  Tanner, 2026-09-08: "lock the quiz all together. Student and teacher. Free
//  preview is fine with just the slides and other supplementals."
//
//  The gate the page ships with is `unlocked` = STATE.entitled || unitFree(u),
//  which is TRUE for a signed-out visitor on Unit 1. So this runs the PATCHED
//  functions in exactly that state: unlocked true, entitled false. Reading the
//  generator's source would not prove this; the two functions live in the page
//  and only the patched body has them.
const fs = require('fs');
const SNAP = require('path').join(__dirname, '..', 'shopify', 'page-snapshots',
  'cyber-command-center.before-quiz-answer-keys.html');
const patched = panel.patch(fs.readFileSync(SNAP, 'utf8'),
  { '1.1': loc('unit-1', '1.1') }).body;

//  Lift the two gating functions out of the patched page and run them beside
//  the panel's own code, which is where quizOpen and quizKeyButton live.
const grab = (name) => (patched.match(new RegExp('  function ' + name + '[\\s\\S]*?\\n  \\}'))
  || [null])[0];
const matSrc = grab('matButton'), stuSrc = grab('studentSection');
ok('  both gating functions were found in the patched body', !!matSrc && !!stuSrc);

const STU_FIXTURE = {
  '1.1': { page: '/pages/lesson', quiz: '/pages/quiz', ex1: '/pages/s1', ex2: '/pages/s2', termlab: '/pages/lab' },
};
const LESSON = {
  id: '1.1',
  mats: { deck: 'https://d/deck', notes: 'https://d/notes', quiz: 'https://d/quiz', supp: 'https://d/supp', guide: 'https://d/guide' },
};
const MATERIALS = [
  { key: 'deck', label: 'Slide Deck', ico: 'D' }, { key: 'notes', label: 'Guided Notes', ico: 'N' },
  { key: 'quiz', label: 'Quiz', ico: 'Q' }, { key: 'supp', label: 'Supplements', ico: 'S' },
  { key: 'guide', label: 'Teacher Guide', ico: 'G' },
];

//  entitled decides the quiz; unlocked stays true throughout, which is the whole
//  point: a signed-out visitor on the FREE unit is exactly the case that was
//  handing the quiz out.
//  The panel must be built for the lesson under test: quizKeyButton looks the
//  row up in QUIZKEY, so reusing section 8's map (which keys 3.4) renders no key
//  for 1.1 and the two key assertions below fail for the fixture's reason rather
//  than the code's. That is what happened on the first run.
const CODE_11 = panel.panelCode({ '1.1': loc('unit-1', '1.1') });
const render = (entitled) => new Function('esc', 'STATE', 'document', 'CFG', 'labKeyStyles',
  'fetch', 'STU', 'ARROW', 'MATERIALS', 'LESSON',
  CODE_11 + '\n' + matSrc + '\n' + stuSrc
  + '\n; return { mats: MATERIALS.map(function(m){ return matButton(LESSON, m, true); }).join(""),'
  + '   student: studentSection(LESSON, true) };')(
  esc, { entitled, token: 't' }, { addEventListener: noop, getElementById: () => null },
  { API: 'https://progress.apcsexamprep.com' }, noop, noop, STU_FIXTURE, '>', MATERIALS, LESSON);

const anon = render(false);
//  A material reads as OPEN when it rendered an <a>, LOCKED when it rendered a
//  disabled span. Checked by label so a change to one cannot pass as another.
const openMat = (html, label) => new RegExp('<a class="mat"[^>]*>[^<]*<span class="m-ico">[^<]*</span>' + label).test(html);
ok('  free unit, signed out: the Slide Deck is still open', openMat(anon.mats, 'Slide Deck'), anon.mats.slice(0, 160));
ok('  the Guided Notes are still open', openMat(anon.mats, 'Guided Notes'));
ok('  the Supplements are still open', openMat(anon.mats, 'Supplements'));
ok('  the Teacher Guide is still open', openMat(anon.mats, 'Teacher Guide'));
ok('  but the teacher Quiz document is LOCKED', !openMat(anon.mats, 'Quiz'),
  (anon.mats.match(/[^>]*Quiz[^<]*/) || [''])[0]);
ok('  and its Drive url is not published to an unentitled visitor',
  !anon.mats.includes('https://d/quiz'), anon.mats.includes('https://d/quiz'));

ok('  the student Lesson page is still open', /<a class="mat site"[^>]*>Lesson page/.test(anon.student));
ok('  Scenario 1 and 2 are still open',
  /<a class="mat site"[^>]*>Scenario 1/.test(anon.student) && /<a class="mat site"[^>]*>Scenario 2/.test(anon.student));
ok('  the Terminal Lab is still open', /<a class="mat site"[^>]*>Terminal Lab/.test(anon.student));
ok('  but the student Quiz link is LOCKED', /<span class="mat disabled">Quiz<\/span>/.test(anon.student),
  anon.student.slice(0, 240));
ok('  and its url is not published either', !anon.student.includes('/pages/quiz'), anon.student);
ok('  the answer key shows as a locked chip beside it, not a button',
  /mat disabled[^>]*answer key/i.test(anon.student) && !/quiz-key-btn/.test(anon.student), anon.student.slice(0, 300));

const paid = render(true);
ok('  an entitled teacher gets the teacher Quiz document', openMat(paid.mats, 'Quiz'), paid.mats);
ok('  and the student Quiz link', /<a class="mat site"[^>]*>Quiz /.test(paid.student), paid.student.slice(0, 240));
ok('  and the answer key as a real button', /quiz-key-btn/.test(paid.student));
ok('  every other material is open for them too',
  ['Slide Deck', 'Guided Notes', 'Supplements', 'Teacher Guide'].every((m) => openMat(paid.mats, m)));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
