'use strict';
// Weekly course post: AP Networking. Evergreen concept explainer, Unit 3
// (Managing Many Connections). Goes one level deeper than the router vs
// switch piece: this post covers VLANs specifically, the one concrete
// mechanism a single physical switch uses to behave like several separate
// networks. Also the explicit cross-course link into the AP Cybersecurity
// segmentation post, since students who take both courses meet the same idea
// from two directions: cybersecurity asks why a network gets divided,
// networking teaches how a switch actually does the dividing.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'One switch, two networks: the problem a VLAN solves',
  'What a VLAN actually is: a port assigned to a logical network',
  'Worked example: guest wifi and staff network on one switch',
  'Why two VLANs on the same switch cannot reach each other',
  'VLANs vs buying a second switch: the cost and cabling case',
  'VLANs and network segmentation: one concrete HOW',
];

const meta = {
  title: 'VLANs: One Switch, Many Networks',
  handle: 'ap-networking-vlans-one-switch-many-networks',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'vlan',
  publishOn: '2026-10-07',
  seoTitle: 'VLANs Explained: One Switch, Many Networks',
  seoDescription: 'A VLAN lets one physical switch act like several separate networks. Learn how port assignment works and why VLANs need a router to reach each other.',
  summary: 'A physical switch does not have to mean one network. A VLAN lets a single switch be configured, in software, to behave like several separate logical networks at once, each one unable to reach the others without a router in between. This guide walks through the problem VLANs solve, how port assignment actually works, a worked example of guest wifi and staff traffic sharing one switch, why devices on different VLANs cannot talk directly, the cost and cabling case against buying a second physical switch instead, and the explicit connection to network segmentation as covered on the AP Cybersecurity side of the same idea.',
  tags: ['AP Networking', 'VLAN', 'Switch', 'Network Segmentation', 'Unit 3', 'Concept Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('A single physical switch does not have to mean a single network. A VLAN, short for virtual local area network, is how one switch gets configured to behave like several separate networks at once, each one logically walled off from the others, without running a second cable or buying a second box. This guide covers exactly what problem a VLAN solves, how a switch port gets assigned to one, a worked example with guest wifi and staff traffic sharing one switch, why two VLANs cannot reach each other without a router, and how this one concrete mechanism connects to the broader idea of network segmentation.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Our piece on <a href="/blogs/ap-networking/ap-networking-router-switch-access-point">what a switch actually does</a> covers the basic job: a switch connects multiple wired devices so they can talk directly to each other, and every port on that switch is, by default, an equal member of the same one local network. That is a fine description of a switch with one job to do. It stops being fine the moment a small business needs that same switch to serve two groups of devices that should genuinely not be able to reach each other, a guest network for visitors and an internal network for staff, for example, while both groups still plug into the exact same physical box.'),
  H.p('Without any further configuration, a plain switch cannot do that. Every port is a member of the same network as every other port, on purpose, because that is what makes a switch useful in the first place: it lets anything plugged into it reach anything else plugged into it. A guest laptop and a staff desktop sharing one unconfigured switch can, at the network level, reach each other directly. That is not a hypothetical risk. It is exactly the kind of flat network our companion piece on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-network-segmentation">network segmentation</a> describes: get onto one part of it, and every other part is reachable too.'),
  H.p('A VLAN is the answer to this specific problem, and it is worth being precise about what problem that is. It is not "how do I connect a guest network to the internet," which is a router\'s job. It is "how do I make one physical switch behave like two or more logically separate switches," so that a guest device and a staff device can share the same box without sharing the same network. That is a switch-level problem, solved with a switch-level tool, and a VLAN is that tool.'),
  H.box('key', 'The one sentence version', '<p>A VLAN lets a single physical switch be divided, in software, into multiple independent logical networks, so that devices plugged into the same switch can be kept apart from each other exactly as if they were plugged into two separate physical switches, without the cost or the cabling of actually buying a second one.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The mechanic underneath a VLAN is simpler than the name suggests. Every port on a manageable switch, the kind that supports VLANs at all, can be assigned a VLAN number. Two ports assigned the same VLAN number are treated as members of the same logical network. Two ports assigned different VLAN numbers are treated as members of different logical networks, even though both ports are physically part of the identical piece of hardware sitting in the same equipment closet.'),
  H.p('Picture a small switch with eight ports. Ports one through four get assigned VLAN 10. Ports five through eight get assigned VLAN 20. A device plugged into port two and a device plugged into port three can reach each other directly, because both ports belong to VLAN 10. A device plugged into port two and a device plugged into port six cannot reach each other directly, even though both devices are plugged into the exact same switch, because port two belongs to VLAN 10 and port six belongs to VLAN 20. The switch enforces that separation internally: traffic arriving on a VLAN 10 port is only forwarded to other VLAN 10 ports, never to a VLAN 20 port, regardless of what that traffic is or where it claims to be headed.'),
  H.p('This is the entire mechanic. Nothing about the cabling changed, nothing about the physical hardware changed, and no second switch was purchased. What changed is a configuration setting on each port, telling the switch which logical group that port belongs to. A device plugged into a VLAN-assigned port generally has no idea a VLAN is even involved. It just plugs in and gets network access, the same as it would on any switch. The VLAN boundary is enforced entirely by the switch, invisibly, from the device\'s point of view.'),
  H.box('tip', 'A quick way to hold this in your head', '<p>A VLAN number is a label the switch attaches to a port, not to a cable or a device. Move a device to a different port with a different VLAN number, and it joins a different logical network the moment it is plugged in, with no change to the device itself. The switch, not the device, is what is doing the sorting.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Take a concrete small business scenario and carry it through step by step. A small office has one physical switch, twelve ports, sitting in a closet. The business wants two things at once: a guest network for visitor laptops and phones that only needs internet access, and an internal staff network for office computers that need to reach a shared file server and a printer that guests should never see.'),
  H.h3('Without a VLAN'),
  H.p('If every port on that switch is left on the default single network, a guest device and a staff device plugged into that switch are on the same logical network, full stop. A guest laptop could, at the network level, attempt to reach the staff file server directly, because nothing about the switch itself is stopping that traffic. The only way to prevent it without VLANs would be running an entirely separate switch, with its own separate cabling, just for guest ports, which is exactly the cost and cabling problem covered further down this guide.'),
  H.h3('With a VLAN'),
  H.p('Configure the switch instead. Assign ports one through six, the ones wired to the office desktops and the file server, to VLAN 10, the staff network. Assign ports seven through twelve, the ones wired to jacks in the lobby and conference room where guests connect, to VLAN 20, the guest network. Now a guest laptop plugged into port eight is a member of VLAN 20 only. It can reach anything else on VLAN 20, but the switch will not forward its traffic to any VLAN 10 port, including the file server, no matter what that traffic asks for. A staff desktop plugged into port three stays on VLAN 10, reaching the file server and the printer exactly as before, with the guest traffic simply invisible to it.'),
  H.p('One switch. One piece of hardware. Two logically separate networks, sharing the same box, sharing the same power supply, sharing the same equipment closet, and never crossing into each other\'s traffic. That is the entire value of the VLAN in this scenario: it gets the business the separation it needed without doubling the hardware to get it.'),

  H.h2(SECTIONS[3]),
  H.p('Here is the detail that scenario questions come back to again and again: a device on VLAN 10 and a device on VLAN 20, sitting on that same switch, cannot talk to each other directly, even though a single cable run would physically connect them if the VLAN boundary were not there. The switch is, by design, refusing to forward traffic between them. That is not a bug or a limitation to work around. It is the entire point of assigning them to different VLANs in the first place: keeping them apart is the feature.'),
  H.p('So how does a guest ever reach the internet at all, if VLAN 20 cannot reach anything outside itself through the switch? The answer is the same device that always handles crossing a network boundary: a router. A router, or in many real setups a single device doing routing between VLANs, sits above both VLANs and is configured with an interface, or a sub-interface, on each one. Traffic leaving VLAN 20 for the internet goes to the router, and the router forwards it onward. If the business wanted VLAN 20 and VLAN 10 to be able to reach each other for some specific, deliberate reason, that same router would need to be configured to allow it, explicitly, the same way any router decides what is allowed to cross between two networks.'),
  H.p('This is exactly why VLANs and routing are described together rather than as competing tools. A switch, even with VLANs configured, only ever moves traffic within a single VLAN. Reaching across VLANs, or reaching out to the internet at all, is a job that has to be handed to a router. Two VLANs on one switch, left alone with no router in the picture, are as separate from each other as two entirely different physical networks with no connection between them whatsoever.'),
  H.box('warn', 'The mistake this trips up', '<p>It is tempting to assume that because two VLANs live on the same physical switch, they must be able to reach each other somehow, since the hardware is right there. They cannot, by design, until a router is added to carry traffic between them on purpose. Same box, same power cable, zero direct reachability, unless a router says otherwise.</p>'),

  H.h2(SECTIONS[4]),
  H.p('It would be entirely possible to solve the guest and staff problem above without VLANs at all: buy a second physical switch, run a second set of cables to it, and plug the guest jacks into that switch instead of the staff one. That approach genuinely works, and it was, for a long time, the only way to do it. It is also more expensive and more work at every single step compared to configuring VLANs on one switch that already exists.'),
  H.p('A second physical switch is a second piece of hardware to buy, a second device to mount and power, and a second thing that can fail. It usually means new cable runs too, since the guest jacks in the lobby and conference room were probably already wired back to the one switch closet, not to some second location. Multiply that by every department or security zone a growing business wants kept separate, and the hardware and cabling add up fast: one switch and one set of cable runs per group, forever, every time the business needs one more separation.'),
  H.p('A VLAN gets the identical logical outcome, devices kept apart even though they share a switch, using the switch that is already installed, the cabling that already runs to every jack, and a configuration change rather than a purchase order. Adding a third group later, say a separate VLAN for security cameras, means assigning a few more ports to a new VLAN number, not running new cable to a new box. This is the practical argument for VLANs in one sentence: the same switch, configured in software, does the job that used to require buying and cabling a separate switch for every group that needed separating.'),
  H.table(
    ['Approach', 'Hardware needed', 'What happens when a third group is added later'],
    [
      ['Separate physical switches', 'One switch per group, plus its own cable runs', 'Buy another switch, run more cable'],
      ['VLANs on one switch', 'The one switch already installed', 'Assign a few ports to a new VLAN number'],
    ],
  ),

  H.h2(SECTIONS[5]),
  H.p('The AP Cybersecurity course covers <a href="/blogs/ap-cybersecurity/ap-cybersecurity-network-segmentation">network segmentation</a> from a different angle: why a network gets divided into zones in the first place, so that a compromised device in one zone cannot automatically reach everything in every other zone. That guide is deliberately focused on the reasoning, the blast radius a single infected device should be limited to, and the trade-off between more zones and more administrative friction. It is worth reading if you have not, especially if you are studying both courses, since AP Networking and AP Cybersecurity students very often are.'),
  H.p('A VLAN is one concrete answer to the "how" question that guide leaves open. Segmentation says a network should be divided into zones with controlled checkpoints between them. A VLAN is the specific mechanism a switch uses to create one of those zone boundaries at the switch level, by grouping ports into logically separate networks that do not talk to each other without a router deciding to let them. The guest and staff example above is a segmentation story told at the switch layer: two zones, one physical device, no direct path between them unless a router is explicitly configured to allow it.'),
  H.p('Framed that way, the two courses are teaching the same underlying idea from two directions that reinforce each other rather than duplicate each other. AP Cybersecurity asks why a network should be divided and what risk that division controls. AP Networking teaches the actual configuration, the port assignment, the VLAN number, the router sitting between VLANs, that makes a division like that real rather than aspirational. A student who understands VLANs has a concrete, mechanical answer ready the next time a cybersecurity scenario asks how a described network achieves its segmentation, rather than reaching for a vague word like "firewall" without being able to say what it is actually doing.'),

  H.h2('Two practice questions on VLAN reasoning'),
  H.p('Both are written the way a scenario question is written: a setup, then a decision that has to follow from the evidence given rather than from a guess.'),
  H.mcq({
    n: 1,
    stem: 'A small clinic has one physical switch with two VLANs configured: VLAN 5 for front-desk check-in devices and VLAN 15 for the server holding patient records. A front-desk tablet on VLAN 5 attempts to open a connection directly to the records server on VLAN 15. No router or other device has been configured to pass traffic between VLAN 5 and VLAN 15. What happens to that connection attempt?',
    options: [
      'It succeeds immediately, since both devices are plugged into the same physical switch',
      'It fails, because the switch does not forward traffic between two different VLANs on its own, and nothing has been configured to carry that traffic across the boundary',
      'It succeeds, but only after a noticeable delay while the switch searches for a path',
      'It fails only if the two devices are also on different subnets, which cannot be determined from the scenario',
    ],
    correct: 1,
    why: 'The two devices sharing one physical switch does not matter here. VLAN membership, not physical wiring, is what a switch checks before forwarding traffic. A switch never forwards traffic between two different VLANs by itself, no matter how the ports are cabled. Crossing that boundary requires a router, or a routing device, explicitly configured to carry traffic between the two VLANs, and the scenario states plainly that nothing has been configured to do so. The connection attempt fails at the switch, before it ever has a chance to reach the records server.',
  }),
  H.mcq({
    n: 2,
    stem: 'A small business has one problem: every device on its single physical switch can currently see and attempt to connect to every other device on that switch, and the owner wants visitor devices kept fully separate from the office\'s internal file server while both still share the same switch and the same internet connection. A consultant proposes configuring two VLANs on the existing switch, one for visitor ports and one for internal ports, with a router allowing only the internal VLAN to reach the file server. Would this proposal solve the stated problem?',
    options: [
      'No, because VLANs cannot be configured on a switch that is already installed and running',
      'No, because the problem requires a second physical switch, which VLANs cannot substitute for',
      'Yes, because assigning ports to separate VLANs keeps visitor and internal traffic apart on the one existing switch, and the router controls the one path that is allowed to cross between them',
      'Yes, but only if the visitor devices connect over wifi rather than a wired connection to the switch',
    ],
    correct: 2,
    why: 'This is exactly the problem a VLAN is built to solve: one physical switch, two groups of devices that need to be kept apart, without buying and cabling a second switch. Assigning visitor ports to one VLAN and internal ports to another keeps the two groups from reaching each other directly at the switch level, and having a router allow only the internal VLAN through to the file server matches the stated goal precisely. VLANs can absolutely be configured on an already installed switch, so that option is wrong, and a second physical switch is exactly what this proposal is avoiding the need for, not requiring. Whether the visitor devices connect by wire or by wifi to reach their assigned VLAN does not change whether the VLAN separation itself works.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is a VLAN in simple terms?', a: 'A VLAN, short for virtual local area network, is a way of configuring a single physical switch to behave like several separate logical networks. Ports are assigned VLAN numbers, and the switch only forwards traffic between ports that share the same VLAN number, keeping different groups of devices apart even though they share the same physical hardware.' },
    { q: 'Can devices on different VLANs ever talk to each other?', a: 'Not directly through the switch. A switch never forwards traffic between two different VLANs by itself. Reaching across VLANs requires a router, or another routing device, explicitly configured to carry traffic between them, the same way a router is required to cross the boundary between any two separate networks.' },
    { q: 'Why not just use a separate physical switch for each network instead of VLANs?', a: 'That approach works, but it costs more and takes more effort: a separate switch to buy and mount, and usually a separate set of cable runs, for every group that needs to be kept apart. A VLAN gets the same logical separation out of the switch and cabling that are already installed, using configuration instead of new hardware.' },
    { q: 'Is a VLAN the same thing as network segmentation?', a: 'A VLAN is one concrete mechanism used to achieve segmentation at the switch level, not the whole idea. Segmentation, covered in depth in the companion guide on network segmentation, is the broader practice of dividing a network into zones with controlled checkpoints between them. A VLAN is how a switch specifically creates one of those zone boundaries.' },
    { q: 'How does a switch know which VLAN a device belongs to?', a: 'The VLAN is assigned to the switch port, not to the device itself. Whatever is plugged into a given port becomes a member of whatever VLAN that port is configured for. Move a device to a different port with a different VLAN assignment, and it joins that different VLAN automatically, with no configuration needed on the device.' },
  ]),

  H.cta({
    heading: 'VLANs sit right at the center of Unit 3',
    body: 'Managing Many Connections is built around exactly this kind of reasoning: how one physical network gets divided into logical pieces, and what it takes to let traffic cross between them on purpose. The course walks through it with the same worked, scenario-first approach as this guide.',
    links: [
      { href: '/pages/ap-networking', text: 'Explore the course' },
      { href: '/pages/ap-networking-exam', text: 'Exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed for accuracy and clarity on October 6, 2026.'),
]);

module.exports = { meta, body };
