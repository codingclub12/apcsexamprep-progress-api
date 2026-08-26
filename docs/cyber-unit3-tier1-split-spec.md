# Cyber Unit 3 Tier 1 split spec: CED 3.3 and 3.4

The per-deck instruction sheet for splitting the two Unit 3 lessons that split
cleanly. Slide numbers are positions in the shipped TEACHER deck, read from
Drive on 2026-08-26. The STUDENT deck of each pair has the same structure and
takes the same cuts.

Background and the wider plan:
`docs/runs/2026-08-26-claude-code-cyber-unit3-slide-day-map.md`.

**Do not use the teacher guides' Slides columns as the cut list.** They do not
match the shipped decks. 3.4's Day 2 row happens to be right; almost nothing
else in the unit is. This file is the cut list.

## Why these two first

They are the only Unit 3 lessons whose learning-objective seams fall on real
section dividers at roughly the right place. 3.2 needs a day written from
scratch; 3.1 and 3.5 need about 64 new content slides between them and 3.1 is
blocked on the LO 3.1.C question (board #99). These two are mechanical.

Hand-split them in PowerPoint. A script is not worth writing for four decks:
the mechanical part is a range delete, and everything else on this page is
authoring that a script cannot do anyway.

## CED 3.4 Firewalls, 21 slides, 2 days

Its title slide **already reads DAY 1 OF 2** while its speaker notes call it "a
single comprehensive day". Someone started this split and stopped.

Cut: **Day 1 = slides 1-12** (LO 3.4.A + 3.4.B), **Day 2 = slides 13-21**
(LO 3.4.C + 3.4.D). Section dividers land exactly on 13 and 16, so the seam is
real.

| Slide | What it is | Goes to |
| --- | --- | --- |
| 1 | Title, "The Bouncer at Every Door" | Day 1 |
| 2 | Lesson objectives, all four LOs | Day 1 (edit) |
| 3 | Bell ringer, the SSH rule-order pair | Day 1 |
| 4 | Guided notes, four sections | Day 1 (edit) |
| 5 | Section 01 divider, LO 3.4.A | Day 1 |
| 6 | What a firewall is (EK 3.4.A.1) | Day 1 |
| 7 | The three types (A.2, A.3, A.4) | Day 1 |
| 8 | Key vocabulary (LO 3.4.A) | Day 1 |
| 9 | Misconception: stateful vs NGFW | Day 1 |
| 10 | Section 02 divider, LO 3.4.B | Day 1 |
| 11 | What an ACL is, parts of a rule (B.1, B.3) | Day 1 |
| 12 | First match wins (B.2) | Day 1 |
| 13 | Section 03 divider, LO 3.4.C | Day 2 |
| 14 | Where firewalls belong (C.1, C.2, C.3) | Day 2 |
| 15 | Misconception: one perimeter firewall | Day 2 |
| 16 | Section 04 divider, LO 3.4.D | Day 2 |
| 17 | From requirements to rules (D.1, D.2, D.3) | Day 2 |
| 18 | Worked walkthrough, two orders two outcomes | Day 2 |
| 19 | Enrichment, ordering a multi-rule ACL | Day 2 |
| 20 | Stop and Think, three questions across A-D | Day 2 (edit) |
| 21 | Firewalls in one slide | Day 2 |

### New slides to author for 3.4

Six, not five. **Day 1 has no Stop and Think of its own** - the deck's only one
is slide 20, and it lands in Day 2. That is the trap in this deck: a pure range
cut leaves Day 1 ending on "First match wins" with no practice and no close.

- **Day 1 + Stop and Think** covering 3.4.A and 3.4.B only. Name a firewall
  type from a description; trace an inbound packet through a two-rule ACL.
  Slide 20's questions 1 and 2 are already scoped to A and B and can move or be
  copied here; question 3 is placement (3.4.C) and must stay in Day 2.
- **Day 1 + day-close** (TODAY YOU LEARNED / UP NEXT / TEASER). Tease rule
  order deciding what actually gets through, which is Day 2's payoff.
- **Day 2 + title**, badged DAY 2 OF 2, with a day-specific subtitle.
- **Day 2 + bell ringer** calling back to Day 1's first-match-wins rule.
- **Day 2 + day objectives**, LO 3.4.C and 3.4.D only.
- **Day 2 + guided-notes preview**, sections 3 and 4 only.

Result: Day 1 = 14 slides, Day 2 = 13.

## CED 3.3 Segmentation, 20 slides, 2 days

The cleanest deck in the unit. Cut: **Day 1 = slides 1-11** (LO 3.3.A),
**Day 2 = slides 12-20** (LO 3.3.B).

| Slide | What it is | Goes to |
| --- | --- | --- |
| 1 | Title, "Don't Let One Open Door Sink the Ship" | Day 1 |
| 2 | Lesson objectives | Day 1 (edit) |
| 3 | Bell ringer, flat network and spreading malware | Day 1 |
| 4 | Guided notes, three sections | Day 1 (edit) |
| 5 | Section 01 divider, LO 3.3.A | Day 1 |
| 6 | Technique 1, screened subnet / DMZ (A.1) | Day 1 |
| 7 | Technique 2, subnetting (A.2) | Day 1 |
| 8 | Technique 3, VLANs (A.3) | Day 1 |
| 9 | Misconception: VLANs need separate switches | Day 1 |
| 10 | Key vocabulary (LO 3.3.A) | Day 1 |
| 11 | **Stop and Think (LO 3.3.A)** | Day 1 |
| 12 | Section 02 divider, LO 3.3.B | Day 2 |
| 13 | Segmentation defined, why isolation helps (B.1, B.2) | Day 2 |
| 14 | Two more reasons (B.3, B.4) | Day 2 |
| 15 | Worked walkthrough, benefit to EK | Day 2 |
| 16 | Enrichment, designing the submarine network | Day 2 |
| 17 | Key vocabulary (LO 3.3.B) | Day 2 |
| 18 | Misconception: one edge firewall is enough | Day 2 |
| 19 | Stop and Think (LO 3.3.B) | Day 2 |
| 20 | Segmentation in one slide | Day 2 |

### New slides to author for 3.3

Five. Day 1 already ends on its own Stop and Think, so only the close is
missing.

- **Day 1 + day-close**, teasing why isolation actually stops a breach.
- **Day 2 + title**, badged DAY 2 OF 2.
- **Day 2 + bell ringer** calling back to the flat-network malware.
- **Day 2 + day objectives**, LO 3.3.B only.
- **Day 2 + guided-notes preview**, section 2 (and the enrichment) only.

Result: Day 1 = 12 slides, exactly the house norm. Day 2 = 13.

**Start with 3.3.** Despite 3.4's guide already matching its deck, 3.3 needs one
fewer authored slide and its Day 1 lands on the house length without help.

## Edits that apply to every day deck

Easy to miss, and each one is visible to a teacher.

1. **Footers.** Every slide reads `Slide N of 21` / `of 20` today. Denominators
   are **per-day** in this course and restart each day: Unit 1 Lesson 1.1 Day 2
   reads `Slide N of 12`. So 3.4 becomes `of 14` then `of 13`; 3.3 becomes
   `of 12` then `of 13`.
2. **Title badge.** 3.3's reads DAY 1 OF 1 and must become DAY 1 OF 2. 3.4's
   already reads DAY 1 OF 2. Both Day 2 decks need DAY 2 OF 2. The subtitle
   line under the badge is day-scoped too.
3. **Speaker notes on the title slide.** Both decks narrate themselves as
   whole-lesson: 3.3 says "Today is a single comprehensive deck covering both
   learning objectives", 3.4 says "a single comprehensive day". Left alone, a
   Day 2 deck opens by telling the teacher it covers everything. Rewrite both.
4. **Objectives slide** lists the lesson's full LO set. Scope it to that day's.
5. **Guided-notes preview** lists every section. Scope it to that day's, and
   say "Your Day 2 Guided Notes" rather than "Day 1".
6. **Section numbering continues across days.** Do not renumber. Unit 1's Day 2
   deck opens on "03 SECTION" because sections run through the lesson, not the
   day. So 3.4 Day 2 opens on section 03 and 3.3 Day 2 opens on section 02.

## Guided Notes have to split too

Every Unit 3 lesson ships one `Day1_Notes_STUDENT.docx` + `Day1_Notes_KEY.docx`
covering the whole lesson. Unit 1 ships a pair per day. A Day 2 deck whose
notes preview names sections the packet does not contain is worse than no
split at all, so each lesson's notes split on the same seam as its deck.

## What happens after the split

1. Tanner runs `scripts/cyber-slides-conversion.gs` over the new files to get
   Google Slides copies. Claude cannot do this step; both limits were tested,
   not assumed.
2. The resulting sheet goes through `scripts/cyber-slide-embeds-from-csv.js`.
   It currently **refuses Unit 3 rows on purpose**. Lifting that refusal means
   adding the lessons to `config/cyber-slide-manifest.js`, keyed by **CED topic
   number** - `'3-3'` is Segmentation, `'3-4'` is Firewalls. That file's header
   carries the decision and the trap it avoids.
3. Screenshot the panel at a phone width and a desktop width. The CSP build
   found two real defects that passed every DOM assertion and were only visible
   in a picture. Nothing in cyber has been photographed yet.

## Numbers, for the record

| | Slides now | Days | Day 1 after | Day 2 after | New slides |
| --- | --- | --- | --- | --- | --- |
| CED 3.3 Segmentation | 20 | 2 | 12 | 13 | 5 |
| CED 3.4 Firewalls | 21 | 2 | 14 | 13 | 6 |

Eleven authored slides and four range cuts, producing eight deck files from
four. The run note estimated five new slides per lesson; 3.4 needs six, because
its only Stop and Think falls on the Day 2 side of the seam.
