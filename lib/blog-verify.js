'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY A LIVE ARTICLE AGAINST ITS REPO SOURCE.
//
//  Extracted from the ad hoc Python run by hand during the first publish, so
//  the check an unattended session performs on itself is the same check every
//  week, not whatever the session improvises. A publish is not done until this
//  passes: CLAUDE.md's third rule is close with an artifact, and for these
//  posts the artifact IS this diff, not a claim that the mutation returned ok.
// ─────────────────────────────────────────────────────────────────────────────

// Deliberately NOT blog-house's stripTags: that one drops tags to nothing,
// which glues adjacent inline elements together with no space between them
// (`</strong><ol><li>` vanishes rather than separating words) and merges
// unrelated text into one falsely-huge "sentence" for the chunker below. Tags
// become a space here instead, and named entities are decoded so the same
// text compares equal whether it reached us through an entity or the literal
// character.
const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

function normalize(html) {
  let s = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  for (const [k, v] of Object.entries(ENTITIES)) s = s.split(k).join(v);
  return s.replace(/\s+/g, ' ').trim();
}

// Sentence-ish chunks over a minimum length. Short chunks produce false
// positives (a five word fragment matches almost anything); long ones are a
// real fingerprint of that specific sentence having survived the trip.
function proseChunks(bodyHtml, minLen = 60) {
  return normalize(bodyHtml).split(/(?<=\.)\s+/).filter((c) => c.length >= minLen);
}

// `liveHtml` is the full rendered page, not just the article body: the h1
// check specifically needs the theme's wrapper, since the whole point of the
// h1 rule (see blog-validate.js) is that the body must NOT carry its own.
function verifyLive(post, liveHtml) {
  const h1Count = (liveHtml.match(/<h1[\s>]/gi) || []).length;
  const chunks = proseChunks(post.body);
  const liveText = normalize(liveHtml);
  const missing = chunks.filter((c) => !liveText.includes(c));
  const faq = liveHtml.includes('"@type":"FAQPage"') || liveHtml.includes('"@type": "FAQPage"');

  const problems = [];
  if (h1Count !== 1) problems.push(`page has ${h1Count} h1 tags, want exactly 1 (the theme's own)`);
  if (missing.length) problems.push(`${missing.length} of ${chunks.length} prose chunks missing from the live page`);
  if (!faq) problems.push('no FAQPage JSON-LD found on the live page');

  return {
    ok: problems.length === 0,
    handle: post.meta.handle,
    h1Count, chunksChecked: chunks.length, chunksMissing: missing.length, faqPresent: faq,
    problems,
    firstMissing: missing[0] || null,
  };
}

module.exports = { verifyLive, normalize, proseChunks };
