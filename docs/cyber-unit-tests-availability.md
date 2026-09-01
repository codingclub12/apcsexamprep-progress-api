# Are the Cyber Unit Tests live, and do they copy the teacher bundle?

Asked and answered 2026-09-01, against the live storefront and the Drive bundle
rather than against any repo file. Two questions that sound like one:

1. Can a student sit an AP Cybersecurity unit test on the site today? **Yes, all
   five, without logging in.**
2. Are those the same instruments a teacher hands out on paper? **No. All five
   are distinct, with zero shared items.** Unit 1 was already proven in
   `docs/cyber-unit1-bundle-vs-online.md`; this pass closes Units 2 through 5,
   which that doc left open.

Both answers come with a finding attached, and the second one is the one that
costs a class: **the Unit 3 exam can be passed by clicking B twenty times.**

## 1. Availability

| unit | handle | published | live HTTP | items | reaches the gradebook |
|---|---|---|---|---|---|
| 1 | `ap-cyber-unit-1-exam` | yes | 200 | 20 MCQ | score |
| 2 | `ap-cyber-unit-2-exam` | yes | 200 | 20 MCQ | score |
| 3 | `ap-cyber-unit-3-exam` | yes | 200 | 20 MCQ | completion only |
| 4 | `ap-cyber-unit-4-exam` | yes | 200 | 20 MCQ | completion only |
| 5 | `ap-cyber-unit-5-exam` | yes | 200 | 20 MCQ | completion only |

Published state read from the Shopify Admin API; HTTP and body read anonymously
from `www.apcsexamprep.com`, so there is no login wall and no entitlement gate in
front of any of them.

**Reachability is thinner than availability.** All five are linked from
`ap-cybersecurity-complete-course-guide`, as real anchors
(`<a class="exercise-row exam-row" href="/pages/ap-cyber-unit-N-exam">`). Only
Unit 4's own unit hub links to its own exam. Units 1, 2, 3 and 5 unit hubs carry
no link to their exam at all, so a student who works down a unit page never
arrives at its test. The course guide is the only path for four of the five.

**The gradebook split is real and already documented.** Units 1 and 2 carry
`id="score-display"`, which is what `activityScorePct` in `apcs-tracker.js`
reads, so they post a real percentage. Units 3, 4 and 5 have no `score-display`
and none of them use the `.answered-correct` / `.answered-wrong` convention that
is the tracker's only fallback, so `activityScorePct` returns null and the
tracker records the truthful "done, ungraded". Each of the three has a score
panel of its own (`score-u3exam`, `score-num`), but under a name nothing reads.
`scripts/seed-cyber-denominators.js` records the same split in its 2026-08-25
correction; this pass confirms it still holds on bodies fetched today.

## 2. The Unit 3 answer key is guessable

Confirmed two independent ways off the live body, which agree exactly:

```
effective key   B B B C C B B B B B C B B B A B B B B B
distribution    A:1  B:16  C:3  D:0
longest run     5
```

Answering B on every question scores **16/20, which is 80 percent**, without
reading a single stem. There is no D anywhere in the key, so one option is dead
on all twenty items.

The two sources are `var CORR=[...]` in the page script and the fourth argument
of the eighty `qzu3exam(this,n,idx,correct)` click handlers, four per question.
They match, so this is the key as authored, not a parse artifact. No individual
item is mis-keyed: this is a distribution defect, not a correctness one.

For contrast, the other four are fine:

```
unit 1   BDBADABBDCBDCCADBCCA   A:4 B:6 C:5 D:5   longest run 2
unit 2   ABDCACADBABCBBACCBAB   A:6 B:7 C:5 D:2   longest run 2
unit 4   CADBDCABCDBADCABDABC   A:5 B:5 C:5 D:5   longest run 1
unit 5   CADBDACDBACBDABCADBC   A:5 B:5 C:5 D:5   longest run 1
```

This defect class has been fixed here before. `tools/cyber-unit1-nav-repair/`
exists because the Unit 1 exam key was once 3 A / 11 B and was rebalanced, and
`scripts/one-off/verify-exam-key.js` was generalised to catch it on any page.
That checker **skips Unit 3 silently**: it looks for `var ANSWERS = {"q1":"D"}`
and reports "no letter key" for the index-keyed `CORR` shape, so the one page
with the worst key is the one page the checker cannot see. It also skips 4 and 5,
whose key lives in the click handlers. Two of the five exams are audited; three
are not.

## 3. The bundle comparison, Units 2 through 5

Bundle sources are `_Unit_N_Test_KEY.docx` in each unit folder under the
`AP Cybersecurity Course` Drive folder. Online sources are the live page bodies.

```
instrument      bundle            online     shared items
Unit 2 Test     26 MCQ + 3 FRQ    20 MCQ     0
Unit 3 Test     24 MCQ + 3 FRQ    20 MCQ     0
Unit 4 Test     22 MCQ + 3 FRQ    20 MCQ     0
Unit 5 Test     24 MCQ + 3 FRQ    20 MCQ     0
```

Adding Unit 1 from the earlier pass (22 MCQ + 3 FRQ against 20 MCQ, zero
matches), all five units are clear. No online unit test copies its paper one, so
a student who sits the online instrument has not seen the graded one.

The two instruments are not near misses that happen to differ. They are built to
different specifications:

- **The bundle is CED-anchored.** Every item cites its EK, and the stems are the
  CED's own illustrative examples: the unlocked server room off an unmonitored
  hallway, the water-treatment pumps without MFA, `chmod 750`, the jet engine
  specifications on an unencrypted drive.
- **The online exams are a running case study.** Units 2 through 5 are built
  around a fictional firm, Vantex, and Unit 4 and 5 around hospital, logistics
  and web-application scenarios. Items are longer, multi-part and applied.

Mechanically, probing the online stems for the bundle's distinctive nouns returns
almost nothing: across Unit 2's twenty-six items, twenty-six probes
("regional director", "mailbox", "transnational", "LinkedIn", "keylogger",
"vestibule", "motion sensor" and so on) produced exactly one hit, "insurance",
and that pair is a shared concept in different words. The bundle asks a company
buying a cyber-insurance policy to name the strategy; the online exam asks the
same of Vantex buying cyber liability insurance. Topic overlap is not item
overlap, the same conclusion the evil-twin pair forced in Unit 1.

## 4. What the comparison surfaced that was not asked about

The online exams drift off the CED, and they drift further the higher the unit
number. Unit 4 online tests CIS Benchmarks, DISA STIGs, FedRAMP, NIST 800-53,
MDM versus MAM, BYOD policy, PKI certificate provisioning, secure boot and
configuration drift. Unit 5 online tests AES-CBC IV reuse, TLS certificate
chains, hybrid cryptography, the NIST SP 800-61 incident-response lifecycle and
the Pyramid of Pain. None of that is in the AP Cybersecurity CED, and none of it
appears in the corresponding bundle test.

Board item #136 already records this for the Unit 1 exam, where 13 off-CED terms
were counted, and calls the graded artifact the place it matters most. This pass
says the same problem is present in Units 4 and 5 at a larger scale. It is a
separate decision from anything above and is recorded here only so the next
person does not rediscover it.

## Method, and what it does not prove

Availability was read from the Shopify Admin API and from anonymous storefront
fetches, not from any repo file. Answer keys were extracted from the live bodies
by script and cross-checked against a second source in the same body wherever one
existed. Bundle instruments were read from Drive.

The item comparison probes the verbatim online stems on disk for the bundle's
distinctive terms, so a copied item cannot hide behind reordering, and the
online side is never retyped. **It measures shared wording, not paraphrase.** An
item rewritten from scratch to test the same thing in different words would score
clean here. What makes the conclusion safe is the same three things as the Unit 1
pass: the counts differ on every instrument, the scenarios are different
situations rather than one situation reworded, and no stem matches.

Only stems were compared, not options or rationales. Whether the Unit 3 key
should be rebalanced, and whether the off-CED drift should be pulled back, are
content decisions and are not made here.
