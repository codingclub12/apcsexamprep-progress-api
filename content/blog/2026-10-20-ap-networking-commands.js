'use strict';
// Weekly course post: AP Networking. A broad command line reference,
// complementary to the 2026-08-25 ping-traceroute post rather than a repeat
// of it: that post deep dives ping and traceroute specifically as reasoning
// tools with a worked scenario. This post covers the rest of the toolbox a
// student reaches for during troubleshooting, ipconfig/ifconfig, nslookup/dig,
// netstat, and arp -a, organized as a reference to return to rather than a
// single narrative. Links out to the DNS post and the MAC/ARP post rather
// than re-explaining either mechanism.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Four network commands, organized by the question each one answers',
  'What is my own configuration: ipconfig and ifconfig',
  'What is happening with DNS: nslookup and dig',
  'What connections are active right now: netstat',
  'What device is at this address: arp -a',
  'Reading output as evidence, not just as text on a screen',
];

const meta = {
  title: 'The Network Commands Worth Knowing Cold',
  handle: 'ap-networking-command-line-tools-reference',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'network commands',
  publishOn: '2026-10-23',
  seoTitle: 'Network Commands Every Student Should Know',
  seoDescription: 'A working reference to the network commands worth knowing: ipconfig, nslookup, netstat, and arp, what each one answers, and when to actually reach for it.',
  summary: 'A command line reference covering ipconfig and ifconfig, nslookup and dig, netstat, and arp -a, organized by the question each command answers rather than as a flat list. Each entry includes an illustrative example of its output and the moment during troubleshooting when a student would actually reach for it, tied back to the elimination method and the fault log habit covered elsewhere on this blog. Ping and traceroute, which already have a dedicated post, are linked rather than re-taught.',
  tags: ['AP Networking', 'Command Line', 'Troubleshooting', 'Study Skills', 'Course Guide', 'Networking Tools'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Our piece on ping and traceroute covered two commands in depth, as reasoning tools for one specific job: generating evidence about a path. This is the rest of the toolbox. Four more network commands, what each one is actually for, and the moment during troubleshooting when a student reaches for it instead of another.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.p('A short list of network commands shows up again and again in AP Networking scenario questions and in real troubleshooting alike, and most students only ever meet them one at a time, in whatever order a problem happens to force them to. That works, eventually, but it leaves gaps: a student who has used <code>ipconfig</code> a dozen times may never have opened <code>netstat</code> once, simply because nothing yet forced the question it answers. This post is built to close that gap on purpose, as a reference rather than a story: four commands, grouped by the specific question each one answers, each with an illustrative example of its output and a clear description of the moment a student would actually reach for it.'),
  H.p('This is not a re-teaching of ping and traceroute. Our <a href="/blogs/ap-networking/ap-networking-ping-traceroute-tools">ping and traceroute post</a> already covers both in depth, including a full worked scenario combining them, and the reasoning behind why one is run before the other. If ping and traceroute are new to you, start there. What follows here picks up where that post leaves off: the other network commands worth knowing cold, alongside ping and traceroute rather than in place of them.'),

  H.h2(SECTIONS[0]),
  H.p('Every command below answers exactly one narrow question, the same way ping only ever answers "is this destination reachable." Keeping that narrowness in mind is what makes a command actually useful during troubleshooting rather than just familiar by name: reach for the command whose one job matches the one question you currently have, not the command you happen to remember first.'),
  H.table(
    ['Command', 'The question it answers', 'When you reach for it'],
    [
      ['ipconfig / ifconfig', 'What is my own device configured with right now?', 'First, before assuming anything else is broken, to confirm the device actually has a valid address and gateway'],
      ['nslookup / dig', 'Is a name actually resolving, and to what address?', 'After noticing a name fails while a numeric address works, to see the DNS answer directly instead of inferring it from a browser error'],
      ['netstat', 'What connections is this device actually making right now?', 'When you need to confirm whether an expected connection is really established, or whether something is listening on a port at all'],
      ['arp -a', 'What device on my local network answers to this address?', 'When a local address needs to be tied to a specific piece of hardware, or two devices seem to be claiming the same identity'],
    ],
  ),
  H.p('Notice the shape of that table before moving past it. Two of the four commands, ipconfig and arp -a, are strictly read only: they report on state that already exists and change nothing. nslookup and netstat are also read only in normal use. None of the four commands below fix anything by themselves. Every one of them exists to generate evidence, the same purpose ping and traceroute serve, just aimed at a different question.'),

  H.h2(SECTIONS[1]),
  H.p('ipconfig on Windows and ifconfig, or the newer ip addr, on MacOS and Linux report the network configuration your own device is currently holding: its private address, its subnet mask, its default gateway, and often the DNS servers it has been told to use. Nothing here reaches out onto the network the way ping or traceroute does. This command asks your own device what it already believes about itself, and it answers instantly, without ever sending a single packet anywhere.'),
  H.code('Windows (ipconfig /all):\nIPv4 Address. . . . . . . . . . . : 192.168.1.57\nSubnet Mask . . . . . . . . . . . : 255.255.255.0\nDefault Gateway . . . . . . . . . : 192.168.1.1\nDNS Servers . . . . . . . . . . . : 192.168.1.1\n\nMac or Linux (ifconfig):\nen0: flags=8863<UP,BROADCAST,RUNNING>\n\tinet 192.168.1.57 netmask 0xffffff00 broadcast 192.168.1.255'),
  H.p('This is the first command worth reaching for during almost any connectivity complaint, before touching a router or blaming an app, because it settles the most basic question first: does this device even have a workable address to begin with. A device holding a normal address in the router\'s own range is at least starting from a sane place. A device instead holding a self assigned address, one that starts with 169.254, never successfully received an address from a DHCP server at all, and that single fact eliminates an entire category of possible cause before any further evidence is even needed.'),
  H.p('That distinction is exactly the kind of elimination work the <a href="/blogs/ap-networking/ap-networking-troubleshooting-method">troubleshooting method post</a> describes: use what you can already see to rule out whole branches of explanation rather than guessing at the first idea that comes to mind. A self assigned address rules out a wifi password problem, a router that is up but not responding correctly, and a browser or app specific issue all at once, because none of those would produce that particular address in the first place. The full mechanism of how a device normally gets its address, and why a failure to get one produces that specific 169.254 pattern, lives in the <a href="/blogs/ap-networking/ap-networking-ip-address-explained">ip address post</a> and is not repeated here. What matters for this reference is simpler: ipconfig or ifconfig is how you actually go look, in seconds, rather than assume.'),
  H.box('tip', 'Run it before you assume anything', '<p>ipconfig and ifconfig cost nothing to run and change nothing on the device. Before guessing that a router, a password, or a distant server is the problem, check what the device itself believes its own configuration to be. A surprising number of connectivity complaints resolve the moment this single command is actually run instead of skipped.</p>'),

  H.h2(SECTIONS[2]),
  H.p('nslookup and its more modern counterpart dig do manually, on demand, exactly what a browser does automatically every time you type a domain name: they ask a DNS server what numeric address a given name currently resolves to, and they show you the raw answer instead of hiding it behind a loaded page or a vague error. Where ipconfig reports what your device already believes about itself, nslookup reaches out and asks a question of the network, specifically of a DNS resolver, and waits for a real answer.'),
  H.code('$ nslookup example.com\nServer:  192.168.1.1\nAddress:  192.168.1.1#53\n\nNon-authoritative answer:\nName:  example.com\nAddress: 93.184.216.34\n\n$ dig example.com +short\n93.184.216.34'),
  H.p('The moment to reach for this command is described precisely in the <a href="/blogs/ap-networking/ap-networking-dns-explained">DNS explained post</a>: a numeric address works while the matching domain name does not, which is the tell that points squarely at DNS rather than at the network path or the destination itself. That post reasons about the pattern from the outside, using browser behavior as the evidence. nslookup lets you skip the inference entirely and ask the question directly: does this name resolve at all right now, and if it does, to what address. A name that fails to resolve in nslookup confirms the DNS diagnosis outright, rather than leaving it as the most likely explanation among a few. A name that resolves fine in nslookup but still fails to load in a browser pushes the investigation back toward something else entirely, since DNS itself is now confirmed working.'),
  H.p('There is a second, quieter use worth knowing. nslookup and dig also show which server actually answered the query, visible in the Server line above. That matters because it is not always the same server a browser used by default, and comparing the answer from one resolver against another is a real way to catch a stale or incorrect DNS entry that has not caught up yet, the exact scenario the DNS post covers under the heading of a cached answer going bad.'),
  H.box('key', 'The relationship to the DNS post', '<p>The DNS explained post teaches the reasoning: a working numeric address next to a broken name is the tell that isolates DNS as the cause. nslookup and dig are how you go confirm that reasoning directly, by asking the DNS question yourself instead of inferring the answer from what a browser shows.</p>'),

  H.h2(SECTIONS[3]),
  H.p('netstat looks in a different direction than the three commands above it. Rather than reporting your own configuration or asking a question of a distant server, netstat reports on the connections your own device is actually making, or listening for, right now. Every browser tab talking to a remote server, every background app phoning home, and every service on your device waiting for an incoming connection shows up here, each one as a line describing a local address and port paired with a remote address and port, plus a state.'),
  H.code('$ netstat -an\nProto  Local Address          Foreign Address        State\nTCP    192.168.1.57:54021     93.184.216.34:443      ESTABLISHED\nTCP    192.168.1.57:54118     172.217.14.206:443     ESTABLISHED\nTCP    0.0.0.0:135             0.0.0.0:0              LISTENING'),
  H.p('The ESTABLISHED state means a connection genuinely completed the handshake on both ends and is currently open, exchanging data. The LISTENING state means a service on this device is sitting ready, waiting for an incoming connection to arrive, without any remote party attached yet. Reading those two states correctly answers a question none of the other commands in this post can: not whether a destination is reachable in general, which is what ping tells you, but whether this specific device has actually opened a connection to it right now, or is quietly failing to.'),
  H.p('This is the command to reach for when the symptom sounds like a connection problem but ping and traceroute both come back clean. A student whose app claims to be connecting but never actually finishes loading anything is describing exactly the gap netstat can see and ping cannot: ping only confirms the destination answers pings at all, while netstat shows whether an actual application connection to that destination genuinely completed or is stuck. If the expected line never shows up as ESTABLISHED, or it shows up and then disappears repeatedly, the problem is not that the network path is broken, since ping already ruled that out, it is that something at the application layer, on this device or on the destination, is refusing or dropping the actual connection attempt.'),
  H.box('warn', 'A long list of connections is normal, not suspicious', '<p>A typical device with several browser tabs and background apps open can show a genuinely long netstat listing at any moment, most of it entirely routine. The command is useful for confirming or ruling out one specific expected connection, not for treating every unfamiliar line as a sign something is wrong.</p>'),

  H.h2(SECTIONS[4]),
  H.p('arp -a answers the last of the four questions this reference covers: given an address on your own local network, what actual piece of hardware does it belong to. It does this by printing the device\'s ARP cache, the same running table of IP address to MAC address pairs described in full in the <a href="/blogs/ap-networking/ap-networking-mac-address-arp">MAC address and ARP post</a>. That post explains the request and reply process, ARP, that fills the cache in the first place. arp -a is simply the command that lets you look at what is already sitting inside it.'),
  H.code('$ arp -a\nInterface: 192.168.1.57\n  Internet Address       Physical Address       Type\n  192.168.1.1             00-1a-2b-3c-4d-01      dynamic\n  192.168.1.20            00-1a-2b-3c-4d-5e      dynamic\n  192.168.1.34            00-1a-2b-3c-4d-9f      dynamic'),
  H.p('Every row pairs a numeric address already familiar to you, the router, a printer, a family device, with the physical hardware identifier actually answering to it on the local network right now. That is the reference this command is for: confirming which real device sits behind a local address, rather than assuming the address and the device are permanently the same thing. Two situations come up constantly enough to be worth naming directly. First, a device that used to work at a known address suddenly behaves oddly, and checking arp -a shows a different physical address answering to that same numeric address than the one seen there before, which points at a device swap, a re-leased address, or in a security context something worth a much closer look. Second, two devices on the network appear to be fighting over the same address, and the ARP cache is exactly where that conflict becomes visible, because it can only ever hold one hardware address against a given numeric address at a time.'),
  H.p('arp -a will never tell you anything about a device outside your own local network. That limitation is not a flaw in the command, it is a direct consequence of what ARP itself does, resolving addresses only within one local segment, exactly as the MAC address post explains. Reaching for arp -a when the problem clearly involves a distant server is a sign the wrong tool was picked for the question. Reaching for it when the problem is local, one device on one network behaving unexpectedly toward another device on that same network, is exactly the moment it earns its place in this reference.'),

  H.h2(SECTIONS[5]),
  H.p('None of the four commands above hand you a finished diagnosis by themselves, and neither did ping or traceroute in the earlier post. Each one produces a small, specific piece of evidence, and the actual skill, the one the <a href="/blogs/ap-networking/ap-networking-troubleshooting-method">troubleshooting method post</a> teaches directly, is stacking that evidence to eliminate causes rather than reading a single command\'s output as a complete answer on its own. A self assigned address from ipconfig rules out a password problem. A clean nslookup result rules out DNS once ping has already flagged something as unreachable by name. A missing ESTABLISHED line in netstat rules out the assumption that a working ping means the whole connection is fine. A changed physical address in arp -a rules out coincidence and points straight at something specific having changed on the local network.'),
  H.p('That is also exactly the kind of concrete, specific detail worth carrying forward into a <a href="/blogs/ap-networking/ap-networking-fault-log-revision-guide">fault log entry</a> once a real problem gets solved. Which command actually produced the decisive piece of evidence, and what its output looked like at that exact moment, is far more useful to reread later than a vague note that says the wifi was slow and then it got fixed. A fault log entry that says the self assigned address in ipconfig ruled out a router problem and pointed straight at the DHCP server is a specific, reusable piece of reasoning. A student who builds the habit of naming the exact command and the exact line of output that mattered is building precisely the skill the exam rewards: reading a scenario\'s evidence and knowing exactly what it does, and does not, rule out.'),
  H.box('key', 'The one sentence version', '<p>Ping and traceroute generate evidence about a path. ipconfig, nslookup, netstat, and arp -a generate evidence about your own configuration, a name\'s resolution, an active connection, and a local device, respectively. Reach for whichever one answers the exact question you currently have, then use the answer to eliminate, not to guess.</p>'),

  H.h2('Two questions in the exam style'),
  H.p('The first question asks you to pick the right command for a described situation. The second hands you simplified output and asks what it actually rules in or out, the way a real Troubleshoot question does.'),
  H.mcq({
    n: 1,
    stem: 'A student\'s laptop is connected to wifi with full signal bars but cannot load any website. A classmate suggests checking whether the laptop actually received a usable address from the router in the first place, before assuming anything further out is broken. Which command should the student run first to check that?',
    options: [
      'netstat, to see what connections are currently open',
      'arp -a, to see which devices are on the local network',
      'ipconfig or ifconfig, to see the laptop\'s own current address and default gateway',
      'nslookup, to see what a domain name resolves to',
    ],
    correct: 2,
    why: 'The question being asked is specifically about the laptop\'s own configuration, whether it actually holds a usable address and gateway, not about a remote name, an active connection, or another device on the network. ipconfig or ifconfig is the command built to answer exactly that question, reporting the device\'s own address, subnet mask, and default gateway without sending anything onto the network at all. netstat reports on active connections rather than the device\'s base configuration, arp -a reports on other devices\' hardware addresses rather than this device\'s own IP setup, and nslookup answers a DNS question that is not yet relevant until the laptop is confirmed to have a working address to send a DNS query from in the first place.',
  }),
  H.mcq({
    n: 2,
    stem: 'A technician runs netstat on a device that a user claims is connected to a work application. The relevant line of output is shown below. What does this output most directly indicate?',
    codeText: 'Proto  Local Address           Foreign Address         State\nTCP    192.168.1.40:51022      10.4.20.8:443           SYN_SENT',
    options: [
      'The connection to the remote server has been fully established and is exchanging data normally',
      'The device is listening for an incoming connection from the remote server',
      'The device has sent a request to connect to the remote server but has not yet received a completed connection back',
      'The remote server address is invalid and the connection failed immediately',
    ],
    correct: 2,
    why: 'A connection that is fully open and exchanging data shows a state of ESTABLISHED, not SYN_SENT, so the first option does not match this output. LISTENING describes a device waiting for an incoming connection rather than one that has sent a request outward, which is the second option and also does not match. SYN_SENT specifically describes a connection attempt that has been sent out but has not yet completed, meaning the local device is waiting on a reply it has not received, which is exactly the third option. Nothing about this line indicates an invalid address or an immediate failure, since the connection attempt is still outstanding rather than rejected outright.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is the difference between ipconfig and ifconfig?', a: 'They report the same kind of information, a device\'s own address, subnet mask, and default gateway, but ipconfig is the Windows command while ifconfig is the traditional Mac and Linux command, with ip addr as the newer Linux equivalent. All of them answer the same question: what is this device\'s own current network configuration.' },
    { q: 'What is the difference between nslookup and dig?', a: 'Both manually query DNS and report what address a name resolves to. nslookup is available on Windows, Mac, and Linux by default and produces a more verbose, structured answer. dig is a Mac and Linux tool that many find faster to read, particularly with a flag like +short that trims the output down to just the resolved address.' },
    { q: 'Does netstat show connections other people are making, or only my own device?', a: 'Only your own device. netstat reports on the connections and listening ports that the device it runs on is actually making or waiting for. It has no visibility into what any other device on the network is doing.' },
    { q: 'Can arp -a see devices on a different network than my own?', a: 'No. ARP, and therefore arp -a, only ever resolves and reports addresses for devices sharing your own local network segment, the same limitation covered in full in the MAC address and ARP post. A device on a different network is never going to show up in this cache no matter how the command is run.' },
    { q: 'Do I need to memorize the exact output format of each of these commands for the exam?', a: 'No. AP Networking scenario questions care about whether you can read given output and reason about what it rules in or out, not whether you can recite an exact command\'s formatting from memory. Practicing with real output, on your own device, builds that reading skill far more directly than memorizing a format would.' },
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
  H.updatedNote('Reviewed against the AP Networking course framework current in October 2026. Last reviewed October 20, 2026.'),
]);

module.exports = { meta, body };
