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

  // ---------------------------------------------------------------------------
  //  THE HOST'S OWN BOX, which is what shipped broken on 2026-09-18.
  //
  //  Everything INSIDE the shadow root was correct that day and the pill still
  //  did not paint: the host computed display:none from a source no stylesheet
  //  walk could find, so a healthy subtree collapsed to 0x0. ':host{all:initial}'
  //  cannot defend that, because an author rule beats an initial value.
  //
  //  This runs boot() against a DOM shim rather than grepping for the three
  //  setProperty lines, because the assertion that matters is not "the source
  //  contains a string", it is "the host ends up unhideable". A regex would
  //  still pass if somebody moved the lines after the appendChild, or dropped
  //  the !important, or set them on the wrong element.
  // ---------------------------------------------------------------------------
  function shimEl(tag) {
    const decls = {};
    return {
      tagName: String(tag).toUpperCase(), children: [], _attrs: {}, shadowRoot: null,
      style: {
        setProperty: (k, v, pri) => { decls[k] = { value: v, priority: pri || '' }; },
        getPropertyValue: (k) => (decls[k] || {}).value,
        getPropertyPriority: (k) => (decls[k] || {}).priority || '',
        _decls: decls,
      },
      setAttribute(k, v) { this._attrs[k] = v; if (k === 'id') this.id = v; },
      //  A rect computed from the element's OWN inline style, so placeWidget's
      //  loop actually moves something and the test can watch where it lands.
      //  Without this getBoundingClientRect is undefined, placeWidget throws,
      //  the try/catch around it swallows the error, and every placement
      //  assertion silently tests nothing.
      getBoundingClientRect() {
        const px = (k, d) => {
          const v = decls[k] && decls[k].value;
          const n = v ? Number(String(v).replace('px', '')) : NaN;
          return Number.isFinite(n) ? n : d;
        };
        const w = 117, h = 41;
        const bottom = px('bottom', 18);
        const left = px('left', 18);
        const top = SHIM_VIEWPORT.h - bottom - h;
        return { left, top, width: w, height: h, right: left + w, bottom: top + h };
      },
      appendChild(c) {
        //  Snapshot the armour AT APPEND TIME. Without this the order assertion
        //  below is hollow: moving the setProperty calls after appendChild leaves
        //  the final style identical, and a check of the end state cannot see it.
        if (c && c.style) c._displayPinAtAppend = c.style.getPropertyPriority('display');
        this.children.push(c); return c;
      },
      attachShadow() { this.shadowRoot = shimEl('#shadow'); return this.shadowRoot; },
      remove() { this._removed = true; },
      //  placeWidget falls back to host.contains(hit). Without this the first
      //  probe threw, the try/catch swallowed it, and the pill silently stayed
      //  put: the exact shape of failure the live bug had.
      contains(n) {
        if (n === this) return true;
        return this.children.some((c) => c && typeof c.contains === 'function' && c.contains(n));
      },
      querySelector() { return null; },
      set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    };
  }
  const SHIM_VIEWPORT = { w: 1365, h: 911 };

  //  obstruction: how many pixels of the bottom of the viewport an ad covers.
  //  elementFromPoint reports a foreign element there, exactly as the live
  //  AdThrive footer banner does, so placeWidget has to climb out of it.
  function bootInShim(pathname, obstruction) {
    const body = shimEl('body');
    const cover = Number(obstruction) || 0;
    const doc = {
      readyState: 'interactive', body,
      createElement: shimEl,
      getElementById: (id) => body.children.find((c) => c.id === id) || null,
      addEventListener() {},
      elementFromPoint(x, y) {
        if (y > SHIM_VIEWPORT.h - cover) return { tagName: 'DIV', _ad: true };
        return doc.__host || null;
      },
    };
    const win = { APCS_ERRORS: [], addEventListener() {}, removeEventListener() {} };
    win.innerHeight = SHIM_VIEWPORT.h;
    win.innerWidth = SHIM_VIEWPORT.w;
    //  boot() appends the host, then places it. The shim has to be able to
    //  answer elementFromPoint with that host, so it is published as the
    //  appendChild happens rather than after the script has finished.
    const realAppend = body.appendChild.bind(body);
    body.appendChild = (c) => { if (c && c.id === 'apcs-assistant-root') doc.__host = c; return realAppend(c); };
    const fn = new Function('window', 'document', 'location', 'fetch', 'localStorage', 'setTimeout', 'addEventListener', widget);
    fn(win, doc, { pathname }, () => {}, {}, () => 0, () => {});
    const host = body.children.find((c) => c.id === 'apcs-assistant-root') || null;
    const btn = host && host.shadowRoot
      && host.shadowRoot.children.find((c) => c._attrs && c._attrs.class === 'btn');
    return { body, host, btn };
  }

  // ---------------------------------------------------------------------------
  //  PLACEMENT, and the ad stack that forced it.
  //
  //  Measured live 2026-09-18: AdThrive's footer banner is FULL WIDTH and 100px
  //  tall, and the ad's own close button sits in the bottom-right corner at the
  //  maximum z-index. The pill was in the middle of both.
  //
  //  The lift is probed rather than hardcoded, so the test drives a fake
  //  elementFromPoint that pretends the bottom 100px is covered and requires the
  //  pill to climb out of it. A test asserting "bottom is 120px" would pass on a
  //  hardcoded constant, which is the thing this design exists to avoid.
  // ---------------------------------------------------------------------------
  function placeWith(obstructionHeight, viewportH) {
    const body = shimEl('body');
    const doc = {
      readyState: 'interactive', body,
      createElement: shimEl,
      getElementById: (id) => body.children.find((c) => c.id === id) || null,
      addEventListener() {},
      elementFromPoint(x, y) {
        // Anything inside the bottom strip is covered by the banner.
        if (y > viewportH - obstructionHeight) return { tag: 'AD' };
        return doc.__host;
      },
    };
    const win = { APCS_ERRORS: [], addEventListener() {}, removeEventListener() {},
                  innerHeight: viewportH, innerWidth: 1365 };
    const timers = [];
    const fn = new Function('window', 'document', 'location', 'fetch', 'localStorage',
      'setTimeout', 'addEventListener', 'innerHeight', widget);
    fn(win, doc, { pathname: '/pages/ap-csa-lesson-2-7-while-loops' }, () => {}, {},
       (f) => { timers.push(f); }, () => {}, viewportH);
    const host = body.children.find((c) => c.id === 'apcs-assistant-root');
    doc.__host = host;
    const btn = host && host.shadowRoot && host.shadowRoot.children.find((c) => c._attrs && c._attrs.class === 'btn');
    return { host, btn, bottom: btn && Number(String(btn.style.getPropertyValue('bottom') || '').replace('px', '')) };
  }

  ok('the pill anchors LEFT, away from the ad close button and sticky player',
    /\.btn\{position:fixed;left:18px;/.test(widget));
  ok('and so does the panel, so the two do not split across the screen',
    /\.panel\{position:fixed;left:18px;/.test(widget));
  ok('neither is anchored right any more',
    !/\.(btn|panel)\{position:fixed;right:/.test(widget));
  //  THE BEHAVIOURAL PAIR. A hardcoded lift passes the obstructed case and
  //  fails the clear one, which is exactly what a source grep could not tell:
  //  the first cut of this assertion searched the file for "elementFromPoint"
  //  and matched the COMMENT explaining why we probe, so replacing the probe
  //  with "bottom = 120" left it green.
  const clear = bootInShim('/pages/ap-csa-lesson-2-7-while-loops', 0);
  ok('with nothing in the way the pill sits at the base offset',
    clear.btn && clear.btn.style.getPropertyValue('bottom') === '18px',
    clear.btn && clear.btn.style.getPropertyValue('bottom'));

  const blocked = bootInShim('/pages/ap-csa-lesson-2-7-while-loops', 100);
  const br = blocked.btn && blocked.btn.getBoundingClientRect();
  ok('a 100px ad banner pushes it up out of the way',
    !!br && (br.top + br.height / 2) <= SHIM_VIEWPORT.h - 100,
    br && { bottom: blocked.btn.style.getPropertyValue('bottom'), centreY: br.top + br.height / 2 });
  ok('and it lifts only as far as it needs to, rather than to the ceiling',
    !!br && Number(String(blocked.btn.style.getPropertyValue('bottom')).replace('px', '')) < 200,
    blocked.btn && blocked.btn.style.getPropertyValue('bottom'));
  ok('it never climbs above the middle of the screen',
    /Math\.max\(120, Math\.round\(window\.innerHeight \* 0\.55\)\)/.test(widget));
  ok('it re-places after load, because ad slots fill late',
    (widget.match(/setTimeout\(replace/g) || []).length >= 3);
  ok('and on resize, because a phone banner is a different height',
    /addEventListener\('resize', replace\)/.test(widget));
  //  Checks the DECLARATIONS, not the file. The first cut of this grepped the
  //  whole source for 2147483647 and went red on the comment that records the ad
  //  close button's own z-index, which is documentation rather than a rule.
  const zs = (widget.match(/z-index:\s*(\d+)/g) || []).map((m) => Number(m.replace(/\D/g, '')));
  ok('the widget declares a z-index at all', zs.length > 0, zs);
  ok('and never outranks the ad close button, which somebody needs to click',
    Math.max.apply(null, zs) <= 2147483000, zs);

  const shimmed = bootInShim('/pages/ap-csa-lesson-2-7-while-loops');
  ok('boot() mounts a host on an ordinary page', !!shimmed.host);
  if (shimmed.host) {
    const st = shimmed.host.style;
    for (const [prop, want] of [['display', 'block'], ['visibility', 'visible'], ['opacity', '1']]) {
      ok('the host pins ' + prop + ' inline, so page CSS cannot hide it',
        st.getPropertyValue(prop) === want, st.getPropertyValue(prop));
      ok('and pins ' + prop + ' !important, which is what outranks an author rule',
        st.getPropertyPriority(prop) === 'important', st.getPropertyPriority(prop));
    }
    ok('the host still gets a shadow root', !!shimmed.host.shadowRoot);
    ok('and the armour is on BEFORE it enters the document, so it is never once hideable',
      shimmed.host._displayPinAtAppend === 'important', shimmed.host._displayPinAtAppend);
  }
  ok('an assessment page still mounts nothing at all',
    bootInShim('/pages/ap-csa-practice-test-2d-arrays').host === null);

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
