'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: hazard coverage. Asserts that every rule paid for with a production
//  bug actually reaches the surface that can commit it, and that no course can
//  compile a prompt with no rulebook at all.
//
//  The bug this suite exists to prevent is not a crash. It is silence: a task
//  routed to CHAT compiles a prompt whose only rulebook is its hazard block,
//  because chat is not in a repo and never reads CLAUDE.md or CONVENTIONS.md.
//  A rule that lives only in the theme repo is, from chat's point of view, a
//  rule that does not exist.
//
//  Failures it is built to catch, all of them real:
//    1. A rule deleted from a body. Each is asserted by content, and each names
//       the production bug it came from.
//    2. A course added to lib/command-write.js COURSES with no row in the
//       coverage table. The two lists are compared directly.
//    3. A course that is unrecognised or missing at RUNTIME, which a list-based
//       coverage check cannot see, because a typo'd value is in nobody's list.
//    4. The phrase criterion 22 of smoke/command-center.js greps for being
//       reworded out of the Shopify block. That regression shipped once.
//    5. A credential pasted into a hazard body. The detector is itself tested
//       against planted keys, because a check that cannot fail proves nothing.
//
//  OFFLINE and dependency-free: pure function in, array out. No database, no
//  network, no server. Runs in milliseconds so it can gate every commit.
//
//  Run: npm run smoke:hazards
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const H = require('../lib/command-hazards');

// lib/command-write.js holds the write guard's enums, and this table has to stay
// level with them. Read as TEXT rather than required, because requiring it pulls
// in command-store, then db.js, then better-sqlite3, and this suite is meant to
// run with nothing installed and no database on disk.
function enumFromWriteGuard(name) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'command-write.js'), 'utf8');
  const m = new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`).exec(src);
  if (!m) throw new Error(`could not find ${name} in lib/command-write.js`);
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}
const COURSES = enumFromWriteGuard('COURSES');
const SURFACES = enumFromWriteGuard('SURFACES');

let pass = 0; let fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else {
    fail++; failures.push(name);
    console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  }
}
function section(t) { console.log('\n' + t); }

const titles = (task) => H.hazardsFor(task).map((h) => h.title);
const bodies = (task) => H.hazardsFor(task).map((h) => h.body).join('\n');
const hasTitle = (task, re) => titles(task).some((t) => re.test(t));

// ── 1. Rules that must survive in the Shopify/theme block ────────────────────
//  Each entry names the production bug it came from. A rule deleted from this
//  block fails here rather than in September.
section('1. Shopify/theme block still carries every rule paid for with a bug');

for (const [label, re] of [
  ['wrapper id + all:initial reset (sitewide CSS bleed)', /all:initial/i],
  ['-webkit-text-fill-color guard (colour reverts)', /-webkit-text-fill-color/i],
  ['textContent, not interpolation (LIVE XSS)', /textContent/],
  ['XSS rule names what it forbids', /innerHTML/],
  ['script blocks use Unicode escapes, not entities', /Unicode escapes[\s\S]{0,60}entities/i],
  ['no transform above position:fixed (collapsed overlay)', /transform[\s\S]{0,140}position:fixed|position:fixed[\s\S]{0,140}transform/i],
  ['pure ASCII source files', /ASCII/i],
  ['repeat(N,1fr) not auto-fit', /auto-fit/i],
  ['no &quot; inside onclick', /&quot;/],
  ['64-minute edge cache tail', /64-minute|~64/i],
  ['live-deploy warning: commit to the connected branch IS a deploy', /LIVE site/],
  ['sitewide flag change requires naming every reader and writer', /sitewide flag/i],
]) {
  ok('1.x ' + label, re.test(H.SHOPIFY_THEME));
}

// ── 2. The contradiction that used to exist, and the regression that followed ─
//  The old block said "HTML entities only" with no scope. The theme repo said
//  "no HTML entities inside <script>". A chat session following the old block
//  while writing a script tag produced exactly the bug CONVENTIONS.md exists to
//  prevent, and believed it had complied.
//
//  The first fix for that REWORDED the phrase, which broke criterion 22 of
//  smoke/command-center.js while its own suite stayed green. Both halves are
//  asserted here so neither failure mode can come back alone.
section('2. The entity rule is scoped, not reworded');
ok('2.1 block distinguishes inside-script from outside-script',
  /INSIDE a `<script>`/.test(H.SHOPIFY_THEME) && /OUTSIDE a `<script>`/.test(H.SHOPIFY_THEME));
ok('2.2 block no longer carries the unscoped "No emojis, HTML entities only"',
  !/No emojis, HTML entities only/i.test(H.SHOPIFY_THEME));
ok('2.3 REGRESSION GUARD: the literal phrase criterion 22 greps for is still present',
  /HTML entities only/.test(H.SHOPIFY_THEME));

// ── 3. Matrixify rules reach the surface that runs Matrixify ─────────────────
section('3. Matrixify rules reach chat');

for (const [label, re] of [
  ['MERGE mode', /MERGE/],
  ['QUOTE_ALL', /QUOTE_ALL/],
  ['utf-8-sig encoding', /utf-8-sig/],
  ['past-dated Published At, never now()', /2026-03-01[\s\S]{0,40}now\(\)/],
  ['one import at a time', /One import at a time/i],
  ['empty Body HTML wipes the page', /Body HTML[\s\S]{0,140}wipes/i],
  ['redirects targets verified 200', /verified 200/i],
]) {
  ok('3.x ' + label, re.test(H.MATRIXIFY));
}

// Fires on the SURFACE, not only on the words. Page bodies ship through
// Matrixify and that work is tagged surface=shopify, so a shopify task that
// never says "Matrixify" still gets the rules that silently destroy content.
ok('3.1 any surface=shopify task picks up the import block, worded or not',
  hasTitle({ surface: 'shopify', title: 'Update the pricing page copy' }, /Matrixify import/));
ok('3.2 a Matrixify task on surface=shopify picks it up',
  hasTitle({ surface: 'shopify', title: 'Push the unit 3 page via Matrixify' }, /Matrixify import/));
ok('3.3 a content task ending in a CSV import picks it up too',
  hasTitle({ surface: 'content', course: 'csa', title: 'Bulk import the new study guides', detail: 'csv import' }, /Matrixify import/));
ok('3.4 an unrelated api task does NOT pick it up',
  !hasTitle({ surface: 'api', title: 'Add attempt rollup index' }, /Matrixify import/));

// ── 4. Content coverage is total ─────────────────────────────────────────────
section('4. Every content course is covered, pending, or explicitly exempt');

for (const course of COURSES) {
  ok(`4.x every write-guard course has a coverage row: ${course}`,
    Object.prototype.hasOwnProperty.call(H.CONTENT_COVERAGE, course),
    { course, known: H.KNOWN_COURSES });
}

const strayRows = H.KNOWN_COURSES.filter((c) => !COURSES.includes(c));
ok('4.1 no coverage row for a course the write guard rejects', strayRows.length === 0, { strayRows });

for (const [course, entry] of Object.entries(H.CONTENT_COVERAGE)) {
  const dispositions = ['block', 'pending', 'exempt', 'fanout'].filter((k) => entry[k]);
  ok(`4.x ${course} has exactly one disposition`, dispositions.length === 1, { course, dispositions });
  ok(`4.x ${course} carries a title`, typeof entry.title === 'string' && entry.title.length > 0);
  if (entry.exempt) {
    ok(`4.x exempt course ${course} states a reason someone can argue with`,
      typeof entry.exempt === 'string' && entry.exempt.length > 40);
  }
  if (entry.pending) {
    ok(`4.x pending course ${course} states what is missing`,
      typeof entry.pending === 'string' && entry.pending.length > 40);
  }
}

// A SHIPPED course must never sit on the exempt list. Exempt asserts that nothing
// is being authored against the course, and for networking that is false.
ok('4.2 networking is NOT exempt: it is shipped',
  H.contentCoverageFor('networking') !== 'exempt', H.contentCoverageFor('networking'));
// It now carries the cross-course production rules, so the block is injected
// rather than the whole task being stopped. The stop is narrower but must still
// be there: authoring lesson CONTENT is what is forbidden while the curriculum
// half is unrecorded.
ok('4.2b networking still names what is NOT recorded and forbids inferring it',
  /NOT RECORDED YET/.test(H.CONTENT_COVERAGE.networking.block)
  && /ask rather than infer/i.test(H.CONTENT_COVERAGE.networking.block));
// The guard that matters most on this block: no invented source document. A
// plausible-looking filename injected verbatim is worse than an admitted gap,
// because an agent will cite it and nobody checks whether it exists.
ok('4.2c networking names NO source-of-truth document, because none is recorded',
  !/course-and-exam-description|\.pdf\b/i.test(H.CONTENT_COVERAGE.networking.block),
  (H.CONTENT_COVERAGE.networking.block.match(/\S*\.pdf\S*/i) || [])[0]);
ok('4.2d networking is flagged for review until the curriculum lands',
  typeof H.CONTENT_COVERAGE.networking.review === 'string'
  && H.CONTENT_COVERAGE.networking.review.length > 40);
// The transferable half is the whole point of composing this block from the
// others. If these stop being injected, networking work loses the posture rules.
ok('4.2e networking carries the zero-PII rule',
  /NEVER STORE STUDENT FREE TEXT/.test(H.CONTENT_COVERAGE.networking.block));
ok('4.2f networking carries the server-side answer key rule',
  /SERVER-SIDE/.test(H.CONTENT_COVERAGE.networking.block));
ok('4.2g networking carries the single-source speaker-notes rule',
  /student-addressed voice/i.test(H.CONTENT_COVERAGE.networking.block));
ok('4.2h networking forbids importing another course structure to fill the gap',
  /Do not import AP Cybersecurity/i.test(H.CONTENT_COVERAGE.networking.block));

// The block quotes the shipped structure rather than authoring it, which is only
// worth anything if the quote stays true. utils.js COURSES is what the visit
// denominators are generated from, so if a unit is renamed there and the block
// is not updated, the compiled prompt starts telling every agent a title that no
// longer exists. Read as TEXT, like the write-guard enums above, so this suite
// keeps running with nothing installed.
function networkingUnitsFromUtils() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8');
  const start = src.indexOf("'ap-networking': {");
  if (start < 0) throw new Error("could not find 'ap-networking' in utils.js");
  const chunk = src.slice(start, start + 2000);
  const labels = [...chunk.matchAll(/label: '(Unit \d+: [^']+)'/g)].map((m) => m[1]);
  const lessonLists = [...chunk.matchAll(/lessons: \[([^\]]*)\]/g)]
    .map((m) => m[1].split(',').filter((x) => x.trim()).length);
  return { labels, topics: lessonLists.reduce((a, b) => a + b, 0), unitCount: labels.length };
}
const netCfg = networkingUnitsFromUtils();
const netBlock = H.CONTENT_COVERAGE.networking.block;

ok('4.2i the block agrees with utils.js on the unit COUNT',
  new RegExp(`\\b(FOUR|${netCfg.unitCount})\\b`, 'i').test(netBlock) && netCfg.unitCount === 4,
  netCfg.unitCount);
ok('4.2j the block agrees with utils.js on the TOPIC count',
  netBlock.includes(String(netCfg.topics)) && netCfg.topics === 22, netCfg.topics);
for (const label of netCfg.labels) {
  // The block writes "Unit 1 Managing My Connections" where utils.js writes
  // "Unit 1: Managing My Connections", so compare on the title half.
  const title = label.split(':').slice(1).join(':').trim();
  ok(`4.2k the block carries the shipped title: ${title}`, netBlock.includes(title), title);
}
ok('4.2l the block cites where the structure came from, so a reader can check',
  /utils\.js/.test(netBlock) && /seed-manifest\.js/.test(netBlock));
ok('4.2m the block carries the lesson_id contract that silently drops grades',
  /LESSON_ID IS A CONTRACT/.test(netBlock) && /silently dropped/i.test(netBlock));
ok('4.2n the block warns off seeding ungraded items into the denominator',
  /baseline diagnostic/i.test(netBlock) && /NEVER ADD AN UNGRADED THING/.test(netBlock));
ok('4.3 cyber has a real rulebook now, not an exemption',
  H.contentCoverageFor('cyber') === 'covered', H.contentCoverageFor('cyber'));
ok('4.4 a course in the block map is never also on the exempt list',
  !Object.keys(H.CONTENT_BY_COURSE).some((c) => H.CONTENT_COURSES_WITHOUT_HAZARDS.includes(c)));

// ── 5. Nothing about content is silent at RUNTIME ────────────────────────────
//  Sections 4 checks the table. This section checks the function, which is the
//  part a typo'd course value actually reaches.
section('5. No content task compiles with an empty hazard array by accident');

for (const course of COURSES) {
  const hz = H.hazardsFor({ surface: 'content', course, title: 'Rewrite a lesson' });
  const exempt = H.contentCoverageFor(course) === 'exempt';
  ok(`5.x surface=content course=${course} ${exempt ? 'is empty only because it is exempt' : 'compiles a non-empty hazard array'}`,
    exempt ? hz.length === 0 : hz.length > 0, { course, count: hz.length });
}

ok('5.1 ACCEPTANCE: surface=content course=cyber returns a non-empty hazard array',
  H.hazardsFor({ surface: 'content', course: 'cyber', title: 'Draft 3.2' }).length > 0);
// The pending machinery is tested directly. It used to be exercised through
// networking, which has since gained a block; binding this assertion to whichever
// course happens to be uncovered today means it silently stops testing anything
// the moment that course is covered.
const pendingSample = H.pendingBlock('some-new-course', 'Reason the rulebook is missing.');
ok('5.2 the pending mechanism still compiles a STOP that forbids guessing',
  /STOP/.test(pendingSample)
  && /source-of-truth/.test(pendingSample)
  && /from memory/.test(pendingSample)
  && /some-new-course/.test(pendingSample), pendingSample.slice(0, 80));
ok('5.3 an UNKNOWN course compiles a louder STOP rather than nothing',
  H.hazardsFor({ surface: 'content', course: 'ap-basketweaving', title: 'x' }).length > 0
  && /no row in CONTENT_COVERAGE/.test(bodies({ surface: 'content', course: 'ap-basketweaving', title: 'x' })));
ok('5.4 content with NO course set compiles a STOP rather than nothing',
  H.hazardsFor({ surface: 'content', title: 'x' }).length > 0
  && /no `course` set/.test(bodies({ surface: 'content', title: 'x' })));
ok('5.5 course=all fans out to every non-exempt course',
  H.hazardsFor({ surface: 'content', course: 'all', title: 'x' }).length === H.FANOUT_ORDER.length,
  titles({ surface: 'content', course: 'all', title: 'x' }));
ok('5.6 course=all still carries the CSA 4-unit rule and the cyber titles',
  /4-unit/.test(bodies({ surface: 'content', course: 'all', title: 'x' }))
  && /Understanding Social Engineering/.test(bodies({ surface: 'content', course: 'all', title: 'x' })));
ok('5.7 intro-java carries a real rulebook, not an exemption',
  H.hazardsFor({ surface: 'content', course: 'intro-java', title: 'x' }).length > 0
  && H.contentCoverageFor('intro-java') === 'covered');
ok('5.8 the legacy greenfoot alias compiles the same intro-java rulebook',
  bodies({ surface: 'content', course: 'greenfoot', title: 'x' })
    === bodies({ surface: 'content', course: 'intro-java', title: 'x' })
  && /intro-java-course-spec/.test(bodies({ surface: 'content', course: 'greenfoot', title: 'x' })));
ok('5.9 intro-java names the Judge0 limit that decides what can be auto-graded',
  /GREENFOOT CANNOT RUN IN JUDGE0/.test(bodies({ surface: 'content', course: 'intro-java', title: 'x' }))
  && /never store student free text/i.test(bodies({ surface: 'content', course: 'intro-java', title: 'x' })));

// ── 6. Course blocks name their own source of truth ──────────────────────────
//  Every wrong-PDF incident traces back to a prompt that did not name the file.
section('6. Each course block names its source-of-truth document');
ok('6.1 CSA names the 4-unit CED and warns off the old file',
  /ap-computer-science-a-course-and-exam-description/.test(H.CONTENT_CSA) && /older/i.test(H.CONTENT_CSA));
ok('6.2 CSA keeps recursion TRACING only', /recursion TRACING only/.test(H.CONTENT_CSA));
ok('6.3 CSP names the CSP CED',
  /ap-computer-science-principles-course-and-exam-description/.test(H.CONTENT_CSP));
ok('6.4 CSP organises by Big Idea, not unit number', /Big Idea, not by unit number/i.test(H.CONTENT_CSP));
ok('6.5 Cyber names the CED and warns off the framework PDF',
  /ap-cybersecurity-course-and-exam-description/.test(H.CONTENT_CYBER) && /framework PDF/i.test(H.CONTENT_CYBER));
ok('6.6 Cyber carries the verified Unit 1 titles',
  /Understanding Social Engineering/.test(H.CONTENT_CYBER)
  && /Leveraging AI in Cyber Defense/.test(H.CONTENT_CYBER));
ok('6.7 Cyber carries the single-source speaker-notes rule',
  /student-addressed voice/i.test(H.CONTENT_CYBER));
ok('6.8 Cyber carries the Teacher Bundle no-prescriptive-instructions rule',
  /Teacher Bundle/.test(H.CONTENT_CYBER));
// The CSP block is thinner than the others and was written from the CED. The
// review flag is how that stays visible. Drop the flag when the review lands and
// this assertion goes with it.
ok('6.9 the CSP row is flagged for review while it is CED-sourced',
  typeof H.CONTENT_COVERAGE.csp.review === 'string' && H.CONTENT_COVERAGE.csp.review.length > 20);

// ── 7. MCQ signal precision ──────────────────────────────────────────────────
section('7. MCQ block fires on authoring, not on a product name');

ok('7.1 task 70 shape: "Spring 2026 MCQ Bootcamp" on shopify does NOT get the MCQ block',
  !hasTitle({ surface: 'shopify', title: 'Spring 2026 MCQ Bootcamp banner' }, /MCQ writing/),
  titles({ surface: 'shopify', title: 'Spring 2026 MCQ Bootcamp banner' }));
ok('7.2 "MCQ Bundle" on klaviyo does NOT get the MCQ block',
  !hasTitle({ surface: 'klaviyo', title: 'Announce the MCQ Bundle' }, /MCQ writing/));
ok('7.3 authoring still fires: "Write 20 MCQs for 3.4" on content',
  hasTitle({ surface: 'content', course: 'csp', title: 'Write 20 MCQs for 3.4' }, /MCQ writing/));
ok('7.4 a strong signal fires on ANY surface: distractors on shopify',
  hasTitle({ surface: 'shopify', title: 'Fix the distractors on the sample item' }, /MCQ writing/));
ok('7.5 "question bank" fires',
  hasTitle({ surface: 'content', course: 'csa', title: 'Grow the question bank' }, /MCQ writing/));
ok('7.6 bare MCQ on a content surface still fires (false negatives cost more)',
  hasTitle({ surface: 'content', course: 'csa', title: 'MCQ pass on Unit 2' }, /MCQ writing/));
ok('7.7 "STEM outreach" does not fire the MCQ block',
  !hasTitle({ surface: 'klaviyo', title: 'STEM outreach email to district leads' }, /MCQ writing/));
ok('7.8 MCQ block still bans all-of-the-above', /all-of-the-above/i.test(H.MCQ));

// ── 8. Prior behaviour intact ────────────────────────────────────────────────
section('8. Prior behaviour intact');
ok('8.1 surface=api still gets the API block', hasTitle({ surface: 'api', title: 'x' }, /^API$/));
ok('8.2 API block still carries the zero-PII posture', /Zero-PII|no free-text/i.test(H.API));
ok('8.3 API block keeps additive migrations and the $169 leak',
  /Additive migrations only/.test(H.API) && /\$169 leak/.test(H.API));
ok('8.4 surface=theme still gets the Shopify/theme block',
  hasTitle({ surface: 'theme', title: 'x' }, /Shopify \/ theme/));
ok('8.5 surface=theme does NOT get Matrixify (it is a repo surface)',
  !hasTitle({ surface: 'theme', title: 'x' }, /Matrixify/));
ok('8.6 a bucket=decision task with no surface produces no hazards',
  H.hazardsFor({ bucket: 'decision', title: 'Pick a price' }).length === 0);

// Surfaces with no block, and why. Same posture as the exempt list on courses:
// "nothing to say" is allowed, "nobody checked" is not.
//   drive   - read, create, and copy only; Drive is never a live master
//   ops     - human process work, no machine constraint to inject
//   klaviyo - OPEN QUESTION. Sends are staged-only today, which is the only rule
//             the router enforces. If there are list-hygiene, deliverability, or
//             template constraints that have bitten before, they belong here.
const SURFACES_WITHOUT_BLOCKS = ['drive', 'ops', 'klaviyo'];
for (const surface of SURFACES) {
  const hz = H.hazardsFor({ surface, course: 'csa', title: 'A task' });
  const expected = !SURFACES_WITHOUT_BLOCKS.includes(surface);
  ok(`8.x surface=${surface} ${expected ? 'carries a block' : 'deliberately carries none'}`,
    expected ? hz.length > 0 : true, { surface, count: hz.length });
}

// ── 9. No block leaks a credential ───────────────────────────────────────────
//  The compiler promises it never emits a credential, and a hazard string is the
//  easiest place for one to be pasted by accident while debugging.
//
//  Shape, not length: `ap-computer-science-principles-course-and-exam-description`
//  is 57 characters and belongs in the prompt. A token is a long unbroken run
//  that mixes cases and digits, or a known prefix.
section('9. No credential ever rides into a prompt inside a hazard');

const SECRET_PATTERNS = [
  /\bshpat_[A-Za-z0-9]{8,}/,
  /\bshpss_[A-Za-z0-9]{8,}/,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bghp_[A-Za-z0-9]{16,}/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/,
  /\b(TODO_KEY|ADMIN_KEY|JWT_SECRET|API_KEY|SECRET)\s*[=:]\s*\S{8,}/i,
  /\b[A-Fa-f0-9]{40,}\b/,
  /\b(?=[A-Za-z0-9]{32,}\b)(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*[0-9])[A-Za-z0-9]{32,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
function scanForSecrets(body) {
  return SECRET_PATTERNS.filter((re) => re.test(body)).map((re) => String(re));
}

const ALL_BODIES = {
  SHOPIFY_THEME: H.SHOPIFY_THEME,
  MATRIXIFY: H.MATRIXIFY,
  API: H.API,
  CONTENT_CSA: H.CONTENT_CSA,
  CONTENT_CSP: H.CONTENT_CSP,
  CONTENT_CYBER: H.CONTENT_CYBER,
  MCQ: H.MCQ,
  MISSING_COURSE: H.MISSING_COURSE,
  pendingBlock: H.pendingBlock('networking', 'reason text'),
  unknownCourseBlock: H.unknownCourseBlock('whatever'),
};

for (const [name, body] of Object.entries(ALL_BODIES)) {
  ok(`9.x no secret-shaped string in ${name}`, scanForSecrets(body).length === 0, scanForSecrets(body));
}

// A detector nobody tests is a detector that quietly stops working. The Shopify
// token is assembled at runtime: a literal here is shaped exactly like the real
// thing and trips GitHub push protection on every push of this file, which is
// the detector above working from the other side.
const FAKE_SHOPIFY_TOKEN = ['shp', 'at_', '0123456789abcdef0123456789abcdef'].join('');
ok('9.1 detector catches a planted bearer token',
  scanForSecrets('Use Bearer abcdef0123456789abcdef to call the API').length > 0);
ok('9.2 detector catches a planted key assignment',
  scanForSecrets('TODO_KEY=test-todo-key-0123456789-abcdefgh').length > 0);
ok('9.3 detector catches a planted Shopify token', scanForSecrets(FAKE_SHOPIFY_TOKEN).length > 0);
ok('9.4 detector catches a mixed-case token run',
  scanForSecrets('key aB3dEf7gHi9jKl2mNo4pQr6sTu8vWx0yZ1a').length > 0);
ok('9.5 detector does NOT flag the long CED filename',
  scanForSecrets('ap-computer-science-principles-course-and-exam-description.pdf').length === 0);
ok('9.6 detector does NOT flag ordinary hazard prose',
  scanForSecrets('Hardcode every colour with !important and re-verify after every push.').length === 0);

// ── 10. Shape and house style ────────────────────────────────────────────────
section('10. Blocks are well formed and match house conventions');

const SAMPLE_TASKS = [
  { surface: 'shopify', title: 'Spring 2026 MCQ Bootcamp banner' },
  { surface: 'theme', title: 'Fix the overlay' },
  { surface: 'api', title: 'Add an endpoint' },
  { surface: 'content', course: 'csa', title: 'Write 20 MCQs for 3.4' },
  { surface: 'content', course: 'csp', title: 'Rewrite 2.1' },
  { surface: 'content', course: 'cyber', title: 'Draft 3.2' },
  { surface: 'content', course: 'networking', title: 'Draft 1.1' },
  { surface: 'content', course: 'all', title: 'Sweep every course' },
  { surface: 'content', title: 'No course set' },
  { surface: 'content', course: 'ap-basketweaving', title: 'Unknown course' },
];
for (const task of SAMPLE_TASKS) {
  const hz = H.hazardsFor(task);
  ok(`10.x well-formed {title, body} for ${task.surface}/${task.course || 'none'}`,
    hz.every((h) => typeof h.title === 'string' && h.title.length > 0
      && typeof h.body === 'string' && h.body.trim().length > 0), hz);
}

const EM_DASH = /—/;
for (const [name, body] of Object.entries(ALL_BODIES)) {
  ok(`10.x no em-dash in ${name} (house convention)`, !EM_DASH.test(body));
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'-'.repeat(70)}`);
console.log(`hazard coverage: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailed:');
  for (const f of failures) console.log('  - ' + f);
}
process.exit(fail ? 1 : 0);
