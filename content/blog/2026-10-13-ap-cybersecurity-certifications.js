'use strict';
// Weekly course post: AP Cybersecurity. Broad look at the realistic
// certification landscape a student might pursue after (or alongside) AP
// Cybersecurity: CompTIA Security+, CompTIA Tech+, and an honest read on
// why CISSP-tier credentials are not a near-term high school goal.
//
// Deliberately NOT a Cisco/CCST deep dive: 2026-10-06-ap-cybersecurity-cisco.js
// already owns that certification in detail and is linked from here rather
// than repeated. The AP credential's "stackable" alignment with Security+
// and CCST is likewise referenced from the launch guide, which already
// established it, rather than re-derived with a fresh sourced claim here.
//
// Certification facts (cost, format, passing score, prerequisites) verified
// via search against CompTIA's own certification pages and ISC2/ISACA's own
// experience-requirement pages, since direct fetch of comptia.org was blocked
// by network egress in this environment; cross-checked across multiple
// independent citations of the same figures where direct fetch was not
// possible, same posture as 2026-10-06-ap-networking-networkplus.js. Notably,
// CompTIA retired ITF+ in 2025 and replaced it with CompTIA Tech+, so this
// post recommends Tech+ rather than the now-retired ITF+ name.
const H = require('../../lib/blog-house');

const SRC = {
  security: { source: 'CompTIA, Security+ Certification', url: 'https://www.comptia.org/en-us/certifications/security/', asOf: 'as of the June 2026 CompTIA price update' },
  tech: { source: 'CompTIA, Tech+ Certification', url: 'https://www.comptia.org/en-us/certifications/tech/', asOf: 'as of 2026' },
  techVsItf: { source: 'CompTIA, CompTIA Tech+ vs CompTIA ITF+: What is the Difference', url: 'https://www.comptia.org/en-us/blog/comptia-tech-vs-comptia-itf-whats-the-difference/', asOf: 'as of 2026' },
  cissp: { source: 'ISC2, Experience Needed for the ISC2 CISSP Certification', url: 'https://www.isc2.org/certifications/cissp/cissp-experience-requirements', asOf: 'as of 2026' },
  isaca: { source: 'ISACA, CISM certification requirements', url: 'https://www.isaca.org/credentialing/cism/get-cism-certified', asOf: 'as of 2026' },
};

const SECTIONS = [
  'The cybersecurity certifications landscape after AP Cybersecurity',
  'CompTIA Security+: the certification the AP credential already points toward',
  'CompTIA Tech+: a genuinely easier first step, if you want one',
  'Where the Cisco CCST Cybersecurity certification fits',
  'CISSP and other advanced certifications: an honest timeline',
  'A realistic certification sequence from junior year to your first job',
];

const meta = {
  title: 'The Cybersecurity Certifications Worth Pursuing After AP Cybersecurity',
  handle: 'ap-cybersecurity-certifications-that-follow',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'cybersecurity certifications',
  publishOn: '2026-10-13',
  seoTitle: 'Cybersecurity Certifications After AP Cybersecurity',
  seoDescription: 'A realistic look at cybersecurity certifications to pursue after AP Cybersecurity: CompTIA Security+, Tech+, CCST, and why CISSP is not a near-term goal.',
  summary: 'AP Cybersecurity is the on ramp, not the finish line, and students want to know what to pursue next. This guide covers the realistic certification landscape: CompTIA Security+, the certification the AP Cybersecurity Credential already points toward; CompTIA Tech+, the genuinely easier first step that replaced the now-retired ITF+; where Cisco CCST Cybersecurity fits alongside them; and an honest, sourced explanation of why CISSP and similar advanced credentials require years of professional experience and are not a realistic near-term goal for a current student.',
  tags: ['AP Cybersecurity', 'Cybersecurity Certifications', 'CompTIA Security+', 'Career Kickstart', 'Certification Timeline'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP Cybersecurity is not the finish line, it is the on ramp. This guide covers the realistic cybersecurity certifications a student can actually pursue during and after the course: which one the AP credential already points toward, which one is a genuinely easier first step, and which advanced certifications are not a near-term goal no matter how strong your AP score is.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Every AP Cybersecurity teacher gets some version of the same question by October: now what. A student finishes Unit 1, likes the material, and wants to know what to actually go do with it beyond a qualifying score next May. The honest answer involves more nuance than a single certification name, because the realistic cybersecurity certifications available to a current high school student are a much shorter list than the ambitious one a student finds by searching online.'),
  H.p('This guide is the direct answer to that question: what to pursue, in what order, and what to leave alone until there is real work experience behind it. If you want the details on the Cisco Networking Academy partnership and the CCST Cybersecurity certification specifically, that gets a full, dedicated treatment in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cisco-networking-academy-partnership">a companion post</a>. This guide stays on the broader landscape around it.'),

  H.h2(SECTIONS[0]),
  H.p('Search for cybersecurity certifications and the results blur together fast. Entry-level exams, vendor-specific badges, and career-capping professional credentials all show up on the same list with no indication of which ones a current student could plausibly earn in the next year versus the next decade. That is the gap this guide closes.'),
  H.box('key', 'The one distinction that matters most', '<p>Every certification below falls into one of two categories: exams gated by a proctored test you can schedule and sit whenever you are ready, and credentials gated by verified years of paid professional work. The first category is realistic for a motivated high schooler. The second is not, no matter how strong your AP score is, because there is no way to accelerate calendar time spent employed.</p>'),
  H.p('AP Cybersecurity itself does not issue an industry certification. It issues an AP score and, alongside it, the AP Cybersecurity Credential from College Board, which is a separate thing from any of the certifications in this guide. What the AP Credential does is point toward two of them directly: our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-launch-2026-27-guide">launch guide to the course</a> covers how College Board describes that credential as aligned with, and stackable alongside, both CompTIA Security+ and Cisco\'s CCST Cybersecurity certification. That alignment is the reason this guide starts with those two names rather than a longer alphabet soup of vendor logos, and it is worth reading that guide first if you have not seen the exact language College Board uses.'),

  H.h2(SECTIONS[1]),
  H.p('CompTIA Security+ is the certification named most often anywhere the phrase entry-level cybersecurity job comes up, and it earns that reputation honestly. It is vendor-neutral, widely recognized by employers who have never touched a specific product line, and it is a credential the United States Department of Defense lists as meeting a baseline requirement for a range of civilian and contractor security roles.'),
  H.p('The numbers are worth knowing precisely rather than approximately, because they change how a student should plan around this exam. The current exam is Security+ SY0-701. It costs ' + H.stat('$439 as of the June 2026 CompTIA price update, up from $425', SRC.security) + ', runs as ' + H.stat('up to 90 questions in a 90 minute exam', SRC.security) + ', and requires a scaled score of ' + H.stat('750 out of 900 to pass', SRC.security) + '.'),
  H.sourceNote(SRC.security.source, SRC.security.url, SRC.security.asOf),
  H.p('There is no hard prerequisite. CompTIA does not block anyone from registering. What CompTIA does recommend, and this is the detail that actually matters for a high schooler planning a timeline rather than just checking a box, is ' + H.stat('CompTIA Network+ plus two years of experience in a security or systems administrator role', SRC.security) + ' before attempting it. A current student can ignore that recommendation and sit the exam anyway, and some do, and pass. But treat the recommendation as a real signal about difficulty rather than corporate throat clearing: Security+ assumes a candidate already understands how a network behaves under normal conditions before it asks that candidate to reason about how one behaves under attack.'),
  H.box('warn', 'The mistake to avoid', '<p>Do not assume a strong AP Cybersecurity score makes Security+ easy. The AP exam tests concepts and reasoning through scenarios written for a course audience. Security+ tests much of the same territory at a faster pace, with performance-based questions that ask a candidate to configure or diagnose something rather than only recognize the right answer among four options. The content overlap is real and it is a genuine head start. It is not a substitute for dedicated Security+ specific prep.</p>'),

  H.h2(SECTIONS[2]),
  H.p('If Security+ sounds like a lot to take on before or right after AP Cybersecurity, there is a genuinely easier option, and it is worth naming precisely because so much of what circulates online about it is out of date. For years the standard beginner recommendation was CompTIA IT Fundamentals, ITF+. That certification is retired.'),
  H.p('CompTIA retired ITF+ on ' + H.stat('July 31, 2025', SRC.techVsItf) + ' and replaced it with CompTIA Tech+, a broader beginner exam that folds in cloud computing basics, everyday cybersecurity awareness, and data literacy alongside the original IT fundamentals content. If ITF+ shows up in an older article, a teacher\'s handout, or a college advisor\'s notes from a couple of years back, Tech+ is the exam that name now points to.'),
  H.sourceNote(SRC.techVsItf.source, SRC.techVsItf.url, SRC.techVsItf.asOf),
  H.p('Tech+ is meaningfully lighter than Security+ across every dimension that matters to a student weighing the two.'),
  H.table(
    ['', 'CompTIA Tech+', 'CompTIA Security+'],
    [
      ['Best for', 'A student still deciding whether IT or security is the right direction', 'A student who has decided security is the direction and wants an employer-recognized entry credential'],
      ['Cost', H.stat('$143', SRC.tech), H.stat('$439', SRC.security)],
      ['Format', H.stat('up to 70 questions, 60 minutes', SRC.tech), H.stat('up to 90 questions, 90 minutes', SRC.security)],
      ['Passing score', H.stat('650 of 900', SRC.tech), H.stat('750 of 900', SRC.security)],
      ['Prerequisites', 'None', 'None required; Network+ and security experience recommended'],
    ]
  ),
  H.sourceNote(SRC.tech.source, SRC.tech.url, SRC.tech.asOf),
  H.p('Tech+ is not a required stepping stone on the way to Security+, and skipping it entirely is a completely reasonable choice for a student who already knows security is the direction they want and is willing to put in focused, Security+ specific prep. Where Tech+ earns its place is for the student who is not sure yet, who liked AP Cybersecurity well enough to want another data point before committing real study hours to something as specific as Security+.'),

  H.h2(SECTIONS[3]),
  H.p('The certification most closely tied to AP Cybersecurity itself is CCST Cybersecurity, Cisco\'s own entry-level credential, because Cisco\'s Networking Academy is a direct curriculum and lab partner on the course. That relationship, what Cisco actually supplies to a classroom, what the CCST exam covers, how it lines up against the AP Cybersecurity Credential\'s own stackable language, and a realistic read on whether a student can earn both in one year, gets a full treatment in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cisco-networking-academy-partnership">our dedicated post on the Cisco partnership</a>. Read that one if CCST is the specific certification you are weighing. This guide will not repeat the exam pricing or format details already covered there.'),
  H.p('What is worth saying here, briefly, is how CCST fits next to Security+ and Tech+ on this list. CCST is Cisco\'s own entry-level credential, comparable in difficulty and audience to Tech+ rather than to Security+, and it is the one built most directly from AP Cybersecurity content specifically, since Cisco Networking Academy designed a training path around that exact overlap. A student choosing between CCST and Tech+ as a first certification is mostly choosing based on which vendor ecosystem they expect to work in next, not based on which one is harder.'),

  H.h2(SECTIONS[4]),
  H.p('Every list of cybersecurity certifications that circulates among students eventually includes CISSP, and it deserves a direct, honest answer rather than a vague gesture toward it being for later: CISSP is not a near-term goal for a high school student, and understanding exactly why is more useful than simply being told to wait.'),
  H.p('CISSP, issued by ISC2, requires ' + H.stat('five years of cumulative, full-time paid experience across at least two of the eight CISSP domains', SRC.cissp) + ' before the certification is actually awarded. There is a partial exception worth knowing about: a student can sit and pass the CISSP exam itself without meeting that experience requirement yet, and hold the title Associate of ISC2 while accumulating it, with ' + H.stat('up to six years from the exam date to complete the required experience', SRC.cissp) + '. That pathway genuinely exists. Passing a graduate-level security exam years before there is any professional security work behind it is still a hard, low-leverage use of a high schooler\'s study time compared with the same hours spent on Security+ or actual hands-on lab work.'),
  H.sourceNote(SRC.cissp.source, SRC.cissp.url, SRC.cissp.asOf),
  H.p('CISSP is not an outlier. ISACA\'s flagship credentials follow the identical pattern: ' + H.stat('CISA and CISM both require five years of relevant professional experience', SRC.isaca) + ' before certification, with only partial waivers available for advanced degrees or other approved credentials. These are real, valuable, well compensated certifications, and every one of them assumes a career already in progress, not one about to start.'),
  H.sourceNote(SRC.isaca.source, SRC.isaca.url, SRC.isaca.asOf),
  H.p('Offensive security certifications like OSCP work a little differently, gated by demonstrated hands-on skill rather than a fixed number of years, but the practical effect on a high schooler\'s timeline lands in the same place. OSCP assumes comfort with enterprise networks, Linux administration, and scripting that most students have not built yet by senior year, security course or not. It is a genuinely respected credential for a working penetration tester a few years into their career, and a genuinely poor use of a current student\'s limited study hours.'),
  H.box('key', 'What this means for you right now', '<p>Name these certifications if a student or a parent asks about them, and be straight about the timeline: real, valuable, years away, and gated by work experience rather than by how well anyone did in AP Cybersecurity. The realistic near-term list is short. That is not a discouraging fact, it is a planning fact, and it is far better to know it now than after paying for a study guide aimed at a certification nobody is yet eligible to hold.</p>'),

  H.h2(SECTIONS[5]),
  H.ol([
    '<strong>During AP Cybersecurity, junior or senior year.</strong> Learn the course. Do not stack certification prep on top of it yet unless working through Cisco Networking Academy material specifically, since that path is built to run alongside the course rather than compete with study time for it.',
    '<strong>Right after the AP exam, spring of the year the course is taken.</strong> This is a reasonable window for a first certification attempt. A student with genuine course mastery and a few dedicated weeks of prep can realistically attempt CompTIA Tech+ or Cisco CCST Cybersecurity here, since both are built for a true beginner.',
    '<strong>Senior year or the summer after graduation.</strong> CompTIA Security+ becomes realistic once a student has either finished AP Cybersecurity with genuine mastery or picked up some hands-on exposure through a part-time help desk role, a school IT internship, or serious independent lab work. This is also a reasonable point for CompTIA Network+ if that ground was not already covered through AP Networking.',
    '<strong>The first year or two of college or entry-level work.</strong> Security+ becomes the natural target here if it was not attempted earlier, and a real IT support or junior analyst role starts the clock on the professional experience that CISSP, CISA, and CISM actually require.',
    '<strong>Three to five years into a security career.</strong> This is the realistic window for CISSP, CISM, CISA, or OSCP, once there is genuine professional experience or hands-on operational skill behind the exam rather than only classroom knowledge.',
  ]),
  H.p('None of this has to be decided now, and most of it should not be. The one decision worth making in high school is which of the first two rungs, Tech+, CCST, or nothing at all beyond the AP exam itself, is worth the time this year. Everything past Security+ takes care of itself once there is real work experience to build it on.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What cybersecurity certification should a student pursue right after AP Cybersecurity?', a: 'CompTIA Tech+ or Cisco CCST Cybersecurity are the realistic first certifications, both built for true beginners with no prerequisites. CompTIA Security+ is the stronger long-term credential and the one the AP Cybersecurity Credential is described as stackable alongside, but it assumes more background than most students have immediately after finishing the AP course.' },
    { q: 'Is CompTIA Security+ realistic to earn while still in high school?', a: 'It is possible, since Security+ has no hard prerequisite, but CompTIA\'s own recommended background, Network+ plus two years of security or systems administrator experience, is more than most high school students have. A strong AP Cybersecurity foundation is a real head start, not a substitute for that recommended preparation, so treat it as a senior year or post-graduation goal rather than a freshman or sophomore one.' },
    { q: 'What happened to CompTIA ITF+?', a: 'CompTIA retired ITF+ in 2025 and replaced it with CompTIA Tech+, a broader beginner certification that covers the same IT fundamentals territory plus cloud computing and basic security awareness. Any current recommendation to earn an entry-level CompTIA certification should point to Tech+, not the retired ITF+ name.' },
    { q: 'Should a high school student try to earn CISSP?', a: 'No, and not because the material is out of reach intellectually. CISSP requires five years of cumulative professional experience in the security field before it is awarded, a requirement calendar time cannot shortcut no matter how strong a student\'s AP score is. It belongs several years into a security career, not in a high school study plan.' },
  ]),

  H.cta({
    heading: 'Build the AP Cybersecurity foundation these certifications are built on',
    body: 'Unit-by-unit content built to the College Board framework, plus a practice exam in the real 60 question multiple choice plus device security format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Start the curriculum' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Certification costs, formats, and eligibility requirements reflect CompTIA, ISC2, and ISACA information current as of the dates cited above. Certification pricing and prerequisites change without much notice; confirm current-year specifics directly with CompTIA, Cisco, ISC2, and ISACA before a student commits study time or money to any exam. Last reviewed October 13, 2026.'),
]);

module.exports = { meta, body };
