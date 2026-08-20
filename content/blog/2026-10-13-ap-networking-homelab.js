'use strict';
// Weekly course post: AP Networking. A hands-on practice habit, complementary
// to the fault-log post (2026-09-29): that post teaches you to write down
// real faults after you fix them. This post is the step before that even
// exists, actually building a small real network to work on, using
// equipment a student already owns rather than a school lab. Referenced
// only in passing here, not re-taught: the elimination method, the
// diagram-first habit, ip addressing, DHCP, VLANs, and ping/traceroute all
// have their own posts on this blog and are linked rather than repeated.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why a Home Lab Works Better Than Reading About Networks',
  'What Your Home Lab Actually Needs (You Own Most of It)',
  'Four Exercises for Your Home Lab, Using What You Already Have',
  'What a Home Lab Teaches That a Reading Assignment Cannot',
];

const meta = {
  title: 'Building a Home Lab From What You Already Own',
  handle: 'ap-networking-home-lab-from-what-you-own',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'home lab',
  publishOn: '2026-10-16',
  seoTitle: 'Home Lab: Build One From What You Already Own',
  seoDescription: 'Build a real home lab for AP Networking using your router, an old phone, and free simulator software. Four exercises, no purchase required.',
  summary: 'A practical guide to building a home lab for AP Networking practice using equipment most students already own: a home router, a spare phone or laptop, and free simulator software. Includes four concrete exercises tied to IP addressing, DHCP, VLANs, and ping and traceroute, each linked to the concept post that already covers it.',
  tags: ['AP Networking', 'Home Lab', 'Hands-On Practice', 'Study Skills', 'Course Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('You do not need a school networking lab to build one. A home lab made from your own router, a spare phone or laptop, and free simulator software teaches the same concepts this blog covers, IP addressing, DHCP, VLANs, ping and traceroute, using equipment already sitting in your house. No purchase required.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('An earlier post on this blog covers keeping a fault log, a running written record of real faults you work through during practice. A fault log only has something to write about once you have actually broken something and fixed it, and most students never get past reading about networking concepts to the point where there is a real fault to log at all. This post is the step that comes before that one: turning the equipment you already own into a small, real, working home lab, so that the concepts explained elsewhere on this blog have somewhere to actually happen rather than staying theoretical.'),
  H.p('Nothing here requires buying hardware, downloading a paid license, or getting permission from a school IT department. Every exercise below runs on a personal router, a personal phone or old laptop, and software that costs nothing to install.'),

  H.h2(SECTIONS[0]),
  H.p('Reading that a router assigns private addresses to devices on a network is one thing. Opening a terminal on your own laptop, right now, and watching your own device report the address your own router actually gave it is a different thing entirely, and it is the difference a home lab is built around. The concept stops being a sentence in a study guide and becomes a fact you generated yourself, on hardware you can poke at again tomorrow.'),
  H.p('A home lab also removes the biggest obstacle to hands-on networking practice for most students, which is not skill but access. A school computer lab is supervised, locked down, and available for a limited window. A home router and a spare phone are available every evening, do not require anyone else\'s permission to touch, and cannot really be broken in any way that a router restart or a factory reset cannot undo.'),
  H.box('key', 'The home lab is not a metaphor', '<p>A wifi router handing out addresses to every device in your house is a genuine DHCP server doing genuine DHCP work, at a smaller scale than a school or business network but running the exact same process. A guest network toggle on a consumer router is a real, if simplified, example of network segmentation. None of this is a simulation of the concept. It is the concept, running on hardware you already own.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Most students already have everything the first three exercises below need, sitting in a junk drawer or a closet. The fourth exercise needs nothing but a network connection.'),
  H.table(
    ['What the lab needs', 'What you likely already have', 'What it is for'],
    [
      ['A router or a combined modem and router', 'The one already running your home wifi', 'The core network every exercise below runs against'],
      ['A second device', 'An old phone, an old laptop, or a tablet nobody uses anymore', 'A device you can connect and disconnect freely without disrupting anyone else\'s internet'],
      ['A terminal or command prompt', 'Built into every laptop, no install needed', 'Where the command line exercises below actually run'],
      ['Simulator software (optional, for practicing router and switch configuration beyond what a home router exposes)', 'A free download', 'A stand-in for routers, switches, and cabling you do not personally own'],
    ],
  ),
  H.p('That last row is worth a note on its own, because it is the one piece that is not already sitting in a drawer. The earlier post on this blog covering what a school signs up for in the AP Networking pilot found that the course as a whole is designed around simulator software, specifically Cisco Packet Tracer and GNS3, rather than a dedicated physical lab of racked switches and routers. Both are free to install, and neither requires school hardware, which means a student building a home lab for personal practice has access to the same simulator tools a piloting classroom is expected to use.'),
  H.p('Cisco Packet Tracer requires a free account through Cisco\'s own learning platform to download, and it lets you drag routers, switches, and cables onto a canvas and configure them the way you would configure real equipment. GNS3 is free and open source software with no account requirement, and it leans further toward emulating real device behavior rather than a simplified model of one. Neither is required for the four exercises in the next section, which run entirely on hardware you already own. They matter for going further than a home router alone can take you, building and rewiring a small multi-router topology from scratch once the exercises below feel routine.'),
  H.box('warn', 'Ask before you change settings on a shared router', '<p>A home router is usually shared with family members who are relying on it right now. Checking your own device\'s address or looking at the connected devices list changes nothing and is always safe. Actually changing a router setting, including turning on a guest network, is a small, reversible change but is still a change to a network other people are using. Say what you are doing before you do it, and know your router\'s reset procedure before you experiment.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Each exercise below takes ten minutes or less and produces something real to look at, not a hypothetical. Run them in order if this is your first pass through a home lab, since each one builds a little context the next one uses.'),

  H.h3('Exercise 1: Find Your Own IP Address and Default Gateway'),
  H.p('Open a terminal or command prompt on any device connected to your home wifi and ask it directly what address it was assigned. On Windows that command is <code>ipconfig</code>. On MacOS or Linux it is <code>ifconfig</code> or the newer <code>ip addr</code>. Every one of them reports back a private address and a default gateway, which is your router\'s own address on the same network.'),
  H.code('Windows (ipconfig):\nIPv4 Address. . . . . . . . . . . : 192.168.1.42\nSubnet Mask . . . . . . . . . . . : 255.255.255.0\nDefault Gateway . . . . . . . . . : 192.168.1.1\n\nMac or Linux (ifconfig):\ninet 192.168.1.42 netmask 0xffffff00 broadcast 192.168.1.255'),
  H.p('The number after Default Gateway is the address of your router itself, which is why it is worth writing down before the next exercise. What that address means and why your device has it in the first place is covered in full in the earlier <a href="/blogs/ap-networking/ap-networking-ip-address-explained">ip address explained post</a>. This exercise is that post made concrete: the number you just read off your own screen is a real answer to the question that post explains in the abstract.'),

  H.h3('Exercise 2: Open Your Router\'s Admin Panel and See What It Knows'),
  H.p('Type your router\'s address from Exercise 1 into a browser address bar and you will land on its admin login page. Most consumer routers ship with a default username and password printed on a sticker on the router itself, or set by whoever originally installed it. Once logged in, look for a page usually labeled something like connected devices, attached devices, or DHCP clients.'),
  H.p('That page is a live list of every device your router has handed an address to, each one with a device name, its assigned private address, and often how long ago it connected. This is DHCP made visible: every phone, laptop, smart speaker, and game console in the house got its address the same automatic way, from the same router, and this page is the router\'s own record of having done it. The full mechanism behind that automatic assignment, the actual exchange your device and router complete every time this happens, is explained in the earlier <a href="/blogs/ap-networking/ap-networking-dhcp-address-assignment">DHCP post</a>. Finding your own device in this list, next to every other device in the house, is that exchange with the results laid out in front of you.'),
  H.box('tip', 'Do not change anything yet', '<p>This exercise is read only. Looking at the connected devices list cannot break anything. Save any actual configuration changes, including the guest network in the next exercise, for a moment when you have told anyone else on the network what you are about to do.</p>'),

  H.h3('Exercise 3: Turn On a Guest Network and Watch It Behave Like a Separate Network'),
  H.p('Many home routers, including most models sold in the last several years, include a guest network toggle in the same admin panel from Exercise 2. Turning it on creates a second wifi network with its own name and password, broadcast from the same physical router as your main network.'),
  H.p('Connect your spare phone or old laptop to the new guest network instead of your main one, then try two things. First, see whether the guest device can reach the internet normally, browsing a website or two. It almost always can. Second, see whether a device on your main network can reach the guest device directly, for example by trying to print to a printer that is only visible on the main network, or by checking whether the guest device shows up in the same connected devices list as your main devices. On most routers it will not, or it will be listed separately with restricted access to everything else on the network.'),
  H.p('That gap, internet access working normally while access to the rest of the home network is blocked, is a small, consumer-grade version of exactly the isolation a VLAN provides on a business network, which the earlier <a href="/blogs/ap-networking/ap-networking-vlans-one-switch-many-networks">VLAN post</a> covers in full. A real VLAN configuration on a managed switch is more deliberate and more granular than a router\'s built-in guest toggle, tagging specific ports to specific logical networks rather than offering a single preset guest mode. But the underlying idea, that a single piece of shared hardware can host two networks that behave as though they are separate, with traffic on one unable to freely reach the other, is the same idea your guest network is demonstrating right now on hardware you already own.'),

  H.h3('Exercise 4: Run Ping and Traceroute Against Real Destinations'),
  H.p('From the same terminal used in Exercise 1, ping a real, well known destination. <code>ping 8.8.8.8</code> works from any device with an internet connection and does not depend on a domain name resolving correctly first. Watch the replies come back and note the response time on each line. Then run a traceroute to the same destination, <code>tracert 8.8.8.8</code> on Windows or <code>traceroute 8.8.8.8</code> on Mac and Linux, and watch the list of intermediate hops build line by line as the tool discovers each router along the path out of your home network and into the wider internet.'),
  H.code('C:\\> tracert 8.8.8.8\n  1    2 ms    1 ms    1 ms  192.168.1.1\n  2   11 ms    9 ms   10 ms  10.20.4.1\n  3   14 ms   13 ms   15 ms  isp-edge-router.example.net\n  4   18 ms   17 ms   19 ms  8.8.8.8'),
  H.p('The first hop in that output is always your own router, the same gateway address from Exercise 1. Every hop after that is a router somewhere on your internet provider\'s network or beyond it, each one a real, physical piece of infrastructure your traffic actually passed through to reach Google\'s public address. What each tool is doing under the hood, and why traceroute reveals a full path while ping only confirms whether the destination answered at all, is explained in the earlier <a href="/blogs/ap-networking/ap-networking-ping-traceroute-tools">ping and traceroute post</a>. Running both against a real destination from your own device turns that explanation into a live result you generated yourself rather than a sample output printed in a guide.'),
  H.p('If a hop times out, or a device on your guest network cannot reach something you expected it to, that is not a failed exercise. It is your first real fault, worth writing down in a <a href="/blogs/ap-networking/ap-networking-fault-log-revision-guide">fault log entry</a> the same day it happens, in the same short format that post describes, symptom, what you checked, what each check ruled out, the root cause, and the fix.'),

  H.h2(SECTIONS[3]),
  H.p('A textbook explanation of DHCP tells you that a device requests an address and a server offers one back. Watching your own connected devices page fill up with every phone and laptop in the house tells you the same thing, but it also shows you the parts a textbook explanation leaves out: device names you did not expect to see, an old tablet nobody remembered was still connected, a lease time that is shorter or longer than you assumed. A home lab surfaces the messy, specific detail that only shows up when the concept is running on real hardware instead of living in a diagram.'),
  H.p('It also builds a different kind of confidence for the exam itself. A scenario question describing a device that can reach local resources but not the wider internet is not an abstract puzzle once you have caused that exact symptom yourself by testing your own guest network, or watched a real traceroute build hop by hop instead of reading one printed in a guide. The four exercises above are small, but repeating them on a real network, your own network, a few times over the course of your practice is worth more than reading the same four concepts described a second or third time.'),

  H.h2('Two questions in the exam style'),
  H.p('The first question uses the traceroute output style from Exercise 4. The second uses the guest network behavior from Exercise 3.'),
  H.mcq({
    n: 1,
    stem: 'A student runs a traceroute from a home laptop to a public address. The first hop returns quickly and successfully. Every hop after that times out completely, with no response at all. What does this pattern most likely indicate?',
    codeText: '  1    2 ms    2 ms    1 ms  192.168.1.1\n  2     *       *       *     Request timed out.\n  3     *       *       *     Request timed out.\n  4     *       *       *     Request timed out.',
    options: [
      'The laptop has an invalid local IP address',
      'The home router is reachable, but the connection beyond the router to the wider internet is failing',
      'The destination address itself does not exist',
      'The traceroute command was typed incorrectly',
    ],
    correct: 1,
    why: 'The first hop succeeding confirms the laptop can reach its own router just fine, which rules out a local addressing problem entirely. Every hop past the router failing means the router is not able to successfully forward traffic out toward the wider internet, most likely an issue with the connection between the router and the internet provider rather than anything on the home network side. A nonexistent destination or a typo in the command would typically fail immediately rather than showing one successful hop followed by a consistent string of timeouts.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student turns on their router\'s guest network feature and connects an old phone to it. The phone can browse the internet normally, but it cannot see or print to a printer that is visible and reachable from every device on the main network. What does this behavior best illustrate?',
    options: [
      'The guest network has no internet access at all',
      'The printer is broken and needs to be restarted',
      'The router is malfunctioning and should be reset',
      'The guest network is logically separated from the main network, similar to how a VLAN keeps traffic on separate logical networks apart even on shared hardware',
    ],
    correct: 3,
    why: 'Internet access working normally on the guest network rules out a broken connection. The printer being reachable from every device on the main network rules out the printer itself being at fault. What is left is exactly what a guest network is designed to do: allow general internet access while keeping guest devices from reaching resources on the main network, the same segmentation idea a VLAN implements more deliberately on business networking hardware.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Do I need to buy anything to build a home lab for AP Networking?', a: 'No. The four exercises in this post run on a router or modem you already have and a spare phone or old laptop as a second device. Simulator software like Cisco Packet Tracer or GNS3 is free to install and only becomes useful once you want to go beyond what a single home router can demonstrate.' },
    { q: 'Is it safe to log into my own router\'s admin panel?', a: 'Yes, viewing pages like the connected devices list is read only and changes nothing. Actually changing a setting, such as turning on a guest network, is a reversible change but still worth mentioning to anyone else sharing the network first, and it helps to know your router\'s reset procedure before experimenting.' },
    { q: 'What if my router does not have a guest network option?', a: 'Skip that exercise or read the VLAN post instead and picture the same idea implemented more deliberately on business hardware. The other three exercises, checking your own address, viewing the connected devices list, and running ping and traceroute, work on any router regardless of whether it offers a guest network feature.' },
    { q: 'Should I use Cisco Packet Tracer or GNS3 for a home lab?', a: 'Neither is required for the exercises in this post, which use only a home router and a spare device. Once you want to build and rewire a small multi-router topology beyond what a home router alone allows, the earlier pilot commitments post explains why both are the tools an AP Networking classroom is already expected to use, so practicing with them at home stays consistent with what the course itself relies on.' },
    { q: 'How does a home lab connect to keeping a fault log?', a: 'A fault log needs a real fault to write about, and a home lab is where that fault actually happens. A hop that times out during Exercise 4 or a guest device that behaves unexpectedly during Exercise 3 is a genuine fault worth a real entry, using the same short format the fault log post describes.' },
  ]),

  H.cta({
    heading: 'Turn what you already own into practice',
    body: 'Four exercises, a router you already have, and a spare phone or laptop. Start with checking your own IP address tonight, then work through the rest at your own pace.',
    links: [
      { href: '/blogs/ap-networking/ap-networking-ip-address-explained', text: 'Start with IP addressing' },
      { href: '/pages/ap-networking', text: 'See the full course guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed against the AP Networking course framework current in October 2026. Last reviewed October 13, 2026.'),
]);

module.exports = { meta, body };
