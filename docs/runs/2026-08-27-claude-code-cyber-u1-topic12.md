# Topic 1.2: a page built around a different syllabus

Page `ap-cybersecurity-unit-1-password-attacks`, id 132157374679, 270,476 chars.
30 splices. The largest single change in this Unit 1 pass.

## Why this is not the same job as 1.4

On 1.4 the page taught the right things under wrong names. On 1.2 it teaches a
different subject and says the exam requires it.

Topic 1.2's CED is seven Essential Knowledge statements and every one is about an
online attack on a live login: common, patterned or stolen passwords; the three
signs; the three weak-password patterns; a targeted dictionary built from
research; long-random-unique; avoid personal words; MFA. Hashing, salting,
rainbow tables, keyspace arithmetic, bcrypt, Argon2 and NIST SP 800-63B appear
nowhere in it.

The page said otherwise in five places, and I found them in this order, which is
worth recording because only the first two came from reading.

1. **1.2.5 opened**: "Understanding the mechanism ... is required knowledge for
   the AP exam."
2. **1.2.9, the whole section**: six tips describing an exam this is not, naming
   claimed question patterns and supplying their answers. "Common AP question
   patterns: 'Which of the following is NOT protected by account lockout?'
   (answer: credential stuffing, password spraying, rainbow table attacks)".
   "Questions that test NIST 800-63B guidance are common because the answers are
   counterintuitive." "AP exam distractors frequently suggest that salts must be
   kept secret." It closed with a box headed "High-Frequency AP Cyber Password
   Attack Patterns" listing five things to expect, four of them off-CED.
3. **A grid headed "8 Core Terms, Know All of These Cold"**, seven of the eight
   off-CED. Found only because the first build came out one div short and I went
   looking for why. A more direct instruction than anything in the table below it.
4. **The learning objectives.** Five of seven were off-CED: distinguishing five
   attack types of which one is in the CED, keyspace arithmetic, hashing, salts
   and rainbow tables, NIST 800-63B. This is the root of the rest: objectives are
   the page's contract with a student about what they will be able to do.
5. **An FAQ that got the CED's own term wrong**, teaching a dictionary attack as
   "a curated wordlist of probable passwords, common words, names, keyboard
   patterns". The Essential Knowledge is explicit that it is built from personal
   information about the victim. Targeted, not generic. Found by the gate.

Plus **seven of the nine Check for Understanding items graded on that material**,
which is a claim that it is assessed made by grading it.

## What shipped

Nothing is deleted. The hashing and salting strand is correct, it is real
enrichment, and Tanner's judgement on it was explicit. It keeps its section,
its arithmetic and its case studies, under a banner saying plainly it is not
assessed. What goes is every claim that the exam requires it.

- **Objectives** rewritten to the seven statements, with an eighth naming the
  enrichment as enrichment.
- **1.2.3** rebuilt: the core-terms grid becomes nine CED ideas, the vocabulary
  table becomes nine CED terms, and the "AP Exam Tip" cue column becomes "Where
  else you will meet it", which is where brute force, credential stuffing,
  password spraying, rainbow tables, keyspace and OSINT now live, named honestly.
- **1.2.9** rebuilt on what the topic assesses. The replacement makes no claim
  about what the exam "frequently" or "commonly" does, because that habit is what
  produced the section being replaced.
- **Nine CFU items**: three relabelled where the scenario was already CED content
  and only the vocabulary was off (cfu-2, 6, 7), five rebuilt (cfu-3, 4, 5, 8, 10).

**Every MCQ letter and every widget key is unchanged**, and the gate asserts it
rather than trusting it: cfu-2=C, cfu-4=D, cfu-6=B, cfu-8=B, cfu-10=D, and cfu-3's
five match keys stay E C B A D in row order. What changed is what the correct
option says, not which one it is.

### The item that got better by being fixed

cfu-4 asked which attacks are not defeated by account lockout, a control this
topic does not name. But its scenario already contained the distinction the whole
page needed: incident I is stolen passwords replayed at a VPN, incident II is one
common password against 12,000 accounts, and incident III is cracking a stolen
hash file offline in under a minute. The question now asks which of the three is
not an attack on a live login. Same scenario, same key, and it tests the boundary
of the topic instead of a taxonomy.

## Movement

```
                    before  after            before  after
common pattern         2      7      brute force       47     26
stolen password        2      9      credential stuff   50     24
failed attempt        10     24      password spraying  35     11
unusual                11     22      rainbow table      43     22
unknown device          6      8      keyspace            8      4
long, random            2      6      nist               30     24
```

The off-CED terms that remain are in the enrichment sections, which is where they
belong.

## Two more tools that were 1.4-shaped

The render check hardcoded `#ek14-body` for the coverage table, so on 1.2 it
returned an empty array, which reads exactly like "not collapsed". Same defect as
the one in `cyber-ek-density.js`, in a different file. Now matched by pattern.

And its answer-key detection matched the bare phrase "is correct.", which fired on
an option label reading "I is incorrect and II is correct." and on a sentence about
a password that is correct, on a page with no leak at all. It now matches the SHAPE
of a feedback opening: a bare option letter, a space, "is correct." at the start of
its text. Proven still to catch a real leak: unhide one box and it reports it.

That is the third time this session a checker has cried wolf on a sound page.
Each time the cause was the same, a tool written against one page meeting a second.

## Still open

- Sheet built, not imported: `out/topic12.csv`, 275,898 bytes, one row, MERGE.
- 1.3 and 1.5 have not been audited. Given what 1.2 turned out to be, neither
  should be assumed to be a relabelling job until its objectives and its exam
  strategy section have been read.
