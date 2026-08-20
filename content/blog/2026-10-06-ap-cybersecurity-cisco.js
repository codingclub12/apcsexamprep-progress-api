'use strict';
// Weekly course post: AP Cybersecurity. Deep dive on the Cisco Networking
// Academy partnership, independently re-verified rather than trusted from the
// AP Networking pilot-commitments post that first flagged the asymmetry.
const H = require('../../lib/blog-house');

const SRC = {
  cisco: { source: 'Cisco, Cisco Partners With College Board to Launch AP Cybersecurity and Expand Career-Connected Learning', url: 'https://blogs.cisco.com/learning/cisco-partners-with-college-board-to-launch-ap-cybersecurity', asOf: 'August 2026' },
  credential: { source: 'College Board, AP Cybersecurity Credential', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/credentials/ap-cybersecurity', asOf: 'August 2026' },
  ccstExam: { source: 'Cisco, CCST Cybersecurity (100-160) exam page', url: 'https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccst-cybersecurity.html', asOf: 'August 2026' },
  ccstFaq: { source: 'Cisco, Cisco Certified Support Technician certifications FAQ', url: 'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/support-technician/faq.html', asOf: 'August 2026' },
  course: { source: 'College Board, AP Cybersecurity course page', url: 'https://apcentral.collegeboard.org/courses/ap-cybersecurity', asOf: 'August 2026' },
};

const SECTIONS = [
  'What Cisco Networking Academy actually puts in your classroom',
  'What the CCST Cybersecurity certification actually is',
  'How CCST Cybersecurity connects to the AP Cybersecurity Credential',
  'Can a student realistically earn both credentials in one year',
  'How much to lean on Cisco versus everything else',
];

const meta = {
  title: 'What Cisco Networking Academy Actually Gives Your AP Cybersecurity Classroom',
  handle: 'ap-cybersecurity-cisco-networking-academy-partnership',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'cisco networking academy',
  publishOn: '2026-10-06',
  seoTitle: 'Cisco Networking Academy and AP Cybersecurity, Explained',
  seoDescription: 'What the Cisco Networking Academy partnership gives an AP Cybersecurity classroom: curriculum, labs, teacher training, and the CCST certification path.',
  summary: 'AP Cybersecurity has a real Cisco Networking Academy curriculum and lab partnership behind it, not just a credential-alignment footnote. A teacher-facing look at what that partnership actually supplies, what the CCST Cybersecurity certification is, how it relates to the AP Cybersecurity Credential, and how much of your course to build on Cisco material versus your own.',
  tags: ['AP Cybersecurity', 'Cisco Networking Academy', 'CCST Cybersecurity', 'Career Kickstart', 'Certification'],
  allowedInlineNumbers: ['25 percent', '40 percent'],
};

const body = H.article([
  H.dek('The Cisco Networking Academy partnership is the single most consequential fact about how AP Cybersecurity actually gets taught, and most coverage stops at the press release headline. Here is what it hands a teacher in practice: the curriculum, the labs, the teacher training, a real certification path, and exactly where the free material runs out.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.p('Our companion piece on the <a href="/blogs/ap-networking/ap-networking-pilot-school-commitments">AP Networking pilot and what a school actually commits to</a> flagged something in passing worth repeating here, because it is the reason this post exists: Cisco\'s relationship with AP Networking is a narrow credential alignment, a list of certifications the AP Networking Credential happens to line up with. AP Cybersecurity is a different arrangement entirely, with an actual named curriculum, lab, and teacher training partnership behind it. If you want the AP Networking side of that contrast, read that post first. This one stays on the Cybersecurity side and goes as deep as the public record allows.'),
  H.p('That distinction matters for a very concrete reason. A department chair deciding how to staff and equip an AP Cybersecurity section is deciding how much to build on Cisco\'s material versus building or buying something else, and getting that decision right depends on knowing exactly what Cisco supplies, what it does not, and what a student actually walks away with if they pursue the Cisco certification path alongside the AP exam itself.'),

  H.h2(SECTIONS[0]),
  H.p('Cisco Networking Academy, usually shortened to NetAcad, is Cisco\'s decades-old global IT education program, built to run through schools and community organizations rather than sold directly as corporate training. For AP Cybersecurity specifically, Cisco and College Board announced the partnership\'s scope directly, co-authored by a Cisco product lead and College Board\'s own Vice President of AP Program Access, which is itself a signal of how tightly the two organizations coordinated on it rather than Cisco simply donating a discount code.'),
  H.p(H.stat('4.8 million unfilled cybersecurity jobs globally', SRC.cisco) + ' is the stated reason for the partnership, and Cisco frames Networking Academy\'s role as addressing it directly by supplying three things to a participating classroom: a ready-to-teach curriculum, hands-on labs built into that curriculum, and professional development for the teacher delivering it.'),
  H.box('key', 'The line that matters most', '<p>Cisco Networking Academy is explicitly framed as a resource "for those who choose Cisco Networking Academy as their instructional resource." That phrasing is doing real work: it means a school can teach AP Cybersecurity entirely from College Board\'s own Course and Exam Description without touching NetAcad at all. Cisco material is an option layered on top of the required curriculum document, not a replacement for it.</p>'),
  H.p('The scale behind the claim is real rather than aspirational. During the 2025-26 pilot year, the course reached ' + H.stat('3,100 students across 183 schools in 30 states', SRC.cisco) + ', and heading into the national launch, ' + H.stat('nearly 500 educators registered for AP Summer Institutes', SRC.cisco) + ' to prepare to teach it. Cisco\'s own framing of why the teacher training piece matters is blunt: many educators assigned to this course have never had formal cybersecurity training themselves, and NetAcad\'s professional development exists specifically to close that gap rather than to sell a certification.'),
  H.sourceNote(SRC.cisco.source, SRC.cisco.url, SRC.cisco.asOf),

  H.h2(SECTIONS[1]),
  H.p('The certification Cisco ties to this partnership is Cisco Certified Support Technician Cybersecurity, exam code 100-160, almost always shortened to CCST Cybersecurity. It is worth being precise about what kind of certification this is, because the name invites confusion with heavier professional credentials.'),
  H.p('CCST Cybersecurity is Cisco\'s entry-level credential, not an associate or professional one. It validates foundational knowledge across security principles, network and endpoint security concepts, vulnerability assessment and risk management, and incident handling, and Cisco positions it explicitly as a first step toward the more advanced CyberOps Associate certification rather than a career-capping credential on its own.'),
  H.sourceNote(SRC.ccstExam.source, SRC.ccstExam.url, SRC.ccstExam.asOf),
  H.p('The exam itself is a ' + H.stat('50 minute, $125 proctored exam', SRC.ccstExam) + ', administered separately from anything a school runs for the AP exam itself. Cisco publishes no formal prerequisite for it, and NetAcad offers a free, self-paced training path built specifically to prepare a learner for it: the Junior Cybersecurity Analyst Career Path, aimed at entry-level roles like cybersecurity technician or Tier 1 help desk support.'),
  H.box('tip', 'Set expectations before you mention this to students', '<p>CCST is Cisco\'s own confirmation that this certification is not a stepping stone requirement toward its associate-level exams, only a foundation for them. Do not present it to students as equivalent to Security+ or a professional analyst credential. It is a genuinely useful entry-level signal, and it is exactly that: entry-level.</p>'),
  H.sourceNote(SRC.ccstFaq.source, SRC.ccstFaq.url, SRC.ccstFaq.asOf),

  H.h2(SECTIONS[2]),
  H.p('This is where the two credentials most often get flattened into one thing in casual conversation, and they are not the same thing issued by the same organization. The AP Cybersecurity Credential comes from College Board and is earned by taking the yearlong course and then reaching a qualifying score on the AP Exam itself. CCST Cybersecurity comes from Cisco and is earned by passing a separate, standalone 100-160 exam that a student registers and pays for independently.'),
  H.table(
    ['', 'AP Cybersecurity Credential', 'CCST Cybersecurity'],
    [
      ['Issuer', 'College Board', 'Cisco'],
      ['How it is earned', 'Qualifying score on the AP Exam', 'Separate proctored 100-160 exam'],
      ['Cost to the student', 'Standard AP exam fee', H.stat('$125', SRC.ccstExam)],
      ['What it validates', 'NICE Workforce Framework skills across risk, mitigation, and detection', 'Entry-level security, network, and endpoint concepts'],
    ]
  ),
  H.p('College Board\'s own credential page states the relationship precisely: the AP Cybersecurity Credential is "aligned with" industry certifications including CompTIA Security+ and CCST Cybersecurity, and can be "stacked" with those credentials and with the AP Networking Credential over the course of a student\'s education. Aligned and stacked are the operative words. Nothing in that language means the AP Credential substitutes for the CCST exam, waives its fee, or automatically issues it. A student who wants the Cisco certification on their record still has to sit Cisco\'s own exam.'),
  H.sourceNote(SRC.credential.source, SRC.credential.url, SRC.credential.asOf),

  H.h2(SECTIONS[3]),
  H.p('Yes, realistically, for a motivated student, and the reason is that the content overlap is genuinely close rather than coincidental. AP Cybersecurity\'s course framework spirals three skill categories through its five units, analyzing risk, mitigating risk, and detecting attacks, each weighted between ' + H.stat('25 and 40 percent', SRC.course) + ' of the exam. CCST Cybersecurity\'s exam objectives cover security principles, network and endpoint security, vulnerability assessment and risk management, and incident handling. Those are not two different subjects wearing different names. A student who has genuinely learned the AP course content is close to CCST-ready already, which is exactly why NetAcad built a career path aimed at that exact overlap.'),
  H.sourceNote(SRC.course.source, SRC.course.url, SRC.course.asOf),
  H.p('What makes it a realistic goal rather than a guaranteed one is logistics, not content. The AP Exam is administered once a year through the school\'s AP coordinator on a fixed May date. CCST Cybersecurity is a Pearson VUE-proctored exam a student or school schedules independently, on its own timeline, for its own $125 fee per attempt. A school that wants to make dual certification realistic has to build that scheduling and that fee into its plan deliberately, generally by treating the CCST attempt as an optional spring add-on once AP content is largely covered, rather than assuming the exams line up automatically.'),
  H.box('warn', 'The mistake to avoid', '<p>Do not tell students or parents that a qualifying AP score "gets them" the Cisco certification. It does not. Passing the AP Exam and passing CCST Cybersecurity are two separate accomplishments that happen to be built from closely related content. Be explicit about that when you set expectations at the start of the year, not after a student is disappointed in May.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Given all of that, here is the practical split worth making as you plan the course. Lean on Cisco Networking Academy for what it is actually built for: hands-on labs and structured teacher professional development, especially if you are new to security content yourself. That is the exact gap Cisco says it built the partnership to close, and it is the piece hardest to build from scratch on your own on a normal teaching schedule.'),
  H.p('Do not lean on it for AP-specific exam preparation, because NetAcad\'s own assessments are built to check readiness for Cisco\'s certifications, not to mirror the AP\'s specific format of a 60 question multiple choice section plus a single device security free response. Those are different instruments measuring related but not identical things. For that half of preparation, pair NetAcad\'s labs with material built to the AP\'s actual exam shape, like our <a href="/pages/ap-cybersecurity-practice-exam">AP Cybersecurity practice exam</a> and the <a href="/pages/ap-cybersecurity-curriculum">unit-by-unit curriculum breakdown</a>, which follow the College Board framework directly rather than a vendor certification\'s objectives.'),
  H.p('Treat the CCST attempt itself as an optional stretch goal you offer rather than a requirement you build the whole course around. Some students will want the extra credential and the extra line on a resume badly enough to pay the fee and sit a second exam. Others will be fully served by the AP Credential alone. Building the course so both groups succeed, rather than assuming everyone wants the Cisco certification, is the honest way to use a genuinely strong partnership without overselling it. Our broader look at what the course itself covers in its first national year is in the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-launch-2026-27-guide">AP Cybersecurity launch guide</a>, which is a useful starting point if you are still mapping out the year.'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is Cisco Networking Academy required to teach AP Cybersecurity?', a: 'No. The AP Cybersecurity Course and Exam Description from College Board is the required curriculum document. Cisco Networking Academy is an optional instructional resource layered on top of it, supplying curriculum support, labs, and teacher training for schools that choose to use it.' },
    { q: 'Does passing the AP Cybersecurity Exam automatically give a student the CCST Cybersecurity certification?', a: 'No. The AP Cybersecurity Credential and CCST Cybersecurity are separate credentials from separate organizations. College Board describes the AP Credential as aligned with and stackable alongside CCST Cybersecurity, not equivalent to it. A student who wants the Cisco certification still has to register for and pass Cisco\'s own 100-160 exam.' },
    { q: 'How much does the CCST Cybersecurity exam cost, and who pays for it?', a: 'The exam itself costs $125 per attempt, paid separately from any AP exam fee. It is scheduled independently through a Pearson VUE testing arrangement rather than through a school\'s AP coordinator, so a school choosing to support it needs its own plan for scheduling and covering or passing along that cost.' },
    { q: 'Is CCST Cybersecurity a hard certification to earn?', a: 'It is Cisco\'s entry-level cybersecurity certification, with no formal prerequisite, positioned as a foundation toward Cisco\'s more advanced CyberOps Associate credential rather than a professional-level credential on its own. A student who has genuinely learned the AP Cybersecurity course content is reasonably well prepared for it, but it is still a separate proctored exam that requires its own preparation.' },
    { q: 'Where can I read about the AP Networking side of the Cisco relationship?', a: 'Our companion post on the AP Networking pilot covers what a school commits to under that program, including why AP Networking\'s tie to Cisco is a lighter credential-alignment relationship rather than the curriculum and lab partnership AP Cybersecurity has.' },
  ]),

  H.cta({
    heading: 'Build your AP Cybersecurity course with confidence',
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
  H.updatedNote('Partnership details, exam pricing, and credential language reflect Cisco and College Board information current as of August 2026. Confirm current-year specifics, including exam fees and registration logistics, directly with Cisco and your AP Course Audit contact before committing a budget. Last reviewed October 6, 2026.'),
]);

module.exports = { meta, body };
