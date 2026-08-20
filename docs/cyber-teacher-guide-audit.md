# AP Cybersecurity Teacher Guide audit

All 24 shipped Teacher Guides in the `AP Cybersecurity Course` Drive folder were
read end to end on 2026-08-20 while compiling a course map for a customer. Three
defects surfaced. None of them could be fixed from a Claude Code session: the
Google Drive connector exposes `update_file` for metadata only (title and parent),
so there is no content-write path to a `.docx` in Drive. This file is the work
order so the fix is mechanical wherever it happens.

Board tasks: #98 (4.1), #99 (3.1), #100 (format drift).

## The shape of the course, for reference

Verified against the guides, and independently corroborated by
`tools/cyber-pacing/pacing.json` (Teach days per unit: 14 / 21 / 20 / 15 / 30).

| Unit | Lessons | Teach days | LOs |
| --- | --- | --- | --- |
| 1 Introduction to Security | 5 | 14 | 13 |
| 2 Securing Spaces | 4 | 21 | 15 |
| 3 Securing Networks | 5 | 20 | 15 |
| 4 Securing Devices | 4 | 15 | 16 |
| 5 Securing Applications and Data | 6 | 30 | 19 |
| **Total** | **24** | **100** | **78** |

## 1. Lesson 4.1 has an orphaned learning objective (#98)

`Lesson_4.1_Device_Vulnerabilities/Teacher_Guide.docx`
(file id `1dMRvsAzJKVn7arxGfL47brlLsLHHfcRr`)

The guide lists four learning objectives:

- LO 4.1.A Identify types of computing devices.
- LO 4.1.B Identify the type of malware used in a cyberattack.
- LO 4.1.C Explain how adversaries can exploit common device vulnerabilities...
- **LO 4.1.D Assess and document risks from device vulnerabilities.**

`LO 4.1.D` is unsupported in three separate ways:

1. There are no `EK 4.1.D.*` statements. The essential knowledge section stops
   at `EK 4.1.C.7`.
2. No pacing day covers it. Days 1-6 map to 4.1.A, 4.1.B, and 4.1.C only.
3. The lesson overview paragraph contradicts the list: it says the guide spans
   "three learning objectives in the topic's tested scope" and then names only
   A, B, and C.

## 2. Lesson 3.1 has the mirror-image defect (#99)

`Lesson_3.1_Network_Vulnerabilities/Teacher_Guide.docx`
(file id `1cBUK8OPbsOXUBIcTzK6N69SXnI-jSslS`)

The guide declares only `LO 3.1.A` and `LO 3.1.B`, but the Day 6 pacing table
contains this row:

> Assess and document vulnerability risk: high, moderate, low (EK 3.1.C.1-C.6) | Website | 10 min

So Day 6 teaches a `3.1.C` strand that has no learning objective and no
essential knowledge statements anywhere in the document.

### Why 1 and 2 are probably the same missing thing

Every other "vulnerabilities" opener topic carries an assess-and-document
objective as its last LO:

- `LO 2.2.C` Assess and document risks from physical vulnerabilities.
- `LO 5.1.C` Assess and document risks from application and data vulnerabilities.

3.1 and 4.1 are the two openers where that strand is incomplete: 4.1 has the
objective without the content, 3.1 has the content reference without the
objective. The likely truth is that both topics really do have an
assess-and-document strand and the essential knowledge was never written in,
rather than that the stray LO and the stray EK reference are both typos.

### Blocked, and on what

Deciding between "author the missing EKs" and "delete the stray references"
requires the actual College Board CED, and writing the EK text requires it
verbatim, because every guide presents its essential knowledge as "verbatim
from the CED". That text is not obtainable from a Claude Code session:

- `docs/ced-snapshot/` is empty until the first Actions run.
- `apcentral.collegeboard.org` is not on the agent proxy allowed-domains list,
  so all CED sources return 403 from a session.

Unblock by either adding `apcentral.collegeboard.org` to the environment's
Custom allowed domains, or pasting the CED text for Topics 3.1 and 4.1 into the
task. Do not let an agent draft the EK statements from inference; guides that
claim verbatim CED text must contain verbatim CED text.

## 3. Header and section format drift (#100)

Most guides open with a metadata line in this form:

> Unit 2 - Topic 2.2 - 5 class periods - Scenario 2A

Six use a different form that omits the class-period count, which is the one
number a teacher planning a calendar actually wants:

| Lesson | Current header | File id |
| --- | --- | --- |
| 3.4 Protecting Networks: Firewalls | `Unit 3: Securing Networks - LO 3.4.A-3.4.D` | `1wTQ8dChQ1kE0pGuK6Dx4NHSBfL8XDffn` |
| 4.3 Protecting Devices | `Unit 4: Securing Devices - LO 4.3.A-4.3.D` | `19N8wE2QyAtI4OPZHbDXUB1LKKJ8aMBxu` |
| 4.4 Detecting Attacks on Devices | `Unit 4: Securing Devices - LO 4.4.A-4.4.D` | `1UobAGto1CMMp_lO0rn7LmEOaijiVJB6s` |
| 5.3 Protecting Stored Data with Encryption | `Unit 5: ... - LO 5.3.A-5.3.B` | `1P9HqGGlLfs3pYx20FuPuokwpw0TI_Ws-` |
| 5.4 Asymmetric Encryption | `Unit 5: ... - LO 5.4.A-5.4.C` | `1ZylPMBToKm3dwGF8l7O1Y1draKh-9wHo` |
| 5.5 Protecting Applications | `Unit 5: ... - LO 5.5.A-5.5.B` | `1aVlApjSEah5jqzc65ansOW33KJ4xSoYa` |

Target form, with the day counts already verified from each pacing table:

- 3.4 - `Unit 3 - Topic 3.4 - 2 class periods - Worked ACL examples`
- 4.3 - `Unit 4 - Topic 4.3 - 2 class periods - Policy excerpts`
- 4.4 - `Unit 4 - Topic 4.4 - 2 class periods - Annotated auth-log handout`
- 5.3 - `Unit 5 - Topic 5.3 - 4 class periods - OpenSSL / AES Crypt lab`
- 5.4 - `Unit 5 - Topic 5.4 - 5 class periods - Scenario 5B`
- 5.5 - `Unit 5 - Topic 5.5 - 2 class periods - Input-validation pseudocode`

Two smaller items in the same pass:

- `Lesson_3.5` (`16DRFx8VKowNqg26PsNpezctlOXThxViB`) is missing the
  **Materials & setup** and **Prerequisites** sections that every other guide
  carries. It jumps straight from essential knowledge to pacing.
- `Lesson_4.3` Day 1 pacing names the managerial controls as "acceptable use,
  passwords, training", but `EK 4.3.A.3` is the **software installation policy**,
  not training. The row should read "acceptable use, passwords, software
  installation".

## Naming note

The 2.3 lesson folder is `Lesson_2.3_Protecting_Physical_Spaces` while the guide
inside titles the lesson "Protecting Spaces", and 2.4's folder is
`Lesson_2.4_Detecting_Physical_Attacks` against a guide title of "Detecting
Attacks". Harmless, but worth knowing before anyone greps for a lesson by name.
