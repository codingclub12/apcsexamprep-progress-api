'use strict';
// Weekly course post: AP Networking. Capstone navigation post, the first
// study-guide-style post for this course and the last of the fall AP
// Networking run. There is no existing glossary or vocabulary post to
// differentiate from the way the CSP study guide differentiates from the CSP
// vocabulary post, so this one is built as the master index itself: every
// existing AP Networking post organized by the four units plus one
// cross-cutting exam-strategy category, each entry a concrete review action
// rather than a re-explanation, linking out to the dedicated post that
// actually covers the ground. Follows the same navigation-post pattern as
// 2026-10-20-ap-csp-study-guide.js.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'How to Use This AP Networking Study Guide',
  'Unit 1, Managing My Connections: What to Do This Week',
  'Unit 2, Managing My Shared Connections: What to Do This Week',
  'Unit 3, Managing Many Connections: What to Do This Week',
  'Unit 4, Managing Our Global Connections: What to Do This Week',
  'Exam Strategy and Method: The Cross-Cutting Review',
  'Suggested Time Allocation for a Half-Year Review',
  'Frequently Asked Questions',
];

const meta = {
  title: 'The Half-Year AP Networking Study Guide',
  handle: 'ap-networking-half-year-review-guide',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking study guide',
  publishOn: '2026-11-02',
  seoTitle: 'AP Networking Study Guide: A Unit by Unit Plan',
  seoDescription: 'An AP Networking study guide organized by all four units plus exam strategy: a checklist of what to actually do in each one, linked to the posts on this blog.',
  summary: 'A navigation-style AP Networking study guide built at the halfway point of the fall run of posts on this blog. Organized by the four units, Managing My Connections, Managing My Shared Connections, Managing Many Connections, and Managing Our Global Connections, plus a fifth cross-cutting section on exam strategy and method. For each section, a checklist of concrete review actions, linked to the specific dedicated posts already on this blog rather than re-explaining any of their content, plus a suggested time allocation and answers to the questions students ask most about using this guide.',
  tags: ['AP Networking', 'Study Guide', 'Study Plan', 'Exam Prep', 'Review Checklist', 'Course Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('An AP Networking study guide is only useful if it tells you what to actually do, not what the course already covers somewhere else. This is a unit by unit plan built from every post this blog has published on this course so far: four unit checklists plus one cross-cutting section on exam strategy and method, each item pointing at the specific dedicated post built to cover that exact ground, with a suggested time split so your review time roughly matches what each part of the course actually demands.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 14,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('This is the first AP networking study guide this blog has published, and it lands at roughly the halfway point of a full season of weekly posts about this course. There is no existing glossary or vocabulary post to point you toward instead, the way our AP CSP study guide points a CSP student toward a separate forty-term reference. For AP Networking, this guide is the reference: a single page that organizes everything already written, by unit and by review action, so a student working through the course does not have to remember which of thirty-some posts covered which topic.'),
  H.p('This is a planning tool, not a textbook chapter. Every fact this course tests already has a home somewhere on this blog: a full troubleshooting method, a ping and traceroute walkthrough, a subnetting guide, a VLAN explainer, a fault log system, and ten worked scenario questions apiece for Unit 1 and Unit 3, among many others. Re-explaining any of that here would just be a worse copy of a page that already exists. What was missing from a pile of separate posts was the plan that ties them together, so this guide is that plan: four unit sections plus one method section, each one a short checklist of what to re-do, re-trace, or re-check, with a direct link to the post that covers it in full.'),
  H.p('Work through the sections in whatever order matches your own gaps, not necessarily top to bottom. If your class has already covered Units 1 and 2 and is deep into Unit 3, start there instead of re-reading Unit 1 material you already know cold. If you are further out from the exam and building a longer plan, the time allocation section below gives you a reasonable default order.'),
  H.box('key', 'The two posts this guide leans on constantly', '<p>Two posts on this blog get referenced across almost every checklist below rather than being tied to a single unit. Our <a href="/blogs/ap-networking/ap-networking-four-units-topics">AP Networking units map</a> is where you go to see the full topic list inside a unit before you start reviewing it, so you know what a checklist item is actually standing in for. Our <a href="/blogs/ap-networking/ap-networking-four-skills-explained">four skills guide</a> is where you go to understand Connect and Configure, Secure, Troubleshoot, and Collaborate, the four skills every scenario question is actually built to test, regardless of which unit the scenario\'s content comes from. Keep both open in a tab while you work through the checklists.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Unit 1 stays at the level of a single device on a single network: what an IP address is, how a device gets one, what makes it reachable, and how a typed name gets turned into the address the network actually needs. It is the shortest unit, and it is also the one students most often skim, which is a mistake, since every later unit assumes this vocabulary without stopping to redefine it.'),
  H.ul([
    'Re-read the <a href="/blogs/ap-networking/ap-networking-ip-address-explained">what an IP address actually is post</a> once with the reference sheet closed, then explain out loud what makes an address reachable versus merely assigned. This is the single starting point every later unit assumes you already have.',
    'Re-trace the DHCP request and reply exchange from memory using the <a href="/blogs/ap-networking/ap-networking-dhcp-address-assignment">DHCP post</a>, then check your trace against the post\'s worked example. A device holding a self-assigned address instead of one from the router is the single most common Unit 1 symptom, and it should be instantly recognizable by the time you finish this checklist item.',
    'Work through 3 subnetting problems from the <a href="/blogs/ap-networking/ap-networking-subnetting-without-tears">subnetting without tears post</a> on paper, without looking at the worked examples first, then grade yourself against them. Subnetting is arithmetic wearing a networking costume, so the only real practice is doing the arithmetic yourself.',
    'Re-read the <a href="/blogs/ap-networking/ap-networking-mac-address-arp">MAC address and ARP post</a> and name, in one sentence, the difference between what an IP address identifies and what a MAC address identifies. Mixing the two up is the most common vocabulary error at this layer.',
    'Re-derive why a shared wifi connection behaves differently from a wired one using the <a href="/blogs/ap-networking/ap-networking-wifi-channels-interference">wifi channels post</a>, then explain a real slow-wifi symptom you have actually experienced using the vocabulary from that post instead of the vague word "spotty."',
    'Re-read the <a href="/blogs/ap-networking/ap-networking-dns-explained">DNS explained post</a> and rebuild its central pattern from memory: a numeric address working while a name does not is the tell that isolates DNS as the cause, separate from a broader network failure.',
    'Work all 10 single-device scenarios in the <a href="/blogs/ap-networking/ap-networking-unit-1-single-device-questions">Unit 1 practice set</a> under a rough time limit, then reread the walkthroughs for any you got wrong before moving on to Unit 2. This set is the closest thing to a calibrated Unit 1 practice test that currently exists for this course.',
  ]),
  H.box('tip', 'The fastest Unit 1 self-check', '<p>Close every tab and try to explain, out loud, how a laptop goes from having no address at all to successfully loading a website: DHCP assigns the address, ARP finds the local hardware to talk to, DNS turns the typed name into a numeric address, and the request goes out from there. If any link in that chain feels shaky, that is exactly which linked post above to revisit first.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Unit 2 takes the same troubleshoot, connect, secure pattern from Unit 1 and applies it to a shared network instead of a single device: a home or small office with several devices, addressing that has to be documented rather than assumed, and security needs that get identified before they get applied. This blog currently has one dedicated deep dive for this unit specifically, so this checklist leans harder on that post, plus the hands-on home lab exercises, than the other sections do.'),
  H.ul([
    'Read, or re-read, the <a href="/blogs/ap-networking/ap-networking-router-switch-access-point">router versus switch versus access point post</a> and then walk around your own home or a photo of your own setup and correctly name each box\'s actual job. Confusing what a router does with what a switch does is the single most common Unit 2 vocabulary mix-up.',
    'Open your own router\'s admin page, the way the <a href="/blogs/ap-networking/ap-networking-home-lab-from-what-you-own">home lab post</a> walks through, and document every device currently connected to it by name and address. This is the Unit 2 "document the network" topic, done for real rather than read about.',
    'Using the same home lab post, test whether your router has a guest network option and note what it isolates a guest device from. This previews the segmentation reasoning Unit 3 builds on, using nothing more than equipment you already own.',
    'Re-read the Unit 2 row of the <a href="/blogs/ap-networking/ap-networking-four-units-topics">units map</a> and write one sentence for each of its six topics, in your own words, without opening any other post. Any sentence you cannot write cleanly is the gap to close first.',
  ]),
  H.box('warn', 'An honest note on this unit\'s coverage', '<p>Unit 2 currently has the thinnest dedicated content on this blog relative to the other three units. Do not read the short checklist above as a signal that this unit matters less on the exam, since College Board has not published a per-unit weighting at all, a point the <a href="/blogs/ap-networking/ap-networking-four-units-topics">units map</a> covers directly. It means the router and switch post and the home lab exercises have to do more of the work here, so give both a genuinely careful pass rather than skimming them because this list is short.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Unit 3 is the densest unit in the course and the first one that assumes fluency with everything Units 1 and 2 already covered while adding real complexity on top: a segmented local network, switching between segments, and the harder failures that only show up once more than one segment exists. Give this unit real review time on purpose.'),
  H.ul([
    'Read, or re-read, the <a href="/blogs/ap-networking/ap-networking-vlans-one-switch-many-networks">VLANs post</a> and explain in one paragraph how one physical switch ends up carrying traffic for logically separate networks, and what has to happen for traffic to cross between them on purpose rather than by accident.',
    'Work through the <a href="/blogs/ap-networking/ap-networking-tcp-vs-udp">TCP versus UDP post</a> and name one real application that needs TCP\'s reliability and one that is better served by UDP\'s speed, explaining the tradeoff in your own words rather than just naming the two protocols.',
    'Re-work 3 Unit 3 segmented-LAN scenarios from the <a href="/blogs/ap-networking/ap-networking-unit-3-segmented-lan-questions">Unit 3 practice set</a>, choosing at least one from the harder half of the set, since it is ordered easiest to hardest on purpose and the last few questions are where multi-segment reasoning actually gets tested.',
    'Sketch a segmented network from scratch, three or four devices split across two logical segments with one path allowed to cross between them, using the box-line-and-label system from the <a href="/blogs/ap-networking/ap-networking-network-diagram-first">diagram-first post</a>, before checking your sketch against a Unit 3 practice question that describes a similar setup.',
  ]),
  H.box('key', 'Why this unit gets more review time than the others', '<p>Unit 3 is harder because it is the first unit that assumes fluency with everything Units 1 and 2 already established, not because it introduces harder ideas out of nowhere. A student who moved quickly through the first two units without building solid habits tends to meet Unit 3 as the point where the course suddenly feels difficult. Revisit Unit 1 and Unit 2 material while you work through this section if any of it still feels shaky.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Unit 4 widens the frame one more time, from a network you could plausibly build in a classroom to the wide area networks and the broader internet those local networks connect to: diagnosing failure at scale, the address space itself, and how data actually finds its way across the internet.'),
  H.ul([
    'Read, or re-read, the <a href="/blogs/ap-networking/ap-networking-ipv6-why-it-exists">IPv6 post</a> and explain in your own words why the older address format eventually runs out and what IPv6 actually changes about the address space to solve that.',
    'Read, or re-read, the <a href="/blogs/ap-networking/ap-networking-nat-address-shortage-workaround">NAT post</a> immediately after the IPv6 post above, and write one sentence contrasting the two: NAT as the workaround that stretched a limited address space further, IPv6 as the actual fix for the underlying shortage. Reading them back to back makes the relationship between the two click faster than reading either alone.',
    'The command line tools that belong to this unit\'s content, ipconfig, nslookup, netstat, and arp -a, plus ping and traceroute, get their own full checklist items in the exam strategy section below rather than repeated here, since they are exam-technique tools as much as they are Unit 4 content. Work through them there.',
  ]),
  H.box('tip', 'This unit rewards a second pass more than a first one', '<p>Unit 4 is where Troubleshoot returns as the center of gravity, echoing Unit 1\'s opening topic but at a scale where the cause is no longer sitting on a desk in front of you. A second pass through this unit after finishing the exam strategy section below, once ping, traceroute, and the other command line tools are fresh, will make Unit 4 scenarios land differently than a first pass alone.</p>'),

  H.h2(SECTIONS[5]),
  H.p('The four units above are what AP Networking teaches. This section is how the exam actually tests it, and it cuts across every unit rather than belonging to any one of them. Troubleshoot is the skill the course leans on hardest, and these posts are where that skill actually gets built and drilled.'),
  H.ul([
    'Re-read the <a href="/blogs/ap-networking/ap-networking-troubleshooting-method">troubleshooting method post</a> and restate its core method in one sentence without looking: use what still works to eliminate causes, rather than guessing from the symptom alone. Everything else in this section builds on that one sentence.',
    'Run <code>ping</code> and, if your operating system allows scratch work, <code>traceroute</code> against a real address you are curious about, following the <a href="/blogs/ap-networking/ap-networking-ping-traceroute-tools">ping and traceroute post</a>, and practice reading the output the way the post\'s worked scenario does, rather than just confirming the commands run.',
    'Read the <a href="/blogs/ap-networking/ap-networking-command-line-tools-reference">command line tools reference</a> and run <code>ipconfig</code> or <code>ifconfig</code> on your own device at least once, since it is the fastest single check to reach for before assuming anything else is broken.',
    'Read the <a href="/blogs/ap-networking/ap-networking-network-diagram-first">diagram-first post</a> and sketch one real or invented multi-device problem, labeling every connection working, broken, or not tested, before moving on to the next item on this list.',
    'Read the <a href="/blogs/ap-networking/ap-networking-scenario-question-anatomy">scenario anatomy post</a> and, on your next five practice questions from any source, cover the answer choices and state in one sentence what the question is actually asking before reading a single option.',
    'Read the <a href="/blogs/ap-networking/ap-networking-alarming-vs-mundane-answer">alarming versus mundane answer post</a> and, for your next several missed practice questions, check whether you picked an option because it matched the mood of the symptom rather than a specific piece of evidence in the scenario.',
    'Start a fault log using the format from the <a href="/blogs/ap-networking/ap-networking-fault-log-revision-guide">fault log post</a> today if you have not already, logging the next real or practice fault you work through the same day you solve it, not during review week.',
    'Read the <a href="/blogs/ap-networking/ap-networking-practicing-without-released-questions">practicing without released questions post</a> if you have not already, since it explains exactly what practice material actually exists for this pilot-year course and how to build a personal question bank once you have worked through what is already here.',
  ]),
  H.box('warn', 'A reading mistake is a different mistake than a reasoning mistake', '<p>A student who understands the networking content correctly can still lose the point by answering a different question than the one actually asked, which is a separate failure mode from misjudging the evidence. Practicing the elimination method fixes the second kind of mistake. The scenario anatomy post above is what fixes the first, and it deserves its own dedicated practice time rather than getting folded into general troubleshooting review.</p>'),

  H.h2(SECTIONS[6]),
  H.p('AP Networking has not published a per-unit exam weighting, a point the <a href="/blogs/ap-networking/ap-networking-four-units-topics">units map</a> covers directly, so this allocation is reasoned from unit density and content depth rather than a published percentage. Treat it as a sensible default, not a fixed rule, and adjust it toward whichever units your own practice is actually weakest in.'),
  H.table(
    ['Section', 'Suggested share of review time', 'Why'],
    [
      ['Unit 1, Managing My Connections', 'About 15 percent', 'Short and foundational. Fast to review, but every later unit assumes this vocabulary, so do not skip it entirely.'],
      ['Unit 2, Managing My Shared Connections', 'About 15 percent', 'Thinner dedicated coverage on this blog, but genuinely load bearing content, so give the one deep dive and the home lab exercises real attention rather than a quick skim.'],
      ['Unit 3, Managing Many Connections', 'About 25 percent', 'The densest unit and the first one that assumes fluency with everything before it. Worth the largest single share of a review pass.'],
      ['Unit 4, Managing Our Global Connections', 'About 20 percent', 'Wide in scope, and it pairs directly with the command line tools and diagnostic method covered in the exam strategy section, so review it alongside that section rather than in isolation.'],
      ['Exam strategy and method', 'About 25 percent', 'Cuts across every unit, since a reading mistake or a missed elimination step loses points regardless of which unit the content came from. Worth as much dedicated time as the densest single content unit.'],
    ]
  ),
  H.p('If you are further out from the exam and pacing a longer plan, work the four units roughly in order first, since each one genuinely builds on the vocabulary the one before it established, then layer the exam strategy section in throughout rather than saving it for the very end. A fault log started in October is worth far more by exam time than one started the week before, and the same is true of the elimination method and the diagram habit: they are meant to be practiced alongside content review, not bolted on afterward.'),
  H.p('If you are in your final week instead, reverse that order. Spend it almost entirely inside the exam strategy section, since a reading mistake or a missed elimination step can cost a point on a question whose content you actually understand, and that is the kind of loss a final week of practice can still fix. Content gaps that deep into a review timeline are better handled by triaging with the <a href="/blogs/ap-networking/ap-networking-four-units-topics">units map</a> and hitting only the specific weak topic than by re-reading a full unit of posts start to finish.'),

  H.h2(SECTIONS[7]),
  H.faq([
    { q: 'Is there a vocabulary or glossary post for AP Networking like there is for other courses on this blog?', a: 'Not yet. This is the first study-guide-style post for this course, and it is built to double as the master index in the meantime: every existing post organized by unit and by review action. If a dedicated vocabulary post publishes later, this guide will point to it directly.' },
    { q: 'Do I need to work through every linked post before I can use this study guide?', a: 'No. This guide is meant to be worked through section by section over time, not read cover to cover in one sitting. Use the checklist for whichever unit or section you are reviewing that day, click into only the specific posts that checklist points to, and move on once you can complete its checklist without hesitating.' },
    { q: 'Which unit should I review first if I am short on time?', a: 'Unit 3, Managing Many Connections, since it is the densest unit and the first one that assumes fluency with everything before it, followed by the exam strategy section, since a reading or elimination mistake can cost points regardless of which unit the content came from. Save Unit 2 for last only if your class has not reached it yet.' },
    { q: 'Why does the exam strategy section get as much suggested time as the biggest content unit?', a: 'Because it is not optional technique layered on top of content knowledge, it is a separate skill the exam tests directly. A student who understands the networking content perfectly can still lose points to a reading mistake, an unlabeled assumption, or picking a dramatic-sounding wrong answer over a mundane, evidence-supported one, all of which the posts in that section are built to fix.' },
    { q: 'There is no released AP Networking practice test. How do I know if this review is actually working?', a: 'Work the Unit 1 and Unit 3 practice sets linked above under a rough time limit and see whether you can complete their walkthroughs without needing to reread them, and keep a fault log of any real practice scenarios you work through elsewhere. The <a href="/blogs/ap-networking/ap-networking-practicing-without-released-questions">practicing without released questions post</a> explains exactly why no official practice test exists yet for this pilot-year course and lays out the fuller strategy for building your own calibrated practice.' },
  ]),

  H.cta({
    heading: 'Turn this plan into finished review',
    body: 'This guide tells you what to do and where. The full AP Networking course guide and exam format page are where the actual unit-by-unit content lives.',
    links: [
      { href: '/pages/ap-networking', text: 'Start the course guide' },
      { href: '/pages/ap-networking-exam', text: 'See the exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects AP Networking\'s four units and the AP Networking blog library as published on this site as of publication. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
