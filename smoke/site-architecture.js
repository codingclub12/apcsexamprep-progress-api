'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  OFFLINE suite for lib/site-architecture.js and config/site-architecture.json.
//  No network.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK. Each source mutation below breaks ONE
//  rule and requires the assertion for THAT rule to fail. A mutation that goes
//  red somewhere else is telling you the rule you meant to test is hollow, which
//  is how two guards here were found hollow on 2026-09-02 and a third the day
//  after.
//
//  THE FILE IS RE-DERIVED, NOT TRUSTED. Section 3 takes the handles out of the
//  committed config, runs them back through the module, and demands the same
//  answer. That is what makes a hand edit visible with no network: the stored
//  conclusion has to follow from the stored input.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'lib', 'site-architecture.js');
const CONFIG = path.join(__dirname, '..', 'config', 'site-architecture.json');
const source = fs.readFileSync(SRC, 'utf8');
const A = require(SRC);

let pass = 0; const fails = [];
const ok = (name, cond, detail) => { if (cond) pass++; else fails.push(`${name}: ${detail || 'failed'}`); };

//  A miniature site carrying the shapes that actually exist, including three of
//  the five naming irregularities the real site has.
const FIXTURE = [
  'ap-csa-unit-4-course',                       // hub, suffixed
  'ap-csa-lesson-4-4-traversing-arrays',        // spoke under a numbered stem
  'ap-csa-lesson-4-4-traversing-arrays-frq',
  'ap-csa-lesson-4-4-traversing-arrays-debug',
  'ap-csa-frq-2004',                            // hub by anagram
  'ap-csa-2004-frq-1',                          // member, reversed token order
  'ap-csa-array-mastery-interactive-practice',  // the board 352 orphan
  'contact',                                    // site furniture
  'data-sharing-opt-out',                       // site furniture
];

// ── 1. CLASSIFICATION ──────────────────────────────────────────────────────
const a = A.classify(FIXTURE);
const rec = (h) => a.pages.find((p) => p.handle === h);

ok('every handle gets a record', a.pages.length === FIXTURE.length,
  `${a.pages.length} records for ${FIXTURE.length} handles`);
ok('site furniture is scope site', rec('contact').scope === A.SCOPE_SITE,
  `contact scope is ${rec('contact').scope}`);
ok('site furniture is never parentless', !a.parentless.includes('contact'),
  'contact was reported as needing a parent');
ok('a hub is not parentless', !a.parentless.includes('ap-csa-unit-4-course'),
  'the unit hub was reported as needing a parent');
ok('a hub is marked as one', rec('ap-csa-unit-4-course').is_hub === true,
  'is_hub not set on the unit hub');
//  An activity's parent is its LESSON, not the unit hub. familyOf stems on the
//  numbered part, so ap-csa-lesson-4-4-* is one family and the lesson page is
//  the hub of it. That is the fifth naming irregularity CLAUDE.md lists, a hub
//  that is a member of its own family, and the first draft of this test
//  asserted the unit hub and was wrong about the site rather than about the code.
ok('a lesson activity gets its lesson page',
  rec('ap-csa-lesson-4-4-traversing-arrays-frq').parent === 'ap-csa-lesson-4-4-traversing-arrays',
  `got ${rec('ap-csa-lesson-4-4-traversing-arrays-frq').parent}`);
ok('the lesson page is the hub of its own family',
  rec('ap-csa-lesson-4-4-traversing-arrays').is_hub === true,
  'the lesson page is not marked as its family hub');
ok('reversed token order still finds the hub',
  rec('ap-csa-2004-frq-1').parent === 'ap-csa-frq-2004',
  `got ${rec('ap-csa-2004-frq-1').parent}`);
ok('THE BOARD 352 CASE is parentless',
  a.parentless.includes('ap-csa-array-mastery-interactive-practice'),
  'the page this whole task exists for was not flagged');
ok('roles come through', rec('ap-csa-lesson-4-4-traversing-arrays').role === 'lesson',
  `role is ${rec('ap-csa-lesson-4-4-traversing-arrays').role}`);
ok('counts add up',
  a.counts.site + a.counts.hubs + a.counts.parented + a.counts.parentless === a.counts.total,
  JSON.stringify(a.counts));
ok('output is deterministic',
  JSON.stringify(A.classify([...FIXTURE].reverse())) === JSON.stringify(a),
  'reordering the input changed the output');
try { A.classify([]); ok('empty input refused', false, 'built from nothing'); }
catch (e) { ok('empty input refused', /non-empty/.test(e.message), e.message); }

// ── 2. THE RATCHET ─────────────────────────────────────────────────────────
ok('a new parentless page is a regression',
  A.regressions(['a', 'b'], ['a']).join() === 'b', 'regressions missed the new handle');
ok('a known parentless page is not a regression',
  A.regressions(['a'], ['a', 'b']).length === 0, 'a baselined handle was reported');
ok('a fixed page is reported so the baseline shrinks',
  A.fixed(['a'], ['a', 'b']).join() === 'b', 'fixed did not name the handle that left');
ok('an empty baseline makes every parentless page a regression',
  A.regressions(['a', 'b'], []).length === 2, 'regressions swallowed an empty baseline');

// ── 3. THE COMMITTED FILE IS RE-DERIVED ────────────────────────────────────
const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
ok('config carries pages', Array.isArray(cfg.pages) && cfg.pages.length > 500,
  `${cfg.pages && cfg.pages.length} pages`);
const redriven = A.classify(cfg.pages.map((p) => p.handle));
ok('RE-DERIVED: stored pages follow from stored handles',
  JSON.stringify(redriven.pages) === JSON.stringify(cfg.pages),
  'the committed records do not match what the module derives from the committed handles');
ok('RE-DERIVED: stored parentless list follows too',
  JSON.stringify(redriven.parentless) === JSON.stringify(cfg.parentless),
  'the committed parentless list is not what the module derives');
ok('RE-DERIVED: stored counts follow too',
  JSON.stringify(redriven.counts) === JSON.stringify(cfg.counts),
  'the committed counts are not what the module derives');
ok('config has no timestamp', !('generated_at' in cfg),
  'a timestamp makes every rebuild a diff and trains everyone to ignore the diff');
ok('config lives outside data/', !CONFIG.includes(`${path.sep}data${path.sep}`),
  'the Railway volume mounts at /app/data and would hide this file from the container');

// ── 4. SOURCE MUTATIONS. Each must break its own rule and no other. ────────
const mutants = [];
function loadMutant(find, replace) {
  if (!source.includes(find)) throw new Error(`mutation anchor absent: ${find.slice(0, 60)}`);
  //  Beside the original, because the module resolves ./link-graph relative to
  //  itself. A temp dir fails every case with module-not-found, which reads
  //  exactly like a suite of hollow guards.
  const f = path.join(path.dirname(SRC), `.mutant-${mutants.length}-${process.pid}.js`);
  fs.writeFileSync(f, source.replace(find, replace));
  mutants.push(f);
  return require(f);
}
process.on('exit', () => { for (const f of mutants) { try { fs.unlinkSync(f); } catch (e) { /* gone */ } } });

const cases = [
  ['site furniture must not need a parent',
    "return { handle, course, role, scope: SCOPE_SITE, family: null, parent: null };",
    "return { handle, course, role, scope: SCOPE_COURSE, family: null, parent: null };",
    (m) => m.classify(FIXTURE).parentless.includes('contact')],
  ['a hub must not be parentless',
    '.filter((p) => p.scope === SCOPE_COURSE && !p.is_hub && !p.parent)',
    '.filter((p) => p.scope === SCOPE_COURSE && !p.parent)',
    (m) => m.classify(FIXTURE).parentless.includes('ap-csa-unit-4-course')],
  ['a spoke must resolve to its hub',
    'parent: isHub ? null : hub,',
    'parent: null,',
    (m) => m.classify(FIXTURE).pages.find((p) => p.handle === 'ap-csa-2004-frq-1').parent !== 'ap-csa-frq-2004'],
  ['the ratchet must not swallow a new handle',
    'return (current || []).filter((h) => !known.has(h));',
    'return [];',
    (m) => m.regressions(['a', 'b'], ['a']).length === 0],
  //  NOT a mutation of the node's `role` field. That was tried and came back
  //  GREEN: resolveClusters passes role through to its report and never reads
  //  it for clustering, and classify computes role itself from G.roleOf. So the
  //  assertion was hollow and is replaced rather than kept, which is the whole
  //  point of running mutations against your own suite.
  ['clustering must see the page path',
    "path: '/pages/' + h,",
    "path: '/other/' + h,",
    (m) => JSON.stringify(m.classify(cfg.pages.map((p) => p.handle)).parentless) !== JSON.stringify(cfg.parentless)],
];
for (const [name, find, repl, brokeIt] of cases) {
  let m;
  try { m = loadMutant(find, repl); }
  catch (e) { ok(`mutation: ${name}`, false, `could not build mutant: ${e.message}`); continue; }
  let broke = false;
  try { broke = brokeIt(m); } catch (e) { broke = true; }
  ok(`mutation: ${name}`, broke, 'MUTANT BEHAVED IDENTICALLY, so this rule is hollow');
}

console.log(`\nsite-architecture: ${pass} passed, ${fails.length} failed`);
if (fails.length) { fails.forEach((f) => console.error('  FAIL ' + f)); process.exit(1); }
