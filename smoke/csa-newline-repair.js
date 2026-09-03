'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: deleting an injected newline must never join two things that belong
//  apart.
//
//  The repair is a deletion, which sounds safe and is not. `parameters` and
//  `public static double average(...)` are two lines of a code sample inside a
//  <pre>, and joining them would corrupt the lesson while every structural
//  check stayed green. So the generator requires TWO INDEPENDENT rules to agree
//  before it touches a byte, and this suite holds both of them.
//
//  The fixture is the real live body of ap-csa-lesson-1-9-method-signatures,
//  fetched 2026-09-03, carrying all 9 candidates: 7 corruptions and 2 that are
//  content.
//
//  Zero PII: public page markup only. No em-dashes, per repo convention.
//  Run: npm run smoke:csanewline
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const m = require('../scripts/csa-lesson-newline-repair');

let pass = 0, fail = 0;
function ok(c, label, detail) {
  if (c) { pass++; console.log('  [PASS] ' + label); }
  else { fail++; console.log('  [FAIL] ' + label + (detail ? '\n         ' + detail : '')); }
}

const BODY = fs.readFileSync(path.join(__dirname, 'fixtures', 'csa-1-9-live-body.html'), 'utf8');
//  A corpus that knows the course's tokens. Built from the fixture's own CSS and
//  script boilerplate rather than from a second file, so the suite stays offline.
const CORPUS = ['font-size', 'method', '.cm-variable-2', 'important', 'return', 'code.',
  'opt.getAttribute'].join(' ');

// ── 1. the two rules, and what each one alone would do ──────────────────────
console.log('\n1. two independent rules, and neither is trusted alone');
const cands = m.candidates(BODY, CORPUS);
ok(cands.length === 9, '1.1 the live body carries 9 newline-inside-a-word candidates ('
  + cands.length + ')');
const inPre = cands.filter((c) => c.inPre);
const unknown = cands.filter((c) => !c.knownToken);
ok(inPre.length === 2, '1.2 rule A (inside a <pre>) rejects exactly 2');
ok(unknown.length === 2, '1.3 rule B (token unknown to the corpus) rejects exactly 2');
ok(inPre.every((c) => !c.knownToken) && unknown.every((c) => c.inPre),
  '1.4 and they reject THE SAME 2, which is the only reason to believe either');
ok(inPre.map((c) => c.token).sort().join(',') === 'argumentsdouble,parameterspublic',
  '1.5 the rejected two join into non-words, so the signal is in the data not in a list',
  inPre.map((c) => c.token).join(','));

// ── 2. the repair itself ────────────────────────────────────────────────────
console.log('\n2. the repair deletes 7 newlines and nothing else');
const r = m.repair(BODY, CORPUS);
ok(!r.problems.length, '2.1 the live body is accepted', (r.problems || []).join('; '));
ok(r.fixed && r.fixed.length === 8, '2.2 eight repairs: 7 split tokens and 1 ld+json newline');
ok(r.skipped && r.skipped.length === 2, '2.3 two left alone');
ok(BODY.length - r.after.length === 8, '2.4 the body is exactly 8 bytes shorter');
ok(r.after.replace(/\n/g, '') === BODY.replace(/\n/g, ''),
  '2.5 with newlines ignored the two bodies are IDENTICAL, so only newlines moved');
for (const t of ['opt.getAttribute(', "return '';", 'the method is called', '.cm-variable-2']) {
  ok(r.after.includes(t), '2.6 the repaired body contains ' + JSON.stringify(t));
}
ok(r.after.includes('parameters\npublic static double'),
  '2.7 and the <pre> code sample still has its line break');

// ── 2b. the structured data, which was invalid on the live page ─────────────
console.log('\n2b. the ld+json rule, which stands on its own evidence');
const LD = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
function ld(html) {
  const out = [];
  let mm; LD.lastIndex = 0;
  while ((mm = LD.exec(html))) { try { JSON.parse(mm[1]); out.push(true); } catch (e) { out.push(false); } }
  return out;
}
const before = ld(BODY), after = ld(r.after);
ok(before.length === 5 && after.length === 5, '2b.1 five structured-data blocks, before and after');
ok(before.filter((x) => !x).length === 1,
  '2b.2 exactly ONE was invalid on the live page, so Google discarded it');
ok(before.filter((x) => x).length === 4,
  '2b.3 the other four parse, which is what says the newline was injected rather than authored');
ok(after.every((x) => x), '2b.4 all five parse after the repair');

// ── 3. the repaired page is actually runnable ───────────────────────────────
console.log('\n3. the repaired body is one a browser can run');
function faults(html) {
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
  let mm, n = 0;
  while ((mm = re.exec(html))) {
    if (/type\s*=\s*["'](?!text\/javascript|application\/javascript)/.test(mm[1])) continue;
    if (!mm[2].trim()) continue;
    try { new vm.Script(mm[2]); } catch (e) { n++; }
  }
  return n;
}
const ASI = /\.[A-Za-z_$][\w$]*[ \t]*\r?\n[ \t]*[A-Za-z_$][\w$]*\s*\(/;
ok(faults(BODY) === 1, '3.1 the LIVE body has 1 unparseable script block (the defect)');
ok(faults(r.after) === 0, '3.2 the repaired body has 0');
ok(ASI.test(BODY) === true, '3.3 the LIVE body has an ASI split, which node --check cannot see');
ok(ASI.test(r.after) === false, '3.4 the repaired body has none');

// ── 4. the refusals ─────────────────────────────────────────────────────────
console.log('\n4. what stops the sheet');
const disagree = m.repair(BODY, CORPUS + ' parameterspublic');
ok(disagree.problems && disagree.problems.some((p) => /rules disagree/.test(p)),
  '4.1 a corpus that vouches for a <pre> join makes the rules disagree, and that REFUSES',
  JSON.stringify((disagree.problems || []).slice(0, 1)));
ok(!disagree.after, '4.2 and no body is produced when they disagree');
const nothing = m.repair('<p>a clean page with no split token</p>', CORPUS);
ok(nothing.problems && nothing.problems.length, '4.3 a page with nothing to repair is refused, not shipped empty');

//  An ld+json block broken by something OTHER than a newline. Deleting newlines
//  cannot fix a trailing comma, so the rule has no business touching it, and
//  skipping it silently would ship a body whose structured data is still broken.
const BAD_JSON = '<script type="application/ld+json">{"a":1,}</script>';
const withBad = m.repair(BODY + BAD_JSON, CORPUS);
ok(withBad.problems && withBad.problems.some((p) => /does not parse and removing its/.test(p)),
  '4.4 an ld+json block that newline-removal cannot fix REFUSES the sheet',
  JSON.stringify((withBad.problems || []).slice(0, 2)));
ok(!withBad.after, '4.5 and no body is produced for it');

// ── 5. the sheet ────────────────────────────────────────────────────────────
console.log('\n5. the Matrixify sheet');
const csv = m.sheet('ap-csa-lesson-1-9-method-signatures', r.after);
ok(csv.charCodeAt(0) === 0xFEFF, '5.1 UTF-8 BOM');
ok(csv.split('\r\n').length === 3, '5.2 CRLF between records');
ok(/^﻿"Handle","Command","Body HTML"\r\n/.test(csv), '5.3 three columns, all quoted');
ok(!/Published At/i.test(csv), '5.4 NO Published At column, which would republish the page');
ok(csv.includes('"MERGE"'), '5.5 MERGE, so no unlisted column is erased');
//  Parse it back rather than trusting what was written.
const line = csv.replace(/^﻿/, '').split('\r\n')[1];
const out = [];
let cur = '', q = false;
for (let i = 0; i < line.length; i++) {
  const ch = line[i];
  if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
  else if (ch === '"') q = true;
  else if (ch === ',') { out.push(cur); cur = ''; }
  else cur += ch;
}
out.push(cur);
ok(out[2] === r.after, '5.6 the Body HTML parsed back out of the CSV is byte-identical to the repair');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
