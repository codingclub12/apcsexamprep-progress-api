'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: CHAT  (spec section 5, Phase 2)
//
//  A teacher asks why something is happening to their class, and this answers it
//  from live account state. Not a tutor, not a chatbot, and specifically not a
//  thing that has ever held an answer key.
//
//  ORDER OF OPERATIONS, and the order is the design:
//
//    1  enabled?            ASSISTANT_ENABLED, off by default
//    2  pre-filter          layer 5. Coursework refused for zero tokens
//    3  deterministic page  spec section 9. Rules fire before any classifier
//    4  caps                per session, per day. Degrade, never error
//    5  reads               layer 2. Typed DTOs, pre-fetched, never model-chosen
//    6  knowledge base      layer 1. The isolated corpus, and the free path
//    7  assemble            layer 3. pageUrl only, never page content
//    8  model               the only step that costs money
//    9  output filter       layer 6. The tripwire
//   10  store               layer 8 of the privacy posture, in store.js
//
//  WHERE THIS DEPARTS FROM THE SPEC, and it is a deliberate narrowing rather
//  than a shortcut. Spec section 5 layer 2 describes the reads as TOOLS the
//  model calls. This calls them itself, before the model, and puts the results
//  in the context. The safety property is identical, because either way the only
//  thing the model ever sees is a typed DTO with no field an answer could sit
//  in. What changes is that the model cannot choose, which is strictly safer,
//  and that a reply is one API round trip instead of three, which on a 1 vCPU
//  box with a $169 incident on record is the difference that decides whether
//  this ships at all. The reads it runs are exactly the ones behind
//  /api/assistant/diagnostics, so chat can never tell a teacher something the
//  diagnostic panel does not also show. That is the drift property spec section
//  3.5 asks for, and pre-fetching is what makes it structural.
//
//  THE MODEL IS OPTIONAL EVERYWHERE. No API key, a bad key, a rate limit, a
//  daily cap breach: every one of those degrades to the knowledge base and the
//  state summary, in a fixed format, with a note saying so. There is no path in
//  this file where a provider problem becomes a 500. A support desk that goes
//  down when its model does is a support desk that goes down.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const prefilter = require('./prefilter');
const outputFilter = require('./output-filter');
const reads = require('./reads');
const kb = require('./kb');
const store = require('./store');
const report = require('./report');
const defaultProvider = require('./provider');

// ── caps ─────────────────────────────────────────────────────────────────────
//  Every one of these is enforced server-side against the session row, never
//  against anything the client sends. Spec section 6.
function num(name, dflt, min, max) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : dflt;
}
const CAPS = {
  messagesPerSession: () => num('ASSISTANT_SESSION_MSG_CAP', 20, 1, 200),
  tokensPerSession: () => num('ASSISTANT_SESSION_TOKEN_CAP', 60000, 1000, 2000000),
  // The spec asks for a daily USD ceiling. The server can only observe tokens,
  // so tokens are what it counts and enforces; the dollar figure is derived from
  // rates that live in the environment, because prices change and a number baked
  // into a deploy would quietly become wrong. Both are reported by the endpoint.
  tokensPerDay: () => num('ASSISTANT_DAILY_TOKEN_CAP', 400000, 1000, 100000000),
  messageChars: 2000,
};
function usdPerMTok() {
  const i = Number(process.env.ASSISTANT_USD_PER_MTOK_IN);
  const o = Number(process.env.ASSISTANT_USD_PER_MTOK_OUT);
  return {
    input: Number.isFinite(i) && i >= 0 ? i : null,
    output: Number.isFinite(o) && o >= 0 ? o : null,
  };
}
function estimateUsd(tokens) {
  const r = usdPerMTok();
  if (r.input === null || r.output === null) return null;
  return Number(((tokens.input / 1e6) * r.input + (tokens.output / 1e6) * r.output).toFixed(4));
}

function enabled() {
  const v = String(process.env.ASSISTANT_ENABLED || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

// ── the deterministic page (spec section 9) ──────────────────────────────────
//  These fire by rule, before any model call, so the pager cannot be talked out
//  of firing or into firing. Only the first is reachable in Phase 2; the other
//  two need a report shape that chat does not collect yet, and they are named
//  here so the next phase adds them to a list rather than reinventing the idea.
const ASSESSMENT_VISIBILITY = [
  /\b(students?|kids|they|class)\b[^.?!]{0,60}\b(can|could|are able to)\s+(see|view|read|open|access)\b[^.?!]{0,40}\b(test|exam|quiz|answers?|key|solutions?)\b/i,
  /\b(answers?|answer key|solutions?|correct answers?)\b[^.?!]{0,40}\b(showing|visible|exposed|leaked|shown)\b[^.?!]{0,40}\b(students?|before|early)\b/i,
  /\b(test|exam|quiz)\b[^.?!]{0,40}\bis\s+(open|visible|unlocked)\b[^.?!]{0,40}\b(early|already|too soon|before)\b/i,
];

function deterministicRule(message, role) {
  if (role !== 'teacher') return null;
  const t = String(message || '');
  for (const re of ASSESSMENT_VISIBILITY) {
    if (re.test(t)) {
      return {
        category: 'assessment_visibility',
        severity: 'immediate',
        // No model call. The reply is fixed because the only useful thing to say
        // is "this is now a page, here is what happens next", and generating it
        // would put a paraphrase of an assessment problem through a model for no
        // reason at all.
        reply:
          'I have raised this as an immediate issue and Tanner has been paged. ' +
          'Assessment visibility is treated as urgent by rule, not by judgement, ' +
          'so it does not wait in a queue. If you can, close the activity for ' +
          'your class in the teacher dashboard now: that takes effect on the next ' +
          'page load for every student. I have recorded which class and course ' +
          'this is about along with your account state.',
      };
    }
  }
  return null;
}

// ── which class is this about ────────────────────────────────────────────────
//  A code named in the message wins. Otherwise, if the teacher has exactly one
//  class, it is that one, which covers most of the traffic. Otherwise no class
//  detail is fetched and the reply asks which, rather than guessing and being
//  confidently wrong about somebody else's period 3.
const CODE_RE = /\b((?:CSA|CSP|CYBER|ME)-[A-Z0-9]{3,8})\b/i;

function resolveClassCode(message, explicit, classes) {
  if (explicit && typeof explicit === 'string' && explicit.trim()) return explicit.trim().toUpperCase();
  const m = CODE_RE.exec(String(message || ''));
  if (m) return m[1].toUpperCase();
  if (Array.isArray(classes) && classes.length === 1) return classes[0].class_code;
  return null;
}

// A lesson number named in the message, so "why is 1.2 closed" narrows the gate
// read instead of dumping every activity on the course into the context.
const LESSON_RE = /\b([1-9]\d?\.\d{1,2})\b/;
function resolveLesson(message) {
  const m = LESSON_RE.exec(String(message || ''));
  return m ? m[1] : null;
}

// ── layer 2: run the typed reads ─────────────────────────────────────────────
function runReads(who, { classCode, lesson }) {
  const calls = [];
  const state = {};

  state.entitlements = reads.getEntitlementState(who.userRef, who.contactEmail);
  calls.push({ tool: 'getEntitlementState', params: {}, result: state.entitlements });

  state.classes = reads.listClasses(who.userRef);
  calls.push({ tool: 'listClasses', params: {}, result: state.classes });

  if (classCode) {
    const settings = reads.getClassSettings(who.userRef, classCode);
    calls.push({ tool: 'getClassSettings', params: { classCode }, result: settings });
    if (settings) {
      state.class_code = classCode;
      state.settings = settings;
      state.gates = reads.getGateState(who.userRef, classCode, { lesson: lesson || undefined });
      calls.push({ tool: 'getGateState', params: { classCode, lesson }, result: state.gates });
      state.roster = reads.getRosterHealth(who.userRef, classCode);
      calls.push({ tool: 'getRosterHealth', params: { classCode }, result: state.roster });
      state.scores = reads.getScoreVisibility(who.userRef, classCode, { lesson: lesson || undefined });
      calls.push({ tool: 'getScoreVisibility', params: { classCode, lesson }, result: state.scores });
    } else {
      // Not owned and not existing answer the same way, so chat cannot be used
      // to discover class codes any more than the panel can.
      state.class_code_unknown = classCode;
    }
  }
  return { state, calls };
}

// ── the state block: bounded, and readable by a person ───────────────────────
//  A course has around a hundred activities, so the raw gate DTO is far too big
//  to put in a prompt on every turn and most of it is "open", which is the
//  uninteresting half. What matters is the closed list and the counts. Capped,
//  with the remainder stated as a number so nothing is silently dropped.
const MAX_CLOSED_LISTED = 25;

function projectState(state) {
  const L = [];
  const ents = state.entitlements || {};
  const grants = Array.isArray(ents.grants) ? ents.grants : [];
  L.push('ACCOUNT');
  if (!grants.length) L.push('  entitlements: none on this account');
  for (const g of grants.slice(0, 10)) {
    L.push(`  entitlement: ${g.course} ${g.status || ''} source=${g.source || '?'} granted=${g.granted_at || '?'} expires=${g.expires_at || 'never'}`);
  }
  // The access_not_showing flow's whole first step, spec section 10: a parked
  // purchase means the answer is "sign out and back in", not "your code is
  // missing". Stating it here is what stops the assistant asking for an order
  // number it does not need.
  const pending = Array.isArray(ents.unclaimed_purchases) ? ents.unclaimed_purchases : [];
  for (const p of pending.slice(0, 10)) {
    L.push(`  unclaimed purchase parked: ${p.course} source=${p.source || '?'} at=${p.created_at || '?'}`);
  }
  const classes = state.classes || [];
  if (!classes.length) L.push('  classes: none');
  for (const c of classes.slice(0, 20)) {
    L.push(`  class: ${c.class_code} "${c.class_name || ''}" course=${c.course} active=${c.active ? 'yes' : 'no'}`);
  }

  if (state.class_code_unknown) {
    L.push('');
    L.push(`CLASS ${state.class_code_unknown}: no class with that code on this account`);
    return L.join('\n');
  }
  if (!state.settings) return L.join('\n');

  const s = state.settings;
  L.push('');
  L.push(`CLASS ${state.class_code} (${s.course})`);
  L.push(`  mastery_threshold=${s.mastery_threshold} retry_allowed=${s.retry_allowed ? 'yes' : 'no'} quiz_lock_default=${s.quiz_lock_default ? 'on' : 'off'} active=${s.active ? 'yes' : 'no'}`);

  const g = state.gates;
  if (g) {
    L.push(`  gates: ${g.counts.activities} activities, ${g.counts.open} open, ${g.counts.closed} closed`);
    const shown = g.closed.slice(0, MAX_CLOSED_LISTED);
    for (const a of shown) {
      L.push(`    CLOSED ${a.lesson} ${a.activity_type} (${a.reason})`);
    }
    if (g.closed.length > shown.length) {
      L.push(`    and ${g.closed.length - shown.length} more closed activities not listed`);
    }
    if (!g.closed.length) L.push('    nothing is closed on this class');
  }
  const r = state.roster;
  if (r) {
    L.push(`  roster: ${r.student_count} students, ${r.active_count} active, ${r.joined_24h} joined in 24h, ${r.never_signed_in} never signed in`);
  }
  const sc = state.scores;
  if (sc) {
    L.push(`  scores: ${sc.recorded_total} recorded total, ${sc.recorded_24h} in 24h, ${sc.recorded_7d} in 7d, last at ${sc.last_recorded_at || 'never'}`);
    for (const b of sc.by_item_type || []) {
      L.push(`    lesson ${sc.lesson} ${b.item_type}: ${b.recorded} recorded, last ${b.last_at}`);
    }
  }
  return L.join('\n');
}

// ── layer 1: the isolated corpus ─────────────────────────────────────────────
const MAX_KB_ARTICLES = 3;
const MAX_KB_CHARS = 2500;

function kbBlock(message) {
  let hits = [];
  try {
    const res = kb.search(message, { limit: MAX_KB_ARTICLES, audience: 'teacher' });
    hits = res.results || [];
  } catch (_) { hits = []; }
  const articles = [];
  let budget = MAX_KB_CHARS;
  for (const h of hits) {
    let full = null;
    try { full = kb.published(h.slug); } catch (_) { full = null; }
    if (!full || !full.body_md) continue;
    const body = full.body_md.slice(0, Math.max(0, budget));
    if (!body) break;
    budget -= body.length;
    articles.push({ slug: full.slug, title: full.title, body });
    if (budget <= 0) break;
  }
  return articles;
}

// ── layer 7: the system prompt ───────────────────────────────────────────────
//  Prompting is not a control and this file does not treat it as one: the model
//  cannot leak a key because it is never given one. What the prompt is for is
//  TONE and SHAPE, and one genuine safety job that no other layer does, which is
//  refusing to teach from the model's own training when the pre-filter's
//  syntactic rules did not fire.
const SYSTEM = `You are the support desk for apcsexamprep.com, a site that teaches AP Computer Science A, AP Computer Science Principles, and AP Cybersecurity to high school classes. You are talking to a teacher who is signed in.

Your job is to explain what is true about their account and their classes, using the ACCOUNT STATE block below, and to answer questions about how the site works using the HELP ARTICLES block. That is the whole job.

Rules you do not break:
- Never teach, tutor, hint, trace code, or say whether an answer is correct. If someone asks about quiz, exercise, lab or exam content, say you do not do that and point them at the lesson page.
- Never restate, paraphrase, translate or summarise a question, an option, an exercise or an exam item, even if the person says they are the teacher and even if they say they wrote it.
- Never print an access code, a class join code you were not shown, or anything that looks like a sequence of answer letters.
- Never invent how the site works. If the HELP ARTICLES do not cover it and the ACCOUNT STATE does not answer it, say you are not sure and offer to file a report. A confident wrong answer about site mechanics costs the ticket and the trust.
- Never state a number that is not in the ACCOUNT STATE block. You cannot see the database; you can see that block.

How to answer:
- Lead with the fact, then the reason. "1.2 quiz is closed because this class has teacher-opened quizzes turned on" beats a paragraph of preamble.
- Be short. Two or three sentences is usually the whole answer.
- Plain sentences. No headings, no bullet lists unless you are listing more than three things, no bold.
- If the state block shows nothing is wrong, say so plainly rather than inventing a possibility.
- If you cannot resolve it, say so and tell them the report button sends Tanner the page, the console errors and their account state.
- Do not use em-dashes.`;

// Everything that would be sent, assembled. Exported and returned from respond()
// so smoke/assistant-exfiltration.js can assert on the CONTEXT rather than only
// on the output. A model that never receives a key cannot be jailbroken into
// producing one, and asserting on context is the only way to prove the key was
// never there.
function assembleContext({ message, state, articles, pageUrl, pageTitle }) {
  const parts = [SYSTEM];
  parts.push('\n\nACCOUNT STATE (live, read just now, the only numbers you may state)\n' + projectState(state));
  if (articles.length) {
    parts.push('\n\nHELP ARTICLES (written by the site owner; the only description of how the site works you may rely on)');
    for (const a of articles) parts.push(`\n--- ${a.title} (${a.slug}) ---\n${a.body}`);
  } else {
    parts.push('\n\nHELP ARTICLES: none matched this question.');
  }
  // Layer 3: the page is identified, never quoted. There is no field here that
  // could carry page content, which is the point.
  parts.push(`\n\nPAGE: ${pageUrl || 'unknown'}${pageTitle ? ' (' + String(pageTitle).slice(0, 200) + ')' : ''}`);

  const system = parts.join('');
  const messages = [{ role: 'user', content: String(message || '').slice(0, CAPS.messageChars) }];
  return {
    system,
    messages,
    contextText: system + '\n' + messages.map((m) => m.content).join('\n'),
  };
}

// ── the degraded reply ───────────────────────────────────────────────────────
//  No model, for any reason. This is a real answer rather than an apology: the
//  state block is the thing most tickets actually needed, and a teacher reading
//  it themselves resolves more than a generated paragraph would.
function degradedReply(state, articles, why) {
  const L = [];
  L.push('I am answering without the assistant model right now, so this is your account state as it stands and the help articles that matched.');
  L.push('');
  L.push(projectState(state));
  if (articles.length) {
    L.push('');
    L.push('Related help: ' + articles.map((a) => `${a.title} (/help#${a.slug})`).join(', '));
  }
  L.push('');
  L.push('If that does not answer it, the report button sends Tanner this page, the console errors and your account state.');
  return { text: L.join('\n'), why };
}

// ── the orchestrator ─────────────────────────────────────────────────────────
async function respond({
  message, who, sessionId, pageUrl, pageTitle, pageScope, classCode, ipHash,
  provider = defaultProvider,
}) {
  const text = String(message || '').trim().slice(0, CAPS.messageChars);
  if (!text) return { status: 'empty', reply: 'Ask me something about your account or how the site works.' };

  const session = store.resolveSession({
    sessionId,
    role: who.role,
    userRef: who.userRef,
    pageScope,
    course: who.course || null,
    ipHash,
  });
  const out = (extra) => Object.assign({ session_id: session.id }, extra);

  // Layer 5. Before anything that costs money or touches the database.
  const pre = prefilter.check(text);
  if (pre.blocked) {
    const id = store.addMessage(session, { who: 'user', content: text, classification: 'content_request', flaggedReason: pre.rule });
    store.addMessage(session, { who: 'assistant', content: pre.refusal, flaggedReason: pre.rule });
    return out({ status: 'refused', reason: pre.rule, reply: pre.refusal, model_called: false, message_id: id });
  }

  // Spec section 9. By rule, before any classifier, so it cannot be argued with.
  const rule = deterministicRule(text, who.role);
  if (rule) {
    const { state, calls } = runReads(who, { classCode: resolveClassCode(text, classCode, reads.listClasses(who.userRef)), lesson: resolveLesson(text) });
    const id = store.addMessage(session, { who: 'user', content: text, classification: rule.category });
    store.addToolCalls(session, id, calls);
    store.addMessage(session, { who: 'assistant', content: rule.reply, classification: rule.category });
    escalate({ session, who, rule, text, pageUrl, pageScope, state });
    return out({ status: 'escalated', severity: rule.severity, category: rule.category, reply: rule.reply, model_called: false, message_id: id });
  }

  // Caps. Decided here, before anything is assembled, but note that the reads
  // below still run when one has bitten: the degraded reply's entire value is
  // the live state block, so skipping them to save five queries would turn a
  // useful answer into an apology. What a cap stops is the MODEL call, which is
  // the part that costs money. Degrading is the behaviour, never an error, per
  // spec section 6.
  const day = store.tokensToday();
  const capped =
    session.message_count >= CAPS.messagesPerSession() ? 'session_messages'
      : (session.input_tokens + session.output_tokens) >= CAPS.tokensPerSession() ? 'session_tokens'
        : day.total >= CAPS.tokensPerDay() ? 'daily_tokens'
          : null;

  const lesson = resolveLesson(text);
  const classes = reads.listClasses(who.userRef);
  const code = resolveClassCode(text, classCode, classes);
  const { state, calls } = runReads(who, { classCode: code, lesson });
  const articles = kbBlock(text);

  const userMsgId = store.addMessage(session, { who: 'user', content: text });
  store.addToolCalls(session, userMsgId, calls);

  if (capped || !enabled() || !provider.configured()) {
    const why = capped || (!enabled() ? 'disabled' : 'unconfigured');
    const d = degradedReply(state, articles, why);
    store.addMessage(session, { who: 'assistant', content: d.text, flaggedReason: 'degraded_' + why, kbSlug: articles[0] ? articles[0].slug : null });
    return out({ status: 'degraded', reason: why, reply: d.text, model_called: false, state, spend: spendReport(day) });
  }

  const ctx = assembleContext({ message: text, state, articles, pageUrl, pageTitle });
  const res = await provider.complete({ system: ctx.system, messages: ctx.messages });

  if (!res.ok || !res.text) {
    const d = degradedReply(state, articles, res.reason || 'empty');
    store.addMessage(session, { who: 'assistant', content: d.text, flaggedReason: 'degraded_' + (res.reason || 'empty') });
    return out({ status: 'degraded', reason: res.reason || 'empty', reply: d.text, model_called: true, context: ctx, state, spend: spendReport(day) });
  }

  // Layer 6. The tripwire, on the assembled response, before a byte reaches a
  // client. Tokens are still accounted: the call happened and it cost money.
  const filtered = outputFilter.check(res.text, { course: (state.settings && state.settings.course) || who.course || null });
  if (filtered.blocked) {
    store.addMessage(session, {
      who: 'assistant',
      content: filtered.refusal,
      flaggedReason: 'key_leak_blocked',
      classification: 'key_leak_blocked',
      model: res.model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    });
    escalate({
      session, who, text, pageUrl, pageScope, state,
      // Its own category, server-raised only, and 'immediate' by rule in
      // report.severityFor. This is the tripwire, so if it fires something in
      // front of it is broken and the useful information is which kind, never
      // the text: that is dropped on the floor and recorded nowhere.
      rule: { category: 'key_leak_blocked', severity: 'immediate' },
      note: `Output filter blocked a reply. kind=${filtered.kind}. The reply text was discarded and is not recorded anywhere.`,
    });
    return out({ status: 'blocked', kind: filtered.kind, reply: filtered.refusal, model_called: true, context: ctx, spend: spendReport(store.tokensToday()) });
  }

  store.addMessage(session, {
    who: 'assistant',
    content: res.text,
    kbSlug: articles[0] ? articles[0].slug : null,
    model: res.model,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  });

  return out({
    status: 'ok',
    reply: res.text,
    model_called: true,
    model: res.model,
    usage: res.usage,
    kb: articles.map((a) => a.slug),
    context: ctx,
    state,
    spend: spendReport(store.tokensToday()),
  });
}

function spendReport(day) {
  return {
    tokens_today: day.total,
    daily_token_cap: CAPS.tokensPerDay(),
    usd_today: estimateUsd(day),
  };
}

// Escalation reuses the Phase 0 path exactly, so a chat-raised issue lands in
// the same queue, files the same kind of board task and sends the same mail as
// a report-button one. A second escalation path would be a second thing that can
// silently stop delivering.
function escalate({ session, who, rule, text, pageUrl, pageScope, state, note }) {
  try {
    const stored = report.store({
      category: rule.category,
      role: who.role,
      userRef: who.userRef,
      pageUrl,
      pageScope: pageScope || 'unknown',
      course: (state && state.settings && state.settings.course) || who.course || null,
      contactEmail: who.contactEmail,
      contactName: who.contactName,
      school: who.school,
      summary: note || text,
      detail: {
        origin: 'chat',
        session_id: session.id,
        class_code: (state && state.class_code) || null,
        // The typed state the assistant read, which is what a fix needs. No
        // transcript beyond the one message that triggered the rule, and that
        // only because this path is teacher-only.
        state: state || null,
      },
      ipHash: null,
      sessionId: session.id,
    });
    const filed = report.fileTodo({
      escalationId: stored.id,
      category: rule.category,
      severity: stored.severity,
      role: who.role,
      pageUrl,
      pageScope: pageScope || 'unknown',
      summary: note || text,
      detail: { origin: 'chat', session_id: session.id },
      bodiesRetained: stored.bodiesRetained,
    });
    report.mailOwner({
      escalationId: stored.id,
      category: rule.category,
      severity: stored.severity,
      role: who.role,
      contactEmail: who.contactEmail,
      contactName: who.contactName,
      school: who.school,
      pageUrl,
      pageScope: pageScope || 'unknown',
      course: (state && state.settings && state.settings.course) || null,
      summary: note || text,
      detail: { origin: 'chat', session_id: session.id },
      todoId: filed.todoId,
      bodiesRetained: stored.bodiesRetained,
    });
    return stored;
  } catch (e) {
    console.error('assistant/chat escalate:', e && e.message);
    return null;
  }
}

module.exports = {
  respond, assembleContext, projectState, kbBlock, runReads,
  resolveClassCode, resolveLesson, deterministicRule, degradedReply,
  enabled, CAPS, SYSTEM, estimateUsd, spendReport,
};
