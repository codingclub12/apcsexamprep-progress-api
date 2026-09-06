# Both bundle sections are live, and the check that said otherwise was mine

2026-09-06. Boards 236 and 239, closing what was blocked on 09-04.

## They imported

    ap-csp-teacher-superpack   19873 -> 21446 bytes   updated 16:12:58
    ap-csa-teacher-superpack   20737 -> 22102 bytes   updated 16:12:34

Both rendered pages serve their section. The $249 CSP page now says what the 590
files are; the CSA page says every lesson ships eight teacher documents rather
than only a deck.

Nine scheduled checks between 09-04 and 09-06 all said NOT IMPORTED, and every
one of them was right: the bodies were byte-identical to their pre-import
snapshots with updated_at unmoved the whole time. Whatever went wrong on the
first attempt never reached Shopify, and nothing was damaged while we waited.
The cause of that first failure is still unknown and now unknowable: the second
attempt used the same two files, unchanged, and worked.

## The verifier failed on a correct import, and that was my defect

It reported NOT LANDED on both pages with a 2 and 3 byte discrepancy. The pages
were fine. The check was wrong.

**Shopify reformats HTML on save.** Measured on this import: the stored bodies
came back longer than the sheets sent, and the ENTIRE delta was newlines,
`<li><strong>` becoming `<li>` newline `<strong>`. Every non-whitespace
character was identical and in the same order on both pages, and removing the
block returned the original exactly.

    non-whitespace chars   CSP expected 18906  actual 18906
                           CSA expected 19554  actual 19554

So byte equality is the correct assertion BEFORE an import, where it proves the
sheet cannot delete anything, and it is simply wrong afterwards. I used the same
function for both and shipped a check that cries wolf on success. A guard that
fails on the good case gets ignored on the bad one.

`verifyAfterImport` is the post-import assertion now: non-whitespace characters
identical and in order, the section present intact, the original recovered once
the block is removed. Whitespace between tags is the only thing tolerated,
because it is the only difference a reader cannot see.

## Loosening a guard is when it most needs proving

Seven cases per page, and they run in both directions rather than only the
comforting one:

    pass    an exact landing
    pass    newlines inserted the way Shopify actually does it
    pass    whitespace collapsed and re-expanded throughout
    fail    a list item deleted elsewhere, the /pages/join failure
    fail    a word altered with the length preserved
    fail    the section missing entirely
    fail    extra content smuggled in

36 cases total across both pages. Disabling the length assertion breaks 6 of
them, so the relaxation did not hollow it out.

## What is still open

- **Nobody knows why the first import did nothing.** Same files, same handles,
  same MERGE. If a Matrixify import ever silently no-ops again, the thing to
  capture is what it printed, because the sheets were provably fine both times.
- **The whitespace finding generalises.** Any future generator that asserts a
  live body byte for byte after an import will hit this. The rule is byte
  equality before, `verifyAfterImport` after.
