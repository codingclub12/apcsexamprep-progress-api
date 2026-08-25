# Cyber practice discoverability: hubs, spokes and the pacing pills

Board task #114. Branch `claude/juicemind-platform-setup-0xzvzb`.

## What was wrong

The four Device Security Analysis pages were linked from nowhere. Verified
against the live storefront rather than inferred:

```
ap-cybersecurity-practice-exam           -> 0 occurrences of any dsa handle
cyber-command-center                     -> 0
ap-cybersecurity-complete-course-guide   -> 0
ap-cybersecurity-frq-library-kiosk       -> 4, all self references
```

They were reachable only by typing the URL, and they did not link each other.

That is not four missing links. Cyber had a course spine (the guide, 24 lesson
pages) and individual artifacts, and nothing in between, so every practice page
ever built lands orphaned by default. Board item #73 counts 101 pages with no
inbound internal links: the same failure at scale.

## What changed

The fix is a layer, not a link list, and it is generated from the specs so it
cannot fall behind them.

- `lib/frq-spec.js` requires `blurb`, `focus`, `difficulty` and `page_handle`,
  and gained cross-set checks (no two sets may share a handle, an order or a
  focus). A set that cannot say how it differs from the other four is refused.
- `lib/practice-index.js` answers "what can a student practise in this course,
  and where does each piece live", course agnostic, reading no student data.
- `routes/practice.js` serves it at `/api/practice/:course`.
- `public/practice-hub.js` is a UMD, on purpose. The sheet generator requires it
  in Node to emit the hub cards as REAL HTML (a crawler must see them, the FRQ
  hub has to rank), and the browser loads the same file to re-render the same
  cards from the API on load, so a fifth set appears with no re-import. One
  implementation, so static and live cannot drift.
- `scripts/cyber-practice-hubs-csv.js` builds three pages: the FRQ hub, the labs
  hub and the practice umbrella. It refuses a sheet whose hub is missing any
  authored item.
- `scripts/frq-pages-csv.js` and `scripts/lab-pages-csv.js` append a generated
  sibling strip. Both refuse a page whose strip is missing a sibling, links
  itself, or misses the hub.
- `scripts/cyber-cc-pill-links.js` turns two of the three Command Center pacing
  pills into links.

## Decisions worth keeping

**The third pill stays plain text.** Unit tests are not on the Command Center
yet and have no student and answer-key split, so there is no honest destination.
A link that does not answer the click is the problem this whole thread started
with. It becomes a link when the unit test audit lands.

**The links do not look like pills.** The pill styling is what made them read as
buttons in the first place. Restoring it would leave a teacher unable to tell
the two live ones from the dead third. Two get link affordances, one stays muted
text, and the difference is visible before the click.

**ap-networking gets no strip.** It has six labs and no hub. A strip there would
link a 404. Its four page bodies were proved byte-identical to what is already
live, so this change asks for no pointless re-import.

**Labs reuse `seo_description` as card copy** rather than gaining a `blurb` field
that would say the same thing twice.

## Evidence

- 108 offline smoke suites pass, including the new `smoke:practicehub` (81
  checks) and `smoke:labs`, which went 122 -> 130 as the strip came under test.
- The staleness guard was proved to fire, not assumed: a set present in the index
  but absent from a built hub is refused by name.
- The pill patch guards were each proved to fire against a deliberately broken
  patch: stray edit elsewhere, dropped lock rule, added em-dash, removed hub
  link, third pill linked.
- The theme's FRQ auto-CTA injector gate was re-read off the live page and still
  carries both early returns (`frq` AND `csa`), so cyber handles are skipped.

## One bug worth naming

`ap-cybersecurity-practice` is a prefix of `ap-cybersecurity-practice-exam`, so
a bare `includes('/pages/ap-cybersecurity-practice')` said the umbrella linked
itself when it only linked the practice exam. Every handle match now closes the
quote. This is the fifth instance of the same pattern in this workstream:
a check that matched TEXT rather than a FACT.

## Still open

- The sheets are generated but NOT imported. Import order matters: hubs first,
  then the spokes, then the Command Center, or the pill links 404.
- The theme nav's CYBER column still points only at the practice exam and the
  exam format page. The FRQ hub should be first in that column. Theme repo,
  separate PR.
- Unit tests are still absent from the Command Center; the third pill waits on
  that audit.
- ap-networking wants the same treatment once it has a hub. Add it to
  `PRACTICE_HUBS` in `scripts/lab-pages-csv.js` and the strip turns on.
