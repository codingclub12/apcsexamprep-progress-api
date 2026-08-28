'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.4 EXERCISE 1: THE CED REALIGNMENT SPLICE TABLE
//
//  ── HOW THIS DIFFERS FROM THE LESSON PAGE ───────────────────────────────────
//  On the 1.4 lesson the legacy taxonomy sat in cue tables: surfaces that TELL a
//  student what the exam wants. Here it is the credited answer itself, encoded
//  in the scoring JavaScript:
//
//    if(a1t==='personalized'){pts++; ... Correct. AI-personalized spear phishing
//    if(a1p==='authority'){pts++;    ... Correct. Impersonating Dr. Martinez
//                                        exploits authority.
//
//  Part 1 is a 12-point graded classification. For Incident A the credited
//  technique is "AI-personalized spear phishing", which the CED does not
//  contain, and the credited tactic is "Authority", which is Unit 2 content
//  (2.1.A.3) keyed as the answer inside a Unit 1 exercise.
//
//  Worse than either: of the four technique options offered for Incident A,
//  exactly one names a CED attack type and it is not the credited one. Measured
//  against the CED, Incident A is AI phishing standing on AI reconnaissance.
//  Neither is on the list. The item has no correct answer available.
//
//  ── THE RULE THIS FOLLOWS ───────────────────────────────────────────────────
//  Same standard as everywhere else in Unit 1: no off-CED term presented as
//  exam-required. A legacy name in a DISTRACTOR is not the defect, and several
//  stay. A legacy name in the credited answer is.
//
//  ── OPTION VALUES ARE LEFT ALONE WHEREVER POSSIBLE ──────────────────────────
//  The <option value="..."> tokens are internal: the student never sees them,
//  and every one is compared by string against the scoring code. So the display
//  text is rewritten and the token is not. `value="personalized"` now reads "AI
//  phishing built on AI reconnaissance" and still grades through the untouched
//  `a1t==='personalized'`. Cosmetically odd, provably safe.
//
//  TWO SELECTS DO CHANGE THEIR KEY, AND BOTH ARE DELIBERATE:
//
//    p1a-tactic -> p1a-defense
//      Topic 1.4 does not assess psychological tactics at all; that vocabulary
//      belongs to 1.1 and 2.1. Rather than delete the second dropdown and lose
//      a point, it asks what 1.4 does assess: which defense answers the attack.
//      The id, the options, the scoring branch and the feedback move together.
//
//    p3b-control credited answer -> a pre-arranged shared secret
//      It credited out-of-band verification, which is sound security and is not
//      the named control. Out-of-band stays as a strong distractor. This matches
//      the same call made on the lesson page's cfu-5, and matching matters: a
//      student who meets both should not be graded two different ways.
//
//  Everything else graded is byte-identical, and the gate asserts it.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy, no EK
//  codes in student-visible text.
//
//    node scripts/cyber-u1-l4-ex1-ced-csv.js out/l4ex1.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cyber-unit-1-lesson-4-exercise-1';
const PAGE_ID = '132673732823';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 4 Exercise 1';

//  Repeated verbatim on every select in the page. Retyping it by hand is how a
//  dropdown ends up styled differently from the three beside it.
const SEL = "style=\"width:100%;padding:10px 12px;border:1.5px solid #ddd6fe;border-radius:8px;font-size:0.9rem;font-family:'Georgia',serif;color:#1e1b4b;background:#fff;margin-top:6px;\"";
const LABEL = "style=\"font-size:0.9rem;font-weight:700;color:#1e1b4b;-webkit-text-fill-color:#1e1b4b;margin:16px 0 4px;font-family:'Georgia',serif;\"";

// ── Incident A, technique ────────────────────────────────────────────────────
//  Values untouched. The credited one becomes nameable, and the three
//  distractors become the other CED attack types instead of a legacy list.
const A_TECH_FROM = '<option value="personalized">AI-personalized spear phishing (scraped personal details to craft targeted message)</option>\n<option value="deepfake">Deepfake audio/video impersonation</option>\n<option value="voiceClone">AI voice cloning phone call</option>\n<option value="malware">AI-generated polymorphic malware</option>';
const A_TECH_HTML = '<option value="personalized">AI phishing built on AI reconnaissance (an LLM wrote the message using details gathered about the target)</option>\n<option value="deepfake">AI deepfake impersonation on a phone or video call</option>\n<option value="voiceClone">Prompt injection against an AI assistant</option>\n<option value="malware">AI malware that rewrites its own code</option>';

// ── Incident A, second dropdown: tactic becomes defense ──────────────────────
//  The question changes, so the label above it changes with it.
const A_TACTIC_LABEL_FROM = `<p ${LABEL}>Psychological tactic:</p>`;
const A_TACTIC_LABEL_HTML = `<p ${LABEL}>Which defense would have stopped this?</p>`;

const A_TACTIC_FROM = `<select id="p1a-tactic" ${SEL}>
<option value="">-- Select --</option>
<option value="authority">Authority (impersonating a trusted figure in power)</option>
<option value="urgency">Urgency (time pressure to act before thinking)</option>
<option value="scarcity">Scarcity (limited resource creating pressure)</option>
<option value="intimidation">Intimidation (threat of negative consequences)</option>
</select>`;
const A_TACTIC_HTML = `<select id="p1a-defense" ${SEL}>
<option value="">-- Select --</option>
<option value="secret">Ask for a secret phrase Sarah and Dr. Martinez agreed on in advance, before any of this happened</option>
<option value="grammar">Check the email carefully for spelling and grammar mistakes</option>
<option value="reply">Reply to the email and ask Dr. Martinez to confirm the request</option>
<option value="antivirus">Install antivirus software that scans incoming mail</option>
</select>`;

// ── Incident B, technique ────────────────────────────────────────────────────
//  The credited value stays voiceClone. Its label now names the attack type and
//  keeps voice cloning as the alias, which is what the rebuilt lesson page says.
const B_TECH_FROM = '<option value="voiceClone">AI voice cloning (harvested audio samples to synthesize a familiar voice)</option>\n<option value="personalized">AI-personalized spear phishing email</option>\n<option value="deepfake">Deepfake video call impersonation</option>\n<option value="malware">AI-generated malware for audio recording</option>';
const B_TECH_HTML = '<option value="voiceClone">AI deepfake, the kind people call voice cloning: audio samples of a real person build a digital avatar that speaks in their voice</option>\n<option value="personalized">AI phishing, an LLM-written email</option>\n<option value="deepfake">Data poisoning of an AI assistant Carlos uses</option>\n<option value="malware">AI malware recording audio from his phone</option>';

// ── Incident C, technique ────────────────────────────────────────────────────
//  "AI-assisted filter evasion" is not a CED name. What the scenario describes
//  is AI phishing: an LLM rewriting messages so the cues a filter looks for are
//  gone. The value stays evasion.
const C_TECH_FROM = '<option value="evasion">AI-assisted filter evasion (automated rewriting to avoid detection signatures)</option>\n<option value="clone">AI voice cloning to personalize each email</option>\n<option value="phishing">Standard mass phishing with no AI</option>\n<option value="recon">AI reconnaissance to find email addresses</option>';
const C_TECH_HTML = '<option value="evasion">AI phishing: an LLM rewrote every message so the patterns the filter matches on were not there</option>\n<option value="clone">AI deepfake audio attached to each email</option>\n<option value="phishing">Ordinary mass phishing with no AI involved</option>\n<option value="recon">AI reconnaissance alone, with no message generation</option>';

// ── Part 3 Scenario 2: the credited control ──────────────────────────────────
const P3B_FROM = `<option value="outofband">Out-of-band verification: call the person back on a known number from your contact list (NOT a number provided in the message). Works because the attacker cloned the voice but cannot intercept a call to the real person's actual phone.</option>
<option value="antivirus">Install antivirus software to detect cloned audio files</option>
<option value="avoid">Never take phone calls from family members</option>
<option value="training">Train employees to recognize voice quality artifacts in cloned audio</option>`;
const P3B_HTML = `<option value="secret">A secret word or phrase agreed with the person in advance, asked for when the call comes. It works because the attacker can copy how someone sounds but cannot know something they were never told, and it cannot be created during the suspicious call.</option>
<option value="outofband">Hang up and call back on a number from your own contact list, never one given in the message. This is genuinely good practice and works for the same reason, but it is not the control this topic names.</option>
<option value="training">Train people to hear the artifacts in cloned audio</option>
<option value="antivirus">Install antivirus software that detects cloned audio files</option>`;

// ── the scoring branches ─────────────────────────────────────────────────────
//  Every string here is inside a <script>. The gate compiles it before shipping,
//  because a splice landing one character wrong inside a JS string literal makes
//  perfectly valid HTML that renders a dead exercise.
const JS_A_FROM = `var a1t=document.getElementById('p1a-technique').value,a1p=document.getElementById('p1a-tactic').value;
      if(a1t==='personalized'){pts++;details.push('<strong>A technique:</strong> +1 &mdash; Correct. AI-personalized spear phishing used OSINT to craft a convincing targeted message.');}
      else details.push('<strong>A technique:</strong> 0 &mdash; AI-personalized spear phishing: AI scraped details (patient case, role, invoice) to personalize the attack.');
      if(a1p==='authority'){pts++;details.push('<strong>A tactic:</strong> +1 &mdash; Correct. Impersonating Dr. Martinez exploits authority.');}
      else details.push('<strong>A tactic:</strong> 0 &mdash; Authority: the attacker impersonated the clinic owner to trigger automatic compliance.');`;
const JS_A_HTML = `var a1t=document.getElementById('p1a-technique').value,a1p=document.getElementById('p1a-defense').value;
      if(a1t==='personalized'){pts++;details.push('<strong>A technique:</strong> +1 &mdash; Correct. AI phishing, and the specifics that made it believable came from AI reconnaissance: the patient case, the role, the pending invoice were all gathered first.');}
      else details.push('<strong>A technique:</strong> 0 &mdash; AI phishing built on AI reconnaissance. The research step is what let an LLM write something Sarah had no reason to doubt.');
      if(a1p==='secret'){pts++;details.push('<strong>A defense:</strong> +1 &mdash; Correct. A secret agreed in advance is the one thing an attacker who scraped everything public still does not have.');}
      else details.push('<strong>A defense:</strong> 0 &mdash; A secret phrase agreed in advance. Grammar checks fail because an LLM writes cleanly, and replying to the email just asks the attacker whether the attacker is real.');`;

//  Both branches move together. The wrong-answer branch states the answer just
//  as the right one does, so leaving it saying "voice cloning" while the correct
//  branch says "AI deepfake" would name the same thing two ways depending on
//  whether the student got it right.
const JS_B_FROM = `if(b1t==='voiceClone'){pts++;details.push('<strong>B technique:</strong> +1 &mdash; Correct. Voice cloning synthesizes a familiar voice from audio samples.');}
      else details.push('<strong>B technique:</strong> 0 &mdash; AI voice cloning harvested voice samples from social media to impersonate Carlos\\'s father.');`;
const JS_B_HTML = `if(b1t==='voiceClone'){pts++;details.push('<strong>B technique:</strong> +1 &mdash; Correct. An AI deepfake. Voice samples of a real person build a digital avatar that speaks as them, and arriving by phone rather than video does not make it a different attack.');}
      else details.push('<strong>B technique:</strong> 0 &mdash; An AI deepfake, the kind people call voice cloning. Samples of the father\\'s voice from social media built a digital avatar of him.');`;

const JS_C_FROM = `if(c1t==='evasion'){pts++;details.push('<strong>C technique:</strong> +1 &mdash; Correct. AI automatically rewrote emails to avoid filter signatures.');}
      else details.push('<strong>C technique:</strong> 0 &mdash; AI-assisted filter evasion: the tool rewrote emails automatically to avoid detection patterns.');`;
const JS_C_HTML = `if(c1t==='evasion'){pts++;details.push('<strong>C technique:</strong> +1 &mdash; Correct. AI phishing. An LLM rewrote each message so the patterns the filter matches on were simply not present.');}
      else details.push('<strong>C technique:</strong> 0 &mdash; AI phishing. The filter looks for patterns it has seen before, and an LLM writes something it has not.');`;

const JS_P3B_FROM = `if(c2==='outofband'){c1Pts++;details.push('<strong>Voice cloning defense:</strong> +1 &mdash; Correct. Out-of-band verification defeats voice cloning because the attacker cloned the voice but cannot intercept a separate call.');}
      else details.push('<strong>Voice cloning defense:</strong> 0 &mdash; Out-of-band verification: call back on a known number. The attacker cloned the voice but cannot take over the real person\\'s phone line.');`;
const JS_P3B_HTML = `if(c2==='secret'){c1Pts++;details.push('<strong>Voice cloning defense:</strong> +1 &mdash; Correct. A secret agreed in advance. The attacker can reproduce how someone sounds and cannot reproduce something they were never told, and it cannot be arranged during the call itself.');}
      else details.push('<strong>Voice cloning defense:</strong> 0 &mdash; A secret phrase agreed with the person beforehand. Calling back on a number you looked up yourself works for the same reason and is worth doing, but the control named for this is the pre-arranged secret.');`;

//  The results banner named the control by its old name.
const MSG_FROM = 'Review the technique classifications and the out-of-band verification control &mdash; both appear frequently on the AP exam.';
const MSG_HTML = 'Review the attack type classifications and the four named defenses. Both come up constantly.';

// ── the claim about what the exam does ───────────────────────────────────────
//  Found by the proximity gate built for 1.2, run across every Unit 1 page.
//  The teaching point is correct and stays; the assertion about what an exam
//  contains goes. A student who is told the exam "always" does something, and
//  then meets a question shaped differently, is worse off than one told nothing.
const EXC1_FROM = 'Classify AI-based attack techniques, analyze a phishing email log for adversarial patterns, and recommend defenses. The three skills tested most on the AP exam for Topic 1.4.';
const EXC1_HTML = 'Classify AI-based attack techniques, analyze a phishing email log for adversarial patterns, and recommend defenses. Three skills, one after the other.';

const EXC2_FROM = '&#9998; AP Exam Tip';
const EXC2_HTML = '&#9998; How to read one of these';

const EXC3_FROM = 'For any AI-based attack on the AP exam: identify (1) what AI capability was used to make the attack more effective, (2) what defense would have stopped it, and (3) whether human oversight was part of the solution.';
const EXC3_HTML = 'For any AI-based attack, work three questions in order: what AI capability made the attack more effective than the old version, what defense would have stopped it, and whether a person had to be in the loop for that defense to work.';

const SPLICES = [
  { name: 'incident A technique options', from: A_TECH_FROM, html: A_TECH_HTML },
  { name: 'incident A second label', from: A_TACTIC_LABEL_FROM, html: A_TACTIC_LABEL_HTML },
  { name: 'incident A tactic becomes defense', from: A_TACTIC_FROM, html: A_TACTIC_HTML },
  { name: 'incident B technique options', from: B_TECH_FROM, html: B_TECH_HTML },
  { name: 'incident C technique options', from: C_TECH_FROM, html: C_TECH_HTML },
  { name: 'part 3 scenario 2 options', from: P3B_FROM, html: P3B_HTML },
  { name: 'scoring: incident A', from: JS_A_FROM, html: JS_A_HTML },
  { name: 'scoring: incident B technique', from: JS_B_FROM, html: JS_B_HTML },
  { name: 'scoring: incident C technique', from: JS_C_FROM, html: JS_C_HTML },
  { name: 'scoring: part 3 scenario 2 key', from: JS_P3B_FROM, html: JS_P3B_HTML },
  { name: 'results banner', from: MSG_FROM, html: MSG_HTML },
  { name: 'exercise subtitle exam claim', from: EXC1_FROM, html: EXC1_HTML },
  { name: 'exam tip block', from: EXC2_FROM, html: EXC2_HTML },
  { name: 'exam tip body', from: EXC3_FROM, html: EXC3_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  Source stays ASCII and lit() converts at match time, for replacements too so
//  new copy is styled like the copy beside it. &amp; is deliberately absent: a
//  real escaped ampersand stays &amp; in the stored source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
  //  The pencil that labels every tip box on these pages. Absent from this map
  //  the anchor never matched, and the build said "anchor not found" about a
  //  string that is plainly on the page.
  '&#9998;': '✎',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|#9998);/g, (m) => LITERAL[m]);

function indexOfUnique(body, anchor, label) {
  const first = body.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 80))}`);
  if (body.indexOf(anchor, first + 1) >= 0) {
    throw new Error(`${label}: anchor is ambiguous, appears more than once: ${JSON.stringify(anchor.slice(0, 80))}`);
  }
  return first;
}

function applySplices(body) {
  const resolved = SPLICES.map((s) => {
    const from = lit(s.from);
    const start = indexOfUnique(body, from, s.name);
    return { name: s.name, start, end: start + from.length, html: lit(s.html), removed: from.length };
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
  return { body: out + body.slice(cursor), resolved };
}

module.exports = { HANDLE, PAGE_ID, TITLE, SPLICES, applySplices };
