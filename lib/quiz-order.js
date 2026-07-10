'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ORDER TOKEN — stateless shuffle for Phase 2 server-side scoring.
//
//  The render endpoint shuffles question order and each question's option order,
//  then hands the client a signed order_token that records the permutation. The
//  submission echoes the token, and the scorer uses it to map the shuffled
//  positions the student saw back onto canonical qids and option indices.
//
//  The token is a signed JWT, NOT a server-side session. This is deliberate:
//  Railway runs at 1 vCPU / 1 GB and a prior in-memory map leaked $169 of spend,
//  so nothing here may grow per-request. A signed token carries its own state,
//  cannot be forged (JWT_SECRET), and expires on its own with zero bookkeeping.
//
//  The token never contains a correct answer. It maps positions to qids only;
//  correctness is looked up from quiz_bank at submit time, never trusted from the
//  client. A tampered token fails the signature check; a replayed token is bounded
//  by the one-attempt rule (class mode) or is harmless (self-study).
// ─────────────────────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ORDER_TTL = '2h';   // long enough to sit a quiz, short enough to bound replay

// Fisher-Yates over a fresh array. Math.random is fine here: shuffle quality is
// a UX/anti-peeking nicety, not a security control (scoring is server-side).
function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// rows: quiz_bank rows in canonical order. Returns { token, questions } where
// questions is the shuffled, key-free payload safe to send to the browser.
function buildOrder(location, rows) {
  const qOrder = shuffled(rows.length);            // shuffled question positions
  const q = [];        // token payload: one entry per SHOWN position
  const questions = [];  // client payload: prompt + options, no keys

  for (const canonicalPos of qOrder) {
    const row = rows[canonicalPos];
    const opts = JSON.parse(row.options);
    const optPerm = shuffled(opts.length);         // shown option pos -> canonical index
    q.push({ id: row.qid, opt: optPerm });
    questions.push({
      qid: row.qid,
      prompt: row.prompt,
      options: optPerm.map((canonicalIdx) => opts[canonicalIdx]),
    });
  }

  const token = jwt.sign(
    {
      typ: 'quiz-order',
      c: location.course,
      u: location.unit,
      l: location.lesson,
      a: location.activity_type,
      q,
    },
    JWT_SECRET,
    { expiresIn: ORDER_TTL }
  );
  return { token, questions };
}

// Verify + decode. Returns { valid, location, map } where map is
// qid -> { optPerm } (shown option pos -> canonical index). Never throws.
function readOrder(token) {
  try {
    const p = jwt.verify(String(token || ''), JWT_SECRET);
    if (!p || p.typ !== 'quiz-order' || !Array.isArray(p.q)) return { valid: false };
    const map = new Map();
    for (const entry of p.q) {
      if (!entry || typeof entry.id !== 'string' || !Array.isArray(entry.opt)) return { valid: false };
      map.set(entry.id, { optPerm: entry.opt });
    }
    return {
      valid: true,
      location: { course: p.c, unit: p.u, lesson: p.l, activity_type: p.a },
      map,
    };
  } catch (e) {
    return { valid: false };
  }
}

module.exports = { buildOrder, readOrder };
