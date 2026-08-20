'use strict';
// Weekly course post: AP Cybersecurity. Drill piece scoped to Unit 3, Securing
// Networks. The companion segmentation and firewalls posts (2026-09-15 and
// 2026-09-22) already go deep on those two topics individually, so this post
// deliberately spends most of its ten scenarios on the rest of the unit,
// reconnaissance and spoofing, denial of service, NAT and the DMZ, IDS, IPS,
// and SIEM, VLANs on shared hardware, and wireless design flaws, and gives
// segmentation and firewalls only fresh angles neither prior post used. None
// of the ten scenarios below reuses a specific device, network, or attack
// pattern already used as an MCQ or worked example on this blog's other AP
// Cybersecurity posts.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What AP Cybersecurity Unit 3 actually tests about networks',
  'Naming the attack: reconnaissance, spoofing, and denial of service',
  'The boundary itself: firewalls, NAT, and the DMZ',
  'Catching what gets past the boundary: IDS, IPS, and SIEM',
  'The hardest combinations: VLANs and wireless design flaws',
];

const meta = {
  title: 'AP Cybersecurity Unit 3: Ten Network Security Questions, Hardest Last',
  handle: 'ap-cybersecurity-unit-3-network-security-questions',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity unit 3',
  publishOn: '2026-10-09',
  seoTitle: 'AP Cybersecurity Unit 3: Network Security Questions',
  seoDescription: 'Ten AP Cybersecurity Unit 3 scenario questions, grouped by attack recognition, firewalls and NAT, IDS and SIEM, and VLANs and wireless, hardest last.',
  summary: 'Ten scenario-style practice questions scoped to AP Cybersecurity Unit 3, Securing Networks, grouped by which piece of the network is actually doing the work: naming the attack itself, the firewall and NAT boundary and the DMZ, detection with IDS, IPS, and SIEM, and finally VLANs and wireless design flaws, ordered from a straightforward recognition call to a closing scenario that stacks several ideas from across the unit at once. Three are presented as fully interactive practice questions and the rest as worked scenario walkthroughs, and none of the ten repeats a scenario already used on this blog\'s segmentation or firewalls guides.',
  tags: ['AP Cybersecurity', 'Unit 3', 'Network Security', 'Practice Questions', 'Study Skills'],
  allowedInlineNumbers: ['1024', '22'],
};

const body = H.article([
  H.dek('AP Cybersecurity Unit 3 is where the exam stops asking what a control is called and starts asking whether you can tell one control\'s job apart from another\'s when a scenario blurs them together. Here are ten network security scenario questions scoped to exactly that unit, grouped by which piece of the network is actually doing the work, ordered from a straightforward recognition call to a closing scenario that stacks several ideas from earlier in the unit at once.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 14,
  }),
  H.toc(SECTIONS),

  H.p('Two earlier guides on this blog already go deep on individual pieces of this unit: <a href="/blogs/ap-cybersecurity/ap-cybersecurity-network-segmentation">network segmentation</a> and <a href="/blogs/ap-cybersecurity/ap-cybersecurity-firewalls-what-they-cannot-stop">what a firewall can and cannot stop</a>. This post does not repeat either one. Instead it spends most of its ten scenarios on the rest of AP Cybersecurity Unit 3, the pieces those two posts had no room for, and gives segmentation and firewalls themselves only fresh angles neither prior post used.'),
  H.p('Work each scenario before reading the reasoning, the same way you would want to work an actual exam question: read the whole stem first, decide which piece of the network the scenario is actually pointing at, and only then think about which answer choice matches that piece specifically rather than the one that merely sounds like a security term.'),

  H.h2(SECTIONS[0]),
  H.p('AP Cybersecurity Unit 3 covers a wide stretch of ground: network fundamentals and the attack surface a network exposes, the categories of attack a network specifically faces, firewalls and packet filtering, segmentation and VLANs, intrusion detection and prevention alongside log correlation, and network security policy including wireless. A scenario question drawn from this unit almost always wants you to identify which of those pieces is actually in play, not just recognize that something bad happened. Two devices being on the same network is not automatically a segmentation question. Traffic being denied is not automatically a firewall question. The ten scenarios below are grouped so that pattern is easier to see and practice on purpose, moving from naming an attack correctly, to the firewall and NAT boundary and the DMZ sitting behind it, to the detection tools that catch what gets past that boundary, and finally to two harder scenarios that combine ideas from earlier in the unit, which is exactly the kind of stacking a real exam question likes to do once you have shown you can handle each piece on its own.'),

  H.h2(SECTIONS[1]),
  H.p('Before any control decision matters, a scenario question usually needs you to name what kind of attack is actually being described. These three scenarios stay at that recognition level, since misnaming the attack almost always leads to picking a control that would not have addressed it.'),

  H.h3('The scan nobody noticed until the log review'),
  H.p('A small nonprofit\'s donation server keeps a routine connection log. During a monthly review, an administrator notices that two months earlier, one external address made a short burst of connection attempts to the server, one right after another, touching a long sequential run of different port numbers over the course of roughly two minutes. Almost none of the attempts got a response back. A handful, aimed at the few ports the server actually has anything listening on, connected briefly and then closed immediately with no data exchanged. Nothing on the server was altered, and no later incident was ever tied back to this burst of activity.'),
  H.p('Nothing here is a breach in progress, and treating it as one misses what the log is actually showing. A single outside address systematically working through a long run of ports in sequence, most of which go nowhere and a few of which briefly connect and then disconnect, is the signature of reconnaissance: someone mapping which services a server has running before deciding whether or how to attack it. The brief connections on the few active ports are the attacker learning that something is listening there, not the attacker doing anything to it yet. This is exactly why a security team treats a port scan as worth logging and watching for a pattern, even though the individual burst by itself caused no damage. It is the reconnaissance step that a later, more targeted attack would build on, and catching it at this stage, before anything is actually exploited, is the entire point of reviewing connection logs instead of waiting for an incident to announce itself.'),

  H.h3('The forged return address'),
  H.mcq({
    n: 1,
    stem: 'A university research lab configures its internal file server to accept connections only from addresses inside the lab\'s own known internal range, rejecting anything else. An attacker outside the lab\'s network crafts packets with a source address forged to look like it belongs to that trusted internal range, hoping the file server\'s address-based check will accept them. The lab\'s border router is configured to drop any inbound packet whose claimed source address does not match the direction it actually arrived from. The forged packets never reach the file server at all. Which best describes what happened?',
    options: [
      'The file server\'s address check successfully identified and blocked the forged packets on its own',
      'The border router\'s filtering caught the spoofed source address before the packets ever reached the file server, since a real internal address should never be arriving from outside the network',
      'The attack failed only because the file server was offline at the time',
      'IP spoofing is not a real technique and the packets were rejected for an unrelated reason',
    ],
    correct: 1,
    why: 'The file server never evaluated these packets at all, since they were dropped before reaching it, which rules out the file server\'s own check as the reason. IP spoofing, forging a packet\'s source address so it appears to come from somewhere it did not, is a real and specifically testable technique, so the last option is wrong on its face. What actually stopped the attack was the border router recognizing that a packet claiming to be from the lab\'s own trusted internal range should never physically arrive from the outside-facing direction it came in on, and dropping it on exactly that basis. This is anti-spoofing filtering at the network boundary, a distinct control from the file server\'s own address-based access rule, and the scenario is testing whether you can tell which layer actually did the work.',
  }),

  H.h3('Real traffic or a flood dressed up as real traffic'),
  H.p('A regional trivia league\'s ticket registration site is linked from a popular podcast\'s show notes on a Tuesday morning. Within an hour, traffic to the registration page climbs sharply. A separate spike happens two days later with no podcast mention and no marketing push behind it: thousands of connections arrive from addresses scattered across many unrelated networks, all repeatedly requesting the exact same single image file on the page rather than browsing normally, and not one of them ever completes a registration form. The server, unable to keep up with the repeated identical requests, becomes too slow for real visitors to load the page at all.'),
  H.p('The two spikes look similar at a glance, a sudden jump in traffic, but the second one is not what the first one was. Real visitors arriving from a podcast mention behave like real visitors: they load the full page, follow links, and a meaningful share of them actually complete the registration form they came for. The second spike\'s traffic never does any of that. It repeatedly requests one single file and never proceeds further, which is not how an actual person browsing a registration page behaves, and the sheer number of unrelated source addresses involved rules out a coincidence of unusually high organic interest. That pattern, high volume traffic engineered to exhaust server capacity rather than to accomplish anything a real visitor would want, is a denial of service attack, and specifically a distributed one given how many separate addresses are involved at once. The lesson worth keeping is that traffic volume alone never tells you which spike is which. What the traffic actually does once it arrives is what separates a viral moment from an attack dressed up to look like one.'),

  H.h2(SECTIONS[2]),
  H.p('The <a href="/blogs/ap-cybersecurity/ap-cybersecurity-firewalls-what-they-cannot-stop">companion guide on firewalls</a> already covers packet filtering, stateful inspection, and the specific attacks a firewall alone cannot stop. These two scenarios stay in the same neighborhood of the network but test pieces that guide left out entirely: NAT, which hides a network\'s internal addressing behind one public one, and the DMZ, a specific architecture for containing a public-facing server rather than just filtering traffic to it.'),

  H.h3('One public address, a dozen devices behind it'),
  H.p('A small architecture firm has a dozen employee laptops on its office network, each with its own private internal address, but the firm\'s internet service provider issues the office only one public address. An outside security researcher notices unusual outbound traffic and traces it back only as far as that single public address, since that is the only address visible from outside the firm\'s network at all. Identifying exactly which of the dozen laptops actually generated the traffic requires the firm\'s own internal network logs, which record which private address was using which outbound connection at the time.'),
  H.p('This is network address translation doing exactly what it is designed to do, for better and for worse depending on which side of the investigation you are standing on. NAT lets many devices, each with its own private address that only has to be unique inside that one office, share a single public address when talking to the wider internet, translating between the two directions automatically. From the outside, every laptop in the building looks like it is the same one address, because in a real sense, as far as the internet is concerned, it is. That is genuinely useful for conserving scarce public addresses and for not exposing a device\'s real internal address directly to the internet, but it also means an outside party can never attribute traffic to a specific internal device using only what is visible from outside. Attribution at that level of detail requires the internal logs the firm itself keeps, which is exactly why internal logging matters even on a network that already sits behind NAT and a firewall.'),

  H.h3('A public server that gets popped and still cannot go anywhere'),
  H.mcq({
    n: 2,
    stem: 'A mid-sized retailer places its public-facing web server in its own separate network zone, sitting behind one firewall facing the internet and a second, stricter firewall facing the retailer\'s internal network holding customer order and payment data. This middle zone is a DMZ. An attacker exploits a flaw in the web server\'s software and gains full control of it, then attempts to use that foothold to reach the internal order database. The second firewall blocks every one of those internal connection attempts. Which statement best describes why the retailer\'s design still worked even after the web server itself was fully compromised?',
    options: [
      'It did not really work, since the web server being compromised at all means the design failed completely',
      'The DMZ architecture assumed the public-facing server might eventually be compromised and placed a second firewall specifically to contain what a compromised DMZ device could reach, so the internal network stayed protected even after the first layer failed',
      'The internal network was safe only because the attacker chose not to try reaching it',
      'The web server\'s own software should have prevented the initial compromise, and no network design can help once that fails',
    ],
    correct: 1,
    why: 'A public-facing server being exploited is a real failure at that layer, but the DMZ design was never built on the assumption that layer would hold forever. Placing the web server in its own zone, isolated from the internal network by a second, stricter firewall, is a deliberate acknowledgment that an internet-facing service is the most exposed thing an organization runs and might eventually be compromised despite good software practices. The second firewall\'s job is specifically to contain what a fully compromised DMZ device can reach, which is exactly what it did here: the attacker had complete control of the web server and still could not get past the boundary into the order database. That is defense in depth working as intended, not a coincidence of the attacker choosing not to try, and it is a genuinely different lesson from a single firewall simply denying an external connection attempt, since here the compromise already happened on the inside of the first boundary.',
  }),

  H.h2(SECTIONS[3]),
  H.p('A firewall and a DMZ decide what can cross a boundary in the first place. These two scenarios cover what happens once something is already inside that boundary, or already crossing it in a way no single rule flags on its own: detecting it, and in some cases reacting to it automatically.'),

  H.h3('An alert that fires and a connection that keeps going'),
  H.p('A logistics company deploys a network monitoring tool that watches traffic crossing its boundary and compares it against a library of known attack signatures. One afternoon it matches a pattern associated with a known exploit attempt aimed at one of the company\'s servers, and it generates an alert that lands in the security team\'s queue. The connection itself is not blocked or altered in any way, and it continues exactly as it would have without the tool in place. A security analyst reviews the alert roughly twenty minutes later and manually closes off the connection.'),
  H.p('The tool here did real, useful work, and it is worth being precise about exactly what work that was. It watched, recognized a known pattern, and told a human, which is the job of an intrusion detection system: identify and alert, without taking action on the traffic itself. That twenty minute gap between the alert firing and a person acting on it is not a flaw in the tool. It is the defining characteristic of detection as opposed to prevention. An intrusion prevention system, sitting inline with the traffic rather than only watching a copy of it, could have matched the same signature and blocked the connection automatically the moment it matched, with no human step in between. Neither approach is simply the better one in every situation: an IPS acting automatically risks blocking something legitimate that happens to resemble a bad pattern, while an IDS trades that risk for a delay before anything actually stops. A scenario question testing this distinction wants you to notice whether the traffic kept moving after the alert, which is exactly the detail that tells detection and prevention apart.'),

  H.h3('Three quiet log entries that mean nothing apart'),
  H.p('A mid-sized insurer\'s security team uses a tool that pulls log data from its firewall, its intrusion detection system, and its employee login system into one shared view, and flags any set of events across those three sources that cluster closely together in time. One morning it surfaces a set of three entries: a firewall log showing an unusual outbound connection from one employee workstation, an intrusion detection alert for a signature associated with credential theft software on that same workstation an hour earlier, and a login record showing that same employee\'s account authenticating from an unfamiliar location twenty minutes after the outbound connection. Individually, each of the three systems that produced these entries had already logged its own piece days or hours apart from the others, with nobody having connected them.'),
  H.p('No single one of those three log entries would have looked urgent enough to chase down on its own, which is exactly the gap this kind of tool is built to close. A firewall log flags network-level events. An intrusion detection alert flags a matched signature. A login system flags authentication events. Each system only sees its own slice, and none of the three, by itself, tells the full story of a single account being quietly compromised over the course of a morning. A security information and event management tool, a SIEM, exists specifically to pull those separate slices together and surface the pattern that only becomes visible once they are placed on the same timeline. That correlation, not any one alert, is what actually revealed the compromise here, and it is why a security team\'s effectiveness increasingly depends on how well its separate tools\' logs get combined rather than on how good any single tool is in isolation.'),

  H.h2(SECTIONS[4]),
  H.p('These last two scenarios, plus the closing question, are the hardest in this set on purpose. Each one either applies a Unit 3 idea in a more mechanically specific way than the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-network-segmentation">segmentation guide</a> covered, or combines more than one idea from earlier in the unit at once.'),

  H.h3('Same switch, same cable run, two different worlds'),
  H.p('A retail chain runs its point of sale registers and its public customer wifi through the exact same physical network switch in the back office, plugged into ports right next to each other, to save on hardware. Rather than leaving both on the same network, the switch is configured to assign the registers and the customer wifi to two separate VLANs, and inter-VLAN routing between those two specific VLANs is explicitly disabled. A customer device on the wifi is later found to be infected with malware that scans for other reachable devices. It finds nothing belonging to the point of sale system, despite sharing the identical physical switch just inches away.'),
  H.p('Physical proximity and logical separation are not the same fact, and this scenario exists to make that distinction impossible to miss. A VLAN is a way of dividing devices into separate logical networks using configuration on a switch, rather than using physically separate hardware for each group, which is exactly what let this retailer keep one switch while still keeping the registers and customer wifi apart. Traffic tagged as belonging to one VLAN is kept apart from traffic tagged as belonging to another, and with inter-VLAN routing between the two disabled specifically, a device on one VLAN has no path to a device on the other regardless of how close the actual cables run. The infected customer device sharing a switch with the point of sale registers changed nothing, because the separation those registers actually depend on was never physical distance in the first place. It was the VLAN configuration doing exactly the same job segmentation always does, just implemented through switch configuration on shared hardware rather than through entirely separate physical equipment.'),

  H.h3('The password everyone in the building already knows'),
  H.p('A hotel offers guest wifi protected by a single password that is printed on a card in every room and never changes between guests. Weeks into this arrangement, a guest working from the lobby notices that his laptop can see several other guests\' laptops directly on the network and, using freely available software, can watch some of their unencrypted traffic pass by. The hotel\'s wifi network itself is otherwise properly configured, with a real password required and a functioning firewall protecting the hotel\'s own internal systems from the guest network entirely.'),
  H.p('The firewall protecting the hotel\'s internal systems is doing its job here, and this scenario is testing whether that fact is enough to distract from the actual gap. Guests sharing one unchanging password does weaken things somewhat, but the specific failure described, one guest device being able to directly see and intercept another guest device\'s traffic on the same wireless network, is a separate wireless configuration issue: client isolation, sometimes called AP isolation, was never enabled on the guest network. A wireless network with client isolation turned on keeps devices connected to the same access point from communicating with each other directly at all, even though every one of them can still reach the internet normally, which is exactly the behavior a shared guest network needs and exactly the behavior this hotel\'s network was missing. The hotel\'s internal firewall answers a completely different question, whether guest traffic can reach the hotel\'s own systems, and getting that answer right says nothing about whether guests can reach each other, which is the specific wireless policy gap this scenario is built around.'),

  H.h3('The network with the same name in the parking lot'),
  H.mcq({
    n: 3,
    stem: 'A corporate office runs a properly secured wifi network named "CorpNet," protected by a real password, sitting behind a firewall and internally segmented from its more sensitive systems, exactly the way the earlier guides on this blog describe those controls working correctly. One afternoon, an attacker parks in the lot outside and sets up a personal wireless hotspot broadcasting the identical name, "CorpNet," with a stronger signal near the building\'s main entrance than the real network has at that spot. Several employee laptops, configured to automatically rejoin any network whose name they have connected to before, silently connect to the attacker\'s hotspot instead of the real one, with no action taken by the employees at all. The attacker can now see all of that traffic. Which statement best explains why the office\'s existing firewall and network segmentation are not helping in this specific situation?',
    options: [
      'The firewall and segmentation must be misconfigured, since a properly secured network should have prevented this entirely',
      'Those controls exist on the legitimate CorpNet network, and the affected laptops never actually joined that network at all; their traffic is flowing entirely through the attacker\'s separate rogue hotspot, which sits completely outside the boundary any of the office\'s existing controls were ever positioned to watch',
      'Wireless networks cannot be protected by firewalls or segmentation under any circumstances',
      'The attack succeeded only because the employees clicked something they should not have',
    ],
    correct: 1,
    why: 'Nothing about the office\'s firewall or segmentation needs to be broken or misconfigured for this to happen, which is exactly what makes a rogue access point, sometimes called an evil twin, worth taking seriously as its own category rather than folding it into a firewall or segmentation failure. Those controls were built to watch traffic that actually reaches the legitimate CorpNet network and its boundary. The affected laptops never joined that network at all. They silently connected to a completely separate wireless network the attacker created from scratch, one that happens to share a name, and every byte of their traffic is flowing through hardware the attacker controls entirely, never touching the office\'s real network, its real firewall, or its real segmentation boundaries at any point. No employee had to click anything, since automatic reconnection to a previously known network name did the work on its own. This is the same lesson the firewall guide makes about traffic that never crosses a firewall\'s boundary at all, applied one layer earlier: a control can only act on traffic that actually reaches it, and a rogue access point\'s entire purpose is capturing traffic before it ever gets that far.',
  }),

  H.h2('Keeping the ten straight'),
  H.p('Laid out next to each other, the pattern connecting all ten scenarios is easier to hold onto than any single one on its own: each control in Unit 3 answers a narrow, specific question, and a scenario question is almost always testing whether you can name which narrow question is actually the one in play.'),
  H.table(
    ['Scenario', 'What it is actually testing', 'The control or concept'],
    [
      ['Sequential port probing with no follow-up damage', 'Recognizing reconnaissance before an actual attack', 'Port scanning as an attack category'],
      ['A forged internal address dropped at the border', 'Telling a boundary filter apart from a server\'s own check', 'Anti-spoofing filtering'],
      ['A traffic spike that never completes a real action', 'Distinguishing legitimate volume from an attack', 'Distributed denial of service'],
      ['One public address hiding a dozen internal devices', 'Understanding what NAT does and does not reveal', 'Network address translation'],
      ['A compromised public server still blocked from internal data', 'Containment after a boundary already failed once', 'The DMZ, a second firewall layer'],
      ['An alert that fires without stopping the connection', 'Telling detection apart from prevention', 'IDS versus IPS'],
      ['Three unrelated-looking log entries on one timeline', 'Seeing a pattern no single log source shows alone', 'SIEM correlation'],
      ['Two zones sharing one physical switch', 'Separation implemented through configuration, not distance', 'VLANs and inter-VLAN routing'],
      ['Guest devices that can see each other', 'A wireless-specific gap a firewall does not cover', 'Client or AP isolation'],
      ['A rogue hotspot using the real network\'s name', 'Recognizing traffic that never reaches any existing control', 'Rogue access points'],
    ],
  ),
  H.box('key', 'The one habit worth building from this post', '<p>Before evaluating a single option, ask what specific, narrow question the control in the scenario is actually built to answer, and whether the traffic described ever reaches that control at all. A technically accurate sounding answer about the wrong control, or about a control the traffic never touched, is the wrong answer every time.</p>'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What does AP Cybersecurity Unit 3 actually cover?', a: 'Unit 3, Securing Networks, covers network fundamentals and attack surface, categories of network attack, firewalls and packet filtering, segmentation and VLANs, intrusion detection and prevention alongside log correlation tools like a SIEM, and network security policy including wireless. A scenario question from this unit is almost always asking you to identify which of those specific pieces is actually in play.' },
    { q: 'How is a DMZ different from ordinary network segmentation?', a: 'Ordinary segmentation divides a network into zones so a compromise in one zone cannot easily reach another. A DMZ is a specific application of that same idea to a public-facing server: placing it in its own zone behind a second, stricter firewall facing the internal network, so that even a full compromise of the public-facing server does not automatically grant access to more sensitive internal systems.' },
    { q: 'What is the real difference between an IDS and an IPS?', a: 'Both compare traffic against known attack patterns, but an intrusion detection system only watches and alerts a human, leaving the traffic itself untouched, while an intrusion prevention system sits inline with the traffic and can block it automatically the moment a match occurs. The tradeoff is that automatic blocking risks stopping something legitimate that happens to resemble a bad pattern, while detection alone always leaves a delay before a person acts.' },
    { q: 'Why does a rogue access point bypass a company\'s firewall and segmentation entirely?', a: 'Because a device that joins a rogue access point never actually reaches the company\'s real network at all. Its traffic flows through hardware the attacker controls from the start, so none of the company\'s existing boundary controls, which only watch traffic that reaches the legitimate network, ever get a chance to evaluate it.' },
    { q: 'Do I need to memorize specific port numbers or IP address ranges for Unit 3 questions?', a: 'No. Every scenario in this post is solved by identifying which specific control or attack category the described behavior matches, not by recalling a particular port number or address range. That reasoning skill, matching a scenario to the narrow question a given control actually answers, is what the exam rewards far more than memorized numbers.' },
  ]),

  H.p('Every one of these ten scenarios sits inside <a href="/pages/ap-cybersecurity-curriculum">Unit 3 of the AP Cybersecurity curriculum</a>, and a real exam scenario question usually rewards the same skill practiced here: naming which specific control a described situation is actually testing before picking an answer, which is the exact habit built out further on <a href="/pages/ap-cybersecurity-practice-exam">the practice exam</a>.'),
  H.cta({
    heading: 'Practice naming the right control for the right layer',
    body: 'Unit 3 keeps testing the same underlying skill across different scenarios: firewalls, NAT, the DMZ, detection tools, VLANs, and wireless design all answer different narrow questions, and telling them apart is the actual exam skill.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study Unit 3' },
      { href: '/pages/ap-cybersecurity-course', text: 'See the full course', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed October 6, 2026.'),
]);

module.exports = { meta, body };
