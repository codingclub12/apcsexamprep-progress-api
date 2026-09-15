/**
 * AP CYBERSECURITY: re-share the converted slide decks.
 *
 * GENERATED FILE. Do not hand-edit.
 *   node scripts/build-cyber-reshare-gs.js
 * The id list below is derived from config/cyber-slide-embeds.js, which is
 * what the server actually hands out, so this script repairs exactly the decks
 * a teacher can reach and no others.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 * On 2026-09-15 all 70 converted AP Cybersecurity decks answered 401 to an
 * anonymous fetch of their embed URL. AP CSP's 224 decks answered 200 the same
 * afternoon, from the same instrument, so this is not a network problem and not
 * a Google-wide policy: it is these files. A 401 renders as Google's "You need
 * access" page, so every entitled teacher who pressed a deck on a lesson page
 * was sent to Request access, and those requests went to Tanner's Drive rather
 * than to anything that could grant them. That is the symptom that surfaced it.
 *
 * WHY NOT JUST RE-RUN THE CONVERSION
 * Because it would do nothing. cyber-slides-conversion.gs skips any deck the
 * map sheet already records as OK, and all 70 are recorded OK: the copy
 * succeeded, it was the sharing that did not stick. start() there would log
 * "0 to convert, 70 already done" and exit green. Worse, forcing it by
 * clearing the sheet would mint 70 NEW file ids and invalidate
 * config/cyber-slide-embeds.js, turning a permission fix into a re-conversion
 * plus a config regeneration plus a deploy.
 *
 * So this script copies nothing and creates nothing. It sets one permission on
 * 70 existing files, by id, and reads each one back.
 *
 * THE READ-BACK IS THE POINT. The conversion script called setSharing and
 * moved on, and that is precisely how 70 decks came to be recorded OK while
 * being unreachable. A write that is not read back is a claim, not a result.
 * Every deck below is re-read through the Drive API after the write, and a
 * deck that does not come back ANYONE_WITH_LINK / VIEW is reported as FAILED
 * with the reason, however cleanly the write returned.
 *
 * ---------------------------------------------------------------------------
 * SETUP
 *   1. script.google.com, new project, paste this file in.
 *   2. Run preview() first and authorise when prompted.
 *      No advanced service is needed: this uses DriveApp only.
 *
 * RUN ORDER
 *   preview()    Reads the current sharing of all 70 decks and changes
 *                NOTHING. Tells you how many are already open and how many
 *                are not. Run it first; if it already reports 70 open,
 *                the problem is somewhere else and start() would hide that.
 *   start()      Sets sharing to "anyone with the link can view" on every deck
 *                that needs it, reads each back, and logs a per-deck result.
 *                Safe to re-run: a deck that already reads back correct is
 *                skipped, so an interrupted run resumes.
 *   diagnose()   For the first few decks, prints owner, shared-drive status and
 *                the full permission list. Run this if start() reports
 *                failures: it is what distinguishes "an admin policy forbids
 *                link sharing" from "these files moved into a shared drive"
 *                from "the wrong account is running the script".
 *   reset()      Forgets the resume pointer. Deletes nothing.
 *
 * AFTER IT RUNS, VERIFY FROM OUTSIDE GOOGLE. This script's own report is still
 * Google telling you about Google. The independent check is in the repo and
 * takes no credentials at all:
 *
 *     npm run verify:sharing ap-cybersecurity
 *
 * It must print 70/70 reachable. Anything less and the repair is not done,
 * whatever this script logged.
 *
 * WHAT THE SHARING SETTING MEANS. "Anyone with the link can view" is the
 * intended state, not a shortcut: a paying teacher is gated on their
 * APCSExamPrep teacher token and not on a Google account, so Google cannot do
 * the gating. HOLDING THE FILE ID IS HOLDING ACCESS. routes/slides.js is the
 * only thing that may disclose one, and never to an unentitled caller. VIEW,
 * never EDIT: a writable link would let any holder change the deck every other
 * teacher sees.
 *
 * copyRequiresWriterPermission is deliberately left alone, so File > Make a
 * copy keeps working. It is the only editable path a cyber teacher has,
 * because these decks are never uploaded to Shopify.
 * ---------------------------------------------------------------------------
 */

// [label, fileId], generated from config/cyber-slide-embeds.js.
var DECKS = [
  ['1-1 day1 teacher', '18DOf5jxS6o-p6ZN-uh5gMihXvb2PXgIVB-t4Buel7So'],
  ['1-1 day1 student', '1UPiOXdqGnnDRwMAMi9BTLAarB1r0A8kc21TLSutIEwI'],
  ['1-1 day2 teacher', '17kgzSTPECZByjfKmoq4dnQfx8AQ91REER8OQuizj6hk'],
  ['1-1 day2 student', '1FIXWRaE5tYpWCa5RbqfHOJ_3V6KMZWeBivd8Rzt3YMU'],
  ['1-2 day1 teacher', '12NRg-oYj3t4ncGl9Qj0pZirj8xWKbc2boJmJ7kTrEMw'],
  ['1-2 day1 student', '1sFWNZ3uWlQv4SFGKhCNDEe5ETENgtH9iJKvBiSB0um0'],
  ['1-2 day2 teacher', '1xmM43Ho6J12AViAxVaYxXARI0BGt7iTZxlcIbSBUJNY'],
  ['1-2 day2 student', '1KyOBHEqmtgbxT4EhKQ7jb5ndFSQiHmdvGMnGsPM-jcc'],
  ['1-2 day3 teacher', '11NITPtdIueiU451bnTa44f2cjJ3VOTI5vlxbp-mu2_c'],
  ['1-2 day3 student', '1_IWySQ-bNqa9UPsKYgdrYMlGd6hLRwgNNA0-snUpCFU'],
  ['1-2 day4 teacher', '1K6_3ELhnGhEhDBSZfWjQhOGrOEuxWLfwo61f2K2XMJ8'],
  ['1-2 day4 student', '1_bgU3Mqq8b4RhqaffHgk78m0osY8QLZ6yRAgbK6AKF0'],
  ['1-3 day1 teacher', '1F3qh0TJWYy6tDNJkcjrtF3i6vaQOmZL0Xam-9rspP4o'],
  ['1-3 day1 student', '1geJDWVBfnT9Qj55v-sIGltbQ9kyi2KnVJ8h28Z_aTWQ'],
  ['1-3 day2 teacher', '15jzyJg4U6SBSYKFoMwi0nIs63uNfLGiSq5JJzKo1S9E'],
  ['1-3 day2 student', '140sxN5Co0nKVAskZrkIlP4c6MlsD43jvlnx-54ZxB6o'],
  ['1-3 day3 teacher', '1K2yZUr2RxQrIM34gEeWZopJzR7kbf7OfJM_fySeT8r8'],
  ['1-3 day3 student', '1e_REM5lM8UCLsGdOCal8evMqOamSyvMv276yixf1ipE'],
  ['1-3 day4 teacher', '1nLs0vkIUiEtVxPEyg8kI9pjtEzKrD5BoxxLdAfeJEDI'],
  ['1-3 day4 student', '1NJhNV7tv1fZ9dGzgPI3dhReF28s7TrtWmlj6UrEI3KA'],
  ['1-4 day1 teacher', '1FQdjdBoI6rhlRKg5Pj4MDCk8JyKRB5rKFDLUHpXXuYo'],
  ['1-4 day1 student', '1HveKbejnq8rp6gRa_MrX1hR2K1oFwRWUovnm_o9_5QA'],
  ['1-4 day2 teacher', '1RV6K9gz30shgh0TQmTs-3iwREB0err-15g2Mm1nbIKE'],
  ['1-4 day2 student', '179Y6cDAMup2jq2qw-K_yjzB78jMOAivn-SC_jYCz57c'],
  ['1-5 day1 teacher', '1A0L2SBSvglhrvJ37ubpKJIHtt-2lAV1F4RDAusgADFU'],
  ['1-5 day1 student', '1JRtjsII4nCRl09bfJdoCFFW439iRcH17pebZ2w9ncoY'],
  ['1-5 day2 teacher', '1CHD2hrRTbO_psHxXwEbd-MhtQCC8bOnm9VB_f2qNNKc'],
  ['1-5 day2 student', '1Qnk55DBWVI3qc1fDbXs2AesL5CHrwrBJRQiWVp481ds'],
  ['2-1 day1 teacher', '133-iR56x_v8C2bdtzdbUSF-9Wtn2tZCdCWCNI1BS68U'],
  ['2-1 day1 student', '1Uhu0SLp6vKXqMuRN_YCpmfT8yQCoASGWnPlmfKuizLE'],
  ['2-1 day2 teacher', '1FTKWPnyWRg8K0JfwPOcsX-2W9x65ISeXdr0P6I_u8cU'],
  ['2-1 day2 student', '1N0ZRtWP3a12fyGQsDf2vwxPvKXWAfsUtawXuKZ5fsmY'],
  ['2-1 day3 teacher', '1Nf9BwnyS5wIYX7zo0caeoaZGJWyZzjbXa2m1bfO90gk'],
  ['2-1 day3 student', '1uqHGypiydbsGeF983eoLfHxQuGbc3zJavS5-8fbToCk'],
  ['2-1 day4 teacher', '12MnOArF62QxL9VZslZFVRQA4Pdfo9gdoJsbtJGCANWU'],
  ['2-1 day4 student', '10_EYUMuzK0Vlv3K7e0WAs5fxCbLMetlXQQNqahsXNNw'],
  ['2-1 day5 teacher', '18J-mxHuUl54s8FqnH3tFZDMzz8po87u1sWVu6X5_AkY'],
  ['2-1 day5 student', '1hhBkNqfPJetGI68BWUL0lwZYWZ957o4U2MT3OuXyHrU'],
  ['2-1 day6 teacher', '1Nco1HvFtipHiZ6NSaw7oXrUiWoN7itGlafADxbIRYVI'],
  ['2-1 day6 student', '1iGEvKrZ5Wn9OHsAsrmQU5AEPfdQppRuTXARHPZ5e3us'],
  ['2-1 day7 teacher', '18C4spyxRQssUMIiPO0U7jgdVDGWPdj4slctjYs_CJ_E'],
  ['2-1 day7 student', '1yOjBWIpXYjW79eZzsaBEeRtv0Y1CNOoWVZMRKfX7aks'],
  ['2-1 day8 teacher', '1Ir5h2065yzmckiDjdq5uklBTOHDWyrugLm5BItZO6ps'],
  ['2-1 day8 student', '1o3HFBcxa6KhqI0qlde_2NPeIUL7UuhXtPY0csz6TYH0'],
  ['2-2 day1 teacher', '1mFvM1iRwxCz21H4cWIw2Ebx2j5f5mpBVSLWmrpoPct4'],
  ['2-2 day1 student', '1m354_vVbcNCGHSm8saHwP67feHJTWho0h4XTL1XD9dM'],
  ['2-2 day2 teacher', '1haScAh5VcU_-GND6uzlrPGCXPaR6tPKliKdD4hTOqNI'],
  ['2-2 day2 student', '1RJKr-lCWy_w5dAjiYM24BUpEiYHd0z6ND5uY7pEfYEE'],
  ['2-2 day3 teacher', '1kYMf6OkoP1JgFjCJPjFHbJCmOgEapICNqP6iQ6RhGrk'],
  ['2-2 day3 student', '1x_Z6hUNVV0F9kgb7Necd_pRxfQ8wthCYMz2dSfRWefg'],
  ['2-2 day4 teacher', '1scbjGCqxwOOXUn35GuEwzTBbsXXqVIe0m9e2FHeqWZg'],
  ['2-2 day4 student', '1kPCofh-itC3W8uuhYSmyMq1_Ezm5cJJ9YskPOFIvvDI'],
  ['2-2 day5 teacher', '1lXpyvj1w0l-gkoTPaGQmda_MExbokBuK4BkZP47qjh0'],
  ['2-2 day5 student', '1PG0sQyJbUc-g-8WZ7iyURGIE0eyB09wSZD_y4DxY6gQ'],
  ['2-3 day1 teacher', '1KNarPOx6QnaUgGDtg-eAUTeX57SWP44qFRGQcRXmuuo'],
  ['2-3 day1 student', '1Cw4OgGl_UZZq5nx69iTNgi0D9BNJVwzEdnwKeXxgKwo'],
  ['2-3 day2 teacher', '12rY48PTHZwaVpkLtY8peOLGYIGG-KuOxN9YebSGSM8k'],
  ['2-3 day2 student', '1__9tHOKeJgX-jhc23sikS94B-bYngC0htrt4CBf_IDM'],
  ['2-3 day3 teacher', '185u18uqAWaYRynNylqz7p8Iz36BLhCpJaZ-jZlmQnuw'],
  ['2-3 day3 student', '1CQ3DKrthlVOUlvvCFSLf0gD-Tc4Q3Dy78xhlfyBts3Y'],
  ['2-3 day4 teacher', '1rjoUGmzz1n9DgUzAwUIT8XtzjdkoJx_-cD7-1aeA6AM'],
  ['2-3 day4 student', '15A7fXG_WqtvQT7WUDi1HqWuvLoKIDY5E76oQDuxe_l4'],
  ['2-4 day1 teacher', '1N4fKGjSFjxqApbubOU6gu4Qg6iJzVNsIulkpUOQe0n8'],
  ['2-4 day1 student', '1Eyz6t3_mFhSGvQZpOUsUmw29NqpJWX9oPeD3uqz3Q7U'],
  ['2-4 day2 teacher', '1V-KFAwEOUxg_G1YKeti0R-z7_GeAMHFGv4NKceITRJA'],
  ['2-4 day2 student', '1fOsWVeKJjOQv8zalgA2Vq0d71dbtqjs5lsvq4zxqyEw'],
  ['2-4 day3 teacher', '1nB5p8LP6qD14QpnX7xMOs757wKTK21uPDfZ3lCp_QTA'],
  ['2-4 day3 student', '16DdiaZg6uihoITpu1sjOVw98Ppus-8cNVF4D13Zofvw'],
  ['2-4 day4 teacher', '1WZizo2eoX94je3AiRxXSeNXQ4pjjOK1C09mZ1ykRPFc'],
  ['2-4 day4 student', '1X2YT8WpoQKzkUcA5TjnSHtouGpaRuWtCdKntFHd89iM'],
];

// Apps Script kills a run at 6 minutes. Stop well short and resume.
var TIME_BUDGET_MS = 4.5 * 60 * 1000;
var RESUME_KEY = 'cyberReshareNextIndex';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * The state we want, read back from Drive rather than assumed.
 * Returns 'open', 'closed', or 'error:<message>'.
 */
function sharingState_(id) {
  try {
    var f = DriveApp.getFileById(id);
    var access = f.getSharingAccess();
    var perm = f.getSharingPermission();
    var anyone = (access === DriveApp.Access.ANYONE_WITH_LINK ||
                  access === DriveApp.Access.ANYONE);
    if (!anyone) return 'closed';
    if (perm === DriveApp.Permission.VIEW) return 'open';
    // Reachable, and therefore invisible to the anonymous fetch check, but
    // anyone holding the link could edit the deck every other teacher
    // projects. Treating this as "already fine" and skipping it is how a
    // writable link would survive a repair run, so it gets its own state and
    // start() tightens it back to VIEW.
    return 'writable';
  } catch (e) {
    return 'error:' + (e && e.message ? e.message : String(e));
  }
}

// ---------------------------------------------------------------------------
// preview: reads everything, writes nothing
// ---------------------------------------------------------------------------

function preview() {
  Logger.log('PREVIEW. Nothing is modified by this function.');
  Logger.log('decks in the generated list: ' + DECKS.length);

  var open = 0, closed = 0, writable = 0, errored = 0;
  var badSamples = [];

  for (var i = 0; i < DECKS.length; i++) {
    var label = DECKS[i][0], id = DECKS[i][1];
    var st = sharingState_(id);
    if (st === 'open') {
      open++;
    } else if (st === 'closed') {
      closed++;
      if (badSamples.length < 10) badSamples.push('closed    ' + label + '  ' + id);
    } else if (st === 'writable') {
      writable++;
      if (badSamples.length < 10) badSamples.push('writable  ' + label + '  ' + id);
    } else {
      errored++;
      if (badSamples.length < 10) badSamples.push(st + '  ' + label + '  ' + id);
    }
  }

  Logger.log('already view-only  : ' + open);
  Logger.log('closed, need fixing: ' + closed);
  Logger.log('open but WRITABLE  : ' + writable);
  Logger.log('unreadable         : ' + errored);
  if (badSamples.length) {
    Logger.log('');
    Logger.log('sample of what is not open:');
    for (var j = 0; j < badSamples.length; j++) Logger.log('  ' + badSamples[j]);
  }

  if (errored > 0) {
    Logger.log('');
    Logger.log('Some files could not be read at all. Run diagnose() before start():');
    Logger.log('an unreadable file usually means the script is running as an account');
    Logger.log('that does not own it, and start() cannot fix that.');
  } else if (closed === 0 && writable === 0) {
    Logger.log('');
    Logger.log('Every deck already reads back as anyone-with-link, view only, so start()');
    Logger.log('has nothing to do. If teachers still get Request access, do NOT run');
    Logger.log('start(): it would change nothing and would look like a fix. The cause is');
    Logger.log('elsewhere. Re-run npm run verify:sharing ap-cybersecurity and compare.');
  } else {
    Logger.log('');
    Logger.log('Run start() to repair ' + (closed + writable) + ' deck(s): ' + closed +
               ' closed, ' + writable + ' writable.');
    if (writable) {
      Logger.log('The writable ones are reachable, so the anonymous fetch check calls them');
      Logger.log('fine. They still need tightening: a link anyone can edit is a deck any');
      Logger.log('holder can change for every teacher using it.');
    }
  }
}

// ---------------------------------------------------------------------------
// start: the repair
// ---------------------------------------------------------------------------

function start() {
  var began = new Date().getTime();
  var props = PropertiesService.getScriptProperties();
  var from = parseInt(props.getProperty(RESUME_KEY) || '0', 10);
  if (isNaN(from) || from < 0 || from >= DECKS.length) from = 0;

  Logger.log('work list: ' + (DECKS.length - from) + ' deck(s) to check, starting at index ' + from +
             ' of ' + DECKS.length);

  var fixed = 0, already = 0, failed = 0;
  var failures = [];
  var i;

  for (i = from; i < DECKS.length; i++) {
    if (new Date().getTime() - began > TIME_BUDGET_MS) {
      props.setProperty(RESUME_KEY, String(i));
      Logger.log('');
      Logger.log('TIME BUDGET REACHED at index ' + i + '. Progress is saved.');
      Logger.log('Run start() again to continue from here.');
      summarise_(fixed, already, failed, failures, false);
      return;
    }

    var label = DECKS[i][0], id = DECKS[i][1];

    // Skip what is already correct, so a re-run is cheap and an interrupted
    // run resumes without re-writing permissions that already took.
    var before = sharingState_(id);
    if (before === 'open') {
      already++;
      continue;
    }
    if (before.indexOf('error:') === 0) {
      failed++;
      failures.push(label + '  ' + id + '  unreadable: ' + before.slice(6));
      continue;
    }

    try {
      DriveApp.getFileById(id).setSharing(
        DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      failed++;
      failures.push(label + '  ' + id + '  setSharing threw: ' +
                    (e && e.message ? e.message : String(e)));
      continue;
    }

    // The read-back. This is the whole reason this script exists rather than a
    // second call to the conversion: a write that is not read back is a claim.
    var after = sharingState_(id);
    if (after === 'open') {
      fixed++;
      Logger.log('  ' + (before === 'writable' ? 'tightened' : 'opened   ') + '  ' + label);
    } else {
      failed++;
      failures.push(label + '  ' + id + '  write returned cleanly but reads back ' + after);
    }
  }

  props.deleteProperty(RESUME_KEY);
  summarise_(fixed, already, failed, failures, true);
}

function summarise_(fixed, already, failed, failures, complete) {
  Logger.log('');
  Logger.log('fixed now        : ' + fixed);
  Logger.log('already correct  : ' + already);
  Logger.log('FAILED           : ' + failed);

  if (failures.length) {
    Logger.log('');
    Logger.log('failures:');
    for (var i = 0; i < failures.length && i < 30; i++) Logger.log('  ' + failures[i]);
    if (failures.length > 30) Logger.log('  ...and ' + (failures.length - 30) + ' more');
    Logger.log('');
    Logger.log('A failure here is information, not noise. Run diagnose(): if the message');
    Logger.log('mentions a policy or a domain restriction, an admin setting is blocking');
    Logger.log('link sharing and no amount of re-running will move it.');
  }

  if (!complete) return;

  Logger.log('');
  if (failed === 0) {
    Logger.log('This script now believes every deck is open.');
    Logger.log('That is Google reporting on Google. Confirm it from outside, with no');
    Logger.log('credentials at all, before telling anyone it is fixed:');
    Logger.log('');
    Logger.log('    npm run verify:sharing ap-cybersecurity');
    Logger.log('');
    Logger.log('It must print ' + DECKS.length + '/' + DECKS.length + ' reachable.');
  } else {
    Logger.log('NOT DONE. ' + failed + ' deck(s) still need access fixed, so teachers on');
    Logger.log('those lessons keep hitting Request access.');
  }
}

// ---------------------------------------------------------------------------
// diagnose: why a failure is happening, not just that it is
// ---------------------------------------------------------------------------

function diagnose() {
  var n = Math.min(3, DECKS.length);
  Logger.log('DIAGNOSE. Reads only, first ' + n + ' deck(s).');
  Logger.log('running as: ' + Session.getEffectiveUser().getEmail());
  Logger.log('');

  for (var i = 0; i < n; i++) {
    var label = DECKS[i][0], id = DECKS[i][1];
    Logger.log(label + '  ' + id);
    try {
      var f = DriveApp.getFileById(id);
      Logger.log('  name            : ' + f.getName());
      try {
        var owner = f.getOwner();
        Logger.log('  owner           : ' + (owner ? owner.getEmail() : '(none: shared drive)'));
      } catch (e) {
        Logger.log('  owner           : unreadable (' + e.message + ')');
      }
      Logger.log('  sharing access  : ' + f.getSharingAccess());
      Logger.log('  sharing perm    : ' + f.getSharingPermission());
      var viewers = f.getViewers().map(function (u) { return u.getEmail(); });
      var editors = f.getEditors().map(function (u) { return u.getEmail(); });
      Logger.log('  named viewers   : ' + (viewers.length ? viewers.join(', ') : '(none)'));
      Logger.log('  named editors   : ' + (editors.length ? editors.join(', ') : '(none)'));
    } catch (e) {
      Logger.log('  UNREADABLE: ' + (e && e.message ? e.message : String(e)));
      Logger.log('  If this says the file does not exist, the account above does not have');
      Logger.log('  access to it. Check which Google account the script project belongs to.');
    }
    Logger.log('');
  }

  Logger.log('An owner of "(none: shared drive)" matters: a shared drive can forbid');
  Logger.log('"anyone with the link" at the drive level, and then setSharing fails for');
  Logger.log('every file in it no matter who runs this. That is an admin setting on the');
  Logger.log('drive, not something this script can route around.');
}

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

function reset() {
  PropertiesService.getScriptProperties().deleteProperty(RESUME_KEY);
  Logger.log('Resume pointer cleared. No file was modified and nothing was deleted.');
}
