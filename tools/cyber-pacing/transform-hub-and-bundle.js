'use strict';
// Two small content fixes that go with surfacing the Unit 1 project.
//
//   1. Course hub: the guide links every lesson asset and all five unit exams,
//      but no project or scenario page for any unit. Adds the two Unit 1 rows
//      next to the Unit 1 exam row.
//   2. Teacher bundle: the Course Access bullet lists "lessons, exercises, labs,
//      quizzes, unit exams" and omits projects and scenario practice, while the
//      same page sells a project rubric twice. Corrects the bullet.
//
// Unit 3's project and scenario pages exist too but are deliberately held back.

// ---- 1. course hub ----------------------------------------------------------
const HUB_ANCHOR = `          <a class="study-guide-link" href="/pages/ap-cybersecurity-unit-1-introduction-to-security">📄 Unit 1 Study Guide</a>`;

const HUB_ROWS = `          <div style="padding:0 0 4px!important;"><a class="exercise-row" href="/pages/ap-cyber-unit-1-project"><div class="ex-dot"></div>
<span class="ex-label"><strong>Unit 1 Project</strong></span><span class="ex-tag">Open Project →</span></a></div>
          <div style="padding:0 0 4px!important;"><a class="exercise-row" href="/pages/ap-cyber-unit-1-scenario-practice"><div class="ex-dot"></div>
<span class="ex-label"><strong>Unit 1 Scenario Practice</strong></span><span class="ex-tag">Practice →</span></a></div>
`;

function transformHub(body, notes) {
  const at = body.indexOf(HUB_ANCHOR);
  if (at < 0) throw new Error('Unit 1 study guide link not found in the course hub');
  if (body.indexOf(HUB_ANCHOR, at + 1) >= 0) throw new Error('Unit 1 study guide link is not unique');
  if (body.includes('ap-cyber-unit-1-project')) throw new Error('course hub already links the Unit 1 project');
  notes.push('course hub: added Unit 1 project and scenario practice rows');
  return body.slice(0, at) + HUB_ROWS + body.slice(at);
}

// ---- 2. teacher bundle ------------------------------------------------------
const BUNDLE_OLD = '<strong style="color:#1F2937;-webkit-text-fill-color:#1F2937;">Full student-facing course access</strong> at apcsexamprep.com for Units 1-5 (lessons, exercises, labs, quizzes, unit exams)';

// Deliberately does not claim a project for every unit. Only Units 1 and 3 have
// one live; the pacing guide holds the rest as reserved days.
const BUNDLE_NEW = '<strong style="color:#1F2937;-webkit-text-fill-color:#1F2937;">Full student-facing course access</strong> at apcsexamprep.com for Units 1-5 (lessons, exercises, labs, quizzes, unit exams), plus unit projects and scenario practice for Units 1 and 3, with the remaining unit projects in development';

function transformBundle(html, notes) {
  const at = html.indexOf(BUNDLE_OLD);
  if (at < 0) throw new Error('Course Access bullet not found verbatim');
  if (html.indexOf(BUNDLE_OLD, at + 1) >= 0) throw new Error('Course Access bullet is not unique');
  notes.push('bundle: Course Access bullet now names projects and scenario practice');
  return html.slice(0, at) + BUNDLE_NEW + html.slice(at + BUNDLE_OLD.length);
}

module.exports = { transformHub, transformBundle, HUB_ROWS, BUNDLE_OLD, BUNDLE_NEW };
