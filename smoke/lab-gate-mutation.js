#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY for the lab availability gate. Break each rule on purpose,
//  one at a time, and require smoke/lab-gate.js to go red FOR THAT RULE.
//  A green mutation run is a FAILED check, and here that is the exit code.
//
//  The first two are the defect a teacher actually reported: the route served
//  every lab without consulting the gate, and the gradebook then called the
//  resulting lock unenforceable. Both are now mutations rather than stories.
//
//  Run: npm run smoke:labgatemutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'lab-gate.js');
const FILES = {
  route: path.join(ROOT, 'routes', 'labs.js'),
  contract: path.join(ROOT, 'lib', 'gradebook-contract.js'),
  gatelib: path.join(ROOT, 'lib', 'activity-gate.js'),
  player: path.join(ROOT, 'public', 'lab-player.js'),
  labspec: path.join(ROOT, 'lib', 'lab-spec.js'),
  page: path.join(ROOT, 'shopify', 'my-progress.html'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
const restore = () => { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); };
process.on('SIGINT', () => { restore(); process.exit(130); });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('    ok    ' + n); }
  else { fail++; console.log('    FAIL  ' + n + (x !== undefined ? '\n            ' + JSON.stringify(x, null, 2).slice(0, 700) : '')); }
};
function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|  "|$)/gm)].map((m) => m[1].trim()), out };
}

const REDERIVE_SUITE = path.join(__dirname, 'anon-gate-rederive.js');
function runRederiveSuite() {
  const r = spawnSync(process.execPath, [REDERIVE_SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|$)/gm)].map((m) => m[1].trim()), out };
}

const PLAYER_SUITE = path.join(__dirname, 'lab-player-token.js');
function runPlayerSuite() {
  const r = spawnSync(process.execPath, [PLAYER_SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|$)/gm)].map((m) => m[1].trim()), out };
}

const PAGE_SUITE = path.join(__dirname, 'my-progress-page.js');
function runPageSuite() {
  const r = spawnSync(process.execPath, [PAGE_SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|  "|$)/gm)].map((m) => m[1].trim()), out };
}

const MUTATIONS = [
  {
    //  THE ONE THAT MADE EVERY OTHER FIX MOOT. The route and the gradebook were
    //  both correct and a closed lab still opened, because the player asked for
    //  the spec anonymously.
    name: 'THE ROOT CAUSE: the player stops sending its token when asking for a lab',
    file: 'player',
    suite: 'player',
    find: '      token ? { headers: { Authorization: "Bearer " + token } } : undefined)',
    repl: '      undefined)',
    must: ['and carried Authorization'],
  },
  {
    //  The tie-break, which a generated rederive found and no fixture had. Drop
    //  the closing-row preference and the winner is decided by whichever alias
    //  LAB_ALIASES happens to return first, so a teacher closing the Lab column
    //  while a stale terminal-lab row sits open watches their click do nothing.
    name: 'a same-scope tie goes to the OPEN row again, so a stale alias row beats a fresh close',
    file: 'gatelib',
    suite: 'rederive',
    find: '      if (rank < bestRank || (rank === bestRank && closes && !bestCloses)) {',
    repl: '      if (rank < bestRank) {',
    must: ['the two implementations agree on every case'],
  },
  {
    //  THE BYPASS. Restore the old "no token means self-study" and a student
    //  who signs out walks past every lock on the site.
    name: 'THE BYPASS: anonymous goes back to being automatically self-study',
    file: 'route',
    suite: 'gate',
    find: "  if (!stu) {\n    if (!unitAny || !lessonAny) return { open: true, reason: 'unlocatable-spec' };",
    repl: "  if (!stu) {\n    return { open: true, reason: 'self-study' };\n    // eslint-disable-next-line no-unreachable\n    if (!unitAny || !lessonAny) return { open: true, reason: 'unlocatable-spec' };",
    must: ['signing out no longer opens a closed lab'],
  },
  {
    //  THE OTHER HALF, and the one a careless fix breaks. Refusing anonymous
    //  outright closes the bypass AND takes the public practice layer offline,
    //  which is the trade Tanner explicitly did not choose. A suite that only
    //  asserts "anonymous is refused" goes green on this.
    name: 'anonymous is refused EVERY lab, taking the public practice layer offline',
    file: 'gatelib',
    suite: 'gate',
    find: '  return { locked: false, reason: null, scope: null };',
    repl: "  return { locked: true, reason: 'closed-for-activity', scope: 'activity' };",
    must: ['a lab nobody closed is still open signed out'],
  },
  {
    //  The per-class resolution is what stops one class's closing UNIT row from
    //  withholding a lab that same class reopened at lesson scope. Scanning for
    //  any open=0 row instead would refuse the public a lab nobody closed.
    name: 'the anonymous rule trusts any closing row instead of resolving per class',
    file: 'gatelib',
    suite: 'gate',
    find: '      const row = pickGateRow(classRows, lesson, act);',
    repl: '      const row = classRows.find((r) => r.open === 0 || r.open === false) || null;',
    must: ['and anonymous resolves those two rows too, rather than seeing one close'],
  },
  {
    //  A stale player cannot send a token, and a gate that never sees one stands
    //  down. An edge cache is therefore part of the enforcement path.
    name: 'the player gets a cacheable lifetime again, so an edge can outlive a lock',
    file: 'route',
    suite: 'player',
    find: "  res.set('Cache-Control', 'no-store');\n  res.type('application/javascript');",
    repl: "  res.set('Cache-Control', 'public, max-age=3600');\n  res.type('application/javascript');",
    must: ['the player is served no-store'],
  },
  {
    //  The mutation that matters most, because it is the fix I nearly shipped.
    //  'max-age=0, must-revalidate' LOOKS like the careful answer and is not:
    //  measured live, this origin asked for 3600 and the client received 14400,
    //  because the CDN raises any short max-age on a cacheable asset to its own
    //  four hour browser TTL. So a guard that accepts any small lifetime would
    //  have passed while the lock stayed broken. It has to demand no-store.
    name: 'the player asks for must-revalidate, which the CDN inflates to four hours anyway',
    file: 'route',
    suite: 'player',
    find: "  res.set('Cache-Control', 'no-store');\n  res.type('application/javascript');",
    repl: "  res.set('Cache-Control', 'public, max-age=0, must-revalidate');\n  res.type('application/javascript');",
    must: ['the player is served no-store'],
  },
  {
    //  Same bug one hop out: a shared cache keeping a credential-varying spec.
    name: 'the spec endpoint goes back to public, max-age=300 on the open branch',
    file: 'route',
    suite: 'player',
    find: "  res.set('Cache-Control', 'no-store');\n  res.append('Vary', 'Authorization');",
    repl: "  res.append('Vary', 'Authorization');",
    must: ['the spec route sets no-store'],
  },
  {
    //  Vary is the header that tells a cache the answer depends on the token.
    name: 'the spec endpoint stops declaring that it varies by credential',
    file: 'route',
    suite: 'player',
    find: "  res.append('Vary', 'Authorization');",
    repl: '',
    must: ['it sets Vary: Authorization'],
  },
  {
    //  The subtle half. Marking ONLY the locked answer no-store leaves the open
    //  spec cacheable, which is the entire leak: the cache never holds a lock,
    //  it holds the thing the lock was meant to withhold.
    name: 'only the LOCKED branch is no-store, so the open spec stays cacheable',
    file: 'route',
    suite: 'player',
    find: "  res.set('Cache-Control', 'no-store');\n  res.append('Vary', 'Authorization');\n  if (!gate.open) {\n    return res.json({",
    repl: "  res.append('Vary', 'Authorization');\n  if (!gate.open) {\n    res.set('Cache-Control', 'no-store');\n    return res.json({",
    must: ['and sets it BEFORE the locked branch, so it covers both answers'],
  },
  {
    name: 'the player sends a token even when signed out, killing teacher preview',
    file: 'player',
    suite: 'player',
    find: '    try { token = conf.getToken() || ""; } catch (e) { token = ""; }',
    repl: '    try { token = conf.getToken() || "anon"; } catch (e) { token = "anon"; }',
    must: ['with no Authorization header at all'],
  },
  {
    name: 'a locked lab is reported to the student as broken rather than closed',
    file: 'player',
    suite: 'player',
    find: '        if (spec && spec.locked) {',
    repl: '        if (false) {',
    must: ['it says the teacher has not opened it'],
  },
  {
    //  A teacher closes the Lab column; the spec calls itself terminal-lab.
    //  The list moved to lib/lab-spec.js on 2026-09-09 so the gradebook could
    //  read the same one. Same mutation, new home, and it now has to break the
    //  BOARD as well as the route, because both read this list.
    name: 'THE NAME MISMATCH: only the spec\'s own activity type is resolved',
    file: 'labspec',
    find: "  return own === 'lab' ? ['lab'] : [own, 'lab'];",
    repl: "  return [own];",
    must: ['closing the "lab" column closes a terminal-lab spec'],
  },
  {
    //  Reported 2026-09-09: a lab shut for the student while the teacher's own
    //  board drew that column open, so the teacher was right to say they had
    //  locked nothing. The route walks every alias; this file walked one.
    name: 'THE BOARD DISAGREES: the gradebook resolves one name while the student path resolves two',
    file: 'contract',
    find: "    const names = aliasIndex.get(`${it.unit}|${it.lesson_ref}|${it.native_activity}`)\n      || [it.native_activity];",
    repl: '    const names = [it.native_activity];',
    must: ['and the Lab column the teacher reads reports locked, not open'],
  },
  {
    //  Flatten the alias GROUP to its first name and enforceability goes back to
    //  covering 'terminal-lab' only, so the Lab column a teacher clicks is drawn
    //  as decoration: "students can still reach them". A teacher told that
    //  clicks the padlock freely, which is how a lab gets closed by a class that
    //  believes it locked nothing.
    name: 'enforceability covers only the spec name again, so the Lab padlock reads as decorative',
    file: 'contract',
    find: '    for (const act of g.names) {',
    repl: '    for (const act of g.names.slice(0, 1)) {',
    must: ['the Lab column reports the lock as enforceable'],
  },
  {
    //  Two columns on one lesson both labelled "1.2 Lab". A teacher cannot ask
    //  about, or act on, a column they cannot name apart from its twin.
    name: 'both lab columns render the same label again',
    file: 'contract',
    find: "const NATIVE_LABEL = { 'terminal-lab': 'Terminal Lab' };",
    repl: 'const NATIVE_LABEL = {};',
    must: ['and they no longer render the same label'],
  },
  {
    //  The refusal that names the wrong person. Anonymous is refused whenever
    //  ANY class has closed the lab, so a student of an OPEN class who is signed
    //  out reads that their teacher closed it, and takes that to their teacher.
    name: 'every refusal claims to be the caller\'s own class again',
    file: 'route',
    find: "      locked_for: gate.audience || 'class',",
    repl: "      locked_for: 'class',",
    must: ['a signed-out visitor is told it is the anonymous rule'],
  },
  {
    //  Same wrong sentence, one layer out: the player ignores who locked it.
    name: 'the player tells every locked visitor their teacher closed it',
    file: 'player',
    suite: 'player',
    find: '          var forWho = spec.locked_for || "class";',
    repl: '          var forWho = "class";',
    must: ['it does NOT say a teacher has not opened it'],
  },
  {
    //  The student dashboard drops lab work. The score arrives, the unit
    //  percentage counts it, and the lesson row has no column to draw it in.
    name: 'the student page drops the lab columns again',
    file: 'page',
    suite: 'page',
    find: 'const cols=ACTS.concat(LAB_ACTS.filter(a=>lessons.some(l=>U.lessons[l].acts[a])));',
    repl: 'const cols=ACTS;',
    must: ['the unit with lab work renders a Terminal Lab column'],
  },
  {
    //  The other direction: two more fixed columns on every table in every
    //  course, including the ones with no labs at all.
    name: 'the lab columns become unconditional, so every course grows two empty columns',
    file: 'page',
    suite: 'page',
    find: 'const cols=ACTS.concat(LAB_ACTS.filter(a=>lessons.some(l=>U.lessons[l].acts[a])));',
    repl: 'const cols=ACTS.concat(LAB_ACTS);',
    must: ['a unit with no lab work gets no lab column'],
  },
  {
    name: 'the widest answer wins instead of the narrowest, so a unit close outranks an explicit open',
    //  The ladder moved into lib/activity-gate.js on 2026-09-07 so routes/
    //  analysis.js could run the same one. Same mutation, new home.
    file: 'gatelib',
    find: '    if (!best || rankOf(g) < rankOf(best) || (rankOf(g) === rankOf(best) && !g.open && best.open)) best = g;',
    repl: '    if (!best || rankOf(g) > rankOf(best)) best = g;',
    must: ['reopening the Lab column inside a closed unit reopens the lab'],
  },
  {
    name: 'THE REPORTED BUG: the route serves every lab without consulting the gate',
    file: 'route',
    find: '  const gate = labGate(req, spec);',
    repl: '  const gate = { open: true, reason: "mutated" };',
    must: ['the signed-in student is refused'],
  },
  {
    name: 'THE OTHER HALF: the gradebook calls a lab lock unenforceable again',
    file: 'contract',
    find: '    if (l.course === course) bankKeys.add(`${l.unit}|${l.lesson}|${l.activity_type}`);',
    repl: '    if (false) bankKeys.add(`${l.unit}|${l.lesson}|${l.activity_type}`);',
    must: ['and it reports the lock as ENFORCEABLE, which is the half that was lying'],
  },
  {
    name: 'the spec is put on the wire beside the locked flag',
    file: 'route',
    find: '      lab: null,\n    });',
    repl: '      lab: null, brief: spec.brief, steps: spec.steps,\n    });',
    must: ['and the spec is NOT on the wire'],
  },
  {
    //  Anonymous is now refused a CLOSED lab, deliberately. What must still be
    //  true is that it gets an OPEN one, so this mutation refuses everything and
    //  the suite has to notice the public practice layer going dark.
    name: 'the token stops being optional, so teacher preview and public practice die',
    file: 'route',
    find: "    return { open: true, reason: 'self-study' };\n  }\n  const cls = labClassStmt.get(stu.class_id);",
    repl: "    return { open: false, reason: 'no-token' };\n  }\n  const cls = labClassStmt.get(stu.class_id);",
    must: ['but a lab NO class has closed is still served anonymously'],
  },
  {
    name: 'the gate reaches across courses, locking a class that never closed anything',
    file: 'route',
    find: '  if (!cls || cls.course !== spec.course) return { open: true, reason: \'self-study\' };',
    repl: '  if (!cls) return { open: true, reason: \'self-study\' };',
    must: ['a student in another course is unaffected'],
  },
  {
    name: 'only the exact activity scope is read, so a unit-wide close misses the lab',
    file: 'route',
    find: "  'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ?'",
    repl: "  'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ? AND lesson != \\'*\\''",
    must: ['a UNIT-scope close reaches the lab'],
  },
  {
    name: 'a closed lab 404s, so a student cannot tell shut from missing',
    file: 'route',
    find: '    return res.json({\n      course: req.params.course, item_id: req.params.item_id,',
    repl: '    return res.status(404).json({\n      course: req.params.course, item_id: req.params.item_id,',
    must: ['it is a 200, so the player can say "not opened yet" rather than "missing"'],
  },
];

console.log('\n  BASELINE (unmutated)');
const base = runSuite();
ok('the suite is green before anything is mutated', base.code === 0, { code: base.code, failed: base.failed.slice(0, 4) });
if (base.code !== 0) { console.log(base.out.slice(-1800)); process.exit(1); }
const basePlayer = runPlayerSuite();
ok('the player suite is green before anything is mutated', basePlayer.code === 0, basePlayer.failed.slice(0, 3));
const basePage = runPageSuite();
ok('the student page suite is green before anything is mutated', basePage.code === 0, basePage.failed.slice(0, 3));
//  The rederive suite prints only FAILURES, so its assertion names never appear
//  in a green run and the startsWith scan below cannot see them. Listed here
//  rather than parsed, and the mutation itself still proves the assertion fires.
const REDERIVE_NAMES = ['the two implementations agree on every case'];
const names = [...base.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim())
  .concat([...basePlayer.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim()))
  .concat([...basePage.out.matchAll(/^\s*\[PASS\] (.+?)(?:  \{|$)/gm)].map((m) => m[1].trim()))
  .concat(REDERIVE_NAMES);
for (const m of MUTATIONS) for (const w of m.must) {
  ok(`the suite has an assertion starting "${w.slice(0, 46)}"`, names.some((n) => n.startsWith(w)));
}

try {
  for (const m of MUTATIONS) {
    console.log(`\n  MUTATION: ${m.name}`);
    const src = ORIGINAL[m.file];
    const hits = src.split(m.find).length - 1;
    ok('  the patch target is present exactly once', hits === 1, { file: m.file, hits });
    if (hits !== 1) continue;
    fs.writeFileSync(FILES[m.file], src.replace(m.find, m.repl));
    const r = m.suite === 'player' ? runPlayerSuite()
      : m.suite === 'rederive' ? runRederiveSuite()
        : m.suite === 'page' ? runPageSuite()
          : runSuite();
    restore();
    ok('  the suite goes RED', r.code !== 0, { code: r.code, failed: r.failed });
    ok('  it failed an assertion rather than crashing', r.failed.length > 0, { tail: r.out.slice(-260) });
    for (const w of m.must) {
      ok(`  it breaks "${w.slice(0, 46)}"`, r.failed.some((f) => f.startsWith(w)), { expected: w, actually_failed: r.failed });
    }
  }
} finally { restore(); }

let clean = true;
for (const [k, p] of Object.entries(FILES)) if (fs.readFileSync(p, 'utf8') !== ORIGINAL[k]) clean = false;
ok('every mutated file is byte-identical to how it started', clean);
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
