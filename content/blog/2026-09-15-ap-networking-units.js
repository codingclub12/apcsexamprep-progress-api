'use strict';
// Weekly course post: AP Networking. Deliberately NOT the pilot-year logistics
// piece (2026-08-18-ap-networking-pilot-year.js covers that) and NOT the four
// assessed skills piece (2026-08-25-ap-networking-four-skills.js covers that).
// This post's job is narrower and more concrete than either: a unit-by-unit,
// topic-by-topic map of what is actually TAUGHT across the four units, so a
// student or a teacher can see the syllabus shape at a glance. Skills are how
// the course is tested; this page is what the course contains. Topic titles
// and counts per unit (4, 6, 6, 6) are drawn from College Board's published
// AP Networking course framework and About page, verified against the site's
// own /pages/ap-networking course guide, current as of August 2026. No exam
// weighting percentages are published per unit, and this post says so rather
// than inventing any.
const H = require('../../lib/blog-house');

const SRC = {
  about: { source: 'College Board, About AP Networking', url: 'https://apcentral.collegeboard.org/courses/ap-networking/about', asOf: 'August 2026' },
  framework: { source: 'College Board, AP Networking Course Framework', url: 'https://apcentral.collegeboard.org/media/pdf/ap-networking-course-framework.pdf', asOf: 'August 2026' },
};

const SECTIONS = [
  'Why Map AP Networking Units One by One',
  'The Four Units and 22 Topics at a Glance',
  'Unit 1: Managing My Connections',
  'Unit 2: Managing My Shared Connections',
  'Unit 3: Managing Many Connections',
  'Unit 4: Managing Our Global Connections',
];

const meta = {
  title: 'AP Networking Units: A Map of All Four Units and 22 Topics',
  handle: 'ap-networking-four-units-topics',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking units',
  publishOn: '2026-09-14',
  seoTitle: 'AP Networking Units: Every Unit and Topic',
  seoDescription: 'A unit-by-unit, topic-by-topic map of what AP Networking actually teaches: all four units, all 22 topics, and the skill each unit leans on most.',
  summary: 'AP Networking is four units and 22 topics, per the College Board framework, but "four units" alone does not tell a student or a teacher much. This is a syllabus-shaped map: what each unit actually covers topic by topic, a table pairing each unit with the skill it leans on hardest, and an honest note on what College Board has and has not published about how much each unit is worth on the exam.',
  tags: ['AP Networking', 'Course Guide', 'Curriculum Map', 'Career Kickstart', 'Study Planning'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP Networking is four units and, per the College Board framework, 22 topics, but "four units" does not actually tell you much on its own. Here is what the AP Networking units cover, unit by unit and topic by topic, so a student or a teacher can see the syllabus shape before the first day of class rather than after the first quiz.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('We have already covered two different questions about this course. Our <a href="/blogs/ap-networking/ap-networking-2026-27-pilot-year-guide">pilot year guide</a> covers what the 2026-27 pilot means for participating schools right now, and our <a href="/blogs/ap-networking/ap-networking-four-skills-explained">four skills piece</a> covers Connect and Configure, Secure, Troubleshoot, and Collaborate, which is how the exam grades whatever a student does. Neither one answers a simpler, more practical question a new student or a teacher planning a syllabus actually asks first: what is actually in this course, unit by unit and topic by topic. That is the only job this page has.'),
  H.p('Skills are the verb. Content is the noun. A Troubleshoot question can be built out of Unit 1 material or Unit 4 material, and knowing that does not tell you what Unit 1 or Unit 4 actually contain. This page stays entirely on the content side: the four units, their topics, and what a student is actually doing inside each one, so the shape of a full course year is visible before you are three weeks into it.'),

  H.h2(SECTIONS[0]),
  H.p('It is easy to find a sentence online that says AP Networking has four units. It is much harder to find what those four units actually ask a student to do day to day, because most coverage of this course, understandably, spends its attention on the pilot timeline or the skills grid instead. Both of those are real and worth knowing, but neither one helps a student sit down in August and know roughly what October, January, and April will each look like.'),
  H.p('That gap is what this page closes. The four units build in a specific order, and the order is the whole point: one device, then a shared network, then a segmented network with many devices, then the wide world those networks connect to. A student who only knows the unit titles is missing the fact that each unit is genuinely built on the vocabulary the one before it established, which matters far more for planning study time than knowing which skill a given question happens to test.'),
  H.box('key', 'What this map is and is not', '<p>This is a content map, not a study guide and not a skills breakdown. It answers "what will I actually learn in each unit," not "how will I be tested on it" and not "how do I study for it." Those are worthwhile questions too, and we have written about both elsewhere, linked throughout this page.</p>'),

  H.h2(SECTIONS[1]),
  H.p('AP Networking is organized into four units containing ', H.stat('22 topics total', {
    source: SRC.framework.source, url: SRC.framework.url, asOf: SRC.framework.asOf,
  }), ' across the course, split 4, 6, 6, and 6 by unit. The table below pairs each unit with its core topics and the skill or skills it leans on hardest, based on what the topics inside each unit actually ask a student to do.'),
  H.table(
    ['Unit', 'Core topics', 'Skill(s) it leans on most'],
    [
      ['Unit 1: Managing My Connections', 'Troubleshooting a slow device, connecting and optimizing it, identifying its security needs, securing it', 'Troubleshoot and Connect and Configure, with Secure introduced early'],
      ['Unit 2: Managing My Shared Connections', 'Troubleshooting a home or small office network, documenting it, upgrading it, advanced network features, identifying and applying network security', 'Connect and Configure and Secure, close to evenly split'],
      ['Unit 3: Managing Many Connections', 'Planning and building a segmented LAN, switching and topologies, verifying access, segmentation security, firewalls and filtering, diagnosing a multi-segment network', 'Connect and Configure, with Secure and Troubleshoot close behind'],
      ['Unit 4: Managing Our Global Connections', 'Diagnosing network failure, protocol and OSI/TCP-IP models, command line tools, routing across the internet, monitoring a large network, designing for reliability', 'Troubleshoot, with Collaborate threaded through the monitoring and documentation work'],
    ]
  ),
  H.sourceNote(SRC.about.source, SRC.about.url, SRC.about.asOf),
  H.p('Notice what the table does not claim: an exact percentage of the exam that each unit is worth. That is deliberate, and the section below explains exactly what College Board has and has not said about it. Notice too that Collaborate does not get its own dedicated topic anywhere in the four units. That is not an oversight on our part, it is a real feature of how the course is built: Collaborate is not a block of content you sit through, it is a habit the other topics are meant to install as you go, which is exactly why our four skills piece treats it as a skill layered across the whole course rather than content that lives in any one unit.'),

  H.h2(SECTIONS[2]),
  H.p('Unit 1 is the shortest unit and the only one built around a single device rather than a network of them. Its four topics move in a deliberate order: troubleshooting a slow device first, then connecting and optimizing that same device, then identifying what it actually needs to be secured against, then securing it. The unit\'s own scenario is almost aggressively ordinary on purpose, a device that will not stream video or run an application smoothly, because the reasoning pattern matters more here than the vocabulary does.'),
  H.p('The reason this unit is worth taking seriously despite its short length is vocabulary, not difficulty. Later units assume a student can already talk about a device\'s connection, its configuration, and its security posture without stopping to define the terms. A student who treats Unit 1 as a warm-up to skim through arrives at Unit 3 missing the words that unit is written in, which is a much worse position than arriving at Unit 3 having genuinely worked through four short topics slowly.'),

  H.h2(SECTIONS[3]),
  H.p('Unit 2 takes the same troubleshoot, connect, secure pattern from Unit 1 and applies it to a shared network instead of a single device, which is the first real jump in complexity in the course. Its six topics start with troubleshooting a home or small office network, then move through documenting that network\'s addresses, upgrading it, and working with its more advanced features, before closing on identifying and then applying the network\'s security needs. Documenting a network by its addresses is a small topic on paper and a genuinely important habit in practice, since most of the diagnostic work in later units depends on knowing what is supposed to be on a network before you can tell what is wrong with it.'),
  H.p('This is also where security stops being a single closing topic, as it was in Unit 1, and becomes two full topics of its own: identifying what a shared network actually needs protected, and then applying that protection. That split matters, because it mirrors a real distinction the Secure skill tests directly, naming the specific risk before naming the fix, rather than jumping straight to a solution.'),

  H.h2(SECTIONS[4]),
  H.p('Unit 3 is the densest unit in the course, and its six topics are the most technically demanding stretch of the entire year. It moves from planning a network\'s devices and connections, to actually creating one through switching and topologies, to connecting, configuring, and verifying access on it, before turning to the security side: identifying segmentation security, and firewalls and filtering. It closes by asking a student to document, diagnose, and fix problems on a fully segmented local area network, which is the most demanding troubleshooting task the course has asked for up to this point.'),
  H.p('The word doing the real work in this unit\'s title is "many." Everything before this unit dealt with one device or one shared network; this unit is where a student has to reason about several segments of a network at once, each with its own devices, its own access rules, and its own failure modes that can interact with each other in ways a single-segment network never could. Students who moved quickly through Units 1 and 2 without building solid habits tend to meet this unit as the point where the course suddenly feels harder, when what actually happened is that the vocabulary debt from earlier units came due all at once.'),
  H.box('warn', 'Where the course actually gets hard', '<p>Unit 3 is not harder because it introduces harder ideas out of nowhere. It is harder because it is the first unit that assumes fluency with everything Units 1 and 2 already covered, while adding real complexity on top. Treat it as the unit that rewards a strong foundation rather than the unit where the course "gets real."</p>'),

  H.h2(SECTIONS[5]),
  H.p('Unit 4 widens the frame one more time, from a network you could plausibly build in a classroom to the wide area networks and the broader internet those local networks connect to. Its six topics open with what happens when networks break or fail at this larger scale, then move through protocols and the OSI and TCP/IP models that describe how data is actually organized as it travels, the command line tools a network analyst uses to look at that traffic directly, and how data actually finds its way across the internet through routing and paths. It closes with monitoring and defending a network at this scale, and designing for reliability and growth rather than just for today\'s traffic.'),
  H.p('This unit is where Troubleshoot returns as the clear center of gravity, echoing Unit 1\'s opening topic but at a scale where the causes are no longer sitting on a desk in front of the student. It is also, informally, where Collaborate is easiest to feel even though it still has no topic of its own: monitoring and defending a large network is work that gets handed off between people constantly, and the course\'s emphasis on documenting and explaining findings shows up here even without a topic labeled for it.'),

  H.h2('What College Board Has Not Published Yet'),
  H.p('It would be convenient to close this map with a percentage for each unit, the kind of number a study plan can be built around directly. That number does not currently exist in public form, and this page will not invent one. The course framework describes how the exam weights its four skills against each other, with the framework\'s own language pointing to ', H.stat('heavier weight on the three technical skills', {
    source: SRC.framework.source, url: SRC.framework.url, asOf: SRC.framework.asOf,
  }), ' (Connect and Configure, Secure, and Troubleshoot) relative to Collaborate, applied to scenarios drawn from any of the four units. What it does not publish is a unit-by-unit percentage breakdown of the exam the way some other AP courses do.'),
  H.p('That distinction is worth sitting with rather than skimming past. It means a student cannot treat Unit 3, for example, as automatically worth more study time than Unit 1 simply because it has more topics or feels denser. Topic count is not the same thing as exam weight, and since College Board has not published exam weight by unit, the honest study strategy is to treat all four units as genuinely load-bearing rather than trying to guess which ones to shortchange.'),

  H.h2('Turning the Map Into a Study Plan'),
  H.p('A syllabus-shaped map is only useful if it changes how time actually gets spent, so here is what to do with it directly. Walk the four units in order, even if a teacher\'s pacing lets you jump around, because each unit genuinely depends on the vocabulary the one before it built. Treat Unit 1\'s short topic list as a place to get fluent rather than a place to move fast, since fluency here is what makes Unit 3 legible later. Give Unit 3 real time specifically because it is dense, not because it is worth more of the exam, a distinction that only matters once you already know College Board has not published a per-unit weighting to chase instead.'),
  H.ul([
    '<strong>Build a running glossary as you go.</strong> Each unit introduces vocabulary the next one assumes. A student who can define every term from a finished unit in one plain sentence is genuinely ready for the next one.',
    '<strong>Treat the topic list as a checklist, not a reading list.</strong> For each topic, ask what you would actually have to do on a real device or network to demonstrate it, not just what you would have to recall.',
    '<strong>Revisit Unit 1 and Unit 2 material while working through Unit 3 and Unit 4.</strong> Because the later units build directly on the earlier ones, reviewing old material inside new context reinforces both at once.',
    '<strong>Pair this map with the skills grid, not instead of it.</strong> This page tells you what each unit contains. Our <a href="/blogs/ap-networking/ap-networking-four-skills-explained">four skills piece</a> tells you how a question from any of these units actually gets tested, and the two together are more useful than either alone.',
  ]),
  H.p('Our <a href="/pages/ap-networking">AP Networking course guide</a> works through all four units in this order with practice built in, and the <a href="/pages/ap-networking-exam">exam page</a> covers the format both the pilot exam and the launched exam share.'),

  H.h2('Two Scenarios That Cross Unit Lines'),
  H.p('Real exam scenarios do not announce which unit they come from, and a student who has genuinely internalized the content map above should be able to place each of these without being told. Reason through both before opening the answers.'),
  H.mcq({
    n: 1,
    stem: 'A small office has three departments on the same physical switch. Management wants each department\'s traffic kept separate from the other two, even though all three still need to reach the same internet connection through the same router. Which unit\'s content does this scenario draw on most directly?',
    options: [
      'Unit 1, Managing My Connections, because it is fundamentally a single-device problem',
      'Unit 2, Managing My Shared Connections, because it only involves one shared network',
      'Unit 3, Managing Many Connections, because it requires segmenting one physical network into separate logical groups',
      'Unit 4, Managing Our Global Connections, because it involves an internet connection',
    ],
    correct: 2,
    why: 'The task described, splitting one physical network into separate logical groups that share upstream internet access but cannot see each other, is the defining idea of Unit 3, which is built specifically around segmentation, switching and topologies, and the access rules that keep segments apart. It is not a single-device problem, which rules out Unit 1, and it goes beyond one shared, unsegmented network, which rules out Unit 2. The internet connection is present but incidental to the actual task, which rules out Unit 4 even though it mentions the wider network the office connects to.',
  }),
  H.mcq({
    n: 2,
    stem: 'A network administrator notices that traffic between two of the company\'s office locations, connected over the internet, has become unreliable, with packets sometimes taking a noticeably different path than usual to get from one office to the other. Which unit\'s content is this scenario built on?',
    options: [
      'Unit 1, Managing My Connections',
      'Unit 2, Managing My Shared Connections',
      'Unit 3, Managing Many Connections',
      'Unit 4, Managing Our Global Connections',
    ],
    correct: 3,
    why: 'Two office locations connected over the internet, with traffic taking varying paths between them, is describing routing across a wide area network, which is squarely Unit 4 territory: how data actually travels the internet, the protocols and models that describe that path, and diagnosing failure at that larger scale. Unit 1 and Unit 2 both describe a single site rather than two locations connected over the internet, and Unit 3 is about segmenting one local network rather than routing between two separate ones, so neither fits what the scenario is actually asking about.',
  }),
  H.p('Both scenarios reward the same instinct: read what the scenario is actually describing, not just which words appear in it, and place it against the unit whose content it genuinely draws from. That instinct is exactly what this map is meant to build.'),

  H.h2('Frequently Asked Questions'),
  H.faq([
    { q: 'How many units and topics does AP Networking have?', a: 'Four units containing 22 topics total, split 4, 6, 6, and 6 by unit: Managing My Connections, Managing My Shared Connections, Managing Many Connections, and Managing Our Global Connections. This is per College Board\'s published course framework as of August 2026.' },
    { q: 'What is the difference between this page and the four skills piece?', a: 'This page maps content, what each unit actually teaches, topic by topic. Our four skills piece maps assessment, how a question from any unit gets tested against Connect and Configure, Secure, Troubleshoot, and Collaborate. Content is what you learn; skills are how you get graded on it.' },
    { q: 'Which AP Networking unit is the hardest?', a: 'Unit 3, Managing Many Connections, is generally the densest and most technically demanding, since it is the first unit that assumes fluency with everything Units 1 and 2 covered while adding real complexity on top, moving from a single shared network to a fully segmented one.' },
    { q: 'Does College Board publish how much each unit is worth on the exam?', a: 'Not as a per-unit percentage, as of August 2026. The published framework describes how the exam weights its four skills against each other, with the three technical skills weighted more heavily than Collaborate, but it does not publish a unit-by-unit exam weighting.' },
    { q: 'Where should a new student start?', a: 'Unit 1, Managing My Connections, in order. It is short, but it establishes the vocabulary every later unit assumes, so treating it as a place to build fluency rather than a unit to skim pays off directly once the course reaches Unit 3.' },
  ]),

  H.cta({
    heading: 'Work through all four units in order',
    body: 'The full AP Networking course guide follows this exact unit and topic structure, with scenario practice built into every unit.',
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
  H.updatedNote('Unit titles, topic counts, and topic content reflect the College Board AP Networking course framework as researched in August 2026. Unit-level exam weighting is not published by College Board as of this writing; only skill-level weighting is described. Last reviewed September 15, 2026.'),
]);

module.exports = { meta, body };
