'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: CHAT PERSISTENCE  (spec sections 8 and 12)
//
//  Sessions, messages and tool calls. Separated from lib/assistant/reads.js on
//  purpose: reads.js is the only module that puts ACCOUNT STATE INTO a model's
//  context, and that is the invariant the anti-exfiltration design rests on.
//  This module only ever writes, and reads back its own rows for caps and for
//  the operator log. Nothing it returns reaches a prompt.
//
//  (The spec's own wording, section 5 layer 2, is "nothing else in the assistant
//  tree imports db". That was already not true when Phase 0 shipped, because
//  lib/assistant/report.js has to insert an escalation row. The property that
//  actually protects the answer keys is about what goes IN to the context, not
//  about who holds a handle, so it is stated that way here and in reads.js
//  rather than left as a rule the code visibly breaks.)
//
//  PRIVACY. chat_sessions.bodies_retained is decided once, server-side, from the
//  caller's role and the page scope, by lib/assistant/scope.js retainsBodies.
//  When it is 0 the message text is never written: content stays NULL and only a
//  hash, a classification and token counts are stored. Phase 2 is teachers only,
//  so every row today retains, but the shape-only path is implemented and tested
//  now rather than bolted on when students arrive, because that is the moment
//  the second PII exception would get granted by accident.
//
//  downgrade() is the other half: a session that starts anonymous and turns out
//  to be a student has its stored bodies DELETED, not just stopped. Spec section
//  8 requires it and it is cheap to do now.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const db = require('../../db');
const { retainsBodies } = require('./scope');

const MAX_CONTENT = 4000; // a stored message body, clipped at the edge

function hash(s) {
  return crypto.createHash('sha256').update(String(s || '')).digest('hex').slice(0, 32);
}

const stInsertSession = db.prepare(`
  INSERT INTO chat_sessions (id, role, user_ref, page_scope, course, bodies_retained, ip_hash)
  VALUES (@id, @role, @user_ref, @page_scope, @course, @bodies_retained, @ip_hash)
`);
const stGetSession = db.prepare(`
  SELECT id, role, user_ref, page_scope, course, bodies_retained,
         message_count, input_tokens, output_tokens, started_at, last_at
  FROM chat_sessions WHERE id = ?
`);
const stTouchSession = db.prepare(`
  UPDATE chat_sessions
  SET message_count = message_count + @messages,
      input_tokens  = input_tokens  + @input_tokens,
      output_tokens = output_tokens + @output_tokens,
      last_at       = datetime('now')
  WHERE id = @id
`);
const stDowngrade = db.prepare(`
  UPDATE chat_sessions SET role = @role, user_ref = @user_ref, bodies_retained = 0 WHERE id = @id
`);
const stDropBodies = db.prepare('UPDATE chat_messages SET content = NULL WHERE session_id = ?');
const stNextSeq = db.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM chat_messages WHERE session_id = ?');

const stInsertMessage = db.prepare(`
  INSERT INTO chat_messages
    (session_id, seq, who, content, content_hash, classification, flagged_reason,
     kb_slug, model, input_tokens, output_tokens)
  VALUES
    (@session_id, @seq, @who, @content, @content_hash, @classification, @flagged_reason,
     @kb_slug, @model, @input_tokens, @output_tokens)
`);
const stInsertToolCall = db.prepare(`
  INSERT INTO chat_tool_calls (session_id, message_id, tool, params_json, result_json)
  VALUES (@session_id, @message_id, @tool, @params_json, @result_json)
`);

// Today's token spend across every session. One indexed range scan, which is why
// the daily ceiling can be enforced on every call without a counter to keep in
// sync. See lib/assistant/chat.js CAPS.
const stTokensToday = db.prepare(`
  SELECT COALESCE(SUM(input_tokens), 0) AS input, COALESCE(SUM(output_tokens), 0) AS output
  FROM chat_messages WHERE created_at >= datetime('now','start of day')
`);

function newSession({ role, userRef, pageScope, course, ipHash }) {
  const id = 'cs_' + crypto.randomBytes(12).toString('hex');
  stInsertSession.run({
    id,
    role,
    user_ref: userRef || null,
    page_scope: pageScope || null,
    course: course || null,
    bodies_retained: retainsBodies(role, pageScope) ? 1 : 0,
    ip_hash: ipHash || null,
  });
  return getSession(id);
}

function getSession(id) {
  if (!id) return null;
  try { return stGetSession.get(String(id)) || null; } catch (_) { return null; }
}

// Resolve the session for a request. A client-supplied id is only honoured when
// it exists AND belongs to the same caller: a session id is a bearer of nothing,
// but letting one person append to another person's log would corrupt the
// operator record for no benefit.
function resolveSession({ sessionId, role, userRef, pageScope, course, ipHash }) {
  const existing = getSession(sessionId);
  if (existing && existing.role === role && (existing.user_ref || null) === (userRef || null)) {
    return existing;
  }
  return newSession({ role, userRef, pageScope, course, ipHash });
}

// An anonymous session that turns out to be a student. Stop retaining, and
// delete what was already written, per spec section 8.
function downgrade(sessionId, { role, userRef }) {
  const s = getSession(sessionId);
  if (!s) return null;
  stDowngrade.run({ id: s.id, role, user_ref: userRef || null });
  stDropBodies.run(s.id);
  return getSession(s.id);
}

function addMessage(session, {
  who, content, classification, flaggedReason, kbSlug, model, inputTokens, outputTokens,
}) {
  const seq = stNextSeq.get(session.id).n;
  const text = typeof content === 'string' ? content.slice(0, MAX_CONTENT) : null;
  const info = stInsertMessage.run({
    session_id: session.id,
    seq,
    who,
    // The privacy switch, in the one place it can be applied. Everything else
    // about the row is written either way, which is what makes the taxonomy work
    // without the transcript.
    content: session.bodies_retained ? text : null,
    content_hash: text ? hash(text) : null,
    classification: classification || null,
    flagged_reason: flaggedReason || null,
    kb_slug: kbSlug || null,
    model: model || null,
    input_tokens: inputTokens || 0,
    output_tokens: outputTokens || 0,
  });
  stTouchSession.run({
    id: session.id,
    messages: 1,
    input_tokens: inputTokens || 0,
    output_tokens: outputTokens || 0,
  });
  return info.lastInsertRowid;
}

// Tool results are typed DTOs out of reads.js and are safe to keep. They are the
// audit trail for what the assistant told somebody about their own account.
function addToolCalls(session, messageId, calls) {
  for (const c of calls || []) {
    stInsertToolCall.run({
      session_id: session.id,
      message_id: messageId || null,
      tool: c.tool,
      params_json: JSON.stringify(c.params || {}).slice(0, 2000),
      result_json: JSON.stringify(c.result === undefined ? null : c.result).slice(0, 20000),
    });
  }
}

// ── deleteForStudent  (spec section 8) ───────────────────────────────────────
//  "DELETE FROM chat_sessions WHERE user_ref = ?, wired into the same path that
//  deletes a student."
//
//  THERE IS NO SUCH PATH IN THIS REPO, and that is deliberate rather than
//  missing: CLAUDE.md says students are DEACTIVATED, never hard-deleted, because
//  attempt history is gradebook data and always survives. So this function
//  exists and is tested, and has no caller.
//
//  Building it anyway is the point. The day somebody does need to erase a
//  student, at a parent's request or a district's, the erase must not be the
//  moment anyone discovers that a year of chat rows referencing that student was
//  never considered. Student sessions store no message bodies, so what this
//  removes is the shape rows and the tool-call audit trail, which is everything
//  keyed to them.
//
//  Returns counts, so a caller can report what it removed rather than assert it.
const stDeleteMessagesForUser = db.prepare(`
  DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_ref = ?)
`);
const stDeleteToolCallsForUser = db.prepare(`
  DELETE FROM chat_tool_calls WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_ref = ?)
`);
const stDeleteSessionsForUser = db.prepare('DELETE FROM chat_sessions WHERE user_ref = ?');

function deleteForStudent(studentId) {
  if (!studentId) return { sessions: 0, messages: 0, tool_calls: 0 };
  const tx = db.transaction((id) => {
    const tc = stDeleteToolCallsForUser.run(id).changes;
    const m = stDeleteMessagesForUser.run(id).changes;
    const se = stDeleteSessionsForUser.run(id).changes;
    return { sessions: se, messages: m, tool_calls: tc };
  });
  try { return tx(studentId); } catch (e) {
    console.error('assistant/store deleteForStudent:', e && e.message);
    return { sessions: 0, messages: 0, tool_calls: 0, error: true };
  }
}

function tokensToday() {
  try {
    const r = stTokensToday.get();
    return { input: r.input || 0, output: r.output || 0, total: (r.input || 0) + (r.output || 0) };
  } catch (_) {
    return { input: 0, output: 0, total: 0 };
  }
}

module.exports = {
  newSession, getSession, resolveSession, downgrade,
  addMessage, addToolCalls, tokensToday, hash, MAX_CONTENT,
  deleteForStudent,
};
