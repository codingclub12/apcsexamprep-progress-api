'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A LESSON PAGE HAS NEWLINES INJECTED INSIDE ITS TOKENS. DELETE THEM.
//
//  ── WHAT IS WRONG, IN THE BYTES ────────────────────────────────────────────
//  ap-csa-lesson-1-9-method-signatures serves a body with single newline
//  characters sitting in the middle of words and identifiers:
//
//      opt.getAtt \n ribute('data-letter')     the MCQ handler
//      re \n turn '';                          the Java editor
//      the m \n ethod is called                student-visible prose
//      following c \n ode.                     student-visible prose
//      .cm-v \n ariable-2                      CSS
//      !importan \n t;                         CSS
//      font-si \n ze:14px                      CSS
//
//  Two of them break the page outright and neither is visible to any check this
//  repo runs:
//
//    `re\nturn` is a hard SyntaxError, so the browser skips the WHOLE editor
//    block and the page renders ZERO CodeMirror instances despite having its
//    problems authored.
//
//    `getAtt\nribute` PARSES, because Automatic Semicolon Insertion reads it as
//    `opt.getAtt;` then `ribute(...)`. node --check is GREEN. It throws
//    ReferenceError at runtime, AFTER the click handler has set
//    ex.dataset.answered, so the student gets no feedback, no colour, and the
//    question is locked on their first pick forever.
//
//  The other five are cosmetic, and two of those are prose a student reads.
//
//  ── WHY THIS IS A REPAIR AND NOT AUTHORING ─────────────────────────────────
//  Every edit is the DELETION of one newline character. Nothing is written.
//  The recovered text is whatever the two halves already say when joined.
//
//  ── THE TWO RULES THAT DECIDE, AND THEY ARE INDEPENDENT ────────────────────
//  A newline between two word characters is not automatically wrong. Inside a
//  <pre> it is content: `parameters\npublic static double average(...)` is two
//  lines of a code sample and joining them would corrupt the lesson.
//
//  So a candidate is repaired only if BOTH agree:
//
//    1. it is NOT inside a <pre> block
//    2. the token formed by joining the halves ALREADY APPEARS on a sibling
//       lesson page
//
//  Measured on the live body: both rules independently pick the same 7 and
//  reject the same 2. The two <pre> cases join into "parameterspublic" and
//  "argumentsdouble", which appear nowhere, which is exactly why rule 2 catches
//  them without knowing anything about <pre>.
//
//  A sibling is used here as a corpus of CONVENTION, never of content: the
//  question is only "is this a token this course uses", never "what should this
//  page say". No text is copied across.
//
//  ── HOUSE MATRIXIFY RULES ──────────────────────────────────────────────────
//  MERGE, UTF-8 with BOM, QUOTE_ALL, CRLF between records. Handle, Command and
//  Body HTML only. No Published At, ever: a blank cell is an ERASE in every
//  column and a live server time would republish the page.
//
//  Run: node scripts/csa-lesson-newline-repair.js <handle> [out.csv]
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const sf = require('../lib/storefront-fetch');
const { extract } = require('./extract-live-body');

//  Sibling lesson pages, used ONLY to answer "is this a real token".
const SIBLINGS = [
  'ap-csa-lesson-1-8-documentation-comments',
  'ap-csa-lesson-1-10-calling-class-methods',
  'ap-csa-lesson-1-11-math-class',
];

//  Where a newline is CONTENT rather than formatting.
function preSpans(s) {
  const out = [];
  const re = /<pre(\s[^>]*)?>/g;
  let m;
  while ((m = re.exec(s))) {
    const c = s.indexOf('</pre>', m.index);
    if (c > 0) out.push([m.index, c + 6]);
  }
  return out;
}

//  Every newline with a word character on both sides, with the token it would
//  form and the two independent verdicts on it.
function candidates(body, corpus) {
  const pre = preSpans(body);
  const out = [];
  const re = /\w\n\w/g;
  let m;
  while ((m = re.exec(body))) {
    const at = m.index + 1;                 // the newline itself
    const left = (body.slice(Math.max(0, at - 60), at).match(/[\w.$-]+$/) || [''])[0];
    const right = (body.slice(at + 1).match(/^[\w.$-]+/) || [''])[0];
    const token = left + right;
    out.push({
      at,
      token,
      inPre: pre.some((p) => at > p[0] && at < p[1]),
      knownToken: corpus.includes(token),
    });
    re.lastIndex = at + 1;
  }
  return out;
}

//  SECOND RULE, AND IT STANDS ON ITS OWN EVIDENCE.
//
//  JSON forbids a raw newline inside a string literal. One of this page's five
//  application/ld+json blocks carries exactly one and therefore does not parse,
//  so Google discards that whole block of structured data. The other four have
//  ZERO raw newlines, which is what says this one was injected rather than
//  authored: the convention on this page is minified single-line JSON.
//
//  The repair is the same deletion, and it is self-proving: the block must FAIL
//  to parse before and SUCCEED after. A block that does not parse for some other
//  reason is refused rather than guessed at.
function jsonNewlines(body) {
  const out = [];
  const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(body))) {
    const inner = m[1];
    const start = m.index + m[0].indexOf(inner);
    let parses = true;
    try { JSON.parse(inner); } catch (e) { parses = false; }
    if (parses) continue;
    const stripped = inner.replace(/\n/g, '');
    let fixes = true;
    try { JSON.parse(stripped); } catch (e) { fixes = false; }
    if (!fixes) { out.push({ unfixable: true, at: start }); continue; }
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '\n') out.push({ at: start + i, token: 'ld+json', json: true });
    }
  }
  return out;
}

function repair(body, corpus) {
  const problems = [];
  //  A body Cloudflare rewrote at render time must never be written back.
  const cf = sf.cloudflareRewritten(body);
  if (cf) return { problems: [cf] };
  const cands = candidates(body, corpus);
  const fix = [];
  const skip = [];

  for (const c of cands) {
    if (!c.inPre && c.knownToken) { fix.push(c); continue; }
    if (c.inPre && !c.knownToken) { skip.push(c); continue; }
    //  The two rules disagree. That is precisely the case a human decides.
    problems.push('the two rules disagree at byte ' + c.at + ' on token '
      + JSON.stringify(c.token) + ' (inPre=' + c.inPre + ', knownToken='
      + c.knownToken + '). Refusing rather than guessing.');
  }
  //  The ld+json rule, added to the same deletion list.
  for (const j of jsonNewlines(body)) {
    if (j.unfixable) {
      problems.push('an ld+json block at byte ' + j.at + ' does not parse and removing its '
        + 'newlines does not fix it, so the cause is something else. Refusing.');
      continue;
    }
    fix.push(j);
  }
  if (problems.length) return { problems };
  if (!fix.length) return { problems: ['nothing to repair: no split token found'] };

  //  Delete the newlines, highest offset first so earlier offsets stay valid.
  let out = body;
  for (const c of [...fix].sort((a, b) => b.at - a.at)) {
    if (out[c.at] !== '\n') { problems.push('offset ' + c.at + ' is not a newline'); break; }
    out = out.slice(0, c.at) + out.slice(c.at + 1);
  }
  if (problems.length) return { problems };

  //  PROVE ONLY THE DECLARED EDITS MOVED.
  //
  //  The first cut of this re-ran the same deletion loop into a second variable
  //  and compared the two. Mutation testing proved that hollow: both sides were
  //  the identical computation, so the comparison could never fail. Same call as
  //  scripts/cyber-cc-extra-practice.js made on 2026-09-02.
  //
  //  This is the honest version, and it is arrived at differently: strip EVERY
  //  newline from both bodies and require what is left to be identical. That is
  //  false the moment any non-newline byte moves, and it does not care where the
  //  edits were or how many there are.
  const strip = (s) => s.replace(/\n/g, '');
  if (strip(out) !== strip(body)) {
    problems.push('the repaired body differs from the live body somewhere other than a newline');
  }
  //  Every structured-data block must be valid after the edit. This is the
  //  ld+json rule proving itself rather than being taken on trust.
  for (const m2 of out.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m2[1]); }
    catch (e) { problems.push('an ld+json block still does not parse after the repair: ' + e.message); }
  }
  if (body.length - out.length !== fix.length) {
    problems.push('byte delta ' + (body.length - out.length) + ' does not equal the '
      + fix.length + ' newlines declared');
  }

  return { problems, after: out, fixed: fix, skipped: skip };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '\u{FEFF}';
function sheet(handle, bodyHtml) {
  const head = ['Handle', 'Command', 'Body HTML'].map(cell).join(',');
  const row = [handle, 'MERGE', bodyHtml].map(cell).join(',');
  return BOM + [head, row].join('\r\n') + '\r\n';
}

module.exports = { SIBLINGS, preSpans, candidates, repair, sheet };

if (require.main === module) {
  const [handle, out] = process.argv.slice(2);
  if (!handle) {
    console.error('usage: node scripts/csa-lesson-newline-repair.js <handle> [out.csv]');
    process.exit(2);
  }
  let corpus = '';
  for (const s of SIBLINGS) corpus += extract(sf.page('/pages/' + s).body);
  const body = extract(sf.page('/pages/' + handle).body);

  const r = repair(body, corpus);
  console.log('\nCSA LESSON NEWLINE REPAIR: ' + handle + '\n');
  console.log('  live body   : ' + body.length + ' bytes');
  console.log('  sibling corpus: ' + corpus.length + ' bytes from ' + SIBLINGS.length + ' pages\n');
  if (r.problems && r.problems.length) {
    console.error('  ' + r.problems.length + ' refused. No file written.\n');
    r.problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  for (const c of r.fixed) console.log('  repair  byte ' + String(c.at).padStart(6) + '  -> ' + JSON.stringify(c.token));
  for (const c of r.skipped) console.log('  leave   byte ' + String(c.at).padStart(6) + '  inside <pre>, a newline is content there');
  console.log('\n  repaired body: ' + r.after.length + ' bytes (' + (body.length - r.after.length) + ' newlines deleted)');
  if (out) {
    fs.writeFileSync(out, sheet(handle, r.after));
    console.log('  wrote ' + out + '  (1 row, MERGE, Body HTML only)\n');
  }
}
