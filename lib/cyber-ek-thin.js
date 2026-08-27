'use strict';
// -----------------------------------------------------------------------------
//  THIN THE EK CITATIONS OUT OF A STUDENT-FACING LESSON PAGE.
//
//  The rule, in full, is "Citing the CED to students" in
//  docs/ap-cyber-unit1-ced-realignment.md. Short version: the EK code is teacher
//  knowledge. Name the idea, not the code. A code survives only where it is
//  evidence for a claim (this is not assessed, that belongs to Unit 2), where a
//  teacher is meant to audit (the collapsed coverage table, the exit ticket
//  answer key), or as one orientation tag on a concept card.
//
//  lib/cyber-ek-density.js decides what is protected. This module does the
//  cutting.
//
//  ---- WHAT THIS COST TO GET RIGHT, SO NOBODY REDOES IT --------------------
//  Three approaches failed before this one, and each failure looked like
//  success because the citation count went down:
//
//  1. DELETING the code. "A birthdate is 1.1.C.1." became "A birthdate
//     applies." Eleven sentences like it. Count: perfect. Prose: broken.
//
//  2. SUBSTITUTING the name everywhere. Correct in predicate position, wrong in
//     subject position: "1.1.C.1 lists names, addresses" became "personal
//     information lists names, addresses", and "the mechanism 1.1.B.2
//     describes" became "the mechanism the intimidation mechanism describes".
//
//  3. Treating a code at the START of an element as prose. A table cell opening
//     "1.1.C.1 lists names" and an info box headed "EK 1.1.B.1" are LABELS.
//     Substituting inline gave "because it is not secret the CED lists names"
//     and an info box titled "The CED".
//
//  So the order below is load bearing: labels are dropped, subject position
//  becomes "the CED", predicate position becomes the name of the thing, and
//  only then the tidying. Every one of those cases was found by reading the
//  changed sentences, not by counting. If you change these rules, re-read the
//  diff sentence by sentence: a citation count of zero proves nothing about
//  whether the page still reads like English.
// -----------------------------------------------------------------------------

const ek = require('./cyber-ek-density');


const CODE = String.raw`(?:EK\s+)?\d\.\d\.[A-C](?:\.\d)?`;
const JOIN = String.raw`(?:\s*(?:,|and|through|to|with|mechanism|mechanisms|EK|see)\s*)`;
const CITE_PAREN = new RegExp(String.raw`\s*\((?:${CODE}|${JOIN})+\)`, 'g');

//  Apply fn only outside the protected spans, rebuilding left to right.
function outsideProtected(b, fn) {
  const spans = ek.protectedSpans(b).spans;
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    if (s.a < cursor) continue;
    out += fn(b.slice(cursor, s.a)) + b.slice(s.a, s.z);
    cursor = s.z;
  }
  return out + fn(b.slice(cursor));
}

const PROSE = [
  // A code sitting at the START of an element is a LABEL, not part of a
  // sentence: a table cell that opens "1.1.C.1 lists names, addresses...", an
  // info box headed "EK 1.1.B.1". Substituting "the CED" inline produced
  // "because it is not secret the CED lists names". Drop those outright.
  [/>(\s*)(?:EK )?\d\.\d\.[A-C](?:\.\d)?\s+(?=[A-Z(])/g, '>$1'],
  [/(<\/strong>\s*)(?:EK )?\d\.\d\.[A-C](?:\.\d)?\s+/g, '$1'],
  // ORDER MATTERS. A code in SUBJECT position becomes "the CED"; a code in
  // object or predicate position becomes the name of the thing. Doing only the
  // second produced "personal information lists names, addresses..." and
  // "Fear used to incite action is the mechanism the intimidation mechanism
  // describes." Both read as nonsense and both passed a code count.
  [/\b(?:EK )?\d\.\d\.[A-C](?:\.\d)? (lists|names|says|covers|describes|reserves|treats|defines|explains|gives|adds|recommends|states|means|asks)\b/g,
   'the CED $1'],
  [/\b(?:EK )?\d\.\d\.[A-C](?:\.\d)? is explicit\b/g, 'the CED is explicit'],
  [/\b(?:EK )?\d\.\d\.[A-C](?:\.\d)? (?:explicitly )?covers\b/g, 'the CED covers'],
  [/\bis the mechanism (?:EK )?\d\.\d\.[A-C](?:\.\d)? describes\b/g, 'is the mechanism the CED describes'],

  // now the names, in object or predicate position
  [/\ba \d\.\d\.[A-C]\.\d impact\b/g, 'that impact'],
  [/\b1\.1\.C\.1 detail\b/g, 'that kind of detail'],
  [/\b1\.1\.C\.1 material\b/g, 'exactly that material'],
  [/\bIs 1\.1\.C\.3 also in play\b/g, 'Is that impact also in play'],
  [/\b1\.1\.C\.1\b/g, 'personal information'],
  [/\b1\.1\.C\.2\b/g, 'secure information'],
  [/\b1\.1\.C\.3\b/g, 'malware or a malicious link'],
  [/\b1\.1\.B\.2\b/g, 'the intimidation mechanism'],
  [/\b1\.1\.B\.3\b/g, 'the urgency mechanism'],

  // sentence-level forms
  [/\bEK \d\.\d\.[A-C](?:\.\d)? is\b/g, 'the CED is'],
  [/\bunder (?:the )?\d\.\d\.[A-C](?:\.\d)? definition\b/g, 'under that definition'],
  [/\bunder (?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g, 'under the CED definition'],
  [/\bthe three \d\.\d\.[A-C] impact categories\b/g, 'the three impact categories'],
  [/\bthe \d\.\d\.[A-C] impact category\b/g, 'the impact category'],
  [/\bWhich \d\.\d\.[A-C] impact category\b/g, 'Which impact category'],
  [/\bLearning objective \d\.\d\.[A-C] asks\b/g, 'This topic asks'],
  [/\bthe three impacts in \d\.\d\.[A-C]\b/g, 'the three impacts'],
  [/\bno \d\.\d\.[A-C] impact\b/g, 'no listed impact'],
  [/\bnone of the three in \d\.\d\.[A-C]\b/g, 'none of the three'],
  [/\bSomething outside \d\.\d\.[A-C],/g, 'Something outside the three,'],
  [/\bscenario into \d\.\d\.[A-C]\b/g, 'scenario into one of them'],
  [/\bthe two axes in EK \d\.\d\.[A-C](?:\.\d)? and EK \d\.\d\.[A-C]\b/g, 'the two axes'],
  [/\ba tactic from \d\.\d\.[A-C](?:\.\d)?\b/g, 'a named tactic'],
  [/\bthe two given in EK \d\.\d\.[A-C](?:\.\d)?\b/g, 'the two it names'],
  [/\bthe CED’s term in EK \d\.\d\.[A-C](?:\.\d)?\b/g, 'the CED’s term'],
  [/\bin EK \d\.\d\.[A-C](?:\.\d)? where\b/g, 'where'],
  [/\band in EK \d\.\d\.[A-C](?:\.\d)? on\b/g, 'and on'],
  [/\btactics than the two it names\b/g, 'tactics than the two it names'],
  [/\bbecause \d\.\d\.[A-C](?:\.\d)? the CED says\b/g, 'because the CED says'],
  [/\bwhy \d\.\d\.[A-C](?:\.\d)? the CED says\b/g, 'why the CED says'],
  [/\bin \d\.\d\.[A-C](?:\.\d)?\b/g, 'in the framework'],
  [/\b\d\.\d\.[A-C](?:\.\d)?, since the CED says\b/g, 'no named tactic, since the CED says'],
  [/\bEK \d\.\d\.[A-C](?:\.\d)?\b/g, 'the CED'],

  // tidy up
  [/\b(personal information|secure information|malware or a malicious link), \1\b/gi, '$1'],
  [/\bimpact (personal information|secure information|malware or a malicious link)\b/g, 'impact: $1'],
  [/\ba malware or a malicious link impact\b/g, 'a malware impact'],
  [/\bthe route to that impact\b/g, 'the route to a malware impact'],
  [/\bwhich [Tt]he CED\b/g, 'which the CED'],
  [/([.:!?]\s+|^|<\/strong>\s*)the CED\b/g, '$1The CED'],
  [/\bin the framework with two separate mechanisms in the framework and the urgency mechanism\b/g,
   'with two separate mechanisms'],
  [/\bthe two tactics the CED lists in the framework\b/g, 'the two tactics the CED lists'],
  [/\btactics in the framework is present\b/g, 'named tactics is present'],
  [/\bSecure information in the framework means\b/g, 'Secure information means'],
  [/\bbecause a password is secure information\b/g, 'because a password is a secret'],
  [/\bunder secure information the CED names\b/g, 'under secure information: the CED names'],
  [/\bnot secret the CED lists names\b/g, 'not secret The CED lists names'],
  // residue from the substitutions, each found by reading the changed sentences
  [/\bImpact: malware, malware or a malicious link\b/g, 'Impact: malware'],
  [/\bLearning objective the CED asks\b/g, 'This topic asks'],
  [/\bSecure information in the CED means\b/g, 'Secure information means'],
  [/\bis exactly that material gathered earlier\b/g, 'is the kind of detail gathered earlier'],
  [/\bUnder 1\.1\.A\.1 this is\b/g, 'Under that definition this is'],
  [/\(1\.1\.A\.2, with mechanisms in the intimidation mechanism and the urgency mechanism\)/g, ''],
  [/\bthe two axes\.\s*A scenario/g, 'the two axes. A scenario'],
  // capitalise a sentence that now begins with "the CED", including after a
  // tag boundary rather than only after a full stop
  [/(^|[.:!?]\s+|>\s*|<\/strong>\s+)the CED\b/g, '$1The CED'],
  // The one label the substitution left meaningless: an info box headed
  // "EK 1.1.B.1" became one headed "The CED", which says nothing. Give it the
  // heading it should have had.
  [/<span class="box-label">The CED<\/span>/g, '<span class="box-label">Why the tactics work</span>'],
  // Short-form codes the counter never saw: "split C.1 from C.2" is still a
  // citation to a student, it just does not match a \d.\d.[A-C] pattern.
  [/\bsplit C\.1 from C\.2\b/g, 'tell the two apart'],
  [/\bC\.1 versus C\.2\b/g, 'one from the other'],
];

function thin(body) {
  //  1. citation-only parentheticals
  let b = outsideProtected(body, (chunk) => chunk.replace(CITE_PAREN, ''));

  //  2. the quick-reference CED column, dropped whole rather than per cell
  b = b
    .replace(/<th>CED reference<\/th>\n/g, '')
    .replace(/<td>(?:EK\s+)?\d\.\d\.[A-C](?:\.\d)?(?:[^<]*?)<\/td>\n<\/tr>/g, '</tr>')
    .replace(/<td>1\.1\.A\.1, since 1\.1\.A\.2 says <em>often<\/em><\/td>\n<\/tr>/g, '</tr>')
    .replace(/<td>Outside 1\.1\.C<\/td>\n<\/tr>/g, '</tr>');

  //  3. the sort widget. data-bucket, data-correct and the visible label must
  //     move together or the grader marks every card wrong.
  b = b
    .replace(/Personal info 1\.1\.C\.1/g, 'Personal information')
    .replace(/Secure info 1\.1\.C\.2/g, 'Secure information')
    .replace(/Malware or link 1\.1\.C\.3/g, 'Malware or a malicious link')
    .replace(/<span class="sort-bucket-label">Personal information \(1\.1\.C\.1\)<\/span>/g,
             '<span class="sort-bucket-label">Personal information</span>')
    .replace(/<span class="sort-bucket-label">Secure information \(1\.1\.C\.2\)<\/span>/g,
             '<span class="sort-bucket-label">Secure information</span>')
    .replace(/<span class="sort-bucket-label">Malware or malicious link \(1\.1\.C\.3\)<\/span>/g,
             '<span class="sort-bucket-label">Malware or a malicious link</span>')
    //  The visible label and the data-bucket value are both shown to a student:
    //  the label on the bucket, the bucket name in the "-> correct bucket" note
    //  on a wrong card. They have to read the same.
    .replace(/<span class="sort-bucket-label">Malware or malicious link<\/span>/g,
             '<span class="sort-bucket-label">Malware or a malicious link</span>');

  //  4. prose
  b = outsideProtected(b, (chunk) => {
    let c = chunk;
    for (const [rx, rep] of PROSE) c = c.replace(rx, rep);
    return c;
  });
  return b;
}

module.exports = { thin, outsideProtected, CITE_PAREN, PROSE };
