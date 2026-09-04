'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE MODEL ADAPTER  (spec sections 6 and 11)
//
//  One place calls Anthropic. Everything else in the assistant tree takes a
//  provider object and never imports the SDK, which is what lets
//  smoke/assistant-exfiltration.js run the REAL assembly path offline against a
//  recording provider and assert on the context that would have been sent. A
//  suite that can only test the layers by paying for tokens is a suite that gets
//  run once.
//
//  IT NEVER THROWS FOR BEING UNCONFIGURED. No ANTHROPIC_API_KEY is the normal
//  state of a local checkout and of CI, and it is the state production is in
//  until Tanner sets the key. `configured()` answers false, `complete()` returns
//  { ok: false, reason: 'unconfigured' }, and the caller degrades to the
//  knowledge base. The assistant answering fewer questions is a product state;
//  the assistant returning 500 is an outage.
//
//  COST POSTURE, and it is deliberate. On Claude Opus 5 thinking is ON by
//  default, so omitting the field would silently buy extended thinking on every
//  support reply. This is a desk that answers from typed tool results in a
//  paragraph or two, on a box with a $169 incident on record, so thinking is
//  explicitly disabled and effort is low. Both are environment variables rather
//  than constants: raising them is a decision someone can make without a deploy,
//  and lowering them is the first lever if a bill moves.
//
//    ASSISTANT_MODEL           default claude-opus-5
//    ASSISTANT_MAX_TOKENS      default 1024, a support reply is short
//    ASSISTANT_EFFORT          default low. low | medium | high
//    ASSISTANT_THINKING        default off. Set to 'adaptive' to enable.
//
//  Note on the pairing: thinking disabled is accepted at effort high or lower
//  and returns 400 at xhigh or max, so the two settings are validated together
//  below rather than passed through blind.
//
//  The system prompt carries cache_control, per spec section 6. It is the same
//  bytes on every call and it is the largest stable block in the request.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'claude-opus-5';
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
// Effort levels at which thinking: disabled is accepted by the API.
const EFFORT_ALLOWS_DISABLED = new Set(['low', 'medium', 'high']);

function model() {
  return process.env.ASSISTANT_MODEL || DEFAULT_MODEL;
}

function maxTokens() {
  const n = Number(process.env.ASSISTANT_MAX_TOKENS);
  return Number.isFinite(n) && n >= 256 && n <= 16000 ? Math.floor(n) : 1024;
}

function effort() {
  const e = String(process.env.ASSISTANT_EFFORT || 'low').toLowerCase();
  return EFFORTS.has(e) ? e : 'low';
}

// Thinking is off unless someone asks for it, and the request is only built with
// an explicit disable where the API accepts one. At xhigh or max the field is
// omitted, which is the model's own default and the only legal shape there.
function thinkingConfig() {
  const want = String(process.env.ASSISTANT_THINKING || 'off').toLowerCase();
  if (want === 'adaptive' || want === 'on') return { type: 'adaptive' };
  if (EFFORT_ALLOWS_DISABLED.has(effort())) return { type: 'disabled' };
  return null;
}

function configured() {
  return !!(process.env.ANTHROPIC_API_KEY && String(process.env.ANTHROPIC_API_KEY).trim());
}

// The SDK is required lazily and cached. Requiring at module load would make
// every route file that transitively imports the assistant pay for it at boot,
// on a 1 GB box, for a feature that is off by default.
let _client = null;
let _sdk = null;
function client() {
  if (_client) return _client;
  if (!_sdk) _sdk = require('@anthropic-ai/sdk');
  const Anthropic = _sdk.default || _sdk;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// Build the request body. Exported so the suite can assert on exactly what would
// have been sent without a network call: spec section 5 requires the test to
// assert on the ASSEMBLED CONTEXT, and this is where the context becomes a
// request.
function buildRequest({ system, messages, maxTokens: mt }) {
  const body = {
    model: model(),
    max_tokens: mt || maxTokens(),
    output_config: { effort: effort() },
    system: [{ type: 'text', text: String(system || ''), cache_control: { type: 'ephemeral' } }],
    messages: (messages || []).map((m) => ({ role: m.role, content: String(m.content || '') })),
  };
  const think = thinkingConfig();
  if (think) body.thinking = think;
  return body;
}

// Returns a plain result rather than raising, so no caller needs a try/catch to
// stay up. { ok, text, usage, stop_reason, reason }.
async function complete({ system, messages, maxTokens: mt }) {
  if (!configured()) return { ok: false, reason: 'unconfigured', text: null, usage: null };

  const body = buildRequest({ system, messages, maxTokens: mt });
  let Anthropic;
  try {
    if (!_sdk) _sdk = require('@anthropic-ai/sdk');
    Anthropic = _sdk.default || _sdk;
  } catch (e) {
    return { ok: false, reason: 'sdk_missing', text: null, usage: null };
  }

  try {
    const res = await client().messages.create(body);
    const text = (res.content || [])
      .filter((b) => b && b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return {
      ok: true,
      text,
      stop_reason: res.stop_reason || null,
      usage: {
        input_tokens: (res.usage && res.usage.input_tokens) || 0,
        output_tokens: (res.usage && res.usage.output_tokens) || 0,
      },
      model: res.model || body.model,
    };
  } catch (e) {
    // Typed classes, never string matching on the message. The caller only needs
    // to know whether to retry later or degrade now, so the reason is coarse.
    let reason = 'error';
    if (Anthropic && Anthropic.RateLimitError && e instanceof Anthropic.RateLimitError) reason = 'rate_limited';
    else if (Anthropic && Anthropic.AuthenticationError && e instanceof Anthropic.AuthenticationError) reason = 'auth';
    else if (Anthropic && Anthropic.BadRequestError && e instanceof Anthropic.BadRequestError) reason = 'bad_request';
    else if (Anthropic && Anthropic.APIError && e instanceof Anthropic.APIError) reason = 'api_error';
    console.error('assistant/provider:', reason, e && e.message);
    return { ok: false, reason, text: null, usage: null };
  }
}

module.exports = {
  configured,
  complete,
  buildRequest,
  model,
  maxTokens,
  effort,
  thinkingConfig,
  DEFAULT_MODEL,
};
