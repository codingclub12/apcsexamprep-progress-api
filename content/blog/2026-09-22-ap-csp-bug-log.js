'use strict';
// Weekly course post: AP CSP. A practice/method post, not a prompt-answering
// post. The companion piece, 2026-09-08-ap-csp-written-response-prompts.js,
// covers what an errors and testing written response prompt looks like and
// how to answer one. This post teaches the habit that makes answering it easy:
// keeping a running bug log during Create task project work so a student
// walks into the exam with real, specific bugs already documented instead of
// trying to invent a plausible one under pressure.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why an AP CSP Bug Log Beats Trying to Remember One Later',
  'What to Record in Every AP CSP Bug Log Entry',
  'A Worked Bug Log Entry, Start to Finish',
  'Turning a Log Entry Into a Written Response Answer',
  'Building the Habit During Create Task Work',
];

const meta = {
  title: 'The AP CSP Bug Log That Answers Your Errors and Testing Prompt',
  handle: 'ap-csp-bug-log-errors-testing-practice',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp bug log',
  publishOn: '2026-09-25',
  seoTitle: 'AP CSP Bug Log: Ace the Errors and Testing Prompt',
  seoDescription: 'Keep an AP CSP bug log while you build your Create task project, and turn a real documented bug into a strong errors and testing written response answer.',
  summary: 'How to keep a running AP CSP bug log during Create task project work, with a worked example entry and two practice questions on what makes an entry strong.',
  tags: ['AP CSP', 'Bug Log', 'Errors and Testing', 'Create Performance Task', 'Study Strategy'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('An AP CSP bug log is a running record of the real bugs you hit while building your Create task project, written down the moment you find them. Keep one all year and the errors and testing written response stops being a prompt you have to improvise an answer to under a timer. It becomes a prompt you just report on.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Our <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">written response practice bank</a> already covers what the errors and testing category asks for and gives you sixteen prompts across all four categories to rehearse against. This post is not that post. It does not re-teach the four categories or walk through prompt wording. It teaches a habit: keeping an AP CSP bug log throughout the year, so that when an errors and testing prompt actually shows up, you are not staring at a blank page trying to remember a bug from three months ago, or worse, trying to invent one that sounds plausible.'),
  H.p('Here is the problem a bug log solves. On exam day, the errors and testing prompt asks about a specific defect: what it was, how you found it, and what you changed to fix it. If you did not write that down when it happened, you are reconstructing it from memory months later, under a timer, while also trying to sound specific. Memory is not built for that. You will remember that your program had bugs, in the vague way everyone remembers their program had bugs, but you will not remember the exact condition that triggered one, the exact input that revealed it, or the exact line you changed. A grader can tell the difference between a memory and a record, because a memory drifts toward the generic and a record stays specific.'),
  H.box('warn', 'The trap this habit avoids', '<p>Under exam pressure, a student who did not keep a log often does one of two things: writes a true but generic answer ("I tested my program and fixed the bugs I found"), which earns very little because it could describe any project ever debugged, or invents a bug that sounds right but falls apart under any follow-up detail, because it never actually happened. Neither problem exists for a student reading from their own log.</p>'),
  H.p('The fix is not "try to remember better." It is "stop relying on memory." A bug log is just a place, updated in the moment, where every real bug you hit during Create task development gets written down while the details are still fresh: what you expected, what actually happened, how you noticed the gap, and what you changed. Five minutes at the moment of discovery beats twenty minutes of guessing in April.'),

  H.h2(SECTIONS[1]),
  H.p('A bug log entry only needs four things, always in the same order, because that order is also the order a strong written response answer wants them in. Skipping any one of the four is what turns a specific entry into a vague one.'),
  H.ol([
    'What you expected: the correct behavior you were building toward, stated as a specific outcome, not a general goal.',
    'What actually happened: the specific, observable way the program departed from that expectation. A crash, a wrong value, a missing item, a display that never updated.',
    'How you found it: the exact input or action that revealed the gap. Not "I tested it," but which input, and why you chose that particular one.',
    'What you changed to fix it: the specific line, condition, or value you altered, and how you confirmed afterward that the fix actually worked.',
  ]),
  H.p('Notice what is not on that list. There is no field for "how the bug made me feel" or "general lesson learned." A bug log is not a diary. It is closer to a lab notebook: terse, specific, and useful to a reader who was not in the room when it happened. If an entry reads naturally as a sentence a stranger could say about almost any project, it is missing one of the four fields above.'),
  H.box('key', 'Write it down at the moment, not at the end of the day', '<p>The single biggest reason bug logs fail is delay. A bug you fix at 4:15 and log at 4:16 gets the real input, the real error message, and the real line you changed. The same bug logged from memory at 9:00 that night gets a rounded-off summary, because the specific details are already fading. If keeping a running log feels like friction, keep it as a plain text file or a notes app open next to your code, and write the entry the moment the fix works, before you move on to the next thing.</p>'),
  H.p('A log entry does not have to be long. Four short lines that hit all four fields beat four paragraphs that hit none of them precisely. The worked example in the next section is intentionally compact for exactly this reason.'),

  H.h2(SECTIONS[2]),
  H.p('Here is what a real entry looks like, drawn from a plausible Create task project called StudyStreak: a habit tracker that logs each study session a student completes to a list, and includes a procedure meant to show the five most recent sessions on the home screen. This is the kind of off-by-one bug that shows up constantly in list-heavy Create task projects, and it makes a clean example because the fix is one line and the story is easy to trace.'),
  H.code('showRecent(sessions):\n    count <- LENGTH(sessions) - 5\n    REPEAT UNTIL (count = LENGTH(sessions))\n    {\n        DISPLAY (sessions[count])\n        count <- count + 1\n    }\n\n// Bug: this stops one iteration early and never displays\n// sessions[LENGTH(sessions)], the newest entry in the list.\n\n// Fix: change the stopping condition so the loop runs through\n// the final index instead of stopping just before it.\n\nshowRecent(sessions):\n    count <- LENGTH(sessions) - 5\n    REPEAT UNTIL (count = LENGTH(sessions) + 1)\n    {\n        DISPLAY (sessions[count])\n        count <- count + 1\n    }'),
  H.p('Now here is that same bug written up as a log entry, the way it would actually get typed in the moment of finding it.'),
  H.table(
    ['Field', 'What was actually written down'],
    [
      ['What I expected', 'The home screen shows the five most recent study sessions, with the session I logged today included as the last item shown.'],
      ['What actually happened', 'After logging a session today, the home screen still only showed the previous five sessions. The one from today never appeared, even though it was in the list.'],
      ['How I found it', 'I logged a sixth session on top of five existing ones and checked the display by hand against the actual list order, instead of just glancing at the screen and assuming it looked right.'],
      ['What I changed', 'The loop in showRecent stopped one count too early because the stopping condition was count equals LENGTH(sessions) instead of count equals LENGTH(sessions) plus 1. Changed the condition to run through the final index.'],
      ['How I confirmed the fix', 'Reran with 5, 6, and 12 sessions logged, and checked each time that the most recently logged session appeared as the last item on the home screen.'],
    ],
  ),
  H.p('That table is the entry. It took under a minute to write once the fix was working, and every field is something a grader could not have guessed from a generic description of the project. This is the target: an entry short enough to write without breaking your flow, specific enough to still be useful in April.'),

  H.h2(SECTIONS[3]),
  H.p('The reason this habit pays off directly on exam day is that a well-kept log entry and a strong written response answer ask for the exact same information, in the exact same order. Turning one into the other is not really writing, it is transcribing.'),
  H.ul([
    '"What I expected" becomes the sentence that states the correct, intended behavior of your program.',
    '"What actually happened" becomes the sentence that names the specific, observable defect.',
    '"How I found it" becomes the sentence that names the input or test that revealed the bug, which is exactly what an errors and testing prompt is often asking for directly.',
    '"What I changed" becomes the sentence that names the fix and, ideally, how you confirmed it held.',
  ]),
  H.p('Applied to the StudyStreak entry above, a written response answer falls out almost verbatim: "My showRecent procedure was supposed to display the five most recently logged study sessions, ending with the one logged today. Instead, after logging a new session, the home screen still showed the previous five and left out today\'s entry. I found this by logging a sixth session on top of five existing ones and checking the display against the actual list order by hand. The loop\'s stopping condition was checking count equals LENGTH(sessions), which caused it to stop one iteration before reaching the final index, so I changed the condition to count equals LENGTH(sessions) plus 1 and confirmed the newest session appeared correctly with 5, 6, and 12 sessions logged." That is a complete, specific answer, and none of it had to be invented in the exam room. It was written down in April, sitting right there in the log, months before it needed to be typed under a timer.'),
  H.box('tip', 'Practice the transcription, not just the logging', '<p>Once you have a few entries, pick one and write the written response version of it under a timer, the same way our <a href="/blogs/ap-csp/ap-csp-written-response-practice-prompts">written response practice bank</a> has you rehearse. The gap between your log entry and your timed answer should shrink fast, because the habit is mostly about getting comfortable saying the same four facts in exam prose instead of log shorthand.</p>'),

  H.h2(SECTIONS[4]),
  H.p('A bug log only works if it survives contact with an actual project, which means it has to be low friction enough that you keep using it past the first week. A few habits make that realistic.'),
  H.ol([
    'Keep it in one place, next to your code. A single text file, a notes app, or a comment block at the bottom of your project file all work. What matters is that it is open while you are working, not filed away somewhere you have to go looking for it.',
    'Log the bug the moment the fix works, not at the end of a coding session. The details you need are freshest at that exact moment and get vaguer every hour after.',
    'Log every bug that costs you real time to find, not just the ones that feel dramatic. A quiet off-by-one that took twenty minutes to track down is often a better written response source than a crash that was obvious the second it happened, because the finding process is more interesting to describe.',
    'Do not edit old entries to sound more impressive later. The value of the log is that it is a record made in the moment, not a story reconstructed afterward. A slightly rough entry from the actual day beats a polished one written from memory a month later.',
  ]),
  H.p('If your project is early enough that you have not hit a real bug yet, that is not a reason to skip the habit, it is a reason to start the file now so it is ready the first time you do. Most Create task projects that involve a list, a loop, and a procedure the way our <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">Create task guide</a> and our <a href="/blogs/ap-csp/ap-csp-create-task-project-ideas">project ideas post</a> describe will produce a genuine bug within the first real testing session. When it happens, the log is already open and waiting, and the entry takes a minute instead of becoming one more thing you meant to write down and never did.'),
  H.p('One more thing worth saying plainly: a bug log with three or four solid entries by the time you sit for the written response section is worth far more than a log with zero entries and a good memory. You do not need every bug you ever hit. You need a small handful, each one specific enough that you could answer a follow-up question about it without hesitating.'),

  H.h2('Practice: Read a Log Entry Like a Grader'),
  H.p('These two questions practice reading a bug log entry the way a grader reads a written response answer, which is the skill that actually matters once your own entries exist.'),
  H.mcq({
    n: 1,
    stem: 'Four students logged a bug from their Create task project the same week. Which entry would give the student the most to work with in a timed errors and testing written response?',
    options: [
      '"My sorting procedure had a bug where it did not sort things right. I found it by running the program and noticing the output looked wrong, so I fixed it."',
      '"Fixed a bug today. Testing is important because it catches problems before they become bigger problems later in development."',
      '"My averageScore procedure returned an error when the scores list was empty, because it divided the total by LENGTH(scores). I found this by testing with an empty list on purpose. I fixed it by returning 0 whenever LENGTH(scores) equals 0, then confirmed it worked with an empty list, a one item list, and a normal list."',
      '"I tested my whole program at the end and everything worked, so there were no major bugs to report this week."',
      ],
    correct: 2,
    why: 'The third entry names the exact procedure, the exact condition that triggered the failure, the exact input used to reveal it on purpose, the exact fix, and the exact confirmation afterward. That is all four fields a strong entry needs. The first entry names a symptom without a cause or a fix. The second is a general statement about testing that is true of any project and names no actual bug. The fourth reports the absence of a bug and gives a grader nothing to evaluate. Only the third could be transcribed directly into a strong written response answer without inventing a single detail.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student logs this bug entry: "I deliberately tested my checkout procedure with a cart holding the maximum number of items my app allows, twenty, right at the boundary the spec sets, before testing it with a normal cart of three or four items." Which testing approach does this entry demonstrate?',
    options: [
      'Boundary or edge case testing, checking behavior right at the limit a program is designed to handle',
      'Regression testing, confirming that a previously fixed bug has not resurfaced',
      'Print statement debugging, tracing a value by displaying it at each step',
      'Random testing, checking arbitrary unrelated inputs with no particular reasoning behind them',
    ],
    correct: 0,
    why: 'The entry describes testing right at the maximum size the app is specified to allow, before testing a typical middle-of-the-road case. That deliberate focus on the edge of what the program is supposed to handle, rather than a typical case, is the definition of boundary or edge case testing. Regression testing would involve rechecking a bug that was already fixed. Print statement debugging is a discovery technique, not an input choice. Random testing would mean no particular reasoning connected the input to what it was meant to reveal, which is the opposite of what this entry describes: the input was chosen specifically because it sits at the boundary the spec defines.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'How is this different from just answering the written response prompts directly?', a: 'Our written response practice bank has you draft timed answers to sixteen prompts across all four categories, including errors and testing. This post is about the habit that makes those answers strong in the first place: logging real bugs as they happen during project work, so you have specific material to draw on instead of having to reconstruct or invent something on the spot.' },
    { q: 'Do I need special software to keep a bug log?', a: 'No. A plain text file, a notes app, or even a dated comment block at the bottom of your project file works. The format does not matter. What matters is that it is open while you work and that you write the entry the moment a fix works, while the details are still fresh.' },
    { q: 'What if I only find small bugs, not dramatic ones?', a: 'Small bugs are usually better material, not worse. An off-by-one loop bound or a wrong comparison operator is often easier to explain precisely than a large, messy failure, and precision is what the written response rewards. A quiet bug you can trace start to finish beats a dramatic one you can only describe vaguely.' },
    { q: 'How many entries do I actually need by exam time?', a: 'A handful of specific, complete entries beats a long list of rushed ones. Three or four entries, each with all four fields filled in clearly, gives you more than enough to answer confidently, including a follow-up question, without hesitating or improvising.' },
    { q: 'Can I start my bug log partway through the year if I have not been keeping one?', a: 'Yes, and the sooner the better. Open a file today, next to whatever project you are currently building, and log the very next real bug you hit. A log started in October with four strong entries by spring is far more useful than no log at all.' },
  ]),

  H.cta({
    heading: 'Turn the habit into exam-ready answers',
    body: 'Once your log has a few entries, rehearse turning them into timed written responses using the full practice bank, and review the category breakdown if you want the reasoning behind the written response format itself.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-written-response-practice-prompts', text: 'Written response practice bank' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Written to the AP CSP Create performance task written response format as revised by College Board for the current exam cycle. Last reviewed September 22, 2026.'),
]);

module.exports = { meta, body };
