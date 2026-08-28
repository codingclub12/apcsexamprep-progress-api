'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TOPIC 1.3: STOP SAYING "THE CED" TO STUDENTS
//
//  The rule, in Tanner's words: mention where a topic fits when it starts, do
//  not lean on it in the middle of the content. Seventeen mentions are painted
//  on this page and every one is inside the teaching. Nine EK codes are painted
//  too, and the house rule allows codes only in the collapsed table a teacher
//  audits.
//
//  ── NOTHING IS ADDED ────────────────────────────────────────────────────────
//  The framing mention already exists in the right place: the accordion header
//  "College Board Essential Knowledge Coverage", above the first lesson
//  section. A student who wants to know where this fits opens it.
//
//  ── WHY THE EK CODES NEEDED A SPLICE RATHER THAN THE THINNER ───────────────
//  lib/cyber-ek-thin.js is a no-op on this page now: it already ran, and its
//  output is what is live. What survives is what it is not allowed to touch.
//  Six of the nine painted codes are the chips on the attack and protection
//  cards, and the other three are in the exit ticket's answer block, and
//  cyber-ek-density.protectedSpans marks all of them protected.
//
//  That protection was added on purpose, to stop an earlier version of the
//  thinner stripping this page's six bare-code chips by matching them on a
//  prefix. It stops the tool mangling them. It was never a decision that a
//  student should see them, and the house rule says a code lives in the
//  collapsed coverage table or nowhere.
//
//  So they are handled here, as page-level splices, rather than by loosening a
//  shared protection that exists for a good reason. The decision is visible in
//  one module instead of buried in a regex that four other pages also run.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy.
//
//    node scripts/cyber-thin-csv.js cyber-u1-topic13-thin out/topic13-thin.csv --show-changes
// ─────────────────────────────────────────────────────────────────────────────

const HANDLE = 'ap-cybersecurity-unit-1-wireless-security';
const PAGE_ID = '132230447319';
const TITLE = 'AP Cybersecurity 1.3: Wireless Network Security';

// ── the objectives ───────────────────────────────────────────────────────────
const O1_FROM = 'Apply the three CED individual protections (verify SSID, avoid open networks, use VPN) to wireless threat scenarios';
const O1_HTML = 'Apply the three individual protections (verify the SSID, avoid open networks, use a VPN) to wireless threat scenarios';

const O2_FROM = 'Analyze a wireless attack scenario and select the correct defense using the CED framework';
const O2_HTML = 'Analyze a wireless attack scenario and select the defense that actually answers it';

// ── section 1.3.2, adversary classification ──────────────────────────────────
const A1_FROM = 'The CED classifies adversaries along two dimensions: <strong>skill level</strong> and <strong>motivation</strong>.';
const A1_HTML = 'Adversaries are classified along two dimensions: <strong>skill level</strong> and <strong>motivation</strong>.';

const A2_FROM = 'The CED identifies six motivations adversaries may have:';
const A2_HTML = 'There are six motivations an adversary may have:';

//  A distractor in cfu-1. Its data-val is untouched; only the label changes.
const A3_FROM = 'which are a separate classification from the CED adversary types.';
const A3_HTML = 'which are a separate classification from the adversary types above.';

// ── section 1.3.3, the three attacks ─────────────────────────────────────────
const B1_FROM = 'The CED identifies three attacks you must know precisely.';
const B1_HTML = 'Three attacks matter here, and it is worth being able to tell them apart precisely.';

const B2_FROM = '<strong>CED Scenario 1C:</strong> You&rsquo;re at Sunshine Coffee.';
const B2_HTML = '<strong>Scenario:</strong> You&rsquo;re at Sunshine Coffee.';

const B3_FROM = 'In the CED scenario, the adversary named it &ldquo;Sunshine Wi-Fi&rdquo; when the real network was &ldquo;Guest Wi-Fi.&rdquo;';
const B3_HTML = 'In the scenario above, the adversary named it &ldquo;Sunshine Wi-Fi&rdquo; when the real network was &ldquo;Guest Wi-Fi.&rdquo;';

const B4_FROM = 'In the CED scenario: the adversary logs in as the victim,';
const B4_HTML = 'In the scenario above: the adversary logs in as the victim,';

const B5_FROM = 'This is why the CED warns against joining <em>unprotected</em> networks:';
const B5_HTML = 'This is why the advice is to avoid joining <em>unprotected</em> networks:';

// ── section 1.3.5, the protections ───────────────────────────────────────────
const C1_FROM = 'Note the CED&rsquo;s careful phrasing: &ldquo;not immediately readable.&rdquo;';
const C1_HTML = 'Note the careful phrasing: &ldquo;not immediately readable.&rdquo;';

const C2_FROM = 'best</strong> explains why Mariana&rsquo;s actions demonstrate all three CED individual protections?';
const C2_HTML = 'best</strong> explains why Mariana&rsquo;s actions demonstrate all three individual protections?';

const C3_FROM = 'Makes intercepted data &ldquo;not immediately readable&rdquo; (CED phrasing)';
const C3_HTML = 'Makes intercepted data &ldquo;not immediately readable&rdquo;';

const C4_FROM = 'The CED uses the phrase &ldquo;not immediately readable&rdquo; &mdash; meaning decryption is impractical';
const C4_HTML = 'The phrase that matters is &ldquo;not immediately readable&rdquo;, meaning decryption is impractical';

// ── the exit ticket ──────────────────────────────────────────────────────────
const X1_FROM = 'Name all three wireless attack types the CED requires, classify each by CIA property violated';
const X1_HTML = 'Name all three wireless attack types, classify each by CIA property violated';

const X2_FROM = 'Is this true or false? Explain why using the CED framework.';
const X2_HTML = 'Is this true or false, and why?';

const X3_FROM = 'Apply all three CED individual protections to this scenario:';
const X3_HTML = 'Apply all three individual protections to this scenario:';

// ── the six card chips ───────────────────────────────────────────────────────
//  The chip is a small label before the card title. With the code gone there is
//  nothing left for it to say that the title does not already say, so the span
//  goes rather than being filled with a synonym of the heading beside it.
const T1_FROM = '<div class="atk-name">\n<span class="atk-tag">1.3.B.1</span>Evil Twin Attack</div>';
const T1_HTML = '<div class="atk-name">Evil Twin Attack</div>';
const T2_FROM = '<div class="atk-name">\n<span class="atk-tag">1.3.B.2</span>Jamming Attack</div>';
const T2_HTML = '<div class="atk-name">Jamming Attack</div>';
const T3_FROM = '<div class="atk-name">\n<span class="atk-tag">1.3.B.3</span>War Driving</div>';
const T3_HTML = '<div class="atk-name">War Driving</div>';
const T4_FROM = '<div class="atk-name">\n<span class="atk-tag">1.3.C.1</span>Verify the Network Name Exactly</div>';
const T4_HTML = '<div class="atk-name">Verify the Network Name Exactly</div>';
const T5_FROM = '<div class="atk-name">\n<span class="atk-tag">1.3.C.2</span>Avoid Unprotected Networks</div>';
const T5_HTML = '<div class="atk-name">Avoid Unprotected Networks</div>';
const T6_FROM = '<div class="atk-name">\n<span class="atk-tag">1.3.C.3</span>Use a VPN</div>';
const T6_HTML = '<div class="atk-name">Use a VPN</div>';

// ── the three codes in the exit ticket's answers ─────────────────────────────
const XA_FROM = '(5) Ask barista for exact network name (1.3.C.1); connect only to the password-protected network, avoid any open networks (1.3.C.2); activate VPN before opening the bank site (1.3.C.3).';
const XA_HTML = '(5) Ask the barista for the exact network name and match it character for character; connect only to the password-protected network and avoid any open one; turn the VPN on before opening the bank site. That is all three protections, in the order you would actually do them.';

const SPLICES = [
  { name: 'objective: three protections', from: O1_FROM, html: O1_HTML },
  { name: 'objective: select the defense', from: O2_FROM, html: O2_HTML },
  { name: '1.3.2 adversary dimensions', from: A1_FROM, html: A1_HTML },
  { name: '1.3.2 six motivations', from: A2_FROM, html: A2_HTML },
  { name: 'cfu-1 distractor label', from: A3_FROM, html: A3_HTML },
  { name: '1.3.3 three attacks', from: B1_FROM, html: B1_HTML },
  { name: 'evil twin scenario label', from: B2_FROM, html: B2_HTML },
  { name: 'walkthrough step 1', from: B3_FROM, html: B3_HTML },
  { name: 'walkthrough step 4', from: B4_FROM, html: B4_HTML },
  { name: 'why open networks', from: B5_FROM, html: B5_HTML },
  { name: 'VPN careful phrasing', from: C1_FROM, html: C1_HTML },
  { name: 'cfu-10 question', from: C2_FROM, html: C2_HTML },
  { name: 'vocabulary VPN row', from: C3_FROM, html: C3_HTML },
  { name: 'VPN explanation', from: C4_FROM, html: C4_HTML },
  { name: 'exit ticket q2', from: X1_FROM, html: X1_HTML },
  { name: 'exit ticket q4', from: X2_FROM, html: X2_HTML },
  { name: 'exit ticket q5', from: X3_FROM, html: X3_HTML },
  { name: 'card chip: evil twin', from: T1_FROM, html: T1_HTML },
  { name: 'card chip: jamming', from: T2_FROM, html: T2_HTML },
  { name: 'card chip: war driving', from: T3_FROM, html: T3_HTML },
  { name: 'card chip: verify SSID', from: T4_FROM, html: T4_HTML },
  { name: 'card chip: avoid open', from: T5_FROM, html: T5_HTML },
  { name: 'card chip: use a VPN', from: T6_FROM, html: T6_HTML },
  { name: 'exit ticket answer 5', from: XA_FROM, html: XA_HTML },
];

//  Shopify decodes entities on save, so an anchor has to match the live bytes.
//  &amp; is deliberately absent: a real escaped ampersand stays &amp; in source.
const LITERAL = {
  '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&hellip;': '…',
  '&bull;': '•', '&#9998;': '✎',
};
const lit = (s) => s.replace(/&(?:rsquo|lsquo|rdquo|ldquo|mdash|ndash|rarr|hellip|bull|#9998);/g,
  (m) => LITERAL[m]);

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
