# EK coverage table protection, and a correction

Follow-on from the Topic 1.4 realignment (PR #377, merged). Preparing to reuse
`lib/cyber-ek-thin.js` on 1.4 turned up two holes in the protection mechanism.

## Correction to what PR #377 said

That PR's description and run note say running the existing thinner on 1.4
"would strip the teacher crosswalk." **That is wrong.** I checked it properly
afterwards: with the module in its shipped state, all ten crosswalk codes on the
live 1.4 page survive `thin()` intact.

The reason they survive is not protection. 1.4's coverage table is a two-cell
layout, `<td class="term">1.4.A.1</td><td>AI deepfakes: ...</td>`, so the code
sits alone in its cell. The rule that drops a leading code label needs a code
followed by whitespace and then an uppercase letter, and it never matches a cell
containing only the code. The crosswalk was safe by accident of markup.

So the defect is real but latent, not active. Nothing on a live page was ever
corrupted. What was missing is the guarantee, and a guarantee that holds only
while every page happens to share one table shape is not one.

## The two holes

**1. The coverage table was located by the literal string `id="ek11-body"`.**
The id carries the topic number: `ek11-body` on 1.1, `ek12-body` on 1.2, up to
`ek15-body` on 1.5. So on four of the five lesson pages the table was not found
and therefore not protected. Nothing surfaced it, because the summary reported
zero citations kept under that label, which is indistinguishable from a page
that has no coverage table at all.

```
                        before          after
1.1   coverage table =  8               8
1.2   coverage table =  0               7
1.3   coverage table =  0               8
1.4   coverage table =  0              10
1.5   coverage table =  0               7
```

**2. `thin()` step 2 ran outside the protection mechanism entirely.** Its second
rule deletes any row-final `<td>` that opens with an EK code, and it was applied
globally rather than through `outsideProtected`. On a coverage table shaped with
the code in a row-final bare cell, that deletes crosswalk rows and no protection
stops it. It is now inside `outsideProtected` like every other prose rule.

Step 3, the sort widget, is deliberately left global, and the code says why:
those are literal paired strings, and protecting one half of a pair while
rewriting the other is exactly the failure the pairing exists to prevent. Global
is the safe direction there and was the unsafe one for step 2.

## Evidence the fix changes nothing else

All six AP Cyber page bodies produce **byte-identical** `thin()` output before
and after. This is a protection change, not a behaviour change:

```
ai-cyber-defense          output unchanged
ai-driven-threats         output unchanged
introduction-to-security  output unchanged
password-attacks          output unchanged
social-engineering        output unchanged
wireless-security         output unchanged
```

1.1 has already shipped through this transform, so leaving its output untouched
was the constraint the fix had to meet.

## The test

`smoke/ek-protection.js`, registered as `npm run smoke:ekprotect`, so CI picks it
up automatically: `.github/workflows/tests.yml` discovers every `smoke:*` script.
Offline, no network, no secrets.

Fourteen checks. Both defects were reintroduced one at a time to prove the suite
catches each:

- pin the id back to `ek11-body` -> 8 failures, on exactly 1.2 through 1.5
- move step 2 back outside the protection -> 1 failure, the row-final fixture

The fixture in case 3 is the page that does not exist yet: a coverage table whose
code sits in a row-final cell. That is the shape that would have turned this
latent defect into a live one.

One test I wrote was wrong and is worth recording. It asserted that a bare inline
citation outside the table gets removed. It does not, and should not: the thinner
deletes parenthetical citations generically and everything else through rules
authored against sentences someone actually read. Blind deletion is what produced
"A birthdate applies." on the first attempt at 1.1. The check now asserts the
parenthetical behaviour, and asserts the surrounding sentence survives intact.

## Method note

The sequence here was: assert a claim from reading code, state it in a PR, then
check it and find it wrong. The claim was directionally useful, since it pointed
at a genuine hole, and it was still wrong about what would happen. Reading a
regex and predicting what it does to a 228 KB page is a guess. Running it is not.

## Still open

- The 1.4 realignment sheet is built and not imported.
- Thinning 1.4 is now unblocked but not done.
