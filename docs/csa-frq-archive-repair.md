# Repairing the AP CSA FRQ archive

86 hand-authored past-paper pages and their hub, fixed in place. What was wrong
and how it was measured is `docs/reports/2026-09-17-csa-frq-audit.md`. This is
how the repair works and why it is shaped the way it is.

## The constraint that decides everything

These pages have **no generator**, they are in **four different formats**, and
they are **indexed**. So the repair is not a rebuild. Every change is a surgical
edit to the body the storefront is currently serving, and the sheets ship split
so that one click never touches more than one year block.

The alternative, retro-fitting a generator over all 86, is the right long-term
answer and the wrong thing to do in the same pass as a repair. It turns a list
of small defects into one large incident.

## The rule that makes surgery safe

**Every transform states the text it expects and REFUSES when the text is not
there.** None of them is allowed to no-op.

That is not fussiness. A repair that quietly matches nothing is the worst
available outcome: the import reports success, the page is unchanged, and the
defect is now believed fixed. A refusal is loud and costs a rerun.

`smoke/csa-frq-archive-repair.js` section 3 exists only to prove this. Every
transform is handed a page it does not match and must throw.

## What each transform does

| transform | pages | what it fixes |
|---|---|---|
| `addScoringNote` | 74 | the reader is not told the 9-point rubric below them is retired |
| `fixDates` | 13 | May 15, 2026 named as a future date, four months after it passed |
| `fixUnit` | 6 | a Curriculum Alignment and a Study This Topic link naming different units |
| `fixJsonLd` | 1 | a structured-data block that has never parsed |
| `newTitle` | 43 | 32 titles reading like machine output, 11 promising a solution they do not have |

### The scoring note is self-contained, and it has to be

40 of these pages have no wrapper id at all. The other 46 have one each,
`frq14q1` through `frq22q4`. There is no shared stylesheet to hook into.

So the note carries its own unique id, `frq2026note-<handle>`, and its own scoped
CSS with the `all:initial` reset the theme's CONVENTIONS.md requires. It renders
the same on an 8KB page from 2008 and a 38KB one from 2022 because it depends on
neither.

It states the retired 9 points as well as the current 7, 7, 5 and 6. "This is now
7 points" on a page printing 9 reads as a typo to somebody holding a printout;
"it used to be 9 and now it is 7" reads as news.

### The exam numbers have one home

`config/csa-frq-2026.json`, through `lib/csa-frq-archive-repair.js`. The repair
spec does not repeat 7, 7, 5 and 6 anywhere, and the suite asserts that it does
not, because two copies of a number is how one of them goes stale.

### The six unit contradictions resolve the same way

The page's own **Skills Tested** line decides, and in all six cases it says the
same thing. 2004 FRQ 4 and 2005 FRQ 4 read "Array traversal", which is Unit 4, so
their *alignment* was the wrong half. The four case-study pages are already
aligned to Unit 4 and linked elsewhere, so their *link* was the wrong half.

Two of them linked `/pages/ap-csa-unit-1-study-guide` labelled "Unit 1: Primitive
Types". That is the retired 10-unit curriculum, which this repo forbids in front
of a student, and the handle answers 301 rather than 200. Both problems go away
with the unit correction.

### The stub titles say what the page is

Eleven pages promise a solution and deliver a comment saying the case study was
withdrawn. There is nothing to solve, that is College Board's doing, and the
pages are **not** unpublished: that is on the `NEVER_AUTO` list and it throws
away the traffic. The title says so instead.

    2004 AP CSA FRQ 3: Fish - Complete Solution
    2004 AP CSA FRQ 3: Fish (Marine Biology, Not Tested)

The parenthetical uses a short case-study label because the full name runs past
the 70 characters Shopify shows, and a title truncated mid-word in the SERP is
the defect this repair exists to fix.

`ap-csa-2016-frq-1-randomstringchooser` was checked and is **not** in that list.
It carries a real solution and already caveats, correctly, that only its subclass
part uses inheritance. It gets a title repair and nothing else.

## Two rules had to become deltas, and the controls are what caught it

The first draft of the sheet validator refused any body that named the retired
curriculum, or the stale date, at all.

Both fire on content the repair never touched. A page that already named
"Primitive Types" and still does has not been made worse by gaining a scoring
note, and refusing the whole sheet over it means the note never ships. The
suite's own controls went red and that is exactly what controls are for.

They are deltas now, and the absolute guarantee still exists one level down
where it belongs: `fixDates` throws if the stale date survives it, `fixUnit`
throws if it matched nothing, and section 3 asserts both.

The stale-date rule is **two-sided** rather than a plain "no more than before":

- a page that named it must come back naming it zero times
- a page that never named it must not gain one

A one-sided rule misses a repair that removes one reference and adds another.

## Shipping it

```
npm run smoke:csafrqrepair        66 assertions, offline, with mutations
npm run csa:frqrepairsheets       seven sheets, every cell parsed back and diffed
npm run csa:frqrepairlive         red before the import, green after
node scripts/deploy-gate.js deploy-gates/2026-09-17-csa-frq-archive-repair.json
```

`imports/2026-09-17-frq-archive/RUNBOOK.md` has the order, the expected result
per step, and what to check after each one. The 2026 question set imports
**first**: the hub sheet claims 90 FRQs and links the 2026 index, and neither is
true until it exists.

Unlike the 2026 set, this change earns a real live check and the manifest has
one. Measured against the hub before any import, it reports 13 of 13 red.
