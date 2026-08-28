'use strict';
// -----------------------------------------------------------------------------
//  AP CYBERSECURITY TOPIC 3.2: AUTHOR THE CONTENT THE PAGE ALREADY CLAIMS.
//
//  ---- WHAT WAS WRONG -------------------------------------------------------
//  The 2026-08-27 renumbering moved this body from lesson-6 to lesson-3 and gave
//  it the id 3.2, which is correct: the CED's Topic 3.2 is "Protecting Networks:
//  Managerial Controls", and nothing else in Unit 3 was closer. What it could
//  not do is make the body teach that topic.
//
//  So the page shipped with a collapsed Essential Knowledge table listing all
//  eight of 3.2's EKs against "Section 2 - Network Security Policies" and
//  "Section 3 - Wireless Security Controls", and neither section existed. The
//  table was not describing the page; it was describing a page someone intended
//  to write. A student following it found TLS, SSH, DNSSEC and PKI, which is
//  good material for a different topic.
//
//  This module writes the two missing sections, and the three around them that
//  make them teachable, so the table stops being a promise.
//
//  ---- WHAT IT DOES ---------------------------------------------------------
//    1. Hero, JSON-LD and objectives renamed off "Secure Network Protocols".
//       The page <title> already read "Network Security Policies & Wireless";
//       only the H1 disagreed, and it had disagreed since the renumbering.
//    2. Five new sections, 3.2.1 to 3.2.5, covering 3.2.A.1 through 3.2.B.4.
//       They go FIRST because they are the topic.
//    3. The five protocol sections renumber to 3.2.6 to 3.2.10 and pick up a
//       banner saying what they are. Nothing is deleted: the material is good
//       and Unit 3 has no better home for it.
//    4. Five new checks on the core, numbered 1 to 5. The ten protocol checks
//       shift to 6 to 15 and their counters follow. Answer keys do not move.
//    5. The coverage table's "Covered In" column points at sections that exist.
//    6. Nine EK codes come out of student-visible prose, per the house rule.
//    7. The footer nav, still pointing at lesson-6's neighbours, is repointed.
//
//  ---- WHAT IT DOES NOT DO --------------------------------------------------
//  The four activity pages (exercise-1, exercise-2, lab, quiz) moved with this
//  body and still teach protocols end to end: "Secure Protocol Analysis",
//  "Protocol Migration Planning", "Operation Cipher Sweep", and a quiz headed
//  "Secure Network Protocols". All four report as lesson 3.2. Realigning them
//  is a bigger job than this one and is deliberately not folded in; see the run
//  note. This pass makes the LESSON teach its topic.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy, and no EK
//  codes anywhere a student reads. Codes live in the collapsed coverage table,
//  which exists to be audited, and nowhere else on the page.
//
//    node scripts/cyber-u3-topic32-ced-csv.js out/topic32.csv --show-changes
// -----------------------------------------------------------------------------

const HANDLE = 'ap-cyber-unit-3-lesson-3';
const PAGE_ID = '132524769495';
const TITLE = 'AP Cybersecurity 3.2: Network Security Policies & Wireless';

//  The page's own inline idiom, lifted verbatim so new sections are
//  indistinguishable from old ones. Every rule carries !important because the
//  storefront theme outranks the page otherwise.
const H2 = 'font-size:21px!important;font-weight:700!important;color:#1E1B4B!important;'
  + '-webkit-text-fill-color:#1E1B4B!important;margin:32px 0 12px!important;'
  + 'border-bottom:2px solid #EDE9FE!important;padding-bottom:8px!important;'
  + 'font-family:Georgia,serif!important;';
const H3 = 'font-size:16px!important;font-weight:700!important;color:#6B21A8!important;'
  + '-webkit-text-fill-color:#6B21A8!important;margin:20px 0 10px!important;'
  + 'font-family:Georgia,serif!important;';
const P = 'font-size:15px!important;color:#1E1B4B!important;'
  + '-webkit-text-fill-color:#1E1B4B!important;margin:0 0 16px!important;'
  + 'font-family:Georgia,serif!important;line-height:1.7!important;';
const PANEL = 'background:#F9FAFB!important;border:1px solid #E5E7EB!important;'
  + 'border-radius:10px!important;padding:20px 24px!important;margin:0 0 20px!important;'
  + 'font-family:Georgia,serif!important;';
const TRAP = 'background:#FEF2F2!important;border-left:4px solid #EF4444!important;'
  + 'padding:16px 20px!important;border-radius:0 8px 8px 0!important;margin:0 0 20px!important;'
  + 'font-family:Georgia,serif!important;';
const TRAP_H = 'font-weight:700!important;color:#EF4444!important;'
  + '-webkit-text-fill-color:#EF4444!important;margin:0 0 6px!important;font-size:14px!important;';
const TRAP_P = 'font-size:14px!important;color:#1E1B4B!important;'
  + '-webkit-text-fill-color:#1E1B4B!important;margin:0!important;';
const NOTE = 'background:#F5F0FF!important;border-left:4px solid #6B21A8!important;'
  + 'padding:16px 20px!important;border-radius:0 8px 8px 0!important;margin:0 0 20px!important;'
  + 'font-family:Georgia,serif!important;';
const NOTE_H = 'font-weight:700!important;color:#6B21A8!important;'
  + '-webkit-text-fill-color:#6B21A8!important;margin:0 0 6px!important;font-size:14px!important;';

//  The page's existing headings separate number from title with an em-dash.
//  New copy may not contain one (house rule), but a RENUMBER has to reproduce
//  the separator it found, so it is named here rather than typed into a string.
const DASH = '\u2014';

const sec = (n, heading, inner) => `<div class="lesson-section" style="padding:0 4px!important;">
<h2 style="${H2}">3.2.${n}: ${heading}</h2>
${inner}
</div>
`;

// ---- 3.2.1 what a managerial control is -------------------------------------
//  The framing section. Without it the next four read as four unrelated
//  checklists, which is how students end up memorising bullets and being unable
//  to say why a policy exists at all.
const SEC1 = sec(1, 'Policy Comes Before Configuration', `
<p style="${P}">A <strong>managerial control</strong> is a written rule about how something must be built or used. It is not a setting on a device. It is the document that says what every device of that kind has to look like before it is allowed on the network.</p>

<p style="${P}">The distinction matters because configuration without policy does not survive contact with an organization. One administrator hardens a router carefully. A second administrator, six months later, adds a router and does what seems reasonable at the time. Neither of them did anything wrong, and the network now has two different security postures. A policy is what makes the second router match the first one, and what makes an auditor able to tell whether it does.</p>

<div style="${PANEL}">
<h3 style="${H3}">The four policies in this topic</h3>
<div style="display:grid!important;grid-template-columns:1fr!important;gap:10px!important;font-size:14px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;">
<div style="background:#EDE9FE!important;padding:10px 14px!important;border-radius:6px!important;"><strong>Router security policy</strong> sets the minimum configuration standard for routers on the network.</div>
<div style="background:#EDE9FE!important;padding:10px 14px!important;border-radius:6px!important;"><strong>Switch security policy</strong> sets the minimum configuration standard for switches.</div>
<div style="background:#EDE9FE!important;padding:10px 14px!important;border-radius:6px!important;"><strong>VPN policy</strong> sets the minimum security requirements for employees reaching the internal network from outside it.</div>
<div style="background:#EDE9FE!important;padding:10px 14px!important;border-radius:6px!important;"><strong>Wireless security policy</strong> sets the minimum security requirements for the organization's wireless networks.</div>
</div>
</div>

<p style="${P}">All four share a phrase worth reading carefully: a policy sets a <strong>minimum</strong> standard and <strong>may include</strong> a given requirement. A policy is a floor, not a ceiling. An organization is free to require more than the list; what it may not do is require less.</p>

<div style="${NOTE}">
<p style="${NOTE_H}">&#9733; The pattern to carry through this topic</p>
<p style="${TRAP_P}">Three of the four policies say the same thing in different words: <strong>stop trusting the device to decide who you are</strong>. Routers and switches ban local accounts, wireless requires authentication against an approved server, and the VPN requires keys or multifactor authentication. Identity is checked centrally, or it is not really checked.</p>
</div>
`);

// ---- 3.2.2 router and switch ------------------------------------------------
const SEC2 = sec(2, 'Router and Switch Security Policies', `
<p style="${P}">Routers and switches are the devices that move traffic. An adversary who controls one of them does not need to break anything else: they can read traffic, redirect it, or quietly let themselves back in later. Both policies are built around that fact, and they overlap more than they differ.</p>

<h3 style="${H3}">Router security policy</h3>
<p style="${P}">A router security policy sets a minimum configuration standard for every router on the organization's network, and it may include:</p>
<ul style="font-size:15px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;line-height:1.9!important;margin:0 0 16px!important;padding-left:22px!important;font-family:Georgia,serif!important;">
<li><strong>Banning local user accounts.</strong> All router logins must go through an approved authentication server. A local account lives on the box, so it does not disappear when the person who used it leaves, it does not show up in central logs, and it is the account everyone shares because it is easier.</li>
<li><strong>Disabling unnecessary services,</strong> such as Telnet. Every service left running is another way in and another thing to patch. Telnet is the standing example because it carries credentials in plaintext, so anyone positioned to watch the traffic gets the password.</li>
<li><strong>Requiring a firewall.</strong> The organization may decide to use a firewall device separate from the router rather than the router's own filtering.</li>
</ul>

<h3 style="${H3}">Switch security policy</h3>
<p style="${P}">A switch security policy sets a minimum configuration standard for every switch, and it may include:</p>
<ul style="font-size:15px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;line-height:1.9!important;margin:0 0 16px!important;padding-left:22px!important;font-family:Georgia,serif!important;">
<li><strong>Banning local user accounts.</strong> Same requirement, same reason: switch logins go through an approved authentication server.</li>
<li><strong>Requiring port security to be enabled.</strong> Port security limits which devices, and how many, may use a physical switch port. A port expecting one workstation should not silently accept a hub with six unknown machines behind it.</li>
<li><strong>Using MAC filtering,</strong> so the switch forwards traffic only for hardware addresses the organization expects.</li>
</ul>

<div style="${PANEL}">
<h3 style="${H3}">What is shared and what is not</h3>
<div style="display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px 16px!important;align-items:start!important;font-size:14px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;">
<div style="font-weight:700!important;color:#6B21A8!important;-webkit-text-fill-color:#6B21A8!important;">Router policy</div>
<div style="font-weight:700!important;color:#6B21A8!important;-webkit-text-fill-color:#6B21A8!important;">Switch policy</div>
<div style="background:#DCFCE7!important;padding:8px 12px!important;border-radius:6px!important;">Ban local user accounts</div>
<div style="background:#DCFCE7!important;padding:8px 12px!important;border-radius:6px!important;">Ban local user accounts</div>
<div style="background:#EDE9FE!important;padding:8px 12px!important;border-radius:6px!important;">Disable unnecessary services (for example Telnet)</div>
<div style="background:#F3F4F6!important;padding:8px 12px!important;border-radius:6px!important;">Require port security enabled</div>
<div style="background:#EDE9FE!important;padding:8px 12px!important;border-radius:6px!important;">Require a firewall, which may be a separate device</div>
<div style="background:#F3F4F6!important;padding:8px 12px!important;border-radius:6px!important;">Use MAC filtering</div>
</div>
<p style="font-size:13px!important;color:#6B7280!important;-webkit-text-fill-color:#6B7280!important;margin:12px 0 0!important;font-family:Georgia,serif!important;">Green is the requirement both policies make. It is the one to remember first, because a question that swaps router for switch is testing whether you know which requirements are specific.</p>
</div>

<div style="${TRAP}">
<p style="${TRAP_H}">&#9888; Exam Trap</p>
<p style="${TRAP_P}">Port security and MAC filtering are switch policy requirements, not router ones. Disabling unnecessary services and requiring a firewall are router policy requirements. Banning local user accounts is the requirement that appears in both, so it is never the answer to "which of these is unique to the switch policy".</p>
</div>
`);

// ---- 3.2.3 VPN ---------------------------------------------------------------
//  Split tunneling gets a diagram rather than a definition. Students reliably
//  repeat the phrase and cannot say what leaks, which is the only part a
//  scenario question can test.
const SEC3 = sec(3, 'VPN Policy', `
<p style="${P}">A <strong>virtual private network</strong> lets an employee outside the building reach the internal network as though they were inside it. That is useful and it is also a hole in the perimeter, so the VPN policy details the minimum security requirements for using one. It may include:</p>

<ul style="font-size:15px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;line-height:1.9!important;margin:0 0 16px!important;padding-left:22px!important;font-family:Georgia,serif!important;">
<li><strong>A list of roles allowed to use the VPN.</strong> Access is granted to roles that need it, not to everyone with a login. A policy that lets the whole organization in has not reduced anything.</li>
<li><strong>Authentication requirements,</strong> such as a public and private key system, or multifactor authentication. A password alone is not enough to open a door this wide.</li>
<li><strong>A prohibition against split tunneling,</strong> which is also called dual tunneling.</li>
</ul>

<div style="${PANEL}">
<h3 style="${H3}">What split tunneling actually does</h3>
<p style="font-size:14px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;margin:0 0 14px!important;font-family:Georgia,serif!important;line-height:1.7!important;">With split tunneling on, the laptop keeps two paths open at once. Traffic for the organization goes through the encrypted tunnel and gets inspected. Everything else goes straight out to the internet and is inspected by nobody.</p>
<div style="display:grid!important;grid-template-columns:1fr auto 1fr!important;gap:10px 14px!important;align-items:center!important;font-size:14px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;">
<div style="font-weight:700!important;color:#EF4444!important;-webkit-text-fill-color:#EF4444!important;">Split tunneling (prohibited)</div>
<div></div>
<div style="font-weight:700!important;color:#22C55E!important;-webkit-text-fill-color:#22C55E!important;">Full tunneling (required)</div>
<div style="background:#FEE2E2!important;padding:8px 12px!important;border-radius:6px!important;">Work traffic through the tunnel, inspected</div>
<div>&#8596;</div>
<div style="background:#DCFCE7!important;padding:8px 12px!important;border-radius:6px!important;">Work traffic through the tunnel, inspected</div>
<div style="background:#FEE2E2!important;padding:8px 12px!important;border-radius:6px!important;">Everything else direct to the internet, <strong>not inspected</strong></div>
<div>&#8596;</div>
<div style="background:#DCFCE7!important;padding:8px 12px!important;border-radius:6px!important;">Everything else also through the tunnel, inspected</div>
</div>
<p style="font-size:13px!important;color:#6B7280!important;-webkit-text-fill-color:#6B7280!important;margin:12px 0 0!important;font-family:Georgia,serif!important;">The risk is not that the direct traffic is sensitive. It is that the direct path is a route into a machine that is simultaneously connected to the internal network, and the organization cannot see it.</p>
</div>

<p style="${P}">Organizations turn split tunneling on for a mundane reason: sending every employee's video calls and software updates through headquarters is expensive and slow. That is a real cost, and it is why the prohibition has to be written down rather than left to judgement.</p>

<div style="${TRAP}">
<p style="${TRAP_H}">&#9888; Exam Trap</p>
<p style="${TRAP_P}">Split tunneling is not an attack and it is not malware. It is a configuration choice an organization makes on purpose, and the policy requirement is that it be prohibited. If a scenario says a VPN permits split tunneling, the finding is a policy violation, not an intrusion.</p>
</div>
`);

// ---- 3.2.4 wireless policy ---------------------------------------------------
const SEC4 = sec(4, 'Wireless Security Policy', `
<p style="${P}">Wired networks have a physical control built in: to plug into a switch, you have to be in the building. Wireless removes it. The signal goes through walls and does not stop at the property line, so anyone within range is already as close to the network as an employee at a desk. The wireless security policy establishes the minimum requirements that replace the lock on the door, and it may include:</p>

<ul style="font-size:15px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;line-height:1.9!important;margin:0 0 16px!important;padding-left:22px!important;font-family:Georgia,serif!important;">
<li><strong>Requiring users to authenticate through an extensible authentication protocol</strong> connected to an approved authentication server. This is the same central-identity requirement the router and switch policies make, applied to the people joining the network rather than the staff administering it. A single shared wireless password identifies nobody.</li>
<li><strong>Requiring all wireless traffic to be encrypted using AES encryption with a minimum key length.</strong> The policy names the algorithm and it names a floor for the key length, because "encrypted" on its own is satisfied by encryption too weak to matter.</li>
<li><strong>Disabling beacon frames on wireless access points.</strong></li>
</ul>

<div style="${NOTE}">
<p style="${NOTE_H}">&#9733; Policy and configuration meet here</p>
<p style="${TRAP_P}">The last requirement is the only one in this topic that is written twice: once as something the policy must say, and once as something an administrator must actually do. That is the seam between the two halves of this lesson, and the next section is the doing half.</p>
</div>
`);

// ---- 3.2.5 wireless configuration -------------------------------------------
//  The honesty paragraph at the end is deliberate and is not editorialising:
//  the CED itself says disabling beacons makes a network "harder to find", and
//  the page's own Common Mistakes table already marks "invisible" as the error.
//  Teaching the control without its limit is what produces that mistake.
const SEC5 = sec(5, 'Configuring Wireless Security', `
<p style="${P}">These are the settings an administrator changes on a wireless access point to carry out the policy. There are four, and they are worth learning as a set because each one closes a gap the others leave open.</p>

<h3 style="${H3}">1. Disable beacon frame broadcasting</h3>
<p style="${P}">A <strong>beacon frame</strong> is a small message an access point broadcasts on a timer, announcing the network's name and its basic properties. It is what fills the list when a phone shows nearby networks. Turning it off means the access point stops advertising itself, which makes it harder for an adversary to find the network and learn what it is running.</p>

<h3 style="${H3}">2. Control broadcast direction and signal strength</h3>
<p style="${P}">An access point set to maximum power in the middle of a building puts a usable signal in the car park and the pavement outside. Reducing the transmit power, and aiming the signal with directional antennas, keeps coverage inside the physical space the access point is meant to cover. This is the one control on the list that takes territory back from the attacker rather than making the network harder to use once they are in range.</p>

<h3 style="${H3}">3. Enable strong wireless encryption</h3>
<p style="${P}">Wireless frames travel through open air, so anyone with an antenna can capture them. Encryption is what stops a captured frame from being readable. Not every option is worth having:</p>
<div style="${PANEL}">
<div style="display:grid!important;grid-template-columns:auto 1fr!important;gap:8px 16px!important;align-items:center!important;font-size:14px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;">
<div style="background:#FEE2E2!important;padding:8px 14px!important;border-radius:6px!important;font-weight:700!important;">WEP</div>
<div>Known vulnerabilities. Insecure.</div>
<div style="background:#FEE2E2!important;padding:8px 14px!important;border-radius:6px!important;font-weight:700!important;">WPS</div>
<div>Known vulnerabilities. Insecure.</div>
<div style="background:#FEE2E2!important;padding:8px 14px!important;border-radius:6px!important;font-weight:700!important;">WPA (original)</div>
<div>Known vulnerabilities. Insecure.</div>
<div style="background:#DCFCE7!important;padding:8px 14px!important;border-radius:6px!important;font-weight:700!important;">WPA3</div>
<div>Currently the strongest wireless encryption algorithm.</div>
</div>
</div>

<h3 style="${H3}">4. Enable MAC filtering and require authentication</h3>
<p style="${P}">MAC filtering keeps a list of the hardware addresses allowed on the network and refuses the rest, which prevents unauthorised devices from getting on. Alongside it, users are required to authenticate when joining the network, so getting a device admitted and getting a person admitted are two separate checks.</p>

<div style="${TRAP}">
<p style="${TRAP_H}">&#9888; Exam Trap</p>
<p style="${TRAP_P}">Two of these controls raise the cost of an attack rather than preventing one. A network with beacons disabled is <strong>harder to find</strong>, not invisible: it still carries traffic, and traffic can be observed. MAC filtering blocks a device that has not been added to the list, but a hardware address is something a machine announces about itself. Neither is a reason to weaken the encryption or the authentication, which are what actually keep an adversary out.</p>
</div>
`);

// -----------------------------------------------------------------------------
//  CHECKS ON THE CORE.
//
//  The page's grader is generic: it finds every .cfu-block, reads data-num,
//  data-type and data-answer off the element, and builds the submit button
//  itself. Nothing about it is keyed to a count except `cfuState.total`, which
//  is a literal and is bumped in the same pass. So a new block only has to be
//  shaped like the existing ones, and these are generated rather than hand
//  written so they cannot drift from that shape.
// -----------------------------------------------------------------------------

const TOTAL_AFTER = 15;
const CORE_CFUS = 5;

const header = (num, badge, badgeClass) => `<div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Check for Understanding</span><span class="cfu-type-badge${badgeClass ? ' ' + badgeClass : ''}">${badge}</span>
</div>
<span class="cfu-counter">${num} / ${TOTAL_AFTER}</span>
</div>`;

function mcq({ num, scenario, question, options, answer, correct, wrong }) {
  const opts = options.map(([val, text]) => `<div class="cfu-opt" data-val="${val}">
<span class="cfu-opt-letter">${val}</span><span class="cfu-opt-text">${text}</span>
</div>`).join('\n');
  const wrongs = Object.entries(wrong).map(([val, text]) =>
    `<div class="cfu-fb-wrong" data-a="${val}" style="display:none;">${text}</div>`).join('\n');
  return `<div class="cfu-block" id="cfu-${num}" data-type="mcq" data-num="${num}" data-answer="${answer}">
${header(num, 'MCQ')}
<div class="cfu-scenario">
${scenario}</div>
<p class="cfu-question">${question}</p>
<div class="cfu-options-grid">
${opts}
</div>
<div class="cfu-feedback" id="cfu-fb-${num}" style="display:none;">
<div class="cfu-fb-correct" style="display:none;"><strong>Correct.</strong> ${correct}</div>
${wrongs}
</div>
</div>`;
}

function matching({ num, scenario, question, rows, options, answer, correct, partial }) {
  const opts = options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('\n');
  const body = rows.map((term, i) => `<div class="cfu-match-row">
<div class="cfu-match-term">${term}</div>
<select class="cfu-match-select" id="cfu${num}-m${i + 1}"><option value="">Select...</option>
${opts}</select>
</div>`).join('\n');
  return `<div class="cfu-block" id="cfu-${num}" data-type="matching" data-num="${num}" data-answer="${answer}">
${header(num, 'Matching', 'cfu-scenario-badge')}
<div class="cfu-scenario">
${scenario}</div>
<p class="cfu-question">${question}</p>
<div class="cfu-match-grid">
${body}
</div>
<div class="cfu-feedback" id="cfu-fb-${num}" style="display:none;">
<div class="cfu-fb-correct" style="display:none;">${correct}</div>
<div class="cfu-fb-partial" style="display:none;">${partial}</div>
</div>
</div>`;
}

function checkbox({ num, scenario, question, choices, answer, correct, partial }) {
  const body = choices.map(([val, text], i) =>
    `  <label class="cfu-cb-label"><input type="checkbox" class="cfu-cb" id="cfu${num}-cb${i + 1}" value="${val}"> <span>${text}</span></label>`).join('\n');
  return `<div class="cfu-block" id="cfu-${num}" data-type="checkbox" data-num="${num}" data-answer="${answer}">
${header(num, 'Select All', 'cfu-scenario-badge')}
<div class="cfu-scenario">
${scenario}</div>
<p class="cfu-question">${question}</p>
<div class="cfu-cb-grid">
${body}
</div>
<div class="cfu-feedback" id="cfu-fb-${num}" style="display:none;">
<div class="cfu-fb-correct" style="display:none;">${correct}</div>
<div class="cfu-fb-partial" style="display:none;">${partial}</div>
</div>
</div>`;
}

//  Five checks, eight essential knowledge points. The mapping is recorded here
//  rather than in a comment on the page, because on the page it would be a code
//  in front of a student:
//    1  router and switch policy requirements
//    2  the split tunneling prohibition
//    3  what a wireless security policy requires
//    4  which wireless encryption protocols are insecure, and which is strongest
//    5  what each wireless configuration control actually achieves
const CORE_CFU_HTML = [
  matching({
    num: 1,
    scenario: '<strong>Halden Regional Hospital</strong> is writing minimum configuration standards for its network devices.',
    question: 'Match each requirement to the policy or policies it belongs to.',
    rows: [
      'Disabling unnecessary services, such as Telnet',
      'Requiring port security to be enabled',
      'Banning local user accounts',
    ],
    options: [
      ['R', 'Router security policy only'],
      ['S', 'Switch security policy only'],
      ['B', 'Both the router and switch policies'],
    ],
    answer: 'R,S,B',
    correct: 'Disabling unnecessary services is a router policy requirement. Port security is a switch policy requirement. Banning local user accounts appears in both, because logins to either device must go through an approved authentication server.',
    partial: 'Router policy: ban local accounts, disable unnecessary services, require a firewall. Switch policy: ban local accounts, require port security, use MAC filtering. Only the first requirement is shared.',
  }),
  mcq({
    num: 2,
    scenario: '<strong>Corvid Freight</strong> reviews its VPN policy and finds that split tunneling is permitted for all remote staff.',
    question: 'Which statement <span style="font-weight:700!important;text-decoration:underline!important;">BEST</span> describes the security problem?',
    options: [
      ['A', 'Split tunneling weakens the encryption used inside the VPN tunnel'],
      ['B', 'Traffic outside the tunnel reaches the internet without passing the organization&rsquo;s inspection, on a machine that is connected to the internal network at the same time'],
      ['C', 'Split tunneling lets employees connect to the VPN from home, which should not be allowed'],
      ['D', 'Split tunneling limits the VPN to carrying one protocol at a time'],
    ],
    answer: 'B',
    correct: 'The tunnel itself is fine. The problem is the second path: the laptop is talking directly to the internet with no inspection while also being connected to the internal network, so anything that reaches it that way has a route inward that the organization cannot see. This is why a VPN policy prohibits split tunneling, also called dual tunneling.',
    wrong: {
      A: 'The encryption inside the tunnel is unchanged. The risk comes from the traffic that never enters the tunnel.',
      C: 'Connecting from outside the building is the point of a VPN. What the policy restricts is which roles may do it, and how they authenticate.',
      D: 'Split tunneling is about which traffic uses the tunnel, not about how many protocols it can carry.',
    },
  }),
  checkbox({
    num: 3,
    scenario: '<strong>Alder Grove School District</strong> is drafting a wireless security policy.',
    question: 'Select <strong>ALL</strong> requirements a wireless security policy may establish.',
    choices: [
      ['A', 'Users authenticate through an extensible authentication protocol connected to an approved authentication server'],
      ['B', 'All wireless traffic is encrypted using AES encryption with a minimum key length'],
      ['C', 'Beacon frames are disabled on wireless access points'],
      ['D', 'The wireless password is printed on the visitor sign-in sheet so guests can connect themselves'],
      ['E', 'Every employee must connect through the VPN before using any internal system'],
    ],
    answer: 'A,B,C',
    correct: 'A, B and C are the three requirements a wireless security policy establishes. D defeats the authentication requirement it sits next to. E is a reasonable rule, but it belongs to the VPN policy, not the wireless one.',
    partial: 'A wireless security policy covers authentication through an approved server, AES encryption with a minimum key length, and disabling beacon frames. Requirements about who may use the VPN belong to a different policy.',
  }),
  mcq({
    num: 4,
    scenario: '<strong>Northvale Credit Union</strong> audits an access point and finds it running the original WPA. An administrator suggests switching to WEP because it is simpler to configure.',
    question: 'Which response is <span style="font-weight:700!important;text-decoration:underline!important;">MOST</span> accurate?',
    options: [
      ['A', 'Keep the original WPA. It is the current standard and no change is needed'],
      ['B', 'Switch to WEP as suggested, since simpler configuration means fewer mistakes'],
      ['C', 'Neither. WEP, WPS and the original WPA all have known vulnerabilities and are insecure. WPA3 is currently the strongest wireless encryption algorithm'],
      ['D', 'Encryption choice does not matter as long as MAC filtering is enabled'],
    ],
    answer: 'C',
    correct: 'WEP, WPS and the original WPA are all insecure, so moving between them does not fix anything. WPA3 is currently the strongest wireless encryption algorithm and is what the access point should be running.',
    wrong: {
      A: 'The original WPA has known vulnerabilities and is insecure.',
      B: 'WEP is on the same insecure list as the original WPA. Switching between two broken options is not an upgrade.',
      D: 'MAC filtering controls which devices may join. It does nothing to make captured wireless frames unreadable.',
    },
  }),
  matching({
    num: 5,
    scenario: '<strong>Pierce Manufacturing</strong> applies three wireless configuration controls to its access points.',
    question: 'Match each control to what it achieves.',
    rows: [
      'Disable beacon frame broadcasting',
      'Reduce transmit power and aim antennas',
      'Enable MAC filtering',
    ],
    options: [
      ['F', 'Makes the network harder for an adversary to find and learn about'],
      ['P', 'Keeps the usable signal inside the physical space the access point should cover'],
      ['D', 'Prevents devices that are not on the approved list from getting onto the network'],
    ],
    answer: 'F,P,D',
    correct: 'Each control closes a different gap. Note the wording on the first one: disabling beacons makes the network harder to find, not invisible. It still carries traffic, and traffic can be observed.',
    partial: 'Beacons disabled makes the network harder to find. Power and antenna direction keep the signal inside the intended space. MAC filtering keeps unapproved devices off. None of the three replaces strong encryption and authentication.',
  }),
].join('\n');

// -----------------------------------------------------------------------------
//  THE SPLICES.
//
//  Every one asserts its own match count. A splice that stops matching because
//  the page moved under us must fail the build, not silently do nothing: a
//  no-op splice is the failure mode that ships a sheet which looks right in the
//  diff and is missing a third of the change.
// -----------------------------------------------------------------------------

function once(body, from, to, label, expect = 1) {
  const n = body.split(from).length - 1;
  if (n !== expect) throw new Error(`${label}: expected ${expect} match(es), found ${n}`);
  return body.split(from).join(to);
}

// ---- hero, schema and objectives --------------------------------------------
const HERO_FROM = '<h1>Lesson 3.2: Secure Network Protocols</h1>\n'
  + '<p>TLS/HTTPS, SSH, SFTP, DNSSEC, VPNs, Certificate Authorities, and protocol migration strategies</p>';
const HERO_TO = '<h1>Topic 3.2: Network Security Policies &amp; Wireless</h1>\n'
  + '<p>Router, switch, VPN and wireless security policies, and the access point settings that carry them out</p>';

const LD_NAME_FROM = '"name":"AP Cybersecurity Lesson 3.2: Secure Network Protocols"';
const LD_NAME_TO = '"name":"AP Cybersecurity Topic 3.2: Network Security Policies and Wireless"';
const LD_DESC_FROM = '"description":"Complete lesson on TLS, HTTPS, SSH, SFTP, VPNs, DNSSEC, and certificate authorities for AP Cybersecurity."';
const LD_DESC_TO = '"description":"Router, switch, VPN and wireless security policies, and wireless access point configuration, for AP Cybersecurity Unit 3."';
//  The breadcrumb still resolved to the page this body used to live on.
const LD_CRUMB_FROM = '"name":"Lesson 3.2","item":"https://www.apcsexamprep.com/pages/ap-cyber-unit-3-lesson-6"';
const LD_CRUMB_TO = '"name":"Lesson 3.2","item":"https://www.apcsexamprep.com/pages/ap-cyber-unit-3-lesson-3"';

const OBJ_FROM = `<li>Explain how TLS protects confidentiality, integrity, and authentication during the handshake process</li>
<li>Map insecure protocols to their secure replacements (FTP→SFTP, Telnet→SSH, HTTP→HTTPS)</li>
<li>Describe how SSL stripping exploits the HTTP-to-HTTPS redirect and how HSTS prevents it</li>
<li>Compare site-to-site VPN, remote-access VPN, and split tunneling architectures</li>
<li>Explain how DNSSEC cryptographically verifies DNS responses to prevent spoofing</li>
<li>Describe the PKI trust model: Certificate Authorities, certificate chains, and revocation</li>`;
const OBJ_TO = `<li>Explain what a managerial control is, and why a written policy is what makes one device&rsquo;s configuration true of every device</li>
<li>Identify the requirements a router security policy and a switch security policy set, and say which are shared</li>
<li>Explain what a VPN policy requires, including why it prohibits split tunneling</li>
<li>Identify the requirements a wireless security policy establishes</li>
<li>Describe the four wireless configuration controls, and say what each one does and does not achieve</li>
<li>Recognize which wireless encryption protocols are insecure, and which is currently strongest</li>
<li><em>Background:</em> compare secure protocols including TLS, SSH, SFTP and DNSSEC, and the certificate trust model they rely on</li>`;

// ---- the footer nav, still pointing at lesson-6's neighbours -----------------
const NAV_FROM = '<a href="/pages/ap-cyber-unit-3-lesson-5" class="nav-link">← Lesson 3.5</a>'
  + '<a href="/pages/ap-cyber-unit-3-lesson-6-exercise-1" class="nav-link">Exercise 1 →</a>';
const NAV_TO = '<a href="/pages/ap-cyber-unit-3-lesson-2" class="nav-link">← Lesson 3.1 (Part 2 of 2)</a>'
  + '<a href="/pages/ap-cyber-unit-3-lesson-3-exercise-1" class="nav-link">Exercise 1 →</a>';

// ---- the banner that says what the back half of the page is -----------------
const ENRICH_BANNER = `<div class="lesson-section" style="padding:0 4px!important;">
<div style="background:#EFF6FF!important;border-left:4px solid #2563EB!important;padding:18px 22px!important;border-radius:0 8px 8px 0!important;margin:32px 0 8px!important;font-family:Georgia,serif!important;">
<p style="font-weight:700!important;color:#2563EB!important;-webkit-text-fill-color:#2563EB!important;margin:0 0 6px!important;font-size:15px!important;">Background: Secure Network Protocols</p>
<p style="font-size:14px!important;color:#1E1B4B!important;-webkit-text-fill-color:#1E1B4B!important;margin:0!important;line-height:1.7!important;">Everything above is Topic 3.2. The sections that follow go further than this topic requires, and they are here because the policies above keep naming protocols without explaining them. A wireless policy that requires AES encryption, a router policy that bans Telnet, and a VPN policy that asks for a public and private key system all make more sense once you know what those things do. Read it as background: useful, and not the material Topic 3.2 is built on.</p>
</div>
</div>
`;

// ---- the coverage table, which has been naming sections that do not exist ----
//  Order matters and is asserted: the eight rows run A.1 to A.4 then B.1 to B.4,
//  so the replacements are applied in sequence against a cursor rather than
//  globally. Two of the cells are byte-identical strings repeated four times, so
//  a global replace could not tell them apart.
const COVERED_IN = [
  'Section 3.2.2, Router and switch security policies',
  'Section 3.2.2, Router and switch security policies',
  'Section 3.2.3, VPN policy',
  'Section 3.2.4, Wireless security policy',
  'Section 3.2.5, Configuring wireless security',
  'Section 3.2.5, Configuring wireless security',
  'Section 3.2.5, Configuring wireless security',
  'Section 3.2.5, Configuring wireless security',
];

function retargetCoverage(body) {
  const rx = /<td>Section [23] — (?:Network Security Policies|Wireless Security Controls)<\/td>/g;
  const hits = [...body.matchAll(rx)];
  if (hits.length !== 8) {
    throw new Error(`coverage table: expected 8 "Covered In" cells, found ${hits.length}`);
  }
  let out = '';
  let cursor = 0;
  hits.forEach((h, i) => {
    out += body.slice(cursor, h.index) + `<td>${COVERED_IN[i]}</td>`;
    cursor = h.index + h[0].length;
  });
  return out + body.slice(cursor);
}

//  The scope note was written when the note was true. It is now describing a
//  page that teaches its topic, so it says where rather than apologizing.
const SCOPE_FROM = 'The CED 3.2 core covers router/switch/VPN/wireless <em>security policies</em> and wireless configuration controls. TLS, SSH, SFTP, DNSSEC, and PKI content in this lesson extends beyond the CED core and is enrichment. Focus on the policy and wireless configuration items below for AP exam questions.';
const SCOPE_TO = 'Topic 3.2 is router, switch, VPN and wireless <em>security policies</em>, plus wireless access point configuration. That material is sections 3.2.1 to 3.2.5, and checks 1 to 5. The TLS, SSH, SFTP, DNSSEC and certificate content in sections 3.2.6 to 3.2.10 goes beyond this topic and is marked on the page as background; it is kept because Unit 3 has no better home for it and the policies above refer to it.';

// ---- EK codes a student can read --------------------------------------------
//  Nine of them: five in the bellringer answer line and four in the Common
//  Mistakes table. The rule is in CLAUDE.md and in
//  docs/ap-cyber-unit1-ced-realignment.md under "Citing the CED to students":
//  the code is teacher knowledge, so name the idea instead. Every one of these
//  keeps its claim and loses its citation.
const CODE_SPLICES = [
  ['no separate firewall required (should require firewall per 3.2.A.1)',
    'no separate firewall required (the policy should require one, which may be a separate device)'],
  ['control signal strength/direction so it doesn’t extend beyond physical space (3.2.B.1, 3.2.B.2)',
    'control signal strength and direction so it does not extend beyond the physical space the access point should cover'],
  ['WPA3 upgrade also recommended per 3.2.B.3.',
    'Upgrading the encryption to WPA3 is also correct.'],
  ['Policy should prohibit split tunneling per CED 3.2.A.3.',
    'The VPN policy should prohibit split tunneling.'],
  ['The CED (3.2.B.3) explicitly states WPA3 is currently the strongest wireless encryption algorithm.',
    'WPA3 is currently the strongest wireless encryption algorithm.'],
  ['Disabling beacons (3.2.B.1) makes the network harder to find',
    'Disabling beacons makes the network harder to find'],
  ['Both router (3.2.A.1) and switch (3.2.A.2) security policies require banning local user accounts',
    'Both the router and the switch security policies require banning local user accounts'],
];

// ---- renumbering ------------------------------------------------------------
//  Descending, because the target range (6 to 15) overlaps the source range
//  (1 to 10). Ascending would rename cfu-1 to cfu-6 and then rename it again
//  when the pass reached 6, collapsing two blocks onto one id.
function shiftCfus(body) {
  let out = body;
  for (let n = 10; n >= 1; n -= 1) {
    const m = n + CORE_CFUS;
    out = once(out, `id="cfu-${n}"`, `id="cfu-${m}"`, `cfu ${n} block id`);
    out = once(out, `data-num="${n}"`, `data-num="${m}"`, `cfu ${n} data-num`);
    out = once(out, `id="cfu-fb-${n}"`, `id="cfu-fb-${m}"`, `cfu ${n} feedback id`);
    out = once(out, `<span class="cfu-counter">${n} / 10</span>`,
      `<span class="cfu-counter">${m} / ${TOTAL_AFTER}</span>`, `cfu ${n} counter`);
    //  Sub-input ids exist only on matching, cloze and checkbox blocks, so the
    //  count is whatever that block has and zero is legitimate.
    const subs = out.split(`id="cfu${n}-`).length - 1;
    if (subs) out = out.split(`id="cfu${n}-`).join(`id="cfu${m}-`);
  }
  return out;
}

//  3.2.1 to 3.2.5 become 3.2.6 to 3.2.10. Anchored to the h2 so a section number
//  appearing in prose is left alone. Target numbers do not overlap sources here,
//  so order is free, but it runs descending to match shiftCfus.
function shiftSections(body) {
  let out = body;
  for (let n = 5; n >= 1; n -= 1) {
    const rx = new RegExp(`(<h2 style="[^"]*">)3\\.2\\.${n} — `, 'g');
    const hits = out.match(rx);
    if (!hits || hits.length !== 1) {
      throw new Error(`section 3.2.${n} heading: expected 1 match, found ${hits ? hits.length : 0}`);
    }
    //  The separator is carried through unchanged. These are the page's own
    //  existing headings and only their number is moving; normalizing their
    //  punctuation here would put five cosmetic edits into a diff that is
    //  about content. New headings this module writes use a colon.
    out = out.replace(rx, `$13.2.${n + CORE_CFUS} ${DASH} `);
  }
  return out;
}

// -----------------------------------------------------------------------------
//  THE TRANSFORM.
// -----------------------------------------------------------------------------
function transform(body) {
  const actions = [];
  let out = body;

  //  1. Renumber what is already there, before anything is inserted. Doing it
  //     the other way round would shift the five new checks along with the ten
  //     old ones.
  out = shiftCfus(out);
  actions.push('cfus-shifted-6-to-15');
  out = shiftSections(out);
  actions.push('sections-shifted-6-to-10');

  out = once(out, 'var cfuState = { score: 0, total: 10, answered: {} };',
    `var cfuState = { score: 0, total: ${TOTAL_AFTER}, answered: {} };`, 'cfu total');
  actions.push(`cfu-total-${TOTAL_AFTER}`);

  //  2. The core goes in front of the first lesson section, which after the
  //     shift is 3.2.6. The banner goes with it so the reader is told what
  //     changes at that boundary.
  const anchor = '<div class="lesson-section" style="padding:0 4px!important;">';
  const at = out.indexOf(anchor);
  if (at === -1) throw new Error('core insert: no lesson-section anchor found');
  const core = SEC1 + SEC2 + SEC3 + SEC4 + SEC5 + CORE_CFU_HTML + '\n' + ENRICH_BANNER;
  out = out.slice(0, at) + core + out.slice(at);
  actions.push('core-sections-inserted');
  actions.push('core-cfus-inserted');
  actions.push('enrichment-banner-inserted');

  //  3. Naming.
  out = once(out, HERO_FROM, HERO_TO, 'hero');
  out = once(out, LD_NAME_FROM, LD_NAME_TO, 'schema name');
  out = once(out, LD_DESC_FROM, LD_DESC_TO, 'schema description');
  out = once(out, LD_CRUMB_FROM, LD_CRUMB_TO, 'schema breadcrumb');
  out = once(out, OBJ_FROM, OBJ_TO, 'learning objectives');
  actions.push('renamed-off-secure-protocols');

  //  4. The footer nav, which still walked lesson-6's neighbours.
  out = once(out, NAV_FROM, NAV_TO, 'footer nav');
  actions.push('footer-nav-repointed');

  //  5. The audit table stops naming sections that do not exist.
  out = retargetCoverage(out);
  out = once(out, SCOPE_FROM, SCOPE_TO, 'scope note');
  actions.push('coverage-table-retargeted');

  //  6. Codes out of student-visible prose.
  for (const [from, to] of CODE_SPLICES) {
    out = once(out, from, to, `EK code splice ${JSON.stringify(from.slice(0, 40))}`);
  }
  actions.push(`ek-codes-removed-${CODE_SPLICES.length}-splices`);

  return { body: out, actions };
}

module.exports = {
  HANDLE, PAGE_ID, TITLE, TOTAL_AFTER, CORE_CFUS,
  SEC1, SEC2, SEC3, SEC4, SEC5, CORE_CFU_HTML, ENRICH_BANNER,
  COVERED_IN, CODE_SPLICES,
  once, shiftCfus, shiftSections, retargetCoverage, transform,
};
