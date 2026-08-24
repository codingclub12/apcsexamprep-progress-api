'use strict';
// -----------------------------------------------------------------------------
//  AP CSA COURSE HUB: retire the live/coming-soon badge system.
//
//  WHY
//  Measured 2026-08-24 against the live body of /pages/ap-csa-course: 15 topics
//  are badged `Live`, 38 are badged `Coming soon`, the Unit 1 card carries a
//  `Live` chip the other three units do not, and four counters read
//  `15 of 15`, `0 of 12`, `0 of 9` and `0 of 17` lessons live.
//
//  Every one of those is now false in the same direction. All 53 CSA lesson
//  pages are live, verified by an Admin API handle query the same night, and so
//  are 53 exercise pages. The page tells a visiting teacher that three quarters
//  of the course does not exist.
//
//  The badges are removed rather than corrected. A status that reads `Live` on
//  all 53 topics distinguishes nothing, and leaving the markup in place invites
//  the same drift the moment anything else ships. The `Code Editor` badge is a
//  different fact about a topic and is deliberately kept.
//
//  WHAT IS REFUSED
//  The same posture as lib/csa-hub-links.js: the body goes in, known markup
//  comes out, and the result is compared against the input. It refuses a body
//  that is not this page, a body where the counts do not match what was
//  measured, any output that lost a /pages/ link, any output that is smaller
//  than the removals account for, and any div-count change at all: this pass
//  removes spans and rewrites class attributes, so it must never touch the
//  block structure.
// -----------------------------------------------------------------------------

const HANDLE = 'ap-csa-course';

// What the live page carries. A body that disagrees is not the page this was
// written against, and guessing at a different shape is how a live page gets
// half-edited.
const EXPECTED = {
  liveBadges: 15,
  comingSoonBadges: 38,
  liveTopicClass: 15,
  unitCardBadges: 1,
  counters: 4,
  codeEditorBadges: 35,
};

const RE = {
  liveBadge: /<span class="ch-topic-status live">Live<\/span>\s*/g,
  comingSoon: /<span class="ch-topic-status planned">Coming soon<\/span>\s*/g,
  liveTopicClass: /<div class="ch-topic live">/g,
  unitCardBadge: /<span class="ch-unit-card-live"[^>]*>Live<\/span>/g,
  // The counter and the separator that precedes it, so removing it does not
  // leave a dangling middot in the meta row.
  counter: /\s*<span>&middot;<\/span>\s*<span><strong>\d+ of \d+ lessons live<\/strong><\/span>/g,
  counterLiteral: /\s*<span>·<\/span>\s*<span><strong>\d+ of \d+ lessons live<\/strong><\/span>/g,
  codeEditor: /<span class="ch-topic-status code-editor">Code Editor<\/span>/g,
};

function count(body, re) {
  return (String(body).match(re) || []).length;
}

function measure(body) {
  return {
    liveBadges: count(body, RE.liveBadge),
    comingSoonBadges: count(body, RE.comingSoon),
    liveTopicClass: count(body, RE.liveTopicClass),
    unitCardBadges: count(body, RE.unitCardBadge),
    counters: count(body, RE.counter) + count(body, RE.counterLiteral),
    codeEditorBadges: count(body, RE.codeEditor),
  };
}

function check(inBody, outBody, before) {
  const problems = [];
  if (!outBody.trim()) problems.push('the output body is empty, which would wipe the live page');
  if (Buffer.byteLength(outBody) >= Buffer.byteLength(inBody)) {
    problems.push('the output is not smaller than the input, so nothing was removed');
  }

  const after = measure(outBody);
  for (const k of ['liveBadges', 'comingSoonBadges', 'liveTopicClass', 'unitCardBadges', 'counters']) {
    if (after[k] !== 0) problems.push(`${after[k]} ${k} survived the removal`);
  }
  if (after.codeEditorBadges !== before.codeEditorBadges) {
    problems.push(`the Code Editor badges went from ${before.codeEditorBadges} to ${after.codeEditorBadges}; `
      + 'they are a different fact about a topic and are meant to stay');
  }
  if (/Coming soon/.test(outBody)) problems.push('the words "Coming soon" still appear in the body');
  if (/lessons live/.test(outBody)) problems.push('a "lessons live" counter still appears in the body');

  // Structure must be untouched: this pass removes inline spans and rewrites a
  // class attribute, nothing that opens or closes a block.
  const divs = (s) => (s.match(/<div[\s>]/g) || []).length;
  const closes = (s) => (s.match(/<\/div>/g) || []).length;
  if (divs(outBody) !== divs(inBody)) problems.push(`div opens changed from ${divs(inBody)} to ${divs(outBody)}`);
  if (closes(outBody) !== closes(inBody)) problems.push(`div closes changed from ${closes(inBody)} to ${closes(outBody)}`);

  const links = (s) => new Set(s.match(/\/pages\/[a-z0-9-]+/g) || []);
  const lost = [...links(inBody)].filter((l) => !links(outBody).has(l));
  if (lost.length) problems.push(`${lost.length} existing link(s) disappeared: ${lost.slice(0, 4).join(', ')}`);

  // Every topic keeps its lesson link and its heading; only the badge goes.
  const heads = (s) => (s.match(/<div class="ch-topic-head">/g) || []).length;
  if (heads(outBody) !== heads(inBody)) problems.push('a topic heading was lost');
  return problems;
}

function build(inBody) {
  const before = measure(inBody);
  const wrong = Object.keys(EXPECTED).filter((k) => before[k] !== EXPECTED[k]);
  if (wrong.length) {
    const detail = wrong.map((k) => `${k}: found ${before[k]}, expected ${EXPECTED[k]}`).join('; ');
    throw new Error(`this body does not match the page this was measured against (${detail}). `
      + 'Re-measure before editing rather than removing markup by pattern alone.');
  }

  let body = inBody
    .replace(RE.liveBadge, '')
    .replace(RE.comingSoon, '')
    .replace(RE.unitCardBadge, '')
    .replace(RE.counter, '')
    .replace(RE.counterLiteral, '')
    // A topic that was `ch-topic live` painted a green left border the other 38
    // did not have. With the badge gone the highlight would be the last thing
    // still claiming Unit 1 is special.
    .replace(RE.liveTopicClass, '<div class="ch-topic">');

  return { body, before, after: measure(body), problems: check(inBody, body, before) };
}

module.exports = { build, measure, check, EXPECTED, RE, HANDLE };
