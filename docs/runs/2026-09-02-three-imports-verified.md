# Three Matrixify imports, and what verified them

2026-09-02. Tanner imported all three sheets. This is the post-import check the
store handoff calls for, run against the Admin API rather than the storefront,
because the storefront was rate limiting this container at the time.

## What landed

    cyber-command-center            2026-08-26T17:04:57Z -> 2026-09-02T10:40:54Z
    49 CSA daily-practice articles                          2026-09-02T11:05:3x-46Z

`updated_at` moved on every one, so none was a silent no-op. That is the check
that matters first: a Matrixify log saying success proves the file was read, not
that anything was written.

## The Command Center came back BYTE IDENTICAL

    sent    68,861 chars
    stored  68,861 chars
    delta   0

Not even the entity decoding the handoff warns about, which is worth recording:
the handoff says a body read back is typically slightly SHORTER because Shopify
decodes some entities on store. This body had none to decode, so zero is the
correct delta here rather than a suspicious one.

    RESOURCES rows      7   (5 existing + 2 added)
    script blocks       1, compiles
    renderResources     present
    entitlement gate    present
    emoji glyphs        14 distinct, 29 total, unchanged from before
    mojibake sequences  0

Both new rows carry the folder id, and both use the `D` folders prefix rather
than `F`. Live on the storefront once the rate limit cleared.

## THE MERGE RISK IS CLOSED EMPIRICALLY, NOT ARGUED

Command was MERGE, per the handoff. MERGE CREATES a row it cannot find, so a
single typo'd handle would have published a blank article to a live blog. The
reasoning was that every handle came from a live fetch that returned 200, which
is an argument rather than evidence.

The evidence: `ap-csa-daily-practice` held 429 articles before the import and
holds 429 after. Nothing was created. Forty-nine rows updated, the fiftieth most
recently touched article dates from 2026-08-04, so the boundary is clean.

## The banner, on a live page

    banner headline      served
    links to the CED     served
    Dog extends Animal   intact
    correctAnswer = 'D'  intact
    four options         intact

The point of the byte guard was that the banner is added and the graded markup
is not touched. Read back off the storefront, both hold.

## One thing this run got wrong

A spot check queried `ap-csa-u3-c2-day-19-abstract-instantiation`, which came
back empty. That handle was invented rather than taken from the list of 49, and
an invented handle returning nothing is not a finding. The complete check
replaced it: every article in the blog sorted by `updated_at`, where exactly 49
carry today's timestamp and the next one down is from August.

Sampling by a handle you guessed is not sampling, it is asking a question you
already know the answer to and misreading the reply.

## Still open

- **#146**, 46 pages advertise the 2025-2026 school year in their title.
- **#147**, every CSA daily-practice SEO title is malformed three ways.
- **#148**, contact-form.liquid hides `.page-title` sitewide via an unscoped
  style block.
- **#150 is closed**, and the underlying question is not: each unit still budgets
  two days for a test that now lives one click away in a shared folder rather
  than on the unit itself.
- **#152**, the storefront rate limits this container at roughly 600 requests.
  It cleared after about forty minutes.
