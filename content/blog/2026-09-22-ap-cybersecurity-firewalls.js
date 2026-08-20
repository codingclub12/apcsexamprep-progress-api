'use strict';
// Weekly course post: AP Cybersecurity. Evergreen concept explainer, Unit 3 (Securing Networks).
// Deliberately goes deep on the firewall itself, where the segmentation post
// (2026-09-15) treats the checkpoint only at a conceptual level. The real
// teaching point here is the boundary of what a firewall can do at all.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What a firewall actually does',
  'Packet filtering versus stateful and application aware inspection',
  'Where the boundary sits: a worked example',
  'What a firewall genuinely cannot stop',
  'Why a firewall is a boundary control, not a complete defense',
];

const meta = {
  title: 'Firewalls, and What They Genuinely Cannot Stop',
  handle: 'ap-cybersecurity-firewalls-what-they-cannot-stop',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'firewall',
  publishOn: '2026-09-22',
  seoTitle: 'Firewalls Explained: What They Do and Cannot Stop',
  seoDescription: 'What a firewall actually filters, the conceptual types the exam tests, and the specific attacks a firewall alone can never stop, from phishing to a USB drive.',
  summary: 'A firewall is rule based traffic filtering at a boundary, deciding what is allowed to cross based on criteria like source and destination address and port. This guide goes deep on what a firewall actually checks, the conceptual difference between packet filtering and stateful or application aware inspection, and then spends most of its time on the harder and more testable half of the idea: the specific, real categories of attack a firewall genuinely cannot stop, including phishing, encrypted payload content, an already authenticated insider, and malware that never crosses the network boundary at all.',
  tags: ['AP Cybersecurity', 'Firewalls', 'Unit 3', 'Network Security', 'Concept Guide'],
};

const body = H.article([
  H.dek('A firewall gets talked about like a wall, but it behaves more like a checkpoint with a rulebook: it looks at each attempt to cross a boundary and decides, based on specific criteria, whether that traffic is allowed through. That is real protection, and this guide explains exactly how it works. But the working title of this guide is the actual point: a firewall has a boundary, and a scenario question likes to describe an attack that never touches that boundary at all. This guide covers what a firewall actually filters, the conceptual types this course tests, and then the harder half, the specific attacks a firewall genuinely cannot stop on its own.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 22, 2026', updated: 'September 22, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Strip away the marketing language and a firewall does one job: it sits at a boundary, usually the point where a network meets a larger, less trusted network like the internet, and it inspects traffic trying to cross that boundary against a set of rules. Each rule is written in terms of specific, checkable criteria, most commonly the source address the traffic is coming from, the destination address it is headed to, and the port number it is trying to use. If a piece of traffic matches a rule that allows it, the firewall lets it cross. If it does not match any allow rule, a well configured firewall denies it by default rather than assuming it is fine.'),
  H.p('That is the entire mechanism, and it is worth sitting with how narrow it actually is. A firewall does not read a message, evaluate whether a person is who they claim to be, or judge whether an action is a good idea. It answers one question, repeatedly, for every piece of traffic that tries to cross its boundary: does this specific traffic, based on where it is from, where it is going, and what port it is using, match a rule that permits it. Everything a firewall is good at follows from that narrow question, and everything a firewall cannot do follows from it too.'),
  H.box('key', 'The core idea, in one line', '<p>A firewall is rule based traffic filtering at a network boundary, deciding what is allowed to cross based on criteria such as source address, destination address, and port. That single mechanism is the whole tool. This guide is the deeper look at that specific mechanism; the broader idea of dividing a network into zones with checkpoints between them, of which a firewall is the checkpoint, is covered in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-network-segmentation">the companion guide on network segmentation</a>, which this post does not repeat.</p>'),
  H.p('A home network is a small, concrete version of the same idea. A router\'s built in firewall typically blocks unsolicited inbound connections from the internet by default, meaning nothing outside the house can start a new connection to a device inside it unless a rule was written to allow that specific kind of traffic. Outbound connections, a laptop inside the house requesting a web page, are usually allowed by default, and the return traffic for that same request is allowed back in because it belongs to a connection the device inside the house started. That asymmetry, easy out, closed in unless explicitly opened, is the default posture of most firewalls a student will encounter, at home or at school.'),

  H.h2(SECTIONS[1]),
  H.p('Not every firewall evaluates traffic with the same amount of context, and the exam draws a real conceptual line between two levels of awareness rather than treating every firewall as identical. The first and simplest approach is packet filtering. A packet filtering firewall looks at each individual packet in isolation and checks it against a static rule set, source address, destination address, port, and sometimes protocol. It does not remember anything about packets it already saw. Every packet is judged fresh, on its own, purely on whether its header fields match an allow rule.'),
  H.p('The limitation of pure packet filtering is that it has no concept of a conversation. It cannot tell the difference between a packet that is the legitimate reply to a request a device inside the network already made, and a packet that is an unrelated stranger trying to start something new, if both packets happen to have header fields that satisfy the same static rule. A more capable approach, stateful inspection, fixes exactly that gap. A stateful firewall keeps track of which connections are currently open and in progress, and it uses that tracked state to make a smarter decision: a reply packet belonging to a connection a device inside the network already initiated is allowed through automatically, while an unrelated packet trying to start a brand new connection from outside is held to the stricter default deny rule, even if its individual header fields look similar.'),
  H.p('A further level of awareness, often called application aware or application layer inspection, goes past addresses and ports and looks at what kind of traffic is actually being carried inside an allowed connection. Two connections can both use the same port and pass every address and port based rule identically, and still be carrying meaningfully different content, one an ordinary page load and another something the network operator specifically wants to restrict. Application aware inspection is what lets a firewall tell those two apart, described here only at the conceptual level this course tests, since the exam cares that a student can name what problem each level of awareness solves, not the internal engineering of any particular product.'),
  H.box('tip', 'The layer to remember for scenario questions', '<p>If a scenario question describes a firewall correctly allowing a reply to a connection a device started, while blocking an unrelated new connection attempt with similar looking header fields, that is testing stateful awareness specifically. If it describes a firewall making a decision based only on a packet\'s address and port with no memory of prior traffic, that is testing plain packet filtering. Naming which one a described behavior matches is the actual skill, not memorizing vendor names.</p>'),

  H.h2(SECTIONS[2]),
  H.p('A concrete example makes the boundary easier to see clearly. Picture a school\'s web server, which needs to be reachable from the open internet so that students and parents can load the school\'s public site, alongside an internal file server that should never be reached from outside the building at all. A firewall sitting at the network\'s edge is configured with a small number of specific allow rules: inbound traffic to the web server\'s address, on the port web traffic normally uses, is allowed. Inbound traffic to the internal file server\'s address, from any outside source, is not covered by any allow rule and is therefore denied by default.'),
  H.p('Now trace two separate attempts. A visitor\'s browser requests the school\'s public web page. That request arrives at the firewall addressed to the web server\'s address on the expected port, matches the allow rule written for exactly that traffic, and is let through. Separately, an unrelated outside device scans the same network looking for anything reachable and tries to connect to the internal file server\'s address. That attempt arrives at the firewall addressed to a destination with no matching allow rule, and it is dropped at the boundary before it ever reaches the file server. Nothing about the file server\'s own configuration had to do any work here. The connection attempt simply never crossed.'),
  H.p('This is the shape of everything a firewall is good at: an attempt to cross the boundary that can be evaluated purely on where it is from, where it is headed, and what port it wants, compared against a written rule. When that evaluation is possible, a well configured firewall handles it cleanly and automatically, every time, without needing to know anything about who is behind the traffic or what they intend to do with it.'),

  H.h2(SECTIONS[3]),
  H.p('That same narrowness is also exactly where a firewall runs out of road, and this is the part of the idea that actually matters for a scenario question, because the exam likes to describe an incident and ask what would or would not have prevented it. A firewall can only act on traffic it can evaluate against its rules at the boundary it guards. Several entire categories of real attack either never present traffic a firewall\'s rules can judge as wrong, or never cross that boundary in the first place.'),
  H.p('The clearest case is phishing. A phishing email that a person clicks, followed by that person typing their username and password into a fake but convincing looking login page, does not involve any traffic a firewall\'s rules would flag. The connection from the victim\'s device out to the attacker\'s web page looks, at the level a firewall evaluates, like an ordinary outbound web request to an address on the expected port, the same shape as every other legitimate page load that device makes all day. The firewall has no rule against visiting a web address, and no way to know that the page loading on the other end is a convincing fake rather than the real login screen it imitates. The credentials the person types are never inspected by the firewall at all; they are typed into a form on a page the firewall already allowed.'),
  H.p('A closely related gap is encrypted traffic. Most web traffic today travels encrypted, which protects it from eavesdropping in transit, but that same encryption also hides the content of the traffic from a basic firewall sitting at the boundary. A firewall can still see and evaluate the outer envelope of an encrypted connection, the source, the destination, and the port, and can allow or deny based on those. What it cannot do, without a separate and more specialized tool built specifically to inspect encrypted traffic, is see what is actually inside that connection. Data being quietly sent out to an attacker\'s server over an otherwise ordinary looking encrypted connection can pass a firewall\'s rules cleanly, because the rules that firewall enforces were never designed to read payload content in the first place.'),
  H.p('A third gap is the insider who is already authenticated. A firewall\'s rules are about where traffic is allowed to go, not about who is sending it or whether that specific action is appropriate for that specific person. An employee with legitimate, valid credentials who copies files they are technically permitted to access, but should not be taking for the purpose they actually intend, generates traffic that looks entirely ordinary to a firewall: an authorized account, on an allowed connection, doing something the firewall has no rule against. This is the same distinction the companion guide on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-access-control-least-privilege">access control and least privilege</a> covers in depth: a firewall governs whether a connection is allowed to happen at all, and access control governs what an already authenticated account is permitted to do once it is connected, and a firewall alone has nothing to say about the second question.'),
  H.p('The fourth gap is the most literal one: anything that never crosses the boundary a firewall is watching cannot be filtered by it, because there is nothing for its rules to evaluate. Malware carried in on a USB drive and plugged directly into a device inside the network never generated any traffic at the network edge for a firewall to inspect. The same is true of malware already sitting on a device inside the network from an earlier compromise, moving to another device on the same internal segment, if that path never happens to cross the specific boundary the firewall guards. A firewall protects a boundary. Anything that reaches a device by a path other than that boundary is simply outside what it was ever positioned to see.'),
  H.table(
    ['Threat scenario', 'Would a firewall alone stop it', 'Why or why not'],
    [
      ['An outside device on the internet tries an unsolicited connection to a closed internal port', 'Yes', 'No allow rule matches the destination and port, so the attempt is denied at the boundary by default'],
      ['An employee clicks a phishing link and types their password into a convincing fake login page', 'No', 'The connection is an ordinary allowed outbound web request; the firewall has no rule against visiting a web address and cannot see what the person types into it'],
      ['Stolen data is quietly sent out over an encrypted connection to an attacker\'s server', 'Not without additional tools', 'The firewall can allow or deny based on the destination and port, but cannot see the encrypted payload content without a separate inspection tool built for that'],
      ['An authenticated employee misuses their own legitimate access to copy files they should not', 'No', 'The traffic comes from an authorized account on an allowed connection; a firewall does not evaluate identity or intent once a connection is permitted'],
      ['Malware arrives on an infected USB drive plugged directly into an internal computer', 'No', 'The malware never crosses the network boundary the firewall watches, so it never generates traffic for the firewall to evaluate'],
    ],
  ),

  H.h2(SECTIONS[4]),
  H.p('None of this makes a firewall a weak control. It reliably closes off an entire category of attack, the outside attempt to reach something it has no business reaching, and it does that job automatically and consistently at scale in a way that would be impossible to do by hand. The mistake is treating a firewall as a complete defense rather than as one control among several, each of which covers a gap the others leave open.'),
  H.p('That is the actual definition of defense in depth: layering multiple, different controls so that a category of attack one control cannot see is still caught by another. A firewall covers the network boundary. Network segmentation, covered in full in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-network-segmentation">the companion guide on segmentation</a>, limits how far a compromise can travel once something does get past that boundary or start inside it. Access control limits what an authenticated account can actually do, closing the insider misuse gap a firewall cannot see. User awareness of the kind covered in the guide on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-phishing-deep-dive">phishing</a> is what actually stands between a convincing fake login page and a stolen password, since the firewall was never positioned to make that call. No single one of these controls is redundant with the others, because each one is answering a different question that the rest cannot answer on their own.'),
  H.p('A scenario question on this exam is often testing exactly this: it describes an incident, and the correct answer is naming which control would have actually addressed it, rather than reaching for the most familiar sounding security term in the list. A firewall is the right answer when the scenario describes an attempt to cross a network boundary based on address or port. It is almost never the right answer when the scenario describes a person being deceived, a legitimate account being misused, encrypted content being read, or a device being compromised by something that never touched the network edge at all.'),
  H.box('warn', 'The mistake to watch for on a scenario question', '<p>A firewall being present and correctly configured does not mean an incident described in a scenario could not happen. Read for where the attack actually crossed a boundary, if it crossed one at all. A well configured firewall stopping unsolicited inbound connections says nothing about whether the same organization is protected from a phishing email, an encrypted exfiltration channel, an insider, or a USB drive, because none of those cross the boundary a firewall is watching.</p>'),

  H.h2('Two practice questions in the real format'),
  H.p('Both are written the way the exam writes them, scenario first, decision second. Work through each stem before opening the answer.'),
  H.mcq({
    n: 1,
    stem: 'A small business configures its network firewall to deny all inbound connections from the internet by default, with a single allow rule permitting inbound traffic to its public web server on the standard web port. An attacker on the internet scans the business\'s network and attempts to open a direct connection to an internal payroll workstation that has no allow rule associated with it. What happens to this connection attempt?',
    options: [
      'It succeeds, because the workstation is on the same network as the web server',
      'It is denied at the firewall, because no allow rule matches a destination of the payroll workstation',
      'It succeeds, because outbound web traffic from the workstation was allowed earlier in the day',
      'The firewall cannot evaluate the attempt, because it only inspects traffic addressed to the web server',
    ],
    correct: 1,
    why: 'A default deny firewall blocks any inbound traffic that does not match a specific allow rule, regardless of what else exists on the same network. The single allow rule described applies only to traffic addressed to the web server on the standard web port, and it does not extend to the payroll workstation just because both devices sit on the same network. Since no rule permits inbound traffic to the workstation, the connection attempt is denied at the boundary by default, which is exactly the scenario a firewall is designed to handle: an outside attempt to reach a destination and port with no matching allow rule.',
  }),
  H.mcq({
    n: 2,
    stem: 'A hospital\'s firewall is configured correctly, denying all unsolicited inbound traffic except to a small set of explicitly allowed servers. A billing department employee receives an email that appears to be from the hospital\'s IT department, asking her to confirm her account by logging in through a linked page. She clicks the link and enters her real username and password into the page, which is actually operated by an attacker. The firewall does not flag or block this at any point. Which statement best explains why?',
    options: [
      'The firewall is misconfigured and should be reviewed immediately',
      'The connection to the attacker\'s page is an ordinary outbound web request that matches no rule the firewall is set up to block, and the firewall has no way to evaluate whether a page or the credentials typed into it are legitimate',
      'Firewalls only inspect inbound traffic, so any outbound connection is automatically invisible to them regardless of configuration',
      'The employee\'s device must already be infected with malware for this outcome to be possible',
      'This proves stateful inspection failed, since the firewall should have remembered the phishing email arriving earlier',
    ],
    correct: 1,
    why: 'Nothing about the described firewall is misconfigured. The employee\'s browser making an outbound request to a web address, and a login form on that page receiving typed credentials, is not traffic that violates any address or port based rule; it looks identical, from the firewall\'s perspective, to any other outbound page visit. A firewall evaluates where traffic is going and on what port, not whether the destination page is a convincing fake or whether the information a person types into it should have been kept private. That evaluation is simply outside what the tool was ever built to do, which is exactly why phishing succeeds against networks with a correctly working firewall. No infection is required for this outcome, outbound filtering is a separate and unrelated design choice from this scenario, and stateful inspection tracks connection state, not email content from earlier in the day.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What does a firewall actually filter traffic on?', a: 'A firewall evaluates traffic against rules written in terms of specific, checkable criteria, most commonly the source address, the destination address, and the port number the traffic is trying to use. Traffic that matches an allow rule crosses the boundary; traffic that matches no allow rule is denied by default on a well configured firewall.' },
    { q: 'What is the difference between packet filtering and stateful inspection?', a: 'A packet filtering firewall judges each packet in isolation against a static rule set, with no memory of prior traffic. A stateful firewall tracks which connections are already open and automatically allows replies that belong to a connection a device inside the network started, while still holding unrelated new attempts to the stricter default deny rule.' },
    { q: 'Can a firewall stop a phishing attack?', a: 'Generally no. A phishing attempt that gets a person to visit a fake page and type in credentials looks, at the level a firewall evaluates, like an ordinary allowed outbound web connection. A firewall has no rule against visiting a web address and no way to judge whether the page on the other end is a convincing fake, which is why phishing is covered separately as a recognition skill rather than a network filtering problem, in the companion guide on phishing.' },
    { q: 'Does a firewall protect against malware brought in on a USB drive?', a: 'No. A firewall only evaluates traffic that crosses the specific network boundary it is positioned to watch. Malware carried in physically on a USB drive and run directly on a device inside the network never generates any traffic at that boundary, so there is nothing for the firewall\'s rules to inspect or block.' },
    { q: 'Is having a firewall enough on its own?', a: 'No, and treating it as complete protection is the actual mistake this guide is warning against. A firewall reliably closes off unauthorized attempts to cross a network boundary, but it has no visibility into phishing, encrypted payload content, an already authenticated insider misusing legitimate access, or anything that never crosses its boundary at all. Those gaps are exactly why defense in depth layers a firewall together with other controls, such as network segmentation and access control, rather than relying on any single one.' },
  ]),

  H.p('Firewalls sit inside the same <a href="/pages/ap-cybersecurity-curriculum">Unit 3 material on securing networks</a> as segmentation and access control, and a scenario question testing this idea usually wants the student to name specifically what a firewall would and would not have prevented, which is exactly the skill built out on <a href="/pages/ap-cybersecurity-practice-exam">the practice exam</a>.'),
  H.cta({
    heading: 'Practice naming the right control for the right gap',
    body: 'Unit 3 keeps testing the same underlying skill in different scenarios: recognizing when an incident describes a firewall gap, a segmentation gap, or an access control gap, and reasoning through what each control actually would and would not have prevented.',
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
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed September 22, 2026.'),
]);

module.exports = { meta, body };
