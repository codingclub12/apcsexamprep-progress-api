'use strict';
// Weekly course post: AP Networking. Evergreen concept explainer, Unit 3
// (Managing Many Connections). This is the transport-layer companion to the
// VLAN and router/switch pieces: those cover how traffic gets routed and
// segmented, this one covers what happens once two endpoints actually agree
// to exchange data, and why the exam expects two different answers depending
// on what that data is for.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'TCP vs UDP: two different promises about the same delivery',
  'How TCP keeps its promise: connection, acknowledgment, resend, reorder',
  'How UDP skips all of it: send and move on',
  'Worked comparison: the same small file transfer under both protocols',
  'Why the right protocol depends on what a lost piece costs you',
  'TCP vs UDP at a glance',
];

const meta = {
  title: 'TCP vs UDP: Reliability Versus Speed',
  handle: 'ap-networking-tcp-vs-udp',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'tcp vs udp',
  publishOn: '2026-10-14',
  seoTitle: 'TCP vs UDP Explained: Reliability Versus Speed',
  seoDescription: 'TCP vs UDP compared step by step: how TCP guarantees delivery with acknowledgments and resends, how UDP skips that for speed, and which one real apps need.',
  summary: 'Every piece of data crossing a network travels under one of two different promises. TCP promises that every piece arrives, in order, or the sender finds out and tries again. UDP makes no such promise: it sends the data and moves on, whether or not any of it arrives. This guide walks through exactly how TCP keeps its promise, why keeping it costs time, how UDP skips that cost entirely, a worked comparison of the same small file transfer under both protocols, and why loading a webpage and a live video call each need the opposite answer to the same question.',
  tags: ['AP Networking', 'TCP', 'UDP', 'Transport Layer', 'Unit 3', 'Concept Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('TCP vs UDP is really one question asked twice: what happens when a piece of data gets lost on the way? TCP answers by guaranteeing every piece arrives, in the right order, even if that means pausing to resend something and wait. UDP answers by not guaranteeing anything at all: it sends the data and does not look back, which is slower to explain and faster to run. This guide covers exactly how each protocol keeps or skips that promise, walks through the same small file transfer under both, and works through why a webpage load and a live video call genuinely need opposite answers to the same design question.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 13, 2026', updated: 'October 13, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Our piece on <a href="/blogs/ap-networking/ap-networking-router-switch-access-point">what a router and a switch actually do</a> covers how data physically finds its way from one device to another. TCP vs UDP is a different question, one layer up: once two devices are exchanging data, what happens if part of that data does not make it? A network is never perfectly reliable. Packets get dropped by a congested router, corrupted by interference on a wifi link, or arrive out of order because they took slightly different paths across the internet. Something has to decide what happens next when that occurs, and TCP and UDP are two opposite answers to exactly that question.'),
  H.p('TCP, short for Transmission Control Protocol, answers by guaranteeing delivery. If a piece of data does not arrive, TCP notices, resends it, and holds later pieces until the missing one shows up, so the receiving end always ends up with a complete, correctly ordered copy of whatever was sent. UDP, short for User Datagram Protocol, answers by not guaranteeing anything. It hands data to the network and moves on to the next piece, with no check that anything arrived and no mechanism to resend what did not.'),
  H.p('Neither answer is the correct one in some absolute sense. Each is the correct choice for a different kind of data, which is exactly what makes this a favorite scenario-question setup: describe an application, and the right protocol follows from what that application actually needs, not from which protocol sounds more advanced.'),
  H.box('key', 'The one sentence version', '<p>TCP guarantees every piece of data arrives, in order, at the cost of extra time spent confirming and resending. UDP skips all of that and simply sends, arriving faster but with no guarantee that everything, or anything, actually gets there.</p>'),

  H.h2(SECTIONS[1]),
  H.p('TCP keeps its promise through a specific sequence of steps, and it is worth walking through each one, because exam scenarios tend to describe one step and ask what it accomplishes.'),
  H.h3('Establishing a connection first'),
  H.p('Before TCP sends any actual data, the two devices exchange a short handshake to agree that both sides are ready and listening. Nothing meaningful is transmitted yet. This step alone is why TCP is described as connection-oriented: a TCP conversation has a clear beginning, where both ends confirm each other, before the real data starts moving.'),
  H.h3('Confirming each piece of data arrived'),
  H.p('Once the connection is open, TCP breaks the data into pieces and sends them. For each piece, the receiving device sends back a small acknowledgment message confirming it arrived intact. The sender keeps track of which pieces have been acknowledged and which have not, the same way a person mailing several packages might ask for a delivery confirmation on each one rather than assuming silence means success.'),
  H.h3('Resending anything lost'),
  H.p('If a piece is not acknowledged within an expected window of time, TCP assumes it was lost and sends it again, automatically, without anything above the transport layer needing to notice or intervene. This is the mechanism that makes TCP reliable in the first place: loss is not a failure the application has to handle, it is a normal event TCP recovers from on its own.'),
  H.h3('Putting pieces back in order'),
  H.p('Pieces of data do not always arrive in the order they were sent, since different pieces can take slightly different paths across a network. TCP numbers every piece before sending it, so the receiving end can hold an out-of-order arrival, wait for the missing pieces ahead of it, and reassemble everything back into its original order before handing it to the application. The application on the receiving end never sees pieces out of order, resent, or duplicated. TCP handles all of that underneath.'),
  H.box('warn', 'The mistake this trips up', '<p>It is tempting to think TCP resends everything or confirms nothing extra, but TCP only resends the specific pieces that were not acknowledged, and it acknowledges every piece individually. The overhead scales with how much actually goes wrong, not with the total amount of data. A connection with no loss at all still pays the cost of the handshake and the acknowledgments, just a smaller version of it.</p>'),

  H.h2(SECTIONS[2]),
  H.p('UDP does none of this, on purpose. There is no handshake before sending, so a UDP conversation has no clear opening step at all. The sending device simply sends each piece of data, called a datagram, addressed to its destination, the way a person might drop a postcard in the mail with no request for a delivery confirmation and no plan to resend it if it never shows up.'),
  H.p('There is no acknowledgment coming back from the receiving end, so the sender has no way of knowing whether any specific piece arrived. There is no resending, since resending requires knowing something was lost in the first place, and UDP never finds that out. There is no reordering either. Pieces that arrive out of order stay out of order, and it becomes the receiving application\'s problem, not UDP\'s, if order matters to it at all.'),
  H.p('This is why UDP is described as fire-and-forget, and also why it is called connectionless: there is no setup step, no tracking of what has and has not been confirmed, and no bookkeeping between sender and receiver about the state of the conversation. Each piece of data is sent independently, with nothing carried over from the piece before it.'),
  H.box('tip', 'A quick way to hold the difference in your head', '<p>TCP is a phone call with someone repeating back what they heard. UDP is shouting information across a room and continuing to talk, whether or not anyone caught every word. One takes longer because it checks. The other is faster because it does not.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Take a concrete scenario and run it through both protocols. A small file is being sent from one laptop to another across a network, broken into five pieces for transmission, and one of those five pieces gets dropped somewhere along the way, a routine event on any real network.'),
  H.h3('Under TCP'),
  H.ol([
    'The two laptops complete a handshake, confirming both sides are ready before anything is sent.',
    'The sending laptop transmits pieces one through five, in order.',
    'The receiving laptop sends back an acknowledgment for each piece as it arrives. Pieces one, two, four, and five are acknowledged. Piece three never arrives, so no acknowledgment for it is ever sent.',
    'After waiting past the expected window with no acknowledgment for piece three, the sending laptop resends piece three.',
    'Piece three arrives on the second attempt and is acknowledged. The receiving laptop, which was holding pieces four and five without handing them to the application yet, now has a complete set in the correct order: one, two, three, four, five.',
    'The application on the receiving end opens a complete, correct file. It never has any indication that piece three needed a second attempt.',
  ]),
  H.h3('Under UDP'),
  H.ol([
    'The sending laptop transmits pieces one through five, in order, with no handshake beforehand.',
    'Pieces one, two, four, and five arrive. Piece three does not.',
    'No acknowledgment is ever sent for any piece, so the sending laptop has no way of knowing piece three was lost.',
    'Nothing resends piece three, because nothing is watching for whether it arrived in the first place.',
    'The receiving laptop ends up with four of the five pieces. Piece three is simply missing, permanently, unless something above UDP, at the application level, happens to notice and ask for it separately, which UDP itself never does.',
  ]),
  H.p('The same loss, one dropped piece out of five, produces a complete file with a short delay under TCP, and a permanently incomplete file with no delay and no warning under UDP. That contrast is the entire tradeoff in one worked example: TCP spends time to guarantee completeness, UDP saves that time and accepts that completeness is not guaranteed at all.'),

  H.h2(SECTIONS[4]),
  H.p('Neither protocol is better in general. The right choice depends entirely on what a missing piece would cost the application, and that cost is different for different kinds of data.'),
  H.p('Some data is only useful complete. Loading a webpage where a chunk of the HTML never arrived leaves a broken page. Downloading a file where one section never arrived leaves a corrupted file that may not open at all. Sending an email where part of the message silently went missing leaves the recipient reading something incomplete without knowing it. In every one of these cases, a missing piece does not just shrink the result a little, it breaks the whole thing, so the extra time TCP spends confirming and resending is worth paying. These are exactly the applications built on TCP.'),
  H.p('Other data is only useful if it keeps moving. A live video call where a frame did not arrive is better served by simply skipping that frame and continuing with the next one, since a frozen call waiting for a resend, arriving late, is far worse for the person on the call than one dropped frame they may not even notice. Live streaming and online gaming work the same way: the newest information matters far more than a piece that arrived a second late, because by the time a resend would arrive, a newer update has already made it irrelevant. A dropped frame is a minor glitch. A frozen wait for a resend is the experience actually failing. These are exactly the applications built on UDP.'),
  H.p('Framed this way, TCP vs UDP is not a question of which protocol is more advanced. It is a question of which failure is worse for a specific application: an incomplete result, or a delayed one. TCP is built for applications where an incomplete result is unacceptable. UDP is built for applications where a delay is unacceptable and an occasional gap is tolerable. Our piece on <a href="/blogs/ap-networking/ap-networking-scenario-question-anatomy">how a scenario question is built</a> covers this same pattern more generally: the right answer follows from what the described situation actually needs, not from a memorized rule about which option sounds correct.'),
  H.box('key', 'How to reason through a scenario question on this', '<p>Ask one question: if a piece of this data went missing, would the result be useless, or just slightly worse? A useless result, a broken webpage, a corrupted file, a missing part of an email, points to TCP. A slightly worse result, one skipped video frame, one missed second of a stream, points to UDP. That single question resolves almost every scenario built around this choice.</p>'),

  H.h2(SECTIONS[5]),
  H.p('The comparison holds together more easily as a single table than as scattered prose, since the exam tends to ask about one row of it at a time.'),
  H.table(
    ['Property', 'TCP', 'UDP'],
    [
      ['Connection setup', 'Handshake before any data is sent', 'None, data is sent immediately'],
      ['Reliability', 'Guaranteed: lost pieces are detected and resent', 'Not guaranteed: lost pieces are simply gone'],
      ['Ordering', 'Reassembled into the original order before delivery', 'Delivered in whatever order pieces arrive, if they arrive'],
      ['Speed', 'Slower, due to setup, acknowledgments, and possible resends', 'Faster, with none of that overhead'],
      ['Typical use cases', 'Web page loads, file downloads, email', 'Live video calls, live streaming, online gaming'],
    ],
  ),
  H.p('Our <a href="/blogs/ap-networking/ap-networking-vlans-one-switch-many-networks">VLAN guide</a> and the piece on <a href="/blogs/ap-networking/ap-networking-router-switch-access-point">routers, switches, and access points</a> both live one layer below this one: they cover how data physically gets from one device to another across a network. TCP and UDP sit on top of that, deciding what to do once two endpoints are actually exchanging data across whatever path those lower layers found. Understanding both layers together is what makes a full scenario question, one that spans from physical delivery to the reliability decision on top of it, answerable end to end rather than in pieces.'),

  H.h2('Two practice questions on TCP vs UDP'),
  H.p('Both are written the way a scenario question is written: a described application or a described failure, then a decision that has to follow from what was actually described.'),
  H.mcq({
    n: 1,
    stem: 'A company is building two features. Feature one lets employees download a signed contract PDF, where every byte of the document must be correct or the file will not open. Feature two is a live video conferencing tool, where the priority is keeping the call moving in real time even if a frame is occasionally dropped. Which protocol should each feature use, and why?',
    options: [
      'Both should use TCP, since TCP is more reliable and reliability is always the safer choice',
      'Feature one should use TCP, since a missing piece of the contract would make the whole file useless. Feature two should use UDP, since a dropped frame is tolerable but a delay waiting for a resend would ruin the call',
      'Both should use UDP, since UDP is faster and speed matters for any live application',
      'Feature one should use UDP, since PDFs are small enough that a lost piece is unlikely to matter. Feature two should use TCP, since video calls need to be perfectly reliable',
    ],
    correct: 1,
    why: 'The deciding question is what a lost piece costs each feature. For the contract download, a missing piece produces a file that may not open at all, so the extra time TCP spends confirming and resending every piece is worth paying, since an incomplete contract is not a usable one. For the video call, a missing frame is a minor, often unnoticed glitch, while a frozen wait for TCP to resend that frame and restore order would be a far worse experience than simply skipping it and moving on, which is exactly what UDP does. Reliability is not automatically the safer choice. It is only the right choice when incompleteness, not delay, is the failure that actually matters.',
  }),
  H.mcq({
    n: 2,
    stem: 'The same file is sent across a network under two different transport protocols, and in both cases one piece of the file is lost in transit. Under TCP, what happens to that lost piece, and under UDP, what happens to it?',
    options: [
      'Under both TCP and UDP, the lost piece is automatically detected and resent, since both protocols exist to move data reliably',
      'Under TCP, the missing piece is detected through a lack of acknowledgment and resent, so the receiving end eventually gets a complete file. Under UDP, nothing detects the loss, no resend occurs, and the receiving end ends up with an incomplete file unless something above UDP handles it',
      'Under TCP, the entire transfer restarts from the first piece whenever any piece is lost. Under UDP, only the lost piece is skipped and the rest of the transfer continues normally',
      'Under both TCP and UDP, the receiving application must detect the loss and request a resend itself, since neither protocol does this automatically',
    ],
    correct: 1,
    why: 'TCP tracks every piece it sends and expects an acknowledgment for each one. A piece with no acknowledgment within the expected window is assumed lost and is resent automatically, so the receiving end ends up with a complete, correctly ordered file with no help needed from the application above it. UDP has no acknowledgment mechanism at all, so there is nothing watching for whether any given piece arrived. A lost UDP piece is simply gone: no detection, no resend, and the receiving end is left with an incomplete result unless the application itself is built to notice and compensate, which UDP does not provide on its own. TCP does not restart an entire transfer over one lost piece, it resends only what was not acknowledged.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is the main difference between TCP and UDP?', a: 'TCP guarantees that data arrives completely and in order, by setting up a connection first, confirming each piece with an acknowledgment, resending anything lost, and reassembling pieces into their original order. UDP skips all of that: it sends data with no connection setup, no confirmation, and no resending, which makes it faster but gives no guarantee that everything, or anything, actually arrives.' },
    { q: 'Why would anyone use UDP if it can lose data?', a: 'Because for some applications, a lost piece costs far less than a delay would. A live video call or a live stream is better served by skipping a dropped frame and continuing in real time than by pausing to wait for that frame to be resent, since by the time a resend arrived, the moment it captured would already be past.' },
    { q: 'Does TCP ever lose data permanently?', a: 'No. TCP is specifically designed so that a lost piece gets detected, through a missing acknowledgment, and resent automatically. The receiving end always ends up with a complete, correctly ordered copy of whatever was sent, at the cost of the extra time that detection and resending takes.' },
    { q: 'Why does a webpage use TCP instead of UDP?', a: 'A webpage is only useful complete. A missing chunk of the underlying data can leave a page broken or partially loaded, which is a far worse outcome for the reader than the small extra time TCP spends guaranteeing every piece arrives. That makes the tradeoff worth it for a webpage in a way it is not for a live video call.' },
    { q: 'Is UDP just a broken or older version of TCP?', a: 'No. UDP is a deliberate, separate design choice, not an older or incomplete version of TCP. It exists specifically for applications where speed and staying current matter more than guaranteeing every single piece arrives, and it is still the correct, modern choice for exactly those applications today.' },
  ]),

  H.cta({
    heading: 'TCP vs UDP is core Unit 3 reasoning',
    body: 'Managing Many Connections is built around exactly this kind of tradeoff: what a network guarantees, what it does not, and why the right design choice depends on what the data is actually for. The course walks through it with the same worked, scenario-first approach as this guide.',
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
  H.updatedNote('Reviewed for accuracy and clarity on October 13, 2026.'),
]);

module.exports = { meta, body };
