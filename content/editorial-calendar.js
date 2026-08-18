'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE EDITORIAL CALENDAR: one slot per course per week.
//
//  This file is the QUEUE, not the posts. A slot says what next week's post for
//  a course is about and which query it is aimed at; the post itself lands in
//  content/blog/ and is what actually publishes. Keeping them separate means
//  the plan can be argued about cheaply, before anybody writes 2,000 words.
//
//  WHY THE SLOTS ARE SEASONAL RATHER THAN EVERGREEN
//  Search intent for AP courses is violently seasonal and the calendar follows
//  it. August and September are course-selection and getting-started intent.
//  October and November are first-assessment panic. Spring is exam prep. A post
//  about pacing published in August does nothing; the same post in April is the
//  most useful thing on the site. Publishing evergreen guides on a fixed cadence
//  ignores the one thing about this audience that is genuinely predictable.
//
//  ONE NEWS PEG PER SLOT, AND IT MUST BE CHECKED
//  Every slot names the peg it hangs on. Pegs decay: a peg written in August is
//  a claim about August. Whoever writes the post re-verifies the peg before
//  writing, and if it has gone stale the slot gets rewritten rather than
//  published on a dead hook.
// ─────────────────────────────────────────────────────────────────────────────

// Tuesdays. One post per course per week, four posts a week.
const WEEKS = [
  '2026-08-18', '2026-08-25', '2026-09-01', '2026-09-08',
  '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06',
  '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03',
];

// Slots are listed course by course so a single course's arc reads as an arc.
const SLOTS = [
  // ── AP CSA ────────────────────────────────────────────────────────────────
  { week: 0, course: 'ap-csa', status: 'published', handle: 'ap-csa-score-distribution-2026-analysis',
    targetKeyword: 'ap csa score distribution', peg: '2026 scores released, first 4-unit cohort' },
  { week: 1, course: 'ap-csa', targetKeyword: 'ap csa unit 1',
    workingTitle: 'AP CSA Unit 1 in a Week: Objects and Methods Without the Fog',
    peg: 'First unit is being taught right now in most schools',
    angle: 'The reference-vs-value confusion that Unit 1 creates and never resolves, fixed early. Highest-traffic beginner query of the fall.',
    links: ['/pages/ap-csa-qotd-hub', '/pages/ap-csa-unit-1-ultimate-study-guide'] },
  { week: 2, course: 'ap-csa', targetKeyword: 'java vs python',
    workingTitle: 'Why AP CSA Uses Java When Everyone Learns Python First',
    peg: 'Students arriving from AP CSP or a Python elective hit this wall in September',
    angle: 'Translation table for the ten constructs that trip Python natives. Captures a large query that no AP site owns.' },
  { week: 3, course: 'ap-csa', targetKeyword: 'ap csa for loops',
    workingTitle: 'Loop Tracing: The Skill the Whole AP CSA Exam Rests On',
    peg: 'Unit 2 lands in most pacing guides around here',
    angle: 'The variable-table method, taught properly, with ten traces of increasing nastiness.' },
  { week: 4, course: 'ap-csa', targetKeyword: 'ap csa practice test',
    workingTitle: 'How to Use an AP CSA Practice Test in September Without Wasting It',
    peg: 'First unit tests are being returned',
    angle: 'Diagnostic use versus rehearsal use. Most students burn practice material by taking it too early.' },
  { week: 5, course: 'ap-csa', targetKeyword: 'ap csa frq',
    workingTitle: 'Writing Your First AP CSA FRQ by Hand',
    peg: 'Too early for exam panic, exactly right for building the habit',
    angle: 'Closing the laptop. The single highest-leverage habit and nobody starts it in September.' },
  { week: 6, course: 'ap-csa', targetKeyword: 'ap csa arraylist',
    workingTitle: 'ArrayList vs Array: The Distinction the Exam Tests Every Year',
    peg: 'Unit 4 is the largest slice of the exam',
    angle: 'Ties directly to the heaviest-weighted unit. Strong evergreen search volume.' },
  { week: 7, course: 'ap-csa', targetKeyword: 'ap csa recursion',
    workingTitle: 'Recursion Without the Mysticism',
    peg: 'Recursion questions appear in every released exam',
    angle: 'Complements the existing recursion pillar rather than repeating it: this one is purely call-stack tracing drills.' },
  { week: 8, course: 'ap-csa', targetKeyword: 'ap csa score calculator',
    workingTitle: 'What Score Do You Actually Need on AP CSA to Get a 5',
    peg: 'Midterm season, students want a target number',
    angle: 'Raw-score-to-AP-score reasoning against the current 42-question format. Funnels to the calculator.' },
  { week: 9, course: 'ap-csa', targetKeyword: 'ap csa 2d array',
    workingTitle: '2D Arrays: Row-Major, Column-Major, and the Traversal Students Get Backwards',
    peg: 'Hardest reliably-tested topic in Unit 4', angle: 'Diagram-led. Highly linkable.' },
  { week: 10, course: 'ap-csa', targetKeyword: 'ap csa study plan',
    workingTitle: 'The AP CSA Study Plan for Students Already Behind',
    peg: 'Semester one is ending and some students know they are in trouble',
    angle: 'Triage, honestly. Which units to abandon and which to rescue. Genuinely useful, rarely written.' },
  { week: 11, course: 'ap-csa', targetKeyword: 'ap csa inheritance',
    workingTitle: 'Inheritance Is No Longer Its Own Unit. It Is Still on the Exam.',
    peg: 'The redesign removed the standalone unit and confused everyone',
    angle: 'Corrects a widespread misconception. High-authority explainer.' },

  // ── AP CSP ────────────────────────────────────────────────────────────────
  { week: 0, course: 'ap-csp', status: 'published', handle: 'ap-csp-create-performance-task-what-changed',
    targetKeyword: 'ap csp create performance task', peg: 'Written responses moved into the proctored exam' },
  { week: 1, course: 'ap-csp', targetKeyword: 'ap csp pseudocode',
    workingTitle: 'The AP CSP Pseudocode Drill: 30 Minutes to Fluency',
    peg: 'Taught early, tested all year',
    angle: 'Drill companion to the existing pseudocode pillar. Links up to it rather than competing.' },
  { week: 2, course: 'ap-csp', targetKeyword: 'ap csp create task ideas',
    workingTitle: 'Create Task Project Ideas That Are Easy to Write About in the Exam',
    peg: 'Project selection happens in the autumn and now determines exam performance',
    angle: 'Reframes project choice around the new proctored writing. Very high intent.' },
  { week: 3, course: 'ap-csp', targetKeyword: 'ap csp binary',
    workingTitle: 'Binary, Bits and Overflow: The Big Idea 2 Questions Students Miss',
    peg: 'Data unit lands here in most pacing guides', angle: 'Worked conversions plus the range-of-values question type.' },
  { week: 4, course: 'ap-csp', targetKeyword: 'ap csp vs ap csa',
    workingTitle: 'AP CSP or AP CSA: Choosing Correctly, Not Comfortably',
    peg: 'Spring course registration conversations begin', angle: 'Decision guide. Perennial high-volume comparison query.' },
  { week: 5, course: 'ap-csp', targetKeyword: 'ap csp algorithms',
    workingTitle: 'Algorithm Efficiency in AP CSP Without the Computer Science Degree',
    peg: 'Big Idea 3 is the heaviest tested idea',
    angle: 'Reasonable-vs-unreasonable time, which the exam tests and textbooks explain badly.' },
  { week: 6, course: 'ap-csp', targetKeyword: 'ap csp personalized project reference',
    workingTitle: 'Building a Personalized Project Reference You Can Actually Write From',
    peg: 'Follows directly from the week 0 format change',
    angle: 'The screenshot-choice decision, made concrete. Nobody else is covering this yet.' },
  { week: 7, course: 'ap-csp', targetKeyword: 'ap csp practice exam',
    workingTitle: 'Where AP CSP Practice Questions Mislead You',
    peg: 'Students begin practice testing around midterms',
    angle: 'Critical look at question quality. Trust-building, links to our own bank honestly.' },
  { week: 8, course: 'ap-csp', targetKeyword: 'ap csp internet',
    workingTitle: 'How the Internet Works, at Exactly the Depth AP CSP Tests',
    peg: 'Big Idea 4 is where students over-study', angle: 'Scope control. Explicitly says what NOT to learn.' },
  { week: 9, course: 'ap-csp', targetKeyword: 'ap csp data privacy',
    workingTitle: 'Data, Privacy and the Impact Questions That Look Like Opinion but Are Not',
    peg: 'Big Idea 5 is heavily tested and casually studied',
    angle: 'Teaches the answer structure graders reward.' },
  { week: 10, course: 'ap-csp', targetKeyword: 'ap csp score',
    workingTitle: 'What a 5 on AP CSP Actually Requires',
    peg: 'Midterm target-setting', angle: 'Score composition under the current format.' },
  { week: 11, course: 'ap-csp', targetKeyword: 'ap csp written response',
    workingTitle: 'Four Written Responses, Four Different Sentences',
    peg: 'Ties the whole autumn CSP arc together', angle: 'Category-by-category answer templates.' },

  // ── AP Cybersecurity ──────────────────────────────────────────────────────
  { week: 0, course: 'ap-cybersecurity', status: 'published', handle: 'ap-cybersecurity-launch-2026-27-guide',
    targetKeyword: 'ap cybersecurity', peg: 'National launch, 2026-27' },
  { week: 1, course: 'ap-cybersecurity', targetKeyword: 'cia triad',
    workingTitle: 'The CIA Triad Is Not Vocabulary, It Is the Exam\'s Grading Rubric',
    peg: 'Unit 1 is being taught now',
    angle: 'Reframes Unit 1 as the lens every later question uses. Large non-AP search volume too.' },
  { week: 2, course: 'ap-cybersecurity', targetKeyword: 'ap cybersecurity units',
    workingTitle: 'AP Cybersecurity Unit 1: Every Term, Ranked by How Often It Is Tested',
    peg: 'No released exams means vocabulary triage is genuinely valuable', angle: 'Reference asset, highly linkable.' },
  { week: 3, course: 'ap-cybersecurity', targetKeyword: 'social engineering',
    workingTitle: 'Social Engineering: Why the Human Layer Is the Most Tested Attack Surface',
    peg: 'Unit 2 timing', angle: 'Story-led. The most shareable topic in the course.' },
  { week: 4, course: 'ap-cybersecurity', targetKeyword: 'ap cybersecurity exam',
    workingTitle: 'The AP Cybersecurity Free Response: Writing a Device Security Analysis',
    peg: 'One FRQ, 30 percent of the score, no released examples',
    angle: 'The single highest-value asset we can build for this course.' },
  { week: 5, course: 'ap-cybersecurity', targetKeyword: 'network segmentation',
    workingTitle: 'Why Networks Are Divided: Segmentation Explained for Unit 3',
    peg: 'Hardest unit, arriving now', angle: 'Diagram-led. Cross-links to AP Networking.' },
  { week: 6, course: 'ap-cybersecurity', targetKeyword: 'cybersecurity careers',
    workingTitle: 'What a Cybersecurity Career Actually Looks Like at 22',
    peg: 'Millions of unfilled roles, and a CS job market students are frightened of',
    angle: 'Career post. Reaches parents, which is the audience that decides course selection.' },
  { week: 7, course: 'ap-cybersecurity', targetKeyword: 'encryption explained',
    workingTitle: 'Encryption for AP Cybersecurity: Symmetric, Asymmetric, and What the Exam Asks',
    peg: 'Unit 5 timing', angle: 'Evergreen with volume well beyond the AP audience.' },
  { week: 8, course: 'ap-cybersecurity', targetKeyword: 'ap cybersecurity practice test',
    workingTitle: 'Practising for an Exam That Has Never Been Given',
    peg: 'Midterm season, first cohort, no past papers',
    angle: 'Honest methodology piece. Strong trust signal, and true of the whole first year.' },
  { week: 9, course: 'ap-cybersecurity', targetKeyword: 'phishing',
    workingTitle: 'Phishing: The Attack Every Student Has Already Survived',
    peg: 'Perennially topical', angle: 'Accessible entry point with large general search volume.' },
  { week: 10, course: 'ap-cybersecurity', targetKeyword: 'ap cybersecurity study guide',
    workingTitle: 'The Half-Year AP Cybersecurity Review',
    peg: 'Semester one ends', angle: 'Consolidation asset covering Units 1 to 3.' },
  { week: 11, course: 'ap-cybersecurity', targetKeyword: 'zero trust',
    workingTitle: 'Zero Trust, Least Privilege, and Defence in Depth: Three Ideas, One Exam Question',
    peg: 'Principles recur across every unit', angle: 'Synthesis piece tying the course together.' },

  // ── AP Networking ─────────────────────────────────────────────────────────
  { week: 0, course: 'ap-networking', status: 'published', handle: 'ap-networking-2026-27-pilot-year-guide',
    targetKeyword: 'ap networking', peg: 'Third and final pilot year' },
  { week: 1, course: 'ap-networking', targetKeyword: 'ip address explained',
    workingTitle: 'What an IP Address Actually Is, for AP Networking Unit 1',
    peg: 'Unit 1 timing', angle: 'Foundational. Enormous general search volume, near-zero AP competition.' },
  { week: 2, course: 'ap-networking', targetKeyword: 'how to troubleshoot wifi',
    workingTitle: 'Troubleshooting Method: The Skill the AP Networking Exam Is Built Around',
    peg: 'Troubleshoot is one of four assessed skills',
    angle: 'Teaches elimination reasoning on a home network. Wide appeal beyond students.' },
  { week: 3, course: 'ap-networking', targetKeyword: 'dns explained',
    workingTitle: 'DNS: The Thing That Breaks When Nothing Else Has',
    peg: 'Unit 2 timing', angle: 'Classic explainer, big volume, links to the troubleshooting post.' },
  { week: 4, course: 'ap-networking', targetKeyword: 'router vs switch',
    workingTitle: 'Router, Switch, Access Point: Three Boxes People Call the Same Thing',
    peg: 'Unit 3 opens here', angle: 'Very high-volume confusion query with weak existing answers.' },
  { week: 5, course: 'ap-networking', targetKeyword: 'subnetting explained',
    workingTitle: 'Subnetting Without Tears',
    peg: 'The topic pilot students report as hardest', angle: 'Worked method. The definitive-guide opportunity for this course.' },
  { week: 6, course: 'ap-networking', targetKeyword: 'ap networking exam',
    workingTitle: 'What the AP Networking Pilot Exam Looks Like, and What Comes After It',
    peg: 'Pilot exam is multiple choice only, the launched exam is not',
    angle: 'Follows up week 0 with detail as College Board publishes more.' },
  { week: 7, course: 'ap-networking', targetKeyword: 'ipv6',
    workingTitle: 'IPv6: Why It Exists and Why Unit 4 Cares',
    peg: 'Unit 4 timing', angle: 'Explains the motivation, which every textbook skips.' },
  { week: 8, course: 'ap-networking', targetKeyword: 'network security basics',
    workingTitle: 'Where AP Networking and AP Cybersecurity Actually Overlap',
    peg: 'Students take both and conflate them', angle: 'Cross-course hub post. Strong internal linking value.' },
  { week: 9, course: 'ap-networking', targetKeyword: 'it career without degree',
    workingTitle: 'The IT Career Path AP Networking Points At',
    peg: 'Career Kickstart is explicitly career-framed',
    angle: 'Parent-facing. Certifications, roles, and honest salary framing.' },
  { week: 10, course: 'ap-networking', targetKeyword: 'ap networking study guide',
    workingTitle: 'Half-Year AP Networking Review: Units 1 to 3',
    peg: 'Semester one ends', angle: 'Consolidation asset.' },
  { week: 11, course: 'ap-networking', targetKeyword: 'network latency',
    workingTitle: 'Why the Network Is Slow: Bandwidth, Latency and Contention',
    peg: 'Recurs across Units 3 and 4', angle: 'Explains the distinction most people never learn.' },
];

const COURSES = ['ap-csa', 'ap-csp', 'ap-cybersecurity', 'ap-networking'];

function weekOf(date) { return WEEKS.indexOf(date); }

function slotsFor(date) {
  const i = weekOf(date);
  return i < 0 ? [] : SLOTS.filter((s) => s.week === i).map((s) => ({ ...s, date: WEEKS[s.week] }));
}

// Every slot that has no post written for it yet, soonest first. This is the
// authoring backlog, and the weekly workflow reports it so an empty queue is
// noticed a week early rather than on the morning nothing publishes.
function unwritten(writtenHandles, fromDate) {
  return SLOTS
    .filter((s) => WEEKS[s.week] >= fromDate)
    .filter((s) => !(s.handle && writtenHandles.has(s.handle)))
    .filter((s) => s.status !== 'published')
    .sort((a, b) => a.week - b.week)
    .map((s) => ({ ...s, date: WEEKS[s.week] }));
}

module.exports = { WEEKS, SLOTS, COURSES, slotsFor, unwritten, weekOf };
