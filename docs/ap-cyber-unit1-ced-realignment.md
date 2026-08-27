# AP Cybersecurity Unit 1: CED realignment

**Status:** 3 of 8 work orders complete. WO-3 imported and verified live
2026-08-27, along with a follow-on fix to Topic 1.1 Exercise 1.
**Source of truth:** the AP Cybersecurity Course and Exam Description effective
Fall 2026. Not this file, and not the older AP Cybersecurity framework PDF,
which is a different document. `tools/ap-cyber-ced/CED-UNIT1-EXTRACT.txt` is a
cleaned dump of the Unit 1 framework section for grepping; where it disagrees
with the PDF, the PDF wins.

## The problem

Unit 1 teaches a legacy cybersecurity taxonomy that appears **zero times** in the
Fall 2026 CED: spear phishing, whaling, vishing, smishing, baiting, quid pro quo,
tailgating, credential stuffing, brute force, rainbow tables, deepfakes. It is
Security+ material, not AP. Unit 1 also imported the Unit 2 tactic list
(authority, consensus, scarcity, familiarity, pretexting) into Topic 1.1, where
the CED names exactly two tactics.

Unit 1 is the free preview unit. It is what every prospective teacher evaluates
first, and it is in front of live classes. A teacher at Watchung Hills reported
it on 2026-08-27, fresh off Rutgers AP Cyber training; a second teacher at the
same school reported it independently. Her subject line was "Unit 1 is wrong?".
She was right.

## CED ground truth, Unit 1

### Topic 1.1, Understanding Social Engineering

| EK | Content |
|---|---|
| 1.1.A.1 | Social engineering uses psychological tactics to manipulate users into revealing sensitive info (**elicitation**), downloading a malicious file, or clicking a malicious link. In person, email, text, or social media. |
| 1.1.A.2 | Adversaries **often** use tactics like **intimidation** and **urgency**. Intimidation threatens negative consequences for non-compliance. Urgency creates reasons to act quickly. |
| 1.1.B.1 | Tactics rely on common psychological principles that influence behavior. |
| 1.1.B.2 | Intimidation leverages aversion to negative consequences; uses fear to incite action. |
| 1.1.B.3 | Urgency leverages the human response to time-sensitive needs; pressure prevents considering whether an action is safe. |
| 1.1.C.1 | Victims may give up **personal information** (name, phone, address, workplace, pets' names, birthdate) used for impersonation or challenge questions. |
| 1.1.C.2 | Victims may give up **secure information** like a one-time password (OTP) or auth code, letting an adversary log in as the victim. |
| 1.1.C.3 | Victims may **download malware or click a link** that installs malware, steals browser data, or directs them to a credential-capture site. |

Two tactics and three impacts. Nothing else. Suggested skill 1.A.

The word **often** in 1.1.A.2 is load-bearing: a message using neither
intimidation nor urgency is still social engineering under 1.1.A.1, so "neither"
is a legitimate answer on an exam item and the pages must offer it.

### Topic 1.2, Suspicious Website Logins

1.2.A.1 online password attacks using common passwords, common patterns, or
stolen passwords. 1.2.A.2 signs: many failed logins in a short duration, logins
at unusual times, logins from unknown devices. 1.2.B.1 common patterns: word plus
two-digit number (often a year) plus a special character; family or pet names;
personally significant dates. 1.2.B.2 adversaries build a dictionary from
personal info gathered about a target and submit it with an automated tool.
1.2.C.1 long, random, unique passwords, a password manager or passphrases.
1.2.C.2 avoid names, dates or personally meaningful words. 1.2.C.3 enable MFA.

**Not in 1.2:** credential stuffing, password spraying, brute force, rainbow
tables, keyloggers, hash cracking. The CED frames this behaviorally, not by
attack-technique taxonomy.

Note the link back to 1.1.C.1: the personal information a victim gives up in a
social engineering attack is exactly what feeds the 1.2.B.2 dictionary. Worth
teaching explicitly, and the rebuilt 1.1 page now does.

### Topic 1.3, Best Practices for Public Networks

1.3.A.1 adversaries classified by skill; low-skilled use others' tools against
known vulns, high-skilled create tools and find undocumented vulns (**zero
days**). 1.3.A.2 motivations: greed, recognition, dedication to a cause, revenge,
politics, beliefs. 1.3.B.1 **evil twin**, a WAP with an SSID similar or identical
to the target network; the adversary captures traffic but **cannot** read
encrypted traffic like HTTPS. 1.3.B.2 **jamming**, a strong EM signal in the
network's frequency range, which is a **denial of service** attack. 1.3.B.3 **war
driving**, detecting wireless beacons while moving to map networks and signal
reach. 1.3.C.1 a **VPN** encrypts traffic to the VPN operator, which stops the
ISP seeing it but **the VPN provider can**. 1.3.C.2 most protocols are encrypted,
but consider data sensitivity before joining unencrypted Wi-Fi; DNS queries are
vulnerable. 1.3.C.3 verify the network name matches **exactly**.

**Not in 1.3:** WPA2, WPA3, MITM as a named term, packet sniffing as a named
term, rogue access point (the CED term is *evil twin*).

### Topic 1.4, AI-Based Cybersecurity Attacks

1.4.A.1 AI creates a **digital avatar** from voice and image samples, enabling
impersonation by phone or video; a rising risk as orgs adopt voice-based auth.
1.4.A.2 generative AI and **LLMs** write convincing phishing messages in any
language, removing the unnatural-language tell. 1.4.A.3 adversaries craft
**prompts that extract** sensitive info from LLMs. 1.4.A.4 adversaries publish or
modify sites with false info so it enters **LLM training sets**. 1.4.A.5
AI-powered **reconnaissance** across social media and public sites. 1.4.A.6 AI
coding tools to write malware, modify code maliciously, or find vulns.
1.4.B.1 **shared secrets** with close contacts to verify identity. 1.4.B.2
**MFA**, since a second factor defeats a cloned voice. 1.4.B.3 do not enter
sensitive data into AI tools. 1.4.B.4 evaluate AI output against reputable,
stable, non-AI sources.

**The CED never says "deepfake."** The term is *digital avatar*.

### Topic 1.5, Leveraging AI in Cyber Defense

1.5.A.1 AI reviews security configs and recommends improvements, **checked by a
knowledgeable security technician**. 1.5.A.2 AI analyses application code for
vulns, **reviewed by a knowledgeable programmer**. 1.5.A.3 AI suggests detection
rules, **reviewed by a detection engineer**. 1.5.B.1 millions of daily events
that humans cannot examine. 1.5.B.2 AI sorts likely-malicious from harmless.
1.5.B.3 AI alerts personnel or takes corrective action. 1.5.B.4 teams intervene
quickly. Suggested skills 2.A, 3.A. The human-review clause appears in all three
of 1.5.A.1 through A.3 and is highly assessable.

## Terms that must not appear as content students learn

**Zero occurrences in the CED:** spear phishing, vishing, smishing, whaling,
baiting, quid pro quo, tailgating, shoulder surfing, dumpster diving, watering
hole, credential stuffing, password spraying, brute force, rainbow table,
keylogger, WEP, WPA2, WPA3, deepfake, honeypot, man-in-the-middle, packet
sniffing, rogue access point, business email compromise, bluejacking,
bluesnarfing.

**In the CED but owned by another unit:** pretexting (2.1.A.2), authority
(2.1.A.3), consensus (2.1.A.5), scarcity (2.1.A.6), familiarity (2.1.A.7),
script kiddie (2.1.B.1), hacktivist (2.1.B.2), tailgating (2.2.A.3).

**"Phishing" is a special case.** It appears about ten times, but only inside
sample scenarios, in 1.4.A.2, in 2.3.A.1 on awareness training, and in sample
question stems. It is never required content students must define or classify.
Flavor is fine. A taxonomy exercise built on it is not.

**The one allowed use of an off-CED term** is naming it while telling students it
is not assessed. Never as something to learn or sort.

## Damage per page

Off-CED is an exact-match count. Measured 2026-08-27 with
`tools/ap-cyber-ced/ced_audit.py`.

| Topic | Handle | Page ID | Off-CED | Wrong-unit | Status |
|---|---|---|---|---|---|
| hub | ap-cybersecurity-unit-1-introduction-to-security | 130318827735 | 5 | | WO-8 |
| 1.1 | ap-cybersecurity-unit-1-social-engineering | 132111237335 | 218 -> 60\* | 73 -> 30\* | done, live |
| 1.1 | ap-cyber-unit-1-lesson-1-exercise-1 | 131898998999 | 3 -> 0\* | 2 -> 1\* | done, live |
| 1.1 | ap-cyber-unit-1-lesson-1-exercise-2 | 131899031767 | 72 -> 18\* | 2\* | done |
| 1.1 | ap-cyber-unit-1-lesson-1-lab | 132187422935 | 37 -> 3\* | 10 -> 2\* | done, CSV not imported |
| 1.1 | ap-cyber-unit-1-lesson-1-quiz | 132079517911 | 0 | | clean |
| 1.2 | ap-cybersecurity-unit-1-password-attacks | 132157374679 | **176** | 0 | **WO-4** |
| 1.2 | ap-cyber-unit-1-lesson-2-exercise-1 | 132213702871 | 9 | | WO-5 |
| 1.2 | ap-cyber-unit-1-lesson-2-exercise-2 | 132214161623 | 3 | | WO-5 |
| 1.2 | ap-cyber-unit-1-lesson-2-lab | 132289593559 | **34** | | WO-5 |
| 1.2 | ap-cyber-unit-1-lesson-2-quiz | 132288872663 | 0 | | clean |
| 1.3 | ap-cybersecurity-unit-1-wireless-security | 132230447319 | 2 | | WO-6 |
| 1.3 | ap-cyber-unit-1-lesson-3-exercise-1 | 132323868887 | 7 | 1 | WO-6 |
| 1.3 | ap-cyber-unit-1-lesson-3-exercise-2 | 132330717399 | 3 | | WO-6 |
| 1.3 | ap-cyber-unit-1-lesson-3-lab | 132330815703 | 8 | | WO-6 |
| 1.3 | ap-cyber-unit-1-lesson-3-quiz | 132351983831 | 2 | | WO-6 |
| 1.4 | ap-cybersecurity-unit-1-ai-driven-threats | 132157866199 | **35** | 8 | WO-6 |
| 1.4 | ap-cyber-unit-1-lesson-4-exercise-1 | 132673732823 | 4 | 2 | WO-6 |
| 1.4 | ap-cyber-unit-1-lesson-4-exercise-2 | 132673634519 | 8 | 2 | WO-6 |
| 1.4 | ap-cyber-unit-1-lesson-4-lab | 132673700055 | 7 | | WO-6 |
| 1.4 | ap-cyber-unit-1-lesson-4-quiz | 132673667287 | 5 | | WO-6 |
| 1.5 | ap-cybersecurity-unit-1-ai-cyber-defense | 132230676695 | 6 | 1 | WO-6 |
| 1.5 | lesson-5 exercise-1, exercise-2, lab, quiz | | 0 | | clean |
| | ap-cyber-unit-1-exam | 132079550679 | **55** | 5 | **WO-7** |
| | ap-cyber-unit-1-case-file-1 | 135701299415 | 9 | | WO-8 |

\* Remaining hits are explanatory copy stating the terms are not assessed. Every
one has to be read in context before it is called clean; the count alone cannot
tell teaching from disclaiming.

## Work orders

- **WO-1, Topic 1.1 Exercise 2.** Done, live, verified. An 8-way attack-type
  sorter became 15 CED items in three parts: tactic ID (intimidation, urgency,
  both, neither), impact classification (1.1.C.1 to C.3), and I/II/III
  multi-select. Reference implementation for new interactive builds.
- **WO-2, Topic 1.1 Lab.** CSV built and validated, not yet imported. Kept all
  four email specimens, swapped the tactic dropdown from the Unit 2 six-option
  list to intimidation/urgency/both/neither, rekeyed all four, rewrote a false
  exam tip. Reference implementation for surgical repair that preserves content.
- **WO-3, Topic 1.1 lesson.** Imported and verified live 2026-08-27. See
  `docs/runs/2026-08-27-claude-code-cyber-u1-wo3.md`. Regenerate the sheet with
  `node scripts/cyber-u1-topic11-ced-csv.js out/wo3-topic11.csv`.
- **WO-4, Topic 1.2 lesson.** New authored content, not a sweep. 176 off-CED:
  credential stuffing x50, brute force x47, rainbow tables x43, password spraying
  x35. The CED replaces all of it with detection signals (1.2.A.2), password
  pattern psychology (1.2.B.1), targeted dictionary construction (1.2.B.2) and
  defenses (1.2.C). Teach the 1.1.C.1 to 1.2.B.2 link explicitly.
- **WO-5, Topic 1.2 exercises and lab.** Lab 1.2 is a brute-force and
  rainbow-table exercise. Rebuild around log analysis: give students an
  authentication log and have them identify the 1.2.A.2 signals. The CED
  Scenario 1B EMMA 8-entry login log already exists (IPs 208.104.29.211 and
  142.54.195.17); use it.
- **WO-6, Topics 1.3, 1.4, 1.5.** Mostly mechanical, batch into one CSV.
  1.3: evil twin instead of MITM and rogue access point, drop WPA2 and WPA3, add
  skill-level classification, zero days, jamming as DoS, war driving, the VPN
  caveat, HTTPS. 1.4: digital avatar instead of deepfake, add prompt extraction,
  training-set poisoning, AI recon, AI-assisted malware, and all four 1.4.B
  defenses. 1.5: near clean, reinforce the human-review clause.
- **WO-7, Unit 1 Exam.** Replace. 55 off-CED across 13 terms in the graded
  artifact at the end of the free preview unit. Rebuild with per-topic coverage
  proportional to the CED.
- **WO-8, case file and hub.** Light edits once the lessons are correct. The hub
  "Start Here" block drafted earlier was built against an incorrect diagnosis;
  re-derive it rather than importing it.

Suggested order from here: WO-7, then WO-4 with WO-5, then WO-6, then WO-8. Then
run `ced_audit.py` against Units 2 through 5. Unit 2 is the likely next problem,
since it owns the tactic list that leaked into Unit 1 and the boundary may be
blurred in both directions.

## House rules for this course

### Citing the CED to students

**The EK code is teacher knowledge. Do not put it in front of students by
default.** A student reading a lesson does not need to be told that intimidation
is 1.1.A.2. They need to know what intimidation is and how to spot it in a
message. Name the idea, not the code.

Write "secure information, such as a one-time password" and not "secure
information (1.1.C.2)". Write "the CED names two tactics" and not "EK 1.1.A.2
names two tactics". The sentence is shorter and it teaches the same thing.

Three places a code still earns its place:

- **The Essential Knowledge coverage table.** It exists to be audited against the
  framework, and it is collapsed by default, so a student only meets it if they
  go looking.
- **A claim that something is not assessed, or belongs to another unit.** There
  the code is the evidence. "Pretexting is a real CED term, at 2.1.A.3 in Unit 2"
  is checkable in a way that "pretexting is Unit 2 content" is not, and the
  checkability is the point of saying it at all.
- **Teacher-facing artifacts**: exit ticket answer keys, teacher guides, pacing
  documents. Nobody is reading those to learn the topic.

Beyond those, one orientation tag on a concept card is the most a lesson page
should carry, and only where the page is explicitly teaching the structure of
the topic rather than the topic itself. If a code is doing anything other than
proving a claim or letting a teacher audit, cut it and keep the idea.

**The cautionary number.** The rebuilt Topic 1.1 lesson shipped with **218 EK
codes in student-visible text**, roughly one every 300 characters: 31 in the
tactics section, 30 in the FAQ, 21 in the vocabulary table, 20 in the quick
reference. Every one of them was defensible on its own and the accumulation was
not. Writing to a framework makes it very easy to write the framework onto the
page.

`validate_csv.py` counts them and warns past a threshold. It is a warning rather
than a failure because the judgement is real: a page teaching how Topic 1.1 is
organised legitimately cites more than a page teaching what social engineering
is. The count exists to make the accumulation visible, not to pick the number.

### MCQ standards
Harder only, priority to spot-the-error and I/II/III multi-correct. No giveaway
names. Options parallel in length and structure. Bold **NOT** and **EXCEPT** in
stems. No "all of the above" or "none of the above"; a substantive option like
"none of the three 1.1.C impacts applies" is a real classification and is fine,
but do not place it last. Key balance about 25% per letter, no letter above 35%,
no three consecutive the same. Predict-first boxes default OFF.

### Shopify CSS
The theme fights you. Scope everything under a unique wrapper id, `all:initial
!important` on the wrapper, `!important` and `-webkit-text-fill-color` on every
color declaration, white text on colored buttons with `:link` and `:visited`
overrides. The theme auto-reverts button and title colors on save or deploy, so
hard-code with `!important` and re-verify live after every import.

### Encoding
Author new markup in pure ASCII and use HTML entities. Past imports produced
mojibake. Existing `ucnav` markup contains characters that render correctly;
leave them. No emoji in new content.

### Matrixify
Columns for pages: `ID, Handle, Title, Body HTML, Command`. `Command: MERGE`,
always, or you get duplicates. Never include `Body HTML` unless that row updates
the body, because an empty cell wipes it. Never include `Published At`, because
setting it to server-now unpublishes and reorders. Script and style tags survive
the import. Import large CSVs directly and never open them in Excel, which
truncates cells at 32,767 characters.

### Verifying live
Fetch `https://www.apcsexamprep.com/pages/<handle>.json`. The `www` subdomain is
required; non-www is blocked by Cloudflare. Expect roughly 30 seconds of CDN lag
after an import. A stale body is not a failed import: confirm against the Shopify
Admin API `updatedAt`, which bypasses the CDN, before re-importing anything.

## Open item outside these work orders

The Unit 1 slide decks use 10 to 12pt body text, unreadable projected. The
reporting teacher rewrote her own copies at 18 to 22pt and asked whether the
master deck is fixed going forward. That is a deck-template fix, not a page fix,
and no work order here covers it.
