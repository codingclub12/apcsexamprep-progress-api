'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: no lesson uses a construct before the lesson that teaches it.
//
//  ── WHY ─────────────────────────────────────────────────────────────────────
//  Lesson 1.6 is the last lesson of Unit 1. Its final step handed the student:
//
//      public void act()
//      {
//          move(2);
//          if (isAtEdge())
//          {
//              turn(180);
//          }
//      }
//
//  `if` is taught in 2.4. So the closing step of the unit whose whole scope is
//  "click things and add one line" quietly required a control structure from
//  three lessons later, with no explanation, in a course written for people who
//  have never programmed.
//
//  Nothing catches that. It compiles, it runs, it is correct Java, every other
//  check is green, and the only symptom is a beginner who feels stupid. That is
//  the failure mode this file exists for: the course is sequenced, and sequencing
//  is an invariant nobody can hold in their head across 42 lessons.
//
//  ── HOW IT READS ────────────────────────────────────────────────────────────
//  TEACHES maps a construct to the lesson that introduces it. Every lesson's
//  code is scanned; using a construct earlier than its teaching lesson is a
//  failure naming both lessons.
//
//  ── THE RULE IS DISCLOSURE, NOT ABSTINENCE ──────────────────────────────────
//  The first version of this file simply banned forward references. That was
//  wrong, and lesson 1.6 is why. Its note already says:
//
//      "You have not formally met `if` yet, that is Unit 2. Read it as plain
//       English for now: IF the thing in the parentheses is true, do what is in
//       the braces."
//
//  That is not a leak, it is a preview handled properly, and the quiz and the
//  gap exercise are built on it. Banning it would have meant rewriting a lesson
//  and its assessments to satisfy a checker.
//
//  So the invariant is the one that actually describes the student's experience:
//  a lesson MAY reach ahead, and when it does it must SAY SO in the step notes.
//  An undisclosed forward reference is a beginner being handed syntax nobody
//  told them they had not learned yet. A disclosed one is teaching.
//
//  ALLOW is the narrow second door, for code the student reads rather than
//  writes. Each entry needs a reason.
//
//  Run: npm run smoke:order
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const { BANKS } = require('../seed/intro-java-banks');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// Lesson order, taken from the banks rather than retyped, so adding a lesson
// cannot leave this file describing a course that no longer exists.
const ORDER = [];
const LESSON = new Map();
for (const b of BANKS) {
  for (const l of b.lessons) { ORDER.push(l.lesson); LESSON.set(l.lesson, l); }
}
const idx = (id) => ORDER.indexOf(id);

// Construct -> the lesson that introduces it. Ordered roughly by when they land.
const TEACHES = [
  { what: 'a local variable', at: '2.1', re: /\b(?:int|double|boolean|String)\s+[a-z]\w*\s*=/ },
  { what: 'an arithmetic operator', at: '2.2', re: /[a-z0-9_)]\s*[*/%]\s*[a-z0-9_(]|\+\+|--|[-+*/%]=/ },
  { what: 'a comparison', at: '2.3', re: /[!=<>]=|(?:^|[^<>=!])[<>](?!--)/m },
  { what: 'a boolean operator', at: '2.3', re: /&&|\|\||![a-zA-Z(]/ },
  { what: 'an if statement', at: '2.4', re: /\bif\s*\(/ },
  { what: 'an else branch', at: '2.4', re: /\belse\b/ },
  { what: 'getRandomNumber', at: '2.6', re: /getRandomNumber/ },
  { what: 'keyboard input', at: '2.7', re: /isKeyDown/ },
  { what: 'a method you write yourself', at: '3.1', re: /\b(?:public|private)\s+(?:void|int|boolean|double|String)\s+(?!act\b)[a-z]\w*\s*\(/ },
  { what: 'a return statement', at: '3.4', re: /\breturn\b/ },
  { what: 'a World subclass', at: '3.5', re: /extends\s+World/ },
  { what: 'addObject', at: '3.7', re: /addObject/ },
  { what: 'an instance variable', at: '3.8', re: /\bprivate\s+(?:int|double|boolean|String)\s+\w+/ },
  { what: 'a while loop', at: '4.1', re: /\bwhile\s*\(/ },
  { what: 'a for loop', at: '4.2', re: /\bfor\s*\(/ },
  { what: 'touching another actor', at: '4.4', re: /isTouching|removeTouching|getOneIntersecting/ },
  { what: 'a List of actors', at: '4.5', re: /\bList\s*<|getObjects\s*\(/ },
  { what: 'an array', at: '5.1', re: /\[\s*\]/ },
];

// Deliberate previews. Each needs a reason; a bare entry is an unfixed bug.
const ALLOW = [
  {
    lesson: '1.5', what: 'a comparison',
    why: 'The step shows the signature `void move(int distance)`. The angle bracket '
      + 'match is documentation, not a comparison in student code.',
  },
  {
    lesson: '2.1', what: 'a comparison',
    why: 'Type declarations in the vocabulary table, not comparisons.',
  },
  {
    lesson: '2.2', what: 'a comparison',
    why: 'Lesson 2.2 IS the operators lesson; comparisons land one lesson later '
      + 'and the two are taught back to back on purpose.',
  },
  {
    lesson: '1.1', what: 'a World subclass',
    why: 'Lesson 1.1 is called Scenarios, Worlds and Actors. Showing a class that '
      + 'extends World is the subject of the lesson, not a forward reference; the '
      + 'student reads it and writes nothing.',
  },
  {
    lesson: '3.1', what: 'addObject',
    why: 'The long act() method in 3.1 is deliberately overgrown, and exists to be '
      + 'refactored in 3.2. Every line is scaffolding the student reads.',
  },
  {
    lesson: '3.1', what: 'touching another actor',
    why: 'Same overgrown act() method. Read, not written.',
  },
  {
    lesson: '3.7', what: 'touching another actor',
    why: 'One labelled aside contrasting removeObject with removeTouching, marked '
      + '"from inside an actor" in the code itself. A signpost, not a skill the '
      + 'step asks for.',
  },
];

// Phrases that count as telling the student. Deliberately narrow: a lesson has
// to actually name the gap, not merely mention a unit number in passing.
const DISCLOSES = /not (?:formally )?met|you have not|that is Unit \d|comes in Unit \d|Unit \d covers|meet (?:it|them|this) (?:properly )?in \d|for now[,:]? |read it as/i;

const allowed = (lesson, what) => ALLOW.some((a) => a.lesson === lesson && a.what === what);

(function run() {
  section('1. The course is in order');

  ok('1.1 every teaching lesson named actually exists',
    TEACHES.every((t) => LESSON.has(t.at)),
    TEACHES.filter((t) => !LESSON.has(t.at)).map((t) => t.at));
  ok('1.2 the course was walked, not one unit', ORDER.length > 40, ORDER.length);

  const leaks = [];
  const disclosed = [];
  for (const id of ORDER) {
    const l = LESSON.get(id);
    const code = (l.steps || []).map((s) => s.code || '').join('\n');
    if (!code.trim()) continue;
    for (const t of TEACHES) {
      if (idx(id) >= idx(t.at)) continue;      // at or after the teaching lesson
      if (!t.re.test(code)) continue;
      if (allowed(id, t.what)) continue;
      // Disclosed in the lesson's own notes? Then it is a preview, not a leak.
      const notes = (l.steps || []).map((st) => st.note || '').join('\n');
      if (DISCLOSES.test(notes)) { disclosed.push({ lesson: id, uses: t.what }); continue; }
      const line = code.split('\n').find((x) => t.re.test(x)) || '';
      leaks.push({ lesson: id, uses: t.what, taughtIn: t.at, line: line.trim().slice(0, 60) });
    }
  }

  ok('1.3 every forward reference is disclosed to the student',
    leaks.length === 0, leaks);
  // Not a failure. Printed because a growing list means the sequence is drifting
  // even while every individual lesson is behaving.
  console.log(`  [NOTE] ${disclosed.length} disclosed forward reference(s): `
    + disclosed.map((d) => `${d.lesson} ${d.uses}`).join('; '));

  // Every allowance has to point at something real, or it is dead weight that
  // hides the next genuine leak behind a name nobody recognises.
  const stale = ALLOW.filter((a) => !LESSON.has(a.lesson)
    || !TEACHES.some((t) => t.what === a.what));
  ok('1.4 every written exception names a real lesson and a real construct',
    stale.length === 0, stale);
  ok('1.5 every exception carries a reason',
    ALLOW.every((a) => a.why && a.why.length > 20),
    ALLOW.filter((a) => !a.why || a.why.length <= 20).map((a) => a.lesson));

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
