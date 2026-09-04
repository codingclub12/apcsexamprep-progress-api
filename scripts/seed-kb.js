'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Seed the knowledge base with one DRAFT stub per escalation category.
//
//  It seeds STUBS, not answers. docs/site-assistant-spec.md is explicit that
//  Tanner writes the bodies and the assistant must not invent site mechanics: a
//  confidently wrong answer about how the site works is worse than no answer,
//  because the person believes it and stops looking.
//
//  So each stub carries a brief describing what the finished article has to
//  cover, and stays status='draft'. Drafts are never served publicly, so an
//  unwritten article is silent rather than half-true.
//
//  The categories are the escalation taxonomy from lib/assistant/report.js, so
//  the answers group against the same schema as the questions and the digest can
//  put "asked 40 times" next to "no article yet".
//
//  Idempotent: an existing slug is left exactly as it is, so running this can
//  never overwrite something a human wrote.
//
//  Run: node scripts/seed-kb.js
// ─────────────────────────────────────────────────────────────────────────────
const kb = require('../lib/assistant/kb');
const { CATEGORIES } = require('../lib/assistant/report');

// One stub per category. `must_cover` is a brief for the author, not an answer.
const STUBS = {
  access_not_showing: {
    title: 'My course is not showing after I paid',
    must_cover: 'The order that actually works: create the account or sign in FIRST, then redeem. A Shopify purchase made before the account existed is parked and claimed on register or login, so signing out and back in is the usual fix. What to do when it still does not appear.',
  },
  student_join_failure: {
    title: 'My students cannot join or sign in',
    must_cover: 'Class code plus display name plus 4-digit PIN. Names are unique per class. What a deactivated class or student looks like from the student side, and where the teacher checks the roster.',
  },
  gradebook_missing_scores: {
    title: 'Scores are missing from my gradebook',
    must_cover: 'The difference between not attempted and scored zero, which never render alike. Which activities report a score and which record completion only. Where to see whether anything has arrived at all.',
  },
  content_error: {
    title: 'Something in a lesson looks wrong',
    must_cover: 'How to report it so it is reproducible, and what happens next. Name the known-broken items honestly rather than implying everything is correct.',
  },
  progression_gate: {
    title: 'Why is a quiz greyed out',
    must_cover: 'Teacher-opened quizzes leave exercises and labs open and shut only quizzes and exams, so "exercises work, quiz is locked" is the expected shape of a locked class. The three different on-screen messages and what each one means. Point at the Check my account panel.',
  },
  password_reset: {
    title: 'Resetting a password',
    must_cover: 'Teacher password reset by email, and how long the link lasts. Student PINs are reset by their teacher from the roster, not by email, because students have no email.',
  },
  procurement: {
    title: 'Purchase orders, W-9 and invoicing',
    must_cover: 'What a school can be sent, who to ask, and the usual turnaround. What information is needed to raise an invoice.',
  },
  presale: {
    title: 'What is included before you buy',
    must_cover: 'What a teacher bundle covers, how many classes, how long access lasts, and what is free without an account.',
  },
  it_whitelisting: {
    title: 'Our school network is blocking the site',
    must_cover: 'The exact hosts a district firewall has to allow for lessons, quizzes and score reporting to work. What breaks first when one of them is blocked.',
  },
  pacing_selfstudy: {
    title: 'Pacing and self-study',
    must_cover: 'How a self-study student differs from a class student, including that self-study is never gated. Suggested pacing and where the calendar lives.',
  },
  assessment_visibility: {
    title: 'Students can see something they should not',
    must_cover: 'How to report it fast, and what is checked. Be honest that a page whose questions are baked into its body cannot be hidden client-side, and say what the fix is.',
  },
  bug_report: {
    title: 'Reporting a problem with a page',
    must_cover: 'What the report button sends and what it does not. Say plainly that on lesson pages typed messages are not stored, and why.',
  },
  other: {
    title: 'Something else',
    must_cover: 'Where to go when nothing above fits, and what to include so the first reply can be useful.',
  },
};

function body(cat, stub) {
  return [
    '> DRAFT. This article has not been written yet, so it is not served to anyone.',
    '',
    '**What this article must cover**',
    '',
    stub.must_cover,
    '',
    '**Rules for whoever writes it**',
    '',
    '- Describe what the site actually does today, including what is broken. An',
    '  article that describes the intended behaviour of something that does not',
    '  work yet is worse than no article.',
    '- No lesson content, no quiz text, no answer keys. This corpus is site',
    '  mechanics only, and that is what makes it safe to search.',
    '- Publish by setting status to published. Until then this stays invisible.',
    '',
    `Category: \`${cat}\``,
  ].join('\n');
}

function seed() {
  let created = 0, kept = 0;
  for (const cat of CATEGORIES) {
    const stub = STUBS[cat];
    if (!stub) { console.warn(`[seed-kb] no stub defined for category ${cat}`); continue; }
    const slug = kb.slugify(stub.title);
    if (kb.get(slug)) { kept++; continue; }
    const out = kb.save({
      slug, title: stub.title, body_md: body(cat, stub),
      category: cat, status: 'draft', audience: 'all',
    }, 'seed');
    if (out.error) { console.error(`[seed-kb] ${cat}: ${out.error}`); continue; }
    created++;
  }
  return { created, kept, categories: CATEGORIES.length };
}

if (require.main === module) {
  const r = seed();
  console.log(`[seed-kb] ${r.created} created, ${r.kept} already present, ${r.categories} categories`);
}

module.exports = { seed, STUBS };
