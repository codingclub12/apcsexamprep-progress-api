'use strict';
// Weekly course post: AP Cybersecurity, Unit 5 (Securing Applications and
// Data). A concept post: teach the tested depth of application vulnerability
// classes and their defenses without teaching exploit code. Sourcing note: no
// live statistics are required for this post, so no SRC map is needed.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why application security starts with untrusted input',
  'SQL injection and cross site scripting, two versions of the same mistake',
  'Secure coding practices: validate on the server, trust nothing by default',
  'Protecting application data at rest and in transit',
  'Vulnerability classes and their defenses at a glance',
  'Two practice questions on application security',
];

const meta = {
  title: 'Application Security Vulnerabilities Without Writing an Exploit',
  handle: 'ap-cybersecurity-application-security-unit-5',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'application security',
  publishOn: '2026-10-07',
  seoTitle: 'Application Security Vulnerabilities, Explained',
  seoDescription: 'Learn application security the way AP Cybersecurity Unit 5 tests it: reasoning about vulnerability classes and defenses, not writing exploit code.',
  summary: 'A conceptual walkthrough of AP Cybersecurity Unit 5, Securing Applications and Data: why untrusted input is dangerous when trusted blindly, how SQL injection and cross site scripting share the same root cause, why validation belongs on the server and not just the browser, how encryption at rest and in transit protects application data differently, a vulnerability class reference table, and two new scenario based practice questions.',
  tags: ['AP Cybersecurity', 'Application Security', 'Unit 5', 'Secure Coding', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('You do not need to know how to write a working exploit to answer an AP Cybersecurity question about one. Unit 5, Securing Applications and Data, tests whether you can reason about a vulnerability from a description of what went wrong, name the class it belongs to, and identify the specific defense that would have closed the gap. This guide teaches application security at exactly that depth.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Application security is the part of the AP Cybersecurity course that tends to intimidate students who have not written much code yet, because the vocabulary sounds like it belongs to a professional penetration tester rather than to an exam. It does not need to. Every application security question on the exam is a reasoning question dressed up in a scenario: a company built something, an attacker found a gap, and you are asked to name the gap and the fix. Nobody is asking you to produce working attack code, and nobody expects you to. What the exam expects is that you understand a small number of ideas well enough to apply them to a scenario you have never seen before, which is a completely different and far more achievable skill than exploit writing.'),
  H.p('This guide walks through those ideas in the order Unit 5 actually needs them: why untrusted input is the root cause behind most of what gets called an application vulnerability, what SQL injection and cross site scripting have in common underneath their different names, why secure coding practices lean so heavily on the server rather than the browser, and how encrypting application data differs depending on whether that data is sitting still or moving across a network. A reference table and two new practice questions close things out.'),

  H.h2(SECTIONS[0]),
  H.p('Nearly every application vulnerability you will see described on the AP Cybersecurity exam traces back to the same underlying mistake: a program received data from outside itself, a form field, a search box, a file upload, an API request, and then used that data as though it were already known to be safe. The data came from a user, and a user is not a trusted source by default, no matter how ordinary the request looks. The general principle Unit 5 wants you to internalize is this: any input a program did not generate itself is untrusted until the program checks it, and skipping that check is what turns an ordinary feature into a security hole.'),
  H.p('It helps to notice how mundane the failure usually is. Nobody sits down and writes a form field that is supposed to be dangerous. A developer builds a search box, a comment box, or a quantity field to do exactly what it says on the label, and the vulnerability appears later, quietly, the first time someone puts something into that field that the developer never imagined a legitimate user would type. The form still works perfectly for every honest visitor. It is only unsafe for the one visitor who tries something unexpected on purpose, which is exactly why these gaps so often go unnoticed until a tester or an attacker actually looks for them.'),
  H.box('key', 'The one sentence version', '<p>Application security is mostly the discipline of assuming every piece of input might be hostile, checking it before it is used, and never assuming a form field will only ever contain what its label promises.</p>'),
  H.p('This is why the general principle matters more than memorizing any single vulnerability name. If you understand that untrusted input is dangerous the moment it is used without being checked, you can reason your way through a vulnerability you have never studied by name, because the underlying shape of the problem repeats itself across dozens of different attack types the exam could describe. It is the same instinct behind least privilege, covered in our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-access-control-least-privilege">access control and least privilege guide</a>: assume nothing is safe by default, and require it to earn trust through an actual check.'),

  H.h2(SECTIONS[1]),
  H.p('SQL injection is the example most students meet first, and it is a genuinely useful one, so it is worth a brief conceptual pass here even though we have covered it in depth as a scenario elsewhere on this blog. A web form asks for something ordinary, an account number, a username, a search term, and the application takes whatever was typed and inserts it directly into a database command without checking or restricting what characters are allowed. If a visitor types an ordinary account number, the command runs exactly as intended. If a visitor instead types text that looks like a piece of a database command, and the application never checked for that possibility, the database can end up executing instructions the developer never meant to expose to a stranger. The fix is not clever code, it is simply refusing to trust the input: validate what is allowed to arrive in that field, and never let raw user text become part of a command the way SQL injection depends on.'),
  H.p('Cross site scripting is the second classic example, and it is worth understanding at the same conceptual level because it is the same root cause showing up in a different place. Instead of a database command, the untrusted input ends up inside a web page that other visitors will later load in their own browsers. Picture a comment section or a discussion board where whatever a visitor types is saved and then displayed back to everyone else exactly as it was submitted, with no processing in between. If the application never checks or encodes that submitted text before showing it to other visitors, a visitor who submits something that looks like an active piece of a web page, rather than ordinary comment text, can cause that content to run inside every other visitor\'s browser when the page loads. The comment box was never supposed to be a place to plant instructions for someone else\'s browser to carry out, and it was not designed to be one. It became one only because the untrusted input was displayed back to other users without being checked first.'),
  H.box('warn', 'The pattern underneath both examples', '<p>SQL injection sends untrusted input into a database command. Cross site scripting sends untrusted input into a page that other visitors\' browsers will run. Different destination, same root cause: input from outside the application was trusted and used as-is instead of being checked first. Recognizing that shared shape is worth more on the exam than memorizing either name in isolation.</p>'),
  H.p('There is a wider category worth naming briefly too, even though the AP Cybersecurity exam will not ask you to write low level code: memory related issues, where a program writes more data into a fixed region of memory than that region was ever sized to hold, because nothing checked the size of the incoming input before writing it. Conceptually, it is the same untrusted input principle applied to memory instead of a database or a web page. You do not need to know how to trigger one of these to answer a scenario question about it. You need to recognize that a program accepting input of an unexpected size, without checking that size first, is the same family of mistake as accepting unexpected characters or unexpected content.'),

  H.h2(SECTIONS[2]),
  H.p('Once the general principle is clear, secure coding practice mostly follows from applying it consistently rather than from any single clever trick. The habits Unit 5 wants you to be able to reason about fall into a small number of buckets, and every one of them is really the same discipline applied in a different spot.'),
  H.ul([
    'Validate on the server, not only in the browser. Code running in a visitor\'s browser, including anything that checks a form field before it is submitted, can be bypassed entirely by anyone who sends a request directly to the server instead of using the page as intended. Browser side checks are a convenience for honest users, not a security control, so the server has to repeat the same checks on its own before trusting anything it receives.',
    'Default to least trust. Treat every field, every uploaded file, and every incoming request as suspicious until it has been checked, rather than assuming it is fine unless something looks obviously wrong. This mirrors the least privilege thinking that shows up elsewhere in the course: start from the assumption that access, and here, trust, has to be earned by a specific check, not granted by default.',
    'Sanitize before use, not after. Checking or cleaning input has to happen before that input is inserted into a database command, written into a page, or used to build a file path, not afterward. A check applied too late, or applied only to how the result is displayed rather than to the input itself, still leaves the actual point of use unprotected.',
    'Never assume a form field will only ever contain what its label says. A quantity field, a name field, and a comment box are all just text boxes as far as the underlying program is concerned. Nothing stops a visitor from typing something else into any of them, and secure code is written with that in mind rather than around an assumption of good faith.',
  ]),
  H.p('The server side validation point deserves its own emphasis, because it is one of the more common gaps students underestimate. A checkout form might use code running in the browser to confirm a quantity field holds a positive number before letting a visitor click the checkout button, and that check genuinely improves the experience for an honest visitor who made a typo. But that same check does nothing to stop a visitor who skips the web page entirely and sends a request straight to the server with whatever value they choose, since the browser side code never runs at all in that path. If the server accepts whatever arrives without checking it again, the browser side validation was never a security control in the first place, only a convenience. The server is the actual trust boundary, and anything the server accepts without its own check is, from a security standpoint, unchecked.'),
  H.box('tip', 'A quick way to test your own understanding', '<p>When a scenario describes a vulnerability, ask two questions in order: where did the untrusted input first enter the system, and at what point was it used without being checked. The gap between those two points is almost always where the fix belongs, whether that fix is server side validation, input sanitizing, or encoding output before it is displayed.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Unit 5 also expects a clear grasp of how encryption protects application data differently depending on where that data actually is, and this is a distinction that is easy to blur if you only think of encryption as a single blanket protection rather than two separate protections for two separate risks.'),
  H.p('Data at rest is data that is currently stored somewhere: a database, a file on a server, a backup. Encrypting data at rest means that if the underlying storage is ever stolen, copied, or accessed by someone who should not have it, the data itself is unreadable without the key. This protects against a specific risk, unauthorized access to storage, and it does nothing at all about a second, separate risk.'),
  H.p('Data in transit is data actively moving from one place to another: from a visitor\'s browser to an application server, or from that application server out to a third party service it needs to talk to. Encrypting data in transit, most commonly by using an encrypted connection rather than a plain unencrypted one, protects that data while it travels, which is a completely different risk from data sitting on a disk. Someone positioned to intercept network traffic between two systems can potentially read anything sent in plain, unencrypted form, even if that same data was perfectly well protected the moment before it left storage and the moment after it arrived.'),
  H.box('key', 'Why this distinction is genuinely testable', '<p>An application can encrypt its stored data carefully and still transmit that same data over an unencrypted connection the moment it needs to send it somewhere, leaving a real gap despite real work having been done elsewhere. Strong protection in one state never implies strong protection in the other, and a scenario that describes one without the other is testing exactly that gap.</p>'),
  H.p('At the application layer specifically, this plays out in ordinary, unglamorous ways: an application that stores customer records with encryption enabled but calls an internal reporting service over plain, unencrypted requests. An application that protects a password field carefully on the way in but logs that same field in plain text somewhere for debugging purposes, leaving a stored, unencrypted copy sitting in a log file. The lesson is not that encryption is complicated. It is that encryption has to be applied everywhere sensitive application data actually goes, in whatever state it happens to be in at that moment, rather than applied once and assumed to cover every later use. Confidentiality, one leg of the CIA triad covered in our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cia-triad-explained">CIA triad guide</a>, is exactly what both forms of encryption are protecting here, just at two different points in the data\'s life.'),

  H.h2(SECTIONS[4]),
  H.p('The table below collects the vulnerability classes covered above into a single reference: what makes each one possible, and what specifically closes that gap.'),
  H.table(
    ['Vulnerability class', 'What makes it possible', 'What specifically defends against it'],
    [
      ['SQL injection', 'Untrusted input is inserted directly into a database command without being checked or restricted first', 'Validating and restricting input before it reaches a database command, so raw user text can never become part of the command itself'],
      ['Cross site scripting', 'Untrusted input is displayed back to other visitors without being checked or encoded first', 'Encoding or sanitizing content before it is rendered in a page, so submitted text is treated as data rather than as something the browser should run'],
      ['Bypassed client side validation', 'A check exists only in the code running in the visitor\'s browser, and the server trusts whatever arrives without repeating that check', 'Re-validating every input on the server itself, since anything the server accepts without its own check is effectively unchecked'],
      ['Memory related overflow', 'A program writes incoming data into a fixed memory region without first checking whether that data is larger than the region can hold', 'Checking the size of input before it is written, and using languages or libraries that manage memory boundaries safely by default'],
      ['Insecure data in transit', 'Application data is sent over a connection that does not encrypt it while it travels between systems', 'Encrypting the connection itself so data cannot be read by anyone positioned to intercept it in transit, independent of how it was protected at rest'],
    ]
  ),
  H.p('Notice the shape shared by every row in that table: something arrived, or was sent, without being checked or protected at the specific point where the risk actually occurred. The defense in every case is not a single tool, it is a habit applied consistently at that exact point, which is the whole reason the general principle from the first section matters more than memorizing any one row on its own.'),

  H.h2(SECTIONS[5]),
  H.p('Since Unit 5 tests this material through scenarios rather than definitions, here are two new practice questions in that same format. Neither one repeats the SQL injection scenario covered elsewhere on this blog; both test the same underlying reasoning through different situations.'),
  H.mcq({
    n: 1,
    stem: 'A school\'s online discussion board lets students post replies that are saved and then displayed to the rest of the class exactly as they were typed, with no processing applied in between. A student discovers that posting a reply containing certain web page instructions causes classmates who later view that discussion thread to have their browsers silently redirected to an unrelated website. Which practice would have most directly prevented this?',
    options: [
      'Limiting how many replies a single student can post per day',
      'Encoding or sanitizing submitted reply text before displaying it back to other students, rather than showing it exactly as it was submitted',
      'Requiring students to log in with a username and password before posting a reply',
      'Storing the discussion board\'s replies in an encrypted database table',
    ],
    correct: 1,
    why: 'This is a cross site scripting scenario: the application saved untrusted input and then displayed it back to other users without checking or encoding it first, which let submitted content behave as part of the page rather than as plain reply text. The direct fix is encoding or sanitizing that content before it is rendered back to other visitors, so it is always treated as data to display rather than as something a browser should run. Limiting posting frequency does not address what happens inside an individual reply. Requiring a login controls who can post, not what a post is allowed to contain once it is displayed to others. Encrypting the stored data protects it while it sits in the database, which is a data at rest concern, and has no effect on what happens when that same data is later shown, unencrypted, on a page in someone else\'s browser.',
  }),
  H.mcq({
    n: 2,
    stem: 'An online store\'s order form uses code running in the visitor\'s browser to check that a quantity field holds a positive whole number before the checkout button becomes clickable. The store\'s server accepts whatever quantity value arrives with an order request and processes it without checking it again. A tester bypasses the order page entirely, sends a request directly to the server with a negative quantity, and the store credits money to the tester\'s account instead of charging it. Which practice would have most directly prevented this outcome?',
    options: [
      'Adding a second confirmation dialog in the browser after the checkout button is clicked',
      'Re-validating the quantity value on the server itself, rather than trusting the check performed only in the visitor\'s browser',
      'Requiring visitors to create an account before reaching the order form',
      'Increasing how many items are allowed in a single order',
    ],
    correct: 1,
    why: 'Code running in a visitor\'s browser is a convenience for honest users, not a security control, because anyone able to send a request directly to the server bypasses that browser code entirely, exactly as the tester did here. The direct fix is re-validating the same rule on the server, which is the actual trust boundary, so an out of range value cannot be accepted no matter how the request arrives. A second confirmation dialog is still only browser side code and would be bypassed the same way. Requiring an account controls who can place an order, not whether the order\'s data is checked once it is submitted. Changing the allowed order size does not address the missing check at all. The general lesson is that any validation performed only on the client has to be treated as absent from a security standpoint until the server repeats it.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Does AP Cybersecurity expect me to write exploit code?', a: 'No. Unit 5 tests whether you can read a scenario, identify which vulnerability class it describes, and name the specific practice that would have prevented it. Writing working attack code is never required, and the exam is built around reasoning about described scenarios, not producing them.' },
    { q: 'Is SQL injection the only vulnerability I need to understand for Unit 5?', a: 'No. SQL injection is one commonly taught example of a much broader principle: untrusted input causing harm when it is used without being checked. Cross site scripting, bypassed client side validation, and memory related issues are built on the same underlying idea applied in different places, and understanding that shared root cause matters more than memorizing any single named vulnerability.' },
    { q: 'Why does client side validation not count as real security?', a: 'Because code running in a visitor\'s browser can be bypassed by anyone who sends a request directly to the server instead of using the page normally. Client side checks improve the experience for an honest user who made a mistake, but they do not stop a deliberate attempt to skip them, which is why the server has to repeat the same checks on its own before trusting anything it receives.' },
    { q: 'What is the difference between encryption at rest and encryption in transit for an application?', a: 'Encryption at rest protects data while it is stored, such as in a database or a backup, against someone who gains unauthorized access to that storage. Encryption in transit protects data while it is actively moving between systems, such as from a browser to a server, against someone able to intercept that network traffic. An application can do one well and still leave a real gap in the other, since they protect against different risks.' },
  ]),

  H.cta({
    heading: 'Build the rest of Unit 5 the same way',
    body: 'The full AP Cybersecurity curriculum works through Securing Applications and Data alongside every other unit, plus a complete practice exam in the real scenario format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Explore the curriculum' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Try a practice exam', alt: true },
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
