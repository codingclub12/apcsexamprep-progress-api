'use strict';
// Weekly course post: AP CSP. Drill track: a study-plan / navigation post, not
// a re-teach of content. This post organizes the existing CSP blog library by
// Big Idea and tells a student what to actually DO in each section, linking
// out to the dedicated deep-dive posts and to the vocabulary post for term
// lookups rather than repeating any of that material here.
const H = require('../../lib/blog-house');

const SRC = {
  ced: { source: 'College Board AP Computer Science Principles Course and Exam Description', url: 'https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-at-a-glance.pdf', asOf: 'October 2026' },
};

const SECTIONS = [
  'How to Use This AP CSP Study Guide',
  'Big Idea 1, Creative Development: What to Do This Week',
  'Big Idea 2, Data: What to Do This Week',
  'Big Idea 3, Algorithms and Programming: What to Do This Week',
  'Big Idea 4, Computer Systems and Networks: What to Do This Week',
  'Big Idea 5, Impact of Computing: What to Do This Week',
  'Suggested Time Allocation Across the Five Big Ideas',
  'Quick Comprehension Check',
  'Frequently Asked Questions',
];

const meta = {
  title: 'A Big Idea by Big Idea AP CSP Study Guide',
  handle: 'ap-csp-big-idea-by-big-idea-study-guide',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp study guide',
  publishOn: '2026-10-20',
  seoTitle: 'AP CSP Study Guide: A Big Idea by Big Idea Plan',
  seoDescription: 'An AP CSP study guide organized by all five Big Ideas: a checklist of what to actually do in each one, linked to the specific posts and practice on this blog.',
  summary: 'A navigation-style AP CSP study guide organized by the five Big Ideas: Creative Development, Data, Algorithms and Programming, Computer Systems and Networks, and Impact of Computing. For each Big Idea, a checklist of concrete review actions, linked to the specific dedicated posts already on this blog rather than re-explaining any of their content, plus a suggested time allocation across the five and two quick comprehension-check questions.',
  tags: ['AP CSP', 'Study Guide', 'Big Ideas', 'Study Plan', 'Exam Prep', 'Review Checklist'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('An AP CSP study guide is only useful if it tells you what to actually do, not what the course already covers somewhere else. This one is a Big Idea by Big Idea plan: five checklists of concrete review actions, each one pointing at the specific post on this blog built to cover that ground, plus the vocabulary guide for fast term recall and a suggested time split across the five sections so your review time roughly matches how the exam is actually weighted.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('This is a planning tool, not a textbook chapter. Every fact this course tests already has a home somewhere on this blog: a full pseudocode reference, a worked binary and overflow walkthrough, an internet guide, a data privacy guide, and a forty-term ranked vocabulary list, among others. Re-explaining any of that here would just be a worse copy of a page that already exists. What is missing from a pile of separate posts is the plan that ties them together, so this guide is that plan: five sections, one per Big Idea, each one a short checklist of what to re-do, re-trace, or re-check, with a direct link to the post that covers it in full.'),
  H.p('Work through the five Big Idea sections in whatever order matches your own gaps, not necessarily top to bottom. If you already know your weakest Big Idea, start there. If you do not, the time allocation section below gives you a reasonable default order based on how the exam actually weights each one.'),
  H.box('key', 'The two other posts this guide leans on constantly', '<p>Two posts on this blog get referenced across almost every checklist below rather than being tied to a single Big Idea. Our <a href="/blogs/ap-csp/ap-csp-forty-terms-ranked">AP CSP vocabulary guide</a> is where you go to check a definition cold, in seconds, without opening a full lesson. Our <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">written response prompt bank</a> is where you go once your content review is solid and you need timed practice putting it into a scored answer. Keep both open in a tab while you work through the checklists.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Big Idea 1 is about the process behind your own Create task project: how you built it, tested it, documented it, and can talk about it under a timer. Review here means checking your own project against a real standard, not re-reading a definition.'),
  H.ul([
    'Name your own project\'s one incremental step and one iterative step in a single sentence each. If you cannot tell the two apart cleanly, that pair is the single most common Big Idea 1 vocabulary mix-up, so drill it with the <a href="/blogs/ap-csp/ap-csp-forty-terms-ranked">vocabulary guide\'s Big Idea 1 section</a> before moving on.',
    'If any part of your project used AI assistance, re-read the <a href="/blogs/ap-csp/ap-csp-ai-policy-create-task-nuance">AI policy deep dive</a> and confirm your attribution is documented the specific way it requires, not just noted in a comment.',
    'If your project idea still feels shaky this late, or you have not finalized your two code segments, work through the <a href="/blogs/ap-csp/ap-csp-create-task-project-ideas">Create task project ideas post</a> and the <a href="/blogs/ap-csp/ap-csp-personalized-project-reference-segments">Personalized Project Reference segment selection guide</a> this week, not the week before it is due.',
    'Write or finish one real entry in your project\'s bug log using the method in the <a href="/blogs/ap-csp/ap-csp-bug-log-errors-testing-practice">bug log post</a>, then check it against that post\'s two practice questions on what makes an entry strong.',
    'Read the <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">what changed on the Create task post</a> once if you have not already, so you know exactly what is built at home versus answered under proctor on the end of course exam.',
    'Pick two prompts tagged program design or algorithm development from the <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">written response prompt bank</a> and answer them from your own project, timed.',
    'Take one written response answer you already drafted and rewrite it using the fix in the <a href="/blogs/ap-csp/ap-csp-plausible-answers-that-earn-nothing">plausible answers that earn nothing post</a>: name the exact variable, procedure, or error instead of describing the concept around it.',
    'Confirm your submission timeline against the <a href="/blogs/ap-csp/ap-csp-project-reference-deadline-how-students-miss-it">deadline post</a>. Students lose points to the calendar, not just to weak content, more often than the deadline feels close enough to worry about yet.',
  ]),

  H.h2(SECTIONS[2]),
  H.p('Big Idea 2 is about representing and reducing data underneath whatever a program does with it. This section rewards being able to rebuild the reasoning from scratch, not recognize it when you see it again.'),
  H.ul([
    'Close the reference sheet and re-derive the bit range formula from the <a href="/blogs/ap-csp/ap-csp-binary-bits-overflow">binary and overflow guide</a> on a blank page, then redo its worked overflow example without looking back at the walkthrough.',
    'Rebuild the lossy versus lossless distinction from memory: name three file formats in each camp and the one-sentence trade-off, then check yourself against the <a href="/blogs/ap-csp/ap-csp-lossy-lossless-compression">compression guide</a>. Mixing up which one is reversible is the single most common error this specific post exists to fix.',
    'Re-read only the data abstraction half, not the procedural half, of the <a href="/blogs/ap-csp/ap-csp-abstraction-data-procedural">data and procedural abstraction guide</a>, and name the specific list your own Create task project uses to replace several separate variables.',
    'Run the Big Idea 2 section of the <a href="/blogs/ap-csp/ap-csp-forty-terms-ranked">vocabulary guide</a> as a cold-recall drill: bit, overflow, lossy compression, lossless compression, metadata. Anything you hesitate on for more than a few seconds goes back on your list.',
  ]),

  H.h2(SECTIONS[3]),
  H.p('Big Idea 3 is the largest single source of exam vocabulary and the largest share of the multiple choice section by a wide margin, because it is the course\'s actual programming language, expressed as pseudocode. Review here means tracing, not just recognizing syntax.'),
  H.ul([
    'Read the <a href="/blogs/ap-csp/ap-csp-pseudocode-complete-syntax-guide">complete pseudocode syntax guide</a> start to finish once without the official reference sheet open, then check what you got wrong against the sheet afterward, not before.',
    'Re-trace 3 list-operation problems from the <a href="/blogs/ap-csp/ap-csp-list-operations-index-shift">list operations guide</a>, tracking specifically how INSERT and REMOVE shift every later index by one. This is the index-shift trap that catches students moving from 0-indexed Python or Java habits into AP CSP\'s 1-indexed lists.',
    'Redo the worked scope example from the <a href="/blogs/ap-csp/ap-csp-procedures-parameters-return-scope">procedures, parameters, and return post</a> from memory: write out what the same variable name holds at each point inside and outside the procedure, then check your trace line by line.',
    'Rerun the two worked practice questions in the <a href="/blogs/ap-csp/ap-csp-robot-grid-problems-method">robot grid method post</a> under a timer, using the recognition method rather than working each one from scratch.',
    'Redo the two doubling-comparison practice questions in the <a href="/blogs/ap-csp/ap-csp-algorithm-efficiency-reasonable-time">algorithm efficiency post</a> and confirm you can reason about reasonable versus unreasonable time without reaching for formal complexity notation, since the exam never requires it.',
    'Go back to the procedural abstraction half of the <a href="/blogs/ap-csp/ap-csp-abstraction-data-procedural">abstraction guide</a> and connect it to one specific, parameterized procedure in your own Create task project that gets called more than once with different results.',
  ]),

  H.h2(SECTIONS[4]),
  H.p('Big Idea 4 covers how devices actually reach each other, and this blog currently has one deep dive for it, so this checklist leans harder on that single post plus the vocabulary guide than the other sections do.'),
  H.ul([
    'Read, or re-read, the <a href="/blogs/ap-csp/ap-csp-how-the-internet-works">how the internet actually works guide</a> start to finish, then close it and explain, out loud or on paper, what a protocol, a packet, and redundancy each specifically contribute to fault tolerance. Naming the mechanism rather than restating the property is exactly where written response credit is won or lost on this Big Idea.',
    'Write one paragraph answering why a video call degrades before a text chat does on the same slow connection, using the term bandwidth correctly rather than just saying the connection is bad.',
    'Two Big Idea 4 terms, IP address and DNS, do not have their own dedicated post on this blog yet. For those two specifically, lean on the <a href="/blogs/ap-csp/ap-csp-forty-terms-ranked">vocabulary guide\'s Big Idea 4 section</a> directly rather than searching for a deep dive that does not exist.',
  ]),
  H.box('tip', 'An honest note on this Big Idea\'s content depth', '<p>Big Idea 4 carries a real, published share of the multiple choice section, but it currently has the thinnest dedicated content on this blog relative to that share. Do not read the short checklist above as a signal that this Big Idea matters less. It means one strong post has to do more of the work, so give it a genuinely careful read rather than skimming it because the checklist is short.</p>'),

  H.h2(SECTIONS[5]),
  H.p('Big Idea 5 steps back from writing programs and asks how computing affects people, tested at a precise, applied level rather than as a values discussion. This section currently has one full deep dive, on data privacy specifically, with the remaining terms covered at vocabulary depth only.'),
  H.ul([
    'Redo the metadata versus content and PII versus not scenario questions in the <a href="/blogs/ap-csp/ap-csp-cookies-metadata-pii-big-idea-5">data privacy guide</a> cold, without rereading the walkthrough first.',
    'Write one paragraph from memory distinguishing digital divide, bias in computing, and crowdsourcing, then check it against the Big Idea 5 section of the <a href="/blogs/ap-csp/ap-csp-forty-terms-ranked">vocabulary guide</a>. These three, plus open access, Creative Commons, phishing, and keylogging, are currently covered at vocabulary depth rather than in a dedicated deep dive, so the vocabulary guide is the primary review tool for them until that changes.',
    'Pick one written response prompt from the <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">prompt bank</a> that touches data and procedural abstraction or program design in a real-world context, and answer it with a Big Idea 5 concept named explicitly rather than gestured at.',
  ]),

  H.h2(SECTIONS[6]),
  H.p('The five Big Ideas are not weighted equally on the multiple choice section, and a study plan that treats them as equal wastes hours on the smallest one while shortchanging the largest. The table below restates the published weighting alongside a suggested study priority; full detail and the two-question practice on this specific topic live in our <a href="/blogs/ap-csp/ap-csp-exam-format-every-section">exam format and weighting guide</a>.'),
  H.table(
    ['Big Idea', 'Share of the multiple choice section', 'Suggested study priority'],
    [
      ['1: Creative Development', H.stat('10 to 13 percent', SRC.ced), 'Smallest block. Do not skip it, but do not over-invest here either.'],
      ['2: Data', H.stat('17 to 22 percent', SRC.ced), 'Solid middle block, worth a full week of focused review.'],
      ['3: Algorithms and Programming', H.stat('30 to 35 percent', SRC.ced), 'Largest block by a wide margin. Start here if you are choosing where to begin.'],
      ['4: Computer Systems and Networks', H.stat('11 to 15 percent', SRC.ced), 'Second-smallest block, but do not let thin blog coverage read as thin exam weight.'],
      ['5: Impact of Computing', H.stat('21 to 26 percent', SRC.ced), 'Large block. Treat it as a real priority, not an afterthought before the exam.'],
    ]
  ),
  H.p('Two things worth saying plainly about that table. First, these are published ranges, not fixed question counts, so treat the order as a priority guide rather than an exact schedule. Second, notice that the amount of dedicated content on this blog per Big Idea does not track its exam weight cleanly: Big Idea 3 has both the heaviest weight and the deepest library, which lines up, but Big Idea 4 carries real weight with comparatively thin coverage, which is exactly why the checklist above leans so hard on its one guide and the vocabulary post. Let the exam weighting, not the length of a section on this page, tell you how much time a Big Idea deserves.'),
  H.p('If you are further out from the exam and pacing a longer plan, spend roughly your first pass on Algorithms and Programming and Impact of Computing together, since between them they cover more than half the multiple choice section, then work backward through Data, Computer Systems and Networks, and Creative Development. If you are in your final week, our <a href="/blogs/ap-csp/ap-csp-mcq-pacing-strategy">MCQ pacing guide</a> and <a href="/blogs/ap-csp/ap-csp-practice-exam-common-mistakes">practice exam pitfalls post</a> are worth reading before you sit a last full practice exam, and our <a href="/blogs/ap-csp/ap-csp-what-a-5-requires">score guide</a> explains how your Create task score and multiple choice performance combine so you know where a strong final week of review actually moves the needle.'),

  H.h2(SECTIONS[7]),
  H.p('Both questions below check whether the review habits above actually stuck, the way a real exam scenario would, rather than asking you to recall an isolated definition.'),
  H.mcq({
    n: 1,
    stem: 'A student\'s program stores a grocery list as a list of five items. The student calls INSERT to add a new item at position 2, then calls REMOVE on position 5. Which of the following correctly describes what happens to the item that was originally at position 3, immediately after both operations complete?',
    options: [
      'It stays at position 3 the entire time, since neither operation targeted it directly',
      'It moves to position 4 after the INSERT, then back to position 3 after the REMOVE',
      'It moves to position 4 after the INSERT and stays at position 4 after the REMOVE, since the REMOVE targeted a later position',
      'It is deleted, since REMOVE clears the whole list back to its original length',
    ],
    correct: 1,
    why: 'INSERT at position 2 shifts every item from position 2 onward one position later, so the item originally at position 3 moves to position 4. REMOVE at position 5 only shifts items after position 5, which does not include position 4, so the item stays at position 4 after the REMOVE. This is exactly the index-shift trap the list operations guide is built to drill: an item can move without ever being the target of an operation, simply because something inserted or removed earlier in the list shifted everything after it.',
  }),
  H.mcq({
    n: 2,
    stem: 'During a single video call, a student notices the video freezes and pixelates on a slow connection well before the accompanying text chat messages stop arriving. A written response asks the student to explain this difference using a specific Big Idea 4 concept. Which answer earns credit for naming the actual mechanism rather than just describing the symptom?',
    options: [
      'The video call uses a different protocol than the text chat, which is why one fails first',
      'Video requires far more bandwidth to transmit smoothly than text does, so a limited connection runs out of capacity for video before it runs out of capacity for much smaller text messages',
      'The video call is less redundant than the text chat, so it has no way to route around the slow connection',
      'The router has a bug that specifically affects video data and not text data',
    ],
    correct: 1,
    why: 'Bandwidth is the maximum rate at which data can move over a connection, and video is a far larger, continuous stream of data than short text messages, so a limited connection\'s bandwidth ceiling gets hit by video first. The other options either invent a mechanism the scenario never describes, like a router bug, or reach for a real Big Idea 4 term, protocol or redundancy, that does not actually explain a bandwidth-limited slowdown. Naming bandwidth specifically, rather than a vague "the connection is bad," is what separates a scored answer from an unscored one here.',
  }),

  H.h2(SECTIONS[8]),
  H.faq([
    { q: 'How is this different from the AP CSP vocabulary post on this blog?', a: 'The vocabulary post is a reference: forty terms, defined and ranked, organized for fast recall lookup. This post is a plan: a checklist of what to actually do in each Big Idea, telling you which post to read, which problems to re-trace, and roughly how much time to spend where. Use the vocabulary post to check a definition in seconds while you work through the checklists here.' },
    { q: 'Do I need to read every linked post before I can use this study guide?', a: 'No. This guide is meant to be worked through Big Idea by Big Idea over time, not read cover to cover in one sitting. Use the checklist for whichever Big Idea you are reviewing that day, click into only the specific linked posts that checklist points to, and move to the next section when you can complete its checklist without hesitating.' },
    { q: 'What if I only have a few days left before the exam, not a few weeks?', a: 'Start with the Big Idea 3 and Big Idea 5 checklists first, since together those two carry the largest share of the multiple choice section, then work through Data. Save the MCQ pacing guide and practice exam pitfalls post for the day or two before the exam, once your content review is as solid as it is going to get.' },
    { q: 'Some Big Ideas have far more linked posts than others. Does that mean they matter more?', a: 'Not necessarily, and the time allocation section above says this directly: Big Idea 4 has thin dedicated coverage on this blog relative to its real exam weight, so a short checklist there should not read as a small priority. Use the weighting table, not the length of a checklist, to decide how much time a Big Idea actually deserves.' },
  ]),

  H.cta({
    heading: 'Turn this plan into finished review',
    body: 'This guide tells you what to do and where. Our full CSP resource library and written response guide are where the actual work happens.',
    links: [
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects AP CSP\'s five Big Ideas and the current CSP blog library as of publication. Last reviewed October 20, 2026.'),
]);

module.exports = { meta, body };
