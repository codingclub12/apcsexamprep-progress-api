'use strict';
// Weekly course post: AP Cybersecurity. A career and reference piece: what an
// actual entry-level cybersecurity job looks like at 22, grounded in real job
// titles, BLS market data, and honest talk about the unglamorous parts, with
// a concrete throughline back to specific AP Cybersecurity units.
const H = require('../../lib/blog-house');

const SRC = {
  bls: {
    source: 'U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: Information Security Analysts',
    url: 'https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm',
    asOf: 'September 2026',
  },
};

const SECTIONS = [
  'What cybersecurity careers actually look like at 22',
  'A day in the life of a Tier 1 SOC analyst',
  'The unglamorous truth about entry-level security work',
  'Realistic paths in: degree, certifications, and hands-on reps',
  'What the job market actually looks like right now',
  'From AP Cybersecurity units to real entry-level tasks',
  'Two practice questions from Securing Applications and Data',
];

const meta = {
  title: 'What Cybersecurity Careers Actually Look Like at 22',
  handle: 'ap-cybersecurity-careers-at-22',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'cybersecurity careers',
  publishOn: '2026-09-08',
  seoTitle: 'What Cybersecurity Careers Look Like at 22',
  seoDescription: 'A concrete look at real entry-level cybersecurity careers: SOC analyst work, honest job market data, and how AP Cybersecurity maps to the job.',
  summary: 'A grounded look at what an actual entry-level cybersecurity career looks like at 22: real job titles like SOC analyst, what the work is actually like day to day, honest talk about the monitoring-and-documentation reality behind the hacker image, realistic paths in through degrees, certifications, and hands-on reps, current job market numbers from the Bureau of Labor Statistics, and a specific map from AP Cybersecurity units to the tasks those jobs actually involve.',
  tags: ['AP Cybersecurity', 'Careers', 'SOC Analyst', 'Certifications', 'Career Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Cybersecurity careers rarely look like the movies. This is a concrete, honest look at what an actual entry-level job in the field looks like at 22: the real job titles, the not-always-glamorous daily work, the paths people actually take in, and what the job market genuinely looks like right now.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 8, 2026', updated: 'September 8, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.p('Ask a high schooler what a cybersecurity career looks like and you will usually get some version of the same picture: a hoodie, a dark room, lines of green text scrolling past, a lone genius stopping a hacker in real time. That image sells movie tickets. It does not describe what a person is actually doing at their desk eighteen months after finishing a certification or a computer science degree, and pretending otherwise does students a disservice, because the gap between the fantasy and the job is exactly where people quit in year one, disappointed by work they were never accurately told about.'),
  H.p('The reality is both less cinematic and, for the right kind of student, more genuinely interesting: a real first job in this field is usually a title like Security Operations Center Analyst, Tier 1, not "hacker" or "penetration tester." Those more glamorous-sounding roles exist, but they are almost never where anyone starts. This guide walks through what the actual entry point looks like, hour by hour, and connects it back to specific parts of the AP Cybersecurity course so a student can see exactly which classroom skill maps to which piece of the real job. We have covered what AP Career Kickstart is as a College Board category elsewhere on this blog; this piece is about the job on the other end of the course, not the label above it.'),

  H.h2(SECTIONS[0]),
  H.p('Cybersecurity careers, at the entry level, sit closer to IT operations than to spy fiction. The job postings and the people actually hiring for these roles describe a specific, narrow band of true first jobs: a Security Operations Center analyst monitoring alerts, a security support technician handling access and configuration tickets, a governance, risk, and compliance (GRC) analyst tracking policy adherence, or a junior security analyst rotating across a few of those functions at a smaller company that cannot afford separate teams for each. None of those titles involve breaking into anything. All of them involve watching for, documenting, and responding to signs that something might be wrong.'),
  H.p('A four-year computer science or cybersecurity degree is one path into these roles, and it remains the most common one. But it is not the only common one, and it is worth saying plainly that a help desk or general IT support role is one of the most reliable feeder paths into a first security title, because it teaches the underlying systems knowledge, the ticketing discipline, and the "something is broken, go find out why" instinct that a SOC queue runs on every single day.'),
  H.box('key', 'The one sentence version', '<p>An entry-level cybersecurity career almost never starts with offense. It starts with defense, and specifically with watching, triaging, and documenting, which is a real and valuable skill set, just not the one pop culture advertises.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The clearest way to understand what this job actually is, rather than what it is called, is to walk through an ordinary shift. A Tier 1 SOC analyst is the first line of defense at most organizations, and their day is organized around a queue, not around a dramatic single event. Here is a realistic shape for that day.'),
  H.table(
    ['Time', 'What the analyst is actually doing'],
    [
      ['Start of shift', 'Reviews the overnight alert queue in the SIEM (the security information and event management platform) to see what fired while nobody was watching, and reads the handoff notes from the previous shift.'],
      ['Morning block', 'Works through alerts one at a time: is this a real threat or a false positive? A login from an unusual location might be an employee on a business trip or it might be a credential that was phished. The analyst pulls context, checks logs, and decides which one it is.'],
      ['Mid-morning', 'Escalates anything confirmed or ambiguous to a Tier 2 or Tier 3 analyst with a written summary of what was found, because the analyst\'s job at this level is accurate triage and clear documentation, not solving every incident alone.'],
      ['Midday', 'Works the phishing-report queue: employees forward suspicious emails, and the analyst checks headers, links, and attachments to confirm whether each one is actually malicious.'],
      ['Afternoon', 'Documents closed tickets, updates a running log of patterns worth flagging to the team, and may sit in on a short standup where the shift compares notes on anything unusual.'],
      ['End of shift', 'Writes handoff notes for the next analyst, the same kind of note received at the start of the day, so nothing gets lost between shifts.'],
    ]
  ),
  H.p('Notice what is missing from that table: there is no moment where the analyst "hacks" anything. The entire day is monitoring, judgment calls about ambiguous evidence, and writing things down clearly enough that the next person, whether that is a colleague or an auditor, can trust the record. That is not a lesser version of the job. It is the job.'),

  H.h2(SECTIONS[2]),
  H.p('It is worth stating this directly rather than letting a student discover it on their own after taking the job: entry-level security work is, most days, closer to monitoring, triage, and documentation than to anything resembling active hacking. That is not a knock on the field. It is an honest description of where the actual risk to an organization gets caught, which is almost always in the boring middle of a process, not in a dramatic confrontation with an attacker.'),
  H.box('warn', 'The expectation gap that causes real problems', '<p>Students who go into this field expecting daily offense-style excitement, breaking into systems, chasing attackers in real time, tend to burn out fast or leave within a year, not because the work is bad, but because nobody told them the actual shape of it. Students who go in understanding that the job is mostly disciplined pattern recognition and clear writing tend to find it genuinely satisfying, because that description is accurate and the satisfaction of catching something real in a pile of noise is a legitimate one.</p>'),
  H.p('A GRC analyst role makes this even clearer. That job is largely about checking whether an organization\'s actual practices match its stated security policy: are backups encrypted the way the policy says they should be, is access to sensitive data actually restricted to the people who are supposed to have it, is a vendor contract missing a required security clause. None of that is hacking. All of it is exactly the kind of work that keeps a real breach from happening in the first place, and it is a completely legitimate, well-paid entry point into the field for a student who is more drawn to structured analysis than to technical troubleshooting.'),

  H.h2(SECTIONS[3]),
  H.p('A traditional four-year degree in computer science, information technology, or a cybersecurity-specific major is a real and common path into these roles, and it remains the path most large employers default to expecting. That has not changed and this guide is not arguing otherwise.'),
  H.p('What is genuinely different about cybersecurity, compared with many other technology fields, is how much weight a recognized certification and demonstrable hands-on skill carry alongside or even in place of a degree. In practice, entry-level hiring in this field leans harder on a candidate being able to show they can actually do the work, through a certification, a home lab, a capture-the-flag competition, or a help desk track record, than many adjacent tech fields do, where a bachelor\'s degree functions closer to a hard prerequisite. This is informed observation from how these roles are typically described and filled rather than a single measured statistic, and it is worth treating as useful context rather than a guarantee, but it is a real and consistently reported pattern in how this specific field hires.'),
  H.p('CompTIA Security+ is the certification that comes up most consistently as a realistic first credential, precisely because it is built for people entering the field rather than for people already deep into it. Certifications aimed at experienced practitioners exist too, but they assume years of prior work and are not where an entry-level candidate should be spending study time first.'),
  H.p('The practical version of this section, for a student planning ahead: a degree is valuable and worth pursuing if that is the plan already in motion, but it is not the only door into this field, and hands-on practice plus a recognized entry certification is a legitimate, well-traveled alternate route that many working analysts actually took.'),

  H.h2(SECTIONS[4]),
  H.p('The current market data is worth including directly rather than gesturing at vaguely, because a student deciding whether to invest years of study in a field deserves real numbers, not just enthusiasm.'),
  H.p(H.stat('29 percent projected employment growth for information security analysts from 2024 to 2034, far faster than the average for all occupations', SRC.bls)),
  H.p(H.stat('about 16,000 average annual openings for information security analysts projected each year over that decade, from a combination of growth and the need to replace workers who leave the field or retire', SRC.bls)),
  H.sourceNote(SRC.bls.source, SRC.bls.url, SRC.bls.asOf),
  H.p('That growth rate is genuinely strong, well ahead of most occupations tracked in the same report. It is also worth reading the wage data honestly rather than only quoting the headline number.'),
  H.p(H.stat('a median annual wage of $124,910 for information security analysts in May 2024, with the lowest-paid 10 percent earning under $69,660', SRC.bls)),
  H.sourceNote(SRC.bls.source, SRC.bls.url, SRC.bls.asOf),
  H.box('tip', 'How to read that wage spread', '<p>That median figure describes the whole profession, from a first-year Tier 1 SOC analyst to a security leader with fifteen years of experience, not a starting salary. A realistic entry-level income sits well below the median, closer to the lower end of that range, and climbs meaningfully with a couple of years of experience and, often, a certification or two earned along the way. Treat the median as where the field goes, not where it starts.</p>'),
  H.p('The honest takeaway is that the demand behind these roles is real and well documented by a primary federal source, not just something certification vendors say to sell exam vouchers. That does not make the entry-level work itself any less about monitoring, triage, and documentation. It just means there is a genuinely growing number of seats at that unglamorous but important table.'),

  H.h2(SECTIONS[5]),
  H.p('This is the part that matters most for a student sitting in an AP Cybersecurity classroom right now, because the course was not written as an abstract academic exercise. Each of its five units maps onto a specific piece of what the job above actually requires, and seeing that throughline is worth more than any amount of career day enthusiasm.'),
  H.table(
    ['AP Cybersecurity unit', 'What it teaches', 'Where it shows up on the job'],
    [
      ['Unit 1, Introduction to Security', 'The CIA triad and the threat, vulnerability, and risk relationship', 'Classifying an alert in the SIEM queue: is this a confidentiality problem, an availability problem, or both, and how urgent is it really'],
      ['Unit 2, Securing Spaces', 'Social engineering, phishing, and physical and human-layer controls', 'Working the phishing-report queue and reasoning about why an employee-reported email is or is not a real threat'],
      ['Unit 3, Securing Networks', 'Traffic, segmentation, and firewall reasoning', 'Reading network logs and understanding why a blocked connection is either a working control or a misconfiguration causing an outage'],
      ['Unit 4, Securing Devices', 'Endpoint hardening, patching, and mobile and IoT security', 'Endpoint alerts and patch-verification tickets, plus the structured reasoning behind a device security write-up'],
      ['Unit 5, Securing Applications and Data', 'Encryption, secure data handling, and common software vulnerabilities', 'Reviewing a vulnerability scan finding or checking whether sensitive data is actually encrypted the way policy claims it is'],
    ]
  ),
  H.p('The <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity curriculum</a> builds these five units in that order for a reason: Unit 1\'s vocabulary is the lens every later unit reuses, the same way a SOC analyst reuses "is this a confidentiality issue or an availability issue" dozens of times a shift without ever consciously naming it as Unit 1 material anymore. By the time a student reaches Unit 5, the classification habit from Unit 1, the human-layer suspicion from Unit 2, and the network fluency from Unit 3 are all quietly doing work underneath the new material, which is close to how the actual job builds expertise over a first year on a SOC floor.'),
  H.p('The single AP Cybersecurity free response question, a device security analysis drawn from Unit 4, is not a random academic exercise either. Writing a structured justification for why a specific device configuration is risky and what should be done about it is close cousin to the kind of written escalation a Tier 1 analyst sends up to Tier 2 every day: here is what I found, here is why it matters, here is what I think should happen next. Our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-launch-2026-27-guide">full AP Cybersecurity launch guide</a> covers that free response format and the course\'s exam structure in more depth for a student planning a full year of study around it.'),

  H.h2(SECTIONS[6]),
  H.p('Since Unit 5, Securing Applications and Data, maps directly onto tasks like reviewing a vulnerability finding or checking an encryption policy against actual practice, here are two practice questions on genuine Unit 5 content, in the scenario-first format the real exam uses.'),
  H.mcq({
    n: 1,
    stem: 'A company stores customer records in a database with full-disk encryption enabled, so the data is unreadable if the physical drive is ever stolen. That same company then transmits those records to a third-party vendor over a plain, unencrypted HTTP connection whenever a report is generated. Which statement correctly describes this company\'s data protection?',
    options: [
      'The data is fully protected, because encryption at rest is the only protection that matters for sensitive records',
      'The data is protected while stored but exposed while being transmitted, because encryption at rest and encryption in transit protect against different risks',
      'The data is not actually protected at all, because full-disk encryption does nothing once the database is running',
      'The data is over-protected, because encrypting data both at rest and in transit is redundant once either one is in place',
    ],
    correct: 1,
    why: 'Encryption at rest protects data while it is stored, which is exactly what stops a stolen physical drive from being readable. Encryption in transit protects data while it is moving across a network, which is a separate risk: anyone able to intercept that unencrypted HTTP connection could read the records as they travel to the vendor, even though the same data was perfectly safe sitting on the disk. The two protect against different attack scenarios and neither one substitutes for the other. This company has done real work securing the data at rest and left an equally real gap in how it protects that same data in transit, which is a common and testable pattern: strong protection in one state does not imply strong protection in another.',
  }),
  H.mcq({
    n: 2,
    stem: 'A web application accepts a user\'s account number through a search box and inserts that value directly into a database query without checking or restricting what characters the user is allowed to enter. A tester discovers that typing database commands into the search box instead of an account number causes the application to return data it should never expose. Which practice would have most directly prevented this vulnerability?',
    options: [
      'Encrypting the database at rest, since the data being exposed was sensitive',
      'Validating and restricting user input before it is used in a database query, rather than trusting it as-is',
      'Requiring a stronger password policy for user accounts',
      'Increasing the server\'s available storage so the query could complete without errors',
    ],
    correct: 1,
    why: 'This scenario describes a SQL injection vulnerability: because the application inserts unchecked user input directly into a database query, an attacker can type database commands instead of ordinary data and have the application execute them. The direct fix is input validation, restricting what a user is allowed to type into that field and treating any input as untrusted until it is checked, rather than assuming a search box will only ever receive an account number. Encrypting the database at rest would not stop this attack, since the application itself is the one retrieving and returning the data on the attacker\'s behalf. A stronger password policy addresses a completely different risk, unauthorized login, not unchecked input reaching a query. Storage capacity has nothing to do with the vulnerability at all. Secure application design means never trusting raw input, which is exactly the Unit 5 principle this scenario is built to test.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is the most realistic first job title in cybersecurity?', a: 'Security Operations Center (SOC) Analyst, Tier 1, is the most commonly cited true entry-level title, alongside Security Support Technician and GRC (governance, risk, and compliance) Analyst. Titles like penetration tester or security architect are almost never entry-level roles; they come after a few years of experience in a role like these.' },
    { q: 'Do I need a four-year degree to start a cybersecurity career?', a: 'A degree is a common and valuable path, but it is not the only one. Hands-on experience, an entry-level certification such as CompTIA Security+, and a background in general IT support (like a help desk role) are a well-traveled alternate route into this field specifically, more so than in many other technology fields.' },
    { q: 'Is entry-level cybersecurity work mostly hacking?', a: 'No. Entry-level security work is mostly monitoring alerts, triaging whether something is a real threat or a false positive, and documenting findings clearly. It is closer to careful, structured investigation than to the offense-focused hacker image popular culture usually shows.' },
    { q: 'How does the AP Cybersecurity course connect to these actual jobs?', a: 'Each of its five units maps to a real task: Unit 1\'s CIA triad and threat vocabulary is how an analyst classifies an alert, Unit 2\'s social engineering content is the phishing-report queue, Unit 3\'s network content is reading traffic and firewall logs, Unit 4\'s device security content is endpoint and patch tickets, and Unit 5\'s application and data content is vulnerability review and encryption policy checks.' },
    { q: 'Is the cybersecurity job market actually growing, or is that just marketing from certification providers?', a: 'It is a real, federally tracked trend. The U.S. Bureau of Labor Statistics projects strong, well above average employment growth for information security analysts over the next decade, with a substantial number of openings projected each year, a figure that comes from the government\'s own labor statistics rather than from an exam vendor.' },
  ]),

  H.cta({
    heading: 'See where Unit 5 fits in the full course',
    body: 'The complete AP Cybersecurity curriculum builds from Unit 1 vocabulary through Unit 5 application and data security, plus a full practice exam in the real scenario format.',
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
  H.updatedNote('This guide reflects job titles, market data, and BLS projections as of September 2026 and will be revisited as new labor market data is published. Last reviewed September 8, 2026.'),
]);

module.exports = { meta, body };
