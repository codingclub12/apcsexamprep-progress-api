'use strict';
// -----------------------------------------------------------------------------
//  THE TEACHER WELCOME FLOW, Klaviyo "Added to Teacher List" (WGDekt).
//
//  Triggered by the Teachers list (Uc2DR2), which the live Re-Ask flow adds a
//  person to when they click "I'm a teacher". The flow sat in draft from
//  February with four emails that had gone stale: two linked to /blogs pages
//  that now 404, one sent teachers to Teachers Pay Teachers instead of the
//  bundles on this site, and the last pitched tutoring with prices while the
//  tutoring products are an open decision (board #76). None mentioned the free
//  teacher dashboard.
//
//  This writes klaviyo/teacher-flow/email-N.html. The same four templates are
//  pushed into the flow's own template ids by hand through the Klaviyo API, so
//  the files here are the source of record for what the flow sends.
//
//  -- WHAT IT REFUSES ---------------------------------------------------------
//    1  non-ASCII, or an em-dash (literal or &mdash;)
//    2  a price: a dollar sign anywhere in the body (money is never automatic)
//    3  a link to apcsexamprep.com that does not answer 200 right now
//    4  a missing {% unsubscribe %}
//
//  Run: node scripts/build-teacher-flow-emails.js [--offline]
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'klaviyo', 'teacher-flow');
const SITE = 'https://www.apcsexamprep.com';

//  Flow message template ids in WGDekt, in send order, with the delay before
//  each. Subject and preview live on the flow message, not the template, so
//  they are set in the Klaviyo editor from klaviyo/teacher-flow/README.md.
const EMAILS = [
  {
    n: 1, template: 'WSQZ6w', delayDays: 0,
    subject: 'A free dashboard for your AP CS class',
    preview: 'Create a class, share one code, and see every student lesson by lesson.',
    body: [
      p('Hi {{ first_name|default:"there" }},'),
      p('Thanks for letting me know you teach. I&#39;m Tanner Crow. I have taught AP Computer Science at Blue Valley North for over eleven years, and I built APCSExamPrep.com for my own students before I opened it to other classrooms.'),
      p('If you only look at one thing, make it the teacher dashboard. It is free. You create a class and your students join with a name, your class code and a PIN, so there are no student email addresses and no roster to upload. As they work through lessons and exercises, their scores show up on your dashboard, lesson by lesson.'),
      button('/pages/csa-teacher-dashboard', 'AP CSA teacher dashboard'),
      button('/pages/csp-teacher-dashboard', 'AP CSP teacher dashboard'),
      button('/pages/cyber-teacher-dashboard', 'AP Cybersecurity teacher dashboard'),
      p('Setting up a class takes a couple of minutes. If anything about it is unclear, reply to this email. I read every reply myself.'),
      sign(),
    ],
  },
  {
    n: 2, template: 'TCSfu3', delayDays: 2,
    subject: 'What your students can use for free',
    preview: 'Full courses for AP CSA, CSP and Cybersecurity, and where to find them.',
    body: [
      p('Hi {{ first_name|default:"there" }},'),
      p('A quick tour of what your students can use without paying anything. The three courses below are the ones the dashboard tracks, so once a student joins your class, their lesson work shows up in your class view.'),
      h('AP Computer Science A'),
      p('The full course: all four units and 53 lessons, built on the 2025-2026 CED. Lessons have exercises that run real Java in the browser. There is also every released FRQ from 2004 on with written solutions, and practice tests by topic.'),
      link('/pages/ap-csa-course', 'The AP CSA course'),
      link('/pages/ap-csa-frq-archive', 'FRQ archive with solutions'),
      link('/pages/ap-csa-practice-test-hub', 'Practice tests by topic'),
      h('AP Computer Science Principles'),
      p('All five Big Ideas, Python coding labs, a Create Task module, and a full 70-question practice exam.'),
      link('/pages/ap-csp-course', 'The AP CSP course'),
      link('/pages/ap-computer-science-principles-full-practice-exam-70-mcq', '70-question practice exam'),
      h('AP Cybersecurity'),
      p('New this year, with the first exam on May 5, 2027. All five units are on the site with lessons, hands-on labs and quizzes, and there is not much else out there for this course yet.'),
      link('/pages/ap-cybersecurity-course', 'The AP Cybersecurity course'),
      p('If you point students at one of these, tell me how it goes. What teachers say back is most of how I decide what to build next.'),
      sign(),
    ],
  },
  {
    n: 3, template: 'VmRnHQ', delayDays: 4,
    subject: 'The materials I teach from',
    preview: 'Slides, notes, keys, tests and pacing guides, with a free unit to try first.',
    body: [
      p('Hi {{ first_name|default:"there" }},'),
      p('Everything in the last email is for students. This one is for you.'),
      p('I got tired of building assessments from scratch every week, so I built the full set I teach from and made it available to other teachers. Each course has a teacher bundle, and each one lets you try a unit free before you buy anything.'),
      h('AP Computer Science A'),
      p('All four units. Every lesson comes with a teacher guide, guided notes, two exercises with answer keys, a discussion activity, and a bell ringer and quiz. There are unit tests with AP-style multiple choice and free response, unit projects with rubrics, and pacing guides for full-year and block schedules. Unit 1 is a free preview, so you can run a full lesson with your class first.'),
      link('/products/ap-csa-teacher-superpack', 'AP CSA teacher bundle'),
      h('AP Computer Science Principles'),
      p('Slides and lesson resources for all five Big Ideas, AP-style multiple choice, and Create Task scaffolding. The Big Idea 1 pack is free.'),
      link('/products/ap-csp-teacher-superpack', 'AP CSP teacher bundle'),
      h('AP Cybersecurity'),
      p('Lesson plans, scenarios, assessments, answer keys and rubrics for all five units, with editable slide decks and a full-year pacing guide.'),
      link('/products/ap-cybersecurity-founding-teacher-bundle', 'AP Cybersecurity teacher bundle'),
      p('If there is a unit or topic you need and cannot find, reply and tell me.'),
      sign(),
    ],
  },
  {
    n: 4, template: 'YnEmjX', delayDays: 4,
    subject: 'One question about your class',
    preview: 'What would make this more useful for you this year?',
    body: [
      p('Hi {{ first_name|default:"there" }},'),
      p('Last one in this series. I have one question, and a one-line answer is plenty: which course are you teaching this year, and what is the one thing that would make your year easier?'),
      p('Every reply comes to me, not a support queue, and I answer them.'),
      p('If you have not set up a class yet, the dashboard is still the best place to start.'),
      button('/pages/csa-teacher-dashboard', 'AP CSA teacher dashboard'),
      button('/pages/csp-teacher-dashboard', 'AP CSP teacher dashboard'),
      button('/pages/cyber-teacher-dashboard', 'AP Cybersecurity teacher dashboard'),
      p('After this I will only write when something new is ready for your course.'),
      sign(),
    ],
  },
];

function p(html) { return '<p style="margin:0 0 16px 0;">' + html + '</p>'; }
function h(text) { return '<p style="margin:24px 0 8px 0;font-weight:bold;color:#0F172A;font-size:16px;">' + text + '</p>'; }
function link(href, text) {
  return '<p style="margin:0 0 8px 0;"><a href="' + SITE + href + '" style="color:#2563eb;font-weight:bold;text-decoration:underline;">' + text + '</a></p>';
}
function button(href, text) {
  return '<a href="' + SITE + href + '" style="display:block;background:#2563eb;color:#ffffff;font-weight:bold;text-decoration:none;padding:14px 20px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;text-align:center;margin:0 0 10px 0;">' + text + '</a>';
}
function sign() { return '<p style="margin:24px 0 0 0;">Tanner</p>'; }

//  The same shell as the Re-Ask emails, so the two flows look like one sender.
function shell(inner) {
  return '<!DOCTYPE html>\n<html><head></head><body style="margin:0;padding:0;background:#f4f4f5;">'
    + '<table cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f5;" width="100%"><tr><td align="center" style="padding:24px 12px;">'
    + '<table cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:8px;max-width:600px;width:100%;">'
    + '<tr><td style="background:#0F172A;border-radius:8px 8px 0 0;padding:18px 32px;"><span style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1.5px;">APCSEXAMPREP.COM</span></td></tr>'
    + '<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.65;">'
    + inner.join('')
    + '</td></tr>'
    + '<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;text-align:center;line-height:1.6;">'
    + 'Tanner Crow &middot; AP CS Teacher, 11+ years &middot; Blue Valley North<br/>{{ organization.name }} | {{ organization.full_address }}<br/>{% unsubscribe %}'
    + '</td></tr></table></td></tr></table></body></html>\n';
}

function siteLinks(html) {
  const out = [];
  const re = /href="https:\/\/www\.apcsexamprep\.com(\/[^"#?]*)/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

//  THE PURE HALF.
function checkEmail(n, html) {
  const problems = [];
  if (/[^\x00-\x7F]/.test(html)) problems.push('email ' + n + ': non-ASCII character');
  if (html.indexOf(String.fromCharCode(0x2014)) !== -1 || /&mdash;/i.test(html)) problems.push('email ' + n + ': em-dash');
  if (html.indexOf('$') !== -1) problems.push('email ' + n + ': a dollar sign, so a price');
  if (html.indexOf('{% unsubscribe %}') === -1) problems.push('email ' + n + ': no unsubscribe tag');
  if (!siteLinks(html).length) problems.push('email ' + n + ': no link to the site');
  return problems;
}

function main(argv) {
  const offline = argv.includes('--offline');
  const problems = [];
  const built = EMAILS.map((e) => ({ e, html: shell(e.body) }));
  const seen = new Map();
  for (const { e, html } of built) {
    checkEmail(e.n, html).forEach((m) => problems.push(m));
    if (offline) continue;
    for (const l of siteLinks(html)) {
      if (!seen.has(l)) seen.set(l, String(require('../lib/storefront-fetch').raw(l).code));
      if (seen.get(l) !== '200') problems.push('email ' + e.n + ': ' + l + ' answers ' + seen.get(l));
    }
  }
  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). Nothing written:\n');
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const { e, html } of built) fs.writeFileSync(path.join(OUT, 'email-' + e.n + '.html'), html);
  console.log('\n  4 emails written to ' + path.relative(process.cwd(), OUT)
    + (offline ? ' (OFFLINE: links not checked)' : ', ' + seen.size + ' distinct links all 200'));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { EMAILS, shell, checkEmail, siteLinks };
