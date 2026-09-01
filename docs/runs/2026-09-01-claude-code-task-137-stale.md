# Task 137 was fixed four days ago and nobody closed it

Asked to take task 137, "REGRESSION: 1.1 lesson leaks all 10 CFU answers on
load". Checked the live page before touching anything. It does not leak. The
repair shipped on 2026-08-28 and the ticket stayed open.

No change was made. This note exists because the ticket was wrong, and because
the first method I used to check it was also wrong.

## The evidence

`https://www.apcsexamprep.com/pages/ap-cybersecurity-unit-1-social-engineering.json`,
page `132111237335`, `updated_at 2026-08-28T09:38:25-05:00`, 211,402 bytes of
body. All ten feedback divs carry the attribute:

```
HIDDEN  cfu-1-feedback   style="display:none!important;"
...
HIDDEN  cfu-10-feedback  style="display:none!important;"

LEAKING ON LOAD: none
```

Hiding is only half the requirement, per the 2026-08-27 note: the reveal has to
survive. It does.

```js
function showFeedback(num, isCorrect, partialMsg){
  var feedDiv = document.getElementById('cfu-' + num + '-feedback');
  if(feedDiv){ feedDiv.style.setProperty('display','block','important'); }
```

The `updated_at` is the day AFTER the repair script was written, which is what
closes the question of whether the sheet was ever imported.

## The method that was wrong first

A flat regex for elements whose id or class contains feedback, answer,
explanation, solution or rationale reported **22 exposed**. That reading was
useless, because a flat scan cannot see nesting and every `cfu-N-verdict` and
`cfu-feedback-explain` lives INSIDE the `cfu-N-feedback` div that is already
hidden. A child of `display:none` does not render whatever its own style says.

Walking div depth from each hidden element to its matching close, and asking of
every candidate whether it sits inside one of those ranges, drops 22 to 2:

```
elements hidden by inline style: 11
TRULY EXPOSED: 2   both class="ex-answer"
```

Both are worked-example callouts inside `ex-block`, styled with a green
background and a left border, and they say "Answer:" on purpose. A worked
example that hides its answer is not a worked example.

So the general check is not "is this element hidden" but "is this element
rendered", and the two differ by exactly the amount that matters. A leak check
that ignores nesting reports elevenfold noise and would have sent somebody to
"fix" ten things that were already correct.

## What is still open

**Nothing watches the live page.** `validate_csv.py --baseline` gained
`stayed_hidden` after the 08-27 incident, and it is a good gate: it fails a
sheet that drops an inline `display:none` present in the live body. But it only
runs when a sheet is authored. A hand edit in the Shopify admin, or any path
that does not go through a sheet, reintroduces the leak with no gate in the way
and nothing checking afterwards.

That is the gap a periodic live-page audit would close, and it is the strongest
argument for the `page-auditor` role discussed earlier: ten of the last
twenty-eight run notes are some form of "a live page tells a student something
wrong", and every one was found by a person looking rather than by a check.

**The stale ticket is its own finding.** Task 137 sat in `now` for four days
describing a condition that was not true. Board-versus-reality drift is the same
class of problem as the deploy drift fixed earlier today, and it has the same
cost: it sends attention to the wrong place. Worth a sweep of the other `now`
items against live before trusting the ordering.

Closed with the live JSON as the artifact. `verified` stays 0; that is Tanner's.
