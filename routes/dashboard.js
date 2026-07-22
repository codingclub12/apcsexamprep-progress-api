'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN DASHBOARD - server-rendered operations page + JSON summary.
//
//  Routes (mounted at '/' in server.js, BEFORE the /api/admin key-auth router):
//    GET  /admin/login      login form
//    POST /admin/login      exchange ADMIN_KEY for a session cookie
//    POST /admin/logout     clear the session cookie
//    GET  /admin/dashboard  the page (server-rendered HTML, auto-refresh 60s)
//    GET  /api/admin/summary the same data as JSON
//
//  SECURITY MODEL:
//   * Session COOKIE only. The credential must never travel in the query string,
//     because that is exactly what leaks into access logs and browser history. A
//     request that carries ?key= is rejected outright, not honored.
//   * Fails closed, same posture as /api/admin/*: a missing or weak ADMIN_KEY
//     means the whole surface is OFF (503), never open.
//   * The session cookie is an HMAC of an expiry stamp keyed by ADMIN_KEY, so it
//     is stateless (no server session store) yet expires and is unforgeable
//     without the key. Cookie is HttpOnly + SameSite=Strict, so it never reaches
//     page JavaScript and cannot be read from view-source. The key itself never
//     ships to the browser: this is why the page is rendered here and not as a
//     Shopify page calling the admin API from client JS.
//   * The page shows teacher emails and aggregate cohort data. No student names
//     or PII. No write operations. No third-party analytics.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const metrics = require('../lib/admin-metrics');

const router = express.Router();

const MIN_KEY_LEN = 20;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const COOKIE_NAME = 'admin_session';

// ── AUTH PRIMITIVES ─────────────────────────────────────────────────────────--
function keyConfigured() {
  return (process.env.ADMIN_KEY || '').length >= MIN_KEY_LEN;
}

function sign(payload) {
  return crypto.createHmac('sha256', process.env.ADMIN_KEY).update(String(payload)).digest('hex');
}

function issueToken() {
  const exp = String(Date.now() + SESSION_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(exp);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const t = parseInt(exp, 10);
  return Number.isFinite(t) && Date.now() <= t;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function cookieIsSecure(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function setSessionCookie(req, res) {
  const secure = cookieIsSecure(req);
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${issueToken()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`);
}

function clearSessionCookie(req, res) {
  const secure = cookieIsSecure(req);
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
}

// Constant-time key comparison (SHA-256 digest so length is not leaked), the
// same pattern the /api/admin router uses.
function keyMatches(provided) {
  if (!provided) return false;
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(digest(provided), digest(process.env.ADMIN_KEY));
}

// Light per-IP throttle on the login POST. Bounded map (evicted when large) so a
// flood of source IPs cannot grow it without limit; this box is memory-capped.
const loginHits = new Map();
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX = 10;
function loginThrottled(ip) {
  const now = Date.now();
  if (loginHits.size > 5000) loginHits.clear(); // hard cap, never unbounded
  const rec = loginHits.get(ip);
  if (!rec || now - rec.start > LOGIN_WINDOW_MS) {
    loginHits.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > LOGIN_MAX;
}

// ── AUTH MIDDLEWARE (cookie-only, fail closed) ────────────────────────────────
//  mode 'html' redirects to the login page; mode 'api' returns JSON.
function requireAdminSession(mode) {
  return (req, res, next) => {
    if (!keyConfigured()) {
      if (mode === 'html') {
        return res.status(503).type('html').send(page('Admin disabled',
          '<div class="card"><h1>Admin dashboard disabled</h1><p>Set a strong <code>ADMIN_KEY</code> (at least 20 characters) in the environment.</p></div>'));
      }
      return res.status(503).json({ error: 'Admin API disabled. Set a strong ADMIN_KEY (>= 20 chars) in the environment.' });
    }
    // A credential in the query string is never accepted: that is what leaks.
    if (req.query.key !== undefined) {
      if (mode === 'html') return res.redirect(302, '/admin/login');
      return res.status(400).json({ error: 'Admin credential must not be sent in the query string. Log in for a session cookie.' });
    }
    const cookies = parseCookies(req);
    if (verifyToken(cookies[COOKIE_NAME])) return next();
    if (mode === 'html') return res.redirect(302, '/admin/login');
    return res.status(403).json({ error: 'Admin session required. POST /admin/login first.' });
  };
}

// ── LOGIN / LOGOUT ────────────────────────────────────────────────────────────
router.get('/admin/login', (req, res) => {
  if (keyConfigured() && verifyToken(parseCookies(req)[COOKIE_NAME])) {
    return res.redirect(302, '/admin/dashboard');
  }
  const disabled = !keyConfigured();
  res.type('html').send(page('Admin login', `
    <div class="card login">
      <h1>APCSExamPrep admin</h1>
      ${disabled
        ? '<p class="warn">Admin is disabled: no strong ADMIN_KEY is configured.</p>'
        : `
      <p class="muted">Enter the admin key. It is exchanged for a session cookie and is never placed in the URL.</p>
      <form id="f" autocomplete="off">
        <input id="key" type="password" placeholder="Admin key" autofocus />
        <button type="submit">Sign in</button>
      </form>
      <p id="err" class="err" hidden></p>
      <script>
        var f = document.getElementById('f');
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var err = document.getElementById('err');
          err.hidden = true;
          fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: document.getElementById('key').value }),
          }).then(function (r) {
            if (r.ok) { window.location = '/admin/dashboard'; return; }
            return r.json().then(function (j) {
              err.textContent = (j && j.error) || 'Sign in failed';
              err.hidden = false;
            });
          }).catch(function () { err.textContent = 'Network error'; err.hidden = false; });
        });
      </script>`}
    </div>`));
});

router.post('/admin/login', (req, res) => {
  if (!keyConfigured()) {
    return res.status(503).json({ error: 'Admin API disabled. Set a strong ADMIN_KEY (>= 20 chars).' });
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (loginThrottled(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Wait a minute and try again.' });
  }
  const provided = (req.body && req.body.key) || '';
  if (!keyMatches(provided)) {
    return res.status(403).json({ error: 'Invalid admin key.' });
  }
  setSessionCookie(req, res);
  res.json({ ok: true });
});

router.post('/admin/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

// ── JSON SUMMARY ────────────────────────────────────────────────────────────--
router.get('/api/admin/summary', requireAdminSession('api'), (req, res) => {
  try {
    res.json(metrics.computeSummary());
  } catch (e) {
    console.error('admin/summary:', e);
    res.status(500).json({ error: 'summary failed', detail: e.message });
  }
});

// ── DASHBOARD PAGE ────────────────────────────────────────────────────────────
router.get('/admin/dashboard', requireAdminSession('html'), (req, res) => {
  try {
    const s = metrics.computeSummary();
    res.type('html').send(renderDashboard(s));
  } catch (e) {
    console.error('admin/dashboard:', e);
    res.status(500).type('html').send(page('Error',
      `<div class="card"><h1>Dashboard error</h1><pre>${esc(e.message)}</pre></div>`));
  }
});

// ── HTML RENDERING ────────────────────────────────────────────────────────────
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function num(n) { return Number(n || 0).toLocaleString('en-US'); }
// Format a stat value: numbers get thousands separators, strings (e.g. "67%")
// pass through escaped so a preformatted value never becomes NaN.
function statValue(v) { return typeof v === 'number' ? num(v) : esc(v); }

// A signed delta rendered as +N / -N / 0, or a dash when there is no baseline.
function delta(d) {
  if (d == null) return '<span class="d d-none">no baseline</span>';
  if (d === 0) return '<span class="d d-flat">0</span>';
  const cls = d > 0 ? 'd-up' : 'd-down';
  const sign = d > 0 ? '+' : '';
  return `<span class="d ${cls}">${sign}${num(d)}</span>`;
}

function pageHead(title, extraMeta) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
${extraMeta || ''}
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         background: #0f1115; color: #e7e9ee; -webkit-text-size-adjust: 100%; }
  a { color: #7aa2ff; }
  code { background: rgba(255,255,255,.08); padding: 1px 5px; border-radius: 4px; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 16px 14px 64px; }
  .card { background: #171a21; border: 1px solid #262b36; border-radius: 12px; padding: 16px; margin: 14px 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .06em; color: #9aa3b2; margin: 0 0 12px; }
  .muted { color: #9aa3b2; }
  .warn { color: #ffd479; }
  .err  { color: #ff6b6b; }
  .topbar { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .topbar .ts { color: #9aa3b2; font-size: 12px; }
  form.logout { display: inline; }
  form.logout button, .login button {
    background: #2a3140; color: #e7e9ee; border: 1px solid #39415280; border-radius: 8px;
    padding: 7px 12px; font-size: 13px; cursor: pointer; }
  /* Activation hero */
  .hero { background: linear-gradient(180deg,#1b2230,#141821); border-color: #2c3550; }
  .hero-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat { background: #10141b; border: 1px solid #232936; border-radius: 10px; padding: 14px; }
  .stat .k { color: #9aa3b2; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .stat .v { font-size: 30px; font-weight: 700; margin-top: 4px; line-height: 1; }
  .stat.big .v { font-size: 44px; }
  .stat .sub { margin-top: 6px; font-size: 12px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .d { font-size: 12px; font-weight: 600; }
  .d-up { color: #5fd68a; } .d-down { color: #ff8a8a; } .d-flat { color: #9aa3b2; } .d-none { color: #6b7280; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 8px; border-bottom: 1px solid #232936; white-space: nowrap; }
  th { color: #9aa3b2; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .pill { display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 999px; border: 1px solid #39415280; color: #c7cdd8; }
  .pill.ext { color: #7aa2ff; border-color: #7aa2ff55; }
  .pill.solo { color: #c99bff; border-color: #c99bff55; }
  .pill.tanner, .pill.prober, .pill.audit { color: #9aa3b2; }
  .flag-ok  { color: #5fd68a; }
  .flag-bad { background: #3a1214; border: 1px solid #ff6b6b; color: #ffd0d0; padding: 12px 14px; border-radius: 10px; font-weight: 600; }
  .tag-live { color: #5fd68a; font-weight: 600; }
  .tag-soon { color: #ffd479; }
  ul.anom { margin: 6px 0 0; padding-left: 18px; }
  ul.anom li { color: #ffd479; margin: 3px 0; }
  .login { max-width: 380px; margin: 60px auto; }
  .login input { width: 100%; padding: 10px 12px; margin: 8px 0; border-radius: 8px; border: 1px solid #39415280; background: #10141b; color: #e7e9ee; }
  @media (max-width: 720px) {
    .hero-grid, .grid4, .grid3 { grid-template-columns: repeat(2, 1fr); }
    .stat.big .v { font-size: 34px; }
  }
</style>
</head><body><div class="wrap">`;
}

// Minimal shell (login / error pages).
function page(title, inner) {
  return `${pageHead(title)}${inner}</div></body></html>`;
}

function statTile(label, value, d, opts) {
  const big = opts && opts.big ? ' big' : '';
  const sub = d !== undefined
    ? `<div class="sub">${delta(d && d.d24h)} <span class="muted">24h</span> &nbsp; ${delta(d && d.d7d)} <span class="muted">7d</span></div>`
    : (opts && opts.sub ? `<div class="sub muted">${opts.sub}</div>` : '');
  return `<div class="stat${big}"><div class="k">${esc(label)}</div><div class="v">${statValue(value)}</div>${sub}</div>`;
}

function bucketPill(bucket) {
  const b = String(bucket || '').toLowerCase();
  return `<span class="pill ${esc(b)}">${esc(bucket)}</span>`;
}

function renderDashboard(s) {
  const D = s.deltas;
  const a = s.activation;

  // Activation panel: the Oct 1 trigger metric, most prominent thing on the page.
  const activationPanel = `
    <div class="card hero">
      <h2>Activation: external class fill</h2>
      <div class="hero-grid">
        ${statTile('Classes with 5+ students', a.ge5, D.activation_ge5, { big: true })}
        ${statTile('Classes with 20+ students', a.ge20, D.activation_ge20, { big: true })}
        ${statTile('Classes with any students', a.ge1, D.activation_ge1)}
        ${statTile('Activation rate', a.rate + '%', undefined, { sub: `${num(a.ge1)} of ${num(a.external_classes)} external classes` })}
      </div>
    </div>`;

  // Headline metrics with deltas.
  const headlinePanel = `
    <div class="card">
      <h2>External adoption</h2>
      <div class="grid4">
        ${statTile('Teachers', s.headline.external.teachers, D.external_teachers)}
        ${statTile('Classes', s.headline.external.classes, D.external_classes)}
        ${statTile('Students', s.headline.external.students, D.external_students)}
        ${statTile('Completions', s.headline.external.completions, D.external_completions)}
      </div>
    </div>`;

  // Florida cohort panel.
  const flRows = s.florida.map((f) => {
    const live = f.students > 0;
    const matched = f.matched_teachers.length
      ? esc(f.matched_teachers.join(', '))
      : '<span class="muted">no account yet</span>';
    return `<tr>
      <td>${esc(f.teacher)}<div class="muted" style="font-size:11px">${matched}</div></td>
      <td>${esc(f.district)}</td>
      <td>${esc(f.start)} ${f.confirmed ? '<span class="tag-live">✓</span>' : '<span class="tag-soon" title="verify against district calendar">?</span>'}</td>
      <td class="n">${num(f.classes)}</td>
      <td class="n">${num(f.students)}</td>
      <td class="n">${num(f.completions)}</td>
      <td>${f.last_activity ? esc(f.last_activity.replace('T', ' ').slice(0, 16)) : '<span class="muted">-</span>'}</td>
      <td>${live ? '<span class="tag-live">live</span>' : '<span class="tag-soon">pending</span>'}</td>
    </tr>`;
  }).join('');
  const floridaPanel = `
    <div class="card">
      <h2>Florida cohort: starts Aug 10-13</h2>
      <div class="scroll"><table>
        <thead><tr>
          <th>Teacher</th><th>District</th><th>Start</th>
          <th class="n">Classes</th><th class="n">Students</th><th class="n">Completions</th>
          <th>Last activity</th><th>Status</th>
        </tr></thead>
        <tbody>${flRows}</tbody>
      </table></div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">Only Hillsborough (Aug 10) is a confirmed start date. Verify the rest against each district calendar before acting on them.</p>
    </div>`;

  // Solo summary.
  const soloPanel = `
    <div class="card">
      <h2>Solo accounts</h2>
      <div class="grid3">
        ${statTile('Solo classes', s.headline.solo.classes, D.solo_classes)}
        ${statTile('Solo students', s.headline.solo.students, D.solo_students)}
        ${statTile('Solo completions', s.headline.solo.completions, D.solo_completions)}
      </div>
    </div>`;

  // Recent activity.
  const created = s.recent.classes_created_7d;
  const createdRows = created.length
    ? created.map((c) => `<tr>
        <td>${esc(c.class_code)}</td><td>${esc(c.class_name)}</td>
        <td>${bucketPill(c.bucket)}</td><td>${esc(c.teacher_name || '')}</td>
        <td>${esc((c.created_at || '').replace('T', ' ').slice(0, 16))}</td></tr>`).join('')
    : '<tr><td colspan="5" class="muted">None in the last 7 days.</td></tr>';
  const active = s.recent.completion_activity_24h;
  const activeRows = active.length
    ? active.map((c) => `<tr>
        <td>${esc(c.class_code)}</td><td>${esc(c.class_name)}</td>
        <td>${bucketPill(c.bucket)}</td>
        <td class="n">${num(c.completions_24h)}</td>
        <td>${esc((c.last_activity || '').replace('T', ' ').slice(0, 16))}</td></tr>`).join('')
    : '<tr><td colspan="5" class="muted">No completion activity in the last 24h.</td></tr>';
  const recentPanel = `
    <div class="card">
      <h2>Recent activity</h2>
      <h3 style="font-size:13px;color:#9aa3b2;margin:0 0 6px">Completions changed in last 24h <span class="muted">(live classes vs shells)</span></h3>
      <div class="scroll"><table>
        <thead><tr><th>Code</th><th>Class</th><th>Bucket</th><th class="n">Completions 24h</th><th>Last activity</th></tr></thead>
        <tbody>${activeRows}</tbody>
      </table></div>
      <h3 style="font-size:13px;color:#9aa3b2;margin:16px 0 6px">Classes created in last 7 days</h3>
      <div class="scroll"><table>
        <thead><tr><th>Code</th><th>Class</th><th>Bucket</th><th>Teacher</th><th>Created</th></tr></thead>
        <tbody>${createdRows}</tbody>
      </table></div>
    </div>`;

  // Data-quality footer.
  const dq = s.data_quality;
  const bc = dq.bucket_counts;
  const mismatchBlock = dq.mismatch
    ? `<div class="flag-bad">MISMATCH: total classes ${num(dq.total_classes)} != bucket sum ${num(dq.bucket_sum)}. A metric is dropping or double-counting rows. Do not trust the numbers above until this is resolved.</div>`
    : `<p class="flag-ok">Reconciled: ${num(dq.total_classes)} classes = ${num(bc.EXTERNAL)} external + ${num(bc.SOLO)} solo + ${num(bc.TANNER)} tanner + ${num(bc.PROBER)} prober + ${num(bc.AUDIT)} audit.</p>`;
  const excludedRow = `
    <div class="scroll"><table>
      <thead><tr><th>Excluded bucket</th><th class="n">Classes</th><th class="n">Students</th><th class="n">Completions</th></tr></thead>
      <tbody>
        <tr><td>Tanner (owner)</td><td class="n">${num(dq.excluded_counts.tanner.classes)}</td><td class="n">${num(dq.excluded_counts.tanner.students)}</td><td class="n">${num(dq.excluded_counts.tanner.completions)}</td></tr>
        <tr><td>Prober (test/spam)</td><td class="n">${num(dq.excluded_counts.prober.classes)}</td><td class="n">${num(dq.excluded_counts.prober.students)}</td><td class="n">${num(dq.excluded_counts.prober.completions)}</td></tr>
        <tr><td>Audit (delete)</td><td class="n">${num(dq.excluded_counts.audit.classes)}</td><td class="n">${num(dq.excluded_counts.audit.students)}</td><td class="n">${num(dq.excluded_counts.audit.completions)}</td></tr>
      </tbody>
    </table></div>`;
  const anomalies = dq.known_anomalies.length
    ? `<ul class="anom">${dq.known_anomalies.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
    : '<p class="flag-ok">No data anomalies detected.</p>';
  const dqPanel = `
    <div class="card">
      <h2>Data quality</h2>
      ${mismatchBlock}
      <p class="muted" style="margin:12px 0 6px">Excluded from adoption (shown, never silently dropped):</p>
      ${excludedRow}
      <p class="muted" style="margin:14px 0 4px">Known anomalies:</p>
      ${anomalies}
    </div>`;

  const ts = esc(s.generated_at.replace('T', ' ').slice(0, 19)) + ' UTC';
  return `${pageHead('Admin dashboard', '<meta http-equiv="refresh" content="60"/>')}
    <div class="topbar">
      <div><strong>APCSExamPrep admin</strong> <span class="ts">generated ${ts} · auto-refresh 60s</span></div>
      <form class="logout" onsubmit="event.preventDefault();fetch('/admin/logout',{method:'POST'}).then(function(){window.location='/admin/login';});">
        <button type="submit">Sign out</button>
      </form>
    </div>
    ${activationPanel}
    ${headlinePanel}
    ${floridaPanel}
    ${soloPanel}
    ${recentPanel}
    ${dqPanel}
  </div></body></html>`;
}

module.exports = router;
