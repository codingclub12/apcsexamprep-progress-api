'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ANALYSIS ACTIVITIES: the content the browser is NOT given until it may have it.
//
//    GET  /api/analysis/:course/:item_id         the activity, key-stripped
//    POST /api/analysis/:course/:item_id/grade   grade in transit, keep nothing
//    GET  /analysis-player.js                    the renderer, loadable cross origin
//
//  WHY THIS ROUTE EXISTS AT ALL
//  The AP Cyber 1.1 phishing lab kept its four specimens, its six answer fields
//  and its answer key in the Shopify page body. Two things followed and both
//  were live: a teacher who closed that column changed nothing a student could
//  perceive, because the browser already had the whole activity; and senderKey,
//  impactKey and the rest were readable in View Source. A lock is only real
//  where the SERVER decides what goes on the wire, which is here.
//
//  THE GATE IS THE SAME ONE, NOT A SECOND OPINION
//  resolveAliasGate and lockedForAnyClass come from lib/activity-gate.js, the
//  same functions routes/labs.js calls. An anonymous request is refused only for
//  an item some class has explicitly closed, so an activity nobody has locked
//  stays open and indexable.
//
//  A SIGNED-IN TEACHER IS NOT AN ANONYMOUS REQUEST. She gets the activity, and
//  the cross-class rule never runs for her. See gateFor below for what went
//  wrong before that was true.
//
//  GRADING KEEPS NOTHING
//  A student types prose into four of the six fields. That prose is graded by
//  lib/analysis-grade.js and discarded when the response is written. It is never
//  stored, never logged, and never placed in an attempt's detail. This is the
//  contract graded code already runs under and is not a new PII exception.
//  The route does NOT record a grade: the storefront's existing score reporter
//  still does that, reading the score the player writes into the page, so this
//  change does not touch the grade path at all.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const express = require('express');

const router = express.Router();
const db = require('../db');
const specs = require('../lib/analysis-spec');
const grader = require('../lib/analysis-grade');
const { resolveAliasGate, lockedForAnyClass } = require('../lib/activity-gate');
const { verifyStudentToken } = require('../utils');
const { makeRateLimit } = require('../lib/rate-limit');

function cors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  //  Never cacheable, and never was. The answer varies by credential, and the
  //  lab player's own stale copy already cost a teacher a working lock once.
  res.set('Cache-Control', 'no-store');
  res.append('Vary', 'Authorization');
}

function bearer(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

//  Role-agnostic verify, the same reuse routes/labs.js and routes/gate.js make:
//  one canonical secret in utils.js, and the payload's own role claim decides.
function verifyAnyToken(token) {
  try { return verifyStudentToken(token); } catch (e) { return null; }
}

//  TOLERANT, exactly like routes/labs.js: an absent or unreadable token is
//  anonymous rather than an error, because this route releases no key to a
//  signed-in student that it withholds from a signed-out one.
//
//  It answers for STUDENTS only. A teacher token verifies fine and returns null
//  here, which is correct for what this function is for and is why gateFor below
//  has to ask about a teacher separately rather than reading the absence of a
//  student as "nobody is signed in".
function student(req) {
  const token = bearer(req);
  if (!token) return null;
  const payload = verifyAnyToken(token);
  if (!payload || payload.role !== 'student' || !payload.id) return null;
  return db.prepare('SELECT id, class_id FROM students WHERE id = ?').get(payload.id) || null;
}

const classStmt = db.prepare('SELECT id, course, quiz_lock_default FROM classes WHERE id = ?');
const gateStmt = db.prepare(
  'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ?'
);
const anyGateStmt = db.prepare(
  'SELECT class_id, lesson, activity_type, open FROM activity_gates WHERE course = ? AND unit = ?'
);

//  Returns { open, reason }. An activity with no unit or lesson cannot be
//  located by a gate row, so it resolves open rather than being refused for a
//  reason no teacher could act on.
function gateFor(req, spec) {
  const unit = spec.unit;
  const lesson = spec.lesson_id;
  const acts = specs.aliases(spec);
  if (!unit || !lesson) return { open: true, reason: 'unlocatable-spec' };

  const stu = student(req);
  if (!stu) {
    //  A TEACHER IS NOT ANONYMOUS, and this route said she was until 2026-09-14.
    //
    //  student() requires role === 'student', so a signed-in TEACHER returns null
    //  and fell straight into the cross-class branch below. That branch refuses
    //  whenever ANY class anywhere has closed the activity. So a teacher opened
    //  the 1.1 Lab for her own class, opened the page to check it, and was told
    //  her teacher had not opened it yet, over a lock some other teacher set on
    //  a class she has never seen. Her own class's open row was never consulted.
    //
    //  Reported as "the 1.1 lab will not unlock even when it's unlocked", which
    //  is precisely what it looks like from the Command Center: the chip reads
    //  open, the page reads shut, and nothing she can click reconciles them.
    //
    //  routes/labs.js already decided this on 2026-09-09 off the same support
    //  email ("lab open but isn't open"). This route was written on 2026-09-07
    //  and never got the port, so the two siblings disagreed about who counts as
    //  anonymous. One fix in two files is how that drift started; this is the
    //  second half of it.
    //
    //  This does not reopen the 2026-09-07 hole. That was a STUDENT signing out
    //  to walk past their teacher's lock, and a student cannot mint a teacher
    //  token. Entitlement is deliberately not required, matching routes/labs.js:
    //  an activity nobody has closed is served to the public already, so
    //  demanding one here would invent a fresh way to be wrong for a teacher on
    //  a free plan.
    const asTeacher = verifyAnyToken(bearer(req) || '');
    if (asTeacher && asTeacher.role === 'teacher' && asTeacher.id) {
      return { open: true, reason: 'teacher-preview', audience: 'teacher' };
    }
    const hit = lockedForAnyClass(anyGateStmt.all(spec.course, unit), lesson, acts);
    //  audience says WHOSE decision this was, so the page can stop attributing a
    //  cross-class refusal to a teacher the caller does not have. Same field and
    //  same meaning as routes/labs.js.
    if (hit.locked) {
      return { open: false, reason: 'anonymous-' + hit.reason, scope: hit.scope, audience: 'anonymous' };
    }
    return { open: true, reason: 'self-study' };
  }
  const cls = classStmt.get(stu.class_id);
  if (!cls || cls.course !== spec.course) return { open: true, reason: 'self-study' };
  return resolveAliasGate(gateStmt.all(cls.id, spec.course, unit), cls, lesson, acts);
}

const LOCKED_BODY = (course, itemId, gate) => ({
  course, item_id: itemId, locked: true, reason: gate.reason,
  //  'class' is the default because every other refusal here IS the caller's own
  //  class: resolveAliasGate only ever runs with a class row.
  locked_for: gate.audience || 'class',
  activity: null,
});

router.get('/api/analysis/:course/:item_id', (req, res) => {
  const spec = specs.get(req.params.course, req.params.item_id);
  cors(res);
  if (!spec) {
    return res.status(404).json({ error: `No analysis activity '${req.params.item_id}' for ${req.params.course}` });
  }
  const gate = gateFor(req, spec);
  //  A closed activity answers 200 with no activity rather than 404, so the
  //  player can tell "your teacher has not opened this" apart from "this does
  //  not exist", which are very different things to put in front of a student.
  if (!gate.open) return res.json(LOCKED_BODY(req.params.course, req.params.item_id, gate));
  res.json({ locked: false, activity: specs.forBrowser(spec) });
});

//  Light limit: this is a POST that runs a matcher over a handful of strings,
//  and a student legitimately submits four times.
const gradeLimit = makeRateLimit({ windowMs: 60 * 1000, max: 40 });

router.post('/api/analysis/:course/:item_id/grade', gradeLimit, express.json({ limit: '64kb' }), (req, res) => {
  const spec = specs.get(req.params.course, req.params.item_id);
  cors(res);
  if (!spec) {
    return res.status(404).json({ error: `No analysis activity '${req.params.item_id}' for ${req.params.course}` });
  }
  //  RE-CHECKED AT SUBMIT, not only at render. A page loaded before the teacher
  //  closed the activity would otherwise still be gradable, which is the same
  //  hole routes/quiz.js closes on its own submit path.
  const gate = gateFor(req, spec);
  if (!gate.open) return res.json(LOCKED_BODY(req.params.course, req.params.item_id, gate));

  const result = grader.grade(spec, req.body && req.body.responses);
  //  req.body goes out of scope here and nothing above it was written anywhere.
  res.json({ locked: false, ...result });
});

router.get('/analysis-player.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  //  no-store for the same measured reason routes/labs.js serves its player
  //  no-store: the CDN raises any short max-age to four hours, so a stale player
  //  would outlive a lock. See the block above /lab-player.js there.
  res.set('Cache-Control', 'no-store');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'public', 'analysis-player.js'));
});

module.exports = router;
