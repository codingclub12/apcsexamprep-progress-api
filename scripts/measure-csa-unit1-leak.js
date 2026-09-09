'use strict';
// -----------------------------------------------------------------------------
//  HOW MUCH OF THE AP CSA UNIT 1 ANSWER KEY IS READABLE FROM THE PAGE SOURCE.
//
//  Reads the STORED body of every Unit 1 page through lib/storefront-fetch.js
//  and counts what lib/answer-leak.js finds. Both of those are deliberate:
//
//    the stored body   /pages/<handle>.json, not the rendered page. The rendered
//                      route has two failure modes this repo has already been
//                      burned by, and neither is needed to answer this question.
//    the module        never a pasted pattern. The comment channel is exactly
//                      what a pasted `data-answer` sweep misses, and missing it
//                      would report the page fixed while its key is still in it.
//
//  ALL FOUR PAGE TYPES ARE FETCHED, not just the lesson. The debug, exercise-1
//  and frq pages are graded by running Java rather than by a letter key, so they
//  should carry nothing, and a measurement that only looks where it expects to
//  find something cannot tell you that. Their zero is a result.
//
//    node scripts/measure-csa-unit1-leak.js
//    node scripts/measure-csa-unit1-leak.js --json docs/evidence/out.json
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const leak = require('../lib/answer-leak');

//  The fifteen Unit 1 lessons of the 2025-2026 four-unit CED, in lesson order.
const LESSONS = [
  '1-1-intro-algorithms', '1-2-variables-data-types', '1-3-expressions-assignment',
  '1-4-assignment-statements-input', '1-5-casting-range', '1-6-compound-assignment',
  '1-7-api-libraries', '1-8-documentation-comments', '1-9-method-signatures',
  '1-10-calling-class-methods', '1-11-math-class', '1-12-objects-instances',
  '1-13-object-creation', '1-14-calling-instance-methods', '1-15-string-manipulation',
];
const SUFFIXES = ['', '-debug', '-exercise-1', '-frq'];

function measure() {
  const rows = [];
  for (const slug of LESSONS) {
    for (const suffix of SUFFIXES) {
      const handle = 'ap-csa-lesson-' + slug + suffix;
      const row = { handle, kind: suffix ? suffix.slice(1) : 'lesson', lesson: slug.split('-').slice(0, 2).join('.') };
      try {
        const page = sf.pageBody(handle);
        const s = leak.summarize(page.body_html);
        row.bytes = page.body_html.length;
        row.updated_at = page.updated_at;
        row.total = s.total;
        row.graded = s.graded;
        row.byRule = s.byRule;
        //  The disclosed values themselves are NOT written out. This repo is
        //  public, so a report carrying the key would republish it somewhere
        //  that outlives the fix. Counts and locations are what a fix needs.
        row.lines = s.findings.map((f) => f.line);
        //  A padded key is a different defect that this sweep happens to be
        //  standing in front of: the page compares `data-answer` to the option
        //  letter with ===, so whitespace in the attribute means NO option can
        //  ever match and the item scores 0 for everyone. Reported by item id
        //  because that id is a gradebook column.
        row.padded = s.findings.filter((f) => f.padded).map((f) => f.item_id || ('line ' + f.line));
        row.items = [...new Set(s.findings.map((f) => f.item_id).filter(Boolean))];
      } catch (e) {
        row.error = String(e.message).slice(0, 200);
      }
      rows.push(row);
    }
  }
  return rows;
}

function totals(rows) {
  const t = { pages: rows.length, errored: 0, leaking: 0, total: 0, graded: 0, byRule: {}, byKind: {} };
  for (const r of rows) {
    if (r.error) { t.errored++; continue; }
    t.byKind[r.kind] = t.byKind[r.kind] || { pages: 0, leaking: 0, total: 0 };
    t.byKind[r.kind].pages++;
    if (r.total > 0) { t.leaking++; t.byKind[r.kind].leaking++; }
    t.total += r.total;
    t.graded += r.graded;
    t.byKind[r.kind].total += r.total;
    for (const k in r.byRule) t.byRule[k] = (t.byRule[k] || 0) + r.byRule[k];
  }
  return t;
}

function main() {
  const argv = process.argv.slice(2);
  const jsonAt = argv.indexOf('--json') >= 0 ? argv[argv.indexOf('--json') + 1] : null;
  const rows = measure();
  const t = totals(rows);

  console.log('\nAP CSA UNIT 1: ANSWER KEY READABLE FROM PAGE SOURCE');
  console.log('measured ' + new Date().toISOString() + ' against the stored body of ' + t.pages + ' pages\n');
  console.log('  ' + 'handle'.padEnd(48) + 'kind'.padEnd(11) + 'total'.padStart(6) + 'graded'.padStart(8) + '  rules');
  for (const r of rows) {
    if (r.error) { console.log('  ' + r.handle.padEnd(48) + 'ERROR      ' + r.error); continue; }
    if (!r.total) continue;
    const rules = Object.entries(r.byRule).map(([k, v]) => k.replace('-answer-attribute', '').replace('answer-', '') + ':' + v).join(' ');
    console.log('  ' + r.handle.padEnd(48) + r.kind.padEnd(11) + String(r.total).padStart(6) + String(r.graded).padStart(8) + '  ' + rules);
  }

  console.log('\n  pages carrying a readable key: ' + t.leaking + ' of ' + (t.pages - t.errored));
  for (const kind of Object.keys(t.byKind)) {
    const k = t.byKind[kind];
    console.log('    ' + kind.padEnd(11) + k.leaking + ' of ' + k.pages + ' pages, ' + k.total + ' disclosures');
  }
  const padded = rows.filter((r) => r.padded && r.padded.length);
  if (padded.length) {
    console.log('\n  UNGRADEABLE ITEMS: a data-answer padded with whitespace never === the option letter,');
    console.log('  so no student can be marked correct and the reporter posts 0 into the gradebook.');
    for (const r of padded) console.log('    ' + r.handle + '  ' + r.padded.join(', '));
  }

  console.log('\n  disclosures: ' + t.total + ', of which ' + t.graded + ' sit on an item that reports a grade');
  for (const rule of leak.RULES) console.log('    ' + rule.padEnd(26) + (t.byRule[rule] || 0));
  if (t.errored) console.log('\n  ' + t.errored + ' pages could not be read');

  if (jsonAt) {
    fs.mkdirSync(path.dirname(jsonAt), { recursive: true });
    fs.writeFileSync(jsonAt, JSON.stringify({ measured_at: new Date().toISOString(), totals: t, rows }, null, 2) + '\n');
    console.log('\n  wrote ' + jsonAt);
  }
  console.log('');
  return t;
}

if (require.main === module) main();
module.exports = { LESSONS, SUFFIXES, measure, totals };
