# The three pages the EK thinning gate runs against

Board 373. Captured live on 2026-09-21 through `lib/storefront-fetch.js`.

`smoke/csa-ek-thin.js` and `smoke/csa-ek-thin-mutation.js` run here rather than
against the storefront, because a gate in the offline suite may not go to the
network and a gate that reads the live page stops working the moment the import
lands: once the codes are gone, "171 visible citations" is false and the suite
that asserts it would be red forever. A frozen fixture keeps the rules under
test; `scripts/verify-csa-ek-live.js` is what watches the live pages.

**Three pages, because between them they carry every shape** the rewrite knows
about. Picking a page that lacks a shape is how a mutation goes inert, which is
a thing that happened while this was being written:

    2.1   trailing parentheticals, two prose decisions, an ld+json citation
    2.8   the What You'll Learn objective labels, and the only parenthetical on
          any page with real prose inside it after the code
    3.6   the unit 3 CED range heading, six prose decisions, graded MCQs whose
          stem and feedback are rewritten, and the Bug Hunt game's feedback
          string, which lives inside a plain <script> and is page text rather
          than metadata

The full 19-page run is what built the sheets in `imports/2026-09-21/`. It is
recorded in `docs/runs/2026-09-21-claude-code-csa-ek-codes.md` and rebuilt with
`npm run csaek:sheets`, which fetches all 38 pages fresh rather than reading
anything here.

These are a snapshot of somebody else's content. Do not edit them by hand; if a
page changes enough that the gate goes red, recapture it and read the diff.
