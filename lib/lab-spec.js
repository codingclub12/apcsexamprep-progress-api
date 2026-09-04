'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LAB SPEC LOADER. Authored terminal labs, read once at boot.
//
//  A lab is a JSON file in config/labs/: a brief, one or more pretend hosts with
//  a pretend filesystem, an optional set of multiple choice questions, and a
//  list of checks. Each check is worth one point and matches an EVENT the
//  player emits (a command run, a file read, a transfer, a question answered).
//
//  WHY A SPEC FILE AND NOT A PAGE
//  The lab is delivered by this API and graded by the browser, so exactly one
//  artifact has to describe it. Anything that lived in two places (points here,
//  checks in the page) would drift, and a lab whose points disagree with its
//  manifest row marks a whole class down out of the wrong denominator. The
//  manifest row is generated FROM this file for that reason, and validate()
//  refuses a spec whose points do not equal its check count.
//
//  WHAT IS IN THE FILE THE BROWSER GETS
//  Everything, answer keys included. That is deliberate and it is not the weak
//  link: the score is computed in the browser either way, so a student who
//  wanted to forge one would post a number to /api/progress/attempt and never
//  open the lab at all. Hiding the key would cost the offline check feedback and
//  buy nothing. What the key protects is the STUDENT'S TYPING, which never
//  leaves the page. See docs/lab-contract.md.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const LAB_DIR = path.join(__dirname, '..', 'config', 'labs');

// (course|item_id) -> spec. Built once, bounded by the number of authored labs.
const LABS = new Map();
const LOAD_ERRORS = [];

function key(course, itemId) { return `${course}|${itemId}`; }

const ID = /^[a-z0-9][a-z0-9._-]{0,60}$/i;

/**
 * Validate one spec. Returns an array of problem strings; empty means good.
 * Exported so the smoke suite checks the same rules the loader enforces,
 * rather than a second copy of them.
 */
function validate(spec, label) {
  const p = [];
  const at = label || (spec && spec.item_id) || 'spec';
  if (!spec || typeof spec !== 'object') return [`${at}: not an object`];

  for (const f of ['course', 'item_id', 'lesson_id', 'unit', 'title']) {
    if (typeof spec[f] !== 'string' || !spec[f]) p.push(`${at}: ${f} is required`);
  }
  //  TERMINAL-LAB, NOT LAB, AND THE RENAME IS THE WHOLE POINT.
  //
  //  These specs used to declare item_type 'lab', which is also what the cyber
  //  per-lesson labs are called in course_denominators. Both live on the same
  //  lesson id, and denominatorMap keys on (lesson, activity_type), so the two
  //  collided on one key. Measured 2026-09-04: grading the Topic 1.2 terminal
  //  lab moved that lesson's lab denominator from 30 to 8, because the manifest
  //  write lands after the authored one and OVERWRITES rather than sums.
  //
  //  A simulated shell is not the same activity as the lab widget on a lesson
  //  page, so it gets its own native name. gradebook-contract maps it back to
  //  canonical 'lab' for display; only the denominator key changes. Same shape
  //  as the 'debug' extension of 2026-09-01, for the same reason.
  if (spec.item_type !== 'terminal-lab') p.push(`${at}: item_type must be 'terminal-lab'`);
  if (spec.item_id && !ID.test(spec.item_id)) p.push(`${at}: item_id '${spec.item_id}' is not a safe id`);
  if (spec.course && !ID.test(spec.course)) p.push(`${at}: course '${spec.course}' is not a safe id`);
  if (typeof spec.graded !== 'boolean') p.push(`${at}: graded must be true or false, stated explicitly`);

  const checks = Array.isArray(spec.checks) ? spec.checks : null;
  if (!checks || !checks.length) {
    p.push(`${at}: at least one check is required`);
  } else {
    // Points ARE the check count. One check, one point, no exceptions: it is
    // what makes a partially finished lab legible as "5 of 8 steps" rather than
    // as a percentage nobody can act on.
    if (spec.points !== checks.length) {
      p.push(`${at}: points is ${spec.points} but there are ${checks.length} checks. One check is one point.`);
    }
    checks.forEach((c, i) => {
      if (c.n !== i + 1) p.push(`${at}: check ${i + 1} has n=${c.n}. Checks are numbered 1..N in order.`);
      if (typeof c.label !== 'string' || !c.label) p.push(`${at}: check ${c.n} has no label`);
      const m = c.match;
      if (!m || typeof m !== 'object') { p.push(`${at}: check ${c.n} has no match`); return; }
      if (!EVENTS.has(m.event)) p.push(`${at}: check ${c.n} matches unknown event '${m.event}'`);
      if (m.event === 'answer') {
        const q = (spec.questions || []).find((x) => x.id === m.question);
        if (!q) p.push(`${at}: check ${c.n} answers question '${m.question}', which is not in questions`);
      }
      if (m.host && !(spec.hosts || {})[m.host]) {
        p.push(`${at}: check ${c.n} names host '${m.host}', which is not in hosts`);
      }
      if (m.after != null && !(Number.isInteger(m.after) && m.after >= 1 && m.after < c.n)) {
        p.push(`${at}: check ${c.n} has after=${m.after}. It must name an EARLIER check.`);
      }
    });
  }

  (spec.questions || []).forEach((q) => {
    if (!q.id || !ID.test(q.id)) p.push(`${at}: question id '${q.id}' is not a safe id`);
    if (!Array.isArray(q.options) || q.options.length < 2) p.push(`${at}: question '${q.id}' needs at least two options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length) {
      p.push(`${at}: question '${q.id}' has no valid answer index`);
    }
  });

  const hosts = spec.hosts && typeof spec.hosts === 'object' ? spec.hosts : null;
  if (!hosts || !hosts.local) {
    p.push(`${at}: a 'local' host is required`);
  } else {
    for (const [name, h] of Object.entries(hosts)) {
      if (!h || typeof h.fs !== 'object' || !h.fs) { p.push(`${at}: host '${name}' has no fs`); continue; }
      const roots = Object.keys(h.fs);
      if (roots.length !== 1 || !roots[0].startsWith('/')) {
        p.push(`${at}: host '${name}' fs must have exactly one absolute root path`);
      }
      if (typeof h.cwd !== 'string' || !h.cwd.startsWith(roots[0] || '/')) {
        p.push(`${at}: host '${name}' cwd must sit inside its fs root`);
      }
    }
  }

  // The reference solution. Optional in shape, required in practice: the smoke
  // suite plays it and fails the build if it does not tick every check.
  if (spec.solution != null) {
    if (!Array.isArray(spec.solution) || !spec.solution.length) {
      p.push(`${at}: solution must be a non-empty array of steps`);
    } else {
      spec.solution.forEach((step, i) => {
        if (typeof step === 'string') return;
        if (step && typeof step === 'object' && typeof step.answer === 'string') {
          const q = (spec.questions || []).find((x) => x.id === step.answer);
          if (!q) p.push(`${at}: solution step ${i + 1} answers unknown question '${step.answer}'`);
          return;
        }
        p.push(`${at}: solution step ${i + 1} must be a command string or {"answer":"<question id>"}`);
      });
    }
  }

  // The Shopify page this lab ships on. Optional only in the sense that a lab
  // can exist before its page does; scripts/lab-pages-csv.js refuses to build a
  // sheet for a lab without one, and a hub link is generated from it, so the
  // link and the page can never name different handles.
  if (spec.page_handle != null && !/^[a-z0-9-]+$/.test(spec.page_handle)) {
    p.push(`${at}: page_handle '${spec.page_handle}' is not a clean slug`);
  }
  if (spec.seo_description != null) {
    const d = String(spec.seo_description);
    if (d.length < 70 || d.length > 160) p.push(`${at}: seo_description is ${d.length} chars, must be 70 to 160`);
  }

  if (spec.est_minutes != null && !(Number.isInteger(spec.est_minutes) && spec.est_minutes > 0)) {
    p.push(`${at}: est_minutes must be a positive integer`);
  }
  return p;
}

// Event kinds a check may match. Kept here so validate() and the player cannot
// drift: the player emits exactly these and nothing else.
const EVENTS = new Set(['cmd', 'read', 'help', 'sftp-open', 'transfer', 'answer']);

function load() {
  LABS.clear();
  LOAD_ERRORS.length = 0;
  let files = [];
  try {
    files = fs.readdirSync(LAB_DIR).filter((f) => f.endsWith('.json')).sort();
  } catch (e) {
    return; // no lab directory is a course with no labs, not a boot failure
  }
  for (const f of files) {
    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(path.join(LAB_DIR, f), 'utf8'));
    } catch (e) {
      LOAD_ERRORS.push(`${f}: ${e.message}`);
      continue;
    }
    const problems = validate(spec, f);
    if (problems.length) { LOAD_ERRORS.push(...problems); continue; }
    const k = key(spec.course, spec.item_id);
    if (LABS.has(k)) { LOAD_ERRORS.push(`${f}: duplicate lab ${k}`); continue; }
    spec._file = f;
    LABS.set(k, spec);
  }
  // A malformed lab must be loud. It is author content, it is caught by the
  // smoke suite before it ships, and a lab that silently does not exist is a
  // student staring at a blank page with no way to say why.
  if (LOAD_ERRORS.length) {
    console.error('[labs] %d spec problem(s):\n  %s', LOAD_ERRORS.length, LOAD_ERRORS.join('\n  '));
  }
}

load();

function get(course, itemId) { return LABS.get(key(course, itemId)) || null; }
function all() { return Array.from(LABS.values()); }
function graded() { return all().filter((s) => s.graded); }
function errors() { return LOAD_ERRORS.slice(); }

/** The listing shape: enough to build an index, not the whole filesystem. */
function summary(spec) {
  return {
    course: spec.course,
    item_id: spec.item_id,
    lesson_id: spec.lesson_id,
    unit: spec.unit,
    title: spec.title,
    points: spec.points,
    checks: spec.checks.length,
    graded: !!spec.graded,
    est_minutes: spec.est_minutes || null,
    url: `/lab/${spec.course}/${spec.item_id}`,
    page_handle: spec.page_handle || null,
  };
}

/** What the browser receives. Drops loader bookkeeping and the author comment. */
// What the player is served. `solution` is dropped: the player never reads it
// (it walks the student's own commands against `checks`), and smoke/labs.js
// reads it off disk, so serving it only handed every visitor a ready-made
// walkthrough. `answer` and `explain` still ship, and have to: the questions
// are graded in the page. See lib/lab-answer-key.js for what that means for
// the teacher key.
const NOT_FOR_BROWSER = new Set(['_comment', '_file', 'solution']);

function forBrowser(spec) {
  const out = {};
  for (const [k, v] of Object.entries(spec)) {
    if (NOT_FOR_BROWSER.has(k)) continue;
    out[k] = v;
  }
  return out;
}

module.exports = { get, all, graded, errors, summary, forBrowser, validate, load, LAB_DIR };
