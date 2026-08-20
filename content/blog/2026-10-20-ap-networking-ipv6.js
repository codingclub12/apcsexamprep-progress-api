'use strict';
// Weekly course post: AP Networking. Evergreen concept explainer on IPv6,
// written to build directly on the IPv4 foundation post rather than re-teach
// it: this page assumes a reader already knows what an IP address is and why
// private and public addresses differ, and picks up from there with why a
// second addressing scheme exists at all. Doubles as precise Unit 4 content,
// since Managing Our Global Connections is where IPv6 sits in the College
// Board framework.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why IPv6 exists: IPv4 was never built for this many devices',
  'What an IPv6 address actually looks like',
  'IPv6 and Unit 4: Managing Our Global Connections',
  'IPv4 and IPv6 today: coexistence, not replacement',
  'Two questions in the exam style',
];

const meta = {
  title: 'IPv6: Why It Exists and Why Unit 4 Cares',
  handle: 'ap-networking-ipv6-why-it-exists',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ipv6',
  publishOn: '2026-10-21',
  seoTitle: 'IPv6 Explained: Why It Exists, Not Just What It Is',
  seoDescription: 'IPv6 explained from the problem it solves: IPv4 running out of room. What an IPv6 address looks like, why it matters for Unit 4, and why both still run today.',
  summary: 'An explanation of IPv6 that starts from the problem it solves rather than the notation: IPv4 only has room for about 4.3 billion addresses, which is nowhere near enough for a world of billions of connected devices. Covers what an IPv6 address looks like at a glance, how it connects to AP Networking Unit 4, why network address translation was partly a workaround for IPv4 scarcity, and why IPv4 and IPv6 run side by side today rather than one having replaced the other.',
  tags: ['AP Networking', 'IPv6', 'IP Address', 'Unit 4', 'Concept Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('IPv4 is not broken. It is just too small for the world that grew up around it. IPv6 exists to solve exactly that problem, and understanding why it exists explains more about how the internet actually works than memorizing its notation ever will.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 9,
  }),
  H.toc(SECTIONS),

  H.p('Our <a href="/blogs/ap-networking/ap-networking-ip-address-explained">IP address explained</a> guide covers what an IP address is and why your private address and your public address are different numbers. This page assumes you already have that foundation and picks up exactly where it left off: the familiar four-number IPv4 format that guide used as its example is running out of room, and IPv6 is the fix. If the words "private address" and "public address" are not yet familiar, that page is the right place to start before this one.'),
  H.p('IPv6 is not a new invention chasing a trend. It is a direct, deliberate response to a supply problem that was visible to network engineers decades before most people noticed it, and it is squarely College Board territory in AP Networking Unit 4. Here is the problem it solves, what its addresses actually look like, and why your own devices are almost certainly already using both addressing schemes without you noticing either one.'),

  H.h2(SECTIONS[0]),
  H.p('Every IPv4 address is built from 32 bits, written for humans as four numbers between 0 and 255 separated by dots, something like <code>192.168.1.24</code>. That 32-bit design was not a limitation anyone worried about when it was standardized. In the early 1980s, the internet was a research network connecting a modest number of institutions, and a 32-bit address space felt effectively limitless for what anyone could picture the internet becoming.'),
  H.p('Thirty-two bits gives you exactly '
    + H.stat('4,294,967,296 possible addresses, about 4.3 billion', { source: 'IANA IPv4 Address Space Registry', url: 'https://www.iana.org/assignments/ipv4-address-space/ipv4-address-space.xhtml', asOf: '2026-08-20' })
    + '. That sounds enormous until you count what actually needs an address today: not just one computer per household, but phones, tablets, laptops, smart TVs, thermostats, doorbells, game consoles, and school devices issued one per student, often several of those categories per person. A number that looked bottomless in 1983 turned out to have a visible bottom once billions of people each started carrying multiple connected devices at once.'),
  H.box('key', 'The one sentence version', '<p>IPv6 exists because IPv4 physically cannot hand out enough unique addresses for the number of internet-connected devices that exist today, and that shortage was predictable decades before it became urgent.</p>'),
  H.p('This is not a hypothetical or a future risk. The global pool of unassigned IPv4 addresses managed by the Internet Assigned Numbers Authority ran completely dry in 2011, and the regional registries that hand out addresses to internet providers and organizations within their territories have each worked through their own remaining supply on their own timeline since then, some rationing what little remains under strict policy rather than handing it out freely.'),
  H.sourceNote('Number Resource Organization and regional internet registry exhaustion records', 'https://www.nro.net', '2026-08-20'),
  H.p('The industry did not just sit and wait for a bigger address format to arrive. Network address translation, the same private-versus-public split covered in our IP address guide, is itself partly a workaround for this exact shortage. Because NAT lets an entire household or an entire school share one single public IPv4 address while every device behind the router keeps its own private address, one scarce public address can effectively serve dozens of devices instead of just one. It is a genuinely clever patch, and schools and homes still rely on it today, but it is a patch for scarcity rather than a solution to it. IPv6 attacks the actual shortage instead of working around it, which is why the two technologies solve related problems in very different ways.'),

  H.h2(SECTIONS[1]),
  H.p('An IPv6 address is built from 128 bits instead of 32, and the difference in scale is genuinely hard to picture with an ordinary comparison. Rather than working through the exact figure, it helps to reason about it the way computer scientists actually do: doubling the number of bits in an address does not double the number of possible addresses, it squares the previous total and then some, because each additional bit doubles the count all over again. Going from 32 bits to 128 bits is not a modest upgrade. It multiplies the available address space by a number so large that running out again in any realistic future is not a serious concern.'),
  H.p('Concretely, that works out to '
    + H.stat('about 340 undecillion possible addresses', { source: 'American Registry for Internet Numbers (ARIN)', url: 'https://www.arin.net/resources/guide/ipv6/', asOf: '2026-08-20' })
    + ', a number so far past everyday intuition that comparisons tend to reach for things like every grain of sand on every beach on Earth, many times over, just to give it any shape at all. The exact figure matters less than the takeaway: IPv6 was deliberately over-engineered for headroom, precisely because IPv4 taught the people who designed it what happens when an address space is sized for the world as it looks on launch day instead of the world it will actually serve decades later.'),
  H.p('You do not need to write IPv6 addresses fluently to recognize one, and recognizing one is the actually useful skill at this stage. Where an IPv4 address is four short decimal numbers separated by dots, an IPv6 address is written as up to eight groups of hexadecimal digits, meaning digits and the letters A through F, separated by colons rather than dots. A full address looks like <code>2001:0db8:85a3:0000:0000:8a2e:0370:7334</code>. In practice you will more often see a shortened form, where one run of consecutive all-zero groups gets collapsed into a double colon, so that same style of address might appear as something like <code>fe80::1a2b:3c4d:5e6f</code>.'),
  H.box('tip', 'The fast way to tell them apart', '<p>If you see letters in the address, or colons instead of dots separating the groups, you are looking at an IPv6 address. If it is four short numbers between 0 and 255 separated by dots, it is IPv4. That single glance is enough to tell them apart correctly almost every time, long before you could write full IPv6 notation from memory.</p>'),

  H.h2(SECTIONS[2]),
  H.p('AP Networking\'s fourth unit, Managing Our Global Connections, is where the course moves from a single household network out to how the internet actually holds together at scale, including wide area networks, routing across many networks at once, and reliability when traffic has to travel a long way to reach its destination. IPv6 belongs there rather than in an earlier unit because the problem it solves only becomes visible once you are thinking about the internet as a whole, not just the handful of devices connected to one home router.'),
  H.p('The earlier units in the course, and our own <a href="/blogs/ap-networking/ap-networking-router-switch-access-point">router versus switch guide</a>, cover how a router connects your local network to the wider internet and how NAT lets many private devices share one public address. Unit 4 is where the exam expects you to reason about what happens once you zoom out past that single connection: an internet made of an enormous number of separately owned networks, all needing addresses that stay globally unique, at a scale where the IPv4 shortage stops being an abstraction and becomes the actual constraint shaping how internet providers and organizations get connected in the first place.'),
  H.p('Framed that way, IPv6 is not a footnote fact to memorize alongside the notation. It is the course\'s answer to a question Unit 4 is specifically built to ask: what does it take to keep an internet of this size actually working, address by address, as the number of connected devices keeps climbing.'),

  H.h2(SECTIONS[3]),
  H.p('It is tempting to assume IPv6 simply replaced IPv4 once it existed, the way a new phone replaces an old one. That is not what happened, and it is not what is happening now either. IPv4 and IPv6 run side by side across most of the internet today, and that dual-stack arrangement, where a device and a network support both addressing schemes at once, is the practical norm rather than a temporary transition step.'),
  H.p('The reason is straightforward: IPv4 is deeply embedded in existing hardware, software, and infrastructure that still works and that nobody has an urgent reason to rip out. A school network, a home router, and a huge share of the wider internet all still speak IPv4 fluently, alongside a growing amount of IPv6 traffic running in parallel. Your own phone very likely already holds both an IPv4 address and an IPv6 address at the same time, and it quietly picks whichever one gets a given connection through, without you ever choosing or even noticing which one it used.'),
  H.box('warn', 'A common mix-up', '<p>Students sometimes assume that if IPv6 exists and solves the shortage, IPv4 must already be phased out or on its way out imminently. In practice both addressing schemes are expected to coexist for a long time yet, the same way old and new technology often run in parallel for years after a replacement becomes available, simply because replacing infrastructure that already works is slow and expensive at internet scale.</p>'),
  H.p('This coexistence is exactly why NAT has not disappeared even though IPv6 reduces the pressure that made NAT so necessary in the first place. As long as a meaningful share of the internet still runs IPv4, private-to-public address sharing keeps earning its place, and a well-rounded answer on a Unit 4 scenario should reflect that both technologies are doing real work right now rather than treating IPv6 as having already finished the job.'),

  H.h2(SECTIONS[4]),
  H.p('Both of the following are written the way AP Networking frames a scenario: a short situation, then a decision. Work each one through before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'A network engineer is asked why an organization should bother adopting IPv6 at all, given that its existing IPv4 network still works fine day to day. Which of the following best explains the actual problem IPv6 exists to solve?',
    options: [
      'IPv6 addresses transmit data faster across the same physical cables than IPv4 addresses do',
      'IPv4 offers a limited total number of possible addresses, and the number of internet-connected devices worldwide has grown well past what that supply can comfortably support',
      'IPv6 is required for a device to connect to wifi rather than a wired connection',
      'IPv4 addresses are less secure than IPv6 addresses by design',
    ],
    correct: 1,
    why: 'IPv6 exists specifically to solve an address supply problem, not a speed, security, or connection-type problem. IPv4\'s 32-bit format caps the total number of possible addresses at a fixed figure that looked more than sufficient decades ago and does not come close to covering the number of devices online today. IPv6\'s 128-bit format massively expands that supply. Speed and wifi capability depend on entirely different parts of the network, and IPv6 was not designed as a security upgrade over IPv4.',
  }),
  H.mcq({
    n: 2,
    stem: 'A technician is handed a printed list of four addresses and asked to sort them into IPv4 and IPv6 without looking anything up. The list contains: 10.0.0.5, then 2600:1700:65a0:ff20::4d2, then 172.16.254.1, then fe80::1a2b:9c4d. Which two of the four are IPv6 addresses?',
    options: [
      '10.0.0.5 and 172.16.254.1',
      '2600:1700:65a0:ff20::4d2 and fe80::1a2b:9c4d',
      '10.0.0.5 and fe80::1a2b:9c4d',
      'All four addresses are IPv6, written in two different shortened styles',
    ],
    correct: 1,
    why: 'IPv6 addresses are written as hexadecimal groups separated by colons, often with a double colon collapsing a run of zero groups, which is exactly the pattern in 2600:1700:65a0:ff20::4d2 and fe80::1a2b:9c4d. The other two entries, 10.0.0.5 and 172.16.254.1, are four short decimal numbers between 0 and 255 separated by dots, which is the IPv4 pattern. Format alone, colons and hex digits versus dots and decimal numbers, is enough to sort the list correctly without decoding a single address.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Why does IPv6 exist?', a: 'IPv6 exists because IPv4 only supports a limited, fixed number of possible addresses, a number that looked enormous when it was designed in the early 1980s but is nowhere near enough for today\'s billions of internet-connected devices. IPv6 uses a much larger address format specifically to fix that shortage.' },
    { q: 'How can I tell if an address is IPv4 or IPv6 just by looking at it?', a: 'IPv4 addresses are four short decimal numbers between 0 and 255 separated by dots, like 192.168.1.24. IPv6 addresses use hexadecimal groups, meaning digits and the letters A through F, separated by colons instead of dots, often with a double colon collapsing a run of zero groups. Letters and colons mean IPv6; four dot-separated numbers mean IPv4.' },
    { q: 'Has IPv6 replaced IPv4?', a: 'No. Most networks and devices today run both at once, a setup called dual stack, and pick whichever addressing scheme gets a given connection through. IPv4 is deeply embedded in existing infrastructure that still works, so the two are expected to coexist for a long time rather than IPv6 simply taking over.' },
    { q: 'How does IPv6 relate to network address translation?', a: 'NAT, the practice of letting many devices share one public IPv4 address, is partly a workaround for IPv4\'s limited address supply. IPv6 has enough addresses that every device could theoretically get its own globally unique one, which reduces the pressure that made NAT so necessary, though NAT has not disappeared since IPv4 is still in wide use.' },
    { q: 'Which AP Networking unit covers IPv6?', a: 'IPv6 is Unit 4 content, Managing Our Global Connections, the unit where the course moves from a single household network out to how routing, addressing, and reliability work across the internet at scale.' },
  ]),

  H.cta({
    heading: 'Unit 4 builds on everything before it',
    body: 'Managing Our Global Connections assumes you already know how a single device gets its address. Start from the beginning if that foundation still feels shaky.',
    links: [
      { href: '/pages/ap-networking', text: 'See the full course guide' },
      { href: '/blogs/ap-networking/ap-networking-ip-address-explained', text: 'Read IP address explained', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed for accuracy and clarity on October 20, 2026.'),
]);

module.exports = { meta, body };
