'use strict';
// Weekly course post: AP Networking. Drill piece teaching the diagnostic
// method behind the Troubleshoot skill, using real wifi problems as the
// vehicle. Targets a general-audience search term while doubling as direct
// exam-scenario prep.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'How to troubleshoot wifi: the instinct that fails you first',
  'The actual method: use what still works to eliminate causes',
  'Worked scenario one: one laptop cannot reach anything',
  'Worked scenario two: wifi is fine, one site is not',
  'Your first three questions, every time',
  'Why this is exactly what AP Networking tests',
];

const meta = {
  title: 'How to Troubleshoot Wifi: Eliminate, Do Not Guess',
  handle: 'ap-networking-troubleshooting-method',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'how to troubleshoot wifi',
  publishOn: '2026-08-18',
  seoTitle: 'How to Troubleshoot Wifi: A Real Method',
  seoDescription: 'Learn how to troubleshoot wifi the way a network technician does: use what still works to eliminate causes, worked through two real scenarios step by step.',
  summary: 'Most people troubleshoot wifi by restarting things at random. This piece teaches the actual method: use what still works to eliminate possible causes, walked through two fully worked scenarios, and connected directly to how AP Networking builds its scenario questions.',
  tags: ['AP Networking', 'Troubleshooting', 'Study Skills', 'Course Guide', 'Wifi'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Restarting the router sometimes fixes wifi by accident. It teaches you nothing, and it fails the moment the problem is not the simplest one on the list. There is a better method, and it happens to be the exact skill AP Networking spends a full course teaching.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('If you want to know how to troubleshoot wifi, the honest first step is admitting that most people do not troubleshoot at all. They retry. Restart the router, forget the network and rejoin it, restart the router again, and if none of that works, call someone. That is not a method. It is a small set of fixes applied in a fixed order regardless of what the symptom actually is, and it only ever succeeds when the problem happens to be one of the two or three things on that short list.'),
  H.p('This piece teaches the actual method: reason from evidence to eliminate causes, rather than guessing from the symptom alone. It is the single most useful diagnostic habit you can build, it works on far more than wifi, and it is also, not coincidentally, the exact reasoning pattern that AP Networking\'s exam scenarios are built to test.'),

  H.h2(SECTIONS[0]),
  H.p('Restarting a device works, when it works, because a lot of small software problems clear themselves on a fresh boot. A phone stops seeing a network because of a stuck driver state, a router gets confused after weeks of continuous uptime, and a restart happens to fix both. That is a real category of failure and restarting is a real fix for it.'),
  H.p('The trouble is that restarting is not a diagnosis, it is a shot in the dark that happens to hit one specific kind of problem. It does nothing for a wrong password, nothing for a device that has quietly fallen off the guest network, nothing for an internet outage upstream of your router, and nothing for a single website that is simply down on its own end. Restart-first troubleshooting treats every symptom as if it has the same cause, and most of the time it does not.'),
  H.box('warn', 'The tell that you are guessing, not troubleshooting', '<p>If your next step would be the same regardless of what just happened, you are not using the evidence in front of you. A real diagnostic step should depend on what the last one showed. If it does not, you are pattern matching against past fixes rather than reasoning about this failure.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The method that actually works starts from a different question. Instead of asking what is broken, ask what still works. Everything nearby that is still functioning correctly rules out an entire category of possible cause, and a short list of things ruled out is worth far more than a guess at what remains.'),
  H.p('In practice this means checking three kinds of evidence before you touch a single setting.'),
  H.ul([
    '<strong>Scope.</strong> Is this one device, or every device on the network? If your laptop cannot connect but your phone connects fine to the same network, the router and the internet connection are both working, and the problem lives on the laptop specifically.',
    '<strong>Reach.</strong> Can the failing device reach some things but not others? A device that loads some websites but not one particular site has a working connection and a problem with that one destination, not with your network.',
    '<strong>An alternate path.</strong> Does a wired connection work when wifi does not? Does the same device work fine on cellular data when it fails on wifi? Switching the path while holding the device constant isolates whether the fault is in the wireless link specifically or in something further upstream.',
  ]),
  H.p('Each of those checks takes seconds and each one eliminates a whole branch of possible explanations. That is the entire method: gather a small amount of evidence about what is still working, use it to cross explanations off the list, and only then act on whatever survives.'),
  H.box('key', 'The one sentence version', '<p>Do not ask "what is broken." Ask "what still works," and use the answer to rule things out before you try to rule anything in.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Symptom: a laptop that connected fine yesterday now shows the wifi network in its list but will not connect to it, showing an error after several seconds of trying.'),
  H.p('Three plausible causes worth considering before touching anything: the wifi password changed or was mistyped, the router itself is down or malfunctioning, or something changed on the laptop\'s network settings specifically.'),
  H.p('Now the evidence. A second device, a phone, connects to the same network without any trouble. That single fact rules out the router being down and rules out the password having changed, because if either of those were true the phone would fail too. What survives is the third explanation: something specific to the laptop. From there, checking whether the laptop remembers a saved but outdated password for that network, or has landed on the wrong wifi profile after a settings change, points straight at the fix, which is forgetting the saved network on the laptop and rejoining it fresh.'),
  H.p('Notice what happened in that reasoning. The phone connecting successfully was not a side note, it was the decisive piece of evidence. It did the elimination work that guessing never could, because it directly tested two of the three candidate causes at once and cleared both.'),

  H.h2(SECTIONS[3]),
  H.p('Symptom: a laptop is connected to wifi, shows full signal strength, and can load most websites normally, but one particular site will not load and just times out.'),
  H.p('Three plausible causes: the wifi connection itself is unstable, the router or internet service is having a problem, or something specific to that one site is the issue.'),
  H.p('The evidence here is what the laptop can already do. It is loading other sites over the same wifi connection without trouble, which rules out the wifi link and rules out the router and the broader internet connection at the same time, because both of those would affect every site, not just one. A general router or internet problem does not selectively spare every site except one. What remains is a cause local to that one destination: the site itself could be down, a DNS record for it could be misconfigured somewhere upstream of you, or a security filter on the network could be blocking that address specifically.'),
  H.p('A quick further test separates even those: trying the same site on cellular data instead of wifi. If it loads over cellular, the problem lives somewhere in your network path or your DNS resolution and not with the site itself. If it fails on cellular too, the site is the common factor across two completely different networks, which points at the site being down rather than anything on your end.'),
  H.p('Again, the pattern is elimination, not detection. Every other site loading was the evidence that ruled out the network as a whole. Trying an entirely different connection method was the evidence that separated the two remaining explanations.'),

  H.h2(SECTIONS[4]),
  H.p('You will not remember a six-step framework at 11pm when your wifi drops. You will remember three questions.'),
  H.box('tip', 'Your first three questions when wifi breaks', '<ol><li><strong>Is it this device, or every device?</strong> Check a second device on the same network before you touch anything else. This single check does more elimination work than anything else on this list.</li><li><strong>Did anything change recently?</strong> A new device joined, a software update installed, a router setting was touched, a bill went unpaid. A failure that starts right after a change is usually caused by that change.</li><li><strong>Does a different connection method work?</strong> Try wired if you normally use wifi, or cellular data if you normally use wifi on the same device. Whatever changes between a working attempt and a failing one is where the fault lives.</li></ol>'),
  H.p('Ask those three before you restart anything. Most of the time the answers alone will tell you which category the problem is in, and only then does trying a specific fix make sense.'),

  H.h2(SECTIONS[5]),
  H.p('If you are studying <a href="/pages/ap-networking">AP Networking</a>, everything above is not a metaphor for the exam, it is a direct description of it. Troubleshoot is the skill the course is built around, and the <a href="/pages/ap-networking-exam">exam</a> tests it by giving you a scenario with a symptom, several candidate explanations, and enough surrounding evidence to rule most of them out.'),
  H.p('The pattern to watch for is specific and it shows up constantly: the exam offers you a dramatic, alarming explanation alongside a mundane, unglamorous one, and the evidence in the scenario is usually there specifically to rule out the dramatic option. A sudden slowdown reads like it might be an attack, but if the scenario tells you no device is sending unusual traffic, that clue is doing exactly the work the phone did in the first worked scenario above: it eliminates the exciting answer and leaves the boring one standing. A connection failure reads like a hardware fault, but if the scenario tells you a different device connects fine, hardware failure across the whole network is already ruled out.'),
  H.p('This is why memorizing facts about protocols and settings is not enough to do well on Troubleshoot questions, and it is also not enough to actually fix your own wifi. What both require is the same habit: read every piece of given evidence as something that eliminates an option, not as background color. A scenario question rarely gives you a fact that does not rule something out. If a sentence in the prompt seems irrelevant, look again, because on this skill the irrelevant sentence is usually the one doing the eliminating.'),
  H.box('key', 'The transfer, stated plainly', '<p>What still works rules out causes. That is true for your home wifi at 11pm and it is true for an AP Networking scenario question at 11am in May. Practising one genuinely builds the other.</p>'),
  H.p('The <a href="/pages/ap-networking">AP Networking course guide</a> covers the full four-unit structure this reasoning sits inside, and the <a href="/pages/ap-networking-exam">exam page</a> breaks down how Troubleshoot and the other three skills are actually weighted.'),

  H.h2('Two questions in the exam style'),
  H.p('Reason through the evidence before opening either answer. Both are built the way the real exam builds them: a symptom, a short list of causes that sound equally plausible on the surface, and evidence that only supports one of them.'),
  H.mcq({
    n: 1,
    stem: 'A household has three devices on the same wifi network. One tablet suddenly cannot load any websites, though it still shows as connected to the network with full signal bars. The other two devices, a laptop and a phone, continue to browse normally on the same network at the same time. What is the most likely cause?',
    options: [
      'The internet service from the provider has gone down',
      'The wifi router has stopped broadcasting correctly',
      'A setting or app on the tablet itself is blocking or misdirecting its traffic',
      'The wifi password was changed without the household noticing',
    ],
    correct: 2,
    why: 'The laptop and phone browsing normally on the same network at the same moment rules out the internet service being down and rules out the router failing, because either of those would affect every device, not just one. It also rules out the password having changed, since the tablet is still shown as connected, which would not be true with a wrong password. What is left, by elimination, is something local to the tablet: a misconfigured setting, a rogue app, or a filter on that one device. Notice that the two working devices did all the eliminating here, exactly the way a second device did in the worked scenarios above.',
  }),
  H.mcq({
    n: 2,
    stem: 'A user\'s laptop wifi connection drops every few minutes throughout the evening, then reconnects on its own each time. The user recently moved their desk next to a microwave oven, which is used daily around dinner time. A technician confirms the router firmware is current and no other devices on the network report any issue. Which explanation best fits the evidence?',
    options: [
      'The router needs a firmware update',
      'The internet service provider is having an outage',
      'Physical interference from the microwave is disrupting the wifi signal near the laptop',
      'The laptop\'s wifi hardware has failed and needs replacing',
    ],
    correct: 2,
    why: 'The firmware being current rules out the first option directly, and no other device reporting a problem rules out both a provider outage and a router-wide fault, since either of those would affect every device on the network rather than just the one near the microwave. Completely failed wifi hardware would not reconnect on its own repeatedly, which weakens that option too. What remains, and what the desk move and dinner-time timing point straight at, is intermittent physical interference from a specific nearby source. This is the pattern to watch for: the scenario hands you a mundane, physical explanation and gives you the evidence to rule out three more dramatic-sounding ones.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'How do you actually troubleshoot wifi instead of just restarting things?', a: 'Start by identifying what still works: does a second device connect fine, does a wired connection work when wifi does not, can you reach some sites but not others. Each answer eliminates an entire category of possible cause, so you end up testing a specific likely explanation instead of retrying the same fixes at random.' },
    { q: 'Why does restarting the router sometimes fix wifi?', a: 'A restart clears a specific category of software glitch on the router or the device, such as a stuck connection state after long uptime. It works for that category and only that category, which is why it fails on anything caused by a wrong password, a dead upstream connection, or a problem with one specific site.' },
    { q: 'Is it my wifi or my internet connection that is the problem?', a: 'Check whether a wired connection or a different device on the same network works. If wired works and wifi does not, the fault is in the wireless link. If nothing works on any device or connection method, the fault is more likely upstream, with the router or the internet service itself.' },
    { q: 'How does this connect to AP Networking?', a: 'Troubleshoot is one of the four skills AP Networking weights its exam around, and the reasoning it tests is exactly this: use the evidence given in a scenario to eliminate implausible causes rather than guessing from the symptom alone. Practising real troubleshooting builds the same habit the exam scenarios require.' },
    { q: 'What is the most common mistake in troubleshooting a network problem?', a: 'Treating every symptom the same way and applying a fixed sequence of fixes regardless of the evidence. The fix is to gather a small amount of evidence first, specifically what still works, and let that evidence determine which explanation is actually plausible before acting.' },
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
  H.updatedNote('Reviewed against the AP Networking course framework current in August 2026. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
