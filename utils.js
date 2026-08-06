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
        // 3.6 likewise: real content, no column.
        lessons: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'quiz'],
        case_file: { lesson: 'case-file', label: 'Case File' },
        exam: { lesson: 'exam', label: 'Unit Exam' },
      },
      'unit-4': {
        label: 'Unit 4: Securing Devices',
        // 4.4 and 4.5 likewise: real content, no columns.
        lessons: ['4.1', '4.2', '4.3', '4.4', '4.5'],
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
        // quiz. No exercise-1/2/3 pages exist for these lessons, so declaring
        // them only created permanently empty gradebook columns (the same fix
        // CSP bi-1 got). Grades arrive via POST /api/progress/attempt and are
        // denominated by course_manifest, not course_denominators.
        label: 'Unit 1: Using Objects and Methods',
        lessons: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15'],
        activities: ['lesson', 'cfu', 'quiz'],
      },
      'unit-2': {
        label: 'Unit 2: Selection and Iteration',
        lessons: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'exercise-3', 'quiz'],
      },
      'unit-3': {
        label: 'Unit 3: Class Creation',
        lessons: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'exercise-3', 'quiz'],
      },
      'unit-4': {
        label: 'Unit 4: Data Collections',
        lessons: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11', '4.12', '4.13', '4.14', '4.15', '4.16', '4.17'],
        activities: ['lesson', 'exercise-1', 'exercise-2', 'exercise-3', 'quiz'],
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
      },
      'bi-2': {
        label: 'Big Idea 2: Data',
        lessons: ['binary-numbers', 'data-compression', 'extracting-information', 'using-programs-with-data'],
        // No exercise-1 (see bi-1): these lessons emit exercise-2 plus a quiz only.
        activities: ['lesson', 'exercise-2', 'quiz'],
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
      },
      'bi-4': {
        label: 'Big Idea 4: Computer Systems and Networks',
        lessons: ['the-internet', 'fault-tolerance', 'parallel-distributed-computing'],
        // No exercise-1 (see bi-1): these lessons emit exercise-2 plus a quiz only.
        activities: ['lesson', 'exercise-2', 'quiz'],
      },
      'bi-5': {
        label: 'Big Idea 5: Impact of Computing',
        lessons: ['beneficial-harmful-effects', 'digital-divide', 'computing-bias', 'crowdsourcing', 'legal-ethical-concerns', 'safe-computing'],
        // No exercise-1 (see bi-1): these lessons emit exercise-2 plus a quiz only.
        activities: ['lesson', 'exercise-2', 'quiz'],
      },
    },
  },
  // AP Networking (AP Career Kickstart pilot, for use beginning 2026-2027).
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
};

const ACTIVITY_TOKENS = ['exercise-1', 'exercise-2', 'exercise-3', 'lab', 'quiz', 'exam', 'code'];

function trailingActivity(h) {
  // anchored at the end so a slug like "collaboration" never trips "lab"
  for (const a of ACTIVITY_TOKENS) if (h.endsWith('-' + a)) return a;
  return 'lesson';
}

function pageFromHandle(raw) {
  if (!raw) return null;
  const h = String(raw).split('/').filter(Boolean).pop() || '';

  // CSP course: ap-csp-course-bi{N}-{slug}   (lesson id = slug)
  // hub pages ap-csp-course, ap-csp-course-big-idea-N, ap-csp-course-create-task
  // do not match bi{digit} and are correctly ignored.
  let m = h.match(/^ap-csp-course-bi(\d+)-(.+)$/);
  if (m) {
    const activity_type = trailingActivity(h);
    const lesson = m[2].replace(new RegExp('-' + activity_type + '$'), '');
    return { course: 'ap-csp', unit: 'bi-' + m[1], lesson, activity_type };
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
  const CYBER_NOT_IN_COURSE = new Set(['2.5']);
  m = h.match(/^ap-cyber-unit-(\d+)-exam$/);
  if (m) return { course: 'ap-cybersecurity', unit: 'unit-' + m[1], lesson: 'exam', activity_type: 'exam' };
  m = h.match(/^ap-cyber-unit-(\d+)-lesson-(\d+)/);
  if (m) {
    const lesson = m[1] + '.' + m[2];
    if (CYBER_NOT_IN_COURSE.has(lesson)) return null;
    return { course: 'ap-cybersecurity', unit: 'unit-' + m[1], lesson, activity_type: trailingActivity(h) };
  }

  return null; // unknown page, /track no-ops
}

module.exports = { pageFromHandle, trailingActivity, ACTIVITY_TOKENS,
  newId, generateClassCode, signTeacherToken, verifyTeacherToken,
  signStudentToken, verifyStudentToken, COURSES, COURSE_PREFIXES,
  isValidEmail, isValidPin, isValidClassCode, sanitize,
};
