'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the report-first widget, the page index, and closing the loop.
//  docs/handoffs/Site-Assistant-Report-First.md sections 4 and 5, and acceptance
//  checks 5, 6 and 7 in its section 7.
//
//  THE THREE THINGS THIS EXISTS TO CATCH, in the order they would hurt:
//
//  1. THE WIDGET APPEARING ON AN ASSESSMENT PAGE. That is a support affordance
//     standing next to a graded item, and the rule is "absent, not disabled".
//     It is checked here from both sides: the script refuses by itself, and the
//     theme snippet refuses to include it. Neither check is enough alone,
//     because the Liquid condition is the one somebody edits without knowing
//     why it is there.
//
//  2. A LINK THAT DOES NOT EXIST. "Help me find a page" hands people
//     destinations. A model asked where a lesson is will produce a plausible
//     handle whether or not it resolves, and on this storefront a plausible
//     handle is a 404 or the wrong page. So the model is never allowed to emit a
//     URL, and this suite proves it by feeding the re-ranker deliberate garbage
//     and requiring nothing invented to survive.
//
//  3. A THANK-YOU SENT TWICE. It goes to a real teacher who did us a favour, and
//     the way an automated courtesy becomes a nuisance is a morning job that
//     re-reads yesterday's fixed reports every morning.
//
//  Offline and secret-free: a throwaway SQLite file, a hand-built page index, no
//  network and no live server. The page index is seeded from FIXTURES rather
//  than a crawl, because a suite that needs the storefront up is a suite that
//  goes red for reasons that are not about this code.
//
//  Zero PII: synthetic teacher, class and student. No em-dashes.
//
//  Run: npm run smoke:assistantwidget
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-assistant-widget.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

process.env.REPORTS_TO = 'owner@example.test';
delete process.env.RESEND_API_KEY;
delete process.env.ANTHROPIC_API_KEY;   // the model is off: every path must degrade
delete process.env.REPORTS_FILE_TODOS;
delete process.env.REPORT_EMAIL_MODE;

const WINDOW_MS = 40;
process.env.ASSISTANT_REPORT_WINDOW_MS = String(WINDOW_MS);
process.env.ASSISTANT_REPORT_MAX_PER_WINDOW = '5';

const express = require('express');
const db = require('../db');
const { signTeacherToken } = require('../utils');
const pageIndex = require('../lib/assistant/page-index');
const find = require('../lib/assistant/find');
const thanksLib = require('../lib/assistant/thanks');
const mailer = require('../lib/mailer');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);

let sent = [];
const realSend = mailer.sendEmail;
mailer.sendEmail = async function (msg) { sent.push(msg); return { sent: true, id: 'x' }; };
mailer.mailerConfigured = function () { return true; };

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(require('../routes/assistant'));
app.use((err, req, res, next) => res.status(err && err.status ? err.status : 500).json({ error: 'refused' }));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const post = async (url, body, auth) => {
  await sleep(WINDOW_MS + 10);
  return fetch(base() + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
    body: JSON.stringify(body || {}),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
};
const get = (url) => fetch(base() + url, { headers: { 'User-Agent': UA } })
  .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

async function settle() {
  for (let i = 0; i < 30; i++) { await new Promise((r) => setImmediate(r)); await sleep(4); }
}

// -- fixtures ----------------------------------------------------------------
run(`INSERT INTO teachers (id,name,email,school,password_hash)
     VALUES ('t1','Alex Teacher','t@school.example','Example HS','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active)
     VALUES ('c1','t1','CSA-W','W','ap-csa',1)`);
const TT = signTeacherToken({ id: 't1', email: 't@school.example' });

// A hand-built index. Shaped like the real one (the live crawl on 2026-09-17
// produced 2054 rows of exactly this shape) but fixed, so the suite is about the
// ranking and the validation rather than about what is on the storefront today.
const FIXTURES = [
  ['/pages/ap-csa-lesson-2-7-while-loops', 'Lesson 2 7 While Loops', 'ap-csa', 'unit-2', '2.7', 'lesson'],
  ['/pages/ap-csa-lesson-2-8-for-loops', 'Lesson 2 8 for Loops', 'ap-csa', 'unit-2', '2.8', 'lesson'],
  ['/pages/ap-csa-nested-loops', 'Nested Loops', 'ap-csa', null, null, 'lesson'],
  ['/pages/ap-csa-unit-2-quiz', 'Unit 2 Quiz', 'ap-csa', 'unit-2', null, 'quiz'],
  ['/pages/ap-cybersecurity-firewalls', 'Firewalls', 'ap-cybersecurity', null, null, 'lesson'],
  ['/pages/pricing', 'Pricing', null, null, null, 'commerce'],
  ['/blogs/ap-csa-daily-practice/day-26-nested-loops', 'Day 26 Nested Loops', 'ap-csa', null, null, 'qotd'],
];
const stSeed = db.prepare(`
  INSERT INTO page_index (path, url, handle, title, course, unit, lesson, page_type, kind, lastmod)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
`);
for (const [p, title, course, unit, lesson, type] of FIXTURES) {
  stSeed.run(p, 'https://www.apcsexamprep.com' + p, p.split('/').pop(), title, course, unit, lesson, type,
    p.startsWith('/blogs/') ? 'article' : 'page');
}

(async () => {
  // ── 1) ACCEPTANCE 5: the widget does not load on a quiz or test page ──────
  //
  // Checked against the SCRIPT, by reading the guard it ships with and running
  // it against real paths. The theme side of the same rule is checked in the
  // theme repo's own snippet; this is the second lock, not the only one.
  const widget = fs.readFileSync(path.join(__dirname, '..', 'public', 'apcs-widget.js'), 'utf8');
  ok('the widget ships an assessment guard', /function onAssessmentPage/.test(widget));
  ok('and returns before mounting when it fires',
    /if \(onAssessmentPage\(\)\) return;/.test(widget), widget.slice(0, 0));

  // Run the guard itself against real paths rather than trusting the regex by eye.
  const guard = new Function('path', `
    var location = { pathname: path };
    ${/function onAssessmentPage[\s\S]*?\n  \}/.exec(widget)[0]}
    return onAssessmentPage();
  `);
  const BLOCKED = [
    '/pages/ap-csa-unit-2-quiz', '/pages/ap-cyber-unit-1-lesson-1-quiz',
    '/pages/ap-csa-practice-exam', '/pages/ap-csp-unit-test-1',
    '/pages/ap-csa-u1-practice-test', '/pages/ap-csa-unit-2-quiz/',
  ];
  const ALLOWED = [
    '/pages/ap-csa-lesson-2-7-while-loops', '/pages/pricing',
    '/pages/ap-cybersecurity-firewalls', '/blogs/ap-csa-daily-practice/day-26-nested-loops',
    '/pages/ap-csp-collaboration',
  ];
  let blockedOk = true, allowedOk = true;
  for (const p of BLOCKED) if (!guard(p)) { blockedOk = false; console.log('      not blocked:', p); }
  for (const p of ALLOWED) if (guard(p)) { allowedOk = false; console.log('      wrongly blocked:', p); }
  ok('every quiz, exam and practice-test path is refused', blockedOk);
  ok('and an ordinary lesson, article or commerce page is not', allowedOk);
  ok('a slug merely CONTAINING a blocked word is still allowed',
    !guard('/pages/ap-csp-collaboration'), 'collaboration ends in -ation, not -quiz');

  // THE GAP THIS SUITE FOUND, pinned so it cannot come back.
  //
  // apcs-report.js has shipped since Phase 0 with
  //   /\/(unit-test|practice-exam|practice-test)/
  // which requires a SLASH before the term. The storefront does not name pages
  // that way. Measured against the live sitemap on 2026-09-17: 62 pages carry one
  // of those three words after a HYPHEN, and every one of them was a page the
  // widget mounted on. These are the real handles, copied from that crawl.
  const REAL_TEST_PAGES = [
    '/pages/ap-csa-practice-test-2d-arrays',
    '/pages/ap-csa-practice-test-arraylist',
    '/pages/ap-csa-practice-test-boolean-logic',
    '/pages/ap-csa-array-practice-exam',
    '/pages/ap-csa-practice-exam-2',
    '/pages/ap-computer-science-principles-practice-exam-2025',
  ];
  const stillOpen = REAL_TEST_PAGES.filter((p) => !guard(p));
  ok('a test page named with HYPHENS, as this site names them, is refused',
    stillOpen.length === 0, stillOpen);

  // And the over-broad edge is deliberate rather than accidental, so it is
  // asserted rather than left to be rediscovered as a bug.
  ok('a plural hub page listing tests is NOT treated as a test itself',
    !guard('/pages/ap-csa-practice-tests-by-topic') && !guard('/pages/ap-csa-unit-tests-hub'));

  // The widget must not be the thing that breaks a page.
  ok('the widget writes no stylesheet into the document',
    !/document\.head\.appendChild|document\.styleSheets/.test(widget));
  ok('all widget UI goes in a shadow root', /attachShadow/.test(widget));
  ok('and it removes itself rather than running without one',
    /if \(!root\) \{ host\.remove\(\); return; \}/.test(widget));
  // Assignment, not the word. The first version of this matched the comment
  // that explains why innerHTML is not used, which is a check that can only ever
  // fail for the wrong reason.
  ok('the widget never ASSIGNS innerHTML',
    !/\.innerHTML\s*(=|\+=)/.test(widget));
  ok('the widget builds text with textContent',
    /textContent/.test(widget));
  ok('the widget file is pure ASCII',
    Buffer.from(widget, 'utf8').every((b) => b <= 127));

  const flag = fs.readFileSync(path.join(__dirname, '..', 'public', 'apcs-flag.js'), 'utf8');
  ok('the flag script is a SEPARATE file from the widget', flag !== widget);
  ok('the flag script waits for the results panel on assessment pages',
    /resultsPanel\(\)/.test(flag) && /MutationObserver/.test(flag));
  ok('it watches the same element ids the theme quiz wiring does',
    /results-panel/.test(flag) && /resultsPanel/.test(flag) && /quizResults/.test(flag));
  ok('it anchors on the class names this repo already parses',
    /qotd-question-box/.test(flag) && /apcs-question-text/.test(flag));
  ok('the flag script is pure ASCII', Buffer.from(flag, 'utf8').every((b) => b <= 127));
  ok('and it disconnects its observer rather than holding it forever',
    /obs\.disconnect\(\)/.test(flag) && /setTimeout/.test(flag));

  // ── 2) ACCEPTANCE 6: find returns only real links ────────────────────────
  let r = await get('/api/assistant/find?q=' + encodeURIComponent('Where is the CSA loops lesson'));
  ok('find answers', r.status === 200 && r.body && Array.isArray(r.body.results), r.body);
  ok('it returns something for a real question', r.body.results.length > 0, r.body);
  ok('EVERY returned path is in the index',
    r.body.results.every((x) => pageIndex.isIndexed(x.path)), r.body.results.map((x) => x.path));
  ok('it prefers a lesson over the quiz on the same unit',
    r.body.results[0].type === 'lesson', r.body.results[0]);
  ok('no result is an assessment page',
    r.body.results.every((x) => x.type !== 'quiz' && x.type !== 'exam'), r.body.results);
  ok('it returns no prose, only link fields',
    r.body.results.every((x) => Object.keys(x).sort().join(',') === 'course,lesson,path,title,type,url'),
    Object.keys(r.body.results[0]));

  r = await get('/api/assistant/find?q=' + encodeURIComponent('unicorn quantum blockchain tutoring'));
  ok('a question with no match returns an empty list, not a guess',
    r.body.results.length === 0, r.body);
  r = await get('/api/assistant/find?q=');
  ok('an empty query returns nothing rather than everything', r.body.results.length === 0, r.body);

  // The re-ranker is the only place a model touches this. Feed it garbage.
  ok('a re-rank reply naming a URL is ignored',
    find.parseIndices('["/pages/made-up-page"]', 5) !== null
      ? find.parseIndices('["/pages/made-up-page"]', 5).length === 0
      : true,
    find.parseIndices('["/pages/made-up-page"]', 5));
  ok('an index past the end of the shortlist is dropped',
    JSON.stringify(find.parseIndices('[1,99,2]', 3)) === '[1,2]', find.parseIndices('[1,99,2]', 3));
  ok('a negative or zero index is dropped',
    JSON.stringify(find.parseIndices('[0,-1,2]', 3)) === '[2]', find.parseIndices('[0,-1,2]', 3));
  ok('a repeated index is not a second result',
    JSON.stringify(find.parseIndices('[2,2,1]', 3)) === '[2,1]', find.parseIndices('[2,2,1]', 3));
  ok('prose instead of JSON is ignored', find.parseIndices('I recommend page 2', 3) === null);
  ok('at most three survive', find.parseIndices('[1,2,3,4,5]', 5).length === 3);

  // ── 3) The index build refuses to empty itself on a bad crawl ────────────
  const beforeRows = pageIndex.count();
  const emptyBuild = await pageIndex.build({
    fetchImpl: async (p) => (p === '/sitemap.xml'
      ? '<sitemapindex><sitemap><loc>https://x/sitemap_pages_1.xml</loc></sitemap></sitemapindex>'
      : '<urlset></urlset>'),   // a challenge page parses exactly like this
  });
  ok('a crawl that finds nothing reports not-ok', emptyBuild.ok === false, emptyBuild);
  ok('and it explains why', /below the .* floor/.test(emptyBuild.errors.join(' ')), emptyBuild.errors);
  ok('AND IT DOES NOT PRUNE the index it could not confirm',
    pageIndex.count() === beforeRows, { before: beforeRows, after: pageIndex.count() });

  // ── 3b) A cold or stale index rebuilds itself ────────────────────────────
  //
  // THE BUG THIS PINS was found on production, not here: the find endpoint
  // deployed green against an EMPTY table and answered every question with
  // nothing, which looks exactly like a working search answering a bad question.
  // Only the decision is tested, never the act: build() goes to the network and
  // this suite does not.
  ok('a freshly seeded index needs no rebuild', pageIndex.needsRebuild() === null, pageIndex.needsRebuild());
  ok('and ensureFresh therefore starts nothing', pageIndex.ensureFresh() === false);
  ok('a populated index has a measurable age', pageIndex.ageHours() < 1, pageIndex.ageHours());
  ok('an index older than the window is stale',
    pageIndex.needsRebuild({ staleHours: 0 }) === 'stale', pageIndex.needsRebuild({ staleHours: 0 }));

  db.prepare('DELETE FROM page_index').run();
  ok('an EMPTY index reports empty rather than fresh',
    pageIndex.needsRebuild() === 'empty', pageIndex.needsRebuild());
  ok('an empty index has no age at all', pageIndex.ageHours() === Infinity, pageIndex.ageHours());
  for (const [p2, title, course, unit, lesson, type] of FIXTURES) {
    stSeed.run(p2, 'https://www.apcsexamprep.com' + p2, p2.split('/').pop(), title, course, unit, lesson, type,
      p2.startsWith('/blogs/') ? 'article' : 'page');
  }
  ok('and it is fresh again once refilled', pageIndex.needsRebuild() === null);

  // ── 4) ACCEPTANCE 7: exactly one thank-you ───────────────────────────────
  sent = [];
  const rep = await post('/api/assistant/report', {
    category: 'content_error',
    pageUrl: '/pages/ap-csa-lesson-2-7-while-loops',
    description: 'The third example on this page never terminates, the counter is not incremented.',
    reporterEmail: 'teacher@school.example',
  }, TT);
  await settle();
  ok('a report with a reporter email is stored', !!rep.body.id, rep.body);

  sent = [];
  let out = await thanksLib.markFixed(rep.body.id, 'Counter increment restored.');
  ok('marking it fixed sends a thank-you', out.thanked.length === 1 && sent.length === 1, { out, sent: sent.length });
  ok('it goes to the reporter, not to the owner',
    sent[0].to === 'teacher@school.example', sent[0] && sent[0].to);
  ok('the subject is NOT one of the three inbound rule prefixes',
    !/^\[APCS (Urgent|Bug|Suggestion)\]/.test(sent[0].subject), sent[0].subject);
  ok('the body names the page', /while-loops/.test(sent[0].text), sent[0].text.slice(0, 120));
  ok('the row records that it was thanked', !!one('SELECT thanked_at FROM chat_escalations WHERE id = ?', rep.body.id).thanked_at);

  sent = [];
  out = await thanksLib.markFixed(rep.body.id, 'Fixed again.');
  ok('marking it fixed a SECOND time sends nothing', sent.length === 0, { sent: sent.length, out });
  ok('and it says why', out.skipped.some((s) => s.reason === 'already_thanked'), out.skipped);

  // A dismissed report is never thanked, whatever happens to it.
  const junk = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: '/pages/pricing', description: 'bad',
    reporterEmail: 'spammer@example.test',
  }, TT);
  await settle();
  ok('the junk report was dismissed', one('SELECT status FROM chat_escalations WHERE id = ?', junk.body.id).status === 'dismissed');
  sent = [];
  const t2 = await thanksLib.thank(junk.body.id);
  ok('a dismissed report is never thanked', t2.sent === false && sent.length === 0, t2);

  // A report with no address cannot be thanked and must not throw trying.
  const anon = await post('/api/assistant/report', {
    category: 'bug_report', pageUrl: '/pages/pricing',
    description: 'The annual pricing option does not appear on a narrow phone screen at all.',
  }, TT);
  await settle();
  sent = [];
  const t3 = await thanksLib.thank(anon.body.id);
  ok('a report with no reporter email is skipped cleanly',
    t3.sent === false && t3.reason === 'no_reporter_email' && sent.length === 0, t3);

  // ── 5) Everyone in a thread who asked (handoff section 5) ────────────────
  sent = [];
  const a = await post('/api/assistant/report', {
    category: 'content_error', pageUrl: '/pages/ap-csa-nested-loops',
    description: 'The inner loop in example two runs one time too many for the stated output.',
    reporterEmail: 'first@school.example',
  }, TT);
  await settle();
  const b = await post('/api/assistant/report', {
    category: 'content_error', pageUrl: '/pages/ap-csa-nested-loops?utm=x',
    description: 'Second person here, the nested example two output does not match the code shown.',
    reporterEmail: 'second@school.example',
  }, TT);
  await settle();
  ok('both landed in one thread',
    one('SELECT thread_key FROM chat_escalations WHERE id = ?', a.body.id).thread_key
      === one('SELECT thread_key FROM chat_escalations WHERE id = ?', b.body.id).thread_key);

  // Both rows are fixed, then one is patched. Everyone in the thread hears.
  db.prepare("UPDATE chat_escalations SET status = 'fixed' WHERE id = ?").run(b.body.id);
  sent = [];
  out = await thanksLib.markFixed(a.body.id, 'Example two corrected.');
  const to = sent.map((m) => m.to).sort();
  ok('every reporter in the thread who left an address is thanked',
    to.length === 2 && to[0] === 'first@school.example' && to[1] === 'second@school.example', to);
  ok('and none of them hears about the others',
    sent.every((m) => !/first@|second@/.test(m.text)), sent.map((m) => m.text.slice(0, 60)));

  // ── 6) The version endpoint that beats the Cloudflare cache (TODO #241) ──
  r = await get('/api/assistant/widget-version');
  ok('a widget version is served', r.status === 200 && typeof r.body.widget === 'string', r.body);
  ok('it is content-derived, not a placeholder',
    /^[0-9a-f]{12}$/.test(r.body.widget), r.body.widget);
  ok('the widget and the flag script version separately',
    r.body.widget !== r.body.flag, r.body);
  ok('it hands over ready-made versioned URLs',
    r.body.widget_url === '/apcs-widget.js?v=' + r.body.widget, r.body.widget_url);

  console.log(`\n${pass} passed, ${fail} failed`);
  mailer.sendEmail = realSend;
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
