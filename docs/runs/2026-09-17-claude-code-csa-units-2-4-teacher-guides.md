# Units 2-4 teacher guides, and the six that a topic number nearly ruined

2026-09-17. Board 355. Follows the Unit 1 work in PR #654 and PR #692.

## Why this ran

Tanner, after the Unit 1 repair landed: "Fix Units 2-4 too." The three open items
at the bottom of `2026-09-17-claude-code-csa-unit1-empty-headings.md` are what this
closes, and the third one turned out to be two problems rather than one.

## Read this part first

The obvious fix shipped six guides describing the wrong lesson, and every check in
the repo was green on it.

Units 2-4's guides were built from `content_unit2/3/4.py`, which carry no lesson
page and no independent-practice text at all, and whose objectives are authored
I-can lines wearing a CED code. The theme repo's own lesson specs have the real
thing, so the repair is an overlay. I joined the two trees on the topic number,
because the topic number is the obvious key and it matched on all 38.

Six of those numbers name DIFFERENT LESSONS on the two sides. Topic 4.6 is "Using
Text Files" in the kit and "Arrays as Parameters and Return Values" in the theme
specs, so the 4.6 guide came out with an objectives table about passing arrays to
methods over two days of teaching about Scanner and leftover newlines. A teacher
reading that column reasonably believes College Board wrote it, which makes it
worse than the empty heading it replaced: an empty heading is visibly empty.

The live storefront settles which side is right, and it is not a judgement call.
Every one of the six theme handles answers 301:

    4.6   ...-4-6-arrays-as-parameters-and-return-values  -> ...-4-6-using-text-files
    4.7   ...-4-7-arraylist-introduction                  -> ...-4-7-wrapper-classes
    4.13  ...-4-13-searching-and-sorting                  -> ...-4-14-searching-algorithms
    4.14  ...-4-14-reading-data-from-files                -> ...-4-14-searching-algorithms
    4.15  ...-4-15-using-data-sets-with-arrays-...        -> ...-4-15-sorting-algorithms
    4.17  ...-4-17-informal-code-analysis                 -> ...-4-17-recursive-searching-and-sorting

So the site renumbered Unit 4 onto the 2025 CED and those six specs were left on
the retired map. 4.13 is the one that kills any clever fix: its handle redirects to
4.14's lesson, so the two trees are not off by a consistent amount and no
arithmetic on the number would have repaired it.

**The join is on the page handle now, and the six are excluded rather than
approximated.** There is no CED wording for them in either repo. They keep the
kit's own rows, their two practice headings stay bare, and the verifier asserts
that as a count of exactly 12 rather than tolerating "some".

## What caught it, and what did not

Nothing did. I found it reading one rendered guide, after the suite was green.

Eleven rules over 38 documents, 0 failures, and six of the documents were wrong.
Every one of those rules compared a document against the same source that built
it, so a wrong source is invisible to all of them at once. The suite was not weak;
it was closed.

Rule 11 is the fix and it is the only rule here that reads two sources against
each other: the lesson-page URL the document PRINTS has to match the handle of the
content block that filled it. Against the pre-fix build it reports seven, the six
retired specs plus one more nobody had noticed:

    3.6  prints ap-csa-lesson-3-6-methods-passing-and-returning-object-references

which answers **404**. The theme spec's spelling of the same handle, without the
two extra words, answers 200. Same lesson, and the kit has the dead one, so every
3.6 guide in Drive prints a URL a teacher clicks and gets nothing. The export
carries the live handle and the guide prints that.

## Measured

Against the shipped verifier, before is the 38 as the kit builds them today with
`git show HEAD:scripts/csa_kit/notes.py`, which matters: the first version of this
measurement imported the renderer from the working tree and produced a number for
a state that has never existed anywhere.

    541 -> 0

    rule 2   178  headings printing over nothing
    rule 3    96  objective rows attaching a CED code to a sentence
                  College Board did not write
    rule 5    54  College Board objectives appearing nowhere
    rule 6   212  32 lesson-page intros, 148 activities, 32 independent rows
    rule 11    1  topic 3.6's dead lesson-page URL

Those decompose exactly. 178 is 190 bare headings minus the 12 that stay bare on
the six. 96 is 114 I-can rows minus the 18 on the six. 212 is 32 + 148 + 32.

## The dedupe fix that got dropped

The renderer deduped the objectives table on the CED code alone, and 114 of the
228 rows the kit authored across Units 2-4 share a code with another, so they
never printed. That looked like a bug worth fixing and I fixed it, then took it
back out.

For the 32 overlaid topics the export carries 54 objectives with 54 distinct
codes, so the dedupe never fires and the fix changes nothing. The only topics it
touches are the six, where it would print eighteen more rows that attach a CED
code to a sentence College Board did not write. The fix made six guides worse and
32 guides identical, so there is no renderer change in this pass at all.

## The three kinds

    suite     12 rules over the 38 rendered documents, 0 failures, and 257 of 257
              offline suites green
    rederive  a python-docx reader, not the zip, reports 190 bare headings and
              114 I-can rows on the pre-repair build and 0 of each on the
              32 overlaid topics, matching the suite exactly. Rule 11 against
              that same build reports the seven handle disagreements while the
              other eleven rules stay silent, which is the whole argument for it
    mutation  19 mutations over all 12 rules, each red for its own reason, plus 2
              negative cases and a check that the retired-spec exemptions are not
              vacuous: those six topics really do carry 18 I-can rows and 12 bare
              practice headings, so rules 2 and 3 are standing down from
              something rather than from nothing

An exemption over an empty set proves nothing, the same way a mutation that
changes nothing tests nothing. That check exists because the exemption was written
before anyone counted what it covers.

## Still open

- **The Drive drop is Tanner's, and this one REPLACES rather than adds.** The Unit
  1 drop was additive because no Unit 1 folder had a `Teacher_Guide.docx`. All 38
  of these do, and the Drive API creates rather than replaces, so a careless
  upload leaves two guides per lesson folder.
- **The six need CED wording that is in neither repo.** Board item wanted: their
  theme specs are on the retired Unit 4 map and want rewriting against the 2025
  CED, which also repairs the exercises a teacher holds, not only the guide.
- **The kit's 3.6 handle is dead** in `content_unit3b.py`, so the deck, the guided
  notes and the quiz for that lesson carry it too. The guide is fixed here because
  the guide is what this pass owns; the content module is a one-line change with a
  wider blast radius and its own claim.
- **`package.json` is not in this commit.** The three npm scripts belong in it and
  the lock was held by another session on board 349 for the whole pass. Nine of my
  ten locks went through; that one did not, and forcing it is not worth a merge
  conflict in somebody else's live work. Until it lands, CI derives its suite list
  from `package.json` and therefore does not run either new suite.
- **98 directional lines** in the kit's own bell ringers, worked examples and
  teaching sections, against Tanner's informational-not-directional standard.
  Unit 1 scores 0 on the same measurement. Not fixed here: the theme specs hold
  cleaner wording for the same lessons, but their segment titles differ from the
  kit's, so importing them would give a teacher a guide describing a different
  lesson from the deck and guided notes in the same folder. Repairing the kit's
  own wording is the fix, and it is authoring across 38 topics.
