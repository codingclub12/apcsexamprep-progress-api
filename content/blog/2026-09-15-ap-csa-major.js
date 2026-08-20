'use strict';
// Brief: news-pegged. The peg here is not stale. The "CS enrollment is
// crashing" line that circulated in 2023-2024 tech-blog takes was mostly
// vibes at the time; going into fall 2026 it is close to literally true and
// backed by primary sources: the National Student Clearinghouse's own fall
// 2025 enrollment data, the New York Fed's recurring labor-market-for-grads
// series, a named SignalFire hiring report, and the Stanford Digital Economy
// Lab's ADP-based "Canaries in the Coal Mine" study. Re-verified 2026-08-20
// per the track's re-verify-before-writing rule. Every figure below traces to
// one of those five sources through stat() or sourceNote(); none are
// re-derived or estimated.
const H = require('../../lib/blog-house');

const SRC = {
  enrollDecline: {
    source: 'National Student Clearinghouse Research Center',
    url: 'https://www.studentclearinghouse.org/nscblog/computer-science-enrollment-is-cooling/',
    asOf: 'fall 2025 enrollment data, published 2026',
  },
  nyFed: {
    source: 'Federal Reserve Bank of New York, Labor Market for Recent College Graduates',
    url: 'https://www.newyorkfed.org/research/college-labor-market',
    asOf: '2026',
  },
  signalfire: {
    source: 'SignalFire State of Tech Talent Report',
    url: 'https://www.signalfire.com/blog/signalfire-state-of-talent-report-2025',
    asOf: '2025 report, based on 2024 hiring data',
  },
  stanford: {
    source: 'Stanford Digital Economy Lab, "Canaries in the Coal Mine?"',
    url: 'https://digitaleconomy.stanford.edu/publication/canaries-in-the-coal-mine-six-facts-about-the-recent-employment-effects-of-artificial-intelligence/',
    asOf: 'updated 2026',
  },
  nace: {
    source: 'National Association of Colleges and Employers, Class of 2026 Salary Survey',
    url: 'https://www.naceweb.org/job-market/compensation/class-of-2026-salary-projections-are-promising',
    asOf: '2026',
  },
};

const SECTIONS = [
  'Is a computer science major still a good bet in 2026?',
  'What has genuinely gotten harder: the entry-level job market',
  'What is still true about a computer science major',
  'AP CSA does not decide your major, but it is real evidence',
  'What a junior with one AP CS course should actually do next',
  'A quick check: does the actual work feel like this?',
];

const meta = {
  title: 'Should You Still Get a Computer Science Major in 2026?',
  handle: 'ap-csa-should-you-major-in-cs',
  blogHandle: 'ap-csa',
  course: 'ap-csa',
  targetKeyword: 'computer science major',
  publishOn: '2026-09-15',
  seoTitle: 'Computer Science Major in 2026: Still Worth It?',
  seoDescription: 'A computer science major is harder to land a first job with in 2026. Here is the honest data, and what a junior with AP CSA should do next.',
  summary: 'Entry-level tech hiring really has gotten harder, and the data backing that is not a 2023 overreaction, it is current. Here is what a computer science major still gets you in 2026, what has changed, and how a junior who just took AP CSA should actually think about the decision.',
  tags: ['AP CSA', 'Computer Science Major', 'College Planning', 'Career Advice', 'AP Computer Science A'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('If you started hearing "don\'t major in computer science" from relatives, group chats, and career-advice content sometime in the last two years, here is the uncomfortable update: that is no longer an overreaction to a couple of rough hiring seasons. Going into fall 2026, the data backing it is real, current, and comes from named sources rather than vibes. A computer science major is also still, by a fair distance, one of the highest-paying and most flexible undergraduate degrees you can get. Both of those things are true at once, and a junior who just finished AP Computer Science A deserves the honest version of both, not the version that fits a headline.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('This is a brief, so it is going to stay close to the news: what changed, what the current numbers actually say, and what that means for a decision you are probably making sometime in the next year. It is not going to tell you to abandon computer science, and it is not going to tell you to charge in assuming the 2019 job market is waiting for you either. Both of those are lazy answers. The honest one takes a few more paragraphs.'),

  H.h2(SECTIONS[0]),
  H.p('Start with the enrollment data itself, because it is the cleanest signal that something real shifted, not just a sentiment shift in career-advice content.'),
  H.p(H.stat('undergraduate computer science enrollment at four-year colleges fell about 8.1%, from roughly 659,700 down to about 606,100 students, in fall 2025', SRC.enrollDecline)),
  H.p('That is the steepest single-year decline the Clearinghouse recorded in any field of study that year, and it is notable specifically because computer science enrollment had climbed every single year for roughly two decades before this one. Students, not just outside commentators, are recalibrating in real time. That does not automatically mean they are right to bail, but it does mean the "just kidding, CS is still booming exactly like it was in 2018" take is no longer supportable. The ground moved.'),
  H.sourceNote('National Student Clearinghouse Research Center, Computer Science Enrollment Is Cooling', 'https://www.studentclearinghouse.org/nscblog/computer-science-enrollment-is-cooling/', 'fall 2025 data'),
  H.p('So is a computer science major still a good bet in 2026? The honest, unsatisfying answer is: it depends heavily on what you are comparing it against and what you actually want out of it. Compared to the job market a computer science major walked into in 2019 or 2021, it is a harder bet. Compared to most other undergraduate majors on offer today, including plenty that get recommended as the "safe" alternative, it is still one of the stronger ones on the numbers that matter most, which is where the rest of this piece goes.'),

  H.h2(SECTIONS[1]),
  H.p('Here is what actually changed, in order, because "AI is coming for entry-level jobs" gets said so often that it has started to sound like background noise rather than a specific, measurable claim. It is specific and it is measurable.'),
  H.p(H.stat('new graduates made up only about 7% of new hires at large tech companies in 2024, down 25% from 2023 and more than 50% below 2019 levels', SRC.signalfire)),
  H.p('That is not a company or two pulling back. It is a broad shift in how the largest employers in the industry are allocating headcount, away from the entry-level roles that used to be the standard on-ramp into a software career. Budgets for junior hires have not just flattened, they have been redirected, and a meaningful part of that redirection is toward AI tooling that increasingly handles the kind of scoped, well-specified coding work that used to be a new grad\'s first year of real responsibility.'),
  H.p('That pattern shows up again, independently, in labor economics research that is not coming from a hiring platform with a product to sell.'),
  H.p(H.stat('employment of 22 to 25 year olds in the occupations most exposed to AI, including software developers, now runs about 19% below where it would be if it had kept pace with older workers in the same jobs', SRC.stanford)),
  H.p('The Stanford researchers behind that study were careful about what it does and does not show, and the "does not show" part matters as much as the headline: the gap is concentrated almost entirely in hiring, not in layoffs of workers already in the door. Experienced software engineers in the same companies are not seeing anything like this effect. If you are already five years into a software career, generative AI has, so far, mostly made you more productive rather than replaced you. It is the on-ramp itself that has narrowed, which is exactly the part of the pipeline a high school junior is about to enter.'),
  H.box('warn', 'What this looks like in practice', '<p>The unemployment gap shows up in national data too, not just hiring counts.</p>'),
  H.p(H.stat('computer science graduates currently carry about a 6.1% unemployment rate, versus roughly 4.2% for all recent college graduates combined', SRC.nyFed)),
  H.p('Read that carefully: it is a comparison against other recent graduates in general, not against some fantasy full-employment baseline, and computer science is coming in worse on that specific measure right now. That is genuinely new. For most of the last fifteen years, "get a CS degree" was sold, correctly at the time, as close to the safest bet on the table for entry-level employability. As of 2026, on this particular measure, it no longer clearly is.'),
  H.sourceNote('Federal Reserve Bank of New York, Labor Market for Recent College Graduates', 'https://www.newyorkfed.org/research/college-labor-market', '2026'),

  H.h2(SECTIONS[2]),
  H.p('None of that erases what a computer science major still gets you, and this is the part that gets dropped from a lot of the doom-framed coverage, because a hard headline travels further than a balanced one.'),
  H.p(H.stat('the average projected starting salary for a computer science graduate sits at about $81,535, the highest of any major category tracked, and roughly 6.9% higher than the year before', SRC.nace)),
  H.p('That figure is not a projection built on a rosy assumption about the job market recovering. It is a current, near-term salary survey published while the hiring headwinds above were also being reported. Both things are true in the same year: it has gotten harder to land the first job, and the graduates who do land one are, on average, still paid more than graduates of almost every other major. That is not a contradiction. It is what a smaller, more selective hiring funnel looks like from the inside: fewer offers, but the offers that go out still reflect real, scarce, valuable skill.'),
  H.box('key', 'The part that does not show up in a headline', '<p>Software developers already established in a role are not the ones losing ground in this data. The pain is concentrated at the entry point, not spread evenly across the profession. That distinction matters enormously for a high schooler, because you are not choosing whether to be a software engineer in 2026. You are choosing whether to spend four years becoming one, which means the market that actually matters to you is 2030, not this one.</p>'),
  H.p('It is also worth saying plainly what a computer science major is not, because some of the enrollment pullback is students correcting an overcorrection from a few years ago: it was never only a pipeline into "software engineer at a large tech company." A CS degree remains one of the more portable undergraduate credentials into finance, healthcare technology, government, defense, robotics, and a long list of industries that are quietly hiring engineers while the headlines focus on the largest and most visible employers. The version of the major that narrows down to one job title at one kind of company was always a simplification, and it is an even less accurate one now.'),

  H.h2(SECTIONS[3]),
  H.p('None of the numbers above answer the question that actually matters for you personally, which is not "is computer science a good major on average" but "is it a good major for me specifically." AP CSA cannot answer that on its own, and nothing here should be read as "a 5 on the exam means major in it" or "a 3 means don\'t." The exam does not decide the major. But how the work of AP CSA actually felt to you is real evidence, more real than most of what gets used to make this decision.'),
  H.p('Here is the distinction that matters. AP CSA is not primarily a test of memorized vocabulary or syntax recall, even though it looks that way from the outside. It is closer to a semester spent doing the actual cognitive work: reading a class definition carefully enough to predict what a method returns, tracing state through a loop line by line without losing track, noticing the one place a boundary condition breaks a method that otherwise looks correct. That is not a coincidence or a side effect of the exam design. It is close to what the entry-level version of the job actually is, before you have the experience to skip past that step.'),
  H.p('So the honest question to ask yourself is not "did I get a good score," it is "did the actual process of the course feel like something I want more of, or like something I was enduring to get to the score." Those are different students, and they tend to have different outcomes in a college CS program, independent of how the AP exam itself went.'),
  H.p('If tracing through a nested loop or debugging why a method returns the wrong value felt genuinely satisfying to work through, even when it was frustrating in the moment, that is a real signal worth weighing. If it felt like a chore you were willing to grind through for the grade or the credit, that is also real signal, and it is worth taking seriously rather than talking yourself out of noticing it. Our <a href="/blogs/ap-csa/ap-csa-variable-table-tracing-method">variable table tracing method</a> breakdown is a good gut check either way: if that specific kind of close, patient reasoning sounds appealing rather than tedious, that is closer to what a CS major\'s coursework actually demands than any enrollment statistic is.'),

  H.h2(SECTIONS[4]),
  H.p('So, calibrated advice, not a verdict. A junior with one AP computer science course under their belt is not in a position to make a binding four-year decision yet, and does not need to be. Here is what actually helps between now and when you submit applications.'),
  H.ul([
    'Take a second CS-adjacent course if your school offers one, whether that is AP CSA if you have only had AP CSP, a second-year programming elective, or a statistics or discrete math course. One data point is not enough to know if the fit is real; two independent ones tell you a lot more.',
    'Look past "computer science" as a single monolithic major. Software engineering, data science, computer engineering, and information systems programs overlap heavily with CS but land in different parts of the job market, and some of them have held up better through this hiring cycle than the traditional pure-CS track has.',
    'If you can, build one small thing outside of class this year, not for a college essay, but because actually shipping something small and working is the fastest way to find out whether you like the unglamorous majority of the job: debugging, reading documentation, and getting something to work correctly rather than almost correctly.',
    'Do not pick a college or a major purely off this year\'s hiring headlines. You graduate in roughly four years, not this spring, and hiring conditions in a fast-moving field like this one are a genuinely bad thing to extrapolate four years forward from a single data point.',
    'Talk to your AP CSA teacher, honestly, about how you actually performed on the parts of the course that were not multiple choice recall: the FRQ methods, the debugging exercises, the moments where you had to hold a lot of state in your head at once. That conversation is worth more than a practice test score.',
  ]),
  H.p('If you are weighing computer science against a specific alternative major, our breakdown of <a href="/blogs/ap-csa/ap-csa-college-credit-what-score">how AP CSA credit and placement actually work</a> is also worth reading before you assume the exam score itself settles anything about your college schedule, since that is a separate and commonly confused question from the major decision covered here.'),

  H.h2(SECTIONS[5]),
  H.p('One more honest data point, and it is not a statistic, it is a small piece of the actual work. A large share of what makes AP CSA students strong or shaky is not big ideas, it is precision under a rule they read past. Here is a short one on a rule from the Class Creation unit that trips up students who otherwise understand objects well.'),
  H.mcq({
    n: 1,
    stem: 'What is printed by the following code segment?',
    codeText: 'public class Counter {\n    private static int total = 0;\n    private int id;\n\n    public Counter() {\n        total++;\n        id = total;\n    }\n\n    public int getId() {\n        return id;\n    }\n}\n\n// In another class:\nCounter a = new Counter();\nCounter b = new Counter();\nCounter c = new Counter();\nSystem.out.println(a.getId() + " " + b.getId() + " " + c.getId());',
    options: [
      '1 2 3',
      '0 0 0',
      '3 3 3',
      '0 1 2',
    ],
    correct: 0,
    why: 'The field total is declared static, so there is exactly one copy of it shared by every Counter object, not a separate copy per instance. Each time the constructor runs, it increments that one shared counter before copying its current value into the new object\'s own instance field, id. The first object built gets id 1, the second gets id 2, and the third gets id 3, because each constructor call sees the updated shared total left behind by the one before it. Mixing up static and instance state, assuming every object gets its own fresh copy of every field, is one of the most common Class Creation mistakes on the exam, and it is exactly the kind of careful-reading habit the rest of a CS major keeps rewarding.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is computer science still a good major in 2026?', a: 'For the right student, yes, but it is a harder bet than it was five years ago. Entry-level hiring at large tech companies has genuinely tightened and unemployment among recent CS graduates is currently higher than the average across all majors, while average starting pay for the graduates who do get hired remains the highest of any major tracked. Both facts are real at the same time.' },
    { q: 'Has AI actually reduced entry-level programming jobs, or is that overstated?', a: 'It is not overstated at this point. Independent research using payroll data found employment for 22 to 25 year olds in AI-exposed roles like software development running well below where it would be expected based on older workers in the same jobs, and a separate hiring report found new graduates make up a much smaller share of big tech hiring than they did before 2023. The effect is concentrated in hiring of new workers, not in job losses for people already employed.' },
    { q: 'Does doing well in AP CSA mean I should major in computer science?', a: 'Not by itself. A strong AP CSA score is evidence you can handle the exam, not a guarantee about a four-year major. What is more useful is paying attention to whether the actual process, tracing code, debugging, reasoning about a class definition, felt engaging rather than just tolerable. That is closer to the real day-to-day of a CS major than the score is.' },
    { q: 'What should a high school junior do if they are unsure about majoring in CS?', a: 'Take a second CS-adjacent course to get a second data point, try building one small project outside of class, and look at related majors like data science or computer engineering rather than treating computer science as the only option. Avoid deciding a four-year major purely off this year\'s hiring headlines, since the job market you will graduate into is roughly four years away.' },
    { q: 'Are computer science starting salaries actually still high despite the weaker job market?', a: 'Yes. The average projected starting salary for computer science graduates is currently the highest of any major category tracked in national salary surveys, and it rose again this year. The harder part of the picture is landing that first offer at all, not what it pays once you do.' },
  ]),

  H.cta({
    heading: 'Whatever you decide, make AP CSA count',
    body: 'A free AP CSA score calculator and daily tracing practice, built to the current four-unit exam format, so the evidence you gather about the major is evidence you can actually trust.',
    links: [
      { href: '/pages/ap-csa-score-calculator', text: 'AP CSA score calculator' },
      { href: '/pages/ap-csa-qotd-hub', text: 'Daily tracing practice', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Enrollment, hiring, unemployment, and salary figures reflect the sources cited above as of 2026 and are the kind of data that shifts from year to year; check current reporting before making a final decision. Last reviewed September 15, 2026.'),
]);

module.exports = { meta, body };
