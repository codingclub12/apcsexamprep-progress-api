'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBERSECURITY TOPIC 1.2: THE CED REALIGNMENT SPLICE TABLE
//
//  ── HOW THIS DIFFERS FROM 1.4 ───────────────────────────────────────────────
//  On 1.4 the page taught the right things under wrong names. On 1.2 it teaches
//  a different subject and says the exam requires it.
//
//  Topic 1.2 in the CED is seven Essential Knowledge statements and every one is
//  about an ONLINE attack on a live login:
//
//    1.2.A.1  adversaries try common passwords, common patterns, or stolen ones
//    1.2.A.2  three signs: many failed attempts in a short time, a login at an
//             unusual hour, a login from an unknown device
//    1.2.B.1  three common patterns: word(s) + two digits + a special character
//             at the end, pet or family names, personally significant dates
//    1.2.B.2  a targeted dictionary built from personal information gathered
//             about the victim, submitted by an automated tool
//    1.2.C.1  strong passwords are long, random and unique; password managers
//             or passphrases are the recommended route
//    1.2.C.2  avoid names, dates, and personally meaningful words
//    1.2.C.3  enable MFA
//
//  Hashing, salting, rainbow tables, keyspace arithmetic, bcrypt, Argon2 and
//  NIST SP 800-63B appear nowhere in it. Those are offline-cracking topics.
//
//  ── THE PAGE SAYS OTHERWISE, IN WRITING ─────────────────────────────────────
//  Section 1.2.5 opens: "Understanding the mechanism ... is required knowledge
//  for the AP exam." It is not.
//
//  Section 1.2.9, "AP Exam Strategy: Password Attack Questions", is six tips
//  that describe an exam this is not. It names claimed question patterns and
//  supplies their answers:
//
//    "Common AP question patterns: 'Which of the following is NOT protected by
//     account lockout?' (answer: credential stuffing, password spraying,
//     rainbow table attacks)"
//    "Questions that test NIST 800-63B guidance are common because the answers
//     are counterintuitive"
//    "AP exam distractors frequently suggest that salts must be kept secret"
//
//  A student who revises from that section is preparing for a different exam.
//
//  Section 1.2.3's vocabulary table has an "AP Exam Tip" column over eight
//  terms, of which exactly one, dictionary attack, is in the CED. The tips are
//  classification cues: "Key phrase: evades account lockout", "Key condition:
//  attack only works on unsalted hashes".
//
//  And seven of the nine Check for Understanding items are graded on that
//  material.
//
//  ── WHAT THIS DOES NOT DO ───────────────────────────────────────────────────
//  It does not delete the hashing and salting strand. That content is correct,
//  it is good security education, and Tanner's judgement on it was explicit:
//  bcrypt and salting on 1.2 are real enrichment. It keeps its section, its
//  worked arithmetic and its case studies, under a banner that says plainly it
//  is not assessed. What goes is every claim that the exam requires it, and
//  every graded item that makes that claim by grading it.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy, no EK
//  codes in student-visible text.
//
//    node scripts/cyber-u1-topic12-ced-csv.js out/topic12.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-password-attacks';
const PAGE_ID = '132157374679';
const TITLE = 'AP Cybersecurity 1.2: Suspicious Website Logins';

// ── 1. section 1.2.5 stops claiming the exam requires it ─────────────────────
//  The banner is the honest version of what this section is: a mechanism worth
//  understanding that this topic does not assess. Naming that plainly is what
//  lets the content stay.
const S5_FROM = '<span class="section-icon">5</span>1.2.5 &mdash; How Password Hashing Works</h2>\n  <p>Correct password storage is a foundational defense against offline cracking attacks. Understanding the mechanism &mdash; and the specific ways it can fail &mdash; is required knowledge for the AP exam.</p>';
const S5_HTML = `<span class="section-icon">5</span>1.2.5 &mdash; How Password Hashing Works</h2>

  <div class="info-box warning" style="margin-bottom:18px!important;">
    <span class="box-label">Enrichment: not assessed in this topic</span>
    <p>Everything in this section is about what happens to a password <em>after</em>
    it is stolen, and this topic is about attacks on a live login. Hashing,
    salting, rainbow tables and the NIST password guidance are real, they are
    worth understanding, and they are not what you will be asked about here.
    Read it because it explains why the advice in the rest of the page works.
    Do not spend study time memorizing it.</p>
  </div>

  <p>Correct password storage is a foundational defense against offline cracking
  attacks. Understanding the mechanism, and the specific ways it can fail, is
  what makes the difference between a breach that exposes every password and one
  that exposes a file nobody can use.</p>`;

// ── 2. section 1.2.3, the vocabulary table ───────────────────────────────────
//  Rebuilt around the seven Essential Knowledge statements, in their order. The
//  "AP Exam Tip" column, which handed a student a classification cue for terms
//  that cannot be the credited answer, becomes "Where else you will meet it":
//  the industry names live there, named honestly, with no claim on the exam.
const VOCAB_FROM = '1.2.3 &mdash; Essential Vocabulary &amp; Exam Tips</h2>';
const VOCAB_TO = '</table>';
//  The section also opens with a grid headed "8 Core Terms &mdash; Know All of
//  These Cold". Seven of the eight are off-CED. That label is a more direct
//  instruction than anything in the table below it, and it was the third cue
//  surface on this page, found only by counting div tags when the first build
//  came out unbalanced. The grid stays; its contents become the nine things
//  this topic actually turns on.
//
//  The table also sits inside a <div style="overflow-x:auto"> wrapper that
//  closes AFTER </table>, so the replacement has to reopen it or the page ends
//  up one div short. That is what the tag-balance check caught.
const VOCAB_HTML = `1.2.3 &mdash; Essential Vocabulary &amp; Exam Tips</h2>
  <div class="key-terms-box">
    <span class="key-terms-label">9 Core Ideas &mdash; Know All of These Cold</span>
    <dl class="key-terms-grid">
      <div>
<dt>Common password</dt>
<dd>Tried first because it works often</dd>
</div>
      <div>
<dt>Common pattern</dt>
<dd>Word, two digits, a symbol at the end</dd>
</div>
      <div>
<dt>Stolen password</dt>
<dd>Taken elsewhere, works here through reuse</dd>
</div>
      <div>
<dt>Dictionary attack</dt>
<dd>A wordlist built about you, run by a tool</dd>
</div>
      <div>
<dt>Many failed attempts</dt>
<dd>Sign one: a burst in a short window</dd>
</div>
      <div>
<dt>Unusual login time</dt>
<dd>Sign two: right password, wrong hour</dd>
</div>
      <div>
<dt>Unknown device</dt>
<dd>Sign three: a machine not seen before</dd>
</div>
      <div>
<dt>Long, random, unique</dt>
<dd>All three, and unique is the one skipped</dd>
</div>
      <div>
<dt>MFA</dt>
<dd>Proof the password alone cannot supply</dd>
</div>
    </dl>
  </div>

  <p class="vocab-intro" style="font-family:'Georgia',serif!important;font-size:15px!important;color:var(--g700)!important;margin-bottom:14px!important;">
    The left column is what this topic is built on. The right column lists the
    names the security industry uses for closely related ideas. Those names are
    worth knowing and you will meet them in the enrichment sections below, but a
    question here will not ask you to sort an attack into them.
  </p>

  <div style="overflow-x:auto!important;">
  <table class="vocab-table">
    <thead>
      <tr>
<th>Term</th>
<th>What it is</th>
<th>Where else you will meet it</th>
</tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="vocab-term">Online password attack</span></td>
        <td>An adversary submitting guesses to a live login page. Three kinds of guess: passwords that are simply <strong>common</strong>, passwords that follow a predictable <strong>pattern</strong>, and passwords <strong>stolen</strong> from somewhere else and tried here.</td>
        <td>Brute force, when the guessing is exhaustive rather than targeted</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Common password</span></td>
        <td>One that appears near the top of every published list of what people actually choose. An adversary tries these first because they cost nothing and work often. A default password issued at onboarding and never changed is the same thing.</td>
        <td>Password spraying, when one common password is tried across many accounts</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Common pattern</span></td>
        <td>Three shapes worth recognizing in your own passwords: a word or two followed by <strong>two digits and a special character at the end</strong>, a <strong>pet or family name</strong>, and a <strong>date that matters to you</strong>. All three feel personal, and that is exactly why they are guessable.</td>
        <td>Rule-based cracking, mangling rules</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Stolen password</span></td>
        <td>One taken in a breach somewhere else and tried here, which works because people reuse passwords across sites. No guessing is involved: the adversary already knows the password is real, just not where else it opens a door.</td>
        <td>Credential stuffing, breach replay</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Dictionary attack</span></td>
        <td>The adversary builds a wordlist <em>about you</em> from information gathered publicly, your employer, your pets, your town, the year you graduated, then submits it with an automated tool. It is not a generic wordlist. It is targeted, and the targeting is what makes it work.</td>
        <td>OSINT, open-source intelligence, targeted wordlists</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Signs of an attack</span></td>
        <td>Three, and they are worth memorizing as a set: <strong>many failed attempts in a short time</strong>, a login at an <strong>unusual hour</strong>, and a login from a <strong>device that has not been seen before</strong>. Any one of them is a reason to look.</td>
        <td>Anomaly detection, impossible travel, UEBA</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Strong password</span></td>
        <td><strong>Long, random, and unique.</strong> All three, and length does the heaviest lifting. Unique is the one people skip, and it is the one that stops a password stolen elsewhere from working here.</td>
        <td>Entropy, keyspace</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Password manager</span></td>
        <td>The practical way to have passwords that really are long, random and unique, because nobody can remember thirty of those. A passphrase, several unrelated words strung together, is the other recommended route where you have to remember one.</td>
        <td>Vault, credential manager</td>
      </tr>
      <tr>
        <td><span class="vocab-term">Multi-factor authentication (MFA)</span></td>
        <td>Extra proof of identity beyond the password, such as a one-time code. It is what makes a correct password insufficient on its own, which is why it answers every attack in this topic at once.</td>
        <td>2FA, two-step verification, one-time password</td>
      </tr>
    </tbody>
  </table>`;

// ── 3. section 1.2.9, the exam-strategy section ──────────────────────────────
//  Every one of the six tips was written about content this topic does not
//  assess, and three of them stated claimed AP question patterns and gave their
//  answers. Rebuilt around what the topic does assess. The replacement makes no
//  claim about what the exam "frequently" or "commonly" does, because that is
//  the habit that produced the section being replaced.
const S9_FROM = '<div class="exam-tip-item">\n    <span class="tip-badge">Tip 1</span>';
//  The section ends with a box headed "High-Frequency AP Cyber Password Attack
//  Patterns" that tells a student what to EXPECT on the exam, in five numbered
//  patterns. Four of the five are off-CED: password spraying, rainbow tables,
//  credential stuffing, bcrypt versus MD5, and NIST rotation policy. It is the
//  same defect as the tips, in a labelled callout, so it goes with them.
const S9_TO = '<!-- CFU 9 -->';
const S9_TOEXCL = true;
const S9_HTML = `<div class="exam-tip-item">
    <span class="tip-badge">Tip 1</span>
    <div class="tip-text">
      <h4>Ask what the adversary is guessing with</h4>
      <p>Every attack in this topic is someone submitting guesses to a live login,
      and there are only three kinds of guess. A password that is simply
      <strong>common</strong>, including a default nobody changed. A password that
      follows a predictable <strong>pattern</strong>. A password <strong>stolen</strong>
      from another site and tried here. Work out which one the scenario describes
      before you look at the answers, because that alone usually settles it.</p>
    </div>
  </div>

  <div class="exam-tip-item">
    <span class="tip-badge">Tip 2</span>
    <div class="tip-text">
      <h4>Know the three signs as a set, not a list</h4>
      <p>Many failed attempts in a short time. A login at an unusual hour. A login
      from a device not seen before. Scenarios tend to hand you one or two of the
      three and expect you to name what is suspicious. The one people forget is
      the unusual hour, because it is the only one that can look completely
      ordinary in isolation: a single successful login, right password, first
      try, at three in the morning.</p>
    </div>
  </div>

  <div class="exam-tip-item">
    <span class="tip-badge">Tip 3</span>
    <div class="tip-text">
      <h4>A dictionary attack is targeted, and that is the whole point</h4>
      <p>The word "dictionary" makes it sound like a generic wordlist. It is the
      opposite. The adversary gathers information about a specific person and
      builds a list from it, then runs that list with an automated tool. If a
      scenario mentions anything the adversary looked up about the victim, their
      employer, their dog, their old school, their wedding year, that research
      step is the thing being tested.</p>
    </div>
  </div>

  <div class="exam-tip-item">
    <span class="tip-badge">Tip 4</span>
    <div class="tip-text">
      <h4>Long, random, unique: three words, three separate jobs</h4>
      <p><strong>Long</strong> is what makes guessing impractical. <strong>Random</strong>
      is what stops a pattern from narrowing the search. <strong>Unique</strong> is
      what stops a password stolen from another site working here, and it is the
      one people leave out. An answer that fixes only one of the three is usually
      the distractor. And note what the advice is not: it is not "add a symbol and
      a number", which produces exactly the pattern this topic warns about.</p>
    </div>
  </div>

  <div class="exam-tip-item">
    <span class="tip-badge">Tip 5</span>
    <div class="tip-text">
      <h4>MFA answers a question the password cannot</h4>
      <p>Every attack here ends the same way: the adversary submits a password
      that is correct. Advice about choosing better passwords does not help once
      that has happened, and neither does anything that inspects the password.
      MFA is the control that asks for something the password alone cannot supply.
      When a scenario says the attacker had the right password, look for it.</p>
    </div>
  </div>

  <div class="exam-tip-item">
    <span class="tip-badge">Tip 6</span>
    <div class="tip-text">
      <h4>What is on this page and not on this topic</h4>
      <p>Sections 1.2.5 and 1.2.6 cover password hashing, salting, rainbow tables
      and the NIST guidance. Every word of it is true and it explains why the
      advice above works, which is why it is here. None of it is what this topic
      asks you about, and no question here turns on whether a salt must be secret
      or on how many combinations an eight-character password has. Read those
      sections for understanding, not to study from.</p>
    </div>
  </div>
`;

// ═══ THE GRADED ITEMS ════════════════════════════════════════════════════════
//  Seven of the nine were keyed to material this topic does not assess. Three
//  of them needed only their label changed, because the SCENARIO was already
//  CED content and only the classification vocabulary was off. Those come
//  first. The four that needed rebuilding follow.
//
//  Every MCQ letter and every widget key is preserved. Nothing about which
//  option is correct moves; what changes is what the correct option says.

// ── cfu-2: stolen passwords, not "credential stuffing" ───────────────────────
//  The scenario is an adversary using passwords confirmed to work from a prior
//  breach, which is exactly 1.2.A.1's "stolen passwords", and the credited
//  reasoning (complexity is irrelevant once the password is known to work; the
//  answer is unique passwords and MFA) is 1.2.C.1 and 1.2.C.3. Only the name
//  was off.
const C2_OPT_FROM = 'Credential stuffing uses passwords already confirmed to work from prior breaches, so complexity policy is irrelevant &mdash; the defense is unique passwords per site and MFA, not complexity requirements';
const C2_OPT_HTML = 'The attacker is using passwords already confirmed to work, stolen in an earlier breach somewhere else, so no complexity rule touches the problem. The defense is a different password on every site, plus MFA';

const C2_FB_FROM = '<strong>C is correct.</strong> Credential stuffing does not guess passwords &mdash; it uses real username-password pairs from a confirmed prior breach. Complexity requirements only raise the bar for guessing attacks; they do nothing against a validated credential pair. The root cause is password reuse, so the targeted defense is unique passwords per service plus MFA. Slash the trash: A is wrong because the mechanism of credential stuffing is reuse, not guessing. D incorrectly conflates credential stuffing with rainbow table attacks &mdash; these are completely different attack types.';
const C2_FB_HTML = '<strong>C is correct.</strong> Nothing here is being guessed. The adversary has real username and password pairs taken in a breach elsewhere, and is trying them here because people reuse passwords. Complexity rules raise the cost of guessing, and no guessing is happening, so they change nothing. The root cause is reuse, which is why the topic says passwords must be <strong>unique</strong> and not only long and random, and why MFA answers it: a password that is correct is still not enough on its own. Slash the trash: A is wrong because the mechanism is reuse, not guessing. D is wrong because it blames a stolen hash database, and nothing in the scenario mentions one.';

// ── cfu-6: a common password, not "password spraying" ────────────────────────
//  The scenario is a default onboarding password nobody changed, tried across
//  34 accounts. A default nobody changed IS a common password, which is
//  1.2.A.1, and the pattern of one failed then one successful login from one
//  external IP is 1.2.A.2's unknown device. The credited defense, MFA plus
//  forcing a change at first login, is already 1.2.C.3.
const C6_OPT_FROM = 'Password spraying; require MFA on all VPN accounts and enforce password change at first login, eliminating default credentials';
const C6_OPT_HTML = 'An adversary trying one common password across many accounts, in this case the default nobody changed; require MFA on all VPN accounts and force a password change at first login so the default stops existing';

const C6_FB_FROM = '<strong>B is correct.</strong> The defining features: one password ("Hospital2025!") tested against many accounts, with only 1&ndash;2 attempts per account &mdash; the textbook signature of password spraying designed to stay below lockout thresholds. The specific default password made this trivially successful.';
const C6_FB_HTML = '<strong>B is correct.</strong> One password tried against many accounts, one or two attempts each. The password is the organization\'s own default, which makes it a <strong>common password</strong> in the most literal sense: everyone was issued it and most people never changed it. Notice which signs were available. There was no burst of failed attempts to spot, one per account, but every one of those 34 logins came from a single external address, which is a device nobody had seen before.';

// ── cfu-7: the sequence keeps its order, loses its label ─────────────────────
//  The five steps are, in order, research about the targets, choosing a common
//  password, one attempt each, a wait, and the harvest. That is 1.2.B.2 feeding
//  1.2.A.1, and the pacing exists to avoid producing the first of the three
//  signs. The order key and every step id are untouched.
const C7_PRE_FROM = 'moving any steps, trace the password spraying attack from start to finish in your head.';
const C7_PRE_HTML = 'moving any steps, trace the attack from research to harvest in your head.';

const C7_Q_FROM = 'These five steps describe how a password spraying attack avoids detection. Use the arrows to place them in the correct chronological order, then click Check Order.';
const C7_Q_HTML = 'These five steps describe an attack that never produces a burst of failed logins. Use the arrows to place them in the correct chronological order, then click Check Order.';

const C7_FB_FROM = '<strong>Correct order:</strong> (1) Harvest usernames via OSINT &rarr; (2) Select one common password meeting complexity rules &rarr; (3) One attempt per account, never triggering lockout &rarr; (4) Wait 30&ndash;60 minutes before the next password cycle &rarr; (5) Collect compromised accounts. The key insight is steps 3 and 4 working together: low volume <em>per account</em> plus timing delays defeat both account lockout and anomaly detection. The attack is slow but virtually undetectable with standard controls. Defense: MFA, login anomaly detection across accounts (not just per-account), and blocking known weak passwords at creation.';
const C7_FB_HTML = '<strong>Correct order:</strong> (1) gather usernames from public sources &rarr; (2) pick one password common enough to be in use somewhere &rarr; (3) one attempt per account &rarr; (4) wait before the next round &rarr; (5) collect whatever opened. Steps 1 and 2 are the two halves of how this topic describes an attack starting: research about the people, then a password that is simply common. Steps 3 and 4 are worth sitting with, because they exist to defeat the first of the three signs. <strong>Many failed attempts in a short time</strong> is the sign everyone watches for, and one attempt per account spread over hours never produces it. What it cannot hide is the other two: all of this arrives from a device nobody has seen, and often at an hour nobody works. Defense: MFA, because the adversary eventually submits a correct password, and not issuing a password everyone shares in the first place.';

// ── the learning objectives, which are the root of it ────────────────────────
//  Five of the seven were off-CED: distinguishing five attack types of which
//  one is in the CED, keyspace arithmetic, hashing, salts and rainbow tables,
//  and NIST SP 800-63B. Objectives are the page's contract with a student about
//  what they are going to be able to do, so a wrong objective list is not
//  decoration on the problem, it is the problem's source. Everything else on
//  this page follows from it.
//
//  Rewritten to the seven Essential Knowledge statements, keeping the two
//  generic objectives that were already fine and naming the enrichment as
//  enrichment rather than dropping it.
const OBJ_FROM = `<ul class="obj-list">
    <li>
<span class="obj-check"></span>Define and precisely distinguish brute force, dictionary, credential stuffing, password spraying, and rainbow table attacks by their mechanism and starting conditions</li>
    <li>
<span class="obj-check"></span>Calculate and interpret keyspace size for a given password policy, and explain why length dominates complexity in determining resistance to brute force</li>
    <li>
<span class="obj-check"></span>Explain how passwords are stored using one-way hashing and why fast hash functions (MD5, SHA-1) are inappropriate for password storage</li>
    <li>
<span class="obj-check"></span>Describe what a salt is, how it is applied, and precisely why it defeats rainbow table precomputation</li>
    <li>
<span class="obj-check"></span>Apply NIST SP 800-63B guidance on password policy and explain why forced rotation and complexity requirements are counterproductive</li>
    <li>
<span class="obj-check"></span>Analyze a realistic breach scenario, identify the attack type in use, and select the control that would have specifically prevented it</li>
    <li>
<span class="obj-check"></span>Apply AP exam strategies &mdash; predict-first, slash the trash, keyword identification &mdash; to password attack MCQ scenarios</li>
  </ul>`;
const OBJ_HTML = `<ul class="obj-list">
    <li>
<span class="obj-check"></span>Name the three kinds of guess an adversary submits to a live login: passwords that are common, passwords that follow a predictable pattern, and passwords stolen from somewhere else</li>
    <li>
<span class="obj-check"></span>List the three signs that a login is under attack: many failed attempts in a short time, a login at an unusual hour, and a login from a device not seen before</li>
    <li>
<span class="obj-check"></span>Recognise the three common password patterns in your own choices: a word with two digits and a symbol at the end, a pet or family name, and a date that matters to you</li>
    <li>
<span class="obj-check"></span>Explain how a dictionary attack is built from information gathered about a specific person, and why that targeting is what makes it work</li>
    <li>
<span class="obj-check"></span>Say what makes a password strong, long and random and unique, and why a password manager or a passphrase is the practical way to get all three</li>
    <li>
<span class="obj-check"></span>Explain why multi-factor authentication answers every attack in this topic, including the ones where the adversary submits the correct password</li>
    <li>
<span class="obj-check"></span>Analyze a realistic breach scenario, identify which kind of guess was used, which signs were available, and which control would have stopped it</li>
    <li>
<span class="obj-check"></span>Read the enrichment sections on hashing, salting and password policy for understanding of why the advice above works, knowing they are not assessed here</li>
  </ul>`;

// ── 1.2.4's "AP exam distinguisher" ──────────────────────────────────────────
//  An explicit classification rule for two off-CED categories, inside the
//  attack-types section. Found by the gate, not by reading.
const D4_FROM = '<strong>AP exam distinguisher:</strong> If the scenario describes an attacker testing the <em>same password</em> across <em>many accounts</em> to evade lockout &mdash; it is password spraying. If it is many passwords against one account &mdash; it is brute force or dictionary. The direction of the attack is the classification signal.';
const D4_HTML = '<strong>Worth noticing:</strong> the direction matters to how an attack is spotted. One password tried across many accounts never produces a burst of failed logins on any single account, so the first of the three signs never fires. Many passwords against one account does produce that burst. Either way the adversary is submitting guesses to a live login, which is what this topic is about, and either way the answer is the same: a password that cannot be guessed, and a second factor for when one is.';

// ── the worked example that predicted a legacy label ─────────────────────────
const WEX_FROM = 'The attacker has credentials from a prior breach (retail chain). Testing them against a completely different service (Spotify). One attempt per account. No guessing involved. Prediction: <strong>credential stuffing</strong>.';
const WEX_HTML = 'The attacker has credentials from a prior breach at a retail chain, and is testing them against a completely different service. One attempt per account. No guessing involved at all. Prediction: <strong>stolen passwords, reused</strong>, which is the third of the three kinds of guess and the one no complexity rule touches.';

// ── an FAQ that gets the CED's own term wrong ────────────────────────────────
//  "A dictionary attack tests a curated wordlist of probable passwords, common
//  words, names, keyboard patterns" is not what this topic means by it. The
//  Essential Knowledge is explicit: the adversary builds the dictionary from
//  personal information gathered ABOUT THE VICTIM and submits it with an
//  automated tool. Targeted, not generic. This answer taught the one CED attack
//  type on the page incorrectly, and closed with a claimed exam distinguisher
//  for a category the topic does not use.
const FAQ_FROM = 'A dictionary attack tests a curated wordlist of probable passwords &mdash; common words, names, keyboard patterns, and known breach passwords. Dictionary attacks are far faster against typical human-chosen passwords because most people select predictable, word-based passwords. Brute force is guaranteed to succeed eventually but is impractical against long passwords. The key distinguisher for the AP exam: if the scenario mentions a wordlist, it is a dictionary attack. If it mentions systematic enumeration of all combinations, it is brute force.';
const FAQ_HTML = 'A dictionary attack is targeted, and the targeting is the point. The adversary gathers information about one specific person, their employer, their pets, their town, the years that matter to them, builds a wordlist out of it, and submits that list with an automated tool. It works because the three common password patterns are all personal: a pet or family name, a date that means something, a word with two digits and a symbol stuck on the end. Exhaustive enumeration of every possible combination is a different and much slower idea, and it is not what this topic asks about. What the topic asks is which of the three kinds of guess the adversary made, and a dictionary built from research is the clearest case of a patterned one.';

// ── cfu-3: the match item, rebuilt ───────────────────────────────────────────
//  Every one of its five terms was off-CED: brute force, dictionary attack,
//  password spraying, credential stuffing, rainbow table. Only dictionary
//  attack is in this topic, and even that was defined as a generic wordlist
//  rather than the targeted one the Essential Knowledge describes.
//
//  Rebuilt on the three kinds of guess, the dictionary attack proper, and the
//  three signs as a set. THE FIVE KEYS ARE UNCHANGED, E C B A D in row order,
//  so nothing about which option is correct moves; the terms and the
//  descriptions do. The gate asserts the keys are identical rather than
//  trusting it.
const C3_FROM_START = '<div class="match-wrap" id="cfu-3-match">';
const C3_TO = '<button class="cfu-submit" id="cfu-3-btn"';
const C3_HTML = `<div class="match-wrap" id="cfu-3-match">
      <div class="match-row" id="mr-3-1" data-correct="E">
        <div class="match-term">Common password</div>
        <select class="match-select" id="ms-3-1">
          <option value="">&mdash; select a description &mdash;</option>
          <option value="A">A wordlist built from research about one specific person, their employer, their pets, the years that matter to them, submitted by an automated tool</option>
          <option value="B">Taken in a breach at a different company and tried here, which works because people reuse passwords across sites</option>
          <option value="C">A word or two with two digits and a special character on the end, a pet or family name, or a date that means something to you</option>
          <option value="D">Many failed attempts in a short time, a login at an unusual hour, or a login from a device that has not been seen before</option>
          <option value="E">One that appears near the top of every published list of what people actually choose, including a default issued at onboarding that nobody changed</option>
        </select>
      </div>
      <div class="match-row" id="mr-3-2" data-correct="C">
        <div class="match-term">Common pattern</div>
        <select class="match-select" id="ms-3-2">
          <option value="">&mdash; select a description &mdash;</option>
          <option value="A">A wordlist built from research about one specific person, their employer, their pets, the years that matter to them, submitted by an automated tool</option>
          <option value="B">Taken in a breach at a different company and tried here, which works because people reuse passwords across sites</option>
          <option value="C">A word or two with two digits and a special character on the end, a pet or family name, or a date that means something to you</option>
          <option value="D">Many failed attempts in a short time, a login at an unusual hour, or a login from a device that has not been seen before</option>
          <option value="E">One that appears near the top of every published list of what people actually choose, including a default issued at onboarding that nobody changed</option>
        </select>
      </div>
      <div class="match-row" id="mr-3-3" data-correct="B">
        <div class="match-term">Stolen password</div>
        <select class="match-select" id="ms-3-3">
          <option value="">&mdash; select a description &mdash;</option>
          <option value="A">A wordlist built from research about one specific person, their employer, their pets, the years that matter to them, submitted by an automated tool</option>
          <option value="B">Taken in a breach at a different company and tried here, which works because people reuse passwords across sites</option>
          <option value="C">A word or two with two digits and a special character on the end, a pet or family name, or a date that means something to you</option>
          <option value="D">Many failed attempts in a short time, a login at an unusual hour, or a login from a device that has not been seen before</option>
          <option value="E">One that appears near the top of every published list of what people actually choose, including a default issued at onboarding that nobody changed</option>
        </select>
      </div>
      <div class="match-row" id="mr-3-4" data-correct="A">
        <div class="match-term">Dictionary attack</div>
        <select class="match-select" id="ms-3-4">
          <option value="">&mdash; select a description &mdash;</option>
          <option value="A">A wordlist built from research about one specific person, their employer, their pets, the years that matter to them, submitted by an automated tool</option>
          <option value="B">Taken in a breach at a different company and tried here, which works because people reuse passwords across sites</option>
          <option value="C">A word or two with two digits and a special character on the end, a pet or family name, or a date that means something to you</option>
          <option value="D">Many failed attempts in a short time, a login at an unusual hour, or a login from a device that has not been seen before</option>
          <option value="E">One that appears near the top of every published list of what people actually choose, including a default issued at onboarding that nobody changed</option>
        </select>
      </div>
      <div class="match-row" id="mr-3-5" data-correct="D">
        <div class="match-term">Signs of an attack</div>
        <select class="match-select" id="ms-3-5">
          <option value="">&mdash; select a description &mdash;</option>
          <option value="A">A wordlist built from research about one specific person, their employer, their pets, the years that matter to them, submitted by an automated tool</option>
          <option value="B">Taken in a breach at a different company and tried here, which works because people reuse passwords across sites</option>
          <option value="C">A word or two with two digits and a special character on the end, a pet or family name, or a date that means something to you</option>
          <option value="D">Many failed attempts in a short time, a login at an unusual hour, or a login from a device that has not been seen before</option>
          <option value="E">One that appears near the top of every published list of what people actually choose, including a default issued at onboarding that nobody changed</option>
        </select>
      </div>
    </div>
    `;

// ── cfu-3 feedback, to match the rebuilt rows ────────────────────────────────
const C3_FB_FROM = '<strong>Correct matches:</strong> Brute Force &rarr; systematically tries every combination (E). Dictionary &rarr; curated wordlists with mangling rules (C). Password Spraying &rarr; one password across many accounts to avoid lockout (B). Credential Stuffing &rarr; replays breach credentials on different sites (A). Rainbow Table &rarr; precomputed hash-to-plaintext chains (D). The key distinctions: brute force has no wordlist (unlike dictionary), spraying avoids lockout by spreading attempts (unlike brute force or dictionary on one account), credential stuffing uses <em>real</em> stolen passwords (not guesses), and rainbow tables require <em>offline</em> access to a hash database.';
const C3_FB_HTML = '<strong>Correct matches:</strong> Common password &rarr; near the top of every published list, including a default nobody changed (E). Common pattern &rarr; a word with two digits and a symbol, a pet name, a meaningful date (C). Stolen password &rarr; taken elsewhere, works here through reuse (B). Dictionary attack &rarr; a wordlist built from research about one person (A). Signs of an attack &rarr; failed attempts in a burst, an unusual hour, an unknown device (D). The first three are the only three kinds of guess there are, and it is worth being able to say which one a scenario describes before you look at any answers. The dictionary attack is the one people misremember: it is not a generic list of common words, it is a list built about <em>you</em>, and that is why it works.';

// ── cfu-5: the fill-in-the-blank, rebuilt ────────────────────────────────────
//  It walked through the salting process: random salt, plaintext password, slow
//  hash function, unique hash, and closed on defeating rainbow tables. Every
//  word of that is outside this topic.
//
//  The replacement walks the chain the topic does describe, which is the one
//  that connects two Essential Knowledge statements: research about a person
//  produces a targeted wordlist, an automated tool submits it, and it lands
//  because the password followed a predictable pattern. Four blanks and six
//  chips, the same shape, so the widget is untouched. Both distractors are
//  things a student might reasonably reach for: a complexity rule, which is
//  what people believe protects them, and a stolen hash database, which is the
//  offline path this topic does not take.
const C5_Q_FROM = 'Complete the description of the salting process by placing each word chip into the correct blank.';
const C5_Q_HTML = 'Complete the description of how a targeted guessing attack is built, by placing each word chip into the correct blank.';

const C5_PRE_FROM = '&#9998; Predict first: Before placing any words, trace the full salting process in your head from plaintext to stored hash.';
const C5_PRE_HTML = '&#9998; Predict first: Before placing any words, trace the attack in your head from what the adversary looks up to why the password gave way.';

const C5_BANK_FROM = '<div class="dtb-bank" id="dtb-5-bank">';
const C5_BANK_TO = '</div>';
const C5_BANK_HTML = `<div class="dtb-bank" id="dtb-5-bank">
      <span class="dtb-bank-label">Word Bank</span>
      <span class="dtb-chip" id="dtb-chip-5-1" data-val="personal information" onclick="dtbSelectChip('5','1')">personal information</span>
      <span class="dtb-chip" id="dtb-chip-5-2" data-val="targeted wordlist" onclick="dtbSelectChip('5','2')">targeted wordlist</span>
      <span class="dtb-chip" id="dtb-chip-5-3" data-val="automated tool" onclick="dtbSelectChip('5','3')">automated tool</span>
      <span class="dtb-chip" id="dtb-chip-5-4" data-val="common pattern" onclick="dtbSelectChip('5','4')">common pattern</span>
      <span class="dtb-chip" id="dtb-chip-5-5" data-val="complexity rule" onclick="dtbSelectChip('5','5')">complexity rule</span>
      <span class="dtb-chip" id="dtb-chip-5-6" data-val="stolen hash database" onclick="dtbSelectChip('5','6')">stolen hash database</span>
    </div>`;

const C5_DIAG_FROM = '<div class="dtb-diagram">';
const C5_DIAG_TO = '</div>';
const C5_DIAG_HTML = `<div class="dtb-diagram">
      The adversary begins by gathering
      <span class="dtb-blank" id="dtb-blank-5-A" data-correct="personal information" onclick="dtbPlaceChip('5','A')">               </span>
      about one specific person from public sources. Out of it they build a
      <span class="dtb-blank" id="dtb-blank-5-B" data-correct="targeted wordlist" onclick="dtbPlaceChip('5','B')">               </span>
      and submit it to the login page with an
      <span class="dtb-blank" id="dtb-blank-5-C" data-correct="automated tool" onclick="dtbPlaceChip('5','C')">               </span>
      . It lands because the password followed a
      <span class="dtb-blank" id="dtb-blank-5-D" data-correct="common pattern" onclick="dtbPlaceChip('5','D')">               </span>
      that the research made predictable, such as a pet's name with a birth year on the end.
    </div>`;

//  ANCHORED ON ITS OWN OPENING SENTENCE, NOT ON THE WRAPPER. The first version
//  of this splice opened at <div class="cfu-feedback-explain">, which every one
//  of the ten CFUs has, so it could never have been unique. It was written,
//  never added to SPLICES, and never ran. The question shipped rebuilt onto the
//  targeted-dictionary chain with feedback still explaining the salting
//  sequence: a student who got it right was told the answer was "random salt
//  &rarr; plaintext password &rarr; slow hash function". Found in review, not by
//  any check here, which is why the build now fails on a defined-but-unwired
//  splice constant.
const C5_FB_FROM = 'The correct sequence: <strong>random salt</strong>';
const C5_FB_TO = '</div>';
const C5_FB_TOEXCL = true;
const C5_FB_HTML = `Correct sequence: <strong>personal information</strong>
        &rarr; a <strong>targeted wordlist</strong> &rarr; an <strong>automated tool</strong>
        &rarr; it lands on a <strong>common pattern</strong>. This is the chain worth holding onto,
        because it joins the two halves of the topic: the research is what makes the wordlist
        short enough to be worth running, and the pattern is what makes the password land inside
        it. On the two distractors: a <em>complexity rule</em> is what most people believe
        protects them, and it is what produces the pattern in the first place, a word with two
        digits and a symbol stuck on the end to satisfy the rule. A <em>stolen hash database</em>
        belongs to a different kind of attack entirely, one that happens after a breach rather
        than at a live login, and the enrichment sections below cover it.
      `;

// ── cfu-4: the boundary of the topic, which is a better item than it had ─────
//  It asked which attacks are not defeated by account lockout, a control this
//  topic does not name, and the credited answer required knowing three off-CED
//  categories. But look at its scenario: incident I is stolen passwords replayed
//  (1.2.A.1), incident II is one common password across many accounts (1.2.A.1
//  again), and incident III is cracking a stolen hash file offline in under a
//  minute, which is not an attack on a live login at all.
//
//  So the scenario already contains the distinction this whole page needed. The
//  question now asks for it. Nothing in the scenario changes and the key stays
//  D, which was already the "all of them" option and is now the one that names
//  the odd one out.
const C4_Q_FROM = 'Which statements correctly identify an attack that is <strong>NOT</strong> defeated by account lockout policies?';
const C4_Q_HTML = 'This topic is about guesses submitted to a live login. Which of the three incidents is <strong>NOT</strong> that, and therefore outside what this topic covers?';

const C4_OPTS_FROM = '<div class="cfu-options" id="cfu-4-opts">';
const C4_OPTS_TO = '<button class="cfu-submit" id="cfu-4-btn"';
const C4_OPTS_HTML = `<div class="cfu-options" id="cfu-4-opts">
      <label class="cfu-opt" data-val="A"><span class="cfu-opt-letter">A</span><span class="cfu-opt-text">I only, because the attacker never guessed anything: the passwords were already known to work</span></label>
      <label class="cfu-opt" data-val="B"><span class="cfu-opt-letter">B</span><span class="cfu-opt-text">II only, because testing one password against 12,000 accounts is done offline rather than against the login page</span></label>
      <label class="cfu-opt" data-val="C"><span class="cfu-opt-letter">C</span><span class="cfu-opt-text">I and II, because both used credentials the attacker had obtained in advance rather than guessing them</span></label>
      <label class="cfu-opt" data-val="D"><span class="cfu-opt-letter">D</span><span class="cfu-opt-text">III only. Incidents I and II are both passwords submitted to a live login, one stolen from elsewhere and one simply common. Incident III is cracking a stolen file offline, where there is no login page and no sign to notice</span></label>
    </div>
    `;

//  Anchored on its own opening words rather than on the explain div, which is
//  not unique: every CFU on the page has one.
const C4_FB_FROM = '<strong>D is correct.</strong> Evaluate each independently: Statement I (credential stuffing)';
const C4_FB_TO = '</div>';
const C4_FB_TOEXCL = true;
const C4_FB_HTML = `<strong>D is correct.</strong> Sort the three by asking where the guess was submitted. In I the
attacker typed real credentials from another company's breach into this company's VPN: a live
login, using a <strong>stolen</strong> password. In II the attacker typed "Welcome1" into 12,000
accounts: a live login, using a <strong>common</strong> password. Both are this topic. In III
nothing was typed into anything. The attacker already had the password file and worked on it on
their own machine, which is why it took under a minute and why no sign was available to notice.
That is a real and serious problem, and it is what sections 1.2.5 and 1.2.6 are about, and it is
not what you will be asked here. Slash the trash: A and C are wrong because incidents I and II
both happen at a login page, which is exactly what makes them this topic's business. B is wrong
because testing a password against 12,000 accounts means 12,000 login attempts, which is as
online as it gets.`;

// ── cfu-8: which of the three signs was actually available ──────────────────
//  Its two statements were about password spraying as a classification and
//  about lockout thresholds as a control, neither of which this topic names.
//  The scenario is untouched and is a good one: one common password, 15,000
//  accounts, one attempt per account per twelve hours, rotating addresses,
//  zero lockouts, 72 accounts opened. Key stays B.
const C8_Q_FROM = 'Consider the following two statements about this scenario:<br>\n    I. The attack is password spraying because one password is tested against many accounts, explicitly designed to avoid triggering per-account lockout thresholds.<br>\n    II. Deploying account lockout with a thr';
const C8_Q_TO = '</p>';
const C8_Q_HTML = `Consider the following two statements about this scenario:<br>
    I. The first of the three signs, many failed attempts in a short time, never appeared here, because the tool sent one request per account every twelve hours.<br>
    II. That means nothing about the attack was visible to the company.</p>`;

const C8_OPTS_FROM = '<div class="cfu-options" id="cfu-8-opts">';
const C8_OPTS_TO = '<button class="cfu-submit" id="cfu-8-btn"';
const C8_OPTS_HTML = `<div class="cfu-options" id="cfu-8-opts">
      <label class="cfu-opt" data-val="A"><span class="cfu-opt-letter">A</span><span class="cfu-opt-text">Both statements are correct: with no burst of failed attempts, there was nothing for the company to see</span></label>
      <label class="cfu-opt" data-val="B"><span class="cfu-opt-letter">B</span><span class="cfu-opt-text">I is correct and II is incorrect. The failed-attempt sign never fired, but 72 successful logins arrived from rotating addresses nobody had seen before, and that is the third sign</span></label>
      <label class="cfu-opt" data-val="C"><span class="cfu-opt-letter">C</span><span class="cfu-opt-text">I is incorrect and II is correct. Fifteen thousand requests is a burst by any measure, and nothing else about the attack was observable</span></label>
      <label class="cfu-opt" data-val="D"><span class="cfu-opt-letter">D</span><span class="cfu-opt-text">Both statements are incorrect: the password was complex enough to satisfy any policy, so this was not a guessing attack at all</span></label>
    </div>
    `;

const C8_FB_FROM = '<strong>B is correct.</strong> Statement I is correct &mdash; one password, many accounts';
const C8_FB_TO = '</div>';
const C8_FB_TOEXCL = true;
const C8_FB_HTML = `<strong>B is correct.</strong> Statement I is right, and it is right for the reason worth
remembering: one attempt per account every twelve hours never produces a burst on any single
account, so the sign everybody watches for is the one sign this attack does not create. Statement
II is where it goes wrong. Two of the three signs were still there. The logins came from rotating
addresses that had never been seen before, which is a <strong>device not seen before</strong>, and
72 of them succeeded, which is 72 people who did not log in when the record says they did. Slash
the trash: A and C both accept statement II, which is the trap. D is wrong because
"Welcome123!" satisfying a complexity rule is not the same as being hard to guess, and this is
precisely the pattern the topic warns about: a word, some digits, a symbol on the end.`;

// ── cfu-10: the end-of-lesson item ──────────────────────────────────────────
//  Three of the attacker's four resources map straight onto this topic: 9,000
//  email addresses gathered from LinkedIn is the research step, 500 million
//  credential pairs from another company's breach is stolen passwords, and
//  "Hospital2026!" issued to everyone is a common password. The fourth, the
//  stolen hash database, is the offline problem again. And the audit says MFA
//  is not deployed, which is the single control that answers every one of the
//  live-login attacks at once. Key stays D.
const C10_OPTS_FROM = '<div class="cfu-options" id="cfu-10-opts">';
const C10_OPTS_TO = '<button class="cfu-submit" id="cfu-10-btn"';
const C10_OPTS_HTML = `<div class="cfu-options" id="cfu-10-opts">
      <label class="cfu-opt" data-val="A"><span class="cfu-opt-letter">A</span><span class="cfu-opt-text">The attacker's only route is the stolen hash database; the broadest control is monthly password rotation, which shortens the window in which a cracked password is useful</span></label>
      <label class="cfu-opt" data-val="B"><span class="cfu-opt-letter">B</span><span class="cfu-opt-text">Only the default password is usable, because the credential pairs came from a different company and cannot apply here; the broadest control is a complexity requirement on new passwords</span></label>
      <label class="cfu-opt" data-val="C"><span class="cfu-opt-letter">C</span><span class="cfu-opt-text">All the routes are usable; the broadest control is replacing SHA-1 with a slow hash function, which protects the passwords no matter how the attacker reaches them</span></label>
      <label class="cfu-opt" data-val="D"><span class="cfu-opt-letter">D</span><span class="cfu-opt-text">Three routes lead to the login page: the default "Hospital2026!" is a common password, the 500 million pairs are stolen passwords that work here because 65% of staff reuse, and the 9,000 addresses are the research a targeted list is built from. The broadest single control is MFA, because all three end with the attacker submitting a password that is correct</span></label>
    </div>
    `;

const C10_FB_FROM = '<strong>D is correct.</strong> All three attacks are viable:';
const C10_FB_TO = '</div>';
const C10_FB_TOEXCL = true;
const C10_FB_HTML = `<strong>D is correct.</strong> Take the attacker's resources one at a time and ask what each one
lets them type into a login box. The 9,000 addresses from LinkedIn are not an attack by
themselves; they are the <strong>research</strong>, the raw material a targeted list is built
from. The 500 million credential pairs are <strong>stolen passwords</strong>, and the audit says
65% of staff reuse, so a meaningful share of them will work here. "Hospital2026!" issued to
everyone at onboarding is a <strong>common password</strong> in the most literal sense. Three
routes, three kinds of guess, all of them ending at the same place: the attacker submits a
password that is correct. That is what makes <strong>MFA</strong> the broadest single control
here, and the audit says it is deployed nowhere. Slash the trash: A and C both fix the stolen
hash file, which matters and is covered in the enrichment sections, but neither one stops a
correct password being typed into the login page. B is wrong twice over: credentials from another
company are exactly what reuse makes usable here, and a complexity requirement is what produced
"Hospital2026!" in the first place.`;

// ── two lines the rebuilt items left behind ─────────────────────────────────
//  Found by reading the changed-sentence list, not by any check: cfu-3's
//  predict line still told a student to match attack types to mechanisms, and
//  cfu-3 no longer matches attack types. And cfu-7's first step still explained
//  itself by the lockout threshold, a control this topic does not name, while
//  its stem and feedback had moved to the failed-attempts sign. A step that
//  argues from one idea under a stem that argues from another is worse than
//  either.
const C3_PRE_FROM = 'Before touching the dropdowns, mentally match each attack type to its mechanism.';
const C3_PRE_HTML = 'Before touching the dropdowns, decide for yourself which description belongs to each of the five.';

const C7_STEP_FROM = 'Exactly one login attempt is made per account &mdash; never exceeding the lockout threshold for any single account';
const C7_STEP_HTML = 'Exactly one login attempt is made per account, so no single account ever shows a burst of failed attempts';

// ═════════════════════════════════════════════════════════════════════════════
//  SECOND PASS. WHAT THE FIRST PASS MISSED, AND WHY IT MISSED IT.
//
//  The first pass rebuilt the graded items and the objectives and came back
//  clean, and a review of the built sheet still found ten defects. Every one of
//  them is the same shape, and it is worth naming because it is not the shape
//  the gate was built to catch.
//
//  The gate checked whether the off-CED sections were LABELLED as enrichment.
//  They were. What it never checked was whether some OTHER part of the page
//  turned around and told a student that same material is required. A banner on
//  1.2.5 saying "not assessed in this topic" does nothing while 1.2.6 opens with
//  "each illustrates a specific, testable AP exam concept" and the FAQ closes
//  with a list of exam patterns made of rainbow tables and password spraying. A
//  label loses to a claim, every time, and the page carried nine claims.
//
//  So this pass removes the claims, and the gate gains a proximity check: any of
//  AP / exam / testable / assessed within 500 characters of any off-CED term is
//  a failure, whatever the labelling says. That check is the deliverable here as
//  much as the copy is; the copy is what it found.
//
//  Numbering below follows the review, so a defect can be traced to its fix.
// ═════════════════════════════════════════════════════════════════════════════

// ── R9. the hero subtitle ────────────────────────────────────────────────────
//  The first paragraph on the page, above everything, promising a lesson about
//  exhaustive brute force, rainbow tables and hashing. It sets the frame every
//  banner further down then has to argue with.
const HERO_FROM = '<p>How attackers systematically crack, steal, and reuse passwords &mdash; from exhaustive brute force to precomputed rainbow tables &mdash; and why password length, hashing algorithms, and salting determine whether a breached database becomes a catastrophe.</p>';
const HERO_HTML = '<p>How an adversary gets into an account by typing a password into the login page: the three kinds of guess they make, the three signs that give an attack away, and what actually stops it.</p>';

// ── R10. the exam-weight badge ───────────────────────────────────────────────
//  "~15&ndash;20%" is not a number the CED publishes. Weighting is given by
//  skill category, not by topic, and the badge beside it already names the
//  skill. An invented denominator in the meta bar is worse than no denominator,
//  so the badge goes rather than being corrected to a guess.
const WEIGHT_FROM = '\n    <span class="ch-badge">Exam Weight: ~15&ndash;20%</span>';
const WEIGHT_HTML = '';

// ── R1. the 1.2.2 callout ────────────────────────────────────────────────────
//  Two separate problems in four sentences. It taught defense-matching for
//  rainbow tables and rate limiting as exam technique, and it referred to "root
//  cause 4" on a page that defines three. The second one is the tell: nobody
//  had read this box in a long time.
const RC_FROM = '<strong>AP Exam Tip &mdash; Match the Defense to the Root Cause:</strong> AP exam defense questions almost always have a specific correct answer. Salting defeats root cause 3 (rainbow tables). MFA defeats root causes 1 and 2. Rate limiting defeats root cause 4. A generic "use stronger passwords" answer is <em>rarely</em> the best choice when a more targeted control is available.';
const RC_HTML = `<strong>Match the defense to the root cause:</strong> a control is only worth
  something against the cause it addresses, which is why "use a stronger password" is
  sometimes the answer and sometimes beside the point. Root cause 1 is that people choose
  passwords that are common or follow a pattern, and what answers it is a password that is
  <strong>long, random and unique</strong> with no personal words in it. Root cause 2 is
  reuse, and what answers it is the <strong>unique</strong> part specifically: a different
  password on every site. Root cause 3 is how a site stores what it was given, and nothing
  you choose as a user touches it. <strong>MFA</strong> is the one control that answers all
  three, because all three end the same way, with an adversary submitting a password that
  is correct.`;

// ── R2. section 1.2.6 ────────────────────────────────────────────────────────
//  Three case studies, the first of which is unsalted SHA-1 cracked with a
//  rainbow table, introduced as "a specific, testable AP exam concept" and each
//  one closed with a chip reading "AP Lesson". The cases are good history and
//  they stay. What goes is the claim that a student is examined on them.
const S6_FROM = '1.2.6 &mdash; Real-World Case Studies</h2>\n  <p>These three breaches demonstrate the difference between theoretical attack mechanics and catastrophic real-world outcomes. Each illustrates a specific, testable AP exam concept.</p>';
const S6_HTML = `1.2.6 &mdash; Real-World Case Studies</h2>

  <div class="info-box warning" style="margin-bottom:18px!important;">
    <span class="box-label">Enrichment: not assessed in this topic</span>
    <p>The first of these three is about what happened to a stolen password file
    after the fact, which is the subject of 1.2.5 and not of this topic. Read it
    for the story. The other two are attacks on a live login and are exactly this
    topic: real passwords stolen elsewhere and tried again, and one common
    password tried across thousands of accounts. What they add is scale, which is
    the part that is hard to believe until you see the numbers.</p>
  </div>

  <p>These three breaches show the distance between how an attack works on paper
  and what it costs when it lands on a real company.</p>`;

//  The three verdict chips. Identical strings, so each is anchored on the
//  sentence that follows it.
const V1_FROM = '<span class="case-verdict-label">AP Lesson</span>\n        <p>Textbook rainbow table';
const V1_HTML = '<span class="case-verdict-label">What this case shows</span>\n        <p>Textbook rainbow table';
const V2_FROM = '<span class="case-verdict-label">AP Lesson</span>\n        <p>Credential stuffing succeeds';
const V2_HTML = '<span class="case-verdict-label">What this case shows</span>\n        <p>Credential stuffing succeeds';
const V3_FROM = '<span class="case-verdict-label">AP Lesson</span>\n        <p>Password spraying exploits';
const V3_HTML = '<span class="case-verdict-label">What this case shows</span>\n        <p>Password spraying exploits';

// ── R3. section 1.2.7 ────────────────────────────────────────────────────────
//  Fifteen controls, most of them an organization's rather than a person's,
//  under an opening sentence saying that knowing which one defeats rainbow
//  tables is "the prerequisite for selecting the correct defense on the AP
//  exam". This topic names three protections and a student can act on all three.
//  The banner says which three; the rest becomes background, which is what it is.
const S7_FROM = '1.2.7 &mdash; Defense Strategies</h2>\n  <p>Password attack defense requires matching the right control to the specific attack type. A control that defeats rainbow tables does nothing against credential stuffing. Understanding the mechanism is the prerequisite for selecting the correct defense on the AP exam.</p>';
const S7_HTML = `1.2.7 &mdash; Defense Strategies</h2>

  <div class="info-box warning" style="margin-bottom:18px!important;">
    <span class="box-label">Three of these are the topic. The rest is background.</span>
    <p>What this topic asks of you is what one person can do: make the password
    <strong>long, random and unique</strong>, keep pets, towns, birthdays and
    other personal words out of it, and turn on <strong>multi-factor
    authentication</strong>. That is the entire list. Everything below is what an
    organization does on the other side of the login page, and it is here so the
    three above read as reasons rather than slogans.</p>
  </div>

  <p>A control is only worth something against the cause it addresses. The two
  columns below are split by who does the work: the technical one is the site's
  job, the policy one is an organization's.</p>`;

//  Three "Exam Trap" chips in the defense-matching table, each on a row where
//  account lockout does not help. The rows are right. The chips claimed the exam
//  turns on them, so each becomes the fact it was pointing at.
const T1_FROM = 'bcrypt/Argon2 + salt <span class="trap">Exam Trap</span>';
const T1_HTML = 'bcrypt/Argon2 + salt <span class="trap">No login involved</span>';
const T2_FROM = 'Salt (random, unique per account) <span class="trap">Exam Trap</span>';
const T2_HTML = 'Salt (random, unique per account) <span class="trap">No login involved</span>';
const T3_FROM = 'Block common passwords + MFA <span class="trap">Exam Trap</span>';
const T3_HTML = 'Block common passwords + MFA <span class="trap">No burst to detect</span>';

// ── R4. the FAQ ──────────────────────────────────────────────────────────────
//  The last question on the page asked how password attacks appear on the exam
//  and answered with password spraying, rainbow tables, credential stuffing,
//  bcrypt and rate limiting. It is the single most direct statement on the page
//  about what is examined, and every item in it is off-CED. The question is
//  worth keeping; it is the one a student actually has. So it keeps its slot and
//  gets an answer that is true.
const FAQ5_FROM = '<div class="faq-q">How do password attacks appear on the AP Cybersecurity exam?</div>\n      <p class="faq-a">AP Cybersecurity exam questions on password attacks typically present a scenario and ask you to classify the attack type, identify a vulnerability in a password storage design, or select the most effective defense. Common scenario patterns: one attempt per account across many accounts (password spraying), instant hash reversal from a stolen database (rainbow table, cause is missing salts), login using credentials from a different breach (credential stuffing). Defense questions test whether you understand which specific control prevents which specific attack &mdash; salting defeats rainbow tables, MFA defeats credential stuffing and password spraying, bcrypt defeats offline brute force, rate limiting defeats online brute force.</p>';
const FAQ5_HTML = `<div class="faq-q">Which parts of this page does Topic 1.2 actually ask about?</div>
      <p class="faq-a">Three things, and they are all on this page. What the adversary
      guesses: a password that is simply <strong>common</strong>, one that follows a
      predictable <strong>pattern</strong>, or one <strong>stolen</strong> somewhere else
      and tried here. How an attack shows itself: many failed attempts in a short time, a
      login at an unusual time, a login from an unknown device. And what protects an
      account: a password that is long, random and unique, with no personal words in it,
      plus multi-factor authentication. Sections 1.2.5 and 1.2.6 explain what happens to a
      password file after it is stolen. That is worth understanding, and it is a different
      question from the one this topic asks.</p>`;

//  Same habit, one question earlier: an "AP exam signal" line attached to
//  credential stuffing. The rest of that answer is accurate and stays.
const FAQ2_FROM = 'The AP exam signal: "breach database," "stolen credentials from another site," or "tested against a different service." The defense is unique passwords per site enforced by a password manager, plus MFA on all accounts.';
const FAQ2_HTML = 'In the terms this topic uses, that is the third of the three kinds of guess, and the only one where nothing is being guessed: the password is real, a real person chose it, and it was taken from somewhere else. What answers it is a different password on every site, which is what <strong>unique</strong> means, plus MFA for the times one of them is correct anyway.';

//  And the same answer again inside the FAQPage structured data at the top of
//  the body, where nothing on the rendered page shows it and search results do.
//  Missed on the first pass because it is 70KB above the visible copy it
//  duplicates. Plain ASCII, no entities: it is a JSON string, not markup.
const LD_FROM = '"name": "How do password attacks appear on the AP Cybersecurity exam?",\n        "acceptedAnswer": {"@type": "Answer","text": "AP Cybersecurity exam questions on password attacks typically present a scenario and ask you to classify the attack, identify a vulnerability in password storage, or select the most effective defense. Salting defeats rainbow tables; MFA defeats credential stuffing; account lockout defeats online brute force; rate limiting defeats password spraying."}';
const LD_HTML = '"name": "What does AP Cybersecurity Topic 1.2 cover?",\n        "acceptedAnswer": {"@type": "Answer","text": "Topic 1.2 covers three things: the three kinds of guess an adversary submits to a live login page (a password that is common, a password that follows a predictable pattern, and a password stolen from another site), the three signs that an attack is under way (many failed attempts in a short time, a login at an unusual time, and a login from an unknown device), and what protects an account (a long, random and unique password, keeping personal words out of it, and multi-factor authentication)."}';

// ── R8. cfu-7, the ordering item ─────────────────────────────────────────────
//  Half-repaired on the first pass, which is the worst state to leave an item
//  in. The stem, the predict line, the feedback and step 3 moved onto the three
//  signs; steps 2, 4 and 5 stayed as password-spraying tradecraft, so the item
//  graded lockout thresholds, 30-to-60-minute delays and a compromise rate under
//  a stem about failed-attempt bursts.
//
//  Text only. Every data-step-id keeps its value and data-correct-order stays
//  "1,2,3,4,5", so the widget's contract is untouched by construction.
const Q7S2_FROM = 'Attacker selects one widely used password (e.g., "Company2024!") known to meet common complexity requirements';
const Q7S2_HTML = 'Attacker picks a single password that is simply <strong>common</strong>, the kind near the top of every published list, on the assumption that somebody in the organization is using it';
const Q7S4_FROM = 'Attacker waits 30&ndash;60 minutes before attempting the next password &mdash; timing designed to stay under detection thresholds';
const Q7S4_HTML = 'Attacker waits a long time before the next round, so the attempts never bunch up into the burst that would be noticed';
const Q7S5_FROM = 'Approximately 0.5&ndash;2% of accounts are compromised &mdash; yielding hundreds of valid credentials against a large enterprise';
const Q7S5_HTML = 'A small number of accounts open, and from each of them the adversary is inside with a password the system accepted as correct';

// ── R5. cfu-9 ────────────────────────────────────────────────────────────────
//  A constructed response headed "AP Exam Strategy Check" that graded NIST SP
//  800-63B rotation and complexity guidance. Real guidance, and not one of this
//  topic's seven Essential Knowledge statements.
//
//  Rebuilt piece by piece rather than as one block: the widget's ids
//  (cr-9-text, cr-9-count, cfu-9-btn, cfu-9-feedback, cfu-9-verdict) and its
//  handlers (crCount, crSubmit) are never inside a replaced region, so they
//  cannot drift. The scenario keeps its school-district framing, which is the
//  best thing about the item, and changes what the policy gets wrong.
const Q9_LBL_FROM = '<span class="cfu-label">AP Exam Strategy Check</span>';
const Q9_LBL_HTML = '<span class="cfu-label">Write It Out</span>';

const Q9_PRE_FROM = '&#9998; Predict first: Recall the two specific NIST SP 800-63B guidelines most relevant to this policy before writing.';
const Q9_PRE_HTML = '&#9998; Predict first: name the three things a password has to be, in order, before you write anything.';

const Q9_PROMPT_FROM = 'A school district IT director announces: "Effective immediately, all employee passwords must be reset every 90 days and must contain at least two special characters and one number."';
const Q9_PROMPT_HTML = 'A school district IT director announces: "Effective immediately, every employee password must contain a capital letter, a number and a symbol. Pick something you will remember, such as a pet\'s name or a birthday with a symbol on the end, and use the same one for the staff portal and the gradebook so nobody gets locked out."';

const Q9_GUID_FROM = 'In exactly two sentences: (1) identify which specific NIST SP 800-63B guideline this policy violates, and (2) explain the security reasoning behind NIST&rsquo;s position. Write in your own words &mdash; the model answer will appear after you submit.';
const Q9_GUID_HTML = 'In exactly two sentences: (1) name the two pieces of this topic&rsquo;s password advice the policy breaks, and (2) describe the attack the policy makes easy. Write in your own words &mdash; the model answer will appear after you submit.';

const Q9_MODEL_FROM = 'NIST SP 800-63B explicitly recommends <em>against</em> mandatory periodic password rotation unless there is confirmed evidence of compromise, because forced rotation causes users to make predictable incremental changes &mdash; such as changing "Summer2024!" to "Summer2025!" &mdash; that reduce effective entropy without improving security. NIST also recommends prioritizing password length over complexity requirements, since a 20-character passphrase provides significantly more resistance to brute force than an 8-character password with special characters, and complexity rules lead users to write passwords down or reuse them across accounts.';
const Q9_MODEL_HTML = 'The policy breaks two of the three things a password has to be. It is not <em>random</em>, because it tells staff to build the password out of personal information, a pet or a birthday, which is exactly the material an adversary gathers first; and it is not <em>unique</em>, because it tells staff to use one password on two systems, so a password stolen from either one opens both. What the rule produces is the predictable pattern this topic names, a word with a digit and a symbol stuck on the end to satisfy the requirement. That makes the targeted attack easy: an adversary looks the person up, builds a wordlist out of the pet and the dates that matter to them, submits it with an automated tool, and lands on the pattern. Multi-factor authentication is what still holds once a guess like that succeeds.';

const Q9_KEY_FROM = '<strong>Key concepts to include:</strong> mandatory rotation &rarr; predictable incremental changes. Length &gt; complexity. NIST recommends blocking <em>known compromised passwords</em> instead of forcing rotation. Only require reset when compromise is <em>confirmed</em>. If your response covered both the rotation guideline and the reasoning, you have a strong answer.';
const Q9_KEY_HTML = '<strong>Key ideas to include:</strong> personal information &rarr; a targeted wordlist &rarr; an automated tool &rarr; a common pattern. Long, random, unique: the policy defeats <em>random</em> and <em>unique</em>, and says nothing at all about length. A capital, a digit and a symbol produce the pattern rather than preventing it. One password on two systems means one theft opens both. MFA is the control that survives a password being correct. Name two of the three words and the research step and you have a strong answer.';

// ── found by the new proximity check, not by the review ──────────────────────
//  Two more of the same defect, in places nobody had looked. The first is a
//  classification cue buried at the end of an attack-block description, five
//  screens below the section that opens the topic. The second is in the Article
//  structured data, which no reader of the page ever sees and every search
//  result quotes.
const CUE_FROM = 'For the AP exam: if the scenario mentions a wordlist or "common passwords," classify as dictionary attack.';
const CUE_HTML = 'In the terms this topic uses: a wordlist built out of research about one specific person is what makes a guess targeted, and a long random string is the thing no wordlist reaches.';

const DESC_FROM = '"description": "Master AP Cybersecurity password attacks: brute force, dictionary attacks, credential stuffing, rainbow tables, and password spraying with keyspace math, salting mechanics, and AP exam strategy.",';
const DESC_HTML = '"description": "AP Cybersecurity Topic 1.2: the three kinds of guess an adversary submits to a live login page, the three signs that an attack is under way, and the password habits and multi-factor authentication that stop it.",';

// ── R7. cfu-10 ───────────────────────────────────────────────────────────────
//  The keyed answer was right and the stem asked for something else. It asked
//  which "attack types available to this attacker" the resources open, and the
//  audit hands the attacker a stolen hash database, so a complete answer to the
//  stem as written has to include the offline attack that D does not mention.
//  Option C even says "all the routes are usable", which is the better answer to
//  the question that was printed.
//
//  Nothing changes but the stem, which now asks what D answers: the routes to
//  the LOGIN PAGE. The hash database stays in the scenario and becomes the thing
//  a student has to rule out, which is the same boundary judgement cfu-4 asks
//  for and is worth asking twice. Key stays D.
const Q10_STEM_FROM = 'Which of the following <strong>MOST completely and accurately</strong> identifies the attack types available to this attacker AND the single control that would have the broadest impact across all three?';
const Q10_STEM_HTML = 'This topic is about guesses submitted to a live login page. Not everything in that list is one. Which of the following correctly identifies <strong>the routes to the login page</strong> that these resources open, and the single control that answers all of them?';

// ── the one EK code a student can actually see ───────────────────────────────
//  Nine EK codes survive on this page. Seven are inside the collapsed coverage
//  table a teacher audits, which is where the house rule says they may live.
//  Two are painted, and both are spliced here.
//
//  Worth recording how nearly this went wrong. The first probe walked the DOM
//  and reported one of the two as hidden, so it was nearly left alone. It had
//  filtered to leaf elements, and that one sits in a <div> with a <strong>
//  child, so it was never examined at all. document.body.innerText, which is
//  what a reader actually sees, has both. Read the painted text, not the tree.
//
//  The first also names vishing, 1.1's off-CED term, taken out of 1.1 in an
//  earlier pass. The full thinning sheet for this page is a separate build;
//  two painted codes are not worth waiting for it.
const EK_FROM = '(3) Topic 1.2 (password attack) + Topic 1.1 (vishing to steal the OTP &mdash; secure information impact 1.1.C.2).';
const EK_HTML = '(3) Topic 1.2, the password attack, plus Topic 1.1, the phone call that talked the victim into handing over the one-time password.';

const EK2_FROM = '(2) CED 1.2.B.2: construct a targeted dictionary from personal info and submit via automated tool.';
const EK2_HTML = '(2) Gather personal information about the victim, build a targeted wordlist out of it, and submit that list with an automated tool.';

const SPLICES = [
  { name: '1.2.1 learning objectives', from: OBJ_FROM, html: OBJ_HTML },
  { name: '1.2.3 vocabulary table', from: VOCAB_FROM, to: VOCAB_TO, html: VOCAB_HTML },
  { name: '1.2.4 exam distinguisher', from: D4_FROM, html: D4_HTML },
  { name: 'worked example prediction', from: WEX_FROM, html: WEX_HTML },
  { name: 'FAQ dictionary vs brute force', from: FAQ_FROM, html: FAQ_HTML },
  { name: '1.2.5 not-assessed banner', from: S5_FROM, html: S5_HTML },
  { name: '1.2.9 exam strategy', from: S9_FROM, to: S9_TO, toExclusive: S9_TOEXCL, html: S9_HTML },
  { name: 'cfu-3 match rows', from: C3_FROM_START, to: C3_TO, toExclusive: true, html: C3_HTML },
  { name: 'cfu-3 predict', from: C3_PRE_FROM, html: C3_PRE_HTML },
  { name: 'cfu-3 feedback', from: C3_FB_FROM, html: C3_FB_HTML },
  { name: 'cfu-7 step 1', from: C7_STEP_FROM, html: C7_STEP_HTML },
  { name: 'cfu-5 predict', from: C5_PRE_FROM, html: C5_PRE_HTML },
  { name: 'cfu-5 question', from: C5_Q_FROM, html: C5_Q_HTML },
  { name: 'cfu-5 word bank', from: C5_BANK_FROM, to: C5_BANK_TO, html: C5_BANK_HTML },
  { name: 'cfu-5 diagram', from: C5_DIAG_FROM, to: C5_DIAG_TO, html: C5_DIAG_HTML },
  { name: 'cfu-2 credited option', from: C2_OPT_FROM, html: C2_OPT_HTML },
  { name: 'cfu-2 feedback', from: C2_FB_FROM, html: C2_FB_HTML },
  { name: 'cfu-4 question', from: C4_Q_FROM, html: C4_Q_HTML },
  { name: 'cfu-4 options', from: C4_OPTS_FROM, to: C4_OPTS_TO, toExclusive: true, html: C4_OPTS_HTML },
  { name: 'cfu-4 feedback', from: C4_FB_FROM, to: C4_FB_TO, toExclusive: C4_FB_TOEXCL, html: C4_FB_HTML },
  { name: 'cfu-8 question', from: C8_Q_FROM, to: C8_Q_TO, html: C8_Q_HTML },
  { name: 'cfu-8 options', from: C8_OPTS_FROM, to: C8_OPTS_TO, toExclusive: true, html: C8_OPTS_HTML },
  { name: 'cfu-8 feedback', from: C8_FB_FROM, to: C8_FB_TO, toExclusive: C8_FB_TOEXCL, html: C8_FB_HTML },
  { name: 'cfu-10 options', from: C10_OPTS_FROM, to: C10_OPTS_TO, toExclusive: true, html: C10_OPTS_HTML },
  { name: 'cfu-10 feedback', from: C10_FB_FROM, to: C10_FB_TO, toExclusive: C10_FB_TOEXCL, html: C10_FB_HTML },
  { name: 'cfu-6 credited option', from: C6_OPT_FROM, html: C6_OPT_HTML },
  { name: 'cfu-6 feedback', from: C6_FB_FROM, html: C6_FB_HTML },
  { name: 'cfu-7 predict', from: C7_PRE_FROM, html: C7_PRE_HTML },
  { name: 'cfu-7 question', from: C7_Q_FROM, html: C7_Q_HTML },
  { name: 'cfu-7 feedback', from: C7_FB_FROM, html: C7_FB_HTML },

  //  ── second pass: the AP claims that re-promoted the enrichment ──────────
  { name: 'hero subtitle', from: HERO_FROM, html: HERO_HTML },
  { name: 'exam weight badge', from: WEIGHT_FROM, html: WEIGHT_HTML },
  { name: '1.2.2 root-cause callout', from: RC_FROM, html: RC_HTML },
  { name: '1.2.6 not-assessed banner', from: S6_FROM, html: S6_HTML },
  { name: '1.2.6 verdict chip, LinkedIn', from: V1_FROM, html: V1_HTML },
  { name: '1.2.6 verdict chip, Collection #1', from: V2_FROM, html: V2_HTML },
  { name: '1.2.6 verdict chip, M365', from: V3_FROM, html: V3_HTML },
  { name: '1.2.7 not-assessed banner', from: S7_FROM, html: S7_HTML },
  { name: '1.2.7 trap chip, offline brute force', from: T1_FROM, html: T1_HTML },
  { name: '1.2.7 trap chip, rainbow table', from: T2_FROM, html: T2_HTML },
  { name: '1.2.7 trap chip, spraying', from: T3_FROM, html: T3_HTML },
  { name: 'FAQ credential stuffing exam signal', from: FAQ2_FROM, html: FAQ2_HTML },
  { name: 'FAQ what the exam asks', from: FAQ5_FROM, html: FAQ5_HTML },
  { name: 'FAQPage structured data', from: LD_FROM, html: LD_HTML },
  { name: 'cfu-5 feedback', from: C5_FB_FROM, to: C5_FB_TO, toExclusive: C5_FB_TOEXCL, html: C5_FB_HTML },
  { name: 'cfu-7 step 2', from: Q7S2_FROM, html: Q7S2_HTML },
  { name: 'cfu-7 step 4', from: Q7S4_FROM, html: Q7S4_HTML },
  { name: 'cfu-7 step 5', from: Q7S5_FROM, html: Q7S5_HTML },
  { name: 'cfu-9 label', from: Q9_LBL_FROM, html: Q9_LBL_HTML },
  { name: 'cfu-9 predict', from: Q9_PRE_FROM, html: Q9_PRE_HTML },
  { name: 'cfu-9 prompt', from: Q9_PROMPT_FROM, html: Q9_PROMPT_HTML },
  { name: 'cfu-9 guidance', from: Q9_GUID_FROM, html: Q9_GUID_HTML },
  { name: 'cfu-9 model answer', from: Q9_MODEL_FROM, html: Q9_MODEL_HTML },
  { name: 'cfu-9 key concepts', from: Q9_KEY_FROM, html: Q9_KEY_HTML },
  { name: 'cfu-10 stem', from: Q10_STEM_FROM, html: Q10_STEM_HTML },
  { name: '1.2.4 dictionary exam cue', from: CUE_FROM, html: CUE_HTML },
  { name: 'Article structured data description', from: DESC_FROM, html: DESC_HTML },
  { name: 'visible EK code in worked-example answers', from: EK_FROM, html: EK_HTML },
  { name: 'visible EK code in the answer key', from: EK2_FROM, html: EK2_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
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
    let end;
    if (s.to === undefined) {
      end = start + from.length;
    } else {
      const to = lit(s.to);
      const at = body.indexOf(to, start + from.length);
      if (at < 0) throw new Error(`${s.name}: end anchor not found after start anchor`);
      end = s.toExclusive ? at : at + to.length;
    }
    return { name: s.name, start, end, html: lit(s.html), removed: end - start };
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
