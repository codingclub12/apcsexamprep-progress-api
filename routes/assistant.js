'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT, PHASE 0.  Mounted in server.js after express.json():
//    app.use(require('./routes/assistant'));
//
//  Root mounted for the same reason routes/practice.js is: it owns paths in two
//  namespaces, the API and the browser asset the storefront loads.
//
//    POST /api/assistant/report           optional bearer, files a report
//    GET  /api/assistant/report/context   what the form may offer this caller
//    GET  /apcs-report.js                 the affordance itself
//    GET  /api/assistant/diagnostics      teacher auth, "check my account"
//    GET  /teacher/diagnostics            the panel that renders it
//    GET  /api/assistant/help             public search over published articles
//    GET  /help                           the help page that renders it
//
//  No model, no chat, no transcripts.
//
//  Phase 0 is deliberately the piece that works without an LLM. It turns "the
//  quiz page is broken" into a record that names the page, the browser and the
//  console output, files it on the board deduped, and mails the owner. Every
//  later phase is easier to debug because this one exists.
//
//  THREE RULES THIS FILE ENFORCES, in the order they matter:
//
//  1. Identity is server-side. The bearer token decides the role. A client that
//     claims to be a teacher is ignored. Nothing about who the caller is comes
//     from the body.
//  2. Page scope is server-side. Derived from the URL by lib/assistant/scope.js,
//     which reuses the same activity classifier the grading path uses. Scope
//     decides whether typed text is kept, so a client-asserted scope would be a
//     client-asserted privacy posture.
//  3. A student's typed text is never stored, and an anonymous caller on a
//     coursework page is treated as a student. What survives is the category and
//     the machine context, which is the part that reproduces the bug anyway.
//
//  ABUSE: this is a public write endpoint on a 1 vCPU / 1 GB box. It carries a
//  per-IP window, a hard per-day row ceiling, and a truncation cap on every
//  string that reaches the database. The per-IP limit is the courtesy brake; the
//  daily ceiling is the disk guard, because per-IP does nothing against a
//  distributed flood.
//
//  See docs/site-assistant-spec.md sections 8, 9 and 11. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const db = require('../db');
const { makeRateLimit } = require('../lib/rate-limit');
const { verifyStudentToken, pageFromHandle } = require('../utils');
const { pageScope } = require('../lib/assistant/scope');
const report = require('../lib/assistant/report');
const junk = require('../lib/assistant/junk-filter');
const turnstile = require('../lib/assistant/turnstile');
const find = require('../lib/assistant/find');
const reads = require('../lib/assistant/reads');
const kb = require('../lib/assistant/kb');
const chat = require('../lib/assistant/chat');
const { requireTeacher } = require('../middleware');

// Five reports per IP per fifteen minutes. A person filing a real bug files one,
// maybe two if the first attempt also failed. Anything past five in a quarter
// hour is a script.
//
// Both numbers are env-tunable because the right ceiling is not knowable before
// the endpoint sees real traffic, and discovering it should not cost a code
// change. The defaults are what ships. A refused request counts too: rejecting
// junk is work, and a script probing for a valid category should exhaust its
// budget doing it.
const WINDOW_MS = Number(process.env.ASSISTANT_REPORT_WINDOW_MS) > 0
  ? Number(process.env.ASSISTANT_REPORT_WINDOW_MS)
  : 15 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.ASSISTANT_REPORT_MAX_PER_WINDOW) > 0
  ? Number(process.env.ASSISTANT_REPORT_MAX_PER_WINDOW)
  : 5;

const reportLimit = makeRateLimit({
  windowMs: WINDOW_MS,
  max: MAX_PER_WINDOW,
  message: 'Too many reports from this connection. Please wait a few minutes.',
});

// Role-agnostic verify, the same approach routes/gate.js uses and for the same
// reason: this route must accept a teacher token, a student token, or no token,
// so it cannot use requireTeacher or requireStudent (each rejects the other).
// Both verifiers call jwt.verify with the one canonical secret; only the label
// differs. Returns null on anything invalid, which lands the caller as
// anonymous rather than as an error.
function verifyAnyToken(token) {
  try { return verifyStudentToken(token); } catch (_) { return null; }
}

const stTeacher = db.prepare('SELECT id, name, email, school FROM teachers WHERE id = ?');
const stStudentClass = db.prepare(`
  SELECT c.course AS course
  FROM students s JOIN classes c ON c.id = s.class_id
  WHERE s.id = ?
`);

// Resolve who is calling. Reads the ROW for a teacher rather than trusting the
// token's claims, per spec section 11: a token carries an email from whenever it
// was signed, and the row is what is true now. Also means a deleted teacher
// resolves to anonymous instead of to a ghost.
function identify(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { role: 'anonymous' };

  const payload = verifyAnyToken(token);
  if (!payload || !payload.id || !payload.role) return { role: 'anonymous' };

  if (payload.role === 'teacher') {
    let row = null;
    try { row = stTeacher.get(payload.id); } catch (_) { /* fall through */ }
    if (!row) return { role: 'anonymous' };
    return {
      role: 'teacher',
      userRef: row.id,
      contactEmail: row.email || null,
      contactName: row.name || null,
      school: row.school || null,
    };
  }

  if (payload.role === 'student') {
    let course = null;
    try { const r = stStudentClass.get(payload.id); course = (r && r.course) || null; } catch (_) { /* none */ }
    // A student id is stored so a report can be deleted with the student, per
    // spec section 8. No name, no email: students have neither by construction.
    return { role: 'student', userRef: payload.id, course };
  }

  return { role: 'anonymous' };
}

// Non-reversible, day-rotating handle for one connection. Mirrors the shape used
// by routes/game.js and reads the SAME IP_HASH_SALT, per spec section 8 ("do not
// add a second salt"). A raw IP is never stored anywhere in this path.
function ipHash(req) {
  const ip = (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown');
  const day = new Date().toISOString().slice(0, 10);
  const secret = process.env.IP_HASH_SALT || process.env.JWT_SECRET || 'ip-salt';
  return crypto.createHash('sha256').update(`${ip}|${day}|${secret}`).digest('hex').slice(0, 40);
}

// Course from the page URL when the handle names one. Uses the same parser the
// grading path uses, so it cannot disagree about which course a page belongs to.
function courseFromUrl(pageUrl) {
  try {
    const page = pageFromHandle(pageUrl);
    return (page && page.course) || null;
  } catch (_) {
    return null;
  }
}

// Console errors the widget buffered from page load. Machine-generated strings,
// not something a student typed, which is why they are kept for every role: they
// are the whole reason a report is reproducible. Capped in count and length
// because the browser is an untrusted source of unbounded strings.
function cleanConsole(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const s = report.clip(typeof item === 'string' ? item : JSON.stringify(item), report.LIMITS.consoleError);
    if (s) out.push(s);
    if (out.length >= report.LIMITS.consoleErrors) break;
  }
  return out;
}

// The category-specific extras the form may send, per handoff 4.2. Whitelisted
// by NAME rather than copied wholesale, because everything here rides into the
// stored detail blob and a client that can add keys can grow that blob without
// limit on a box with a $169 incident on record.
const FIELD_NAMES = ['purchaseChannel', 'orderRef', 'classCode', 'lesson', 'questionId'];

function cleanFields(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const name of FIELD_NAMES) {
    const v = report.clip(raw[name], report.LIMITS.field);
    if (v) out[name] = v;
  }
  return out;
}

// An address the reporter typed into "want to know when it is fixed?". Shape
// checked, not verified: the point is to catch a typo, and a confirmation loop
// on a bug report is a form nobody finishes.
function cleanReporterEmail(raw) {
  const s = report.clip(raw, report.LIMITS.reporterEmail);
  if (!s) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}

// Does this caller hold the admin key? Junk filter layer 2 waives the
// User-Agent rule for them, so CI can post from node and still be judged on
// every other rule. Compared in constant time, and a wrong key is simply not a
// bypass rather than an error: this is not an auth gate, it is a hint.
function hasAdminKey(req) {
  const configured = process.env.ADMIN_KEY || '';
  const provided = req.get('x-admin-key') || '';
  if (!configured || !provided || configured.length < 20) return false;
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  try { return crypto.timingSafeEqual(digest(provided), digest(configured)); } catch (_) { return false; }
}

// POST /api/assistant/report
//
// THE ORDER OF OPERATIONS IS THE DESIGN, so it is written out here rather than
// left to be read off the code:
//
//   1. Validate the category. A closed set, checked first, so nothing else runs
//      for a caller probing with junk.
//   2. Turnstile, for anonymous callers, when it is configured. Layer 1.
//   3. STORE THE ROW. Before any model is asked anything, because the row is the
//      only thing whose absence loses the report.
//   4. Layer 2 rules, then layer 3 triage. Both can only change a label, a
//      severity and whether mail goes. Neither can delete anything.
//   5. Answer the caller, carrying the label so the widget can ask its one
//      follow-up question when the model said 'vague'.
//   6. Mail, after the response, so a slow provider never holds the handler.
router.post('/api/assistant/report', reportLimit, async (req, res) => {
  try {
    const body = (req && req.body) || {};

    const category = String(body.category || '').trim();
    if (!report.CATEGORY_SET.has(category)) {
      return res.status(400).json({
        ok: false,
        error: 'Unknown category.',
        categories: report.CATEGORIES,
      });
    }

    if (report.overDailyCap()) {
      // Fail closed on volume, and say so plainly rather than pretending the
      // report landed. A dropped report the caller thinks succeeded is worse
      // than a visible refusal.
      return res.status(429).json({ ok: false, error: 'Report volume limit reached for today. Please email support.' });
    }

    const pageUrl = report.clip(body.pageUrl, report.LIMITS.pageUrl);
    const scope = pageScope(pageUrl || '');
    const who = identify(req);
    const keepsText = require('../lib/assistant/scope').retainsBodies(who.role, scope);

    // A suggestion IS its text. On a page where this repo does not keep typed
    // text there is nothing left to store or send, so the honest answer is to
    // refuse and say why rather than to accept an empty row and let the person
    // believe they were heard. The report form on the same page still works and
    // keeps the category plus the machine context, which is the part a fix needs.
    if (category === 'suggestion' && !keepsText) {
      return res.status(400).json({
        ok: false,
        error: 'Suggestions are not collected on lesson and quiz pages, because nothing typed there is stored. The problem report form works here.',
        textStored: false,
      });
    }

    // ── LAYER 1: Turnstile on anonymous submits (handoff 3.5) ────────────────
    //
    // Only for anonymous callers, and only when Turnstile is actually
    // configured. The posture matches lib/assistant/turnstile.js and the reason
    // is the same one written there: an unconfigured challenge must not become
    // an outage. What differs is which way "degrade" points. Chat degrades to a
    // cheaper answer; a report has no cheaper version, so an unconfigured
    // Turnstile means the rate limiter is the only layer 1 and the report is
    // accepted. REPORTS_TURNSTILE_REQUIRED=true makes it mandatory once the keys
    // are set, which is a decision rather than a default.
    if (who.role === 'anonymous' && turnstile.configured()) {
      const v = await turnstile.verify(
        typeof body.turnstileToken === 'string' ? body.turnstileToken.slice(0, 4096) : null,
        req.ip || (req.socket && req.socket.remoteAddress) || null
      );
      if (!v.ok && report.envOn('REPORTS_TURNSTILE_REQUIRED', false)) {
        return res.status(403).json({ ok: false, error: 'Could not verify this browser. Please reload the page and try again.' });
      }
    }

    const detail = {
      pageTitle: report.clip(body.pageTitle, report.LIMITS.pageTitle),
      // Server-captured, never client-supplied: a body field could say anything.
      userAgent: report.clip(req.headers['user-agent'], report.LIMITS.userAgent),
      consoleErrors: cleanConsole(body.consoleErrors),
      fields: cleanFields(body.fields),
    };

    const summary = report.clip(body.description, report.LIMITS.summary);
    const reporterEmail = cleanReporterEmail(body.reporterEmail);
    const hash = ipHash(req);

    // ── LAYER 2 ──────────────────────────────────────────────────────────────
    // Runs before the insert so the verdict can be stored WITH the row, which
    // means a dismissed report is dismissed from the moment it exists rather
    // than briefly looking open.
    const layer2 = junk.rules({
      category,
      summary: keepsText ? summary : null,
      detail,
      fields: detail.fields,
      userAgent: detail.userAgent,
      ipHash: hash,
      adminBypass: hasAdminKey(req),
    });

    const stored = report.store({
      category,
      role: who.role,
      userRef: who.userRef,
      pageUrl,
      pageScope: scope,
      course: who.course || courseFromUrl(pageUrl),
      contactEmail: who.contactEmail,
      contactName: who.contactName,
      school: who.school,
      summary,
      detail,
      ipHash: hash,
      reporterEmail,
      junkLabel: layer2.label === 'junk' ? 'junk' : null,
      junkReason: layer2.reason,
      // Handoff 3.5: junk is STORED with status=dismissed and not emailed. It is
      // never dropped, and the morning mail counts these.
      status: layer2.label === 'junk' ? 'dismissed' : 'open',
    });

    // ── LAYER 3 ──────────────────────────────────────────────────────────────
    // Only for traffic layer 2 let through, which is the whole point of putting
    // the free rules first. No text means no call and no spend, which is every
    // student report by construction.
    let verdict = { label: layer2.label === 'junk' ? 'junk' : 'real', summary: null, severity: null, reason: layer2.reason };
    if (layer2.label !== 'junk') {
      verdict = await junk.triage({
        category,
        summary: keepsText ? summary : null,
        pagePath: report.pagePath(pageUrl),
        role: who.role,
      });
    }

    // Severity is recomputed with the model's read in hand, because handoff 3.3's
    // third trigger needs it. severityFor only lets it raise anything for a
    // verified teacher.
    const severity = report.severityFor(category, who.role, {
      summary: keepsText ? summary : null,
      aiSeverity: verdict.severity,
    });

    const dismissed = verdict.label === 'junk';
    report.recordVerdict(stored.id, {
      junkLabel: verdict.label,
      junkReason: verdict.reason,
      aiSummary: verdict.summary,
      aiSeverity: verdict.severity,
      severity,
      status: dismissed ? 'dismissed' : 'open',
    });

    // Board filing is off by default now (handoff 3.1) and returns immediately
    // when the flag is unset. Kept in the path so turning the flag on needs no
    // code change.
    const filed = report.fileTodo({
      escalationId: stored.id,
      category,
      severity,
      role: who.role,
      pageUrl,
      pageScope: scope,
      summary,
      detail,
      bodiesRetained: stored.bodiesRetained,
    });

    // Answer the caller as soon as the verdict is durable. The mail is best
    // effort and must not hold the response open on a 1 vCPU box.
    res.json({
      ok: true,
      id: stored.id,
      severity,
      todoId: filed.todoId,
      // Honest to the person who just typed: say whether their words were kept.
      textStored: stored.bodiesRetained,
      // Handoff 4.2: the widget shows ONE follow-up question on 'vague' and
      // nothing on anything else. The label is the only thing that decides it.
      label: verdict.label,
      followUp: verdict.label === 'vague',
    });

    // ── THE MAIL ─────────────────────────────────────────────────────────────
    //
    //  junk      stored, never sent. Handoff 3.5.
    //  digest    non-urgent held for the 7am flush; urgent sends anyway. 3.1.
    //  otherwise one threaded email now. 3.4.
    if (dismissed) {
      report.markEmail(stored.id, 'suppressed');
      return;
    }
    if (report.emailMode() === 'digest' && severity !== 'immediate') {
      report.markEmail(stored.id, 'held');
      return;
    }

    report.mailReport({
      escalationId: stored.id,
      threadKey: stored.threadKey,
      category,
      severity,
      role: who.role,
      pageUrl,
      pageScope: scope,
      summary,
      detail,
      bodiesRetained: stored.bodiesRetained,
      todoId: filed.todoId,
      junkLabel: verdict.label,
      aiSummary: verdict.summary,
      reporterEmail: stored.bodiesRetained ? reporterEmail : null,
      contactEmail: stored.bodiesRetained ? who.contactEmail : null,
      contactName: stored.bodiesRetained ? who.contactName : null,
      school: stored.bodiesRetained ? who.school : null,
    })
      .then((out) => report.markEmail(stored.id, out.status))
      .catch((e) => {
        console.error('[assistant/report] mail rejected:', e && e.message);
        report.markEmail(stored.id, 'failed');
      });
  } catch (e) {
    console.error('assistant/report:', e);
    return res.status(500).json({ ok: false, error: 'Could not file the report.' });
  }
});

// POST /api/assistant/reports/digest/flush
//
// Sends whatever digest mode is holding, as one email, and marks those rows
// sent. Admin key only, and fail-closed in the same shape routes/admin.js uses:
// no key configured means the endpoint is off rather than open.
//
// THIS IS THE 7AM SEND, and nothing in this process calls it. The handoff puts
// the schedule at 7:00 America/Chicago, and a container that restarts on every
// deploy cannot hold a timer that means anything: the send time would become a
// function of the last push. The caller is the Daily site audit task, which
// already runs on a schedule and already holds the admin key, and wiring it is
// handoff section 6. Until that lands the default mode is 'each', so nothing is
// waiting on this and nothing is stranded by it.
router.post('/api/assistant/reports/digest/flush', async (req, res) => {
  const configured = process.env.ADMIN_KEY || '';
  if (configured.length < 20) {
    return res.status(503).json({ error: 'Admin API disabled. Set a strong ADMIN_KEY (>= 20 chars) in the environment.' });
  }
  if (!hasAdminKey(req)) {
    return res.status(403).json({ error: 'Invalid or missing admin key.' });
  }
  try {
    const out = await report.flushDigest();
    res.json(out);
  } catch (e) {
    console.error('assistant/digest-flush:', e);
    res.status(500).json({ error: 'Could not flush the digest.' });
  }
});

// What the form needs before it renders anything.
//
// The category list, so the widget offers the same closed set the server
// accepts rather than a hard-coded copy that drifts. And textStored, so the
// form can tell someone their words will not be kept BEFORE they type them
// rather than after. Inviting a child to describe their problem and then
// silently discarding the description is worse behaviour than not offering the
// box, even though the privacy outcome is identical.
//
// Read-only, cheap, and it reveals nothing the caller does not already know
// about their own request.
router.get('/api/assistant/report/context', (req, res) => {
  const pageUrl = report.clip(req.query.pageUrl, report.LIMITS.pageUrl);
  const scope = pageScope(pageUrl || '');
  const who = identify(req);
  const keeps = require('../lib/assistant/scope').retainsBodies(who.role, scope);
  res.json({
    categories: report.CATEGORIES,
    scope,
    role: who.role,
    textStored: keeps,
    // The widget hides "Suggest something" where typed text is not kept, rather
    // than offering a box whose contents the POST will refuse. Same fact, said
    // before the person types instead of after.
    suggestionsAllowed: keeps,
    // Category-specific extras the form may send, so the widget renders the
    // purchase-channel fields on access_not_showing and nothing on bug_report
    // without holding its own copy of that mapping.
    fields: junk.CATEGORY_FIELDS,
    turnstileSiteKey: turnstile.siteKey(),
  });
});

// ── PHASE 0.5: THE DIAGNOSTIC PANEL ──────────────────────────────────────────
//
//  "Check my account". The highest-value thing this whole system does, and it
//  needs no model: every question in the top support clusters is answerable by
//  reading state the teacher already owns.
//
//  It cannot hallucinate, because nothing here generates a sentence. It cannot
//  leak an answer key, because lib/assistant/reads.js has no return field that
//  could carry one. It costs nothing per use. And it de-risks the chat phases
//  that come after it: if these reads are wrong, a panel shows it plainly, where
//  a chat reply would hide the same error inside prose that sounds fine.
//
//  Teacher auth, and every read is scoped to classes this teacher owns.
router.get('/api/assistant/diagnostics', requireTeacher, (req, res) => {
  try {
    const t = req.teacher;
    const out = {
      teacher: { name: t.name || null },
      entitlements: reads.getEntitlementState(t.id, t.email),
      classes: reads.listClasses(t.id),
      generated_at: new Date().toISOString(),
    };

    const code = typeof req.query.class === 'string' ? req.query.class.trim() : '';
    if (code) {
      const settings = reads.getClassSettings(t.id, code);
      if (!settings) {
        // A class this teacher does not own and a class that does not exist are
        // the same answer, so the endpoint cannot be used to discover codes.
        return res.status(404).json({ error: 'No class with that code on this account.' });
      }
      const lesson = typeof req.query.lesson === 'string' ? req.query.lesson.trim() : '';
      out.class_detail = {
        settings,
        gates: reads.getGateState(t.id, code, { lesson: lesson || undefined }),
        roster: reads.getRosterHealth(t.id, code),
        scores: reads.getScoreVisibility(t.id, code, { lesson: lesson || undefined }),
      };
    }

    res.json(out);
  } catch (e) {
    console.error('assistant/diagnostics:', e);
    res.status(500).json({ error: 'Could not read your account state.' });
  }
});

// The panel itself. Served from here for the same reason the report affordance
// is: the page and the endpoint it reads can never be different versions of
// each other.
router.get('/teacher/diagnostics', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'teacher-diagnostics.html'));
});

// ── PHASE 1: THE KNOWLEDGE BASE, READ SIDE ───────────────────────────────────
//
//  Published articles only. kb.search filters to status='published' in SQL, so
//  there is no code path here that could serve a draft: half-written site
//  mechanics are worse than silence.
//
//  Public and unauthenticated, because everything in this corpus is site
//  mechanics rather than account state. Nothing here reads a class, a student
//  or a grade, so there is nothing to withhold.
//
//  GET /api/assistant/help?q=...   search, or browse when q is empty
//  GET /api/assistant/help/:slug   one article
const helpLimit = makeRateLimit({
  windowMs: 60 * 1000, max: 60,
  message: 'Too many searches. Please wait a moment.',
});

router.get('/api/assistant/help', helpLimit, (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
    const out = kb.search(q, { limit: req.query.limit });
    res.set('Cache-Control', 'public, max-age=60');
    res.json(out);
  } catch (e) {
    console.error('assistant/help:', e);
    res.status(500).json({ error: 'Search is unavailable right now.' });
  }
});

router.get('/api/assistant/help/:slug', helpLimit, (req, res) => {
  const a = kb.published(req.params.slug);
  // A draft and a nonexistent article answer the same way, so an unfinished
  // article cannot be discovered by guessing slugs.
  if (!a) return res.status(404).json({ error: 'No such article.' });
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ article: a });
});

router.get('/help', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'help.html'));
});

// ── PHASE 2: CHAT ────────────────────────────────────────────────────────────
//
//  POST /api/assistant/chat   teacher auth, behind ASSISTANT_ENABLED
//
//  Teachers only, deliberately. Spec section 14 puts students last and puts them
//  behind a privacy posture that is built but not yet needed, and the anonymous
//  commerce path behind Turnstile, which does not exist here yet. requireTeacher
//  is the same fail-closed middleware every other teacher route uses, so a
//  student holding a class code cannot reach this and neither can an anonymous
//  caller. There is no role field in the request: identity is the token.
//
//  Off by default. ASSISTANT_ENABLED unset means the endpoint still answers, but
//  from the knowledge base and the live state block with no model call, which is
//  the same degraded path a missing API key or a breached daily cap takes. That
//  is on purpose: the failure mode of a support desk must be a worse answer, not
//  an error page.
//
//  TWO WINDOWS, and the reason is a school building. lib/rate-limit.js keys on
//  the client IP by default, and a school is one NAT address: thirty teachers in
//  one building share it. A single IP window on a signed-in route therefore
//  means one teacher's busy afternoon throttles the whole department, which is
//  an outage wearing a 429.
//
//  So: a generous window on the IP in FRONT of the auth check, which is the
//  flood brake and the thing that stops an unauthenticated caller burning JWT
//  verifications, and a tight window on the TEACHER ID behind it, which is the
//  fairness rule and the thing that stops one account spending the budget. Same
//  module both times, never a second limiter.
const CHAT_WINDOW_MS = Number(process.env.ASSISTANT_CHAT_WINDOW_MS) > 0
  ? Number(process.env.ASSISTANT_CHAT_WINDOW_MS)
  : 60 * 1000;
const CHAT_MAX_PER_WINDOW = Number(process.env.ASSISTANT_CHAT_MAX_PER_WINDOW) > 0
  ? Number(process.env.ASSISTANT_CHAT_MAX_PER_WINDOW)
  : 10;
// Sized for a school rather than a person: enough that a whole staff room can be
// asking at once, low enough to stop a script.
const CHAT_IP_MAX = Number(process.env.ASSISTANT_CHAT_IP_MAX) > 0
  ? Number(process.env.ASSISTANT_CHAT_IP_MAX)
  : 120;
const chatIpLimit = makeRateLimit({
  windowMs: CHAT_WINDOW_MS,
  max: CHAT_IP_MAX,
  message: 'Too many messages from this network. Please wait a moment.',
});
const chatUserLimit = makeRateLimit({
  windowMs: CHAT_WINDOW_MS,
  max: CHAT_MAX_PER_WINDOW,
  message: 'Too many messages. Please wait a moment before sending another.',
  // Keyed on whoever the token says this is, not on the teacher alone. A school
  // is one NAT address for students too, and a class of thirty sharing one
  // window would throttle a lesson the moment it started.
  keyFn: (req) => {
    if (req.teacher) return 'teacher:' + req.teacher.id;
    const w = req.chatWho;
    if (w && w.userRef) return w.role + ':' + w.userRef;
    return null;
  },
});

// PHASE 3 adds the anonymous path, behind its OWN switch. ASSISTANT_ANON_ENABLED
// is off by default, and with it off this endpoint behaves exactly as it did in
// Phase 2: teacher token or 401. That is deliberate. Merging this must not open
// a public POST endpoint on the day it deploys; turning it on is a decision
// Tanner makes once Turnstile is configured, and it is one variable.
//
// A STUDENT token is refused on both settings. Phase 4 is not built, and the
// anonymous path is not a side door into it: a signed-in minor must not reach
// chat by having their token ignored.
function anonEnabled() {
  const v = String(process.env.ASSISTANT_ANON_ENABLED || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

// PHASE 4: students, behind their own switch again. Off by default, and with it
// off a student token is refused exactly as it was in Phases 2 and 3. Each
// audience got its own variable rather than one master switch on purpose: the
// three populations carry different risk and the person turning them on should
// have to say which one they mean.
function studentEnabled() {
  const v = String(process.env.ASSISTANT_STUDENT_ENABLED || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

// Replaces requireTeacher on this route only. Same fail-closed posture, one more
// allowed outcome. Identity is resolved from the token, never from the body.
function chatIdentity(req, res, next) {
  const who = identify(req);
  if (who.role === 'teacher') { req.chatWho = who; return next(); }
  if (who.role === 'student') {
    if (!studentEnabled()) {
      return res.status(401).json({ error: 'The assistant is not open to student accounts yet.' });
    }
    req.chatWho = who;
    return next();
  }
  if (!anonEnabled()) {
    return res.status(401).json({ error: 'Teacher auth required' });
  }
  req.chatWho = who;
  return next();
}

router.post('/api/assistant/chat', chatIpLimit, chatIdentity, chatUserLimit, async (req, res) => {
  try {
    const who = req.chatWho;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const message = typeof body.message === 'string' ? body.message : '';
    if (!message.trim()) return res.status(400).json({ error: 'A message is required.' });

    // Layer 3: the page is identified, never quoted. pageUrl and pageTitle are
    // the only two page fields this endpoint reads, and there is no third that
    // could carry body content. A client sending one gets it ignored.
    const pageUrl = report.clip(body.pageUrl, report.LIMITS.pageUrl);
    const pageTitle = report.clip(body.pageTitle, report.LIMITS.pageTitle);
    const scope = pageScope(pageUrl);

    const out = await chat.respond({
      message,
      who: Object.assign({}, who, { course: courseFromUrl(pageUrl) }),
      sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : null,
      pageUrl,
      pageTitle,
      pageScope: scope,
      classCode: typeof body.classCode === 'string' ? body.classCode.slice(0, 32) : null,
      ipHash: ipHash(req),
      // Turnstile, anonymous path only. The token is a one-shot proof from
      // Cloudflare, not a credential: it authorises spending on this one
      // request and nothing else, and it is never stored.
      turnstileToken: typeof body.turnstileToken === 'string' ? body.turnstileToken.slice(0, 4096) : null,
      remoteIp: req.ip || (req.socket && req.socket.remoteAddress) || null,
    });

    // The assembled context is the suite's business, not the browser's. It is
    // the largest thing this function touches and it holds the account state
    // twice over, so it is dropped before the response is written rather than
    // relied on to be ignored.
    delete out.context;
    delete out.state;
    res.json(out);
  } catch (e) {
    console.error('assistant/chat:', e);
    res.status(500).json({ error: 'The assistant is unavailable right now. The report button still works.' });
  }
});

// PUBLIC config for the widget. Booleans and the Turnstile SITE key, which is
// public by design and is served to every browser that renders a challenge. The
// secret key is not here and is never sent anywhere but Cloudflare.
//
// Unauthenticated on purpose: the widget has to know whether to render at all
// before it knows who is looking, and everything here is already visible from
// the page source of any site that uses Turnstile.
router.get('/api/assistant/chat/config', helpLimit, (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    anon_enabled: anonEnabled(),
    student_enabled: studentEnabled(),
    model_configured: require('../lib/assistant/provider').configured(),
    turnstile_site_key: require('../lib/assistant/turnstile').siteKey(),
    turnstile_configured: require('../lib/assistant/turnstile').configured(),
  });
});

// What the widget needs to decide whether to render a chat box, and what an
// operator needs to know whether the model is actually being called. Booleans
// and counters only: no key, no recipient address, nothing that identifies a
// person.
router.get('/api/assistant/chat/status', requireTeacher, (req, res) => {
  const day = require('../lib/assistant/store').tokensToday();
  res.json({
    enabled: chat.enabled(),
    model_configured: require('../lib/assistant/provider').configured(),
    caps: {
      messages_per_session: chat.CAPS.messagesPerSession(),
      tokens_per_session: chat.CAPS.tokensPerSession(),
      tokens_per_day: chat.CAPS.tokensPerDay(),
    },
    spend: chat.spendReport(day),
  });
});

// The affordance. Served from here rather than the theme so a copy change does
// not need a Shopify deploy, and so the script and the endpoint it posts to can
// never be different versions of each other.
// The Phase 3 widget. Commerce and marketing pages only; the script refuses to
// render on coursework even if the tag lands there, which is the second lock on
// spec layer 4's "absent, not disabled".
router.get('/apcs-chat.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'apcs-chat.js'));
});

router.get('/apcs-report.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'apcs-report.js'));
});

// ── THE REPORT-FIRST WIDGET (handoff section 4) ──────────────────────────────
//
//  /apcs-widget.js   the corner button: report, suggest, find a page
//  /apcs-flag.js     "Flag this question", which may load on assessment pages
//
//  TWO FILES, and the split is the rule rather than a preference. The widget
//  must not load on a quiz or test page at all; the flag link is asked for on
//  graded quiz pages after submission. One file with a mode flag would put both
//  rules behind one condition, and the condition somebody edits later is the one
//  that was protecting the other rule.
//
//  VERSIONING. TODO #241 measured Cloudflare returning every JS asset this
//  server sends as max-age=14400 whatever the route asks for, so a fix here can
//  sit behind a browser cache for four hours and read as a failed deploy. The
//  theme appends ?v= from the endpoint below, which changes when the file
//  changes, so a new URL is a new cache entry.
function serveAsset(name) {
  return (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    // Long, because the URL carries the version. An unversioned request gets the
    // same bytes and the same four hour Cloudflare TTL it was always going to.
    res.set('Cache-Control', 'public, max-age=3600');
    res.type('application/javascript');
    res.sendFile(require('path').join(__dirname, '..', 'public', name));
  };
}
router.get('/apcs-widget.js', serveAsset('apcs-widget.js'));
router.get('/apcs-flag.js', serveAsset('apcs-flag.js'));

// The version token the theme puts in ?v=. Content-derived rather than a build
// number, so it changes exactly when the file does and never when it does not.
// Computed once per process: these files change on deploy, and a deploy is a new
// process.
let _assetVersions = null;
function assetVersions() {
  if (_assetVersions) return _assetVersions;
  const fs = require('fs'), path = require('path'), crypto = require('crypto');
  const out = {};
  for (const name of ['apcs-widget.js', 'apcs-flag.js']) {
    try {
      const buf = fs.readFileSync(path.join(__dirname, '..', 'public', name));
      out[name] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
    } catch (_) {
      out[name] = 'missing';
    }
  }
  _assetVersions = out;
  return out;
}

router.get('/api/assistant/widget-version', helpLimit, (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=300');
  const v = assetVersions();
  res.json({
    widget: v['apcs-widget.js'],
    flag: v['apcs-flag.js'],
    // Ready-made, so the Liquid snippet does no string building of its own.
    widget_url: `/apcs-widget.js?v=${v['apcs-widget.js']}`,
    flag_url: `/apcs-flag.js?v=${v['apcs-flag.js']}`,
  });
});

// ── FIND A PAGE (handoff section 4.4) ────────────────────────────────────────
//
//  Public, read-only, and it returns LINKS FROM THE PAGE INDEX AND NOTHING ELSE.
//  lib/assistant/find.js is where that property is enforced and explained: the
//  model is handed a numbered shortlist and may return integers, so it can
//  reorder and drop but cannot invent a destination.
//
//  Rate limited on the same window as help search, because it can spend a model
//  call and it is open to the internet.
router.get('/api/assistant/find', helpLimit, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
    const out = await find.answer(q);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=60');
    res.json(out);
  } catch (e) {
    console.error('assistant/find:', e);
    res.status(500).json({ error: 'Search is unavailable right now.', results: [] });
  }
});

module.exports = router;
module.exports.LIMITER = { WINDOW_MS, MAX_PER_WINDOW };
module.exports.CHAT_LIMITER = { CHAT_WINDOW_MS, CHAT_MAX_PER_WINDOW, CHAT_IP_MAX };
module.exports.SWITCHES = { anonEnabled, studentEnabled };
