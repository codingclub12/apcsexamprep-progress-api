# 2026-08-26 claude code: what Unit 3's decks actually are, before splitting them

An investigation that turned into a decision. Tanner wants per-day slide decks
for AP Cybersecurity Unit 3, which today ships five whole-lesson decks. This reads
the Drive folder, all five teacher guides, and all five teacher decks end to end
and records what the day map really is, where the guides disagree with the decks,
and what the split would actually cost.

It surfaced a numbering collision between the bundle and the site. Tanner resolved
it the same day by moving the site to CED numbering, which removes the collision
instead of managing it. That decision is recorded below, together with the
recommendation it overturned.

Nothing in Drive, the theme, or the manifest was modified.

## The inventory, read from Drive on 2026-08-26

`AP Cybersecurity Course/Unit_3_Securing_Networks` (`1Y0nRewDOb_WykM_93eicbCN2bxr9ANDE`)

| Bundle lesson | Guide days | Teacher deck slides | Notes | Title badge |
| --- | --- | --- | --- | --- |
| 3.1 Network Vulnerabilities | 6 | 22 | Day1 only | DAY 1 OF 1 |
| 3.2 Managerial Controls | 3 | 16 | Day1 only | DAY 1 OF 1 |
| 3.3 Segmentation | 2 | 20 | Day1 only | DAY 1 OF 1 |
| 3.4 Firewalls | 2 (header omits it) | 21 | Day1 only | **DAY 1 OF 2** |
| 3.5 Detecting Network Attacks | 7 | 25 | Day1 only | DAY 1 OF 1 |

Ten deck files, 104 teacher slides, ten guided-notes files, 20 teaching days.
The 20 matches `tools/cyber-pacing/pacing.json` ("Unit 3: 20 teach days") and
`docs/cyber-teacher-guide-audit.md`.

3.4's title slide already reads DAY 1 OF 2 while its own speaker notes say "a
single comprehensive day". Someone started that split and stopped.

## The guides' slide maps do not survive contact with the decks

This is the finding that changes the scope. The previous run note recorded that
3.1's guide "paces those same 22 slides across six periods: Day 1 is slides 1-7,
Day 6 is slides 21-22". The numbers do run 1 to 22. The **content at those
numbers does not match** what the guide says is there.

| Guide | Numbering | Usable as a split plan? |
| --- | --- | --- |
| 3.1 | continuous 1-22 | No. Wrong from Day 1 onward. |
| 3.2 | restarts each day (12/14/10) | No. Implies 36 slides; deck has 16. |
| 3.3 | restarts each day (14/13) | No. Implies 27 slides; deck has 20. |
| 3.4 | continuous 1-21 | Mostly. Day 2 matches the deck exactly. |
| 3.5 | continuous 1-25 | Partly. Day 7 has no deck slides at all. |

Two different conventions are in use across five guides in one unit: 3.1, 3.4 and
3.5 number continuously across the lesson; 3.2 and 3.3 restart at slide 1 every
day, which only makes sense against per-day decks that do not exist.

Concretely, for 3.1:

- Guide Day 1 says slide 5 is "How ARP maps IP to MAC". Slide 5 is a section divider.
- Guide Day 2 says slide 8 is MAC flooding. Slide 8 is Key Vocabulary.
- Guide Day 4 says slide 14 is the smurf attack. Slide 14 is wired vulnerabilities (3.1.B).
- Guide Day 5 says slide 19 is port security (B.3). Slide 19 is Risk = Impact x Likelihood (3.1.C).
- Guide Day 6 says slides 21-22 are wireless vulnerabilities. Slide 21 is a Stop
  and Think on 3.1.C and slide 22 is the summary.

The guide spreads the four named attacks one per day across Days 1-4. The deck
teaches all four on slides 6 and 7 and finishes LO 3.1.A by slide 12. These are
two different lessons, not one lesson described twice.

### The "Website" column is the tell

Where a guide's Slides column says "Website" instead of a number, the deck has
nothing for that beat. 3.2, 3.3 and 3.4 use real slide numbers throughout. 3.1
puts "Website" on five of six bell ringers plus two more Day 6 rows; 3.5 puts it
on six of seven bell ringers and on **all four rows of Day 7**.

The two lessons whose guides already lean hardest on the website are exactly the
two with the highest day counts and the thinnest decks. The guides were telling
us this already.

## What a real per-day cyber deck looks like

Calibrated against Unit 1 Lesson 1.1 Day 2 of 2 (`1UIg3ZEy2dc09IWcvkF0BzQQS0ewZY2Du`),
12 slides:

1. Title, badged DAY k OF n, with a day-specific subtitle
2. Bell ringer that calls back to the previous day
3. Day-scoped objectives ("By the End of Today You Will...")
4. Day-scoped guided-notes preview ("Your Day 2 Guided Notes have 2 sections")
5. Section divider - **numbering continues across days**, so Day 2 opens "03 SECTION"
6-8. Content, worked walkthrough, exam strategies
9. Stop and Think
10. Your Turn, with day-aware wording
11. Lesson in One Page
12. End-of-day slide: TODAY YOU LEARNED / UP NEXT / TEASER

Footers read "Slide N of 12" - **per-day denominators that restart each day**.
Every Unit 3 deck footer currently reads "of 16" / "of 20" / "of 22" / "of 25",
so every footer in the unit is rewritten by a split.

Guided Notes are per-day in Unit 1 (Day1 + Day2, STUDENT + KEY) and whole-lesson
in Unit 3. Splitting decks without splitting notes leaves a Day 4 deck pointing
at a notes packet that has no Day 4 section.

## What the split costs

Each new day adds five scaffold slides (title, bell ringer, objectives, notes
preview, day-close); the first day already has the opening four and the last day
already has the summary. So scaffold = 5 x (days - 1).

| Lesson | Slides | Days | As-is per day | + scaffold | Per day after |
| --- | --- | --- | --- | --- | --- |
| 3.1 | 22 | 6 | 3.7 | +25 | 7.8 |
| 3.2 | 16 | 3 | 5.3 | +10 | 8.7 |
| 3.3 | 20 | 2 | 10.0 | +5 | 12.5 |
| 3.4 | 21 | 2 | 10.5 | +5 | 13.0 |
| 3.5 | 25 | 7 | 3.6 | +30 | 7.9 |

House norm is about 12. Scaffolding alone lands 3.3 and 3.4 on it. Reaching 12
across all 20 days needs roughly 75 scaffold slides plus 64 new content slides,
about 139 new slides against 104 existing.

## Three tiers, not one job

Lesson numbers here are CED topic numbers, which after the decision below are the
site's numbers too.

**Tier 1, split now, near-zero authoring: 3.3 and 3.4.** Four days, four deck
pairs. Clean LO seams at real section dividers.

- 3.4: Day 1 = slides 1-12 (LO A + B), Day 2 = slides 13-21 (LO C + D). The
  guide's Day 2 map already matches the deck row for row.
- 3.3: Day 1 = slides 1-11 (LO A), Day 2 = slides 12-20 (LO B).

**Tier 2, modest authoring: 3.2.** Day 1 = slides 1-8 (LO A), Day 2 = slides 9-15
(LO B), Day 3 = slide 16 plus about eight new slides. Day 3's content in the
guide - the side-by-side policy/configuration review and the Scenario 3B
walkthrough - does not exist in the deck at all.

**Tier 3, real authoring: 3.1 and 3.5.** Thirteen of the unit's 20 days but only
47 of its 104 slides. 3.5's Day 7 has no deck content. 3.1 cannot be split at all
until the LO 3.1.C question below is answered, because the split has to decide
which day owns slides 18-21.

Do Tier 1 end to end first - split, convert, gate, screenshot - and prove the
pipeline on four decks before committing to about 64 new content slides.

## Two things found on the way, one of which became a decision

### Board #99 is unblocked, and the answer is "author the EKs"

`docs/cyber-teacher-guide-audit.md` records 3.1's Day 6 pacing citing EK
3.1.C.1-C.6 with no LO 3.1.C anywhere in the guide, and calls the fix blocked on
obtaining verbatim CED text.

**The 3.1 deck teaches 3.1.C in full.** Slide 2 lists it as CB REQUIRED; slide 4
names a guided-notes section for it citing EK 3.1.C.1-C.6; slide 18 is its section
divider; slide 19 covers C.1, C.2 and C.3; slide 20 covers C.4, C.5 and C.6 with
the CED's own high/moderate examples; slide 21 is a Stop and Think on rating risk.

So the direction is settled: the guide is missing content the rest of the bundle
already has. Delete-the-stray-reference was the wrong branch.

The caveat matters. The deck's text is styled and paraphrased - bullets, bolding,
a capitalised "EASILY" - so it is **not** verbatim CED text, and the guides claim
verbatim EK. The deck unblocks the decision, not the transcription. That still
needs the CED.

While in there: slide 19 carries an ENRICHMENT badge for content slide 2 marks CB
REQUIRED. Fix during the split.

### The numbering collision, and the decision that dissolves it

`pacing.json`'s `unit3Mapping` records that the bundle and the site numbered Unit 3
differently:

| Bundle / Drive (CED) | Days | Site lesson, before this decision |
| --- | --- | --- |
| 3.1 Network Vulnerabilities | 6 | 3.1 Network Fundamentals & Attack Surface (d1-3) **and** 3.2 Network Attacks (d4-6) |
| 3.2 Managerial Controls | 3 | 3.6 Network Security Policies & Wireless |
| 3.3 Segmentation | 2 | 3.4 Network Segmentation & VLANs |
| 3.4 Firewalls | 2 | 3.3 Firewalls & Packet Filtering |
| 3.5 Detecting Network Attacks | 7 | 3.5 IDS, IPS & SIEM |

Three lessons swap numbers and one splits in two. `config/cyber-slide-manifest.js`
keys lessons as `'1-1'`, `'2-3'` and so on. Units 1 and 2 number identically in
both schemes, so the key has never been ambiguous. Unit 3 is the first divergence:
add `'3-3': 2` and it means Segmentation under bundle numbering and Firewalls
under site numbering. Both are two-day lessons, so the day count will not catch
it. It renders cleanly, logs nothing, returns a correct API response, and hands a
teacher the wrong decks.

**DECIDED 2026-08-26 by Tanner: the site moves to CED numbering.** Five topics, in
the CED's order and with the CED's numbers. The divergence is removed rather than
translated, so no mapping layer gets built and `unit3Mapping` is deleted rather
than maintained.

An earlier draft of this note recommended the opposite: keep both schemes and make
the manifest translate. That was wrong, and why it was wrong is the part worth
keeping.

**The EK identifiers are CED-canonical and they are printed on every slide.** Every
deck cites `EK 3.4.B.2` for firewall ACLs; every guide presents its essential
knowledge as verbatim from the CED; so do the quiz keys and the FRQ specs. Those
identifiers cannot be renumbered. The site numbering is the only free variable, so
any scheme where "Lesson 3: Firewalls" sits on a page whose own slides cite
3.4.B.2 contradicts itself permanently. A translation layer would have made that
contradiction permanent AND invisible to the code.

The repo had already tried the softer fix. `scripts/cyber-cc-clarity.js` added a
six-row crosswalk to the course guide, for exactly this reason:

> The site teaches Unit 3 as six lessons; the CED has five topics, in a different
> order. [...] A teacher reading both sees 3.4 Firewalls in one place and
> Firewalls at position 3 in the other, with nothing saying the two numbering
> systems are different.

A crosswalk is a tax every teacher pays forever. Matching the CED deletes the need
for it, and Tanner's report is that teachers were still confused with it in place.

#### What the change costs, checked rather than assumed

The thing that could have made this expensive is live gradebook data keyed to site
lesson numbers. There is none.

- **No gradebook migration.** Cyber Unit 3 items are keyed by page slug
  (`ap-cyber-unit-3-case-file-3`, `unit-3`), not by dotted lesson numbers. Nothing
  in `course_manifest` is keyed to `3.1`-`3.6`, and `seed/` carries no Unit 3
  lesson ids at all. `CLAUDE.md`'s never-break-existing-data rule is not engaged.
- **`pacing.json` is generated**, by `tools/cyber-pacing/extract-calendar.js` from
  `AP_Cyber_Course_Calendars_Traditional_and_Block_2_1.xlsx`. No application code
  reads it. The fix is the sheet, then regenerate. Never hand-edit the JSON.
- **`unit3Mapping` has exactly one consumer: the generator that writes it.**
  Nothing reads it. It exists for humans, and matching the CED retires it.
- **One live lesson-numbered page**, `ap-cyber-unit-3-lesson-6`. Its slug is
  positional (`lesson-6`), not dotted, so it does not encode a wrong topic number.

So the work is the calendar sheet, the Command Center, the course guide and one
page. It is not a data migration.

#### The one thing genuinely lost

CED 3.1 is a single six-day topic. The site split it into two three-day lessons,
Attack Surface then Network Attacks. That is the only place the site numbering
carried pedagogy rather than just a different order.

It can be kept without keeping the lesson number: run it as Days 1-3 and Days 4-6
inside topic 3.1. The teaching shape survives and only a lesson boundary the CED
does not have goes away. Decide this deliberately rather than letting it fall out
of the renumber.

#### What this does to the slide work

It dissolves what this section originally called the highest-risk item. With the
site on CED numbering, `cyber-slide-manifest.js` keys are unambiguous, no
translation layer is needed, and `scripts/cyber-slide-embeds-from-csv.js:185` can
have its Unit 3-5 refusal lifted without inventing a mapping first.

**The decks need no renumbering.** They are already CED-native; the site was the
outlier. The tiers above are already stated in CED topic numbers and stand as
written. Density does not change either: 3.1 and 3.5 still need authoring.

Still open: regenerating `pacing.json` against the five-topic structure needs the
corrected calendar sheet, or a decision to derive the calendar from the CED day
counts (6/3/2/2/7, the same 20 total). Not done here, because inventing a calendar
and returning it as though it came from the spreadsheet would put a fabrication in
the one file the pacing pills are generated from.

## Environment note

`TODO_KEY` is present in this session's environment. `CLAUDE.md` says it belongs
in Railway and the Actions secret and nowhere else, because it can WRITE to the
ledger, and that `COMMAND_READ_TOKEN` is what a session should carry. Only its
presence was checked; the value was never read or echoed. Worth clearing.

## Learned

**A slide number in a pacing table is a claim, not a fact.** The previous pass
read 3.1's day/slide numbers, found them contiguous 1 to 22, and concluded the
guide paced the deck. It does not. Reading the deck alongside the table took one
call and changed the size of the job.

**Guides can be written against artifacts that were never built.** 3.2 and 3.3
restart slide numbering every day, which is only coherent if per-day decks exist.
They never did. The guides are partly a specification for the decks Tanner is now
asking for, not a description of the decks that shipped.

**"Website" in a pacing table marks where the deck ran out.** It is a
density signal hiding in plain sight, and it points at exactly the two lessons
that need authoring rather than splitting.

**Removing a divergence beats translating one.** This note's first recommendation
was to keep two numbering schemes and teach the manifest to translate. The repo
had already shipped the gentler version of that idea, a crosswalk table in the
course guide, and teachers were still confused, because a crosswalk explains a
contradiction instead of removing it. When one side of a mismatch is externally
fixed and the other side is yours, move yours. The tell that the CED side was the
fixed one was sitting on every slide: an EK number you do not get to renumber.
