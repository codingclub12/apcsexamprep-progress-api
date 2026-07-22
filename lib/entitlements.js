'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ENTITLEMENT CORE (Phase 4: Teacher Command Center, slice 1).
//
//  The teacher is the paying seat, per course. An entitlement is keyed to
//  (teacher_id, course). One live entitlement grants unlimited classes and
//  students within that course. A student inherits access to their class's
//  course while that class's teacher holds a live entitlement for it.
//
//  This module owns the SINGLE definition of "active entitlement" so the gate
//  check, the teacher redeem route, and the admin tools can never disagree.
//  Prepared statements live at module scope and reuse the shared better-sqlite3
//  connection (WAL, busy_timeout). Additive only: no existing table or route
//  behavior changes here.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// The three paid courses. A 'solo' class (ME- accounts) is intentionally not an
// entitlement course: a solo student's class.course is 'solo', so it never
// equals one of these and the gate returns entitled:false for them, which is the
// intended posture (solo accounts are not under a teacher's paid seat).
const VALID_COURSES = ['ap-csp', 'ap-csa', 'ap-cybersecurity'];
function isValidCourse(c) { return VALID_COURSES.includes(c); }

// ONE definition of active, reused by every read below. A grant is live when it
// is not revoked and not past its expiry. Nothing populates expires_at in this
// slice (code grants are unlimited), but the check honors it now so a time-boxed
// Shopify grant added later works without revisiting the gate.
const ACTIVE_CLAUSE =
  "status = 'active' AND (expires_at IS NULL OR expires_at > datetime('now'))";

// ── PREPARED STATEMENTS (module scope, reused across requests) ────────────────
const hasActiveEntitlementStmt = db.prepare(
  `SELECT 1 FROM entitlements WHERE teacher_id = ? AND course = ? AND ${ACTIVE_CLAUSE} LIMIT 1`
);
// Row-level "active" (status only) is what the partial unique index keys on, so
// the create-or-refresh path checks status = 'active' to find the one slot to
// update. An expired-but-not-revoked row still occupies that slot.
const getActiveRowStmt = db.prepare(
  "SELECT id FROM entitlements WHERE teacher_id = ? AND course = ? AND status = 'active' LIMIT 1"
);
const insertEntitlementStmt = db.prepare(`
  INSERT INTO entitlements (id, teacher_id, course, source, status, order_ref, granted_at, expires_at)
  VALUES (?, ?, ?, ?, 'active', ?, datetime('now'), ?)
`);
const refreshEntitlementStmt = db.prepare(`
  UPDATE entitlements
     SET source = ?, order_ref = ?, granted_at = datetime('now'), expires_at = ?
   WHERE id = ?
`);
const getCodeStmt = db.prepare(
  'SELECT code, course, status, redeemed_by_teacher FROM access_codes WHERE code = ?'
);
const markCodeRedeemedStmt = db.prepare(
  "UPDATE access_codes SET status = 'redeemed', redeemed_by_teacher = ? WHERE code = ?"
);
const insertCodeStmt = db.prepare(
  "INSERT INTO access_codes (code, course, status, created_at) VALUES (?, ?, 'unused', datetime('now'))"
);
const getStudentClassStmt = db.prepare(`
  SELECT c.course AS class_course, c.teacher_id AS teacher_id
    FROM students s JOIN classes c ON c.id = s.class_id
   WHERE s.id = ?
`);
const revokeEntitlementStmt = db.prepare(
  "UPDATE entitlements SET status = 'revoked' WHERE teacher_id = ? AND course = ? AND status = 'active'"
);
const revokeCodeStmt = db.prepare(
  "UPDATE access_codes SET status = 'revoked' WHERE code = ? AND status = 'unused'"
);

// True if the teacher currently holds a live entitlement for the course.
function hasActiveEntitlement(teacherId, course) {
  return !!hasActiveEntitlementStmt.get(teacherId, course);
}

// Grant or refresh the single active entitlement for (teacher, course). The
// partial unique index guarantees at most one active row, so we look for it and
// update in place; only when none exists do we insert. Callers run this inside a
// transaction. Passing expiresAt = null keeps the grant unlimited.
function grantOrRefresh(teacherId, course, source, orderRef, expiresAt) {
  const existing = getActiveRowStmt.get(teacherId, course);
  if (existing) {
    refreshEntitlementStmt.run(source, orderRef || null, expiresAt || null, existing.id);
    return existing.id;
  }
  const id = uuidv4();
  insertEntitlementStmt.run(id, teacherId, course, source, orderRef || null, expiresAt || null);
  return id;
}

// Redeem an access code for a teacher. Single use, and idempotent for the same
// teacher re-submitting a code they already redeemed. Returns a plain result
// object; the route maps it to HTTP. Wrapped in a transaction so the grant and
// the code state flip together.
const redeemTxn = db.transaction((teacherId, rawCode) => {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, http: 400, error: 'Code required' };

  const row = getCodeStmt.get(code);
  if (!row) return { ok: false, http: 404, error: 'Invalid code' };

  if (row.status === 'revoked') {
    return { ok: false, http: 409, error: 'Code has been revoked' };
  }

  if (row.status === 'redeemed') {
    // Idempotent path: the same teacher re-submitting their own code succeeds
    // without a second grant. A different teacher is refused.
    if (row.redeemed_by_teacher === teacherId) {
      grantOrRefresh(teacherId, row.course, 'code', code, null);
      return { ok: true, course: row.course, idempotent: true };
    }
    return { ok: false, http: 409, error: 'Code already redeemed' };
  }

  // status === 'unused'
  if (!isValidCourse(row.course)) {
    return { ok: false, http: 400, error: 'Code has an invalid course' };
  }
  grantOrRefresh(teacherId, row.course, 'code', code, null);
  markCodeRedeemedStmt.run(teacherId, code);
  return { ok: true, course: row.course };
});

function redeemCode(teacherId, rawCode) {
  return redeemTxn(teacherId, rawCode);
}

// ── CODE GENERATION (admin) ───────────────────────────────────────────────────
// Unambiguous alphabet (no O/0/I/1). The code format is course-agnostic; the
// course lives on the row and is chosen by the admin at generation time.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode() {
  const bytes = crypto.randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

// Generate up to `count` unused codes for a course. Regenerates on the vanishing
// chance of a primary-key collision; any other error rethrows. Returns the codes
// actually created.
function generateCodes(course, count) {
  const n = Math.max(1, Math.min(500, parseInt(count, 10) || 0));
  const out = [];
  let guard = 0;
  while (out.length < n && guard < n * 20) {
    guard++;
    const code = randomCode();
    try {
      insertCodeStmt.run(code, course);
      out.push(code);
    } catch (e) {
      if (!/UNIQUE/i.test(e.message)) throw e;
    }
  }
  return out;
}

// ── REVOKE (admin) ────────────────────────────────────────────────────────────
// Revoke a teacher's active entitlement for a course. Returns rows changed.
function revokeEntitlement(teacherId, course) {
  return revokeEntitlementStmt.run(teacherId, course).changes;
}
// Revoke an unused access code so it can never be redeemed. A code that is
// already redeemed is not touched here; kill its grant via revokeEntitlement.
function revokeCode(code) {
  return revokeCodeStmt.run(String(code || '').trim().toUpperCase()).changes;
}

// ── GATE EVALUATION ───────────────────────────────────────────────────────────
// Teacher: entitled if an active entitlement exists for (teacher, course).
function evaluateTeacherGate(teacherId, course) {
  if (!isValidCourse(course)) return false;
  return hasActiveEntitlement(teacherId, course);
}
// Student: entitled if the student's class.course === course AND that class's
// teacher holds an active entitlement for course. Class and teacher are read
// fresh from the database, not trusted from the token.
function evaluateStudentGate(studentId, course) {
  if (!isValidCourse(course)) return false;
  const row = getStudentClassStmt.get(studentId);
  if (!row) return false;
  if (row.class_course !== course) return false;
  return hasActiveEntitlement(row.teacher_id, course);
}

// ── PENDING BRIDGE (Phase 4 slice 2) ──────────────────────────────────────────
// A Shopify purchase can arrive before the buyer has a teacher account, so the
// grant is parked in pending_entitlements by email (see routes/shopify.js) and
// converted to a real entitlement the first time that email registers or logs
// in. grantOrRefresh above is reused unchanged, so pending grants land in the
// same single active-row-per-(teacher, course) shape as code redemptions.
const pendingForEmailStmt = db.prepare(`
  SELECT id, course, source, order_ref
  FROM pending_entitlements
  WHERE email = ? COLLATE NOCASE AND claimed_at IS NULL
`);
const markClaimedStmt = db.prepare(
  `UPDATE pending_entitlements SET claimed_at = datetime('now') WHERE id = ?`
);

// Convert every unclaimed pending grant for an email into a real entitlement for
// the given teacher, then mark it claimed. Wrapped in a transaction so a partial
// failure does not leave a grant applied but the pending row still open (or vice
// versa). grantOrRefresh is itself idempotent, so re-running this is safe.
// Returns the number of pending rows claimed.
const claimPending = db.transaction((teacherId, email) => {
  if (!teacherId || !email) return 0;
  const rows = pendingForEmailStmt.all(email);
  let claimed = 0;
  for (const row of rows) {
    grantOrRefresh(teacherId, row.course, row.source || 'shopify_order', row.order_ref, null);
    markClaimedStmt.run(row.id);
    claimed++;
  }
  return claimed;
});

module.exports = {
  VALID_COURSES,
  isValidCourse,
  hasActiveEntitlement,
  // Exported for the Shopify webhook (slice 2), which grants directly on a paid
  // order. It was internal-only in slice 1 (used by redeemCode); slice 2 needs it
  // on the module surface. Same function, same signature.
  grantOrRefresh,
  // isEntitled is the slice-2 name for the active-grant read; it is the same
  // check as hasActiveEntitlement(teacherId, course). Aliased so the entitlements
  // module satisfies the full slice-2 contract (grantOrRefresh, isEntitled,
  // claimPending) without duplicating logic.
  isEntitled: hasActiveEntitlement,
  redeemCode,
  generateCodes,
  revokeEntitlement,
  revokeCode,
  evaluateTeacherGate,
  evaluateStudentGate,
  claimPending,
};
