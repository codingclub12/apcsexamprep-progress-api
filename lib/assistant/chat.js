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
const turnstile = require('./turnstile');

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
async function respond(args) {
  // Two callers, two shapes, one door. The teacher path below is unchanged from
  // Phase 2 on purpose: it is the path with the account reads and the
  // escalation rules behind it, and the anonymous surface has no business
  // sharing a code path with it. What they DO share is the session, the
  // pre-filter and the output tripwire, which are the parts that must be
  // identical for both or the weaker surface becomes the way in.
  if (args && args.who && args.who.role === 'anonymous') return respondAnonymous(args);
  if (args && args.who && args.who.role === 'student') return respondStudent(args);
  return respondTeacher(args);
}

async function respondTeacher({
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


// ─────────────────────────────────────────────────────────────────────────────
//  THE ANONYMOUS PATH  (spec Phase 3, sections 3.5, 6 and 7)
//
//  Commerce and marketing pages. Adults, no account, no state reads, and the one
//  place in this design where conversational phrasing genuinely beats a page of
//  links: "do you have a W-9" and "can I buy this with a PO" are questions a FAQ
//  answers badly and a sentence answers well.
//
//  FOUR THINGS SEPARATE IT FROM THE TEACHER PATH, and they are all subtractions.
//
//  1. It reads NO ACCOUNT STATE. Not a class, not a roster, not an entitlement.
//     The only typed read it can make is getPageStatus, which answers "is this
//     page a thing and what is it" from this server's own records. There is no
//     caller id to scope a read to, so there is nothing to scope, so the whole
//     category of "leaked somebody else's data" cannot arise here.
//  2. It is SCOPE GATED. Spec section 3.5 puts chat on commerce and marketing
//     pages, the report affordance on lesson and lab pages, and nothing at all
//     on assessment pages. An anonymous caller on coursework is refused before
//     anything else happens, because the likeliest such caller is a signed-out
//     student standing next to a quiz.
//  3. It must pass TURNSTILE to spend. See lib/assistant/turnstile.js for why
//     every failure mode there lands on the knowledge base rather than on a 403.
//  4. The FREE PATH runs first. A high confidence article match answers with
//     Tanner's own words and no model call, which is spec section 6's "most
//     pre-sale traffic should cost nothing" made mechanical.
//
//  What it SHARES with the teacher path is the part that has to be identical:
//  the same session store, the same pre-filter, the same output tripwire. A
//  weaker surface with its own copy of the safety layers is how the weaker
//  surface becomes the way in.
// ─────────────────────────────────────────────────────────────────────────────

// Chat is for commerce and general pages. Coursework gets the report button.
const ANON_SCOPES = new Set(['commerce', 'general']);
function anonAllowedScope(scope) {
  return ANON_SCOPES.has(String(scope || 'general'));
}

const COURSEWORK_REFUSAL =
  'I only help with buying, pricing and how the site works, and I do that on the ' +
  'store and information pages rather than on lesson pages. I do not answer ' +
  'anything about lesson, lab or exam content. If something on this page is ' +
  'broken, the report button sends Tanner the page and the console errors, which ' +
  'is the fastest way to get it fixed. If you are a teacher, sign in and the ' +
  'assistant can read your own classes.';

// The free path's reply. Tanner's article, verbatim, with a link to the full
// page. Nothing is generated, so nothing can be invented, which is the entire
// reason this path is worth having beyond its cost.
function freeAnswer(article) {
  const body = String(article.body_md || '').trim();
  return `${body}\n\nFull article: /help#${article.slug}`;
}

const ANON_SYSTEM = `You are the front desk for apcsexamprep.com, a site that sells AP Computer Science A, AP Computer Science Principles and AP Cybersecurity course material to high school teachers and to students studying on their own. You are talking to a visitor who is not signed in. Assume they are an adult deciding whether to buy, or a teacher's purchasing office.

Answer from the HELP ARTICLES below and from the PAGE facts. That is the whole job.

Rules you do not break:
- Never teach, tutor, hint, or answer anything about quiz, exercise, lab or exam content. If asked, say you do not do that and point at the lesson page.
- Never invent how the site works, what it costs, what is included, or what a licence covers. If the HELP ARTICLES do not say it, say you are not sure and offer to take a message. A made up price or a made up policy is worse than no answer, because somebody will hold us to it.
- Never claim a page exists, is published, or is coming unless the PAGE facts say so. "published: null" means nobody here can see whether it is live, so say you cannot tell rather than guessing.
- You cannot see any account. If they ask about their own order, class, students or scores, say that needs them signed in, and that the teacher dashboard reads their real account.
- Never print an access code or anything that looks like a sequence of answer letters.

How to answer:
- Short. Two or three sentences.
- Plain sentences. No headings, no bullets unless listing more than three things, no bold.
- Lead with the answer, then the reason.
- If you cannot answer it, say so and say the report button takes a message.
- Do not use em-dashes.`;

// Same shape as the teacher assembler and for the same reason: the suite scans
// contextText, so whatever would have been sent is what gets asserted on.
function assembleAnonContext({ message, page, articles, pageUrl, pageTitle }) {
  const parts = [ANON_SYSTEM];
  const L = ['\n\nPAGE (what this server knows about the page they are on)'];
  L.push(`  url: ${pageUrl || 'unknown'}`);
  L.push(`  scope: ${page.scope}`);
  L.push(`  handle: ${page.handle || 'none'}`);
  L.push(`  known to this server: ${page.known ? 'yes' : 'no'}`);
  L.push('  published: not observable from this server, do not guess');
  if (page.course) L.push(`  course: ${page.course}`);
  if (page.lesson) L.push(`  lesson: ${page.lesson} ${page.activity_type || ''}`.trimEnd());
  if (typeof page.graded_items === 'number') L.push(`  graded items on it: ${page.graded_items}`);
  parts.push(L.join('\n'));

  if (articles.length) {
    parts.push('\n\nHELP ARTICLES (written by the site owner; the only description of the product you may rely on)');
    for (const a of articles) parts.push(`\n--- ${a.title} (${a.slug}) ---\n${a.body}`);
  } else {
    parts.push('\n\nHELP ARTICLES: none matched. You do not know the answer; say so.');
  }
  parts.push(`\n\nPAGE TITLE: ${pageTitle ? String(pageTitle).slice(0, 200) : 'unknown'}`);

  const system = parts.join('');
  const messages = [{ role: 'user', content: String(message || '').slice(0, CAPS.messageChars) }];
  return { system, messages, contextText: system + '\n' + messages.map((m) => m.content).join('\n') };
}

// The reply when there is no model: the matching articles as links. Useful on
// its own, which is what makes it a safe default rather than an apology.
function anonDegraded(articles, why) {
  if (!articles.length) {
    return {
      why,
      text:
        'I could not find an article that answers that. The report button takes a ' +
        'message and sends it to Tanner with the page you are on, and /help has ' +
        'everything that is written up so far.',
    };
  }
  const lines = ['Here is what we have written up that looks relevant:'];
  for (const a of articles) lines.push(`  ${a.title}  /help#${a.slug}`);
  lines.push('');
  lines.push('If none of those answer it, the report button takes a message.');
  return { why, text: lines.join('\n') };
}

async function respondAnonymous({
  message, who, sessionId, pageUrl, pageTitle, pageScope, ipHash,
  turnstileToken, remoteIp,
  provider = defaultProvider,
  // Injected the same way the provider is, and for the same reason: a suite
  // that reaches in and reassigns turnstile.verify is a suite that can end up
  // asserting against its own stub while believing it tested the module. Both
  // seams are parameters, so the real modules are never mutated.
  verifyTurnstile = turnstile.verify,
}) {
  const text = String(message || '').trim().slice(0, CAPS.messageChars);
  if (!text) return { status: 'empty', reply: 'Ask me about pricing, licensing, or how the site works.' };

  const scope = pageScope || 'general';
  const session = store.resolveSession({
    sessionId, role: 'anonymous', userRef: null, pageScope: scope,
    course: who.course || null, ipHash,
  });
  const out = (extra) => Object.assign({ session_id: session.id }, extra);

  // Scope gate, before the pre-filter and before anything is stored. An
  // anonymous caller on a lesson or an exam page is the one population this
  // whole design is most careful about, and the cheapest correct answer is not
  // to be there at all. Note the session's bodies_retained is already 0 on these
  // scopes via scope.retainsBodies, so even this refusal stores no typed text.
  if (!anonAllowedScope(scope)) {
    store.addMessage(session, { who: 'user', content: text, classification: 'out_of_scope', flaggedReason: 'anon_coursework_scope' });
    store.addMessage(session, { who: 'assistant', content: COURSEWORK_REFUSAL, flaggedReason: 'anon_coursework_scope' });
    return out({ status: 'out_of_scope', scope, reply: COURSEWORK_REFUSAL, model_called: false });
  }

  // Layer 5, identical to the teacher path. Zero tokens.
  const pre = prefilter.check(text);
  if (pre.blocked) {
    store.addMessage(session, { who: 'user', content: text, classification: 'content_request', flaggedReason: pre.rule });
    store.addMessage(session, { who: 'assistant', content: pre.refusal, flaggedReason: pre.rule });
    return out({ status: 'refused', reason: pre.rule, reply: pre.refusal, model_called: false });
  }

  const page = reads.getPageStatus(pageUrl);
  const userMsgId = store.addMessage(session, { who: 'user', content: text });
  store.addToolCalls(session, userMsgId, [{ tool: 'getPageStatus', params: { pageUrl }, result: page }]);

  // THE FREE PATH, first, before Turnstile and before any cap. Spec section 6.
  // It costs one FTS query and it is the best answer available: a human wrote
  // it. Running it ahead of the challenge also means the commonest pre-sale
  // questions are answered even to a visitor who never solves one.
  const match = kb.bestMatch(text, { audience: 'anonymous' });
  if (match) {
    const reply = freeAnswer(match.article);
    store.addMessage(session, {
      who: 'assistant', content: reply, kbSlug: match.article.slug, classification: match.article.category || null,
    });
    return out({
      status: 'kb', reply, model_called: false,
      kb: [match.article.slug], coverage: Number(match.coverage.toFixed(2)),
    });
  }

  const articles = kbBlock(text);

  // Caps, then the challenge. Both decide only whether the MODEL runs.
  const day = store.tokensToday();
  const capped =
    session.message_count >= CAPS.messagesPerSession() ? 'session_messages'
      : (session.input_tokens + session.output_tokens) >= CAPS.tokensPerSession() ? 'session_tokens'
        : day.total >= CAPS.tokensPerDay() ? 'daily_tokens'
          : null;

  let gate = null;
  if (!capped && enabled() && provider.configured()) {
    const v = await verifyTurnstile(turnstileToken, remoteIp);
    if (!v.ok) gate = 'turnstile_' + v.reason;
  }

  if (capped || gate || !enabled() || !provider.configured()) {
    const why = capped || gate || (!enabled() ? 'disabled' : 'unconfigured');
    const d = anonDegraded(articles, why);
    store.addMessage(session, {
      who: 'assistant', content: d.text, flaggedReason: 'degraded_' + why,
      kbSlug: articles[0] ? articles[0].slug : null,
    });
    return out({ status: 'degraded', reason: why, reply: d.text, model_called: false, spend: spendReport(day) });
  }

  const ctx = assembleAnonContext({ message: text, page, articles, pageUrl, pageTitle });
  const res = await provider.complete({ system: ctx.system, messages: ctx.messages });

  if (!res.ok || !res.text) {
    const d = anonDegraded(articles, res.reason || 'empty');
    store.addMessage(session, { who: 'assistant', content: d.text, flaggedReason: 'degraded_' + (res.reason || 'empty') });
    return out({ status: 'degraded', reason: res.reason || 'empty', reply: d.text, model_called: true, context: ctx, spend: spendReport(day) });
  }

  // Layer 6, the same tripwire the teacher path uses, with no course to narrow
  // it: an anonymous page names no course, so the scan runs across all of them,
  // which is the correct default and the reason scanForSecrets takes a nullable
  // course rather than requiring one.
  const filtered = outputFilter.check(res.text, { course: page.course || null });
  if (filtered.blocked) {
    store.addMessage(session, {
      who: 'assistant', content: filtered.refusal,
      flaggedReason: 'key_leak_blocked', classification: 'key_leak_blocked',
      model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens,
    });
    escalate({
      session, who, text, pageUrl, pageScope: scope, state: null,
      rule: { category: 'key_leak_blocked', severity: 'immediate' },
      note: `Output filter blocked an ANONYMOUS reply. kind=${filtered.kind}. The reply text was discarded and is not recorded anywhere.`,
    });
    return out({ status: 'blocked', kind: filtered.kind, reply: filtered.refusal, model_called: true, context: ctx, spend: spendReport(store.tokensToday()) });
  }

  store.addMessage(session, {
    who: 'assistant', content: res.text,
    kbSlug: articles[0] ? articles[0].slug : null,
    model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens,
  });
  return out({
    status: 'ok', reply: res.text, model_called: true, model: res.model, usage: res.usage,
    kb: articles.map((a) => a.slug), context: ctx, spend: spendReport(store.tokensToday()),
  });
}


// ─────────────────────────────────────────────────────────────────────────────
//  THE STUDENT PATH  (spec Phase 4, sections 3.5, 5, 7 and 8)
//
//  Students are MINORS, and this repo stores no free text from them anywhere
//  except one approved table. So this is the path where the privacy machinery
//  built in Phase 2 and exercised in Phase 3 has to actually hold.
//
//  WHERE IT LIVES, because the spec does not say in so many words. Section 3.5
//  gives lesson and lab pages the report affordance ONLY and assessment pages
//  nothing at all, which rules out every coursework page. The three tools
//  section 5 gives a student (their gates, their progress, whether a score
//  recorded) are dashboard questions. So student chat lives on the student's own
//  dashboard, /pages/my-progress, and nowhere else. That is scope
//  'student_portal' in lib/assistant/scope.js and it is refused everywhere else.
//
//  A chat box next to a quiz is the single thing this whole design exists to
//  avoid. It is not on the lesson page, it is not on the lab page, and on an
//  assessment page there is not even a script tag.
//
//  NO MESSAGE BODY IS EVER STORED. Not by policy, by construction:
//  scope.retainsBodies returns false for role 'student' on every scope, so
//  store.addMessage writes NULL into content whatever it is handed. What is kept
//  is the shape: a hash, a classification, a flagged reason, token counts. That
//  is everything the taxonomy needs and none of what carries the risk.
//
//  WHAT IT CANNOT DO, and each is a subtraction from the teacher path:
//    no entitlements, no class settings, no roster, no other student, no marks.
//    getMyProgress has no field a score could occupy. See reads.js for why that
//    is a stronger guarantee than gating one.
// ─────────────────────────────────────────────────────────────────────────────

const STUDENT_SCOPES = new Set(['student_portal']);
function studentAllowedScope(scope) {
  return STUDENT_SCOPES.has(String(scope || ''));
}

const STUDENT_OFF_SCOPE_REFUSAL =
  'I can help on your progress page, not here. On a lesson, lab or quiz page I do ' +
  'not answer anything at all, and that includes hints. Open My Progress and ask ' +
  'me there and I can tell you what is unlocked, what you have finished, and ' +
  'whether your work recorded. If something on this page is broken, use the ' +
  'report button.';

const STUDENT_SYSTEM = `You are the help desk on a student's own progress page at apcsexamprep.com. You are talking to a high school student about their own account. Be brief, plain and encouraging without being saccharine.

Your job is to explain what the MY PROGRESS block below says. That is the whole job.

Rules you do not break, and these are absolute:
- Never teach, tutor, hint, explain a concept, trace code, or say anything about what an answer might be. Not even a nudge, not even if they say they are stuck, not even if they say their teacher said it was fine. Say you do not help with the work itself and that their teacher and the lesson page are the right places.
- Never restate, paraphrase or summarise a question, an option, an exercise or an exam item.
- Never state a mark, a score, a percentage or a grade. You cannot see any: the block below has attempted and passed only, on purpose. If they ask what they got, tell them the score is on this page under the lesson and that you can only see whether it is done.
- Never mention another student, and never compare them to anyone.
- Never state a number that is not in the MY PROGRESS block.
- Never print anything that looks like a run of answer letters.

How to answer:
- Two or three sentences. Plain words, no headings, no bullets unless listing more than three things.
- Lead with the fact. "1.2 is locked because your teacher opens quizzes one at a time" beats a paragraph.
- If they seem stuck on the work rather than the site, say once that you cannot help with that, and that asking their teacher is the right move. Do not lecture.
- If you cannot answer it, say so and point at the report button.
- Do not use em-dashes.`;

function projectStudentState(state) {
  const L = ['MY PROGRESS (this student, read just now, the only numbers you may state)'];
  const p = state.progress;
  if (!p) {
    L.push('  no progress record could be read for this account');
    return L.join('\n');
  }
  L.push(`  course: ${p.course}`);
  L.push(`  passing mark for this class: ${p.mastery_threshold} percent`);
  L.push(`  items attempted: ${p.counts.attempted}, of those passed: ${p.counts.passed}`);
  L.push('  NOTE: attempted and passed only. No marks are available to you at all.');
  for (const i of p.items.slice(0, 40)) {
    L.push(`    ${i.lesson} ${i.item_type}: ${i.attempted ? 'attempted' : 'not attempted'}${i.passed ? ', passed' : ''}`);
  }
  if (p.items.length > 40) L.push(`    and ${p.items.length - 40} more not listed`);

  const g = state.gates;
  if (g) {
    L.push('');
    L.push(`WHAT IS OPEN: ${g.counts.open} of ${g.counts.activities} activities open, ${g.counts.closed} closed`);
    for (const a of g.closed.slice(0, 20)) L.push(`    CLOSED ${a.lesson} ${a.activity_type} (${a.reason})`);
    if (g.closed.length > 20) L.push(`    and ${g.closed.length - 20} more closed`);
    if (!g.closed.length) L.push('    nothing is locked right now');
  }
  const sv = state.scores;
  if (sv) {
    L.push('');
    L.push(`RECORDING: ${sv.recorded} pieces of work recorded, last at ${sv.last_recorded_at || 'never'}`);
    L.push(`  counting toward the gradebook: ${sv.counted ? 'yes' : 'no'}`);
    for (const r of sv.why_not_counted) L.push(`  note: ${r}`);
  }
  return L.join('\n');
}

function assembleStudentContext({ message, state, pageUrl, pageTitle }) {
  const parts = [STUDENT_SYSTEM];
  parts.push('\n\n' + projectStudentState(state));
  // Layer 3, unchanged: the page is named, never quoted.
  parts.push(`\n\nPAGE: ${pageUrl || 'unknown'}${pageTitle ? ' (' + String(pageTitle).slice(0, 200) + ')' : ''}`);
  const system = parts.join('');
  const messages = [{ role: 'user', content: String(message || '').slice(0, CAPS.messageChars) }];
  return { system, messages, contextText: system + '\n' + messages.map((m) => m.content).join('\n') };
}

function studentDegraded(state, why) {
  return {
    why,
    text: [
      'Here is what your account says right now.',
      '',
      projectStudentState(state),
      '',
      'Your marks are on this page under each lesson. If something looks wrong, the report button tells Tanner.',
    ].join('\n'),
  };
}

function runStudentReads(studentId, lesson) {
  const calls = [];
  const state = {};
  state.progress = reads.getMyProgress(studentId, { lesson: lesson || undefined });
  calls.push({ tool: 'getMyProgress', params: { lesson }, result: state.progress });
  state.gates = reads.getMyGates(studentId, { lesson: lesson || undefined });
  calls.push({ tool: 'getMyGates', params: { lesson }, result: state.gates });
  state.scores = reads.getMyScoreVisibility(studentId);
  calls.push({ tool: 'getMyScoreVisibility', params: {}, result: state.scores });
  return { state, calls };
}

async function respondStudent({
  message, who, sessionId, pageUrl, pageTitle, pageScope, ipHash,
  provider = defaultProvider,
}) {
  const text = String(message || '').trim().slice(0, CAPS.messageChars);
  if (!text) return { status: 'empty', reply: 'Ask me what is unlocked, or whether your work recorded.' };

  const scope = pageScope || 'general';
  const session = store.resolveSession({
    sessionId, role: 'student', userRef: who.userRef, pageScope: scope,
    course: who.course || null, ipHash,
  });
  const out = (extra) => Object.assign({ session_id: session.id }, extra);

  // Scope gate FIRST, before the pre-filter, because on a coursework page the
  // right answer is not "I refuse that question", it is "not here at all". The
  // pre-filter would catch the coursework questions; this catches the rest.
  if (!studentAllowedScope(scope)) {
    store.addMessage(session, { who: 'user', content: text, classification: 'out_of_scope', flaggedReason: 'student_off_portal' });
    store.addMessage(session, { who: 'assistant', content: STUDENT_OFF_SCOPE_REFUSAL, flaggedReason: 'student_off_portal' });
    return out({ status: 'out_of_scope', scope, reply: STUDENT_OFF_SCOPE_REFUSAL, model_called: false });
  }

  // Layer 5, identical to every other path. Zero tokens.
  const pre = prefilter.check(text);
  if (pre.blocked) {
    store.addMessage(session, { who: 'user', content: text, classification: 'content_request', flaggedReason: pre.rule });
    store.addMessage(session, { who: 'assistant', content: pre.refusal, flaggedReason: pre.rule });
    return out({ status: 'refused', reason: pre.rule, reply: pre.refusal, model_called: false });
  }

  const lesson = resolveLesson(text);
  const { state, calls } = runStudentReads(who.userRef, lesson);
  if (!state.progress) {
    // The token verified but the row is gone. Answer, do not 500.
    const msg = 'I could not read your account just now. Try reloading, and if it keeps happening the report button tells Tanner.';
    store.addMessage(session, { who: 'user', content: text });
    store.addMessage(session, { who: 'assistant', content: msg, flaggedReason: 'no_student_row' });
    return out({ status: 'degraded', reason: 'no_student_row', reply: msg, model_called: false });
  }

  const userMsgId = store.addMessage(session, { who: 'user', content: text });
  store.addToolCalls(session, userMsgId, calls);

  const day = store.tokensToday();
  const capped =
    session.message_count >= CAPS.messagesPerSession() ? 'session_messages'
      : (session.input_tokens + session.output_tokens) >= CAPS.tokensPerSession() ? 'session_tokens'
        : day.total >= CAPS.tokensPerDay() ? 'daily_tokens'
          : null;

  if (capped || !enabled() || !provider.configured()) {
    const why = capped || (!enabled() ? 'disabled' : 'unconfigured');
    const d = studentDegraded(state, why);
    store.addMessage(session, { who: 'assistant', content: d.text, flaggedReason: 'degraded_' + why });
    return out({ status: 'degraded', reason: why, reply: d.text, model_called: false, spend: spendReport(day) });
  }

  const ctx = assembleStudentContext({ message: text, state, pageUrl, pageTitle });
  const res = await provider.complete({ system: ctx.system, messages: ctx.messages });

  if (!res.ok || !res.text) {
    const d = studentDegraded(state, res.reason || 'empty');
    store.addMessage(session, { who: 'assistant', content: d.text, flaggedReason: 'degraded_' + (res.reason || 'empty') });
    return out({ status: 'degraded', reason: res.reason || 'empty', reply: d.text, model_called: true, context: ctx, spend: spendReport(day) });
  }

  // Layer 6, the same tripwire, narrowed to this student's own course.
  const filtered = outputFilter.check(res.text, { course: state.progress.course || who.course || null });
  if (filtered.blocked) {
    store.addMessage(session, {
      who: 'assistant', content: filtered.refusal,
      flaggedReason: 'key_leak_blocked', classification: 'key_leak_blocked',
      model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens,
    });
    escalate({
      session, who, text: null, pageUrl, pageScope: scope, state: null,
      rule: { category: 'key_leak_blocked', severity: 'immediate' },
      // No message text, and none available to pass: this is a student session,
      // so the words were never stored in the first place. The escalation
      // carries the kind and the session id, which is what a fix needs.
      note: `Output filter blocked a STUDENT reply. kind=${filtered.kind}. Neither the reply nor the question is recorded: student sessions are shape-only.`,
    });
    return out({ status: 'blocked', kind: filtered.kind, reply: filtered.refusal, model_called: true, context: ctx, spend: spendReport(store.tokensToday()) });
  }

  store.addMessage(session, {
    who: 'assistant', content: res.text,
    model: res.model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens,
  });
  return out({
    status: 'ok', reply: res.text, model_called: true, model: res.model, usage: res.usage,
    context: ctx, state, spend: spendReport(store.tokensToday()),
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
  respond, respondTeacher, respondAnonymous, respondStudent,
  studentAllowedScope, STUDENT_SYSTEM, assembleStudentContext, projectStudentState,
  anonAllowedScope, ANON_SYSTEM, assembleAnonContext, freeAnswer,
  assembleContext, projectState, kbBlock, runReads,
  resolveClassCode, resolveLesson, deterministicRule, degradedReply,
  enabled, CAPS, SYSTEM, estimateUsd, spendReport,
};
