'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  STUDENT ACCOUNTS - one identity across every course a student takes.
//
//  The students table is per class and stays that way: progress, retry
//  overrides, and the teacher's roster all hang off a (class, student) row, and
//  a kid in CSA and Cyber genuinely has two rosters. What did not exist was the
//  thing ABOVE those rows, so the same kid had to remember which class code went
//  with which course and sign in again to move between them.
//
//  The identity is (name, PIN), because that is already what a student is asked
//  to remember. Same name and same PIN means the same person; a different PIN
//  under the same name means a different person, and /join refuses to create the
//  ambiguous third case where two different students share both.
//
//  WHY THE LINK IS LAZY. Existing rows all start with account_id NULL and are
//  linked on the next successful sign-in, when a PIN has actually been checked.
//  A backfill would have to decide whether the Avery in CSA-2K4P and the Avery
//  in CYBER-9QRS are one student, and the only evidence either way is a hash it
//  cannot read. Linking at sign-in makes that decision with the PIN in hand.
//
//  COST NOTE (Railway, 1 vCPU). bcrypt at cost 10 is deliberately slow, so the
//  candidate set is bounded. Only accounts sharing the exact folded name are
//  ever compared, that set is small in practice, and MAX_PIN_CANDIDATES caps the
//  pathological case. The comparison runs on join and on the one sign-in that
//  first links a row, never on the hot read paths.
// ─────────────────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const db = require('../db');
const { newId } = require('../utils');

// A name shared by more accounts than this is a name collision, not a student
// with that many identities. Ordering is by most recently active so the cap
// lands on abandoned accounts rather than live ones.
const MAX_PIN_CANDIDATES = 8;

function nameKey(cleanName) {
  return String(cleanName || '').trim().toLowerCase();
}

const candidatesStmt = db.prepare(`
  SELECT id, name_key, pin_hash FROM student_accounts
  WHERE name_key = ?
  ORDER BY COALESCE(last_active, created_at) DESC
  LIMIT ${MAX_PIN_CANDIDATES}
`);

// The account whose name AND PIN both match, or null. This is the whole
// definition of "the same student" in this system, and it is used in two
// places that must agree: sign-in linking, and the /join collision check.
async function findAccountByNameAndPin(cleanName, pin) {
  const rows = candidatesStmt.all(nameKey(cleanName));
  for (const row of rows) {
    if (await bcrypt.compare(String(pin), row.pin_hash)) return row;
  }
  return null;
}

// Whether any account already answers to this exact name and PIN. Named
// separately from the lookup because /join asks the question without wanting
// the answer's identity: it must not leak whose account it collided with.
async function nameAndPinTaken(cleanName, pin) {
  return (await findAccountByNameAndPin(cleanName, pin)) !== null;
}

const insertAccountStmt = db.prepare(`
  INSERT INTO student_accounts (id, name_key, pin_hash, last_active)
  VALUES (?, ?, ?, datetime('now'))
`);
const linkStudentStmt = db.prepare('UPDATE students SET account_id = ? WHERE id = ?');
const touchAccountStmt = db.prepare("UPDATE student_accounts SET last_active = datetime('now') WHERE id = ?");
const getAccountStmt = db.prepare('SELECT id, name_key, pin_hash FROM student_accounts WHERE id = ?');

function createAccount(cleanName, pinHash) {
  const id = newId();
  insertAccountStmt.run(id, nameKey(cleanName), pinHash);
  return id;
}

function linkStudent(studentId, accountId) {
  linkStudentStmt.run(accountId, studentId);
}

function touch(accountId) {
  if (accountId) touchAccountStmt.run(accountId);
}

function getAccount(accountId) {
  return accountId ? getAccountStmt.get(accountId) : null;
}

// Called after a sign-in has already verified this student's PIN. Returns the
// account id the row now belongs to, creating or joining one as needed. The PIN
// is known good here, which is exactly why this is the right moment to link.
async function ensureAccountForStudent(student, pin) {
  if (student.account_id && getAccount(student.account_id)) {
    touch(student.account_id);
    return student.account_id;
  }
  const existing = await findAccountByNameAndPin(student.display_name, pin);
  const accountId = existing ? existing.id : createAccount(student.display_name, student.pin_hash);
  linkStudent(student.id, accountId);
  touch(accountId);
  return accountId;
}

// Every class this identity can sign in to. Inactive classes and deactivated
// student rows are left out: a student cannot reach them, so listing them would
// only offer a door that opens onto an error.
const enrollmentsStmt = db.prepare(`
  SELECT s.id AS student_id, s.display_name,
         c.id AS class_id, c.class_code, c.class_name, c.course
  FROM students s
  JOIN classes c ON c.id = s.class_id
  WHERE s.account_id = ? AND COALESCE(s.active, 1) = 1 AND COALESCE(c.active, 1) = 1
  ORDER BY c.course, c.class_code
`);

function enrollments(accountId) {
  if (!accountId) return [];
  return enrollmentsStmt.all(accountId);
}

// One enrollment of this account, by class code. The account id is part of the
// lookup rather than checked afterwards, so a token can only ever be minted for
// a class the caller's own identity is already in.
const enrollmentByCodeStmt = db.prepare(`
  SELECT s.id AS student_id, s.display_name, s.active AS student_active, s.pin_hash,
         c.id AS class_id, c.class_code, c.class_name, c.course
  FROM students s
  JOIN classes c ON c.id = s.class_id
  WHERE s.account_id = ? AND c.class_code = ?
`);

function enrollmentByCode(accountId, classCode) {
  if (!accountId || !classCode) return null;
  return enrollmentByCodeStmt.get(accountId, String(classCode).toUpperCase().trim()) || null;
}

module.exports = {
  MAX_PIN_CANDIDATES,
  nameKey, findAccountByNameAndPin, nameAndPinTaken,
  createAccount, linkStudent, touch, getAccount,
  ensureAccountForStudent, enrollments, enrollmentByCode,
};
