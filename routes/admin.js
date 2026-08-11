// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN ROUTES — owner-only read access to the whole database.
//  Mount in server.js:  app.use('/api/admin', require('./routes/admin'));
//
//  SECURITY MODEL (this is the part the old draft got wrong):
//   • FAILS CLOSED. If ADMIN_KEY is unset or weak, every route returns 503.
//     There is no "no key configured => open" path. That was the leak.
//   • Key is checked in ONE middleware applied to the whole router, so a new
//     route added below cannot accidentally be left unprotected.
//   • Constant-time comparison (SHA-256 digest + timingSafeEqual).
//   • password_hash and pin_hash are NEVER selected. Not in any query.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const session = require('../lib/admin-session');
const metrics = require('../lib/admin-metrics');
const analytics = require('../lib/admin-analytics');
const exec = require('../lib/admin-exec');
const health = require('../lib/admin-health');
const teacherView = require('../lib/admin-teacher');
const resetLib = require('../lib/password-reset');
const unified = require('../lib/admin-unified');
const gradebook = require('../lib/admin-gradebook');
const contract = require('../lib/gradebook-contract');
const denominators = require('../lib/admin-denominators');
const scoreSources = require('../lib/score-sources');
const ungraded = require('../lib/admin-ungraded');
const wire = require('../lib/wire-log');
const trafficAnalysis = require('../lib/traffic-analysis');
const trafficIngest = require('../lib/traffic-ingest');
const trafficGoogle = require('../lib/traffic-google');
const trafficCsv = require('../lib/traffic-csv');
const { retrySqlExpr } = require('../retry-policy');

const router = express.Router();

const MIN_KEY_LEN = 20;

// ── AUTH (fail closed) ────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const configured = process.env.ADMIN_KEY || '';

  // No key, or a weak key, means the admin API is OFF. Never open.
  if (configured.length < MIN_KEY_LEN) {
    return res.status(503).json({
      error: 'Admin API disabled. Set a strong ADMIN_KEY (>= 20 chars) in the environment.',
    });
  }

  // HEADER ONLY. The ?key= querystring fallback was removed: a key on the URL
  // lands in Railway's access logs, in browser history, and in any Referer sent
  // by a page loaded with it, and this one key is full read plus write across
  // every admin route. Browsers get in through /admin/login, which exchanges the
  // key for the httpOnly session cookie checked below; curl sends x-admin-key.
  const provided = req.get('x-admin-key') || '';
  if (provided) {
    // Hash both to a fixed 32 bytes so the compare is constant-time and does not
    // leak key length. timingSafeEqual throws on length mismatch otherwise.
    const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
    if (crypto.timingSafeEqual(digest(provided), digest(configured))) return next();
    return res.status(403).json({ error: 'Invalid or missing admin key.' });
  }

  // Dashboard session cookie: a valid signed cookie proves the holder passed the
  // key check at /admin/login. Accepted for SAFE (read-only) methods only, so the
  // cookie can never authorize a mutation route (access-codes, entitlements); those
  // always require the x-admin-key header. Combined with the cookie's SameSite=Strict,
  // this closes CSRF against the admin API.
  if ((req.method === 'GET' || req.method === 'HEAD') && session.isAuthed(req)) return next();

  return res.status(403).json({ error: 'Invalid or missing admin key.' });
}

// Every route on this router is now behind the key. Add routes AFTER this line.
router.use(requireAdmin);

// ── INDEX: what's available ───────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    ok: true,
    endpoints: [
      'GET /api/admin/overview            top-line counts',
      'GET /api/admin/summary             bucketed adoption metrics: activation, deltas, cohort, data-quality',
      'GET /api/admin/exec                executive KPIs: active teachers/students, new classrooms, completion + pass rates, returning %, top/abandoned lessons',
      'GET /api/admin/wire-log           what pages actually send to the scoring endpoints; ?endpoint= ?activity= ?limit=',
      'GET /api/admin/health              data pipeline health: where scores are not syncing, rollup gaps, manifest gaps, quiet classes',
      'GET /api/admin/teachers            every teacher with usage + pipeline status',
      'GET /api/admin/teacher/:id         one teacher in full: classes, gradebook readiness, feature adoption, roster (anonymized), timeline',
      'POST /api/admin/teacher/:id/reset-password   set a temporary password (header key required); everything else about the account is preserved',
      'POST /api/admin/teacher/:id/reset-link       generate a single-use reset link to relay; the teacher then chooses her own password',
      'DELETE /api/admin/teacher/:id      hard delete, guarded; no ?confirm= returns a dry-run impact report',
      'GET /api/admin/analytics           full deck: by-course, by-teacher, geography, funnel, device, trends, hardest items',
      'GET /api/admin/unified             exec + summary + analytics in one pass, plus a cross-deck agreement check; ?days= applies to the analytics deck only',
      'GET /api/admin/traffic             GA4/GSC/Clarity/Raptive dailies: series, trend, compare, projection, movers, rankings; ?metric= ?source= ?days=',
      'POST /api/admin/traffic/pull       fetch GA4 + Search Console now (header key required); idempotent, safe to schedule',
      'POST /api/admin/traffic/import     import a Raptive or Clarity CSV export (header key required); {source, csv, date?, dry_run?}',
      'GET /api/admin/sessions            heartbeat/session pipeline diagnostic: counts + recent rows',
      'GET /api/admin/stats               adoption + growth rollup (external vs raw)',
      'GET /api/admin/classes             every class + teacher + student/completion counts',
      'GET /api/admin/students            roster; filter ?class_code= or ?class_id=',
      'GET /api/admin/class/:code         one class: meta + roster + recent activity',
      'GET /api/admin/student/:id         per-lesson visit status + grade-of-record per item, vs manifest',
      'GET /api/admin/class/:id/gradebook full gradebook: merges attempts + score_events rollups; ?reveal=1 for real names, ?course= for solo',
      'GET /api/admin/class/:id/gradebook/as-teacher  the canonical contract, the same builder and the same output the teacher route returns; anonymized unless ?reveal=1',
      'GET /api/admin/denominators        which graded columns have an authored "out of"; ?course= required, proposes values where the data agrees',
      'GET /api/admin/ungraded-fallout   completed activities that were never scored, and how much real graded work sits alongside them; ?course=',
      'POST /api/admin/denominators/adopt author denominators (header key required); {course, adopt_proposed} or {course, values}, dry_run supported',
      'POST /api/admin/denominators/remove un-author denominators (header key required); {course, activity_types} plus optional lessons / only_possible, dry_run supported',
      'GET /api/admin/schema              live table/column listing',
      'GET /api/admin/score-events        raw graded-interaction ledger; ?student_id= ?class_code= ?course= ?limit=',
    ],
  });
});

// ── OVERVIEW: top-line counts ─────────────────────────────────────────────────
router.get('/overview', (req, res) => {
  try {
    const one = (sql) => db.prepare(sql).get().n;
    res.json({
      teachers: one(`SELECT COUNT(*) n FROM teachers`),
      classes: one(`SELECT COUNT(*) n FROM classes`),
      classes_active: one(`SELECT COUNT(*) n FROM classes WHERE active = 1`),
      students: one(`SELECT COUNT(*) n FROM students`),
      progress_rows: one(`SELECT COUNT(*) n FROM progress`),
      completions: one(`SELECT COUNT(*) n FROM progress WHERE completed = 1`),
      quiz_attempts: one(`SELECT COUNT(*) n FROM quiz_attempts`),
      attempts: one(`SELECT COUNT(*) n FROM attempts`),
      manifest_items: one(`SELECT COUNT(*) n FROM course_manifest`),
      classes_by_course: db.prepare(
        `SELECT course, COUNT(*) n FROM classes GROUP BY course ORDER BY n DESC`
      ).all(),
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/overview:', e);
    res.status(500).json({ error: 'overview failed', detail: e.message });
  }
});

// ── SESSIONS DIAGNOSTIC: is the heartbeat pipeline delivering? ────────────────
//  Ground truth for the "everything session-based reads 0" question. If total is
//  0, no heartbeats are being recorded (the reporter is not on the pages, or is
//  firing but silently idle: no course / no student token). If total > 0 but the
//  deck still shows 0, that is a read/display bug to chase here. Read-only; the
//  recent rows carry no PII (durations, counts, structured ids, coarse UA).
router.get('/sessions', (req, res) => {
  try {
    const scalar = (sql) => db.prepare(sql).get().n;
    const has = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
    if (!has) return res.json({ sessions_table: false, total: 0, note: 'sessions table does not exist yet' });
    res.json({
      sessions_table: true,
      total:             scalar('SELECT COUNT(*) n FROM sessions'),
      last_24h:          scalar("SELECT COUNT(*) n FROM sessions WHERE started_at >= datetime('now','-1 day')"),
      last_7d:           scalar("SELECT COUNT(*) n FROM sessions WHERE started_at >= datetime('now','-7 days')"),
      distinct_students: scalar('SELECT COUNT(DISTINCT student_id) n FROM sessions'),
      with_channel:      scalar("SELECT COUNT(*) n FROM sessions WHERE channel IS NOT NULL"),
      with_active_time:  scalar('SELECT COUNT(*) n FROM sessions WHERE active_seconds > 0'),
      orphan_class:      scalar('SELECT COUNT(*) n FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = s.class_id)'),
      recent: db.prepare(`
        SELECT s.started_at, s.last_beat_at, s.course, s.channel, s.referrer_host,
               s.active_seconds, s.total_seconds, s.page_views, c.class_code,
               substr(COALESCE(s.ua,''), 1, 40) AS ua
        FROM sessions s LEFT JOIN classes c ON c.id = s.class_id
        ORDER BY s.last_beat_at DESC LIMIT 10
      `).all(),
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/sessions:', e);
    res.status(500).json({ error: 'sessions diagnostic failed', detail: e.message });
  }
});

// ── SUMMARY: bucketed adoption metrics (single classifier) ────────────────────
//  The one place classes are bucketed (SOLO / TANNER / PROBER / AUDIT / EXTERNAL)
//  so admin stats can never disagree with a hand-derived number. Powers the
//  activation panel, 24h/7d deltas, Florida cohort, and the reconciliation guard.
//  A GET, so the dashboard session cookie authorizes it; auth is inherited from
//  requireAdmin above. The only write is the idempotent daily snapshot baseline.
router.get('/summary', (req, res) => {
  try {
    res.json(metrics.computeSummary());
  } catch (e) {
    console.error('admin/summary:', e);
    res.status(500).json({ error: 'summary failed', detail: e.message });
  }
});

// ── EXEC: the ten decision-driving KPIs on one page ───────────────────────────
//  Active teachers/students (7d), new classrooms this week, lesson completion
//  rate, CFU + quiz pass rates, returning student %, daily lesson completions,
//  and the most-used / highest-abandonment lessons. Same real-user population and
//  manifest denominators as the other decks; a GET, so the session cookie authorizes it.
router.get('/exec', (req, res) => {
  try {
    res.json(exec.computeExec());
  } catch (e) {
    console.error('admin/exec:', e);
    res.status(500).json({ error: 'exec failed', detail: e.message });
  }
});

// ── HEALTH: is the data pipeline actually delivering? ─────────────────────────
//  Cross-checks the four writers that feed a gradebook (visits, score_events,
//  attempts, quiz_attempts) and reports every case of "X happened but the Y that
//  should accompany it did not". A silently-missing reporter produces no error
//  anywhere; this is what makes that absence visible.
router.get('/health', (req, res) => {
  try {
    res.json(health.computeHealth());
  } catch (e) {
    console.error('admin/health:', e);
    res.status(500).json({ error: 'health failed', detail: e.message });
  }
});

// ── WIRE LOG: what the pages actually SEND to the scoring endpoints ──────────
//  Reading code cannot tell you which of the three scoring paths a page posts to
//  or what shape its payload has, and each guess costs a deploy. This returns the
//  most recent scoring requests as captured on the wire.
//
//  Shape only, never content: field names, value types, and numbers (option
//  indices, scores, counts). No answer text, no student names, no free text. The
//  student id is reduced to a short hash so one student's repeat submissions can
//  be correlated without identifying them.
//
//  ?endpoint= filters by path fragment, ?activity= by activity_type, ?limit= caps rows.
router.get('/wire-log', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 40, 120);
    let rows = wire.recent(120);
    if (req.query.endpoint) {
      const f = String(req.query.endpoint).toLowerCase();
      rows = rows.filter((r) => String(r.endpoint).toLowerCase().includes(f));
    }
    if (req.query.activity) {
      const a = String(req.query.activity).toLowerCase();
      rows = rows.filter((r) => String(r.activity_type || '').toLowerCase() === a);
    }
    res.json({ ...wire.stats(), returned: Math.min(rows.length, limit), entries: rows.slice(0, limit) });
  } catch (e) {
    console.error('admin/wire-log:', e);
    res.status(500).json({ error: 'wire log failed', detail: e.message });
  }
});

// ── TEACHERS: list every teacher with usage + pipeline status ─────────────────
router.get('/teachers', (req, res) => {
  try {
    res.json(teacherView.listTeachers());
  } catch (e) {
    console.error('admin/teachers:', e);
    res.status(500).json({ error: 'teachers failed', detail: e.message });
  }
});

// ── TEACHER DETAIL: one account in full ──────────────────────────────────────
//  :id accepts a teacher id or email. Rosters come back ANONYMIZED ("Student N")
//  unless ?reveal=1 is passed: the pipeline questions never need real names, and
//  the students are minors.
router.get('/teacher/:id', (req, res) => {
  try {
    const out = teacherView.teacherDetail(req.params.id, { reveal: req.query.reveal === '1' });
    if (!out) return res.status(404).json({ error: `No teacher with id or email ${req.params.id}` });
    res.json(out);
  } catch (e) {
    console.error('admin/teacher/:id:', e);
    res.status(500).json({ error: 'teacher drill failed', detail: e.message });
  }
});

// ── TEACHER ACCOUNT ADMIN (mutations: x-admin-key header required) ────────────
//  requireAdmin only honours the dashboard cookie for GET/HEAD, so every route
//  below needs the raw key in the header. That is deliberate: these change or
//  destroy account data and must never be reachable by a browser-side CSRF.

const stmtFindTeacher = db.prepare(
  'SELECT id, email, name, school, created_at FROM teachers WHERE id = ? OR email = ?'
);
function findTeacher(key) {
  return stmtFindTeacher.get(String(key), String(key).toLowerCase());
}

// Human-relayable temporary password: 3 groups of 4 from an unambiguous alphabet
// (no O/0, l/1) so it survives being read aloud or retyped. ~62 bits of entropy.
const PW_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function tempPassword() {
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    if (i && i % 4 === 0) out += '-';
    out += PW_ALPHABET[bytes[i] % PW_ALPHABET.length];
  }
  return out;
}

// What a hard delete would remove. Used both for the dry run and to decide
// whether the call needs ?force=1 (any real student work makes it destructive).
function deletionImpact(teacherId) {
  const ids = db.prepare('SELECT id FROM classes WHERE teacher_id = ?').all(teacherId).map((r) => r.id);
  if (!ids.length) {
    return { classes: 0, students: 0, progress_rows: 0, score_events: 0, attempts: 0, sessions: 0, entitlements: countEnt(teacherId), has_student_work: false };
  }
  const ph = ids.map(() => '?').join(',');
  const n = (sql) => db.prepare(sql).get(...ids).n;
  const impact = {
    classes: ids.length,
    students: n(`SELECT COUNT(*) n FROM students WHERE class_id IN (${ph})`),
    progress_rows: n(`SELECT COUNT(*) n FROM progress WHERE class_id IN (${ph})`),
    score_events: n(`SELECT COUNT(*) n FROM score_events WHERE class_id IN (${ph})`),
    attempts: n(`SELECT COUNT(*) n FROM attempts WHERE class_id IN (${ph})`),
    sessions: n(`SELECT COUNT(*) n FROM sessions WHERE class_id IN (${ph})`),
    entitlements: countEnt(teacherId),
  };
  impact.has_student_work = impact.progress_rows > 0 || impact.score_events > 0 || impact.attempts > 0;
  return impact;
}
function countEnt(teacherId) {
  return db.prepare('SELECT COUNT(*) n FROM entitlements WHERE teacher_id = ?').get(teacherId).n;
}

// POST /api/admin/teacher/:id/reset-password
//  The safe answer to "I am locked out" or "just delete me so I can re-sign up".
//  Sets a fresh temporary password and returns it once, in the response body, for
//  the operator to relay. Nothing else about the account changes: same teacher_id,
//  so classes, rosters, gradebook history, and entitlements are all untouched.
//  Any outstanding self-service reset tokens are burned so an old emailed link
//  cannot be used to take the account back over.
router.post('/teacher/:id/reset-password', async (req, res) => {
  try {
    const t = findTeacher(req.params.id);
    if (!t) return res.status(404).json({ error: `No teacher with id or email ${req.params.id}` });

    const password = (req.body && req.body.password) ? String(req.body.password) : tempPassword();
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const hash = await bcrypt.hash(password, 12);
    db.transaction(() => {
      db.prepare('UPDATE teachers SET password_hash = ? WHERE id = ?').run(hash, t.id);
      db.prepare('DELETE FROM password_reset_tokens WHERE teacher_id = ?').run(t.id);
    })();

    console.log(`[admin] password reset for teacher ${t.id} (${t.email})`);
    res.json({
      ok: true,
      teacher: { id: t.id, email: t.email, name: t.name },
      temporary_password: password,
      note: 'Relay this to the teacher over a channel you trust. It replaces their old password immediately. Everything else about the account is unchanged.',
    });
  } catch (e) {
    console.error('admin/teacher/:id/reset-password:', e);
    res.status(500).json({ error: 'password reset failed', detail: e.message });
  }
});

// POST /api/admin/teacher/:id/reset-link
//  Generates a password-reset LINK and returns it, without sending any email.
//  This is the better answer than handing out a temporary password: the teacher
//  chooses her own password, the link is single-use, and it expires on its own.
//  Use it while email delivery is not configured yet; once RESEND_API_KEY is set
//  the teacher can just use /teacher/forgot herself and this becomes a fallback.
//
//  The link is a bearer credential for that account until it is used or expires,
//  so relay it over a channel you trust and do not paste it anywhere public.
router.post('/teacher/:id/reset-link', (req, res) => {
  try {
    const t = findTeacher(req.params.id);
    if (!t) return res.status(404).json({ error: `No teacher with id or email ${req.params.id}` });

    const minted = resetLib.mintResetLink(t.id);
    console.log(`[admin] reset link generated for teacher ${t.id} (${t.email})`);
    res.json({
      ok: true,
      teacher: { id: t.id, email: t.email, name: t.name },
      reset_link: minted.link,
      expires_at: minted.expires_at,
      ttl_minutes: minted.ttl_minutes,
      note: 'Single use. Send this to the teacher over a channel you trust; she opens it and chooses her own password. It replaces any earlier link for this account.',
    });
  } catch (e) {
    console.error('admin/teacher/:id/reset-link:', e);
    res.status(500).json({ error: 'reset link generation failed', detail: e.message });
  }
});

// DELETE /api/admin/teacher/:id?confirm=<email>[&force=1]
//  HARD delete, and genuinely destructive: classes, students, progress, and
//  score_events all cascade from the teacher row, and entitlements go with it.
//  attempts and sessions carry no foreign key, so they are removed explicitly
//  here; leaving them behind would orphan rows that still count in the analytics
//  and health modules.
//
//  Guarded three ways: no ?confirm returns a dry-run impact report and changes
//  nothing; ?confirm must equal the teacher's own email; and if the account holds
//  any real student work the call is refused unless ?force=1 is also present.
//  Prefer reset-password: a locked-out teacher never needs deletion.
router.delete('/teacher/:id', (req, res) => {
  try {
    const t = findTeacher(req.params.id);
    if (!t) return res.status(404).json({ error: `No teacher with id or email ${req.params.id}` });

    const impact = deletionImpact(t.id);
    const confirm = String(req.query.confirm || '').toLowerCase();
    const force = req.query.force === '1';

    if (confirm !== String(t.email).toLowerCase()) {
      return res.status(400).json({
        ok: false,
        dry_run: true,
        teacher: { id: t.id, email: t.email, name: t.name },
        would_delete: impact,
        how_to_confirm: `DELETE /api/admin/teacher/${t.id}?confirm=${encodeURIComponent(t.email)}` + (impact.has_student_work ? '&force=1' : ''),
        warning: impact.has_student_work
          ? 'This account holds real student work. Deleting is permanent and cannot be undone. A locked-out teacher should be given a new password instead: POST /api/admin/teacher/:id/reset-password'
          : 'Nothing but empty class shells would be removed. A password reset is still the better fix for a lockout.',
      });
    }
    if (impact.has_student_work && !force) {
      return res.status(409).json({
        ok: false,
        error: 'Refusing to delete: this account holds student work.',
        would_delete: impact,
        override: `Add &force=1 only if you are certain this gradebook data should be destroyed.`,
      });
    }

    const ids = db.prepare('SELECT id FROM classes WHERE teacher_id = ?').all(t.id).map((r) => r.id);
    db.transaction(() => {
      if (ids.length) {
        const ph = ids.map(() => '?').join(',');
        // No FK on these two, so they must be cleared by hand or they orphan.
        db.prepare(`DELETE FROM attempts WHERE class_id IN (${ph})`).run(...ids);
        db.prepare(`DELETE FROM sessions WHERE class_id IN (${ph})`).run(...ids);
      }
      // Cascades: classes -> students -> progress / score_events / quiz_attempts,
      // plus entitlements and any reset tokens.
      db.prepare('DELETE FROM teachers WHERE id = ?').run(t.id);
    })();

    console.log(`[admin] DELETED teacher ${t.id} (${t.email}) removing ${impact.classes} class(es), ${impact.students} student(s)`);
    res.json({
      ok: true,
      deleted: { id: t.id, email: t.email, name: t.name },
      removed: impact,
      note: 'The email is now free to register again from scratch.',
    });
  } catch (e) {
    console.error('admin/teacher/:id delete:', e);
    res.status(500).json({ error: 'teacher delete failed', detail: e.message });
  }
});

// ── ANALYTICS: the full breakdown deck ────────────────────────────────────────
//  by-course, by-teacher, geography (school/district/state from email domain),
//  engagement funnel, device/browser/OS, 30-day trends, and hardest items. Read
//  only; a GET, so the dashboard session cookie authorizes it. All breakdowns use
//  the same real-user population (owner / prober / audit excluded) as /summary.
router.get('/analytics', (req, res) => {
  try {
    res.json(analytics.computeAnalytics(parseInt(req.query.days, 10)));
  } catch (e) {
    console.error('admin/analytics:', e);
    res.status(500).json({ error: 'analytics failed', detail: e.message });
  }
});

// ── UNIFIED: exec KPIs + adoption summary + breakdown deck in one response ────
//  Backs /admin/unified. The three decks each scan every class and run their own
//  aggregate suite, so three auto-refreshing tabs meant three full passes a
//  minute against the same data. This serves all three from one pass, adds a
//  cross-check over the figures more than one deck derives independently, and
//  memoizes per range for a short TTL (key space is the range allow-list, so the
//  cache cannot grow with traffic).
//
//  ?days applies to the analytics deck only; the exec KPIs and the adoption
//  summary carry their own fixed windows by design. Read-only, so the dashboard
//  session cookie authorizes it, same as the decks it composes.
router.get('/unified', (req, res) => {
  try {
    res.json(unified.computeUnified(parseInt(req.query.days, 10)));
  } catch (e) {
    console.error('admin/unified:', e);
    res.status(500).json({ error: 'unified failed', detail: e.message });
  }
});

// ── TRAFFIC: the site-side deck (GA4, Search Console, Clarity, Raptive) ──────
//  Backs /admin/traffic. Reads metrics_daily, which already carries the
//  aggregates-only rule and 400-day retention, so nothing new is stored per
//  request and the box cannot be grown into.
//
//  ?metric  canonical name (pageviews, clicks, position, revenue, ...)
//  ?source  ga4 | gsc | clarity | raptive; omitted rolls sources up
//  ?days    window; every window ends YESTERDAY, because today is a partial day
//           at every one of these sources and charting it draws a daily cliff.
router.get('/traffic', (req, res) => {
  try {
    const metric = String(req.query.metric || 'pageviews');
    const source = req.query.source ? String(req.query.source) : null;
    const days = parseInt(req.query.days, 10) || 90;

    const points = trafficAnalysis.series(metric, { source, days });
    res.json({
      generated_at: new Date().toISOString(),
      metric,
      source,
      days,
      inventory: trafficAnalysis.inventory(),
      connectors: trafficGoogle.status(),
      series: points,
      trend: trafficAnalysis.movingAverage(points, 7),
      compare: trafficAnalysis.compare(metric, { source, days: Math.min(28, days) }),
      projection: trafficAnalysis.project(metric, { source, days, horizon: 30 }),
      movers: trafficAnalysis.movers(metric, { source, namespace: 'page', days: Math.min(28, days) }),
      rankings: trafficAnalysis.rankings({ days: Math.min(28, days) }),
    });
  } catch (e) {
    console.error('admin/traffic:', e);
    res.status(500).json({ error: 'traffic failed', detail: e.message });
  }
});

// Pull the Google sources now. POST, so the session cookie cannot trigger it;
// the x-admin-key header is required, same as every other mutation here.
//
// Safe to call repeatedly and safe to call on a schedule: metrics_daily is keyed
// on (date, source, metric, dimension), so re-pulling a day corrects it in place.
// That is required rather than merely convenient, because GSC restates recent
// days for about 72 hours and an append would inflate every number it touched.
router.post('/traffic/pull', async (req, res) => {
  try {
    const want = String((req.body && req.body.source) || 'all');
    const range = {
      startDate: (req.body && req.body.start_date) || undefined,
      endDate: (req.body && req.body.end_date) || undefined,
    };
    const dryRun = Boolean(req.body && req.body.dry_run);
    const out = {};

    // EACH SOURCE IS ISOLATED. Sharing one try/catch meant a failure in the
    // second source discarded the first one's result: GA4 would fetch, ingest,
    // and WRITE, then a GSC error would surface as a 500 and the caller would
    // never learn GA4 had succeeded. A daily job would read as broken while
    // actually half-working, which is the same "silence is indistinguishable
    // from failure" problem this whole feature exists to avoid.
    //
    // So a source that throws records its own error and the others still run.
    // The route reports 200 with a per-source verdict; ok:false says at least
    // one source failed, without pretending the healthy ones did.
    const pull = async (name, fetcher, label) => {
      if (want !== 'all' && want !== name) return;
      try {
        const r = await fetcher(range);
        out[name] = r.configured
          ? { ...trafficIngest.ingest(r.readings, { dryRun }), [label]: r[label] }
          : { configured: false, reason: r.reason };
      } catch (e) {
        console.error('admin/traffic/pull ' + name + ':', e.message);
        out[name] = { configured: true, ok: false, error: e.message, written: 0 };
      }
    };

    await pull('ga4', trafficGoogle.fetchGa4, 'property');
    await pull('gsc', trafficGoogle.fetchGsc, 'site');

    const failed = Object.entries(out).filter(([, v]) => v.error || v.configured === false).map(([k]) => k);
    res.json({ ok: failed.length === 0, failed, dry_run: dryRun, ...out });
  } catch (e) {
    console.error('admin/traffic/pull:', e);
    res.status(500).json({ error: 'traffic pull failed', detail: e.message });
  }
});

// Import a Raptive or Clarity CSV export. These two have no unattended API path
// we can rely on, so the dashboard export is the input. It goes through the same
// contract, the same caps and the same upsert as an API pull, so an imported day
// is indistinguishable downstream from a fetched one.
router.post('/traffic/import', (req, res) => {
  try {
    const body = req.body || {};
    const parsed = trafficCsv.parseExport(String(body.csv || ''), {
      source: String(body.source || ''),
      defaultDate: body.date ? String(body.date) : null,
    });
    if (!parsed.ok) return res.status(400).json({ error: 'csv not understood', ...parsed });

    const written = trafficIngest.ingest(parsed.readings, { dryRun: Boolean(body.dry_run) });
    res.json({
      ok: true,
      parsed: {
        rows: parsed.rows,
        mapped_metrics: parsed.mapped_metrics,
        mapped_dimension: parsed.mapped_dimension,
        unmapped_headers: parsed.unmapped_headers,
        skipped_count: parsed.skipped_count,
      },
      ...written,
    });
  } catch (e) {
    console.error('admin/traffic/import:', e);
    res.status(500).json({ error: 'traffic import failed', detail: e.message });
  }
});

// ── STATS: adoption + growth rollup for the live tracker ──────────────────────
//  Richer than /overview. Separates REAL external adoption from owner / system /
//  audit rows, breaks students + completions down by course, and returns growth
//  over the last 30 days. Read-only; auth is inherited from requireAdmin above.
router.get('/stats', (req, res) => {
  try {
    // Rows that are NOT real external teachers. Hard-coded constants (no user
    // input), so interpolating them into the filter below is safe. Edit this
    // list if you add more of your own test/system emails.
    //
    // This MUST stay in lockstep with classifyClass (lib/admin-metrics): owner
    // (TANNER), solo, AUDIT, and PROBER are all excluded there, so the same four
    // buckets are excluded here. Miss one and this endpoint's "external" tiles
    // disagree with the adoption band / analytics / exec deck (the prober rows
    // once leaked in, inflating external students 15 -> 18 and teachers 53 -> 55).
    const INTERNAL_FILTER = `
      LOWER(COALESCE(t.email, '')) NOT IN ('tannercrow12@gmail.com', 'solo@system.invalid', 'a@a.comsss')
      AND LOWER(COALESCE(t.email, '')) NOT LIKE '%audit%'
      AND LOWER(COALESCE(t.email, '')) NOT LIKE '%delete%'
      AND LOWER(COALESCE(t.email, '')) NOT LIKE '%kinws.com%'
    `;

    const scalar = (sql) => db.prepare(sql).get().n;
    const rows = (sql) => db.prepare(sql).all();

    // RAW — everything in the DB, unfiltered.
    const raw = {
      teachers:       scalar(`SELECT COUNT(*) n FROM teachers`),
      classes:        scalar(`SELECT COUNT(*) n FROM classes`),
      classes_active: scalar(`SELECT COUNT(*) n FROM classes WHERE active = 1`),
      students:       scalar(`SELECT COUNT(*) n FROM students`),
      completions:    scalar(`SELECT COUNT(*) n FROM progress WHERE completed = 1`),
      quiz_attempts:  scalar(`SELECT COUNT(*) n FROM quiz_attempts`),
    };

    // EXTERNAL — real teacher adoption (owner / system / audit removed).
    const external = {
      teachers: scalar(`
        SELECT COUNT(DISTINCT c.teacher_id) n
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}`),
      classes: scalar(`
        SELECT COUNT(*) n
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}`),
      classes_with_students: scalar(`
        SELECT COUNT(*) n
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}
          AND (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) > 0`),
      students: scalar(`
        SELECT COUNT(*) n
        FROM students s
        JOIN classes c  ON s.class_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}`),
      completions: scalar(`
        SELECT COUNT(*) n
        FROM progress p
        JOIN classes c  ON p.class_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE p.completed = 1 AND ${INTERNAL_FILTER}`),
    };

    // BY COURSE (external) — merged from three simple aggregates to avoid
    // cartesian blowups from joining students x progress in one query.
    const bcClasses = rows(`
      SELECT c.course, COUNT(*) n
      FROM classes c JOIN teachers t ON c.teacher_id = t.id
      WHERE ${INTERNAL_FILTER} GROUP BY c.course`);
    const bcStudents = rows(`
      SELECT c.course, COUNT(*) n
      FROM students s JOIN classes c ON s.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE ${INTERNAL_FILTER} GROUP BY c.course`);
    const bcCompletions = rows(`
      SELECT c.course, COUNT(*) n
      FROM progress p JOIN classes c ON p.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE p.completed = 1 AND ${INTERNAL_FILTER} GROUP BY c.course`);

    const courseMap = {};
    const merge = (list, key) => {
      for (const r of list) {
        if (!courseMap[r.course]) {
          courseMap[r.course] = { course: r.course, classes: 0, students: 0, completions: 0 };
        }
        courseMap[r.course][key] = r.n;
      }
    };
    merge(bcClasses, 'classes');
    merge(bcStudents, 'students');
    merge(bcCompletions, 'completions');
    const by_course = Object.values(courseMap).sort((a, b) => b.classes - a.classes);

    // GROWTH — last 30 days, using confirmed created_at columns.
    const classes_per_day = rows(`
      SELECT DATE(created_at) d, COUNT(*) n FROM classes
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at) ORDER BY d`);
    const students_per_day = rows(`
      SELECT DATE(created_at) d, COUNT(*) n FROM students
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at) ORDER BY d`);
    const new_teachers_per_day = rows(`
      SELECT DATE(first_seen) d, COUNT(*) n FROM (
        SELECT c.teacher_id, MIN(c.created_at) first_seen
        FROM classes c JOIN teachers t ON c.teacher_id = t.id
        WHERE ${INTERNAL_FILTER}
        GROUP BY c.teacher_id
      ) WHERE first_seen >= DATE('now', '-30 days')
      GROUP BY DATE(first_seen) ORDER BY d`);

    // ACTIVITY — recent movement from progress.updated_at.
    const activity = {
      updates_last_7_days:     scalar(`SELECT COUNT(*) n FROM progress WHERE updated_at >= DATETIME('now', '-7 days')`),
      completions_last_7_days: scalar(`SELECT COUNT(*) n FROM progress WHERE completed = 1 AND updated_at >= DATETIME('now', '-7 days')`),
    };

    // TOP external classes by engagement.
    const top_classes = rows(`
      SELECT
        c.class_code, c.class_name, c.course,
        t.name AS teacher_name, t.email AS teacher_email,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS students,
        (SELECT COUNT(*) FROM progress p WHERE p.class_id = c.id AND p.completed = 1) AS completions
      FROM classes c JOIN teachers t ON c.teacher_id = t.id
      WHERE ${INTERNAL_FILTER}
      ORDER BY completions DESC, students DESC
      LIMIT 10`);

    res.json({
      raw,
      external,
      by_course,
      growth: { classes_per_day, students_per_day, new_teachers_per_day },
      activity,
      top_classes,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/stats:', e);
    res.status(500).json({ error: 'stats failed', detail: e.message });
  }
});

// ── CLASSES: every class + teacher + counts ───────────────────────────────────
router.get('/classes', (req, res) => {
  try {
    const classes = db.prepare(`
      SELECT
        c.id, c.class_code, c.class_name, c.course, c.active,
        c.mastery_threshold, c.retry_allowed, c.retry_mode, c.created_at,
        t.name  AS teacher_name,
        t.email AS teacher_email,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count,
        (SELECT COUNT(*) FROM progress p WHERE p.class_id = c.id AND p.completed = 1) AS completions,
        -- Most recent activity in the class: the latest student sign-in (last_active
        -- is bumped on every authenticated request) or progress update, whichever
        -- is newer. NULL for a class no one has signed into yet.
        (SELECT MAX(ts) FROM (
           SELECT MAX(s.last_active) AS ts FROM students s WHERE s.class_id = c.id
           UNION ALL
           SELECT MAX(p.updated_at) AS ts FROM progress p WHERE p.class_id = c.id
         )) AS last_activity
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      ORDER BY c.created_at DESC
    `).all();
    res.json({ total: classes.length, classes });
  } catch (e) {
    console.error('admin/classes:', e);
    res.status(500).json({ error: 'classes failed', detail: e.message });
  }
});

// ── STUDENTS: roster (no pin_hash), filter by class_code or class_id ──────────
router.get('/students', (req, res) => {
  try {
    const { class_code, class_id } = req.query;
    let where = '';
    const args = [];
    if (class_id) {
      where = 'WHERE s.class_id = ?';
      args.push(class_id);
    } else if (class_code) {
      where = 'WHERE c.class_code = ?';
      args.push(String(class_code).toUpperCase());
    }
    const students = db.prepare(`
      SELECT
        s.id, s.class_id, s.display_name, s.student_ref,
        s.retry_override, s.created_at, s.last_active,
        c.class_code, c.class_name, c.course,
        (SELECT COUNT(*) FROM progress p WHERE p.student_id = s.id AND p.completed = 1) AS completions
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      ${where}
      ORDER BY s.last_active DESC NULLS LAST, s.created_at DESC
      LIMIT 5000
    `).all(...args);
    res.json({ total: students.length, students });
  } catch (e) {
    console.error('admin/students:', e);
    res.status(500).json({ error: 'students failed', detail: e.message });
  }
});

// ── CLASS DRILL: one class, roster, recent activity ───────────────────────────
router.get('/class/:code', (req, res) => {
  try {
    const code = String(req.params.code).toUpperCase();
    const cls = db.prepare(`
      SELECT
        c.id, c.class_code, c.class_name, c.course, c.active,
        c.mastery_threshold, c.retry_allowed, c.retry_mode, c.created_at,
        t.name AS teacher_name, t.email AS teacher_email
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.class_code = ?
    `).get(code);

    if (!cls) return res.status(404).json({ error: `No class with code ${code}` });

    const roster = db.prepare(`
      SELECT
        s.id, s.display_name, s.student_ref, s.active, s.created_at, s.last_active,
        (SELECT COUNT(*) FROM progress p WHERE p.student_id = s.id AND p.completed = 1) AS completions
      FROM students s
      WHERE s.class_id = ?
      ORDER BY s.last_active DESC NULLS LAST, s.created_at DESC
    `).all(cls.id);

    const recent_activity = db.prepare(`
      SELECT
        p.updated_at, p.course, p.unit, p.lesson, p.activity_type,
        p.completed, p.score, p.attempts,
        s.display_name
      FROM progress p
      JOIN students s ON p.student_id = s.id
      WHERE p.class_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 100
    `).all(cls.id);

    res.json({ class: cls, student_count: roster.length, roster, recent_activity });
  } catch (e) {
    console.error('admin/class/:code:', e);
    res.status(500).json({ error: 'class drill failed', detail: e.message });
  }
});

// ── HELPERS for the attempt-grade views below ─────────────────────────────────
//  Grade of record across many items in ONE window-function pass. Retry policy
//  per student (retry_override beats the class policy): best score ratio when
//  the best attempt counts for THIS item type, first attempt when it does not.
//  Both ROW_NUMBER orderings are computed and the CASE picks one, so this stays
//  a single scan. The decision itself comes from retry-policy.js, so this pass
//  cannot drift from the row-by-row JS paths.
const RETRY_SQL = retrySqlExpr('c.retry_mode', 's.retry_override', 'a.item_type', 'c.retry_allowed');
const GOR_SELECT = `
  SELECT student_id, course, lesson_id, item_id, item_type,
         score, max_score, passed, attempt_no, attempts
  FROM (
    SELECT a.student_id, a.course, a.lesson_id, a.item_id, a.item_type,
      a.score, a.max_score, a.passed, a.attempt_no,
      COUNT(*) OVER (PARTITION BY a.student_id, a.course, a.item_id) AS attempts,
      CASE WHEN ${RETRY_SQL} = 1
        THEN ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
               ORDER BY a.score * 1.0 / a.max_score DESC, a.attempt_no ASC)
        ELSE ROW_NUMBER() OVER (PARTITION BY a.student_id, a.course, a.item_id
               ORDER BY a.attempt_no ASC)
      END AS rn
    FROM attempts a
    JOIN students s ON s.id = a.student_id
    JOIN classes  c ON c.id = a.class_id
    %WHERE%
  ) WHERE rn = 1
`;

const pctOf = (earned, possible) => (possible > 0 ? Math.round((earned / possible) * 100) : 0);

// Lesson ids are dotted numbers ('1.2', '1.10'), so a plain string sort puts
// 1.10 before 1.2 and the gradebook columns come out in the wrong order.
// Compare segment by segment, numerically where both segments are numeric.
function compareLessonId(a, b) {
  const pa = String(a).split('.');
  const pb = String(b).split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const xa = pa[i], xb = pb[i];
    if (xa === undefined) return -1;
    if (xb === undefined) return 1;
    const na = Number(xa), nb = Number(xb);
    if (Number.isFinite(na) && Number.isFinite(nb)) {
      if (na !== nb) return na - nb;
    } else if (xa !== xb) {
      return xa < xb ? -1 : 1;
    }
  }
  return 0;
}

// ── STUDENT DRILL: per-lesson visits + grade-of-record per item ───────────────
//  Percentages compute against course_manifest, the single denominator
//  authority. The legacy ?total=NN param is accepted and ignored; the admin
//  tracker page still sends it.
router.get('/student/:id', (req, res) => {
  try {
    const student = db.prepare(`
      SELECT s.id, s.class_id, s.display_name, s.student_ref, s.retry_override,
             s.created_at, s.last_active,
             c.class_code, c.class_name, c.course, c.mastery_threshold, c.retry_allowed
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `).get(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Solo accounts roam, so report every course in the manifest; class
    // accounts report their class course only.
    const courseList = student.course === 'solo'
      ? db.prepare('SELECT DISTINCT course FROM course_manifest ORDER BY course').all().map(r => r.course)
      : [student.course];

    const placeholders = courseList.map(() => '?').join(',');
    const manifest = db.prepare(`
      SELECT course, unit, lesson_id, item_id, item_type, points
      FROM course_manifest WHERE course IN (${placeholders})
      ORDER BY course, unit, lesson_id, item_id
    `).all(...courseList);

    // Visit status from the existing page-visit tracking (never migrated).
    const visitRows = db.prepare(`
      SELECT DISTINCT course, lesson FROM progress
      WHERE student_id = ? AND completed = 1 AND activity_type NOT IN ('quiz', 'exam')
    `).all(student.id);
    const visited = new Set(visitRows.map(v => `${v.course}|${v.lesson}`));

    // Grade of record for every item this student has attempted, one pass.
    const gorRows = db.prepare(GOR_SELECT.replace('%WHERE%', 'WHERE a.student_id = ?')).all(student.id);
    const gorByItem = new Map(gorRows.map(g => [`${g.course}|${g.item_id}`, g]));

    // Assemble per-course, per-lesson view from the manifest skeleton.
    const courses = new Map();
    for (const m of manifest) {
      if (!courses.has(m.course)) {
        courses.set(m.course, {
          course: m.course,
          lessons: new Map(),
          summary: {
            visits: { visited: 0, total: 0, pct: 0 },
            graded: { earned: 0, possible: 0, pct: 0, items_total: 0, items_attempted: 0, items_passed: 0 },
          },
        });
      }
      const courseView = courses.get(m.course);
      if (!courseView.lessons.has(m.lesson_id)) {
        courseView.lessons.set(m.lesson_id, { lesson_id: m.lesson_id, unit: m.unit, visited: false, items: [] });
      }
      const lesson = courseView.lessons.get(m.lesson_id);

      if (m.item_type === 'visit') {
        lesson.visited = visited.has(`${m.course}|${m.lesson_id}`);
        courseView.summary.visits.total++;
        if (lesson.visited) courseView.summary.visits.visited++;
        continue;
      }

      const gor = gorByItem.get(`${m.course}|${m.item_id}`);
      lesson.items.push({
        item_id: m.item_id,
        item_type: m.item_type,
        max_score: m.points,
        score: gor ? gor.score : null,
        pct: gor ? pctOf(gor.score, m.points) : null,
        passed: gor ? !!gor.passed : null,
        attempts: gor ? gor.attempts : 0,
        attempt_no: gor ? gor.attempt_no : null,
      });
      courseView.summary.graded.possible += m.points;
      courseView.summary.graded.items_total++;
      if (gor) {
        courseView.summary.graded.earned += gor.score;
        courseView.summary.graded.items_attempted++;
        if (gor.passed) courseView.summary.graded.items_passed++;
      }
    }

    const courseViews = [...courses.values()].map(cv => {
      cv.summary.visits.pct = pctOf(cv.summary.visits.visited, cv.summary.visits.total);
      cv.summary.graded.pct = pctOf(cv.summary.graded.earned, cv.summary.graded.possible);
      return { course: cv.course, summary: cv.summary, lessons: [...cv.lessons.values()] };
    });

    res.json({
      student: {
        id: student.id, display_name: student.display_name, student_ref: student.student_ref,
        created_at: student.created_at, last_active: student.last_active,
        retry_override: student.retry_override,
      },
      class: {
        id: student.class_id, class_code: student.class_code, class_name: student.class_name,
        course: student.course, mastery_threshold: student.mastery_threshold,
        retry_allowed: student.retry_allowed,
      },
      courses: courseViews,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('admin/student/:id:', e);
    res.status(500).json({ error: 'student drill failed', detail: e.message });
  }
});

// ── CLASS GRADEBOOK: students x per-lesson aggregates, vs manifest ────────────
//  Reads are the heavy path: one window-function pass over attempts for the
//  whole class, one aggregate over progress for visits, no per-student queries.
//  :id accepts a class id or a class code. Solo system classes may pass
//  ?course= (default ap-csa) since their course column is 'solo'.
router.get('/class/:id/gradebook', (req, res) => {
  try {
    const out = gradebook.buildGradebook(req.params.id, {
      course: req.query.course,
      reveal: req.query.reveal === '1',
    });
    if (!out) return res.status(404).json({ error: `No class with id or code ${req.params.id}` });
    res.json(out);
  } catch (e) {
    console.error('admin/class/:id/gradebook:', e);
    res.status(500).json({ error: 'gradebook failed', detail: e.message });
  }
});

// ── THE CANONICAL GRADEBOOK, EXACTLY AS THE TEACHER SEES IT ──────────────────
//  Same builder, same arguments, same output as GET /api/teacher/classes/:code/
//  gradebook. Not a reimplementation of the teacher view: literally the function
//  the teacher route calls, so the two cannot drift and "is the teacher seeing
//  what I am seeing" stops being a question anyone has to answer by eye.
//
//  Anonymized by default (positional labels, "Student 1"), because an operator
//  verifying that the numbers are right does not need a minor's name to do it.
//  ?reveal=1 opts in to display names, same posture as every other admin route.
//  ?course= picks the course for a solo system class.
router.get('/class/:id/gradebook/as-teacher', (req, res) => {
  try {
    const out = contract.buildCanonicalGradebook(req.params.id, {
      course: req.query.course,
      reveal: req.query.reveal === '1',
    });
    if (!out) return res.status(404).json({ error: `No class with id or code ${req.params.id}` });
    res.json(out);
  } catch (e) {
    console.error('admin/class/:id/gradebook/as-teacher:', e);
    res.status(500).json({ error: 'gradebook failed', detail: e.message });
  }
});

// ── DENOMINATOR COVERAGE: which graded columns have an authored "out of" ─────
//  Both gradebooks display the authored denominator from course_denominators
//  whenever one exists, so filling a row corrects every existing gradebook
//  retroactively. Only ap-csa was ever seeded, which is why a Cybersecurity
//  gradebook still denominates by whatever was recorded. This reports the gap
//  per (lesson, activity) and, where the students' own submissions agree,
//  proposes the value to author.
//  ?course= (required), ?min_students=, ?agreement= to tune what counts as
//  agreement, ?status= to filter (e.g. ?status=proposed).
// GET /api/admin/score-sources[?course=&detail=1]
//   How much of the recorded work is a REAL PAIR (points earned out of how many)
//   versus a bare percentage, and which columns have ever reported a pair.
//
//   Two questions, deliberately separated:
//     cells   the ceiling on what any read-time fix can repair. A percent-only
//             cell is permanently lossy; "3 of 8" cannot be recovered from "38".
//     columns the work list. A column no student has ever produced a pair for is
//             a page that needs the reporter.
//
//   Read-only and safe against production: every statement is a SELECT. Zero
//   PII; student ids are counted, never returned. `detail=1` adds the per column
//   breakdown, which is long, so it is off by default.
router.get('/score-sources', (req, res) => {
  try {
    const out = scoreSources.audit({ course: req.query.course });
    if (req.query.detail !== '1') {
      out.courses = out.courses.map((c) => {
        const { column_detail, ...rest } = c;
        return rest;
      });
      out.note = 'Add &detail=1 for the per column breakdown, including which columns have never reported a pair.';
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/denominators', (req, res) => {
  try {
    const course = req.query.course;
    if (!course) {
      return res.status(400).json({
        error: 'course is required',
        courses: db.prepare('SELECT DISTINCT course FROM classes ORDER BY course').all().map((r) => r.course),
      });
    }
    const out = denominators.coverage(course, {
      min_students: req.query.min_students,
      agreement: req.query.agreement,
    });
    if (req.query.status) {
      const want = new Set(String(req.query.status).split(',').map((s) => s.trim()));
      out.columns = out.columns.filter((c) => want.has(c.status));
    }
    res.json(out);
  } catch (e) {
    console.error('admin/denominators:', e);
    res.status(500).json({ error: 'denominators failed', detail: e.message });
  }
});

// ── ADOPT DENOMINATORS: write the authored "out of" ───────────────────────────
//  A mutation, so the x-admin-key HEADER is required (the dashboard cookie is
//  read-only by design). Body:
//    { course, adopt_proposed: true }         author every column the class data
//                                             agrees on
//    { course, values: { "1.1|quiz": 10 } }   author explicit values
//    { ..., dry_run: true }                   return the plan, write nothing
//    { ..., overwrite: true }                 replace existing authored rows
//    { ..., include_ambiguous: true }         force columns students disagree on
//  Additive and reversible: the write only changes what gradebooks DISPLAY, and
//  deleting the row restores the previous behaviour exactly. No stored score is
//  touched, so nothing here can corrupt a grade.
router.post('/denominators/adopt', (req, res) => {
  try {
    const b = req.body || {};
    if (!b.course) return res.status(400).json({ error: 'course is required' });
    if (!b.adopt_proposed && !b.values) {
      return res.status(400).json({ error: 'nothing to do: pass adopt_proposed: true and/or values' });
    }
    const out = denominators.adopt(b.course, {
      values: b.values,
      adopt_proposed: !!b.adopt_proposed,
      include_ambiguous: !!b.include_ambiguous,
      overwrite: !!b.overwrite,
      dry_run: !!b.dry_run,
      min_students: b.min_students,
      agreement: b.agreement,
    });
    res.json(out);
  } catch (e) {
    console.error('admin/denominators/adopt:', e);
    res.status(500).json({ error: 'adopt failed', detail: e.message });
  }
});

// ── UNGRADED FALLOUT: who saw a fabricated zero ───────────────────────────────
//  Exercise pages report no score, so their rows sit in progress with
//  completed = 1 and score = NULL. The teacher gradebook used to render exactly
//  that as a hard "0 / 5" and average it in. This reports who was affected, and
//  crucially how much REAL graded work those same classes have, since a row
//  carrying a score is never touched by any of this. Read only. ?course= filters.
router.get('/ungraded-fallout', (req, res) => {
  try {
    res.json(ungraded.ungradedFallout({ course: req.query.course }));
  } catch (e) {
    console.error('admin/ungraded-fallout:', e);
    res.status(500).json({ error: 'ungraded fallout failed', detail: e.message });
  }
});

// ── UN-AUTHOR DENOMINATORS: remove a wrong "out of" ───────────────────────────
//  The counterpart to adopt, and a mutation, so the x-admin-key HEADER is
//  required. A WRONG authored value is worse than none: a missing one shows a
//  percentage, a wrong one shows a confident "4 / 6" for a quiz really out of
//  10, and it reaches the teacher CSV export. Undoing has to be as easy as
//  authoring. Body:
//    { course, activity_types: ['quiz'] }        remove those columns
//    { ..., lessons: ['1.1','1.2'] }             narrow to specific lessons
//    { ..., only_possible: 6 }                   remove only if still exactly 6,
//                                                so a hand-corrected value lives
//    { ..., dry_run: true }                      report the plan, delete nothing
//  activity_types is mandatory: no call can wipe a course's authoring wholesale.
//  Reversible in the same sense adopt is: no stored score is touched, and
//  re-authoring restores the previous display exactly.
router.post('/denominators/remove', (req, res) => {
  try {
    const b = req.body || {};
    if (!b.course) return res.status(400).json({ error: 'course is required' });
    const out = denominators.remove(b.course, {
      activity_types: b.activity_types,
      lessons: b.lessons,
      only_possible: b.only_possible,
      dry_run: !!b.dry_run,
    });
    if (out.error) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    console.error('admin/denominators/remove:', e);
    res.status(500).json({ error: 'remove failed', detail: e.message });
  }
});

// ── SCORE EVENTS: raw graded-interaction ledger (CFU-level detail) ────────────
//  The append-only detail behind progress.score. Filter by ?student_id=,
//  ?class_code=, ?course=; ?limit= caps rows (default 200, max 2000).
router.get('/score-events', (req, res) => {
  try {
    const { student_id, class_code, course } = req.query;
    const lim = Math.min(parseInt(req.query.limit, 10) || 200, 2000);
    const where = [];
    const args = [];
    if (student_id) { where.push('se.student_id = ?'); args.push(student_id); }
    if (course)     { where.push('se.course = ?');     args.push(course); }
    if (class_code) { where.push('c.class_code = ?');  args.push(String(class_code).toUpperCase()); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const events = db.prepare(`
      SELECT se.id, se.student_id, s.display_name, c.class_code,
             se.course, se.unit, se.lesson, se.activity_type, se.item,
             se.points, se.max_points, se.correct, se.answers, se.created_at
      FROM score_events se
      LEFT JOIN students s ON se.student_id = s.id
      LEFT JOIN classes  c ON se.class_id  = c.id
      ${clause}
      ORDER BY se.created_at DESC
      LIMIT ?
    `).all(...args, lim);

    res.json({ total: events.length, limit: lim, events });
  } catch (e) {
    console.error('admin/score-events:', e);
    res.status(500).json({ error: 'score-events failed', detail: e.message });
  }
});

// ── SCHEMA: live tables + columns ─────────────────────────────────────────────
router.get('/schema', (req, res) => {
  try {
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    ).all();
    const schema = {};
    for (const { name } of tables) {
      schema[name] = db.prepare(`PRAGMA table_info(${name})`).all()
        .map((col) => ({ column: col.name, type: col.type, notnull: !!col.notnull, pk: !!col.pk }));
    }
    res.json({ tables: tables.map((t) => t.name), schema });
  } catch (e) {
    console.error('admin/schema:', e);
    res.status(500).json({ error: 'schema read failed', detail: e.message });
  }
});

// ── ACCESS CODES + ENTITLEMENTS (Phase 4: Teacher Command Center, slice 1) ─────
// All routes below inherit requireAdmin above (fails closed on a missing or weak
// ADMIN_KEY). Body parsing is the app-level express.json() in server.js.
const entitlements = require('../lib/entitlements');

// Generate N single-use access codes for a course.
// POST /api/admin/access-codes   body { course, count }
router.post('/access-codes', (req, res) => {
  try {
    const { course, count } = req.body || {};
    if (!entitlements.isValidCourse(course)) {
      return res.status(400).json({ error: `course must be one of: ${entitlements.VALID_COURSES.join(', ')}` });
    }
    const n = parseInt(count, 10);
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      return res.status(400).json({ error: 'count must be an integer from 1 to 500' });
    }
    const codes = entitlements.generateCodes(course, n);
    res.json({ course, requested: n, created: codes.length, codes });
  } catch (e) {
    console.error('admin/access-codes create:', e);
    res.status(500).json({ error: 'code generation failed', detail: e.message });
  }
});

// List access codes. Optional filters ?course= ?status= ?limit=
router.get('/access-codes', (req, res) => {
  try {
    const clauses = [], params = [];
    if (req.query.course) { clauses.push('course = ?'); params.push(req.query.course); }
    if (req.query.status) { clauses.push('status = ?'); params.push(req.query.status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const rows = db.prepare(
      `SELECT code, course, status, redeemed_by_teacher, order_ref, created_at
         FROM access_codes ${where} ORDER BY created_at DESC LIMIT ?`
    ).all(...params, limit);
    res.json({ count: rows.length, codes: rows });
  } catch (e) {
    console.error('admin/access-codes list:', e);
    res.status(500).json({ error: 'list failed', detail: e.message });
  }
});

// Revoke an UNUSED access code so it can never be redeemed. A redeemed code's
// grant is killed via the entitlement revoke below, not here.
// POST /api/admin/access-codes/revoke   body { code }
router.post('/access-codes/revoke', (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    const changed = entitlements.revokeCode(code);
    res.json({
      revoked: changed > 0,
      code: String(code).trim().toUpperCase(),
      note: changed ? undefined
        : 'Code not found or not in an unused state. Revoke a redeemed code\'s access via the entitlement.',
    });
  } catch (e) {
    console.error('admin/access-codes revoke:', e);
    res.status(500).json({ error: 'revoke failed', detail: e.message });
  }
});

// List entitlements. Optional filters ?teacher_id= ?course= ?status=
router.get('/entitlements', (req, res) => {
  try {
    const clauses = [], params = [];
    if (req.query.teacher_id) { clauses.push('teacher_id = ?'); params.push(req.query.teacher_id); }
    if (req.query.course) { clauses.push('course = ?'); params.push(req.query.course); }
    if (req.query.status) { clauses.push('status = ?'); params.push(req.query.status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(
      `SELECT id, teacher_id, course, source, status, order_ref, granted_at, expires_at
         FROM entitlements ${where} ORDER BY granted_at DESC LIMIT 500`
    ).all(...params);
    res.json({ count: rows.length, entitlements: rows });
  } catch (e) {
    console.error('admin/entitlements list:', e);
    res.status(500).json({ error: 'list failed', detail: e.message });
  }
});

// Revoke a teacher's active entitlement for a course.
// POST /api/admin/entitlements/revoke   body { teacher_id, course }
router.post('/entitlements/revoke', (req, res) => {
  try {
    const { teacher_id, course } = req.body || {};
    if (!teacher_id || !course) {
      return res.status(400).json({ error: 'teacher_id and course required' });
    }
    const changed = entitlements.revokeEntitlement(teacher_id, course);
    res.json({ revoked: changed > 0, teacher_id, course });
  } catch (e) {
    console.error('admin/entitlements revoke:', e);
    res.status(500).json({ error: 'revoke failed', detail: e.message });
  }
});

module.exports = router;
