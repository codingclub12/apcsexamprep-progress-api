'use strict';
// Weekly course post: AP Networking. Evergreen concept explainer targeting the
// huge general-audience search term "dns explained," written as the natural
// sequel to the IP address piece: a domain name is not an address, DNS is the
// lookup that gets you from one to the other. Doubles as precise AP Networking
// Unit 2 content on name resolution and the diagnostic value of that symptom.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'DNS explained: why one site is down and everything else looks fine',
  'What DNS actually does: turning a name into an address',
  'The phonebook you already understand',
  'The tell: a numeric address that still works',
  'What real connectivity failure looks like instead',
  'Why flushing DNS is sometimes real advice',
  'Two scenarios, worked the exam way',
];

const meta = {
  title: 'DNS Explained: The Thing That Breaks When Nothing Else Has',
  handle: 'ap-networking-dns-explained',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'dns explained',
  publishOn: '2026-08-25',
  seoTitle: 'DNS Explained: Why One Site Won’t Load',
  seoDescription: 'DNS explained in plain language: what it does, why a working numeric address next to a broken domain name points straight at it, and what flushing DNS means.',
  summary: 'A plain language explanation of what DNS is and does, using a phonebook analogy grounded in the actual mechanics of a DNS query and resolver. Covers the specific symptom pattern of a DNS failure, how it differs from a genuine connectivity failure, and why flushing DNS is sometimes real troubleshooting advice.',
  tags: ['AP Networking', 'DNS', 'Networking Basics', 'Unit 2', 'Concept Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('One site refuses to load while everything else on your network works perfectly, which feels like your computer is broken even though it almost certainly is not. This is DNS explained clearly: what actually breaks when this happens, and why the oddly narrow symptom is itself the clue.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 25, 2026', updated: 'August 25, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Here is a scenario almost everyone has lived through. You open a browser, type in a site you visit all the time, and get a vague error: the page will not load, or the connection times out, or the browser tells you the site cannot be found. Naturally you assume the whole internet is having a bad moment, so you check something else. A different tab loads instantly. Your phone, on the exact same wifi, opens the same site with no trouble at all. Streaming video keeps playing without a hiccup. Every other signal says the network is fine, and yet the one thing you actually wanted to do still will not work.'),
  H.p('That combination is what makes this failure mode so confusing rather than merely annoying. A total outage is at least legible: nothing works, so you know the problem is big and probably not yours to fix personally. This is the opposite. Everything works except the one specific thing you are looking at, which makes it feel personal, unexplainable, and hard to even describe to someone helping you troubleshoot it. This is DNS explained the way it actually needs to be explained: not as a trivia term, but as the answer to exactly this symptom.'),
  H.box('key', 'The one sentence version', '<p>DNS is the system that turns the domain name you type into the numeric address your device actually needs to connect. When DNS fails, that one translation step breaks while the rest of your connection stays completely healthy, which is why the failure looks so oddly narrow.</p>'),

  H.h2(SECTIONS[1]),
  H.p('If you have read our piece on what an IP address actually is, part of our <a href="/pages/ap-networking">AP Networking course guide</a>, you already know the key fact that makes DNS make sense: a domain name is not itself an address. Your device does not connect to a website using its name at all. It connects using a numeric address, the same kind of number covered in that piece, because that number is the only thing a network actually knows how to route traffic to. A domain name is something else entirely: a human-friendly label that means nothing to the machinery underneath it.'),
  H.p('That gap between the name you type and the number your device needs is exactly what DNS closes. DNS stands for Domain Name System, and its entire job is translation. When you type a domain name and hit enter, your device does not send that name out onto the network. It first sends what is called a DNS query, a request that essentially asks "what numeric address belongs to this name," out to a DNS server, sometimes called a resolver, whose whole purpose is answering that exact question. The resolver looks up the name, finds the numeric address associated with it, and sends that address back. Only then does your device use that address to actually connect to the site you wanted.'),
  H.p('This happens before almost anything else, on almost every request, and it happens automatically. You never see the query or the answer come back. You type a name, a brief lookup happens behind the scenes, and a page appears. The lookup step is invisible right up until it fails, which is exactly why the resulting symptom is so confusing: you never noticed DNS working correctly a thousand times before, so you have no mental model for what it looks like when it stops.'),

  H.h2(SECTIONS[2]),
  H.p('The clearest way to make this concrete is a comparison almost everyone already has an intuition for: the contacts list on a phone. You do not dial raw phone numbers from memory anymore. You tap a name, your friend\'s name, and the phone quietly looks up the actual number tied to that name and places the call using the number, not the name. The name is there for you. The number is what the phone system actually needs to route the call.'),
  H.p('DNS is that same lookup, running for domain names instead of phone contacts. You type a name because a name is what a human can remember and recognize. Behind that name, a query goes out, a DNS server looks the name up the same way your phone looks up a contact, and it hands back the numeric address that the network actually uses to make the connection. The name never touches the wire. Only the number does.'),
  H.box('tip', 'Where the comparison holds exactly', '<p>A saved contact can go stale if a friend gets a new number and your phone still has the old one, and calls start failing until the entry updates. DNS can go stale the same way: a domain name can end up pointing at an out of date or incorrect address until the record catches up. The mechanism is the same lookup-and-translate idea in both cases, just running for phone numbers in one and network addresses in the other.</p>'),
  H.p('The comparison is useful precisely because it does not oversimplify anything. A phone lookup genuinely is a name-to-number translation performed by a system sitting between you and the actual call, exactly the same shape as a DNS query sitting between a typed name and an actual network connection. Once that clicks, the rest of how DNS behaves, including how it fails, stops being mysterious.'),

  H.h2(SECTIONS[3]),
  H.p('Now go back to the opening scenario with that mechanism in mind, because it explains the symptom precisely. Suppose the site that will not load has a numeric address you can test directly, and when you connect to that same service using its raw numeric address instead of its name, it works. The page loads. The connection succeeds. Nothing about the underlying service or your path to it is broken at all.'),
  H.p('That single detail, a working numeric address paired with a domain name that will not resolve, is the tell. It narrows the problem down to one specific step rather than leaving it vague. Think through what a successful numeric connection actually proves:'),
  H.ul([
    'Your device has a working network connection, since it successfully sent and received data',
    'The destination server is up and reachable, since it responded correctly',
    'Nothing in between, no broken cable, no dead wifi link, no unreachable router, is blocking the path',
  ]),
  H.p('Every one of those things has to be true for a numeric connection to succeed. The only step that differs between the numeric attempt that worked and the named attempt that failed is the translation step: turning the name into that same numeric address in the first place. If everything downstream of that step is confirmed working, and only the step itself failed, the step itself is where the problem lives. That is what makes DNS failure diagnosable rather than just confusing: the numeric test isolates the one variable that changed.'),

  H.h2(SECTIONS[4]),
  H.p('It helps just as much to know what the alternative looks like, because the contrast is the whole diagnosis. A genuine connectivity failure, your device actually losing its network path rather than losing name resolution, does not spare the numeric address. If the underlying connection is down, typing a numeric address fails exactly the same way the domain name did, because both attempts depend on the same broken path underneath them. Email stops working. Other apps that talk to the network stop working. Nothing loads by name and nothing loads by number either, because the failure sits below DNS, in the connection DNS itself depends on to even send its query.'),
  H.p('That is the pattern to hold onto: a DNS problem is narrow by nature, breaking name-based requests while numeric ones keep working, and a genuine connectivity problem is broad by nature, breaking everything regardless of whether a name or a number was used. Reasoning from what still works to eliminate what cannot possibly be broken is the actual method behind good troubleshooting, and this single test, name versus number, is one of the fastest ways to run it.'),
  H.box('warn', 'A common mix-up', '<p>It is tempting to treat "my internet is down" as one single failure state, but it almost never is. A router that has lost its own connection to the wider internet, a device that failed to get any address at all, and a device that has a fine connection but a broken DNS lookup are three different problems that happen to produce similar first impressions. The numeric-address test is what tells them apart in seconds instead of guessing.</p>'),

  H.h2(SECTIONS[5]),
  H.p('One more piece completes the picture without needing a deep dive: DNS answers get remembered for a while rather than looked up fresh on every single request. Your device, and often other points along the path, keep a short-term local copy of recent DNS answers so that revisiting the same site does not require repeating the full lookup every time. This is DNS caching, and it is a reasonable design choice, not a flaw. Constantly repeating an identical lookup would be wasteful when the answer almost never changes moment to moment.'),
  H.p('The catch is that a cached answer can occasionally be wrong for a little while, if the real answer changed after the cache saved its copy, or if a bad answer got cached in the first place. This is the actual reason "flush your DNS cache" is legitimate troubleshooting advice rather than folklore passed around without understanding: flushing clears that local memory and forces a completely fresh lookup instead of trusting whatever answer was already stored. It is a small, specific fix for a small, specific failure mode, and it is worth knowing that it exists even without tracing through exactly how long an answer sticks around or how a cache decides when to expire it.'),

  H.h2(SECTIONS[6]),
  H.p('Both of the following are written the way AP Networking frames a scenario: a short situation, then a decision, reasoning from the evidence given rather than from a guess.'),
  H.mcq({
    n: 1,
    stem: 'A student\'s laptop can reach a website by typing its numeric IP address directly into the browser, and the page loads normally. Typing the site\'s domain name instead returns an error saying the site cannot be found. Every other device on the same wifi network loads that same site by name without any trouble. What does this pattern point to?',
    options: [
      'The website itself is down for everyone',
      'The laptop has lost its wifi connection entirely',
      'The laptop is failing to resolve that domain name to an address, most likely a DNS problem specific to that one device',
      'The laptop\'s own numeric address is misconfigured',
    ],
    correct: 2,
    why: 'The numeric connection succeeding rules out the website being down, since it responded correctly, and it rules out the laptop losing its wifi connection, since data was successfully sent and received. It also rules out a misconfigured address on the laptop itself, since an outbound connection worked. The only step that differs between the successful numeric attempt and the failed named attempt is translating the name into that same address, and since every other device on the identical network resolves that name correctly, the problem is isolated to DNS resolution on this one laptop specifically.',
  }),
  H.mcq({
    n: 2,
    stem: 'A different student reports that nothing loads today: no site opens by name, no site opens by its numeric address either, and email on the same device has also stopped working. A classmate suggests this is a DNS problem. Is that the best explanation?',
    options: [
      'Yes, because DNS failures always affect every app on a device at once',
      'No, because a DNS failure would still allow numeric addresses to connect; failing numeric addresses points to a broader connectivity problem instead',
      'Yes, because DNS is required for numeric connections just as much as named ones',
      'It cannot be determined without restarting the device first',
    ],
    correct: 1,
    why: 'DNS only handles translating a name into a numeric address. A device with a working network path but a broken DNS lookup can still connect successfully using a numeric address directly, since that step never involves DNS at all. Here, numeric addresses are failing too, along with email and every other network app, which means the failure sits below DNS, in the actual network connection that DNS itself would need in order to even send a query. That is a broader connectivity failure, not a narrow DNS one, and the fix belongs at that lower level instead.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is DNS in simple terms?', a: 'DNS is the system that translates the domain name you type into the numeric address your device actually needs to connect to a site or service. It works like the contacts list on a phone, turning a name you can remember into the number the system underneath actually uses.' },
    { q: 'Why does a website work when I type its numeric address but not when I type its name?', a: 'Because those two attempts test different things. A working numeric address confirms your connection, the server, and the path between them are all fine. A failing name means only the translation step from name to address, which is DNS, is broken. Everything else checked out.' },
    { q: 'What does flushing DNS actually do?', a: 'Your device keeps a short-term local copy of recent DNS answers so it does not have to look up the same name every single time. Flushing DNS clears that local copy and forces a completely fresh lookup, which fixes problems caused by an outdated or incorrect cached answer.' },
    { q: 'Is DNS the same thing as my IP address?', a: 'No. Your IP address is the numeric location DNS looks up on your behalf. DNS is the lookup system itself, the thing that connects a domain name to that numeric address. They are two different pieces of the same overall picture.' },
    { q: 'Why does DNS matter for AP Networking?', a: 'DNS is core Unit 2 content, and the diagnostic pattern in this piece, using what still works to isolate what broke, is exactly the reasoning AP Networking scenario questions are built around. Recognizing the numeric-works, name-fails pattern is a skill the exam tests directly.' },
  ]),

  H.cta({
    heading: 'DNS is core territory in AP Networking',
    body: 'From a single device\'s address to the lookups and protocols that connect it to everything else, the course builds this reasoning one topic at a time, matched to the College Board framework.',
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
  H.updatedNote('Reviewed for accuracy and clarity on August 25, 2026.'),
]);

module.exports = { meta, body };
