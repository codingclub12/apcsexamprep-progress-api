'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  HAZARD BLOCKS. Injected into a compiled prompt VERBATIM, never paraphrased.
//
//  Every line here was paid for once already. Shopify reverting button colours
//  on save, mojibake from unescaped characters, &quot; inside an onclick getting
//  decoded back into a literal quote, the 64-minute edge cache tail that made
//  two live fixes look like failed writes: each is a fix that had to be
//  rediscovered because it lived in one person's head. Paraphrasing a hazard is
//  how the detail that mattered gets dropped, so the compiler concatenates these
//  strings and never rewrites them.
//
//  Constants file on purpose: editing a hazard is a one-line diff with history,
//  not a hunt through a template.
//
//  ── THIS FILE IS THE SINGLE SOURCE OF ENFORCEABLE RULES ─────────────────────
//
//  A rule that lives ONLY in a repo's CLAUDE.md reaches Claude Code and nothing
//  else. Chat and Cowork never open that repo, so for every surface the router
//  sends somewhere other than claude_code, the compiled prompt IS the rulebook.
//
//  The theme repo's CONVENTIONS.md keeps the long rationale, the story of each
//  production bug, which is worth preserving and too long to inject. The
//  enforceable one-liner belongs HERE, and `smoke/hazard-coverage.js` asserts
//  that each one is present. When CONVENTIONS.md gains a rule, add the one-liner
//  here in the same commit or the test fails.
//
//  ── COVERAGE IS TOTAL AT RUNTIME, NOT ONLY IN THE TEST ──────────────────────
//
//  Content rules hang off CONTENT_COVERAGE, which carries one row per course the
//  write guard accepts. A course with no rulebook is never silent: it is an
//  explicit `exempt` with a reason, an explicit `pending` that compiles a STOP,
//  or an unrecognised value that compiles a louder STOP. The failure this shape
//  prevents was live on 2026-08-14: `surface: content, course: cyber` compiled an
//  empty hazard array because the gate read `course === 'csa' || course === 'all'`.
//  A coverage list checked only by the smoke suite does not prevent it, because a
//  typo'd or brand new course value never appears in the suite's list either.
// ─────────────────────────────────────────────────────────────────────────────

// Shopify + theme. The first five rules came from the hazard log; the rest were
// previously only in the theme repo's CLAUDE.md, which meant surface=shopify
// (routed to CHAT, which is not in any repo) never received them. Three of those
// are the ones that caused production bugs: a live XSS, a collapsed fixed
// overlay, and sitewide CSS bleed.
//
// On the entity rule: the phrase "HTML entities only" is load-bearing. It is the
// storefront rule, and smoke/command-center.js criterion 22 greps for it
// literally. What was wrong before was that it carried no scope, so a session
// writing a script tag could follow it straight into the bug CONVENTIONS.md
// exists to prevent. It is now SCOPED rather than reworded: rewording it breaks
// criterion 22, which is how the first attempt at this patch went red.
const SHOPIFY_THEME = `Scope all CSS under one wrapper id with \`all:initial !important\`. Hardcode every colour with
\`!important\` AND \`-webkit-text-fill-color\` - Shopify reverts button and title colours on
save; re-verify after every push. \`repeat(N,1fr)\` grids, never \`auto-fit\`. Never use
\`&quot;\` inside an onclick or data attribute - the sanitizer decodes it back to a literal
quote and breaks the attribute. Storefront edge cache has a measured ~64-minute staleness
tail; a stale read is not a failed write.
Escape every untrusted value with \`element.textContent\`, never string interpolation into
innerHTML - string interpolation shipped a live XSS.
No emojis. OUTSIDE a \`<script>\` block, HTML entities only; INSIDE a \`<script>\` block use
Unicode escapes only and never entities - an entity inside a script is parsed as literal text
and breaks the script. Unescaped characters produce mojibake: a bullet becomes
a-circumflex plus euro plus cent, an emoji becomes four Latin-1 letters. Detect it
with lib/mojibake.js, never with a pasted pattern, which is how the last rule
shipped blind to the single-corruption form it was written about.)
Pure ASCII source files only.
Never put a CSS \`transform\` on an ancestor of a \`position:fixed\` element - it creates a new
containing block and collapsed a live overlay.
The theme repo is GitHub-connected to a PUBLISHED theme: a commit to the connected branch
deploys to the LIVE site. Substantive changes go on a branch behind a pull request. Before
changing any sitewide flag, list every file and line that reads or writes it and name which
pages change behaviour.`;

// Matrixify. Previously lived only in the theme repo's CLAUDE.md, while every
// Matrixify task routes to surface=shopify -> CHAT, which never reads it. These
// are the settings that destroy content silently rather than erroring.
const MATRIXIFY = `MERGE mode, QUOTE_ALL quoting, \`utf-8-sig\` encoding, past-dated Published At (use
\`2026-03-01\`, never \`now()\`). One import at a time. Omit the Body HTML column entirely
unless that row is a body update - an empty Body HTML value wipes the live page rather than
leaving it unchanged. Redirects CSVs carry Command, Path and Target only, and every Target
must be verified 200 before the row is written.`;

const API = `Additive migrations only. Match existing patterns in \`db.js\` and \`server.js\` - no new
migration framework, ORM, or router style. Zero-PII posture: no emails, no free-text
student input stored anywhere. Railway is 1 vCPU / 1GB with a prior $169 leak.`;

const CONTENT_CSA = `AP CSA 2025-2026 **4-unit** structure only. Source of truth is
\`ap-computer-science-a-course-and-exam-description__1_.pdf\`. Never use the older
curriculum reference file - its topic numbers are wrong. Removed: inheritance,
polymorphism, \`extends\`/\`super\`, interfaces, writing recursion. In: File/Scanner (4.14),
recursion TRACING only (4.16), data sets (4.15). FRQ 3 is ArrayList only.`;

// AP Cybersecurity. Previously had NO hazard block at all: hazardsFor() gated the
// content block on course csa/all, so every cyber content task compiled a prompt
// with zero curriculum guardrails, on the largest active build track, ahead of
// the national launch.
const CONTENT_CYBER = `AP Cybersecurity source of truth is \`ap-cybersecurity-course-and-exam-description.pdf\`.
Never the older framework PDF - its lesson numbering does not match. Verified Unit 1 titles:
1.1 Understanding Social Engineering, 1.2 Suspicious Website Logins, 1.3 Best Practices for
Public Networks, 1.4 AI-Based Cybersecurity Attacks, 1.5 Leveraging AI in Cyber Defense.
Speaker notes stay in student-addressed voice: the same notes are the single source for BOTH
the teacher bundle and the video narration, so a teacher-directed instruction written into
them has to be removed twice. Teacher Bundle decks carry no prescriptive teacher instructions
(timing banners, cold-call directives, "yesterday/tomorrow" pacing language).`;

// AP CSP. Structural facts only. Course-specific content rules are thinner here
// than for CSA and cyber; extend this block as they get paid for, rather than
// guessing them now. Flagged `review` in the table below because it came from the
// CED rather than from practice, which is a weaker source than every other block
// in this file.
const CONTENT_CSP = `AP CSP source of truth is \`ap-computer-science-principles-course-and-exam-description.pdf\`.
Organise by Big Idea, not by unit number: BI1 Creative Development, BI2 Data, BI3 Algorithms
and Programming, BI4 Computer Systems and Networks, BI5 Impact of Computing. Pseudocode
follows the College Board exam reference sheet exactly - never Java or Python syntax in an
exam-facing item.`;

// Intro to Java with Greenfoot. Source of truth is the course spec in this repo,
// not a College Board document: this is our own course and there is no CED for
// it. The rules below are the ones that have an actual failure behind them, so
// this is a `block` rather than a `pending` from the day authoring starts.
const CONTENT_INTRO_JAVA = `Intro to Java source of truth is \`docs/intro-java-course-spec.md\` in the
progress-api repo. There is NO College Board document for this course - it is ours - so never
cite a CED for it and never import AP CSA unit numbering into it. Course slug is \`intro-java\`,
class codes are JAVA-XXXX, and the 6 units run Meet Greenfoot / Variables, Decisions and Input /
Methods, Worlds and Constructors / Loops and Collections of Actors / Arrays / 2D Arrays and Tile
Maps. 42 lessons, six projects, ending at 2D array tile mapping.

GREENFOOT CANNOT RUN IN JUDGE0. There is no Greenfoot runtime and no graphical world in the
sandbox. Any exercise whose grading needs a running scenario is NOT auto-gradable, and writing
one anyway ships a lesson that silently cannot score. The three auto-graded formats are: \`cfu\`
(concept-check widgets), \`gap\` (pre-written code with holes, graded server-side against a hidden
key), and \`code\` (a pure-logic method run headless against the stub in \`lib/greenfoot-stub.js\`).
The unit project is built on the desktop, is teacher-scored, and gets NO manifest row.

Answer keys and gap keys live SERVER-SIDE and never ship to the browser, same as the quiz banks.
A key in the page is not a key.

NEVER STORE STUDENT FREE TEXT. A filled-in gap is student-typed text: grade it in transit and
discard it. What persists is per-hole booleans only, \`[{"h":1,"ok":true}]\`. This is not a
preference, it is the zero-PII posture the whole product rests on, and "just for diagnostics" is
how it gets broken.

A code exercise may only use the Greenfoot API surface the stub implements, and only syntax the
student has already met - each recipe and exercise names the unit that makes it available.
Teaching \`[row][col]\` order explicitly is a Unit 6 requirement, not an aside: row-major versus
\`[x][y]\` is the single most common wrong mental model students carry out of a tile-map unit.`;

// AP Networking. The structure below is not authored here: it is READ OFF the
// shipped configuration, so it cannot drift from what students actually see.
//   unit labels, topic lists, activity types  -> COURSES in utils.js
//   graded shape, points, item ids            -> scripts/seed-manifest.js
// Both are cited in the block so a reader can check rather than trust.
//
// Still not recorded, and still not guessed: terminology and notation
// conventions, and whether a College Board document governs this course the way
// a CED governs CSA and CSP. The block says so rather than inventing either.
const CONTENT_NETWORKING = `AP Networking is FOUR units and TWENTY-TWO topics. Unit 1 Managing My Connections (1.1-1.4),
Unit 2 Managing My Shared Connections (2.1-2.6), Unit 3 Managing Many Connections (3.1-3.6),
Unit 4 Managing Our Global Connections (4.1-4.6). Unit labels and topic lists come from
\`COURSES\` in \`utils.js\`, which is what the visit denominators are generated from - read it
there rather than retyping a title from memory. Activities are \`lesson\`, \`cfu\` and \`quiz\`
ONLY: there is no \`gap\` and no \`code\` on this course, unlike Intro to Java.

Authored content (labs, exam blueprints, banks) lives in the COURSE REPO, not here:
\`labs/labs.yaml\` and \`exams/blueprints.yaml\`. This repo holds the manifest that grades it.

The graded shape, from \`scripts/seed-manifest.js\`, uniform across all 22 topics: ONE cfu per
topic and its item id ends \`-cfu-2\`, not \`-cfu-1\`; one topic quiz worth 8. Unit tests are
\`{n}-test\` with lesson_id \`test-{n}\`, worth 16 for Unit 1 and 24 for Units 2-4. Four browser
labs, \`lab-1\` to \`lab-4\`, one per unit, 8 checkpoints at one point each. Exams are
\`exam-midterm\` 40, \`exam-practice-pilot\` 40, \`exam-final\` 50. Multiple choice is the only
auto-graded section; free response is scored offline against the performance-task rubrics.

LESSON_ID IS A CONTRACT, NOT A LABEL. \`POST /api/progress/attempt\` 400s a submission whose
lesson_id disagrees with its manifest row. For labs and exams the lesson_id EQUALS the item id,
which is why the widget derives one from the other. Change one side without the other and every
lab grade is silently dropped: the submission is rejected, the student sees nothing, and the
cell stays empty.

NEVER ADD AN UNGRADED THING TO THE MANIFEST. The baseline diagnostic is deliberately absent: it
runs in week 1 before any instruction and is not graded for marks, so seeding it would put 20
points nobody can yet earn into every denominator on every dashboard. Content existing in a repo
is not the same fact as a student being able to open it, and \`smoke/manifest-prune.js\` exists
to catch exactly that.

VISIT DENOMINATORS LIST ALL 22 TOPICS ON PURPOSE, including ones whose pages are not live, so
they do not move under students who have already started. Do not "tidy" them down to what has
shipped.

NOT RECORDED YET, so ask rather than infer: terminology and notation conventions, which titles
get gotten wrong in practice, and whether a College Board document governs this course the way a
CED governs CSA and CSP. Do not import AP Cybersecurity's structure or a general networking
layer model to fill that gap.

Speaker notes stay in student-addressed voice: the same notes are the single source for BOTH the
teacher bundle and the video narration, so a teacher-directed instruction written into them has
to be removed twice. Teacher Bundle decks carry no prescriptive teacher instructions (timing
banners, cold-call directives, "yesterday/tomorrow" pacing language). The teacher bundle SKU is
\`APNET-TEACHER-BUNDLE\`, Units 1-4.

Answer keys and quiz banks live SERVER-SIDE and never ship to the browser. A key in the page is
not a key.

NEVER STORE STUDENT FREE TEXT. Grade it in transit and discard it; what persists is option
indices and booleans only. This is the zero-PII posture the whole product rests on, and "just
for diagnostics" is how it gets broken.`;

const MCQ = `Harder only. Priority: spot-the-error, then I/II/III multi-correct. No giveaway variable
names. Bold NOT/EXCEPT/ALWAYS/NEVER in the stem. No all-of-the-above or none-of-the-above.
Distractors parallel in length, complexity, and grammatical structure. Balanced key ~25%
per letter, no 3 consecutive identical, no letter above 35%. Predict-first is default OFF -
only on explicit request, only on scenario or applied items.`;

// ── Content coverage table ───────────────────────────────────────────────────
//  Exactly one disposition per course:
//    block   - a rulebook exists and gets injected
//    pending - no rulebook yet, and that is a STOP, not a shrug
//    exempt  - deliberately no rulebook, with a reason someone can argue with
//    fanout  - 'all', which pulls in every non-exempt course
//
//  Adding a course to lib/command-write.js COURSES without adding a row here is
//  a smoke failure, by design.
//
//  networking is PENDING and not exempt, on purpose. It is SHIPPED. "Exempt"
//  claims nothing is being authored against a course, which is false here, so a
//  content task on networking has to stop rather than proceed unguarded.
const CONTENT_COVERAGE = {
  csa: {
    title: 'AP CSA content',
    block: CONTENT_CSA,
  },
  csp: {
    title: 'AP CSP content',
    block: CONTENT_CSP,
    review: 'Written from the CED, not from practice, and thinner than CSA and cyber by '
      + 'admission. Extend it as rules get paid for rather than guessing them.',
  },
  cyber: {
    title: 'AP Cybersecurity content',
    block: CONTENT_CYBER,
  },
  networking: {
    title: 'AP Networking content',
    block: CONTENT_NETWORKING,
    review: 'Structure and graded shape are READ from utils.js COURSES and '
      + 'scripts/seed-manifest.js, so they cannot drift from what ships. Still missing and '
      + 'deliberately not guessed: terminology and notation conventions, which titles get '
      + 'gotten wrong, and whether a College Board document governs this course.',
  },
  'intro-java': {
    title: 'Intro to Java with Greenfoot content',
    block: CONTENT_INTRO_JAVA,
  },
  // Alias. Tasks created before the course was named 'intro-java' carry
  // course='greenfoot', and they must compile the same rulebook rather than
  // falling through to unknownCourseBlock. Prefer 'intro-java' on new tasks.
  greenfoot: {
    title: 'Intro to Java with Greenfoot content',
    block: CONTENT_INTRO_JAVA,
  },
  all: {
    title: 'All courses',
    fanout: true,
  },
};

const KNOWN_COURSES = Object.keys(CONTENT_COVERAGE);

// Fan-out order for course=all. Exempt courses are excluded: 'all' means every
// course that has something to say, including the ones that say "stop".
// intro-java is in the fan-out; its alias 'greenfoot' deliberately is not, or
// course=all would compile the same rulebook twice.
const FANOUT_ORDER = ['csa', 'csp', 'cyber', 'networking', 'intro-java'];

function pendingBlock(course, reason) {
  return `STOP. This is content work on ${course}, and there are no curriculum guardrails for
${course} in \`lib/command-hazards.js\` yet. ${reason}
Do not fill the gap from memory and do not infer it from another course. Ask Tanner for the
source-of-truth document, add the block, then recompile this prompt. Curriculum written
without a rulebook is unreviewed curriculum that ships to students.`;
}

function unknownCourseBlock(course) {
  return `STOP. Course "${course}" has no row in CONTENT_COVERAGE, so this prompt carries zero
curriculum guardrails. Add an explicit row in \`lib/command-hazards.js\` - a rules block, a
\`pending\` marker, or an \`exempt\` with a reason - before doing content work on it.`;
}

const MISSING_COURSE = `STOP. This is content work with no \`course\` set, so no curriculum rulebook could be
selected and this prompt carries zero content guardrails. Set \`course\` on the task and
recompile the prompt before writing anything.`;

// Returns the content hazard blocks for a course. Never returns an empty array
// except for a deliberately exempt course.
function contentHazardsFor(rawCourse) {
  const course = String(rawCourse || '').trim().toLowerCase();
  if (!course) return [{ title: 'Content, no course set', body: MISSING_COURSE }];

  const entry = CONTENT_COVERAGE[course];
  if (!entry) return [{ title: `Content, unknown course "${course}"`, body: unknownCourseBlock(course) }];

  if (entry.fanout) {
    const out = [];
    for (const c of FANOUT_ORDER) out.push(...contentHazardsFor(c));
    return out;
  }
  if (entry.block) return [{ title: entry.title, body: entry.block }];
  if (entry.pending) {
    return [{ title: `${entry.title} - NO RULEBOOK YET`, body: pendingBlock(course, entry.pending) }];
  }
  return []; // exempt, on purpose, with a reason recorded in the table
}

// Reports how a course is covered without compiling anything.
function contentCoverageFor(rawCourse) {
  const course = String(rawCourse || '').trim().toLowerCase();
  if (!course) return 'missing';
  const entry = CONTENT_COVERAGE[course];
  if (!entry) return 'unknown';
  if (entry.fanout) return 'fanout';
  if (entry.block) return 'covered';
  if (entry.pending) return 'pending';
  if (entry.exempt) return 'exempt';
  return 'unknown';
}

// ── MCQ signals ──────────────────────────────────────────────────────────────
//  Split into strong and weak. A strong signal is language that only appears
//  when someone is writing items, and it fires on any surface. A weak signal is
//  the bare acronym, which is also a PRODUCT NAME here: task 70 is the
//  "Spring 2026 MCQ Bootcamp", a storefront page, and it was picking up six
//  lines of distractor-writing rules it had no use for.
//
//  Still blunt in the direction that matters. The weak signal fires everywhere
//  except where the acronym is clearly naming a product on a surface that sells
//  rather than authors. A false positive costs six lines of prompt; a false
//  negative costs a question bank with giveaway variable names and a lopsided
//  answer key.
const MCQ_STRONG = /\b(multiple[- ]choice|question bank|quiz bank|distractors?|item writing|practice questions|question stem)\b/i;
const MCQ_WEAK = /\b(mcqs?)\b/i;
const MCQ_PRODUCT = /\bmcqs?[- ]?(bootcamp|bundle|pack|camp|workshop|webinar|course|class|program|cohort|series|session|drop|launch|promo|sale)\b/i;
const MCQ_PRODUCT_SURFACES = new Set(['shopify', 'theme', 'klaviyo', 'drive']);

// Kept for backwards compatibility with callers that imported the single regex.
// hazardsFor no longer uses it; MCQ_STRONG and MCQ_WEAK are the live rule. This
// pattern is why task 70 was over-injected: a bare `mcq`, and a bare `stem` that
// also matches "STEM".
const MCQ_SIGNALS = /\b(mcq|mcqs|multiple[- ]choice|question bank|quiz bank|distractor|distractors|stem|item writing|practice questions)\b/i;

// Same reasoning for imports. A false positive costs five lines; a false negative
// costs a wiped page body, and the wipe is silent - Matrixify reports success.
const MATRIXIFY_SIGNALS = /\b(matrixify|csv import|import csv|bulk import|redirects? csv|published at|body html)\b/i;

function wantsMcqBlock(text, surface) {
  if (MCQ_STRONG.test(text)) return true;
  if (!MCQ_WEAK.test(text)) return false;
  if (MCQ_PRODUCT.test(text) && MCQ_PRODUCT_SURFACES.has(surface)) return false;
  return true;
}

// Page bodies ship through Matrixify and Matrixify work is tagged surface=shopify,
// so the surface alone is enough to earn the block. The signal test is the second
// door, for a content task that ends in an import without ever being retagged.
function wantsMatrixifyBlock(text, surface) {
  return surface === 'shopify' || MATRIXIFY_SIGNALS.test(text);
}

// Which blocks apply to a task. Returns [{ title, body }] in injection order.
function hazardsFor(task) {
  const surface = String(task.surface || '').trim().toLowerCase();
  const course = String(task.course || '').trim().toLowerCase();
  const text = `${task.title || ''} ${task.detail || ''}`;
  const out = [];

  if (surface === 'shopify' || surface === 'theme') {
    out.push({ title: 'Shopify / theme', body: SHOPIFY_THEME });
  }
  if (surface === 'api') {
    out.push({ title: 'API', body: API });
  }
  if (surface === 'content') {
    out.push(...contentHazardsFor(course));
  }
  if (wantsMatrixifyBlock(text, surface)) {
    out.push({ title: 'Matrixify import', body: MATRIXIFY });
  }
  if (wantsMcqBlock(text, surface)) {
    out.push({ title: 'MCQ writing', body: MCQ });
  }
  return out;
}

// Back-compat views over the coverage table, for callers written against the
// earlier two-constant shape. Derived, never edited by hand.
const CONTENT_BY_COURSE = Object.fromEntries(
  Object.entries(CONTENT_COVERAGE)
    .filter(([, e]) => e.block)
    .map(([course, e]) => [course, { title: e.title, body: e.block }]),
);
const CONTENT_COURSES_WITHOUT_HAZARDS = Object.entries(CONTENT_COVERAGE)
  .filter(([, e]) => e.exempt)
  .map(([course]) => course);

module.exports = {
  hazardsFor,
  contentHazardsFor,
  contentCoverageFor,
  CONTENT_COVERAGE,
  KNOWN_COURSES,
  FANOUT_ORDER,
  SHOPIFY_THEME,
  MATRIXIFY,
  API,
  CONTENT_CSA,
  CONTENT_CSP,
  CONTENT_NETWORKING,
  CONTENT_CYBER,
  MCQ,
  MCQ_SIGNALS,
  MCQ_STRONG,
  MCQ_WEAK,
  MCQ_PRODUCT,
  MATRIXIFY_SIGNALS,
  MISSING_COURSE,
  pendingBlock,
  unknownCourseBlock,
  CONTENT_BY_COURSE,
  CONTENT_COURSES_WITHOUT_HAZARDS,
};
