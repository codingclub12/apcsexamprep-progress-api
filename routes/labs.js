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
const { resolveAliasGate, lockedForAnyClass } = require('../lib/activity-gate');
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

//  Every class's rows for this location, for the anonymous case below. Carries
//  class_id, which the per-class query above does not need.
const labAnyGateStmt = db.prepare(
  'SELECT class_id, lesson, activity_type, open FROM activity_gates WHERE course = ? AND unit = ?'
);

//  THE NAME A TEACHER CLICKS IS NOT THE NAME THE SPEC CARRIES.
//  A lab spec declares item_type 'terminal-lab'. The course config declares the
//  per-lesson activity as 'lab', and THAT is the gradebook column a teacher sees
//  and closes. The two names exist for a denominator collision documented in
//  CLAUDE.md, not because a teacher thinks of them as two things. Resolving only
//  the spec's own name meant a teacher closed the Lab column, a row was written
//  for 'lab', the lab asked about 'terminal-lab', nothing matched, and the lab
//  opened. Reported 2026-09-07.
//
//  So both names are resolved and the NARROWER answer wins, using the same
//  ladder as everything else rather than a second opinion about precedence. An
//  explicit open on either column therefore still beats a unit-wide close, which
//  is what a teacher means when they reopen one thing inside a closed unit.
//  It lives in lib/lab-spec.js now, beside the specs it describes, because the
//  gradebook needs the same list and a second copy of it is how the board came
//  to draw a padlock the student path disagreed with.
const LAB_ALIASES = (spec) => labs.aliases(spec);

//  Returns { open, reason }. Another course and a spec that names no unit or
//  lesson resolve OPEN: a gate needs a location, and refusing without one would
//  lock people out of practice nobody closed.
//
//  ANONYMOUS IS NO LONGER AUTOMATICALLY OPEN, and that changed on 2026-09-07.
//  It used to return self-study for anyone without a token, which made the lock
//  one click wide: a student who signed out, or opened the same page in
//  incognito, was handed a lab their teacher had closed. The teacher who
//  reported the original bug found this one too, by checking her own fix.
//
//  A lab NOBODY has closed is still served anonymously and still indexable. Only
//  a lab carrying an explicit closing row for some class is withheld, because
//  the public copy and the assigned copy are the same bytes.
function labGate(req, spec) {
  const unitAny = spec.unit, lessonAny = spec.lesson_id;
  const stu = labStudent(req);
  if (!stu) {
    //  A TEACHER IS NOT ANONYMOUS, and treating one as anonymous is what put a
    //  support email in Tanner's inbox on 2026-09-09: "lab open but isn't open".
    //
    //  labStudent() requires role === 'student', so a signed-in TEACHER returns
    //  null here and falls into the cross-class branch below. That branch
    //  refuses whenever ANY class anywhere has closed the lab. So a teacher
    //  opens a lab for her own class, clicks preview, and is told to sign in
    //  with a class code she does not have, over a lock some other teacher set.
    //
    //  The player's WORDING was corrected earlier the same day, off the same
    //  email. That made the refusal honest and left it wrong: she is signed in,
    //  and she did open it.
    //
    //  Refusing her is also incoherent with the route directly below, which
    //  hands a verified teacher the lab's ANSWER KEY. Withholding the lab from
    //  someone we will hand the key to protects nothing.
    //
    //  This does not reopen the 2026-09-07 hole. That was a STUDENT signing out
    //  to walk past their teacher's lock, and a student cannot mint a teacher
    //  token. Entitlement is deliberately NOT required: it gates the KEY, and a
    //  lab nobody has closed is served to the public already, so requiring it
    //  here would invent a second way to be wrong for a teacher on a free plan.
    const asTeacher = verifyAnyToken(bearer(req) || '');
    if (asTeacher && asTeacher.role === 'teacher' && asTeacher.id) {
      return { open: true, reason: 'teacher-preview', audience: 'teacher' };
    }
    if (!unitAny || !lessonAny) return { open: true, reason: 'unlocatable-spec' };
    const anyRows = labAnyGateStmt.all(spec.course, unitAny);
    //  Both names in ONE call. Asking about each in turn and refusing on the
    //  first close ignores an explicit reopen on the other name, which is exactly
    //  what a teacher means by reopening one lab inside a closed unit.
    const hit = lockedForAnyClass(anyRows, lessonAny, LAB_ALIASES(spec));
    //  audience says WHOSE decision this was, so the player can stop attributing
    //  it to a teacher who did nothing. This refusal is not about the caller's
    //  class, because the caller has none: it fires when ANY class has closed
    //  the lab. See the player's locked branch.
    if (hit.locked) {
      return { open: false, reason: 'anonymous-' + hit.reason, scope: hit.scope, audience: 'anonymous' };
    }
    return { open: true, reason: 'self-study' };
  }
  const cls = labClassStmt.get(stu.class_id);
  if (!cls || cls.course !== spec.course) return { open: true, reason: 'self-study' };
  const unit = spec.unit, lesson = spec.lesson_id;
  if (!unit || !lesson) return { open: true, reason: 'unlocatable-spec' };
  const rows = labGateStmt.all(cls.id, spec.course, unit);
  //  The ladder itself lives in lib/activity-gate.js so routes/analysis.js runs
  //  the same one. It was inline here until 2026-09-07 and a second caller is
  //  exactly the moment a duplicated precedence rule starts to drift.
  return resolveAliasGate(rows, cls, lesson, LAB_ALIASES(spec));
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
  //  This response varies by credential: the same URL answers with the spec for
  //  one student and locked:true for another in a class that has closed it. The
  //  cors() helper above marks it public, max-age=300, which was true when every
  //  answer was the same and stopped being true the moment the gate landed.
  //  Left as it was, any shared cache on the path, and a school proxy is exactly
  //  that, could hand one class's open spec to a student whose teacher had shut
  //  it. That is the same failure the player's own cache header caused on
  //  2026-09-07, one hop further out, and it would have been much harder to see.
  //  no-store on BOTH branches, so the locked and open answers are indistinguishable
  //  to a cache rather than differing in a way it might act on.
  //
  //  Vary is APPENDED, never set. The CORS layer already put Vary: Origin on
  //  this response and res.set would replace it, quietly dropping a header
  //  another layer deliberately added. Checked against the live response before
  //  changing it: it carries Vary: Origin and Vary: accept-encoding.
  res.set('Cache-Control', 'no-store');
  res.append('Vary', 'Authorization');
  if (!gate.open) {
    return res.json({
      course: req.params.course, item_id: req.params.item_id,
      locked: true, reason: gate.reason,
      //  'class' is the default because every other refusal on this route IS the
      //  caller's own class: resolveAliasGate only ever runs with a class row.
      locked_for: gate.audience || 'class',
      lab: null,
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

//  NEVER CACHED, and the reason is measured rather than assumed.
//
//  This file decides whether the student token is sent at all, so a stale copy
//  silently disables the lab gate. On 2026-09-07 the deploy was correct and the
//  edge served the previous player anyway, so a teacher who had closed a lab
//  watched it stay open.
//
//  The obvious fix does not work here. Measured that day against four paths on
//  this origin, with the cache key busted so every response came from us:
//
//    /lab-player.js             asked 3600            delivered 14400
//    /practice-hub.js           asked 3600            delivered 14400
//    /api/intro-java/player.js  asked 86400 immutable delivered 86400 immutable
//    /lab/:course/:item         asked no-store        delivered no-store
//
//  So the CDN is not rewriting every header. It raises a SHORT max-age on a
//  cacheable asset to its own 4 hour browser TTL and leaves a longer one alone.
//  'max-age=0, must-revalidate' is shorter than four hours, so it would have
//  been inflated to 14400 exactly like the 3600 it replaced, and this route
//  would have read as fixed while changing nothing.
//
//  no-store is the one value in that table that arrived intact, because it
//  takes the response out of the cacheable class entirely rather than competing
//  on TTL. It costs one 40KB origin fetch per lab page load, on seven pages.
//
//  A cheaper answer exists and is deliberately not taken yet: version the URL
//  and cache it for a day. That needs the seven lab page bodies regenerated and
//  imported, so it is a sheet rather than a deploy. See docs/lab-contract.md.
//
//  Whatever this line says, the origin proposes and the CDN disposes. Check what
//  was DELIVERED with scripts/verify-lab-player-live.sh after a deploy rather
//  than trusting the source, which is the mistake that cost this route a cycle.
router.get('/lab-player.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'no-store');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'public', 'lab-player.js'));
});

module.exports = router;
