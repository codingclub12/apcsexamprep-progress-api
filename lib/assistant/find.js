'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: "HELP ME FIND A PAGE"  (handoff section 4.4)
//
//  Returns links from the page index and nothing else. No prose, no answers, no
//  tutoring, and above all no URL that did not come out of the table.
//
//  THE MODEL NEVER EMITS A URL. That is the whole design and it is the reason
//  this file exists instead of a prompt.
//
//  The lexical search in lib/assistant/page-index.js produces a shortlist. The
//  shortlist is NUMBERED and handed to the cheapest model with one instruction:
//  return the indices, best first. What comes back is parsed as integers, and
//  every integer outside the shortlist is dropped. So the model's entire power
//  here is to REORDER and to DROP. It cannot add.
//
//  Why that matters more than it sounds: a model asked "where is the CSA loops
//  lesson" will produce `/pages/ap-csa-lesson-1-9-loops` whether or not that page
//  exists, and on this storefront a plausible handle is either a 404 or a real
//  page about something else. Neither failure announces itself, and a student
//  following a confidently wrong link does not report it as a bug, they conclude
//  the lesson is missing.
//
//  Then, belt and braces, every path is checked against the index ON THE WAY OUT
//  in answer(), after ranking. A reordering step cannot smuggle in a path that
//  was not a candidate, even if someone later changes how ranking works.
//
//  DEGRADATION. No model key, a timeout, junk back: the lexical order stands.
//  The feature is "slightly worse ordering" when the model is off, never an
//  error and never an empty list. lib/assistant/junk-filter.js takes the same
//  posture for the same reason.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const pageIndex = require('./page-index');
const provider = require('./provider');

// The same cheap model the junk filter uses, and the same reason: picking three
// links out of eight is not work that wants Opus.
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
function model() {
  return process.env.REPORTS_TRIAGE_MODEL || DEFAULT_MODEL;
}

const DEFAULT_TIMEOUT_MS = 5000;
function timeoutMs() {
  const n = Number(process.env.ASSISTANT_FIND_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 250 && n <= 30000 ? Math.floor(n) : DEFAULT_TIMEOUT_MS;
}

// How many candidates the lexical pass produces, and how many survive to the
// caller. The gap between them is what the model has room to reorder.
const SHORTLIST = 8;
const RETURNED = 3;

const RERANK_SYSTEM = [
  'You are re-ranking search results for a high school computer science course website.',
  'You are given a question and a numbered list of pages that already matched it.',
  '',
  'Reply with ONLY a JSON array of the list numbers, best match first, at most 3.',
  'Example: [4,1,7]',
  '',
  'Rules:',
  '  Use ONLY numbers from the list. Never write a URL, a title, or any prose.',
  '  Drop anything that does not answer the question. An empty array [] is a fine answer.',
  '  Prefer a lesson page over a quiz or a practice question on the same topic.',
].join('\n');

// Parse the model's reply into a list of shortlist indices. Anything that is not
// a clean integer inside the list is dropped rather than repaired: a reply this
// module cannot read is a reply it does not act on.
function parseIndices(raw, max) {
  if (!raw) return null;
  const m = /\[[^\]]*\]/.exec(String(raw));
  if (!m) return null;
  let arr;
  try { arr = JSON.parse(m[0]); } catch (_) { return null; }
  if (!Array.isArray(arr)) return null;
  const out = [];
  for (const v of arr) {
    const n = Number(v);
    if (!Number.isInteger(n)) continue;
    if (n < 1 || n > max) continue;      // outside the shortlist: dropped
    if (out.includes(n)) continue;       // a repeat is not a second result
    out.push(n);
    if (out.length >= RETURNED) break;
  }
  return out;
}

// Returns the reordered candidate list, or null when the model had nothing
// usable to say. Never throws.
async function rerank(q, candidates) {
  if (!provider.configured() || candidates.length < 2) return null;

  const list = candidates
    .map((c, i) => `${i + 1}. ${c.title}  [${c.course || 'site'}${c.lesson ? ' ' + c.lesson : ''}, ${c.page_type}]  ${c.path}`)
    .join('\n');

  let res;
  try {
    res = await Promise.race([
      provider.complete({
        system: RERANK_SYSTEM,
        messages: [{ role: 'user', content: `Question: ${String(q).slice(0, 300)}\n\nPages:\n${list}` }],
        maxTokens: 64,
        model: model(),
      }),
      new Promise((resolve) => setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs())),
    ]);
  } catch (e) {
    return null;
  }
  if (!res || !res.ok) return null;

  const picks = parseIndices(res.text, candidates.length);
  if (!picks || !picks.length) return null;
  return picks.map((n) => candidates[n - 1]);
}

// The public shape. { query, results: [{title, path, url, course, lesson, type}],
// ranked_by: 'model' | 'lexical' | 'none' }
//
// `results` is always a list of pages that exist. When it is empty the caller
// shows the handoff's "Couldn't find it. Want to report that?" and opens the
// report form prefilled, which is the one place this feature is allowed to hand
// somebody off rather than answer.
async function answer(q, opts) {
  const o = opts || {};
  const query = String(q || '').trim();
  if (!query) return { query: '', results: [], ranked_by: 'none' };

  const candidates = pageIndex.search(query, { limit: SHORTLIST });
  if (!candidates.length) return { query, results: [], ranked_by: 'none' };

  let ordered = candidates;
  let rankedBy = 'lexical';
  if (o.useModel !== false) {
    const reranked = await rerank(query, candidates);
    if (reranked && reranked.length) { ordered = reranked; rankedBy = 'model'; }
  }

  // THE LAST GATE. Every path goes back through the index before it is returned,
  // after ranking rather than before, so nothing that happens in ranking can put
  // a path here that the index does not have.
  const results = ordered
    .slice(0, RETURNED)
    .filter((r) => r && r.path && pageIndex.isIndexed(r.path))
    .map((r) => ({
      title: r.title,
      path: r.path,
      url: r.url,
      course: r.course || null,
      lesson: r.lesson || null,
      type: r.page_type,
    }));

  return { query, results, ranked_by: results.length ? rankedBy : 'none' };
}

module.exports = {
  answer, rerank, parseIndices,
  SHORTLIST, RETURNED, RERANK_SYSTEM, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, timeoutMs, model,
};
