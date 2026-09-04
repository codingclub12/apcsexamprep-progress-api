'use strict';
// -----------------------------------------------------------------------------
//  TEACHER FILE GATE. Mount:  app.use('/api/files', require('./routes/files'));
//
//  ── WHAT THIS FIXES ─────────────────────────────────────────────────────────
//  csp-command-center printed every bundle file URL into its public HTML: 780
//  files, 222 answer keys, 196 of them for Big Ideas 2 to 5 which are the paid
//  tiers. The only gate was `FREE_BI: [1]`, a client-side array. An anonymous
//  HEAD on a paid Big Idea exam key returned 200, no auth, no referrer check.
//
//  With this route the page carries opaque ids instead of URLs, and the URL is
//  only ever handed to a caller who holds a teacher token with a live
//  entitlement for the course.
//
//  ── WHAT IT DELIBERATELY DOES NOT GATE ──────────────────────────────────────
//  Student handouts. The Command Center keeps studentFiles and teacherFiles
//  apart, and the split is clean: 329 student files with zero answer keys among
//  them, 434 teacher files holding 217 of the 222. Gating teacher files removes
//  the leak and cannot break a student, who never requests one. Gating both
//  would widen the blast radius without protecting anything more.
//
//  ── WHAT IT CANNOT FIX ──────────────────────────────────────────────────────
//  Shopify CDN files are public by construction. This stops the URLs being
//  PUBLISHED, which stops new exposure. It does not revoke a URL somebody
//  already copied; those die only when the files are re-uploaded under a fresh
//  obscurity suffix, which is a Shopify operation. Order matters: deploy this,
//  repoint the page, verify a real teacher can still download, and only then
//  rotate. Rotating first breaks every link on a live teacher's page.
//
//  ── POSTURE ─────────────────────────────────────────────────────────────────
//  Fails closed. An unknown id, a missing token, an invalid token, a student
//  token, or a teacher without a live entitlement all get a refusal, and the
//  refusal never says whether the id exists. Big Idea 1 stays free because it is
//  the published free sample, and quietly making the free tier paid would be a
//  different change than the one this is.
//
//  Zero PII: the manifest is author content and no student data is touched.
// -----------------------------------------------------------------------------

const express = require('express');
const router = express.Router();
const { verifyStudentToken } = require('../utils');
const { makeRateLimit } = require('../lib/rate-limit');
const entitlements = require('../lib/entitlements');

// ── TWO MANIFESTS, ONE TABLE ────────────────────────────────────────────────
//  CSP entries carry a storefront `path`; AP Networking entries carry a
//  `drive` target instead, because that bundle was never uploaded to Shopify
//  and lives in Google Drive. The route does not branch on the course, only on
//  which of the two an entry has, the same way config/slide-manifests.js keeps
//  course-specific shape out of routes/slides.js.
//
//  Ids are sha256 prefixes over different namespaces (a storefront pathname for
//  CSP, the string `drive:<kind>:<id>` for networking), so a collision would be
//  a genuine hash collision rather than a naming accident. It is still checked
//  at load, because a silent overwrite here would hand one course's teacher
//  another course's file.
function loadManifests(sources) {
  const merged = {};
  for (const [name, table] of sources) {
    for (const [id, entry] of Object.entries(table)) {
      if (Object.prototype.hasOwnProperty.call(merged, id)) {
        throw new Error(`file manifest id collision on ${id} (${name})`);
      }
      merged[id] = entry;
    }
  }
  return merged;
}

const MANIFEST = loadManifests([
  ['csp', require('../seed/csp-teacher-files.json')],
  ['networking', require('../seed/networking-teacher-files.json')],
]);

// Where the files actually live. The API runs on progress.apcsexamprep.com and
// the files are served by the storefront, so the redirect has to be absolute.
const STOREFRONT = process.env.APCS_STOREFRONT_ORIGIN || 'https://www.apcsexamprep.com';

// Generous, because a teacher opening a unit legitimately clicks several files
// in a row. Tight enough that scraping 434 files takes hours rather than
// seconds, which is the behavior this is here to make expensive.
const fileLimit = makeRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  message: 'Too many file requests. Please wait a few minutes and try again.',
});

// Role-agnostic verify, the same approach routes/gate.js uses and for the same
// reason: verifyStudentToken and verifyTeacherToken both call jwt.verify with
// the one canonical secret owned by utils.js, so the signature check is shared
// and only the payload's own role claim distinguishes them.
function verifyAnyToken(token) {
  try { return verifyStudentToken(token); } catch (e) { return null; }
}

function bearer(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// One refusal for every reason. A caller must not be able to tell an id that
// does not exist from one they are not entitled to, or the endpoint becomes a
// way to confirm which files the bundle contains.
function refuse(res) {
  return res.status(403).json({ error: 'Not available.' });
}

// A manifest entry to the URL it stands for, or null if it is not a shape this
// route will emit. Null means refuse: an entry that satisfies neither guard is
// a corrupt manifest line, and guessing at it is how an open redirect ships.
//
// A Drive id is the opaque suffix Google puts in its own URLs. The character
// class is deliberately exactly what Drive uses, with a length floor, so a
// value carrying a slash, a dot or a scheme cannot escape the template.
function resolveUrl(file) {
  if (typeof file.path === 'string') {
    if (!/^\/cdn\/shop\/files\/[A-Za-z0-9._-]+$/.test(file.path)) return null;
    return STOREFRONT + file.path;
  }
  const d = file.drive;
  if (!d || typeof d.id !== 'string' || !/^[A-Za-z0-9_-]{20,64}$/.test(d.id)) return null;
  if (d.kind === 'folder') return `https://drive.google.com/drive/folders/${d.id}`;
  if (d.kind === 'file') return `https://drive.google.com/file/d/${d.id}/view`;
  return null;
}

// GET /api/files/:id  ->  302 to the real file, or 403
router.get('/:id', fileLimit, (req, res) => {
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^[0-9a-f]{16}$/.test(id)) return refuse(res);

  const file = Object.prototype.hasOwnProperty.call(MANIFEST, id) ? MANIFEST[id] : null;
  if (!file) return refuse(res);

  if (!file.free) {
    const token = bearer(req);
    if (!token) return refuse(res);
    const payload = verifyAnyToken(token);
    if (!payload || payload.role !== 'teacher' || !payload.id) return refuse(res);
    if (!entitlements.evaluateTeacherGate(payload.id, file.course)) return refuse(res);
  }

  // The target came from the manifest, never from the request, so there is
  // nothing a caller can steer here. Checked anyway, because a manifest is a
  // file on disk and this is the one place a bad line in it would become an
  // open redirect off our own origin. Each shape gets its own guard rather than
  // one loose pattern, so a networking entry can never satisfy the CSP rule or
  // the other way round, and an entry carrying neither is refused.
  const url = resolveUrl(file);
  if (!url) return refuse(res);

  res.set('Cache-Control', 'private, no-store');

  // Two ways out, for two different callers.
  //
  // A 302 is right for a direct navigation, but a plain <a href> click cannot
  // carry an Authorization header, and a cross-origin fetch cannot read the
  // Location off a manual redirect either (the response is opaqueredirect). So
  // the Command Center asks for ?as=json, gets the URL, and navigates itself.
  // The URL is then briefly in that page's memory, which is unavoidable and also
  // fine: it was only ever handed to a caller who passed the same check the
  // redirect would have.
  if (req.query.as === 'json') return res.json({ url });
  return res.redirect(302, url);
});

// GET /api/files  ->  what this caller may actually open, ids only.
// The page uses this to render its file lists without ever holding a URL.
router.get('/', fileLimit, (req, res) => {
  const course = typeof req.query.course === 'string' ? req.query.course : 'ap-csp';
  const token = bearer(req);
  const payload = token ? verifyAnyToken(token) : null;
  const entitled = !!(payload && payload.role === 'teacher' && payload.id
    && entitlements.evaluateTeacherGate(payload.id, course));

  const out = [];
  for (const [id, f] of Object.entries(MANIFEST)) {
    if (f.course !== course) continue;
    if (!f.free && !entitled) continue;
    // bigIdea is CSP's grouping and unit is networking's. Both are emitted as
    // whatever the entry actually has, so a consumer reads one shape and gets
    // undefined for the dimension its course does not use.
    out.push({ id, label: f.label, topic: f.topic, bigIdea: f.bigIdea, unit: f.unit });
  }
  return res.json({ course, entitled, files: out });
});

module.exports = router;
module.exports.MANIFEST = MANIFEST;
