'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIFT AN ANALYSIS ACTIVITY OUT OF ITS PAGE BODY AND INTO A SERVER SPEC.
//
//  The AP Cyber 1.1 lab kept four email specimens, six answer fields each, AND
//  the answer key in the Shopify page body. Two consequences, both live until
//  this ran: a teacher's lock could not withhold any of it, because the browser
//  had the whole activity before any server code ran; and `senderKey`,
//  `impactKey` and the rest were readable in View Source.
//
//  WHY THIS IS A SCRIPT AND NOT A HAND-WRITTEN JSON FILE
//  Retyping is how two copies of the same content drift, and this repo has paid
//  for that twice (site 3.3 and 3.4 became each other's CED topics). Every
//  string below is PARSED out of the authored page, so the spec cannot disagree
//  with what students have been reading. The parse is strict: anything it cannot
//  find is an error, never a silent default, because a quietly missing specimen
//  would ship as a shorter lab.
//
//  Run: node scripts/extract-analysis-spec.js [--check]
//    --check  parse and diff against the committed spec without writing
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

//  THE FIXTURE, NOT backup/. Checked 2026-09-07: backup/ is STALE. Its field 4
//  is "Attack Classification" with phishing/spear/whaling options, and the live
//  page has replaced it with "Victim Impact Category" and the CED impact
//  categories. Extracting from the backup produced a spec whose specimen 4
//  answer was 'bec', a value no dropdown on the live page offers, and the spec
//  validator refused it. That refusal is the only reason this was noticed.
//
//  The fixture's answers object is byte identical to the live page's, verified
//  by md5. The only difference anywhere in the activity subtree is that
//  Cloudflare rewrites the From: and To: addresses on live into
//  __cf_email__ placeholders, so the fixture is the un-obfuscated source and the
//  live page is the obfuscated rendering of it.
const SRC = path.join(__dirname, '..', 'smoke', 'fixtures', 'ap-cyber-unit-1-lesson-1-lab.admin-body.html');
const OUT = path.join(__dirname, '..', 'config', 'analysis', 'ap-cybersecurity-1.1-lab.json');

const html = fs.readFileSync(SRC, 'utf8');
const die = (m) => { console.error('extract failed: ' + m); process.exit(1); };

//  ── the answer key ─────────────────────────────────────────────────────────
//  Evaluated rather than regexed field by field: it is a JS object literal in
//  the page, and re-implementing a JS parser to read it would be a second thing
//  that can be wrong. Nothing else from the page is executed.
const ansSrc = (html.match(/var answers = (\{[\s\S]*?\n  \};)/) || [])[1];
if (!ansSrc) die('could not find the answers object');
// eslint-disable-next-line no-new-func
const answers = new Function('return ' + ansSrc.replace(/;$/, ''))();
if (Object.keys(answers).length !== 4) die(`expected 4 answer sets, found ${Object.keys(answers).length}`);

//  ── the six fields, and the two option lists ───────────────────────────────
//  Read from specimen 1's markup, then ASSERTED identical on 2 to 4 below, so a
//  spec that says "these six fields" is true of every specimen rather than of
//  the first one.
function fieldsFrom(section, n) {
  const out = [];
  const re = /<div class="analysis-field[^"]*">\s*<label>([^<]+)<\/label>\s*([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(section))) {
    const label = m[1].trim();
    const ctrl = m[2];
    const idm = ctrl.match(/id="e\d-([a-z]+)"/);
    if (!idm) die(`field "${label}" in specimen ${n} has no id`);
    const key = idm[1];
    if (/<select/.test(ctrl)) {
      const opts = [...ctrl.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)]
        .filter((o) => o[1] !== '')
        .map((o) => ({ value: o[1], label: o[2].trim() }));
      if (!opts.length) die(`select ${key} has no options`);
      out.push({ key, label, kind: 'select', options: opts });
    } else {
      const ph = (ctrl.match(/placeholder="([^"]*)"/) || [])[1] || '';
      const rows = Number((ctrl.match(/rows="(\d+)"/) || [])[1] || 2);
      out.push({ key, label, kind: 'text', placeholder: ph, rows });
    }
  }
  if (out.length !== 6) die(`expected 6 fields in specimen ${n}, found ${out.length}`);
  return out;
}

//  ── the four specimens ─────────────────────────────────────────────────────
const specimens = [];
let fields = null;
for (let n = 1; n <= 4; n++) {
  const start = html.indexOf(`<div class="lab-section" id="email${n}-section">`);
  if (start < 0) die(`no section for specimen ${n}`);
  const endMark = n < 4 ? `<div class="lab-section" id="email${n + 1}-section">` : '<div class="results-panel"';
  let end = html.indexOf(endMark, start);
  if (end < 0) end = html.indexOf('<script>', start);
  const sec = html.slice(start, end);

  const h2 = (sec.match(/<h2>([^<]+)<\/h2>/) || [])[1];
  if (!h2) die(`specimen ${n} has no heading`);
  const difficulty = (h2.match(/Difficulty:\s*(.+)$/) || [])[1];
  if (!difficulty) die(`specimen ${n} heading has no difficulty: ${h2}`);

  const barTitle = (sec.match(/<span class="email-bar-title">([^<]+)<\/span>/) || [])[1];
  if (!barTitle) die(`specimen ${n} has no email bar title`);

  const metaBlock = (sec.match(/<div class="email-meta">([\s\S]*?)<\/div>/) || [])[1];
  if (!metaBlock) die(`specimen ${n} has no meta block`);
  const meta = [...metaBlock.matchAll(/<strong>([^<]+):<\/strong>\s*([^<]+?)\s*(?:<br>|$)/g)]
    .map((m2) => ({ label: m2[1].trim(), value: m2[2].trim() }));
  if (meta.length < 4) die(`specimen ${n} meta has ${meta.length} rows, expected at least 4`);

  const bodyBlock = (sec.match(/<div class="email-body">([\s\S]*?)<\/div>/) || [])[1];
  if (!bodyBlock) die(`specimen ${n} has no body`);
  //  Paragraphs become a TOKEN LIST rather than raw HTML, so the player renders
  //  structured data and never injects author markup into the page. Four inline
  //  forms occur across the four specimens and each gets a token; anything else
  //  is an error rather than a passthrough, because a passthrough is how raw
  //  HTML from a content file ends up in innerHTML.
  const body = [...bodyBlock.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((p) => {
    const src = p[1];
    const toks = [];
    let i = 0;
    const pushText = (t) => { if (t) toks.push({ t: 'text', v: t }); };
    const INLINE = /<span class="e-link" title="Hover:\s*([^"]+)">([^<]*)<\/span>|<span class="e-bold">([^<]*)<\/span>|<em>([^<]*)<\/em>|<br\s*\/?>/g;
    let m;
    while ((m = INLINE.exec(src))) {
      pushText(src.slice(i, m.index));
      if (m[2] !== undefined && m[1] !== undefined) toks.push({ t: 'link', v: m[2], href: m[1] });
      else if (m[3] !== undefined) toks.push({ t: 'bold', v: m[3] });
      else if (m[4] !== undefined) toks.push({ t: 'em', v: m[4] });
      else toks.push({ t: 'br' });
      i = m.index + m[0].length;
    }
    pushText(src.slice(i));
    //  Nothing may survive as markup. A tag reaching this line means the list
    //  above is incomplete and the spec would carry HTML the player cannot
    //  safely render.
    for (const tk of toks) {
      if (tk.v && /<[a-z/]/i.test(tk.v)) {
        die(`specimen ${n} paragraph carries unhandled markup: ${tk.v.slice(0, 80)}`);
      }
    }
    return { tokens: toks };
  });
  if (!body.length) die(`specimen ${n} body has no paragraphs`);

  const f = fieldsFrom(sec, n);
  if (!fields) fields = f;
  else if (JSON.stringify(f.map((x) => [x.key, x.kind])) !== JSON.stringify(fields.map((x) => [x.key, x.kind]))) {
    die(`specimen ${n} does not have the same six fields as specimen 1`);
  }

  const a = answers[n];
  if (!a) die(`no answer set for specimen ${n}`);
  specimens.push({ n, difficulty, bar_title: barTitle, meta, body, answer: a });
}

//  ── the grading thresholds, read from the grader rather than assumed ───────
const thresholds = {};
for (const m of html.matchAll(/var (\w+)Val = document\.getElementById\(prefix \+ '(\w+)'\)\.value\.trim\(\);\s*\n\s*if\(\w+Val\.length > (\d+)/g)) {
  thresholds[m[2]] = Number(m[3]);
}
for (const f of fields) {
  if (f.kind === 'text' && !(f.key in thresholds)) die(`no length threshold found for text field ${f.key}`);
  if (f.kind === 'text') f.min_length = thresholds[f.key];
}

//  ── the feedback strings ───────────────────────────────────────────────────
//  Pulled out of the grader rather than retyped, so the server says exactly what
//  the page has been saying. Two fields both report as "Impact:" today, which is
//  a cosmetic bug in the authored page; it is carried across UNCHANGED, because
//  a migration that also edits copy cannot be verified as a migration.
const graderSrc = html.slice(html.indexOf('window.checkEmail'));
for (const f of fields) {
  //  BOUNDED at the next field's read, not at a fixed character count. A 900
  //  character window bled into the following block, so the select's "+1 pt "
  //  push overwrote this field's "+1 pt Correct identification." with an empty
  //  string and the check below then reported a missing string that was there.
  const from = graderSrc.indexOf(`prefix + '${f.key}'`);
  if (from < 0) die(`grader never reads field ${f.key}`);
  const nextRead = graderSrc.indexOf("prefix + '", from + 12);
  const blk = graderSrc.slice(from, nextRead > 0 ? nextRead : graderSrc.indexOf('scores[num]', from));
  const pushes = [...blk.matchAll(/details\.push\('<strong>([^<]+):<\/strong> ([^']*)'(?:\s*\+\s*([^;]+?))?\);/g)];
  if (!pushes.length) die(`no feedback strings found for field ${f.key}`);
  const label = pushes[0][1];
  const fb = { label };
  if (f.kind === 'select') {
    //  A select says the same thing right or wrong: the explanation IS the
    //  feedback. Which answer key holds it is read from the source expression.
    const why = (pushes[0][3] || '').trim().replace(/^a\./, '');
    if (!why) die(`select ${f.key} feedback names no explanation key`);
    fb.explanation_key = why;
  } else {
    for (const p of pushes) {
      const tail = (p[3] || '').trim();
      if (/\+1 pt/.test(p[2])) fb.correct = p[2].replace(/^\+1 pt\s*[^ ]?\s*/, '').trim();
      else if (/No analysis provided|No response provided/.test(p[2])) fb.empty = p[2].replace(/^0 pts\s*[^ ]?\s*/, '').trim();
      else {
        fb.wrong_prefix = p[2].replace(/^0 pts\s*[^ ]?\s*/, '').trim();
        fb.wrong_from = /slice\(0,\s*2\)/.test(tail) ? 'first2' : 'first';
      }
    }
    for (const k of ['correct', 'empty', 'wrong_prefix']) {
      if (!fb[k]) die(`text field ${f.key} has no ${k} feedback string`);
    }
  }
  f.feedback = fb;
}

//  ── the closing messages, which are part of the activity ───────────────────
const bands = [...html.matchAll(/total >= (\d+)\) msg = '((?:[^'\\]|\\.)*)'/g)]
  .map((m) => ({ at_least: Number(m[1]), message: m[2].replace(/\\u2014/g, '—').replace(/\\'/g, "'") }));
const fallback = (html.match(/else msg = '((?:[^'\\]|\\.)*)'/) || [])[1];
if (bands.length !== 3 || !fallback) die(`expected 3 score bands and a fallback, found ${bands.length}`);
bands.push({ at_least: 0, message: fallback.replace(/\\'/g, "'") });

const perSpecimen = fields.length;
const spec = {
  _comment: 'GENERATED by scripts/extract-analysis-spec.js from backup/ap-cyber-unit-1-lesson-1-lab.html. '
    + 'Do not hand edit: run the script with --check to prove this file still matches the authored page.',
  course: 'ap-cybersecurity',
  item_id: '1.1-lab',
  unit: 'unit-1',
  lesson_id: '1.1',
  item_type: 'lab',
  activity_aliases: ['lab', 'terminal-lab'],
  page_handle: 'ap-cyber-unit-1-lesson-1-lab',
  title: 'Phishing Email Analysis Lab',
  points: perSpecimen * specimens.length,
  points_per_specimen: perSpecimen,
  fields,
  specimens,
  score_bands: bands.sort((a, b) => b.at_least - a.at_least),
};

const json = JSON.stringify(spec, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== json) { console.error('config/analysis/ap-cybersecurity-1.1-lab.json is stale or hand edited. Re-run without --check.'); process.exit(1); }
  console.log('spec matches the authored page');
  process.exit(0);
}
fs.writeFileSync(OUT, json);
console.log(`wrote ${OUT}`);
console.log(`  ${specimens.length} specimens, ${perSpecimen} fields each, ${spec.points} points`);
console.log(`  text thresholds: ${JSON.stringify(thresholds)}`);
console.log(`  score bands: ${spec.score_bands.map((b) => b.at_least).join(', ')}`);
