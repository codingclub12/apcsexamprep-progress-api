'use strict';
// Weekly course post: AP Cybersecurity. Evergreen concept explainer, Unit 1.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why the easy unit keeps coming back',
  'The CIA triad, defined with three distinct examples',
  'How to tell the three apart when a scenario could be either',
  'The evidence trap: do not pick a principle the scenario never proves',
];

const meta = {
  title: 'The CIA Triad Is Not Vocabulary, It Is the Grading Rubric',
  handle: 'ap-cybersecurity-cia-triad-explained',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'cia triad',
  publishOn: '2026-08-18',
  seoTitle: 'CIA Triad Explained: AP Cybersecurity Guide',
  seoDescription: 'What the CIA triad actually means, with distinct real world examples for confidentiality, integrity, and availability, and how to tell them apart on the exam.',
  summary: 'The CIA triad is taught in Unit 1 as three vocabulary words, but the exam uses it as the lens for almost every later scenario. This guide defines confidentiality, integrity, and availability with genuinely distinct examples, then teaches the harder skill: telling them apart when a scenario could plausibly be more than one, and refusing to pick a principle the evidence never actually supports.',
  tags: ['AP Cybersecurity', 'CIA Triad', 'Unit 1', 'Exam Strategy', 'Concept Guide'],
};

const body = H.article([
  H.dek('Confidentiality, integrity, and availability get taught in the first two weeks of AP Cybersecurity and then feel finished. They are not finished. The CIA triad is the lens the exam keeps pointing at every scenario that follows, and most lost points trace back to picking the wrong one of the three, not to not knowing what the words mean.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 18, 2026', updated: 'August 18, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Unit 1 of AP Cybersecurity feels like the easy one. There is no configuration to get right, no packet capture to read, no access control list to reason through. There is a short list of vocabulary, and the CIA triad sits right at the top of it: confidentiality, integrity, and availability, the three properties a secure system is supposed to protect.'),
  H.p('Students learn the three words, write the three one line definitions, and move on to Unit 2 assuming the triad was a warm up before the real content starts. That assumption is the single most expensive mistake a student makes in this course, because the CIA triad never actually goes away. Unit 2 asks whether a badge reader failure is a confidentiality problem or an availability problem. Unit 3 asks whether a network outage from a misconfigured firewall is the same kind of failure as a data exfiltration. Unit 4 asks whether a stolen laptop is worse for confidentiality or for integrity depending on whether it was encrypted. Unit 5 asks whether a corrupted database backup is an availability issue, an integrity issue, or both. Every one of those questions is the CIA triad, wearing a different unit\'s vocabulary.'),
  H.p('So the honest way to think about the <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity curriculum</a> is that Unit 1 is not a unit you finish. It is the rubric the graders apply to Units 2 through 5. A student who can define the three words but cannot classify a messy, ambiguous scenario under exam pressure has learned the vocabulary and missed the actual skill.'),
  H.box('key', 'The reframe that matters', '<p>Stop treating the CIA triad as a definition to recall. Start treating it as a question you ask about every scenario the exam gives you, in every unit: what did this event actually do, and which of the three properties did it actually damage. The definitions are easy. The classification is the graded skill.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Each of the three principles protects something different, and the clearest way to keep them separate is to anchor each one to an example that could not plausibly stand in for either of the other two.'),

  H.h3('Confidentiality: only authorized people can see it'),
  H.p('Confidentiality means information is visible only to the people who are supposed to see it. It says nothing about whether the information is correct and nothing about whether it can be reached when needed. It is purely about who is allowed to look.'),
  H.p('Picture a hospital where every nurse on staff has database access broad enough to open any patient\'s chart, including a patient who is not under their care. One nurse, out of curiosity, looks up the medical history of a coworker who was recently admitted. Nothing in that chart is changed. Nothing about the hospital\'s systems goes down. The record is exactly as accurate and exactly as reachable as it was before. The only thing that happened is that someone unauthorized saw information they had no legitimate reason to see. That is confidentiality, and only confidentiality. Notice the example does not involve a hacker or an external attacker at all. Confidentiality violations are very often committed by insiders who already have working credentials, which is precisely why the exam likes to test whether students conflate confidentiality with "an outside attacker broke in."'),

  H.h3('Integrity: the data has not been improperly altered'),
  H.p('Integrity means information is accurate and has not been changed by anyone unauthorized to change it. It says nothing about who can see the data and nothing about whether the data is currently reachable. It is purely about whether you can trust that what you are looking at is correct.'),
  H.p('Picture a high school athletic department where the assistant coach, still logged into the shared roster spreadsheet from a season he no longer coaches, quietly edits a student\'s eligibility status to keep them on the travel squad for one more tournament. Nobody outside the athletic office ever sees that spreadsheet, so nothing about it is confidential in the way it was not already. The file is fully available; anyone with the link can open it in half a second. What has happened is that the data inside it is no longer trustworthy, because it was changed by someone without the authority to change it, and every decision made from that spreadsheet from that point forward is built on a fact that is not true. That is integrity, and only integrity. The damage here is not exposure and it is not downtime. It is that the record can no longer be believed.'),

  H.h3('Availability: authorized people can actually get to it when they need it'),
  H.p('Availability means the people who are supposed to have access to a system or a piece of data can actually reach it when they need it. It says nothing about whether the data is accurate and nothing about who else might have seen it. It is purely about whether the door opens when the right person tries it.'),
  H.p('Picture a small accounting firm during the first week of tax season, its busiest and least forgiving stretch of the year, when the office\'s single file server suffers a hard drive failure. Nobody stole anything. Nobody changed a single number in a single return. The data, once the drive is repaired or restored, will be exactly as accurate as it always was. But for the two days it takes to get a replacement drive running, nobody in the office can open a client file, and the firm cannot file a single return. That is availability, and only availability. Notice this example needs no attacker at all. Availability failures are frequently just hardware dying, power failing, or a network link going down, which is a fact the exam relies on when it wants to see whether a student assumes every security incident requires malicious intent.'),
  H.box('tip', 'A fast anchor for each one', '<p>Confidentiality is about who can see it. Integrity is about whether you can trust it. Availability is about whether you can reach it when you need it. Read a scenario once and ask which of those three questions it is actually answering, before you look at the answer choices.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Defining the three words is the easy half of Unit 1. The skill that actually earns points on the rest of the exam is choosing correctly when a scenario looks like it could plausibly touch two of the three principles at once. The exam writes these on purpose, because a student who has only memorized definitions has no way to break the tie. Working through a few side by side fixes that.'),

  H.h3('Scenario: ransomware encrypts every file on a company server'),
  H.p('The tempting answer is confidentiality, because ransomware feels like the classic "hacker" scenario and confidentiality is the word most students associate with hackers. But look at what the scenario actually describes: the attacker encrypted the files. Nothing in that description says the attacker read them, copied them, or exposed them anywhere. What the encryption actually does is lock the legitimate owner out of their own data. The employees who are supposed to be able to open those files can no longer open them. That is a textbook availability violation. If the scenario had also stated that the attacker copied the files to an external server before encrypting them, a real pattern called double extortion, then you would have both an availability violation and a confidentiality violation, and the question would need to specify which one it is asking about. But encryption alone, with no stated exfiltration, is availability and only availability.'),

  H.h3('Scenario: an attacker defaces a company\'s public website'),
  H.p('Website defacement is when an attacker replaces a site\'s legitimate content with their own message, an image, or a claim of responsibility. The tempting wrong answer here is availability, because students associate "the website got attacked" with "the website went down." But read the scenario carefully. If the site is still loading and still reachable, just showing altered content instead of the real content, nothing about availability has changed: visitors can still reach the server and get a response. What has changed is that the content itself is no longer what the organization actually published, and visitors have no way to know that just by looking at the page. That is an integrity violation: the data (the page content) has been altered without authorization, and it can no longer be trusted as accurate. If the defacement scenario instead says the attack also took the server offline entirely, then you would be looking at an availability violation layered on top, and the question should tell you that explicitly rather than leaving it for you to assume.'),

  H.h3('Scenario: a backup drive sits next to the primary server and a fire destroys both'),
  H.p('This one tempts students toward confidentiality, because "backup" sounds like it should be about protecting secret data. But nothing in the scenario says anyone unauthorized ever saw the data, and nothing says the data was altered. What actually happened is a single physical event, the fire, destroyed both the original copy and the only backup copy at the same time, because they were stored in the same room. The organization can no longer access its own data at all, from either location. That is an availability violation, and it is exactly the reason security guidance calls for offsite or geographically separated backups: a backup stored next to the system it protects does not actually protect availability, because one bad event takes out both copies together.'),
  H.box('warn', 'The pattern across all three', '<p>In every one of these, the wrong answer is the principle that sounds dramatic, and the right answer is the principle the scenario actually describes happening. Ransomware sounds like theft, but it describes locking. Defacement sounds like an outage, but it describes altered content. A destroyed backup sounds like exposure, but it describes losing access. Read for the mechanism, not for the vibe.</p>'),

  H.h2(SECTIONS[3]),
  H.p('There is one trap underneath everything above, and it is worth naming directly because it is the single most common way students lose points on CIA triad questions even after they know all three definitions cold: picking a principle the scenario sounds like it might involve, rather than the principle the scenario actually gives you evidence for.'),
  H.p('Here is the shape of the trap. A question describes an attacker gaining unauthorized access to a system, perhaps by guessing a weak password or exploiting an unpatched vulnerability. The word "breach" appears somewhere in the stem. A student reads "breach" and immediately selects confidentiality, because breach and confidentiality feel linked in everyday language. But unauthorized access is not automatically the same fact as unauthorized viewing of data. If the scenario only tells you that an attacker gained access to a system, and never tells you that the attacker actually read, copied, or exposed any specific data, you do not have evidence for a confidentiality violation. You have evidence that access control failed, which is a different fact than confidentiality being violated. A well written scenario question will only offer confidentiality as the correct answer when it explicitly states that unauthorized data viewing happened, such as an attacker browsing files, exporting records, or a screen being read by someone who should not have been looking.'),
  H.p('The same trap runs in every direction. A question about a server crash does not automatically mean availability if the scenario never says anyone was actually unable to reach anything during the crash window. A question about an employee with unusually broad permissions does not automatically mean integrity was violated if nobody actually used those permissions to change anything. The permissions being too broad is a separate, real problem, usually described as a least privilege violation, but it is not itself proof that data was altered, viewed, or made unreachable. It is a risk, and a risk is not the same fact as a confirmed violation.'),
  H.p('The discipline this demands is uncomfortable at first because it means resisting the answer that feels most obviously connected to the scenario\'s vocabulary, and instead asking a narrower question: what specific outcome did this scenario actually describe happening, and which single principle does that specific outcome map to. If two answer choices both sound plausible, the tie breaks in favor of whichever one the scenario gave you direct evidence for, not whichever one sounds like the more serious or more familiar kind of incident.'),
  H.box('key', 'The one sentence version', '<p>Only pick the principle the scenario proves happened. A scenario that merely makes a principle sound plausible, without describing the actual outcome, is testing whether you will fill in the gap with an assumption. Do not fill the gap. If the evidence is not there, the answer is not there either.</p>'),

  H.h2('Two practice questions in the real format'),
  H.p('Both are written in the scenario first, decision second shape the exam uses. Read the stem twice before you look at the options, and ask yourself what outcome is actually described before you consider what feels dramatic.'),
  H.mcq({
    n: 1,
    stem: 'A hospital\'s patient portal is taken offline for six hours after an attacker floods it with junk network traffic. During that window, doctors and nurses cannot log in to check lab results through the portal. Investigators later confirm that no patient record was viewed, copied, or altered at any point during the incident. Which principle was violated?',
    options: [
      'Confidentiality, because a hospital system was attacked',
      'Integrity, because patient records may no longer be reliable',
      'Availability, because authorized staff could not reach the system when they needed it',
      'Non repudiation, because the attacker\'s identity was not immediately confirmed',
    ],
    correct: 2,
    why: 'The scenario explicitly rules out the other two: investigators confirmed no record was viewed, which removes confidentiality, and confirmed no record was altered, which removes integrity. What remains is exactly what the scenario describes happening: staff who were supposed to have access could not get it during the outage. That is availability, and the scenario gives you direct evidence for it rather than leaving it as an assumption. Notice that option A is tempting purely because the word "attacker" appears in a hospital scenario, not because anything in the stem actually supports a confidentiality claim.',
  }),
  H.mcq({
    n: 2,
    stem: 'A former employee\'s account was never deactivated after she left the company. Two months later, she logs in with her still active credentials and changes the listed emergency contact phone number on the company\'s public facing website from the real office line to a competitor\'s number. The change goes unnoticed for several days, during which the website itself remains fully reachable to every visitor. Which principle was violated?',
    options: [
      'Confidentiality, because a former employee should not have had access at all',
      'Integrity, because the published information was altered by someone unauthorized and can no longer be trusted as accurate',
      'Availability, because the phone number on the site no longer reaches the right office',
      'Authentication, because her login used a valid password',
    ],
    correct: 1,
    why: 'The account never being deactivated is a real access control failure worth flagging separately, but it is not itself the violation the question is asking about; it is how the violation became possible, not what the violation was. The website stayed fully reachable the entire time, which rules out availability, and nothing in the scenario says anyone unauthorized viewed data that should have stayed hidden, which rules out confidentiality. What actually happened is that public facing information was changed by someone with no current authority to change it, and visitors reading that number have no way to know it is wrong. That is integrity: the data is no longer trustworthy, even though it is fully visible and fully reachable.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What does the CIA triad stand for in AP Cybersecurity?', a: 'Confidentiality, integrity, and availability, the three properties a secure system protects. Confidentiality is about who is allowed to see information, integrity is about whether the information can be trusted as accurate and unaltered, and availability is about whether authorized people can actually reach the system or data when they need it.' },
    { q: 'Can an incident violate more than one principle of the CIA triad at once?', a: 'Yes. Ransomware that both encrypts files and copies them to an attacker controlled server before encrypting violates both availability and confidentiality. A well written exam question will state clearly when more than one principle is involved rather than leaving it to be inferred, so if a scenario only describes one outcome, only mark the principle that outcome supports.' },
    { q: 'Why do students confuse confidentiality and availability so often?', a: 'Because both can start from the same kind of event, an attacker gaining unauthorized access, and everyday language tends to call any breach a confidentiality issue. The distinction is in what the attacker actually did once inside: viewing or copying data is confidentiality, while locking, deleting, or disrupting access to data is availability. Read for the specific outcome the scenario describes, not for the word "breach."' },
    { q: 'Is data integrity the same thing as data accuracy?', a: 'They are closely related but not identical. Data can be inaccurate because of an honest mistake, which is a data quality problem, or it can be inaccurate because someone unauthorized changed it, which is an integrity violation in the security sense the AP Cybersecurity exam tests. The exam\'s scenarios are written around the second case: an unauthorized or malicious change, not a typo.' },
    { q: 'How does the CIA triad show up outside of Unit 1 on the exam?', a: 'Every later unit reuses it as the lens for classifying an incident. A stolen unencrypted laptop in Unit 4 is a confidentiality risk if the drive can be read by whoever finds it. A misconfigured firewall rule in Unit 3 that blocks legitimate traffic is an availability problem rather than an intrusion. Practicing CIA triad classification early pays off in every unit that follows, which is why it is worth revisiting through the whole <a href="/pages/ap-cybersecurity-course">AP Cybersecurity course</a> rather than only in the first two weeks.' },
  ]),

  H.cta({
    heading: 'Practice classifying scenarios like these',
    body: 'The full AP Cybersecurity curriculum builds every later unit on this same CIA triad reasoning, and the practice exam mixes scenario questions in the real format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study Unit 1' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed August 18, 2026.'),
]);

module.exports = { meta, body };
