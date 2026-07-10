'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  GAME LEADERBOARDS — one small shared service for every AP CSP topic game.
//  Mount in server.js:  app.use('/api/game', require('./routes/game'));
//
//  This is a FUN board, not a grade source. Rows live in game_scores and never
//  touch progress / attempts / score_events or any gradebook table.
//
//  The server owns the truth:
//   • The per-game registry sets metric, ordering (higher_is_better) and the
//     [min,max] anti-cheat bounds. The client sends `metric` but it is ignored
//     for policy; the stored metric is the registry's, so it cannot be spoofed.
//   • Unknown game ids and out-of-bounds values are rejected.
//   • Auth is OPTIONAL. A student Bearer JWT attributes the score to that
//     student and uses their display name; no token is anonymous public play
//     with a submitted, sanitized name.
//   • Boards dedupe to one BEST row per identity per window at read time.
//  Prepared statements live at module scope; the rate-limit map is bounded so
//  it can never grow unbounded (Railway memory is the hard constraint).
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { verifyStudentToken } = require('../utils');

// School timezone for all calendar-window boundary math.
const TZ = 'America/Chicago';

// ── PER-GAME REGISTRY (server-owned; add one line for a new game) ─────────────
// metric is the label stored on the row; higher = higher_is_better; [min,max]
// are the accepted value bounds. Anything not in here is an unknown game id.
const REGISTRY = {
  'binary-conversion-race':     { metric: 'score', higher: true, min: 0, max: 50000 },
  'robot-director':             { metric: 'stars', higher: true, min: 0, max: 12 },
  'redundant-routing':          { metric: 'score', higher: true, min: 0, max: 10000 },
  'internet-routing-simulator': { metric: 'score', higher: true, min: 0, max: 10000 },
  'two-sides':                  { metric: 'score', higher: true, min: 0, max: 10000 },
  'bridge-the-divide':          { metric: 'score', higher: true, min: 0, max: 10000 },
  'spot-the-bias':              { metric: 'score', higher: true, min: 0, max: 10000 },
  'crowd-power':                { metric: 'score', higher: true, min: 0, max: 10000 },
  'license-match':              { metric: 'score', higher: true, min: 0, max: 10000 },
  'phishing-net':               { metric: 'score', higher: true, min: 0, max: 10000 },
  'parallel-scheduler':         { metric: 'score', higher: true, min: 0, max: 10000 },
  'packet-assembler':           { metric: 'score', higher: true, min: 0, max: 10000 },
  'compression-challenge':      { metric: 'score', higher: true, min: 0, max: 10000 },
  'trend-hunter':               { metric: 'score', higher: true, min: 0, max: 10000 },
  'filter-sort-detective':      { metric: 'score', higher: true, min: 0, max: 10000 },
  'team-roles':                 { metric: 'score', higher: true, min: 0, max: 10000 },
  'guess-the-purpose':          { metric: 'score', higher: true, min: 0, max: 10000 },
  'design-sprint':              { metric: 'score', higher: true, min: 0, max: 10000 },
  'bug-squasher':               { metric: 'score', higher: true, min: 0, max: 10000 },
};

const WINDOWS = new Set(['today', 'week', 'month', 'year', 'all']);

// ── TIMEZONE HELPERS ──────────────────────────────────────────────────────────
// created_at is stored by SQLite as UTC 'YYYY-MM-DD HH:MM:SS'. To filter a
// calendar window we compute the UTC instant of the local (America/Chicago)
// boundary and compare as a same-format string, which orders chronologically.
function localParts(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const m = {};
  for (const p of dtf.formatToParts(date)) if (p.type !== 'literal') m[p.type] = p.value;
  let h = parseInt(m.hour, 10);
  if (h === 24) h = 0; // some ICU builds emit '24' at local midnight
  return { y: +m.year, mo: +m.month, d: +m.day, h, mi: +m.minute, s: +m.second };
}

function tzOffsetMs(date) {
  const p = localParts(date);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - date.getTime();
}

// UTC ms for a wall-clock time in TZ. One refinement pass handles DST edges.
function localWallToUtcMs(y, mo, d, h, mi, s) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const off1 = tzOffsetMs(new Date(guess));
  let utc = guess - off1;
  const off2 = tzOffsetMs(new Date(utc));
  if (off2 !== off1) utc = guess - off2;
  return utc;
}

function toSqliteUtc(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
         `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

// Lower bound for a window as a UTC sqlite string, or null for 'all' (no bound).
function windowStart(window) {
  if (window === 'all') return null;
  const p = localParts(new Date());
  if (window === 'today') return toSqliteUtc(localWallToUtcMs(p.y, p.mo, p.d, 0, 0, 0));
  if (window === 'month') return toSqliteUtc(localWallToUtcMs(p.y, p.mo, 1, 0, 0, 0));
  if (window === 'year')  return toSqliteUtc(localWallToUtcMs(p.y, 1, 1, 0, 0, 0));
  // week = ISO Monday 00:00 local. Day-of-week from the calendar date is
  // timezone-independent, so compute it on a UTC date built from local parts.
  const dow = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay(); // 0 Sun..6 Sat
  const back = dow === 0 ? 6 : dow - 1;
  const mon = new Date(Date.UTC(p.y, p.mo - 1, p.d - back));
  return toSqliteUtc(localWallToUtcMs(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate(), 0, 0, 0));
}

// ── IDENTITY + IP HASH ────────────────────────────────────────────────────────
// Ranking identity: student_id when signed in, else 'n:'+name for anon play.
// Mirrors the COALESCE in the SQL below so the same string keys both sides.
function identOf(studentId, name) {
  return studentId || ('n:' + name);
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '';
}

// sha-256 of ip + a daily-rotating salt. Rotates every local day so a raw IP is
// never recoverable and cannot be correlated across days. Anti-spam + a soft
// dedupe signal only; never shown to anyone.
function ipHash(req) {
  const p = localParts(new Date());
  const daySalt = `${p.y}-${p.mo}-${p.d}`;
  const secret = process.env.IP_HASH_SALT || process.env.JWT_SECRET || 'ip-salt';
  return crypto.createHash('sha256')
    .update(`${clientIp(req)}|${daySalt}|${secret}`)
    .digest('hex').slice(0, 40);
}

// ── NAME SANITIZER (anonymous plays only) ─────────────────────────────────────
// trim, strip control chars, collapse whitespace, cap at 16, mask basic
// profanity, reject empty after cleaning.
const PROFANITY = [
  /fuck/ig, /shit/ig, /bitch/ig, /cunt/ig, /\bass\b/ig, /asshole/ig,
  /dick/ig, /piss/ig, /bastard/ig, /slut/ig, /whore/ig, /nigg/ig, /fag/ig,
];

function sanitizeName(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.replace(/[\x00-\x1f\x7f]/g, '');
  s = s.replace(/\s+/g, ' ').trim().slice(0, 16).trim();
  if (!s) return null;
  for (const re of PROFANITY) s = s.replace(re, (m) => '*'.repeat(m.length));
  s = s.trim();
  return s || null;
}

// ── OPTIONAL STUDENT AUTH ─────────────────────────────────────────────────────
// Never rejects. Attaches req.student on a valid student token, otherwise leaves
// the request anonymous.
function optionalStudent(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = verifyStudentToken(token);
      if (payload.role === 'student') {
        const s = db.prepare('SELECT id, class_id, display_name FROM students WHERE id = ?').get(payload.id);
        if (s) req.student = s;
      }
    } catch (e) { /* anonymous */ }
  }
  next();
}

// ── PREPARED STATEMENTS ───────────────────────────────────────────────────────
// A row's best-per-identity ordering depends on higher_is_better (MAX/DESC vs
// MIN/ASC) and on whether a window lower bound applies. Every registry game is
// currently higher-is-better, but both orderings are prepared so a future
// lower-is-better game (fastest time, fewest moves) needs only a registry line.
function buildStmts() {
  const entries = {};
  const stats = {};
  for (const higher of [true, false]) {
    const agg = higher ? 'MAX' : 'MIN';
    const cmp = higher ? '>' : '<';
    const ord = higher ? 'DESC' : 'ASC';
    for (const windowed of [true, false]) {
      const where = windowed ? 'game = ? AND created_at >= ?' : 'game = ?';
      const key = `${higher ? 'h' : 'l'}${windowed ? 'w' : 'a'}`;
      entries[key] = db.prepare(`
        SELECT name, best FROM (
          SELECT COALESCE(student_id, 'n:' || name) AS ident,
                 MAX(name) AS name, ${agg}(value) AS best
          FROM game_scores WHERE ${where} GROUP BY ident
        ) ORDER BY best ${ord} LIMIT ?
      `);
      stats[key] = db.prepare(`
        WITH bests AS (
          SELECT COALESCE(student_id, 'n:' || name) AS ident, ${agg}(value) AS best
          FROM game_scores WHERE ${where} GROUP BY ident
        )
        SELECT
          (SELECT best FROM bests WHERE ident = @ident) AS my_best,
          (SELECT COUNT(*) FROM bests) AS total,
          (SELECT COUNT(*) FROM bests WHERE best ${cmp}
             (SELECT best FROM bests WHERE ident = @ident)) AS better
      `);
    }
  }
  return { entries, stats };
}
const STMT = buildStmts();

const insertScoreStmt = db.prepare(`
  INSERT INTO game_scores (game, metric, value, student_id, name, ip_hash, ua)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
// The aggregate (MAX/MIN) cannot be a bind param, so prepare both variants once.
const bestByStudent = {
  h: db.prepare('SELECT MAX(value) AS best FROM game_scores WHERE game = ? AND student_id = ?'),
  l: db.prepare('SELECT MIN(value) AS best FROM game_scores WHERE game = ? AND student_id = ?'),
};
const bestByName = {
  h: db.prepare('SELECT MAX(value) AS best FROM game_scores WHERE game = ? AND student_id IS NULL AND name = ?'),
  l: db.prepare('SELECT MIN(value) AS best FROM game_scores WHERE game = ? AND student_id IS NULL AND name = ?'),
};

// ── RATE LIMIT (bounded, per ip_hash and per student) ─────────────────────────
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;
const RL_MAX_KEYS = 10_000;
const rlBuckets = new Map();

function overLimit(key) {
  const now = Date.now();
  let b = rlBuckets.get(key);
  if (!b || now - b.start >= RL_WINDOW_MS) {
    if (rlBuckets.size >= RL_MAX_KEYS) {
      for (const [k, v] of rlBuckets) if (now - v.start >= RL_WINDOW_MS) rlBuckets.delete(k);
      if (rlBuckets.size >= RL_MAX_KEYS) rlBuckets.clear();
    }
    b = { start: now, count: 0 };
    rlBuckets.set(key, b);
  }
  b.count++;
  return b.count > RL_MAX;
}

// ── STATS HELPERS ─────────────────────────────────────────────────────────────
// percentile is the "top N%" standing: 0 = best. round(better / total * 100).
function youBlock(game, higher, window, ident, allTimeBest) {
  const key = `${higher ? 'h' : 'l'}${window === 'all' ? 'a' : 'w'}`;
  const params = window === 'all' ? [game] : [game, windowStart(window)];
  const st = STMT.stats[key].get(...params, { ident });
  const inWindow = st && st.my_best != null;
  return {
    rank: inWindow ? st.better + 1 : null,
    best: allTimeBest,
    percentile: inWindow && st.total > 0 ? Math.round((st.better / st.total) * 100) : null,
  };
}

// ── POST /api/game/score ──────────────────────────────────────────────────────
router.post('/score', optionalStudent, (req, res) => {
  try {
    const b = req.body || {};

    const game = typeof b.game === 'string' ? b.game.trim() : '';
    const reg = REGISTRY[game];
    if (!reg) return res.status(400).json({ error: `Unknown game id '${game}'.` });

    const value = Number(b.value);
    if (!Number.isFinite(value) || value < reg.min || value > reg.max) {
      return res.status(400).json({ error: `value must be a number between ${reg.min} and ${reg.max} for '${game}'.` });
    }

    // Identity + display name. Signed in: attribute to the student and use their
    // display name. Anonymous: require a submitted name that survives sanitizing.
    let studentId = null;
    let name;
    if (req.student) {
      studentId = req.student.id;
      name = req.student.display_name;
    } else {
      name = sanitizeName(b.name);
      if (!name) return res.status(400).json({ error: 'A name is required for anonymous play.' });
    }

    const hash = ipHash(req);
    // Rate limit both surfaces. overLimit increments, so evaluate both.
    const ipOver = overLimit('ip:' + hash);
    const stuOver = studentId ? overLimit('stu:' + studentId) : false;
    if (ipOver || stuOver) {
      return res.status(429).json({ error: 'Slow down a moment and try again.' });
    }

    const ua = (req.get('user-agent') || '').slice(0, 120) || null;
    // metric is the server's registry label, never the client-sent one.
    insertScoreStmt.run(game, reg.metric, value, studentId, name, hash, ua);

    const bestRow = studentId
      ? bestByStudent[reg.higher ? 'h' : 'l'].get(game, studentId)
      : bestByName[reg.higher ? 'h' : 'l'].get(game, name);
    const allTimeBest = bestRow ? bestRow.best : value;

    // rank/percentile the widget toasts are for the current day window.
    const you = youBlock(game, reg.higher, 'today', identOf(studentId, name), allTimeBest);

    res.json({ ok: true, you });
  } catch (e) {
    console.error('Game score error:', e);
    res.status(500).json({ error: 'Failed to record score' });
  }
});

// ── GET /api/game/leaderboard?game=G&window=W&limit=10 ────────────────────────
router.get('/leaderboard', optionalStudent, (req, res) => {
  try {
    const game = typeof req.query.game === 'string' ? req.query.game.trim() : '';
    const reg = REGISTRY[game];
    if (!reg) return res.status(400).json({ error: `Unknown game id '${game}'.` });

    const window = req.query.window ? String(req.query.window) : 'today';
    if (!WINDOWS.has(window)) {
      return res.status(400).json({ error: "window must be one of today, week, month, year, all." });
    }

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 10;
    limit = Math.min(limit, 50);

    const key = `${reg.higher ? 'h' : 'l'}${window === 'all' ? 'a' : 'w'}`;
    const params = window === 'all' ? [game, limit] : [game, windowStart(window), limit];
    const rows = STMT.entries[key].all(...params);
    const entries = rows.map((r, i) => ({ rank: i + 1, name: r.name, value: r.best }));

    const out = { entries };

    if (req.student) {
      const bestRow = bestByStudent[reg.higher ? 'h' : 'l'].get(game, req.student.id);
      if (bestRow && bestRow.best != null) {
        out.you = youBlock(game, reg.higher, window, req.student.id, bestRow.best);
      }
    }

    res.json(out);
  } catch (e) {
    console.error('Game leaderboard error:', e);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

module.exports = router;
