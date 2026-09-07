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

//  TOLERANT, exactly like routes/labs.js: an absent or unreadable token is
//  anonymous rather than an error, because this route releases no key to a
//  signed-in student that it withholds from a signed-out one.
function student(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  let payload;
  try { payload = verifyStudentToken(token); } catch (e) { return null; }
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
    const hit = lockedForAnyClass(anyGateStmt.all(spec.course, unit), lesson, acts);
    if (hit.locked) return { open: false, reason: 'anonymous-' + hit.reason, scope: hit.scope };
    return { open: true, reason: 'self-study' };
  }
  const cls = classStmt.get(stu.class_id);
  if (!cls || cls.course !== spec.course) return { open: true, reason: 'self-study' };
  return resolveAliasGate(gateStmt.all(cls.id, spec.course, unit), cls, lesson, acts);
}

const LOCKED_BODY = (course, itemId, gate) => ({
  course, item_id: itemId, locked: true, reason: gate.reason, activity: null,
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
