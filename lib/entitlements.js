'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ENTITLEMENT GRANTS — shared write path for the Shopify webhook and the admin
//  manual-grant endpoint, so both create rows the same way.
//
//  Keyed by lowercased purchaser email (the durable key). teacher_id is a
//  best-effort link filled when a teacher with that email already exists; if the
//  purchase happens before the teacher registers, teacher register backfills the
//  link, and reads resolve by email meanwhile. Shopify grants carry the order id
//  in external_ref and dedupe on the unique (external_ref, course, unit) index,
//  so at-least-once webhook retries never double-grant.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { newId } = require('../utils');

const findTeacherByEmail = db.prepare('SELECT id FROM teachers WHERE email = ?');
const insertEnt = db.prepare(`
  INSERT OR IGNORE INTO entitlements
    (id, email, teacher_id, course, unit, source, external_ref, active, granted_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
`);

// grantEntitlement({ email, course, unit?, source?, externalRef? })
// Returns { granted: bool, teacher_id }. granted is false when the unique index
// swallowed a duplicate (idempotent replay).
function grantEntitlement({ email, course, unit = null, source = 'manual', externalRef = null }) {
  const em = String(email || '').trim().toLowerCase();
  if (!em || !course) return { granted: false, teacher_id: null };
  const t = findTeacherByEmail.get(em);
  const info = insertEnt.run(newId(), em, t ? t.id : null, course, unit, source, externalRef);
  return { granted: info.changes > 0, teacher_id: t ? t.id : null };
}

module.exports = { grantEntitlement };
