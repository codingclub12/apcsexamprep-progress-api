# Next session brief: port the slide gate to AP Cybersecurity

Paste the block at the bottom into a fresh session. Everything above it is
context for a human deciding whether the plan is still right.

## Why this is a port and not a rebuild

`docs/runs/2026-08-25-claude-code-csp-slides-google-embeds.md` describes the AP
CSP build: 224 decks converted to Google Slides, gated behind entitlement,
rendered inline. Cyber reuses that pipeline almost intact.

## What was checked on 2026-08-25, so it does not get re-litigated

- **Cyber has no decks in Shopify.** The whole cyber file library there is two
  PDFs. So there is no `.pptx` download URL to serve and nothing to strip out
  of a page body. This is unlike CSP, where the leak was the starting problem.
- **Cyber decks are `.pptx` in Drive, NOT Google Slides.** Worth stating
  plainly because it was assumed otherwise: every Google Slides file on the
  account is an `AP-CSP_*` file created by the CSP conversion. Cyber still
  needs the conversion step.
- **Sharing and copying.** The CSP decks are `role: reader, type: anyone`, and
  the Apps Script never set `copyRequiresWriterPermission`, so File > Make a
  copy is available. Cyber inherits this.

## The decision that shapes the build

**Embed only. No Shopify upload.** A teacher who wants an editable deck uses
File > Make a copy in Google Slides.

The tradeoff was accepted knowingly: a teacher with no Google account, or in a
district that blocks personal Google sign-in, has no editable path at all,
where a CSP teacher can download the `.pptx` and open it in PowerPoint. It is
reversible later, because a deck may carry both a URL and an embed.

---

## THE PROMPT

```
Port the AP CSP Teacher Bundle slide gate to AP Cybersecurity.

READ FIRST, in this order:
  1. docs/runs/2026-08-25-claude-code-csp-slides-google-embeds.md
     The CSP build. Its "Learned" section will save you hours.
  2. docs/next-session-cyber-slide-gate.md   (this brief)
  3. config/csp-slide-manifest.js, config/csp-slide-embeds.js,
     scripts/csp-slide-embeds-from-csv.js, routes/slides.js,
     smoke/csp-slide-embeds.js
  4. The theme repo's CLAUDE.md before touching anything there.

THE SOURCE CONTENT
  Google Drive, folder 1nVxjKSNwZLUVayeEl8qAGW21IWI8Xl0j
  ("AP Cybersecurity Course"). Structure, read from the live folder:

    Unit_<N>_<Name>/Lesson_<U>.<L>_<Name>/Slide_Decks/
      Day<K>_Deck_STUDENT.pptx
      Day<K>_Deck_TEACHER.pptx

  Five units. Unit 1 has lessons 1.1 to 1.5. Enumerate the rest yourself and
  report the totals BEFORE converting anything.

DECISIONS ALREADY MADE. Do not relitigate.
  - Embed only. Cyber decks are NOT uploaded to Shopify. Teachers get an
    editable copy via File > Make a copy.
  - The gate, the entitlement model and the one-iframe viewer are unchanged.
  - A Slides file id is a credential. It is disclosed only by routes/slides.js
    to an entitled caller, never in page HTML. An entitled STUDENT must never
    receive a TEACHER deck.

FIX THIS FIRST, BEFORE ANYTHING ELSE
  assets/apcs-slides-gate.js, in renderDecks:

      var url = safeDeckUrl(d && d.url);
      if (!url) continue;

  Cyber decks have NO .pptx url, so every deck would be silently dropped and
  the panel would render empty with no error. Invert the guard to render a
  deck that has EITHER a url or an embed, and cover it with an assertion
  before you build anything on top. This is the single highest-risk item and
  it fails silently.

THREE OTHER DIFFERENCES FROM CSP
  - No track dimension. CSP has CB and DeepDive; cyber has only the
    STUDENT/TEACHER variant. The manifest's TRACKS map is currently global and
    will need to become per-course, or cyber needs a single implicit track.
  - Casing: STUDENT, not Student. The CSP regexes are exact-match and will
    find zero decks as written.
  - Folders are Lesson_1.5_..., not Topic_1.5_....

HOW TO DO THE CONVERSION
  Claude cannot do it. Both limits were tested, not assumed: the Drive
  connector's share_file cannot express the "anyone with the link" permission
  type, and uploading decks through tool calls costs roughly 25M tokens for
  CSP's volume. Adapt the Apps Script described in the CSP run note, hand it
  to Tanner to run in his own account, and read the resulting sheet back out
  of Drive. Have him run preview() first and confirm the deck count against
  your own enumeration before he runs start().

VERIFICATION, which is where the CSP build kept finding real bugs
  - Never trust a script's own summary. The CSP conversion reported
    "224 OK" in a log whose timestamps could not be true; Drive settled it in
    one call. Check Drive and the live endpoint, not the report.
  - Prove sharing took by fetching an embed URL with no credentials. An
    unshared file 404s regardless of what a sheet claims.
  - Prove content survived, not just structure. A deck that converts to blank
    slides passes every structural check.
  - SCREENSHOT IT, on a phone width and a desktop width. Two real defects in
    the CSP build passed every DOM assertion and were only visible in a
    picture: a Download link that wrapped away from its deck, and a viewer
    nobody could tell was tappable.
  - Verify a theme deploy against Shopify's CDN, never against GitHub.

DEPLOY TRAPS
  - The theme's connected branch is claude/site-linking-audit-yhufjk, and as
    of 2026-08-25 it was AHEAD of main. Check the direction before trusting
    CLAUDE.md's merge-to-main-then-fast-forward procedure; run as written then
    it would have rewound the live theme.
  - Railway lag on this API routinely looks like breakage. Before diagnosing,
    check whether deploy-drift was already failing before your merge and
    whether the merged code boots locally.

DONE MEANS
  Anonymous and unentitled callers get the free overview with zero
  docs.google.com anywhere in the response or the page HTML; an entitled
  teacher gets every deck; an entitled student gets student decks only; the
  offline suites and the theme browser assertions pass against the DEPLOYED
  minified asset; and there is a run note in docs/runs/.
```
