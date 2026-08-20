'use strict';
// Weekly course post: AP Networking. School/administrator perspective on the
// 2026-27 pilot: what a school actually commits to by participating, distinct
// from the student-facing pilot-year post already published on 2026-08-18.
const H = require('../../lib/blog-house');

const SRC = {
  pilots: { source: 'College Board, AP Networking Pilot for 2026-27', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/pilots', asOf: 'August 2026' },
  materials: { source: 'College Board Help Center, required materials for pilot participation', url: 'https://apcentral.collegeboard.org/help-center/are-there-any-required-materials-pilot-participation', asOf: 'August 2026' },
  credential: { source: 'College Board, AP Networking Credential', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/credentials/ap-networking', asOf: 'August 2026' },
  cisco: { source: 'Cisco, Cisco Partners With College Board to Launch AP Cybersecurity and Expand Career-Connected Learning', url: 'https://blogs.cisco.com/learning/cisco-partners-with-college-board-to-launch-ap-cybersecurity', asOf: 'August 2026' },
  adopt: { source: 'College Board, Adopt AP Networking', url: 'https://apcentral.collegeboard.org/courses/ap-networking/adopt', asOf: 'August 2026' },
};

const SECTIONS = [
  'What the AP Networking pilot actually commits your school to',
  'Who can even join right now, and why that surprises people',
  'The materials and platform access your school agreed to provide',
  'The Cisco Networking Academy piece, and what it does and does not require',
  'What is genuinely different about teaching a pilot year',
  'Piloting again versus waiting for the national launch',
];

const meta = {
  title: 'AP Networking Pilot: What Your School Actually Signed Up For',
  handle: 'ap-networking-pilot-school-commitments',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking pilot',
  publishOn: '2026-09-28',
  seoTitle: 'AP Networking Pilot: What Schools Commit To',
  seoDescription: 'What does the AP Networking pilot actually require from a school: eligibility, Course Audit, materials, and where Cisco Networking Academy really fits in.',
  summary: 'A school-administrator look at the 2026-27 AP Networking pilot: which schools are even eligible, what materials and platform access a school agrees to provide, what the Cisco Networking Academy tie actually requires, and how piloting differs from teaching an established AP course.',
  tags: ['AP Networking', 'Pilot Program', 'School Administrators', 'Career Kickstart', 'Course Audit'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('When a school agrees to pilot AP Networking, the commitment goes well beyond a classroom schedule change. This is what an administrator or teacher signs up for when the AP Networking pilot lands on their master schedule.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 8,
  }),
  H.toc(SECTIONS),

  H.p('Most of what gets written about AP Networking is aimed at a student deciding whether to take it. That is a different question from the one a principal, a CTE director, or a department chair is actually asking, which is what the school is on the hook for by putting this course on the schedule. This is that side of it.'),
  H.p('If you are a student trying to decide whether to take the course, or how to study for an exam with nothing released yet, our <a href="/blogs/ap-networking/ap-networking-2026-27-pilot-year-guide">guide to the pilot year</a> covers that ground and this post will not repeat it.'),

  H.h2(SECTIONS[0]),
  H.p('The word pilot gets used loosely in schools, often for anything new and unproven. The AP Networking pilot is a narrower and more specific arrangement than that. A school does not simply decide to try the course the way it might trial a new textbook. Participation runs through College Board\'s AP Course Audit, the same authorization process every AP course uses, and a pilot teacher\'s syllabus has to be approved through it before the course can be offered under the AP name at all.'),
  H.p('That matters for a reason that is easy to miss: authorization is a per-teacher, per-course action, not a blanket school policy. If a teacher who ran the pilot last year moves buildings or leaves the department, the new teacher generally has to go through the same Course Audit steps before the school can keep offering AP Networking, even if the course was already running successfully.'),
  H.box('key', 'The commitment is administrative before it is instructional', '<p>Before a single lesson gets taught, a school has committed staff time to Course Audit paperwork, committed a specific teacher of record to the course, and accepted that the course framework itself is still being tested rather than finalized. None of that shows up on a master schedule printout.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Here is the detail that catches administrators off guard: the 2026-27 AP Networking pilot is not open enrollment for interested schools. Only schools that already took part in an earlier AP Networking or AP Cybersecurity pilot are eligible to join this round.'),
  H.sourceNote(SRC.pilots.source, SRC.pilots.url, SRC.pilots.asOf),
  H.p('This is the third and final pilot year before the course launches nationally in 2027-28, and College Board is using it to close open questions from the earlier rounds rather than to expand reach. A school hearing about AP Networking for the first time this fall cannot simply sign up. The realistic path in for a new school is to wait for the national launch, which is a genuinely different administrative decision than joining a pilot, and one worth separating clearly when a department is asking to add the course.'),
  H.box('warn', 'A common scheduling mistake', '<p>Do not assume a school that is "interested" in AP Networking can be added to this year\'s pilot the way it might add a section of an existing AP course. If your school was not already in the pilot pipeline, the 2026-27 cohort is closed, and the conversation to have with your department is about the 2027-28 national launch instead.</p>'),

  H.h2(SECTIONS[2]),
  H.p('For schools that are in the pilot, the required materials are lighter than a networking course sounds like it should need, and that is by design. The course is built to be teachable without a rack of physical routers and switches sitting in a classroom.'),
  H.p('What a school does need to provide is computer access for students, specifically machines that can install lightweight networking simulator software such as Cisco Packet Tracer and GNS3. Some of the provided lesson plans call for basic hands-on materials like cable crimpers and data cables, but the course as a whole is designed around simulation rather than a dedicated networking lab.'),
  H.sourceNote(SRC.materials.source, SRC.materials.url, SRC.materials.asOf),
  H.table(
    ['A school needs to provide', 'A school does not need to provide'],
    [
      ['Computers that can install Packet Tracer and GNS3', 'A physical networking lab with racked switches and routers'],
      ['A Course Audit-approved teacher of record', 'A separate certification exam fee for every student'],
      ['Basic hands-on supplies for some lessons (cables, crimpers)', 'Dedicated CTE facility space beyond a standard computer lab'],
    ]
  ),
  H.p('That is genuinely good news for a school weighing whether it can afford to participate. The barrier to entry is closer to a standard computer science classroom than to a career and technical education lab build-out, which is worth knowing before a budget conversation assumes otherwise.'),

  H.h2(SECTIONS[3]),
  H.p('AP Networking and Cisco show up together often enough that administrators sometimes assume the two are bundled the way AP Cybersecurity and Cisco Networking Academy are, with a defined curriculum partnership and an aligned industry certification path built into the course. That assumption is only partly right, and the difference matters for what a school actually has to buy or sign up for.'),
  H.p('Cisco\'s documented partnership with College Board, publicly described by Cisco itself, is centered on AP Cybersecurity: Cisco Networking Academy supplies industry-aligned curriculum, hands-on labs, and educator support for that course, with a path toward the Cisco Certified Support Technician cybersecurity credential for schools that choose Networking Academy as their instructional resource.'),
  H.sourceNote(SRC.cisco.source, SRC.cisco.url, SRC.cisco.asOf),
  H.p('AP Networking\'s relationship to Cisco is a different, narrower kind of tie. The AP Networking Credential, the College Board pathway that recognizes course completion, is aligned with a set of existing industry certifications: CompTIA Network+, Cisco Certified Networking Associate, and Cisco Certified Support Technician for Networking. That is a credential alignment, not a mandated purchase or a required certification exam a school has to enroll students in.'),
  H.sourceNote(SRC.credential.source, SRC.credential.url, SRC.credential.asOf),
  H.box('tip', 'The question to ask before assuming a cost', '<p>Do not budget for a Cisco Networking Academy license or a certification exam fee on the assumption that AP Networking requires it the way some coverage of AP Cybersecurity implies. Confirm directly with your Course Audit contact what your specific pilot cohort is expected to provide, since pilot requirements have shifted across the three pilot years.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Teaching an AP course your department has run for a decade and teaching one in its final pilot year are not the same job, even when the room, the bell schedule, and the students look identical. The gap is worth naming plainly for anyone approving a teacher\'s assignment or their professional development request.'),
  H.ul([
    '<strong>No released exam questions exist.</strong> An established AP course has years of released free response questions and scoring guidelines a teacher can hand students directly. A pilot teacher is working from the course framework alone, which means every practice question in circulation, including the ones on this site, is a reconstruction rather than a released item.',
    '<strong>Less institutional memory to lean on.</strong> A first-year AP Calculus teacher can walk into a department meeting and ask a colleague who has taught it for fifteen years. A pilot AP Networking teacher, especially at a school where the course is brand new, often does not have that colleague down the hall yet.',
    '<strong>The framework itself is still being tested.</strong> College Board describes the pilot explicitly as a way to test the course framework before it locks in for national launch, which means pacing guides, unit emphasis, and even scoring approaches can still shift year to year in ways an established course\'s materials do not.',
    '<strong>Feedback runs toward College Board rather than only toward a district.</strong> Course Audit-approved pilot teachers get access to an online pilot teacher community and additional instructional resources through that channel, which is also where a pilot teacher\'s classroom experience feeds back into how the course gets finalized.',
  ]),
  H.sourceNote(SRC.pilots.source, SRC.pilots.url, SRC.pilots.asOf),
  H.p('None of that makes the pilot a worse assignment. It makes it a different one, closer to a curriculum development role than to a standard course load, and a school supporting that teacher well should plan differently than it would for a tenth section of an established AP course.'),

  H.h2(SECTIONS[5]),
  H.p('For a school not already inside the pilot pipeline, the real decision is not whether to join this year\'s pilot, since that door is closed to new schools. It is whether to build toward the 2027-28 national launch now or wait a further year to see how the pilot resolves.'),
  H.p('Building toward it now means identifying and supporting a teacher early, watching Course Audit requirements as they firm up, and treating the first national year as a launch a department has actually prepared for rather than reacted to. Waiting means less exposure to a course whose scoring history and college credit recognition are still thin, at the cost of arriving a year behind schools that started preparing during the final pilot.'),
  H.p('Either choice is defensible. What is not defensible is a school committing a teacher and a class section to AP Networking on the assumption that it works exactly like adopting AP Statistics or AP US History, when the honest answer is that a good chunk of what makes an established AP course predictable, released exams, years of released items, a deep well of teacher community knowledge, simply is not built yet for this one.'),
  H.p('The <a href="/pages/ap-networking">AP Networking course guide</a> and <a href="/pages/ap-networking-exam">exam format page</a> on this site are aimed at students and teachers working through the content itself. For the parallel course in the Career Kickstart family, our overview of <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity</a> is useful context for schools weighing which Career Kickstart course to bring in first, since Cybersecurity is a year further along toward national launch.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Can any school join the AP Networking pilot for 2026-27?', a: 'No. Eligibility for the 2026-27 pilot is limited to schools that already participated in an earlier AP Networking or AP Cybersecurity pilot. Schools new to AP Networking join once it becomes available nationally in 2027-28.' },
    { q: 'Does a school need Cisco networking equipment to teach AP Networking?', a: 'No. The course is designed to be teachable using simulator software such as Cisco Packet Tracer and GNS3 rather than a physical lab of routers and switches. Some lessons call for basic supplies like cables and crimpers, but a dedicated networking lab is not required.' },
    { q: 'Is Cisco Networking Academy required to teach AP Networking?', a: 'No. Cisco\'s more formal curriculum partnership with College Board is centered on AP Cybersecurity. AP Networking\'s tie to Cisco is a credential alignment, meaning the AP Networking Credential recognizes certifications including Cisco Certified Support Technician for Networking, CCNA, and CompTIA Network+, not a required licensing purchase.' },
    { q: 'Does a teacher need special certification to teach AP Networking?', a: 'A teacher does need an approved syllabus through AP Course Audit before the course can be offered under the AP name, the same process every AP course requires. There is no separate industry certification exam a teacher must pass to lead the course.' },
    { q: 'What happens if the teacher who ran the pilot leaves the school?', a: 'Course Audit authorization is tied to the teacher and the specific course, not the school as a whole. A new teacher taking over generally needs to complete the same Course Audit steps before the school can continue offering AP Networking.' },
  ]),

  H.cta({
    heading: 'Support your AP Networking teacher and students',
    body: 'Unit-by-unit course content built to the College Board framework, plus exam format details for pilot and future national cohorts.',
    links: [
      { href: '/pages/ap-networking', text: 'View the course guide' },
      { href: '/pages/ap-networking-exam', text: 'Exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Pilot eligibility, required materials, and credential alignment reflect College Board and Cisco information current in August 2026. Confirm current-year specifics with your AP Course Audit contact before budgeting or scheduling. Last reviewed September 29, 2026.'),
]);

module.exports = { meta, body };
