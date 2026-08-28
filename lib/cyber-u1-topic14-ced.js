'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBERSECURITY TOPIC 1.4: THE CED REALIGNMENT SPLICE TABLE
//
//  WHAT WAS WRONG, PRECISELY
//  Not "the page mentions off-CED words". Tanner's standard is the right one:
//  no off-CED term presented as exam-required. Measured against that, 1.4 has
//  one defect with two heads.
//
//  The page carries TWO tables whose entire job is to tell a student what the
//  exam wants, and both are keyed to a taxonomy the CED does not contain:
//
//    1.4.3  "Term | Definition | AP Exam Signal"
//           9 rows. Spear Phishing, Vishing and Polymorphic Malware each get a
//           row and an exam cue. Data poisoning and AI reconnaissance, which
//           ARE named attack types in the CED, get no row at all.
//
//    1.4.9  "Scenario Signal | Attack Type | Correct Defense Category"
//           5 rows. Three of the five Attack Type answers are legacy terms:
//           AI-enhanced spear phishing, Vishing with voice cloning, AI
//           polymorphic malware.
//
//  A student who studies those two tables is memorising the wrong answer key.
//
//  THE SECOND FINDING, WHICH THE TAXONOMY SWEEP DID NOT CATCH
//  1.4.7 "Defense Strategies" has six headed subsections: out-of-band
//  verification, dual approval, AI-specific training, prompt injection
//  mitigations, behavior-based detection, zero-trust. Not one of them is one of
//  the four defenses the CED names. Those four (shared secrets, MFA, keeping
//  sensitive data out of AI tools, verifying AI output against reputable
//  non-AI sources) appear only in the collapsed coverage table, the Common
//  Mistakes list, and answer keys. So the lesson's defense section and the
//  exam's defense list have no overlap, and nothing on the page says so.
//
//  Related: "digital avatar" is the CED's own noun in 1.4.A.1 and it appears
//  exactly once on the page, inside the collapsed audit table. A teacher who
//  opens that table sees a correct crosswalk. A student who reads the lesson
//  never meets the word.
//
//  WHAT THIS DOES NOT DO
//  It does not delete spear phishing, vishing or polymorphic malware. They are
//  real words, they carry the page's search traffic, and a student who reads
//  security news will meet them. They move into an "also called" column with a
//  plain statement that those names are not what a question will ask you to
//  sort attacks into. Naming a term while saying it is not the graded
//  vocabulary is allowed; presenting it as the exam's answer is not.
//
//  It does not touch 1.4.5 or 1.4.6 prose. Those sections use the words
//  descriptively, inside narrative, which the standard permits.
//
//  ── ONE ANSWER KEY CHANGES, DELIBERATELY ────────────────────────────────────
//  cfu-5 blank D. The credited defense was "out-of-band verification", which is
//  sound security and is not the CED's answer. It becomes "a shared secret",
//  which is 1.4.B.1, and out-of-band verification stays in the bank as a
//  distractor with feedback explaining why it is a good practice and not the
//  named control. Nothing else that is graded changes value: every match key,
//  every step id, every MCQ letter is preserved.
//
//  ── EK CODES ────────────────────────────────────────────────────────────────
//  Every fragment here is authored with no EK code in student-visible text, per
//  "Citing the CED to students" in docs/ap-cyber-unit1-ced-realignment.md. The
//  codes that remain on the page in the collapsed coverage table and the exit
//  key are correct and stay. The decorative ones already on the page are thinned
//  by the separate lib/cyber-ek-thin.js pass, which runs as its own sheet so the
//  two changes stay independently reviewable.
//
//  HOUSE RULES APPLIED TO EVERY FRAGMENT HERE
//    - pure ASCII source, HTML entities for anything else
//    - no em-dashes and no emoji in new copy
//    - the sort/dtb/seq widgets grade by string comparison, so any renamed
//      value is renamed on BOTH sides or the gate fails the build
//    - every cfu-feedback div keeps style="display:none!important;"
//
//  Regenerate the sheet, never hand-edit it:
//    node scripts/cyber-u1-topic14-ced-csv.js out/topic14.csv
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-ai-driven-threats';
const PAGE_ID = '132157866199';
const TITLE = 'AP Cybersecurity 1.4: AI-Based Cybersecurity Attacks';

// ── 1. the bellringer stops citing the CED at students ───────────────────────
const BELL_FROM = 'What AI attack type is this, and what CED defense would have helped verify the caller&rsquo;s identity?';
const BELL_HTML = 'What AI attack type is this, and what defense would have helped verify the caller&rsquo;s identity?';

// ── 2. section 1.4.3, the vocabulary table ───────────────────────────────────
//  Rebuilt CED-first: the six named attack types and the four named defenses,
//  in that order, with the legacy names demoted to a third column that says
//  what it is for. The old third column was "AP Exam Signal" and it handed a
//  student a classification cue for terms that cannot be the credited answer.
//
//  "Digital avatar" is introduced here because it is the CED's own word for
//  what a deepfake produces and the page currently uses it nowhere a student
//  can see.
//  Three tables on this page carry class="vocab-table", so the bare tag is not
//  a usable anchor. Reach back to the section heading, which is unique.
const VOCAB_FROM = '1.4.3 &mdash; Essential Vocabulary &amp; Exam Tips</h2>\n\n  <table class="vocab-table">';
const VOCAB_TO = '</table>';
const VOCAB_HTML = `1.4.3 &mdash; Essential Vocabulary &amp; Exam Tips</h2>

  <p class="vocab-intro" style="font-family:'Georgia',serif!important;font-size:15px!important;color:var(--g700)!important;margin-bottom:14px!important;">
    The left column is the vocabulary this topic is built on: six attack types and four
    defenses. The right column lists names you will meet in news coverage and in industry
    writing. Those names are worth knowing and they describe real things, but a question
    will not ask you to sort an attack into them.
  </p>

  <table class="vocab-table">
    <thead>
      <tr>
<th>Term</th>
<th>What it is</th>
<th>Also called</th>
</tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="vocab-term">LLM (Large Language Model)</span></td>
        <td>An AI model trained on very large text datasets, able to generate human-quality text, code, and structured content. Examples: GPT-4, Claude, Gemini. Every attack type below uses one.</td>
        <td>Generative AI, chatbot</td>
      </tr>
      <tr>
        <td><span class="vocab-term">AI deepfake</span></td>
        <td>An attacker feeds voice or image samples of a real person into an AI model to build a <strong>digital avatar</strong>, then uses it to impersonate that person on a phone call or a video call. The goal is money or sensitive information.</td>
        <td>Deepfake video, voice cloning, vishing when the impersonation happens over the phone</td>
      </tr>
      <tr>
        <td><span class="vocab-term">AI phishing</span></td>
        <td>An LLM writes the phishing message. It is fluent in any language, so the awkward phrasing that people were trained to look for is gone.</td>
        <td>AI-enhanced phishing, spear phishing when the message is aimed at one named person</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Prompt injection</span></td>
        <td>An attacker writes a prompt, or hides instructions inside content an AI system will read, to make the system reveal sensitive information or act against its intended function.</td>
        <td>Jailbreaking, indirect prompt injection</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Data poisoning</span></td>
        <td>An attacker publishes false information where it will be swept into an LLM's training set, so the model repeats the falsehood to everyone who asks.</td>
        <td>Training data poisoning, model poisoning</td>
      </tr>
      <tr>
        <td><span class="vocab-term">AI reconnaissance</span></td>
        <td>AI tools scan social media and public websites to assemble information about a target before any attack is launched. This is the step that makes the message in an AI phishing attack specific.</td>
        <td>OSINT, open-source intelligence, automated profiling</td>
      </tr>
      <tr>
        <td><span class="vocab-term">AI malware</span></td>
        <td>AI coding tools help an attacker write new malware, modify code that already exists, or find vulnerabilities in a codebase. Modifying existing code repeatedly is how malware avoids matching a known signature.</td>
        <td>Polymorphic malware, AI-assisted malware</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Shared secret</span></td>
        <td><strong>Defense.</strong> A word or phrase you agree on with a trusted contact <em>in advance</em>, then ask for when a high-stakes request arrives. A cloned voice does not know it.</td>
        <td>Safe word, challenge phrase, out-of-band verification when you confirm through a second channel instead</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Multi-factor authentication (MFA)</span></td>
        <td><strong>Defense.</strong> A second factor stops an adversary who has cloned a voice or stolen a password, because the cloned voice cannot produce the second factor.</td>
        <td>MFA, 2FA, two-step verification</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Keeping data out of AI tools</span></td>
        <td><strong>Defense.</strong> Do not paste personal or sensitive data into an AI tool. Some tools feed what you type back into training, and an adversary may then be able to extract it.</td>
        <td>Data minimization, AI acceptable use policy</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Verifying AI output</span></td>
        <td><strong>Defense.</strong> Check what an AI tells you against a reputable, stable source that is not itself AI-generated before you act on it. This is what catches a poisoned answer.</td>
        <td>Fact-checking, source triangulation</td>
      </tr>
    </tbody>
  </table>`;

// ── 3. the exam tip under that table ─────────────────────────────────────────
//  Kept, because pairing an attack with its defense is genuinely the skill. The
//  list of strong defenses is rewritten so the four named ones lead and the
//  process controls follow as practice rather than as the answer.
const TIP_FROM = '<p>For AI-driven threats, always pair the attack with its <em>specific</em> defense.';
const TIP_TO = '</p>';
const TIP_HTML = `<p>For AI-driven threats, always pair the attack with its <em>specific</em> defense.
      Grammar checks defend against old-style phishing, not against AI phishing. AI detection
      tools may help but are <strong>NOT</strong> reliable as a primary control. Four defenses
      carry most of the weight: a shared secret agreed in advance, multi-factor authentication,
      keeping sensitive data out of AI tools, and verifying AI output against a reputable
      non-AI source. Organizations layer process controls on top of those, such as calling back
      on a number you looked up yourself and requiring two approvals for a large transfer.</p>`;

// ── 4. cfu-3, the matching item ──────────────────────────────────────────────
//  The five match keys (C, D, A, B, E) and every option string are untouched:
//  this widget grades data-correct against the selected value, so the answers
//  are unchanged. Only two of the five left-hand TERM labels change, from
//  "LLM Phishing" and "AI Polymorphic Malware" to the names the CED uses.
const M3_1_FROM = '<div class="match-term">LLM Phishing</div>';
const M3_1_HTML = '<div class="match-term">AI phishing</div>';
const M3_5_FROM = '<div class="match-term">AI Polymorphic Malware</div>';
const M3_5_HTML = '<div class="match-term">AI malware</div>';

//  The feedback ended by telling students that a phone call means "voice
//  cloning / vishing". That is the single most exam-misleading sentence on the
//  page: under the CED a phone impersonation is a deepfake.
const FB3_FROM = '<strong>Correct matches:</strong> LLM Phishing';
const FB3_TO = '</div>';
const FB3_HTML = `<strong>Correct matches:</strong> AI phishing &rarr; personalized emails at scale (C).
        Deepfake &rarr; synthetic video or audio of a real person (D). Voice cloning &rarr; replicates a
        voice from an audio sample (A). Prompt injection &rarr; hidden instructions hijack an AI
        assistant (B). AI malware &rarr; mutates its code to evade signatures (E). Deepfake and voice
        cloning are not two different attack types: both are the same thing, an attacker using
        voice or image samples to build a digital avatar of a real person. The channel it arrives
        on, a phone call or a video call, does not change what it is.
      </div>`;

// ── 5. cfu-4 feedback ────────────────────────────────────────────────────────
const FB4_FROM = 'This is a hallmark of AI-enhanced spear phishing.';
const FB4_HTML = 'This is AI reconnaissance feeding an AI phishing message: the research step is what makes the request specific enough to be believed.';

// ── 6. cfu-5, the fill-in-the-blank ──────────────────────────────────────────
//  Two chips change value, and each is renamed on BOTH the chip and the blank
//  it answers, or the widget silently marks a correct placement wrong.
//
//    blank C  "authority and urgency"     -> "urgency"
//             authority is a Unit 2 tactic and does not belong in a 1.4 item.
//    blank D  "out-of-band verification"  -> "a shared secret"
//             the credited defense becomes the one the CED names. Out-of-band
//             verification stays in the bank as a distractor.
const Q5_FROM = 'Complete the description of how an AI voice cloning vishing attack succeeds.';
const Q5_HTML = 'Complete the description of how an AI deepfake voice attack succeeds.';

const P5_FROM = '&#9998; Predict first: Trace the complete voice cloning attack flow in your head before placing any chips.';
const P5_HTML = '&#9998; Predict first: Trace the complete attack flow in your head, and decide which defense the attacker cannot talk their way past, before placing any chips.';

const BANK5_FROM = '<div class="dtb-bank" id="dtb-5-bank">';
const BANK5_TO = '</div>';
const BANK5_HTML = `<div class="dtb-bank" id="dtb-5-bank">
      <span class="dtb-bank-label">Word Bank</span>
      <span class="dtb-chip" id="dtb-chip-5-1" data-val="voice model" onclick="dtbSelectChip('5','1')">voice model</span>
      <span class="dtb-chip" id="dtb-chip-5-2" data-val="public audio sample" onclick="dtbSelectChip('5','2')">public audio sample</span>
      <span class="dtb-chip" id="dtb-chip-5-3" data-val="a shared secret" onclick="dtbSelectChip('5','3')">a shared secret</span>
      <span class="dtb-chip" id="dtb-chip-5-4" data-val="urgency" onclick="dtbSelectChip('5','4')">urgency</span>
      <span class="dtb-chip" id="dtb-chip-5-5" data-val="strong encryption" onclick="dtbSelectChip('5','5')">strong encryption</span>
      <span class="dtb-chip" id="dtb-chip-5-6" data-val="out-of-band verification" onclick="dtbSelectChip('5','6')">out-of-band verification</span>
    </div>`;

const DIAG5_FROM = '<div class="dtb-diagram">';
const DIAG5_TO = '</div>';
const DIAG5_HTML = `<div class="dtb-diagram">
      The attacker extracts a
      <span class="dtb-blank" id="dtb-blank-5-A" data-correct="public audio sample" onclick="dtbPlaceChip('5','A')">               </span>
      of the target executive, trains a cloned
      <span class="dtb-blank" id="dtb-blank-5-B" data-correct="voice model" onclick="dtbPlaceChip('5','B')">               </span>
      to speak as a digital avatar, then calls an employee and leans on
      <span class="dtb-blank" id="dtb-blank-5-C" data-correct="urgency" onclick="dtbPlaceChip('5','C')">               </span>
      so there is no time to think. The defense the cloned voice cannot get past is
      <span class="dtb-blank" id="dtb-blank-5-D" data-correct="a shared secret" onclick="dtbPlaceChip('5','D')">               </span>
      agreed with the real executive before any of this happened.
    </div>`;

const FB5_FROM = '<div class="cfu-feedback-explain">Correct sequence: <strong>public audio sample</strong>';
const FB5_TO = '</div>';
const FB5_HTML = `<div class="cfu-feedback-explain">Correct sequence: <strong>public audio sample</strong>
        &rarr; cloned <strong>voice model</strong> &rarr; leans on <strong>urgency</strong> &rarr; defeated by
        <strong>a shared secret</strong>. A shared secret is the answer because it has to be agreed
        in advance, which is the one thing an attacker who just built the avatar cannot go back
        and do. Ask for it and the call ends. On the three distractors:
        <em>out-of-band verification</em>, hanging up and calling back on a number you looked up
        yourself, is a genuinely good practice and works for the same reason, but the control
        named for this situation is the pre-arranged secret.
        <em>Strong encryption</em> protects data in transit and does nothing about who is
        speaking. <em>Grammar</em> checks apply to text, not audio, and a cloned voice produces
        clean audio anyway.
      </div>`;

// ── 7. cfu-6 option A ────────────────────────────────────────────────────────
//  Still wrong, still plausible, no longer teaching a legacy label as the name
//  of a thing. Key D is unchanged.
const O6A_FROM = 'Spear phishing &mdash; the email was targeted at a specific individual with personalized content to steal credentials';
//  The em-dash here is deliberate and is the one place new copy carries one. In
//  a four-option MCQ the options have to look alike; B, C and D all use an
//  em-dash, so punctuating the distractor differently would itself be a cue.
const O6A_HTML = 'AI phishing &mdash; an LLM wrote a message aimed at one person, using details gathered about them, to steal credentials';
const FB6_FROM = 'Slash the trash: A is wrong because spear phishing targets a human recipient to steal credentials; here the AI is the target and credentials are not involved.';
const FB6_HTML = 'Slash the trash: A is wrong because AI phishing targets a human recipient to steal credentials; here the AI is the target and credentials are not involved.';

// ── 8. cfu-7, the ordering item ──────────────────────────────────────────────
//  data-correct-order and every data-step-id are untouched, so the graded
//  answer is identical. Only the labels move onto CED vocabulary, and step C
//  gains the name for what it already describes.
const P7_FROM = 'trace the complete AI-enhanced spear phishing attack from target selection to execution.';
const P7_HTML = 'trace the complete AI phishing attack from target selection to execution.';
const Q7_FROM = 'Place these steps of an AI-enhanced spear phishing attack in the correct chronological order.';
const Q7_HTML = 'Place these steps of an AI phishing attack in the correct chronological order.';
const S7C_FROM = 'Attacker performs OSINT: scrapes target&rsquo;s LinkedIn, company website, and recent press releases to gather contextual details';
const S7C_HTML = 'Attacker performs AI reconnaissance: automated tools scrape the target&rsquo;s LinkedIn, company website, and recent press releases to gather contextual details';
const S7E_FROM = 'Scraped data is fed into an LLM prompt instructing it to write a spear phishing email in the manager&rsquo;s writing style';
const S7E_HTML = 'Scraped data is fed into an LLM prompt instructing it to write a phishing email in the manager&rsquo;s writing style';
const FB7_FROM = '<strong>Correct order:</strong> (1) OSINT to gather context';
const FB7_TO = '</div>';
const FB7_HTML = `<strong>Correct order:</strong> (1) AI reconnaissance to gather context &rarr; (2) feed the
        data into an LLM prompt &rarr; (3) the LLM generates the personalized email &rarr; (4) the email
        is delivered with a spoofed link and urgency framing &rarr; (5) the target clicks and enters
        credentials. Reconnaissance and phishing are two separate named attack types and this is
        what it looks like when they are chained: the research is what makes the message specific
        enough to be believed. The insight in step 2 is that the LLM amplifies the research rather
        than replacing it. Defense intervention points: step 1 (limit what is public about you),
        step 4 (multi-factor authentication, so stolen credentials are not enough on their own),
        step 5 (knowing that urgency is a manipulation signal).
      </div>`;

// ── 9. section 1.4.9, the scenario-to-attack-type table ──────────────────────
//  Same shape, keyed to the six named attack types instead of to a taxonomy the
//  exam does not use, and with the defense column leading on the four named
//  controls. Data poisoning and AI reconnaissance get rows here for the first
//  time; both are named attack types and neither appeared in either cue table.
const SCEN_FROM = '<table class="vocab-table" style="margin-top:16px!important;">';
const SCEN_TO = '</table>';
const SCEN_HTML = `<table class="vocab-table" style="margin-top:16px!important;">
    <thead>
      <tr>
<th>Scenario Signal</th>
<th>Attack Type</th>
<th>Defense That Answers It</th>
</tr>
    </thead>
    <tbody>
      <tr>
        <td>Grammatically perfect email, references personal details, impersonates a known contact</td>
        <td>AI phishing, usually built on AI reconnaissance</td>
        <td>Multi-factor authentication; verify the request through a channel you chose</td>
      </tr>
      <tr>
        <td>Phone call from an executive requesting urgent action, voice sounds authentic</td>
        <td>AI deepfake</td>
        <td>A shared secret agreed in advance; multi-factor authentication</td>
      </tr>
      <tr>
        <td>Video call with an executive who appears and sounds real, large transfer requested</td>
        <td>AI deepfake. Same attack type as the phone call above: the channel does not change it</td>
        <td>A shared secret agreed in advance; a second approver for large transfers</td>
      </tr>
      <tr>
        <td>AI assistant performs an unexpected action after processing user-supplied content</td>
        <td>Prompt injection</td>
        <td>Do not give an AI tool access to data it does not need; keep a human in the loop before it acts</td>
      </tr>
      <tr>
        <td>An AI tool confidently states something false, and the falsehood traces back to content an adversary published</td>
        <td>Data poisoning</td>
        <td>Verify AI output against a reputable, stable, non-AI source before acting</td>
      </tr>
      <tr>
        <td>Attacker knew the target&rsquo;s manager, current project and travel dates before making contact</td>
        <td>AI reconnaissance</td>
        <td>Limit what is publicly posted; treat unsolicited specificity as a warning sign, not as proof</td>
      </tr>
      <tr>
        <td>Malware evades antivirus, no two copies have matching signatures</td>
        <td>AI malware</td>
        <td>Detection based on what a program does rather than what its code looks like</td>
      </tr>
      <tr>
        <td>A chatbot repeats back private information someone pasted into it earlier</td>
        <td>Prompt injection used to extract training or session data</td>
        <td>Do not enter personal or sensitive data into AI tools in the first place</td>
      </tr>
    </tbody>
  </table>`;

// ── 10. cfu-10, the end-of-lesson item ───────────────────────────────────────
//  Key B still B. The credited answer named two legacy terms; it now names the
//  CED's attack types. Distractor D is rewritten: it labelled the email
//  "deepfake BEC" and the feedback rejected it because "no video was involved",
//  which contradicts this page's own Common Mistakes row saying deepfakes are
//  not video-only. A distractor has to be wrong for a reason that survives
//  being read twice.
const O10B_FROM = 'The three attacks are AI-enhanced spear phishing, voice cloning vishing, and prompt injection.';
const O10B_TO = '</span></label>';
const O10B_HTML = `The three attacks are AI phishing built on AI reconnaissance, an AI deepfake of the CFO&rsquo;s voice, and prompt injection. All three existing controls fail because they look for signals that AI removes: spam patterns, grammar errors, and caller ID. The defenses that answer them are a shared secret agreed in advance, multi-factor authentication on the transfer approval, and not letting the document system act on what it reads without a human.</span></label>`;

const O10D_FROM = 'The three attacks are deepfake BEC, vishing, and malware injection.';
const O10D_TO = '</span></label>';
const O10D_HTML = `The three attacks are data poisoning, AI reconnaissance, and AI malware. The controls failed because the bank had not deployed an AI content detection tool, which would have identified all three before they succeeded.</span></label>`;

const FB10_FROM = '<strong>B is correct.</strong> Three distinct AI-driven techniques are present:';
const FB10_TO = '</div>';
const FB10_HTML = `<strong>B is correct.</strong> Three distinct AI-driven techniques are present:
(1) AI phishing standing on AI reconnaissance, since the email quotes a confidential merger the
attacker had to research first; (2) an AI deepfake, because voice or image samples of the CFO
were used to build a digital avatar that impersonated them on a phone call; (3) prompt injection,
because hidden instructions inside a processed document made the AI system export data. The
CISO&rsquo;s controls fail specifically because spam filters rely on known malicious patterns and a
contextually perfect targeted email matches none of them; grammar checking is irrelevant because
an LLM writes cleanly; and caller ID says nothing about whose voice is on the line. The defenses
that answer these three: a shared secret agreed with the CEO in advance, multi-factor
authentication on wire approvals, and refusing the document system permission to send data
without a human approving it. Slash the trash: A calls all three credential stuffing, which is a
password attack and describes none of what happened. C misidentifies the document exfiltration as
SQL injection; the system being exploited is an AI model, not a database. D names three real
attack types that are simply not the ones in this scenario, and then proposes AI content
detection as the fix, which is the one defense this topic tells you not to rely on.</div>`;

// ── 11. section 1.4.7, the defenses a student actually reads ─────────────────
//  The six subsections that were here are all real controls and they stay, one
//  block lower, under a heading that says what they are. What goes in front of
//  them is the four defenses the topic names, which previously appeared nowhere
//  in this section.
const DEF_FROM = '<p>Understanding why traditional defenses fail is as important as knowing the correct ones. Each AI-driven attack specifically defeats a control that previously worked.</p>';
const DEF_HTML = `<p>Understanding why traditional defenses fail is as important as knowing the correct ones.
  Each AI-driven attack specifically defeats a control that previously worked.</p>

  <p>Four defenses do most of the work against the attacks in this topic. Learn these four first;
  everything after them is what organizations layer on top.</p>

  <h4>Agree on a Shared Secret in Advance</h4>
  <p>Pick a word or a phrase with the people who might one day call you with an urgent request:
  family, a manager, a finance team. When a high-stakes request arrives, ask for it. A cloned
  voice can reproduce how someone sounds; it cannot reproduce something it was never told. The
  catch, and the reason this shows up as a wrong answer as often as a right one, is that the
  secret has to exist <em>before</em> the suspicious call. You cannot invent one during it.</p>

  <h4>Turn On Multi-Factor Authentication</h4>
  <p>A second factor breaks the chain even when the first one is compromised. If an attacker
  clones a voice to authorize something, or phishes a password out of an inbox, the second factor
  is still missing. This is the defense that makes stolen credentials insufficient on their own.</p>

  <h4>Keep Personal and Sensitive Data Out of AI Tools</h4>
  <p>Some AI tools feed what users type into future training. Anything pasted in, a customer
  record, an unreleased document, a password, may become something an adversary can later pull
  back out by asking the right question. The defense is upstream of any detection: do not put it
  in.</p>

  <h4>Verify AI Output Against a Non-AI Source</h4>
  <p>An AI tool states a poisoned answer with exactly the same confidence as a correct one, so
  confidence tells you nothing. Before acting on something an AI told you, check it against a
  reputable, stable source that is not itself AI-generated. This is the control that catches data
  poisoning, which is otherwise invisible to the person being deceived.</p>

  <h3>Controls Organizations Layer On Top</h3>
  <p>The four above are what an individual can do. Organizations add process and architecture to
  them. These are good practice and they appear in real incident write-ups, including the ones on
  this page.</p>`;

// ── 12. 1.4.5 gains the word the CED uses ────────────────────────────────────
const D5_FROM = 'Deepfakes extend AI-driven deception beyond text.';
const D5_HTML = 'Deepfakes extend AI-driven deception beyond text. The mechanism has a name worth holding onto: an attacker collects voice or image samples of a real person and uses them to build a <strong>digital avatar</strong>, a synthetic stand-in that can be driven in real time. Whether that avatar arrives as a phone call or as a face on a video call is a detail of delivery, not a different attack.';

//  ── SOURCE IS ASCII, OUTPUT MATCHES WHAT THE PAGE ALREADY USES ──────────────
//  Shopify decodes HTML entities when it saves a page body, so the live bytes
//  carry a literal apostrophe where the sheet sent &rsquo;. Source here stays
//  ASCII per house rules and lit() converts BOTH anchors and replacement HTML to
//  the live form. Doing it to the replacements too is not cosmetic: it keeps new
//  copy byte-identical in style to the copy beside it, so a post-import byte
//  comparison stays meaningful instead of drowning in entity-versus-character
//  noise.
const LITERAL = {
  '&rsquo;': '\u2019', '&lsquo;': '\u2018', '&rdquo;': '\u201d', '&ldquo;': '\u201c',
  '&mdash;': '\u2014', '&ndash;': '\u2013', '&rarr;': '\u2192', '&hellip;': '\u2026',
  '&#9998;': '\u270e',
};
//  &amp; is deliberately NOT in this map: Shopify keeps a real escaped
//  ampersand as &amp; in the stored source, so decoding it here would make the
//  anchor miss.
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|#9998);/g,
  (m) => LITERAL[m]);

// ── 13. the FAQ was a third exam-cue table in prose form ─────────────────────
//  Found only by auditing WHERE each surviving legacy term sits rather than
//  counting them. This answer is a classification mapping with the same job as
//  the two tables above, and it contradicted what the rebuilt cfu-3 feedback
//  now tells students about phone calls being deepfakes. Two copies of it
//  existed, the visible one and its JSON-LD mirror, and both are rewritten so
//  a reader and a search engine get the same claim.
const FAQCLS_FROM = 'Key classification signals: grammatically perfect email referencing personal details';
const FAQCLS_TO = '</p>';
const FAQCLS_HTML = `Key classification signals: a grammatically perfect email that references personal
      details is AI phishing, and the details usually got there through AI reconnaissance. A
      convincing phone call or video call from an executive is an AI deepfake, whichever channel
      it arrives on. An AI assistant that performs an unexpected action after processing content
      is prompt injection. An AI tool confidently repeating a falsehood an adversary planted is
      data poisoning. Malware that evades antivirus by rewriting its own code is AI malware. For
      defense questions the strongest answers are the ones that do not depend on detecting the
      attack: a shared secret agreed in advance, multi-factor authentication, keeping sensitive
      data out of AI tools, and verifying AI output against a reputable non-AI source.</p>`;

const LDCLS_FROM = 'Key signals: if the attack involves synthetic media, it is a deepfake.';
const LDCLS_TO = '"';
const LDCLS_HTML = `Key signals: if the attack involves synthetic media, it is a deepfake. A realistic phone call or video call impersonating someone is the same deepfake attack type; the channel does not change it. A phishing email with no grammar errors that references personal details is AI phishing, usually built on AI reconnaissance. An AI tool repeating a planted falsehood is data poisoning, and an AI assistant acting on hidden instructions is prompt injection."`;

// ── 14. worked example 1 predicted a legacy label ────────────────────────────
//  A worked example is the page modelling the right answer, so the label it
//  predicts is presented as the exam's answer by construction.
const WEX_FROM = 'Prediction: <strong>AI-enhanced spear phishing</strong> with domain spoofing.';
const WEX_HTML = 'Prediction: <strong>AI phishing</strong> built on AI reconnaissance, delivered with domain spoofing.';

// ── 15. the FAQ answer the new gate caught on its first run ──────────────────
//  "On the AP exam: if the scenario involves a video call, classify it as a
//  deepfake. If it involves a phone call, classify it as voice cloning (or
//  vishing)." Splitting one attack type in two by delivery channel is the exact
//  error this whole pass exists to remove, and it was written as the answer to
//  a question a student clicks on purpose. The distinction between the words is
//  still explained, because it is real; what goes is the instruction to sort
//  exam scenarios by it.
const FAQVC_FROM = 'On the AP exam: if the scenario involves a video call or synthetic video, classify it as a deepfake.';
const FAQVC_TO = '</p>';
const FAQVC_HTML = `In everyday use the two words divide the same idea by medium, and you will
      see both. For classification they are one attack type: an adversary uses voice or image
      samples of a real person to build a digital avatar and impersonates them. A phone call and
      a video call are two deliveries of that, not two different attacks, and the defense is the
      same either way: a secret you agreed on with the real person in advance, and a second
      factor they cannot produce.</p>`;

// ── 16. a maintainer signpost that would undo this ───────────────────────────
//  Not student-visible, so it is not the defect. It is worth a line anyway: the
//  next person editing this file reads the comment above the block before they
//  read the block, and a comment still calling cfu-7 a spear phishing kill
//  chain is an instruction to put the label back.
const CMT7_FROM = '<!-- CFU 7 - Sequencing: AI Spear Phishing Kill Chain -->';
const CMT7_HTML = '<!-- CFU 7 - Sequencing: AI reconnaissance into AI phishing, the chained kill chain -->';

// ── claims about what the exam does ──────────────────────────────────────────
//  Found by the proximity gate built for 1.2, run across every Unit 1 page.
//  This module predates that gate. In every case the teaching point is correct
//  and stays; what goes is the assertion about what an exam contains. "Always
//  involve THREE elements" and "the answer is never X" are the same habit that
//  filled 1.2.9 with invented question patterns, and a student who believes
//  them and then meets a question shaped differently is worse off than one who
//  was told nothing.

const T1_FROM = '<span class="exam-tip-label">AP Exam Tip &mdash; Attack vs. Defense Pairing</span>'
const T1_HTML = '<span class="exam-tip-label">Pair an attack with the defense that answers it</span>'

const T2_FROM = '<span class="exam-tip-label">AP Exam Tip &mdash; Why Grammar Checks Now Fail</span>\n    <p>Exam questions may describe a phishing email with no detectable errors and ask what defense is <strong>MOST</strong> effective. The answer is <strong>never</strong> "improved grammar checking" or "better writing quality filters." Process controls &mdash; verify the request through a separate channel, require dual approval &mdash; are the correct answers.</p>'
const T2_HTML = '<span class="exam-tip-label">Why grammar checks now fail</span>\n    <p>A phishing message with no detectable errors defeats every control that works by inspecting the writing, because there is nothing left to detect. What still works does not look at the message at all: verify the request through a separate channel, and require a second person to approve.</p>'

const T3_FROM = '<span class="exam-tip-label">AP Exam Tip &mdash; Prompt Injection = AI&rsquo;s SQL Injection</span>\n    <p>If an exam question describes an AI system that performs an unexpected action after processing user-supplied content, the answer is prompt injection. The key characteristics:'
const T3_HTML = '<span class="exam-tip-label">Prompt injection is SQL injection\u0027s shape, one layer up</span>\n    <p>When an AI system performs an unexpected action after processing content someone else supplied, this is what happened. Three things make it possible:'

const SPLICES = [
  { name: 'bellringer CED reference', from: BELL_FROM, html: BELL_HTML },
  { name: '1.4.3 vocabulary table', from: VOCAB_FROM, to: VOCAB_TO, html: VOCAB_HTML },
  { name: '1.4.3 exam tip', from: TIP_FROM, to: TIP_TO, html: TIP_HTML },
  { name: 'cfu-3 term 1', from: M3_1_FROM, html: M3_1_HTML },
  { name: 'cfu-3 term 5', from: M3_5_FROM, html: M3_5_HTML },
  { name: 'cfu-3 feedback', from: FB3_FROM, to: FB3_TO, html: FB3_HTML },
  { name: 'cfu-4 feedback', from: FB4_FROM, html: FB4_HTML },
  { name: 'cfu-5 question', from: Q5_FROM, html: Q5_HTML },
  { name: 'cfu-5 predict', from: P5_FROM, html: P5_HTML },
  { name: 'cfu-5 word bank', from: BANK5_FROM, to: BANK5_TO, html: BANK5_HTML },
  { name: 'cfu-5 diagram', from: DIAG5_FROM, to: DIAG5_TO, html: DIAG5_HTML },
  { name: 'cfu-5 feedback', from: FB5_FROM, to: FB5_TO, html: FB5_HTML },
  { name: 'cfu-6 option A', from: O6A_FROM, html: O6A_HTML },
  { name: 'cfu-6 feedback', from: FB6_FROM, html: FB6_HTML },
  { name: 'cfu-7 block comment', from: CMT7_FROM, html: CMT7_HTML },
  { name: 'cfu-7 predict', from: P7_FROM, html: P7_HTML },
  { name: 'cfu-7 question', from: Q7_FROM, html: Q7_HTML },
  { name: 'cfu-7 step C', from: S7C_FROM, html: S7C_HTML },
  { name: 'cfu-7 step E', from: S7E_FROM, html: S7E_HTML },
  { name: 'cfu-7 feedback', from: FB7_FROM, to: FB7_TO, html: FB7_HTML },
  { name: '1.4.9 scenario table', from: SCEN_FROM, to: SCEN_TO, html: SCEN_HTML },
  { name: 'cfu-10 option B', from: O10B_FROM, to: O10B_TO, html: O10B_HTML },
  { name: 'cfu-10 option D', from: O10D_FROM, to: O10D_TO, html: O10D_HTML },
  { name: 'cfu-10 feedback', from: FB10_FROM, to: FB10_TO, html: FB10_HTML },
  { name: '1.4.7 named defenses', from: DEF_FROM, html: DEF_HTML },
  { name: '1.4.5 digital avatar', from: D5_FROM, html: D5_HTML },
  { name: 'FAQ classification answer', from: FAQCLS_FROM, to: FAQCLS_TO, html: FAQCLS_HTML },
  { name: 'FAQ deepfake vs voice cloning', from: FAQVC_FROM, to: FAQVC_TO, html: FAQVC_HTML },
  { name: 'JSON-LD classification mirror', from: LDCLS_FROM, to: LDCLS_TO, html: LDCLS_HTML },
  { name: 'worked example 1 prediction', from: WEX_FROM, html: WEX_HTML },
  { name: 'exam tip label: attack vs defense', from: T1_FROM, html: T1_HTML },
  { name: 'exam tip: grammar checks', from: T2_FROM, html: T2_HTML },
  { name: 'exam tip: prompt injection', from: T3_FROM, html: T3_HTML },
];

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
    const start = indexOfUnique(body, lit(s.from), s.name);
    let end;
    if (s.to === undefined) {
      end = start + lit(s.from).length;
    } else {
      const at = body.indexOf(lit(s.to), start + lit(s.from).length);
      if (at < 0) throw new Error(`${s.name}: end anchor not found after start anchor`);
      end = s.toExclusive ? at : at + lit(s.to).length;
    }
    const html = lit(typeof s.html === 'function' ? s.html(body) : s.html);
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

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices };
