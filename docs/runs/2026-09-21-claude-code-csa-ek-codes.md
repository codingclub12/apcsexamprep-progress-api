# 171 EK codes out of the AP CSA lesson pages, and the eighth script citation

2026-09-21. Board 373. Three Matrixify sheets in `imports/2026-09-21/`, to be
imported one unit at a time.

## Why this ran

Tanner: "Fix the EK codes on those pages too." The Units 2 and 3 audit two days
earlier counted 178 CED Essential Knowledge codes on 19 of the 38 AP CSA lesson
pages and filed them as board 373 rather than fixing them there.

## What the count actually was

178 on 19 pages, reproduced exactly from the live bodies. It breaks down into
five placements, and the split is what decides the design:

    136  a trailing parenthetical    ...every program. (EK 2.1.A.1)</td>
     13  a What You'll Learn label   <li><strong>2.7.A:</strong> Identify...
      6  a CED range heading         <h4 ...>CED EK 3.5.A.1-3.5.A.8</h4>
     15  prose, one case at a time   <p>EK 2.2.A.1 explicitly covers...
      8  inside a <script>

Only the first three are rules. The 15 prose cases are data, one decision each
with its reason, in `config/csa-ek-decisions.json`, because the lesson
`lib/cyber-ek-thin.js` paid for one course over is that a general substitution
rule over prose produces sentences nobody read: "A birthdate is 1.1.C.1." became
"A birthdate applies." eleven times and the citation count was perfect.

## The one that was nearly left behind

The first version of the decisions file called all 8 script citations
search-engine metadata and left all 8 alone, on the reasoning that this repo's
own definition of a visible citation excludes script content.

Seven of them are. They sit in `<script type="application/ld+json">`, in strings
like "Aligned to 2025-2026 CED topic 2.1.A."

The eighth is not. It is in a plain `<script>` on 3.6 holding the Bug Hunt game's
question data, in the explanation string a student is shown when they check an
answer: "same-class access allows other.count inside Inventory (EK 3.6.A.3)." It
renders on the page.

What hid it was reading the tag rather than running the check. Seven of eight
carried the `ld+json` type, the count looked uniform, and "8 in the script block"
was a sentence I wrote without opening the eighth. It surfaced because a mutation
case aimed at 3.6's ld+json block came back INERT: the mutation matched nothing,
because 3.6 has no ld+json citation at all. A harness that reports an inert
mutation instead of counting it a pass is what found this.

So 171 are cut and 7 are not. Both numbers are printed by every check that
touches this, rather than rounded to a nicer one.

## What it took to be sure nothing else moved

A rewrite across 19 live pages is the most dangerous shape of change here, and a
citation count of zero says nothing about it. Three things carry the weight:

**A second, crude implementation.** `canon()` in `smoke/csa-ek-thin.js` deletes
every code it can see along with the scaffolding touching it and flattens the
result. It would be a terrible rewriter, which is the point: everything it is
careless about is everything the rewrite was allowed to touch. Run it over the
live body and over the rewritten one and the two come out byte-identical.

**Line for line, only the cited lines changed.** All 19 bodies keep their line
count through the rewrite, so the comparison is exact: a line that changed and
never held a citation is an edit nobody asked for. This is what covers the gap
`canon()` has by construction, because `canon()` normalizes whitespace next to
tags and therefore cannot see a page-wide whitespace pass.

**Ten mutations, each red for its own reason.** Including one that IS a
whitespace pass on an uncited line, so if someone simplifies the line-site check
away, the suite says so.

## Two things I got wrong on the way, both caught by running rather than reading

**The comparator had a bug that made it lie.** It swept punctuation around a code
with the character class `[(),;:&amp;\s]*`, and inside a character class `&amp;`
is not an entity, it is the five characters `&`, `a`, `m`, `p`, `;`. So the class
contained the letters a, m and p, and "The for Loop (EK 2.8.A.1)" canonicalised
to "The for Loo": the sweep ate the final p of the word in front of it. "Personal
Data" lost its a the same way. A comparator with a bug does not report a bug, it
reports a difference of its own, and this one was only visible because the
failures named a word rather than a code.

**Two tidy rules that never fired.** The module carried rules to repair a
stranded colon and a stranded period after a cut. Measured across all 19 pages,
both fired zero times: the parenthetical rule takes the whitespace in front of it
and nothing after, so there is nothing stranded. They were deleted rather than
kept as insurance, because the second one matched any space before a period at an
element end anywhere on the page. On the next page it ran against it would have
reformatted whitespace unrelated to any EK code, which is the rewriter that
reformatted 23 live pages, one convention over.

## A guard that had to learn something

`smoke:mutationleak` scans every `smoke/*-mutation.js` for the find/repl pairs it
writes into tracked files, so it can refuse a commit carrying a live mutation. It
threw on this harness, because this harness damages a STRING and hands it to the
gate function and never writes a file at all.

It now understands an in-memory harness, declared as `MUTATION_LEAK = 'in-memory'`
and VERIFIED rather than trusted: a harness that declares it and then calls any
fs write is refused, because a marker a harness asserts about itself without
evidence is one that will eventually be wrong. Both directions are checked.

The check also had to learn to strip comments first. Its own first version read
the comment explaining the rule, which names `fs.writeFileSync`, and refused the
harness that had just been written to satisfy it. A sentence about a call is not
a call, the same way an instruction comment containing a literal `<div>` is not
markup; `lib/cyber-page-gate.js` learned that one the same way.

## Evidence

    npm run smoke:csaek            3 fixture pages, 48 visible citations -> 0
    npm run smoke:csaekmutation    10 mutations red, clean rewrite green
    npm run csaek:sheets           19 pages, 171 -> 0, 7 left in the ld+json,
                                   15 of 15 prose decisions applied, three
                                   sheets parsed back byte-identical, and
                                   matrixify-preflight accepted all three
                                   reading the files rather than the rows
    npm run csaek:live             19 pages still serve a code, summing to 171

That last line is the state BEFORE any import, and it is the same command that
proves the import landed. It asserts more than the absence of codes: that each
body is still long enough to be a lesson, that every graded MCQ answer letter
names an option that exists, and that the metadata count did not move. "No EK
codes" would pass on a blanked body and on a bot challenge.

## What is NOT done

**Nothing is live.** The sheets are built, validated and handed over; importing
them is Tanner at a browser, three clicks with a check between. The runbook is
`docs/csa-ek-thin-runbook.md` and it carries the expected end state per step,
including the one that reads oddly: after the unit 2 import the check reports
twelve clean pages, not nine, because 2.10, 2.11 and 2.12 never carried a code
and are checked anyway. A check that only looks at the pages you changed cannot
tell you an import reached a page it should not have.

**3.6 deserves a human read after it lands.** It is the only page where the
rewrite had to write new sentences rather than cut: MCQ 6's stem and MCQ 7's
feedback. Both were checked against their options and answer keys, and both are
recorded with their reasoning, but whether a question still reads well is a
judgement no check settles.

**The 7 ld+json citations are a decision, not an oversight.** If they should go
too, that is a separate change to structured data with its own risks, and it is
not this one.

**AP Cyber has the same problem, 297 of them, and it is board 223.** The module
here is deliberately not the cyber one: that module's table maps codes to
meanings, and those meanings are Cybersecurity's. Running it over a CSA page
would substitute confident nonsense and still report zero.
