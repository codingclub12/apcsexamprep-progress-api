'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CYBER PRACTICE EXAM PAGE CLAIMS AN EXAM FORMAT THAT DOES NOT EXIST.
//
//  Read from the actual CED (ap-cybersecurity-course-and-exam-description.pdf,
//  the file config/ced-sources.json already watches, page 147):
//
//    Section I   60 multiple-choice questions
//    Section II  ONE free-response question, "Device Security Analysis",
//                50 minutes, six sources from a single device, parts A to E.
//                Skill Categories 2 and 3 only.
//
//  The page says 40 MCQ and 3 FRQs, calls itself "Full-Length", and repeats
//  that shape in the hero, the intro, two JSON-LD blocks and an Article
//  headline that search engines read as fact.
//
//  WHAT THIS DOES AND DOES NOT CHANGE
//  It does NOT invent 20 more questions or rewrite the three FRQs. The page
//  has what it has. What changes is the CLAIM: it stops presenting its own
//  shape as the exam's shape, states the real format once and plainly, and
//  describes itself accurately as a practice set. A student using this to plan
//  their exam day is currently being told the wrong section sizes.
//
//  Also fixed: the SEO description metafield says "Free AP CSA practice exam"
//  on a Cybersecurity page. Wrong course, on the tag Google shows.
//
//  Run: node scripts/cyber-practice-exam-truth.js <live-body.html> <out.csv>
//  Get the body from the Shopify Admin API, never from the rendered page.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');

const HANDLE = 'ap-cybersecurity-practice-exam';
const PUBLISHED_AT = '2026-03-01 12:00:00';

const SEO_TITLE = 'AP Cybersecurity Practice Exam | 40 MCQ + 3 Free Response';
const SEO_DESC = 'Free AP Cybersecurity practice questions with instant scoring and '
  + 'explanations, plus how the real exam is built: 60 MCQ and one Device Security Analysis.';

// Each entry is [exact live string, replacement, label]. Exact strings only:
// a fuzzy match on a 119 KB page is how you silently edit the wrong sentence.
const EDITS = [
  ['40 MCQ + 3 FRQ | All 5 Units | Interactive Scoring + Timer',
   '40 practice MCQ + 3 free-response sets | All 5 Units | Interactive Scoring + Timer',
   'file header comment'],

  ['This practice exam contains 40 multiple choice questions and 3 free response questions, covering all 5 units of the AP Cybersecurity course framework. The exam is designed to simulate a realistic AP Cybersecurity Exam experience with scenario-based questions and detailed explanations.',
   'This practice set contains 40 multiple choice questions and 3 free-response practice questions, covering all 5 units of the AP Cybersecurity course framework. The real AP Cybersecurity Exam is built differently: 60 multiple choice questions in Section I, and a single free-response question in Section II called Device Security Analysis, with a suggested time of 50 minutes.',
   'FAQ: how many questions'],

  ['Yes. This full-length practice exam is completely free. It includes 40 interactive MCQs with instant scoring and detailed explanations, plus 3 FRQs with sample responses. No account or payment required.',
   'Yes, completely free. It includes 40 interactive MCQs with instant scoring and detailed explanations, plus 3 free-response practice questions with sample responses. No account or payment required.',
   'FAQ: is it free'],

  ['"headline": "AP Cybersecurity Practice Exam: Full-Length 40 MCQ + 3 FRQ with Answers (2026-2027)", "description": "Take a full-length AP Cybersecurity practice exam with 40 multiple choice questions and 3 free response questions covering all 5 units. Interactive scoring, detailed explanations, and exam tips. Free and aligned to the College Board framework."',
   '"headline": "AP Cybersecurity Practice Exam: 40 MCQ + 3 Free Response with Answers (2026-2027)", "description": "Practise 40 scenario-based AP Cybersecurity multiple choice questions and 3 free-response questions across all 5 units, with interactive scoring and explanations. Includes how the real exam is built: 60 MCQ and one Device Security Analysis."',
   'Article JSON-LD'],

  ['<div class="pq-hero-badge">Full-Length Exam · 40 MCQ + 3 FRQ</div>',
   '<div class="pq-hero-badge">Practice Set · 40 MCQ + 3 Free Response</div>',
   'hero badge'],

  ['<p class="pq-hero-sub">A complete practice exam covering all 5 units with 40 scenario-based multiple choice questions and 3 free response questions. Interactive scoring with detailed explanations for every question.</p>',
   '<p class="pq-hero-sub">Forty scenario-based multiple choice questions and three free-response questions across all 5 units, with interactive scoring and an explanation for every question.</p>',
   'hero subtitle'],

  ['<p>This practice exam simulates the AP Cybersecurity Exam experience with <strong>40 multiple choice questions</strong> (Section 1) and <strong>3 free response questions</strong> (Section 2). Questions are distributed across all five course units and test the three core skill categories: Analyze Risk, Mitigate Risk, and Detect Attacks.</p>',
   '<p>This set gives you <strong>40 multiple choice questions</strong> and <strong>3 free-response questions</strong>, distributed across all five course units and testing the three skill categories: Analyze Risk, Mitigate Risk, and Detect Attacks.</p>\n'
   + '<div class="pq-format-note">'
   + '<p><strong>How the real exam is built.</strong> Worth knowing before you plan your timing, because this practice set is deliberately shaped for study rather than as a replica:</p>'
   + '<ul>'
   + '<li><strong>Section I:</strong> 60 multiple choice questions. All five units. Each skill category carries 25 to 40 percent.</li>'
   + '<li><strong>Section II:</strong> one free-response question, <strong>Device Security Analysis</strong>, suggested time 50 minutes. It gives you several sources from a single device (security policies, firewall configurations, file-system permissions, log files) and asks you to find security issues, spot evidence of attacks, and explain how permission or configuration changes would affect the device. You cite evidence from the sources. Some parts ask you to write an actual command, such as chmod. Only Skill Categories 2 and 3 are assessed.</li>'
   + '</ul>'
   + '<p>The three free-response questions below are practice in that style. They are not a replica of the single question you will sit.</p>'
   + '</div>',
   'intro paragraph plus the real-format callout'],

  ['For the best practice experience, try to complete all 40 MCQs in one sitting.',
   'To rehearse exam pacing, try all 40 MCQs in one sitting, and give a free-response question about 50 minutes, which is the time the real exam suggests for its one question.',
   'how to take this'],
];

// The callout needs styling that matches the page rather than shouting.
const STYLE = '\n<style>\n'
  + '#apcyber-pe .pq-format-note{background:#f4f7fb;border:1px solid #d6e2f0;'
  + 'border-left:3px solid #2f6f8f;border-radius:0 8px 8px 0;padding:14px 18px;margin:18px 0 6px;}\n'
  + '#apcyber-pe .pq-format-note p{margin:0 0 9px;line-height:1.6;}\n'
  + '#apcyber-pe .pq-format-note ul{margin:0 0 9px 18px;padding:0;}\n'
  + '#apcyber-pe .pq-format-note li{margin:0 0 7px;line-height:1.55;}\n'
  + '#apcyber-pe .pq-format-note p:last-child{margin-bottom:0;font-style:italic;}\n'
  + '</style>\n';

function patch(body) {
  if (!body.includes('id="apcyber-pe"')) throw new Error('this is not the cyber practice exam body');
  if (body.includes('pq-format-note')) return { body, changed: false, applied: [] };

  let out = body;
  const applied = [];
  for (const [from, to, label] of EDITS) {
    const hits = out.split(from).length - 1;
    if (hits !== 1) throw new Error(`${label}: expected exactly 1 match, found ${hits}. The page moved; re-read it.`);
    out = out.replace(from, to);
    applied.push(label);
  }

  // Style goes next to the callout it styles, right before the wrapper opens.
  const anchor = '<div id="apcyber-pe">';
  if (out.split(anchor).length - 1 !== 1) throw new Error('the page wrapper is not where it was');
  out = out.replace(anchor, STYLE + anchor);

  return { body: out, changed: true, applied };
}

function check(body, before) {
  const bad = [];
  // The claims that must be gone.
  for (const s of ['Full-Length Exam', 'full-length practice exam', 'Full-Length 40 MCQ',
    'simulates the AP Cybersecurity Exam experience', 'A complete practice exam']) {
    if (body.includes(s)) bad.push(`still claims: ${s}`);
  }
  // The facts that must be present, and correct.
  for (const s of ['60 multiple choice questions', 'Device Security Analysis', '50 minutes']) {
    if (!body.includes(s)) bad.push(`missing fact: ${s}`);
  }
  // The page's own content must not have been renumbered.
  if (!body.includes('40 multiple choice questions')) bad.push('lost its own MCQ count');
  if ((body.match(/Free Response Question \d/g) || []).length !== 3) bad.push('the three FRQs did not survive');
  // Structure.
  const opens = (body.match(/<script[\s>]/g) || []).length;
  const closes = (body.match(/<\/script>/g) || []).length;
  if (opens !== closes) bad.push(`${opens} script opens vs ${closes} closes`);
  // The page already carries 59 em-dashes in copy this script does not touch.
  // What matters is that THIS edit adds none, so compare counts rather than
  // failing on prose that was already there.
  const dashBefore = (before.match(/—/g) || []).length;
  const dashAfter = (body.match(/—/g) || []).length;
  if (dashAfter > dashBefore) bad.push(`this edit added ${dashAfter - dashBefore} em-dash(es)`);
  // Every JSON-LD block must still parse, or the rich result silently dies.
  for (const m of body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { bad.push(`a JSON-LD block no longer parses: ${e.message.slice(0, 60)}`); }
  }
  return bad;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function main(argv) {
  const [inFile, out] = argv;
  if (!inFile || !out) {
    console.error('usage: node scripts/cyber-practice-exam-truth.js <live-body.html> <out.csv>');
    process.exit(2);
  }
  const before = fs.readFileSync(inFile, 'utf8');
  const r = patch(before);
  if (!r.changed) { console.log('Already corrected, nothing to import.'); return; }

  const problems = check(r.body, before);
  if (problems.length) {
    console.error('Refusing to write a sheet with these problems in it:');
    problems.forEach((p) => console.error('  ' + p));
    process.exit(1);
  }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At',
    'Metafield: global.title_tag [string]', 'Metafield: global.description_tag [string]'];
  const lines = [header.map(csvCell).join(',')];
  lines.push([HANDLE, 'MERGE', r.body, 'TRUE', PUBLISHED_AT, SEO_TITLE, SEO_DESC].map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  r.applied.forEach((a) => console.log('    corrected: ' + a));
  console.log('    corrected: SEO description (said "AP CSA" on a Cybersecurity page)');
  console.log(`\nWrote ${HANDLE} to ${out}  (+${r.body.length - before.length} bytes)`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('REFUSED: ' + e.message); process.exit(1); }
}

module.exports = { patch, check, EDITS, HANDLE, SEO_TITLE, SEO_DESC };
