'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBERSECURITY TOPIC 1.1: THE CED REALIGNMENT SPLICE TABLE  (WO-3)
//
//  WHAT WAS WRONG
//  The live 1.1 lesson taught a legacy cyber taxonomy (spear phishing, whaling,
//  vishing, smishing, baiting, quid pro quo) and the six Cialdini principles as
//  the assessed content of Topic 1.1. None of those terms appears in the AP
//  Cybersecurity CED effective Fall 2026. Topic 1.1 names exactly TWO tactics
//  (intimidation, urgency) and THREE victim impacts (1.1.C.1 personal
//  information, 1.1.C.2 secure information, 1.1.C.3 malware or a malicious
//  link). The page also pulled the Unit 2 tactic list (authority, consensus,
//  scarcity, familiarity, pretexting) into Topic 1.1.
//
//  A teacher fresh off AP Cyber training reported it. She was right. Unit 1 is
//  the free preview unit, so this page is what every prospective teacher reads
//  first.
//
//  WHAT THIS DOES NOT DO
//  It does not delete the off-CED vocabulary. 212 exact-match hits carry the
//  page's search traffic and the words are real outside the exam. They are
//  demoted into a banner-labelled enrichment block that tells students plainly
//  that the section is not assessed. Naming an off-CED term while saying it is
//  not assessed is allowed; teaching it as something to learn or sort is not.
//
//  ── WHY A SPLICE TABLE AND NOT A REBUILD ────────────────────────────────────
//  The body is 218 KB. Most of it (the sticky #ucnav rail and its script, the
//  wrapper CSS, the slide embed, the author box, the lesson nav strip) is
//  correct and expensive to reproduce. Every region below is addressed by a
//  pair of anchor strings that must each occur EXACTLY ONCE in the live body;
//  scripts/cyber-u1-topic11-ced-csv.js aborts if one is missing or ambiguous
//  rather than splicing at the wrong offset. Everything not named here survives
//  byte for byte.
//
//  ── TWO LIVE DEFECTS FIXED IN PASSING ───────────────────────────────────────
//  1. Section D never closed. A previous edit left an instruction comment in
//     the body: `<!-- Phishing block: <div class="attack-block" id="atk-phishing"> -->`.
//     The <div> inside that comment is not real markup, so the section-d card
//     div has no matching close tag and browsers auto-close it. The rebuilt
//     section closes properly and the stale comment is gone.
//  2. Those id anchors were never actually applied. The overview grid links to
//     #atk-phishing, #atk-spear and six more; not one of those ids exists in
//     the DOM, so all eight jump links are dead. injectAnchorIds() below adds
//     them for real.
//
//  HOUSE RULES APPLIED TO EVERY FRAGMENT HERE
//    - pure ASCII source, HTML entities for anything else (past imports produced
//      mojibake from literal Unicode)
//    - no em-dashes, no emoji in new copy
//    - no "all of the above" / "none of the above"; "none of the three 1.1.C
//      impacts" is a real classification and is never placed last
//    - four-option MCQ keys are A, D, C, B across cfu-2, cfu-5, cfu-7, cfu-10:
//      25% per letter, nothing above 35%, no three consecutive the same
//    - predict-first boxes stay off on every item rebuilt here
//
//  Regenerate the sheet, never hand-edit it:
//    node scripts/cyber-u1-topic11-ced-csv.js out/wo3-topic11.csv
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-social-engineering';
const PAGE_ID = '132111237335';
const TITLE = 'AP Cybersecurity 1.1: Understanding Social Engineering';

// ── 1. the visible byline ────────────────────────────────────────────────────
//  It read March 2026 while the body was last edited in August. A teacher
//  auditing the page saw March and concluded the lesson was abandoned. Same bug
//  is live on 1.2 and 1.5; those are WO-4 and WO-6.
const BYLINE_FROM = '<span>Last Updated: <strong>March 2026</strong></span>';
const BYLINE_HTML = '<span>Last Updated: <strong>August 2026</strong></span>';

//  The author box carries the same claim a second time, further down the page,
//  and a teacher who scrolls past the meta bar still lands on March.
const REVIEWED_FROM = '<div class="author-updated">Content last reviewed and updated: March 2026</div>';
const REVIEWED_HTML = '<div class="author-updated">Content last reviewed and updated: August 2026</div>';

// ── 2. JSON-LD ───────────────────────────────────────────────────────────────
//  The FAQPage block has to mirror what a reader can actually see on the page,
//  so it is rewritten alongside the visible FAQ below. The Article keywords keep
//  the legacy terms: the enrichment section genuinely covers them, so the search
//  intent is still served honestly.
const JSONLD_FROM = '<script type="application/ld+json">';
const JSONLD_TO = '</script>';
const JSONLD_HTML = `<script type="application/ld+json">
[
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "AP Cybersecurity Topic 1.1: Understanding Social Engineering",
    "description": "AP Cybersecurity Topic 1.1 aligned to the CED effective Fall 2026: the two named tactics (intimidation and urgency), the three victim impacts, elicitation, and worked exam analysis. Legacy attack vocabulary is included as clearly labelled enrichment.",
    "author": {
      "@type": "Person",
      "name": "Tanner Crow",
      "url": "https://www.apcsexamprep.com/pages/ap-computer-science-a-tutor",
      "jobTitle": "AP Computer Science Teacher",
      "description": "AP CS teacher with 11+ years experience at Blue Valley North High School. 2,067+ verified tutoring hours on Wyzant, 5.0 rating from 499+ reviews.",
      "knowsAbout": ["AP Cybersecurity", "AP Computer Science A", "AP Computer Science Principles", "Cybersecurity Education"]
    },
    "publisher": {
      "@type": "Organization",
      "name": "AP CS Exam Prep",
      "url": "https://www.apcsexamprep.com"
    },
    "datePublished": "2026-03-05",
    "dateModified": "2026-08-27",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://www.apcsexamprep.com/pages/ap-cybersecurity-unit-1-social-engineering"
    },
    "isPartOf": {
      "@type": "Course",
      "name": "AP Cybersecurity Complete Course",
      "url": "https://www.apcsexamprep.com/pages/ap-cybersecurity-complete-course-guide"
    },
    "educationalLevel": "High School",
    "learningResourceType": "Lesson",
    "teaches": "Social engineering tactics and victim impacts, AP Cybersecurity Topic 1.1",
    "keywords": "AP Cybersecurity, social engineering, intimidation, urgency, elicitation, one-time password, personal information, secure information, malware, AP Cyber exam prep"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem","position": 1,"name": "Home","item": "https://www.apcsexamprep.com/"},
      {"@type": "ListItem","position": 2,"name": "AP Cybersecurity","item": "https://www.apcsexamprep.com/pages/ap-cybersecurity-complete-course-guide"},
      {"@type": "ListItem","position": 3,"name": "Topic 1.1: Understanding Social Engineering","item": "https://www.apcsexamprep.com/pages/ap-cybersecurity-unit-1-social-engineering"}
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": "AP Cybersecurity Topic 1.1: Understanding Social Engineering Lesson Video",
    "description": "Video lesson covering social engineering tactics, victim impacts, and AP exam analysis for AP Cybersecurity Topic 1.1.",
    "uploadDate": "2026-03-05",
    "thumbnailUrl": "https://img.youtube.com/vi/ATiIze_IuJI/hqdefault.jpg",
    "contentUrl": "https://youtu.be/ATiIze_IuJI",
    "embedUrl": "https://www.youtube.com/embed/ATiIze_IuJI",
    "publisher": {
      "@type": "Organization",
      "name": "AP CS Exam Prep",
      "url": "https://www.apcsexamprep.com"
    }
  }
,{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What two psychological tactics does the AP Cybersecurity CED name in Topic 1.1?","acceptedAnswer":{"@type":"Answer","text":"Intimidation and urgency. Intimidation is when an adversary threatens a target with negative consequences if they do not comply (1.1.A.2). Urgency is when an adversary creates reasons why a target should act quickly. No other tactic is named in Topic 1.1."}},{"@type":"Question","name":"What is elicitation in cybersecurity?","acceptedAnswer":{"@type":"Answer","text":"Elicitation is the CED term in 1.1.A.1 for manipulating a user into revealing sensitive information. It is one of three outcomes a social engineering attack aims for, alongside getting the user to download a malicious file or click a malicious link."}},{"@type":"Question","name":"What are the three victim impacts of a social engineering attack?","acceptedAnswer":{"@type":"Answer","text":"1.1.C.1 personal information such as a name, phone number, address, workplace, pet name or birthdate, which supports impersonation and answers challenge questions. 1.1.C.2 secure information such as a one-time password or authentication code, which lets the adversary log in as the victim. 1.1.C.3 downloading malware or clicking a link that installs malware, steals browser data, or leads to a credential capture site."}},{"@type":"Question","name":"Can a message be social engineering if it uses neither intimidation nor urgency?","acceptedAnswer":{"@type":"Answer","text":"Yes. EK 1.1.A.2 says adversaries often use intimidation and urgency, not always. A calm, patient, friendly message that manipulates someone into revealing sensitive information is still social engineering under 1.1.A.1."}},{"@type":"Question","name":"Are vishing, smishing, whaling, baiting and quid pro quo on the AP Cybersecurity exam?","acceptedAnswer":{"@type":"Answer","text":"No. None of those terms appears in the AP Cybersecurity Course and Exam Description effective Fall 2026. They are real industry vocabulary and worth recognising, but the exam will not ask you to define or classify them, and they will not be the credited answer to a Topic 1.1 question."}}]}
]
</script>`;

// ── 3. AP Exam Focus box ─────────────────────────────────────────────────────
//  Every bullet now names the EK it comes from, so a teacher auditing the page
//  against the CED can check the claim without reading the lesson.
const FOCUS_FROM = '<span class="box-label">★ AP Exam Focus — Topic 1.1</span><p>';
const FOCUS_TO = '</p>';
const FOCUS_HTML = `<span class="box-label">&#9733; AP Exam Focus: Topic 1.1</span><p>&bull; Define social engineering and name the three outcomes an adversary is after: revealing sensitive information (<strong>elicitation</strong>), downloading a malicious file, or clicking a malicious link (1.1.A.1)<br>&bull; Identify the two tactics the CED names, <strong>intimidation</strong> and <strong>urgency</strong>, and recognise that adversaries use them <em>often</em>, not always (1.1.A.2)<br>&bull; Explain the mechanism behind each: intimidation leverages a human aversion to negative consequences, urgency leverages a human response to time-sensitive needs (1.1.B.1 through 1.1.B.3)<br>&bull; Classify what the victim lost as <strong>personal information</strong> (1.1.C.1), <strong>secure information</strong> such as a one-time password (1.1.C.2), or <strong>malware and malicious links</strong> (1.1.C.3)<br>&bull; Analyse a message and state which tactics are present, which impact category applies, and what the adversary can do next</p>`;

// ── 4. Essential Knowledge coverage table ────────────────────────────────────
//  1.1.B.1 was the one EK missing from the old table. B.2 and B.3 shared a row;
//  they are separate claims and are now separate rows.
const EKTABLE_FROM = '<thead><tr>\n<th>CED Ref</th>';
const EKTABLE_TO = '</tbody>';
const EKTABLE_HTML = `<thead><tr>
<th>CED Ref</th>
<th>Essential Knowledge</th>
<th>Covered In</th>
</tr></thead>
<tbody>
<tr>
<td class="term">1.1.A.1</td>
<td>Social engineering employs psychological tactics to manipulate users into revealing sensitive information (elicitation), downloading a malicious file, or clicking a malicious link. In person, but often by email, text message, or social media message.</td>
<td>1.1.2 and 1.1.3</td>
</tr>
<tr>
<td class="term">1.1.A.2</td>
<td>Adversaries often use tactics like intimidation and urgency. Intimidation threatens negative consequences for non-compliance. Urgency creates reasons to act quickly.</td>
<td>1.1.2</td>
</tr>
<tr>
<td class="term">1.1.B.1</td>
<td>Social engineering tactics rely on common psychological principles that influence human behavior.</td>
<td>1.1.2</td>
</tr>
<tr>
<td class="term">1.1.B.2</td>
<td>Intimidation leverages a natural human aversion to negative consequences. Adversaries draw attention to what could go wrong and use fear to incite action.</td>
<td>1.1.2</td>
</tr>
<tr>
<td class="term">1.1.B.3</td>
<td>Urgency leverages a natural human response to time-sensitive needs. Pressure to act quickly prevents the target from considering whether the action is reasonable or safe.</td>
<td>1.1.2</td>
</tr>
<tr>
<td class="term">1.1.C.1</td>
<td>Victims may give up personal information (name, phone, address, workplace, pet names, birthdate) that supports impersonation and answers website challenge questions.</td>
<td>1.1.4</td>
</tr>
<tr>
<td class="term">1.1.C.2</td>
<td>Victims may give up secure information such as a one-time password (OTP) or authentication login code, letting an adversary log in to a service as the victim.</td>
<td>1.1.4</td>
</tr>
<tr>
<td class="term">1.1.C.3</td>
<td>Victims may download malware or click a link that installs malware, steals browser information, or directs them to a site that captures their credentials.</td>
<td>1.1.4</td>
</tr>
</tbody>`;

// ── 5. bellringer ────────────────────────────────────────────────────────────
const BELL_FROM = '<li>You receive a text:';
const BELL_TO = '</em></p>';
const BELL_HTML = `<li>You receive a text: &ldquo;URGENT: Your bank account has been suspended. Reply with your PIN within 15 minutes or access will be permanently locked.&rdquo; Name the two tactics the CED lists in 1.1.A.2 and quote the words in this message that carry each one.</li>
<li>EK 1.1.A.2 says adversaries <em>often</em> use intimidation and urgency. Write a two-sentence message that is still social engineering under 1.1.A.1 but uses neither tactic.</li>
<li>A victim took a call from someone claiming to be bank support and read out a one-time code. Which of the three 1.1.C impact categories is that, and what can the adversary do that it could not do before?</li>
</ol>
<p style="font-size:12px!important;color:#9CA3AF!important;font-family:Georgia,serif!important;margin-top:8px!important;"><em>Answers: (1) Urgency, carried by &ldquo;within 15 minutes&rdquo;, and intimidation, carried by &ldquo;permanently locked&rdquo;, a threatened negative consequence. (2) Any calm, unhurried request that still manipulates the target into revealing sensitive information, for example a friendly caller claiming to update the staff directory and asking for a birthdate and pet name. (3) Secure information, 1.1.C.2. The adversary can now log in to the service as the victim.</em></p>`;

// ── 6. table of contents ─────────────────────────────────────────────────────
//  Section ids (#section-a .. #section-i, #section-faq) and the 1.1.1 .. 1.1.10
//  numbering are deliberately unchanged: other Unit 1 pages deep-link into them.
//  Only the titles move.
const TOC_FROM = '<ul class="toc-list">';
const TOC_TO = '</ul>';
const TOC_HTML = `<ul class="toc-list">
      <li><a href="#section-slides">Slides: Full Lesson Slide Deck<span class="toc-time">(browse)</span></a></li>
      <li><a href="#section-a">1.1.1: Learning Objectives<span class="toc-time">(3 min)</span></a></li>
      <li><a href="#section-b">1.1.2: Intimidation and Urgency<span class="toc-time">(12 min)</span></a></li>
      <li><a href="#section-c">1.1.3: Essential Vocabulary &amp; Exam Tips<span class="toc-time">(10 min)</span></a></li>
      <li><a href="#section-d">1.1.4: The Three Victim Impacts<span class="toc-time">(12 min)</span></a></li>
      <li><a href="#section-e">1.1.5: Tactic and Impact Quick Reference<span class="toc-time">(4 min)</span></a></li>
      <li><a href="#section-f">1.1.6: Real-World Case Studies<span class="toc-time">(8 min)</span></a></li>
      <li><a href="#section-g">1.1.7: Defense Strategies<span class="toc-time">(7 min)</span></a></li>
      <li><a href="#section-h">1.1.8: Worked Examples<span class="toc-time">(6 min)</span></a></li>
      <li><a href="#section-i">1.1.9: AP Exam Strategy<span class="toc-time">(5 min)</span></a></li>
      <li><a href="#section-faq">1.1.10: Frequently Asked Questions<span class="toc-time">(3 min)</span></a></li>
    </ul>`;

// ── 7. learning objectives ───────────────────────────────────────────────────
//  Two of the seven old objectives asked students to distinguish eight attack
//  types and name the six Cialdini principles. Neither is CED content.
const OBJ_FROM = '<ul class="obj-list">';
const OBJ_TO = '</ul>';
const OBJ_HTML = `<ul class="obj-list">
    <li>
<span class="obj-check"></span>Define social engineering and name the three outcomes an adversary is trying to produce: elicitation of sensitive information, a downloaded malicious file, or a clicked malicious link (1.1.A.1)</li>
    <li>
<span class="obj-check"></span>Identify intimidation and urgency in a message and quote the specific words that carry each tactic (1.1.A.2)</li>
    <li>
<span class="obj-check"></span>Explain the psychological principle each tactic leverages: aversion to negative consequences for intimidation, response to time-sensitive needs for urgency (1.1.B.1 through 1.1.B.3)</li>
    <li>
<span class="obj-check"></span>Recognise that a message using neither named tactic can still be social engineering, because 1.1.A.2 says adversaries use them <em>often</em>, not always</li>
    <li>
<span class="obj-check"></span>Classify the impact on a victim as personal information, secure information, or malware and malicious links, and explain what each one lets the adversary do next (1.1.C.1 through 1.1.C.3)</li>
    <li>
<span class="obj-check"></span>Distinguish personal information from secure information, including why a birthdate and a one-time password sit in different categories</li>
    <li>
<span class="obj-check"></span>Analyse an unfamiliar scenario end to end: tactics present, impact category, what the adversary gains, and the correct response</li>
  </ul>`;

// ── 8. section B: the two tactics ────────────────────────────────────────────
//  Replaced wholesale. What was here: a six-card Cialdini grid (authority,
//  scarcity, social proof, liking, reciprocity, commitment) presented as the
//  psychology of Topic 1.1, a matching CFU keyed to those six, and an MCQ whose
//  correct answer turned on the definition of "Liking". Authority, consensus,
//  scarcity and familiarity are CED terms, but they belong to 2.1.A.3, 2.1.A.5,
//  2.1.A.6 and 2.1.A.7. Topic 1.1 names two tactics. The Unit 2 five survive in
//  a labelled preview box so a student who meets them later recognises them.
const SECB_FROM = '<!-- SECTION B: Psychology -->';
const SECB_TO = '<!-- SECTION C: Vocabulary -->';
const SECB_HTML = `<!-- SECTION B: Intimidation and Urgency -->
<div class="card" id="section-b">
  <h2>
<span class="section-icon">2</span>1.1.2: Why Social Engineering Works: Intimidation and Urgency</h2>
  <p>Social engineering succeeds without breaking anything technical. EK 1.1.A.1 defines it as the use of psychological tactics to manipulate a user into one of three things: revealing sensitive information, which the CED calls <strong>elicitation</strong>; downloading a malicious file; or clicking a malicious link. It can happen in person, but it is usually delivered by email, by text message, or through a social media message.</p>

  <div class="info-box insight">
<span class="box-label">EK 1.1.B.1</span><p>Social engineering tactics rely on <strong>common psychological principles that influence human behavior</strong>. That is the claim the whole topic rests on: the tactics work on careful, intelligent people because they aim at responses everyone has, not at a lapse in attention.</p>
</div>

  <p>EK 1.1.A.2 names two of those tactics. They are the only two named in Topic 1.1, and both of them are defined in the CED by what the adversary does, not by how the message arrives.</p>

  <div class="attack-block" id="tactic-intimidation">
    <div class="atk-name">Intimidation <span class="atk-tag">EK 1.1.A.2</span><span class="atk-tag">Mechanism: 1.1.B.2</span>
</div>
    <div class="atk-desc"><strong>CED definition.</strong> Intimidation is when an adversary threatens a target with negative consequences if they do not comply.</div>
    <div class="atk-desc"><strong>Why it works (1.1.B.2).</strong> Intimidation leverages a natural human aversion to negative consequences. By drawing attention to what could go wrong, the adversary uses fear to incite the target to act. The target is not being careless. They are doing exactly what fear is for, which is to make a threatened loss feel more real than an abstract risk of being tricked.</div>
    <div class="atk-scenario"><strong>Worked example.</strong> &ldquo;Our records show your district account is out of compliance. Accounts that remain unverified are referred to the superintendent&rsquo;s office and disabled.&rdquo; The threatened consequences are the referral and the disabled account. There is no deadline anywhere in that message, so it carries intimidation and not urgency.</div>
    <div class="atk-edge"><strong>Exam signal:</strong> a stated bad outcome aimed at the target. Locked out, reported, fined, fired, suspended, referred, prosecuted. Ask what happens to the target if they do nothing.</div>
  </div>

  <div class="attack-block" id="tactic-urgency">
    <div class="atk-name">Urgency <span class="atk-tag">EK 1.1.A.2</span><span class="atk-tag">Mechanism: 1.1.B.3</span>
</div>
    <div class="atk-desc"><strong>CED definition.</strong> Urgency is when an adversary creates reasons why a target should act quickly.</div>
    <div class="atk-desc"><strong>Why it works (1.1.B.3).</strong> Urgency leverages a natural human response to react quickly to time-sensitive needs. When a target detects urgency, they feel pressured to respond fast, and that pressure prevents them from taking the time to consider whether the action is reasonable or safe. Note what the CED says the damage is: not that the target decides wrongly, but that the target never gets to the deciding step at all.</div>
    <div class="atk-scenario"><strong>Worked example.</strong> &ldquo;The payroll window closes at 4:00 PM today. Confirm your direct deposit details on the link below before then so this month&rsquo;s pay is not delayed.&rdquo; The deadline is doing the work. Nothing is threatened as a punishment, so this carries urgency and not intimidation.</div>
    <div class="atk-edge"><strong>Exam signal:</strong> a clock. Within 15 minutes, expires today, before the window closes, immediately, right now. Ask whether the target is being given time to check.</div>
  </div>

  <div class="callout">
    <strong>Four answers, not two</strong>
    Any message you are handed can carry intimidation only, urgency only, both, or neither. Both is common, because a threat lands harder with a deadline attached. <strong>Neither is a real answer.</strong> EK 1.1.A.2 says adversaries <em>often</em> use these tactics, and often is not always: a patient, friendly, entirely unhurried message that manipulates someone into handing over sensitive information is still social engineering under 1.1.A.1. Work through the two questions separately and let the answer be whatever it is.
  </div>

  <div class="info-box warning">
<span class="box-label">Preview: Unit 2 Topic 2.1, not assessed here</span><p>You may already have met a longer list of tactics: <strong>pretexting</strong> (2.1.A.2), <strong>authority</strong> (2.1.A.3), <strong>consensus</strong> (2.1.A.5), <strong>scarcity</strong> (2.1.A.6) and <strong>familiarity</strong> (2.1.A.7). Those are real CED terms, and you will study them properly in Unit 2. They are <strong>not</strong> Topic 1.1 content, and a Topic 1.1 question will not have one of them as the credited answer. Recognise them, park them, and come back to them in Unit 2.</p>
</div>

  <div class="cfu-block" id="cfu-1" data-num="1" data-type="match">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Check for Understanding</span><span class="cfu-type-badge cfu-match-badge">Matching</span>
</div>
<span class="cfu-counter">Q 1 of 10</span>
</div>
    <p class="cfu-question">Match each CED classification to the excerpt it describes. Three of these are about the <strong>tactic</strong> in the message; three are about the <strong>impact</strong> on the victim.</p>
    <div class="match-instructions">Click a classification on the left, then click its matching excerpt on the right. Click a matched pair to undo it.</div>
    <div class="match-container" id="match-1-container">
      <div class="match-col" id="match-1-left">
        <div class="match-col-label">Classification</div>
        <div class="match-item" data-match-id="m1a" data-match-key="intim">
<span class="match-num">1</span>Intimidation only (1.1.A.2)</div>
        <div class="match-item" data-match-id="m1b" data-match-key="urg">
<span class="match-num">2</span>Urgency only (1.1.A.2)</div>
        <div class="match-item" data-match-id="m1c" data-match-key="bothtac">
<span class="match-num">3</span>Intimidation and urgency together</div>
        <div class="match-item" data-match-id="m1d" data-match-key="personal">
<span class="match-num">4</span>Impact: personal information (1.1.C.1)</div>
        <div class="match-item" data-match-id="m1e" data-match-key="secure">
<span class="match-num">5</span>Impact: secure information (1.1.C.2)</div>
        <div class="match-item" data-match-id="m1f" data-match-key="malware">
<span class="match-num">6</span>Impact: malware or malicious link (1.1.C.3)</div>
      </div>
      <div class="match-connector">&harr;</div>
      <div class="match-col" id="match-1-right">
        <div class="match-col-label">Excerpt or outcome</div>
        <div class="match-item" data-match-id="m1r1" data-match-key="secure">
<span class="match-num">A</span>During the call the employee read out the six-digit code that had just arrived on her phone.</div>
        <div class="match-item" data-match-id="m1r2" data-match-key="urg">
<span class="match-num">B</span>&ldquo;Confirm your details before the 4:00 PM payroll cutoff so this month&rsquo;s pay is not delayed.&rdquo;</div>
        <div class="match-item" data-match-id="m1r3" data-match-key="bothtac">
<span class="match-num">C</span>&ldquo;Unverified accounts are reported to HR and closed. You have 30 minutes.&rdquo;</div>
        <div class="match-item" data-match-id="m1r4" data-match-key="malware">
<span class="match-num">D</span>The teacher opened the attached &ldquo;grade report&rdquo; and a remote access tool installed itself.</div>
        <div class="match-item" data-match-id="m1r5" data-match-key="personal">
<span class="match-num">E</span>The caller collected the target&rsquo;s birthdate, first pet&rsquo;s name and childhood street for a &ldquo;staff directory update&rdquo;.</div>
        <div class="match-item" data-match-id="m1r6" data-match-key="intim">
<span class="match-num">F</span>&ldquo;Accounts that remain out of compliance are referred to the superintendent&rsquo;s office and disabled.&rdquo;</div>
      </div>
    </div>
    <button class="cfu-submit" id="cfu-1-btn" onclick="cfuSubmitMatch(1)">Submit Matches</button>
    <div class="cfu-feedback" id="cfu-1-feedback">
<div class="cfu-feedback-verdict" id="cfu-1-verdict"></div>
<div class="cfu-feedback-explain">
<strong>Correct pairings.</strong> Intimidation only, F: a threatened consequence with no clock. Urgency only, B: a deadline with nothing threatened as punishment. Both, C: a threatened consequence <em>and</em> a 30 minute window. Personal information (1.1.C.1), E: birthdate, pet name and street are exactly the material used for impersonation and website challenge questions. Secure information (1.1.C.2), A: a one-time code lets the adversary log in as the victim. Malware (1.1.C.3), D: opening the file installed software on the device.</div>
</div>
  </div>

  <div class="cfu-block" id="cfu-2" data-answer="A" data-num="2" data-type="mcq">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Check for Understanding</span><span class="cfu-type-badge">MCQ</span>
</div>
<span class="cfu-counter">Q 2 of 10</span>
</div>
    <p class="cfu-question">A student analyses this message: &ldquo;Hi Ms. Reyes, this is Dan from the district help desk. No rush at all. When you get a minute, I am tidying up the staff directory and I still need your birthdate and the name of your first pet for the security questions.&rdquo; The student writes: &ldquo;This is not social engineering, because the message uses neither of the two tactics EK 1.1.A.2 names.&rdquo; Which of the following <strong>best identifies the flaw</strong> in that reasoning?</p>
    <div class="cfu-options" id="cfu-2-opts">
      <label class="cfu-opt" data-val="A"><span class="cfu-opt-letter">A</span><span class="cfu-opt-text">EK 1.1.A.2 says adversaries use those tactics often rather than always, so a message with neither still qualifies under the 1.1.A.1 definition</span></label>
      <label class="cfu-opt" data-val="B"><span class="cfu-opt-letter">B</span><span class="cfu-opt-text">The message does carry urgency, because asking the target to answer when they get a minute sets an implied deadline for the reply</span></label>
      <label class="cfu-opt" data-val="C"><span class="cfu-opt-letter">C</span><span class="cfu-opt-text">The message does carry intimidation, because a help desk holds authority over a staff account and that implies a consequence</span></label>
      <label class="cfu-opt" data-val="D"><span class="cfu-opt-letter">D</span><span class="cfu-opt-text">The student named the wrong tactic list, since Topic 1.1 assesses a longer set of tactics than the two given in EK 1.1.A.2</span></label>
    </div>
    <button class="cfu-submit" id="cfu-2-btn" onclick="cfuSubmitMCQ(2)">Submit Answer</button>
    <div class="cfu-feedback" id="cfu-2-feedback">
<div class="cfu-feedback-verdict" id="cfu-2-verdict"></div>
<div class="cfu-feedback-explain">A is correct. The tactic list in 1.1.A.2 is a description of what adversaries often do, not a test a message has to pass to count. Under 1.1.A.1 this is social engineering: psychological manipulation aimed at eliciting sensitive information, and the information requested is exactly the 1.1.C.1 material used to answer challenge questions. B inverts the CED meaning of urgency, which is a reason to act quickly created by the adversary; &ldquo;no rush&rdquo; is the opposite. C stretches intimidation past its CED definition, which requires a threatened negative consequence, not merely a party with standing. D is false: Topic 1.1 names two tactics and no others.</div>
</div>
  </div>
</div>

`;

// ── 9. section C: vocabulary ─────────────────────────────────────────────────
//  Was: an eight-type "attack hierarchy" diagram, a key-terms box headed
//  "8 Attack Types: Know All of These", a vocabulary table of the same eight
//  plus OSINT, and a cloze whose six blanks were all off-CED terms. Rebuilt on
//  the vocabulary the CED actually uses in 1.1.
const SECC_FROM = '<!-- SECTION C: Vocabulary -->';
const SECC_TO = '<!-- SECTION D: Attack Types In Depth -->';
const SECC_HTML = `<!-- SECTION C: Vocabulary -->
<div class="card" id="section-c">
  <h2>
<span class="section-icon">3</span>1.1.3: Essential Vocabulary &amp; Exam Tips</h2>
  <div class="key-terms-box">
    <span class="key-terms-label">The Topic 1.1 vocabulary, straight from the CED</span>
    <dl class="key-terms-grid">
      <div>
<dt>Social engineering</dt>
<dd>Psychological manipulation of a user, not a system</dd>
</div>
      <div>
<dt>Elicitation</dt>
<dd>Getting a user to reveal sensitive information</dd>
</div>
      <div>
<dt>Intimidation</dt>
<dd>Threatening negative consequences for non-compliance</dd>
</div>
      <div>
<dt>Urgency</dt>
<dd>Creating reasons the target should act quickly</dd>
</div>
      <div>
<dt>Personal information</dt>
<dd>Name, phone, address, workplace, pet name, birthdate</dd>
</div>
      <div>
<dt>Secure information</dt>
<dd>A one-time password (OTP) or authentication code</dd>
</div>
      <div>
<dt>Challenge question</dt>
<dd>A website identity check answered from personal information</dd>
</div>
      <div>
<dt>Malware</dt>
<dd>Software installed by a downloaded file or a clicked link</dd>
</div>
    </dl>
  </div>
  <p>Eight terms. That is the whole assessed vocabulary of Topic 1.1, and every one of them is a word the CED uses in an Essential Knowledge statement. Learn these to the point where you can write the definition without hedging, because the exam tests them by making you apply them to a scenario you have never seen.</p>

  <div>
    <table class="vocab-table">
      <thead><tr>
<th>Term</th>
<th>Precise definition</th>
<th>What makes it distinct</th>
<th>AP exam tip</th>
</tr></thead>
      <tbody>
        <tr>
<td class="term">Social engineering</td>
<td>The use of psychological tactics to manipulate a user into revealing sensitive information, downloading a malicious file, or clicking a malicious link (1.1.A.1)</td>
<td>The target is a <strong>person</strong>, not a system. No technical vulnerability is needed.</td>
<td><span class="exam-tip">If nothing was exploited but somebody was persuaded, this is the category.</span></td>
</tr>
        <tr>
<td class="term">Elicitation</td>
<td>The CED&rsquo;s word for drawing sensitive information out of a target (1.1.A.1)</td>
<td>One of the <strong>three</strong> outcomes in 1.1.A.1, alongside a downloaded file and a clicked link.</td>
<td><span class="exam-tip">Elicitation is the goal. Intimidation and urgency are how it is pursued.</span></td>
</tr>
        <tr>
<td class="term">Intimidation</td>
<td>The adversary threatens the target with negative consequences if they do not comply (1.1.A.2)</td>
<td>Requires a <strong>threatened consequence</strong> aimed at the target. Fear is the lever (1.1.B.2).</td>
<td><span class="exam-tip">Ask: what does the message say happens to me if I ignore it?</span></td>
</tr>
        <tr>
<td class="term">Urgency</td>
<td>The adversary creates reasons why the target should act quickly (1.1.A.2)</td>
<td>Requires a <strong>reason to hurry</strong>. Time pressure stops the target evaluating the request (1.1.B.3).</td>
<td><span class="exam-tip">Ask: am I being given time to check this through another channel?</span></td>
</tr>
        <tr>
<td class="term">Personal information</td>
<td>Name, phone number, address, workplace, pet names, birthdate, and information like it (1.1.C.1)</td>
<td>Supports <strong>impersonation</strong>, and it is the raw material for website challenge questions.</td>
<td><span class="exam-tip">Not secret, and that is the point. It is public-ish detail with private uses.</span></td>
</tr>
        <tr>
<td class="term">Secure information</td>
<td>A one-time password (OTP) or authentication login code (1.1.C.2)</td>
<td>Hands the adversary a <strong>live session</strong>: they can log in to the service as the victim.</td>
<td><span class="exam-tip">The clue is that it works once and it works now.</span></td>
</tr>
        <tr>
<td class="term">Challenge question</td>
<td>An identity check a website asks to verify a user, answered from personal detail (1.1.C.1)</td>
<td>Explains <strong>why</strong> pet names and birthdates matter enough for the CED to list them.</td>
<td><span class="exam-tip">This is the link between 1.1.C.1 and account takeover.</span></td>
</tr>
        <tr>
<td class="term">Malware</td>
<td>Software installed by a downloaded file or a clicked link, which may steal browser information or route the victim to a credential capture site (1.1.C.3)</td>
<td>The only impact where the <strong>device</strong> is compromised rather than the person&rsquo;s knowledge.</td>
<td><span class="exam-tip">A clicked link counts even if the victim typed nothing.</span></td>
</tr>
      </tbody>
    </table>
  </div>

  <div class="info-box stat">
<span class="box-label">Channel is context, not classification</span><p>EK 1.1.A.1 lists where social engineering happens: in person, and often by email, by text message, or through social media messages. The CED lists those as delivery settings. It never asks you to give the attack a different name because it arrived by phone rather than by email. On a Topic 1.1 question, read the channel for context and then classify on the <strong>tactic</strong> and the <strong>impact</strong>.</p>
</div>

  <div class="cfu-block" id="cfu-3" data-num="3" data-type="cloze">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Check for Understanding</span><span class="cfu-type-badge cfu-cloze-badge">Fill in the Blank</span>
</div>
<span class="cfu-counter">Q 3 of 10</span>
</div>
    <p class="cfu-question">Complete the CED account of Topic 1.1. Two chips in the bank belong to Unit 2 and fit no blank.</p>
    <div class="cloze-passage" id="cloze-3-passage">
      Social engineering manipulates a user into revealing sensitive information, an outcome the CED calls <span class="cloze-blank" id="c3-b1" data-answer="elicitation" onclick="clozePlace(3,'c3-b1')">&#8203;</span>. Adversaries often reach for two tactics. Threatening a target with negative consequences if they do not comply is <span class="cloze-blank" id="c3-b2" data-answer="intimidation" onclick="clozePlace(3,'c3-b2')">&#8203;</span>, which works by leveraging a human aversion to bad outcomes. Creating reasons the target should act quickly is <span class="cloze-blank" id="c3-b3" data-answer="urgency" onclick="clozePlace(3,'c3-b3')">&#8203;</span>, which works because pressure prevents the target from considering whether the action is safe. A victim who gives up a birthdate and a pet name has surrendered <span class="cloze-blank" id="c3-b4" data-answer="personal information" onclick="clozePlace(3,'c3-b4')">&#8203;</span>, which websites accept as answers to <span class="cloze-blank" id="c3-b5" data-answer="challenge questions" onclick="clozePlace(3,'c3-b5')">&#8203;</span>. A victim who reads out a one-time code has surrendered <span class="cloze-blank" id="c3-b6" data-answer="secure information" onclick="clozePlace(3,'c3-b6')">&#8203;</span>, which lets the adversary log in as the victim.
    </div>
    <div class="cloze-bank" id="cloze-3-bank">
      <span class="cloze-bank-label">Word Bank (click to select, then click a blank to place)</span>
      <span class="cloze-chip" data-chip="secure information" onclick="clozeSelect(3,this)">secure information</span>
      <span class="cloze-chip" data-chip="urgency" onclick="clozeSelect(3,this)">urgency</span>
      <span class="cloze-chip" data-chip="challenge questions" onclick="clozeSelect(3,this)">challenge questions</span>
      <span class="cloze-chip" data-chip="consensus" onclick="clozeSelect(3,this)">consensus</span>
      <span class="cloze-chip" data-chip="elicitation" onclick="clozeSelect(3,this)">elicitation</span>
      <span class="cloze-chip" data-chip="personal information" onclick="clozeSelect(3,this)">personal information</span>
      <span class="cloze-chip" data-chip="intimidation" onclick="clozeSelect(3,this)">intimidation</span>
      <span class="cloze-chip" data-chip="familiarity" onclick="clozeSelect(3,this)">familiarity</span>
    </div>
    <button class="cfu-submit" id="cfu-3-btn" onclick="cfuSubmitCloze(3)">Submit Answers</button>
    <div class="cfu-feedback" id="cfu-3-feedback">
<div class="cfu-feedback-verdict" id="cfu-3-verdict"></div>
<div class="cfu-feedback-explain">In order: <strong>elicitation</strong> (1.1.A.1), <strong>intimidation</strong> and <strong>urgency</strong> (1.1.A.2, with mechanisms in 1.1.B.2 and 1.1.B.3), <strong>personal information</strong> and <strong>challenge questions</strong> (1.1.C.1), <strong>secure information</strong> (1.1.C.2). The two chips left over, <em>consensus</em> and <em>familiarity</em>, are genuine CED terms from Topic 2.1 (2.1.A.5 and 2.1.A.7). They are not Topic 1.1 content and they are not the answer to a Topic 1.1 question.</div>
</div>
  </div>
</div>

`;

// ── 10. section D: the three victim impacts, plus the demoted vocabulary ─────
//  This section used to be "1.1.4 Attack Types In Depth", 21 KB of the eight
//  legacy types, and it was the single largest source of the 212 off-CED hits.
//  The impacts in 1.1.C are the most assessable part of the topic and had no
//  section of their own, so they take this space and the vocabulary moves below
//  a banner that says plainly it is not assessed.
//
//  The preserved pieces are spliced out of the LIVE body at build time rather
//  than retyped: the overview grid and the eight cards carry literal emoji and
//  smart quotes that render correctly today, and retyping them is how mojibake
//  gets introduced. See PRESERVED_* anchors and injectAnchorIds().
const SECD_FROM = '<!-- SECTION D: Attack Types In Depth -->';
const SECD_TO = '<!-- SECTION E: Classification Quick Reference -->';

const PRESERVED_GRID_FROM = '<style>\n#se-attack-grid-wrap{';
const PRESERVED_GRID_TO = '\n\n<!-- Also add id anchors';
const PRESERVED_CARDS_FROM = '  <div class="attack-block">\n    <div class="atk-name">Phishing';
const PRESERVED_CARDS_TO = '<!-- Q4: SCENARIO SORT -->';

//  The eight ids the overview grid already links to. They were left as a TODO
//  comment in the live body and never applied, so every jump link is currently
//  dead. Order matches the order the cards appear in.
const ATTACK_ANCHOR_IDS = [
  'atk-phishing', 'atk-spear', 'atk-whaling', 'atk-vishing',
  'atk-smishing', 'atk-pretexting', 'atk-baiting', 'atk-quidproquo',
];

//  The eight preserved cards were written to teach the taxonomy as assessed
//  content: five of them ended with an instruction to classify an exam scenario
//  by channel or by executive job title. A banner promising the section is not
//  assessed, sitting above copy that says "on the AP exam, classify as vishing",
//  is worse than either half alone, so those directives are rewritten in place.
//  Everything else in the cards, including the literal emoji and smart quotes
//  that already render correctly, is preserved byte for byte. The needles below
//  hold the live page's smart quotes verbatim because they have to match it;
//  every REPLACEMENT is plain ASCII, and the gate proves no new non-ASCII
//  codepoint reaches the sheet.
const ENRICHMENT_EDITS = [
  [
    '<strong>Edge case:</strong> On the AP exam, phishing in the narrow technical sense refers specifically to email-based mass attacks. When the channel is text, classify as smishing; phone call, classify as vishing.',
    '<strong>Industry usage:</strong> In industry, phishing narrowly means the email version, and the text and voice versions get separate words. The CED does not make that split. On the AP exam the channel is context, and the classification is tactic and impact.',
  ],
  [
    '<strong>Classification hierarchy:</strong> All whaling is spear phishing, but not all spear phishing is whaling. On the AP exam, look for “CEO,” “CFO,” “CIO,” or “IT administrator with elevated privileges” as signals for whaling.',
    '<strong>Industry hierarchy:</strong> In industry usage all whaling is spear phishing, but not all spear phishing is whaling. Neither word is in the CED. An AP question about a targeted executive still turns on which tactic the message used and what the executive handed over.',
  ],
  [
    '<strong>Distinguishing smishing from vishing:</strong> The delivery channel is the only distinction. Classify each phase of a hybrid attack by its channel.',
    '<strong>Distinguishing smishing from vishing:</strong> In industry usage the delivery channel is the only distinction. EK 1.1.A.1 treats text message and voice as two of the settings social engineering happens in, not as two different attacks.',
  ],
  [
    '<strong>Pretexting as a component:</strong> Virtually every social engineering attack uses pretexting at some level. Classify it as pretexting when the elaborately constructed false identity is the attack’s primary mechanism.',
    '<strong>Pretexting is Unit 2 content:</strong> Unlike the rest of this section, pretexting is a real CED term. It lives at EK 2.1.A.2 and you will study it properly in Unit 2. It is not Topic 1.1 content and it is not the credited answer to a Topic 1.1 question.',
  ],
  [
    '<strong>Overlap with pretexting:</strong> All quid pro quo attacks use pretexting (the fake IT story), but they add an explicit value exchange. If the scenario describes an explicit offer followed by a request, classify as quid pro quo.',
    '<strong>Overlap with pretexting:</strong> In industry usage these attacks lean on a fabricated story and add an explicit exchange on top of it. Pretexting is a CED term belonging to Unit 2 at EK 2.1.A.2; quid pro quo is not in the CED at all. Neither is assessed in Topic 1.1.',
  ],
  [
    'Authority + Urgency + Fear overrides logic for many victims.',
    'In CED terms this call carries both named tactics: intimidation, in the threatened arrest, and urgency, in the demand to buy the cards immediately.',
  ],
  [
    ' (Authority), establishes',
    ', establishes',
  ],
  [
    '<strong>Why vishing is dangerous in 2025:</strong>',
    '<strong>Why voice attacks keep getting harder to spot:</strong>',
  ],
];

function applyEnrichmentEdits(cardsHtml) {
  let out = cardsHtml;
  for (const [needle, replacement] of ENRICHMENT_EDITS) {
    const n = out.split(needle).length - 1;
    if (n !== 1) {
      throw new Error(`enrichment edit matched ${n} times, expected 1: ${JSON.stringify(needle.slice(0, 60))}`);
    }
    out = out.replace(needle, replacement);
  }
  return out;
}

function injectAnchorIds(cardsHtml) {
  let i = 0;
  const out = cardsHtml.replace(/<div class="attack-block">/g, () => {
    const id = ATTACK_ANCHOR_IDS[i++];
    return id ? `<div class="attack-block" id="${id}">` : '<div class="attack-block">';
  });
  if (i !== ATTACK_ANCHOR_IDS.length) {
    throw new Error(`expected ${ATTACK_ANCHOR_IDS.length} attack-block divs to anchor, found ${i}`);
  }
  return out;
}

const SECD_HEAD = `<!-- SECTION D: The Three Victim Impacts -->
<div class="card" id="section-d">
  <h2>
<span class="section-icon">4</span>1.1.4: The Three Victim Impacts</h2>
  <p>Learning objective 1.1.C asks you to <em>describe possible impacts for victims of social engineering attacks</em>. The CED gives three, and they are not three severities of the same thing. They are three different things the adversary walks away with, and each one unlocks a different next move. Classify by what the victim handed over, never by how the message arrived.</p>

  <div class="attack-block" id="impact-personal">
    <div class="atk-name">Personal information <span class="atk-tag">EK 1.1.C.1</span>
</div>
    <div class="atk-desc"><strong>What the victim gave up.</strong> Name, phone number, address, workplace, pet names, birthdate, and information like them.</div>
    <div class="atk-desc"><strong>What it buys the adversary.</strong> Two things. It supports <strong>impersonation</strong>, because knowing a target&rsquo;s employer, manager and home town makes the next call sound authentic. And it answers <strong>challenge questions</strong>, the identity checks websites use to verify a user. That is why the CED bothers to list pets and birthdates by name: they are the standard answers.</div>
    <div class="atk-scenario"><strong>Worked example.</strong> A caller says they are updating the staff directory and collects a birthdate, a first pet&rsquo;s name and a childhood street. Nothing secret has been said out loud. A week later the adversary uses those three answers to pass a password reset.</div>
    <div class="atk-edge"><strong>The trap:</strong> students discount this impact because none of it is confidential. Confidentiality is not the test. The test is whether the information supports impersonation or answers a challenge question.</div>
  </div>

  <div class="attack-block" id="impact-secure">
    <div class="atk-name">Secure information <span class="atk-tag">EK 1.1.C.2</span>
</div>
    <div class="atk-desc"><strong>What the victim gave up.</strong> Secure information such as a one-time password (OTP) or an authentication login code.</div>
    <div class="atk-desc"><strong>What it buys the adversary.</strong> An immediate session. The CED is specific: it <strong>allows an adversary to log in to a service as the victim</strong>. Nothing else has to work. There is no waiting, no research phase, no second contact.</div>
    <div class="atk-scenario"><strong>Worked example.</strong> A caller claiming to be support says a verification code is on its way and asks the victim to read it back. She reads out six digits. The adversary was already at the login screen and finishes signing in before the call ends.</div>
    <div class="atk-edge"><strong>The trap:</strong> personal information and secure information are separated by <em>what happens next</em>, not by how private they feel. A birthdate is 1.1.C.1. A code that works once, right now, is 1.1.C.2.</div>
  </div>

  <div class="attack-block" id="impact-malware">
    <div class="atk-name">Malware or a malicious link <span class="atk-tag">EK 1.1.C.3</span>
</div>
    <div class="atk-desc"><strong>What the victim did.</strong> Downloaded malware, or clicked a link that installs malware.</div>
    <div class="atk-desc"><strong>What it buys the adversary.</strong> The CED names three outcomes: software installed on the device, information stolen from the victim&rsquo;s <strong>web browser</strong>, or the victim directed to a website where their <strong>login credentials are captured</strong>. Note that the third one needs no malware at all. A clicked link that lands on a convincing fake login page satisfies this impact on its own.</div>
    <div class="atk-scenario"><strong>Worked example.</strong> A teacher opens an attachment named as a grade report. A remote access tool installs silently and the saved passwords in her browser are copied out that evening.</div>
    <div class="atk-edge"><strong>The trap:</strong> this is the only impact where the <em>device</em> is compromised rather than the person&rsquo;s knowledge. The victim may have typed nothing and revealed nothing.</div>
  </div>

  <div class="info-box insight">
<span class="box-label">The bridge into Topic 1.2</span><p>The personal information collected in a 1.1.C.1 impact is the same material an adversary feeds into a targeted password dictionary in Topic 1.2 (EK 1.2.B.2), because common password patterns are built out of family names, pet names and personally significant dates (1.2.B.1). Topic 1.1 and Topic 1.2 are two halves of one attack: the conversation that gathers the detail, and the automated login attempts that spend it.</p>
</div>

  <div class="cfu-block" id="cfu-4" data-num="4" data-type="sort">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Impact Classification</span><span class="cfu-type-badge cfu-sort-badge">Classify</span>
</div>
<span class="cfu-counter">Q 4 of 10</span>
</div>
    <p class="cfu-question">Sort each outcome into the 1.1.C impact category it belongs to. Classify on what the victim actually surrendered, not on the channel the message arrived through.</p>
    <div class="sort-instructions">Click an outcome to select it, then click the category where it belongs. Click the remove control on a placed card to move it back.</div>
    <div class="sort-buckets" id="sort-4-buckets">
      <div class="sort-bucket" id="s4-bucket-personal" data-bucket="Personal info 1.1.C.1" onclick="sortPlaceInBucket(4,'Personal info 1.1.C.1')">
<span class="sort-bucket-label">Personal information (1.1.C.1)</span><div class="sort-bucket-cards" id="s4-personal-cards"></div>
</div>
      <div class="sort-bucket" id="s4-bucket-secure" data-bucket="Secure info 1.1.C.2" onclick="sortPlaceInBucket(4,'Secure info 1.1.C.2')">
<span class="sort-bucket-label">Secure information (1.1.C.2)</span><div class="sort-bucket-cards" id="s4-secure-cards"></div>
</div>
      <div class="sort-bucket" id="s4-bucket-malware" data-bucket="Malware or link 1.1.C.3" onclick="sortPlaceInBucket(4,'Malware or link 1.1.C.3')">
<span class="sort-bucket-label">Malware or malicious link (1.1.C.3)</span><div class="sort-bucket-cards" id="s4-malware-cards"></div>
</div>
    </div>
    <div class="sort-scenarios" id="sort-4-cards">
      <div class="sort-card" data-sort-id="s4c1" data-correct="Secure info 1.1.C.2" onclick="sortSelectCard(4,'s4c1')">
<span class="sort-card-num">1.</span> An employee reads a six-digit authentication code aloud to a caller who says they are migrating her account.</div>
      <div class="sort-card" data-sort-id="s4c2" data-correct="Personal info 1.1.C.1" onclick="sortSelectCard(4,'s4c2')">
<span class="sort-card-num">2.</span> A student fills in a &ldquo;which teacher are you&rdquo; quiz with her birthdate, her first pet and the street she grew up on.</div>
      <div class="sort-card" data-sort-id="s4c3" data-correct="Malware or link 1.1.C.3" onclick="sortSelectCard(4,'s4c3')">
<span class="sort-card-num">3.</span> A coach opens an attachment named as an updated bus schedule and a background program begins running.</div>
      <div class="sort-card" data-sort-id="s4c4" data-correct="Malware or link 1.1.C.3" onclick="sortSelectCard(4,'s4c4')">
<span class="sort-card-num">4.</span> A parent follows a texted link to a page that looks like the district portal and types her password into it.</div>
      <div class="sort-card" data-sort-id="s4c5" data-correct="Personal info 1.1.C.1" onclick="sortSelectCard(4,'s4c5')">
<span class="sort-card-num">5.</span> A caller confirms an assistant principal&rsquo;s work address, direct line and the name of the school he transferred from.</div>
      <div class="sort-card" data-sort-id="s4c6" data-correct="Secure info 1.1.C.2" onclick="sortSelectCard(4,'s4c6')">
<span class="sort-card-num">6.</span> A librarian forwards the one-time login code her banking app just sent to a number she was given on the phone.</div>
      <div class="sort-card" data-sort-id="s4c7" data-correct="Malware or link 1.1.C.3" onclick="sortSelectCard(4,'s4c7')">
<span class="sort-card-num">7.</span> A student clicks a link in a social media message and information saved in his browser is copied out.</div>
      <div class="sort-card" data-sort-id="s4c8" data-correct="Personal info 1.1.C.1" onclick="sortSelectCard(4,'s4c8')">
<span class="sort-card-num">8.</span> A caller collects the make of a teacher&rsquo;s first car and her mother&rsquo;s maiden name for a &ldquo;records audit&rdquo;.</div>
    </div>
    <button class="cfu-submit" id="cfu-4-btn" onclick="cfuSubmitSort(4)">Submit Sorting</button>
    <div class="cfu-feedback" id="cfu-4-feedback">
<div class="cfu-feedback-verdict" id="cfu-4-verdict"></div>
<div class="cfu-feedback-explain">
<strong>Secure information (1.1.C.2):</strong> 1 and 6. Both hand over a code that works once and works now, so the adversary can log in as the victim. <strong>Personal information (1.1.C.1):</strong> 2, 5 and 8. None of it is secret and all of it either supports impersonation or answers a challenge question; a mother&rsquo;s maiden name and a first car are the classic examples. <strong>Malware or malicious link (1.1.C.3):</strong> 3, 4 and 7. Card 4 is the one worth arguing about: no malware installs, but 1.1.C.3 explicitly covers a clicked link that <em>directs them to a website where their login credentials can be captured</em>.</div>
</div>
  </div>

  <div class="info-box warning">
<span class="box-label">Enrichment below this line: not assessed on the AP exam</span><p>Everything from here to the end of section 1.1.4 is industry vocabulary you will meet in the field, in the news, and in certification courses like Security+. <strong>None of it is Topic 1.1 content.</strong> Spear phishing, whaling, vishing, smishing, baiting and quid pro quo appear nowhere in the AP Cybersecurity Course and Exam Description effective Fall 2026. Pretexting is the one exception on this list: it is a genuine CED term, and it belongs to Unit 2 at EK 2.1.A.2. You will not be asked to define or sort any of these in Topic 1.1, and none of them will be the credited answer to a Topic 1.1 question. They are here because the words are genuinely useful and because you will hear them. Read this section for interest, and revise from 1.1.2 through 1.1.5.</p>
</div>

`;

const SECD_TAIL = `
  <div class="info-box stat">
<span class="box-label">Back to what is assessed</span><p>If you took one thing from the enrichment above, make it this: the AP exam asks what <strong>tactic</strong> the message used and what <strong>impact</strong> the victim suffered. Those are the two axes in EK 1.1.A.2 and EK 1.1.C. A scenario that describes a fraudulent text message is not asking you to name the channel; it is asking whether the message threatened a consequence, set a deadline, and what the victim handed over as a result.</p>
</div>
</div>

`;

// ── 11. section E: quick reference ───────────────────────────────────────────
//  Was an eight-row table crossing the legacy attack types against Cialdini
//  principles, sold as "the classification reflex required for AP exam scenario
//  questions". The reflex it built was the wrong one.
const SECE_FROM = '<!-- SECTION E: Classification Quick Reference -->';
const SECE_TO = '<!-- SECTION F: Case Studies -->';
const SECE_HTML = `<!-- SECTION E: Tactic and Impact Quick Reference -->
<div class="card" id="section-e">
  <h2>
<span class="section-icon">5</span>1.1.5: Tactic and Impact Quick Reference</h2>
  <p>Two questions answer almost every Topic 1.1 scenario item. Which tactics are in the message, and what did the victim hand over. Ask them in that order and answer them independently.</p>

  <p><strong>Question 1: which tactics are present?</strong></p>
  <div>
    <table class="compare-table">
      <thead><tr>
<th>Answer</th>
<th>Test</th>
<th>Words that signal it</th>
<th>CED reference</th>
</tr></thead>
      <tbody>
        <tr>
<td class="att-name">Intimidation only</td>
<td>A negative consequence is threatened against the target, and no deadline is set</td>
<td class="principle">reported, referred, suspended, disabled, fined, prosecuted</td>
<td>1.1.A.2 with 1.1.B.2</td>
</tr>
        <tr>
<td class="att-name">Urgency only</td>
<td>A reason to act quickly is created, and nothing is threatened as punishment</td>
<td class="principle">within 15 minutes, expires today, before the window closes, immediately</td>
<td>1.1.A.2 with 1.1.B.3</td>
</tr>
        <tr>
<td class="att-name">Both</td>
<td>Both tests pass: something bad is threatened <em>and</em> there is a clock on it</td>
<td class="principle">closed within 24 hours, locked out by 5pm today</td>
<td>1.1.A.2</td>
</tr>
        <tr>
<td class="att-name">Neither</td>
<td>Neither test passes and the message is still manipulating the target into revealing information, downloading a file, or clicking a link</td>
<td class="principle">no rush, whenever you get a chance, just tidying up our records</td>
<td>1.1.A.1, since 1.1.A.2 says <em>often</em></td>
</tr>
      </tbody>
    </table>
  </div>

  <p><strong>Question 2: what did the victim hand over?</strong></p>
  <div>
    <table class="compare-table">
      <thead><tr>
<th>Impact</th>
<th>What was surrendered</th>
<th>What the adversary can now do</th>
<th>CED reference</th>
</tr></thead>
      <tbody>
        <tr>
<td class="att-name">Personal information</td>
<td>Name, phone, address, workplace, pet names, birthdate</td>
<td>Impersonate the victim, and answer website challenge questions</td>
<td>1.1.C.1</td>
</tr>
        <tr>
<td class="att-name">Secure information</td>
<td>A one-time password or authentication login code</td>
<td>Log in to a service as the victim, immediately</td>
<td>1.1.C.2</td>
</tr>
        <tr>
<td class="att-name">Malware or malicious link</td>
<td>A downloaded file, or a click on a malicious link</td>
<td>Install malware, steal browser information, or capture credentials on a fake site</td>
<td>1.1.C.3</td>
</tr>
        <tr>
<td class="att-name">None of the three</td>
<td>Something outside 1.1.C, for example money moved or a door held open</td>
<td>Real damage, but not one of the three impacts this LO lists</td>
<td>Outside 1.1.C</td>
</tr>
      </tbody>
    </table>
  </div>

  <div class="callout">
    <strong>The two questions are independent</strong>
    A message can carry both tactics and produce no impact at all, because the target ignored it. A message can carry neither tactic and produce a 1.1.C.2 impact, because the target was helpful. Do not let a confident answer to one question drag the other along with it.
  </div>

  <div class="cfu-block" id="cfu-5" data-answer="D" data-num="5" data-type="mcq">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Check for Understanding</span><span class="cfu-type-badge">MCQ</span>
</div>
<span class="cfu-counter">Q 5 of 10</span>
</div>
    <p class="cfu-question">A district employee receives this email: &ldquo;Payroll audit: your direct deposit record could not be verified. Records that stay unverified past 5:00 PM today are suspended and forwarded to the district compliance office. Confirm your details here.&rdquo; She follows the link, lands on a page styled like the district portal, and types her username and password. Which of the following are true?<br><br>I. The message carries intimidation.<br>II. The message carries urgency.<br>III. The impact on the victim is best classified as secure information (1.1.C.2).</p>
    <div class="cfu-options" id="cfu-5-opts">
      <label class="cfu-opt" data-val="A"><span class="cfu-opt-letter">A</span><span class="cfu-opt-text">II only</span></label>
      <label class="cfu-opt" data-val="B"><span class="cfu-opt-letter">B</span><span class="cfu-opt-text">I and III only</span></label>
      <label class="cfu-opt" data-val="C"><span class="cfu-opt-letter">C</span><span class="cfu-opt-text">II and III only</span></label>
      <label class="cfu-opt" data-val="D"><span class="cfu-opt-letter">D</span><span class="cfu-opt-text">I and II only</span></label>
    </div>
    <button class="cfu-submit" id="cfu-5-btn" onclick="cfuSubmitMCQ(5)">Submit Answer</button>
    <div class="cfu-feedback" id="cfu-5-feedback">
<div class="cfu-feedback-verdict" id="cfu-5-verdict"></div>
<div class="cfu-feedback-explain">D is correct. I is true: suspension and referral to the compliance office are threatened negative consequences (1.1.A.2, mechanism 1.1.B.2). II is true: the 5:00 PM cutoff is a created reason to act quickly (1.1.A.2, mechanism 1.1.B.3). III is false, and it is the whole question. She clicked a malicious link that took her to a site where her credentials were captured, which EK 1.1.C.3 names explicitly. Secure information in 1.1.C.2 means a one-time password or authentication code; a username and password typed into a fake portal is not that. B and C each accept the wrong impact, and A drops an intimidation that is plainly stated.</div>
</div>
  </div>
</div>

`;

// ── 12. section F: case studies ──────────────────────────────────────────────
//  The three real incidents stay. What changes is the verdict on each: the old
//  copy classified them by attack-type taxonomy ("textbook whaling", "combined
//  OSINT, pretexting, vishing and social proof"). They are now read the way the
//  exam reads a scenario, on tactic and impact, and two of them are kept
//  deliberately because they land on the edge cases: one uses neither named
//  tactic, and one produces no 1.1.C impact at all.
const SECF_FROM = '<!-- SECTION F: Case Studies -->';
const SECF_TO = '<!-- SECTION G: Defense Strategies -->';
const SECF_HTML = `<!-- SECTION F: Case Studies -->
<div class="card" id="section-f">
  <h2>
<span class="section-icon">6</span>1.1.6: Real-World Case Studies</h2>
  <p>Read each of these the way an exam reader would: which tactics are in the approach, and which of the three impacts landed. Two of the three are here because they do not fit the tidy pattern.</p>

  <div class="case-block">
    <div class="case-header">
<span class="case-year">2020</span><span class="case-title">The Twitter account takeover</span>
</div>
    <div class="case-body">
      <p>Attackers phoned Twitter staff, claimed to be the company&rsquo;s own IT department, and talked employees through a &ldquo;verification&rdquo; process. They had already worked out from public sources which employees held access to internal admin tools. With the credentials the staff supplied, they reset authentication on roughly 130 high-profile accounts and moved over $120,000 in cryptocurrency before the company cut off internal tooling.</p>
      <p>No software was exploited. Every door the attackers went through was opened for them by a person who believed they were helping their own IT team.</p>
      <div class="case-verdict">
<span class="case-verdict-label">Read it the CED way</span><p><strong>Tactics:</strong> urgency, in the pressure to complete verification during the call. Intimidation is not clearly present; the approach was helpful rather than threatening. <strong>Impact:</strong> secure information, 1.1.C.2. The employees handed over credentials and authentication that let the adversary sign in as them. That is the impact that needs nothing else to work.</p>
</div>
    </div>
  </div>

  <div class="case-block">
    <div class="case-header">
<span class="case-year">Composite</span><span class="case-title">The confidential wire transfer</span>
</div>
    <div class="case-body">
      <p>A finance director received an email that appeared to come from the chief executive: the company was closing a confidential acquisition, a transfer of $245,000 had to go out today, and the matter was not to be discussed with legal or the wider finance team until the deal closed. The transfer went out. It was found three days later when the chief executive returned from travel.</p>
      <p>The instruction not to discuss it is the load-bearing part. It removed the one control that would have stopped the attack, which was a colleague asking a question.</p>
      <div class="case-verdict">
<span class="case-verdict-label">Read it the CED way</span><p><strong>Tactics:</strong> both. Urgency in the same-day deadline, and intimidation in the implied consequence of breaking confidentiality on a deal the chief executive is personally handling. <strong>Impact:</strong> <em>none of the three in 1.1.C.</em> No personal information was elicited, no authentication code was given up, nothing was downloaded and no link was clicked. Money moved. That is severe, and it is still outside the three impacts this learning objective lists. On the exam, do not force a scenario into 1.1.C because the damage was large.</p>
</div>
    </div>
  </div>

  <div class="case-block">
    <div class="case-header">
<span class="case-year">Composite</span><span class="case-title">The drives left in the parking lot</span>
</div>
    <div class="case-body">
      <p>Security testers scattered 50 unbranded USB drives labelled as employee benefits and confidential HR material around a healthcare campus. Within a day, 31 had been plugged into hospital computers. In two cases an employee handed a drive in to HR, who plugged it in to find out whose it was.</p>
      <p>Nobody was contacted, threatened or hurried. The drives simply sat there and curiosity did the rest.</p>
      <div class="case-verdict">
<span class="case-verdict-label">Read it the CED way</span><p><strong>Tactics:</strong> neither. There is no threatened consequence and no created deadline, so neither of the two tactics in 1.1.A.2 is present. It is still social engineering under 1.1.A.1, because a person was manipulated into running a malicious file. <strong>Impact:</strong> malware, 1.1.C.3. This is the cleanest illustration of why 1.1.A.2 says adversaries use those tactics <em>often</em> rather than always.</p>
</div>
    </div>
  </div>

  <div class="cfu-block" id="cfu-6" data-num="6" data-type="match">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Check for Understanding</span><span class="cfu-type-badge cfu-match-badge">Matching</span>
</div>
<span class="cfu-counter">Q 6 of 10</span>
</div>
    <p class="cfu-question">Match each scenario to the combination of tactic and impact it demonstrates. Every combination is used exactly once.</p>
    <div class="match-instructions">Click a combination on the left, then click its matching scenario on the right. Click a matched pair to undo it.</div>
    <div class="match-container" id="match-6-container">
      <div class="match-col" id="match-6-left">
        <div class="match-col-label">Tactic and impact</div>
        <div class="match-item" data-match-id="m6a" data-match-key="int-c1">
<span class="match-num">1</span>Intimidation only, personal information</div>
        <div class="match-item" data-match-id="m6b" data-match-key="urg-c2">
<span class="match-num">2</span>Urgency only, secure information</div>
        <div class="match-item" data-match-id="m6c" data-match-key="both-c3">
<span class="match-num">3</span>Both tactics, malware or malicious link</div>
        <div class="match-item" data-match-id="m6d" data-match-key="nei-c3">
<span class="match-num">4</span>Neither tactic, malware or malicious link</div>
        <div class="match-item" data-match-id="m6e" data-match-key="nei-c1">
<span class="match-num">5</span>Neither tactic, personal information</div>
        <div class="match-item" data-match-id="m6f" data-match-key="both-none">
<span class="match-num">6</span>Both tactics, none of the three impacts</div>
      </div>
      <div class="match-connector">&harr;</div>
      <div class="match-col" id="match-6-right">
        <div class="match-col-label">Scenario</div>
        <div class="match-item" data-match-id="m6r1" data-match-key="nei-c3">
<span class="match-num">A</span>An unlabelled drive is found in the staff room. A teacher plugs it in to see whose it is, and a background program starts.</div>
        <div class="match-item" data-match-id="m6r2" data-match-key="both-none">
<span class="match-num">B</span>&ldquo;Wire the deposit before the 3pm cutoff and do not copy anyone in, or we lose the contract and I will have to explain why.&rdquo; The transfer goes out.</div>
        <div class="match-item" data-match-id="m6r3" data-match-key="int-c1">
<span class="match-num">C</span>&ldquo;Accounts that fail our identity audit are suspended.&rdquo; The employee supplies her birthdate and her mother&rsquo;s maiden name to pass the audit.</div>
        <div class="match-item" data-match-id="m6r4" data-match-key="nei-c1">
<span class="match-num">D</span>A friendly caller updating the alumni directory chats for ten minutes and comes away with a graduation year, a first pet and a home town.</div>
        <div class="match-item" data-match-id="m6r5" data-match-key="both-c3">
<span class="match-num">E</span>&ldquo;Unpatched laptops are pulled from the network at close of business today.&rdquo; The link installs the &ldquo;patch tool&rdquo; and a background program with it.</div>
        <div class="match-item" data-match-id="m6r6" data-match-key="urg-c2">
<span class="match-num">F</span>&ldquo;Your code is arriving now. Read it back quickly, the window is short.&rdquo; She reads out the six digits.</div>
      </div>
    </div>
    <button class="cfu-submit" id="cfu-6-btn" onclick="cfuSubmitMatch(6)">Submit Matches</button>
    <div class="cfu-feedback" id="cfu-6-feedback">
<div class="cfu-feedback-verdict" id="cfu-6-verdict"></div>
<div class="cfu-feedback-explain">
<strong>1 to C:</strong> suspension is a threatened consequence with no deadline attached, and a birthdate plus a maiden name is 1.1.C.1. <strong>2 to F:</strong> a short window with nothing threatened, and a one-time code is 1.1.C.2. <strong>3 to E:</strong> pulled from the network is the threat, close of business is the clock, and something installed is 1.1.C.3. <strong>4 to A:</strong> nobody was threatened or hurried, and the drive still produced 1.1.C.3. <strong>5 to D:</strong> a patient friendly conversation with neither tactic, eliciting 1.1.C.1 detail. <strong>6 to B:</strong> both tactics are present and the loss is money, which is real damage that sits outside the three impacts in 1.1.C.</div>
</div>
  </div>
</div>

`;

// ── 13. common AP exam mistakes ──────────────────────────────────────────────
//  Three of the five old rows were about telling the eight legacy attack types
//  apart. The intimidation-vs-urgency row and the impact-category row were
//  already right and are kept in substance.
const MISTAKES_FROM = '<span class="section-icon">!</span>Common AP Exam Mistakes — Topic 1.1</h2>';
const MISTAKES_TO = '</tbody>';
const MISTAKES_HTML = `<span class="section-icon">!</span>Common AP Exam Mistakes: Topic 1.1</h2>
<table class="vocab-table">
<thead><tr>
<th>Mistake</th>
<th>Why it is wrong</th>
<th>What to do instead</th>
</tr></thead>
<tbody>
<tr>
<td class="term">Confusing intimidation with urgency</td>
<td>They are two separate tactics in 1.1.A.2 with two separate mechanisms in 1.1.B.2 and 1.1.B.3. Urgency is time pressure. Intimidation is a threatened negative consequence. A message can carry both.</td>
<td>Ask the two questions separately. What happens to me if I ignore this? How long am I being given?</td>
</tr>
<tr>
<td class="term">Assuming every social engineering message carries a named tactic</td>
<td>EK 1.1.A.2 says adversaries <em>often</em> use intimidation and urgency. A calm, friendly, unhurried message that elicits sensitive information is still social engineering under 1.1.A.1.</td>
<td>Let <strong>neither</strong> be an available answer and pick it when both tests fail.</td>
</tr>
<tr>
<td class="term">Treating personal information as harmless because it is not secret</td>
<td>1.1.C.1 lists names, addresses, workplaces, pet names and birthdates precisely because websites accept them as challenge question answers. Public-ish detail is exactly what supports impersonation.</td>
<td>Ask whether the detail could pass an identity check or make a follow-up contact sound real. If so, it is 1.1.C.1.</td>
</tr>
<tr>
<td class="term">Filing a captured password under secure information</td>
<td>1.1.C.2 names a one-time password or authentication login code. A standing password typed into a fake portal reached by a clicked link is 1.1.C.3, which explicitly covers being directed to a credential capture site.</td>
<td>Ask what the victim did. Read a short-lived code back to someone is 1.1.C.2. Followed a link and typed into a page is 1.1.C.3.</td>
</tr>
<tr>
<td class="term">Classifying by the channel the message arrived on</td>
<td>1.1.A.1 lists in person, email, text and social media as where social engineering happens. The CED never renames the attack because it came by phone. Channel is context.</td>
<td>Read the channel for background, then classify on tactic and impact.</td>
</tr>
<tr>
<td class="term">Reaching for vocabulary that is not in the CED</td>
<td>Terms like spear phishing, vishing, smishing, whaling, baiting and quid pro quo do not appear anywhere in the CED effective Fall 2026, and the Unit 2 tactic list belongs to Topic 2.1.</td>
<td>If your answer needs a word the CED never uses, it is not the credited answer to a Topic 1.1 question.</td>
</tr>
</tbody>`;

// ── 14. section H: worked examples ───────────────────────────────────────────
//  Both scenarios are kept. The analysis is rebuilt: the old steps were "slash
//  the trash by delivery channel" and ended in a taxonomy label. The new steps
//  end where the exam ends, on tactic and impact. cfu-9 keeps its interactive
//  email specimen, which was already clean; only the prompt and the feedback
//  needed the Unit 2 principle names taken out.
const SECH_FROM = '<!-- SECTION H: Worked Examples -->';
const SECH_TO = '<!-- SECTION I: AP Exam Strategy -->';
const SECH_HTML = `<!-- SECTION H: Worked Examples -->
<div class="card" id="section-h">
  <h2>
<span class="section-icon">8</span>1.1.8: Worked Examples</h2>
  <p>Work both of these the way you would work an exam item: name the tactics, name the impact, say what the adversary can now do, then say what the target should have done.</p>

  <div class="ex-block">
    <div class="ex-header">
<span class="ex-num">1</span><span class="ex-title">The redelivery text</span>
</div>
    <div class="ex-scenario"><strong>Scenario:</strong> Maria receives a text: &ldquo;USPS: parcel 9400111899222375 could not be delivered. Unclaimed parcels are returned to sender after 24 hours. Reschedule here: usps-redelivery-confirm.net&rdquo;. The page asks for her name, address and date of birth to &ldquo;confirm the delivery record&rdquo;. She fills it in.</div>
    <div class="ex-body">
      <div class="ex-step">
<span class="step-n">1</span><div class="step-c"><strong>Which tactics are present?</strong> Urgency, carried by the 24 hour window. Intimidation is worth arguing about and the answer is no: a parcel going back to the sender is an outcome, not a consequence the sender threatens against Maria for non-compliance. On balance this is urgency only.</div>
</div>
      <div class="ex-step">
<span class="step-n">2</span><div class="step-c"><strong>What did the victim hand over?</strong> Name, address and date of birth. That is 1.1.C.1, personal information. She did not give up a one-time code, so this is not 1.1.C.2.</div>
</div>
      <div class="ex-step">
<span class="step-n">3</span><div class="step-c"><strong>Is 1.1.C.3 also in play?</strong> She clicked a link, and 1.1.C.3 covers a link that installs malware or directs the victim to a credential capture site. This page captured no credentials and installed nothing; it harvested personal detail. The best single classification is 1.1.C.1. Notice that the click alone did not settle it. What the page did settles it.</div>
</div>
      <div class="ex-step">
<span class="step-n">4</span><div class="step-c"><strong>What can the adversary do now?</strong> Impersonate Maria, and answer challenge questions. A date of birth plus a verified home address is most of what a phone-based account recovery asks for.</div>
</div>
      <div class="ex-answer"><p><strong>Answer:</strong> urgency only, impact 1.1.C.1. The correct response is to open the carrier&rsquo;s own site or app directly and look the tracking number up there. Nothing in a text message needs to be clicked for that.</p></div>
    </div>
  </div>

  <div class="ex-block">
    <div class="ex-header">
<span class="ex-num">2</span><span class="ex-title">The unhurried help desk call</span>
</div>
    <div class="ex-scenario"><strong>Scenario:</strong> James works an IT help desk. A caller introduces himself as Alex from the records system rollout, mentions a login problem James raised in a company-wide ticket last week, and says there is no hurry at all. He walks James through checking his account, then says the system is about to send a verification code and asks James to read it back so he can &ldquo;confirm the directory entry matches&rdquo;. James reads out six digits.</div>
    <div class="ex-body">
      <div class="ex-step">
<span class="step-n">1</span><div class="step-c"><strong>Which tactics are present?</strong> Neither. Nothing is threatened, and the caller explicitly removes time pressure. Students who have learned that social engineering always shouts will look for one anyway. Do not invent it.</div>
</div>
      <div class="ex-step">
<span class="step-n">2</span><div class="step-c"><strong>Is this still social engineering?</strong> Yes, under 1.1.A.1: psychological tactics used to manipulate a user into revealing sensitive information. EK 1.1.A.2 says adversaries use intimidation and urgency <em>often</em>, and this caller chose neither because patience was more convincing.</div>
</div>
      <div class="ex-step">
<span class="step-n">3</span><div class="step-c"><strong>What did the victim hand over?</strong> A one-time authentication code. That is 1.1.C.2, secure information, and it is the impact with the shortest fuse. The adversary was already at the login screen.</div>
</div>
      <div class="ex-step">
<span class="step-n">4</span><div class="step-c"><strong>What made it work?</strong> The reference to a real ticket. That detail is 1.1.C.1 material gathered earlier, spent here to make the call sound like a colleague. Impacts chain: personal information collected in one contact buys the credibility that produces a secure information impact in the next.</div>
</div>
      <div class="ex-answer"><p><strong>Answer:</strong> neither tactic, impact 1.1.C.2. The correct response is that a verification code is never read back to an inbound caller, whatever they know about you. Hang up and call the internal number from the directory.</p></div>
    </div>
  </div>

  <!-- Q9: SPOT THE RED FLAGS -->
  <div class="cfu-block" id="cfu-9" data-num="9" data-type="redflag">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Spot the Red Flags</span><span class="cfu-type-badge cfu-redflag-badge">Interactive</span>
</div>
<span class="cfu-counter">Q 9 of 10</span>
</div>
    <p class="cfu-question">This email reached a school district employee. Click every element that is <strong>evidence of a social engineering attempt</strong>: a tactic from 1.1.A.2, or a route to one of the impacts in 1.1.C. There are <strong>6</strong>.</p>
    <div class="redflag-instructions">Click suspicious elements to flag them. Click again to un-flag. Not every element is a red flag, and flagging something ordinary counts against you.</div>
    <div class="redflag-counter" id="rf-9-counter">Flags placed: 0 / 6</div>
    <div class="redflag-email" id="rf-9-email">
      <div class="redflag-toolbar">
<span class="redflag-dot r"></span><span class="redflag-dot y"></span><span class="redflag-dot g"></span>
</div>
      <div class="redflag-meta">
        <span class="redflag-field"><strong>From:</strong> <span class="rf-spot" data-flag="true" data-rf-id="rf9a" onclick="rfToggle(9,'rf9a')">IT-Security@blueva11ey-k12.org</span></span>
        <span class="redflag-field"><strong>To:</strong> jthompson@bluevalley-k12.org</span>
        <span class="redflag-field"><strong>Subject:</strong> <span class="rf-spot" data-flag="true" data-rf-id="rf9b" onclick="rfToggle(9,'rf9b')">URGENT: Mandatory Password Reset, Account Will Be Locked</span></span>
        <span class="redflag-field"><strong>Date:</strong> August 24, 2026 at 4:47 PM</span>
      </div>
      <div class="redflag-body">
        <p><span class="rf-spot" data-flag="false" data-rf-id="rf9c" onclick="rfToggle(9,'rf9c')">Dear Ms. Thompson,</span></p>
        <p>The Blue Valley School District IT Security team has detected <span class="rf-spot" data-flag="true" data-rf-id="rf9d" onclick="rfToggle(9,'rf9d')">unauthorized access to your account from an IP address in Eastern Europe</span>. As part of our emergency response protocol, all affected accounts must be re-verified within the next <span class="rf-spot" data-flag="true" data-rf-id="rf9e" onclick="rfToggle(9,'rf9e')">2 hours or your account will be permanently disabled</span>.</p>
        <p>Please click the secure link below to verify your identity and reset your password:</p>
        <p>
          <span class="rf-spot" data-flag="true" data-rf-id="rf9f" onclick="rfToggle(9,'rf9f')">Verify My Account Now</span>
          <br><span>https://bluevalley-k12-secure-verify.net/reset</span>
        </p>
        <p>This reset is mandatory for all district employees. <span class="rf-spot" data-flag="false" data-rf-id="rf9g" onclick="rfToggle(9,'rf9g')">If you have questions, contact the IT Help Desk.</span></p>
        <p><span class="rf-spot" data-flag="false" data-rf-id="rf9h" onclick="rfToggle(9,'rf9h')">Thank you for helping keep our district secure.</span></p>
        <p>Best regards,<br><span class="rf-spot" data-flag="true" data-rf-id="rf9i" onclick="rfToggle(9,'rf9i')">District IT Security Team<br>Blue Valley Unified School District<br>Do NOT reply to this email. Call our office at (913) 555-0199</span></p>
      </div>
    </div>
    <button class="cfu-submit" id="cfu-9-btn" onclick="cfuSubmitRedFlag(9)">Submit Flags</button>
    <div class="cfu-feedback" id="cfu-9-feedback">
<div class="cfu-feedback-verdict" id="cfu-9-verdict"></div>
<div class="cfu-feedback-explain">
      <strong>The 6 red flags, and the EK each one belongs to:</strong><br>
      &bull; <strong>Sender domain:</strong> blueva11ey uses two ones in place of two Ls. The message is not from the district at all.<br>
      &bull; <strong>Subject line:</strong> carries both named tactics at once. URGENT is urgency (1.1.A.2 with 1.1.B.3); account will be locked is a threatened negative consequence, so intimidation (1.1.A.2 with 1.1.B.2).<br>
      &bull; <strong>Access from Eastern Europe:</strong> alarming, unverifiable and deliberately vague. Fear used to incite action is the mechanism 1.1.B.2 describes.<br>
      &bull; <strong>2 hours or permanently disabled:</strong> the clock plus the threat. 1.1.B.3 is explicit that this pressure is what stops the target checking whether the action is safe.<br>
      &bull; <strong>Verify My Account Now:</strong> the link is the route to a 1.1.C.3 impact. The address underneath is not a district domain, and a page there can capture her credentials.<br>
      &bull; <strong>Do NOT reply, call this number:</strong> it steers her to a channel the adversary controls and away from the one that would expose the attack.<br>
      The three unflagged lines are ordinary email courtesy. A generic greeting, an offer to contact the help desk and a sign-off are not evidence of anything.
      <div class="rf-legend">
<span class="rf-legend-item"><span class="rf-legend-swatch"></span> Correctly flagged</span><span class="rf-legend-item"><span class="rf-legend-swatch"></span> Incorrectly flagged</span><span class="rf-legend-item"><span class="rf-legend-swatch"></span> Missed flag</span>
</div>
    </div>
</div>
  </div>
</div>

`;

// ── 15. section I: exam strategy ─────────────────────────────────────────────
//  Every tip in the old card taught the wrong reflex. Tip 2 was "eliminate by
//  channel first: phone means vishing, text means smishing", and the closing
//  box listed five "high-frequency AP Cyber scenario patterns", four of which
//  turned on vocabulary the CED does not contain.
const SECI_FROM = '<!-- SECTION I: AP Exam Strategy -->';
const SECI_TO = '<!-- SECTION FAQ -->';
const SECI_HTML = `<!-- SECTION I: AP Exam Strategy -->
<div class="exam-card" id="section-i">
  <h2>
<span class="section-icon">9</span>1.1.9: AP Exam Strategy for Topic 1.1</h2>
  <div class="exam-tip-item">
<span class="tip-badge">Tip 1</span><div class="tip-text">
<h4>Run the tactic test twice, once per tactic</h4>
<p>Ask what the message says will happen to the target if they do nothing. If the answer is a threatened bad outcome, that is intimidation. Then ask separately how much time the target is being given. If a reason to hurry has been created, that is urgency. Answering them together is how students end up calling every alarming message urgent.</p>
</div>
</div>
  <div class="exam-tip-item">
<span class="tip-badge">Tip 2</span><div class="tip-text">
<h4>Often is not always, so neither is a real answer</h4>
<p>EK 1.1.A.2 says adversaries <strong>often</strong> use intimidation and urgency. A calm, patient message that manipulates someone into revealing sensitive information is still social engineering under 1.1.A.1. If both tests fail, say so rather than forcing the nearest label.</p>
</div>
</div>
  <div class="exam-tip-item">
<span class="tip-badge">Tip 3</span><div class="tip-text">
<h4>Classify the impact by what the victim handed over</h4>
<p>Not by how alarming the message was, not by how much damage followed. Personal detail is 1.1.C.1. A one-time code is 1.1.C.2. A downloaded file or a clicked link is 1.1.C.3. If what was lost is none of those, for example money moved by a transfer, then the honest answer is that no 1.1.C impact applies.</p>
</div>
</div>
  <div class="exam-tip-item">
<span class="tip-badge">Tip 4</span><div class="tip-text">
<h4>Use the challenge question test to split C.1 from C.2</h4>
<p>Ask whether the information could answer a website identity check, or make a follow-up contact sound authentic. That is 1.1.C.1. Ask instead whether it would let someone log in right now, once. That is 1.1.C.2. Confidentiality is not the dividing line; what it unlocks is.</p>
</div>
</div>
  <div class="exam-tip-item">
<span class="tip-badge">Tip 5</span><div class="tip-text">
<h4>Read the channel for context, never for the classification</h4>
<p>EK 1.1.A.1 lists in person, email, text message and social media as where social engineering happens. The CED does not give the attack a different name on a different channel. A scenario that opens with a text message is setting a scene, not handing you the answer.</p>
</div>
</div>
  <div class="exam-tip-item">
<span class="tip-badge">Tip 6</span><div class="tip-text">
<h4>Flag NOT, EXCEPT and LEAST, and check every option in a Roman numeral item</h4>
<p>Mark the qualifier before you read the options. On an item with statements I, II and III, evaluate each statement on its own and write true or false beside it before you look at which combinations are offered. Most wrong answers on these items are one true statement away from right.</p>
</div>
</div>
  <div class="info-box exam">
<span class="box-label">What a Topic 1.1 question actually looks like</span><p>Expect items that: (1) quote a short message and ask which tactic or tactics it uses, with both and neither available as answers; (2) describe what a victim did and ask which impact category applies; (3) ask <strong>NOT</strong> or <strong>EXCEPT</strong> which of these is an impact described in the CED; (4) offer statements I, II and III mixing a tactic claim with an impact claim, so one wrong statement sinks two options; (5) ask what an adversary can do next with what they obtained, which is really 1.1.C.1 versus 1.1.C.2 in disguise. If an option needs a word the CED never uses, it is not the credited answer.</p>
</div>
</div>

`;

// ── 16. FAQ and the cumulative item ──────────────────────────────────────────
//  Six of the seven old questions were "what is the difference between X and Y"
//  for pairs of off-CED terms. The last two questions here keep that search
//  intent and answer it honestly, which is the only version of those answers
//  that helps a student sitting the exam. The FAQPage JSON-LD above mirrors
//  this list.
const FAQ_FROM = '<!-- SECTION FAQ -->';
const FAQ_TO = '<!-- AUTHOR BOX -->';
const FAQ_HTML = `<!-- SECTION FAQ -->
<div class="card" id="section-faq">
  <h2>
<span class="section-icon">10</span>1.1.10: Frequently Asked Questions</h2>
  <ul class="faq-list">
    <li class="faq-item">
<div class="faq-q">What two psychological tactics does the AP Cybersecurity CED name in Topic 1.1?</div>
<p class="faq-a">Intimidation and urgency, and only those two. EK 1.1.A.2 defines intimidation as threatening a target with negative consequences if they do not comply, and urgency as creating reasons why a target should act quickly. Any longer list you have met belongs to Unit 2.</p>
</li>
    <li class="faq-item">
<div class="faq-q">What is elicitation in cybersecurity?</div>
<p class="faq-a">Elicitation is the CED&rsquo;s term in EK 1.1.A.1 for manipulating a user into revealing sensitive information. It is one of three outcomes a social engineering attack aims at; the other two are getting the user to download a malicious file and getting them to click a malicious link. Elicitation is the goal. Intimidation and urgency are tactics used to reach it.</p>
</li>
    <li class="faq-item">
<div class="faq-q">What are the three victim impacts of a social engineering attack?</div>
<p class="faq-a">EK 1.1.C.1, personal information such as a name, phone number, address, workplace, pet name or birthdate, which supports impersonation and answers website challenge questions. EK 1.1.C.2, secure information such as a one-time password or authentication login code, which lets the adversary log in to a service as the victim. EK 1.1.C.3, downloading malware or clicking a link that installs malware, steals browser information, or leads to a site that captures login credentials.</p>
</li>
    <li class="faq-item">
<div class="faq-q">What is the difference between personal information and secure information?</div>
<p class="faq-a">What each one lets the adversary do. Personal information (1.1.C.1) is rarely secret; its value is that it supports impersonation and answers the challenge questions websites use to verify identity, so it pays off on a later contact. Secure information (1.1.C.2) is a code that works once and works now, and it pays off immediately because the adversary can log in as the victim. A birthdate is 1.1.C.1. A six-digit code texted during the call is 1.1.C.2.</p>
</li>
    <li class="faq-item">
<div class="faq-q">Can a message be social engineering if it uses neither intimidation nor urgency?</div>
<p class="faq-a">Yes. EK 1.1.A.2 says adversaries <em>often</em> use those tactics, which is not the same as always. A friendly, unhurried caller who talks someone into giving up a birthdate and a pet name has committed social engineering under EK 1.1.A.1. On an exam item, neither is a legitimate answer and it is sometimes the correct one.</p>
</li>
    <li class="faq-item">
<div class="faq-q">Why does the CED list pet names and birthdates as an impact?</div>
<p class="faq-a">Because of what websites do with them. EK 1.1.C.1 says these types of information are often used on websites as challenge questions to verify a user&rsquo;s identity. The information is not confidential, and that is exactly the problem: it is easy to talk someone out of and it is accepted as proof of who they are.</p>
</li>
    <li class="faq-item">
<div class="faq-q">Is phishing on the AP Cybersecurity exam?</div>
<p class="faq-a">The word appears in the CED, but never as content you have to define or classify. It turns up inside sample scenarios, in EK 1.4.A.2 where generative AI writes convincing phishing messages, and in EK 2.3.A.1 on awareness training. A Topic 1.1 question will not ask you to identify a message as phishing. It will ask which tactic the message uses and which impact the victim suffered.</p>
</li>
    <li class="faq-item">
<div class="faq-q">Are vishing, smishing, whaling, baiting and quid pro quo on the AP Cybersecurity exam?</div>
<p class="faq-a">No. None of those terms appears anywhere in the AP Cybersecurity Course and Exam Description effective Fall 2026, and neither do spear phishing, tailgating, credential stuffing, rainbow tables or deepfakes. They are real industry vocabulary and worth recognising, which is why section 1.1.4 keeps them as clearly marked enrichment. They will not be the credited answer to an AP question. If your reasoning depends on one of them, check it against the tactic and impact framework instead.</p>
</li>
    <li class="faq-item">
<div class="faq-q">Where do authority, consensus, scarcity, familiarity and pretexting belong?</div>
<p class="faq-a">Unit 2, Topic 2.1: pretexting at 2.1.A.2, authority at 2.1.A.3, consensus at 2.1.A.5, scarcity at 2.1.A.6 and familiarity at 2.1.A.7. They are genuine CED terms, and they are genuinely not Topic 1.1 content. Topic 1.1 names two tactics.</p>
</li>
  </ul>

  <!-- Q10: MCQ Cumulative -->
  <div class="cfu-block cfu-eol" id="cfu-10" data-answer="B" data-num="10" data-type="mcq">
    <div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">End of Lesson: Cumulative</span><span class="cfu-type-badge cfu-eol-badge">Cumulative</span>
</div>
<span class="cfu-counter">Q 10 of 10</span>
</div>
    <p class="cfu-question">Over three days an adversary contacts a school registrar. Monday: a relaxed call about &ldquo;refreshing the staff directory&rdquo; collects her start date, her campus and her assistant&rsquo;s name. Wednesday: an email using all three details says the district records portal is being re-verified and that unverified accounts are closed at 5:00 PM Friday. Friday afternoon she follows the link, reaches a page that mirrors the district portal, and signs in. Which statement <strong>most accurately</strong> describes this sequence?</p>
    <div class="cfu-options" id="cfu-10-opts">
      <label class="cfu-opt" data-val="A"><span class="cfu-opt-letter">A</span><span class="cfu-opt-text">Monday used neither named tactic and produced no impact, and Wednesday used urgency alone to produce a 1.1.C.2 impact on Friday</span></label>
      <label class="cfu-opt" data-val="B"><span class="cfu-opt-letter">B</span><span class="cfu-opt-text">Monday used neither named tactic and produced a 1.1.C.1 impact, and Wednesday used both named tactics to produce a 1.1.C.3 impact on Friday</span></label>
      <label class="cfu-opt" data-val="C"><span class="cfu-opt-letter">C</span><span class="cfu-opt-text">Monday used intimidation and produced a 1.1.C.1 impact, and Wednesday used urgency alone to produce a 1.1.C.3 impact on Friday</span></label>
      <label class="cfu-opt" data-val="D"><span class="cfu-opt-letter">D</span><span class="cfu-opt-text">Monday used urgency and produced a 1.1.C.3 impact, and Wednesday used both named tactics to produce a 1.1.C.2 impact on Friday</span></label>
    </div>
    <button class="cfu-submit" id="cfu-10-btn" onclick="cfuSubmitMCQ(10)">Submit Answer</button>
    <div class="cfu-feedback" id="cfu-10-feedback">
<div class="cfu-feedback-verdict" id="cfu-10-verdict"></div>
<div class="cfu-feedback-explain">B is correct. Monday threatens nothing and hurries nobody, so neither named tactic is present, and a start date, campus and colleague name is 1.1.C.1 personal information. Wednesday threatens closure of the account, which is intimidation, and sets a Friday 5:00 PM deadline, which is urgency, so both. Friday&rsquo;s impact is 1.1.C.3: she clicked a link that directed her to a site where her credentials were captured, an outcome EK 1.1.C.3 names explicitly. A misses Monday&rsquo;s impact and drops the intimidation in Wednesday&rsquo;s threat. C invents intimidation on Monday, where nothing is threatened. D reverses the pattern entirely and files a captured password as secure information, which 1.1.C.2 reserves for a one-time password or authentication code.</div>
</div>
  </div>
</div>

`;

// ── 17. the duplicated exit ticket ───────────────────────────────────────────
//  The same exit ticket card is on the page twice, once between the FAQ and the
//  author box and again just before the bottom nav, with slightly different
//  wording in the answer key. This removes the first copy. The comment left
//  behind now sits where it belongs, immediately above the author box.
const EXITDUP_FROM = '<!-- AUTHOR BOX -->';
const EXITDUP_TO = '<div class="author-box"';
const EXITDUP_HTML = '<!-- AUTHOR BOX -->\n<div class="author-box"';

// ── 18. the surviving exit ticket ────────────────────────────────────────────
//  Q2 asked for an attack type, Q3 asked for one, and the answer key named
//  spear phishing, vishing, pretexting and OSINT. The BOTTOM NAV comment was
//  also sitting above the exit ticket rather than above the nav.
const EXIT_FROM = '<!-- BOTTOM NAV -->';
const EXIT_TO = '<div class="bottom-nav">';
const EXIT_HTML = `<!-- EXIT TICKET -->
<div class="card" style="border-top:3px solid #DC2626!important;margin-top:8px!important;">
<span style="font-size:11px!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:1.5px!important;color:#DC2626!important;font-family:Georgia,serif!important;">Exit Ticket: Topic 1.1 | 5 Questions | Ready for Canvas / Google Classroom</span><p style="font-size:13px!important;color:#6B7280!important;font-family:Georgia,serif!important;margin-top:4px!important;margin-bottom:14px!important;">Students submit before leaving.</p>
<ol style="font-size:15px!important;color:#374151!important;line-height:1.9!important;padding-left:20px!important;font-family:Georgia,serif!important;">
<li>EK 1.1.A.2 names two tactics. Name both, and in one sentence each explain the psychological principle the CED says each one leverages. <em style="color:#6B7280!important;">(AP Skill: 1.A)</em>
</li>
<li>&ldquo;Accounts that fail the identity audit are suspended and referred to the district office.&rdquo; Which tactic or tactics does this carry, and which words carry them? <em style="color:#6B7280!important;">(AP Skill: 1.A)</em>
</li>
<li>A caller talked a teacher into giving up her birthdate and her first pet&rsquo;s name. (a) Which 1.1.C impact category is this? (b) Name the two things the CED says this information can be used for. <em style="color:#6B7280!important;">(AP Skill: 1.A)</em>
</li>
<li>Write a short message that is social engineering under 1.1.A.1 but carries <strong>neither</strong> tactic named in 1.1.A.2, then explain why it still qualifies. <em style="color:#6B7280!important;">(AP Skill: 1.A)</em>
</li>
<li>A district employee follows a link from an email, reaches a page that looks like the staff portal, and types her username and password. A classmate says the impact is 1.1.C.2 because a password is secure information. Say whether the classmate is right and justify your answer from the CED. <em style="color:#6B7280!important;">(AP Skill: 1.A)</em>
</li>
</ol>
<div style="background:#F9FAFB!important;border-left:3px solid #9CA3AF!important;padding:12px 16px!important;margin-top:12px!important;font-size:13px!important;color:#4B5563!important;font-family:Georgia,serif!important;border-radius:0 6px 6px 0!important;">
<strong>Answer Key:</strong> (1) Intimidation, which leverages a natural human aversion to negative consequences and uses fear to incite action (1.1.B.2); urgency, which leverages a natural human response to time-sensitive needs and pressures the target so they do not stop to consider whether the action is safe (1.1.B.3). (2) Intimidation only. Suspended and referred to the district office are threatened negative consequences; no deadline is set anywhere in the message, so urgency is absent. (3a) Personal information, 1.1.C.1. (3b) Impersonation of the victim, and answering the challenge questions websites use to verify identity. (4) Any calm, unhurried, non-threatening message that still manipulates the target into revealing sensitive information, downloading a file or clicking a link. It qualifies because 1.1.A.1 defines social engineering by the manipulation and its goal, and 1.1.A.2 says adversaries use intimidation and urgency often rather than always. (5) The classmate is wrong. EK 1.1.C.2 covers secure information such as a one-time password or authentication login code. Clicking a link that directs the victim to a website where login credentials are captured is named explicitly in EK 1.1.C.3, so the impact is 1.1.C.3.</div>
</div>

<!-- BOTTOM NAV -->
<div class="bottom-nav">`;

// ── the table ────────────────────────────────────────────────────────────────
//  from : anchor that must appear EXACTLY ONCE in the live body
//  to   : anchor searched for AFTER `from`. Omit for an exact string swap.
//  toExclusive : region stops where `to` begins, so `to` itself survives
//  html : replacement, or a function of the live body for the spliced regions
const SPLICES = [
  { name: 'byline', from: BYLINE_FROM, html: BYLINE_HTML },
  { name: 'author-box-date', from: REVIEWED_FROM, html: REVIEWED_HTML },
  { name: 'json-ld', from: JSONLD_FROM, to: JSONLD_TO, html: JSONLD_HTML },
  { name: 'exam-focus', from: FOCUS_FROM, to: FOCUS_TO, html: FOCUS_HTML },
  { name: 'ek-table', from: EKTABLE_FROM, to: EKTABLE_TO, html: EKTABLE_HTML },
  { name: 'bellringer', from: BELL_FROM, to: BELL_TO, html: BELL_HTML },
  { name: 'toc', from: TOC_FROM, to: TOC_TO, html: TOC_HTML },
  { name: 'objectives', from: OBJ_FROM, to: OBJ_TO, html: OBJ_HTML },
  { name: 'section-b', from: SECB_FROM, to: SECB_TO, toExclusive: true, html: SECB_HTML },
  { name: 'section-c', from: SECC_FROM, to: SECC_TO, toExclusive: true, html: SECC_HTML },
  { name: 'section-d', from: SECD_FROM, to: SECD_TO, toExclusive: true, html: buildSectionD },
  { name: 'section-e', from: SECE_FROM, to: SECE_TO, toExclusive: true, html: SECE_HTML },
  { name: 'section-f', from: SECF_FROM, to: SECF_TO, toExclusive: true, html: SECF_HTML },
  { name: 'mistakes', from: MISTAKES_FROM, to: MISTAKES_TO, html: MISTAKES_HTML },
  { name: 'section-h', from: SECH_FROM, to: SECH_TO, toExclusive: true, html: SECH_HTML },
  { name: 'section-i', from: SECI_FROM, to: SECI_TO, toExclusive: true, html: SECI_HTML },
  { name: 'faq', from: FAQ_FROM, to: FAQ_TO, toExclusive: true, html: FAQ_HTML },
  { name: 'exit-ticket-duplicate', from: EXITDUP_FROM, to: EXITDUP_TO, html: EXITDUP_HTML },
  { name: 'exit-ticket', from: EXIT_FROM, to: EXIT_TO, html: EXIT_HTML },
];

//  Section D is the one region assembled from the live body rather than typed
//  out: the overview grid and the eight vocabulary cards carry literal emoji
//  and smart quotes that render correctly today, and retyping them is exactly
//  how the mojibake in earlier imports got in.
function buildSectionD(body) {
  const grid = sliceBetween(body, PRESERVED_GRID_FROM, PRESERVED_GRID_TO, 'section-d overview grid');
  const cards = sliceBetween(body, PRESERVED_CARDS_FROM, PRESERVED_CARDS_TO, 'section-d vocabulary cards');
  return SECD_HEAD + grid + '\n\n' + injectAnchorIds(applyEnrichmentEdits(cards)).trimEnd() + '\n' + SECD_TAIL;
}

//  Both anchors must be unique. `to` is taken exclusively: the returned slice
//  runs from the start of `from` up to where `to` begins.
function sliceBetween(body, fromAnchor, toAnchor, label) {
  const a = indexOfUnique(body, fromAnchor, `${label} start`);
  const z = body.indexOf(toAnchor, a);
  if (z < 0) throw new Error(`${label}: end anchor not found after start`);
  return body.slice(a, z);
}

function indexOfUnique(body, anchor, label) {
  const first = body.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 70))}`);
  if (body.indexOf(anchor, first + 1) >= 0) {
    throw new Error(`${label}: anchor is ambiguous, appears more than once: ${JSON.stringify(anchor.slice(0, 70))}`);
  }
  return first;
}

//  Resolve every splice against the ORIGINAL body, refuse overlapping regions,
//  then rebuild left to right. Resolving against a partially rewritten body is
//  how an anchor silently lands in the wrong place.
function applySplices(body) {
  const resolved = SPLICES.map((s) => {
    const start = indexOfUnique(body, s.from, s.name);
    let end;
    if (s.to === undefined) {
      end = start + s.from.length;
    } else {
      const at = body.indexOf(s.to, start + s.from.length);
      if (at < 0) throw new Error(`${s.name}: end anchor not found after start anchor`);
      end = s.toExclusive ? at : at + s.to.length;
    }
    const html = typeof s.html === 'function' ? s.html(body) : s.html;
    return { name: s.name, start, end, html, removed: end - start };
  }).sort((a, b) => a.start - b.start);

  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i].start < resolved[i - 1].end) {
      throw new Error(`splice regions overlap: ${resolved[i - 1].name} and ${resolved[i].name}`);
    }
  }

  let out = '';
  let cursor = 0;
  for (const r of resolved) {
    out += body.slice(cursor, r.start) + r.html;
    cursor = r.end;
  }
  out += body.slice(cursor);
  return { body: out, resolved };
}

module.exports = {
  HANDLE,
  PAGE_ID,
  TITLE,
  SPLICES,
  applySplices,
  injectAnchorIds,
  ATTACK_ANCHOR_IDS,
};
