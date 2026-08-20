'use strict';
// Weekly course post: AP Cybersecurity. Drill piece: since no released exams
// exist yet, a reasoned vocabulary triage for Unit 1 is the highest leverage
// study tool available, rather than a flat alphabetical glossary.
const H = require('../../lib/blog-house');

const SECTIONS = [
  "Why \"tested most\" isn't a real stat yet for AP Cybersecurity Unit 1",
  'Tier 1: the vocabulary you should know cold',
  'Threat, vulnerability, and risk: three words students blend into one',
  'Tier 2: know it solidly, but it is rarely the whole question',
  'Tier 3: know the definition, low priority for drilling',
  'The full ranking, at a glance',
];

const meta = {
  title: 'AP Cybersecurity Unit 1 Vocabulary, Ranked by How Often It Is Tested',
  handle: 'ap-cybersecurity-unit-1-vocabulary-ranked',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'ap cybersecurity unit 1',
  publishOn: '2026-08-28',
  seoTitle: 'AP Cybersecurity Unit 1 Vocabulary Ranked',
  seoDescription: 'A tiered guide to AP Cybersecurity Unit 1 vocabulary: which terms to know cold and why, and which ones matter far less than a flat glossary suggests.',
  summary: 'AP Cybersecurity has no released exams yet, so there is no real percentage for how often any term gets tested. This guide ranks Unit 1 vocabulary into tiers instead, based on how heavily later units and free response scenarios lean on each term, with worked reasoning for why the CIA triad and the threat, vulnerability, and risk trio sit at the top and several other terms sit well below them.',
  tags: ['AP Cybersecurity', 'Unit 1', 'Vocabulary', 'Exam Prep', 'CIA Triad', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP Cybersecurity Unit 1 vocabulary is usually taught as a flat glossary: forty-some terms, alphabetical, equal weight. That is a bad way to study it. Some of these words are the lens every later unit gets read through. Others show up once, get their one definition question, and never really matter again. Since no released exam exists yet to prove that out with real numbers, this is a reasoned ranking built from the course framework and from how the free response scenario keeps leaning on the same handful of foundational ideas, not a claim to have seen real released frequency data.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'August 25, 2026', updated: 'August 25, 2026', readingMinutes: 11,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Be honest about what this guide can and cannot claim. AP Cybersecurity launched nationally this year, and the first official exam has not been administered yet, so there is no bank of released multiple choice questions or free response scoring guides to count from. Anyone who tells you a specific term appears on some fraction of real AP Cybersecurity exams is either guessing or making it up, and this guide is not going to do that. There is no honest statistic to hand you here.'),
  H.p('What there is instead is a course framework, which lays out what Unit 1, Introduction to Security, is supposed to teach, and a reasonable read on how the rest of the course is built on top of it. Unit 1 vocabulary does not stay contained to Unit 1. The free response task is a device or system security analysis, and every version of that analysis asks a student to identify what is at stake, reason about how it could be compromised, and justify a response, which is exactly the reasoning skeleton Unit 1 vocabulary exists to support. A term that later units keep leaning on for that reasoning is worth knowing cold. A term that shows up, gets defined once, and never gets asked to do real analytical work again is worth knowing, but it is not worth the same number of flashcard reps.'),
  H.box('warn', 'What this ranking is not', '<p>This is not a leaked exam breakdown and it is not a percentage of test coverage. It is a teacher\'s prioritization of AP Cybersecurity Unit 1 vocabulary based on the published course framework and on which ideas keep resurfacing as the reasoning tool for later units and the free response task. Treat the tiers as where to spend limited study time, not as a guarantee of what will or will not appear on any specific exam.</p>'),
  H.p('The tiering is the actual value of this guide. A flat alphabetical glossary treats "confidentiality" and, say, "physical security policy," as equally important because they both got a vocabulary card in Unit 1. They are not equally important. One of them is a lens you will reuse in every unit that follows. The other is a definition you should know but will rarely be the thing a hard question hinges on. Sorting that out before you drill is the whole point.'),

  H.h2(SECTIONS[1]),
  H.p('Tier 1 is short on purpose. These are the terms that show up again and again as the actual reasoning tool behind later scenarios, not just as vocabulary to define once and set aside.'),
  H.h3('Confidentiality, integrity, and availability, together'),
  H.p('The CIA triad is the first thing Unit 1 teaches and the last thing you stop needing. Confidentiality is about who is allowed to see information. Integrity is about whether information can be trusted as accurate and unaltered. Availability is about whether the people who are supposed to reach a system or a piece of data actually can, when they need to. The reason this trio sits at the very top of the ranking is not that the definitions are hard. They are not. It is that later units keep asking you to classify a messy, specific scenario, a badge reader failure, a corrupted backup, a stolen unencrypted laptop, under exactly one of the three, and a student who can recite the definitions but has not practiced the classification freezes on precisely that question. Know the three definitions cold, and more importantly, practice reading a scenario and asking which single property it actually damaged, not which one sounds the most dramatic.'),
  H.h3('Threat, vulnerability, and risk'),
  H.p('These three words get used almost interchangeably in casual conversation, which is exactly why the exam likes to test whether a student can tell them apart. They are related but distinct, and the relationship between them is itself testable content, not just three separate vocabulary cards. Because this trio deserves more room than a single paragraph, it gets its own full section right after this one.'),
  H.box('key', 'Why Tier 1 stays this small', '<p>A term earns Tier 1 only if later units keep asking you to apply it to a new scenario, not just recall its definition. Confidentiality, integrity, availability, threat, vulnerability, and risk all clear that bar because they are the reasoning tools the rest of the course, and the free response task specifically, keeps reaching for.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Ask a class to define threat, vulnerability, and risk separately and most students can do it, roughly. Ask them to sort a single scenario into all three at once and the wheels come off, because in everyday speech people use these words as near synonyms for "something bad happening." On the exam they are not synonyms. They describe three different parts of the same situation, and a scenario question will often expect you to name all three correctly in relation to each other, which is a harder task than defining any one of them alone.'),
  H.p('A vulnerability is a weakness, a gap, a flaw in a system, a process, or a person\'s habits, that could be exploited. It exists whether or not anyone ever exploits it. A login page with no limit on failed password attempts is a vulnerability the moment it is built that way, whether or not a single bad login attempt ever happens against it.'),
  H.p('A threat is a potential source of harm, an actor or an event capable of exploiting a vulnerability. A group of bots that regularly run automated password-guessing attempts against school login pages is a threat. Notice a threat does not require intent aimed specifically at your system. A hardware failure, a fire, or a careless employee can all be threats in this sense, alongside a deliberate attacker.'),
  H.p('Risk is what you get when a real threat and an exploitable vulnerability meet something worth protecting. Risk is not a fixed fact about a system in isolation, and it is not the same thing as an incident that has already happened. A district can have real risk around its login page today, before any bot has ever successfully broken in, purely because the vulnerability and the threat both already exist and something valuable, student records, sits behind that login. That is the piece students most often miss: risk describes a live exposure, not a confirmed breach, and it can be meaningfully reduced by fixing the vulnerability even if the threat never goes away.'),
  H.p('The reason this trio recurs so often is that it is the same move as the CIA triad in a different direction. The CIA triad asks what got damaged. Threat, vulnerability, and risk ask how the damage could happen in the first place, and whether it is worth acting on before it does. Later units keep handing you scenarios and asking you to name the vulnerability, name the threat capable of exploiting it, and reason about the resulting risk, sometimes in the same free response paragraph where you are also identifying which CIA principle is at stake. Students who blur threat into vulnerability, or either one into risk, lose credit not because they do not know security, but because the exam is precisely testing whether the words mean different things to them.'),
  H.box('tip', 'A fast way to keep the three apart', '<p>Vulnerability is a fact about the system: a weakness that sits there whether or not anyone ever notices it. Threat is a fact about the world outside the system: something or someone capable of exploiting that weakness. Risk is what happens when you put the two together against something that actually matters. Ask "what is the weakness," "who or what could exploit it," and "what would it cost if they did," in that order, and the three words sort themselves.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Tier 2 is vocabulary worth knowing solidly, because it does real work inside scenario questions, but it rarely carries the whole weight of a question the way Tier 1 does. These terms usually support a CIA or a threat, vulnerability, risk classification rather than being the thing being classified.'),
  H.h3('The threat actor categories'),
  H.p('A threat actor is whoever or whatever is behind a threat, and Unit 1 introduces the standard categories: the nation-state actor, sometimes called an advanced persistent threat, well funded and patient, going after strategically valuable targets; the insider threat, someone who already has legitimate access and misuses it; the hacktivist, motivated by an ideological or political cause rather than profit; the organized cybercriminal, motivated by financial gain; and the script kiddie, low skill, opportunistic, running tools someone else built. Knowing these categories helps you answer "who is plausibly behind this" in a scenario, which supports the bigger analysis rather than being graded entirely on its own. It is worth knowing solidly because scenario writers like using specific, telling details, months of patient reconnaissance, a stated ideological motive, an ex-employee\'s still-active login, to signal which category is meant, and missing the signal costs you a supporting point even if your main analysis is otherwise strong.'),
  H.h3('Asset and attack surface'),
  H.p('An asset is anything worth protecting: data, a device, a system\'s ability to function, even an organization\'s reputation. An attack surface is the full set of points where an attacker could attempt to get in, every login page, every open network port, every employee who could be phished. Both terms are useful vocabulary for organizing a free response answer, naming the specific assets at stake and the specific paths an attacker could plausibly use, but they function more as organizing language for your answer than as the concept a question is directly testing.'),
  H.h3('Social engineering'),
  H.p('Social engineering is manipulating a person, rather than a system, into doing something that undermines security: clicking a malicious link, revealing a password, propping open a locked door for someone who looks like they belong. It matters because it is a recurring attack path in later scenarios and because it is a genuinely different category from a purely technical exploit. It is not Tier 1 mainly because it tends to appear as one plausible attack path among several rather than as the concept a whole question is built to test.'),

  H.h2(SECTIONS[4]),
  H.p('Tier 3 is not unimportant, and skipping it entirely is a mistake, since a definition question can still cost you a point. But if your study time is limited, this is where to spend the least of it, because these terms are unlikely to be the crux of a hard scenario question the way Tier 1 vocabulary is.'),
  H.ul([
    '<strong>Risk mitigation strategies (accept, avoid, transfer, mitigate).</strong> Useful vocabulary for describing how an organization responds to identified risk, but usually tested as straightforward matching rather than as the reasoning core of a scenario.',
    '<strong>Security policy.</strong> The documented rules an organization sets for how people are expected to behave and how systems are expected to be configured. Good to know exists and what it covers, low priority to drill in depth.',
    '<strong>Physical security.</strong> Locks, badges, cameras, and controlling who can physically reach a device or a server room. It shows up as one possible control among several rather than as a concept tested for its own sake.',
    '<strong>Security awareness training.</strong> Teaching people to recognize social engineering and follow safe habits. Comes up as a plausible mitigation for human-centered risks, rarely as the focus of a question by itself.',
    '<strong>Incident versus breach.</strong> An incident is any event that could affect security, whether or not anything was actually compromised. A breach specifically means something was compromised. The distinction is real but narrow, and worth a clean one-sentence definition rather than deep drilling.',
  ]),
  H.box('warn', 'Do not skip Tier 3 entirely', '<p>Low priority for drilling does not mean zero priority. A student who has never even read the Tier 3 definitions can still lose an easy point to a straightforward recall question. The point of tiering is to decide where your twentieth and thirtieth study rep go, not to justify skipping a term altogether.</p>'),
  H.p('For the fuller picture of how Unit 1 sets up everything that follows, the <a href="/pages/ap-cybersecurity-curriculum">AP Cybersecurity curriculum</a> page walks through how each unit builds on this vocabulary, and the <a href="/pages/ap-cybersecurity-course">AP Cybersecurity course overview</a> covers how the multiple choice and free response sections are weighted against each other.'),

  H.h2(SECTIONS[5]),
  H.p('Here is the same ranking condensed into one table, organized by tier so you can see the whole priority order at a glance rather than paging back through the sections above.'),
  H.table(
    ['Tier', 'Term(s)', 'One-line definition', 'Why this tier'],
    [
      ['1, know cold', 'Confidentiality', 'Only authorized people can access the information.', 'The CIA triad is the classification lens every later unit scenario reuses.'],
      ['1, know cold', 'Integrity', 'The information is accurate and has not been improperly altered.', 'Same reason: it is one of the three CIA principles a scenario question forces you to pick between.'],
      ['1, know cold', 'Availability', 'Authorized people can reach the system or data when they need to.', 'Same reason again: the third CIA principle, and the one students most often confuse with confidentiality.'],
      ['1, know cold', 'Vulnerability', 'A weakness that could be exploited, whether or not it ever is.', 'A required piece of naming the attack path in a free response scenario.'],
      ['1, know cold', 'Threat', 'A potential source of harm capable of exploiting a vulnerability.', 'Paired with vulnerability constantly, and students conflate the two by default.'],
      ['1, know cold', 'Risk', 'What results when a real threat meets an exploitable vulnerability against something valuable.', 'The word students most often use loosely as a stand-in for the other two.'],
      ['2, know solidly', 'Threat actor categories', 'Nation-state, insider, hacktivist, cybercriminal, script kiddie.', 'Supports the "who did this" half of a scenario, rarely the whole question.'],
      ['2, know solidly', 'Asset', 'Anything worth protecting: data, devices, reputation, uptime.', 'Organizing vocabulary for a strong answer, not usually the concept tested directly.'],
      ['2, know solidly', 'Attack surface', 'Every point where an attacker could plausibly get in.', 'Useful framing, appears as supporting language more than as a graded target.'],
      ['2, know solidly', 'Social engineering', 'Manipulating a person, not a system, into a security mistake.', 'A recurring attack path, but usually one option among several in a scenario.'],
      ['3, low priority', 'Risk mitigation strategies', 'Accept, avoid, transfer, or mitigate identified risk.', 'Tends to be tested as simple matching rather than applied reasoning.'],
      ['3, low priority', 'Security policy', 'An organization\'s documented rules for secure behavior and configuration.', 'Good to know it exists, rarely the crux of a hard question.'],
      ['3, low priority', 'Physical security', 'Locks, badges, cameras, controlling physical access.', 'One plausible control among many, not usually tested on its own.'],
      ['3, low priority', 'Security awareness training', 'Teaching people to recognize and avoid social engineering.', 'A common mitigation to name, rarely the focus of a question.'],
      ['3, low priority', 'Incident vs breach', 'An incident may or may not involve compromise; a breach means it did.', 'A narrow, clean distinction worth one definition, not deep drilling.'],
    ],
  ),

  H.h2('Two scenario questions using this vocabulary'),
  H.p('Definitions alone do not prove you can apply this vocabulary under exam conditions. Both questions below describe a specific situation and ask you to apply the correct term, the way the real exam does, rather than asking you to recall a definition in isolation.'),
  H.mcq({
    n: 1,
    stem: 'A state-sponsored group spends several months quietly mapping a public water utility\'s network, never triggering an alarm, before finally extracting engineering schematics for a treatment facility. A student is asked to classify who is behind the incident, not what technique they used. Which term correctly names this category of threat actor?',
    options: [
      'Script kiddie, because the group used freely available scanning tools at some point',
      'Hacktivist, because a public utility makes a symbolically significant target',
      'Nation-state actor (advanced persistent threat), because of the funding, patience, and strategic target',
      'Insider threat, because whoever mapped the network had to understand its layout',
    ],
    correct: 2,
    why: 'The scenario gives you the hallmark signals of a nation-state actor on purpose: sustained funding implied by months of undetected activity, deliberate patience rather than a quick smash-and-grab, and a strategically valuable target rather than a symbolic or opportunistic one. A hacktivist would typically want the intrusion to be visible, since the point is usually a public statement, not months of silence. A script kiddie lacks the patience and resourcing this scenario describes. An insider threat starts from already having legitimate access, not from external reconnaissance over months, which this scenario never describes. Reading for the specific signals, funding, patience, target selection, is what separates this category from the other four.',
  }),
  H.mcq({
    n: 2,
    stem: 'A district technology office learns that the login page for its student information system has never enforced a lockout after repeated failed password attempts. No unauthorized login has happened yet, but the office already knows automated bots regularly attempt exactly this kind of password-guessing attack against school systems in general. Which set of terms correctly completes this analysis: "The missing lockout is a ____. The bots attempting password-guessing attacks are a ____. Together, against a system holding real student data, they create meaningful ____ for the district."',
    options: [
      'threat, vulnerability, risk',
      'vulnerability, threat, risk',
      'risk, vulnerability, threat',
      'vulnerability, risk, threat',
    ],
    correct: 1,
    why: 'The missing lockout is a weakness that exists in the system itself, whether or not any bot ever tries it, which makes it a vulnerability. The bots are a potential source of harm capable of exploiting that specific weakness, which makes them the threat. Neither term alone describes the district\'s actual exposure: risk is what emerges once you put a real threat and an exploitable vulnerability together against something valuable, here, student records. Notice the scenario is explicit that no breach has happened yet. That is the point: risk exists as a live exposure before any incident occurs, which is exactly why a security officer would push to fix the vulnerability now rather than waiting for the bots to eventually succeed.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Is there a real, published percentage for how often each Unit 1 term is tested on the AP Cybersecurity exam?', a: 'No, and be skeptical of anyone who claims otherwise. AP Cybersecurity launched nationally this year and no released exam or scoring data exists yet. This guide ranks vocabulary by how much reasoning weight the course framework and later units place on each term, not by a released frequency statistic that does not exist.' },
    { q: 'Why does the CIA triad get ranked above the threat actor categories?', a: 'Because later units use the CIA triad as the classification lens for almost every scenario, asking which of the three properties, confidentiality, integrity, or availability, a given event actually damaged. Threat actor categories are useful supporting vocabulary for naming who is plausibly behind an event, but a scenario question is far more often built around a CIA classification than around identifying the actor category with precision.' },
    { q: 'What is the actual difference between a threat and a risk?', a: 'A threat is a potential source of harm, an actor or event capable of exploiting a weakness. Risk is what results when that threat meets an actual exploitable vulnerability in a system that holds something valuable. A threat can exist with no meaningful risk if there is no exploitable vulnerability for it to use, and a vulnerability can exist with low risk if no real threat is likely to target it. Risk is the combination, not either piece alone.' },
    { q: 'Should I skip the Tier 3 vocabulary entirely if I am short on study time?', a: 'No. Tier 3 terms are lower priority for deep drilling because they rarely carry a hard scenario question by themselves, but a plain recall question can still test one directly. Read the definitions once, understand them, and spend your remaining time on Tier 1 and Tier 2 instead of drilling Tier 3 to the same depth.' },
    { q: 'Does this ranking apply to the multiple choice section, the free response section, or both?', a: 'Both, though the reasoning shows up more visibly in the free response task, which asks you to analyze a device or system scenario using exactly this vocabulary. The multiple choice section tests some of these terms as more direct recall, but Tier 1 vocabulary still tends to appear inside multiple choice scenario questions rather than as flat definition matching.' },
  ]),

  H.cta({
    heading: 'Turn this ranking into practice',
    body: 'Study the full Unit 1 build-up in the curriculum, or take a practice exam that mixes scenario questions using this exact vocabulary.',
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
  H.updatedNote('This ranking is reviewed as College Board publishes further detail on the AP Cybersecurity exam and any released items. Last reviewed August 25, 2026.'),
]);

module.exports = { meta, body };
