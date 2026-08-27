# Cyber Unit 3 renumbering: align the site to the CED

**Status:** spec. Nothing has shipped. Written 2026-08-27.
**Why now:** `docs/ap-cyber-units-2-5-ced-audit.md` found Unit 3's topic numbers do
not match the Fall 2026 CED. Tanner confirmed on 2026-08-27 that no teacher or
student has reached Unit 3 yet and is already fielding questions about it, so the
numbering is being corrected rather than worked around.

## What is actually wrong

Only the numbers. **The lesson bodies already cite the correct CED EK codes.**
That was the surprise in the audit and it is what makes this a renumbering rather
than a rewrite:

| Site lesson | EKs the body cites | Real CED topic |
|---|---|---|
| 3.1 Network Fundamentals and Attack Surface | 3.1.B.\*, 3.1.C.\* | 3.1 |
| 3.2 Network Attacks | 3.1.A.\* | 3.1 |
| 3.3 Firewalls and Packet Filtering | 3.4.A/B/C.\* | 3.4 |
| 3.4 Network Segmentation and VLANs | 3.3.A/B.\* | 3.3 |
| 3.5 IDS, IPS and SIEM | 3.5.A-E.\* | 3.5 |
| 3.6 Network Security Policies and Wireless | 3.2.A/B.\* | 3.2 |

Site 3.3 and 3.4 are each other's CED topics. Site 3.6 is CED 3.2. Site 3.1 and
3.2 are two halves of CED 3.1, which is why six site lessons cover five CED
topics.

## The decision: six pages, CED 3.1 in two parts

Chosen by Tanner 2026-08-27 over merging into five pages or a minimal swap. CED
3.1 carries three LOs and 17 EKs and is genuinely a two-day topic; the decks
already treat it that way. Nothing is merged and no teaching day is lost.

## The mapping

Bodies move so that handle order matches teaching order matches CED order. The
moves are a three-cycle over lessons 3, 5 and 6. Lessons 1, 2 and 4 keep their
own bodies and are relabelled in place.

| Target handle | Body comes from | Old label | New label | lesson_id |
|---|---|---|---|---|
| `ap-cyber-unit-3-lesson-1` | itself | 3.1 | Topic 3.1 (Part 1 of 2) | `3.1a` |
| `ap-cyber-unit-3-lesson-2` | itself | 3.2 | Topic 3.1 (Part 2 of 2) | `3.1b` |
| `ap-cyber-unit-3-lesson-3` | lesson-6 | 3.6 | Topic 3.2 | `3.2` |
| `ap-cyber-unit-3-lesson-4` | itself | 3.4 | Topic 3.3 | `3.3` |
| `ap-cyber-unit-3-lesson-5` | lesson-3 | 3.3 | Topic 3.4 | `3.4` |
| `ap-cyber-unit-3-lesson-6` | lesson-5 | 3.5 | Topic 3.5 | `3.5` |

The same permutation applies to each of the four activity handles per lesson
(`-exercise-1`, `-exercise-2`, `-lab`, `-quiz`), so 30 pages in total.

Fundamentals stays ahead of attacks in the 3.1 pair. The EK order within the
topic runs A then B and C, and the attacks page is the one carrying LO 3.1.A, but
OSI, ports and encapsulation are scaffolding the attacks page assumes. Teaching
order wins over EK letter order here, and both pages are labelled 3.1 either way.

## Why lesson_id is `3.1a` and `3.1b`, not `3.1` twice

The gradebook keys a column on `` `${lesson}|${activity}` `` (`lib/admin-denominators.js`)
and resolves the grade of record per (student, lesson, activity). Two pages
sharing `3.1` would collapse their exercise 1, exercise 2, lab and quiz into one
column each, and a student's better score on one part would mask the other. Two
distinct ids keep eight honest columns.

The suffix is safe:

- `compareLessonRef` in `lib/gradebook-contract.js` compares dotted ids segment by
  segment and falls back to string compare when a segment is not numeric, so
  `3.1a` sorts after `3.1` and before `3.2`.
- `POST /api/progress/attempt` does not pattern-match `lesson_id`. It checks the
  id against `course_manifest` for the item, so any string the manifest carries is
  legal.
- One known cosmetic effect: the PostHog path scrubber
  (`lib/posthog.js`, `/^\d+\.\d+(-[a-z0-9-]+)?$/`) will not fold a `3.1a` URL
  segment into `:item`. That regex is about URL paths rather than lesson ids and
  no Unit 3 URL contains the lesson id, so nothing changes today. Widen it if a
  future URL ever carries one.

The denominators make this free: Unit 3's authored totals are identical across
3.1, 3.2, 3.3, 3.4 and 3.6 (exercise 1 out of 6, exercise 2 out of 24, lab out of
30, quiz out of 5), so splitting or renaming those keys moves no number. Only 3.5
differs (24/24/24/10) and it keeps its own id.

## The transform, and the trap in it

Every page carries three different things that look alike, and only two of them
change. This is the whole risk in the job.

| Shape | Example | Action |
|---|---|---|
| Plain topic ref | `3.3`, `Topic 3.3` | **renumber** |
| Section number | `3.3.1`, `3.3.5b` | **renumber** |
| EK or LO reference | `3.4.A`, `3.4.B.2` | **leave alone, already correct** |

A page can hold both forms of the same digits. `ap-cyber-unit-3-lesson-3` has 41
plain `3.3` refs that must become `3.4`, and 15 EK refs already reading `3.4.A.1`
and similar that must not move. A find and replace of `3.3` to `3.4` corrupts the
page in both directions at once.

The distinguishing rule is the character after the second dot: a digit means a
section number, a letter A to E means an EK. So:

```
3\.N\b(?!\.)        plain topic       -> renumber
3\.N\.\d+[a-z]?     section number    -> renumber
3\.N\.[A-E](\.\d+)? EK or LO          -> preserve
```

Cross references to other Unit 3 topics ("see 3.5") are plain refs and must be
remapped through the same table, not left pointing at the old numbering.

### The invariant that proves it worked

After the transform, on every page **the plain topic number and the EK topic
number agree**. That is checkable per page and is the acceptance test:
`ap-cyber-unit-3-lesson-5` must read "Topic 3.4" throughout and cite only
`3.4.*` EKs. The two 3.1 pages both read 3.1 and cite `3.1.A` and `3.1.B/C`
respectively.

## The ucnav rail, and the bug surveying it found

The sticky in-unit navigation cannot be token-substituted, because its labels
are positional: after the bodies move, rail position N links to `lesson-N` and
must read the topic taught there. Running the renumbering over the old rail
gives the right numbers in the wrong order (3.1a, 3.1b, 3.4, 3.3, 3.5, 3.2), so
the rail is regenerated wholesale and the token pass never sees it.

Surveying all 30 pages found far less rail work than expected, and one real
defect:

- Only the five **lesson** pages 1 to 5 carry a rail. The 24 activity pages
  carry none, so they need no rail work at all.
- Every rail lists five topics, 3.1 to 3.5.
- **`lesson-6`, the wireless lesson, appears in no rail and has none of its own.**
  It is unreachable from the in-unit navigation today. That is pre-existing, and
  it is why the Unit 3 hub links `lesson-6` and nothing else.

So five rails are replaced and one is inserted, on the page that receives the
wireless body. That page was authored against a different template (an `exhero`
header rather than the `ch-badge` course header lessons 1 to 5 use), which is
why it never had one.

**The markup alone is inert.** Every topic entry calls `ucnToggle`, and the same
3052-byte script also positions the fixed rail under the theme header and strips
the padding Shopify's template adds. The wireless lesson carries the ucnav CSS
but not that script, so inserting only the markup would ship a rail that renders
and does nothing when clicked. The script is copied from a donor page rather
than embedded in the lib, so the inserted rail runs byte-identical code to the
five that already work and stays that way if the script is ever revised.

Rail labels read `3.1a` and `3.1b` rather than "3.1" twice. The strip is one line
of compact text with no room for "Part 1 of 2", two entries both reading 3.1
would be a coin flip, and a/b is what the section numbers on those two pages
already say. The `title` attribute carries the descriptive name on hover.

## Everything that has to change

1. **30 Shopify pages** via one Matrixify sheet, `Command: MERGE`, columns
   `ID, Handle, Title, Body HTML, Command`. Titles, H1s, breadcrumbs, nav strips,
   section numbers, `data-lesson-id`, and the JSON-LD headline.
2. **`utils.js`**, the cyber numbered rule. It derives the lesson from the handle
   for `/track` visits, so `ap-cyber-unit-3-lesson-3` currently files visits under
   `3.3`. Because CED 3.1 spans two pages the handle index is offset from the
   topic number for every lesson after the pair, so an explicit map is required.
   It follows the `CYBER_SLUGS` pattern already in that file.
3. **`scripts/seed-cyber-denominators.js`**, Unit 3 keys `3.1` and `3.2` become
   `3.1a` and `3.1b`, `3.6` disappears, and the rest shift to their CED numbers.
4. **`course_manifest` and `course_denominators` in production.** Unit 3 rows
   keyed on the old lesson ids. Additive insert plus removal of the retired keys;
   `POST /api/admin/denominators/remove` exists for the second half.
5. **The Unit 3 hub**, `ap-cybersecurity-unit-3-securing-networks`. It currently
   links only `lesson-6`, so it needs the full CED-ordered list regardless.
6. **Teacher guides and decks.** The decks already use CED numbering, which is why
   `docs/cyber-unit3-tier1-split-spec.md` reads correctly against the CED and
   wrongly against the site. After this lands that file stops contradicting the
   pages and no longer needs its warning.

## Order of operations

Nobody is on Unit 3, so there is no window to protect, but the order still
matters for what a mid-flight reader sees.

1. Generate the sheet, validate it with `tools/ap-cyber-ced/validate_csv.py --baseline`.
2. A human imports it once via Matrixify.
3. Verify live with `tools/ap-cyber-ced/verify_import.py` and re-run
   `ced_audit_v2.py --unit=3`, which should show the plain and EK numbering in
   agreement.
4. Merge the `utils.js` and denominator changes.
5. Reseed denominators and the manifest, then remove the retired keys.

Steps 2 and 4 are independent while Unit 3 has no traffic. If that stops being
true, do 4 before 2: a visit filed under a stale lesson is recoverable, a graded
attempt filed under one is the thing worth avoiding.

## Interaction with the "do not cite the CED to students" rule

That rule landed in `CLAUDE.md` on 2026-08-27, the same day as this spec and from
a different session, so the two have to be sequenced deliberately.

Unit 3 has the same defect Unit 1 had, smaller. Measured with
`lib/cyber-ek-density.js` across the six lesson pages: **108 EK codes, 21
protected, 87 student-visible and cuttable.** Worst pages are 3.1 with 19 and 3.6
with 17. Unit 1's Topic 1.1 had 218, so this is a fifth of the size, and it is
the same job.

**Renumber first, thin second.** Not a preference:

- The acceptance test above works by checking that a page's plain topic number
  agrees with its EK topic numbers. Thinning removes 87 of those EK codes, which
  are exactly the anchors the test reads. Run thinning first and the renumbering
  ships with most of its evidence deleted.
- Renumbering does not touch prose. Thinning rewrites sentences ("secure
  information (3.2.A.1)" becomes "secure information, such as ..."). Doing the
  prose rewrite on pages whose numbering is already correct means the thinning
  diff is about wording only.

Two notes for whoever runs the thinning pass:

- `EK_RX` in `lib/cyber-ek-density.js` matches `\d\.\d\.[A-C]`. Units 3 to 5 have
  LOs running to E (3.4.D, 3.5.D, 3.5.E, 4.1.D, 4.4.D, 5.2.D, 5.6.D, 5.6.E), so
  it currently misses them: 3 codes on the IDS lesson alone. Unit 1 stops at C,
  which is why it has not bitten yet. `[A-E]` is the fix.
- The only span it recognises as protecting a code on these pages is the exit
  ticket key. Each Unit 3 lesson also carries a collapsed "College Board
  Essential Knowledge Coverage" table, which is exactly the teacher-audited
  coverage table the rule permits, and it is not in `CANDIDATES`. So the 87 is an
  upper bound and some of it is already legitimate.

## Deliberately not in this pass

The Unit 3 rename sweep from the audit (DNS spoofing to DNS poisoning, ARP
spoofing to ARP poisoning, SCADA, RADIUS, Kerberos, the Lockheed kill chain in
the 3.5 lab). Every body is being reshipped anyway so batching them would save an
import cycle, and it is still the wrong call: mixing a vocabulary rewrite into a
renumbering makes the diff unreviewable and the acceptance test above stops
proving anything. Renames ship next, against a Unit 3 whose numbering is already
correct.
