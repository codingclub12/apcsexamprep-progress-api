'use strict';
// Weekly course post: AP CSP. Teacher-facing roundup post for the "what's new
// this year" angle. This post does NOT re-cover the Create task format change
// (2026-08-18-ap-csp-create-task-change.js) or the AI attribution nuance
// (2026-09-08-ap-csp-ai-policy-deep-dive.js) in detail; it links to both and
// instead answers the broader planning question a teacher actually has in
// October: what genuinely moved this year versus what a teacher can safely
// reuse from last year's materials without a rebuild. Researched via live web
// search in October 2026; the honest finding is that the exam format, scoring
// weighting, Create task submission process, and AI policy are all stable
// this cycle. The only things that reliably refresh every fall are the AP
// Classroom teacher and student user guides and the Course Audit status, so
// that is where the actionable content lives.
const H = require('../../lib/blog-house');

const SRC = {
  exam: { source: 'College Board, AP Computer Science Principles Exam', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam', asOf: 'October 2026' },
  guidance: { source: 'College Board, Guidance for Artificial Intelligence Tools and Other Services', url: 'https://apcentral.collegeboard.org/exam-administration-ordering-scores/administering-exams/exam-policies/artificial-intelligence-tools', asOf: 'October 2026' },
  portfolio: { source: 'College Board, Submit AP Computer Science Principles Work in the AP Digital Portfolio', url: 'https://apstudents.collegeboard.org/digital-portfolios/submit-ap-csp-work', asOf: 'October 2026' },
  audit: { source: 'College Board, AP Computer Science Principles Course Audit', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course-audit', asOf: 'October 2026' },
  ceo: { source: 'Education Week, College Board\'s CEO on How AP Courses Are Changing for the AI Era', url: 'https://www.edweek.org/teaching-learning/college-boards-ceo-on-how-ap-courses-are-changing-for-the-ai-era/2025/03', asOf: 'October 2026' },
};

const SECTIONS = [
  'What Changed for AP CSP Teachers This Year',
  'The Create Task and the AI Policy Did Not Change',
  'Exam Format and Scoring Are Also Unchanged',
  'What Does Refresh Every Fall on AP Classroom and the Digital Portfolio',
  'Where College Board Has Signaled Change, Just Not Yet',
  'Planning Your Year Without Rebuilding Materials That Still Work',
];

const meta = {
  title: 'What Changed for AP CSP Teachers This Year',
  handle: 'ap-csp-what-changed-for-teachers',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp teacher',
  publishOn: '2026-10-20',
  seoTitle: 'AP CSP Teacher Guide: What Changed This Year',
  seoDescription: 'Most of the AP CSP Create task, AI policy, and exam format stayed the same this year. Here is what changed, what stayed stable, and how to plan around it.',
  summary: 'Every fall an AP CSP teacher braces for a rulebook that moved. This year the honest answer is that it mostly did not: the Create task submission process, the AI attribution policy, and the exam scoring weighting are all confirmed stable for the current cycle. What genuinely refreshes is narrower and more mechanical, the AP Classroom user guides, the Course Audit status, and the calendar itself, and this guide walks through exactly what to recheck versus what to safely reuse from last year.',
  tags: ['AP CSP', 'Teacher Resources', 'Create Performance Task', 'AI Policy', 'AP Classroom'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Every fall, AP CSP teachers brace for a Course and Exam Description update that reshuffles pacing, rewrites a rubric, or moves a deadline without warning. This year, the honest headline is that almost none of that happened. Here is exactly what changed for AP CSP teachers this year, what stayed exactly the same, and where the actual ten minutes of updating your course needs to go before you build out a pacing guide from scratch that you did not need to rebuild.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('This is a planning post, not a content post. If you teach AP CSP, you already know how to teach abstraction and you do not need us to re-explain the Create performance task from scratch. What you need in October is a fast, honest answer to one question: did anything actually move this year that affects how you run your class, and if so, exactly what do you need to touch. We went and checked rather than guessed, and the short version is that the structural pieces held steady. That is worth saying plainly, because a post that manufactures churn to justify its own existence wastes your planning time worse than no post at all.'),
  H.p('Two of our other guides already cover specific mechanics in depth: the Create task submission format and the AI attribution rule. This post sits above both of those. It tells you whether this year is a "rebuild your materials" year or a "reuse what worked" year, and then points you at the two or three things that genuinely do need a fresh look every fall regardless of whether the course itself changed.'),

  H.h2(SECTIONS[0]),
  H.p('Here is the bottom line, stated as plainly as we can state it, before the reasoning behind each piece.'),
  H.ul([
    'The Create performance task submission process, the three required components, and the proctored written response session are unchanged from last cycle.',
    'The AI use and attribution policy is unchanged. The same learn-versus-produce distinction and the same comment-based attribution rule apply.',
    'The exam format and scoring weighting between the multiple-choice section and the Create task are unchanged.',
    'What genuinely refreshes every year regardless of course changes: the AP Classroom teacher and student user guides, and your Course Audit status, both of which reset on a school-year cycle and are worth a fresh check even when the underlying course did not move.',
    'College Board has publicly discussed a longer horizon shift toward incorporating AI more directly across AP courses, but nothing concrete has landed in the CSP framework for this cycle. That is a "watch it," not a "plan around it yet."',
  ]),
  H.p('If that list is all you needed, you are genuinely done here. The rest of this guide is the evidence behind each line and the specific, small set of actions worth taking in the next couple of weeks so you are not caught flat by something that did quietly shift.'),

  H.h2(SECTIONS[1]),
  H.p('The single biggest structural change to the Create performance task in recent memory was moving the written response out of a take-home submission and into a proctored, exam-day session answered from memory using the Personalized Project Reference. That change is now an established part of the course rather than a new one, and nothing has moved on top of it this cycle.'),
  H.sourceNote(SRC.portfolio.source, SRC.portfolio.url, SRC.portfolio.asOf),
  H.p('Practically, that means the pacing you built around that format last year still applies. If your students already understand that finishing the program is a milestone and not the finish line, that the video, the reference screenshots, and the written attestation are separate jobs with separate timelines, that understanding does not need to be relearned or re-taught with new mechanics this year. Our <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">guide to the Create task format change</a> covers the full mechanics if you are onboarding a co-teacher or a student teacher who has not seen the current format, and our <a href="/blogs/ap-csp/ap-csp-project-reference-deadline-how-students-miss-it">guide to the submission deadline</a> covers the specific ways students lose time even when the process itself has not changed.'),
  H.p('The AI policy sits in the same category. The rule is still the same: generative AI is permitted as a supplementary tool for understanding concepts, developing code, and debugging, but it may not be used to produce the work a student submits without documented attribution.'),
  H.sourceNote(SRC.guidance.source, SRC.guidance.url, SRC.guidance.asOf),
  H.p('That means the classroom guidance you gave students last year about the difference between asking AI to explain a bug and asking AI to fix it for you still holds. It means the comment-based attribution convention you may have already introduced in class still satisfies the requirement. If you spent time last year building a short in-class explainer on this, distinguishing learning uses from production uses, you do not need to rewrite it. Our <a href="/blogs/ap-csp/ap-csp-ai-policy-create-task-nuance">deep dive on the AI policy</a> is written for students directly and works as a reading assignment if you want a refresher on the specific scenarios without writing your own from scratch.'),
  H.box('key', 'The actual time saved', '<p>A stable rule year means the highest-value thing you can do with the time you might have spent rebuilding a policy handout is spend it on something that actually needs attention, like reviewing a handful of student projects early for attribution problems before the deadline crunch hits, rather than re-explaining a rule that has not moved.</p>'),

  H.h2(SECTIONS[2]),
  H.p('The exam itself is also unchanged in structure. The multiple-choice section still runs seventy questions in a two-hour block and still carries the larger share of the composite score, at ' + H.stat('70%', SRC.exam) + '. The Create performance task still carries the remaining ' + H.stat('30%', SRC.exam) + ', scored across six rubric rows with no partial credit inside a row, meaning each row is either earned in full or not at all.'),
  H.p('None of that weighting shifted this cycle, and neither did the underlying content emphasis inside the multiple-choice section, where algorithms and programming remain the largest single content area alongside data, impact of computing, and the rest of the framework\'s big ideas. If your unit pacing already leans into that emphasis, whatever calendar you used to get students through algorithms and programming with real depth before the exam does not need to be rebalanced around a new weighting scheme, because there is not one.'),
  H.p('This stability is worth naming directly for a specific reason: a scoring or weighting change is exactly the kind of thing that would force a real rebuild of pacing, practice sets, and mock exam scoring keys, and it is also exactly the kind of thing that gets rumored every year regardless of whether it is happening. We checked the current exam page directly rather than relying on a forum thread or a study guide site repeating last year\'s structure without verifying it, and the structure holds. Our <a href="/blogs/ap-csp/ap-csp-exam-format-every-section">full exam format breakdown</a> has the section-by-section detail if you want to confirm it yourself against your own materials before you commit to reusing them.'),

  H.h2(SECTIONS[3]),
  H.p('Here is the part of this post that is actually actionable, because a course that did not change structurally still has pieces that reset on a calendar you do not control.'),
  H.h3('The AP Classroom teacher and student user guides'),
  H.p('These guides refresh for the new school year, typically becoming available in the early fall, and they are worth re-downloading even when the content inside looks familiar. A saved PDF from last year is not guaranteed to reflect small interface changes to AP Classroom itself, the question bank, or the Personal Progress Check workflow, and the safest habit is to grab the current version rather than assume last year\'s copy is still accurate.'),
  H.h3('Your Course Audit status'),
  H.p('Course Audit approval is what unlocks access to the secure question bank and lets your AP coordinator create class sections for the year. This is not a change to the course itself, it is an annual administrative step that exists independent of whether anything in the curriculum moved, and it is easy to assume it carried over automatically when it did not.'),
  H.sourceNote(SRC.audit.source, SRC.audit.url, SRC.audit.asOf),
  H.h3('The calendar itself'),
  H.p('The exact submission window for the Create task and the exact exam date both shift slightly year to year along with the rest of the AP calendar, even when nothing about the task or the exam format changed. Do not carry last year\'s date forward from memory or from a study guide site, since those go stale the fastest. Our <a href="/blogs/ap-csp/ap-csp-project-reference-deadline-how-students-miss-it">deadline guide</a> tracks the confirmed current window and the buffer College Board recommends around it, and it gets rechecked every cycle specifically because this is the one number on this whole page that is genuinely worth reverifying annually rather than trusting a prior post to still be accurate.'),
  H.box('tip', 'A five minute fall checklist', '<p>Confirm your Course Audit is current, re-download this year\'s AP Classroom user guides rather than reusing last year\'s, and confirm the current Create task submission window on the deadline guide rather than from memory. That is the entire list of things that reliably need a fresh look regardless of whether the course content changed.</p>'),

  H.h2(SECTIONS[4]),
  H.p('It would be incomplete to say nothing at all is moving in the broader conversation around AP courses and AI, so here is that context, held to the same honesty standard as the rest of this post: this is a direction, not a change you need to plan around yet.'),
  H.p('College Board leadership has spoken publicly about a longer-term shift toward incorporating artificial intelligence more directly into how AP courses are taught and assessed across the program, not limited to computer science.'),
  H.sourceNote(SRC.ceo.source, SRC.ceo.url, SRC.ceo.asOf),
  H.p('That is a real, verifiable signal about direction of travel, and it is worth knowing it exists so you are not caught completely by surprise if a future Course and Exam Description revision touches this. But it is not a confirmed change to the current AP CSP framework, it is not reflected in this year\'s exam structure, and there is no published timeline attaching it to a specific administration. Treat it as something to watch for in official College Board channels each fall, not as a reason to change anything in your classroom this year. The single worst outcome of this section would be a teacher rebuilding curriculum around a rumor extracted from a leadership interview rather than an actual published framework change, so we are naming the signal without overstating it into one.'),

  H.h2(SECTIONS[5]),
  H.p('Put together, this is a reuse year more than a rebuild year, and knowing that early in the fall is itself the useful thing, since it frees up planning time for the parts of teaching this course that always need attention regardless of what College Board did or did not change.'),
  H.table(
    ['Area', 'Status this year', 'What to actually do'],
    [
      ['Create task submission process', 'Unchanged', 'Reuse last year\'s pacing and student-facing materials as written.'],
      ['AI use and attribution policy', 'Unchanged', 'Reuse existing classroom guidance and attribution comment templates.'],
      ['MCQ and Create task scoring weighting', 'Unchanged', 'No need to reweight a gradebook or rebuild a mock exam scoring key.'],
      ['AP Classroom teacher and student user guides', 'Refreshed for this school year', 'Re-download the current version rather than reusing a saved copy.'],
      ['Course Audit status', 'Annual requirement, not a content change', 'Confirm it is current before students need question bank access.'],
      ['Create task submission window', 'Shifts slightly every cycle', 'Confirm the exact current date rather than trusting last year\'s.'],
      ['Broader AI-in-AP-courses direction', 'Signaled, not yet in the CSP framework', 'Note it and watch official channels. Do not build around it yet.'],
    ]
  ),
  H.p('If you take one thing from this table into your actual planning period, let it be this: the time you might have spent this fall re-verifying a policy or a rubric that did not move is better spent reviewing a few early student projects for attribution problems, confirming your Course Audit went through cleanly, and making sure the deadline you tell students out loud in class is the confirmed current one rather than a number you are recalling from last spring.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Did the AP CSP Create performance task submission process change this year?', a: 'No. The three required components, the proctored written response session using the Personalized Project Reference, and the AP Digital Portfolio submission flow are all unchanged from last cycle. Materials built around that format do not need a rebuild.' },
    { q: 'Has the AP CSP AI policy changed for this school year?', a: 'No. The same distinction between using AI to learn and using AI to produce submitted work still applies, and the same comment-based attribution requirement still governs any AI assistance that ends up in a student\'s program. Classroom guidance built around that rule last year still holds.' },
    { q: 'Did the exam format or the scoring weighting between sections change?', a: 'No. The multiple-choice section and the Create performance task carry the same weighting they carried last cycle, and the six-row rubric structure for the Create task is unchanged. Pacing and mock exam scoring keys built around that structure remain accurate.' },
    { q: 'What should I actually check at the start of this school year if nothing major changed?', a: 'Re-download the current AP Classroom teacher and student user guides rather than reusing a saved copy from last year, confirm your Course Audit status is current, and confirm the exact current Create task submission window rather than relying on memory, since that specific date shifts slightly every cycle even when the process around it does not.' },
    { q: 'Is College Board planning bigger changes to AP CSP soon because of AI?', a: 'College Board leadership has publicly discussed a broader, longer-term shift toward incorporating AI across AP courses, but nothing concrete has been announced for the current AP CSP framework. It is worth watching official channels each fall, but there is no confirmed change to plan a current lesson or unit around yet.' },
  ]),

  H.cta({
    heading: 'Keep the materials that still work',
    body: 'Start with the Create task and deadline mechanics, then hand students the AI policy deep dive directly if you want a ready-made reading assignment instead of writing your own.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-create-performance-task-what-changed', text: 'Create task format change guide' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Verified against College Board\'s current AP Computer Science Principles exam page, AI tools guidance, Digital Portfolio guidance, and Course Audit page for the current school year. Confirm the exact Create task submission date annually, since it shifts with the AP exam calendar. Last reviewed October 2026.'),
]);

module.exports = { meta, body };
