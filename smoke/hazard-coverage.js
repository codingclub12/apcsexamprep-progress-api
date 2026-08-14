'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: hazard coverage. The property this suite defends is TOTALITY.
//
//  A compiled prompt is the entire rulebook for a chat-routed task. If a surface
//  or a course falls through the gate, the agent gets no guardrails and nobody
//  finds out until the wrong thing ships. So the assertions here are mostly of
//  the form "this cannot be silent", not "this returns the right string".
//
//  Three failures it is built to catch, all of them real:
//    1. A rule gets deleted from a hazard body. The XSS rule and the fixed-overlay
//       rule are asserted by content, so removing one turns this suite red.
//    2. A course is added to lib/command-write.js COURSES and nobody adds a row to
//       CONTENT_COVERAGE. The two lists are compared directly.
//    3. A key gets pasted into a hazard body while someone is debugging. Every
//       body is scanned, and the scanner is itself tested against a planted key
//       so a scanner that silently stops working is also a failure.
//
//  OFFLINE and dependency-free: pure module under test, no database, no server,
//  no network. Run: npm run smoke:hazards
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const H = require('../lib/command-hazards');

// lib/command-write.js is the write guard's enum list, and it is the list this
// table has to stay level with. It is read as TEXT rather than required, because
// requiring it pulls in command-store and then db.js and then better-sqlite3,
// and this suite is meant to run with nothing installed and no database on disk.
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

// ── 1. Coverage is total ─────────────────────────────────────────────────────
section('1. Content coverage is total (no course can be silent)');

for (const course of COURSES) {
  ok(`1.x every write-guard course has a CONTENT_COVERAGE row: ${course}`,
    Object.prototype.hasOwnProperty.call(H.CONTENT_COVERAGE, course),
    { course, known: H.KNOWN_COURSES });
}

const strayRows = H.KNOWN_COURSES.filter((c) => !COURSES.includes(c));
ok('1.2 CONTENT_COVERAGE has no row for a course the write guard rejects',
  strayRows.length === 0, { strayRows });

for (const [course, entry] of Object.entries(H.CONTENT_COVERAGE)) {
  const dispositions = ['block', 'pending', 'exempt', 'fanout'].filter((k) => entry[k]);
  ok(`1.3 ${course} has exactly one disposition`, dispositions.length === 1, { course, dispositions });
  ok(`1.4 ${course} carries a title`, typeof entry.title === 'string' && entry.title.length > 0);
}

for (const [course, entry] of Object.entries(H.CONTENT_COVERAGE)) {
  if (entry.exempt) {
    ok(`1.5 exempt course ${course} states a reason someone can argue with`,
      typeof entry.exempt === 'string' && entry.exempt.length > 40, { course });
  }
  if (entry.pending) {
    ok(`1.6 pending course ${course} states what is missing`,
      typeof entry.pending === 'string' && entry.pending.length > 40, { course });
  }
}

// Shipped courses must never sit on the exempt list. Exempt means "deliberately
// unguarded", which is only defensible when nothing is being authored.
ok('1.7 networking is not exempt (it is shipped)', H.contentCoverageFor('networking') !== 'exempt',
  H.contentCoverageFor('networking'));
ok('1.8 cyber is not exempt (largest active build track)', H.contentCoverageFor('cyber') !== 'exempt',
  H.contentCoverageFor('cyber'));

// ── 2. No content task compiles with an empty hazard array ───────────────────
section('2. Content tasks are never guardrail-free');

for (const course of COURSES) {
  const hz = H.hazardsFor({ surface: 'content', course, title: 'Rewrite a lesson' });
  const exempt = H.contentCoverageFor(course) === 'exempt';
  ok(`2.x surface=content course=${course} compiles ${exempt ? 'an empty array only because it is exempt' : 'a non-empty hazard array'}`,
    exempt ? hz.length === 0 : hz.length > 0, { course, count: hz.length });
}

// The acceptance criterion from the brief, stated on its own so a failure names it.
ok('2.1 ACCEPTANCE: surface=content course=cyber returns a non-empty hazard array',
  H.hazardsFor({ surface: 'content', course: 'cyber', title: 'Draft 3.2' }).length > 0);

ok('2.2 a pending course compiles a STOP block that forbids guessing',
  /STOP/.test(bodies({ surface: 'content', course: 'cyber', title: 'x' }))
  && /source-of-truth/.test(bodies({ surface: 'content', course: 'cyber', title: 'x' }))
  && /from memory/.test(bodies({ surface: 'content', course: 'cyber', title: 'x' })));

ok('2.3 an unknown course compiles a louder STOP rather than nothing',
  H.hazardsFor({ surface: 'content', course: 'ap-basketweaving', title: 'x' }).length > 0
  && /no row in CONTENT_COVERAGE/.test(bodies({ surface: 'content', course: 'ap-basketweaving', title: 'x' })));

ok('2.4 content with no course set compiles a STOP rather than nothing',
  H.hazardsFor({ surface: 'content', title: 'x' }).length > 0
  && /no `course` set/.test(bodies({ surface: 'content', title: 'x' })));

ok('2.5 course=all fans out to every non-exempt course',
  H.hazardsFor({ surface: 'content', course: 'all', title: 'x' }).length === H.FANOUT_ORDER.length,
  titles({ surface: 'content', course: 'all', title: 'x' }));

ok('2.6 course=all still carries the CSA 4-unit rule',
  /4-unit/.test(bodies({ surface: 'content', course: 'all', title: 'x' })));

ok('2.7 an exempt course is empty on purpose, not by accident',
  H.hazardsFor({ surface: 'content', course: 'greenfoot', title: 'x' }).length === 0
  && H.contentCoverageFor('greenfoot') === 'exempt');

// ── 3. Shopify / theme block content ─────────────────────────────────────────
section('3. The Shopify block carries every rule that was paid for in production');

const shopify = { surface: 'shopify', title: 'Update the pricing page' };
const shopifyBody = bodies(shopify);

ok('3.1 XSS: textContent, not string interpolation', /element\.textContent/.test(shopifyBody));
ok('3.2 XSS rule names the thing it forbids', /innerHTML/.test(shopifyBody));
ok('3.3 collapsed overlay: no transform on an ancestor of position: fixed',
  /transform/.test(shopifyBody) && /position: fixed/.test(shopifyBody));
ok('3.4 theme files stay pure ASCII', /pure ASCII/.test(shopifyBody));
ok('3.5 colour revert rule survives', /-webkit-text-fill-color/.test(shopifyBody));
ok('3.6 edge cache tail survives', /64-minute/.test(shopifyBody));
ok('3.7 the &quot; attribute rule survives', /&quot;/.test(shopifyBody));
ok('3.8 the grid rule survives', /auto-fit/.test(shopifyBody));

// The contradiction with CONVENTIONS.md: the block used to say "HTML entities
// only" unscoped, so a session writing a script tag produced the exact bug the
// convention exists to prevent. Both halves must now be present.
ok('3.9 entity rule is still stated', /HTML entities only/.test(shopifyBody));
ok('3.10 entity rule is scoped: it inverts inside a script block',
  /<script>/.test(shopifyBody) && /NEVER an HTML entity inside/.test(shopifyBody));

ok('3.11 surface=theme gets the same block', /element\.textContent/.test(bodies({ surface: 'theme', title: 'x' })));

// ── 4. Matrixify reaches chat ────────────────────────────────────────────────
section('4. Matrixify rules reach the surface that actually runs them');

ok('4.1 surface=shopify carries the Matrixify block', hasTitle(shopify, /Matrixify/));
ok('4.2 MERGE not REPLACE', /MERGE/.test(shopifyBody) && /never REPLACE/.test(shopifyBody));
ok('4.3 QUOTE_ALL', /QUOTE_ALL/.test(shopifyBody));
ok('4.4 Published At must be past-dated', /Published At/.test(shopifyBody) && /past date/.test(shopifyBody));
ok('4.5 empty Body HTML wipes the page', /Body HTML/.test(shopifyBody) && /WIPES/.test(shopifyBody));
ok('4.6 surface=theme does not carry Matrixify (it is a repo surface)',
  !hasTitle({ surface: 'theme', title: 'x' }, /Matrixify/));

// ── 5. MCQ signal precision ──────────────────────────────────────────────────
section('5. MCQ block fires on authoring, not on a product name');

ok('5.1 task 70 shape: "Spring 2026 MCQ Bootcamp" on shopify does NOT get the MCQ block',
  !hasTitle({ surface: 'shopify', title: 'Spring 2026 MCQ Bootcamp banner' }, /MCQ writing/),
  titles({ surface: 'shopify', title: 'Spring 2026 MCQ Bootcamp banner' }));

ok('5.2 "MCQ Bundle" on klaviyo does NOT get the MCQ block',
  !hasTitle({ surface: 'klaviyo', title: 'Announce the MCQ Bundle' }, /MCQ writing/));

ok('5.3 authoring still fires: "Write 20 MCQs for 3.4" on content',
  hasTitle({ surface: 'content', course: 'csp', title: 'Write 20 MCQs for 3.4' }, /MCQ writing/));

ok('5.4 a strong signal fires on ANY surface: distractors on shopify',
  hasTitle({ surface: 'shopify', title: 'Fix the distractors on the sample item' }, /MCQ writing/));

ok('5.5 "question bank" fires', hasTitle({ surface: 'content', course: 'csa', title: 'Grow the question bank' }, /MCQ writing/));

ok('5.6 bare MCQ on a content surface still fires (false negatives cost more)',
  hasTitle({ surface: 'content', course: 'csa', title: 'MCQ pass on Unit 2' }, /MCQ writing/));

ok('5.7 "STEM outreach" does not fire the MCQ block',
  !hasTitle({ surface: 'klaviyo', title: 'STEM outreach email to district leads' }, /MCQ writing/));

// ── 6. Surfaces are covered ──────────────────────────────────────────────────
section('6. Every surface the write guard accepts is accounted for');

// Surfaces with no block, and why. Same posture as the exempt list on courses:
// "nothing to say" is allowed, "nobody checked" is not.
//   drive   - read, create, and copy only; Drive is never a live master
//   ops     - human process work, no machine constraint to inject
//   klaviyo - OPEN QUESTION. Sends are staged-only today, which is the only rule
//             the router enforces. If there are list-hygiene, deliverability, or
//             template constraints that have bitten before, they belong in a
//             CONTENT-style block here rather than in one person's head.
const SURFACES_WITHOUT_BLOCKS = ['drive', 'ops', 'klaviyo'];
for (const surface of SURFACES) {
  const hz = H.hazardsFor({ surface, course: 'csa', title: 'A task' });
  const expected = !SURFACES_WITHOUT_BLOCKS.includes(surface);
  ok(`6.x surface=${surface} ${expected ? 'carries a block' : 'deliberately carries none'}`,
    expected ? hz.length > 0 : true, { surface, count: hz.length });
}

// ── 7. No secrets in a hazard body ───────────────────────────────────────────
section('7. No credential ever rides into a prompt inside a hazard');

const SECRET_PATTERNS = [
  /\bshpat_[A-Za-z0-9]{8,}/,
  /\bshpss_[A-Za-z0-9]{8,}/,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bghp_[A-Za-z0-9]{16,}/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/,
  /\b(TODO_KEY|ADMIN_KEY|JWT_SECRET|API_KEY|SECRET)\s*[=:]\s*\S{8,}/i,
  /\b[A-Fa-f0-9]{40,}\b/,
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
  MCQ: H.MCQ,
  MISSING_COURSE: H.MISSING_COURSE,
  pendingBlock: H.pendingBlock('cyber', 'reason text'),
  unknownCourseBlock: H.unknownCourseBlock('whatever'),
};

for (const [name, body] of Object.entries(ALL_BODIES)) {
  const hits = scanForSecrets(body);
  ok(`7.x no secret-shaped string in ${name}`, hits.length === 0, hits);
}

// A scanner nobody tests is a scanner that quietly stops working.
ok('7.1 the scanner catches a planted bearer token',
  scanForSecrets('Use Bearer abcdef0123456789abcdef to call the API').length > 0);
ok('7.2 the scanner catches a planted key assignment',
  scanForSecrets('TODO_KEY=test-todo-key-0123456789-abcdefgh').length > 0);
// Assembled at runtime rather than written out. The value is synthetic, but it
// is shaped exactly like the real thing, and a literal here trips GitHub push
// protection on every push of this file. Which is the scanner above, working.
const FAKE_SHOPIFY_TOKEN = ['shp', 'at_', '0123456789abcdef0123456789abcdef'].join('');
ok('7.3 the scanner catches a planted Shopify token',
  scanForSecrets(FAKE_SHOPIFY_TOKEN).length > 0);
ok('7.4 the scanner does not fire on ordinary hazard prose',
  scanForSecrets('Hardcode every colour with !important and re-verify after every push.').length === 0);

// ── 8. Shape and house style ─────────────────────────────────────────────────
section('8. Blocks are well formed and match house conventions');

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
  const wellFormed = hz.every((h) => typeof h.title === 'string' && h.title.length > 0
    && typeof h.body === 'string' && h.body.trim().length > 0);
  ok(`8.x well-formed {title, body} for ${task.surface}/${task.course || 'none'}`, wellFormed, hz);
}

const EM_DASH = /—/;
for (const [name, body] of Object.entries(ALL_BODIES)) {
  ok(`8.x no em-dash in ${name} (house convention)`, !EM_DASH.test(body));
}

// Guards smoke/command-center.js criterion 23 from a distance: if someone edits
// the CSA block, that suite and this one both name what was lost.
ok('8.1 CSA block keeps the 4-unit structure rule', /4-unit/.test(H.CONTENT_CSA));
ok('8.2 CSA block keeps the source-of-truth filename',
  /ap-computer-science-a-course-and-exam-description__1_\.pdf/.test(H.CONTENT_CSA));
ok('8.3 CSA block keeps recursion TRACING only', /recursion TRACING only/.test(H.CONTENT_CSA));
ok('8.4 API block keeps additive migrations, zero PII, and the $169 leak',
  /Additive migrations only/.test(H.API) && /Zero-PII/.test(H.API) && /\$169 leak/.test(H.API));

// The CSP block is a draft and must say so where a reader sees it, not only in a
// code comment. Remove the flag when the review lands, and this assertion goes too.
ok('8.5 the CSP block announces that it is an unreviewed draft',
  /DRAFT/.test(H.CONTENT_CSP) && /DRAFT/.test(H.CONTENT_COVERAGE.csp.title)
  && typeof H.CONTENT_COVERAGE.csp.review === 'string');

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'-'.repeat(70)}`);
console.log(`hazard coverage: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailed:');
  for (const f of failures) console.log('  - ' + f);
}
process.exit(fail ? 1 : 0);
