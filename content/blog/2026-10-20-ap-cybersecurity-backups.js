'use strict';
// Weekly course post: AP Cybersecurity. Evergreen concept explainer, Unit 5 territory (availability mechanics).
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why availability gets studied least and tested just as much',
  'A real data backup plan: the 3-2-1 rule, reasoned through',
  'A backup existing is not the same fact as a backup working',
  'RTO and RPO: the two questions every recovery plan has to answer',
  'Why ransomware is the scenario that makes all of this suddenly matter',
];

const meta = {
  title: 'Data Backups, Recovery, and the Availability Nobody Studies',
  handle: 'ap-cybersecurity-backups-recovery-availability',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'data backup',
  publishOn: '2026-10-21',
  seoTitle: 'Data Backup Strategy: AP Cybersecurity Guide',
  seoDescription: 'What a real data backup strategy requires: the 3-2-1 rule explained by reasoning, tested recovery, and RTO and RPO for the AP Cybersecurity exam.',
  summary: 'Availability is one third of the CIA triad, but it gets a fraction of the study time confidentiality and integrity receive, and the exam does not grade it any lighter. This guide teaches data backups as the concrete mechanism behind availability: the 3-2-1 rule explained by reasoning rather than recited, why a backup that exists is not the same fact as a backup that restores, and recovery time and recovery point as questions a plan has to answer before an incident, not during one.',
  tags: ['AP Cybersecurity', 'Data Backup', 'Availability', 'Unit 5', 'Concept Guide'],
};

const body = H.article([
  H.dek('Confidentiality gets the identity theft stories. Integrity gets the tampered record stories. Availability gets a single bullet point and a bad drive analogy, and then the class moves on. That is backwards, because availability is the property that fails the most often in the real world, and a data backup strategy is the entire reason it ever gets restored.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 20, 2026', updated: 'October 20, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('The <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cia-triad-explained">CIA triad</a> is confidentiality, integrity, and availability, and by the time a class reaches Unit 5, two of those three have collected most of the memorable stories. Confidentiality gets the nurse who looked up a coworker\'s chart. Integrity gets the coach who edited an eligibility record. Availability tends to get one line: a server went down, and that is an availability problem. Then the class moves on to encryption or access control, because those feel like the parts of security that involve actually doing something.'),
  H.p('That imbalance is not really about importance. It is about drama. Confidentiality violations make headlines because they involve a villain and a victim. Integrity violations make good exam scenarios because they involve a clean before and after. Availability violations are frequently just a hard drive dying, a power supply failing, or a careless delete, and none of that reads as a story. But the exam does not grade availability questions any easier because the underlying event was boring, and the real world does not either: a hospital that cannot pull up lab results, a school that cannot access grades, and a company that cannot process orders are all availability failures, and every one of them is expensive in a way that has nothing to do with how interesting the cause was.'),
  H.p('Availability is also the one property with an actual, buildable defense that a student can describe mechanism by mechanism rather than just naming. Confidentiality defenses tend to be about limiting who has access. Integrity defenses tend to be about limiting who can change something and detecting it when they do. Availability defense is backups and recovery, full stop, and it is concrete enough that the exam can ask a student to reason through a plan rather than just recall a definition. That is what the rest of this guide teaches: not "backups are important," but why each piece of a real backup plan exists and what specifically it protects against.'),
  H.box('key', 'The reframe', '<p>A data backup is not a checkbox next to the word availability. It is the specific mechanism that turns a destroyed or unreachable copy of data back into a reachable one. Everything below is about what has to be true of that mechanism before it can actually be trusted to work.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The 3-2-1 rule is usually taught as three numbers to memorize: three copies of your data, on two different types of media, with one copy stored offsite. Memorized that way, it is trivia. Reasoned through, each number is answering a specific failure the other numbers cannot cover.'),

  H.h3('Multiple copies, because any single copy can fail on its own'),
  H.p('Start with the idea that a backup is not "the data plus one extra copy." It has to be enough copies that the failure of any single one still leaves the data recoverable. If there is only the live data and one backup, and that backup silently corrupts, gets overwritten by a bad process, or is deleted by mistake, there is no second chance left. Three total copies, the live data plus two backups, means a single bad copy is a nuisance rather than a catastrophe. The number three is not magic. The reasoning is that a plan built around exactly one point of failure is not really a plan.'),

  H.h3('Two different media types, because one failure mode should not be able to reach both'),
  H.p('This is the part students skip past fastest, and it is the part that actually does the most protecting. If a live server and its backup drive are both spinning hard disks sitting in the same machine, then anything that kills one kind of hardware, a power surge through that machine, a firmware bug affecting that model of drive, physical failure from the same batch of hardware, has a real chance of taking out both at once. Storing a second copy on a different kind of media, an external drive, tape, or cloud object storage instead of a second local disk, means a failure mode that is specific to one medium does not automatically reach the other. The two media types exist to break a shared failure mode, not to look more thorough on paper.'),

  H.h3('One copy offsite, because a single location can be destroyed as a unit'),
  H.p('This is the piece the CIA triad guide only introduces at a high level, so it is worth being exact about it here: a fire, a flood, a burglary, or a building level power event does not care how many backup copies were sitting in the room. If every copy of the data lives in the same physical location as the system it protects, then any event that destroys that location destroys the data and every backup of it simultaneously. Storing at least one copy somewhere physically separate, a different building, a different city, or a cloud provider\'s data center, means the event that takes out the primary system cannot also be the event that takes out the last working copy. Offsite is not about the internet. It is about geography.'),
  H.box('tip', 'One sentence for each part', '<p>Multiple copies protect against one copy going bad. Multiple media types protect against one kind of hardware failing. One offsite copy protects against one location being destroyed. Each part of 3-2-1 answers a different question about what could go wrong, which is why dropping any one of the three leaves a real gap rather than a smaller version of the same protection.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Here is the failure mode that experienced IT staff worry about more than almost any other, and it is one most students have never even considered: a backup can exist, run on schedule, complete without an error message, and still fail to actually restore anything when it is needed. The backup existing and the backup being restorable are two different facts, and only the second one matters.'),
  H.p('This happens for reasons that sound small individually. A backup job quietly starts skipping a folder after a permissions change nobody noticed. A backup format becomes incompatible with a newer version of the software that has to read it back. A tape gets stored correctly but degrades sitting on a shelf for years. A cloud backup completes successfully every night, but nobody ever attempts to actually pull a file back out of it, so nobody discovers that the restore process itself was broken until the day it is the only option left. In every one of these cases, a dashboard would have shown a green checkmark right up until the moment the backup was actually needed.'),
  H.p('The only way to close that gap is to test the restore itself, not just the backup job. That means periodically taking a backup copy and actually recovering real data from it, on a schedule, before an emergency forces the question. An organization that has never tested a restore does not know whether it has a working recovery plan or a comforting green checkmark. Those are not the same thing, and the exam expects a student to recognize the difference between "a backup was performed" and "the data was successfully recovered" as two separate claims, only one of which actually proves availability was protected.'),
  H.box('warn', 'The trap in a scenario question', '<p>A scenario that says backups ran every night for two years is not evidence that recovery works. It is evidence that a schedule was followed. Do not treat "we have backups" and "we can recover from our backups" as the same sentence unless the scenario explicitly says a restore was tested and succeeded.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Once a backup plan exists and is actually tested, two more questions decide whether it is good enough for the situation it is protecting. Neither one is really about the technology. Both are about how much loss an organization can tolerate, described as a plan decision rather than as jargon to memorize.'),

  H.h3('Recovery time: how long can the system stay down'),
  H.p('The first question is how long the organization can function with the system unreachable before the disruption itself becomes the bigger problem. A small business\'s internal scheduling tool being down for a full day might be a mild annoyance. A hospital\'s patient records system being down for a full day is a different category of problem entirely. This is the recovery time question, and answering it honestly, in advance, is what tells a team whether their current restore process, which might take six hours, is actually fast enough for the system it protects. A backup strategy that would technically work but takes three days to restore is not a real answer for a system that cannot tolerate three hours of downtime.'),

  H.h3('Recovery point: how much recent data can be lost'),
  H.p('The second question is how much data created since the last backup the organization can afford to lose permanently. If backups run once every night, and a failure happens at four in the afternoon, everything entered that day since the last backup is gone unless something else captured it. For a system logging low stakes analytics, losing a partial day might be tolerable. For a system recording financial transactions or grades entered in the last few hours of a school day, losing that same window is not tolerable at all. This is the recovery point question, and it is what actually decides how often backups need to run in the first place, not a fixed schedule chosen out of habit.'),
  H.p('Put together, these two questions are what turn "we have backups" into an actual plan. How long can we be down, and how much recent work can we afford to lose, are decisions that have to be made deliberately for each system, because a hospital\'s patient database and a school\'s daily lunch menu do not need the same answer to either question, even though both could technically be protected by the same kind of backup job.'),

  H.table(
    ['Backup strategy element', 'What it specifically protects against'],
    [
      ['Multiple copies (not just one backup)', 'A single backup copy being corrupted, overwritten, or deleted'],
      ['Multiple media types', 'One kind of hardware or storage failing and taking every copy on that medium with it'],
      ['An offsite copy', 'A single physical event, fire, flood, theft, destroying every copy stored in one location'],
      ['Tested restores, not just completed backup jobs', 'Discovering a broken recovery process during an actual emergency instead of ahead of it'],
      ['A defined recovery time expectation', 'A restore process that technically works but is too slow for the system it protects'],
      ['A defined recovery point expectation', 'Losing more recent work than the organization can actually tolerate losing'],
    ]
  ),

  H.h2(SECTIONS[4]),
  H.p('All of this stays theoretical until there is a reason backups suddenly matter on a specific afternoon, and the scenario that makes that concrete is ransomware. The mechanics of how an attacker gets in and spreads through a network are their own topic, covered in the <a href="/blogs/ap-cybersecurity/ap-cybersecurity-phishing-deep-dive">phishing deep dive</a>; the piece worth isolating here is what happens after the attack succeeds and encryption finishes.'),
  H.p('Ransomware encrypts live data in place, which locks the organization out of files it still legally and practically owns. As the CIA triad guide covers, that is an availability violation rather than a confidentiality one, because nothing about the encryption itself proves the data was viewed or copied. What matters for this guide is what happens next: the organization is now facing exactly the recovery time and recovery point questions from the section above, except under attacker pressure instead of on a whiteboard. If backups exist, are stored separately from the system that just got encrypted, and have actually been tested, the path forward is to restore from them, which does not depend on the attacker\'s cooperation, honesty, or continued existence at all. If backups do not meet that bar, the organization is left choosing between rebuilding from nothing and paying a ransom with no guarantee the data comes back intact either way.'),
  H.p('That is the real reason 3-2-1 and tested restores are worth reasoning through instead of memorizing. A backup that lives on the same network as the system it protects can get encrypted right alongside the live data in the same attack, which defeats the entire point of having it. A backup that has never been restored might turn out to be unusable at the exact moment restoring it is the only option left. A well built backup strategy is often the actual difference between an incident that costs a few hours of restore time and one that costs a ransom payment with no promises attached.'),
  H.box('key', 'The connective thread', '<p>Availability is not a lesser third of the triad. It is the property most likely to fail on an ordinary Tuesday from nothing more dramatic than a dead drive, and it is the property that decides whether a ransomware attack is a bad afternoon or an existential one. A tested 3-2-1 backup plan, built around clear recovery time and recovery point expectations, is what makes that difference.</p>'),

  H.h2('Two practice questions in the real format'),
  H.p('Both are written scenario first, decision second, the shape the exam uses. Reason through what the scenario actually describes before you look at the options.'),
  H.mcq({
    n: 1,
    stem: 'A small clinic backs up its patient records every night to a second hard drive installed in the same server as the original data. The backup job has completed successfully every night for the past year according to its log. One afternoon, the server experiences a power surge that damages both drives inside it beyond repair. Which choice best explains why the clinic\'s backup strategy failed to protect availability?',
    options: [
      'The backup job should have run more than once per day',
      'The backup copy was never encrypted, so it was not secure',
      'The backup was stored on different media than the original, but not in a different physical location, so a single event destroyed both',
      'The clinic never should have used a hard drive as its primary storage device',
    ],
    correct: 2,
    why: 'The scenario describes a second drive inside the same server, which means the backup and the original shared the same physical machine and the same electrical circuit. A single power surge was able to damage both at once, which is exactly the failure the offsite piece of a 3-2-1 strategy exists to prevent. Backup frequency and encryption are not what the scenario describes failing, and the choice of hard drives as a medium is not the problem; the problem is that every copy sat in one place that one event could reach.',
  }),
  H.mcq({
    n: 2,
    stem: 'A company\'s finance team enters new transactions continuously throughout each business day. The company currently backs up its finance database once every 24 hours, at midnight. After a ransomware attack encrypts the live database at 3 p.m., the team restores successfully from the most recent backup. Which statement most accurately describes the outcome, in terms of recovery point?',
    options: [
      'The recovery point was met perfectly, since the backup restored without any errors',
      'Roughly 15 hours of transactions entered since the last backup were permanently lost, which is a recovery point outcome, separate from whether the restore itself worked',
      'The company failed to meet its recovery time objective, since the restore took several hours',
      'The incident was a confidentiality failure, since ransomware always involves stolen data',
    ],
    correct: 1,
    why: 'The restore succeeding tells you the recovery process worked, which is a separate fact from how much data was lost. Because the last backup ran at midnight and the encryption happened at 3 p.m., every transaction entered in those roughly fifteen hours has no backup copy to restore from and is gone. That gap is exactly what the recovery point question is meant to catch in advance: a once a day backup schedule may be far too infrequent for a system where a full business day of transactions is unacceptable to lose. The scenario says nothing about how long the restore took, so recovery time is not evaluated here, and nothing in the scenario states any data was viewed or copied, so confidentiality is not supported either.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What does the 3-2-1 backup rule mean?', a: 'Three total copies of the data, on two different types of storage media, with at least one copy stored in a physically separate location. Each part protects against a different failure: extra copies protect against a single copy going bad, different media types protect against one kind of hardware failing, and an offsite copy protects against a single physical event destroying every copy stored in one place.' },
    { q: 'Why is a backup that exists not automatically a backup that works?', a: 'A backup job can run on schedule and complete without an error for a long time while the restore process itself is broken, incompatible with current software, or missing data due to a quiet configuration problem. The only way to know a backup actually works is to periodically test restoring real data from it, rather than trusting that a completed backup job proves recovery will succeed.' },
    { q: 'What is the difference between recovery time and recovery point?', a: 'Recovery time is about how long a system can stay down before that downtime itself becomes the main problem. Recovery point is about how much recently created data the organization can afford to lose permanently if the most recent backup is the newest copy available. They are answered separately because a system can have a strict tolerance for downtime and a loose tolerance for data loss, or the reverse.' },
    { q: 'Why does ransomware make backups suddenly matter?', a: 'Ransomware encrypts live data in place, which is an availability violation rather than a confidentiality one on its own. If a tested backup exists and was not reachable by the same attack, the organization can restore its data without depending on the attacker at all. If the backup lived on the same network as the encrypted system, or was never tested, restoring may not be possible, which is when paying a ransom becomes the option under discussion.' },
    { q: 'Is a data backup the same thing as availability?', a: 'A backup is one mechanism that protects availability, not the whole of it. Availability also depends on things like network uptime and hardware reliability, but backups are the specific mechanism that turns a destroyed or unreachable copy of data back into a usable one, which is why the exam treats a well reasoned backup strategy as a core availability skill rather than a side topic.' },
  ]),

  H.cta({
    heading: 'Practice reasoning through availability scenarios',
    body: 'The full AP Cybersecurity curriculum ties backups, recovery, and the rest of the CIA triad together the way the exam actually tests them, and the practice exam mixes scenario questions in the real format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study the curriculum' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed October 20, 2026.'),
]);

module.exports = { meta, body };
