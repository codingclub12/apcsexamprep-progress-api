# AP Cyber Topic 1.4: CED realignment

Board task #139. Page `ap-cybersecurity-unit-1-ai-driven-threats`, id 132157866199,
228,028 bytes at the start of the run, last edited 2026-08-10.

## What was actually wrong

Not "the page says vishing". Tanner's standard is the right one: no off-CED term
presented as exam-required. Measured that way, 1.4 had one defect with four heads,
and all four were surfaces whose whole job is to tell a student what the exam wants.

| Surface | What it said |
|---|---|
| 1.4.3 vocabulary table | Third column headed **AP Exam Signal**. Rows for Spear Phishing, Vishing, Polymorphic Malware, each with a classification cue. No row for data poisoning or AI reconnaissance, both named attack types. |
| 1.4.9 scenario table | **Attack Type** column answered "AI-enhanced spear phishing", "Vishing with voice cloning", "AI polymorphic malware" for three of five rows. |
| FAQ, two answers | "Key classification signals: perfect email referencing personal details -> AI-enhanced spear phishing" and "if it involves a phone call, classify it as voice cloning (or vishing)". Mirrored in the JSON-LD. |
| Worked example 1 | Model prediction: "AI-enhanced spear phishing with domain spoofing". |

A student studying those four surfaces is memorising the wrong answer key.

### The second finding, which counting terms could not see

1.4.7 "Defense Strategies" has six headed subsections: out-of-band verification,
dual approval, AI-specific training, prompt injection mitigations, behavior-based
detection, zero-trust. **Not one of them is one of the four defenses the topic
names.** Those four appeared only in the collapsed coverage table, the Common
Mistakes list, and answer keys. So the lesson's defense section and the exam's
defense list had no overlap, and nothing on the page said so.

Related: "digital avatar" is the CED's own noun and appeared exactly once, inside
the collapsed audit table. A teacher who opened that table saw a correct crosswalk.
A student who read the lesson never met the word. Same for AI reconnaissance, which
appeared twice, both times in audit surfaces.

## What shipped

`lib/cyber-u1-topic14-ced.js`, 30 splices, built by
`scripts/cyber-u1-topic14-ced-csv.js`. 228,031 -> 234,349 characters.

- **1.4.3 rebuilt** around the six named attack types and the four named defenses,
  in that order. The cue column becomes "Also called", which is where spear
  phishing, vishing and polymorphic malware now live, under an intro that says
  plainly those names are worth knowing and are not what a question will ask you
  to sort an attack into.
- **1.4.9 rebuilt** to eight rows keyed to the same six types. Data poisoning and
  AI reconnaissance get a row for the first time.
- **1.4.7** gains the four named defenses as its first four subsections. The six
  that were there keep their content under "Controls Organizations Layer On Top".
- **1.4.5** introduces "digital avatar" and states that a phone call and a video
  call are two deliveries of one attack type, not two attacks.
- **Both FAQ answers and the JSON-LD mirror** rewritten so a reader and a search
  engine get the same claim.
- **Five CFU items** relabelled: cfu-3, cfu-4, cfu-5, cfu-6, cfu-7, cfu-10.

### One answer key changed, deliberately

cfu-5 blank D. The credited defense was "out-of-band verification", which is sound
security and is not the named control. It is now "a shared secret", with
out-of-band verification kept in the bank as a distractor whose feedback explains
that it works for the same reason and is not the named answer. Blank C changed from
"authority and urgency" to "urgency": authority is a Unit 2 tactic that had no
business in a 1.4 item.

Everything else graded is byte-identical: all five cfu-3 match keys, cfu-7's step
ids and correct order, and all six MCQ letters. The gate asserts this rather than
trusting it.

### One item was ambiguous and is now not

cfu-10 option D read "deepfake BEC, vishing, and malware injection" and the
feedback rejected it because "no video was involved". The same page's Common
Mistakes table says deepfakes are not video-only, so D was defensible as written.
D now names three real attack types that are simply not the ones in the scenario.

## Coverage, before -> after (visible text, excluding the collapsed audit table)

```
digital avatar    1 -> 7        spear phishing   17 -> 6
AI reconnaissance 2 -> 14       spear-phishing    3 -> 2
shared secret     7 -> 18       vishing          12 -> 3
multi-factor      1 -> 10       polymorphic       8 -> 4
data poisoning    6 -> 12
AI malware        3 -> 9
verify/reputable  2 -> 7
```

Every surviving legacy term was then audited by position, not by count. All of them
sit in one of: the "Also called" column, historical narrative in 1.4.2 explaining
what AI changed, an elimination step ("Not vishing"), a wrong MCQ option, or the
JSON-LD keywords. None is presented as an answer.

## Gates

`scripts/cyber-u1-topic14-gate-sabotage.js` breaks the built output fifteen ways
and asserts the gate says so. Run it before trusting a green build:

```
node scripts/cyber-u1-topic14-gate-sabotage.js
node scripts/cyber-u1-topic14-render-check.cjs
```

It earned its keep twice in this run:

1. **It found a live defect in the gate.** The prose-mapping check used
   `\bPrediction:\b`. A word boundary between a colon and a space never matches,
   so that marker was unmatchable and the check was partly inert. Same failure
   shape as the `stayed_hidden` check that shipped inert on 1.1 in the morning.
2. **The gate then found a fourth defect on the page** on its first working run:
   the FAQ answer telling students to classify a phone call as voice cloning or
   vishing, which I had not found by reading and which contradicted what the
   rebuilt cfu-3 feedback now says.

The render check loads the built body in Chromium and asserts all ten CFU feedback
boxes compute to `display: none` and that no answer-key phrase is painted. Proven
in the failing direction too: unhide one box and it reports the leak.

## Method note

Two things I got wrong mid-run and corrected:

- I first said 1.4 had CED coverage gaps. It does not; all ten EKs are present.
  The defect is that they are confined to audit surfaces while the teaching
  surfaces carry the legacy taxonomy. Reading headings is not reading the page.
- I first assumed a term count could measure this. It cannot. The FAQ and the
  worked example were both invisible to counting and both were doing the same job
  as the tables. Position is the measurement; count is a summary of it.

## Still open

- The sheet is built and not imported. `out/topic14.csv`, 237,064 bytes, one row,
  Command MERGE.
- **The EK thinning pass has not run on 1.4.** 26 citations remain, most of them
  decorative. Blocker found: `lib/cyber-ek-density.js` hardcodes `id="ek11-body"`
  for the coverage table, and 1.4's is `id="ek14-body"`. Running the existing
  thinner on 1.4 as-is would strip the teacher crosswalk, because the table would
  not be recognised as protected. Fix that before reusing it.
- MCQ key distribution on this page is C,B,C,D,C,B: three Cs, no A. Pre-existing,
  not touched here because rebalancing would mean rewriting stems that are fine.
- 1.4.5 still says urgency and authority are "two of the most effective social
  engineering triggers". Authority is Unit 2. One clause of narrative, left alone.
