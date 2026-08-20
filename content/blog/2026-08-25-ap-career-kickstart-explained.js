'use strict';
// Weekly course post: AP Cybersecurity. Reference and analysis piece explaining
// the AP Career Kickstart category itself, since that label covers both
// AP Cybersecurity and AP Networking and neither course-specific post is the
// right place to explain the umbrella they sit under.
const H = require('../../lib/blog-house');

const SRC = {
  cb: { source: 'College Board, AP Career Kickstart', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart', asOf: 'August 2026' },
  cbCred: { source: 'College Board, AP Career Kickstart Credentials', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/credentials', asOf: 'August 2026' },
  cbNetCred: { source: 'College Board, AP Networking Credential', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/credentials/ap-networking', asOf: 'August 2026' },
  cbNetAbout: { source: 'College Board, About AP Networking', url: 'https://apcentral.collegeboard.org/courses/ap-networking/about', asOf: 'August 2026' },
  chamber: { source: 'U.S. Chamber of Commerce, Bridging Classrooms to Careers', url: 'https://www.uschamber.com/workforce/bridging-classrooms-to-careers-launching-new-business-backed-ap-courses', asOf: 'August 2026' },
  apStudents: { source: 'College Board, AP Career Kickstart (AP Students)', url: 'https://apstudents.collegeboard.org/courses/ap-career-kickstart', asOf: 'August 2026' },
};

const SECTIONS = [
  'What AP Career Kickstart actually is',
  'Three courses, two different timelines',
  'Why this is not just "another AP subject"',
  'College credit: what to actually expect right now',
  'AP Cybersecurity and AP Networking are siblings, not the same course',
  'Two Unit 1 practice questions in the real format',
];

const meta = {
  title: 'AP Career Kickstart Explained: What College Board Is Actually Building',
  handle: 'ap-career-kickstart-explained',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap career kickstart',
  publishOn: '2026-08-24',
  seoTitle: 'AP Career Kickstart Explained: Courses and Credit',
  seoDescription: 'AP Career Kickstart explained: which courses belong to it, how it differs from a traditional AP, and what college credit looks like today.',
  summary: 'AP Career Kickstart is College Board\'s new career-focused AP category, and AP Cybersecurity is one course inside it, not the whole label. This guide covers what the initiative is, which courses belong to it and when each launches, how its purpose differs from a traditional AP built around college credit, what to actually expect from college credit policy today, and how AP Cybersecurity and AP Networking relate as two courses in the same family.',
  tags: ['AP Cybersecurity', 'Career Kickstart', 'AP Networking', 'Course Guide', 'College Credit'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP Career Kickstart is not a single course. It is College Board\'s new career-focused AP category, and AP Cybersecurity is one course inside it, not the whole label. Here is what the initiative actually is, which courses belong to it, and what it means for a transcript compared with a traditional AP score.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 25, 2026', updated: 'August 25, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Parents and students hear "AP Cybersecurity" and reasonably assume it is a new AP subject the same way AP Statistics or AP Environmental Science are AP subjects: a course, an exam, a score from 1 to 5, and a college weighing whether to grant credit for it. That description is not wrong, exactly, but it skips the part that actually explains why this course looks and behaves differently from every other AP you already know. AP Cybersecurity was not launched on its own. It was launched as one course inside a new category called AP Career Kickstart, and the category is the thing worth understanding first, because it explains almost every unusual choice the course itself makes.'),
  H.p('This guide is deliberately about the umbrella, not the course. Our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-launch-2026-27-guide">full AP Cybersecurity launch guide</a> already covers that course\'s own exam format and its pilot-to-launch numbers in detail, so we will not rebuild that material here. What has not been written yet, and what a family evaluating one of these courses actually needs, is a plain explanation of what AP Career Kickstart is as a category, which courses sit inside it, and how its purpose is genuinely different from the traditional AP model most households already understand.'),

  H.h2(SECTIONS[0]),
  H.p('AP Career Kickstart is a new category of Advanced Placement course that College Board is building alongside its traditional roughly forty subject AP catalog, not as a replacement for it. The traditional catalog exists to mirror an introductory college course, so a qualifying score can translate into college credit or placement out of that same introductory class. Career Kickstart courses are built around a different question: what would a high school course look like if it were designed, from the first day, around the skills a specific career field actually wants, with input from the employers who hire into that field.'),
  H.p(H.stat('AP Business Principles with Personal Finance and AP Cybersecurity launch nationally in the 2026-27 school year, with AP Networking following as the category\'s third course in 2027-28', SRC.cb)),
  H.p('That single fact answers the question we get asked most often: no, AP Career Kickstart is not another name for AP Cybersecurity. Cybersecurity is one course living inside a category that already includes a business and personal finance course, and is scheduled to include a networking course within two years. If your family only knows the category through the Cybersecurity course, you are seeing one third of what College Board is actually building.'),
  H.box('key', 'The one sentence version', '<p>AP Career Kickstart is the category. AP Cybersecurity is one course in it. AP Business Principles with Personal Finance is a second. AP Networking is a third, arriving a year later. Treat "Career Kickstart" and "Cybersecurity" as different words for different things, because mixing them up is the single most common source of confusion in coverage of this launch.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The category was announced as a partnership rather than as a College Board product working alone, and the partner is worth naming because it explains where the "career" framing actually comes from.'),
  H.p(H.stat('Announced as a partnership between the U.S. Chamber of Commerce and College Board in September 2025', SRC.chamber)),
  H.p('The involvement of a national business organization, rather than only academic reviewers, is exactly the structural difference from a traditional AP course launch. AP Physics or AP Chemistry are built by academic committees calibrating against college-level introductory courses. Career Kickstart courses are built with an industry-facing partner in the room from the start, which is also why each course carries an employer-endorsed credential layered on top of the AP score rather than only the score itself, a point worth returning to below.'),
  H.p('The two courses launching together in 2026-27 and the one following in 2027-28 are not on the same clock, and that distinction matters if your school offers one but not the other this year.'),
  H.table(
    ['Course', 'Status in 2026-27', 'National launch', 'First national exam'],
    [
      ['AP Cybersecurity', 'National launch, open to any school', '2026-27', 'May 2027'],
      ['AP Business Principles with Personal Finance', 'National launch, open to any school', '2026-27', 'May 2027'],
      ['AP Networking', 'Final pilot year, participating schools only', '2027-28', 'May 2028'],
    ]
  ),
  H.sourceNote(SRC.cb.source, SRC.cb.url, SRC.cb.asOf),
  H.p('So if a school offers AP Cybersecurity this fall, its students are taking the real, nationally launched course sitting the first official exam. If a school offers AP Networking this fall, its students are almost certainly in the pilot, sitting a different, pilot-specific assessment a full year ahead of the course\'s own national launch. Our <a href="/blogs/ap-networking/ap-networking-2026-27-pilot-year-guide">AP Networking pilot year guide</a> covers that distinction in full for families evaluating that course specifically.'),

  H.h2(SECTIONS[2]),
  H.p('It would be easy to read all of this as marketing language around a course that is, underneath, just another AP subject with a new coat of paint. That undersells what College Board is actually claiming to be different, and the claim is specific enough to check.'),
  H.p('A traditional AP course states its purpose plainly: prepare a student to succeed in a college-level version of this subject, so that a qualifying exam score can be exchanged for credit or placement in that same college course. The value proposition is entirely academic and entirely forward-looking toward a specific college classroom. Nothing about a 5 on AP Chemistry claims anything about whether a student can do chemistry-adjacent work in a job.'),
  H.p('AP Career Kickstart states a different purpose. Its courses are framed around durable, transferable career skills built with input from employers, and each course pairs the AP score with a separate, stackable credential meant to signal workplace readiness in that specific field, not only academic mastery of it.'),
  H.p('That is the real distinction, and it is worth sitting with rather than skimming past. A traditional AP asks a college admissions reader or a college registrar to trust an academic committee\'s judgment that this student is ready for sophomore-level coursework. A Career Kickstart course asks an employer, or a community college workforce program, or a certification body, to recognize that this student has demonstrated a specific, named set of career-relevant skills. Those are different audiences reading different signals off the same transcript line, and conflating them is where most of the confusion about these courses starts.'),
  H.box('tip', 'A quick test you can run yourself', '<p>Ask what a 5 on the exam is supposed to prove. For a traditional AP, the honest answer is "this student could pass the equivalent college course." For an AP Career Kickstart course, the honest answer adds a second clause: "and has demonstrated skills an employer in this field said they wanted to see." If a course, guide, or teacher can only give you the first half of that answer, you are not actually looking at a Career Kickstart course, you are looking at a traditional AP wearing new branding.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Here is where families need the most honest answer, and where the honest answer has to be a hedge rather than a number, because the truth is that college credit policy for these specific courses is still being written in real time.'),
  H.p(H.stat('With a qualifying exam score, students have the opportunity to earn college credit and advanced placement, in addition to an employer-endorsed credential', SRC.apStudents)),
  H.p('Read that sentence carefully, because the operative word is opportunity, not guarantee. College credit for any AP exam, Career Kickstart or traditional, is never decided by College Board. It is decided individually by each college and university, the same way it always has been for AP Biology or AP US History. What is different for these specific courses is that almost no institution had published a policy before the first exam existed to evaluate, simply because there was nothing yet to evaluate. Expect that to change gradually as the first cohorts of scores arrive at admissions offices, not all at once.'),
  H.p('The credential half of the equation is where the design is genuinely new rather than a slower version of the familiar AP credit process.'),
  H.p(H.stat('The AP Cybersecurity credential is aligned with industry certifications including CompTIA Security+ and Cisco Certified Support Technician: Cybersecurity, and can be stacked with the AP Networking credential once that course is available', SRC.cbCred)),
  H.p('That stacking design is the clearest evidence of what makes this category different in practice, not just in mission-statement language. A student\'s AP Cybersecurity exam score is one signal, evaluated college by college the same slow way every AP score always has been. The credential sitting alongside it is a second, separate signal, aligned to named industry certifications that an employer, a community college certificate program, or an internship coordinator can recognize immediately, without waiting on any single university\'s AP credit policy to catch up. A family deciding between courses should weight both signals, not just the exam score, because for a brand new course the credential is often the part that is legible to an outside reader sooner than the score is.'),
  H.box('warn', 'What not to assume', '<p>Do not assume a qualifying score on AP Cybersecurity or AP Networking will be treated the same way a college already treats AP Computer Science A or AP Calculus, and do not assume it will be treated worse either. Treat each target college as an open question and check directly, the same discipline that already applies to any brand new AP exam in its first years, Career Kickstart or not.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Because this blog covers both AP Cybersecurity and AP Networking, we get a specific version of the umbrella question constantly: are these basically the same course under two names. They are not, and the difference is not just branding, it shows up in what each course actually spends its class time on.'),
  H.p('AP Cybersecurity is built around defending systems and data that already exist. Its five units move from foundational vocabulary and the CIA triad through physical security, network security, device security, and application and data security, and the course\'s single free response is a device security analysis. The posture of the whole course is defensive: given a system, how would you protect it, and what did an attacker or a failure actually damage.'),
  H.p(H.stat('AP Networking is built as a hands-on course in configuring, securing, and troubleshooting networks of increasing scale, aligning closely with a standard first-year collegiate networking course', SRC.cbNetAbout)),
  H.p('That is a meaningfully different center of gravity. Where Cybersecurity asks "what happened and which principle did it violate," Networking asks "build, configure, and fix this network so it actually works." One course is closer to incident analysis, the other is closer to infrastructure engineering. There is real overlap, since you cannot reason well about network security without understanding how the network itself is built, which is exactly why AP Cybersecurity\'s own network security unit exists. But overlap is not identity. A student who loves memorizing threat models and reasoning through device security scenarios may find AP Networking\'s hands-on configuration work slower and less interesting, and a student who lights up wiring a lab network together may find Cybersecurity\'s vocabulary-heavy early units a slog before the more technical material arrives.'),
  H.p('The credential design reflects that same relationship. Rather than treating the two as competitors for the same student, College Board built them to stack: the Cybersecurity credential and the Networking credential are designed to combine into a broader signal once a student has both, which only makes sense if the two courses are teaching genuinely complementary rather than duplicate skills. A student who takes AP Networking after AP Cybersecurity, once Networking reaches national launch in their school, is not repeating a course. They are building the infrastructure half of a picture the security course already gave them the defensive half of.'),
  H.p('If you are choosing between the two for this year specifically, the practical answer is usually decided for you by what your school offers, since AP Networking remains pilot-only through the 2026-27 school year. If your school offers both once Networking goes national, the sequencing question is worth asking a counselor directly rather than guessing, because which one benefits from coming first depends on how your school\'s sections are staffed and which lab equipment each class actually has access to.'),
  H.p('You can read our course-specific coverage of each: the <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity curriculum</a> and <a href="/pages/ap-networking">AP Networking</a> resources both go deeper into their own unit structure than this piece does, since this piece is deliberately about the category the two sit inside rather than either course\'s own content.'),

  H.h2(SECTIONS[5]),
  H.p('This is still an AP Cybersecurity course blog, so before the FAQ, two Unit 1 practice questions in the real scenario-first format. Both test vocabulary that shows up constantly in later units: how to classify a threat actor, and how to tell a vulnerability apart from a threat and a risk.'),
  H.mcq({
    n: 1,
    stem: 'An employee who is scheduled to be laid off in two weeks still has active credentials to the customer database. The night before her access is set to be revoked, she copies the entire customer table to a personal USB drive, intending to sell it to a competitor. Which category of threat actor does this scenario describe?',
    options: [
      'A nation-state actor, because the theft involves sensitive data',
      'A hacktivist, because she is acting on personal motivation',
      'An insider threat, because she is using access she was legitimately granted',
      'A script kiddie, because no advanced technical skill was required',
    ],
    correct: 2,
    why: 'The defining fact in the scenario is not her motive or her skill level, it is that she already holds legitimate, working credentials to the system she is misusing. An insider threat is defined by that relationship to the system, not by how sophisticated the attacker is or why they are doing it. A nation-state actor is defined by state sponsorship and a geopolitical motive, neither of which appears here. A hacktivist is defined by an ideological or political message, not personal financial gain. A script kiddie is defined by using existing tools without deep technical understanding, which the scenario never actually addresses since she used access she was already given rather than a technical exploit. Classify by relationship to the system first, then consider motive and skill as separate, secondary facts.',
  }),
  H.mcq({
    n: 2,
    stem: 'A company\'s customer-facing web application is running a library with a documented flaw that would let an attacker execute arbitrary code if the flaw were exploited. Security researchers published the flaw two weeks ago. No attacker has attempted to use it against this company yet. Which term correctly describes the flaw itself?',
    options: [
      'A threat, because an attacker could act on it',
      'A vulnerability, because it is a weakness in the system as it currently exists',
      'A risk, because the combination of likelihood and impact is what the flaw represents',
      'An exploit, because the flaw has already been documented publicly',
    ],
    correct: 1,
    why: 'The scenario is carefully describing the flaw itself, in isolation, with no attacker action taken against it yet. That is precisely the definition of a vulnerability: a weakness in a system, independent of whether anyone has tried to take advantage of it. A threat is a potential source of harm, typically an actor or event capable of exploiting a vulnerability, which the scenario has not introduced. Risk is the broader concept combining a vulnerability, a threat capable of exploiting it, and the likely impact if that happened, which is more than what the scenario gives you evidence for here. An exploit is the actual code or technique used to take advantage of a vulnerability, not the vulnerability being documented. Being published publicly makes the vulnerability more urgent to patch, but publication alone does not turn it into an exploit or a confirmed risk event.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is AP Career Kickstart?', a: 'AP Career Kickstart is a new category of Advanced Placement course from College Board built around career-connected skills rather than only college-level academic content, developed with an industry partnership and paired with an employer-endorsed credential alongside the exam score.' },
    { q: 'Which courses are part of AP Career Kickstart?', a: 'AP Business Principles with Personal Finance and AP Cybersecurity launch nationally in the 2026-27 school year. AP Networking is the category\'s third course and follows with a national launch in 2027-28, after running its final pilot year in 2026-27.' },
    { q: 'Is AP Career Kickstart the same thing as AP Cybersecurity?', a: 'No. AP Career Kickstart is the umbrella category. AP Cybersecurity is one course inside it, alongside AP Business Principles with Personal Finance and, starting in 2027-28, AP Networking. A course being part of Career Kickstart does not make it the only course in that category.' },
    { q: 'Will colleges give credit for AP Cybersecurity or AP Networking the way they do for other AP courses?', a: 'Credit is possible with a qualifying score, the same as any AP exam, but each college sets its own policy, and most institutions had nothing to evaluate until the first exams existed. Expect published policies to arrive gradually rather than all at once, and check each target college directly rather than assuming.' },
    { q: 'Are AP Cybersecurity and AP Networking essentially the same course?', a: 'No. AP Cybersecurity is built around defending systems and data that already exist, organized around the CIA triad and a device security free response. AP Networking is built around configuring, securing, and troubleshooting the networks themselves, closer to a first-year collegiate networking course. Their credentials are designed to stack rather than duplicate each other.' },
  ]),

  H.cta({
    heading: 'Start with the AP Cybersecurity course itself',
    body: 'Unit 1 vocabulary, the CIA triad, and scenario practice in the real exam format, plus coverage of AP Networking for families weighing both courses.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Start Unit 1' },
      { href: '/pages/ap-networking', text: 'See AP Networking', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is updated as College Board publishes further detail on AP Career Kickstart, its credentials, and college credit policy. Last reviewed August 25, 2026.'),
]);

module.exports = { meta, body };
