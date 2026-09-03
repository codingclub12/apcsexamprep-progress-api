'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A STRAY QUOTE INSIDE A JS STRING LITERAL KILLS THE WHOLE <script> BLOCK.
//
//  Board 174 proved the shape on ap-csp-filtering-sorting-practice: an option
//  string written as a JS/JSON string literal contains an UNESCAPED `"` around
//  a quoted field value, e.g. `"(evType = "workshop") AND ..."`. The parser
//  reads the first embedded `"` as the string's own close, and everything after
//  it is a SyntaxError. The block does not partially work; it does not run at
//  all, so FS_QUESTIONS (or var EX) is never defined.
//
//  ── THE RULE ────────────────────────────────────────────────────────────────
//  A quote is STRAY, not a real string delimiter, if closing the string there
//  would leave the surrounding JSON/JS-object structure invalid: the next
//  non-whitespace character has to be one of `,` `}` `]` `:` for a close to be
//  real. Anything else (a letter, a paren, another quote used as a second
//  literal) means the quote was meant to be CONTENT, not a delimiter, and it is
//  escaped to `\"` in place. Single-quoted strings are tracked too, so their
//  own already-escaped double quotes (a CSS attribute selector inside a JS
//  string, e.g. `'input[name=\"opt-'+qid+'\"]'`) are walked over rather than
//  misread as the start of a new double-quoted string.
//
//  This is structural, not semantic, on purpose, the same reason board 177's
//  fix used tag POSITION rather than payload content: a rule that has to guess
//  what an author meant is a rule that guesses wrong on the next page. Here the
//  structure is unambiguous because the content is JSON-shaped even though it
//  ships as a JS literal, and closing early is never valid there.
//
//  ── WHAT THIS DOES NOT DO ──────────────────────────────────────────────────
//  It never touches a character outside a double-quoted string, so a plain
//  answer key (`var ANS={w5q1:"B",...}`) round-trips as a no-op. It never
//  authors new text: every escape is a backslash inserted before a quote mark
//  that was already there, so the rendered/read text is byte-identical to what
//  was already on the page, letter for letter. That is what makes this a
//  repair and not an edit: rule 2 in the house brief draws exactly this line.
//
//  ── LESSON-5 ALSO CARRIES BOARD 177's DEFECT ───────────────────────────────
//  ap-cyber-unit-5-lesson-5 has both faults: unescaped quotes in var EX (w5q2,
//  w5q7) AND unescaped example <script> tags inside <code>/<pre> that the HTML
//  parser BUILDS rather than displays (board 177/178). The second fix already
//  exists, reviewed and shipped on two other pages, in
//  scripts/cyber-xss-example-escape.js. This module calls that one rather than
//  writing a second opinion about the same rule: repair() from that file runs
//  first (disjoint region: scattered <code>/<pre> spans elsewhere on the page,
//  proven not to overlap the var EX block except where var EX ITSELF quotes an
//  example `<code><script></code>` fragment, which that tool's position rule
//  already reaches correctly), then escapeStrayQuotes() runs on the resulting
//  var ANS/EX block.
//
//  ── WHERE THE BODY COMES FROM ──────────────────────────────────────────────
//  lib/storefront-fetch.js's pageBody(), never the rendered route: two of these
//  four pages answer Cloudflare-rewritten on render (see that function's own
//  comment), and this generator must never write one of those back.
//
//  Usage: node scripts/cyber-quote-escape-pages.js <out.csv>
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const vm = require('vm');
const sf = require('../lib/storefront-fetch');
const xss = require('./cyber-xss-example-escape');

//  ── THE ESCAPER ─────────────────────────────────────────────────────────────
//  mode tracks which kind of string we are inside, if any. Only 'dquote' ever
//  triggers an edit; 'squote' exists purely so its content (including anything
//  that looks like a double quote) is walked over rather than reinterpreted.
function escapeStrayQuotes(src) {
  let out = '';
  let mode = 'none'; // none | dquote | squote
  let escapedCount = 0;
  const isCloser = (ch) => ch === ',' || ch === '}' || ch === ']' || ch === ':';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (mode === 'none') {
      if (c === '"') { mode = 'dquote'; out += c; continue; }
      if (c === "'") { mode = 'squote'; out += c; continue; }
      out += c; continue;
    }
    if (mode === 'squote') {
      if (c === '\\' && i + 1 < src.length) { out += c + src[i + 1]; i++; continue; }
      if (c === "'") { mode = 'none'; out += c; continue; }
      out += c; continue;
    }
    // mode === 'dquote'
    if (c === '\\' && i + 1 < src.length) { out += c + src[i + 1]; i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j])) j++;
      const next = src[j];
      if (next === undefined || isCloser(next)) { mode = 'none'; out += c; continue; }
      out += '\\"';
      escapedCount++;
      continue;
    }
    out += c;
  }
  return { out, escapedCount, endedClean: mode === 'none' };
}

//  Bounds the single <script>...</script> element that defines `marker`
//  (`var FS_QUESTIONS` or `var ANS`). Throws rather than guessing if the page
//  does not have the shape this rule expects.
function findScript(body, marker) {
  const at = body.indexOf(marker);
  if (at < 0) throw new Error('no ' + JSON.stringify(marker) + ' on this page');
  const scriptStart = body.lastIndexOf('<script', at);
  if (scriptStart < 0) throw new Error(marker + ' is not inside any <script> tag');
  const openEnd = body.indexOf('>', scriptStart) + 1;
  const closeStart = body.indexOf('</script>', at);
  if (closeStart < 0) throw new Error(marker + '\'s <script> never closes');
  return { openEnd, closeStart, inner: body.slice(openEnd, closeStart) };
}

//  PROVE ONLY QUOTES MOVED: walk `before` and `after` in lockstep and require
//  every divergence to be exactly `"` -> `\"`. Anything else refuses rather
//  than trusting the escaper's own bookkeeping; this is a second, independent
//  read of the same claim, one character at a time.
function onlyQuotesChanged(before, after) {
  let i = 0, j = 0, n = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) { i++; j++; continue; }
    if (before[i] === '"' && after[j] === '\\' && after[j + 1] === '"') { n++; i += 1; j += 2; continue; }
    return { ok: false, at: i, escaped: n, why: 'mismatch' };
  }
  if (i !== before.length || j !== after.length) return { ok: false, at: i, escaped: n, why: 'length' };
  return { ok: true, escaped: n };
}

//  Fixes the stray quotes inside ONE page's var FS_QUESTIONS / var ANS+EX
//  block and proves the rest of the body did not move.
function repairQuotesOnly(handle, body, marker) {
  const span = findScript(body, marker);
  const fix = escapeStrayQuotes(span.inner);
  if (!fix.endedClean) return { problems: ['escaper ended inside a string, refusing: the block is not JSON-shaped the way this rule expects'] };
  const after = body.slice(0, span.openEnd) + fix.out + body.slice(span.closeStart);
  const proof = onlyQuotesChanged(span.inner, fix.out);
  if (!proof.ok) return { problems: ['escaped span does not round-trip to only-quotes-changed at offset ' + proof.at] };
  let parses = true, err = '';
  try { new vm.Script(fix.out, { filename: handle + '.js' }); } catch (e) { parses = false; err = e.message; }
  if (!parses) return { problems: ['still does not parse after the escape: ' + err] };
  return { after, escapedCount: fix.escapedCount };
}

//  lesson-5 carries both defects. Run the reviewed board-177 fix first (a
//  disjoint region), then the quote fix on its output.
function repairLesson5(handle, body) {
  const cf = sf.cloudflareRewritten(body);
  if (cf) return { problems: [cf] };
  const r1 = xss.repair(handle, body);
  if (r1.skip) return { problems: [r1.skip] };
  if (!r1.after) return { problems: (r1.problems || []).concat('board-177 escape produced no body') };
  const body1 = r1.after;
  const r2 = repairQuotesOnly(handle, body1, 'var ANS');
  if (r2.problems) return { problems: r2.problems };
  //  Confirm the combined result actually finishes: zero unparseable blocks,
  //  zero example payloads still running inside a <code>/<pre>. Recomputed
  //  fresh from the final body rather than trusted from either step alone.
  const elements = xss.elements(r2.after);
  const badAfter = elements.filter((e) => e.unparseable).length;
  const tags = xss.scopedTags(r2.after);
  const stillExecuting = elements.filter((e) => e.runs && tags.some((t) => t.at === e.at)).length;
  if (badAfter || stillExecuting) {
    return { problems: [badAfter + ' unparseable block(s), ' + stillExecuting + ' still-executing example(s) after both fixes'] };
  }
  return { after: r2.after, escapedCount: r2.escapedCount, tagsEscaped: r1.escaped, executing: r1.executing };
}

const TARGETS = [
  { handle: 'ap-csp-filtering-sorting-practice', marker: 'var FS_QUESTIONS', kind: 'quotes' },
  { handle: 'ap-cyber-unit-5-lesson-4', marker: 'var ANS', kind: 'quotes' },
  { handle: 'ap-cyber-unit-5-lesson-5', marker: 'var ANS', kind: 'lesson5' },
  { handle: 'ap-cyber-unit-5-lesson-6', marker: 'var ANS', kind: 'quotes' },
];

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '\u{FEFF}';
function sheet(rows) {
  const head = ['Handle', 'Command', 'Body HTML'].map(cell).join(',');
  const body = rows.map((r) => [r.handle, 'MERGE', r.body].map(cell).join(','));
  return BOM + [head, ...body].join('\r\n') + '\r\n';
}

function runOne(t) {
  const page = sf.pageBody(t.handle);
  const body = page.body_html;
  const result = t.kind === 'lesson5' ? repairLesson5(t.handle, body) : repairQuotesOnly(t.handle, body, t.marker);
  return Object.assign({ handle: t.handle, before: body }, result);
}

module.exports = { escapeStrayQuotes, findScript, onlyQuotesChanged, repairQuotesOnly, repairLesson5,
  TARGETS, sheet, runOne };

if (require.main === module) {
  const out = process.argv[2];
  const rows = [];
  const held = [];
  console.log('\nUNESCAPED QUOTE REPAIR: CSP filtering/sorting + AP Cyber Unit 5 lessons 4/5/6\n');
  for (const t of TARGETS) {
    let r;
    try { r = runOne(t); }
    catch (e) { console.log('  ERROR   ' + t.handle.padEnd(38) + e.message); held.push(t.handle); continue; }
    if (r.problems) {
      console.log('  HOLD    ' + t.handle.padEnd(38) + r.problems.join('; '));
      held.push(t.handle);
      continue;
    }
    const extra = r.tagsEscaped ? (', ' + r.tagsEscaped + ' example <script> tag(s) escaped, '
      + r.executing + ' payload(s) neutralised') : '';
    console.log('  repair  ' + t.handle.padEnd(38) + r.escapedCount + ' quote(s) escaped' + extra);
    rows.push({ handle: t.handle, body: r.after });
  }
  if (held.length) console.log('\n  ' + held.length + ' page(s) HELD: ' + held.join(', '));
  if (!rows.length) { console.error('\n  nothing to repair.\n'); process.exit(1); }
  if (out) {
    fs.writeFileSync(out, sheet(rows));
    console.log('\n  wrote ' + out + '  (' + rows.length + ' rows, MERGE, Body HTML only)\n');
  }
}
