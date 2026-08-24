'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  The cyber practice exam page told students the AP Cybersecurity Exam is
//  40 MCQ + 3 FRQs. The CED says 60 MCQ + ONE free-response question, "Device
//  Security Analysis", 50 minutes, Skill Categories 2 and 3.
//
//  These tests pin the facts, not the prose. If someone later edits the page
//  copy and drops the real section sizes, or renumbers the page's own content
//  to match the exam without adding the questions, this fails.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const truth = require(path.join(__dirname, '..', 'scripts', 'cyber-practice-exam-truth.js'));

let pass = 0; let fail = 0;
function ok(msg, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (detail ? '  ' + detail : '')); }
}

// A fixture carrying one of each claim the script rewrites.
const BODY = [
  '<script type="application/ld+json">',
  '{"a": "This practice exam contains 40 multiple choice questions and 3 free response questions, covering all 5 units of the AP Cybersecurity course framework. The exam is designed to simulate a realistic AP Cybersecurity Exam experience with scenario-based questions and detailed explanations.",',
  '"b": "Yes. This full-length practice exam is completely free. It includes 40 interactive MCQs with instant scoring and detailed explanations, plus 3 FRQs with sample responses. No account or payment required.",',
  '"headline": "AP Cybersecurity Practice Exam: Full-Length 40 MCQ + 3 FRQ with Answers (2026-2027)", "description": "Take a full-length AP Cybersecurity practice exam with 40 multiple choice questions and 3 free response questions covering all 5 units. Interactive scoring, detailed explanations, and exam tips. Free and aligned to the College Board framework."}',
  '</script>',
  '<!-- 40 MCQ + 3 FRQ | All 5 Units | Interactive Scoring + Timer -->',
  '<div id="apcyber-pe">',
  '<div class="pq-hero-badge">Full-Length Exam · 40 MCQ + 3 FRQ</div>',
  '<p class="pq-hero-sub">A complete practice exam covering all 5 units with 40 scenario-based multiple choice questions and 3 free response questions. Interactive scoring with detailed explanations for every question.</p>',
  '<p>This practice exam simulates the AP Cybersecurity Exam experience with <strong>40 multiple choice questions</strong> (Section 1) and <strong>3 free response questions</strong> (Section 2). Questions are distributed across all five course units and test the three core skill categories: Analyze Risk, Mitigate Risk, and Detect Attacks.</p>',
  '<p>For the best practice experience, try to complete all 40 MCQs in one sitting.</p>',
  '<p class="pq-qnum">Free Response Question 1</p>',
  '<p class="pq-qnum">Free Response Question 2</p>',
  '<p class="pq-qnum">Free Response Question 3</p>',
  '</div>',
].join('\n');

console.log('\nTHE CORRECTION APPLIES');
const r = truth.patch(BODY);
{
  ok('the page stops calling itself full-length', r.changed && !r.body.includes('Full-Length Exam'));
  ok('and stops claiming it simulates the exam experience',
    !r.body.includes('simulates the AP Cybersecurity Exam experience'));
  ok('a second run is a no-op, so a re-import is safe', truth.patch(r.body).changed === false);

  let refused = null;
  try { truth.patch('<div>not the page</div>'); } catch (e) { refused = e.message; }
  ok('a foreign body is refused', !!refused, refused);

  let moved = null;
  try { truth.patch(BODY.replace('Full-Length Exam · 40 MCQ + 3 FRQ', 'Full-Length Exam - 40 MCQ')); } catch (e) { moved = e.message; }
  ok('a drifted claim is refused rather than half-corrected', !!moved, moved);
}

console.log('\nTHE FACTS IT MUST NOW STATE (from the CED, page 147)');
{
  ok('Section I is 60 multiple choice questions', r.body.includes('60 multiple choice questions'));
  ok('Section II is ONE question, named Device Security Analysis',
    r.body.includes('Device Security Analysis') && /single free-response question|one free-response question/.test(r.body));
  ok('the 50 minute suggested time is stated', r.body.includes('50 minutes'));
  ok('only Skill Categories 2 and 3 are claimed for it',
    r.body.includes('Skill Categories 2 and 3'));
  ok('it names the source types a student will face',
    ['security policies', 'firewall configurations', 'file-system permissions', 'log files']
      .every((s) => r.body.includes(s)));
  ok('it says some parts ask for an actual command', /write an actual command|chmod/.test(r.body));
}

console.log('\nWHAT MUST NOT CHANGE');
{
  ok('the page keeps its own 40 MCQs', r.body.includes('40 multiple choice questions'));
  ok('all three free-response questions survive',
    (r.body.match(/Free Response Question \d/g) || []).length === 3);
  ok('it does NOT pretend to be a replica', /not a replica/.test(r.body));
  ok('every JSON-LD block still parses',
    [...r.body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .every((m) => { try { JSON.parse(m[1]); return true; } catch (e) { return false; } }));
  ok('check() passes on the corrected body', truth.check(r.body, BODY).length === 0,
    truth.check(r.body, BODY).join('; '));
}

console.log('\nTHE SEO TAGS');
{
  ok('the description no longer says AP CSA on a Cybersecurity page',
    !/AP CSA/.test(truth.SEO_DESC) && /Cybersecurity/.test(truth.SEO_DESC));
  ok('the title tag is within a sane length', truth.SEO_TITLE.length <= 70, String(truth.SEO_TITLE.length));
  ok('the description tag is within a sane length',
    truth.SEO_DESC.length >= 70 && truth.SEO_DESC.length <= 200, String(truth.SEO_DESC.length));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
