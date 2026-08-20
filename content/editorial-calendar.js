'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE EDITORIAL CALENDAR: three posts per course per week, twelve a week.
//
//  WHY TRACKS RATHER THAN A LIST OF 144 TOPICS
//  Three posts a week for one course is enough volume that "what do we write
//  about" stops being answerable one topic at a time. Left as a flat list it
//  drifts: three news posts one week, three concept explainers the next, and a
//  course blog that reads like a feed rather than a body of work.
//
//  So each course runs three parallel tracks and publishes one from each, every
//  week. The mix is fixed even when the topics are not, which is what makes the
//  blog legible to a returning reader and to a crawler deciding what the site
//  is about.
//
//  THE THREE TRACKS EARN THEIR PLACE DIFFERENTLY
//  - brief   ranks for a while and then decays. It is the reason to visit today.
//  - concept ranks for years and carries the largest search volume, usually
//            from an audience wider than AP students. It is the compounding one.
//  - drill   ranks least and converts best, because somebody searching for how
//            to practise is already committed.
//
//  Publishing only concept posts would build traffic that never converts.
//  Publishing only drills would build a site nobody discovers. The ratio is the
//  point.
//
//  PEGS DECAY, AND THE brief TRACK IS MADE OF THEM
//  A peg written in August is a claim about August. Whoever writes the post
//  re-verifies it first, and rewrites the slot rather than publishing on a dead
//  hook. This matters most on the two Career Kickstart courses, where College
//  Board is still publishing detail and a confident claim can go stale in weeks.
// ─────────────────────────────────────────────────────────────────────────────

// Tuesdays. Twelve weeks planned at a time.
const WEEKS = [
  '2026-08-18', '2026-08-25', '2026-09-01', '2026-09-08',
  '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06',
  '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03',
];

const TRACKS = [
  { key: 'brief', label: 'Brief', genre: 'What changed and what it means. News pegged, time sensitive, re-verify before writing.' },
  { key: 'concept', label: 'Concept', genre: 'One idea taught properly. Evergreen, widest search volume, the compounding asset.' },
  { key: 'drill', label: 'Drill', genre: 'Practice and method. Worked problems, study technique, exam mechanics.' },
];

// Each entry is [targetKeyword, workingTitle] or [targetKeyword, workingTitle,
// publishedHandle] once the post exists. Index in the array is the week index.
const STREAMS = {
  'ap-csa': {
    brief: [
      ['ap csa score distribution', 'The 2026 AP CSA Score Distribution', 'ap-csa-score-distribution-2026-analysis'],
      ['ap csa exam format', 'The 2025 Redesign: What Was Removed and What Got Heavier', 'ap-csa-2025-redesign-what-changed'],
      ['ap csa vs ap csp', 'AP CSA or AP CSP: Which One Colleges Actually Read', 'ap-csa-vs-ap-csp-college-recognition'],
      ['ap csa college credit', 'Which Colleges Give Credit for AP CSA, and What Score They Want', 'ap-csa-college-credit-what-score'],
      ['computer science major', 'Should You Still Major in CS? What to Tell a Junior in 2026', 'ap-csa-should-you-major-in-cs'],
      ['ap csa frq scoring', 'How AP CSA Free Response Is Actually Graded, Point by Point', 'ap-csa-frq-scoring-point-by-point'],
      ['ap csa difficulty', 'Is AP CSA Hard? Reading the Score Data Honestly', 'ap-csa-is-it-hard-reading-the-data'],
      ['ap classroom', 'Using AP Classroom for CSA Without Wasting Your Time', 'ap-csa-using-ap-classroom-without-wasting-time'],
      ['ai coding tools', 'Using AI to Learn Java Without Learning Nothing', 'ap-csa-using-ai-without-learning-nothing'],
      ['ap csa exam date', 'AP CSA Exam Date: Seven Months Out, What to Do With Them', 'ap-csa-months-to-exam-what-to-do'],
      ['ap csa semester exam', 'What a Good First Semester AP CSA Exam Covers'],
      ['ap csa inheritance', 'Inheritance Lost Its Unit. It Did Not Leave the Exam.'],
    ],
    concept: [
      ['ap csa objects and methods', 'Objects, References, and the Thing Unit 1 Never Says Out Loud', 'ap-csa-objects-references-explained'],
      ['java vs python', 'Why AP CSA Uses Java When You Learned Python First', 'ap-csa-java-vs-python'],
      ['ap csa boolean expressions', 'Compound Booleans and Short Circuit Evaluation', 'ap-csa-compound-booleans-short-circuit'],
      ['ap csa for loops', 'For Loops, While Loops, and Knowing Which the Question Wants', 'ap-csa-for-while-loops-which-one'],
      ['ap csa string methods', 'The String Methods AP CSA Tests, and the Off by One That Follows', 'ap-csa-string-methods-off-by-one'],
      ['ap csa class creation', 'Writing a Class From Scratch: Constructors, Fields and this', 'ap-csa-class-creation-constructors-fields-this'],
      ['ap csa arraylist', 'Array vs ArrayList: The Distinction Tested Every Single Year', 'ap-csa-array-vs-arraylist'],
      ['ap csa 2d array', '2D Arrays: Row Major, Column Major, and the Traversal Students Reverse', 'ap-csa-2d-arrays-row-major-column-major'],
      ['ap csa recursion', 'Recursion as a Call Stack, Not as Magic', 'ap-csa-recursion-as-a-call-stack'],
      ['ap csa searching sorting', 'Binary Search and the Sorts You Must Be Able to Trace', 'ap-csa-binary-search-and-sorts-to-trace'],
      ['ap csa static methods', 'Static vs Instance: The Distinction Behind a Third of Compile Errors'],
      ['java integer division', 'Integer Division, Modulus, and the Arithmetic Traps in Every Exam'],
    ],
    drill: [
      ['how to trace code', 'The Variable Table: Tracing Code the Way Fives Do It', 'ap-csa-variable-table-tracing-method'],
      ['ap csa practice test', 'Using a Practice Test in September Without Wasting It', 'ap-csa-practice-test-september-guide'],
      ['ap csa mcq strategy', 'Ninety Seconds a Question: Pacing the Multiple Choice', 'ap-csa-mcq-pacing-ninety-seconds'],
      ['ap csa frq practice', 'Writing Your First FRQ With the Laptop Closed', 'ap-csa-frq-practice-laptop-closed'],
      ['debugging java', 'Reading a Java Error Message Instead of Guessing', 'ap-csa-reading-java-error-messages'],
      ['ap csa reference sheet', 'The AP CSA Reference Sheet: What It Gives You and What It Does Not', 'ap-csa-reference-sheet-what-it-gives-you'],
      ['ap csa score calculator', 'What Raw Score You Need for a 5 on the 42 Question Exam', 'ap-csa-raw-score-for-a-5'],
      ['ap csa common mistakes', 'The Nine Mistakes That Cost the Most Points', 'ap-csa-common-mistakes-that-cost-points'],
      ['ap csa unit 4 practice', 'Twelve Data Collections Questions, Hardest Last', 'ap-csa-unit-4-data-collections-questions'],
      ['ap csa flashcards', 'Why Flashcards Fail for AP CSA, and What Replaces Them', 'ap-csa-why-flashcards-fail'],
      ['ap csa study plan', 'A Study Plan for Students Already Behind'],
      ['ap csa final review', 'The Half Year AP CSA Review: Units 1 to 4'],
    ],
  },

  'ap-csp': {
    brief: [
      ['ap csp create performance task', 'What Happened to the Create Performance Task', 'ap-csp-create-performance-task-what-changed'],
      ['ap csp exam format', 'The AP CSP Exam: Every Section, Every Weighting', 'ap-csp-exam-format-every-section'],
      ['ap csp create task ideas', 'Create Task Projects That Are Easy to Write About Under Timer', 'ap-csp-create-task-project-ideas'],
      ['ap csp ai policy', 'What College Board Actually Permits With AI on the Create Task', 'ap-csp-ai-policy-create-task-nuance'],
      ['ap csp vs ap csa', 'AP CSP or AP CSA First: A Teacher Answers', 'ap-csp-or-ap-csa-first'],
      ['ap csp college credit', 'Which Colleges Give Credit for AP CSP', 'ap-csp-college-credit-what-colleges-give'],
      ['ap csp score distribution', 'What the CSP Score Distribution Says About Written Responses', 'ap-csp-score-distribution-written-response'],
      ['ap csp for beginners', 'Taking AP CSP With No Coding Background', 'ap-csp-taking-with-no-coding-background'],
      ['ap csp deadline', 'The April Project Reference Deadline, and How Students Miss It', 'ap-csp-project-reference-deadline-how-students-miss-it'],
      ['ap csp teacher', 'What Changed for AP CSP Teachers This Year', 'ap-csp-what-changed-for-teachers'],
      ['ap csp exam day', 'AP CSP Exam Day: What You Bring and What You Are Given'],
      ['ap csp written response', 'Four Prompts, Four Different Sentences'],
    ],
    concept: [
      ['ap csp pseudocode', 'College Board Pseudocode: The Whole Syntax in One Sitting', 'ap-csp-pseudocode-complete-syntax-guide'],
      ['ap csp binary', 'Binary, Bits, and Why Overflow Is Really a Range Question', 'ap-csp-binary-bits-overflow'],
      ['ap csp abstraction', 'Abstraction in AP CSP: Data, Procedural, and the Difference', 'ap-csp-abstraction-data-procedural'],
      ['ap csp algorithms', 'Reasonable and Unreasonable Time, Without a CS Degree', 'ap-csp-algorithm-efficiency-reasonable-time'],
      ['lossy vs lossless', 'Lossy and Lossless Compression: The Trade Off the Exam Tests', 'ap-csp-lossy-lossless-compression'],
      ['ap csp internet', 'How the Internet Works, at Exactly the Depth AP CSP Tests', 'ap-csp-how-the-internet-works'],
      ['ap csp data privacy', 'Cookies, Metadata and PII: Big Idea 5 Without the Hand Waving', 'ap-csp-cookies-metadata-pii-big-idea-5'],
      ['ap csp lists', 'List Operations and the Index Shift That Breaks Student Code', 'ap-csp-list-operations-index-shift'],
      ['ap csp procedures', 'Procedures, Parameters and Return: Scope Made Concrete', 'ap-csp-procedures-parameters-return-scope'],
      ['ap csp conditionals', 'Nested Conditionals and Compound Boolean Logic', 'ap-csp-nested-conditionals-compound-boolean'],
      ['digital divide', 'The Digital Divide and Computing Bias as Exam Answers'],
      ['ap csp simulations', 'Simulations, Models, and What They Deliberately Leave Out'],
    ],
    drill: [
      ['ap csp practice exam', 'Where AP CSP Practice Questions Mislead You', 'ap-csp-practice-exam-common-mistakes'],
      ['ap csp mcq', 'Pacing the AP CSP Multiple Choice Section', 'ap-csp-mcq-pacing-strategy'],
      ['ap csp robot grid', 'Robot Grid Problems: A Method That Always Works', 'ap-csp-robot-grid-problems-method'],
      ['ap csp written response practice', 'Sixteen Written Response Prompts in the Current Format', 'ap-csp-written-response-practice-prompts'],
      ['ap csp personalized project reference', 'Choosing the Two Code Segments for Your Project Reference', 'ap-csp-personalized-project-reference-segments'],
      ['ap csp bug log', 'The Bug Log That Answers Your Errors and Testing Prompt', 'ap-csp-bug-log-errors-testing-practice'],
      ['ap csp score calculator', 'What a 5 on AP CSP Actually Requires', 'ap-csp-what-a-5-requires'],
      ['ap csp vocabulary', 'The Forty AP CSP Terms That Carry the Exam', 'ap-csp-forty-terms-ranked'],
      ['ap csp common mistakes', 'The Answers That Look Right and Earn Nothing', 'ap-csp-plausible-answers-that-earn-nothing'],
      ['ap csp study guide', 'A Big Idea by Big Idea Study Guide', 'ap-csp-big-idea-by-big-idea-study-guide'],
      ['ap csp code segment', 'Explaining Your Own Code Out Loud as Practice'],
      ['ap csp final review', 'The Half Year AP CSP Review'],
    ],
  },

  'ap-cybersecurity': {
    brief: [
      ['ap cybersecurity', 'AP Cybersecurity Launches This Fall', 'ap-cybersecurity-launch-2026-27-guide'],
      ['ap career kickstart', 'AP Career Kickstart Explained: What College Board Is Actually Building', 'ap-career-kickstart-explained'],
      ['ap cybersecurity units', 'All Five Units, Ranked by What the Exam Asks For', 'ap-cybersecurity-five-units-ranked'],
      ['cybersecurity careers', 'What a Cybersecurity Career Actually Looks Like at 22', 'ap-cybersecurity-careers-at-22'],
      ['ap cybersecurity vs ap csp', 'AP Cybersecurity or AP CSP: Choosing for the Right Reason', 'ap-cybersecurity-or-ap-csp-choosing'],
      ['ap cybersecurity exam', 'The AP Cybersecurity Exam Format, Section by Section', 'ap-cybersecurity-exam-format-section-by-section'],
      ['ap cybersecurity college credit', 'Will Colleges Give Credit for a Brand New AP?', 'ap-cybersecurity-college-credit-brand-new-ap'],
      ['cisco networking academy', 'What the Cisco Partnership Gives Your Classroom', 'ap-cybersecurity-cisco-networking-academy-partnership'],
      ['cybersecurity certifications', 'AP Cybersecurity and the Certifications That Follow It', 'ap-cybersecurity-certifications-that-follow'],
      ['ap cybersecurity teacher', 'Teaching AP Cybersecurity in Its First Year', 'ap-cybersecurity-teaching-first-year'],
      ['ap cybersecurity practice test', 'Practising for an Exam That Has Never Been Given'],
      ['ap cybersecurity study guide', 'The Half Year AP Cybersecurity Review'],
    ],
    concept: [
      ['cia triad', 'The CIA Triad Is Not Vocabulary, It Is the Grading Rubric', 'ap-cybersecurity-cia-triad-explained'],
      ['social engineering', 'Social Engineering: The Most Tested Attack Surface', 'ap-cybersecurity-social-engineering'],
      ['phishing', 'Phishing: The Attack Every Student Has Already Survived', 'ap-cybersecurity-phishing-deep-dive'],
      ['access control', 'Least Privilege, Access Control, and Who Gets the Keys', 'ap-cybersecurity-access-control-least-privilege'],
      ['network segmentation', 'Why Networks Are Divided: Segmentation for Unit 3', 'ap-cybersecurity-network-segmentation'],
      ['firewall', 'Firewalls, and What They Genuinely Cannot Stop', 'ap-cybersecurity-firewalls-what-they-cannot-stop'],
      ['endpoint security', 'Hardening a Device: Unit 4 Made Practical', 'ap-cybersecurity-endpoint-hardening-unit-4'],
      ['application security', 'Application Vulnerabilities Without Writing an Exploit', 'ap-cybersecurity-application-security-unit-5'],
      ['encryption explained', 'Symmetric, Asymmetric, and What the Exam Asks', 'ap-cybersecurity-symmetric-asymmetric-encryption'],
      ['data backup', 'Backups, Recovery, and the Availability Nobody Studies', 'ap-cybersecurity-backups-recovery-availability'],
      ['zero trust', 'Zero Trust, Defence in Depth, Least Privilege: One Question, Three Ideas'],
      ['risk assessment', 'Risk Assessment: Likelihood, Impact, and the Decision'],
    ],
    drill: [
      ['ap cybersecurity frq', 'Writing a Device Security Analysis, Step by Step', 'ap-cybersecurity-device-security-frq-guide'],
      ['ap cybersecurity unit 1', 'Unit 1 Vocabulary, Ranked by How Often It Is Tested', 'ap-cybersecurity-unit-1-vocabulary-ranked'],
      ['security scenario questions', 'Reading a Security Scenario for the Evidence It Gives You', 'ap-cybersecurity-scenario-question-evidence'],
      ['ap cybersecurity mcq', 'Eighty Seconds a Question: Pacing Section I', 'ap-cybersecurity-mcq-pacing-eighty-seconds'],
      ['threat modeling', 'Threat Modelling Your Own Phone as Practice', 'ap-cybersecurity-threat-modeling-your-phone'],
      ['incident response', 'Incident Response as an Answer Structure', 'ap-cybersecurity-incident-response-answer-structure'],
      ['password security', 'Passwords, MFA, and Why the Advice Changed', 'ap-cybersecurity-passwords-mfa-advice-changed'],
      ['ap cybersecurity unit 3', 'Ten Network Security Questions, Hardest Last', 'ap-cybersecurity-unit-3-network-security-questions'],
      ['security controls', 'Matching the Control to the Layer the Attack Targets', 'ap-cybersecurity-matching-controls-to-layers'],
      ['ap cybersecurity glossary', 'The Running Glossary That Carries the Whole Course'],
      ['ap cybersecurity common mistakes', 'The Plausible Wrong Answer Pattern'],
      ['ap cybersecurity exam day', 'Exam Day for the First Cohort Ever'],
    ],
  },

  'ap-networking': {
    brief: [
      ['ap networking', 'AP Networking in 2026-27: Inside the Final Pilot Year', 'ap-networking-2026-27-pilot-year-guide'],
      ['ap networking exam', 'The Four Skills Every AP Networking Question Is Actually Testing', 'ap-networking-four-skills-explained'],
      ['ap networking vs ap cybersecurity', 'Where AP Networking and AP Cybersecurity Actually Overlap', 'ap-networking-vs-ap-cybersecurity-overlap'],
      ['it career without degree', 'The IT Career Path AP Networking Points At', 'ap-networking-it-career-without-degree'],
      ['ap networking units', 'All Four Units and 22 Topics', 'ap-networking-four-units-topics'],
      ['network engineer salary', 'What Network and Infrastructure Work Actually Pays', 'ap-networking-salary-progression'],
      ['ap networking pilot', 'Being in a Pilot Year: What Your School Signed Up For', 'ap-networking-pilot-school-commitments'],
      ['comptia network plus', 'AP Networking and the Certifications Next Door', 'ap-networking-comptia-network-plus'],
      ['ap networking college credit', 'Credit for AP Networking: What Is Knowable Yet', 'ap-networking-college-credit-what-is-knowable'],
      ['ap networking teacher', 'Teaching AP Networking Without a Lab Budget', 'ap-networking-teaching-without-lab-budget'],
      ['ap networking practice test', 'Practising Without Released Questions'],
      ['ap networking study guide', 'The Half Year AP Networking Review'],
    ],
    concept: [
      ['ip address explained', 'What an IP Address Actually Is', 'ap-networking-ip-address-explained'],
      ['dns explained', 'DNS: The Thing That Breaks When Nothing Else Has', 'ap-networking-dns-explained'],
      ['router vs switch', 'Router, Switch, Access Point: Three Boxes People Confuse', 'ap-networking-router-switch-access-point'],
      ['subnetting explained', 'Subnetting Without Tears', 'ap-networking-subnetting-without-tears'],
      ['mac address', 'MAC Addresses, ARP, and the Layer Below the One You Know', 'ap-networking-mac-address-arp'],
      ['dhcp', 'DHCP: How Your Laptop Gets an Address It Never Asked For', 'ap-networking-dhcp-address-assignment'],
      ['wifi channels', 'Wireless, Channels, and Why the Cafe Wifi Is Slow', 'ap-networking-wifi-channels-interference'],
      ['vlan', 'VLANs: One Switch, Many Networks', 'ap-networking-vlans-one-switch-many-networks'],
      ['tcp vs udp', 'TCP and UDP: Reliability Versus Speed', 'ap-networking-tcp-vs-udp'],
      ['ipv6', 'IPv6: Why It Exists and Why Unit 4 Cares', 'ap-networking-ipv6-why-it-exists'],
      ['nat', 'NAT, and the Address Shortage It Papered Over'],
      ['network latency', 'Bandwidth, Latency and Contention: Three Reasons for Slow'],
    ],
    drill: [
      ['how to troubleshoot wifi', 'Troubleshooting Method: Eliminate, Do Not Guess', 'ap-networking-troubleshooting-method'],
      ['ping traceroute', 'Ping and Traceroute as Reasoning Tools', 'ap-networking-ping-traceroute-tools'],
      ['ap networking scenarios', 'Anatomy of an AP Networking Scenario Question', 'ap-networking-scenario-question-anatomy'],
      ['network diagram', 'Drawing the Network Before You Fix It', 'ap-networking-network-diagram-first'],
      ['ap networking unit 1', 'Ten Single Device Questions', 'ap-networking-unit-1-single-device-questions'],
      ['explain technical to non technical', 'The Collaborate Skill Nobody Practises', 'ap-networking-collaborate-explain-technical'],
      ['fault log', 'The Fault Log That Becomes Your Revision Guide', 'ap-networking-fault-log-revision-guide'],
      ['ap networking unit 3', 'Ten Segmented LAN Questions, Hardest Last', 'ap-networking-unit-3-segmented-lan-questions'],
      ['home lab', 'Building a Home Lab From What You Already Own', 'ap-networking-home-lab-from-what-you-own'],
      ['network commands', 'The Command Line Tools Worth Knowing Cold', 'ap-networking-command-line-tools-reference'],
      ['ap networking common mistakes', 'The Alarming Answer Versus the Mundane One'],
      ['ap networking exam day', 'AP Networking Exam Day'],
    ],
  },
};

const COURSES = Object.keys(STREAMS);
const POSTS_PER_COURSE_PER_WEEK = TRACKS.length;

// Flattened view. Generated rather than written out, so the shape cannot drift
// from the tracks and a thirteenth week is a date plus four topics per track.
function allSlots() {
  const out = [];
  for (const course of COURSES) {
    for (const track of TRACKS) {
      const stream = STREAMS[course][track.key] || [];
      stream.forEach(([targetKeyword, workingTitle, handle], week) => {
        if (week >= WEEKS.length) return;
        out.push({
          week, date: WEEKS[week], course, track: track.key,
          targetKeyword, workingTitle, handle: handle || null,
        });
      });
    }
  }
  return out.sort((a, b) => a.week - b.week || COURSES.indexOf(a.course) - COURSES.indexOf(b.course));
}

function slotsFor(date) { return allSlots().filter((s) => s.date === date); }

// The authoring backlog: every slot with no post written for it, soonest first.
function unwritten(writtenHandles, fromDate) {
  return allSlots()
    .filter((s) => s.date >= fromDate)
    .filter((s) => !(s.handle && writtenHandles.has(s.handle)));
}

// A planned week is complete only when all twelve slots have posts. Reported
// weekly so a short week is visible before it is a published gap.
function weekStatus(writtenHandles, date) {
  const slots = slotsFor(date);
  const written = slots.filter((s) => s.handle && writtenHandles.has(s.handle));
  return { date, planned: slots.length, written: written.length, missing: slots.length - written.length };
}

module.exports = {
  WEEKS, TRACKS, STREAMS, COURSES, POSTS_PER_COURSE_PER_WEEK,
  allSlots, slotsFor, unwritten, weekStatus,
};
