'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBER TOPIC 1.1 EXERCISE 1: THE CED SPLICE TABLE
//
//  WHY THIS PAGE WAS NOT CAUGHT SOONER
//  The handoff's damage table rated it "low", 3 off-CED hits, and
//  tools/ap-cyber-ced/ced_audit.py reported it CLEAN. Both were measuring the
//  wrong region. This page renders all seven of its red flags out of a
//  JavaScript array, so every word a student reads lives inside a <script>
//  block, and the audit stripped script before counting the way you strip
//  markup. It was teaching Authority as a psychological tactic, which is EK
//  2.1.A.3 and belongs to Unit 2, in front of a live class. ced_audit.py now
//  scans prose, script and JSON-LD separately; that fix shipped alongside this.
//
//  WHAT IS WRONG, AND WHAT IS NOT
//  Five of the seven flags are correct and stay untouched. #2 (urgency) and #4
//  (intimidation) name both CED tactics accurately and are well written. #1,
//  #6 and #7 describe observable properties of the specimen rather than making
//  a tactic claim, which is what a CED scenario does. #1 names typosquatting,
//  which is not CED vocabulary, but it does so as an INDICATOR and not as
//  something to classify, and impersonation is genuine 1.1.C.1 language. Left
//  alone deliberately: the fix here is the two flags that teach off-CED
//  material as content, not a rewrite of a page that is mostly right.
//
//  Sibling of lib/cyber-u1-topic11-ced.js and the same contract: every anchor
//  must occur EXACTLY ONCE in the live body or the build aborts rather than
//  splicing at a guessed offset. Everything not named here survives byte for
//  byte, including the seven-flag widget, its scoring, and the activity nav.
//
//  HOUSE RULES: pure ASCII source, no em-dashes, no emoji in new copy. The
//  needles below carry the live page's smart quotes verbatim because they have
//  to match it; every replacement is plain ASCII.
//
//  Regenerate the sheet, never hand-edit it:
//    node scripts/cyber-u1-ex1-ced-csv.js out/ex1-topic11.csv
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cyber-unit-1-lesson-1-exercise-1';
const PAGE_ID = '131898998999';
const TITLE = 'AP Cybersecurity Unit 1 Lesson 1 Exercise 1';

// ── 1. Red Flag #5: Authority taught as a psychological tactic ──────────────
//  The label said "Psychological Tactic: Authority + Urgency combined". A
//  student who reads the 1.1 lesson (two tactics, named) and then does this
//  exercise is handed a third. The body does not support it either: what it
//  actually describes is a fabricated source used to reinforce urgency, which
//  is 1.1.B.3. The Unit 2 note follows the pattern already live on Exercise 2
//  and Lab 1, where naming a Unit 2 tactic and saying where it belongs is the
//  sanctioned use of an off-topic term.
const FLAG5_FROM = "title:'Red Flag #5: Fabricated Statistic to Add Pressure',";
const FLAG5_TO = "principle:'Psychological Tactic: Authority + Urgency combined'";
const FLAG5_HTML = "title:'Red Flag #5: Fabricated Statistic to Add Pressure',\n"
  + "      body:'This fake &ldquo;research&rdquo; claim exists to make the teacher feel they must respond quickly, so it is more time pressure rather than a second tactic. <strong>Google does not include research statistics in document-sharing notifications.</strong> When an email invents data to justify acting now, treat it as a major red flag. Inventing a credible-sounding source is impersonating an authority, which the CED does name, at 2.1.A.3 in Unit 2. Topic 1.1 names intimidation and urgency and nothing else.',\n"
  + "      principle:'Psychological Tactic: Urgency (1.1.A.2, mechanism 1.1.B.3)'";

// ── 2. Red Flag #3: the phishing / spear phishing distinction ───────────────
//  The observation is sound and stays: a bulk send cannot name the student. The
//  taxonomy lesson tacked onto the end of it does not. Neither term is in the
//  CED, and the 1.1 lesson now carries a banner two clicks away saying so, so
//  leaving this here would have the exercise contradict the lesson.
const FLAG3_FROM = "title:'Red Flag #3: No Specific Student Named',";
const FLAG3_TO = "principle:'Indicator: Lack of personalization (mass phishing)'";
const FLAG3_HTML = "title:'Red Flag #3: No Specific Student Named',\n"
  + "      body:'A legitimate Google Drive notification would include the specific student&rsquo;s name and the specific document title. This email says <strong>&ldquo;one of your students&rdquo;</strong>, which is vague and generic. A message sent in bulk to thousands of people cannot name any one of them, so the missing detail is itself the evidence. Note what the adversary does <em>not</em> have here: the personal information EK 1.1.C.1 describes, the kind that makes a follow-up message sound like it knows you.',\n"
  + "      principle:'Indicator: Sent in bulk, so no personal detail (contrast EK 1.1.C.1)'";

// ── 3. the JSON-LD description ─────────────────────────────────────────────
//  Search metadata rather than student-facing content, so it is the least
//  urgent of the three, but it advertises the page as covering two terms the
//  CED does not contain and the page no longer teaches.
const LD_FROM = '"description": "Practice identifying social engineering red flags in phishing emails, vishing calls, and smishing messages. AP Cybersecurity exam-level scenarios with instant feedback.",';
const LD_HTML = '"description": "Practice spotting social engineering red flags in a realistic email: the two tactics the AP Cybersecurity CED names at 1.1.A.2, intimidation and urgency, and the impact on the victim. Exam-level scenario with instant feedback.",';

const SPLICES = [
  { name: 'flag-5-authority', from: FLAG5_FROM, to: FLAG5_TO, html: FLAG5_HTML },
  { name: 'flag-3-spear-phishing', from: FLAG3_FROM, to: FLAG3_TO, html: FLAG3_HTML },
  { name: 'json-ld-description', from: LD_FROM, html: LD_HTML },
];

function indexOfUnique(body, anchor, label) {
  const first = body.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found: ${JSON.stringify(anchor.slice(0, 70))}`);
  if (body.indexOf(anchor, first + 1) >= 0) {
    throw new Error(`${label}: anchor is ambiguous, appears more than once: ${JSON.stringify(anchor.slice(0, 70))}`);
  }
  return first;
}

//  Resolve every splice against the ORIGINAL body, refuse overlaps, rebuild
//  left to right. Resolving against a partly rewritten body is how an anchor
//  silently lands in the wrong place.
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
    return { name: s.name, start, end, html: s.html, removed: end - start };
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
