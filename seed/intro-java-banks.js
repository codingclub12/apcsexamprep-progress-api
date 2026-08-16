'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: THE BANK INDEX.
//
//  One list, required by everything that needs to know what content exists:
//  the manifest seed, the gap grader's key lookup, the page build, and the
//  content smoke test.
//
//  Adding a unit is ONE line here. Before this existed the unit list was
//  repeated in each of those four places, which is the shape of thing where a
//  new unit gets graded but not seeded, or seeded but not tested, and nobody
//  notices until a student's denominator is wrong.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const BANKS = [
  require('./intro-java-unit1'),
  require('./intro-java-unit2'),
  require('./intro-java-unit3'),
  require('./intro-java-unit4'),
  require('./intro-java-unit5'),
  require('./intro-java-unit6'),
];

/** Every lesson across every unit, in course order. */
function allLessons() {
  const out = [];
  for (const b of BANKS) for (const l of b.lessons) out.push({ bank: b, lesson: l });
  return out;
}

module.exports = { BANKS, allLessons };
