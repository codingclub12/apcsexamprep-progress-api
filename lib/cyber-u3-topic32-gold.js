'use strict';
// -----------------------------------------------------------------------------
//  AP CYBERSECURITY TOPIC 3.2: REBUILD TO THE UNIT 3 TEMPLATE.
//
//  ---- WHY A REBUILD AND NOT MORE SPLICES ------------------------------------
//  Five of Unit 3's six lesson pages are the same shape, and it is a deliberate
//  one. Measured across 3.1a, 3.1b, 3.3, 3.4 and 3.5:
//
//      13 icon-numbered sections, 16 cards, 10 checks, 6 FAQ entries, 2 vocab
//      tables, 186 KB to 198 KB, one check per teaching section
//
//  Topic 3.2 had 5 plain sections, 4 cards, 0 FAQ entries and 152 KB, because
//  its body arrived from the old lesson-6 during the renumbering and was
//  authored to a different pattern. Adding CED content to it, as the first pass
//  did, made the page teach its topic and left it the odd one out in its own
//  unit. A student going 3.1b to 3.2 to 3.3 feels the drop.
//
//  ---- THE TEMPLATE, AS MEASURED ---------------------------------------------
//      1  Learning Objectives
//      2  Why <the topic> matters              + check 1
//      3  Essential Vocabulary & Exam Tips     + check 2
//      4-7  the teaching sections              + checks 3-6
//      8  Real-World Case Studies              + check 7
//      9  Worked Examples: Predict First       + check 8
//      10 AP Exam Strategy                     + check 9
//      11 Frequently Asked Questions           + check 10
//      !  Common AP Exam Mistakes
//      +  Continue Learning
//
//  Prose overlap between siblings, section by section, is 0.002 to 0.006 on a
//  4-word shingle measure. Only "Continue Learning" is boilerplate (0.880). So
//  this is authored content, not a template fill, and it is written for 3.2.
//
//  ---- WHAT HAPPENS TO THE PROTOCOL MATERIAL ---------------------------------
//  TLS, SSH, SFTP, DNSSEC and the certificate trust model are good writing and
//  they are not Topic 3.2. They move into a collapsed appendix, whole, so
//  nothing is destroyed and nothing competes with the topic.
//
//  Their ten checks do NOT come with them. The template carries exactly ten,
//  one per teaching section, and a second graded set in a collapsed panel would
//  report a student who answered every question on the page as 10 out of 20.
//  Protocol assessment is not lost by this: all four of the lesson's activity
//  pages test protocols end to end.
//
//  Safe because no Unit 3 lesson page carries a `.check-btn`, which is the only
//  thing apcs-tracker.js counts. These pages record a VISIT and never a score,
//  so the number of checks changes what a student sees on the page and nothing
//  that reaches the gradebook. Verified on 3.2, 3.3 and 3.5 before relying on it.
//
//  HOUSE RULES: ASCII source with entities, no em-dashes in new copy, and no EK
//  codes anywhere a student reads. Codes live in the collapsed coverage table.
//
//    node scripts/cyber-u3-topic32-gold-csv.js out/topic32.csv --show-changes
// -----------------------------------------------------------------------------

const HANDLE = 'ap-cyber-unit-3-lesson-3';
const PAGE_ID = '132524769495';
const TITLE = 'AP Cybersecurity 3.2: Network Security Policies & Wireless';
const TOTAL_CFUS = 10;

//  The page's existing headings separate number from title with an em-dash.
//  New copy may not contain one (house rule), but the template's heading shape
//  is what it is, so the character is named rather than typed.
const DASH = '—';

const card = (id, icon, n, title, inner) => `<div class="card"${id ? ` id="${id}"` : ''}>
  <h2>
<span class="section-icon">${icon}</span>${n ? `3.2.${n} ${DASH} ` : ''}${title}</h2>
${inner}
</div>
`;

const obj = (t) => `    <li>
<span class="obj-check"></span>${t}</li>`;

// ---- 1. Learning Objectives -------------------------------------------------
const SEC1 = card('section-a', '1', 1, 'Learning Objectives', `  <ul class="obj-list">
${[
  'Explain what a managerial control is, and why a written policy is what makes one device&rsquo;s configuration true of every device',
  'Identify the requirements a router security policy sets: banning local user accounts, disabling unnecessary services, and requiring a firewall',
  'Identify the requirements a switch security policy sets: banning local user accounts, requiring port security, and using MAC filtering',
  'Say which requirement the router and switch policies share, and which belong to only one of them',
  'Explain what a VPN policy requires, and describe split tunneling precisely enough to say what it exposes',
  'Identify the requirements a wireless security policy establishes, including authentication to an approved server and AES encryption at a minimum key length',
  'Describe the four wireless configuration controls, and say what each one achieves and what it does not',
  'Recognize which wireless encryption protocols are insecure, and which is currently strongest',
  'Apply all four policies to a described network and name which requirements a configuration violates',
].map(obj).join('\n')}
  </ul>`);

// ---- 2. the hook ------------------------------------------------------------
//  Every sibling opens its second section with the reason the topic exists,
//  told as a failure rather than a definition. 3.3 uses lateral movement, 3.5
//  uses what firewalls miss. This one uses drift.
const SEC2 = card('section-b', '2', 2, 'Why Policy Comes Before Configuration', `  <p>An administrator hardens a router carefully on a Tuesday. Six months later a second administrator adds another router and configures it the way that seems reasonable at the time. Neither of them did anything wrong. The network now has two security postures, and nobody can say which one is correct.</p>

  <p>That is <strong>configuration drift</strong>, and it is the problem managerial controls exist to solve. A <strong>managerial control</strong> is a written rule about how something must be built or used. It is not a setting on a device. It is the document that says what every device of that kind has to look like before it is allowed on the network, which is what makes the second router match the first one and what lets an auditor tell whether it does.</p>

  <div class="info-box insight">
<span class="box-label">&#9733; The distinction the exam tests</span><p>A technical control is the switch setting. A managerial control is the policy that requires the setting. Questions in this topic describe an organization and ask what its <em>policy</em> should say, not which button to press. If an answer choice names a device configuration and the question asked about policy, read it again.</p>
  </div>

  <p>All four policies in this topic share a phrase worth reading carefully: a policy sets a <strong>minimum</strong> standard and <strong>may include</strong> a given requirement. A policy is a floor, not a ceiling. An organization is free to require more than the list. What it may not do is require less.</p>

  <table class="vocab-table-full">
    <thead><tr>
<th>Policy</th>
<th>What it sets a minimum standard for</th>
</tr></thead>
    <tbody>
      <tr>
<td class="term">Router security policy</td>
<td>Every router on the organization&rsquo;s network</td>
</tr>
      <tr>
<td class="term">Switch security policy</td>
<td>Every switch on the organization&rsquo;s network</td>
</tr>
      <tr>
<td class="term">VPN policy</td>
<td>Employees reaching the internal network from outside it</td>
</tr>
      <tr>
<td class="term">Wireless security policy</td>
<td>The organization&rsquo;s wireless networks</td>
</tr>
    </tbody>
  </table>

  <p>Three of the four say the same thing in different words: <strong>stop trusting the device to decide who you are.</strong> Routers and switches ban local accounts, wireless requires authentication against an approved server, and the VPN requires keys or multifactor authentication. Identity is checked centrally, or it is not really checked.</p>`);

// ---- 3. vocabulary ----------------------------------------------------------
const vt = (term, def, label, trap) => `      <tr>
        <td class="vt-term">${term}</td>
        <td>${def}</td>
        <td>
<span class="exam-trap">${label}</span> ${trap}</td>
      </tr>`;

const SEC3 = card('section-c', '3', 3, 'Essential Vocabulary &amp; Exam Tips', `  <table class="vocab-table-full">
    <thead>
      <tr>
<th style="width:22%">Term</th>
<th style="width:40%">Definition</th>
<th style="width:38%">Exam Trap / Critical Distinction</th>
</tr>
    </thead>
    <tbody>
${[
  vt('Managerial control',
    'A written rule setting how something must be built or used. It is a document, not a device setting. The four in this topic are the router, switch, VPN and wireless security policies.',
    'KEY',
    'The exam distinguishes managerial from technical controls. The policy requiring port security is managerial. Port security itself is technical. A question asking what the policy should say is not asking which setting to change.'),
  vt('Local user account',
    'An account defined on the device itself rather than on a central authentication server. Both the router and the switch policies ban them.',
    'KEY',
    'This is the one requirement the router and switch policies share, so it is never the answer to "which requirement is unique to the switch policy". Local accounts survive an employee&rsquo;s departure, do not appear in central logs, and get shared.'),
  vt('Approved authentication server',
    'The central system all device logins must go through once local accounts are banned. The wireless policy points at the same kind of server for the people joining the network.',
    'NOTE',
    'Three of the four policies route identity here. Recognizing that pattern is usually faster than recalling each policy&rsquo;s bullets separately.'),
  vt('Unnecessary services',
    'Services running on a device that the organization does not need, which the router security policy requires be disabled. Telnet is the standing example.',
    'TRAP',
    'Disabling unnecessary services belongs to the ROUTER policy. Students who remember only "Telnet is insecure" sometimes attach it to the switch policy, which does not name it.'),
  vt('Port security',
    'A switch feature limiting which devices, and how many, may use a physical switch port. Required by the switch security policy.',
    'TRAP',
    'Port security is switch-only. A port expecting one workstation should not silently accept a hub with six unknown machines behind it. Do not confuse it with a firewall port number, which is unrelated.'),
  vt('MAC filtering',
    'Allowing only listed hardware addresses onto the network and refusing the rest. It appears twice in this topic: in the switch security policy, and as a wireless configuration control.',
    'NOTE',
    'The only item in this topic that is both a policy requirement and a configuration step. A hardware address is something a machine announces about itself, so filtering raises the cost of an attack rather than preventing one.'),
  vt('Split tunneling',
    'A VPN configuration in which some traffic goes through the encrypted tunnel and the rest goes straight to the internet. Also called dual tunneling. The VPN policy prohibits it.',
    'TRAP',
    'Split tunneling is not an attack and not malware. It is a configuration an organization chooses. If a scenario says a VPN permits it, the finding is a policy violation, not an intrusion.'),
  vt('Beacon frame',
    'A message a wireless access point broadcasts on a timer, announcing the network name and basic properties. It is what fills the list of nearby networks on a phone.',
    'TRAP',
    'Disabling beacons makes a network HARDER TO FIND, not invisible. It still carries traffic, and traffic can be observed. Any answer choice claiming the network becomes undetectable is wrong.'),
  vt('EAP (extensible authentication protocol)',
    'The authentication framework the wireless security policy requires, connected to an approved authentication server, so that people joining the wireless network are identified individually.',
    'KEY',
    'A single shared wireless password identifies nobody. The policy asks for authentication per person, which is why it names a framework and a server rather than a passphrase.'),
  vt('AES encryption with a minimum key length',
    'What the wireless security policy requires of all wireless traffic. The policy names both the algorithm and a floor for the key length.',
    'NOTE',
    'The key length matters as much as the algorithm. A policy saying only "traffic must be encrypted" is satisfied by encryption too weak to matter, which is why the requirement is written with a floor.'),
  vt('WPA3',
    'Currently the strongest wireless encryption algorithm, and what an access point should be running.',
    'KEY',
    'WEP, WPS and the original WPA all have known vulnerabilities and are insecure. WPA2 is neither on that list nor the strongest, so "WPA2 is the strongest available" is a wrong answer and "WPA2 is insecure" is not what this topic says either.'),
].join('\n')}
    </tbody>
  </table>`);

// ---- 4. router and switch ---------------------------------------------------
const SEC4 = card('section-d', '4', 4, 'Router and Switch Security Policies', `  <p>Routers and switches move traffic. An adversary who controls one does not need to break anything else: they can read traffic, redirect it, or quietly leave themselves a way back in. Both policies are built around that, and they overlap more than they differ.</p>

  <h3>Router security policy</h3>
  <p>Sets a minimum configuration standard for every router on the network, and may include:</p>
  <ul>
    <li>
<strong>Banning local user accounts.</strong> All router logins must go through an approved authentication server. A local account lives on the box, so it does not disappear when the person who used it leaves, it does not show up in central logs, and it is the account everyone shares because it is easier.</li>
    <li>
<strong>Disabling unnecessary services,</strong> such as Telnet. Every service left running is another way in and another thing to patch. Telnet is the standing example because it carries credentials in plaintext, so anyone positioned to watch the traffic gets the password.</li>
    <li>
<strong>Requiring a firewall.</strong> The organization may opt for a firewall device separate from the router rather than relying on the router&rsquo;s own filtering.</li>
  </ul>

  <h3>Switch security policy</h3>
  <p>Sets a minimum configuration standard for every switch, and may include:</p>
  <ul>
    <li>
<strong>Banning local user accounts.</strong> Same requirement, same reason: switch logins go through an approved authentication server.</li>
    <li>
<strong>Requiring port security to be enabled.</strong> Port security limits which devices, and how many, may use a physical switch port.</li>
    <li>
<strong>Using MAC filtering,</strong> so the switch forwards traffic only for hardware addresses the organization expects.</li>
  </ul>

  <table class="vocab-table-full">
    <thead><tr>
<th>Router policy</th>
<th>Switch policy</th>
</tr></thead>
    <tbody>
      <tr>
<td class="term">Ban local user accounts</td>
<td class="term">Ban local user accounts</td>
</tr>
      <tr>
<td>Disable unnecessary services (for example Telnet)</td>
<td>Require port security enabled</td>
</tr>
      <tr>
<td>Require a firewall, which may be a separate device</td>
<td>Use MAC filtering</td>
</tr>
    </tbody>
  </table>

  <div class="info-box warning">
<span class="box-label">&#9888; Exam Trap</span><p>The first row is the requirement both policies make, so it is never the answer to "which of these is unique to the switch policy". Port security and MAC filtering are switch-only. Disabling unnecessary services and requiring a firewall are router-only.</p>
  </div>`);

// ---- 5. VPN -----------------------------------------------------------------
const SEC5 = card('section-e', '5', 5, 'VPN Policy and the Split Tunneling Prohibition', `  <p>A <strong>virtual private network</strong> lets an employee outside the building reach the internal network as though they were inside it. That is useful, and it is a hole in the perimeter, so the VPN policy details the minimum security requirements for using one. It may include:</p>

  <ul>
    <li>
<strong>A list of roles allowed to use the VPN.</strong> Access goes to roles that need it, not to everyone with a login. A policy that lets the whole organization in has not reduced anything.</li>
    <li>
<strong>Authentication requirements,</strong> such as a public and private key system, or multifactor authentication. A password alone is not enough to open a door this wide.</li>
    <li>
<strong>A prohibition against split tunneling,</strong> also called dual tunneling.</li>
  </ul>

  <h3>What split tunneling actually exposes</h3>
  <p>With split tunneling on, the laptop keeps two paths open at once. Traffic for the organization goes through the encrypted tunnel and gets inspected. Everything else goes straight out to the internet and is inspected by nobody.</p>

  <table class="vocab-table-full">
    <thead><tr>
<th>Split tunneling (prohibited)</th>
<th>Full tunneling (required)</th>
</tr></thead>
    <tbody>
      <tr>
<td>Work traffic through the tunnel, inspected</td>
<td>Work traffic through the tunnel, inspected</td>
</tr>
      <tr>
<td class="term">Everything else direct to the internet, not inspected</td>
<td>Everything else also through the tunnel, inspected</td>
</tr>
    </tbody>
  </table>

  <p>The risk is not that the direct traffic is sensitive. It is that the direct path is a route into a machine which is simultaneously connected to the internal network, and the organization cannot see it. Organizations turn split tunneling on for a mundane reason: sending every employee&rsquo;s video calls and software updates through headquarters is slow and expensive. That is a real cost, and it is why the prohibition has to be written down rather than left to judgement.</p>`);

// ---- 6. wireless policy -----------------------------------------------------
const SEC6 = card('section-f', '6', 6, 'Wireless Security Policy', `  <p>A wired network has a physical control built into it: to plug into a switch, you have to be in the building. Wireless removes it. The signal goes through walls and does not stop at the property line, so anyone within range is already as close to the network as an employee at a desk. The wireless security policy establishes the minimum requirements that replace the lock on the door, and may include:</p>

  <ul>
    <li>
<strong>Requiring users to authenticate through an extensible authentication protocol</strong> connected to an approved authentication server. This is the same central-identity requirement the router and switch policies make, applied to the people joining the network rather than the staff administering it. A single shared wireless password identifies nobody.</li>
    <li>
<strong>Requiring all wireless traffic to be encrypted using AES encryption with a minimum key length.</strong> The policy names the algorithm and a floor for the key length, because "encrypted" on its own is satisfied by encryption too weak to matter.</li>
    <li>
<strong>Disabling beacon frames on wireless access points.</strong></li>
  </ul>

  <div class="info-box insight">
<span class="box-label">&#9733; Policy and configuration meet here</span><p>That last requirement is the only one in this topic written twice: once as something the policy must say, and once as something an administrator must actually do. It is the seam between the two halves of the topic, and the next section is the doing half.</p>
  </div>`);

// ---- 7. wireless configuration ----------------------------------------------
const SEC7 = card('section-g', '7', 7, 'Configuring Wireless Security', `  <p>These are the settings an administrator changes on a wireless access point to carry out the policy. There are four, and they are worth learning as a set because each closes a gap the others leave open.</p>

  <h3>1. Disable beacon frame broadcasting</h3>
  <p>A <strong>beacon frame</strong> is a small message an access point broadcasts on a timer, announcing the network&rsquo;s name and basic properties. Turning it off means the access point stops advertising itself, which makes it harder for an adversary to find the network and learn what it is running.</p>

  <h3>2. Control broadcast direction and signal strength</h3>
  <p>An access point set to maximum power in the middle of a building puts a usable signal in the car park and on the pavement outside. Reducing the transmit power, and aiming the signal with directional antennas, keeps coverage inside the physical space the access point is meant to cover. This is the one control here that takes territory back from the attacker rather than making the network harder to use once they are in range.</p>

  <h3>3. Enable strong wireless encryption</h3>
  <p>Wireless frames travel through open air, so anyone with an antenna can capture them. Encryption is what stops a captured frame being readable. Not every option is worth having:</p>
  <table class="vocab-table-full">
    <thead><tr>
<th>Protocol</th>
<th>Status</th>
</tr></thead>
    <tbody>
      <tr>
<td class="term">WEP</td>
<td>Known vulnerabilities. Insecure.</td>
</tr>
      <tr>
<td class="term">WPS</td>
<td>Known vulnerabilities. Insecure.</td>
</tr>
      <tr>
<td class="term">WPA (original)</td>
<td>Known vulnerabilities. Insecure.</td>
</tr>
      <tr>
<td class="term">WPA3</td>
<td>Currently the strongest wireless encryption algorithm.</td>
</tr>
    </tbody>
  </table>

  <h3>4. Enable MAC filtering and require authentication</h3>
  <p>MAC filtering keeps a list of the hardware addresses allowed on the network and refuses the rest, which prevents unauthorized devices getting on. Alongside it, users are required to authenticate when joining, so admitting a device and admitting a person are two separate checks.</p>

  <div class="info-box warning">
<span class="box-label">&#9888; Exam Trap</span><p>Two of these raise the cost of an attack rather than preventing one. A network with beacons disabled is <strong>harder to find</strong>, not invisible: it still carries traffic, and traffic can be observed. MAC filtering blocks a device that is not on the list, but a hardware address is something a machine announces about itself. Neither is a reason to weaken the encryption or the authentication, which are what actually keep an adversary out.</p>
  </div>`);

// ---- 8. case studies --------------------------------------------------------
//  The siblings pair one real, documented incident with one named-organization
//  simulation. Both cases here are chosen so the failure is a MISSING POLICY
//  rather than a missing setting, which is what this topic is about.
const caseBlock = (eyebrow, title, body, tags) => `  <div class="case-block">
    <div class="case-eyebrow">${eyebrow}</div>
    <div class="case-title">${title}</div>
    <div class="case-body">
${body}
    </div>
    <div class="case-tags">
${tags.map(([c, t]) => `      <span class="case-tag ${c}">${t}</span>`).join('\n')}
    </div>
  </div>`;

const SEC8 = card('section-h', '8', 8, 'Real-World Case Studies: When the Policy Was Missing', `${caseBlock(
  'Case Study 1 &mdash; A wireless network with no policy floor',
  'TJX (2005 to 2007): WEP on the wireless network, 45 million cards',
  `      <p><strong>What happened:</strong> Attackers sat outside a retail store, captured wireless traffic from an access point still running WEP, and recovered the key. That put them on the store network. From there they reached systems carrying payment card data and exfiltrated records over roughly eighteen months before the intrusion was found.</p>
      <p><strong>Why it belongs to this topic:</strong> the failure was not that somebody chose a weak setting once. It was that nothing in writing said what the floor was. A wireless security policy naming an encryption algorithm and a minimum key length turns "which encryption did this store configure" into a question with one correct answer, checkable by an auditor who never visits the store. Without that document, every access point is whatever the installer chose on the day.</p>
      <p><strong>The two controls that would have applied:</strong> the encryption requirement, which WEP fails outright, and the signal control. An access point tuned so its usable signal stops at the walls of the building is materially harder to attack from a car park.</p>
      <p><strong>Cost:</strong> reported at roughly 250 million dollars. The encryption standard that would have prevented it existed and was already recommended at the time.</p>`,
  [['fail', 'No written floor means every device is somebody&rsquo;s guess'],
    ['lesson', 'A policy makes a configuration auditable from a distance']],
)}

${caseBlock(
  'Case Study 2 &mdash; A policy that existed and had a hole in it',
  'Meridian Energy Grid simulation: split tunneling on a maintained VPN',
  `      <p><strong>Scenario:</strong> Meridian has a VPN policy. It names the roles allowed to connect, and it requires multifactor authentication, both of which are enforced. It says nothing about split tunneling, and the client is configured with it on so that field engineers&rsquo; video calls do not cross the corporate link.</p>
      <p><strong>What the gap allows:</strong> an engineer&rsquo;s laptop is connected to the internal network through the tunnel and to the open internet directly, at the same time. The direct path carries no organizational inspection. A compromise arriving that way lands on a machine that already holds an authenticated route inward, and the organization has no record of the traffic that delivered it.</p>
      <p><strong>Why the two enforced requirements did not help:</strong> role restriction decides <em>who</em> may connect and multifactor decides <em>whether they are who they say</em>. Neither says anything about which traffic uses the tunnel once the session is up. The three VPN requirements cover three different questions, and answering two of them well does not cover the third.</p>
      <p><strong>The fix is one line in a document:</strong> prohibit split tunneling. The configuration change that follows is small. Finding the gap without the policy naming it is the hard part.</p>`,
  [['fail', 'Two of three requirements enforced is still an open path'],
    ['lesson', 'Each VPN requirement answers a different question']],
)}

${caseBlock(
  'Case Study 3 &mdash; Vantex quarterly policy audit',
  'Four findings, three policies, and one that belonged to none of them',
  `      <p><strong>The exercise:</strong> Vantex Financial Group audits its network devices each quarter against its four written policies. The reviewer&rsquo;s job is not to decide whether a configuration looks risky. It is to say which policy a finding violates, which is a different and much faster question.</p>
      <p><strong>Finding 1.</strong> A branch router still has Telnet enabled for a management tool nobody uses. <em>Router security policy, disabling unnecessary services.</em> The tool being unused is what makes this easy: the service is unnecessary by the policy&rsquo;s own word.</p>
      <p><strong>Finding 2.</strong> Two switches in a renovated floor have local admin accounts created during the works and never removed. <em>Switch security policy, banning local user accounts.</em> Note that the same finding on the branch router would violate the router policy in exactly the same way, because that requirement is in both.</p>
      <p><strong>Finding 3.</strong> The guest wireless network runs WPA2 and broadcasts at full power into the car park. <em>Wireless security policy and the configuration controls.</em> Two separate items: the encryption should be WPA3, and the signal should be tuned so it does not extend beyond the space the access point covers.</p>
      <p><strong>Finding 4.</strong> A contractor&rsquo;s laptop connects to the VPN and, while connected, streams video directly to the internet. <em>VPN policy, the prohibition against split tunneling.</em></p>
      <p><strong>The finding that belonged to no policy:</strong> the reviewer also noted that a network diagram was eighteen months out of date. That is a real problem and it is not one of these four policies, so it goes on the report as an observation rather than a violation. Knowing which findings a policy actually governs is as much a part of this skill as knowing the requirements.</p>`,
  [['fail', 'Four findings, none of which needed a product to fix'],
    ['lesson', 'Name the device or access path, and the policy names itself']],
)}`);

// ---- 9. worked examples -----------------------------------------------------
const exStep = (n, h, p) => `      <div class="ex-step">
<div class="step-n">${n}</div>
<div class="step-c">
        <h4>${h}</h4>
        <p>${p}</p>
      </div>
</div>`;

const exBlock = (n, title, scenario, steps, answer) => `  <div class="ex-block">
    <div class="ex-header">
<div class="ex-num">${n}</div>
<div class="ex-title">${title}</div>
</div>
    <div class="ex-scenario">
<strong>Scenario:</strong> ${scenario}</div>
    <div class="ex-body">
${steps}
      <div class="ex-answer">
<span class="ans-label">Analysis</span><p>${answer}</p>
</div>
    </div>
  </div>`;

const SEC9 = card('section-i', '9', 9, 'Worked Examples: Predict First, Then Classify', `  <p>Work each scenario before reading the steps. The habit these build is the one the free-response questions reward: name the policy first, then check its requirements one at a time, rather than reacting to whichever detail looks alarming.</p>

${exBlock(1, 'Sorting Findings Into the Right Policy',
  'An auditor at Vantex Financial Group reports four findings. (A) A core router has a local admin account with a local password. (B) A switch port in a waiting room accepts any device plugged into it. (C) The guest wireless uses a single shared passphrase printed on a card. (D) Remote staff can route non-work traffic outside the VPN tunnel. Which policy does each finding belong to, and what does each violate?',
  [
    exStep(1, 'Name the device or the access path, not the symptom',
      'A is a router. B is a switch. C is wireless. D is the VPN. Each finding names its own policy before you consider whether it is serious. Sorting first is what stops a hard question becoming four hard questions at once.'),
    exStep(2, 'Check the finding against that policy&rsquo;s requirements',
      'A violates the router policy&rsquo;s ban on local user accounts. B violates the switch policy&rsquo;s requirement that port security be enabled. C violates the wireless policy&rsquo;s requirement that users authenticate through an extensible authentication protocol connected to an approved server, because a shared passphrase identifies nobody. D violates the VPN policy&rsquo;s prohibition against split tunneling.'),
    exStep(3, 'Check whether any finding violates more than one thing',
      'A does. Banning local accounts is a requirement of both the router and the switch policies, so the same finding on a switch would violate the switch policy in exactly the same way. That shared requirement is the one worth knowing cold.'),
  ].join('\n'),
  '<strong>One finding per policy, and each one names a requirement rather than a preference.</strong> Notice that none of the four was fixed by choosing a better product. Each was fixed by a sentence in a document that the configuration then has to satisfy.')}

${exBlock(2, 'Deciding What a Control Actually Buys You',
  'Vantex Financial Group disables beacon frame broadcasting on all its branch access points and enables MAC filtering. The branch operations manager tells the board the wireless network is now invisible and that only company devices can reach it, so upgrading the encryption from the original WPA can wait. Evaluate that claim.',
  [
    exStep(1, 'Take each control and say what it does, precisely',
      'Disabling beacons stops the access point advertising itself, which makes the network harder to find and learn about. MAC filtering refuses devices whose hardware address is not on the list, which prevents unauthorized devices getting on.'),
    exStep(2, 'Now say what each one does not do',
      'A network with beacons off still carries traffic, and traffic can be observed, so "invisible" overstates it. A hardware address is something a machine announces about itself, so MAC filtering raises the cost of getting a device admitted rather than making it impossible.'),
    exStep(3, 'Evaluate the conclusion that was drawn from them',
      'Both controls act on finding the network and joining it. Neither acts on readability of the frames already in the air. The original WPA has known vulnerabilities and is insecure, so captured traffic stays readable no matter how hard the network was to locate.'),
  ].join('\n'),
  '<strong>The claim fails on the part that matters.</strong> Both controls are worth having and neither substitutes for encryption. The upgrade to WPA3, currently the strongest wireless encryption algorithm, is the one change that addresses what the other two leave open. This is the shape of a great many questions in this topic: two reasonable controls used to justify skipping the necessary one.')}`);

// ---- 10. exam strategy ------------------------------------------------------
const strat = (h, lead, items) => `    <div class="strat-card">
      <h4>${h}</h4>${lead ? `\n      <p>${lead}</p>` : ''}
      <ul>
${items.map((i) => `        <li>${i}</li>`).join('\n')}
      </ul>
    </div>`;

const SEC10 = card('section-j', '10', 10, 'AP Exam Strategy: Managerial Control Questions', `  <div class="exam-strat-grid">
${[
  strat('Strategy 1: Name the policy before you judge the finding',
    'Every scenario in this topic names a device or an access path, and that names the policy.',
    ['Router, or a routing device &rarr; router security policy',
      'Switch, or a physical port &rarr; switch security policy',
      'Remote access from outside &rarr; VPN policy',
      'Anything wireless &rarr; wireless security policy, and possibly the configuration controls too',
      'Sorting first turns one hard question into four easy checks']),
  strat('Strategy 2: Policy or configuration, and which was asked',
    'A managerial control is a document. A technical control is a setting.',
    ['Asked what the policy should say &rarr; answer names a requirement',
      'Asked what the administrator should do &rarr; answer names a setting',
      'Disabling beacon frames is the one item that is legitimately both',
      'An answer choice describing a product purchase is almost never the policy answer']),
  strat('Strategy 3: The shared requirement and the unique ones',
    null,
    ['Banning local user accounts &rarr; BOTH router and switch policies',
      'Disabling unnecessary services, requiring a firewall &rarr; router only',
      'Port security, MAC filtering &rarr; switch only',
      'Asked which requirement is unique to one policy, the shared one is never the answer',
      'Three of four policies route identity to an approved authentication server']),
  strat('Strategy 4: The three fatal traps',
    null,
    ['<strong>Trap 1 &mdash; beacons off means invisible:</strong> Wrong. It means harder to find. The network still carries observable traffic.',
      '<strong>Trap 2 &mdash; WPA2 is the strongest:</strong> Wrong. WPA3 is. WEP, WPS and the original WPA are the ones named insecure.',
      '<strong>Trap 3 &mdash; split tunneling is an attack:</strong> Wrong. It is a configuration the organization chose, and the finding is a policy violation.']),
].join('\n')}
  </div>`);

// ---- 11. FAQ ----------------------------------------------------------------
const faq = (q, a) => `  <div class="faq-item">
    <h3 class="faq-q">Q: ${q}</h3>
    <p class="faq-a">${a}</p>
  </div>`;

const SEC11 = card('section-faq', '?', 11, 'Frequently Asked Questions', `${[
  faq('What is the difference between a managerial control and a technical control?',
    'A managerial control is a written rule about how something must be built or used, and a technical control is the mechanism that carries it out. The switch setting that limits which devices may use a port is technical. The policy sentence requiring port security to be enabled on every switch is managerial. They are not competing options, they are two layers of the same defence: the technical control does the work, and the managerial control is what makes it true of every device rather than of the one an administrator remembered. This topic is about the managerial layer, which is why its questions ask what a policy should say rather than which setting to change.'),
  faq('Why do the router and switch policies both ban local user accounts?',
    'Because a local account is an identity the device decides on by itself, and that breaks three things at once. It survives the departure of the person who used it, since removing someone centrally does not touch accounts stored on individual boxes. It does not appear in central logs, so nobody can reconstruct who logged into what. And because it is more convenient than the approved path, it becomes the account a team shares, at which point the login no longer identifies a person at all. Routing every login through an approved authentication server fixes all three. The requirement appears in both policies because both kinds of device have the same weakness.'),
  faq('Is split tunneling a vulnerability, an attack, or a configuration?',
    'A configuration, chosen deliberately, usually for a mundane reason: sending every remote employee&rsquo;s video calls and software updates through headquarters is slow and expensive, and split tunneling avoids that. What makes it a problem is the second path it leaves open. The laptop is connected to the internal network through the tunnel and to the open internet directly, at the same time, and only the tunnel is inspected. So an exam scenario that says a VPN permits split tunneling is describing a policy violation, not an intrusion, and the correct finding is that the VPN policy should prohibit it. Answer choices calling it malware or an attack technique are wrong.'),
  faq('If MAC filtering can be defeated, why does this topic require it twice?',
    'Because raising the cost of an attack is worth doing even when it does not make one impossible, as long as nobody mistakes it for the whole defence. A hardware address is something a machine announces about itself, so an adversary who can observe traffic can learn an allowed address. What MAC filtering reliably stops is an unauthorized device simply being plugged in or joined, which is a real and common way onto a network. It appears in the switch security policy and again as a wireless configuration control because both places have that same problem. What it never justifies is weakening the encryption or the authentication, which are the controls doing the load-bearing work.'),
  faq('The policy says AES with a minimum key length. Why name the key length at all?',
    'Because "traffic must be encrypted" is a requirement that weak encryption satisfies. A policy is a floor, and a floor with no number in it can be met by any implementation somebody can argue is encryption, including algorithms already known to be broken. Naming the algorithm answers what kind, and naming a minimum key length answers how strong, and an auditor can check both without needing to judge whether a given configuration is good enough. This is the same reason the topic names WPA3 rather than saying "use modern encryption": a requirement you cannot check is not really a requirement.'),
  faq('Does disabling beacon frames actually hide a network?',
    'No, and this is the single most common misreading in the topic. A beacon frame is a periodic broadcast advertising the network name and basic properties, so turning it off means the access point stops announcing itself and an adversary has to work harder to find the network and learn what it is running. The network is still there and still carrying traffic, and traffic can be observed by anyone in range with an antenna. So the honest description is harder to find, not invisible or undetectable, and any answer choice using the stronger words is wrong. It is a worthwhile control precisely as far as that, and no further.'),
].join('\n\n')}`);

// -----------------------------------------------------------------------------
//  THE TEN CHECKS. One per teaching section, which is the template's rule and
//  the reason there are exactly ten. Generated rather than hand written so the
//  markup cannot drift from the shape the page's grader expects.
// -----------------------------------------------------------------------------
const cfuHeader = (num, badge, badgeClass) => `<div class="cfu-header">
<div class="cfu-header-left">
<span class="cfu-label">Check for Understanding</span><span class="cfu-type-badge${badgeClass ? ` ${badgeClass}` : ''}">${badge}</span>
</div>
<span class="cfu-counter">${num} / ${TOTAL_CFUS}</span>
</div>`;

function mcq({ num, scenario, question, options, answer, correct, wrong }) {
  return `<div class="cfu-block" id="cfu-${num}" data-type="mcq" data-num="${num}" data-answer="${answer}">
${cfuHeader(num, 'MCQ')}
<div class="cfu-scenario">
${scenario}</div>
<p class="cfu-question">${question}</p>
<div class="cfu-options-grid">
${options.map(([v, t]) => `<div class="cfu-opt" data-val="${v}">
<span class="cfu-opt-letter">${v}</span><span class="cfu-opt-text">${t}</span>
</div>`).join('\n')}
</div>
<div class="cfu-feedback" id="cfu-fb-${num}" style="display:none;">
<div class="cfu-fb-correct" style="display:none;"><strong>Correct.</strong> ${correct}</div>
${Object.entries(wrong).map(([v, t]) => `<div class="cfu-fb-wrong" data-a="${v}" style="display:none;">${t}</div>`).join('\n')}
</div>
</div>`;
}

function matching({ num, scenario, question, rows, options, answer, correct, partial }) {
  const opts = options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('\n');
  return `<div class="cfu-block" id="cfu-${num}" data-type="matching" data-num="${num}" data-answer="${answer}">
${cfuHeader(num, 'Matching', 'cfu-scenario-badge')}
<div class="cfu-scenario">
${scenario}</div>
<p class="cfu-question">${question}</p>
<div class="cfu-match-grid">
${rows.map((term, i) => `<div class="cfu-match-row">
<div class="cfu-match-term">${term}</div>
<select class="cfu-match-select" id="cfu${num}-m${i + 1}"><option value="">Select...</option>
${opts}</select>
</div>`).join('\n')}
</div>
<div class="cfu-feedback" id="cfu-fb-${num}" style="display:none;">
<div class="cfu-fb-correct" style="display:none;">${correct}</div>
<div class="cfu-fb-partial" style="display:none;">${partial}</div>
</div>
</div>`;
}

function checkbox({ num, scenario, question, choices, answer, correct, partial }) {
  return `<div class="cfu-block" id="cfu-${num}" data-type="checkbox" data-num="${num}" data-answer="${answer}">
${cfuHeader(num, 'Select All', 'cfu-scenario-badge')}
<div class="cfu-scenario">
${scenario}</div>
<p class="cfu-question">${question}</p>
<div class="cfu-cb-grid">
${choices.map(([v, t], i) => `  <label class="cfu-cb-label"><input type="checkbox" class="cfu-cb" id="cfu${num}-cb${i + 1}" value="${v}"> <span>${t}</span></label>`).join('\n')}
</div>
<div class="cfu-feedback" id="cfu-fb-${num}" style="display:none;">
<div class="cfu-fb-correct" style="display:none;">${correct}</div>
<div class="cfu-fb-partial" style="display:none;">${partial}</div>
</div>
</div>`;
}

const CFU = {};

CFU[1] = mcq({
  num: 1,
  scenario: '<strong>Vantex Financial Group</strong> has a hardened core router. A second router added last spring was configured by a different administrator and allows local logins.',
  question: 'Which statement <span style="font-weight:700!important;text-decoration:underline!important;">BEST</span> describes what the district is missing?',
  options: [
    ['A', 'A better router product, since the second one clearly has weaker defaults'],
    ['B', 'A written minimum configuration standard that every router has to meet, so the second router cannot differ from the first by accident'],
    ['C', 'Nothing. The core router is hardened, so the network is protected'],
    ['D', 'A faster patching schedule for the second router'],
  ],
  answer: 'B',
  correct: 'Neither administrator did anything wrong; there was simply nothing saying what correct looked like. That written minimum standard is the managerial control, and it is what makes the second router match the first one and lets an auditor tell whether it does.',
  wrong: {
    A: 'Both routers can be configured correctly. The gap is that nothing defined correct, so the product is not the variable.',
    C: 'A hardened device beside an unhardened one on the same network is not a protected network. The adversary uses the second router.',
    D: 'Patching is worth doing and does not address local accounts, which is a configuration standard question rather than a currency one.',
  },
});

CFU[2] = matching({
  num: 2,
  scenario: '<strong>Vantex Financial Group</strong> is checking that its network team uses the topic&rsquo;s terms precisely.',
  question: 'Match each term to the statement that is true of it.',
  rows: [
    'Port security',
    'Split tunneling',
    'Beacon frame',
  ],
  options: [
    ['P', 'Limits which devices, and how many, may use a physical switch port'],
    ['S', 'A configuration in which some traffic bypasses the encrypted tunnel'],
    ['B', 'A periodic broadcast announcing a wireless network&rsquo;s name and properties'],
  ],
  answer: 'P,S,B',
  correct: 'Port security is a switch policy requirement. Split tunneling is the VPN configuration the policy prohibits. A beacon frame is what an access point stops broadcasting when beacons are disabled.',
  partial: 'Port security limits devices on a switch port. Split tunneling routes some traffic outside the VPN tunnel. A beacon frame advertises a wireless network. None of the three is an attack.',
});

CFU[3] = matching({
  num: 3,
  scenario: '<strong>Vantex Financial Group</strong> is writing minimum configuration standards for its network devices.',
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
  partial: 'Router policy: ban local accounts, disable unnecessary services, require a firewall. Switch policy: ban local accounts, require port security, use MAC filtering. Only the first is shared.',
});

CFU[4] = mcq({
  num: 4,
  scenario: '<strong>Corvid Freight</strong> reviews its VPN policy and finds that split tunneling is permitted for all remote staff.',
  question: 'Which statement <span style="font-weight:700!important;text-decoration:underline!important;">BEST</span> describes the security problem?',
  options: [
    ['A', 'Split tunneling weakens the encryption used inside the VPN tunnel'],
    ['B', 'Traffic outside the tunnel reaches the internet without passing the organization&rsquo;s inspection, on a machine that is connected to the internal network at the same time'],
    ['C', 'Split tunneling lets employees connect to the VPN from home, which should not be allowed'],
    ['D', 'Split tunneling limits the VPN to carrying one protocol at a time'],
  ],
  answer: 'B',
  correct: 'The tunnel itself is fine. The problem is the second path: the laptop is talking directly to the internet with no inspection while also connected to the internal network, so anything arriving that way has a route inward the organization cannot see. This is why a VPN policy prohibits split tunneling, also called dual tunneling.',
  wrong: {
    A: 'The encryption inside the tunnel is unchanged. The risk comes from the traffic that never enters the tunnel.',
    C: 'Connecting from outside the building is the point of a VPN. The policy restricts which roles may do it, and how they authenticate.',
    D: 'Split tunneling is about which traffic uses the tunnel, not how many protocols it carries.',
  },
});

CFU[5] = checkbox({
  num: 5,
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
  correct: 'A, B and C are the three requirements a wireless security policy establishes. D defeats the authentication requirement sitting next to it. E is a reasonable rule that belongs to the VPN policy, not the wireless one.',
  partial: 'A wireless security policy covers authentication through an approved server, AES encryption at a minimum key length, and disabling beacon frames. Rules about who may use the VPN belong to a different policy.',
});

CFU[6] = mcq({
  num: 6,
  scenario: '<strong>Northvale Credit Union</strong> audits an access point running the original WPA. An administrator suggests switching to WEP because it is simpler to configure.',
  question: 'Which response is <span style="font-weight:700!important;text-decoration:underline!important;">MOST</span> accurate?',
  options: [
    ['A', 'Keep the original WPA. It is the current standard and no change is needed'],
    ['B', 'Switch to WEP as suggested, since simpler configuration means fewer mistakes'],
    ['C', 'Neither. WEP, WPS and the original WPA all have known vulnerabilities and are insecure. WPA3 is currently the strongest wireless encryption algorithm'],
    ['D', 'Encryption choice does not matter as long as MAC filtering is enabled'],
  ],
  answer: 'C',
  correct: 'WEP, WPS and the original WPA are all insecure, so moving between them fixes nothing. WPA3 is currently the strongest wireless encryption algorithm and is what the access point should run.',
  wrong: {
    A: 'The original WPA has known vulnerabilities and is insecure.',
    B: 'WEP is on the same insecure list as the original WPA. Switching between two broken options is not an upgrade.',
    D: 'MAC filtering controls which devices may join. It does nothing to make captured wireless frames unreadable.',
  },
});

CFU[7] = mcq({
  num: 7,
  scenario: '<strong>Meridian Energy Grid</strong> enforces its VPN policy&rsquo;s role restrictions and its multifactor authentication requirement. The policy says nothing about split tunneling, and the client has it enabled.',
  question: 'Why do the two enforced requirements <span style="font-weight:700!important;text-decoration:underline!important;">NOT</span> close the gap?',
  options: [
    ['A', 'They do close it. Role restriction plus multifactor authentication is complete VPN security'],
    ['B', 'They answer who may connect and whether they are who they claim, and neither says anything about which traffic uses the tunnel once the session is up'],
    ['C', 'Multifactor authentication is incompatible with full tunneling'],
    ['D', 'Role restrictions only apply to employees, and contractors bypass them automatically'],
  ],
  answer: 'B',
  correct: 'The three VPN requirements answer three different questions. Role restriction decides who may connect, authentication decides whether they are who they say, and the split tunneling prohibition decides which traffic uses the tunnel. Answering two well leaves the third open.',
  wrong: {
    A: 'Two of three requirements enforced still leaves an uninspected path into a machine that holds an authenticated route inward.',
    C: 'The two are unrelated. Multifactor authentication works the same under full tunneling.',
    D: 'Nothing in the scenario says that, and it would be a separate failure of the role list rather than the tunneling gap.',
  },
});

CFU[8] = matching({
  num: 8,
  scenario: '<strong>Vantex Financial Group</strong> applies three wireless configuration controls to its branch access points.',
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
  correct: 'Each closes a different gap. Note the wording on the first: disabling beacons makes the network harder to find, not invisible. It still carries traffic, and traffic can be observed.',
  partial: 'Beacons disabled makes the network harder to find. Power and antenna direction keep the signal inside the intended space. MAC filtering keeps unapproved devices off. None of the three replaces strong encryption and authentication.',
});

CFU[9] = mcq({
  num: 9,
  scenario: 'An exam item describes a bank branch where <strong>a switch port in a public waiting area accepts any device plugged into it</strong>, and asks what the organization&rsquo;s policy should require.',
  question: 'Which answer choice is the one the question is actually asking for?',
  options: [
    ['A', 'Purchase managed switches from a vendor with better default settings'],
    ['B', 'The switch security policy should require port security to be enabled on every switch'],
    ['C', 'Move the waiting room network onto its own wireless access point'],
    ['D', 'The router security policy should require a firewall separate from the router'],
  ],
  answer: 'B',
  correct: 'The scenario names a physical switch port, which names the switch security policy, and the requirement that answers it is port security. The question asked what the policy should require, so the answer names a requirement rather than a purchase or a redesign.',
  wrong: {
    A: 'A product purchase is almost never the answer to a policy question, and defaults are not a written standard.',
    C: 'A redesign might help and is not what was asked. The question asked what the policy should require.',
    D: 'Right shape, wrong policy. A switch port is the switch policy, not the router policy.',
  },
});

CFU[10] = checkbox({
  num: 10,
  scenario: 'A student is reviewing the claims made in this topic before the exam.',
  question: 'Select <strong>ALL</strong> statements that are accurate.',
  choices: [
    ['A', 'Disabling beacon frames makes a wireless network harder to find, but not invisible'],
    ['B', 'Banning local user accounts is required by both the router and the switch security policies'],
    ['C', 'WPA3 is currently the strongest wireless encryption algorithm'],
    ['D', 'Split tunneling is an attack technique used by adversaries to bypass a VPN'],
    ['E', 'MAC filtering makes it impossible for an unauthorized device to reach the network'],
  ],
  answer: 'A,B,C',
  correct: 'A, B and C are accurate. D is wrong: split tunneling is a configuration the organization chooses, which is why permitting it is a policy violation rather than an intrusion. E overstates MAC filtering, which prevents unlisted devices from getting on but rests on an address a machine announces about itself.',
  partial: 'The three accurate statements are the beacon wording (harder to find, not invisible), the shared local-account ban, and WPA3 as currently strongest. The two wrong ones are the classic overstatements in this topic.',
});

// ---- Continue Learning ------------------------------------------------------
//  Rebuilt rather than copied. The sibling pages' version carries copy-paste rot
//  from a Unit 1 template: 3.3's says "the next topic in Unit 1" and links a
//  Topic 1.1 quiz, a Unit 1 project and a Unit 1 exam. Replicating that would
//  have propagated four broken links into a sixth page.
const rl = (href, type, title) => `    <a href="${href}" class="related-link"><div>
<span class="rl-type">${type}</span><span class="rl-title">${title}</span>
</div></a>`;

const CONTINUE = card(null, '+', null, 'Continue Learning', `  <p>Practice what you learned, then move to the next topic in Unit 3:</p>
  <div class="related-grid">
${[
  rl('/pages/ap-cyber-unit-3-lesson-3-exercise-1', 'Exercise', `Topic 3.2 Exercise 1 ${DASH} Secure Protocol Analysis`),
  rl('/pages/ap-cyber-unit-3-lesson-3-exercise-2', 'Exercise', `Topic 3.2 Exercise 2 ${DASH} Protocol Migration Planning`),
  rl('/pages/ap-cyber-unit-3-lesson-3-lab', 'Lab', `Topic 3.2 Lab ${DASH} Operation Cipher Sweep`),
  rl('/pages/ap-cyber-unit-3-lesson-3-quiz', 'Quiz', `Topic 3.2 Quiz ${DASH} Instant Feedback`),
  rl('/pages/ap-cyber-unit-3-lesson-4', 'Next Topic', `Topic 3.3 ${DASH} Network Segmentation and VLANs`),
  rl('/pages/ap-cyber-unit-3-exam', 'Unit Exam', `Unit 3 Exam ${DASH} All Lessons`),
  rl('/pages/ap-cybersecurity-unit-3-securing-networks', 'Unit Guide', `Unit 3: Securing Networks ${DASH} Full Study Guide`),
  rl('/pages/ap-cybersecurity-complete-course-guide', 'Course Hub', 'AP Cybersecurity Complete Course Guide'),
].join('\n')}
  </div>`);

const BOTTOM_NAV = `<div class="nav-links">
<a href="/pages/ap-cyber-unit-3-lesson-2" class="nav-link">&larr; Lesson 3.1 (Part 2 of 2)</a><a href="/pages/ap-cyber-unit-3-lesson-3-exercise-1" class="nav-link">Exercise 1 &rarr;</a>
</div>
`;

// -----------------------------------------------------------------------------
//  ASSEMBLY.
//
//  The page is rebuilt rather than spliced, so the regions that are KEPT are
//  cut from the live body by their own markers and every cut is asserted. A
//  marker that stops matching fails the build: silently dropping the rail, the
//  stylesheet or the collapsed coverage table would produce a page that still
//  renders and has lost something a reader would not immediately miss.
// -----------------------------------------------------------------------------
function cut(body, startMark, endMark, label) {
  const a = body.indexOf(startMark);
  if (a === -1) throw new Error(`${label}: start marker not found`);
  const b = endMark === null ? body.length : body.indexOf(endMark, a + startMark.length);
  if (b === -1) throw new Error(`${label}: end marker not found after start`);
  if (b <= a) throw new Error(`${label}: end marker precedes start`);
  return body.slice(a, b);
}

const M = {
  hero: '<div class="exhero"',
  obj: '<div class="lesson-obj"',
  firstSection: '<div class="lesson-section" style="padding:0 4px!important;">',
  firstCfu: '<div class="cfu-block"',
  navLinks: '<div class="nav-links">',
  footerCredit: '<div style="text-align:center!important;padding:20px!important;font-size:12px',
  examFocus: '<div class="info-box exam"',
  ekCard: '<div class="card" style="border-top:3px solid #d97706',
  bellringer: '<div class="card" style="border-top:3px solid #059669',
  mistakes: '<div class="card">\n<h2>\n<span class="section-icon">!</span>Common AP Exam Mistakes',
  cfuScript: '<script>\ndocument.addEventListener(\'DOMContentLoaded\'',
};

//  The coverage table named sections that never existed. Now it names the ones
//  that do. Order is asserted: the eight rows run A.1 to A.4 then B.1 to B.4,
//  and two of the cells are byte-identical strings repeated four times, so a
//  global replace could not tell them apart.
const COVERED_IN = [
  'Section 3.2.4, Router and switch security policies',
  'Section 3.2.4, Router and switch security policies',
  'Section 3.2.5, VPN policy',
  'Section 3.2.6, Wireless security policy',
  'Section 3.2.7, Configuring wireless security',
  'Section 3.2.7, Configuring wireless security',
  'Section 3.2.7, Configuring wireless security',
  'Section 3.2.7, Configuring wireless security',
];

function retargetCoverage(html) {
  const rx = /<td>Section [23] — (?:Network Security Policies|Wireless Security Controls)<\/td>/g;
  const hits = [...html.matchAll(rx)];
  if (hits.length !== 8) throw new Error(`coverage table: expected 8 cells, found ${hits.length}`);
  let out = '';
  let cursor = 0;
  hits.forEach((h, i) => {
    out += html.slice(cursor, h.index) + `<td>${COVERED_IN[i]}</td>`;
    cursor = h.index + h[0].length;
  });
  return out + html.slice(cursor);
}

function once(html, from, to, label, expect = 1) {
  const n = html.split(from).length - 1;
  if (n !== expect) throw new Error(`${label}: expected ${expect} match(es), found ${n}`);
  return html.split(from).join(to);
}

//  Nine EK codes sat where students read them: five in the bellringer answer
//  line and four in the Common Mistakes table. Each keeps its claim and loses
//  its citation. See "Citing the CED to students" in
//  docs/ap-cyber-unit1-ced-realignment.md.
const CODE_SPLICES = [
  ['no separate firewall required (should require firewall per 3.2.A.1)',
    'no separate firewall required (the policy should require one, which may be a separate device)'],
  ['control signal strength/direction so it doesn’t extend beyond physical space (3.2.B.1, 3.2.B.2)',
    'control signal strength and direction so it does not extend beyond the physical space the access point should cover'],
  ['WPA3 upgrade also recommended per 3.2.B.3.', 'Upgrading the encryption to WPA3 is also correct.'],
  ['Policy should prohibit split tunneling per CED 3.2.A.3.', 'The VPN policy should prohibit split tunneling.'],
  ['The CED (3.2.B.3) explicitly states WPA3 is currently the strongest wireless encryption algorithm.',
    'WPA3 is currently the strongest wireless encryption algorithm.'],
  ['Disabling beacons (3.2.B.1) makes the network harder to find',
    'Disabling beacons makes the network harder to find'],
  ['Both router (3.2.A.1) and switch (3.2.A.2) security policies require banning local user accounts',
    'Both the router and the switch security policies require banning local user accounts'],
];

//  Three page widgets every sibling carries and 3.2 did not. The stylesheet
//  already defines all eight rules for them (the CSS is shared unit-wide; only
//  the markup diverged), so their absence meant a student on 3.2 answered ten
//  questions and never saw a running score, while every other lesson in the
//  unit showed one. The grader was already computing it: `updateScoreTracker`
//  null-guards both elements, so nothing threw and nothing displayed.
const PAGE_WIDGETS = `<div id="apcyber-progress-bar"></div>
<button id="apcyber-back-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top">&#8679;</button>
<div id="cfu-score-tracker" role="status" aria-live="polite">
  <span class="cfu-score-label">Score</span>
  <span id="cfu-score-num">0 / ${TOTAL_CFUS}</span>
</div>
`;

const HERO = `<div class="exhero" style="margin-bottom:0!important;">
<div class="exhero-badge">Unit 3 &bull; Lesson 3.2</div>
<nav aria-label="Breadcrumb" style="font-size:0.82rem;color:#6b7280;-webkit-text-fill-color:#6b7280;margin:0 0 16px;font-family:Georgia,serif;padding:0;">
<a href="/" style="color:#c4b5fd;-webkit-text-fill-color:#c4b5fd;text-decoration:none;">Home</a><span style="margin:0 6px;color:#d1d5db;">&rsaquo;</span><a href="/pages/ap-cybersecurity-complete-course-guide" style="color:#c4b5fd;-webkit-text-fill-color:#c4b5fd;text-decoration:none;">AP Cybersecurity</a><span style="margin:0 6px;color:#d1d5db;">&rsaquo;</span><span style="color:#e9d5ff;-webkit-text-fill-color:#e9d5ff;">Unit 3 &rsaquo; Lesson 3.2</span>
</nav>
<h1>Topic 3.2: Network Security Policies &amp; Wireless</h1>
<p>Router, switch, VPN and wireless security policies, and the access point settings that carry them out</p>
</div>
`;

const APPENDIX_INTRO = `  <p>Everything above is Topic 3.2. What follows goes further than this topic requires, and it is kept because the policies above name protocols without explaining them. A wireless policy requiring AES encryption, a router policy banning Telnet, and a VPN policy asking for a public and private key system all make more sense once you know what those things do.</p>
  <p style="font-size:13px!important;color:#6B7280!important;-webkit-text-fill-color:#6B7280!important;">Read it as background. It is not the material Topic 3.2 is built on, and the checks above do not cover it.</p>
`;

function transform(body) {
  const actions = [];

  // ---- 1. cut the regions that are kept, asserting every marker ------------
  const head = body.slice(0, body.indexOf(M.hero));
  if (!head || head.length < 60000) throw new Error(`head cut looks wrong: ${head.length} bytes`);
  if (!head.includes('ucn-rail')) throw new Error('head cut lost the unit rail');
  if (!head.includes('<style>')) throw new Error('head cut lost the stylesheet');

  const protocolProse = cut(body, M.firstSection, M.firstCfu, 'protocol prose');
  const examFocus = cut(body, M.examFocus, M.ekCard, 'AP exam focus box');
  const ekCard = cut(body, M.ekCard, M.bellringer, 'EK coverage card');
  const bellringer = cut(body, M.bellringer, M.mistakes, 'bellringer card');
  const mistakes = cut(body, M.mistakes, M.cfuScript, 'common mistakes card');
  const tail = body.slice(body.indexOf(M.cfuScript));
  const footerCredit = cut(body, M.footerCredit, M.examFocus, 'footer credit line');

  //  The protocol prose is five <div class="lesson-section"> blocks. It goes
  //  into the appendix whole; only the section numbers in its headings change,
  //  since 3.2.1 to 3.2.5 now belong to the CED core above it.
  let appendixProse = protocolProse;
  for (let n = 5; n >= 1; n -= 1) {
    const rx = new RegExp(`(<h2 style="[^"]*">)3\\.2\\.${n} ${DASH} `, 'g');
    const hits = appendixProse.match(rx);
    if (!hits || hits.length !== 1) {
      throw new Error(`appendix heading 3.2.${n}: expected 1 match, found ${hits ? hits.length : 0}`);
    }
    appendixProse = appendixProse.replace(rx, `$1Background ${n} ${DASH} `);
  }
  actions.push('protocol-sections-renamed-background-1-to-5');

  // ---- 2. the collapsed appendix -----------------------------------------
  const appendix = `<div class="card" style="border-top:3px solid #2563EB!important;">
<div style="display:flex!important;justify-content:space-between!important;align-items:center!important;cursor:pointer!important;" onclick="var b=document.getElementById('apx-body');var c=document.getElementById('apx-chev');b.style.display=b.style.display==='none'?'block':'none';c.style.transform=c.style.transform?'':'rotate(180deg)';">
<div>
<span style="font-size:11px!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:1.5px!important;color:#2563EB!important;font-family:Georgia,serif!important;">Background reading, beyond Topic 3.2</span><h3 style="margin:4px 0 0!important;font-size:16px!important;font-weight:700!important;color:#1E1B4B!important;font-family:Georgia,serif!important;">Secure Network Protocols: TLS, SSH, SFTP, DNSSEC and certificates</h3>
</div>
<span id="apx-chev" style="font-size:20px!important;color:#2563EB!important;transition:transform .2s!important;">&#9660;</span>
</div>
<div id="apx-body" style="display:none!important;margin-top:16px!important;">
${APPENDIX_INTRO}${appendixProse}</div>
</div>
`;
  actions.push('protocol-material-moved-to-collapsed-appendix');

  // ---- 3. assemble in template order --------------------------------------
  const core = [SEC1, SEC2, examFocus, ekCard, SEC3, SEC4, SEC5, SEC6, SEC7, SEC8, SEC9, SEC10, SEC11];
  const checks = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10 };
  //  One check per teaching section, appended inside nothing: the siblings put
  //  each block immediately after its card, not inside it.
  const withChecks = [
    SEC1,
    SEC2, CFU[checks[2]],
    examFocus, ekCard,
    SEC3, CFU[checks[3]],
    SEC4, CFU[checks[4]],
    SEC5, CFU[checks[5]],
    SEC6, CFU[checks[6]],
    SEC7, CFU[checks[7]],
    SEC8, CFU[checks[8]],
    SEC9, CFU[checks[9]],
    SEC10, CFU[checks[10]],
    SEC11, CFU[checks[11]],
  ].join('\n');
  if (core.length !== 13) throw new Error('core section list changed shape');

  let out = head
    + PAGE_WIDGETS
    + HERO
    + withChecks + '\n'
    + mistakes
    + bellringer
    + appendix
    + CONTINUE
    + BOTTOM_NAV
    + footerCredit
    + tail;
  actions.push('rebuilt-to-unit-3-template');
  actions.push('score-tracker-progress-bar-back-top-added');

  // ---- 4. edits to the kept regions ---------------------------------------
  out = retargetCoverage(out);
  actions.push('coverage-table-retargeted');

  out = once(out,
    'The CED 3.2 core covers router/switch/VPN/wireless <em>security policies</em> and wireless configuration controls. TLS, SSH, SFTP, DNSSEC, and PKI content in this lesson extends beyond the CED core and is enrichment. Focus on the policy and wireless configuration items below for AP exam questions.',
    'Topic 3.2 is router, switch, VPN and wireless <em>security policies</em>, plus wireless access point configuration. That material is sections 3.2.1 to 3.2.11 and all ten checks. The TLS, SSH, SFTP, DNSSEC and certificate content is kept on the page as collapsed background reading and is not part of this topic.',
    'scope note');

  out = once(out, 'var cfuState = { score: 0, total: 10, answered: {} };',
    `var cfuState = { score: 0, total: ${TOTAL_CFUS}, answered: {} };`, 'cfu total');

  out = once(out, '"name":"AP Cybersecurity Lesson 3.2: Secure Network Protocols"',
    '"name":"AP Cybersecurity Topic 3.2: Network Security Policies and Wireless"', 'schema name');
  out = once(out, '"description":"Complete lesson on TLS, HTTPS, SSH, SFTP, VPNs, DNSSEC, and certificate authorities for AP Cybersecurity."',
    '"description":"Router, switch, VPN and wireless security policies, and wireless access point configuration, for AP Cybersecurity Unit 3."', 'schema description');
  out = once(out, '"name":"Lesson 3.2","item":"https://www.apcsexamprep.com/pages/ap-cyber-unit-3-lesson-6"',
    '"name":"Lesson 3.2","item":"https://www.apcsexamprep.com/pages/ap-cyber-unit-3-lesson-3"', 'schema breadcrumb');
  actions.push('renamed-off-secure-protocols');

  for (const [from, to] of CODE_SPLICES) {
    out = once(out, from, to, `EK code splice ${JSON.stringify(from.slice(0, 40))}`);
  }
  actions.push(`ek-codes-removed-${CODE_SPLICES.length}-splices`);

  return { body: out, actions };
}

module.exports = {
  HANDLE, PAGE_ID, TITLE, TOTAL_CFUS, DASH, COVERED_IN, CODE_SPLICES, CFU,
  SEC1, SEC2, SEC3, SEC4, SEC5, SEC6, SEC7, SEC8, SEC9, SEC10, SEC11,
  CONTINUE, BOTTOM_NAV, HERO,
  PAGE_WIDGETS,
  card, cut, once, retargetCoverage, transform,
};
