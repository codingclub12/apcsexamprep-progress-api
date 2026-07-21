'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  GATE CHECK: read-only entitlement probe (Phase 4: Teacher Command Center,
//  slice 1). Mount in server.js:  app.use('/api/gate', require('./routes/gate'));
//
//  GET /api/gate/check?course=<c> answers "may this caller access <course>?"
//  It must accept a teacher token, a student token, OR no token, so it cannot
//  use requireTeacher/requireStudent (each of those rejects the other role).
//  Instead it verifies the signature with the canonical secret and branches on
//  the payload's own role claim. Fails closed: any missing or invalid token, or
//  an unknown course, yields { entitled: false }.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { verifyStudentToken } = require('../utils');
const entitlements = require('../lib/entitlements');

// Role-agnostic verify. verifyStudentToken and verifyTeacherToken both call
// jwt.verify with the same canonical JWT_SECRET owned by utils.js; only the
// label differs. We verify the signature with one and then trust the payload's
// role claim. utils.js is owned elsewhere (see CLAUDE.md), so we reuse its
// verifier rather than adding an export there. Returns null on any failure.
function verifyAnyToken(token) {
  try { return verifyStudentToken(token); } catch (e) { return null; }
}

router.get('/check', (req, res) => {
  const course = typeof req.query.course === 'string' ? req.query.course : '';

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.json({ entitled: false, role: 'none', course });

  const payload = verifyAnyToken(token);
  if (!payload || !payload.id || !payload.role) {
    return res.json({ entitled: false, role: 'none', course });
  }

  if (payload.role === 'teacher') {
    return res.json({
      entitled: entitlements.evaluateTeacherGate(payload.id, course),
      role: 'teacher',
      course,
    });
  }
  if (payload.role === 'student') {
    return res.json({
      entitled: entitlements.evaluateStudentGate(payload.id, course),
      role: 'student',
      course,
    });
  }
  // Any other role claim is not recognized: fail closed.
  return res.json({ entitled: false, role: 'none', course });
});

module.exports = router;
