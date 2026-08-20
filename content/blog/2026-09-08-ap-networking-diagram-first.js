'use strict';
// Weekly course post: AP Networking. Drill piece, complementary to (not a
// repeat of) the three earlier posts on this blog. 2026-08-18 taught the
// elimination method in words. 2026-08-25 taught how to generate more
// evidence with ping and traceroute. 2026-09-01 taught how to read what a
// scenario question is actually asking. None of those three put the evidence
// on paper. This one teaches a lightweight network diagram as a way to see
// the evidence, its gaps, and its contradictions, rather than only reasoning
// about them verbally or from a written list.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The gap this post fills: seeing the evidence, not just reasoning about it',
  'How to draw a network diagram in under a minute',
  'Worked example: the diagram as evidence comes in',
  'Why a network diagram helps most on AP Networking scenarios',
  'When a diagram is worth it, and when it is not',
];

const meta = {
  title: 'Drawing the Network Diagram Before You Fix It',
  handle: 'ap-networking-network-diagram-first',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'network diagram',
  publishOn: '2026-09-08',
  seoTitle: 'Network Diagram First: A Troubleshooting Habit',
  seoDescription: 'Why sketching a quick network diagram before troubleshooting makes evidence gaps visible, with a worked example and two practice questions.',
  summary: 'The earlier posts on this blog teach how to reason about network evidence verbally and how to read a scenario question precisely. This one teaches a different, complementary habit: draw a simple network diagram before you troubleshoot, so gaps and contradictions in the evidence become visible instead of staying buried in your head or scattered across a written list.',
  tags: ['AP Networking', 'Troubleshooting', 'Study Skills', 'Course Guide', 'Diagrams'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('The earlier posts on this blog teach you how to reason about network evidence and how to read a scenario question precisely. Neither one puts the evidence down on paper. This post does, and it is worth the ten seconds it takes.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 8, 2026', updated: 'September 8, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('Three earlier posts on this blog cover how to think through a network problem. One teaches the elimination method: use what still works to rule out causes instead of guessing. Another teaches ping and traceroute, two tools that let you go generate evidence on purpose instead of waiting for a convenient comparison to fall into your lap. A third teaches how to read a scenario question closely enough to know what is actually being asked, since a technically sound answer to the wrong question still loses the point.'),
  H.p('All three of those are reasoning skills. You do them in your head, or you talk them through out loud, or you work through a written list of facts one at a time. That works, and it works especially well on a small problem with one or two devices in play. This post covers something different and genuinely complementary: putting the evidence into a simple diagram before you reason about it at all. Not because reasoning is wrong, but because a diagram catches a specific kind of mistake that verbal reasoning and written lists both tend to miss, which is a gap in your evidence that nobody noticed because nobody was ever asked to notice it.'),

  H.h2(SECTIONS[0]),
  H.p('Most people skip this step, and the reason they skip it is reasonable on its face: drawing anything feels like extra work when the problem in front of you seems simple. One laptop, one router, one symptom. Why sketch a box and a line for something you can already picture? That instinct is not wrong for the simplest problems. It becomes wrong the moment a problem involves more than two or three devices, or more than one connection between them, which is exactly the shape most real network problems and most AP Networking scenario questions actually take.'),
  H.p('Here is the specific failure a diagram catches that a written list does not. A written list of facts is a sequence. You read it top to bottom, and your attention naturally lands on the facts that are present, because those are the ones written down. A fact that is missing, a connection nobody ever actually checked, does not announce itself in a list the way it does in a picture. A list can look complete and still have a hole in it, and the hole is invisible precisely because there is no visual space where it would otherwise sit.'),
  H.p('A diagram works differently. Once you have drawn every device as a box and every connection between them as a line, an untested connection is not a missing sentence, it is a line sitting right there on the page with no label on it, next to other lines that do have labels. You do not have to remember to go looking for the gap. You see it, because it looks different from everything around it. That is the entire value of this technique in one sentence: a diagram turns a gap in your evidence from something you have to actively recall into something you cannot help but notice.'),
  H.box('key', 'What this technique is not', '<p>This is not a replacement for the elimination method or for reading the question carefully. It is what you do before either of those, so that the evidence you then reason about is complete and organized instead of half remembered. Think of it as evidence-gathering hygiene, not a new diagnostic method on its own.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The diagram this post teaches is deliberately not a formal network diagram in the sense a network engineer might use, with standardized symbols for every device class and a specific notation for every kind of link. That level of formality needs training and software neither of which you have time for in the middle of troubleshooting something, or in the margin of an exam. What follows works on paper, on a whiteboard, or in the margin of a test booklet, and it takes less than a minute to draw even for a network with four or five devices in it.'),
  H.p('There are only three things to draw, and one small labeling rule.'),
  H.ul([
    '<strong>A box for every device.</strong> A laptop, a phone, a router, a modem, a server, a switch, a printer, whatever the scenario or the problem actually names. Write the device name inside the box. That is the whole requirement for a box.',
    '<strong>A line for every connection you know about.</strong> If a laptop connects to a router over wifi, draw a line between those two boxes. If the router connects to a modem, draw a line between those two. You are not drawing cables accurately or routing paths precisely, you are drawing the fact that a connection exists between two named things.',
    '<strong>A short label on every line, and only three labels exist.</strong> Working, for a connection you have actual evidence is fine right now. Broken, for a connection you have actual evidence is failing right now. Not tested, for a connection that is part of the picture but that you have not actually checked one way or the other.',
  ]),
  H.p('That third label, not tested, is the entire point of this system, and it is the one people skip when they draw a diagram in their head instead of on paper. In your head, an unchecked connection quietly gets treated as fine, because nothing has told you otherwise and it is easy to let silence read as a good sign. On paper, an unlabeled or not-tested line looks exactly as uncertain as it actually is, sitting right next to lines you have real evidence about. Nothing about this needs special software, a specific set of shapes, or any training beyond boxes, lines, and three words.'),
  H.table(
    ['Label', 'What it means', 'What it does not mean'],
    [
      ['Working', 'You have actual evidence this specific connection is functioning right now', 'That the device on either end is fully healthy in every other respect'],
      ['Broken', 'You have actual evidence this specific connection is failing right now', 'That you already know why it is failing'],
      ['Not tested', 'This connection exists in the picture but nobody has actually checked it yet', 'That it is probably fine, or probably broken. It means neither. It means unknown.'],
    ]
  ),
  H.box('tip', 'The one habit that makes this work', '<p>Label every line the moment you draw it, even if the honest label is not tested. A line with no label at all slides right back into being invisible, which defeats the entire purpose. An explicitly not-tested line is the whole reason this beats a written list.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Here is a full example, built the way you would actually build it: a step at a time, as evidence shows up, rather than all at once after the fact.'),
  H.p('The problem as reported: a small office has a modem from the internet provider, a router the office owns, and three devices connecting to that router, a desktop computer connected by an ethernet cable, and two laptops connecting over wifi. One of the laptops cannot reach the internet. Everything else in the office seems to be working.'),
  H.p('Step one, draw what exists before you know anything about what is broken. Four boxes: Modem, Router, Desktop, Laptop A, Laptop B. That is five boxes, five devices named in the problem. Lines: Modem to Router, Router to Desktop, Router to Laptop A, Router to Laptop B. Four lines, one for every connection the setup actually has. Every line starts labeled not tested, because at this point nothing has been checked yet.'),
  H.p('Step two, add the first piece of evidence. Laptop A is the one that cannot reach the internet, so the line from Router to Laptop A gets labeled broken. That much was already known before you drew anything, so this step just puts the known symptom on the picture.'),
  H.p('Step three, check what still works, the same move the elimination method teaches, and update the diagram as each check comes back. The desktop browses fine over its ethernet cable, so Router to Desktop gets labeled working. Laptop B also browses fine over the same wifi network Laptop A is failing on, so Router to Laptop B gets labeled working too.'),
  H.p('Step four, look at what the diagram shows once those three checks are labeled. Two connections through the router, one wired and one wireless, are both working. One wireless connection, the one going specifically to Laptop A, is broken. That already does real elimination work: the router itself is passing traffic fine, since two other devices are proof of that, and the general wifi signal is fine too, since Laptop B is on the same wireless network and working. Whatever is wrong is specific to Laptop A.'),
  H.p('Now look at the one line nobody has touched. Modem to Router is still labeled not tested. Nobody in this scenario ever actually checked whether the router\'s own connection to the internet provider\'s modem is solid, because the symptom, one laptop failing while everything else works, never pointed attention there. A written list of the same facts would very likely never mention that connection either, for the exact same reason: nothing prompted anyone to write a line about it. On the diagram, though, it sits there as a line with no working or broken label on it, right next to three lines that do have labels, and it is visually obvious that it is the one piece of the picture nobody has actually confirmed.'),
  H.p('In this particular case that gap turns out not to matter much, since the pattern already points hard at something specific to Laptop A rather than to the modem link. But that is exactly the point worth sitting with: you only know it does not matter because the diagram made you look at it and rule it out on purpose, rather than never noticing it was unchecked in the first place. On a different version of this same problem, where two devices were failing instead of one, that unlabeled Modem to Router line would be exactly where the real answer was hiding, and a verbal walkthrough or a written list would have been just as likely to skip right past it.'),
  H.box('warn', 'The mistake this catches', '<p>Treating an unchecked connection as if it were confirmed working, simply because nothing has flagged it as a problem. Silence is not evidence. A not-tested label keeps that distinction visible instead of letting it quietly collapse into an assumption.</p>'),

  H.h2(SECTIONS[3]),
  H.p('<a href="/pages/ap-networking">AP Networking</a> scenario questions routinely describe three, four, or five devices and several connections between them in a single paragraph of prose, exactly the shape where a diagram earns its keep. A scenario might mention a laptop, a home router, an internet provider, and a company\'s internal server, plus what does and does not work for each, all inside one dense paragraph you are expected to reason about precisely. Holding all of that correctly in your head, remembering which facts are actually established and which ones you only assumed because the paragraph never said otherwise, is a real source of lost points that has nothing to do with understanding networking at all.'),
  H.p('This is where a fast, informal sketch pays off during an actual test, not just during study. If scratch work is allowed in the exam format you are using, a fifteen-second version of the system above, boxes for the devices the scenario names, lines for the connections it describes, and a quick working, broken, or not-tested label based only on what the paragraph actually states, keeps the established facts and the open questions visibly separate while you work through the options. That separation is precisely what the earlier post on reading scenario questions carefully depends on: you cannot correctly judge whether an answer choice is supported by the evidence if you have lost track of which parts of the scenario were evidence and which parts you quietly filled in yourself while reading.'),
  H.p('The failure mode a margin diagram prevents is specific and common: treating a connection the scenario never actually addressed as if the scenario had confirmed it, simply because everything else in the paragraph sounded fine. That is the exact same silent assumption the worked example above walked through, just moved from a real office into an exam scenario. A quick sketch keeps that unaddressed piece visually separate from the confirmed pieces, the same way it did on paper in the worked example, so it cannot quietly slide into being treated as settled.'),
  H.box('key', 'The transfer, stated plainly', '<p>A written scenario hides gaps the same way a written list does, inside sentences you have already read and moved past. A quick diagram, even a rough one scratched in a margin, keeps established facts and open questions visually separate instead of blurred together in memory.</p>'),

  H.h2(SECTIONS[4]),
  H.p('This is not a habit worth reaching for every single time. A genuinely simple problem, one device, one connection, one symptom, rarely benefits from a diagram, since there is nothing for a picture to organize that a single sentence does not already cover. Drawing a box and a line for a problem that small is the extra-work feeling described earlier, and in that case the feeling is correctly telling you to skip it.'),
  H.p('The signal worth watching for is device count and connection count, not how serious the problem feels. A dramatic-sounding failure on one laptop with one connection to one router is still a one-line problem. A mild-sounding slowdown that touches a modem, a router, and three separate devices is a diagram problem the moment you start listing it out, regardless of how minor it initially sounds. Once a description needs more than two or three connections held in mind at once to reason about accurately, sketching them takes less time than the confusion it prevents.'),
  H.p('The other moment worth reaching for a diagram, beyond device count, is any time you catch yourself saying or thinking a version of "everything else seems fine." That phrase is doing a lot of quiet work, and it is worth checking honestly whether everything else was actually tested or just assumed. Drawing the picture and labeling every line forces that honesty, because a not-tested label cannot hide the way an unspoken assumption can.'),

  H.h2('Two questions in the exam style'),
  H.p('Sketch each scenario before opening either answer, boxes for the devices, lines for the connections, working, broken, or not tested for each. The evidence given is enough to answer both, and the diagram is there to keep it organized while you do.'),
  H.mcq({
    n: 1,
    stem: 'A small office has a modem, a router, and four devices connected to the router: two desktops over ethernet and two laptops over wifi. Both desktops and one of the laptops can reach the internet normally. The remaining laptop shows as connected to the wifi network but cannot load any websites. No one has checked whether the modem itself has an active connection to the internet provider. Based on the evidence given, what is the most likely cause?',
    options: [
      'The modem has lost its connection to the internet provider',
      'The router is failing to pass traffic to any connected device',
      'Something specific to the one laptop that cannot connect is the cause',
      'The office\'s wifi network as a whole has stopped functioning correctly',
    ],
    correct: 2,
    why: 'Draw it out and three of the four connections through the router are labeled working: both desktops over ethernet, and the other laptop over the same wifi network the failing laptop is on. That single working laptop on wifi already rules out the router failing to pass traffic and rules out the wifi network as a whole being down, since either of those would affect every device using that path, not just one. It also weakens the modem as the likely cause, since a dead modem link would cut off every device behind the router, not one specific laptop. The one line in this picture still labeled not tested, the modem to the internet provider, is worth noticing precisely because it has not been ruled out formally, but nothing in the evidence points there, and everything in the evidence points at the one laptop that is behaving differently from every other device on the same router. That is what survives elimination.',
  }),
  H.mcq({
    n: 2,
    stem: 'A remote employee reports that their laptop can browse the general internet fine over their home wifi, but cannot reach their company\'s internal project server, which worked yesterday from the same laptop and network. The employee has not changed any settings. It has not been checked whether the employee\'s VPN client is currently connected. A coworker on the company\'s own office network reaches the same internal server without any issue. What should be checked first?',
    options: [
      'Whether the employee\'s home router needs to be restarted',
      'Whether the employee\'s VPN connection to the company network is currently active',
      'Whether the company\'s internal server itself is online',
      'Whether the employee\'s internet service provider is having an outage',
    ],
    correct: 1,
    why: 'Sketching this out, the connections labeled working are the laptop to the home wifi, since general browsing works, and the internal server\'s connection to the office network, since a coworker reaches it fine from there. Those two working connections rule out the home router and the internet service as the cause, since general browsing already proves both are functioning, and they rule out the server being offline entirely, since the coworker reaches it right now. What is left unlabeled in the picture is the one connection nobody has checked: the secure path this specific remote laptop is supposed to use to reach an internal company resource from outside the office, typically a VPN. That unchecked line is exactly what the evidence points at once every other connection in the picture is accounted for, and checking it is the smallest, most direct next step rather than restarting equipment that the evidence already shows is working.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Do I need special software to draw a network diagram for troubleshooting?', a: 'No. This technique is intentionally informal: boxes for devices, lines for connections, and a working, broken, or not-tested label on each line. Paper, a whiteboard, or the margin of a test booklet works fine. Formal network diagramming software and standardized symbols are a different, more precise tool for a different job.' },
    { q: 'How is this different from the elimination method covered in the earlier post on this blog?', a: 'The elimination method is how you reason about evidence once you have it. This is how you organize that evidence before or while you reason about it, so a gap in what you actually know does not get silently treated as settled. The two work together rather than replacing each other.' },
    { q: 'What does the not-tested label actually accomplish?', a: 'It keeps a connection nobody has checked visually distinct from one you have real evidence about, instead of letting it default to looking fine simply because nothing has flagged it as broken. A written list tends to bury that distinction, since an unchecked fact does not naturally announce itself the way an unlabeled line on a diagram does.' },
    { q: 'Is this worth doing on every troubleshooting problem?', a: 'No. A problem with one device and one connection rarely needs a diagram, since there is nothing for a picture to organize that a single sentence does not already cover. It earns its keep once a problem involves more than two or three devices or connections, which is also the shape most AP Networking scenario questions take.' },
    { q: 'Can I actually use this during the AP Networking exam?', a: 'If the exam format you are taking allows scratch work, yes. A fast margin sketch, boxes for the devices a scenario names and lines labeled from only what the scenario actually states, helps keep established facts and open questions separate while you evaluate the answer choices, which is exactly what careful scenario reading depends on.' },
  ]),

  H.cta({
    heading: 'Build the Troubleshoot skill for the exam',
    body: 'AP Networking weights its exam around four skills, and Troubleshoot is the one the whole course is built to teach. Work through it unit by unit.',
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
  H.updatedNote('Reviewed against the AP Networking course framework current in September 2026. Last reviewed September 8, 2026.'),
]);

module.exports = { meta, body };
