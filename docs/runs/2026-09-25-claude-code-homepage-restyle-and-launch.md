# 2026-09-25: homepage restyle, navy nav, Teachers menu, launch

Boards #407, #417, #418 closed as needs_verification. #416 and #419 opened.

## What changed

**Score claims and Cram Kit price, theme PR #132** (merge `d166f1c`), split out of #131 at Tanner's request so it went live first.
- The 54.5% / 34.8% five rates are gone from the popups and the FRQ widget in `layout/theme.liquid`.
- The Cram Kit button reads its price from the product.
- The widget dates now show May 12, 2027 and FRQs 2004-2026.

**Homepage, theme PR #131** (merge `e2cf12d`, head `23ea7a7`, 12 of 12 checks green).
- The new homepage section, the two-door nav and the course footer from 2026-09-24.
- The restyle Tanner picked from a side-by-side of four styles (option B):
  - a navy `#0c2340` hero with a yellow main button
  - course cards overlapping the hero, each with a header in its course color: CSA `#2D6BC4`, CSP `#127968`, Cyber `#5b34b8`, Networking `#a14a07`
  - Archivo headings from Shopify's font library, set through a `font_picker` section setting (`archivo_n7`) and replacing Georgia

**Width**, found on the preview theme at 1905px.
- `layout/theme.liquid` caps `.shopify-section` and `.content-for-layout` at 1500px. The section lifts that cap by its own id, and for `.content-for-layout` only via `:has(#apcs-home)`.
- The content column now matches `#apcs-nav .nav-inner`: 1200px wide with 20px sides.
- `theme.liquid` also sets every `table` to `display:block`. The exam table goes back to `display:table`.

**Nav bar navy**, commit `23ea7a7`, every page.
- One change: the `#apcs-nav` background goes from `#2D6BC4` to `#0c2340`.
- It is its own commit so it can be reverted alone.

**Teachers menu** (#418). For a teacher with students, three rows landed on what looked like the gradebook:
- "Go to my hub" routed to the gradebook.
- "Gradebook" went to the gradebook.
- "Join / Class Setup" opened the class portal, which for a signed-in teacher is a class list with View Dashboard buttons.

The fix:
- "Go to my hub" is removed.
- "Join / Class Setup" is now "Classes and sign in".
- No role gating, per the 2026-08-27 decision.
- `apcsTeacherRoute` and `apcsTeacherGo` stay global, because `shopify/page-snapshots/ap-networking-command-center.before-file-gate.html` references them.

## Evidence

Live fetches through `lib/storefront-fetch`, with a cache-bust, after each merge.

After #132, `/pages/ap-csa-frq-archive`:
- `$29.99` appears 0 times, `$19.99` twice.
- "11+ years" appears 5 times.

After #131, `/`:
- It serves `id="apcs-home"`, `#0c2340` and `apcs-footlinks`.
- It has no `custom-liquid`, no `54.5%` and no Georgia.

After #131, `/pages/ap-csa-course`:
- The nav reads `background: #0c2340`.
- The Teachers menu titles are exactly Gradebook, Command Center, Classes and sign in.
- "Go to my hub" survives only in two code comments.

## Still open

- **#416:** the FRQ archive page body still carries a 54.5% stat box (`frq-cta-stats-row`). It is page content, not theme, so it needs a Matrixify sheet.
- **#419:** the same hero style for the hub pages, with a 1000-1100px column that leaves side rails for ads. After the first weeks of school.
- **Shopify Admin > Preferences:** set the homepage title to "AP Computer Science Exam Prep and Courses". This is Tanner's step in Admin.
- **Unscoped check:** `scripts/verify-new-pages-0924-live.js` `mustNot` scans the whole page, not the page wrapper.

## Learned

- A render of the section alone looked right and was wrong on the store. The theme's own width cap and table rule only show up with `layout/theme.liquid` in play. The fix to the check is to load the theme's global rules into the local render, which is what caught the table.
- "Three rows go to the same place" was true only for a signed-in teacher with students. The code had to be read in that state to see it.
