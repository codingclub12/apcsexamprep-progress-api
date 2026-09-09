'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHICH COMMAND CENTER QUIZ ROWS MAY SHOW AN ANSWER KEY, AND FOR WHICH BANK.
//
//  ── THE QUESTION THIS ANSWERS, AND WHY IT IS NOT THE OBVIOUS ONE ───────────
//  The obvious rule is "show a key wherever quiz_bank has one". That is wrong
//  twice over on the page as it stands today, and both ways are silent.
//
//  1. THE ROW'S OWN NUMBER IS NOT THE BANK'S NUMBER. The Command Center lists
//     Unit 3 in site teaching order, 3.1 to 3.6. Unit 3 was renumbered onto the
//     Fall 2026 CED and the renumbering shipped to the page BODIES, not to the
//     Shopify handles, so the row numbered 3.4 links to a page whose bank is
//     filed under 3.3. Keying the button on the row id opens a Segmentation key
//     over a Firewalls quiz. Nothing throws. lib/cyber-quiz-lesson.js exists for
//     exactly this and is the resolver used here.
//
//  2. A BANK CAN EXIST AND STILL NOT BE THE QUIZ. Measured 2026-09-08: cyber
//     1.3, 1.4 and 1.5 have banks in production whose questions are NOT the ones
//     their pages serve. Those banks are re-authored web quizzes waiting on the
//     page mount (board 276). A key built from them would be a correct key to a
//     quiz nobody is taking, handed to a teacher standing in front of a class.
//
//  So the test is not "does a bank exist" but "does this bank describe the quiz
//  this row's link actually serves". Two ways to establish that, and nothing
//  else counts:
//
//    mount    the page fetches its questions from the bank, so it renders that
//             bank by construction. The page names the location itself, in its
//             own mount attributes. This is the strongest evidence available
//             and it cannot drift, because there is only one copy of the quiz.
//    stems    the page still carries its own questions, and every stem in the
//             bank is present in the page body. Whitespace-insensitive, because
//             markup between two words renders as a space the stored stem does
//             not have and that is not a different question. Four of five is a
//             REFUSAL, not a near miss: a bank that is mostly this quiz is a
//             bank that is partly some other one.
//
//  Everything else yields no button. A row with no honest key shows nothing,
//  which is the same call scripts/cyber-cc-clarity.js made about the pacing
//  chips: a control that cannot keep its promise is worse than no control.
//
//  Pure. No network and no database, so the whole decision is testable offline
//  against fixtures; the caller supplies the page bodies. Zero PII: page bodies
//  and bank stems are author content. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

//  ── STU, read out of the page rather than retyped ──────────────────────────
//  The Command Center already holds the row-to-quiz-page mapping in its own
//  `var STU` block. Retyping it here would create a second copy that goes stale
//  the first time a handle changes, which is how the 3.3/3.4 swap this module
//  exists to survive got into the site in the first place.
function parseSTU(ccBody) {
  const block = String(ccBody || '').match(/var STU = \{([\s\S]*?)\n\s*\};/);
  if (!block) throw new Error('cyber-cc-quiz-keys: no `var STU = {` block in this body');
  const out = {};
  for (const m of block[1].matchAll(/"(\d\.\d)"\s*:\s*\{([^}]*)\}/g)) {
    const quiz = m[2].match(/quiz:"([^"]+)"/);
    out[m[1]] = quiz ? quiz[1] : null;
  }
  if (!Object.keys(out).length) throw new Error('cyber-cc-quiz-keys: STU block parsed to zero lessons');
  return out;
}

//  Collapse to comparable text. Tags become nothing rather than a space, and
//  all whitespace is removed, so "r.castellano</b>." and "r.castellano." are
//  the same stem. Entities are decoded first, because a page stores a curly
//  apostrophe as an entity and the bank stores the character.
function squash(s) {
  return String(s == null ? '' : s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, '')
    .toLowerCase();
}

//  How much of a stem has to be found. Long enough that two different questions
//  cannot share it, short enough to survive an entity this normalizer does not
//  know. Every stem in every seeded cyber bank is longer than this.
const STEM_PREFIX = 70;

//  The mount names its own location. Attribute order is not guaranteed by
//  anything, so each is read on its own rather than in one positional regex.
function mountLocation(pageBody) {
  const b = String(pageBody || '');
  if (!/apcs-quiz-mount/.test(b)) return null;
  const pick = (name) => {
    const m = b.match(new RegExp('data-' + name + '="([^"]+)"'));
    return m ? m[1] : null;
  };
  const course = pick('course'), unit = pick('unit'), lesson = pick('lesson');
  const activity = pick('activity') || 'quiz';
  if (!course || !unit || !lesson) return null;
  return { course, unit, lesson, activity_type: activity };
}

/**
 * Decide one row.
 *
 * @param {string} lessonId    the Command Center's own row id, e.g. '3.4'
 * @param {string} quizPath    the row's student quiz link, e.g. '/pages/x-quiz'
 * @param {string} pageBody    that page as served
 * @param {Array}  banks       [{ location:{course,unit,lesson,activity_type}, questions:[{prompt}] }]
 * @returns {{lessonId, handle, location|null, basis, reason}}
 */
function decide(lessonId, quizPath, pageBody, banks) {
  const handle = String(quizPath || '').replace(/^\/pages\//, '');
  const none = (reason) => ({ lessonId, handle, location: null, basis: null, reason });
  if (!handle) return none('the row has no student quiz link');
  if (!pageBody) return none('the quiz page could not be read');

  const mount = mountLocation(pageBody);
  if (mount) {
    const bank = banks.find((b) => b.location.course === mount.course
      && b.location.unit === mount.unit && b.location.lesson === mount.lesson);
    if (!bank) {
      //  The page asks for a location nothing seeds. That is a live defect
      //  rather than a reason to fall through to stems: the page is currently
      //  rendering nothing where the quiz belongs.
      return none(`the page mounts ${mount.unit}/${mount.lesson}, which no bank seeds`);
    }
    return {
      lessonId, handle, location: mount, basis: 'mount',
      reason: 'the page fetches its questions from this bank, so the key cannot disagree with it',
    };
  }

  //  Not mounted: the page carries its own questions, so the bank has to be
  //  shown to BE them. Every stem, not most.
  const page = squash(pageBody);
  const scored = banks.map((b) => {
    const stems = b.questions.map((q) => squash(q.prompt).slice(0, STEM_PREFIX));
    return { bank: b, found: stems.filter((s) => s && page.includes(s)).length, of: stems.length };
  }).filter((s) => s.of > 0).sort((a, b) => (b.found / b.of) - (a.found / a.of));

  const best = scored[0];
  if (!best || best.found === 0) return none('no seeded bank has any question this page asks');
  if (best.found < best.of) {
    return none(`the closest bank (${best.bank.location.unit}/${best.bank.location.lesson}) `
      + `shares only ${best.found} of its ${best.of} questions with this page, so it is a different instrument`);
  }
  //  Two banks matching the same page in full would mean duplicate content, and
  //  picking either would be a guess about which column a teacher is looking at.
  const full = scored.filter((s) => s.found === s.of);
  if (full.length > 1) {
    return none('more than one bank matches this page in full: '
      + full.map((s) => s.bank.location.unit + '/' + s.bank.location.lesson).join(', '));
  }
  return {
    lessonId, handle, location: best.bank.location, basis: 'stems',
    reason: `all ${best.of} of this bank's questions are on the page as served`,
  };
}

/**
 * The whole crosswalk. `bodies` maps a page handle to that page as served.
 * Rows with no honest key come back with location null and a reason, because a
 * generator that silently drops them cannot tell a deliberate omission from a
 * fetch that failed.
 */
function crosswalk(ccBody, bodies, banks) {
  const stu = parseSTU(ccBody);
  const rows = [];
  for (const [lessonId, quizPath] of Object.entries(stu)) {
    const handle = String(quizPath || '').replace(/^\/pages\//, '');
    rows.push(decide(lessonId, quizPath, bodies[handle], banks));
  }
  return rows;
}

module.exports = { crosswalk, decide, parseSTU, squash, mountLocation, STEM_PREFIX };
