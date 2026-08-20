'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  STUDENT CODE SANDBOX. Mount:  app.use('/api/sandbox', require('./routes/sandbox'));
//
//  Free practice space: multi class Java for AP CSA, single file Python or
//  JavaScript for the AP CSP Create Task. Nothing here is graded, nothing here
//  reaches the gradebook, and no manifest item is involved. That separation is
//  the point: a sandbox that could write a score would be an ungraded activity
//  that silently is one.
//
//  ── WHAT THIS ROUTE DOES AND DOES NOT DO ───────────────────────────────────
//  It stores programs and it assembles them. It never calls Judge0. The page
//  posts the assembled source to /api/judge0/run itself, for one reason worth
//  stating: that proxy rate limits per CLIENT identity, and a server side hop
//  would put every student in the country behind this box's own address. One
//  runaway student would then throttle everyone, and the per identity ceiling
//  would stop meaning anything. Two round trips is the cheaper mistake.
//
//  The Judge0 subsystem is untouched by this feature, per CLAUDE.md. The
//  sandbox uses the language ids already allow-listed there (62 Java, 71
//  Python, 63 JavaScript) and the run limits already in force.
//
//  ── STORING STUDENT WRITTEN TEXT ────────────────────────────────────────────
//  This is the one place in the codebase that persists free text a student
//  typed, and it is a deliberate exception approved for this feature rather
//  than a drift away from the zero PII posture. The reasoning and its
//  consequences are written out on the sandbox_programs table in db.js. What
//  this file is responsible for is keeping the exception BOUNDED:
//
//    • Ownership is checked on every read and every write. A program is
//      reachable by exactly one student token, the one that owns it. There is
//      no admin or teacher read path, and adding one is a decision, not a patch.
//    • Lengths are capped before insert (title, per file, total, stdin), so no
//      single student can turn a 1 GB box into their file server.
//    • A per student program cap exists for the same reason. Unbounded growth
//      per request is exactly what CLAUDE.md says to be paranoid about.
//    • Nothing is logged. The wire log records the route and status, never a
//      body, so student source never lands in a log line.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireStudent } = require('../middleware');
const { makeRateLimit } = require('../lib/rate-limit');
const sandbox = require('../lib/sandbox-assemble');

// A student with 60 saved programs has a scrolling problem, not a storage one;
// this is a runaway backstop, not a product limit, and it is far above what a
// year of a course produces.
const MAX_PROGRAMS_PER_STUDENT = 60;

// ── PREPARED STATEMENTS (module scope, reused across requests) ────────────────
const listStmt = db.prepare(`
  SELECT id, title, language, updated_at, created_at
    FROM sandbox_programs
   WHERE student_id = ?
   ORDER BY updated_at DESC
   LIMIT ?
`);
const getStmt = db.prepare(
  'SELECT id, title, language, files, stdin, created_at, updated_at FROM sandbox_programs WHERE id = ? AND student_id = ?'
);
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM sandbox_programs WHERE student_id = ?');
const insertStmt = db.prepare(`
  INSERT INTO sandbox_programs (id, student_id, title, language, files, stdin)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateStmt = db.prepare(`
  UPDATE sandbox_programs
     SET title = ?, language = ?, files = ?, stdin = ?, updated_at = datetime('now')
   WHERE id = ? AND student_id = ?
`);
const deleteStmt = db.prepare('DELETE FROM sandbox_programs WHERE id = ? AND student_id = ?');

// Saves are frequent and cheap (a student hits save often while working), runs
// are the expensive path and are limited by the Judge0 proxy itself. So this
// window is sized to stop a script, not to pace a person.
const writeLimit = makeRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: 'Too many saves. Wait a moment and try again.',
});
const assembleLimit = makeRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  message: 'Too many runs. Wait a moment and try again.',
});

// ── INPUT NORMALIZATION ──────────────────────────────────────────────────────
// Title and stdin are student typed, so they are truncated rather than trusted,
// and control characters are dropped from the title (it is rendered as a label).
function cleanTitle(raw, language) {
  const t = String(raw == null ? '' : raw)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, sandbox.MAX_TITLE_CHARS);
  if (t) return t;
  const spec = sandbox.LANGUAGES[language] || sandbox.LANGUAGES.java;
  return `Untitled ${spec.label} Program`;
}

function cleanStdin(raw) {
  return String(raw == null ? '' : raw).slice(0, sandbox.MAX_STDIN_CHARS);
}

// Shared by create and update: everything a body must satisfy before it can
// touch the database. Returns { ok, value } or { ok:false, status, message }.
function readBody(body) {
  const language = sandbox.normalizeLanguage(body && body.language);
  if (!language) {
    return { ok: false, status: 400, message: 'Pick Java, Python, or JavaScript.' };
  }
  const checked = sandbox.validateFiles(language, body && body.files);
  if (!checked.ok) return { ok: false, status: 400, message: checked.message };

  return {
    ok: true,
    value: {
      language,
      title: cleanTitle(body && body.title, language),
      // Rebuilt field by field, so only a name and a source can ever be stored:
      // a client that posts extra keys does not get them persisted.
      files: JSON.stringify(checked.files.map((f) => ({ name: f.name, source: f.source }))),
      stdin: cleanStdin(body && body.stdin),
    },
  };
}

// A stored row, shaped for the page. files is parsed here so a row written by an
// older version can never crash a list view.
function shape(row) {
  let files = [];
  try {
    const parsed = JSON.parse(row.files);
    if (Array.isArray(parsed)) files = parsed;
  } catch (e) { /* unreadable row reads as empty rather than as a 500 */ }
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    files,
    stdin: row.stdin || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── CONFIG ───────────────────────────────────────────────────────────────────
// The limits, in one object. The page is rendered with this baked in and the
// endpoint returns the same thing, so the numbers the editor enforces in the
// browser are the numbers the server enforces, and there is no second set to
// drift out of step.
function config() {
  return {
    languages: Object.keys(sandbox.LANGUAGES).map((key) => ({
      key,
      label: sandbox.LANGUAGES[key].label,
      language_id: sandbox.LANGUAGES[key].id,
      default_file: sandbox.LANGUAGES[key].defaultFile,
      multi_file: key === 'java',
    })),
    max_files: sandbox.MAX_FILES,
    max_file_chars: sandbox.MAX_FILE_CHARS,
    max_total_chars: sandbox.MAX_TOTAL_CHARS,
    max_title_chars: sandbox.MAX_TITLE_CHARS,
    max_stdin_chars: sandbox.MAX_STDIN_CHARS,
    max_programs: MAX_PROGRAMS_PER_STUDENT,
  };
}

router.get('/config', (req, res) => res.json(config()));

// ── POST /api/sandbox/assemble ───────────────────────────────────────────────
// Files in, one Judge0-ready source out. No auth: assembling is pure CPU on text
// the caller already has, it stores nothing and it reads nothing, so a token
// would gate a calculator. This is also what lets the sandbox RUN before a
// student logs in; only saving needs an account.
router.post('/assemble', assembleLimit, (req, res) => {
  const body = req.body || {};
  const built = sandbox.assemble(body.language, body.files);
  if (!built.ok) return res.status(400).json({ error: 'bad_request', message: built.message });
  res.json({
    language_id: built.language_id,
    source: built.source,
    notes: built.notes,
  });
});

// ── GET /api/sandbox/programs ────────────────────────────────────────────────
// The signed-in student's own programs, newest first. Bodies are NOT included:
// a list view does not need them, and shipping every program's source on every
// page load would be the largest response this API sends.
router.get('/programs', requireStudent, (req, res) => {
  const rows = listStmt.all(req.student.id, MAX_PROGRAMS_PER_STUDENT);
  res.json({ programs: rows });
});

// ── GET /api/sandbox/programs/:id ────────────────────────────────────────────
router.get('/programs/:id', requireStudent, (req, res) => {
  const row = getStmt.get(req.params.id, req.student.id);
  // Someone else's id and a nonexistent id are the same answer on purpose: a
  // different 403 would confirm that a program exists.
  if (!row) return res.status(404).json({ error: 'not_found', message: 'Program not found.' });
  res.json({ program: shape(row) });
});

// ── POST /api/sandbox/programs ───────────────────────────────────────────────
router.post('/programs', requireStudent, writeLimit, (req, res) => {
  const parsed = readBody(req.body);
  if (!parsed.ok) return res.status(parsed.status).json({ error: 'bad_request', message: parsed.message });

  const { n } = countStmt.get(req.student.id);
  if (n >= MAX_PROGRAMS_PER_STUDENT) {
    return res.status(409).json({
      error: 'too_many',
      message: `You have ${MAX_PROGRAMS_PER_STUDENT} saved programs, which is the maximum. Delete one to save another.`,
    });
  }

  const id = crypto.randomUUID();
  const v = parsed.value;
  insertStmt.run(id, req.student.id, v.title, v.language, v.files, v.stdin);
  res.status(201).json({ program: shape(getStmt.get(id, req.student.id)) });
});

// ── PUT /api/sandbox/programs/:id ────────────────────────────────────────────
router.put('/programs/:id', requireStudent, writeLimit, (req, res) => {
  const parsed = readBody(req.body);
  if (!parsed.ok) return res.status(parsed.status).json({ error: 'bad_request', message: parsed.message });

  const v = parsed.value;
  // The WHERE carries student_id, so ownership is enforced by the write itself
  // rather than by a check that a later edit could separate from it.
  const info = updateStmt.run(v.title, v.language, v.files, v.stdin, req.params.id, req.student.id);
  if (info.changes === 0) return res.status(404).json({ error: 'not_found', message: 'Program not found.' });
  res.json({ program: shape(getStmt.get(req.params.id, req.student.id)) });
});

// ── DELETE /api/sandbox/programs/:id ─────────────────────────────────────────
// A real delete, unlike roster deactivation. Nothing here is gradebook data, so
// there is nothing to preserve, and a student who wants their scratch work gone
// should have it gone.
router.delete('/programs/:id', requireStudent, writeLimit, (req, res) => {
  const info = deleteStmt.run(req.params.id, req.student.id);
  if (info.changes === 0) return res.status(404).json({ error: 'not_found', message: 'Program not found.' });
  res.json({ deleted: true });
});

module.exports = router;
module.exports.config = config;
module.exports.MAX_PROGRAMS_PER_STUDENT = MAX_PROGRAMS_PER_STUDENT;
