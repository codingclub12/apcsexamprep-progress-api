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
    Do not spend revision time memorising it.</p>
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
        <td>Three shapes worth recognising in your own passwords: a word or two followed by <strong>two digits and a special character at the end</strong>, a <strong>pet or family name</strong>, and a <strong>date that matters to you</strong>. All three feel personal, and that is exactly why they are guessable.</td>
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
        <td>Three, and they are worth memorising as a set: <strong>many failed attempts in a short time</strong>, a login at an <strong>unusual hour</strong>, and a login from a <strong>device that has not been seen before</strong>. Any one of them is a reason to look.</td>
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
      sections for understanding, not for revision.</p>
    </div>
  </div>
`;

const SPLICES = [
  { name: '1.2.3 vocabulary table', from: VOCAB_FROM, to: VOCAB_TO, html: VOCAB_HTML },
  { name: '1.2.5 not-assessed banner', from: S5_FROM, html: S5_HTML },
  { name: '1.2.9 exam strategy', from: S9_FROM, to: S9_TO, toExclusive: S9_TOEXCL, html: S9_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip);/g, (m) => LITERAL[m]);

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
