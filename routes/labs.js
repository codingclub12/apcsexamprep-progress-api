'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LABS. Delivery for the interactive terminal labs.
//  Mount in server.js:  app.use(require('./routes/labs'));
//
//    GET /api/labs                      the index, one line per authored lab
//    GET /api/labs/:course/:item_id     the spec the player runs
//    GET /lab/:course/:item_id          the standalone player page
//    GET /lab-player.js                 the player, loadable cross origin
//
//  Public on purpose, with ONE exception added 2026-09-07. A lab spec is author
//  content: a brief, a pretend filesystem and a list of checks. It carries no
//  student data, and gating it behind the student JWT would mean a teacher could
//  not preview a lab and an anonymous visitor could not try one, for no gain.
//  The GRADE is what needs auth, and that goes through POST /api/progress/attempt
//  exactly like every other reporter.
//
//  THE EXCEPTION: a teacher who has closed a lab for their class.
//  A teacher reported labs opening for their students while the gradebook showed
//  them shut, and they were right. This route served every spec to everyone and
//  never consulted activity_gates at all, so the switch in the gradebook wrote a
//  row that nothing on this path ever read.
//
//  The fix keeps the paragraph above true. The token is OPTIONAL and stays
//  optional: no token is still anonymous self-study and still gets the lab, so
//  teacher preview and public practice are untouched. What changes is that a
//  SIGNED-IN student whose own class has closed this lab is refused, which is
//  the only case the teacher was ever asking about.
//
//  It inherits the same limit every gate on this site has, and it is worth
//  stating rather than discovering: a student who signs out can still open the
//  lab, exactly as they can still open a closed quiz. The gate answers "is this
//  open for my class", not "can this be reached by anybody".
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const express = require('express');
const router = express.Router();
const db = require('../db');
const { resolveScopedGate } = require('../lib/activity-gate');
const labs = require('../lib/lab-spec');
const answerKey = require('../lib/lab-answer-key');
const entitlements = require('../lib/entitlements');
const { verifyStudentToken } = require('../utils');
const { makeRateLimit } = require('../lib/rate-limit');

// Storefront origins that may send a teacher bearer here. The Command Center
// lives on www; the apex is listed because a teacher who typed the bare domain
// is the same teacher.
const ALLOWED_KEY_ORIGINS = new Set([
  process.env.APCS_STOREFRONT_ORIGIN || 'https://www.apcsexamprep.com',
  'https://apcsexamprep.com',
  'https://progress.apcsexamprep.com',
]);

// Role-agnostic verify, the same reuse routes/gate.js and routes/files.js make:
// one canonical secret in utils.js, and the payload's own role claim decides.
function verifyAnyToken(token) {
  try { return verifyStudentToken(token); } catch (e) { return null; }
}

function bearer(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// One refusal for every reason, so a caller cannot tell a lab that does not
// exist from one they may not read.
function refuseKey(res) {
  return res.status(403).json({ error: 'Not available.' });
}

// A key is a page a teacher opens a handful of times a lesson. This is here to
// make scraping every key expensive, not to inconvenience anyone real.
const keyLimit = makeRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: 'Too many key requests. Please wait a few minutes and try again.',
});

// Cross origin by design: the lesson pages are on the Shopify storefront and
// the specs are here. Read only, no credentials, so a wildcard is the whole
// story rather than a hole in one.
function cors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=300');
}

router.get('/api/labs', (req, res) => {
  cors(res);
  res.json({
    labs: labs.all().map(labs.summary),
    // A malformed spec is a broken lab. Say so here rather than 404ing a lab
    // that the author believes they shipped.
    spec_errors: labs.errors(),
  });
});

// ── AVAILABILITY ─────────────────────────────────────────────────────────────
//  TOLERANT resolution, the same shape routes/quiz.js uses on its render path:
//  an absent or unverifiable token degrades to anonymous rather than 401ing,
//  because this route releases no key and attributes nothing, so an anonymous
//  caller gets exactly what a signed-out visitor already gets.
function labStudent(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  let payload;
  try { payload = verifyStudentToken(token); } catch (e) { return null; }
  if (!payload || payload.role !== 'student' || !payload.id) return null;
  return db.prepare('SELECT id, class_id FROM students WHERE id = ?').get(payload.id) || null;
}

const labClassStmt = db.prepare('SELECT id, course, quiz_lock_default FROM classes WHERE id = ?');
//  Every gate row that could cover this unit. Narrowed by the resolver, not by
//  SQL, because a gate may be written at unit, lesson or activity scope and an
//  equality match cannot see the wildcard rows a teacher writes when they close
//  a whole unit.
const labGateStmt = db.prepare(
  'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ?'
);

//  Returns { open, reason }. Anonymous, another course, and a spec that names no
//  unit or lesson all resolve OPEN: a gate needs a class and a location, and
//  refusing without both would lock people out of practice nobody closed.
function labGate(req, spec) {
  const stu = labStudent(req);
  if (!stu) return { open: true, reason: 'self-study' };
  const cls = labClassStmt.get(stu.class_id);
  if (!cls || cls.course !== spec.course) return { open: true, reason: 'self-study' };
  const unit = spec.unit, lesson = spec.lesson_id, activity = spec.item_type || 'terminal-lab';
  if (!unit || !lesson) return { open: true, reason: 'unlocatable-spec' };
  const rows = labGateStmt.all(cls.id, spec.course, unit);
  return resolveScopedGate(rows, cls, lesson, activity);
}

router.get('/api/labs/:course/:item_id', (req, res) => {
  const spec = labs.get(req.params.course, req.params.item_id);
  if (!spec) {
    res.set('Cache-Control', 'no-store');
    return res.status(404).json({ error: `No lab '${req.params.item_id}' for ${req.params.course}` });
  }
  //  A closed lab answers 200 with no spec rather than 404, so the player can
  //  tell "your teacher has not opened this" apart from "this lab does not
  //  exist", which are very different things to put in front of a student. The
  //  spec is simply never put on the wire, which is the only kind of lock that
  //  survives View Source.
  const gate = labGate(req, spec);
  cors(res);
  if (!gate.open) {
    res.set('Cache-Control', 'no-store');
    return res.json({
      course: req.params.course, item_id: req.params.item_id,
      locked: true, reason: gate.reason, lab: null,
    });
  }
  res.json(labs.forBrowser(spec));
});

// GET /api/labs/:course/:item_id/key  ->  the teacher answer key, or 403.
//
//  Fails closed, the same posture and the same single refusal as routes/files.js:
//  no token, an invalid token, a student token, or a teacher without a live
//  entitlement for the course all get one identical response, so the endpoint
//  cannot be used to enumerate which labs exist.
//
//  What this gate is and is not: it stops a student stumbling onto the key from
//  the teacher page. It does not make the answers secret, because the player
//  grades questions in the browser and the spec therefore carries the correct
//  option. lib/lab-answer-key.js says so on the key itself.
router.get('/api/labs/:course/:item_id/key', keyLimit, (req, res) => {
  res.set('Cache-Control', 'private, no-store');

  const token = bearer(req);
  if (!token) return refuseKey(res);
  const payload = verifyAnyToken(token);
  if (!payload || payload.role !== 'teacher' || !payload.id) return refuseKey(res);
  if (!entitlements.evaluateTeacherGate(payload.id, req.params.course)) return refuseKey(res);

  const spec = labs.get(req.params.course, req.params.item_id);
  if (!spec) return refuseKey(res);

  // Same-origin only for a credentialed read. The Command Center sends its
  // teacher bearer from the storefront, so that one origin is named rather
  // than wildcarded; a wildcard with credentials is not a thing browsers allow
  // anyway, and naming it keeps the list of who may ask visible here.
  const origin = req.headers.origin;
  if (origin && ALLOWED_KEY_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Vary', 'Origin');
  }
  return res.json({ key: answerKey.build(spec) });
});

// The standalone page. One HTML file for every lab; it reads the course and
// item out of its own URL and asks /api/labs for the rest.
router.get('/lab/:course/:item_id', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'lab.html'));
});

router.get('/lab-player.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'public', 'lab-player.js'));
});

module.exports = router;
