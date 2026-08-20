'use strict';
// Reference/practical guide: the honest answer to whether AP Networking has
// college credit policy behind it yet. Same honest "brand new AP course has
// no established credit policy yet" framing as 2026-09-29-ap-cybersecurity-
// college-credit.js, but independently verified: AP Networking is a full
// pilot year further behind Cybersecurity's own still-forming timeline. Where
// Cybersecurity launched nationally this fall with a first exam in May 2027,
// Networking is in its third and final pilot year in 2026-27, national
// launch is 2027-28, and the first national exam is not until May 2028. That
// timeline, and the pilot eligibility rule restricting the 2026-27 cohort to
// schools that already piloted AP Networking or AP Cybersecurity, matches
// what is already established in 2026-08-18-ap-networking-pilot-year.js and
// 2026-09-29-ap-networking-pilot-commitments.js; this post does not
// contradict either one, and reuses the CompTIA Network+ domain overlap
// analysis from 2026-10-06-ap-networking-networkplus.js rather than
// re-deriving it.
//
// Sourcing note: collegeboard.org domains could not be fetched directly from
// this environment's egress proxy, the same restriction noted in the CSA,
// CSP, and Cybersecurity college credit posts. Every College Board claim
// below was verified via WebSearch on 2026-08-20, cross checked against
// multiple independent search results returning the same figures, and cited
// to the primary collegeboard.org URL rather than the secondary site that
// surfaced it. The AP Precalculus precedent restates research already
// verified and cited in 2026-09-29-ap-cybersecurity-college-credit.js, reused
// here rather than re-derived, same as that post reused the CSA/CSP posts'
// participation counts.
const H = require('../../lib/blog-house');

const SRC = {
  cbPilots: { source: 'College Board, AP Networking Pilot for 2026-27', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/pilots', asOf: 'August 2026' },
  cbAbout: { source: 'College Board, About AP Networking', url: 'https://apcentral.collegeboard.org/courses/ap-networking/about', asOf: 'August 2026' },
  cbCredential: { source: 'College Board, AP Networking Credential', url: 'https://apcentral.collegeboard.org/courses/ap-career-kickstart/credentials/ap-networking', asOf: 'August 2026' },
  cbCreditSearch: { source: 'College Board, AP Credit Policy Search', url: 'https://apstudents.collegeboard.org/getting-credit-placement/search-policies', asOf: 'August 2026' },
  precalc: { source: 'Cuemath, Is AP Precalculus Worth It', url: 'https://www.cuemath.com/blog/is-ap-precalculus-worth-it/', asOf: 'August 2026' },
};

const SECTIONS = [
  'Why AP Networking college credit is even further out than AP Cybersecurity\'s',
  'What the AP Precalculus precedent suggests about the timeline',
  'What College Board has actually said about credit and the network credentials',
  'What to actually do if you are taking AP Networking right now',
  'Practice: two questions in the troubleshooting style',
];

const meta = {
  title: 'AP Networking College Credit: What Is Knowable Right Now',
  handle: 'ap-networking-college-credit-what-is-knowable',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking college credit',
  publishOn: '2026-10-13',
  seoTitle: 'AP Networking College Credit: The Honest Timeline',
  seoDescription: 'AP Networking college credit does not really exist yet. Here is the honest reason why, what College Board has said about credit, and what to do right now.',
  summary: 'AP Networking college credit is not a settled question, and it is genuinely further from being settled than AP Cybersecurity\'s own still-forming credit picture. The course is in its third and final pilot year in 2026-27, national launch is not until 2027-28, and the first national exam is not until May 2028, so no college has real score data to evaluate yet. Here is the honest timeline, what a recent comparable case (AP Precalculus) suggests about how long new-course credit policy actually takes, what College Board has specifically said about credit and the CompTIA and Cisco credential alignment, and what a current student should realistically do while the picture is still forming.',
  tags: ['AP Networking', 'College Credit', 'CompTIA Network Plus', 'AP Credit Policy', 'Career Kickstart'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP Networking college credit is not just unsettled, it is a full pilot year further from being knowable than AP Cybersecurity\'s own credit picture, which is itself still an honest maybe. The course will not launch nationally until 2027-28, the first national exam is not until May 2028, and the small, closed pilot administrations that come before it were never built to produce the kind of stable score data a credit committee can act on. Here is the honest timeline, what a recent comparable course shows about how long this actually takes, what College Board has specifically said about credit and the CompTIA and Cisco credential alignment, and what to realistically do about it right now.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Search "AP Networking college credit" today and you will find even less than a search for AP Cybersecurity college credit turns up, and that gap is worth sitting with rather than skimming past. AP Cybersecurity at least launched nationally this fall and has a first exam eight months out. AP Networking has neither of those things yet. It is still in a closed pilot, the national launch itself is still a year away, and any honest answer to the AP Networking college credit question has to start from what stage of a genuinely long process this actually is, rather than pretend a settled answer is hiding somewhere better indexed.'),
  H.p('If you want the full mechanics of what pilot status means day to day, our <a href="/blogs/ap-networking/ap-networking-2026-27-pilot-year-guide">guide to the 2026-27 pilot year</a> covers the units, the skills, and how the pilot exam differs from the eventual national exam, and our <a href="/blogs/ap-networking/ap-networking-pilot-school-commitments">look at what a school actually commits to</a> covers the administrative side of piloting a course this new. Neither one is written to answer the specific question this post exists to answer, which is what is actually knowable about college credit right now, and what genuinely is not.'),

  H.h2(SECTIONS[0]),
  H.p('AP Networking is not new to piloting, which is exactly why its credit timeline is confusing rather than simple. The 2026-27 school year is College Board\'s own third and final pilot for the course, and it is not open to interested schools generally. Only schools that already took part in an earlier AP Networking or AP Cybersecurity pilot round are eligible to join this cohort, ahead of the course becoming available to every school nationally the following year.'),
  H.sourceNote(SRC.cbPilots.source, SRC.cbPilots.url, SRC.cbPilots.asOf),
  H.p('That detail matters specifically for the credit question, not just for scheduling. Even though AP Networking has been through prior small scale pilot rounds, none of those administrations are the exam a college credit committee would actually be evaluating. Pilot years exist to test and refine the course framework itself, and the framework, the pacing, and even parts of the assessment can still shift from one pilot year to the next in ways an established course\'s materials do not. A registrar deciding whether a 3 or a 4 reflects college level mastery needs a stable, repeatable exam behind that score. A course still adjusting its own framework year to year has not produced that yet, no matter how many pilot administrations came before it.'),
  H.table(
    ['', 'AP Cybersecurity', 'AP Networking'],
    [
      ['Status in 2026-27', 'National launch, open to all schools', 'Third and final pilot, participating schools only'],
      ['National launch', '2026-27', '2027-28'],
      ['First national exam', 'May 2027', 'May 2028'],
      ['First real national score data', 'Summer 2027', 'Summer 2028'],
    ]
  ),
  H.sourceNote(SRC.cbPilots.source, SRC.cbPilots.url, SRC.cbPilots.asOf),
  H.box('key', 'What this means, plainly', '<p>AP Networking is not merely a course without college credit policy yet. It is a course a full year behind a sibling course, AP Cybersecurity, that itself has no meaningful credit policy yet either. If you have read our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-college-credit-brand-new-ap">honest answer on AP Cybersecurity credit</a>, take everything that post says and push the calendar back another year for AP Networking. That is not pessimism, it is arithmetic on a published pilot and launch schedule.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The honest way to answer "how long will this actually take" is not to guess, it is to look at what happened with the most recent genuinely new AP course that now has a couple of years of real exam data behind it.'),
  H.p('AP Precalculus is the clearest available case study. It is a traditional AP rather than a Career Kickstart course, and it maps onto a college course type, precalculus, that already exists everywhere, so it started with a friendlier comparison point than either Career Kickstart course has. Even so, it gives a checkable answer to how long new-course credit policy takes to build.'),
  H.p(H.stat('nearly 1,000 colleges now list a published credit or placement policy for AP Precalculus, and about 81 percent of the colleges that do accept a score of 3', SRC.precalc)),
  H.sourceNote(SRC.precalc.source, SRC.precalc.url, SRC.precalc.asOf),
  H.p('Read that timing carefully rather than just the count. AP Precalculus needed roughly two full years of real exam administrations and real score data before a policy landscape of that size existed, and it started from a friendlier position than AP Networking does. AP Networking is a Career Kickstart course built around career connected skills rather than a direct stand-in for an existing college class, so there is no well worn college course template for a registrar to reach for while waiting on scores, the same structural gap our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-college-credit-brand-new-ap">AP Cybersecurity credit post</a> describes for that course. Stack that structural gap on top of a national exam that does not even happen until May 2028, a full year behind Cybersecurity\'s own May 2027 first exam, and a reasoned expectation is that AP Networking\'s credit landscape takes at least as long as AP Precalculus\'s did to reach a similar scale, plausibly longer, and does not meaningfully begin forming until well after the 2028 scores are in. That is a calibrated expectation based on the closest available precedent, not a promise, and it is the honest calculation this post is trying to hand you instead of a comforting guess.'),

  H.h2(SECTIONS[2]),
  H.p('None of this means College Board has said nothing about credit. It has, and the specific language is worth reading closely rather than skimming, because it tells you what is actually being promised versus what is being described as a future possibility.'),
  H.p('The AP Networking Credential page states that students with a qualifying score on the AP Networking Exam ', H.stat('could earn up to 3 credits', SRC.cbCredential), ' toward a relevant community college degree, four year degree, or certificate program. That is an opportunity, not a guarantee, the same careful distinction that applies to every AP exam, new or established. College Board sets the exam and reports the score. Each college decides, on its own timeline, whether that score satisfies anything on its campus.'),
  H.p('More specific, and genuinely honest about where things stand today, is what the same page says about the pilot period itself: credit policies may be limited for the AP Networking pilot, while College Board\'s own teams work to establish credit policies at institutions across the country ahead of the 2027-28 national launch.'),
  H.sourceNote(SRC.cbCredential.source, SRC.cbCredential.url, SRC.cbCredential.asOf),
  H.p('That sentence is doing real work. It is College Board telling you plainly, in its own published material, that the credit landscape you might be hoping to find does not exist yet even for pilot students, and that building it is explicitly future tense work rather than a finished catalog you have not found. Treat that as the honest starting point it is.'),
  H.p('What is more concrete right now is the credential layered alongside the score, the same structure AP Cybersecurity uses. The AP Networking Credential is aligned with existing, employer recognized certifications: CompTIA Network+, Cisco Certified Networking Associate, and Cisco Certified Support Technician for Networking, and a qualifying pilot score also comes with ', H.stat('a free CompTIA testing voucher worth up to $350', SRC.cbCredential), ' toward the related certification exam.'),
  H.p('If you want the real, domain by domain detail on how much of AP Networking\'s own four units actually prepare a student for that Network Plus exam rather than just gesturing at the alignment, our <a href="/blogs/ap-networking/ap-networking-comptia-network-plus">CompTIA Network Plus comparison</a> covers that ground directly and this post will not repeat it.'),
  H.box('warn', 'What not to assume from any of this', '<p>None of the language above is College Board promising that any particular college, or colleges broadly, will grant credit for AP Networking once national scores exist. It is College Board describing an opportunity and a credential, and explicitly saying the credit side of that is still being built. Do not read "up to 3 credits" as a number your target college has already committed to. Read it as the ceiling College Board is designing toward, not a floor any specific school has agreed to.</p>'),

  H.h2(SECTIONS[3]),
  H.p('None of the uncertainty above means there is nothing productive to do right now. There is, and it splits into a few concrete pieces.'),
  H.p('First, do not build a college schedule or an application strategy around a specific AP Networking credit policy existing by the time you apply, especially if you are applying anywhere near the 2027-28 or 2028-29 admissions cycles. For most students taking or considering the course today, a checkable, specific credit policy will not exist yet at the point applications are due, in the same way established policy already exists for AP CSA or AP CSP. Plan your intended major\'s course sequence as though this score is not yet a known quantity to any registrar, and treat credit that does eventually appear as a bonus rather than something you counted on.'),
  H.p('Second, actually track the tool rather than assuming it stays empty. College Board runs the same AP Credit Policy Search tool used for every AP exam, searchable by institution and by course, and it updates as colleges publish new policies rather than only once a year.'),
  H.sourceNote(SRC.cbCreditSearch.source, SRC.cbCreditSearch.url, SRC.cbCreditSearch.asOf),
  H.ul([
    'Checking it cold today for AP Networking will most likely turn up nothing at all. Checking it again after the May 2028 national scores land, and periodically after that as you get closer to enrollment, is the actual correct way to watch this develop.',
    'If a target college eventually lists an AP Networking policy, read carefully whether it grants credit, placement, or both, since those words get used loosely and mean different things for a transcript.',
    'If you are applying before any policy exists at your target schools, contact the admissions office or the relevant department directly and ask how they currently plan to handle a qualifying AP Networking score, rather than assuming silence means no.',
    'Do not confuse the absence of a published credit policy with the course itself being low value. Whether this course teaches something real and whether a specific college has decided to grant credit for it yet are genuinely separate questions, and this post is only answering the second one.',
  ]),
  H.p('Third, remember that the CompTIA and Cisco credential alignment is not a placeholder for credit, it is a separate, present tense thing with its own value. A student who finishes AP Networking with a qualifying pilot score walks away with a credential tied to CompTIA Network+, CCNA, and CCST: Networking, plus a testing voucher toward the certification exam itself. That is legible to an employer, an internship coordinator, or a community college workforce program right now, without waiting on any university\'s AP credit committee to catch up, and it is the honest, checkable answer to whether the course is worth taking while the college credit question remains genuinely open.'),

  H.h2(SECTIONS[4]),
  H.p('None of the credit timeline changes what the course itself actually asks a student to do, which is reason through evidence to find a cause rather than guess from a symptom. Here are two questions built around Troubleshoot, the skill the exam weights most heavily.'),
  H.mcq({
    n: 1,
    stem: 'A new employee\'s laptop connects to the office wifi, receives an IP address normally, and can browse the internet, but cannot reach any other device on the same office network, including a printer two desks away. Every other employee\'s laptop on the same wifi network works normally, including reaching that same printer. What is the most likely cause?',
    options: [
      'The laptop was placed on a different VLAN than the rest of the office devices',
      'The office internet connection is unstable',
      'The wifi password was entered incorrectly',
      'The laptop needs an operating system update',
    ],
    correct: 0,
    why: 'Work through what the scenario already rules out before reaching for the answer. The laptop received an IP address and can reach the internet, which means association with the access point and address assignment both worked, so a wrong password does not fit, since that would typically prevent joining the network at all rather than allow internet access while blocking local devices. Internet access working rules out a connectivity or ISP problem. An operating system update has no obvious connection to this specific symptom pattern. What is left is a device that can reach the wider internet but is cut off from its own local network, which is exactly what happens when a device lands on the wrong VLAN: it is logically segmented away from the devices around it even while everything else about its connection looks normal.',
  }),
  H.mcq({
    n: 2,
    stem: 'Late in a school day, several students report their laptops will not connect to the campus wifi network, and each shows a self assigned address instead of a normal one. Laptops that connected earlier in the day continue working without any problem. What is the most likely explanation?',
    options: [
      'The wireless access point\'s signal range has decreased',
      'The DHCP server has run out of available addresses in its pool',
      'The DNS server has stopped resolving names',
      'The network\'s SSID broadcast has been disabled',
    ],
    correct: 1,
    why: 'A self assigned address is the specific clue that decides this one: it means a device tried to request an address from a DHCP server and never got a valid answer, so it fell back to assigning itself one. That already points away from a signal range problem, since a weak signal would show as a dropped connection or no association at all, not a device that associated successfully but got no address. A disabled SSID broadcast would stop a device from even seeing the network to join it, not produce a self assigned address after joining. A DNS failure would let a device get a normal address and then fail to resolve names, which is a different symptom entirely. What is left, combined with the timing, late in the day after many devices have already joined and held onto their leases, is a DHCP pool that has simply run out of addresses to hand out to new arrivals.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Does any college currently give credit for AP Networking?', a: 'Essentially none have published a specific policy yet. The course is still in a closed pilot in 2026-27, national launch does not happen until 2027-28, and the first national exam is not until May 2028, so no college has real, broad score data to evaluate. Check the College Board AP Credit Policy Search tool directly for the most current status at any specific school.' },
    { q: 'When will colleges start publishing AP Networking credit policies?', a: 'There is no guaranteed date, and the honest expectation is that meaningful policy will not begin appearing until after the first national scores from the May 2028 exam are available, likely taking longer to build into a broad landscape than that, based on how long a recent comparable new AP course took to reach a substantial number of published policies.' },
    { q: 'Is AP Networking further from having college credit than AP Cybersecurity?', a: 'Yes, and this is the specific gap this post exists to explain. AP Cybersecurity already launched nationally this fall with a first exam in May 2027. AP Networking is still in a closed, third and final pilot year, does not launch nationally until 2027-28, and does not have a first national exam until May 2028, a full year behind Cybersecurity on the same College Board timeline.' },
    { q: 'If there is no college credit yet, is AP Networking still worth taking?', a: 'That depends on what you want from it, and it is a genuinely separate question from the credit timeline. A qualifying score comes with a credential aligned to CompTIA Network+, Cisco CCNA, and CCST: Networking, plus a testing voucher toward the certification exam, which carries real, present value on a resume or application independent of when or whether any specific college eventually grants credit for the exam score.' },
    { q: 'What should I actually do about AP Networking college credit right now?', a: 'Do not plan a college schedule around a specific credit policy existing by the time you apply. Track the College Board AP Credit Policy Search tool periodically, especially after the first national scores land in 2028, contact admissions or department offices directly if a target school has not published anything yet, and treat the standalone CompTIA and Cisco credential as real, present value regardless of how the credit question eventually resolves.' },
  ]),

  H.cta({
    heading: 'Study the course itself while the credit picture forms',
    body: 'All four units and 22 topics, built to the College Board framework, with troubleshooting focused scenario practice so your skills are ready whichever timeline a college eventually settles on.',
    links: [
      { href: '/pages/ap-networking', text: 'Start Unit 1' },
      { href: '/pages/ap-networking-exam', text: 'Exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('College credit policy for AP Networking is expected to change substantially once real national exam data exists after May 2028; always confirm current policy with the specific college before making a scheduling decision. Last reviewed October 13, 2026.'),
]);

module.exports = { meta, body };
