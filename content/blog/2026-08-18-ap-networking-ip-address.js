'use strict';
// Weekly course post: AP Networking. Evergreen concept explainer targeting the
// enormous general-audience search term "what is my IP address," written to
// double as the plain-language front door to Unit 1 (Managing My Connections).
const H = require('../../lib/blog-house');

const SECTIONS = [
  'IP address explained: what it actually is',
  'Why devices need an address at all',
  'The structure of an IPv4 address',
  'Private address vs public address',
  'How your device gets its address',
  'Two questions in the exam style',
];

const meta = {
  title: 'What an IP Address Actually Is: IP Address Explained',
  handle: 'ap-networking-ip-address-explained',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ip address explained',
  publishOn: '2026-08-19',
  seoTitle: 'IP Address Explained: What It Is and How It Works',
  seoDescription: 'IP address explained in plain language: what the numbers mean, why devices need one, and why your private and public address are not the same thing.',
  summary: 'A plain language explanation of what an IP address is, why devices need one at all, how an IPv4 address is structured, why your private and public address are different numbers, and how your device gets assigned one automatically.',
  tags: ['AP Networking', 'IP Address', 'Networking Basics', 'Unit 1', 'Concept Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Almost everyone has searched "what is my IP address" and gotten a number back with no real explanation of what it means. Here is the ip address explained properly, in language a total beginner can follow.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 8,
  }),
  H.toc(SECTIONS),

  H.p('"What is my IP address" is one of the most searched technology questions there is. Type it into any search engine and you get an instant answer: a short string of numbers, sitting there with total confidence and zero context. Almost nobody who searches that question walks away actually understanding the number they were just handed. This is the ip address explained the way it should have been the first time: what the number means, why your device has one, and why it sometimes looks different depending on where you check it.'),
  H.p('That last part trips up more people than anything else about networking, and it is not a minor technicality. It is also the exact starting point of AP Networking Unit 1, called Managing My Connections, which begins with a single device and its own address before it ever talks about a network of many devices. If you understand this one page, you already understand the foundation the rest of the course is built on.'),

  H.h2(SECTIONS[0]),
  H.p('An IP address is a number assigned to a device so that other devices on a network know where to find it. IP stands for Internet Protocol, which is the agreed-upon set of rules that lets wildly different devices, made by different manufacturers, running different software, all understand how to address and deliver information to one another.'),
  H.p('The classic comparison is a street address, and it holds up well. A street address does not describe what a building looks like or what happens inside it. It exists purely so that something sent to it, a letter, a package, a delivery truck, knows exactly where to go. An IP address does the same job for a device on a network. It carries no information about what the device is or what it is doing. It is purely a location, expressed as a number instead of a street name.'),
  H.box('key', 'The one sentence version', '<p>An IP address is not a name, a password, or an identity. It is a location on a network, and its entire job is to make sure information sent across that network arrives at the right device.</p>'),

  H.h2(SECTIONS[1]),
  H.p('It helps to ask why an address is necessary at all, rather than just accepting that it is. Picture asking your web browser to load a page. Your device sends out a request, and somewhere out on the internet a server receives it, does some work, and sends a response back. That response has to travel back across potentially thousands of intermediate connections and land on your specific device, out of every device currently connected to the internet.'),
  H.p('That return trip is the whole reason addressing exists. Every device that could possibly receive a response needs a unique, known address for that response to be routed to, the same way a delivery truck needs a specific address rather than just a city name. Without an address, a device could send requests out into a network but could never receive anything back, because nothing would know where "back" was. This routing problem, getting a response to find its way home, is what an IP address solves.'),

  H.h2(SECTIONS[2]),
  H.p('The most common style of IP address you will see, called IPv4, is written as four numbers separated by dots, like <code>192.168.1.24</code>. Each of the four numbers, called an octet, can be anything from 0 to 255. That range is not arbitrary. It comes directly from how computers store the number internally, and a full explanation of that belongs to a different topic. For now, the beginner version is simply this: four numbers, each between 0 and 255, separated by dots, and that combination is the address.'),
  H.p('You will also sometimes see or hear about IPv6, a newer and much longer style of address that looks more like <code>2001:0db8:85a3:0000:0000:8a2e:0370:7334</code>. IPv6 exists mainly because the world is running out of IPv4 addresses. There are only so many combinations of four numbers between 0 and 255, and the number of internet-connected devices on the planet has grown far past what that supply can comfortably cover. IPv6 dramatically expands the available supply. The full mechanics of IPv6 are a Unit 4 topic in AP Networking, so this page will not go deep into it, but our <a href="/pages/ap-networking">AP Networking course guide</a> covers it in the unit where it belongs.'),

  H.h2(SECTIONS[3]),
  H.p('Here is the part that genuinely confuses almost everyone, including plenty of people who consider themselves reasonably tech savvy. Check your IP address inside your laptop\'s network settings, and you will likely see something like <code>192.168.1.24</code>. Now open a browser and search "what is my IP," and you will see a completely different number. Neither answer is wrong. They are answering two different questions.'),
  H.p('The address in your operating system settings is your private address. It is the address your router assigned specifically for use inside your home or school network, so that the router can tell your laptop apart from the printer, the smart TV, and everyone else\'s phone sharing that same network. Private addresses are reused constantly across different networks. Your private address at home and a classmate\'s private address at their house could easily be the identical number, because that address only has to be unique inside its own small network, not across the whole internet.'),
  H.p('The number your browser reports when you search "what is my IP" is your public address. This is the single address your router uses to represent your entire home or school network to the wider internet. Every device behind that router, your laptop, your phone, your roommate\'s game console, shares that one public address as far as the outside world is concerned. When a website\'s response comes back, it comes back to your router\'s public address first, and the router is what sorts out which device inside the network actually asked for it.'),
  H.box('tip', 'The mail room analogy', '<p>Think of your public address as the street address of an office building, and your private address as your desk number inside it. Mail from outside the building only needs the street address to arrive. Once it is inside, the mail room uses your desk number to get it to you specifically. Nobody outside the building needs to know your desk number, and your desk number alone would not get a letter delivered from across the country.</p>'),
  H.p('This is exactly why checking your address two different ways gives you two different answers, and neither device or website is malfunctioning. You are simply looking at the desk number in one case and the building address in the other.'),

  H.h2(SECTIONS[4]),
  H.p('Almost nobody manually types in their own device\'s IP address, and you should not need to either. When your laptop or phone connects to a network, whether that is your home wifi or a school network, your router automatically hands it a private address to use, picked from the pool the router manages for that network. This happens in the background within a moment or two of connecting, which is why joining a new wifi network usually just works without you configuring anything.'),
  H.p('That automatic hand-out process has its own name and its own set of rules, and it is worth a dedicated look once you are comfortable with what an address actually is and why the private and public split exists. For now, the accessible version is enough: your router is the one assigning the address, it does so automatically, and it keeps track of which address belongs to which device so that responses land in the right place. Our <a href="/pages/ap-networking">AP Networking course guide</a> walks through Unit 1 device by device if you want the fuller picture, including how that automatic assignment actually works under the hood.'),
  H.box('warn', 'A common mix-up', '<p>Students sometimes assume their IP address is a fixed, permanent identity, the way a name is. For most home and school networks it is not. Disconnect and reconnect to wifi, restart your router, or simply wait long enough, and your router may hand your device a different private address than it had before. The device is still the same device. Only its current address on that particular network has changed.</p>'),

  H.h2(SECTIONS[5]),
  H.p('Both of the following are written the way AP Networking frames a scenario: a short situation, then a decision. Work each one through before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'A student checks their laptop\'s network settings and sees the address 192.168.1.42. A classmate on a completely different home network, in a different house, checks their own laptop and also sees 192.168.1.42. Which statement best explains this?',
    options: [
      'One of the two addresses must be a mistake, since two devices cannot share an address',
      'Both addresses are private addresses, and private addresses only need to be unique inside their own network, not across the internet',
      'The two laptops are somehow connected to the same network without realizing it',
      'This can only happen if both students are using the same internet service provider',
    ],
    correct: 1,
    why: 'A private address only has to be unique within the single network it belongs to, the same way two different office buildings can each have a desk numbered 12 without any conflict. Since these are two entirely separate home networks, each with its own router handing out its own private addresses, there is nothing unusual about both routers assigning the exact same private address inside their own small pool. It says nothing about the internet service provider or about the two networks being connected, and it is not a mistake.',
  }),
  H.mcq({
    n: 2,
    stem: 'A student checks their IP address inside their phone\'s wifi settings and gets one number. They then search "what is my IP" in a browser on the same phone, connected to the same wifi, and get a different number entirely. What is the most likely explanation?',
    options: [
      'The phone has a hardware fault and is reporting inconsistent addresses',
      'The wifi settings address is the private address assigned by the router, and the browser search is showing the public address the router uses on the wider internet',
      'The browser search is inaccurate and cannot be trusted',
      'The two numbers are actually the same address shown in two different formats',
    ],
    correct: 1,
    why: 'This is the private versus public split working exactly as designed rather than a fault. Network settings on the device itself report the private address, the one the router assigned for use inside that specific wifi network. A "what is my IP" search reflects how the router presents the entire network to the outside internet, which is the public address. Both numbers are accurate. They are simply answering the question "what is your address inside this network" versus "what is your network\'s address to the rest of the internet," and those are genuinely different questions with genuinely different correct answers.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is an IP address in simple terms?', a: 'It is a number assigned to a device so that other devices on a network, and eventually a response traveling back across that network, know exactly where to deliver information. It works like a street address for a device rather than for a building.' },
    { q: 'Why is my IP address different in my settings than when I search for it online?', a: 'Your device settings show your private address, assigned by your router for use inside your home or school network. Searching "what is my IP" shows your public address, the single address your router uses to represent your whole network to the wider internet. Both are correct answers to different questions.' },
    { q: 'Does my IP address change?', a: 'Often, yes. Most home and school networks hand out addresses automatically and can assign a different one after you reconnect to wifi, restart your router, or after enough time passes. The device stays the same even when its current address changes.' },
    { q: 'What is the difference between IPv4 and IPv6?', a: 'IPv4 is the familiar four-number format like 192.168.1.24. IPv6 is a much longer format created because the world is running out of available IPv4 addresses as the number of connected devices has grown. AP Networking covers IPv6 in more depth later in the course.' },
    { q: 'Do I need to set my own IP address manually?', a: 'Almost never. Your router assigns one automatically the moment your device connects to the network, which is why joining wifi typically requires no address configuration from you at all.' },
  ]),

  H.cta({
    heading: 'This is exactly where AP Networking Unit 1 starts',
    body: 'Managing My Connections builds from your own device\'s address outward, one topic at a time, to the College Board framework.',
    links: [
      { href: '/pages/ap-networking', text: 'Start Unit 1' },
      { href: '/pages/ap-networking-exam', text: 'Exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed for accuracy and clarity on August 18, 2026.'),
]);

module.exports = { meta, body };
