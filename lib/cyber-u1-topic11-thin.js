'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.1: STOP SAYING "THE CED" TO STUDENTS
//
//  The worst page on the site for this, and a different problem from the other
//  four. On 1.3, 1.4 and 1.5 the citations were decoration on top of the
//  teaching. Here the course description IS the teaching device: the page says
//  "the CED defines", "the CED names", "the CED lists", "VOCABULARY, STRAIGHT
//  FROM THE CED", "READ IT THE CED WAY", seventy-five times in what a reader
//  sees, and twenty-eight Essential Knowledge codes alongside them.
//
//  ── WHY THIS IS STILL A THINNING PASS AND NOT A REWRITE ────────────────────
//  Because every one of the seventy-five is formulaic, and every one is
//  standing in for a fact the page can simply state. "The CED says adversaries
//  often use intimidation and urgency" becomes "Adversaries often use
//  intimidation and urgency". The sentence gets shorter, says the same thing,
//  and stops leaning on a document a fifteen-year-old has never been handed and
//  cannot look up. Not one claim changes.
//
//  Two places needed a real decision rather than a substitution:
//
//    * The Unit 2 preview lists five tactics with their codes, "pretexting
//      (2.1.A.2), authority (2.1.A.3)...". The point of that box is to tell a
//      student these belong to a later unit, and the codes add nothing to that
//      point, so the names stay and the codes go.
//    * The tactic and impact cards carry a code chip under the heading. With
//      the code gone the chip has nothing left to say that the heading does
//      not, so the chip goes rather than being filled with a synonym.
//
//  ── NOTHING IS ADDED ────────────────────────────────────────────────────────
//  The framing mention already exists in the right place: the accordion header
//  "College Board Essential Knowledge Coverage", above the first lesson
//  section, with the coverage table collapsed behind it. That is the surface
//  the house rule keeps and it needs no help.
//
//  ── all: true ───────────────────────────────────────────────────────────────
//  Three anchors here repeat: "under the CED definition" eight times, "READ IT
//  THE CED WAY" three, and the tactic cards' "CED definition." label twice. One
//  replacement is right for every occurrence of each, so they say `all: true`
//  rather than being padded into eight near-identical splices.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy.
//
//    node scripts/cyber-thin-csv.js cyber-u1-topic11-thin out/topic11-thin.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const { makeApplySplices } = require('./cyber-splice');

const HANDLE = 'ap-cybersecurity-unit-1-social-engineering';
const PAGE_ID = '132111237335';
const TITLE = 'AP Cybersecurity 1.1: Understanding Social Engineering';

const SPLICES = [
  { name: 'objective: two named tactics',
    from: '&bull; Identify the two tactics the CED names, <strong>intimidation</strong>',
    html: '&bull; Identify the two named tactics, <strong>intimidation</strong>' },
  { name: 'opening question 1',
    from: 'Name the two tactics the CED lists and quote the words in this message that carry each one.',
    html: 'Name the two tactics and quote the words in this message that carry each one.' },
  { name: 'opening question 2',
    from: '<li>The CED says adversaries <em>often</em> use intimidation and urgency. Write a two-sentence message',
    html: '<li>Adversaries use intimidation and urgency <em>often</em>, not always. Write a two-sentence message' },
  { name: 'objective: often not always',
    from: 'because the CED says adversaries use them <em>often</em>, not always',
    html: 'because adversaries use them <em>often</em>, not always' },
  { name: '1.1.1 the definition',
    from: 'The CED defines it as the use of psychological tactics to manipulate a user into one of three things:',
    html: 'It is the use of psychological tactics to manipulate a user into one of three things:' },
  { name: '1.1.1 elicitation named',
    from: 'revealing sensitive information, which the CED calls <strong>elicitation</strong>',
    html: 'revealing sensitive information, which is called <strong>elicitation</strong>' },
  { name: '1.1.1 two of those tactics',
    from: 'The CED names two of those tactics.',
    html: 'Two of those tactics are named in this topic.' },
  { name: '1.1.1 defined by what the adversary does',
    from: 'both of them are defined in the CED by what the adversary does, not by how the message arrives',
    html: 'both of them are defined by what the adversary does, not by how the message arrives' },
  { name: '1.1.1 what the damage is',
    from: 'Note what the CED says the damage is: not that the target decides wrongly,',
    html: 'Note what the damage actually is: not that the target decides wrongly,' },
  { name: 'intimidation card chips',
    from: 'Intimidation <span class="atk-tag">EK 1.1.A.2</span><span class="atk-tag">Mechanism: 1.1.B.2</span>\n</div>',
    html: 'Intimidation</div>' },
  { name: 'urgency card chips',
    from: 'Urgency <span class="atk-tag">EK 1.1.A.2</span><span class="atk-tag">Mechanism: 1.1.B.3</span>\n</div>',
    html: 'Urgency</div>' },
  //  Anchored on its markup, not on the bare words. "CED definition." is a
  //  substring of "under the CED definition", so the loose form overlapped
  //  that splice; the overlap check refused the build rather than letting one
  //  replacement eat the other's region.
  { name: 'tactic card definition label',
    from: '<strong>CED definition.</strong>',
    html: '<strong>Definition.</strong>', all: true },
  { name: 'unit 2 preview list',
    from: '<strong>pretexting</strong> (2.1.A.2), <strong>authority</strong> (2.1.A.3), <strong>consensus</strong> (2.1.A.5), <strong>scarcity</strong> (2.1.A.6) and <strong>familiarity</strong> (2.1.A.7). Those are real CED terms, and you will study them properly in Unit 2.',
    html: '<strong>pretexting</strong>, <strong>authority</strong>, <strong>consensus</strong>, <strong>scarcity</strong> and <strong>familiarity</strong>. Those are real terms and you will study them properly in Unit 2.' },
  { name: 'cfu-1 stem',
    from: 'Match each CED classification to the excerpt it describes.',
    html: 'Match each classification to the excerpt it describes.' },
  { name: 'cfu-2 stem',
    from: 'because the message uses neither of the two tactics the CED names.&rdquo;',
    html: 'because the message uses neither of the two named tactics.&rdquo;' },
  { name: 'cfu-2 credited option',
    from: '<span class="cfu-opt-text">The CED says adversaries use those tactics often rather than always, so a message with neither still qualifies under that definition</span>',
    html: '<span class="cfu-opt-text">Adversaries use those tactics often rather than always, so a message with neither still qualifies under the definition</span>' },
  { name: 'cfu-3 stem',
    from: 'Complete the CED account of Topic 1.1.',
    html: 'Complete the account of Topic 1.1.' },
  { name: 'cfu-3 diagram',
    from: 'revealing sensitive information, an outcome the CED calls',
    html: 'revealing sensitive information, an outcome called' },
  { name: 'vocabulary heading',
    from: 'The Topic 1.1 vocabulary, straight from the CED',
    html: 'The Topic 1.1 vocabulary' },
  { name: 'vocabulary closing',
    from: 'and every one of them is a word the CED uses in an Essential Knowledge statement',
    html: 'and every one of them is a word this topic uses in its own definitions' },
  { name: 'vocabulary elicitation row',
    from: 'The CED&rsquo;s word for drawing sensitive information out of a target',
    html: 'The word for drawing sensitive information out of a target' },
  { name: 'vocabulary personal-info row',
    from: 'Explains <strong>why</strong> pet names and birthdates matter enough for the CED to list them.',
    html: 'Explains <strong>why</strong> pet names and birthdates matter enough to be listed by name.' },
  { name: 'channel box opening',
    from: 'The CED lists where social engineering happens: in person, and often by email, by text message, or through social media messages. The CED lists those as delivery settings.',
    html: 'Social engineering happens in person, and often by email, by text message, or through social media messages. Those are delivery settings.' },
  { name: 'impacts intro',
    from: 'The CED gives three, and they are not three severities of the same thing.',
    html: 'There are three, and they are not three severities of the same thing.' },
  { name: 'impacts challenge questions',
    from: 'That is why the CED bothers to list pets and birthdates by name: they are the standard answers.',
    html: 'That is why pets and birthdates are worth listing by name: they are the standard answers.' },
  { name: 'impacts secure information',
    from: 'An immediate session. The CED is specific: it <strong>allows an adversary to log in to a service as the victim</strong>.',
    html: 'An immediate session, and the damage is specific: it <strong>allows an adversary to log in to a service as the victim</strong>.' },
  { name: 'impacts malware outcomes',
    from: 'The CED names three outcomes: software installed on the device,',
    html: 'There are three outcomes: software installed on the device,' },
  { name: 'impact card chip: personal',
    from: 'Personal information <span class="atk-tag">EK 1.1.C.1</span>\n</div>',
    html: 'Personal information</div>' },
  { name: 'impact card chip: secure',
    from: 'Secure information <span class="atk-tag">EK 1.1.C.2</span>\n</div>',
    html: 'Secure information</div>' },
  { name: 'impact card chip: malware',
    from: 'Malware or a malicious link <span class="atk-tag">EK 1.1.C.3</span>\n</div>',
    html: 'Malware or a malicious link</div>' },
  { name: 'pretexting exception 1',
    from: 'Pretexting is the one exception on this list: it is a genuine CED term, and it belongs to Unit 2 at EK 2.1.A.2.',
    html: 'Pretexting is the one exception on this list: it is a real term, and it belongs to Unit 2.' },
  { name: 'pretexting exception 2',
    from: 'Unlike the rest of this section, pretexting is a real CED term. It lives at EK 2.1.A.2 and you will study it properly in Unit 2.',
    html: 'Unlike the rest of this section, pretexting is a real term. It belongs to Unit 2 and you will study it properly there.' },
  { name: 'pretexting exception 3',
    from: 'Pretexting is a CED term belonging to Unit 2 at EK 2.1.A.2; quid pro quo is not in the CED at all.',
    html: 'Pretexting is a real term belonging to Unit 2; quid pro quo is not part of this course at all.' },
  { name: 'phishing split',
    from: 'the text and voice versions get separate words. The CED does not make that split.',
    html: 'the text and voice versions get separate words. This topic does not make that split.' },
  { name: 'whaling',
    from: 'Neither word is in the CED.',
    html: 'Neither word is used here.' },
  { name: 'worked example in CED terms',
    from: 'In CED terms this call carries both named tactics:',
    html: 'In the terms of this topic the call carries both named tactics:' },
  { name: 'smishing vs vishing',
    from: 'The CED treats text message and voice as two of the settings social engineering happens in, not as',
    html: 'Text message and voice are two of the settings social engineering happens in, not' },
  { name: 'worked example tactic note',
    from: 'no named tactic, since the CED says <em>often</em>',
    html: 'no named tactic, and <em>often</em> is not always' },
  { name: 'worked example heading',
    from: 'Read it the CED way',
    html: 'Read it the way this topic asks', all: true },
  { name: 'worked example 3 closing',
    from: 'This is the cleanest illustration of why the CED says adversaries use those tactics <em>often</em> rather than always.',
    html: 'This is the cleanest illustration of why the wording is <em>often</em> rather than always.' },
  { name: 'mistake: assuming a tactic',
    from: 'The CED says adversaries <em>often</em> use intimidation and urgency. A calm, friendly, unhurried message',
    html: 'Adversaries use intimidation and urgency <em>often</em>, not always. A calm, friendly, unhurried message' },
  { name: 'mistake: personal info harmless',
    from: 'The CED lists names, addresses, workplaces, pet names and birthdates precisely because websites',
    html: 'Names, addresses, workplaces, pet names and birthdates are listed precisely because websites' },
  { name: 'mistake: captured password',
    from: 'The CED names a one-time password or authentication login code.',
    html: 'Secure information means a one-time password or an authentication login code.' },
  { name: 'mistake: classify by channel',
    from: 'The CED lists in person, email, text and social media as where social engineering happens. The CED never renames the attack because it came by phone.',
    html: 'In person, email, text and social media are where social engineering happens. The attack is not renamed because it came by phone.' },
  { name: 'mistake: vocabulary not here',
    from: '<td class="term">Reaching for vocabulary that is not in the CED</td>\n<td>Terms like spear phishing, vishing, smishing, whaling, baiting and quid pro quo do not appear anywhere in the CED effective Fall 2026, and the Unit 2 tactic list belongs to Topic 2.1.</td>\n<td>If your answer needs a word the CED never uses, it is not the credited answer to a Topic 1.1 question.</td>',
    html: '<td class="term">Reaching for vocabulary this topic does not use</td>\n<td>Terms like spear phishing, vishing, smishing, whaling, baiting and quid pro quo are not part of Topic 1.1, and the Unit 2 tactic list belongs to Topic 2.1.</td>\n<td>If your answer needs a word this topic never uses, it is not the credited answer.</td>' },
  { name: 'walkthrough link impact',
    from: 'She clicked a link, and the CED covers a link that installs malware or directs the victim to a credential capture site.',
    html: 'She clicked a link, and that impact covers a link that installs malware or directs the victim to a credential capture site.' },
  { name: 'walkthrough still social engineering',
    from: 'The CED says adversaries use intimidation and urgency <em>often</em>, and this caller chose neither because',
    html: 'Adversaries use intimidation and urgency <em>often</em>, and this caller chose neither because' },
  { name: 'tip 2',
    from: 'The CED says adversaries <strong>often</strong> use intimidation and urgency. A calm, patient message',
    html: 'Adversaries use intimidation and urgency <strong>often</strong>, not always. A calm, patient message' },
  { name: 'tip 5',
    from: 'The CED lists in person, email, text message and social media as where social engineering happens. The CED does not give the attack a different name on a different channel.',
    html: 'In person, email, text message and social media are where social engineering happens. The attack does not get a different name on a different channel.' },
  { name: 'tip: NOT or EXCEPT',
    from: 'ask <strong>NOT</strong> or <strong>EXCEPT</strong> which of these is an impact described in the CED;',
    html: 'ask <strong>NOT</strong> or <strong>EXCEPT</strong> which of these is one of the three impacts;' },
  { name: 'tip: word never used',
    from: 'If an option needs a word the CED never uses, it is not the credited answer.',
    html: 'If an option needs a word this topic never uses, it is not the credited answer.' },
  { name: 'faq q1',
    from: 'What two psychological tactics does the AP Cybersecurity CED name in Topic 1.1?',
    html: 'Which two psychological tactics does Topic 1.1 name?', all: true },
  { name: 'faq q1 answer',
    from: 'Intimidation and urgency, and only those two. The CED defines intimidation as',
    html: 'Intimidation and urgency, and only those two. Intimidation is' },
  { name: 'faq elicitation',
    from: 'Elicitation is the CED&rsquo;s term for manipulating a user into revealing sensitive information.',
    html: 'Elicitation is the term for manipulating a user into revealing sensitive information.' },
  { name: 'faq neither tactic',
    from: 'Yes. The CED says adversaries <em>often</em> use those tactics, which is not the same as always.',
    html: 'Yes. Adversaries use those tactics <em>often</em>, which is not the same as always.' },
  { name: 'faq pet names q',
    from: '<div class="faq-q">Why does the CED list pet names and birthdates as an impact?</div>\n<p class="faq-a">Because of what websites do with them. The CED says these types of information are often used',
    html: '<div class="faq-q">Why do pet names and birthdates count as an impact?</div>\n<p class="faq-a">Because of what websites do with them. These types of information are often used' },
  { name: 'faq phishing',
    from: 'The word appears in the CED, but never as content you have to define or classify.',
    html: 'The word appears in this course, but never as content you have to define or classify.' },
  { name: 'faq unit 2 list',
    from: 'Unit 2, Topic 2.1: pretexting at 2.1.A.2, authority at 2.1.A.3, consensus at 2.1.A.5, scarcity at 2.1.A.6 and familiarity at 2.1.A.7. They are genuine CED terms, and they are genuinely not Topic 1.1 content.',
    html: 'Unit 2, Topic 2.1: pretexting, authority, consensus, scarcity and familiarity. They are genuine terms, and they are genuinely not Topic 1.1 content.' },
  { name: 'exit ticket q1',
    from: 'The CED names two tactics. Name both, and in one sentence each explain the psychological principle the CED says each one leverages.',
    html: 'This topic names two tactics. Name both, and in one sentence each explain the psychological principle each one leverages.' },
  { name: 'exit ticket q3',
    from: '(b) Name the two things the CED says this information can be used for.',
    html: '(b) Name the two things this information can be used for.' },
  //  Trimmed to start AFTER "under the CED definition", which the global
  //  splice below already rewrites. Including it here made two splices claim
  //  the same bytes, and the overlap check refused the build rather than
  //  letting one silently win.
  { name: 'exit ticket q4',
    from: 'but carries <strong>neither</strong> tactic named in the framework,',
    html: 'but carries <strong>neither</strong> named tactic,' },
  { name: 'exit ticket q5',
    from: 'Say whether the classmate is right and justify your answer from the CED.',
    html: 'Say whether the classmate is right and justify your answer.' },
  { name: 'exit ticket answers 1',
    from: 'uses fear to incite action (1.1.B.2); urgency, which leverages a natural human response',
    html: 'uses fear to incite action; urgency, which leverages a natural human response' },
  { name: 'exit ticket answers 1b',
    from: 'they do not stop to consider whether the action is safe (1.1.B.3).',
    html: 'they do not stop to consider whether the action is safe.' },
  { name: 'exit ticket answers 3a',
    from: '(3a) Personal information, 1.1.C.1.',
    html: '(3a) Personal information.' },
  { name: 'exit ticket answers 4',
    from: 'It qualifies because 1.1.A.1 defines social engineering by the manipulation and its goal, and 1.1.A.2 says adversaries use intimidation and urgency often rather than always.',
    html: 'It qualifies because social engineering is defined by the manipulation and its goal, and because adversaries use intimidation and urgency often rather than always.' },
  { name: 'exit ticket answers 5',
    from: '(5) The classmate is wrong. EK 1.1.C.2 covers secure information such as a one-time password',
    html: '(5) The classmate is wrong. Secure information covers a one-time password' },
  { name: 'exit ticket answers 5b',
    from: 'is named explicitly in EK 1.1.C.3, so the impact is 1.1.C.3.',
    html: 'is named explicitly as an impact, so the impact is malware or a malicious link.' },
  //  ---- three claims about what the exam does ---------------------------
  //  Not thinning, but the gate refuses a body that carries one, and these are
  //  the last three in Unit 1: everywhere else they were removed in an earlier
  //  pass. "Exam signal" tells a student what an exam will show them; both
  //  boxes describe a real tell in the message itself, which is the useful half
  //  and the half that survives.
  { name: 'intimidation exam signal',
    from: '<strong>Exam signal:</strong> a stated bad outcome aimed at the target.',
    html: '<strong>What to look for:</strong> a stated bad outcome aimed at the target.' },
  { name: 'urgency exam signal',
    from: '<strong>Exam signal:</strong> a clock.',
    html: '<strong>What to look for:</strong> a clock.' },
  { name: 'vocabulary table column header',
    from: '<th>What makes it distinct</th>\n<th>AP exam tip</th>',
    html: '<th>What makes it distinct</th>\n<th>How to spot it</th>' },

  { name: 'under the definition',
    from: 'under the CED definition',
    html: 'by the definition above', all: true },
];

const applySplices = makeApplySplices(SPLICES);

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices };
