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
//  Public on purpose. A lab spec is author content: a brief, a pretend
//  filesystem and a list of checks. It carries no student data, and gating it
//  behind the student JWT would mean a teacher could not preview a lab and an
//  anonymous visitor could not try one, for no gain. The GRADE is what needs
//  auth, and that goes through POST /api/progress/attempt exactly like every
//  other reporter.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const express = require('express');
const router = express.Router();
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

router.get('/api/labs/:course/:item_id', (req, res) => {
  const spec = labs.get(req.params.course, req.params.item_id);
  if (!spec) {
    res.set('Cache-Control', 'no-store');
    return res.status(404).json({ error: `No lab '${req.params.item_id}' for ${req.params.course}` });
  }
  cors(res);
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
