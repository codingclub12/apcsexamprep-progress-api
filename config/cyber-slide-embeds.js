'use strict';
// ---------------------------------------------------------------------------
//  AP CYBERSECURITY TEACHER BUNDLE: GOOGLE SLIDES FILE IDS.
//
//  GENERATED FILE. Do not hand-edit. Regenerate with:
//    node scripts/cyber-slide-embeds-from-csv.js <exported-map.csv>
//
//  The source of truth is the `AP Cyber Slides Map` sheet that the Apps Script
//  conversion writes into Drive (one row per converted deck: lesson, day,
//  variant, sourceName, slidesId, embedUrl, status).
//
//  WHY THIS COURSE IS EMBED-ONLY, unlike AP CSP. Cyber decks were never
//  uploaded to Shopify: the whole cyber file library there is two PDFs. There
//  is no .pptx URL to serve and none is planned, so a Slides id is not an
//  optimisation here, it is the ONLY way a teacher reaches a deck. A teacher
//  who wants an editable copy uses File > Make a copy, which is why the
//  conversion must not set copyRequiresWriterPermission.
//
//  SENSITIVITY. These IDs are credentials in every sense that matters. The
//  converted decks are shared "anyone with the link can view", because the
//  paying teacher is gated on their APCSExamPrep teacher token and not on a
//  Google account, so Google itself cannot do the gating. Holding the ID IS
//  access. It must never appear in a response to an unentitled caller, and
//  never in page HTML. routes/slides.js is the only thing that may disclose
//  one.
//
//  That matters more here than it did for CSP. A cyber TEACHER deck carries
//  per-slide speaker notes, timing cues, cold-call prompts and misconception
//  alerts that the STUDENT deck does not, and it is one click from rendering.
//  An entitled student must never receive one.
//
//  An empty map is a valid state: it means the conversion has not run yet. For
//  this course that means the lesson has no decks to show at all rather than
//  falling back to downloads, so the gate reports zero decks rather than
//  pretending. See config/cyber-slide-manifest.js.
// ---------------------------------------------------------------------------

// Key format: `<lessonId>|<day>|<variant>`, e.g. `1-2|3|teacher`.
//
// Note there is no track segment. AP CSP splits every deck across a CB
// Standard and a Deep Dive track; cyber has no such dimension, only the
// STUDENT/TEACHER variant. Adding a track here later would be a key-format
// change, so the generator refuses any row that carries one.
const SLIDE_IDS = {
  '1-1|1|student': '1UPiOXdqGnnDRwMAMi9BTLAarB1r0A8kc21TLSutIEwI',
  '1-1|1|teacher': '18DOf5jxS6o-p6ZN-uh5gMihXvb2PXgIVB-t4Buel7So',
  '1-1|2|student': '1FIXWRaE5tYpWCa5RbqfHOJ_3V6KMZWeBivd8Rzt3YMU',
  '1-1|2|teacher': '17kgzSTPECZByjfKmoq4dnQfx8AQ91REER8OQuizj6hk',
  '1-2|1|student': '1sFWNZ3uWlQv4SFGKhCNDEe5ETENgtH9iJKvBiSB0um0',
  '1-2|1|teacher': '12NRg-oYj3t4ncGl9Qj0pZirj8xWKbc2boJmJ7kTrEMw',
  '1-2|2|student': '1KyOBHEqmtgbxT4EhKQ7jb5ndFSQiHmdvGMnGsPM-jcc',
  '1-2|2|teacher': '1xmM43Ho6J12AViAxVaYxXARI0BGt7iTZxlcIbSBUJNY',
  '1-2|3|student': '1_IWySQ-bNqa9UPsKYgdrYMlGd6hLRwgNNA0-snUpCFU',
  '1-2|3|teacher': '11NITPtdIueiU451bnTa44f2cjJ3VOTI5vlxbp-mu2_c',
  '1-2|4|student': '1_bgU3Mqq8b4RhqaffHgk78m0osY8QLZ6yRAgbK6AKF0',
  '1-2|4|teacher': '1K6_3ELhnGhEhDBSZfWjQhOGrOEuxWLfwo61f2K2XMJ8',
  '1-3|1|student': '1geJDWVBfnT9Qj55v-sIGltbQ9kyi2KnVJ8h28Z_aTWQ',
  '1-3|1|teacher': '1F3qh0TJWYy6tDNJkcjrtF3i6vaQOmZL0Xam-9rspP4o',
  '1-3|2|student': '140sxN5Co0nKVAskZrkIlP4c6MlsD43jvlnx-54ZxB6o',
  '1-3|2|teacher': '15jzyJg4U6SBSYKFoMwi0nIs63uNfLGiSq5JJzKo1S9E',
  '1-3|3|student': '1e_REM5lM8UCLsGdOCal8evMqOamSyvMv276yixf1ipE',
  '1-3|3|teacher': '1K2yZUr2RxQrIM34gEeWZopJzR7kbf7OfJM_fySeT8r8',
  '1-3|4|student': '1NJhNV7tv1fZ9dGzgPI3dhReF28s7TrtWmlj6UrEI3KA',
  '1-3|4|teacher': '1nLs0vkIUiEtVxPEyg8kI9pjtEzKrD5BoxxLdAfeJEDI',
  '1-4|1|student': '1HveKbejnq8rp6gRa_MrX1hR2K1oFwRWUovnm_o9_5QA',
  '1-4|1|teacher': '1FQdjdBoI6rhlRKg5Pj4MDCk8JyKRB5rKFDLUHpXXuYo',
  '1-4|2|student': '179Y6cDAMup2jq2qw-K_yjzB78jMOAivn-SC_jYCz57c',
  '1-4|2|teacher': '1RV6K9gz30shgh0TQmTs-3iwREB0err-15g2Mm1nbIKE',
  '1-5|1|student': '1JRtjsII4nCRl09bfJdoCFFW439iRcH17pebZ2w9ncoY',
  '1-5|1|teacher': '1A0L2SBSvglhrvJ37ubpKJIHtt-2lAV1F4RDAusgADFU',
  '1-5|2|student': '1Qnk55DBWVI3qc1fDbXs2AesL5CHrwrBJRQiWVp481ds',
  '1-5|2|teacher': '1CHD2hrRTbO_psHxXwEbd-MhtQCC8bOnm9VB_f2qNNKc',
  '2-1|1|student': '1Uhu0SLp6vKXqMuRN_YCpmfT8yQCoASGWnPlmfKuizLE',
  '2-1|1|teacher': '133-iR56x_v8C2bdtzdbUSF-9Wtn2tZCdCWCNI1BS68U',
  '2-1|2|student': '1N0ZRtWP3a12fyGQsDf2vwxPvKXWAfsUtawXuKZ5fsmY',
  '2-1|2|teacher': '1FTKWPnyWRg8K0JfwPOcsX-2W9x65ISeXdr0P6I_u8cU',
  '2-1|3|student': '1uqHGypiydbsGeF983eoLfHxQuGbc3zJavS5-8fbToCk',
  '2-1|3|teacher': '1Nf9BwnyS5wIYX7zo0caeoaZGJWyZzjbXa2m1bfO90gk',
  '2-1|4|student': '10_EYUMuzK0Vlv3K7e0WAs5fxCbLMetlXQQNqahsXNNw',
  '2-1|4|teacher': '12MnOArF62QxL9VZslZFVRQA4Pdfo9gdoJsbtJGCANWU',
  '2-1|5|student': '1hhBkNqfPJetGI68BWUL0lwZYWZ957o4U2MT3OuXyHrU',
  '2-1|5|teacher': '18J-mxHuUl54s8FqnH3tFZDMzz8po87u1sWVu6X5_AkY',
  '2-1|6|student': '1iGEvKrZ5Wn9OHsAsrmQU5AEPfdQppRuTXARHPZ5e3us',
  '2-1|6|teacher': '1Nco1HvFtipHiZ6NSaw7oXrUiWoN7itGlafADxbIRYVI',
  '2-1|7|student': '1yOjBWIpXYjW79eZzsaBEeRtv0Y1CNOoWVZMRKfX7aks',
  '2-1|7|teacher': '18C4spyxRQssUMIiPO0U7jgdVDGWPdj4slctjYs_CJ_E',
  '2-1|8|student': '1o3HFBcxa6KhqI0qlde_2NPeIUL7UuhXtPY0csz6TYH0',
  '2-1|8|teacher': '1Ir5h2065yzmckiDjdq5uklBTOHDWyrugLm5BItZO6ps',
  '2-2|1|student': '1m354_vVbcNCGHSm8saHwP67feHJTWho0h4XTL1XD9dM',
  '2-2|1|teacher': '1mFvM1iRwxCz21H4cWIw2Ebx2j5f5mpBVSLWmrpoPct4',
  '2-2|2|student': '1RJKr-lCWy_w5dAjiYM24BUpEiYHd0z6ND5uY7pEfYEE',
  '2-2|2|teacher': '1haScAh5VcU_-GND6uzlrPGCXPaR6tPKliKdD4hTOqNI',
  '2-2|3|student': '1x_Z6hUNVV0F9kgb7Necd_pRxfQ8wthCYMz2dSfRWefg',
  '2-2|3|teacher': '1kYMf6OkoP1JgFjCJPjFHbJCmOgEapICNqP6iQ6RhGrk',
  '2-2|4|student': '1kPCofh-itC3W8uuhYSmyMq1_Ezm5cJJ9YskPOFIvvDI',
  '2-2|4|teacher': '1scbjGCqxwOOXUn35GuEwzTBbsXXqVIe0m9e2FHeqWZg',
  '2-2|5|student': '1PG0sQyJbUc-g-8WZ7iyURGIE0eyB09wSZD_y4DxY6gQ',
  '2-2|5|teacher': '1lXpyvj1w0l-gkoTPaGQmda_MExbokBuK4BkZP47qjh0',
  '2-3|1|student': '1Cw4OgGl_UZZq5nx69iTNgi0D9BNJVwzEdnwKeXxgKwo',
  '2-3|1|teacher': '1KNarPOx6QnaUgGDtg-eAUTeX57SWP44qFRGQcRXmuuo',
  '2-3|2|student': '1__9tHOKeJgX-jhc23sikS94B-bYngC0htrt4CBf_IDM',
  '2-3|2|teacher': '12rY48PTHZwaVpkLtY8peOLGYIGG-KuOxN9YebSGSM8k',
  '2-3|3|student': '1CQ3DKrthlVOUlvvCFSLf0gD-Tc4Q3Dy78xhlfyBts3Y',
  '2-3|3|teacher': '185u18uqAWaYRynNylqz7p8Iz36BLhCpJaZ-jZlmQnuw',
  '2-3|4|student': '15A7fXG_WqtvQT7WUDi1HqWuvLoKIDY5E76oQDuxe_l4',
  '2-3|4|teacher': '1rjoUGmzz1n9DgUzAwUIT8XtzjdkoJx_-cD7-1aeA6AM',
  '2-4|1|student': '1Eyz6t3_mFhSGvQZpOUsUmw29NqpJWX9oPeD3uqz3Q7U',
  '2-4|1|teacher': '1N4fKGjSFjxqApbubOU6gu4Qg6iJzVNsIulkpUOQe0n8',
  '2-4|2|student': '1fOsWVeKJjOQv8zalgA2Vq0d71dbtqjs5lsvq4zxqyEw',
  '2-4|2|teacher': '1V-KFAwEOUxg_G1YKeti0R-z7_GeAMHFGv4NKceITRJA',
  '2-4|3|student': '16DdiaZg6uihoITpu1sjOVw98Ppus-8cNVF4D13Zofvw',
  '2-4|3|teacher': '1nB5p8LP6qD14QpnX7xMOs757wKTK21uPDfZ3lCp_QTA',
  '2-4|4|student': '1X2YT8WpoQKzkUcA5TjnSHtouGpaRuWtCdKntFHd89iM',
  '2-4|4|teacher': '1WZizo2eoX94je3AiRxXSeNXQ4pjjOK1C09mZ1ykRPFc',
};

// Set by the generator so a stale map is diagnosable from the file alone.
const GENERATED_AT = '2026-08-27';

function slideId(lessonId, day, variant) {
  const key = `${lessonId}|${day}|${variant}`;
  return Object.prototype.hasOwnProperty.call(SLIDE_IDS, key) ? SLIDE_IDS[key] : null;
}

// The embed parameters live here and nowhere else.
//
// Deliberately NOT rm=minimal, matching the CSP decision and for the same
// reason: rm=minimal hides the Slides toolbar, which is where the
// previous/next controls, the slide counter and the fullscreen button live. A
// teacher projecting a deck in class needs all three more than the frame needs
// to blend into the page.
//
// autoplay stays off: a lesson page should not start advancing slides on its
// own.
function embedUrl(id) {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;
}

function count() {
  return Object.keys(SLIDE_IDS).length;
}

module.exports = { slideId, embedUrl, count, GENERATED_AT };
