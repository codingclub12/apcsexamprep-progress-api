'use strict';
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Fail closed on a missing or default secret in production: without a real
// secret every student (180-day) and teacher token is forgeable, which would
// undercut the whole scoring/gradebook trust posture. Local dev keeps the
// convenience default.
const DEV_SECRET = 'dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEV_SECRET) {
  throw new Error('JWT_SECRET must be set to a strong random value in production. Refusing to start with the dev default.');
}
if (JWT_SECRET === DEV_SECRET) {
  console.warn('[utils] JWT_SECRET is unset; using the insecure dev default. Set JWT_SECRET before deploying.');
}
const JWT_EXPIRES = '30d';

// ── CLASS CODE ────────────────────────────────────────────────────────────────
// Format: CYBER-XXXX (4 alphanumeric, no ambiguous chars)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateClassCode(prefix = 'CYBER') {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `${prefix}-${code}`;
}

// ── UUID ──────────────────────────────────────────────────────────────────────
function newId() { return uuidv4(); }

// ── JWT (teacher auth) ────────────────────────────────────────────────────────
function signTeacherToken(teacher) {
  return jwt.sign(
    { id: teacher.id, email: teacher.email, role: 'teacher' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verifyTeacherToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── SESSION TOKEN (student auth) ──────────────────────────────────────────────
// Student sessions: longer-lived JWT with student + class info
function signStudentToken(student, classCode) {
  return jwt.sign(
    { id: student.id, class_id: student.class_id, class_code: classCode, role: 'student' },
    JWT_SECRET,
    { expiresIn: '180d' } // 6 months - outlasts a school year segment
  );
}

function verifyStudentToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── COURSE CONFIG ─────────────────────────────────────────────────────────────
// ONE object. Each course is a KEY (not its own const). Unit keys and lesson-id
// formats below intentionally match what pageFromHandle() writes at the bottom
// of this file: CSA units 'unit-N' with lesson 'U.L', CSP units 'bi-N' with slug
// lessons, Cyber units 'unit-N'.
const COURSES = {
  'ap-cybersecurity': {
    label: 'AP Cybersecurity',
    units: {
      'unit-1': {
        label: 'Unit 1: Introduction to Security',
        lessons: ['1.1', '1.2', '1.3', '1.4', '1.5'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'quiz'],
        case_file: { lesson: 'case-file', label: 'Case File' },
        exam: { lesson: 'exam', label: 'Unit Exam' },
      },
      'unit-2': {
        label: 'Unit 2: Securing Spaces',
        // Unit 2 is 2.1 through 2.4. A 2.5 page set exists on the storefront
        // (ap-cyber-unit-2-lesson-5-*, plus an access-controls page titled
        // "Topic 2.5") but the lesson does not exist in the course, so it must
        // not render a column. Confirmed with the course owner.
        lessons: ['2.1', '2.2', '2.3', '2.4'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'quiz'],
        case_file: { lesson: 'case-file', label: 'Case File' },
        exam: { lesson: 'exam', label: 'Unit Exam' },
      },
      'unit-3': {
        label: 'Unit 3: Securing Networks',
        //  Renumbered to the Fall 2026 CED on 2026-08-27. The CED has five Unit
        //  3 topics and the site teaches six pages, because CED 3.1 runs over
        //  two: 3.1a is Network Fundamentals and 3.1b is Network Attacks. The
        //  retired 3.6 was never a CED topic; its content is now 3.2.
        //
        //  Two ids for one topic is what keeps the gradebook honest. A column
        //  is keyed `${lesson}|${activity}` and the grade of record is per
        //  (student, lesson, activity), so one shared id would collapse eight
        //  columns into four and let a better score on one half mask the other.
        //
        //  docs/cyber-unit3-renumbering-spec.md carries the full mapping;
        //  utils.js pageFromHandle and scripts/seed-cyber-denominators.js must
        //  agree with this list, and smoke/cyber-unit3-lessons.js pins that.
        lessons: ['3.1a', '3.1b', '3.2', '3.3', '3.4', '3.5'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'quiz'],
        case_file: { lesson: 'case-file', label: 'Case File' },
        exam: { lesson: 'exam', label: 'Unit Exam' },
      },
      'unit-4': {
        label: 'Unit 4: Securing Devices',
        //  Unit 4 is 4.1 through 4.4, which is the whole of the CED's Unit 4.
        //  4.4 was added here in August because its pages were real content the
        //  config did not list. 4.5 arrived in the same pass and did not belong:
        //  the CED has no topic 4.5, so the column was a lesson no AP teacher
        //  could map to a topic. Removed 2026-09-03, board 188.
        //
        //  The page is still live and still teaches: it is titled "4.5 Securing
        //  IoT and Embedded Devices", and that content IS on the syllabus, under
        //  4.1.A.4 and 4.1.A.5 inside topic 4.1. So this is not a leftover the
        //  way cyber 2.5 is. Whether it should be renumbered as a second half of
        //  4.1, the way CED 3.1 is taught over 3.1a and 3.1b, is a content
        //  decision and not this change. Until somebody makes it, the page stays
        //  up and untracked, which is the same trade the unmapped slugs make.
        lessons: ['4.1', '4.2', '4.3', '4.4'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'quiz'],
        case_file: { lesson: 'case-file', label: 'Case File' },
        exam: { lesson: 'exam', label: 'Unit Exam' },
      },
      'unit-5': {
        label: 'Unit 5: Securing Applications and Data',
        lessons: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'quiz'],
        case_file: { lesson: 'case-file', label: 'Case File' },
        exam: { lesson: 'exam', label: 'Unit Exam' },
      },
    },
  },
  'ap-csa': {
    label: 'AP Computer Science A',
    units: {
      'unit-1': {
        // Unit 1 pages are the apcs-ex pilot: auto-graded CFU widgets (the
        // Judge0 code editor items also report as cfu) plus a short mastery
        // quiz, which arrive via POST /api/progress/attempt and are denominated
        // by course_manifest.
        //
        // exercise-1 was previously left OUT of this list, correctly, because no
        // exercise page existed for any Unit 1 lesson and declaring the column
        // would only have created fifteen permanently empty ones. That is no
        // longer true: lib/csa-exercise-pages.js builds an exercise-1 page for
        // all fifteen, graded server side against hidden test cases. The column
        // is declared now because the page that fills it exists now.
        //
        // exercise-2 stays out for the same original reason. No Unit 1 page
        // emits it.
        //
        // exercise-3 (2026-08-24): declared now, because the FRQ bank
        // (seed/csa-frq/unit1.js) and lib/csa-frq-pages.js build a four point
        // FRQ practice page for these lessons, so the column has something to
        // fill it. Same reasoning as exercise-1 and debug before it: declaring
        // an activity moves PACE, not anyone's percentage, because the
        // gradebook computes earned / graded over ATTEMPTED items. See
        // docs/gradebook-contract.md.
        //
        // debug (2026-08-24): declared for the same reason exercise-1 was. The
        // debugging bank now covers all fifteen Unit 1 lessons
        // (seed/csa-debug-unit1.js) and lib/csa-debug-pages.js builds a page
        // for each, so the column has something to fill it. Declaring an
        // activity moves PACE, not anyone's percentage: the gradebook computes
        // earned / graded over ATTEMPTED items, so an unattempted debug item
        // never enters either total. See docs/gradebook-contract.md.
        label: 'Unit 1: Using Objects and Methods',
        lessons: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15'],
        activities: ['lesson', 'cfu', 'exercise-1', 'exercise-3', 'quiz', 'debug'],
      },
      'unit-2': {
        label: 'Unit 2: Selection and Iteration',
        lessons: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12'],
        // debug declared 2026-08-24, same reasoning as Unit 1 above.
        activities: ['lesson', 'exercise-1', 'exercise-2', 'exercise-3', 'quiz', 'debug'],
      },
      'unit-3': {
        label: 'Unit 3: Class Creation',
        lessons: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9'],
        // debug declared 2026-08-24, same reasoning as Unit 1 above.
        activities: ['lesson', 'exercise-1', 'exercise-2', 'exercise-3', 'quiz', 'debug'],
      },
      'unit-4': {
        label: 'Unit 4: Data Collections',
        lessons: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11', '4.12', '4.13', '4.14', '4.15', '4.16', '4.17'],
        // debug (2026-08-20): a second graded code exercise, a debugging task
        // rather than a from-scratch one. See seed/csa-debug-exercises.js.
        // Only 4.4 has authored content so far; declared unit-wide anyway,
        // same posture exercise-2/exercise-3 already took here before every
        // lesson had a bank.
        activities: ['lesson', 'exercise-1', 'exercise-2', 'exercise-3', 'quiz', 'debug'],
      },
    },
  },
  'ap-csp': {
    label: 'AP Computer Science Principles',
    units: {
      'bi-1': {
        label: 'Big Idea 1: Creative Development',
        lessons: ['collaboration', 'program-function-purpose', 'program-design-development', 'identifying-correcting-errors'],
        // No exercise-1: only Big Idea 3 lessons carry guided code problems. The
        // other big ideas emit exercise-2 (a practice game) plus a quiz, so
        // listing exercise-1 here only created a permanently empty gradebook column.
        activities: ['lesson', 'exercise-2', 'quiz'],
        // The Big Idea unit test. Declared so it shows as a column even before
        // anyone sits it: an assessment nobody has taken and an assessment that
        // cannot be recorded look identical otherwise, which is exactly how
        // these went unnoticed.
        exam: { lesson: 'unit-test', label: 'Big Idea 1 Unit Test' },
      },
      'bi-2': {
        label: 'Big Idea 2: Data',
        lessons: ['binary-numbers', 'data-compression', 'extracting-information', 'using-programs-with-data'],
        // No exercise-1 (see bi-1): these lessons emit exercise-2 plus a quiz only.
        activities: ['lesson', 'exercise-2', 'quiz'],
        exam: { lesson: 'unit-test', label: 'Big Idea 2 Unit Test' },
      },
      'bi-3': {
        label: 'Big Idea 3: Algorithms and Programming',
        lessons: [
          'variables', 'data-abstraction', 'mathematical-expressions', 'strings',
          'boolean-expressions', 'conditionals', 'nested-conditionals', 'iteration',
          'developing-algorithms', 'lists', 'binary-search', 'calling-procedures',
          'developing-procedures', 'libraries', 'random-values', 'simulations',
          'algorithmic-efficiency', 'undecidable-problems',
        ],
        // Big Idea 3 is the only one with guided code problems, so exercise-1 is real here.
        activities: ['lesson', 'exercise-1', 'exercise-2', 'quiz'],
        // Two sittings, kept as separate columns: one handle post per page, and
        // a shared lesson would let part B overwrite part A.
        exam: [
          { lesson: 'unit-test-part-a', label: 'Big Idea 3 Unit Test A' },
          { lesson: 'unit-test-part-b', label: 'Big Idea 3 Unit Test B' },
        ],
      },
      'bi-4': {
        label: 'Big Idea 4: Computer Systems and Networks',
        lessons: ['the-internet', 'fault-tolerance', 'parallel-distributed-computing'],
        // No exercise-1 (see bi-1): these lessons emit exercise-2 plus a quiz only.
        activities: ['lesson', 'exercise-2', 'quiz'],
        exam: { lesson: 'unit-test', label: 'Big Idea 4 Unit Test' },
      },
      'bi-5': {
        label: 'Big Idea 5: Impact of Computing',
        lessons: ['beneficial-harmful-effects', 'digital-divide', 'computing-bias', 'crowdsourcing', 'legal-ethical-concerns', 'safe-computing'],
        // No exercise-1 (see bi-1): these lessons emit exercise-2 plus a quiz only.
        activities: ['lesson', 'exercise-2', 'quiz'],
        exam: { lesson: 'unit-test', label: 'Big Idea 5 Unit Test' },
      },
    },
  },
  // AP Networking (AP Career Kickstart pilot, for use beginning 2026-2027).
  // Intro to Java with Greenfoot: the pre-AP CSA on-ramp. 6 units, 42 lessons,
  // beginner through 2D array tile mapping. Full spec in
  // docs/intro-java-course-spec.md.
  //
  // All 42 lessons are listed now, before their pages exist, for the same
  // reason networking lists all 22 topics: visit denominators must not move
  // under students who have already started. GRADED rows are a different
  // matter and are seeded per unit as pages ship (see scripts/seed-manifest.js).
  //
  // 'gap' is the fill-in-the-holes activity, the format this course leans on
  // hardest, because Greenfoot cannot run in Judge0 and a beginner cannot be
  // handed a blank screen. 'code' is the pure-logic method graded headless
  // against lib/greenfoot-stub.js. The unit PROJECT is deliberately not an
  // activity here: it is built in Greenfoot on the desktop, cannot report
  // itself, and is teacher-scored through the existing score-entry route.
  'intro-java': {
    label: 'Intro to Java with Greenfoot',
    units: {
      'unit-1': {
        label: 'Unit 1: Meet Greenfoot',
        lessons: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6'],
        // 'code' was left out here while Units 2 to 6 declared it, correctly:
        // no Unit 1 lesson had a code exercise, and declaring the column would
        // have created six permanently empty ones. That is no longer true.
        // 1.4, 1.5 and 1.6 have authored, verified exercises now; 1.1 to 1.3
        // still do not and never will, because nothing in them is typed. The
        // column is declared because the pages that fill it exist.
        activities: ['lesson', 'cfu', 'gap', 'code', 'quiz'],
      },
      'unit-2': {
        label: 'Unit 2: Variables, Decisions, and Input',
        lessons: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7'],
        activities: ['lesson', 'cfu', 'gap', 'code', 'quiz'],
      },
      'unit-3': {
        label: 'Unit 3: Methods, Worlds, and Constructors',
        lessons: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9'],
        activities: ['lesson', 'cfu', 'gap', 'code', 'quiz'],
      },
      'unit-4': {
        label: 'Unit 4: Loops and Collections of Actors',
        lessons: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7'],
        activities: ['lesson', 'cfu', 'gap', 'code', 'quiz'],
      },
      'unit-5': {
        label: 'Unit 5: Arrays',
        lessons: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6'],
        activities: ['lesson', 'cfu', 'gap', 'code', 'quiz'],
      },
      'unit-6': {
        label: 'Unit 6: 2D Arrays and Tile Maps',
        lessons: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7'],
        activities: ['lesson', 'cfu', 'gap', 'code', 'quiz'],
      },
    },
  },
  // 4 units, 22 topics. Unit/lesson keys ('unit-N', 'U.T') match pageFromHandle
  // and the course_manifest seed exactly, so visit denominators line up with
  // what the reporter sends. Content ships unit by unit; all 22 topics are
  // listed now so visit denominators never move later.
  'ap-networking': {
    label: 'AP Networking',
    units: {
      'unit-1': {
        label: 'Unit 1: Managing My Connections',
        lessons: ['1.1', '1.2', '1.3', '1.4'],
        activities: ['lesson', 'cfu', 'quiz'],
      },
      'unit-2': {
        label: 'Unit 2: Managing My Shared Connections',
        lessons: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'],
        activities: ['lesson', 'cfu', 'quiz'],
      },
      'unit-3': {
        label: 'Unit 3: Managing Many Connections',
        lessons: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6'],
        activities: ['lesson', 'cfu', 'quiz'],
      },
      'unit-4': {
        label: 'Unit 4: Managing Our Global Connections',
        lessons: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6'],
        activities: ['lesson', 'cfu', 'quiz'],
      },
    },
  },
};

// ── VALIDATION ────────────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin));
}

function isValidClassCode(code) {
  return /^[A-Z]+-[A-Z0-9]{4}$/.test(code);
}

// Every free-text field that reaches a rendered page goes through here: student
// display_name (join, roster import, teacher rename), teacher name, school, and
// class_name. It used to trim and truncate only, which made it the entry point
// for stored XSS. The teacher gradebook and the student progress page both
// interpolate these values into innerHTML behind an escaper that was a no-op
// (every .replace mapped a character to itself), so a student who joined a class
// as `<img src=x onerror=...>` got script execution in their teacher's browser,
// where the teacher JWT lives in localStorage.
//
// The escaper is being repaired separately. This is the layer that has to hold
// regardless, because it is the only one every consumer shares: the gradebook,
// the CSV and Canvas exports, the admin pages, and anything built later.
//
// Why transform rather than reject: these are names typed by minors on a phone.
// A 400 mid-join strands a student in front of a class, so the value is made
// inert instead of refused.
//
// Character policy, in the order the checks apply:
//   C0/C1 controls  removed. Never typed deliberately, and they corrupt the CSV
//                   export and hide payloads from anyone reading the roster.
//   < and >         removed. No legitimate name contains them, and without `<`
//                   no attacker-controlled string can open a tag at all.
//   " and '         folded to the typographic forms " and '. This is the
//                   subtle one. Stripping them would mangle O'Brien, which is a
//                   real student name, but keeping the ASCII forms leaves a live
//                   hole: both pages build attributes as aria-label='...', so a
//                   bare apostrophe still closes the attribute and starts a new
//                   one, and `x' onmouseover='alert(1)` executes without ever
//                   needing a `<`. The curly forms read identically to a human
//                   and are inert to an HTML parser.
//   &               kept. Legitimate in "Period 3 & 4", and harmless on its own:
//                   an entity decodes to a text character, and a text character
//                   cannot become markup. Entities inside a quoted attribute are
//                   decoded after the delimiter is found, so &#39; cannot break
//                   out either.
//
// Truncation stays last so the length limit applies to what is actually stored.
const CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F]/g;
const TAG_CHARS = /[<>]/g;

function sanitize(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  return str
    .replace(CONTROL_CHARS, '')
    .replace(TAG_CHARS, '')
    .replace(/"/g, '”')
    .replace(/'/g, '’')
    .trim()
    .slice(0, maxLen);
}

// ── COURSE PREFIX for class codes ─────────────────────────────────────────────
const COURSE_PREFIXES = {
  'ap-cybersecurity': 'CYBER',
  'ap-csa':           'CSA',
  'ap-csp':           'CSP',
  'ap-networking':    'NET',
  'intro-java':       'JAVA',
};

// 'gap' is the intro-java fill-in-the-holes activity. Added at the END of the
// list only for readability; order does not matter here because trailingActivity
// anchors every token at the end of the handle. No other course has a handle
// ending in '-gap', so adding it cannot reclassify an existing page.
const ACTIVITY_TOKENS = ['exercise-1', 'exercise-2', 'exercise-3', 'lab', 'quiz', 'exam', 'code', 'gap', 'debug', 'frq'];

// A handle token that is NOT its own activity type. 'frq' is what the page is
// called, because that is the word the student and the search engine both use,
// and '-exercise-3' on the end of a URL means nothing to either. The GRADED
// column is still exercise-3, which the manifest already denominates at 4
// points, so the alias is where the student-facing name and the gradebook
// column are reconciled rather than one of them being bent to the other.
//
// Aliasing is safe here specifically because no page ends in '-frq' today, so
// this cannot reclassify anything already live. That is the same test the
// '-gap' token had to pass when it was added.
const ACTIVITY_ALIASES = { frq: 'exercise-3' };

function trailingActivity(h) {
  // anchored at the end so a slug like "collaboration" never trips "lab"
  for (const a of ACTIVITY_TOKENS) if (h.endsWith('-' + a)) return ACTIVITY_ALIASES[a] || a;
  return 'lesson';
}

// A unit may declare ONE exam or SEVERAL. Cyber gives each unit a single unit
// exam; CSP Big Idea 3 sits its unit test in two parts, which are two columns.
// Every reader goes through this so a second exam can never be silently dropped
// by code that assumed an object.
function examsOf(unit) {
  if (!unit || !unit.exam) return [];
  return Array.isArray(unit.exam) ? unit.exam : [unit.exam];
}

// Topic number ("1.1") -> the Big Idea and lesson slug that own it, derived from
// the COURSES config rather than authored twice. The lessons arrays are written
// in CED order, so the Nth lesson of Big Idea U IS topic U.N and the numbering
// cannot drift from the config. Built once at module scope.
const CSP_TOPIC_INDEX = (() => {
  const idx = new Map();
  const cfg = COURSES['ap-csp'];
  for (const [unit, u] of Object.entries((cfg && cfg.units) || {})) {
    const bi = unit.match(/^bi-(\d+)$/);
    if (!bi) continue;
    (u.lessons || []).forEach((slug, i) => idx.set(`${bi[1]}.${i + 1}`, { unit, slug }));
  }
  return idx;
})();

function cspTopicSlug(unitNo, lessonNo) {
  return CSP_TOPIC_INDEX.get(`${Number(unitNo)}.${Number(lessonNo)}`) || null;
}

function pageFromHandle(raw) {
  if (!raw) return null;
  const h = String(raw).split('/').filter(Boolean).pop() || '';

  // CSP course: ap-csp-course-bi{N}-{slug}   (lesson id = slug)
  // hub pages ap-csp-course, ap-csp-course-big-idea-N, ap-csp-course-create-task
  // do not match bi{digit} and are correctly ignored.
  let m = h.match(/^ap-csp-course-bi(\d+)-(.+)$/);
  if (m) {
    const slug = m[2];
    const unit = 'bi-' + m[1];

    // Big Idea unit tests are the highest stakes assessment in CSP, and they
    // were landing as page VISITS. 'unit-test' ends in no activity token, so
    // trailingActivity called it a lesson, and a lesson is ungraded: six tests,
    // 84 authored questions with full answer keys, none of them able to carry a
    // grade. The pages report fine, they were just filed somewhere ungradeable.
    //
    // Big Idea 3 is split across two sittings, part A and part B, and they stay
    // SEPARATE lessons on purpose. A handle post with no item defaults to the
    // item name 'item' (routes/student.js), so folding both parts into one
    // lesson would have the second submission overwrite the first.
    const ut = slug.match(/^unit-test(?:-part-([a-z]))?$/);
    if (ut) {
      return { course: 'ap-csp', unit, activity_type: 'exam',
               lesson: ut[1] ? `unit-test-part-${ut[1]}` : 'unit-test' };
    }

    // Guided notes belong to their topic, they are not a topic of their own.
    // Sixteen '<topic>-notes' pages were each minting a second lesson column
    // beside the real one, so visiting the notes for 1.1 registered as progress
    // on a topic called 'collaboration-notes' that appears in no course.
    const notes = slug.match(/^(.+)-notes$/);
    if (notes) return { course: 'ap-csp', unit, lesson: notes[1], activity_type: 'lesson' };

    const activity_type = trailingActivity(h);
    const lesson = slug.replace(new RegExp('-' + activity_type + '$'), '');
    return { course: 'ap-csp', unit, lesson, activity_type };
  }

  // CSP exercise pages: ap-csp-topic-{U}-{L}-exercise-{N}
  //
  // The online companions to the Teacher Course Bundle handouts. The handle is
  // not a naming choice: it is printed inside 70 student documents already in
  // teachers' hands, so it cannot be moved into the ap-csp-course-bi{N} scheme
  // the rule above reads. Until this existed the handles matched nothing, /track
  // silently no-opped, and none of the 70 pages recorded a visit.
  //
  // ROUTED AS A VISIT ON THE PARENT TOPIC, NOT AS 'exercise-{N}'.
  // Same reasoning as the guided-notes rule above, and the stakes are higher
  // here. /track writes progress with completed = 1 keyed on activity_type, so
  // returning 'exercise-2' would mark the exercise COMPLETE for a student who
  // opened the page and typed nothing, and it would write that onto
  // {lesson}|exercise-2, a key already claimed by the gated whole-run practice
  // game in lib/csp-course-pages.js. A visit is evidence the student opened the
  // topic's exercise. It is not evidence they did it.
  //
  // Grading is unaffected and always was: the page dispatches course, unit and
  // lesson explicitly in the apcsActivity detail, and assets/ap-csp-reporter.js
  // prefers the detail over the handle. This function never sees a graded post
  // from these pages.
  m = h.match(/^ap-csp-topic-(\d+)-(\d+)-exercise-[12]$/);
  if (m) {
    const topic = cspTopicSlug(m[1], m[2]);
    // A topic the course config does not know is left unrouted rather than
    // filed under a guessed lesson id. A wrong lesson column is worse than a
    // missing visit: it invents a row no teacher can explain.
    if (topic) {
      return { course: 'ap-csp', unit: topic.unit, lesson: topic.slug, activity_type: 'lesson' };
    }
  }

  // CSA course: ap-csa-lesson-{U}-{L}-{slug}   (lesson id = "U.L")
  // hubs ap-csa-course and ap-csa-unit-{N}-course do not match and are ignored.
  m = h.match(/^ap-csa-lesson-(\d+)-(\d+)-/);
  if (m) {
    return { course: 'ap-csa', unit: 'unit-' + m[1], lesson: m[1] + '.' + m[2], activity_type: trailingActivity(h) };
  }

  // AP Networking: ap-networking-lesson-{U}-{T}-{slug}   (lesson id = "U.T")
  // hubs ap-networking and ap-networking-unit-{N} do not match and are ignored.
  m = h.match(/^ap-networking-lesson-(\d+)-(\d+)-/);
  if (m) {
    return { course: 'ap-networking', unit: 'unit-' + m[1], lesson: m[1] + '.' + m[2], activity_type: trailingActivity(h) };
  }

  // Intro to Java: intro-java-lesson-{U}-{L}-{slug}   (lesson id = "U.L")
  //
  // Only LESSON pages are matched, and that is the whole point of the rule
  // being this narrow:
  //
  //   intro-java-help-error-{slug}  and  intro-java-help-recipe-{slug}
  //
  // are the getting-unstuck pages, and they must never register as progress.
  // They are reference material a struggling student is meant to reach for
  // freely, so counting a visit would mean the students who need them most
  // look the most productive, and would put lesson ids like 'error-npe' in the
  // gradebook. They carry no manifest row either.
  //
  // Project pages are likewise unmatched. A project's auto-graded worksheet
  // reports through POST /api/progress/attempt with an explicit item_id
  // ('project-{U}-gap'), which never goes through this function, and the built
  // Greenfoot scenario is teacher-scored. Matching them here would mint a
  // 'project-1' visit column that no manifest row backs.
  m = h.match(/^intro-java-lesson-(\d+)-(\d+)-/);
  if (m) {
    return { course: 'intro-java', unit: 'unit-' + m[1], lesson: m[1] + '.' + m[2], activity_type: trailingActivity(h) };
  }

  // Cyber CANONICAL lesson pages: ap-cybersecurity-unit-{N}-{slug}[-{activity}]
  //
  // These are the URLs students are actually sent to, and every one of them used
  // to fall through to `return null`, so /track silently no-opped: no visit, no
  // score, nothing. The parallel ap-cyber-unit-{N}-lesson-{M} handles below were
  // the only cyber pages ever tracked.
  //
  // The slug carries no lesson number, so it needs an explicit map. Units 3 to 5
  // have no topic-named lesson pages and are covered by the numbered rule below.
  //
  // Unit 2 is deliberately absent: it has TWO competing topic-named sets
  // (cia-triad vs cyber-foundations both claim 2.1, and so on down the unit), so
  // any mapping would be a guess about which curriculum is live. Dropping those
  // handles keeps today's behaviour rather than filing work under a wrong lesson.
  const CYBER_SLUGS = {
    'social-engineering': '1.1',
    'password-attacks':   '1.2',
    'wireless-security':  '1.3',
    'ai-driven-threats':  '1.4',
    'ai-cyber-defense':   '1.5',

    // Unit 2. Confirmed canonical against the lesson page titles. A SECOND
    // topic-named set exists and is deliberately absent: cia-triad,
    // defense-in-depth, physical-security, risk-assessment and access-controls
    // are titled "Topic 2.1" through "Topic 2.5" and claim the same lesson
    // numbers as these. Leaving them unmapped keeps them untracked rather than
    // filing a student's work under a lesson from the wrong curriculum.
    'cyber-foundations':          '2.1',
    'physical-vulnerabilities':   '2.2',
    'protecting-physical-spaces': '2.3',
    'detecting-physical-attacks': '2.4',
  };
  m = h.match(/^ap-cybersecurity-unit-(\d+)-(.+)$/);
  if (m) {
    const activity_type = trailingActivity(h);
    const slug = m[2].replace(new RegExp('-' + activity_type + '$'), '');
    const lesson = CYBER_SLUGS[slug];
    // An unmapped slug (a hub page, a study guide, Unit 2's duplicates) stays
    // untracked rather than being invented into a lesson.
    if (lesson) {
      return { course: 'ap-cybersecurity', unit: 'unit-' + m[1], lesson, activity_type };
    }
  }

  // Cyber: ap-cyber-unit-{N}-exam | ap-cyber-unit-{N}-lesson-{M}[-{activity}]
  //
  // The numbered rule derives a lesson from the handle, so a page that exists on
  // the storefront but not in the course would be filed under a lesson with no
  // gradebook column: recorded forever, displayed never. Cyber 2.5 is exactly
  // that, a leftover page set from an earlier cut of Unit 2. Listing it here
  // keeps it untracked, which is the same choice the unmapped slugs above make.
  //
  // 4.5 joined it on 2026-09-03 for a related but not identical reason, and the
  // difference is worth keeping. 2.5 is content that left the course. 4.5 is
  // content that never had a topic number: ap-cyber-unit-4-lesson-5 is live and
  // teaches IoT and embedded devices, which the CED covers inside topic 4.1, and
  // the CED's Unit 4 stops at 4.4. Recording it as 4.5 gave a teacher a
  // gradebook column for a topic the exam does not have.
  //
  // Untracked is the honest state, not the finished one. Nothing stored is
  // touched by this and re-adding the id restores the column exactly, so the
  // renumbering question stays open rather than being closed by a deletion.
  const CYBER_NOT_IN_COURSE = new Set(['2.5', '4.5']);

  //  UNIT 3 IS NOT unit.handleNumber, AND CANNOT BE.
  //
  //  Unit 3's pages were renumbered to the Fall 2026 CED, which the site had
  //  wrong in three ways at once: site 3.3 and 3.4 were each other's CED
  //  topics, site 3.6 was CED 3.2, and site 3.1 and 3.2 are two halves of one
  //  CED topic. Six handles, five topics. See
  //  docs/cyber-unit3-renumbering-spec.md.
  //
  //  That doubled topic is what makes an explicit map unavoidable rather than
  //  merely tidy: with two handles sharing CED 3.1, every handle after the pair
  //  is offset by one from its topic number, so no arithmetic on the handle
  //  index can recover the lesson. Left to the generic rule below, a visit to
  //  lesson-3 files under 3.3 when the page now teaches 3.2, and the work lands
  //  on a lesson the student never opened.
  //
  //  The a/b suffixes are the gradebook's, not decoration: a column is keyed on
  //  `${lesson}|${activity}` and the grade of record is per (student, lesson,
  //  activity), so both halves sharing the id `3.1` would collapse into one
  //  column per activity and let a better score on one part mask the other.
  //
  //  Same shape as CYBER_SLUGS above, and the same reason: a handle whose
  //  number no longer states its lesson needs the mapping written down.
  const CYBER_UNIT3_LESSONS = {
    1: '3.1a',  // Network Fundamentals and Attack Surface, CED 3.1 LO B/C
    2: '3.1b',  // Network Attacks,                         CED 3.1 LO A
    3: '3.2',   // Network Security Policies and Wireless,  CED 3.2
    4: '3.3',   // Network Segmentation and VLANs,          CED 3.3
    5: '3.4',   // Firewalls and Packet Filtering,          CED 3.4
    6: '3.5',   // IDS, IPS and SIEM,                       CED 3.5
  };

  m = h.match(/^ap-cyber-unit-(\d+)-exam$/);
  if (m) return { course: 'ap-cybersecurity', unit: 'unit-' + m[1], lesson: 'exam', activity_type: 'exam' };
  m = h.match(/^ap-cyber-unit-(\d+)-lesson-(\d+)/);
  if (m) {
    const unitNo = m[1];
    const lesson = unitNo === '3'
      ? CYBER_UNIT3_LESSONS[Number(m[2])]
      : unitNo + '.' + m[2];
    //  An unmapped Unit 3 handle stays untracked rather than being invented
    //  into a lesson, the same choice the unmapped slugs above make.
    if (!lesson || CYBER_NOT_IN_COURSE.has(lesson)) return null;
    return { course: 'ap-cybersecurity', unit: 'unit-' + unitNo, lesson, activity_type: trailingActivity(h) };
  }

  return null; // unknown page, /track no-ops
}

module.exports = { pageFromHandle, trailingActivity, ACTIVITY_TOKENS, examsOf,
  newId, generateClassCode, signTeacherToken, verifyTeacherToken,
  signStudentToken, verifyStudentToken, COURSES, COURSE_PREFIXES,
  isValidEmail, isValidPin, isValidClassCode, sanitize,
};
