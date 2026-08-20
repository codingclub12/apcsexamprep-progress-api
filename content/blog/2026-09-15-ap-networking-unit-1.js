'use strict';
// Weekly course post: AP Networking. Drill piece scoped specifically to Unit 1,
// Managing My Connections: single device, single network, no multi-hop or
// multi-subnet reasoning required. Complementary to the earlier troubleshooting
// posts on this blog, which teach the elimination method and the ping and
// traceroute tools in general. This one applies that same reasoning to the
// narrower set of symptoms a single device throws when addressing,
// connectivity, or name resolution breaks, grouped by which of those three
// things actually failed. None of the ten scenarios below reuses a specific
// device, network, or root cause already used as an MCQ or worked example on
// this blog's other AP Networking posts.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What AP Networking Unit 1 actually tests',
  'Addressing: when the device never gets a usable address',
  'Connectivity: when the address is fine but nothing gets through',
  'Name resolution: when everything connects except the lookup',
];

const meta = {
  title: 'AP Networking Unit 1: Ten Single-Device Practice Questions',
  handle: 'ap-networking-unit-1-single-device-questions',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking unit 1',
  publishOn: '2026-09-18',
  seoTitle: 'AP Networking Unit 1: Ten Practice Questions',
  seoDescription: 'Ten AP Networking Unit 1 single-device scenario questions grouped by addressing, connectivity, and name resolution, with the reasoning worked out for each.',
  summary: 'Ten single-device practice scenarios scoped to AP Networking Unit 1, grouped into addressing, connectivity, and name resolution, each worked through with the same evidence-based reasoning the exam rewards. Two are presented as fully interactive practice questions and the rest as worked scenario walkthroughs.',
  tags: ['AP Networking', 'Unit 1', 'Practice Questions', 'Study Skills', 'Course Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP Networking Unit 1 lives entirely at the level of one device on one network: does it have an address, does that address actually get traffic through, and can it turn a name into an address in the first place. Here are ten scenario-style practice questions scoped to exactly that, grouped by which of those three things broke, with the reasoning walked through for each.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 15, 2026', updated: 'September 15, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.p('Most of the AP Networking practice on this blog so far has covered general method: how to <a href="/blogs/ap-networking/ap-networking-troubleshooting-method">eliminate causes instead of guessing</a>, how to read what a scenario question is actually asking, and how tools like ping and traceroute let you generate evidence instead of waiting for it. This post is narrower on purpose. AP Networking Unit 1, called Managing My Connections, stays at the level of a single device and a single network the whole way through, so this is a set of ten practice scenarios that stay there too, no multi-hop paths and no comparing several failing devices across a building. Just one device, one network, and a symptom that fits into one of three buckets.'),
  H.p('Those three buckets are addressing, connectivity, and name resolution, and they are worth separating cleanly in your head before you look at a single option on an exam question, because each one points to a genuinely different part of the picture. An addressing problem means the device never got a usable identity on the network in the first place. A connectivity problem means the device has a perfectly good address but traffic still is not making it through. A name resolution problem means the device is connected and addressed correctly and the only thing failing is turning a typed name into the number the network actually needs. Mixing those three up, treating a name resolution symptom as if it were an addressing symptom, is one of the fastest ways to pick a technically reasonable answer that is aimed at the wrong layer entirely.'),

  H.h2(SECTIONS[0]),
  H.p('Unit 1 questions almost always follow the same shape: a device, a symptom, a small amount of surrounding evidence, and a question about what is actually going on or what to check. What makes them approachable once you have practiced enough of them is that the surrounding evidence usually does real work if you read it carefully, the same elimination habit the earlier posts on this blog teach in more general form. A device that shows a signal icon is not automatically connected. A device that can reach a numeric address is not automatically able to reach anything by name. Each scenario below leans on a small, specific detail like that, and the reasoning column exists to show exactly which detail is doing the eliminating.'),
  H.p('Work each one through before reading the reasoning, the same way you would want to work an actual exam question: read the whole scenario first, decide what bucket it belongs to, and only then think about what the evidence rules out.'),

  H.h2(SECTIONS[1]),
  H.p('An addressing failure means the device itself never successfully obtained, or never correctly holds, a usable identity on the network. This is the layer underneath everything else, so it is worth checking first whenever a device looks disconnected in a way that feels more total than a single broken destination. Our piece on <a href="/blogs/ap-networking/ap-networking-ip-address-explained">what an IP address actually is</a> covers what that identity means and why a private address only has to be unique on its own network, which is worth having settled before working through the three scenarios below.'),

  H.h3('The library Chromebook with the self-assigned address'),
  H.p('A school library Chromebook shows it is connected to the school wifi network, with full signal bars and the correct network name. A banner in the corner reads limited connectivity. Checking the device network details shows its address starts with 169.254. Every other Chromebook on the same cart, connected to the same network at the same time, has a normal address and full internet access.'),
  H.mcq({
    n: 1,
    stem: 'Given the evidence above, what is the best explanation for the Chromebook showing limited connectivity with an address starting with 169.254?',
    options: [
      'The school wifi network itself is down for every device',
      'The Chromebook associated to the wifi network but never successfully received an address from the network, so it fell back to a self-assigned placeholder address',
      'The Chromebook has a duplicate address that conflicts with another device on the network',
      'The Chromebook is connected correctly and the limited connectivity banner is a false alarm that can be ignored',
    ],
    correct: 1,
    why: 'Every other Chromebook on the same cart working normally at the same moment rules out the wifi network itself being down, since a network-wide failure would affect all of them, not one. An address starting with 169.254 is not a normal network address at all. It is the specific placeholder range a device assigns itself when it can associate to a wifi network but does not receive a real address back from the network in time, which is exactly what the limited connectivity banner is reporting rather than a false alarm. That rules out a duplicate address too, since a duplicate conflict would show up as a normal-looking address with a conflict warning, not a self-assigned placeholder. The device is connected to the radio signal but has not actually joined the network in any functional sense.',
  }),

  H.h3('The two desktops that both claim the same address'),
  H.p('A small office manually assigns static addresses to two desktop computers instead of letting the network hand them out automatically. Both machines are typed in as ending in the same last number by mistake. Within minutes, both desktops start dropping their connection intermittently, and one of them displays a warning that its address is already in use elsewhere on the network.'),
  H.p('Two devices holding the identical address on the same network is not a survivable state, and the intermittent drops are the visible symptom of that clash rather than a coincidence. Unlike two devices on two completely separate home networks that happen to share a private address, which causes no conflict at all because each network only has to keep its own addresses unique, these two desktops are on the same network at the same time, so the network genuinely cannot tell them apart. The fix is not restarting either machine. It is correcting the manual entry so the two addresses are different, the same way two people cannot share one seat assignment on the same flight even though two different flights can reuse the same seat number without any issue.'),

  H.h3('The printer that answers on paper but not on the network'),
  H.p('An office printer is given a manually configured static address that looks correct at a glance, but whoever set it up typed the subnet mask incorrectly, entering a much narrower mask than every other device on the same network uses. Nobody in the office can print to it wirelessly, though the printer itself powers on normally and its own display shows it as connected.'),
  H.p('The address looks fine, which is exactly what makes this one deceptive. The subnet mask is what tells a device which portion of an address represents the shared network and which portion represents the individual device, and a mask that does not match everything else on that network makes the printer misjudge which devices actually count as its neighbors. From the printer\'s point of view, computers that are genuinely on the same network can end up looking like they belong to some other network entirely, so the printer never answers their requests the normal way. The address itself did not need to change here. The mask, which defines what that address actually means, was the part that was wrong.'),

  H.h2(SECTIONS[2]),
  H.p('A connectivity failure is different in kind from an addressing failure. The device has a legitimate, working address, and the network in front of it has not rejected it. Something after that step is where traffic actually stops.'),

  H.h3('The laptop that reaches everything nearby and nothing far'),
  H.p('A laptop on a small office network has a valid, unique address in the correct range, confirmed by checking its network settings directly. It can reach every other device on that same local network, the file server, the printer, a coworker\'s desktop, all without any trouble. Every other computer on the same office network can browse the internet normally. This one laptop cannot load a single external website, and pinging any address outside the local network fails immediately, while pinging local devices succeeds instantly every time.'),
  H.mcq({
    n: 2,
    stem: 'Based on the evidence, what should be checked first on this laptop?',
    options: [
      'Whether the office router itself has lost its connection to the internet provider',
      'Whether the laptop\'s default gateway setting is present and correct',
      'Whether the laptop\'s wifi hardware has failed',
      'Whether the office\'s internet service provider is having an outage',
    ],
    correct: 1,
    why: 'Every other computer on the same office network browsing normally at the same time rules out the router and the internet service as the cause, since either of those failing would affect every device sharing that connection, not just one laptop. Working wifi and working local connections to the file server and printer rule out failed wifi hardware, since a hardware failure would not let local traffic through cleanly either. What is left is something specific to how this one laptop reaches destinations outside its own local network. Every local address succeeding while every external address fails immediately is the exact pattern a missing or incorrect default gateway produces: the laptop knows how to talk to neighbors directly, but has no correct instruction for where to send anything bound for outside the local network, so those attempts fail before they ever leave the building.',
  }),

  H.h3('The desktop with no light on the jack'),
  H.p('A desktop computer that was working the previous day now shows a no network access icon. Checking the back of the machine, the small status light next to the ethernet jack, normally lit, is completely dark. No other device in the room is affected, since everything else in the room connects over wifi rather than a cable.'),
  H.p('This is the most physical of the ten scenarios here, and it is worth including precisely because it is easy to overlook once a course starts talking about addresses and settings. A dark link light on a wired jack almost always means the physical connection itself, not anything about addressing or configuration, has failed: an unplugged cable, a cable that has come loose enough to lose contact, or in rarer cases a failed port on either end. No software setting on the desktop can fix a connection that is not physically present, which is exactly why this is the one item on this list where the first check has nothing to do with an address, a mask, or a server at all. Reseating or replacing the cable comes before touching any network setting.'),

  H.h3('The phone that never actually joins the network'),
  H.p('A visitor\'s phone is entered by hand onto the guest wifi network after the venue changed its guest password earlier that day without telling anyone. The phone shows an error immediately after attempting to join, rather than connecting and then failing later, and it never displays a signal icon as connected to that network at all.'),
  H.p('The detail that matters here is timing. This device fails before it ever associates to the network, not after. That distinguishes it clearly from the Chromebook earlier in this post, which did associate successfully and only failed during the later step of getting a usable address. An immediate error at the moment of joining, with no signal icon ever appearing as connected, points at authentication itself failing, in this case a stale password nobody updated on the visitor\'s end. The fix here is not a network setting on the phone at all. It is simply entering the current password, since the phone was never wrong about anything, the credential it was given was.'),

  H.h3('The laptop with no networks listed at all'),
  H.p('A laptop that worked fine on wifi the day before now shows no available networks in its list at all, not even ones from neighboring apartments that used to appear. Every other device in the same room lists networks normally, including the one this laptop is supposed to join.'),
  H.p('When a device cannot see any networks at all, including ones that clearly exist because other devices nearby can see them, the most likely explanation sits below the level of any individual network. A wifi network adapter disabled somewhere in the operating system settings, or a physical wifi switch or key combination toggled off by accident, produces exactly this symptom: not a failure to join one specific network, but a total absence of anything to choose from, because the piece of hardware or software responsible for scanning for networks in the first place is not running at all.'),

  H.h2(SECTIONS[3]),
  H.p('A name resolution failure is the narrowest of the three buckets, and it is also the one most students misdiagnose as something broader than it actually is. The device is addressed correctly and connected correctly. The only thing failing is the lookup step that turns a typed name into the numeric address the network actually needs, the same mechanism covered in more depth in <a href="/blogs/ap-networking/ap-networking-dns-explained">the piece on how DNS actually works</a>.'),

  H.h3('The desktop with one wrong digit in its settings'),
  H.p('A family sets up a desktop computer with a manually entered network configuration instead of letting the router assign settings automatically, and while typing in the address of the DNS server to use, one digit is entered incorrectly. Every website fails to load by name on that desktop. Pinging a known numeric address directly succeeds without any trouble, and pinging the correct DNS server address, typed in by hand, also fails to respond. Every other device in the house, all set up automatically rather than by hand, resolves names and browses normally.'),
  H.mcq({
    n: 3,
    stem: 'What does this evidence point to as the cause of the failure on the desktop?',
    options: [
      'The desktop\'s internet connection to the wider network is down',
      'The websites the desktop is trying to reach are all experiencing an outage at the same time',
      'The desktop is pointed at an incorrect DNS server address, so its name lookups have nowhere valid to go, even though its actual network connection works fine',
      'The desktop\'s network cable or wifi adapter has failed',
    ],
    correct: 2,
    why: 'A successful ping to a known numeric address proves the desktop\'s actual network connection is fully working, which rules out a down connection and rules out failed hardware, since neither of those would allow any numeric traffic through at all. It also makes a coordinated outage across every website extremely unlikely, since the desktop can clearly reach the network fine. What fails specifically is any lookup that depends on the manually typed DNS server address, and that address itself does not even respond when pinged directly, which is consistent with a typo in that one setting rather than anything about the wider network. Every other device in the house, configured automatically instead of by hand, working normally is the detail that confirms the network itself is fine and the fault is isolated to this one manually typed setting on this one desktop.',
  }),

  H.h3('The desktop nobody gave a DNS server to'),
  H.p('A different desktop is set up with a manual, static address, and whoever configured it filled in the address, the subnet mask, and the default gateway correctly, but left the DNS server field completely blank. The desktop can ping numeric addresses on the internet successfully and can reach a shared drive on the local network by its numeric address without any issue. No website loads by name, and there is no error message about a wrong server, since there is no server listed for it to fail to reach.'),
  H.p('This is a quieter version of the previous scenario, and worth telling apart from it. A wrong DNS address at least gives a device something to try and fail against, which sometimes produces a distinct error. A blank DNS field gives the device nothing to try at all, so every name-based request fails immediately with no server to blame, while every numeric request keeps working exactly as before, since numeric traffic never needed that field in the first place. The lesson is the same either way: name resolution is its own separate setting, entirely distinct from the address, mask, and gateway that make the rest of the connection work, and leaving it out breaks only the one thing it is responsible for.'),

  H.h3('The laptop still answering to an address that moved'),
  H.p('A school migrates its student portal to a new server with a new numeric address, and announces the change the same morning. By that afternoon, most students on campus load the new portal without any trouble. One student\'s laptop, which had visited the portal heavily earlier that same morning before the migration, keeps landing on a broken page for a while afterward, then starts working correctly on its own without anyone changing a single setting.'),
  H.p('Devices do not look up the same name fresh every single time. They remember recent answers for a while so they do not have to repeat an identical lookup constantly, and that remembered answer can briefly be out of date immediately after a real change like a server migration. This laptop is not broken and nothing about its configuration is wrong. It is holding onto a locally remembered answer that was accurate that morning and became stale the moment the migration happened, and the problem resolves itself once that remembered answer naturally expires and a fresh lookup replaces it, which is exactly why it cleared up without any setting being touched.'),

  H.h2('Keeping the ten symptoms straight'),
  H.p('Laid out next to each other, the pattern that separates the three buckets is easier to hold onto than any single scenario on its own.'),
  H.table(
    ['Bucket', 'What still works', 'What fails', 'What it points to'],
    [
      ['Addressing', 'The radio signal or cable link itself', 'Getting or holding a real, usable address', 'Something before the device is even a real member of the network'],
      ['Connectivity', 'The address itself, and reaching nearby devices', 'Reaching destinations further away, often outside the local network', 'A path or setting problem after the device has already joined correctly'],
      ['Name resolution', 'Reaching a destination by its numeric address directly', 'Reaching that same destination by typing its name', 'The one lookup step that turns a name into the number the network needs'],
    ]
  ),
  H.p('That single question, does a numeric address work when a name does not, is the fastest way to tell name resolution apart from the other two buckets on an actual exam question, and it is the same check that separated several of the ten scenarios above from each other. Practice sorting a scenario into one of these three buckets before you ever look at the answer choices, the same discipline the earlier post on this blog covers about <a href="/blogs/ap-networking/ap-networking-scenario-question-anatomy">reading what a scenario is actually asking</a>, and a large share of Unit 1 questions get noticeably easier.'),
  H.box('key', 'The one habit worth building from this post', '<p>Before evaluating a single option, decide which of the three buckets the scenario belongs to. An addressing answer to a name resolution question, or a connectivity answer to an addressing question, can sound perfectly reasonable and still be aimed at the wrong layer of the problem entirely.</p>'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What does AP Networking Unit 1 actually cover?', a: 'Unit 1, Managing My Connections, stays at the level of a single device on a single network: what an IP address is, how a device gets one, what makes it reachable, and how a typed name gets turned into the address the network actually needs. It does not require reasoning across multiple hops or multiple subnets, which is why the practice in this post is deliberately scoped to one device at a time.' },
    { q: 'How do I tell an addressing problem apart from a connectivity problem?', a: 'Check whether the device has a normal, valid address in the first place. A self-assigned placeholder address, a missing address, or a conflicting address is an addressing problem. A device with a perfectly normal address that still cannot reach some or all destinations has moved past addressing into a connectivity problem.' },
    { q: 'Why does pinging a numeric address matter so much in these scenarios?', a: 'A successful ping to a numeric address confirms the device\'s actual network path and connection are working, which immediately rules out addressing and connectivity as the cause. If that same device then fails to reach the exact same destination by name, the only remaining explanation is the name-to-address lookup itself, which narrows a vague-sounding symptom down to one specific step.' },
    { q: 'Do I need to memorize DNS server addresses or subnet math for these Unit 1 questions?', a: 'No. Every scenario in this post is solved by reasoning about which layer failed, addressing, connectivity, or name resolution, using the evidence given. That reasoning pattern matters far more on the exam than memorizing specific numbers or performing binary calculations.' },
  ]),

  H.cta({
    heading: 'Build the full Unit 1 skill set, not just ten questions',
    body: 'Managing My Connections builds from a single device\'s address outward, one topic at a time, to the College Board framework.',
    links: [
      { href: '/pages/ap-networking', text: 'Start Unit 1' },
      { href: '/pages/ap-networking-exam', text: 'See the exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed against the AP Networking course framework current in September 2026. Last reviewed September 15, 2026.'),
]);

module.exports = { meta, body };
