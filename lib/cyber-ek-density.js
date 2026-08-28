'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  EK CODE DENSITY: FIND THE CITATIONS A STUDENT SHOULD NOT BE READING.
//
//  ── THE RULE ────────────────────────────────────────────────────────────────
//  The EK code is teacher knowledge. A student reading a lesson does not need to
//  be told that intimidation is 1.1.A.2; they need to know what intimidation is
//  and how to spot it. Name the idea, not the code. See "Citing the CED to
//  students" in docs/ap-cyber-unit1-ced-realignment.md.
//
//  Three places a code still earns its place, and this module finds them by
//  STRUCTURE rather than by string offsets:
//
//    1. the Essential Knowledge coverage table, which exists to be audited and
//       is collapsed by default
//    2. any block claiming something is not assessed or belongs to another unit,
//       where the code is the evidence for the claim
//    3. teacher-facing artifacts: the exit ticket answer key
//
//    plus one orientation tag per concept card.
//
//  ── WHY BY STRUCTURE ────────────────────────────────────────────────────────
//  The first version of this picked regions with literal start and end strings.
//  Two of them were wrong in ways that looked fine: "Are vishing, smishing,
//  whaling" matched inside the JSON-LD near the top of the document rather than
//  the FAQ answer it was meant to find, and its closing </li> landed 10 KB later,
//  silently protecting the entire EK coverage table under the wrong label. The
//  totals still added up, which is what made it convincing.
//
//  So blocks are located by their own element boundaries, and a block is
//  protected because of what it CONTAINS rather than where it happens to start.
//  A miscounted region now shows up as a block that fails to close.
// ─────────────────────────────────────────────────────────────────────────────

//  Matches 1.1.A.2, EK 1.1.C, and ranges like "1.1.B.1 through 1.1.B.3".
const EK_RX = /\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?(?:\s+through\s+(?:EK )?\d\.\d\.[A-C](?:\.\d)?)?\b/g;

//  A block carrying any of these is making a claim the code is evidence for.
const EVIDENCE = [
  'not assessed', 'do not appear', 'does not appear', 'not in the ced',
  'nowhere in the', 'belongs to', 'belong?', 'unit 2', 'enrichment',
  'not required', 'not topic 1.', 'answer key',
];

//  Walk from a start tag to its matching close, counting nesting.
function elementSpan(html, startIdx, tag) {
  const open = new RegExp(`<${tag}\\b`, 'g');
  const close = new RegExp(`</${tag}>`, 'g');
  let depth = 0;
  let i = startIdx;
  while (i < html.length) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return null;                       // unbalanced: caller should fail
    if (o && o.index < c.index) { depth++; i = o.index + 1; continue; }
    depth--;
    if (depth === 0) return [startIdx, c.index + c[0].length];
    i = c.index + 1;
  }
  return null;
}

//  Blocks whose contents decide whether they are protected.
const CANDIDATES = [
  { open: /<li class="faq-item">/g, tag: 'li', label: 'FAQ item' },
  { open: /<div class="info-box (?:warning|stat|insight)"[^>]*>/g, tag: 'div', label: 'info box' },
  { open: /<div class="atk-edge">/g, tag: 'div', label: 'enrichment edge box' },
  { open: /<div class="cfu-feedback-explain">/g, tag: 'div', label: 'CFU feedback' },
  { open: /<tr>/g, tag: 'tr', label: 'table row' },
];

function textOf(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

function protectedSpans(body) {
  const spans = [];
  const unbalanced = [];

  //  1. the coverage table, located by its own id and closed as a table.
  //     The id carries the topic number: ek11-body on 1.1, ek14-body on 1.4,
  //     and so on for 1.2, 1.3 and 1.5. This was pinned to ek11-body while the
  //     module only ever ran on 1.1, which meant the coverage table went
  //     UNPROTECTED on the other four lesson pages and nothing said so: the
  //     summary just reported zero citations kept under that label, which reads
  //     the same as a page that has no coverage table.
  const ekId = /id="(ek\d+-body)"/.exec(body);
  const ek = ekId ? ekId.index : -1;
  if (ek >= 0) {
    const t = body.indexOf('<table', ek);
    const span = t >= 0 ? elementSpan(body, t, 'table') : null;
    if (span) spans.push({ a: span[0], z: span[1], label: 'EK coverage table' });
    else unbalanced.push('EK coverage table');
  }

  //  2. Prose blocks, protected at SENTENCE granularity rather than block.
  //     Block granularity was too coarse and it showed: one cloze feedback said
  //     "consensus and familiarity are Topic 2.1 terms (2.1.A.5 and 2.1.A.7)",
  //     which is evidence, in the same block as "elicitation (1.1.A.1),
  //     intimidation and urgency (1.1.A.2)", which is decoration. Protecting the
  //     block kept both. The rule says the code earns its place where it proves
  //     a claim, and a claim is a sentence.
  for (const { open, tag, label } of CANDIDATES) {
    open.lastIndex = 0;
    let m;
    while ((m = open.exec(body))) {
      const span = elementSpan(body, m.index, tag);
      if (!span) { unbalanced.push(`${label} at ${m.index}`); continue; }
      const inner = body.slice(span[0], span[1]);
      EK_RX.lastIndex = 0;
      if (!EK_RX.test(inner)) { EK_RX.lastIndex = 0; continue; }
      EK_RX.lastIndex = 0;

      //  Split on sentence ends that fall outside a tag, then keep only the
      //  sentences that carry an evidence phrase.
      let cursor = span[0];
      for (const part of inner.split(/(?<=[.?!])\s+(?=[A-Z<])/)) {
        const a = cursor;
        const z = cursor + part.length;
        cursor = z + 1;
        if (EVIDENCE.some((e) => textOf(part).includes(e))) {
          spans.push({ a, z, label });
        }
      }
    }
  }

  //  3. the exit ticket answer key
  const key = body.indexOf('<strong>Answer Key:</strong>');
  if (key >= 0) {
    const d = body.lastIndexOf('<div', key);
    const span = d >= 0 ? elementSpan(body, d, 'div') : null;
    if (span) spans.push({ a: span[0], z: span[1], label: 'exit ticket key' });
    else unbalanced.push('exit ticket key');
  }

  //  4. one orientation tag per concept card
  //
  //     Matched by POSITION, not by prefix. The first version required the tag
  //     to open with "EK " or "Mechanism:", which is how 1.1 writes them. Topic
  //     1.3 writes a bare code, "1.3.B.1", so all six of its card tags counted
  //     as unprotected decoration and would have been stripped. The rule says
  //     one orientation tag per card earns its place; it does not say anything
  //     about how the tag is punctuated.
  for (const m of body.matchAll(/<span class="atk-tag">([^<]*)<\/span>/g)) {
    EK_RX.lastIndex = 0;
    if (!EK_RX.test(m[1])) { EK_RX.lastIndex = 0; continue; }
    EK_RX.lastIndex = 0;
    spans.push({ a: m.index, z: m.index + m[0].length, label: 'card tag' });
  }

  spans.sort((x, y) => x.a - y.a);
  return { spans, unbalanced };
}

//  Every EK citation in the body, each marked with the protecting block or null.
function citations(body) {
  const { spans, unbalanced } = protectedSpans(body);
  const find = (pos) => {
    for (const s of spans) if (s.a <= pos && pos < s.z) return s.label;
    return null;
  };
  const out = [];
  EK_RX.lastIndex = 0;
  let m;
  while ((m = EK_RX.exec(body))) {
    out.push({
      code: m[0],
      index: m.index,
      protectedBy: find(m.index),
      context: body.slice(Math.max(0, m.index - 90), m.index + m[0].length + 60)
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
  }
  return { citations: out, spans, unbalanced };
}

function summary(body) {
  const { citations: c, unbalanced } = citations(body);
  const kept = c.filter((x) => x.protectedBy);
  const byLabel = {};
  for (const k of kept) byLabel[k.protectedBy] = (byLabel[k.protectedBy] || 0) + 1;
  return { total: c.length, kept: kept.length, cut: c.length - kept.length, byLabel, unbalanced };
}

module.exports = { EK_RX, elementSpan, protectedSpans, citations, summary };
