# AP Cybersecurity Units 2-5: CED alignment audit

**Status:** audit only. Nothing has been changed on the site. Run 2026-08-27
against the live pages and the Fall 2026 CED.
**Source of truth:** `ap-cybersecurity-course-and-exam-description.pdf`, effective
Fall 2026, (c) 2026 College Board, retrieved from apcentral.collegeboard.org on
2026-08-27. `tools/ap-cyber-ced/CED-UNITS-2-5-EXTRACT.txt` is a cleaned dump of
the Unit 2-5 framework section for grepping. Where the two disagree, the PDF wins.
**Method:** `tools/ap-cyber-ced/ced_audit_v2.py` over 127 live page bodies pulled
from `www.apcsexamprep.com/pages/<handle>.json`.

This is the follow-on the Unit 1 realignment asked for: "then run ced_audit.py
against Units 2 through 5." It could not be run as written, for the reason in the
next section, so the tooling was rebuilt first.

## Read this before trusting the Unit 1 term list

`docs/ap-cyber-unit1-ced-realignment.md` lists 27 terms under the heading "Zero
occurrences in the CED", and `tools/ap-cyber-ced/ced_audit.py` encodes the same
list as `OFF`. **Eleven of those terms are in the CED.** They are absent from
Unit 1 and present in Units 2 through 5:

| Term | Actually lives in |
|---|---|
| shoulder surfing | 2.2.A.4 |
| dumpster diving | 2.2.A.5 |
| keylogger | Units 2 and 4 |
| man-in-the-middle | Unit 3 |
| rogue access point | Unit 3 |
| WPA3 | Unit 3 |
| credential stuffing | Unit 4 |
| password spraying | Unit 4 |
| brute force | Unit 4 |
| rainbow table | Unit 4 |
| honeypot | Unit 5 |

The list was correct for the job it was built for, which was Unit 1, and the
label put on it was wrong. Running it unchanged against Units 2-5 reports correct
CED content as a violation, which is the expensive kind of false positive: it
sends someone to rewrite a page that was already right. `ced_audit_v2.py` replaces
the hard-coded list with `ced_term_index.json`, which maps each term to the units
whose framework contains it, built from the PDF.

The other 16 terms are genuinely absent from the whole CED and the Unit 1
conclusions built on them stand.

## The CED has 24 topics, and three site lessons are not among them

Exactly: 1.1-1.5, 2.1-2.4, 3.1-3.5, 4.1-4.4, 5.1-5.6.

**There is no topic 2.5, no topic 3.6 and no topic 4.5.** The site teaches all
three as full lessons with their own exercises, labs and quizzes.

| Site lesson | Site title | CED |
|---|---|---|
| 2.5 | Access Controls | no such topic. Content is CED 5.2 (access control models, least privilege, RBAC) |
| 3.6 | Network Security Policies and Wireless | no such topic. Content is TLS and secure protocols; the CED's wireless material is 3.2 |
| 4.5 | Securing IoT and Embedded Devices | no such topic |

Unit 4's hub links 4.5 as a normal lesson, so it is in the student path.

## Unit 3 numbering does not match the CED

This is the most consequential finding, because the numbers are what a teacher
follows.

| Topic | CED | Site |
|---|---|---|
| 3.1 | Network Vulnerabilities and Attacks | Network Fundamentals and Attack Surface |
| 3.2 | Protecting Networks: Managerial Controls and Wireless Security | **Network Attacks** |
| 3.3 | Protecting Networks: Segmentation | **Firewalls and Packet Filtering** |
| 3.4 | Protecting Networks: Firewalls | **Network Segmentation and VLANs** |
| 3.5 | Detecting Network Attacks | IDS, IPS and SIEM |
| 3.6 | *does not exist* | Network Security Policies and Wireless |

**Site 3.3 and 3.4 are each other's CED topics.** A teacher who assigns "3.4
Firewalls" from the CED sends the class to Network Segmentation.

The site's own 3.2 page carries a section heading reading "Topic 3.2 / CED 3.1
Attacks", so the page already knows it is teaching CED 3.1 material under a
different number. CED 3.2, managerial controls and wireless security, has no
lesson of its own; the wireless half is folded into the non-existent 3.6, whose
page title ("Network Security Policies and Wireless") does not match its own H1
("Lesson 3.6: Secure Network Protocols").

This also puts the site at odds with the teacher decks. `docs/cyber-unit3-tier1-split-spec.md`
splits "CED 3.4 Firewalls" across two days, following the CED. The site's 3.4 is
Segmentation. Decks and pages disagree about what 3.4 is, which is the likeliest
root of the "slides columns do not match the shipped decks" note in that file.

## Unit 2 carries a second, orphaned lesson set

Unit 2 was realigned to the CED at some point: the hub links four lesson pages
that match CED 2.1-2.4 exactly. The pre-realignment set was never retired. All
five legacy pages are still `isPublished: true` and reachable:

| Legacy page | Declares | Title still says |
|---|---|---|
| ap-cybersecurity-unit-2-cia-triad | 2.1 | Topic 2.1: The CIA Triad |
| ap-cybersecurity-unit-2-defense-in-depth | 2.2 | Topic 2.2: Defense-in-Depth |
| ap-cybersecurity-unit-2-physical-security | 2.3 | Topic 2.3: Physical Security |
| ap-cybersecurity-unit-2-risk-assessment | 2.4 | Topic 2.4: Risk Assessment |
| ap-cybersecurity-unit-2-access-controls | 2.5 | Topic 2.5: Access Controls |

Two consequences. Search and old links land students on the superseded lesson,
and four of these declare the same `data-lesson-id` as the live CED-aligned page
for the same topic, so both write to the same `lesson_id`. The `ap-cyber-unit-2-lesson-5-*`
activity set (exercise 1, exercise 2, lab, quiz) is live and unlinked from the
hub, and declares lesson 2.5.

## Twenty Unit 5 activity pages cannot report progress

Every activity for 5.1 through 5.5, all four types, carries no `data-lesson-id`.
Only 5.6's four activities have it. Nothing these twenty pages grade can reach the
gradebook. This is a reporting defect rather than a CED one, and it is listed here
because the same sweep found it.

## Activities that do not match their own lesson

The sharpest cases, where an activity grades material its lesson page never
mentions.

### 5.3, the worst of them

CED 5.3 is Protecting Stored Data with Cryptography: LO 5.3.A explains encryption,
5.3.B applies symmetric algorithms. The lesson page is correct, covering crypto
vocabulary, AES and OpenSSL.

All four of its activities test **hashing**: SHA-256, salting, rainbow tables,
file integrity, code signing with SHA-1. The lesson page contains none of those
words. Hashing is CED 4.2.A and 5.6.D, not 5.3. A student who reads 5.3 and then
sits its quiz has been taught none of what is on it.

### 5.2 quiz is a cryptography quiz

Lesson 5.2 is Managerial Controls and Access Controls. Its quiz asks about
3DES-CBC, AES-256, symmetric versus asymmetric in TLS, and GCM tag mismatch
handling. That is 5.3 and 5.4 material, and 3DES, TLS and GCM are absent from the
CED entirely. Off-lesson and off-syllabus at once.

### 3.5 lab grades the wrong attack model

`ap-cyber-unit-3-lesson-5-lab` has an 8-point graded step, "Map Events to the
Cyber Kill Chain", keyed to the Lockheed Martin seven stages: Reconnaissance,
Weaponization, Delivery, Exploitation, Installation, Command and Control, Actions
on Objectives.

The CED's model is EK 2.1.C.1 and has **six** phases: Reconnaissance, Initial
access, Persistence, Lateral movement, Taking action, Evading detection.

Only Reconnaissance is common to both. Six of the seven stages a student is
graded on are not in the CED, and five of the six phases the CED will examine are
not in the lab. Unit 2's own pages (`cyber-foundations`, `cyberattack-phases`,
`lesson-1-lab`) use the correct six. Unit 3 lesson 5 and Unit 4 lessons 1 and 3
use the Lockheed model or a blend.

### The rest

| Activity | Grades, but its lesson never mentions |
|---|---|
| 3.1 quiz | SCADA x8 |
| 3.2 exercise 2 | SCADA x6 |
| 3.4 exercise 2 | SCADA x27 |
| 3.2 quiz | virus, ransomware, SQL injection, antivirus |
| 3.3 exercise 2 | botnet, zero day, patch |
| 3.4 exercise 1 | WPA3, encryption |
| 4.4 lab | firewall, baseline, BYOD, LDAP, syslog, SIEM |
| 5.5 lab | endpoint x13, CSRF, credential stuffing, proxy |
| 5.6 exercise 2 | ransomware, credential stuffing, syslog |
| 2.1 quiz / lab | badge, permissions, command and control |
| 2.4 quiz | familiarity, surveillance |

## Off-CED and wrong-term counts

Exact-match counts across BODY and JS. "Off-CED" means the term is in no part of
the CED and the CED has no other name for it. "Wrong-term" means the CED teaches
the concept under a different name, which costs a student the item even though
they learned the idea.

| Unit | Pages | Off-CED hits | Wrong-term hits | Pages affected |
|---|---|---|---|---|
| 2 | 33 | 103 | 236 | 20 |
| 3 | 34 | 200 | 128 | 25 |
| 4 | 27 | 59 | 5 | 11 |
| 5 | 33 | 76 | 30 | 24 |

Worst pages: `unit-2-physical-security` (48 wrong-term), `unit-2-cia-triad` (42),
`unit-3-lesson-2` (22 off-CED, 48 wrong-term), `unit-3-lesson-4-exercise-2` (27
off-CED), `unit-2-access-controls` (37 off-CED), `unit-4-lesson-5` (17 off-CED).

### The renames worth fixing first

| Site says | CED says |
|---|---|
| mantrap | vestibule (2.3) |
| CCTV, surveillance | camera |
| DNS spoofing | DNS poisoning |
| ARP spoofing | ARP poisoning |
| input validation | input sanitization (5.5.B) |
| audit log, event log | log file |
| CIA triad | confidentiality, integrity, availability. The CED never uses the label |
| kill chain, weaponization, actions on objectives | phases of a cyberattack (2.1.C) |

`mantrap` alone appears 27 times on `protecting-physical-spaces`, 23 on
`physical-security` and 16 on `physical-vulnerabilities`.

### Genuinely off-syllabus terms taught as content

SCADA, BYOD, 3DES, XOR, CSRF, PKI, proxy, RADIUS, Kerberos, WPA2, adware,
sandboxing, honeynet, network access control, botnet, nation-state, separation of
duties, single sign-on, smart card, privilege escalation, insider threat.

Not every hit is a defect. Naming a term while telling students it is not assessed
is allowed and is what the Unit 1 enrichment sections do. Teaching it as something
to learn, sort or classify is not. Read the context of each before acting:

```
python3 tools/ap-cyber-ced/ced_audit_v2.py <pagedir> --unit=3
```

## Two board tasks rest on a false premise

Both should be re-read against the CED before anyone works them.

- **Task #99**, "Cyber 3.1 Teacher Guide: Day 6 pacing cites EK 3.1.C.1-C.6 but no
  LO 3.1.C exists." LO 3.1.C exists, "Assess and document risks from network
  vulnerabilities", with exactly six EKs, 3.1.C.1 through 3.1.C.6. The teacher
  guide is right and the audit that filed the task was wrong.
- **Task #98**, "Cyber 4.1 Teacher Guide: LO 4.1.D is orphaned (no EKs, no pacing
  day)." LO 4.1.D exists, "Assess and document risks from device vulnerabilities",
  with four EKs. The "no pacing day" half may still hold; the "no EKs" half does not.

## Suggested order

Nothing here is shipped. Ordered by exam damage per unit of work.

1. **Unit 3 renumbering.** Swap 3.3 and 3.4 to match the CED, decide where CED 3.2
   lives, and retire or renumber 3.6. Largest blast radius, touches decks, teacher
   guides, the manifest and every internal link, so it wants a plan before a CSV.
2. **5.3 activity set.** Four activities test hashing for a lesson that teaches
   symmetric encryption. Either rebuild them against 5.3.A and 5.3.B, or move them
   to 5.6 where file-integrity hashing belongs.
3. **5.2 quiz.** Replace the cryptography items with managerial and access control
   items.
4. **3.5 lab kill chain.** Rekey the 8-point step to the CED's six phases.
5. **Unit 2 legacy set.** Unpublish or redirect the five superseded pages and
   decide what happens to the 2.5 activity set.
6. **Unit 5 lesson ids.** Inject `data-lesson-id` on the twenty activity pages for
   5.1 through 5.5. Chat-side Matrixify work, same as the Unit 1 gap.
7. **Renames.** Mechanical, batchable into one CSV per unit. mantrap, CCTV,
   DNS/ARP spoofing, input validation, CIA triad.
8. **2.5 and 4.5.** Decide whether they are cut, folded into a real topic, or kept
   and clearly marked as enrichment beyond the CED.

## Reproducing this

```
./tools/ap-cyber-ced/fetch_pages.sh ./pages       # Unit 1 handles; edit for 2-5
python3 tools/ap-cyber-ced/ced_audit_v2.py ./pages --unit=3
```

`fetch_pages.sh` needs the `www` subdomain and a browser User-Agent. From a
container it also needs `Accept`, `Accept-Language` and `Sec-Fetch-Mode: navigate`
or Cloudflare serves an interstitial instead of the JSON.

The CED PDF is not vendored: it is copyrighted and 5.9 MB. It is a straight
download from
`https://apcentral.collegeboard.org/media/pdf/ap-cybersecurity-course-and-exam-description.pdf`
and is AES-encrypted with an empty user password, so a text extractor needs
`cryptography` installed alongside `pypdf`.
