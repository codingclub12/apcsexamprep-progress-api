# ap-csa-topics: four h1 elements down to two, 2026-09-18

One sheet, one page, three edits.

## What was wrong

The rendered page carries FOUR `<h1>` elements. Three of them are in the stored
body:

    h1[0]  AP CSA Topics                                 the theme, from the Title field
    h1[1]  AP CSA Topics | Practice by Unit ... .com     body, a pasted copy of h1[0]
    h1[2]  AP Computer Science A Topics, Practice ...    body, the real heading
    h1[3]  Get in Touch                                  body, a contact section

`h1[1]` is a copy of the theme's own page-title markup, class list and all,
carrying the SEO title complete with the `| APCSExamPrep.com` suffix. Somebody
pasted rendered chrome into the page body. It is the first element in the body.

## Why nothing caught it and the page still looks right

The body ships this, with the comment "Hide Shopify's default page title if it
shows":

    .page-title, .section-header, h1.title { display: none !important; }

Both `h1[0]` and `h1[1]` carry `page-title`, so that rule hides them both. Two of
the four are invisible and the page reads correctly to a person. It is a DOM
defect only, which is the kind a check on visible text cannot see.

## What the sheet does

- **removes the pasted `h1[1]`** and keeps its wrapper div. No visual change,
  because the element was already hidden
- **demotes "Get in Touch" to `h2`**, where the body already has twelve, and
  **moves its CSS rule with it** so the 32px styling survives

Body goes from 3 h1 elements to 1, and from 12 h2 to 13. 151 characters smaller.

## What it deliberately does not do

It does not touch `h1[2]`, the real heading. Demoting that would leave the only
remaining h1 a hidden one, which is worse than having two. And it cannot reach
`h1[0]`, which the theme renders from the Title field.

**Two h1 elements, one hidden chrome and one real heading, is where a body sheet
can get to.** Collapsing that to one means changing the theme, or removing the
`display: none` rule and letting the theme's title be the visible heading. Both
are bigger decisions than this sheet.

## Import and check

    node scripts/verify-body-year-live.js ap-csa-topics

Expect `[DONE]`, 0 stale, 9 of 9 new claims present. Then look at the page: it
should be visually identical, and the rendered h1 count should read 2 rather
than 4.
