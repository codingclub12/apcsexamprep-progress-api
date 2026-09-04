'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CYBER PRACTICE HUB AND SPOKE: the suite, and the mutations behind it.
//
//  ── WHY THE MUTATIONS ARE THE POINT ────────────────────────────────────────
//  A green validator run proves nothing on its own. Two guards in this repo
//  were found hollow on 2026-09-02 and a third on 2026-09-03, and every one of
//  them was green the whole time. So every rule below is broken ON PURPOSE and
//  the suite requires the rule that CLAIMS the defect to be the rule that
//  fires. A mutation caught by a different rule is reported as a miss, because
//  it means the rule under test is hollow and something else happened to
//  notice.
//
//  ── OFFLINE ────────────────────────────────────────────────────────────────
//  No network. The two live pages this package extends are represented by
//  fixtures with the shape that matters: a wrapper div, a stylesheet, and a
//  nav-row for the block to insert before. The spoke bodies are built by the
//  real generator, so what is tested is what ships.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');

const spec = require('../lib/cyber-practice-spec');
const gen = require('../tools/ap-cyber-ced/generate-practice-sheet');
const { validate, RULES } = require('../tools/ap-cyber-ced/practice-validator');
const base = require('../tools/ap-cyber-ced/validator');
const { HEADER, parseCsv, writeCsv } = require('../tools/ap-cyber-ced/sheet-csv');

//  ── WHY THESE TWO ARE CODEPOINTS AND NOT CHARACTERS ────────────────────────
//  npm run smoke:encoding scans this repository, and the em-dash convention
//  covers every tracked file. Writing a real em-dash or real mojibake here to
//  test for them would turn both guards red on their own source, which is the
//  trap CLAUDE.md describes for the mojibake table in that file. So both
//  defects are built from codepoints at run time: the bytes on disk stay ASCII
//  and the mutation is still the real thing.
//
//  MOJIBAKE_BULLET is SINGLE-pass corruption of U+2022, the depth actually
//  seen on live pages. The double-pass form is the one a naive guard catches,
//  so a mutation built from it would report a blind guard as working.
const EMDASH = String.fromCharCode(0x2014);
const MOJIBAKE_BULLET = String.fromCharCode(0x00e2, 0x20ac, 0x00a2);

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

// ── FIXTURES ────────────────────────────────────────────────────────────────
//  Shaped like the real pages: scoped stylesheet, wrapper id, nav-row last.
function fixtureBody(id, title) {
  return `<style>\n#${id}{all:initial;display:block}\n#${id} h1{font-weight:700}\n</style>\n`
    + `<div id="${id}">\n<h1>${title}</h1>\n<p>Existing content that must survive the edit.</p>\n`
    + `<div class="nav-row"><a href="/pages/ap-cybersecurity-complete-course-guide">Course guide</a></div>\n</div>`;
}

function makeBodies() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyber-practice-'));
  const u = spec.umbrella();
  fs.writeFileSync(path.join(dir, `${u.handle}.html`),
    fixtureBody('apcs-practice-hub', 'AP Cybersecurity Practice'));
  fs.writeFileSync(path.join(dir, `${u.topics_hub}.html`),
    fixtureBody('apcs-cyber-topics', 'AP Cybersecurity Topics'));

  //  The reverse-edge sources. The course guide fixture carries BOTH defects
  //  the live page has, because a fixture that is cleaner than production
  //  tests a page that does not exist: the two dead anchors the repair step
  //  must fix, and an em-dash in prose this package does not author, which
  //  rule 3 must NOT fire on.
  for (const e of spec.reverseSources()) {
    const id = `apcs-${e.from.replace(/[^a-z0-9]+/g, '-')}`;
    let body = fixtureBody(id, e.from);
    if (e.needs_repair) {
      body = body.replace('</div>\n</div>',
        `<p>Existing prose with an ${EMDASH} em-dash nobody here wrote.</p>`
        + '<a href="/pages/ap-cyber-unit-1-lesson-1">Start Unit 1</a>'
        + '<a href="/pages/ap-cybersecurity-study-guides">Study Guides</a>'
        + '</div>\n</div>');
    }
    fs.writeFileSync(path.join(dir, `${e.from}.html`), body);
  }
  return dir;
}

//  The live set: everything the package references, minus the handles it
//  creates. Read from the spec so the fixture cannot drift from the data.
function liveSet() {
  const created = new Set(spec.createdHandles());
  const live = new Set(spec.referencedExistingHandles().filter((h) => !created.has(h)));
  //  The umbrella itself is live; it is extended, not created.
  live.add(spec.umbrella().handle);
  return live;
}

function buildSheet(bodies) {
  return gen.generate({ bodies, liveHandles: liveSet() });
}

// ── PART 1: the shape and the graph ─────────────────────────────────────────
console.log('\ncyber practice hub and spoke\n');

const bodies = makeBodies();
const built = buildSheet(bodies);

ok('the package is fourteen rows: 5 new spokes, 2 hubs, 6 reverse links, 1 course guide',
  built.rows.length === 14, `got ${built.rows.length}`);
ok('parse-back is clean, so the sheet reads as what was written',
  built.drift.length === 0, built.drift.join('; '));
ok('the validator passes a correct sheet on all eleven rules',
  built.report.fail.length === 0, built.report.fail.slice(0, 3).join(' | '));
ok('the validator reports exactly the eleven rules it claims',
  Object.keys(RULES).length === 11, Object.keys(RULES).join(','));
ok('every spoke handle is new, so no live body is overwritten by a create',
  spec.spokes().every((s) => !liveSet().has(s.handle)));
ok('the five spokes carry all 129 practice assets between them',
  spec.allAssetHandles().length === 129, String(spec.allAssetHandles().length));

//  The connection the brief was about, asserted rather than described.
const rowsBy = new Map(built.rows.map((r) => [r.Handle, r]));
const linksOf = (h) => require('../tools/ap-cyber-ced/practice-validator').linksIn(rowsBy.get(h)['Body HTML']);
ok('the concept hub reaches the practice hub, which it did not before',
  linksOf(spec.umbrella().topics_hub).has(spec.umbrella().handle));
ok('the practice hub reaches all five unit spokes',
  spec.spokes().every((s) => linksOf(spec.umbrella().handle).has(s.handle)));
ok('every spoke reaches the course lessons for its own unit',
  spec.spokes().every((s) => s.course_lesson_handles.every((c) => linksOf(s.handle).has(c))));
ok('every spoke reaches its unit study page, joining the existing cluster',
  spec.spokes().every((s) => linksOf(s.handle).has(s.unit_study_page)));

ok('the reverse edge is in the contract: seven sources declared',
  spec.reverseSources().length === 7, String(spec.reverseSources().length));
ok('every unit study page links its own unit practice spoke',
  spec.spokes().every((s) => linksOf(s.unit_study_page).has(s.handle)));
ok('the course guide and the Command Center both reach the practice hub',
  linksOf(spec.umbrella().course_guide).has(spec.umbrella().handle)
  && linksOf('cyber-command-center').has(spec.umbrella().handle));
ok('the course guide sheet is its own file, so a content repair is reviewed alone',
  built.guide.rows.length === 1 && built.reverse.rows.length === 6,
  `guide=${built.guide.rows.length} reverse=${built.reverse.rows.length}`);
ok('both dead anchors on the course guide are gone from the shipped body',
  !/\/pages\/ap-cyber-unit-1-lesson-1(?![a-z0-9-])/.test(built.guide.rows[0]['Body HTML'])
  && !/\/pages\/ap-cybersecurity-study-guides(?![a-z0-9-])/.test(built.guide.rows[0]['Body HTML']));
ok('and they were replaced rather than deleted',
  /\/pages\/ap-cybersecurity-unit-1-introduction-to-security/.test(built.guide.rows[0]['Body HTML'])
  && /\/pages\/ap-cybersecurity-study-guide(?![a-z0-9-])/.test(built.guide.rows[0]['Body HTML']));
ok('rule 3 does NOT fire on an em-dash in prose this package did not author',
  built.report.byRule.R3.length === 0, built.report.byRule.R3.join(' | '));

//  Reversibility: the two extended pages must be exactly recoverable.
const linkBlock = require('../lib/link-block');
ok('an extended page unmarks back to its original body, byte for byte',
  built.specs.every((sp, i) => sp.created
    || linkBlock.unmark(String(built.rows[i]['Body HTML'])) === sp.base_body));

// ── PART 1b: the two sheets must each survive the Matrixify preflight ───────
//  THIS IS HERE BECAUSE THE VALIDATOR MISSED IT.
//  The first version of this package shipped one sheet with all seven rows, and
//  the eleven rules above passed it. scripts/matrixify-preflight.js refused it:
//  a BLANK cell in a Matrixify import does not mean "leave this column alone",
//  it means "set this column to empty", so the two hub rows carried blank Title,
//  Published and SEO columns that would have erased the title of
//  ap-cybersecurity-topics and unpublished it on import.
//
//  The rules above cannot see that, because it is a property of the FILE rather
//  than of any row. So the preflight is part of this suite now, and a
//  regression to one sheet fails here rather than on a live page.
const { preflight } = require('../scripts/matrixify-preflight.js');

function preflightOf(name, csv, header) {
  const tmp = path.join(bodies, name);
  fs.writeFileSync(tmp, csv);
  const res = preflight(tmp);
  fs.rmSync(tmp, { force: true });
  return res;
}

for (const [name, sheet] of [['cyber-practice-new-pages.csv', built.create],
  ['cyber-practice-hub-links-pages.csv', built.extend]]) {
  const res = preflightOf(name, sheet.csv, sheet.header);
  ok(`${name} is clear to import`, res.problems.length === 0, res.problems.join(' | '));
}

//  And the shape that caused it: one file carrying both row kinds.
const merged = require('../tools/ap-cyber-ced/sheet-csv')
  .writeCsv(built.rows, built.create.header);
const mergedRes = preflightOf('cyber-practice-merged-pages.csv', merged);
ok('the single-sheet shape is still refused, so the split cannot quietly come back',
  mergedRes.problems.length > 0, 'the preflight accepted a sheet with blank columns');

// ── PART 1c: link-block must not insert into a JavaScript string ────────────
//  THE 2026-09-04 INCIDENT, PINNED.
//  cyber-command-center has no .related block and no nav-row, so insertion fell
//  through to the last </div> in the body. That </div> is inside a string
//  literal in the page's own 51 KB script:
//
//        + '</div>'
//        + '</div>';
//
//  The block went in mid-literal and the script that builds the whole teacher
//  Command Center died. Div balance, byte growth, anchor count and even a
//  byte-exact CSV round trip all passed; only compiling the JavaScript failed.
//
//  Both halves of the fix are pinned here: the insertion point must skip script
//  and style bodies, and check() must refuse when a script that compiled going
//  in does not come out.
{
  //  Shaped like the real page, which is the whole point: cyber-command-center
  //  ENDS with </script>, and its last </div> sits at byte 65682, inside a
  //  script that spans 17341 to 68693. A fixture with the script in the middle
  //  does not reproduce the bug, because the wrapper's own closing div then
  //  comes after it and the naive lastIndexOf finds the right place by luck.
  const scripty = '<style>#sc .related{color:#000}</style>\n<div id="sc">\n<h1>Command</h1>\n'
    + '<p>body</p>\n</div>\n'
    + '<script>\n  var out = "";\n  function render(){\n    out = \'<div class="x">\'\n'
    + '        + \'</div>\'\n        + \'</div>\';\n  }\n</script>';
  const live = new Set(['ap-cybersecurity-practice']);
  //  build() is caught rather than left to throw. With the script-aware
  //  insertion reverted this refuses (the compile guard in check() catches it,
  //  which is the second half of the fix doing its job), and a bare throw would
  //  end the run with a stack trace instead of a named failure. The gate
  //  matches on that name, so it has to be printed.
  let res = null;
  let buildErr = null;
  try {
    res = linkBlock.build(scripty, [{ handle: 'ap-cybersecurity-practice', label: 'Practice' }], live);
  } catch (e) { buildErr = e.message; }
  ok('a link block goes onto a page whose last </div> is inside a script string',
    !!res && res.changed && res.added.length === 1, buildErr || 'no links added');
  const health = res ? linkBlock.scriptHealth(res.body) : [];
  ok('and the page script still compiles afterwards',
    health.length === 1 && health[0] === true, buildErr || JSON.stringify(health));
  ok('the insertion landed outside the script element, not inside its string',
    !!res && res.body.indexOf(linkBlock.MARK_OPEN) < res.body.indexOf('<script'),
    buildErr || 'the block was inserted inside or after the script');

  //  The guard itself: hand check() an "after" whose script is broken and it
  //  must refuse, whatever the structural numbers say.
  let refused = false;
  try {
    const broken = res.body.replace('+ \'</div>\';', '+ \'</div>;');
    linkBlock.check(scripty, broken, 1, false);
  } catch (e) { refused = /compiled before this edit/.test(e.message); }
  ok('check() refuses an edit that breaks a script that compiled before it', refused);

  //  And it must NOT refuse a page whose script was already broken: that is not
  //  this module's to fix, and failing on it would block every future edit.
  const alreadyBroken = '<div id="ab"><h1>x</h1><script>var a = \'unterminated;</script></div>';
  let ok2 = true;
  try { linkBlock.check(alreadyBroken, alreadyBroken + '<p>x</p>', 0, false); }
  catch (e) { ok2 = !/compiled before this edit/.test(e.message); }
  ok('but tolerates a script that was already broken before the edit', ok2);
}

// ── PART 2: the mutations, one per rule ─────────────────────────────────────
console.log('\n  mutations (a green mutation run is a FAILED check)\n');

//  Each mutation edits the generated sheet and names the rule that must fire.
//  Independence is enforced: the named rule must go red, and the report says so
//  even when another rule also fires.
const MUTATIONS = [
  {
    rule: 'R1', label: 'an EK code in student-visible text',
    apply: (rows) => { rows[0]['Body HTML'] = rows[0]['Body HTML']
      .replace('<h2>Keep going</h2>', '<p>This covers 1.1.C.2 and 1.1.C.3.</p><h2>Keep going</h2>'); },
  },
  {
    rule: 'R2', label: 'a fabricated per-unit exam weighting',
    apply: (rows) => { rows[0]['Body HTML'] = rows[0]['Body HTML']
      .replace('<h2>Keep going</h2>', '<p>This unit is about 20 to 25% of the exam.</p><h2>Keep going</h2>'); },
  },
  {
    rule: 'R3', label: 'an em-dash in a student-visible column',
    //  Built from its codepoint: a literal em-dash here would be a real
    //  em-dash in a tracked file, the very defect this rule bans.
    apply: (rows) => { rows[0].Title = `${rows[0].Title} ${EMDASH} practice`; },
  },
  {
    rule: 'R5', label: 'an empty Body HTML cell that a MERGE would import',
    apply: (rows) => { rows[0]['Body HTML'] = ''; },
  },
  {
    rule: 'R6', label: 'an internal link to a handle that does not exist',
    apply: (rows) => { rows[0]['Body HTML'] = rows[0]['Body HTML']
      .replace('<h2>Keep going</h2>', '<p><a href="/pages/ap-cybersecurity-unit-1-exam">Unit 1 exam</a></p><h2>Keep going</h2>'); },
  },
  {
    rule: 'R7', label: 'SINGLE-pass mojibake, the depth seen on live pages',
    apply: (rows) => { rows[0]['Body HTML'] = rows[0]['Body HTML']
      .replace('Keep going', `Keep going ${MOJIBAKE_BULLET}`); },
  },
  {
    rule: 'P1', label: 'a practice page whose title drops the practice intent',
    apply: (rows) => { rows[0].Title = 'AP Cybersecurity Unit 1 Questions and Labs'; },
  },
  {
    rule: 'P1', label: 'a practice page carrying a CED topic title, the cannibalisation case',
    apply: (rows) => {
      const t = require('../lib/cyber-topics').titleOf('1.1');
      rows[0]['Body HTML'] = rows[0]['Body HTML'].replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, `<h1>${t} Practice</h1>`);
    },
  },
  {
    rule: 'P2', label: 'a created handle outside the practice namespace',
    apply: (rows) => { rows[0].Handle = 'ap-cybersecurity-unit-1-firewalls'; },
  },
  {
    rule: 'P3', label: 'the practice hub silently dropping a spoke it claims to link',
    apply: (rows) => {
      const r = rows.find((x) => x.Handle === spec.umbrella().handle);
      r['Body HTML'] = r['Body HTML'].replace(/<a href="\/pages\/ap-cybersecurity-unit-3-practice">[\s\S]*?<\/a>/, '');
    },
  },
  {
    rule: 'P4', label: 'a spoke linking an asset that belongs to another unit',
    apply: (rows) => {
      const other = spec.spoke(2).assets.quiz[0];
      rows[0]['Body HTML'] = rows[0]['Body HTML']
        .replace('<h2>Keep going</h2>', `<p><a href="/pages/${other}">Quiz</a></p><h2>Keep going</h2>`);
    },
  },
  {
    rule: 'P4', label: 'a spoke dropping one of its own assets',
    apply: (rows) => {
      const mine = spec.spoke(1).assets.quiz[0];
      rows[0]['Body HTML'] = rows[0]['Body HTML']
        .replace(new RegExp(`<li><a href="/pages/${mine}">[\\s\\S]*?</a></li>`), '');
    },
  },
  {
    rule: 'R3', label: 'an em-dash INSIDE the block this package adds, the authorship hole',
    //  authoredText() narrows rules 1, 2, 3 and 7 to the fenced region on an
    //  extended page. The risk of any narrowing is that it hides a real defect.
    //  This puts the defect where the package IS responsible and requires R3 to
    //  fire, so the narrowing cannot quietly become a blind spot.
    apply: (rows) => {
      const r = rows.find((x) => x.Handle === spec.umbrella().topics_hub);
      r['Body HTML'] = r['Body HTML'].replace('AP Cybersecurity practice:',
        `AP Cybersecurity practice ${EMDASH}`);
    },
  },
  {
    rule: 'P3', label: 'a unit study page that stops linking its practice spoke',
    apply: (rows) => {
      const r = rows.find((x) => x.Handle === spec.spoke(2).unit_study_page);
      r['Body HTML'] = r['Body HTML'].replace(/<a href="\/pages\/ap-cybersecurity-unit-2-practice">[\s\S]*?<\/a>/, '');
    },
  },
  {
    rule: 'R6', label: 'the course guide shipping one of its dead anchors again',
    apply: (rows) => {
      const r = rows.find((x) => x.Handle === spec.umbrella().course_guide);
      r['Body HTML'] = r['Body HTML'].replace('/pages/ap-cybersecurity-study-guide"',
        '/pages/ap-cybersecurity-study-guides"');
    },
  },
  {
    rule: 'P5', label: 'an update that changes the live body outside its own fence',
    apply: (rows) => {
      const r = rows.find((x) => x.Handle === spec.umbrella().handle);
      r['Body HTML'] = r['Body HTML'].replace('Existing content that must survive the edit.', 'Rewritten.');
    },
  },
];

const caughtBy = {};
let missed = 0;
for (const m of MUTATIONS) {
  const fresh = buildSheet(bodies);
  const rows = fresh.rows.map((r) => ({ ...r }));
  m.apply(rows);
  const csv = writeCsv(rows, HEADER);
  const report = validate(parseCsv(csv), {
    specs: fresh.specs,
    liveHandles: liveSet(),
    newHandles: fresh.newHandles,
  });
  const hit = (report.byRule[m.rule] || []).length > 0;
  const others = Object.entries(report.byRule)
    .filter(([id, list]) => id !== m.rule && list.length).map(([id]) => id);
  if (hit) {
    caughtBy[m.rule] = (caughtBy[m.rule] || 0) + 1;
    console.log(`  ${m.rule.padEnd(3)} ${m.label.padEnd(62)} caught by ${m.rule}`
      + (others.length ? `  (also ${others.join(', ')})` : ''));
  } else {
    missed += 1;
    console.log(`  ${m.rule.padEnd(3)} ${m.label.padEnd(62)} MISSED`
      + (others.length ? `  (only ${others.join(', ')} fired)` : '  (nothing fired)'));
  }
}

console.log();
const proven = Object.keys(caughtBy).sort();
ok(`every mutated rule went red independently: ${proven.map((r) => `${r} x${caughtBy[r]}`).join(', ')}`,
  missed === 0, `${missed} mutation(s) not caught by the rule that claims them`);

//  The regression that motivated the flatten fix. A stylesheet is not text a
//  student reads, and R2 must not report a gradient as an exam weighting.
const cssOnly = '<style>.h{background:linear-gradient(135deg,#2E1065 0%,#6B21A8 62%,#7C3AED 100%);font-weight:400}</style><div><p>Practice.</p></div>';
ok('R2 does not report a CSS gradient percentage as an exam weighting',
  base.ruleExamWeighting(cssOnly).length === 0, base.ruleExamWeighting(cssOnly).join(' | '));
const visible = '<div><p>This unit is worth about 20 to 25% of the exam.</p></div>';
ok('R2 still fires on a fabricated weighting in visible text, so the fix is not hollow',
  base.ruleExamWeighting(visible).length > 0);

fs.rmSync(bodies, { recursive: true, force: true });

console.log();
if (fails.length) {
  console.error(`FAILED (${fails.length})`);
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`OK - ${pass} checks, ${MUTATIONS.length} mutations, every one caught by the rule that claims it`);
