'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: TURNSTILE  (spec section 6)
//
//  Cloudflare Turnstile, on the anonymous path only. A signed-in caller already
//  cost something to create; an anonymous one costs nothing, and the endpoint
//  behind it spends money per request on a box with a $169 incident on record.
//
//  THE FAILURE POSTURE IS THE WHOLE DESIGN, and it is not the obvious one.
//
//  Not configured  -> anonymous callers get the KNOWLEDGE BASE and no model.
//    Not an error, and not an open door. The free path is a database lookup on
//    a corpus Tanner wrote, already public at /api/assistant/help and already
//    rate limited, so it needs no bot protection. What Turnstile gates is the
//    part that spends, and until it is configured that part is simply off for
//    anonymous traffic. The alternative, shipping a public model endpoint and
//    hoping the key gets set later, is how the incident happens again.
//
//  Configured and the token fails -> same thing. KB, no model.
//    A bot gets the same answer a person gets, minus the expensive half. There
//    is no 403 to probe and nothing to learn from being refused.
//
//  Cloudflare unreachable or slow -> same thing again, and this is the case
//    people get wrong. Failing CLOSED here would mean a Turnstile outage takes
//    the whole anonymous surface down; failing OPEN would mean an attacker who
//    can cause a timeout gets free model calls. Degrading to the KB is neither:
//    the site keeps answering and nobody gets a free call out of a timeout.
//
//  So there is exactly one thing this module can authorise: spending money. It
//  can never authorise reading anything, because the anonymous surface reads no
//  account state at all.
//
//  Env: TURNSTILE_SECRET_KEY (server), TURNSTILE_SITE_KEY (public, for the
//  widget). The site key is not a secret and is served to the browser; the
//  secret key never leaves this process.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// A hung verify must not hold an Express handler open. Short, because the whole
// point of the timeout path is that it degrades rather than waits.
const TIMEOUT_MS = 4000;

function configured() {
  return !!(process.env.TURNSTILE_SECRET_KEY && String(process.env.TURNSTILE_SECRET_KEY).trim());
}

// The public half, safe to hand to a browser. Null when unset, which the widget
// reads as "do not render a challenge".
function siteKey() {
  const k = process.env.TURNSTILE_SITE_KEY;
  return k && String(k).trim() ? String(k).trim() : null;
}

// Returns { ok, reason }. Never throws, never rejects.
//
// `reason` is coarse on purpose: unconfigured, missing, failed, unreachable.
// Cloudflare's own error codes are not passed through, because the only
// decision anyone downstream makes is "may this request spend money", and a
// detailed refusal on a public endpoint is a probing aid.
async function verify(token, remoteIp) {
  if (!configured()) return { ok: false, reason: 'unconfigured' };
  const t = typeof token === 'string' ? token.trim() : '';
  if (!t) return { ok: false, reason: 'missing' };
  // Turnstile tokens are short-lived and bounded; anything huge is not one, and
  // there is no reason to post a megabyte to Cloudflare on our own bill.
  if (t.length > 2048) return { ok: false, reason: 'failed' };

  const body = new URLSearchParams();
  body.set('secret', process.env.TURNSTILE_SECRET_KEY);
  body.set('response', t);
  // The IP is optional and helps Cloudflare score the request. It is the raw
  // address, sent to Cloudflare only, and never stored here: what this repo
  // keeps is the daily hash, per spec section 8.
  if (remoteIp) body.set('remoteip', String(remoteIp));

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: ctl.signal,
    });
    if (!res.ok) return { ok: false, reason: 'unreachable' };
    const json = await res.json();
    return json && json.success === true
      ? { ok: true, reason: null }
      : { ok: false, reason: 'failed' };
  } catch (e) {
    // Abort, DNS, TLS, malformed JSON. All the same decision.
    return { ok: false, reason: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { configured, siteKey, verify, VERIFY_URL, TIMEOUT_MS };
