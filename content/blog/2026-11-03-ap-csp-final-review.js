'use strict';
// Weekly course post: AP CSP. Drill track. NOT the study-plan post: that post
// (ap-csp-big-idea-by-big-idea-study-guide) already organizes review by Big
// Idea with a checklist and links out to the deep-dive posts. This post is a
// mixed, timed practice set: six ORIGINAL practice questions pulled across
// all five Big Ideas, presented together the way the real MCQ section mixes
// topics, with a suggested time budget and worked answers revealed after an
// honest attempt rather than a navigation tool for what to read next.
const H = require('../../lib/blog-house');

const SRC = {
  mcq: { source: 'College Board, AP Computer Science Principles Assessment', url: 'https://apstudents.collegeboard.org/courses/ap-computer-science-principles/assessment', asOf: '2026-08-20' },
};

const SECTIONS = [
  'Why a Mixed, Timed Practice Set Instead of a Study Plan',
  'How to Run This AP CSP Final Review Practice Session',
  'The AP CSP Final Review Practice Set: Six Questions Across Five Big Ideas',
  'Two Bonus Questions, Worked Immediately',
  'Reading Your Results: What a Mixed Set Actually Tells You',
  'Frequently Asked Questions',
];

const meta = {
  title: 'The Half Year AP CSP Final Review: A Timed Mixed Practice Set',
  handle: 'ap-csp-half-year-mixed-review-practice',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp final review',
  publishOn: '2026-11-06',
  seoTitle: 'AP CSP Final Review: A Timed Mixed Practice Set',
  seoDescription: 'An AP CSP final review built as one timed, mixed practice set: six original questions across all five Big Ideas, answers revealed after you attempt them.',
  summary: 'A cumulative, timed AP CSP final review practice set rather than a study plan: six original multiple choice questions pulled across all five Big Ideas, Creative Development, Data, Algorithms and Programming, Computer Systems and Networks, and Impact of Computing, presented together with a suggested time budget the way the real exam mixes topics back to back, plus two bonus questions worked through immediately and guidance on where to go next based on which Big Idea trips you up.',
  tags: ['AP CSP', 'Final Review', 'Practice Questions', 'Mixed Practice', 'Timed Drill', 'Exam Prep'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('An AP CSP final review works best when it stops isolating one Big Idea at a time and starts mixing them the way the real exam does. This is not another study plan. It is a single timed, mixed practice set: six original questions pulled across all five Big Ideas, presented together with a suggested time budget, so you feel the actual back-to-back mental switching the multiple choice section demands before you ever sit down for the real thing.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('If you want an organized, Big Idea by Big Idea plan for what to review and in what order, our <a href="/blogs/ap-csp/ap-csp-big-idea-by-big-idea-study-guide">AP CSP study guide</a> is the right page and this is not it. That guide is a navigation tool: five checklists, one per Big Idea, each pointing at the specific deep-dive post that covers it. This post has a different, narrower job. It does not tell you what to read next. It puts you through a single cumulative session that jumps between Creative Development, Data, Algorithms and Programming, Computer Systems and Networks, and Impact of Computing in the same short sitting, the same way the actual AP CSP final review has to happen on exam day, where question four might be a robot grid trace and question five might be about who gets left out of a public Wi-Fi rollout.'),
  H.p('Single-topic practice, the kind you get from a post built around one Big Idea, is genuinely valuable earlier in your prep, and every question here is original: none of it duplicates a stem from any other post on this blog, including our own single-topic drills. But single-topic practice trains a skill the real exam never actually asks for, which is staying inside one mental frame for several minutes in a row. The real AP CSP final review, the multiple choice section itself, never works that way. It interleaves a Data question, then an Algorithms and Programming trace, then an Impact of Computing scenario, and the context switch between them is itself a skill. This set is built to train that switch directly, on purpose, with six fresh questions and two bonus ones worked through immediately afterward.'),
  H.box('key', 'What this post assumes you have already done', '<p>This set works best after you have already built real familiarity with each Big Idea individually, whether through our study guide\'s checklists, the dedicated deep-dive posts it links to, or your own class notes. If a specific question below stops you cold, that is useful information about where to go back and re-drill, not a sign you started this post too early. Treat a miss here as a pointer, not a verdict.</p>'),

  H.h2(SECTIONS[1]),
  H.p(`The real AP CSP multiple choice section allots ${H.stat('70 questions', SRC.mcq)} across ${H.stat('120 minutes', SRC.mcq)}, mixing every Big Idea throughout rather than grouping them, which is exactly the format this practice set is built to compress into a single sitting. Six questions cannot recreate the full section, but they can recreate the experience of switching topics under a clock, which is what a single-Big-Idea drill cannot do no matter how many questions it contains.`),
  H.p('Set a timer before you start, work through all six questions below in order without checking any answer early, and only then open each one\'s explanation. That order matters. Checking an answer immediately after each question lets you rationalize a guess before you have committed to it, which defeats the point of a timed set. Commit to all six first, the way you will have to commit to an answer and move on during the real section, then review.'),
  H.table(
    ['Question style in this set', 'Suggested time before you move on', 'Why that budget'],
    [
      ['Scenario reasoning, no trace required', 'About 45 seconds', 'This style tests whether you can name the right mechanism, not work through steps by hand'],
      ['Single-structure trace, one loop or one branch', 'About 75 seconds', 'One structure to hold in your head at a time, similar to a straightforward pseudocode item'],
      ['Multi-step trace, several moves or several operations in sequence', 'About 100 seconds', 'More state to track across steps, so budget real room before forcing a guess'],
      ['Whole six-question set, worked once through', 'About eight minutes total', 'A rough total if you use the per-question budgets above exactly once each, with no do-overs'],
    ]
  ),
  H.p('If you go over budget on a question, do not stop and fix your process mid-set. Note it, make your best call, and move on, exactly the triage habit our <a href="/blogs/ap-csp/ap-csp-mcq-pacing-strategy">MCQ pacing guide</a> covers in full. A mixed set is also the right place to practice that triage decision itself, since a single-topic drill rarely puts you in a position where a hard question threatens to eat time you need for a completely different Big Idea a minute later.'),

  H.h2(SECTIONS[2]),
  H.p('Work all six before checking any explanation. Each answer is behind its own reveal, so you can attempt the full set honestly and only look once you have committed.'),

  H.h3('Question 1, Big Idea 1: Creative Development'),
  H.mcq({
    n: 1,
    stem: 'A student\'s Create task project is a playlist ranking app. In the project\'s first week, they build and get working exactly one feature: a screen where a user types a song title and sees it appended to a running list, with nothing else in the app yet. Four weeks later, after testing shows that tapping the add button twice quickly creates two identical entries, they go back and revise that same add-song feature so it checks for a duplicate title before appending. Which pair of terms, in that order, correctly labels these two development steps?',
    options: [
      'Iterative, then incremental',
      'Incremental, then iterative',
      'Abstraction, then iteration',
      'Testing, then abstraction',
    ],
    correct: 1,
    why: 'Building and getting working a brand new piece of functionality, the add-song feature itself, before touching anything else is an incremental step: the program grows by one working piece at a time. Going back later to revise that same existing feature based on what testing revealed, the duplicate-entry bug, is an iterative step: the same feature is refined rather than a new one added. The first pass has to be incremental before there is anything to iterate on, which is why the order in the correct answer matters and is not interchangeable.',
  }),

  H.h3('Question 2, Big Idea 2: Data'),
  H.mcq({
    n: 2,
    stem: 'A fitness tracker app needs to store a step count that can range anywhere from 0 up to 500 steps recorded during a single short walk before the value resets to zero. What is the minimum number of bits needed to represent every value in that range without any value overflowing?',
    options: [
      '8 bits',
      '9 bits',
      '10 bits',
      '16 bits',
    ],
    correct: 1,
    why: 'An n-bit unsigned value can represent 2 to the power of n distinct values, numbered 0 through one less than that total. Eight bits gives 256 possible values, 0 through 255, which overflows well before it reaches 500. Nine bits gives 512 possible values, 0 through 511, which covers every value in the 0 to 500 range with a little room to spare. Ten and sixteen bits would also technically hold the range without overflowing, but the question asks for the minimum, and nine bits is the smallest count that gets there.',
  }),

  H.h3('Question 3, Big Idea 3: Algorithms and Programming'),
  H.mcq({
    n: 3,
    stem: 'What is displayed by the following program?',
    codeText: 'count ← 0\nFOR EACH value IN [3, 8, 11, 14, 7, 20] {\n  IF (value MOD 2 = 0) {\n    count ← count + 1\n  }\n}\nDISPLAY(count)',
    options: [
      '2',
      '3',
      '4',
      '6',
    ],
    correct: 1,
    why: 'The loop checks every value in the list against the MOD condition, which is true whenever a value is evenly divisible by two, meaning it is even. Walking the list in order: 3 is odd, 8 is even and count becomes 1, 11 is odd, 14 is even and count becomes 2, 7 is odd, 20 is even and count becomes 3. Three of the six values are even, so the loop finishes with count equal to 3, which is what DISPLAY outputs.',
  }),

  H.h3('Question 4, Big Idea 3: Algorithms and Programming'),
  H.mcq({
    n: 4,
    stem: 'A robot starts in the top-left corner of a grid that is three rows tall and four columns wide, facing right. It can move forward one square, or rotate ninety degrees left or right without moving. There are no interior obstacles, only the outer edges of the grid. The robot executes the following instructions in order: MOVE_FORWARD, MOVE_FORWARD, ROTATE_RIGHT, MOVE_FORWARD. Using row 1 as the top row and column 1 as the leftmost column, what is the robot\'s final position and facing direction?',
    options: [
      'Row 2, column 3, facing down',
      'Row 1, column 4, facing right',
      'Row 3, column 3, facing down',
      'Row 2, column 4, facing right',
    ],
    correct: 0,
    why: 'The robot starts at row 1, column 1, facing right. The first MOVE_FORWARD moves it one square right to row 1, column 2. The second MOVE_FORWARD moves it right again to row 1, column 3. ROTATE_RIGHT turns the robot ninety degrees clockwise from facing right to facing down, without changing its position. The final MOVE_FORWARD then moves it down one square, from row 1 to row 2, keeping column 3, so it ends at row 2, column 3, facing down. The distractors describe plausible but wrong outcomes: one skips the rotation\'s effect on the final move, one applies the rotation but forgets it changes which direction the last move actually travels.',
  }),

  H.h3('Question 5, Big Idea 4: Computer Systems and Networks'),
  H.mcq({
    n: 5,
    stem: 'A ride-sharing app\'s servers are spread across three data centers in different cities. When a driver in one city loses connection to the nearest data center because of a fiber cut, their app automatically reconnects to a different data center in another city within a few seconds, and the driver notices only a brief delay rather than the app failing outright. Which Big Idea 4 concept does this scenario best illustrate, and why?',
    options: [
      'Encryption, because the driver\'s data is protected from being read by outsiders during the reconnection',
      'Fault tolerance, because redundant infrastructure lets the system keep functioning when part of it fails',
      'Bandwidth, because the app is optimized to send less data while the connection is unstable',
      'Abstraction, because the driver does not need to know which data center their app is actually connected to',
    ],
    correct: 1,
    why: 'Fault tolerance is the property of a system continuing to function, possibly at a reduced level, when part of it fails, and redundant data centers that a device can fail over to are exactly the mechanism that provides it. The scenario never mentions data being protected from outsiders, so encryption is not what is being described, and it never mentions the amount of data sent changing, so bandwidth is not the mechanism either. Abstraction is a real, true fact about this system, the driver genuinely does not see which data center they are using, but it is not the specific mechanism the scenario is testing: the scenario is about what happens when one data center fails, not about what the driver does or does not need to know day to day. Fault tolerance names the actual reason the app kept working.',
  }),

  H.h3('Question 6, Big Idea 5: Impact of Computing'),
  H.mcq({
    n: 6,
    stem: 'A city installs free public Wi-Fi hotspots only in its downtown business district, reasoning that this is where the largest number of people pass through in a given day. Residents in the city\'s outlying neighborhoods, who are more likely to lack home internet service in the first place, gain no new access from the program. Which Big Idea 5 concept does this scenario best illustrate?',
    options: [
      'The digital divide, because a program meant to expand internet access is deployed in a way that reinforces an existing gap in who already has access',
      'Crowdsourcing, because the city gathered public input before choosing where to place the hotspots',
      'Bias in computing, because an algorithm made the placement decision',
      'Open access, because the Wi-Fi is free for anyone who happens to be downtown',
    ],
    correct: 0,
    why: 'The digital divide refers to the gap between groups who have ready access to computing devices and reliable internet and groups who do not, and this scenario is a direct example of a program that could have narrowed that gap instead widening it, since the neighborhoods least likely to already have home internet are exactly the ones left out. The scenario never describes a human or automated system gathering public input, so crowdsourcing does not apply, and it never describes an algorithm making the placement decision at all, a city planning choice is not what bias in computing refers to. Open access is also a specific, different term in this course, referring to freely and openly published research, software, or educational content, not to a physical hotspot being free to use, so it does not fit either.',
  }),

  H.h2(SECTIONS[3]),
  H.p('The two questions below are not part of the timed set above and are not hidden behind a reveal. Work through them at whatever pace helps, right after finishing the timed six, as extra reps on two Big Ideas that reward extra tracing practice.'),
  H.h3('Bonus, Data: choosing a compression approach'),
  H.p('A podcast network is preparing two very different audio files. File A is a finished episode meant to stream on a phone over a mobile connection, where a small amount of quality loss in exchange for a much smaller file is a good trade almost nobody will notice. File B is a courtroom deposition recording that a transcription service must be able to reproduce exactly, word for word and pause for pause, because a lost detail could change the legal record. File A should use lossy compression, since a slightly smaller, slightly less perfect copy serves its purpose well and the smaller size directly improves the listening experience over a mobile connection. File B needs lossless compression, since the requirement is not smaller file size but a guarantee that decompressing the file returns the exact original recording with nothing altered or discarded, which only a lossless approach can promise.'),
  H.h3('Bonus, Algorithms and Programming: tracing a procedure with a parameter and RETURN'),
  H.p('Trace the following procedure and the two calls made to it.'),
  H.code('PROCEDURE finalPrice(price, discount) {\n  IF (discount > price) {\n    RETURN 0\n  } ELSE {\n    RETURN price - discount\n  }\n}\nDISPLAY(finalPrice(12, 15))\nDISPLAY(finalPrice(20, 5))'),
  H.p('The first call passes price 12 and discount 15. Since the discount is greater than the price, the IF condition is true, so the procedure returns 0 immediately without reaching the ELSE branch, and the first DISPLAY shows 0. The second call passes price 20 and discount 5. The discount is not greater than the price, so the ELSE branch runs, returning price minus discount, which is 20 minus 5, or 15, and the second DISPLAY shows 15. The trap this procedure is built to catch is assuming a discount always gets subtracted: when the discount would push the price below zero, the procedure has to catch that case explicitly rather than letting the subtraction produce a negative price.'),

  H.h2(SECTIONS[4]),
  H.p('A mixed set does something a single-topic drill cannot: it tells you not just which Big Idea is weak, but whether it is weak on its own or only weak once it has to compete with four other topics for your attention in the same sitting. If you missed a question here but would have gotten the same concept right on a dedicated single-topic drill, the gap is not content knowledge, it is the context switch itself, and the fix is running more mixed sets like this one, not re-reading the underlying concept again.'),
  H.p('If you missed a question and are genuinely unsure why, that is a real content gap, and the fastest fix is going back to the specific Big Idea it came from rather than rereading this whole post. Our <a href="/blogs/ap-csp/ap-csp-big-idea-by-big-idea-study-guide">study guide</a> has a dedicated checklist for each of the five Big Ideas, with links to the deep dive built for exactly that ground. Missed the robot grid trace in question four. Its checklist points to the full method. Missed the digital divide question. Its checklist points to the vocabulary section covering that exact term. Use the miss as a pointer into that guide rather than trying to fix it from this post alone.'),
  H.box('tip', 'Run this set more than once', '<p>The specific six questions above will be memorized after one pass, which is fine and expected. The value of running a mixed set a second or third time, closer to the actual exam, is not re-testing these exact questions. It is rehearsing the timing and the topic-switching habit itself under a clock, using fresh mixed questions from a full practice exam once you are ready for one. Our <a href="/blogs/ap-csp/ap-csp-practice-exam-common-mistakes">practice exam pitfalls post</a> covers the mistakes students make the first time they sit a full, mixed, timed set like a real exam section.</p>'),

  H.h2(SECTIONS[5]),
  H.faq([
    { q: 'How is this different from the AP CSP study guide already on this blog?', a: 'The study guide is a navigation tool: five checklists, one per Big Idea, each pointing to the specific deep-dive post to review. This post is a timed practice set: six original questions mixed across all five Big Ideas in one sitting, meant to be attempted cold with a suggested time budget, then reviewed. Use the study guide to plan what to review, and use this post to practice switching between topics the way the real exam actually requires.' },
    { q: 'When in my prep should I use a mixed set like this instead of single-topic practice?', a: 'Single-topic practice is the right tool earlier in your review, while you are still building or confirming basic fluency in one Big Idea at a time. A mixed, timed set like this one is the right tool once you already have reasonable fluency across most or all five Big Ideas and want to practice the specific skill of holding a pace and switching context between them, which is exactly what the real multiple choice section demands.' },
    { q: 'Should I strictly time myself the first time I try this set?', a: 'Yes, if at all possible. The suggested time budgets in this post only mean something if you actually work against them rather than reviewing without a clock. If you go noticeably over budget on a question, resist the urge to fix it mid-set. Make your best call, note it, and move on, the same triage habit you will need for the real section, then come back and review your full set of answers only after finishing all six.' },
    { q: 'I missed several questions in the same Big Idea. What should I actually do next?', a: 'Treat that as a real signal, not just a bad set. Go to that specific Big Idea\'s checklist in our study guide, work through its linked posts and practice items, and then come back and try a fresh mixed set later rather than immediately rereading this same post. A cluster of misses in one Big Idea usually means that topic needs dedicated review time, which a mixed set is not built to provide on its own.' },
  ]),

  H.cta({
    heading: 'Keep the mixed practice going',
    body: 'This set is one timed pass across all five Big Ideas. Our full CSP resource library and score calculator help you turn a single practice session into an actual plan for exam day.',
    links: [
      { href: '/pages/ap-csp-score-calculator', text: 'CSP score calculator' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects AP CSP\'s five Big Ideas and the current CSP blog library as of publication. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
