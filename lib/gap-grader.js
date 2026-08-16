'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  GAP-FILL GRADER. Server-side scoring for intro-java fill-in-the-code items.
//
//  A gap-fill exercise is working code with specific tokens removed. The student
//  types the missing tokens; this decides which are right.
//
//  ── THE PII RULE, WHICH IS THE WHOLE DESIGN CONSTRAINT ──────────────────────
//  A filled hole is student-typed FREE TEXT, and this system never stores
//  student free text. So the submitted tokens are graded IN TRANSIT and then
//  dropped on the floor. What persists is per-hole booleans and nothing else:
//
//      [{"q":1,"sel":null,"ok":true},{"q":2,"sel":null,"ok":false}]
//
//  Not the wrong answers "for diagnostics", not a truncated copy, not a hash.
//  `gradeSubmission` returns the verdict only; it has no database access and
//  cannot persist anything even by mistake. This is the same posture the code
//  grader already takes with `source`.
//
//  ── WHY NEAR MISSES EXIST ───────────────────────────────────────────────────
//  Java is case-sensitive and a beginner who types `actor` instead of `Actor`
//  is not making the same mistake as one who types `World`. Marking both simply
//  "wrong" teaches nothing and is the single most demoralising thing a
//  fill-in-the-blank can do.
//
//  So a wrong answer that would have matched under a relaxed comparison comes
//  back with a REASON: capitalisation, whitespace, missing parentheses, a stray
//  semicolon. The reason names the KIND of mistake and never the answer, so it
//  cannot be farmed to extract the key: every near-miss reason is reachable only
//  by a student who already typed something very close to correct.
//
//  A near miss is still WRONG. It scores zero for that hole. It just explains
//  itself, and the student can retry.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

// Banks are registered here so the grader has one place to look up a key. Adding
// a unit is one line, and lib/intro-java-page.js never sees this module at all,
// which is what keeps the key off the page.
const BANKS = [require('../seed/intro-java-unit1')];

// (course, item_id) -> { lesson_id, holes: [{ n, accept: [...] }] }
// Built once at module load. Bounded by the size of the course, never by
// traffic, which matters on a 1 vCPU / 1 GB box.
const KEY = new Map();

function keyFor(course, itemId) { return `${course}|${itemId}`; }

for (const bank of BANKS) {
  for (const l of bank.lessons) {
    if (!l.gap || !l.gap.holes || !l.gap.holes.length) continue;
    KEY.set(keyFor(bank.course, `${l.lesson}-gap`), {
      lesson_id: l.lesson,
      holes: l.gap.holes.map((h) => ({ n: h.n, accept: h.accept.slice() })),
    });
  }
}

/** Does a key exist for this item? Used by the route to 404 rather than guess. */
function hasKey(course, itemId) { return KEY.has(keyFor(course, itemId)); }

/** The hole numbers this item expects. Never the answers. */
function holeNumbers(course, itemId) {
  const k = KEY.get(keyFor(course, itemId));
  return k ? k.holes.map((h) => h.n) : [];
}

function lessonFor(course, itemId) {
  const k = KEY.get(keyFor(course, itemId));
  return k ? k.lesson_id : null;
}

// ── Normalisation ────────────────────────────────────────────────────────────
// Exact comparison after trimming and collapsing internal whitespace. Deliberately
// CASE-SENSITIVE: Java is, and 1.1 teaches that Crab and crab are different
// things. Getting that wrong is a real error worth surfacing, which is what the
// capitalisation near miss is for.
function normalise(s) {
  return String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
}

// Relaxations, each paired with the reason it reports. Order matters: the first
// one that turns a wrong answer into a match is the reason given, so the most
// specific and most actionable relaxations come first.
const RELAXATIONS = [
  {
    reason: 'capitalisation',
    message: 'Close. Check your capital letters: Java treats Crab and crab as different things.',
    apply: (s) => s.toLowerCase(),
  },
  {
    reason: 'missing_parentheses',
    message: 'Close. This one is a method, so it needs parentheses after its name.',
    // Compare ignoring parentheses entirely, which catches getX for getX().
    apply: (s) => s.split('(').join('').split(')').join(''),
  },
  {
    reason: 'stray_semicolon',
    message: 'Close. There is a semicolon here that does not belong inside the blank.',
    apply: (s) => s.replace(/;+$/, ''),
  },
  {
    reason: 'extra_spaces',
    message: 'Close. Remove the extra spaces.',
    apply: (s) => s.split(' ').join(''),
  },
];

/**
 * Grade one hole.
 * @returns {{ok: boolean, reason: string|null, message: string|null}}
 */
function gradeHole(submitted, accept) {
  const got = normalise(submitted);
  if (got === '') return { ok: false, reason: 'blank', message: 'This blank is empty.' };

  const want = accept.map(normalise);
  if (want.includes(got)) return { ok: true, reason: null, message: null };

  for (const r of RELAXATIONS) {
    const relaxedGot = r.apply(got);
    if (want.some((w) => r.apply(w) === relaxedGot)) {
      return { ok: false, reason: r.reason, message: r.message };
    }
  }
  return { ok: false, reason: null, message: null };
}

/**
 * Grade a whole submission.
 *
 * @param {string} course
 * @param {string} itemId
 * @param {object|Array} answers  hole number -> submitted text
 * @returns {{
 *   found: boolean,
 *   score: number, max_score: number,
 *   holes: Array<{n:number, ok:boolean, reason:string|null, message:string|null}>,
 *   detail: Array<{q:number, sel:null, ok:boolean}>
 * }}
 *
 * The returned `detail` is EXACTLY what may be persisted: hole number, a null
 * selection (a gap has no option index), and the boolean. The submitted text is
 * not in the return value at all, so a caller cannot store it even carelessly.
 */
function gradeSubmission(course, itemId, answers) {
  const k = KEY.get(keyFor(course, itemId));
  if (!k) return { found: false, score: 0, max_score: 0, holes: [], detail: [] };

  // Accept either {"1": "Actor"} or ["Actor", "World"]. The array form is
  // 1-indexed by position, which is how the page numbers its blanks.
  const read = (n) => {
    if (Array.isArray(answers)) return answers[n - 1];
    if (answers && typeof answers === 'object') return answers[String(n)];
    return undefined;
  };

  const holes = [];
  let score = 0;
  for (const h of k.holes) {
    const v = gradeHole(read(h.n), h.accept);
    if (v.ok) score++;
    holes.push({ n: h.n, ok: v.ok, reason: v.reason, message: v.message });
  }

  return {
    found: true,
    score,
    max_score: k.holes.length,
    holes,
    detail: holes.map((h) => ({ q: h.n, sel: null, ok: h.ok })),
  };
}

module.exports = {
  gradeSubmission, gradeHole, normalise, hasKey, holeNumbers, lessonFor,
  RELAXATIONS, KEY,
};
