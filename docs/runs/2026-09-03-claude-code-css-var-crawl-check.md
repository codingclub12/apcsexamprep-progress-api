# 2026-09-03, claude-code: the crawl can now see an unresolvable CSS variable

Board #203. Closes the gap #202 opened.

## Why this existed as a gap

The AP Cyber 1.1 lab shipped reading ten CSS custom properties and declaring
none of them, and nothing in this repo could tell. The page served 200, parsed,
rendered, passed the mojibake guard, passed the em-dash rule, and every string a
verifier looked for was present. The whole defect was in what a browser does
with a name it cannot resolve: an undefined `var()` is invalid at computed-value
time, so the entire declaration is dropped rather than just the colour.

`.check-btn` therefore kept `color:#ffffff` and lost `background:var(--purple)`,
on a card that is `background:#ffffff`. Five of six buttons on that page were
invisible and 27 of 32 students in one class had no lab score.

A teacher found it. That is the part worth fixing.

## What landed

`lib/css-vars.js`, pure functions over page HTML, called from `checkPage` in
`lib/site-crawl.js` the same way `cyber-denominator-gate` is. Two kinds:

    css-var-invisible-text   P0   a rule paints near-white text and its own
                                  background names something that does not
                                  resolve, so the text lands on whatever is
                                  behind it
    css-var-undefined        P2   the page reads a name nothing defines

They are separate on purpose. Most unresolvable properties cost a border or a
tint nobody misses, and filing that as P0 every night is how a report becomes
wallpaper. The narrow one is P0 because light text is only ever authored against
a dark background, so a rule that asks for white and then loses its background is
making something unreadable, and the student cannot see that anything is wrong.

## The rule that decides whether this is usable

**`var(--x, #fff)` has a fallback and resolves whether or not `--x` exists.**
Only a reference with no fallback can take its declaration down, and only those
are counted. A check that counted every `var()` reference would report most of
the site every morning, because the theme uses the defensive form.

The opposite direction is deliberately permissive: "defined" is gathered from the
whole page rather than from the scope the use sits in, so a property defined on
some unrelated selector counts as resolvable. That can hide a real scope bug. It
is the right way round to be wrong, because being wrong quietly costs one missed
finding and being wrong loudly costs the report.

## Evidence

- **suite**: `npm run smoke:sitecrawl`, 149 checks, green. 18 of them are new and
  five are silent directions, which is where the value is: fallback present,
  property defined, dark text, no style block at all, and a text colour that is
  itself a variable so brightness is unknown and the rule declines.
- **mutation**: `npm run smoke:cssvarsmutation`. Six rules, each broken on its
  own, each required to change the answer it protects. Every case asserts its
  baseline against the real module first, so a case cannot pass by being wrong
  about what unmutated behaviour is, and every patch is asserted to actually
  apply so a refactor cannot leave a case silently testing nothing.
- **rederive**: the static analyzer flagged three selectors on the pre-fix 1.1
  lab body. Headless Chromium computed all three as
  `background rgba(0, 0, 0, 0)` with `color rgb(255, 255, 255)`. Three for three,
  a real CSS engine agreeing with the static reading.
- **live**, before wiring anything in: run against the 1.1 lab in both states and
  six other live pages carrying 15 to 20 style blocks each. Three findings on the
  broken page, silence on all seven others.
- **the false-positive sweep, which is the one that decides whether this can run
  nightly**: every HTML file in the repository carrying a `<style>` block, 290 of
  them, including all 61 live page-body snapshots under `shopify/page-snapshots/`.
  288 silent. The only two with findings are the two copies of the broken 1.1 lab
  body, `backup/` and the smoke fixture. The check fires on the known defect and
  on nothing else in 290 files.

## What this does not do

- It reads `<style>` blocks only. An inline `style=""` attribute cannot carry a
  definition another rule depends on, and scanning every attribute on a 400KB
  page would cost the crawl real time for no finding.
- It does not resolve scope. See the trade above.
- It says nothing about contrast generally. `color:#777` on `#888` is bad and
  this will never mention it. The question here is narrow on purpose: a
  declaration that was DROPPED, not a palette that is ugly.

## Still open

- The 1.1 lab was one page in 108. Nothing has swept CSA, CSP, Networking or
  Intro Java for the same defect. The nightly crawl will now do it as it goes,
  which is the point, but nobody has looked yet and the first run is worth
  reading rather than skimming.
