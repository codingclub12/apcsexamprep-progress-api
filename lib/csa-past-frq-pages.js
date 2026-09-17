'use strict';
// -----------------------------------------------------------------------------
//  THE 2026 AP CSA FRQ PAGES: THE RENDERER.
//
//  Builds one page per question in config/csa-frq-2026.json:
//
//      ap-csa-2026-frq-{N}-{slug}
//
//  which is the handle shape the archive has used since 2014. The 2004 to 2013
//  pages are the older `ap-csa-YYYY-frq-N` with no slug, and that difference is
//  left alone rather than reconciled: renaming a handle is on the NEVER_AUTO
//  list and those pages have been indexed for months.
//
//  ── WHY A GENERATOR AT ALL, WHEN 86 ARCHIVE PAGES HAVE NONE ────────────────
//  Because the 86 are the argument for one. Measured on 2026-09-17 against the
//  live bodies:
//
//      4 page formats     8KB, 12KB, 26KB and 62KB, by the year they were built
//     16 mangled titles   "Ap Csa 2022 Frq 1 Game", lowercased acronyms
//     11 stub solutions   Marine Biology and GridWorld questions whose entire
//                         solution is a comment saying the case study was
//                         withdrawn, under a title promising a Complete Solution
//      6 contradictions   a Curriculum Alignment naming one unit beside a Study
//                         This Topic link naming a different one
//      1 invalid JSON-LD  2016 FRQ 3
//
//  None of that is carelessness. It is what hand-authoring a structurally
//  identical page set produces, which is why the house rule is canonical data
//  plus a generator plus a validator plus a sheet, and why four pages is
//  already over the line.
//
//  ── WHAT CHANGED FOR 2026, AND WHY IT IS NOT A DETAIL ──────────────────────
//  Every free-response question from 2004 to 2025 was worth 9 points and the
//  section was 36. The 2026 questions are worth 7, 7, 5 and 6, the section is
//  25, and only question 1 has parts. Section I moved to 42 questions at 55
//  percent and Section II to 45 percent.
//
//  So the archive's "Points: 9" and its 22-minute-per-question framing are
//  correct about their own year and wrong about this one. These pages print
//  the real per-question total, and the pacing note says out loud that 22
//  minutes is a quarter of the section rather than a College Board rule, since
//  the questions are no longer worth the same.
//
//  ── THE SOLUTION TEXT IS COLLEGE BOARD'S, AND IT IS RUN, NOT READ ──────────
//  scripts/verify-csa-2026-frq.js compiles every model and alternate solution
//  in the JSON and runs it against the examples the question itself states. It
//  found the thing worth finding: the scoring guidelines extract carried an en
//  dash where `j - 1` belongs, which would have shipped as an answer key.
//
//  HOUSE HAZARDS
//  - Scoped under a unique wrapper id with an all:initial reset, per the theme
//    CONVENTIONS.md. Every rule carries !important because the theme wins
//    otherwise, and -webkit-text-fill-color is set wherever color is.
//  - No HTML entities inside script elements. The JSON-LD escapes `<` as a
//    unicode escape instead, which keeps the JSON valid and cannot close the
//    script early.
//  - Pure ASCII, no em-dashes. Asserted by the suite rather than remembered.
//
//  Zero PII: author content and published College Board material only.
// -----------------------------------------------------------------------------

const path = require('path');
const spec = require(path.join(__dirname, '..', 'config', 'csa-frq-2026.json'));

const YEAR = spec.year;
const EXAM = spec.exam;

//  Shopify renders the body as-is, so anything author-supplied that lands in
//  markup goes through here first.
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

//  JSON-LD must not carry HTML entities: an entity inside a script element is
//  invalid JSON. `<` becomes a unicode escape, which JSON.parse accepts and a
//  parser cannot mistake for the end of the element.
function jsonld(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

const handleFor = (q) => 'ap-csa-' + YEAR + '-frq-' + q.number + '-' + q.slug;
const titleFor = (q) => YEAR + ' AP CSA FRQ ' + q.number + ': ' + q.className + ' Solution + Rubric';
const idFor = (q) => 'frq' + YEAR + 'q' + q.number;

const FRQ_PDF = spec.sources.find((s) => s.id === 'ap26-frq-pdf').url;
const SG_PDF = spec.sources.find((s) => s.id === 'ap26-sg-pdf').url;


const PAGE_CSS = `/* ===== SHOPIFY TITLE RESET ===== */
.page-title,.article__title,.page__title,.template-page h1:first-of-type{display:none!important;}

/* ===== WRAPPER RESET ===== */
#__ID__{
  all:initial!important;
  display:block!important;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
  color:#1f2937!important;
  background:#ffffff!important;
  line-height:1.65!important;
  max-width:900px!important;
  margin:0 auto!important;
  padding:24px 16px 60px!important;
  -webkit-font-smoothing:antialiased!important;
  -webkit-text-fill-color:#1f2937!important;
}
#__ID__ *{box-sizing:border-box!important;}

/* ===== TYPOGRAPHY ===== */
#__ID__ h1{
  font-family:inherit!important;
  font-size:1.85em!important;
  font-weight:700!important;
  color:#1e3a8a!important;
  -webkit-text-fill-color:#1e3a8a!important;
  margin:0 0 8px!important;
  border-bottom:3px solid #3b82f6!important;
  padding-bottom:14px!important;
  line-height:1.25!important;
}
/* The visible "page title" - we use H2 to avoid duplicating Shopify's auto-H1,
   but we style it like an H1 visually for users. */
#__ID__ h2.frq-pagetitle{
  font-family:inherit!important;
  font-size:1.85em!important;
  font-weight:700!important;
  color:#1e3a8a!important;
  -webkit-text-fill-color:#1e3a8a!important;
  margin:0 0 8px!important;
  padding:0 0 14px!important;
  border-left:0!important;
  border-bottom:3px solid #3b82f6!important;
  padding-left:0!important;
  line-height:1.25!important;
}
#__ID__ .frq-lede{
  font-size:1.05em!important;
  color:#374151!important;
  -webkit-text-fill-color:#374151!important;
  margin:0 0 14px!important;
  line-height:1.6!important;
}
#__ID__ .frq-byline{
  display:flex!important;
  flex-wrap:wrap!important;
  gap:8px 16px!important;
  align-items:center!important;
  margin:0 0 18px!important;
  padding:10px 14px!important;
  background:#f9fafb!important;
  border-left:3px solid #cbd5e1!important;
  border-radius:0 6px 6px 0!important;
  font-size:0.88em!important;
  color:#4b5563!important;
  -webkit-text-fill-color:#4b5563!important;
}
#__ID__ .frq-byline a{
  color:#2563eb!important;
  -webkit-text-fill-color:#2563eb!important;
  text-decoration:none!important;
  font-weight:600!important;
}
#__ID__ .frq-byline a:hover{text-decoration:underline!important;}
#__ID__ .frq-byline-author{font-weight:600!important;color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;}
#__ID__ .frq-byline-sep{color:#9ca3af!important;-webkit-text-fill-color:#9ca3af!important;}
#__ID__ .frq-byline-date{color:#6b7280!important;-webkit-text-fill-color:#6b7280!important;font-style:italic!important;}

/* 2026 exam structure callout - COLLAPSIBLE (closed by default for mobile UX).
   Uses native <details>/<summary>. Closed strip ~52px; opens to show full content.
   Tightly scoped to prevent Shopify theme overrides. */
#__ID__ details.frq-2026-callout{
  background:#fffbeb!important;
  border:1px solid #fcd34d!important;
  border-left:5px solid #d97706!important;
  border-radius:8px!important;
  margin:0 0 16px!important;
  padding:0!important;
  font-size:0.94em!important;
  line-height:1.55!important;
  color:#78350f!important;
  -webkit-text-fill-color:#78350f!important;
  overflow:hidden!important;
}
#__ID__ details.frq-2026-callout summary.frq-2026-callout-summary{
  display:flex!important;
  align-items:center!important;
  gap:10px!important;
  padding:11px 14px!important;
  cursor:pointer!important;
  list-style:none!important;
  user-select:none!important;
  -webkit-user-select:none!important;
  -webkit-tap-highlight-color:rgba(217,119,6,0.15)!important;
  outline:none!important;
  font-size:0.93em!important;
  color:#78350f!important;
  -webkit-text-fill-color:#78350f!important;
}
/* Hide the default disclosure triangle in all browsers */
#__ID__ details.frq-2026-callout summary.frq-2026-callout-summary::-webkit-details-marker{display:none!important;}
#__ID__ details.frq-2026-callout summary.frq-2026-callout-summary::marker{display:none!important;content:""!important;}
#__ID__ details.frq-2026-callout summary.frq-2026-callout-summary:hover{background:#fef3c7!important;}
#__ID__ details.frq-2026-callout summary.frq-2026-callout-summary:focus-visible{box-shadow:inset 0 0 0 2px #d97706!important;}
#__ID__ .frq-2026-callout-icon{
  font-size:1.1em!important;
  color:#d97706!important;
  -webkit-text-fill-color:#d97706!important;
  flex-shrink:0!important;
}
#__ID__ .frq-2026-callout-summary-text{
  flex:1 1 auto!important;
  color:#78350f!important;
  -webkit-text-fill-color:#78350f!important;
}
#__ID__ .frq-2026-callout-summary-text strong{color:#78350f!important;-webkit-text-fill-color:#78350f!important;}
#__ID__ .frq-2026-callout-chevron{
  font-size:1em!important;
  color:#92400e!important;
  -webkit-text-fill-color:#92400e!important;
  flex-shrink:0!important;
  transition:transform 0.2s ease!important;
  display:inline-block!important;
}
#__ID__ details.frq-2026-callout[open] .frq-2026-callout-chevron{
  transform:rotate(180deg)!important;
}
#__ID__ .frq-2026-callout-body{
  padding:4px 16px 14px!important;
  border-top:1px dashed #fcd34d!important;
  margin-top:0!important;
}
#__ID__ .frq-2026-callout-body p{
  margin:10px 0 8px!important;
  color:#78350f!important;
  -webkit-text-fill-color:#78350f!important;
}
#__ID__ .frq-2026-callout-body p:last-child{margin-bottom:0!important;}
#__ID__ .frq-2026-callout-body strong{color:#78350f!important;-webkit-text-fill-color:#78350f!important;}
#__ID__ .frq-2026-callout-body a{
  color:#0369a1!important;
  -webkit-text-fill-color:#0369a1!important;
  text-decoration:underline!important;
  font-weight:600!important;
}
#__ID__ .frq-2026-callout-body a:hover{color:#0284c7!important;-webkit-text-fill-color:#0284c7!important;}
#__ID__ .frq-2026-callout-body a:visited{color:#0369a1!important;-webkit-text-fill-color:#0369a1!important;}
#__ID__ .frq-2026-callout-table{
  margin:8px 0!important;
  font-size:0.93em!important;
}
#__ID__ .frq-2026-callout-table p{margin:4px 0!important;}
#__ID__ .frq-2026-callout-table strong{display:inline-block!important;min-width:70px!important;}
#__ID__ h2{
  font-family:inherit!important;
  font-size:1.4em!important;
  font-weight:700!important;
  color:#1e40af!important;
  -webkit-text-fill-color:#1e40af!important;
  margin:32px 0 14px!important;
  padding-left:12px!important;
  border-left:4px solid #60a5fa!important;
  line-height:1.3!important;
}
#__ID__ h3{
  font-family:inherit!important;
  font-size:1.15em!important;
  font-weight:700!important;
  color:#1e40af!important;
  -webkit-text-fill-color:#1e40af!important;
  margin:24px 0 10px!important;
}
#__ID__ h4{
  font-family:inherit!important;
  font-size:1.02em!important;
  font-weight:700!important;
  color:#1e3a8a!important;
  -webkit-text-fill-color:#1e3a8a!important;
  margin:18px 0 8px!important;
}
#__ID__ p{
  font-family:inherit!important;
  font-size:1em!important;
  margin:0 0 14px!important;
  color:#1f2937!important;
  -webkit-text-fill-color:#1f2937!important;
}
#__ID__ strong{font-weight:700!important;color:inherit!important;-webkit-text-fill-color:inherit!important;}
#__ID__ code{
  font-family:Consolas,Monaco,'Courier New',monospace!important;
  background:#f1f5f9!important;
  padding:2px 6px!important;
  border-radius:4px!important;
  font-size:0.92em!important;
  color:#be185d!important;
  -webkit-text-fill-color:#be185d!important;
}
#__ID__ pre{
  background:#1e293b!important;
  color:#e2e8f0!important;
  -webkit-text-fill-color:#e2e8f0!important;
  padding:18px!important;
  border-radius:8px!important;
  overflow-x:auto!important;
  font-family:Consolas,Monaco,'Courier New',monospace!important;
  font-size:13px!important;
  line-height:1.6!important;
  white-space:pre!important;
  margin:14px 0!important;
}
#__ID__ pre code{
  background:transparent!important;
  padding:0!important;
  color:#e2e8f0!important;
  -webkit-text-fill-color:#e2e8f0!important;
  font-size:13px!important;
}
#__ID__ ul,#__ID__ ol{margin:0 0 14px 24px!important;padding:0!important;}
#__ID__ li{margin:6px 0!important;color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;}
#__ID__ a{color:#2563eb!important;-webkit-text-fill-color:#2563eb!important;text-decoration:underline!important;}
#__ID__ a:hover{color:#1d4ed8!important;-webkit-text-fill-color:#1d4ed8!important;}

/* ===== META BAR ===== */
#__ID__ .frq-meta{
  background:#eff6ff!important;
  border:1px solid #bfdbfe!important;
  border-radius:10px!important;
  padding:14px 18px!important;
  margin:0 0 22px!important;
  display:flex!important;
  flex-wrap:wrap!important;
  gap:18px!important;
  font-size:0.92em!important;
}
#__ID__ .frq-meta span{color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;}
#__ID__ .frq-meta strong{color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;}

/* ===== TIMER ===== */
#__ID__ .frq-timer-bar{
  background:#fef3c7!important;
  border:1px solid #fcd34d!important;
  border-radius:10px!important;
  padding:12px 16px!important;
  margin:0 0 22px!important;
  display:flex!important;
  flex-wrap:wrap!important;
  gap:10px!important;
  align-items:center!important;
  justify-content:space-between!important;
}
#__ID__ .frq-timer-bar .frq-timer-label{font-weight:600!important;color:#92400e!important;-webkit-text-fill-color:#92400e!important;font-size:0.92em!important;}
#__ID__ .frq-timer-bar .frq-timer-display{
  font-family:Consolas,Monaco,'Courier New',monospace!important;
  font-size:1.4em!important;
  font-weight:700!important;
  color:#78350f!important;
  -webkit-text-fill-color:#78350f!important;
  background:#ffffff!important;
  padding:4px 14px!important;
  border-radius:6px!important;
  border:1px solid #fcd34d!important;
}

/* ===== BUTTONS (white text locked in) ===== */
#__ID__ button,#__ID__ .btn,#__ID__ a.btn{
  font-family:inherit!important;
  font-size:0.93em!important;
  font-weight:600!important;
  padding:9px 18px!important;
  border-radius:6px!important;
  border:0!important;
  cursor:pointer!important;
  text-decoration:none!important;
  display:inline-block!important;
  line-height:1.3!important;
  transition:background-color 0.15s,opacity 0.15s!important;
}
#__ID__ .btn,#__ID__ a.btn,#__ID__ button.btn{
  background:#2563eb!important;
  color:#ffffff!important;
  -webkit-text-fill-color:#ffffff!important;
}
#__ID__ .btn:link,#__ID__ .btn:visited,
#__ID__ a.btn:link,#__ID__ a.btn:visited{
  color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;
}
#__ID__ .btn:hover,#__ID__ a.btn:hover,#__ID__ button.btn:hover{
  background:#1d4ed8!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;
}
#__ID__ .btn:active,#__ID__ a.btn:active{
  background:#1e40af!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;
}
#__ID__ .btn-green{background:#15803d!important;}
#__ID__ .btn-green:link,#__ID__ .btn-green:visited,
#__ID__ .btn-green:hover{background:#166534!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;}
#__ID__ .btn-amber{background:#d97706!important;}
#__ID__ .btn-amber:link,#__ID__ .btn-amber:visited,
#__ID__ .btn-amber:hover{background:#b45309!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;}
#__ID__ .btn-outline{
  background:#ffffff!important;
  color:#2563eb!important;
  -webkit-text-fill-color:#2563eb!important;
  border:2px solid #2563eb!important;
  padding:7px 16px!important;
}
#__ID__ .btn-outline:link,#__ID__ .btn-outline:visited{
  color:#2563eb!important;-webkit-text-fill-color:#2563eb!important;
}
#__ID__ .btn-outline:hover{
  background:#eff6ff!important;color:#1d4ed8!important;-webkit-text-fill-color:#1d4ed8!important;
}
#__ID__ .btn-sm{font-size:0.85em!important;padding:7px 14px!important;}

/* ===== PDF VIEWER + JUMP-BACK NAV ===== */
#__ID__ .frq-pdf-wrap{
  margin:14px 0 22px!important;
  border:1px solid #cbd5e1!important;
  border-radius:10px!important;
  overflow:hidden!important;
  background:#f8fafc!important;
  position:relative!important;
}
#__ID__ .frq-pdf-wrap iframe{
  width:100%!important;
  height:800px!important;
  border:0!important;
  display:block!important;
  transition:height 0.25s ease-out!important;
}
#__ID__ .frq-pdf-wrap.expanded iframe{
  height:1400px!important;
}
#__ID__ .frq-pdf-expand-btn{
  position:absolute!important;
  top:10px!important;
  right:10px!important;
  background:rgba(30,41,59,0.92)!important;
  color:#ffffff!important;
  -webkit-text-fill-color:#ffffff!important;
  border:1px solid rgba(255,255,255,0.25)!important;
  padding:6px 12px!important;
  border-radius:6px!important;
  font-family:inherit!important;
  font-size:0.82em!important;
  font-weight:600!important;
  cursor:pointer!important;
  z-index:5!important;
  line-height:1.2!important;
  transition:background-color 0.15s!important;
}
#__ID__ .frq-pdf-expand-btn:hover{
  background:rgba(15,23,42,0.98)!important;
}
#__ID__ .frq-pdf-fallback{
  display:none;
  padding:18px!important;
  text-align:center!important;
}

/* ===== PROMPT QUICK-RECAP (above editor) ===== */
/* Exam-condition framing line above editor - reinforces the "no hints" pedagogy
   by making the choice explicit and explaining it matches Bluebook */
#__ID__ .frq-exam-condition{
  background:#fef3c7!important;
  border-left:4px solid #d97706!important;
  border-radius:0 6px 6px 0!important;
  padding:11px 16px!important;
  margin:0 0 14px!important;
  font-size:0.93em!important;
  line-height:1.55!important;
  color:#78350f!important;
  -webkit-text-fill-color:#78350f!important;
}
#__ID__ .frq-exam-condition strong{color:#78350f!important;-webkit-text-fill-color:#78350f!important;}

/* In-Reveal recap (formerly above-editor) - serves as a self-check after attempt */
#__ID__ .frq-recap-incollapsed{
  background:#f0f9ff!important;
  border:1px solid #7dd3fc!important;
  border-left:4px solid #0284c7!important;
  border-radius:8px!important;
  padding:14px 18px!important;
  margin:0 0 18px!important;
  font-size:0.95em!important;
}
#__ID__ .frq-recap-incollapsed p{margin:0 0 8px!important;color:#0c4a6e!important;-webkit-text-fill-color:#0c4a6e!important;}
#__ID__ .frq-recap-incollapsed p:last-child{margin-bottom:0!important;}
#__ID__ .frq-recap-incollapsed ul{margin:6px 0 0 22px!important;}
#__ID__ .frq-recap-incollapsed li{color:#0c4a6e!important;-webkit-text-fill-color:#0c4a6e!important;font-size:0.95em!important;margin:6px 0!important;}
#__ID__ .frq-recap-incollapsed strong{color:#075985!important;-webkit-text-fill-color:#075985!important;}

/* ===== EDITOR ===== */
#__ID__ .frq-editor{position:relative!important;margin:14px 0 12px!important;}
#__ID__ .frq-editor-toolbar{
  display:flex!important;
  justify-content:space-between!important;
  align-items:center!important;
  flex-wrap:wrap!important;
  gap:8px!important;
  background:#334155!important;
  color:#e2e8f0!important;
  -webkit-text-fill-color:#e2e8f0!important;
  padding:8px 14px!important;
  border-radius:8px 8px 0 0!important;
  font-size:0.82em!important;
}
#__ID__ .frq-editor-toolbar .frq-editor-label{
  font-family:Consolas,Monaco,'Courier New',monospace!important;
  color:#cbd5e1!important;
  -webkit-text-fill-color:#cbd5e1!important;
}
#__ID__ .frq-editor-toolbar .frq-editor-tip{
  color:#94a3b8!important;
  -webkit-text-fill-color:#94a3b8!important;
  font-size:0.92em!important;
}
#__ID__ .frq-editor textarea{
  width:100%!important;
  min-height:380px!important;
  font-family:Consolas,Monaco,'Courier New',monospace!important;
  font-size:14px!important;
  line-height:1.6!important;
  padding:16px 16px 22px 16px!important;
  border:2px solid #334155!important;
  border-top:0!important;
  border-radius:0 0 8px 8px!important;
  background:#1e293b!important;
  color:#e2e8f0!important;
  -webkit-text-fill-color:#e2e8f0!important;
  resize:vertical!important;
  tab-size:4!important;
  -moz-tab-size:4!important;
  white-space:pre!important;
  overflow-wrap:normal!important;
  overflow-x:auto!important;
  display:block!important;
}
#__ID__ .frq-editor textarea:focus{
  border-color:#3b82f6!important;
  outline:none!important;
  box-shadow:0 0 0 3px rgba(59,130,246,0.2)!important;
}
#__ID__ .frq-editor textarea::placeholder{color:#64748b!important;}

/* Visible resize hint at bottom of editor - clearer than the native corner triangle */
#__ID__ .frq-resize-hint{
  display:flex!important;
  justify-content:flex-end!important;
  align-items:center!important;
  gap:6px!important;
  margin:-6px 0 0 0!important;
  padding:0 14px 4px 0!important;
  font-size:0.78em!important;
  color:#64748b!important;
  -webkit-text-fill-color:#64748b!important;
  pointer-events:none!important;
}

#__ID__ .frq-editor-actions{
  display:flex!important;
  gap:10px!important;
  flex-wrap:wrap!important;
  margin:12px 0 18px!important;
}

/* ===== SELF-GRADE CTA (prominent, honest framing) ===== */
#__ID__ .frq-self-grade-cta{
  background:#f0fdf4!important;
  border:2px solid #86efac!important;
  border-left:5px solid #15803d!important;
  border-radius:10px!important;
  padding:18px 20px!important;
  margin:18px 0 22px!important;
}
#__ID__ .frq-self-grade-note{
  margin:0 0 14px!important;
  color:#14532d!important;
  -webkit-text-fill-color:#14532d!important;
  font-size:0.96em!important;
  line-height:1.55!important;
}
#__ID__ .frq-self-grade-note strong{
  color:#14532d!important;
  -webkit-text-fill-color:#14532d!important;
}
#__ID__ .frq-reveal-btn{
  background:#15803d!important;
  color:#ffffff!important;
  -webkit-text-fill-color:#ffffff!important;
  border:0!important;
  border-radius:8px!important;
  padding:14px 24px!important;
  font-family:inherit!important;
  font-size:1.02em!important;
  font-weight:700!important;
  cursor:pointer!important;
  display:block!important;
  width:100%!important;
  text-align:center!important;
  letter-spacing:0.2px!important;
  transition:background-color 0.15s,transform 0.05s!important;
  line-height:1.3!important;
}
#__ID__ .frq-reveal-btn:hover{
  background:#166534!important;
  color:#ffffff!important;
  -webkit-text-fill-color:#ffffff!important;
}
#__ID__ .frq-reveal-btn:active{
  background:#14532d!important;
  transform:translateY(1px)!important;
}

/* ===== JUMP NAV BUTTONS (PDF <-> Editor) ===== */
#__ID__ .frq-jump-row{
  display:flex!important;
  gap:10px!important;
  flex-wrap:wrap!important;
  justify-content:center!important;
  margin:18px 0!important;
  padding:12px!important;
  background:#f1f5f9!important;
  border:1px dashed #94a3b8!important;
  border-radius:8px!important;
}
#__ID__ .frq-jump-row .btn{font-size:0.88em!important;padding:8px 14px!important;}

/* ===== COLLAPSIBLES (Solution / Rubric) ===== */
#__ID__ .frq-collapsible{
  background:#f8fafc!important;
  color:#1e3a8a!important;
  -webkit-text-fill-color:#1e3a8a!important;
  border:2px solid #cbd5e1!important;
  border-radius:8px!important;
  padding:11px 16px!important;
  font-weight:600!important;
  font-size:0.95em!important;
  cursor:pointer!important;
  width:100%!important;
  text-align:left!important;
  display:block!important;
  margin:8px 0 0!important;
}
#__ID__ .frq-collapsible:hover{background:#eff6ff!important;border-color:#3b82f6!important;}
#__ID__ .frq-collapsible-content{
  display:none;
  padding:16px 18px!important;
  border:2px solid #cbd5e1!important;
  border-top:0!important;
  border-radius:0 0 8px 8px!important;
  margin-top:-8px!important;
  background:#ffffff!important;
}
#__ID__ .frq-collapsible-content.open{display:block!important;}

/* ===== RUBRIC TABLE ===== */
#__ID__ table{width:100%!important;border-collapse:collapse!important;margin:12px 0!important;font-size:0.93em!important;}
#__ID__ th,#__ID__ td{padding:9px 12px!important;border:1px solid #e5e7eb!important;text-align:left!important;vertical-align:top!important;color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;}
#__ID__ th{background:#f3f4f6!important;font-weight:700!important;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;}
#__ID__ td:first-child{width:60px!important;text-align:center!important;background:#eff6ff!important;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;font-weight:700!important;}

/* ===== INSIGHT BOXES ===== */
#__ID__ .frq-tip,#__ID__ .frq-mistake,#__ID__ .frq-key{
  padding:14px 18px!important;
  border-radius:8px!important;
  margin:16px 0!important;
  border-left:4px solid!important;
}
#__ID__ .frq-tip{background:#f0fdf4!important;border-left-color:#16a34a!important;}
#__ID__ .frq-tip strong{color:#15803d!important;-webkit-text-fill-color:#15803d!important;}
#__ID__ .frq-mistake{background:#fef2f2!important;border-left-color:#dc2626!important;}
#__ID__ .frq-mistake strong{color:#b91c1c!important;-webkit-text-fill-color:#b91c1c!important;}
#__ID__ .frq-key{background:#eff6ff!important;border-left-color:#2563eb!important;}
#__ID__ .frq-key strong{color:#1d4ed8!important;-webkit-text-fill-color:#1d4ed8!important;}

/* ===== FAQ ===== */
#__ID__ .frq-faq{margin:30px 0!important;}
#__ID__ .faq-q{font-weight:700!important;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;margin:18px 0 6px!important;font-size:1.02em!important;}
#__ID__ .faq-a{margin:0 0 10px!important;color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;}

/* ===== NAV ===== */
#__ID__ .frq-nav{
  display:flex!important;
  justify-content:space-between!important;
  flex-wrap:wrap!important;
  gap:10px!important;
  margin:32px 0 18px!important;
  padding-top:22px!important;
  border-top:1px solid #e5e7eb!important;
}
#__ID__ .frq-footer-links{
  text-align:center!important;
  font-size:0.9em!important;
  color:#6b7280!important;
  -webkit-text-fill-color:#6b7280!important;
  margin:14px 0 0!important;
}

/* ===== MOBILE ===== */
@media (max-width:640px){
  #__ID__{padding:16px 12px 40px!important;}
  #__ID__ h1,#__ID__ h2.frq-pagetitle{font-size:1.4em!important;}
  #__ID__ h2{font-size:1.18em!important;}
  #__ID__ .frq-pdf-wrap iframe{height:500px!important;}
  #__ID__ .frq-pdf-wrap.expanded iframe{height:800px!important;}
  #__ID__ .frq-editor textarea{font-size:13px!important;min-height:320px!important;}
  #__ID__ .frq-meta{gap:10px!important;font-size:0.86em!important;}
  #__ID__ .frq-nav .btn{width:100%!important;text-align:center!important;}
}`;

const PAGE_JS = `(function(){
  /* =========================================================
     EDITOR & TIMER for __ID__
     v2 fixes:
       - Single source of truth for Enter (beforeinput only)
       - No more double-indent (suppresses default Enter behavior cleanly)
       - Cleaner bracket-pair handling (only insert pair when next char is empty/whitespace/closer)
       - "Smart" backspace removes empty bracket pair
  ========================================================= */
  var W='__ID__';
  var IND='    '; // 4 spaces

  /* ---------- TIMER ---------- */
  var S=__MINUTES__*60, I=null, R=false;
  function D(){
    var m=Math.floor(S/60), s=S%60;
    var e=document.getElementById(W+'-timer');
    if(e) e.textContent=m+':'+(s<10?'0':'')+s;
  }
  window[W+'Start']=function(){
    if(R) return; R=true;
    I=setInterval(function(){
      if(S>0){S--; D();}
      else{clearInterval(I); R=false;}
    },1000);
  };
  window[W+'Pause']=function(){clearInterval(I); R=false;};
  window[W+'Reset']=function(){clearInterval(I); R=false; S=__MINUTES__*60; D();};

  /* ---------- EDITOR ---------- */
  function getIndent(text, pos){
    var lineStart = text.lastIndexOf('\n', pos-1) + 1;
    var line = text.substring(lineStart, pos);
    var m = line.match(/^([ \t]*)/);
    return m ? m[1] : '';
  }

  function initEditor(el){
    if(!el) return;

    // Pairs: opener -> closer
    var PAIRS = {'(':')','[':']','{':'}','"':'"',"'":"'"};
    var CLOSERS = {')':true, ']':true, '}':true};

    /* Bracket-pair + Tab handler (keydown, NOT Enter) */
    el.addEventListener('keydown', function(e){
      var ta = this;
      var s = ta.selectionStart;
      var end = ta.selectionEnd;
      var v = ta.value;
      var charAfter = v.charAt(s);
      var charBefore = v.charAt(s-1);

      // ----- TAB / SHIFT-TAB -----
      if(e.key === 'Tab'){
        e.preventDefault();
        if(e.shiftKey){
          // Outdent current line
          var lineStart = v.lastIndexOf('\n', s-1) + 1;
          var lineText = v.substring(lineStart);
          if(lineText.substring(0, IND.length) === IND){
            ta.value = v.substring(0, lineStart) + lineText.substring(IND.length);
            var newPos = Math.max(s - IND.length, lineStart);
            ta.selectionStart = ta.selectionEnd = newPos;
          }
        } else {
          // Insert 4 spaces
          ta.value = v.substring(0, s) + IND + v.substring(end);
          ta.selectionStart = ta.selectionEnd = s + IND.length;
        }
        return;
      }

      // ----- BRACKET-PAIR INSERTION -----
      if(PAIRS[e.key]){
        var closer = PAIRS[e.key];
        var isQuote = (e.key === '"' || e.key === "'");

        // If quote and next char is the same quote, just step over it
        if(isQuote && charAfter === e.key){
          e.preventDefault();
          ta.selectionStart = ta.selectionEnd = s + 1;
          return;
        }

        // For quotes, count odd vs even occurrences in current line - if odd, just type normally
        if(isQuote){
          var ls = v.lastIndexOf('\n', s-1) + 1;
          var lineToCursor = v.substring(ls, s);
          var ct = 0;
          for(var i=0; i<lineToCursor.length; i++) if(lineToCursor.charAt(i) === e.key) ct++;
          if(ct % 2 === 1) return; // already inside a string, don't pair
        }

        // Only auto-pair if next char is end-of-line, whitespace, or a closer
        // This fixes the "wonky () behavior" - don't pair if next char is alphanumeric
        var nextOK = (charAfter === '' || charAfter === '\n' || /\s/.test(charAfter) || CLOSERS[charAfter] || charAfter === ',' || charAfter === ';');
        if(!nextOK) return; // let it type normally

        // Auto-pair: insert opener + closer, place cursor between
        e.preventDefault();
        ta.value = v.substring(0, s) + e.key + closer + v.substring(end);
        ta.selectionStart = ta.selectionEnd = s + 1;
        return;
      }

      // ----- STEP-OVER existing closer -----
      if(CLOSERS[e.key]){
        if(charAfter === e.key){
          e.preventDefault();
          ta.selectionStart = ta.selectionEnd = s + 1;
          return;
        }
      }

      // ----- SMART BACKSPACE (removes empty bracket pair) -----
      if(e.key === 'Backspace' && s === end && s > 0){
        var bc = charBefore;
        var ac = charAfter;
        if(PAIRS[bc] && PAIRS[bc] === ac){
          e.preventDefault();
          ta.value = v.substring(0, s-1) + v.substring(s+1);
          ta.selectionStart = ta.selectionEnd = s - 1;
          return;
        }
      }
    });

    /* SINGLE Enter handler (beforeinput is the only source of truth)
       v1 had a double-indent bug because keydown didn't fire Enter
       and beforeinput was ALSO running while default Enter inserted a
       newline too. We now preventDefault and write the newline ourselves.
    */
    el.addEventListener('beforeinput', function(e){
      if(e.inputType !== 'insertLineBreak' && e.inputType !== 'insertParagraph') return;
      e.preventDefault();

      var ta = this;
      var v = ta.value;
      var s = ta.selectionStart;
      var end = ta.selectionEnd;
      var indent = getIndent(v, s);
      var charBefore = v.charAt(s-1);
      var charAfter = v.charAt(s);

      // Open brace on left, close brace on right -> expand block:
      //    {<cursor>}  becomes  {\n    <cursor>\n}
      if(charBefore === '{' && charAfter === '}'){
        var insert = '\n' + indent + IND + '\n' + indent;
        ta.value = v.substring(0, s) + insert + v.substring(end);
        ta.selectionStart = ta.selectionEnd = s + 1 + indent.length + IND.length;
        return;
      }

      // Open brace on left -> indent one level deeper
      if(charBefore === '{'){
        var insertB = '\n' + indent + IND;
        ta.value = v.substring(0, s) + insertB + v.substring(end);
        ta.selectionStart = ta.selectionEnd = s + insertB.length;
        return;
      }

      // Default: keep current indentation
      var insertC = '\n' + indent;
      ta.value = v.substring(0, s) + insertC + v.substring(end);
      ta.selectionStart = ta.selectionEnd = s + insertC.length;
    });
  }

  initEditor(document.getElementById(W + '-ea'));
  // Dynamically init Part B/C editors only if they exist in the DOM
  var eb = document.getElementById(W + '-eb');
  if (eb) initEditor(eb);
  var ec = document.getElementById(W + '-ec');
  if (ec) initEditor(ec);

  /* ---------- PDF EXPAND TOGGLE ---------- */
  var pdfWrap = document.getElementById(W + '-pdf-wrap');
  var pdfExpandBtn = document.getElementById(W + '-pdf-expand');
  if(pdfWrap && pdfExpandBtn){
    var EXPAND_LABEL = 'Expand ' + String.fromCharCode(9662);    // down triangle
    var COLLAPSE_LABEL = 'Collapse ' + String.fromCharCode(9652); // up triangle
    pdfExpandBtn.addEventListener('click', function(){
      if(pdfWrap.classList.contains('expanded')){
        pdfWrap.classList.remove('expanded');
        pdfExpandBtn.textContent = EXPAND_LABEL;
      } else {
        pdfWrap.classList.add('expanded');
        pdfExpandBtn.textContent = COLLAPSE_LABEL;
      }
    });
  }

  /* ---------- MOBILE PDF FALLBACK ---------- */
  var isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
  if(isMobile){
    var ifr = document.getElementById(W + '-pdf-iframe');
    var fb = document.getElementById(W + '-pdf-fallback');
    if(ifr && fb){
      ifr.style.display = 'none';
      fb.style.display = 'block';
      // Hide the expand button on mobile (PDF is in fallback mode)
      if(pdfExpandBtn) pdfExpandBtn.style.display = 'none';
    }
  }
})();`;


//  The template CSS above is the archive's, unchanged. These are the few
//  elements these pages add: a per-part point badge, the collapsed alternate
//  solutions, the two decision-rule lines inside a rubric cell, and the row of
//  the point table that is this page's own question. The wrapper carries
//  all:initial, so anything without a rule here renders as bare text.
const EXTRA_CSS = `
#__ID__ .frq-part-pts{
  display:inline-block!important; margin-left:8px!important;
  padding:2px 8px!important; border-radius:999px!important;
  background:#eef2ff!important; border:1px solid #c7d2fe!important;
  font-size:0.72em!important; font-weight:700!important; letter-spacing:0.02em!important;
  color:#3730a3!important; -webkit-text-fill-color:#3730a3!important;
  vertical-align:middle!important;
}
#__ID__ .muted{
  color:#6b7280!important; -webkit-text-fill-color:#6b7280!important;
  font-size:0.92em!important;
}
#__ID__ .frq-examples-label{ margin:12px 0 4px!important; }
#__ID__ details.frq-alt{
  border:1px solid #e5e7eb!important; border-left:4px solid #94a3b8!important;
  border-radius:0 8px 8px 0!important; background:#f8fafc!important;
  margin:0 0 10px!important; padding:0!important;
}
#__ID__ details.frq-alt summary{
  cursor:pointer!important; padding:10px 14px!important;
  font-size:0.93em!important; list-style:none!important;
  color:#334155!important; -webkit-text-fill-color:#334155!important;
}
#__ID__ details.frq-alt summary::-webkit-details-marker{display:none!important;}
#__ID__ details.frq-alt summary::before{content:"+ "!important;font-weight:700!important;}
#__ID__ details.frq-alt[open] summary::before{content:"- "!important;}
#__ID__ details.frq-alt pre{margin:0 12px 12px!important;}
#__ID__ .frq-rubric-yes, #__ID__ .frq-rubric-no{
  margin:6px 0 0!important; font-size:0.86em!important; line-height:1.5!important;
}
#__ID__ .frq-rubric-yes{ color:#166534!important; -webkit-text-fill-color:#166534!important; }
#__ID__ .frq-rubric-no{ color:#9f1239!important; -webkit-text-fill-color:#9f1239!important; }
#__ID__ .frq-rubric-yes strong{ color:#166534!important; -webkit-text-fill-color:#166534!important; }
#__ID__ .frq-rubric-no strong{ color:#9f1239!important; -webkit-text-fill-color:#9f1239!important; }
#__ID__ .frq-2026-row-self td{
  background:#fffbeb!important; font-weight:700!important;
}
#__ID__ .frq-2026-callout-src{
  margin:10px 0 0!important; font-size:0.85em!important; font-style:italic!important;
  color:#92400e!important; -webkit-text-fill-color:#92400e!important;
}
#__ID__ .frq-pace-note{
  display:block!important; width:100%!important; margin:8px 0 0!important;
  font-size:0.84em!important; line-height:1.5!important;
  color:#475569!important; -webkit-text-fill-color:#475569!important;
}
`;


// -- STRUCTURED DATA ---------------------------------------------------------
//  Three blocks, the same set the archive's best pages carry and rank on. Every
//  value is derived from the entry, so the four pages differ in substance. A
//  near-identical FAQ across a page set is a doorway-page signal rather than an
//  SEO win, which is the lesson the 53 lesson FRQ pages already paid for: 46 of
//  them shared one scoring answer verbatim before anybody checked.
function structuredData(q, prev, next) {
  const handle = handleFor(q);
  const url = 'https://www.apcsexamprep.com/pages/' + handle;
  const desc = metaDescription(q);

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: q.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const learning = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: titleFor(q),
    headline: YEAR + ' AP CSA FRQ ' + q.number + ': ' + q.className + ', worked solution and official rubric',
    description: desc,
    url: url,
    educationalLevel: 'https://schema.org/AdvancedPlacement',
    educationalAlignment: {
      '@type': 'AlignmentObject',
      alignmentType: 'educationalSubject',
      educationalFramework: 'Advanced Placement',
      targetName: 'AP Computer Science A',
    },
    learningResourceType: 'PracticeProblem',
    teaches: q.teaches,
    timeRequired: 'PT' + EXAM.minutesPerQuestion + 'M',
    author: {
      '@type': 'Person',
      name: 'Tanner Crow',
      jobTitle: 'AP Computer Science Teacher',
      url: 'https://www.wyzant.com/tutors/tannerc12',
    },
    publisher: { '@type': 'Organization', name: 'APCSExamPrep', url: 'https://www.apcsexamprep.com' },
    isAccessibleForFree: true,
    inLanguage: 'en',
  };

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AP CSA', item: 'https://www.apcsexamprep.com/pages/ap-csa-exam-prep' },
      { '@type': 'ListItem', position: 2, name: 'FRQ Archive', item: 'https://www.apcsexamprep.com/pages/ap-csa-frq-archive' },
      { '@type': 'ListItem', position: 3, name: YEAR + ' FRQs', item: 'https://www.apcsexamprep.com/pages/ap-csa-frq-' + YEAR },
      { '@type': 'ListItem', position: 4, name: 'FRQ ' + q.number + ': ' + q.className, item: url },
    ],
  };

  return [faq, learning, crumbs]
    .map((o) => '<script type="application/ld+json">' + jsonld(o) + '</script>')
    .join('\n');
}

//  Kept under 160 characters so Google does not truncate it, and built from the
//  entry so no two are alike.
function metaDescription(q) {
  const s = 'Worked solution to ' + YEAR + ' AP CSA FRQ ' + q.number + ' (' + q.className
    + ') with the official ' + q.points + '-point rubric, the mistakes that cost points, and a practice timer.';
  return s;
}


// -- THE 2026 SCORING CALLOUT -----------------------------------------------
//  The archive pages carry a callout warning that 2026 changed the point
//  structure. On a 2026 page that warning is backwards: this IS the new
//  structure, and the reader who needs help is the one who practised on the
//  archive. So the callout points the other way and prints the whole table,
//  which is the fact a student cannot get from the question itself.
function scoringCallout(q) {
  const rows = spec.questions.map((x) => {
    const parts = x.parts.length > 1
      ? x.parts.map((p) => 'Part ' + p.label + ' ' + p.points).join(' + ')
      : 'single part';
    const me = x.number === q.number ? ' class="frq-2026-row-self"' : '';
    return '<tr' + me + '><td>Question ' + x.number + '</td><td>' + x.points + ' points</td>'
      + '<td>' + esc(parts) + '</td><td>' + esc(x.typeLabel) + '</td></tr>';
  }).join('\n');

  return `
<details class="frq-2026-callout">
<summary class="frq-2026-callout-summary">
<span class="frq-2026-callout-icon">&#9888;</span>
<span class="frq-2026-callout-summary-text"><strong>${YEAR} is not a ${YEAR - 1} exam with the numbers changed.</strong> Tap for the new point structure.</span>
<span class="frq-2026-callout-chevron">&#9662;</span>
</summary>
<div class="frq-2026-callout-body">
<p>Every free-response question from 2004 through ${YEAR - 1} was worth <strong>9 points</strong>, and the section was 36. ${YEAR} is the first exam under the four-unit course, and the section was rebuilt with it: <strong>${EXAM.sectionTwoPoints} points across four questions that are not worth the same</strong>. Only Question 1 has parts.</p>
<div class="frq-2026-callout-table">
<table>
<tr><th>Question</th><th>Worth</th><th>Parts</th><th>Type</th></tr>
${rows}
</table>
</div>
<p>Section I is ${EXAM.sectionOneQuestions} multiple-choice questions in ${EXAM.sectionOneMinutes} minutes and ${EXAM.sectionOnePercent}% of the score. Section II is these four questions in ${EXAM.sectionTwoMinutes} minutes and ${EXAM.sectionTwoPercent}% of the score.</p>
<p class="frq-2026-callout-src">Point totals read from College Board's ${YEAR} scoring guidelines; section weightings from the AP Computer Science A exam page. Both are linked at the bottom of this page.</p>
</div>
</details>
`;
}


// -- THE QUESTION ------------------------------------------------------------
//  The archive pages embed the PDF and stop there, which means the question
//  text exists on the page only as pixels: a screen reader cannot reach it and
//  a search engine cannot index it. The PDF stays, because it is what the
//  student will see in Bluebook, and the given code is printed beside it.
function questionBlock(q, id) {
  const parts = q.parts.map((p) => {
    const heading = p.label ? 'Part ' + p.label : 'What to write';
    const pts = p.points + (p.points === 1 ? ' point' : ' points');
    return `
<h3>${esc(heading)} <span class="frq-part-pts">${pts}</span></h3>
<p>${esc(p.asks)}</p>
<pre>${esc(p.signature)}</pre>
<p class="frq-examples-label"><strong>The examples the question gives you:</strong></p>
<ul>
${p.examples.map((e) => '<li>' + esc(e) + '</li>').join('\n')}
</ul>`;
  }).join('\n');

  return `
<h2 id="${id}-prompt">The Official ${YEAR} FRQ ${q.number} Question</h2>
<p>${esc(q.summary)}</p>

<div class="frq-pdf-wrap" id="${id}-pdf-wrap">
<iframe id="${id}-pdf-iframe" src="${FRQ_PDF}#page=${q.pdfPage}" title="College Board ${YEAR} AP CSA free-response questions, page ${q.pdfPage}" loading="lazy"></iframe>
<div class="frq-pdf-fallback" id="${id}-pdf-fallback">If the question does not load above, <a href="${FRQ_PDF}#page=${q.pdfPage}" target="_blank" rel="noopener">open College Board's ${YEAR} free-response PDF</a>.</div>
</div>
<div class="frq-jump-row">
<button type="button" class="btn btn-sm" id="${id}-pdf-expand" onclick="document.getElementById('${id}-pdf-wrap').classList.toggle('expanded');this.textContent=document.getElementById('${id}-pdf-wrap').classList.contains('expanded')?'Shrink the question':'Expand the question';">Expand the question</button>
<a class="btn btn-sm" href="${FRQ_PDF}#page=${q.pdfPage}" target="_blank" rel="noopener">Open the PDF in a new tab</a>
</div>

<h3>The code you are given</h3>
<pre>${esc(q.given)}</pre>
${parts}
`;
}


// -- THE EDITORS -------------------------------------------------------------
//  One textarea per part, with no Run button, because Bluebook has no Run
//  button either. A practice tool that compiles for you trains a reflex the
//  exam will not reward.
function editors(q, id) {
  return q.parts.map((p, i) => {
    const suffix = p.label ? p.label.toLowerCase() : 'a';
    //  The name on its own, not the whole signature: the signature is already
    //  printed on the toolbar directly under this heading. `public Account(` and
    //  `public String getShortenedName(` do not reduce the same way, so take the
    //  identifier immediately before the parenthesis rather than stripping
    //  modifiers off the front.
    const name = (p.signature.match(/(\w+)\s*\(/) || [, q.className])[1];
    //  Question 2 asks for a whole class; the rest ask for one method. The
    //  heading has to say which, because "Write the Attendance Class" on a
    //  question that wants a single method is an instruction, and a wrong one.
    const wantsClass = /\bclass\s+\w+/.test(p.signature);
    const heading = p.label
      ? 'Write Your Part ' + p.label + ' Response: ' + name
      : (wantsClass ? 'Write the Whole ' + q.className + ' Class'
                    : 'Write Your Response: ' + name);
    return `
<h2 id="${id}-part${suffix}">${esc(heading)}</h2>
<div class="frq-editor">
<div class="frq-editor-toolbar"><span>${esc(p.signature)}</span></div>
<textarea id="${id}-e${suffix}" spellcheck="false" placeholder="Write your Java here. Tab indents, Shift+Tab outdents."></textarea>
<div class="frq-resize-hint">drag to resize</div>
</div>`;
  }).join('\n');
}


// -- THE REVEAL PANEL --------------------------------------------------------
//  Order matters and it is not decorative: recap, then solution, then rubric,
//  then mistakes. That is the order an AP reader works in, and putting the
//  recap first turns it into a self-check rather than a hint the student can
//  reach for while still stuck.
function solutionPanel(q, id) {
  const recap = q.parts.map((p) => {
    const lead = p.label ? 'Part ' + p.label : q.className;
    return '<li><strong>' + esc(lead) + ':</strong> '
      + p.requirements.map(esc).join(' ') + '</li>';
  }).join('\n');

  const model = q.parts.map((p) => {
    const label = p.label ? 'Part ' + p.label : 'The class';
    return '<h4>' + esc(label) + '</h4>\n<pre>' + esc(q.modelSolution[p.label] || q.modelSolution['']) + '</pre>';
  }).join('\n');

  const alts = (q.alternateSolutions || []).length
    ? `
<h3>Other solutions College Board published for this question</h3>
<p class="muted">The rubric scores what a response does, not which shape it took. Each of these earns full credit.</p>
${q.alternateSolutions.map((a) => `<details class="frq-alt"><summary>${esc(a.part ? 'Part ' + a.part + ': ' : '')}${esc(a.why)}</summary>
<pre>${esc(a.code)}</pre></details>`).join('\n')}`
    : '';

  const rubricRows = q.rubric.map((r) => {
    const yes = (r.earnedEvenIf || []).length
      ? '<p class="frq-rubric-yes"><strong>Still earned even if:</strong> ' + r.earnedEvenIf.map(esc).join('; ') + '.</p>' : '';
    const no = (r.notEarnedIf || []).length
      ? '<p class="frq-rubric-no"><strong>Not earned if:</strong> ' + r.notEarnedIf.map(esc).join('; ') + '.</p>' : '';
    return `<tr><td><strong>${esc(r.id)}</strong></td><td>${esc(r.criterion)}${yes}${no}</td><td>+${r.points}</td></tr>`;
  }).join('\n');

  const mistakes = q.mistakes.map((m, i) => `
<div class="frq-mistake"><strong>Mistake ${i + 1}: ${esc(m.title)}.</strong> ${esc(m.detail)}</div>`).join('\n');

  return `
<div class="frq-self-grade-cta">
<p class="frq-self-grade-note"><strong>Ready to self-grade?</strong> Compare what you wrote against the official ${q.points}-point rubric below. AP free-response answers are read by trained human readers, so nothing here scores your code for you. Checking your own work against the criteria is the part that teaches.</p>
<button type="button" class="frq-reveal-btn" onclick="var c=document.getElementById('${id}-sol');c.classList.add('open');this.style.display='none';c.scrollIntoView({behavior:'smooth',block:'start'});">Reveal the solution and the rubric &#9662;</button>
</div>

<div class="frq-collapsible-content" id="${id}-sol">

<h3>What the Prompt Was Actually Asking</h3>
<div class="frq-recap-incollapsed">
<p>Before you read the solution, check your own response against each of these:</p>
<ul>
${recap}
</ul>
</div>

<h3>College Board's Model Solution for ${esc(q.className)}</h3>
${model}
${alts}

<h3>The Official ${q.points}-Point Rubric for ${esc(q.className)}</h3>
<p class="muted">Criteria and decision rules from College Board's ${YEAR} scoring guidelines. An algorithm point is refused when required pieces are missing or assembled wrongly; the other points are judged on their own and survive errors elsewhere.</p>
<table>
<tr><th>#</th><th>Criterion</th><th>Pts</th></tr>
${rubricRows}
</table>

<h3>Mistakes That Cost Points on ${YEAR} FRQ ${q.number}</h3>
${mistakes}

<div class="frq-key"><strong>The one to carry into May:</strong> ${esc(q.mistakes[0].title)}. ${esc(q.mistakes[0].detail)}</div>

</div>
`;
}


// -- THE PAGE ----------------------------------------------------------------
function renderQuestion(q, index, all) {
  const id = idFor(q);
  const prev = index > 0 ? all[index - 1] : null;
  const next = index < all.length - 1 ? all[index + 1] : null;

  const faqHtml = q.faq.map((f) => `
<p class="faq-q">${esc(f.q)}</p>
<p class="faq-a">${esc(f.a)}</p>`).join('\n');

  const nav = [
    prev ? `<a class="btn btn-outline" href="/pages/${handleFor(prev)}">&#8592; FRQ ${prev.number}: ${esc(prev.className)}</a>`
         : `<a class="btn btn-outline" href="/pages/ap-csa-frq-${YEAR - 1}">&#8592; ${YEAR - 1} FRQs</a>`,
    `<a class="btn btn-outline" href="/pages/ap-csa-frq-${YEAR}">All four ${YEAR} FRQs</a>`,
    next ? `<a class="btn btn-outline" href="/pages/${handleFor(next)}">FRQ ${next.number}: ${esc(next.className)} &#8594;</a>`
         : `<a class="btn btn-outline" href="/pages/ap-csa-frq-archive">Every FRQ since 2004 &#8594;</a>`,
  ].join('\n');

  const others = all.filter((x) => x.number !== q.number).map((x) =>
    `<li><a href="/pages/${handleFor(x)}">${YEAR} FRQ ${x.number}: ${esc(x.className)}</a>, ${esc(x.typeLabel.toLowerCase())}, ${x.points} points</li>`).join('\n');

  return `<!--
  ${YEAR} AP CSA FRQ ${q.number} (${q.className}).

  GENERATED FILE. Do not hand-edit this body in Shopify: the next generator run
  overwrites it and your change disappears without a word.

    content   config/csa-frq-2026.json
    renderer  lib/csa-past-frq-pages.js
    sheet     node scripts/csa-past-frq-pages-csv.js out.csv
    checks    npm run smoke:csa2026frq  and  node scripts/verify-csa-2026-frq.js --mutate
-->

${structuredData(q, prev, next)}

<style>${(PAGE_CSS + EXTRA_CSS).replace(/__ID__/g, id)}</style>

<div id="${id}">

${scoringCallout(q)}

<h2 class="frq-pagetitle">${YEAR} AP CSA FRQ ${q.number}: ${esc(q.className)}, Worked Solution and Rubric</h2>
<p class="frq-lede">${esc(metaDescription(q))}</p>

<div class="frq-byline">By Tanner Crow, AP Computer Science teacher. Last reviewed September 2026.</div>

<div class="frq-meta">
<span><strong>${q.points} points</strong></span>
<span>${esc(q.typeLabel)}</span>
<span>${esc(q.unit)}</span>
<span>about ${EXAM.minutesPerQuestion} minutes</span>
</div>

<div class="frq-timer-bar">
<span class="frq-timer-label">Practice pace</span>
<span class="frq-timer-display" id="${id}-timer">${EXAM.minutesPerQuestion}:00</span>
<span>
<button type="button" class="btn btn-sm btn-green" onclick="window['${id}Start']();">Start</button>
<button type="button" class="btn btn-sm btn-amber" onclick="window['${id}Pause']();">Pause</button>
<button type="button" class="btn btn-sm btn-outline" onclick="window['${id}Reset']();">Reset</button>
</span>
<span class="frq-pace-note">${EXAM.minutesPerQuestion} minutes is a quarter of the ${EXAM.sectionTwoMinutes}-minute section, not a College Board instruction. The four questions are no longer worth the same, so an uneven split is a defensible plan.</span>
</div>

${questionBlock(q, id)}

${editors(q, id)}

${solutionPanel(q, id)}

<h2>FAQs About ${YEAR} AP CSA FRQ ${q.number}</h2>
<div class="frq-faq">
${faqHtml}
</div>

<h2>The Other Three ${YEAR} Questions</h2>
<ul>
${others}
</ul>

<h2>Where This Question Came From</h2>
<p>The question is College Board's, published on AP Central after the ${YEAR} administration: <a href="${FRQ_PDF}" target="_blank" rel="noopener">${YEAR} free-response questions</a> and <a href="${SG_PDF}" target="_blank" rel="noopener">${YEAR} scoring guidelines</a>. The model solution and the rubric criteria on this page are theirs. Every solution shown here was compiled and run against the examples in the question before it was published, which is the only way to know an answer key is right.</p>

<div class="frq-nav">
${nav}
</div>

<div class="frq-footer-links">
<a href="/pages/ap-csa-frq-archive">Every AP CSA FRQ since 2004</a> &#8226;
<a href="/pages/ap-csa-frqs-by-topic">Practice by topic instead of by year</a> &#8226;
<a href="/pages/ap-csa-frq-strategy-guide">How the free-response section is scored</a>
</div>

</div>

<script>${PAGE_JS.replace(/__ID__/g, id).replace(/__MINUTES__/g, String(EXAM.minutesPerQuestion))}</script>`;
}

//  The year hub's own stylesheet, lifted unchanged from the archive's 2025 hub
//  so the 2026 index looks like the 22 that came before it rather than like a
//  new thing bolted on.
const HUB_CSS = `.page-title,.article__title,.page__title,.template-page h1:first-of-type{display:none!important}
#__ID__{all:initial!important;display:block!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;color:#1e293b!important;max-width:900px!important;margin:0 auto!important;padding:24px 20px 64px!important;-webkit-font-smoothing:antialiased!important;background:#ffffff!important}
#__ID__ *{box-sizing:border-box!important}
#__ID__ h1{font-size:1.95em!important;font-weight:800!important;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;margin:0 0 8px!important;line-height:1.2!important;border:none!important;padding:0!important}
#__ID__ h2{font-size:1.3em!important;font-weight:700!important;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;margin:36px 0 14px!important;padding-left:12px!important;border-left:4px solid #60a5fa!important;border-bottom:none!important;line-height:1.3!important}
#__ID__ h3{font-size:1.05em!important;font-weight:600!important;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;margin:20px 0 8px!important;line-height:1.3!important}
#__ID__ p{margin:0 0 14px!important;color:#1e293b!important;font-size:15px!important;line-height:1.7!important}
#__ID__ a{color:#2563eb!important;-webkit-text-fill-color:#2563eb!important;text-decoration:underline!important}
#__ID__ a:link,#__ID__ a:visited{color:#2563eb!important;-webkit-text-fill-color:#2563eb!important}
#__ID__ a:hover{color:#1d4ed8!important;-webkit-text-fill-color:#1d4ed8!important}
#__ID__ strong{font-weight:700!important;color:#1e293b!important}
#__ID__ ul{margin:0 0 14px!important;padding-left:22px!important}
#__ID__ li{margin:0 0 6px!important;font-size:15px!important;line-height:1.7!important;color:#1e293b!important}
#__ID__ table{width:100%!important;border-collapse:collapse!important;margin:16px 0!important;font-size:14px!important}
#__ID__ th{background:#f8fafc!important;color:#475569!important;font-weight:600!important;padding:10px 14px!important;text-align:left!important;border-bottom:2px solid #e2e8f0!important;font-size:12px!important;text-transform:uppercase!important;letter-spacing:0.4px!important}
#__ID__ td{padding:11px 14px!important;border-bottom:1px solid #f1f5f9!important;color:#1e293b!important;vertical-align:middle!important;font-size:14px!important}
#__ID__ tr:last-child td{border-bottom:none!important}
#__ID__ .breadcrumb{font-size:13px!important;color:#64748b!important;margin-bottom:20px!important;display:block!important}
#__ID__ .breadcrumb a{color:#2563eb!important;-webkit-text-fill-color:#2563eb!important;text-decoration:none!important;font-size:13px!important}
#__ID__ .breadcrumb a:link,#__ID__ .breadcrumb a:visited{color:#2563eb!important;-webkit-text-fill-color:#2563eb!important}
#__ID__ .year-label{display:inline-block!important;background:#dbeafe!important;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;font-size:12px!important;font-weight:600!important;padding:3px 10px!important;border-radius:4px!important;margin-bottom:8px!important;letter-spacing:0.5px!important;text-transform:uppercase!important}
#__ID__ .subtitle{color:#64748b!important;font-size:15px!important;margin:0 0 20px!important;line-height:1.6!important}
#__ID__ .stat-row{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:10px!important;margin:20px 0 28px!important}
#__ID__ .stat-box{background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:8px!important;padding:14px 10px!important;text-align:center!important}
#__ID__ .stat-num{display:block!important;font-size:1.55em!important;font-weight:800!important;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;line-height:1.1!important}
#__ID__ .stat-label{display:block!important;font-size:11px!important;color:#64748b!important;margin-top:3px!important;font-weight:500!important}
#__ID__ .jumplinks{display:flex!important;flex-wrap:wrap!important;gap:7px!important;margin:0 0 28px!important;padding:13px 0!important;border-top:1px solid #e5e7eb!important;border-bottom:1px solid #e5e7eb!important}
#__ID__ .jumplinks a{display:inline-block!important;padding:5px 12px!important;background:#f1f5f9!important;color:#334155!important;-webkit-text-fill-color:#334155!important;border-radius:5px!important;font-size:12px!important;font-weight:600!important;text-decoration:none!important}
#__ID__ .jumplinks a:link,#__ID__ .jumplinks a:visited{color:#334155!important;-webkit-text-fill-color:#334155!important;text-decoration:none!important}
#__ID__ .jumplinks a:hover{background:#e2e8f0!important;color:#1e293b!important;-webkit-text-fill-color:#1e293b!important}
#__ID__ .frq-cards{display:flex!important;flex-direction:column!important;gap:12px!important;margin:16px 0!important}
#__ID__ .frq-card{background:#fff!important;border:1px solid #e5e7eb!important;border-radius:10px!important;padding:16px 20px!important;display:flex!important;gap:16px!important;align-items:flex-start!important;text-decoration:none!important}
#__ID__ a.frq-card:link,#__ID__ a.frq-card:visited{text-decoration:none!important}
#__ID__ .frq-card:hover{border-color:#3b82f6!important;background:#fafcff!important}
#__ID__ .card-num{font-size:1.55em!important;font-weight:800!important;color:#94a3b8!important;-webkit-text-fill-color:#94a3b8!important;min-width:28px!important;padding-top:2px!important;line-height:1!important}
#__ID__ .card-body{flex:1!important;min-width:0!important}
#__ID__ .card-body h3{font-size:1em!important;font-weight:700!important;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;margin:0 0 4px!important}
#__ID__ .card-body p{font-size:13px!important;color:#475569!important;margin:0 0 6px!important}
#__ID__ .card-topics{font-size:12px!important;color:#64748b!important;margin-bottom:6px!important}
#__ID__ .card-diff{font-size:12px!important;color:#64748b!important;margin-bottom:8px!important}
#__ID__ .card-badge{display:inline-block!important;font-size:11px!important;font-weight:700!important;padding:2px 9px!important;border-radius:4px!important;margin-bottom:6px!important;text-transform:uppercase!important;letter-spacing:0.4px!important}
#__ID__ .card-link{display:inline-block!important;padding:6px 14px!important;border-radius:6px!important;font-size:12px!important;font-weight:700!important;text-decoration:none!important;margin-top:4px!important;opacity:1!important;visibility:visible!important}
#__ID__ a.frq-card .card-link:link,#__ID__ a.frq-card .card-link:visited{color:white!important;-webkit-text-fill-color:white!important;text-decoration:none!important}
#__ID__ .badge{display:inline-block!important;font-size:11px!important;font-weight:600!important;padding:2px 8px!important;border-radius:4px!important;white-space:nowrap!important}
#__ID__ .difficulty-grid{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:10px!important;margin:14px 0!important}
#__ID__ .diff-card{padding:14px!important;border-radius:8px!important;border:1px solid #e5e7eb!important}
#__ID__ .diff-card h3{font-size:14px!important;margin:0 0 6px!important;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important}
#__ID__ .diff-card p{font-size:13px!important;color:#475569!important;margin:0!important}
#__ID__ .faq-item{border-bottom:1px solid #f1f5f9!important;padding:14px 0!important}
#__ID__ .faq-item:last-child{border-bottom:none!important}
#__ID__ .faq-item h3{font-size:15px!important;font-weight:600!important;color:#1e293b!important;-webkit-text-fill-color:#1e293b!important;margin:0 0 6px!important}
#__ID__ .faq-item p{font-size:14px!important;color:#475569!important;margin:0!important}
#__ID__ .year-nav{display:flex!important;justify-content:space-between!important;align-items:center!important;margin:40px 0 0!important;padding:16px 0!important;border-top:2px solid #e5e7eb!important}
#__ID__ .year-nav a{display:inline-block!important;padding:8px 18px!important;background:#f1f5f9!important;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;border-radius:7px!important;font-size:14px!important;font-weight:700!important;text-decoration:none!important;border:1px solid #e2e8f0!important}
#__ID__ .year-nav a:link,#__ID__ .year-nav a:visited{color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;text-decoration:none!important}
#__ID__ .year-nav a:hover{background:#dbeafe!important;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important}
#__ID__ .year-nav .center-link a{background:#1e3a8a!important;color:#fff!important;-webkit-text-fill-color:#fff!important}
#__ID__ .year-nav .center-link a:link,#__ID__ .year-nav .center-link a:visited{color:#fff!important;-webkit-text-fill-color:#fff!important}
#__ID__ .callout{background:#eff6ff!important;border:1px solid #bfdbfe!important;border-radius:8px!important;padding:14px 18px!important;margin:16px 0!important}
#__ID__ .callout p{margin:0!important;font-size:14px!important;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important}
@media(max-width:600px){
  #__ID__ .stat-row{grid-template-columns:repeat(2,1fr)!important}
  #__ID__ .difficulty-grid{grid-template-columns:1fr!important}
  #__ID__ .year-nav{flex-direction:column!important;gap:10px!important}
}`;


// -- THE YEAR HUB ------------------------------------------------------------
//  Every year from 2004 to 2025 has an index page at ap-csa-frq-YYYY, and the
//  four question pages link to it. Shipping the questions without it would
//  leave four pages pointing at a page that does not exist, which is the defect
//  this generator's own link rule refuses.
function hubDescription() {
  return 'All four ' + YEAR + ' AP CSA free-response questions with College Board model solutions, the official 7, 7, 5 and 6 point rubrics, and the mistakes that cost points.';
}

function renderYearHub() {
  const all = spec.questions;
  const id = 'yhub' + YEAR;
  const total = all.reduce((n, q) => n + q.points, 0);
  const url = 'https://www.apcsexamprep.com/pages/ap-csa-frq-' + YEAR;

  const cards = all.map((q) => `
<div class="frq-card" id="frq${q.number}">
<div class="card-badge">${esc(q.typeLabel)}</div>
<div class="card-num">${q.number}</div>
<div class="card-body">
<h3>${esc(q.className)}</h3>
<p>${esc(q.summary)}</p>
<p class="card-topics">${esc(q.teaches)}</p>
<p class="card-diff">Worth ${q.points} of the ${total} free-response points${q.parts.length > 1 ? ', split ' + q.parts.map((x) => 'Part ' + x.label + ' ' + x.points).join(' and ') : ', single part'}</p>
<a class="card-link" href="/pages/${handleFor(q)}">Worked solution and rubric &#8594;</a>
</div>
</div>`).join('\n');

  const rows = all.map((q) => `<tr>
<td>FRQ ${q.number}</td>
<td><a href="/pages/${handleFor(q)}">${esc(q.className)}</a></td>
<td>${esc(q.typeLabel)}</td>
<td>${q.points}</td>
<td>${q.parts.length > 1 ? q.parts.length + ' parts' : '1 part'}</td>
<td>${esc(q.unit)}</td>
</tr>`).join('\n');

  const hubFaq = [
    { q: 'How many points is each ' + YEAR + ' AP CSA FRQ worth?',
      a: 'They are not equal any more. Question 1 is 7 points, question 2 is 7, question 3 is 5 and question 4 is 6, for ' + total + ' across the section. Every exam from 2004 through ' + (YEAR - 1) + ' used 9 points a question and 36 for the section, so a rubric you practised on an archive page does not carry over.' },
    { q: 'What changed about the AP CSA exam in ' + YEAR + '?',
      a: YEAR + ' was the first administration of the four-unit course. Section I is now ' + EXAM.sectionOneQuestions + ' multiple-choice questions in ' + EXAM.sectionOneMinutes + ' minutes and ' + EXAM.sectionOnePercent + ' percent of the score, and Section II is these four questions in ' + EXAM.sectionTwoMinutes + ' minutes and ' + EXAM.sectionTwoPercent + ' percent of it.' },
    { q: 'Do the four question types still come in the same order?',
      a: 'Yes, and College Board now states the order in the exam description rather than leaving it to be inferred. Question 1 is methods and control structures with a String-method part B, question 2 is class design, question 3 is data analysis with an ArrayList, and question 4 is a 2D array.' },
    { q: 'How long should I spend on each question?',
      a: 'About ' + EXAM.minutesPerQuestion + ' minutes is an even quarter of the ' + EXAM.sectionTwoMinutes + '-minute section, and it is a starting point rather than a rule. Question 3 carries 5 points and question 1 carries 7, so an even split spends the same time on unequal work.' },
    { q: 'Are these the real ' + YEAR + ' questions?',
      a: 'Yes. College Board published the ' + YEAR + ' free-response questions and the scoring guidelines on AP Central after the administration, and both are linked from every question page here. The model solutions are College Board\'s own, and each one was compiled and run against the examples in the question before it was published.' },
  ];

  const faqBlocks = hubFaq.map((f) => `
<div class="faq-item">
<p><strong>${esc(f.q)}</strong></p>
<p>${esc(f.a)}</p>
</div>`).join('\n');

  const ld = [
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: hubFaq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AP CSA', item: 'https://www.apcsexamprep.com/pages/ap-csa-exam-prep' },
        { '@type': 'ListItem', position: 2, name: 'FRQ Archive', item: 'https://www.apcsexamprep.com/pages/ap-csa-frq-archive' },
        { '@type': 'ListItem', position: 3, name: YEAR + ' FRQs', item: url },
      ] },
    { '@context': 'https://schema.org', '@type': 'Article',
      headline: YEAR + ' AP CSA Free-Response Questions, all four with solutions and rubrics',
      description: hubDescription(),
      url: url,
      author: { '@type': 'Person', name: 'Tanner Crow', jobTitle: 'AP Computer Science Teacher' },
      publisher: { '@type': 'Organization', name: 'APCSExamPrep', url: 'https://www.apcsexamprep.com' },
      inLanguage: 'en' },
  ].map((o) => '<script type="application/ld+json">' + jsonld(o) + '</script>').join('\n');

  return `<!--
  ${YEAR} AP CSA FRQ index.

  GENERATED FILE. Do not hand-edit this body in Shopify: the next generator run
  overwrites it and your change disappears without a word.

    content   config/csa-frq-2026.json
    renderer  lib/csa-past-frq-pages.js
    sheet     node scripts/csa-past-frq-pages-csv.js out.csv
-->

${ld}

<style>${HUB_CSS.replace(/__ID__/g, id)}</style>

<div id="${id}">

<div class="breadcrumb"><a href="/pages/ap-csa-frq-archive">FRQ Archive</a> &#8250; ${YEAR} AP CSA FRQs</div>

<div class="year-label">AP CSA, ${YEAR} exam</div>
<h2>${YEAR} AP CSA Free Response Questions</h2>
<p class="subtitle">All four questions from the ${YEAR} exam, each with College Board's model solution, the official rubric, and the mistakes that cost points. Every solution on these pages was compiled and run against the examples in the question before it was published.</p>

<div class="stat-row">
<div class="stat-box"><div class="stat-num">4</div><div class="stat-label">free-response questions</div></div>
<div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">points, 7 / 7 / 5 / 6</div></div>
<div class="stat-box"><div class="stat-num">${EXAM.sectionTwoPercent}%</div><div class="stat-label">of the exam score</div></div>
<div class="stat-box"><div class="stat-num">${EXAM.sectionTwoMinutes}</div><div class="stat-label">minutes for the section</div></div>
</div>

<div class="callout">
<p><strong>${YEAR} is the year the scoring changed.</strong> From 2004 through ${YEAR - 1} every free-response question was worth 9 points and the section was 36. In ${YEAR} the four questions are worth 7, 7, 5 and 6, the section is ${total} points across four questions, and only question 1 has parts. If you are working through the archive, the questions there are still good practice and the point totals on them are not.</p>
</div>

<div class="jumplinks">
${all.map((q) => `<a href="#frq${q.number}">FRQ ${q.number}, ${esc(q.className)}</a>`).join('\n')}
<a href="#summary">Summary table</a>
<a href="#faq">FAQ</a>
</div>

<div class="frq-cards">
${cards}
</div>

<h2 id="summary">The four questions at a glance</h2>
<table>
<tr><th>#</th><th>Class</th><th>Type</th><th>Points</th><th>Parts</th><th>Where it lives in the course</th></tr>
${rows}
</table>

<h2 id="faq">FAQ</h2>
${faqBlocks}

<div class="center-link">
<a href="${FRQ_PDF}" target="_blank" rel="noopener">College Board's ${YEAR} free-response questions</a> and
<a href="${SG_PDF}" target="_blank" rel="noopener">${YEAR} scoring guidelines</a>
</div>

<div class="year-nav">
<a href="/pages/ap-csa-frq-${YEAR - 1}">&#8592; ${YEAR - 1} FRQs</a>
<a href="/pages/ap-csa-frq-archive">Every FRQ since 2004</a>
<a href="/pages/ap-csa-frqs-by-topic">Practice by topic &#8594;</a>
</div>

</div>`;
}


function pages() {
  const all = spec.questions;
  const out = all.map((q, i) => ({
    handle: handleFor(q),
    title: titleFor(q),
    metaDescription: metaDescription(q),
    body: renderQuestion(q, i, all),
    question: q,
  }));
  out.push({
    handle: 'ap-csa-frq-' + YEAR,
    title: YEAR + ' AP CSA FRQ: All 4 Free Response Questions with Solutions',
    metaDescription: hubDescription(),
    body: renderYearHub(),
    question: null,
    isHub: true,
  });
  return out;
}

module.exports = { pages, handleFor, titleFor, metaDescription, hubDescription, esc, spec, PAGE_CSS, EXTRA_CSS, HUB_CSS, PAGE_JS };
