# CSA daily-practice code blocks: 25 articles served a class attribute where the Java should be

Board 153. 2026-09-02, Claude Code.

## What a student saw

On 25 of the 429 articles in `ap-csa-daily-practice`, the code block rendered
this:

```
"apcs-keyword" >int total = "apcs-number" >0;

"apcs-keyword" >for ("apcs-keyword" >int i = "apcs-number" >1; i <= "apcs-number" >4; i++)
{
    total += i;
}

System.out.println(total);
```

Every one of them is in the `unit2-cycle2-*` family, which is Unit 2 Cycle 2:
selection, iteration and boolean logic. A teacher reaches it around week four.

## The bug, from the markup

The live bytes:

```html
<span class="&lt;span">"apcs-keyword"</span>&gt;int total =
```

Read as a template that is `<span class="A">B</span>C` with `A` = `&lt;span`,
`B` = `"apcs-keyword"` and `C` = `&gt;`. The original was
`<span class="apcs-keyword">int</span>`, so something applied a rewrite shaped
like

```
(\S+) class=("[^"]+")   ->   <span class="$1">$2</span>
```

to markup whose angle brackets had ALREADY been escaped. The class name became
the span's content, the escaped `&lt;span` became the class, and the original
`&gt;` was stranded in front of the Java.

200 of those across the 25 articles. Counted twice, by two different scans that
agree exactly: a `grep` for `class="&lt;span"` over all 429 live pages, and a
parse of every extracted body. No other article in the blog shows any escaped
tag as visible text.

## The repair is a deletion

Inside a `<pre><code>` block and only there:

1. every `<span class="&lt;span">"apcs-CLASS"</span>&gt;` is deleted whole
2. every well-formed `<span class="apcs-CLASS">...</span>` is unwrapped

No character of Java is written by the script. `scripts/csa-daily-practice-code-repair.js`.

### The colour is not put back, and that is deliberate

The mangling destroyed each span's CLOSING tag along with its class, so where a
highlight ended is not recoverable: `<span class="apcs-keyword">int</span>` and
`<span class="apcs-keyword">int total</span>` mangle to the same bytes. Any
colour restored would be an inference about token boundaries dressed as the
author's markup.

Plain is also what the site already serves. The hyphenated `unit-2-cycle-2-*`
family uses the same template and the same dark code block with no highlight
spans at all.

Rule 2 exists for the same reason: a few spans survived well-formed, always on a
fragment of an identifier, giving `System.out.println` with `print` blue and `ln`
not. Leaving those would keep the artifact on a page that now has no colour
anywhere.

## The mistake that was nearly made

`unit-2-cycle-2-day-10-iteration-accumulation` is clean, uses the same template,
and shares a slug tail with the mangled `unit2-cycle2-day-10-iteration-accumulation`.
Copying the clean body across would have been one line of work.

They are **different questions**. The twin sums 1 to 5 and prints 15; the mangled
article sums 1 to 4 and prints 10. That repair would have shipped a wrong answer
to 25 pages while every structural check passed. The twin is now a committed
fixture with an assertion naming exactly this, so nobody rediscovers it.

## Three kinds of evidence, plus mutation

`deploy-gates/2026-09-02-csa-daily-practice-code.json`.

**suite** `npm run smoke:dpcode`, 106 assertions over the 25 live bodies and two
controls.

**rederive** `scripts/verify-code-repair-sheet.py`. A second implementation in
another language that walks each code block one tag at a time, parses each span's
class attribute, and rebuilds the block from the pieces, then requires the result
to be byte-identical to the sheet. It imports nothing from the generator. It is
stricter in one place: it REQUIRES the stranded `&gt;` to follow each mangled
span rather than assuming it.

**live** `scripts/verify-code-repair-live.js`. Refetches all 25 and asserts no
mangled span remains, the served code block is byte-identical to the sheet, and
the recovered program still prints its keyed answer. Run before the import, it
fails on every one of the three, for all 25. That is what makes it a check rather
than decoration.

**mutation** seven, each naming the assertion it must trip.

### The check worth having: the article's own answer key

Everything above proves the repair deleted only what it declared. None of it can
prove the RESULT is the program the question was written against, because a
deletion that ate a bound leaves a body that is well-formed, passes the deletion
proof, and renders perfectly while teaching a wrong answer.

The article settles it. It carries a multiple-choice key on the far side of the
page from the code block, and the repair never touches it. So
`scripts/mini-java-trace.js` runs the recovered program and requires its output to
be the option marked correct.

**25 of 25 agree.** Day 10 prints 10 and the key is C) 10. Day 26 prints 3 and
the key is A) 3. Day 5 turns on `7 / 3 == 2`, which is true only with Java's
truncating division. The one debugging question, day 12, has edits rather than
outputs for options, so it is checked differently: the fragment its correct
option edits, `` `i < 5` ``, must survive in the recovered code.

The interpreter interprets. There is no `eval`, no `new Function`, no transpile:
the input is text off a live storefront page. It walks a parse tree over a fixed
grammar and refuses anything outside it, so an unsupported construct is a
reported skip rather than a silent pass.

## What the gate caught in its own instruments

Three of the seven mutations went red on the wrong assertion the first time, and
one did not go red at all. All four were faults in the checking, not in the
repair:

- The suite CRASHED when a mutation made `build()` refuse all 25, because the
  answer-key section pulled a fixture out of `build()`'s output. A suite that
  stops early reports fewer failures than it found. The deletion proof now runs
  over every article rather than over the accepted rows, which is where it should
  have been: the proof matters most exactly when the repair is refusing.
- `visible()` on a mangled span gives the SAME answer with the decode and strip
  passes in either order, and so does an escaped tag written `&lt;b&gt;`. Two
  tests about the right subject that proved nothing. The order only matters once
  a literal `>` is already present, which in these bodies is the escaped
  less-than inside the Java: decode `i &lt;= 4` first and the `<=` swallows every
  character up to the next real closing bracket.
- The scope mutation aliased the loop's scope to its parent, which the loop
  BODY's own fresh scope then covered for. Declaring into one flat scope, which
  is what the interpreter did before this was found, is the mutation that bites.

The `expect_failure` strings here name the assertion WITH its `[FAIL]` prefix.
Without the prefix the string matches the PASS line too, so the subsumption check
passes on a mutation caught by some other guard entirely. Earlier gates in this
repo use the bare name; this is the stricter form.

## Artifact

`imports/2026-09-02/csa-daily-practice-code-repair-blog-posts.csv`, 25 rows,
md5 `9ffe4ffaa432473d85b3cfa375d60998`. MERGE, four columns, no `Published At`,
no blank cell. Preflight clear.

## Still open

- The mangling's SOURCE is not in this repo. These articles were generated
  elsewhere, so nothing here stops the next batch arriving the same way. If the
  generator is still in use, `smoke:dpcode` is the shape of the check it needs.
- The repaired articles carry no syntax highlighting at all, where the template's
  CSS still defines five highlight classes. Colour can be reinstated only by
  regenerating from source, never from the live body.
- Board 154, the 84 duplicate article pairs, overlaps this set: 25 of the mangled
  articles have a hyphenated near-twin asking a different question under a nearly
  identical slug. Which of each pair is canonical is a decision, not a repair.
