'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE JUNK FILTER  (handoff section 3.5)
//
//  Three layers, cheapest first, and the ordering is the whole design. A public
//  write endpoint on a 1 vCPU box cannot afford to ask a model about every
//  submission, so the model is the LAST thing consulted and only for the traffic
//  the free layers could not settle.
//
//    1. Turnstile plus the rate limiter. Lives in routes/assistant.js, because
//       it runs before this module is reached and before a body is parsed.
//    2. Rules, here. Four of them, no network, no spend.
//    3. One model call, here, cheapest model, JSON only.
//
//  THE RULE THAT OVERRIDES ALL THREE: nothing is ever dropped. A verdict of junk
//  means the row is stored with status='dismissed' and no email goes. It does
//  not mean the report vanishes. The morning mail reports the dismissed count
//  for exactly this reason: a filter nobody can audit is a filter nobody should
//  trust, and the failure mode of a spam filter on a support desk is a real
//  teacher who was told their problem was received.
//
//  THE SECOND RULE: this filter fails OPEN. Every uncertain path returns 'real'.
//  No model key, a model timeout, malformed JSON back, an unparseable body: all
//  of them mean the report is emailed. A filter that silences reports when its
//  own dependency is down is worse than no filter, because the outage is
//  invisible from the outside and looks like a quiet week.
//
//  Each rule is separately named in its reason string so a mutation test can
//  break ONE and watch that one go red. A suite that goes red for a different
//  rule is telling you the rule you meant to test is hollow, which is the
//  failure this repo has now found in three of its own guards.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../../db');
const provider = require('./provider');

// The cheapest current Claude model. Named here rather than reusing
// ASSISTANT_MODEL, which is the support-reply model and is Opus by default:
// labelling a sentence real, vague or junk is not work that wants Opus, and
// spending Opus tokens on spam is how a filter costs more than the spam.
const DEFAULT_TRIAGE_MODEL = 'claude-haiku-4-5-20251001';

function triageModel() {
  return process.env.REPORTS_TRIAGE_MODEL || DEFAULT_TRIAGE_MODEL;
}

// How long the in-request triage may take before the report is emailed unjudged.
// Six seconds is long enough for Haiku on a short prompt and short enough that a
// person who just pressed Send does not think the button failed.
const DEFAULT_TIMEOUT_MS = 6000;
function timeoutMs() {
  const n = Number(process.env.REPORTS_TRIAGE_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 250 && n <= 30000 ? Math.floor(n) : DEFAULT_TIMEOUT_MS;
}

// Under this many words with nothing else filled in is not a report.
const MIN_WORDS = 8;
// Two or more links to somewhere that is not this site.
const MAX_EXTERNAL_LINKS = 1;

// Our own hosts. A teacher pasting the URL of the broken page is the single most
// useful thing they can do, so those never count against them.
const OWN_HOSTS = [
  'apcsexamprep.com', 'www.apcsexamprep.com', 'progress.apcsexamprep.com',
  'localhost', '127.0.0.1',
];

// Per category, the fields that make a short message acceptable anyway. "The
// quiz will not load" is six words and is a perfectly good report when the page
// URL and a console error came with it.
const CATEGORY_FIELDS = {
  access_not_showing: ['purchaseChannel', 'orderRef'],
  student_join_failure: ['classCode'],
  gradebook_missing_scores: ['classCode', 'lesson'],
  content_error: ['questionId'],
  bug_report: [],
  suggestion: [],
};

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

// Count links that point somewhere other than this site. A bare "example.com"
// with no scheme counts too: spam does not bother with https.
function externalLinks(text) {
  const t = String(text || '');
  const found = [];
  const re = /\b(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com|net|org|ru|cn|io|xyz|top|info|biz|shop|live|club)\b/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    const raw = m[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const host = raw.split(/[/?#]/)[0].toLowerCase();
    if (!OWN_HOSTS.includes(host)) found.push(host);
    if (found.length > 8) break; // bounded: the box has 1 GB
  }
  return found;
}

// A real browser sends a User-Agent starting with Mozilla/ and naming an engine.
// Everything this repo's own tooling sends (curl, node, python) does not, which
// is why CI needs the bypass below rather than a loosened rule.
function looksLikeBrowser(ua) {
  const s = String(ua || '');
  if (!s) return false;
  if (!/^Mozilla\/\d/.test(s)) return false;
  return /(Gecko|WebKit|Chrome|Safari|Firefox|Edg|Trident)/.test(s);
}

// Has this exact text already arrived from this connection today? Cheap because
// summary and ip_hash are both already columns and ip_hash is already indexed by
// the daily-rotating hash, so "same IP" means "same IP today" by construction.
const stRepeat = db.prepare(`
  SELECT COUNT(*) n FROM chat_escalations
  WHERE ip_hash = ? AND summary = ? AND summary IS NOT NULL
    AND created_at >= datetime('now', '-24 hours')
`);

function isRepeat(ipHash, summary) {
  if (!ipHash || !summary) return false;
  try { return stRepeat.get(ipHash, summary).n > 0; } catch (_) { return false; }
}

// ── LAYER 2 ──────────────────────────────────────────────────────────────────
//
// Returns { label, reason }. label is 'junk' or 'real'; this layer never says
// 'vague', which is a judgement only layer 3 makes.
//
// `adminBypass` is CI holding a valid x-admin-key. It waives the User-Agent rule
// and nothing else: a smoke suite posts from node and must still be refused for
// posting three casino links.
function rules({ category, summary, detail, fields, userAgent, ipHash, adminBypass }) {
  const text = String(summary || '');

  // 1. Too short AND nothing else to go on.
  const named = CATEGORY_FIELDS[category] || [];
  const anyFieldFilled = named.some((f) => {
    const v = fields && fields[f];
    return typeof v === 'string' ? v.trim().length > 0 : v != null;
  });
  // Console output the browser captured is machine evidence and counts as a
  // filled field: it is the part that actually reproduces a bug.
  const hasConsole = !!(detail && Array.isArray(detail.consoleErrors) && detail.consoleErrors.length);
  if (words(text) < MIN_WORDS && !anyFieldFilled && !hasConsole) {
    return { label: 'junk', reason: 'rule:too_short' };
  }

  // 2. Two or more external links.
  const ext = externalLinks(text);
  if (ext.length > MAX_EXTERNAL_LINKS) {
    return { label: 'junk', reason: 'rule:external_links' };
  }

  // 3. The same words from the same connection inside a day.
  if (isRepeat(ipHash, text)) {
    return { label: 'junk', reason: 'rule:repeat' };
  }

  // 4. Not a browser. Last because it is the one CI waives, so a bypassed
  //    request still pays for every rule above it.
  if (!adminBypass && !looksLikeBrowser(userAgent)) {
    return { label: 'junk', reason: 'rule:not_a_browser' };
  }

  return { label: 'real', reason: null };
}

// ── LAYER 3 ──────────────────────────────────────────────────────────────────
//
// One model call. JSON only, no prose, and the prompt says so twice because a
// model that decides to be helpful here costs a parse.
//
// It answers three things in one call rather than three: the label, a one-line
// summary for the email, and a severity read. Section 3.6 wants the summary and
// section 3.3 wants the severity, and asking separately would triple the spend
// on the cheapest thing in the system.
const TRIAGE_SYSTEM = [
  'You triage bug reports and suggestions for a high school computer science course website.',
  'Answer with ONE JSON object and nothing else. No prose, no code fence, no explanation.',
  '',
  'Shape:',
  '{"label":"real|vague|junk","summary":"one short sentence","severity":"low|normal|high"}',
  '',
  'label:',
  '  real  A specific, actionable problem or suggestion. Default to this when unsure.',
  '  vague A genuine attempt that does not say enough to act on. "It is broken."',
  '  junk  Spam, advertising, abuse, keyboard mashing, or an empty test.',
  '',
  'severity: how much damage this does while it is unfixed.',
  '  high   students can see assessments or answer keys, a class cannot get in,',
  '         or purchased content is unreachable.',
  '  normal an ordinary defect.',
  '  low    cosmetic, or a suggestion.',
  '',
  'summary: one sentence, under 120 characters, plain. It goes in an email subject line area.',
  'Never quote more of the report than you need. Never invent a page, a class or a name.',
].join('\n');

function parseVerdict(raw) {
  if (!raw) return null;
  // A model that wrapped it in a fence anyway. Take the first brace-to-brace run.
  const m = /\{[\s\S]*\}/.exec(String(raw));
  if (!m) return null;
  let obj;
  try { obj = JSON.parse(m[0]); } catch (_) { return null; }
  if (!obj || typeof obj !== 'object') return null;

  const label = ['real', 'vague', 'junk'].includes(obj.label) ? obj.label : null;
  if (!label) return null;
  const severity = ['low', 'normal', 'high'].includes(obj.severity) ? obj.severity : 'normal';
  const summary = typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 160) : null;
  return { label, severity, summary: summary || null };
}

// Returns { label, summary, severity, reason }. Never throws, never rejects.
// Every failure path answers 'real' with a reason naming why, because failing
// open is the posture and a silent open failure is not auditable.
async function triage({ category, summary, pagePath, role }) {
  const text = String(summary || '').trim();
  // Nothing typed means nothing to judge. This is the normal case for a student
  // report, whose text is never retained: the category and the machine context
  // are what survive, and neither is spam.
  if (!text) return { label: 'real', summary: null, severity: null, reason: 'no_text' };
  if (!provider.configured()) {
    return { label: 'real', summary: null, severity: null, reason: 'model_unconfigured' };
  }

  const user = [
    `Category the reporter picked: ${category}`,
    `Reported by: ${role}`,
    `Page: ${pagePath || '(none given)'}`,
    '',
    'Report text:',
    text.slice(0, 2000),
  ].join('\n');

  let res;
  try {
    // The triage runs INSIDE the request, because the widget needs the 'vague'
    // label to decide whether to ask its one follow-up question (handoff 4.2).
    // So it needs a ceiling the SDK does not give it: the Anthropic client's own
    // default timeout is minutes, and a public endpoint holding a handler open
    // for minutes on a 1 vCPU box is an outage waiting for a slow afternoon.
    //
    // Losing the race costs a label and never costs a report: the row is already
    // durable by the time this is called, and the timeout path returns 'real',
    // which means the report is emailed.
    res = await Promise.race([
      provider.complete({
        system: TRIAGE_SYSTEM,
        messages: [{ role: 'user', content: user }],
        maxTokens: 256,
        // Cheapest model, not the support-reply model. See DEFAULT_TRIAGE_MODEL.
        model: triageModel(),
      }),
      new Promise((resolve) => setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs())),
    ]);
  } catch (e) {
    console.error('[assistant/junk-filter] triage threw:', e && e.message);
    return { label: 'real', summary: null, severity: null, reason: 'model_error' };
  }

  if (!res || !res.ok) {
    return { label: 'real', summary: null, severity: null, reason: 'model_' + ((res && res.reason) || 'error') };
  }
  const verdict = parseVerdict(res.text);
  if (!verdict) {
    return { label: 'real', summary: null, severity: null, reason: 'model_unparseable' };
  }
  return {
    label: verdict.label,
    summary: verdict.summary,
    severity: verdict.severity,
    reason: 'model:' + verdict.label,
  };
}

module.exports = {
  rules, triage, parseVerdict,
  words, externalLinks, looksLikeBrowser, isRepeat,
  triageModel, timeoutMs, TRIAGE_SYSTEM,
  MIN_WORDS, MAX_EXTERNAL_LINKS, CATEGORY_FIELDS, OWN_HOSTS,
  DEFAULT_TRIAGE_MODEL, DEFAULT_TIMEOUT_MS,
};
