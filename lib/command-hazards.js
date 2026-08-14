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
//  COVERAGE IS TABLE-DRIVEN AND TOTAL. Content rules hang off CONTENT_COVERAGE,
//  which must carry an entry for every course the write guard accepts. A course
//  with no rulebook is never silent: it is either an explicit `exempt` with a
//  reason, an explicit `pending` that compiles a STOP block, or an unknown value
//  that compiles a louder STOP block. The failure this shape exists to prevent is
//  the one that was live on 2026-08-14: `surface: content, course: cyber` compiled
//  with an empty hazard array, on the largest active build track, because the old
//  gate read `course === 'csa' || course === 'all'`.
// ─────────────────────────────────────────────────────────────────────────────

const SHOPIFY_THEME = `Scope all CSS under one wrapper id with \`all:initial !important\`. Hardcode every colour with
\`!important\` AND \`-webkit-text-fill-color\` - Shopify reverts button and title colours on
save; re-verify after every push. No emojis, HTML entities only (\`•\` / \`ðŸŽ¯\` mojibake is
what unescaped characters produce) - but NEVER an HTML entity inside a \`<script>\` block.
A script sees the literal characters \`&quot;\`, not a quote, and the statement breaks; that
is the one place the entity rule inverts. Theme files stay pure ASCII. \`repeat(N,1fr)\`
grids, never \`auto-fit\`. Never use \`&quot;\` inside an onclick or data attribute - the
sanitizer decodes it back to a literal quote and breaks the attribute. Write injected text
with \`element.textContent\`, never string interpolation into \`innerHTML\` - interpolating a
value into markup shipped a live XSS once already. Never put a CSS \`transform\` on an
ancestor of a \`position: fixed\` element - the transform becomes the containing block and
the fixed overlay collapses. Storefront edge cache has a measured ~64-minute staleness
tail; a stale read is not a failed write.`;

// Matrixify is how page bodies actually ship, and its rules used to live only in
// the theme repo's CLAUDE.md. Matrixify work is `surface: shopify`, which the
// router sends to chat, and chat is not in a repo, so it never read that file.
// These rules reached zero prompts until this block existed.
const MATRIXIFY = `Matrixify CSV import. The command column is MERGE, never REPLACE. Quote with QUOTE_ALL.
\`Published At\` must be a past date. An empty \`Body HTML\` cell does not mean "leave this
page alone" - it WIPES the page body. Never ship a column you did not intend to write.`;

const API = `Additive migrations only. Match existing patterns in \`db.js\` and \`server.js\` - no new
migration framework, ORM, or router style. Zero-PII posture: no emails, no free-text
student input stored anywhere. Railway is 1 vCPU / 1GB with a prior $169 leak.`;

const CONTENT_CSA = `AP CSA 2025-2026 **4-unit** structure only. Source of truth is
\`ap-computer-science-a-course-and-exam-description__1_.pdf\`. Never use the older
curriculum reference file - its topic numbers are wrong. Removed: inheritance,
polymorphism, \`extends\`/\`super\`, interfaces, writing recursion. In: File/Scanner (4.14),
recursion TRACING only (4.16), data sets (4.15). FRQ 3 is ArrayList only.`;

// DRAFT. Written from the CED rather than from production practice, which is a
// different and weaker source than every other block in this file. Flagged
// `review` in the table below so the injected title says so out loud.
const CONTENT_CSP = `DRAFT BLOCK, not yet reviewed against practice. Verify against the CSP CED before
relying on any line here, and correct the block rather than working around it.
AP CSP is five Big Ideas: 1 Creative Development, 2 Data, 3 Algorithms and Programming,
4 Computer Systems and Networks, 5 Impact of Computing. Exam pseudocode is the College
Board reference sheet, NOT Java: assignment is a left arrow, lists are 1-INDEXED (Java
arrays are 0-indexed, and mixing the two is the easiest authoring error to ship), MOD not
\`%\`, DISPLAY and INPUT, PROCEDURE for definitions, RANDOM(a,b) inclusive at both ends.
CSP is language agnostic - never present a language-specific answer as the CSP answer.`;

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
//    fanout  - 'all', which pulls in every non-exempt course block
//
//  Adding a course to lib/command-write.js COURSES without adding a row here is
//  a smoke failure, by design. That is the whole point of the table.
const CONTENT_COVERAGE = {
  csa: {
    title: 'AP CSA content',
    block: CONTENT_CSA,
  },
  csp: {
    title: 'AP CSP content (DRAFT, unreviewed)',
    block: CONTENT_CSP,
    review: 'Written from the CED, not from practice. Needs a pass from Tanner.',
  },
  cyber: {
    title: 'AP Cybersecurity content',
    pending: 'Largest active build track, ahead of a national launch, and it has no rulebook '
      + 'in this file. Needed before content work: the source-of-truth document, any superseded '
      + 'document that must never be cited, and anything that has already bitten in production.',
  },
  networking: {
    title: 'AP Networking content',
    pending: 'Shipped and unguarded. Needed before content work: the source-of-truth document, '
      + 'any superseded document, lesson titles that get gotten wrong, and notation or '
      + 'terminology conventions.',
  },
  greenfoot: {
    title: 'Greenfoot content',
    exempt: 'No active authoring track, so no rulebook is maintained. If Greenfoot content '
      + 'work restarts, this row becomes a pending or a block before the first task compiles.',
  },
  all: {
    title: 'All courses',
    fanout: true,
  },
};

const KNOWN_COURSES = Object.keys(CONTENT_COVERAGE);

// Courses that fan out under course=all, in injection order. Exempt courses are
// excluded: 'all' means every course that has something to say.
const FANOUT_ORDER = ['csa', 'csp', 'cyber', 'networking'];

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

// Reports how a course is covered without compiling anything. Used by the smoke
// suite and safe for a caller that wants to reason about coverage.
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
//  Split into strong and weak on purpose. A strong signal is language that only
//  appears when someone is writing items, and it fires on any surface. A weak
//  signal is the bare acronym, which is also a PRODUCT NAME here: task 70 is the
//  "Spring 2026 MCQ Bootcamp", a storefront page, and it was picking up six lines
//  of distractor-writing rules it had no use for.
//
//  Still blunt in the direction that matters: the weak signal fires everywhere
//  except where the acronym is clearly naming a product. A false positive costs
//  six lines of prompt; a false negative costs a question bank with giveaway
//  variable names and a lopsided answer key.
const MCQ_STRONG = /\b(multiple[- ]choice|question bank|quiz bank|distractors?|item writing|practice questions|question stem)\b/i;
const MCQ_WEAK = /\b(mcqs?)\b/i;
// The acronym followed by a product noun is a listing, not an authoring task.
const MCQ_PRODUCT = /\bmcqs?[- ]?(bootcamp|bundle|pack|camp|workshop|webinar|course|class|program|cohort|series|session|drop|launch|promo|sale)\b/i;
// Storefront and marketing surfaces do not author items; content and ops do.
const MCQ_PRODUCT_SURFACES = new Set(['shopify', 'theme', 'klaviyo', 'drive']);

// Kept for backwards compatibility with callers that imported the single regex.
// hazardsFor no longer uses it; MCQ_STRONG and MCQ_WEAK are the live rule.
const MCQ_SIGNALS = /\b(mcq|mcqs|multiple[- ]choice|question bank|quiz bank|distractor|distractors|stem|item writing|practice questions)\b/i;

function wantsMcqBlock(text, surface) {
  if (MCQ_STRONG.test(text)) return true;
  if (!MCQ_WEAK.test(text)) return false;
  // Weak signal only. Suppress it when the acronym is naming a product on a
  // surface that sells things rather than writes them.
  if (MCQ_PRODUCT.test(text) && MCQ_PRODUCT_SURFACES.has(surface)) return false;
  return true;
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
  // Page bodies ship through Matrixify, and Matrixify work routes to chat, which
  // reads no repo. This is the only place those rules reach the prompt.
  if (surface === 'shopify') {
    out.push({ title: 'Matrixify import', body: MATRIXIFY });
  }
  if (surface === 'api') {
    out.push({ title: 'API', body: API });
  }
  if (surface === 'content') {
    out.push(...contentHazardsFor(course));
  }
  if (wantsMcqBlock(text, surface)) {
    out.push({ title: 'MCQ writing', body: MCQ });
  }
  return out;
}

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
  MCQ,
  MCQ_SIGNALS,
  MCQ_STRONG,
  MCQ_WEAK,
  MCQ_PRODUCT,
  MISSING_COURSE,
  pendingBlock,
  unknownCourseBlock,
};
