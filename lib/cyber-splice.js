'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE SPLICE MACHINERY, ONCE.
//
//  Five modules had grown their own byte-identical copy of indexOfUnique and
//  applySplices, and a sixth was about to. The repo's own history says what
//  comes next: the checks that drifted silently were all copies of something
//  that worked somewhere else.
//
//  ── WHAT IT GUARANTEES ─────────────────────────────────────────────────────
//  An anchor must occur EXACTLY ONCE. A splice that matched at a guessed offset
//  would be worse than one that failed, so ambiguity throws rather than picking
//  the first hit. Regions are resolved against the ORIGINAL body and then the
//  body is rebuilt left to right, so no splice can move the ground another one
//  stands on. Overlapping regions throw.
//
//  ── all: true ──────────────────────────────────────────────────────────────
//  Deliberately narrow. Topic 1.5 carries its exit ticket twice, byte for byte,
//  and Topic 1.1 repeats "under the CED definition" eight times in places where
//  one replacement is right for all of them. A unique anchor cannot reach the
//  second copy of an identical string, and loosening uniqueness everywhere
//  would throw away the guarantee for the sake of two pages. So a splice has to
//  say `all: true` out loud, and an ambiguous anchor without it is still an
//  error.
// ─────────────────────────────────────────────────────────────────────────────

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
  '&bull;': '•', '&#9998;': '✎', '&ne;': '≠',
  '&#9733;': '★', '&#9888;': '⚠', '&larr;': '←',
};
const lit = (s) => s.replace(
  /&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|larr|hellip|bull|ne|#9998|#9733|#9888);/g,
  (m) => LITERAL[m]);

function indexOfUnique(body, anchor, label) {
  const first = body.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`);
  if (body.indexOf(anchor, first + 1) >= 0) {
    throw new Error(`${label}: anchor is ambiguous, appears more than once: ${JSON.stringify(anchor.slice(0, 80))}`);
  }
  return first;
}

function allIndexes(body, anchor, label) {
  const out = [];
  let i = -1;
  while ((i = body.indexOf(anchor, i + 1)) >= 0) out.push(i);
  if (!out.length) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`);
  return out;
}

//  after: an optional transform applied to the whole spliced body, for pages
//  that also run the EK thinner. It runs LAST, because every anchor above was
//  read off the live body and thinning first would move what they match.
function makeApplySplices(SPLICES, after) {
  return function applySplices(body) {
    const resolved = [];
    for (const s of SPLICES) {
      const from = lit(s.from);
      const starts = s.all ? allIndexes(body, from, s.name) : [indexOfUnique(body, from, s.name)];
      starts.forEach((start, k) => resolved.push({
        name: starts.length > 1 ? `${s.name} [${k + 1}/${starts.length}]` : s.name,
        start,
        end: start + from.length,
        html: lit(s.html),
        removed: from.length,
      }));
    }
    resolved.sort((a, b) => a.start - b.start);

    for (let i = 1; i < resolved.length; i++) {
      if (resolved[i].start < resolved[i - 1].end) {
        throw new Error(`splice regions overlap: ${resolved[i - 1].name} and ${resolved[i].name}`);
      }
    }

    let out = '';
    let cursor = 0;
    for (const r of resolved) {
      out += body.slice(cursor, r.start) + r.html;
      cursor = r.end;
    }
    const spliced = out + body.slice(cursor);
    return { body: after ? after(spliced) : spliced, resolved };
  };
}

module.exports = { makeApplySplices, lit, LITERAL, indexOfUnique, allIndexes };
