'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: AP Networking hands-on spec.
//
//  WHY THIS EXISTS: config/networking-hands-on.json is an authored document that
//  cites the course framework by code. Roughly 120 Essential Knowledge and
//  Learning Objective codes appear in it, and a citation is worth exactly
//  nothing if it points at a code that does not exist. A typo'd anchor reads
//  identically to a real one and would sit there being quoted at teachers.
//
//  The earlier EK extraction work went wrong three separate times and each time
//  the tell was a COUNT, not an eyeball. So this suite counts.
//
//  It also guards the two things most likely to drift after this pass:
//    - the manifest gate. NET_HANDS_ON_LIVE is false because a denominator for a
//      page nobody can open marks every student down for work that does not
//      exist. If someone flips it, the ids and points here must match the spec,
//      not approximately match it.
//    - the zero-PII split. Every activity declares whether it is graded by the
//      browser or by the teacher, and the teacher-scored ones must be reachable
//      by the score-entry route, which means they must be real manifest rows.
//
//  Run: npm run smoke:nethandson
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');

const spec = require(path.join(__dirname, '..', 'config', 'networking-hands-on.json'));
const skills = require(path.join(__dirname, '..', 'config', 'networking-framework-skills.json'));
const statements = require(path.join(__dirname, '..', 'config', 'networking-framework-statements.json'));
const seed = require(path.join(__dirname, '..', 'scripts', 'seed-manifest.js'));
const { canonicalActivity } = require(path.join(__dirname, '..', 'lib', 'gradebook-contract.js'));

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

const EK = statements.essential_knowledge;
const LO = statements.learning_objectives;
const SUBSKILLS = new Set(
  Object.values(skills.skills).flatMap((c) => Object.keys(c.subskills))
);

const activities = spec.configuration_activities;
const docs = spec.documentation_items;
const team = spec.collaboration;
const everything = [...activities, ...docs, team];

console.log('\n── The spec cites codes that exist ──────────────────────────────');

// Every EK anchor resolves. This is the check the whole file turns on.
const badEk = [];
for (const a of everything) {
  for (const code of a.ek_anchors || []) if (!EK[code]) badEk.push(a.item_id + ' -> ' + code);
}
ok('every ek_anchor resolves to a real Essential Knowledge statement', badEk.length === 0, badEk);

const badLo = [];
for (const a of everything) {
  for (const code of a.learning_objectives || []) if (!LO[code]) badLo.push(a.item_id + ' -> ' + code);
}
ok('every learning_objectives entry resolves', badLo.length === 0, badLo);

const badSub = [];
for (const a of everything) {
  for (const code of a.subskills || []) if (!SUBSKILLS.has(code)) badSub.push(a.item_id + ' -> ' + code);
}
ok('every subskill code resolves', badSub.length === 0, badSub);

// An anchor must belong to the topic it is cited under, or it is anchored to the
// wrong page. The team task spans two topics and declares them, so it is checked
// against that declared set rather than a single topic.
const strayed = [];
for (const a of activities) {
  for (const code of a.ek_anchors) if (!code.startsWith(a.topic + '.')) strayed.push(a.item_id + ' -> ' + code);
}
for (const code of team.ek_anchors) {
  if (!team.anchors_topics.some((t) => code.startsWith(t + '.'))) strayed.push('team -> ' + code);
}
ok('no anchor cites a statement from another topic', strayed.length === 0, strayed);

console.log('\n── The spec covers what the framework asks for ──────────────────');

// The 10 topics are not a hand-typed list: they are recomputed from the skills
// file the same way the readiness doc computed them, so narrowing or widening
// the framework data retires this list rather than leaving it stale.
const needHandsOn = Object.entries(skills.by_topic)
  .filter(([, subs]) => subs.some((c) => /\.[CD]$/.test(c)))
  .map(([t]) => t).sort();
const covered = activities.map((a) => a.topic).sort();
ok('one configuration activity per topic carrying .C or .D',
  JSON.stringify(needHandsOn) === JSON.stringify(covered), { needHandsOn, covered });

const needCollab = Object.entries(skills.by_topic)
  .filter(([, subs]) => subs.some((c) => c.startsWith('4.')))
  .map(([t]) => t).sort();
ok('the collaborative task covers every topic carrying skill category 4',
  JSON.stringify(needCollab) === JSON.stringify([...team.anchors_topics].sort()),
  { needCollab, declared: team.anchors_topics });

// Every configuration activity has to assess the verb it exists for. An activity
// on a .C/.D topic that only carries .A and .B sub-skills is a quiz wearing a
// lab's name, which is the exact failure this whole pass is about.
const weak = activities.filter((a) => !a.subskills.some((c) => /\.[CD]$/.test(c))).map((a) => a.item_id);
ok('every configuration activity carries an implement or verify sub-skill', weak.length === 0, weak);

const shortChecks = activities.filter((a) => a.auto_graded_checks.length !== 8)
  .map((a) => a.item_id + '=' + a.auto_graded_checks.length);
ok('every configuration activity has its 8 auto-graded checks', shortChecks.length === 0, shortChecks);

console.log('\n── The arithmetic in `design` is the arithmetic of the items ────');

const addedPoints =
  activities.reduce((n, a) => n + a.points, 0) +
  docs.reduce((n, d) => n + d.points, 0) +
  team.points;
ok('design.after.total_points equals before plus what the items add',
  spec.design.after.total_points === spec.design.before.total_points + addedPoints,
  { before: spec.design.before.total_points, added: addedPoints, after: spec.design.after.total_points });

const handsOn = spec.design.before.hands_on_points +
  activities.reduce((n, a) => n + a.points, 0) +
  docs.reduce((n, d) => n + d.points, 0);
ok('design.after.hands_on_points is the existing labs plus the new work',
  spec.design.after.hands_on_points === handsOn, { computed: handsOn, stated: spec.design.after.hands_on_points });

const share = (n) => Math.round((n / spec.design.after.total_points) * 1000) / 1000;
ok('the stated hands-on share matches the points',
  share(spec.design.after.hands_on_points) === spec.design.after.hands_on_share,
  { computed: share(spec.design.after.hands_on_points), stated: spec.design.after.hands_on_share });
ok('the stated collaborative share matches the points',
  share(spec.design.after.collaborative_points) === spec.design.after.collaborative_share,
  { computed: share(spec.design.after.collaborative_points), stated: spec.design.after.collaborative_share });

// The design rule is that the grade should be weighted like the framework's own
// verbs. This does not demand equality, which would be false precision; it
// demands the gap stays small enough that the claim is honest. Five points of
// share is the bar: past that, the doc is claiming an alignment it does not have.
const demandGap = Math.abs(spec.design.after.hands_on_share - spec.design.framework_demand.implement_and_verify_share_of_skill_assignments);
ok('hands-on weight lands within 5 points of the framework .C+.D share',
  demandGap <= 0.05, { gap: Math.round(demandGap * 1000) / 1000 });

console.log('\n── The manifest side matches the spec ──────────────────────────');

ok('NET_HANDS_ON_LIVE is still false (pages do not exist yet)', seed.NET_HANDS_ON_LIVE === false);

const rows = seed.buildRows().filter((r) => r.course === 'ap-networking');
const specIds = new Set(everything.map((a) => a.item_id));
const collide = rows.filter((r) => specIds.has(r.item_id)).map((r) => r.item_id);
ok('no seeded row already claims a hands-on item id', collide.length === 0, collide);

// The gate is only worth having if flipping it produces exactly the spec. Rather
// than trust the flag, rebuild the rows the flag would add and compare them to
// the authored file item by item.
const wouldAdd = [
  ...Object.entries(seed.NET_CONFIG_LABS).map(([lesson, points]) => ({
    item_id: `${lesson}-lab`, unit: `unit-${lesson.split('.')[0]}`, lesson_id: lesson, item_type: 'lab', points })),
  ...Object.entries(seed.NET_UNIT_DOCS).map(([itemId, cfg]) => ({
    item_id: itemId, unit: cfg.unit, lesson_id: itemId, item_type: 'project', points: cfg.points })),
  ...Object.entries(seed.NET_TEAM_PROJECT).map(([itemId, cfg]) => ({
    item_id: itemId, unit: cfg.unit, lesson_id: itemId, item_type: 'project', points: cfg.points })),
];

const key = (o) => [o.item_id, o.unit, o.lesson_id, o.item_type, o.points].join('|');
const fromSpec = everything.map((a) => key({
  item_id: a.item_id, unit: a.unit, lesson_id: a.lesson_id || a.topic, item_type: a.item_type, points: a.points }));
ok('flipping the flag would seed exactly the authored items',
  JSON.stringify([...fromSpec].sort()) === JSON.stringify(wouldAdd.map(key).sort()),
  { spec: [...fromSpec].sort(), manifest: wouldAdd.map(key).sort() });

// A teacher-scored item is only reachable through POST /api/teacher/.../scores
// if the route can resolve it, and that route rejects item_type 'visit' and
// anything absent from the manifest. Both halves have to hold.
const teacherScored = everything.filter((a) => a.scored_by === 'teacher');
ok('every teacher-scored item is a project, never a visit',
  teacherScored.every((a) => a.item_type === 'project'), teacherScored.map((a) => a.item_id + '=' + a.item_type));
ok('the teacher-scored set is the 4 unit records plus the team task',
  teacherScored.length === 5, teacherScored.map((a) => a.item_id));

console.log('\n── The canonical vocabulary knows these types ───────────────────');

for (const t of ['lab', 'project']) {
  const c = canonicalActivity(t);
  ok(`'${t}' maps deliberately, not through the practice default`, c.mapped === true && c.activity === t, c);
}

// A lab on a topic must not land in the same gradebook cell as that topic's
// quiz. The cell key is unit|lesson_id|item_type, so the item_type is the only
// thing separating them, and that is worth asserting rather than assuming.
const cells = new Set();
let cellClash = null;
for (const r of [...rows, ...wouldAdd.map((w) => ({ ...w, course: 'ap-networking' }))]) {
  const k = `${r.unit}|${r.lesson_id}|${r.item_type}`;
  if (cells.has(k)) cellClash = k;
  cells.add(k);
}
ok('no two networking items would share a gradebook cell', cellClash === null, cellClash);

console.log('\n── The framework data it is built on is intact ──────────────────');

ok('284 Essential Knowledge statements', Object.keys(EK).length === 284);
ok('60 Learning Objectives', Object.keys(LO).length === 60);

// The 6 objectives repaired on 2026-08-19 kept the PDF's shadow text layer and
// read as the objective repeated two or three times. Nothing should say the same
// sentence twice, so this catches the defect class rather than those six codes.
const repeated = Object.entries(LO).filter(([, t]) => {
  const sents = t.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean);
  return sents.length !== new Set(sents).size;
}).map(([c]) => c);
ok('no learning objective repeats itself (PDF shadow text layer)', repeated.length === 0, repeated);

console.log('\n──────────────────────────────────────────');
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
