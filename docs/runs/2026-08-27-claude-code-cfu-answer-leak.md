# The 1.1 lesson served its answer key on page load, and I put it there

2026-08-27, Claude Code. A teacher reported that the Topic 1.1 lesson was
showing MCQ answers before submit. It was, for eight of the ten Check For
Understanding items, and the cause was the WO-3 rewrite I shipped that morning.

## The mechanism

Every CFU widget hides its feedback with an **inline style on the div**:

```html
<div class="cfu-feedback" id="cfu-1-feedback" style="display:none!important;">
```

There is no CSS rule that hides it. The stylesheet gives `.cfu-feedback` its
padding, border, background and colours and nothing else, and the grading engine
reveals it with `feedDiv.style.setProperty('display','block','important')`. So
that attribute is not decoration. It is the only thing standing between a
student and the answer.

## How I dropped it

While reading the live markup I stripped inline `style` attributes to make 218 KB
legible:

```python
re.sub(r'\sstyle="[^"]*"', '', body)
```

Then I authored the replacement blocks from what I had read. Eight of the ten
feedback divs came out without the attribute. The two that survived, cfu-7 and
cfu-8, are the two I did not rewrite.

The reading transform silently became an authoring transform. That is the whole
bug, and it is a general hazard: anything removed to make source readable has to
be put back before that source is used as a model for new source.

## Why every gate passed

Eleven checks ran on that sheet and none of them could see it.

| Gate | What it asked |
|---|---|
| `validate_csv.py` | tags balance, nav markers present, no mojibake, MERGE command |
| build gate | ten widgets exist, ids match, keys resolve, buckets and chips valid, EKs cited |
| DOM parse | zero nesting errors |
| `verify_import.py` | live body equals the sheet after normalisation |

Every one of them asks whether the sheet is *well formed*. Not one asks whether
something that used to be hidden still is, because nothing inside a sheet tells
you what the page looked like before. The check needs the live body, which is
exactly what `--baseline` already provides and what nothing was using it for.

## The fix

`scripts/cyber-cfu-feedback-repair-csv.js` restores the attribute wherever it is
missing and changes nothing else. It proves "nothing else" rather than asserting
it: strip the inserted attribute back out of the output, and the result must be
byte identical to the live body. A repair that cannot be undone exactly is not a
repair.

Browser-verified with Playwright against the real markup, before and after:

```
BEFORE  CFU feedback boxes visible on load: 1, 2, 3, 4, 5, 6, 9, 10
        leaked text starts: "Correct pairings. Intimidation only, F: a threatened..."
AFTER   CFU feedback boxes visible on load: NONE
        after answering Q2: feedback visible = true | verdict = "Correct! /"
```

That second line matters as much as the first. Hiding the boxes is easy; hiding
them without breaking the reveal is the actual requirement.

## The check that would have caught it

`validate_csv.py --baseline` gained `stayed_hidden`: collect every id carrying an
inline `display:none` in the live body, and fail if any of them lost it in the
sheet. Cheap, general, and it does not care what the element is for.

Proven both directions. Rebuilding the WO-3 sheet exactly as it shipped and
running it against the pre-WO-3 body now fails:

```
LEAK  these were hidden on the live page and are not in this sheet:
      cfu-1-feedback, cfu-10-feedback, cfu-2-feedback, cfu-3-feedback,
      cfu-4-feedback, cfu-5-feedback, cfu-6-feedback, cfu-9-feedback
FAIL  ap-cybersecurity-unit-1-social-engineering   -> stayed_hidden
```

The repair sheet passes.

## Blast radius

Only the 1.1 lesson. Checked every Unit 1 page that carries CFU widgets:
`ap-cybersecurity-unit-1-password-attacks` has 9 of 9 hidden and
`ap-cybersecurity-unit-1-ai-driven-threats` has 10 of 10. Topic 1.1 Exercise 1,
the other page I changed today, is untouched: its hidden-element set and every
inline style are identical before and after, because those splices went into a
JavaScript array rather than into markup.

## A second tooling gap, found while checking

`fetch_pages.sh` reported `200` for a Cloudflare challenge page. Fetching all 23
pages in a tight loop tripped bot protection, and the script wrote
`Verifying your connection...` into `<handle>.json` and printed a success code.
Any audit run over that directory would have reported the page clean because the
body it read contained no lesson content at all. The repair script refuses a
response that parses as HTML rather than JSON and says what happened; the same
guard belongs in `fetch_pages.sh`, and it is not there yet.

## What was learned

Three things, in order of how much they cost.

**A transform used for reading must not survive into authoring.** Stripping
attributes to read 218 KB was reasonable. Writing the replacement from that
stripped text was not, and no amount of care in the prose would have caught it.

**Gates that only see the artifact cannot catch a removal.** Every check on that
sheet was a well-formedness check. Removal is invisible to well-formedness: the
page was perfectly valid with the answers showing. Catching it required
comparing against what was there before, and the comparison was already
available and unused.

**A gate proven only in the passing direction is half tested.** `stayed_hidden`
was written, printed its warning, and still returned exit 0, because it was
computed after the failure list was built. It looked correct in the output and
was inert. Running it against the sheet that actually shipped is what exposed
that, and it is now the regression test for the check itself.
