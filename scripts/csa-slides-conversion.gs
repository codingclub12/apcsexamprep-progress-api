/**
 * AP CSA: convert the Units 2-4 .pptx decks to Google Slides, share them, and
 * write a map sheet.
 *
 * WHY THIS IS AN APPS SCRIPT AND NOT PART OF THE REPO'S NODE TOOLING.
 * Two operations need Tanner's own Google credentials and cannot be done from
 * a Claude session. Both were established on the AP CSP build and re-confirmed
 * on 2026-09-04 rather than assumed:
 *
 *   1. Sharing "anyone with the link". The Drive connector's share_file takes
 *      an email address and a reader/writer role; the `anyone` permission type
 *      is unreachable through it.
 *   2. Uploading. Files travel as base64 inside tool calls. The 152 CSA decks
 *      are 9 MB, which is roughly 3M tokens of tool traffic and 152 separate
 *      calls, so the agent cannot put them in Drive either.
 *
 * So the split is the same one cyber and CSP use: the agent does the parts
 * needing judgement (building the decks, validating them, the config
 * generator, the gate), and this script does the parts needing the account.
 *
 * ---------------------------------------------------------------------------
 * BEFORE YOU RUN THIS
 *
 *   1. Build the kit:  python3 scripts/build-csa-teacher-kit.py --unit 2 \
 *                        --out build/csa-kit      (repeat for 3 and 4)
 *      Or use the zip the session handed you, which is the same 418 files.
 *   2. Upload the Unit_2, Unit_3 and Unit_4 folders into ONE Drive folder.
 *      Keep the tree exactly as built:
 *        Unit_2/Lesson_2.1_Algorithms_with_Selection_and_Repetition/
 *               Slide_Decks/Day1_Deck_TEACHER.pptx
 *      This script reads those names and will refuse anything it cannot parse
 *      rather than guess.
 *   3. Put that folder's id in ROOT_FOLDER_ID below. It is the long string in
 *      the folder's URL after /folders/.
 *
 * SETUP
 *   1. script.google.com, new project, paste this file in.
 *   2. Services + > Drive API > v3 > Add.  (v3, not v2: this uses `name`.)
 *   3. Run preview() first and authorise when prompted.
 *
 * RUN ORDER, AND WHY PREVIEW IS NOT OPTIONAL
 *   preview()   Counts what it WOULD convert and writes nothing. It should
 *               report 152 decks across 76 days: Unit 2 is 24 days, Unit 3 is
 *               18, Unit 4 is 34. If your totals differ, stop and find out why
 *               before converting: either the upload is incomplete or the
 *               folder names drifted.
 *   start()     Converts in batches under a time budget and is safe to re-run.
 *               The SHEET is the progress record, so a re-run picks up where
 *               it left off rather than making duplicates.
 *
 * AFTER IT FINISHES
 *   File > Download > CSV on the "AP CSA Slides Map" sheet, then:
 *     node scripts/csa-slide-embeds-from-csv.js <that.csv>            (check)
 *     node scripts/csa-slide-embeds-from-csv.js <that.csv> --write    (apply)
 *   That generator refuses a sheet with a duplicate file id, because a shared
 *   id is how a student ends up holding a teacher deck.
 *
 * A CSA TEACHER DECK IS WORTH MORE THAN A CSP ONE TO LEAK. Its speaker notes
 * carry the answers to that day's warm-up and its "now break it" slide, and the
 * kit derives that evening's graded debugging exercise from the same bug.
 */

// The Drive folder holding the uploaded Unit_2 / Unit_3 / Unit_4 tree.
// THERE IS NO DEFAULT ON PURPOSE. The cyber script could hardcode its folder
// because that folder already existed; this one is created by the upload in
// step 2 above, so a hardcoded id here would point at somebody else's folder
// or at nothing. preview() refuses to run until this is set.
var ROOT_FOLDER_ID = 'PUT_THE_FOLDER_ID_HERE';

// Only these units. See the header before adding 3, 4 or 5.
var UNITS = [2, 3, 4];

var OUTPUT_FOLDER_NAME = 'AP CSA Slides (converted)';
var SHEET_NAME = 'AP CSA Slides Map';
var HEADER = ['lesson', 'day', 'variant', 'sourceName', 'slidesId', 'embedUrl', 'status'];

// Apps Script kills a run at 6 minutes. Stop well before that and schedule a
// continuation, so a long run finishes on its own rather than dying mid-deck.
var TIME_BUDGET_MS = 4.5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------

/**
 * Fail loudly, once, if the project is not set up to convert anything.
 *
 * This exists because the first real run produced seventy identical rows
 * reading "FAILED: ReferenceError: Drive is not defined". Every one of them was
 * the same missing setup step, and the run had to be diagnosed from the sheet
 * because the log only said "converted 0, failed 70". One clear error before
 * any work starts is worth more than seventy after it.
 *
 * `Drive` is the ADVANCED Drive service, which is not enabled by default and is
 * not the same thing as `DriveApp`. DriveApp cannot convert a .pptx to Slides
 * at all, so there is no fallback to take: without the advanced service this
 * script simply cannot do its job, and should say so rather than try.
 */
function preflight_() {
  // ROOT_FOLDER_ID has no sensible default for this course (see its comment),
  // so an unset one is the single most likely way to run this script wrongly.
  // Caught here rather than left to DriveApp, whose error for a bad id is
  // "No item with the given ID could be found", which reads like a permissions
  // problem and sends you looking in the wrong place.
  if (!ROOT_FOLDER_ID || ROOT_FOLDER_ID === 'PUT_THE_FOLDER_ID_HERE') {
    throw new Error(
      'ROOT_FOLDER_ID is not set.\n' +
      'Upload the Unit_2 / Unit_3 / Unit_4 folders into one Drive folder, open\n' +
      'that folder, and copy the id out of its URL: the long string after\n' +
      '/folders/. Paste it into ROOT_FOLDER_ID at the top of this script.');
  }
  if (typeof Drive === 'undefined') {
    throw new Error(
      'The Advanced Drive Service is not enabled, so nothing can be converted.\n' +
      'In the Apps Script editor: Services (the + beside it in the left rail),\n' +
      'choose "Drive API", set Version to v3, leave the identifier as "Drive",\n' +
      'then Add. Re-run preview() to confirm, then start().\n' +
      'Note v3 specifically: this script sends "name", which v2 does not accept.');
  }
  if (!Drive.Files || typeof Drive.Files.copy !== 'function') {
    throw new Error(
      'The Advanced Drive Service is enabled but Drive.Files.copy is missing.\n' +
      'That usually means the wrong version was added. Remove the service and\n' +
      're-add "Drive API" at version v3.');
  }
}

// ---------------------------------------------------------------------------
// Enumeration
// ---------------------------------------------------------------------------

function folderNamed_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : null;
}

function childFolders_(parent) {
  var out = [], it = parent.getFolders();
  while (it.hasNext()) out.push(it.next());
  return out;
}

/**
 * Every deck this script considers in scope, as
 * {lesson:'1-2', day:3, variant:'TEACHER', fileId, fileName}.
 *
 * Folder names are Lesson_1.2_Something; the API speaks 1-2, so the dot is
 * normalised here and nowhere else. Deck files are Day<K>_Deck_STUDENT.pptx
 * with STUDENT and TEACHER uppercase; the AP CSP decks use "Student", so a
 * regex copied from that build matches nothing here.
 */
function enumerateDecks_() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var decks = [];
  var problems = [];

  childFolders_(root).forEach(function (unitFolder) {
    // The CSA kit names these `Unit_2`, with no trailing title, where the
    // cyber tree used `Unit_2_Securing_Spaces`. Accept both.
    var um = unitFolder.getName().match(/^Unit_(\d+)(?:_|$)/);
    if (!um) return;
    var unit = parseInt(um[1], 10);
    if (UNITS.indexOf(unit) === -1) return;

    childFolders_(unitFolder).forEach(function (lessonFolder) {
      var lm = lessonFolder.getName().match(/^Lesson_(\d+)\.(\d+)_/);
      if (!lm) { problems.push('unparsed lesson folder: ' + lessonFolder.getName()); return; }
      var lesson = lm[1] + '-' + lm[2];

      var slides = folderNamed_(lessonFolder, 'Slide_Decks');
      if (!slides) { problems.push('no Slide_Decks in ' + lessonFolder.getName()); return; }

      var files = slides.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        var name = f.getName();
        var dm = name.match(/^Day(\d+)_Deck_(STUDENT|TEACHER)\.pptx$/);
        if (!dm) { problems.push('unexpected file: ' + lessonFolder.getName() + '/' + name); continue; }
        decks.push({
          lesson: lesson,
          day: parseInt(dm[1], 10),
          variant: dm[2],
          fileId: f.getId(),
          fileName: name
        });
      }
    });
  });

  decks.sort(function (a, b) {
    var pa = a.lesson.split('-').map(Number), pb = b.lesson.split('-').map(Number);
    return (pa[0] - pb[0]) || (pa[1] - pb[1]) || (a.day - b.day)
        || a.variant.localeCompare(b.variant);
  });
  return { decks: decks, problems: problems };
}

/** Counts what start() would convert. Writes nothing. */
function preview() {
  preflight_();
  var found = enumerateDecks_();
  var byLesson = {}, byUnit = {};

  found.decks.forEach(function (d) {
    byLesson[d.lesson] = (byLesson[d.lesson] || 0) + 1;
    var u = d.lesson.split('-')[0];
    byUnit[u] = (byUnit[u] || 0) + 1;
  });

  var lessons = Object.keys(byLesson).sort();
  var lines = ['PREVIEW (nothing has been converted)', ''];

  lessons.forEach(function (l) {
    var decks = byLesson[l];
    lines.push('  ' + l + ':  ' + decks + ' decks  (' + (decks / 2) + ' days)'
      + (decks % 2 ? '   <-- ODD COUNT, a STUDENT/TEACHER pair is incomplete' : ''));
  });

  lines.push('');
  Object.keys(byUnit).sort().forEach(function (u) {
    lines.push('  Unit ' + u + ':  ' + byUnit[u] + ' decks');
  });
  lines.push('');
  lines.push('  lessons: ' + lessons.length);
  lines.push('  decks  : ' + found.decks.length);
  lines.push('');
  lines.push('  EXPECTED: 9 lessons, 70 decks (35 days x 2 variants).');
  lines.push(found.decks.length === 70 && lessons.length === 9
    ? '  MATCHES the independent enumeration. Safe to run start().'
    : '  DOES NOT MATCH. Stop and reconcile before running start().');

  if (found.problems.length) {
    lines.push('');
    lines.push('  files and folders skipped (' + found.problems.length + '):');
    found.problems.slice(0, 20).forEach(function (p) { lines.push('    ' + p); });
    if (found.problems.length > 20) {
      lines.push('    ...and ' + (found.problems.length - 20) + ' more');
    }
  }

  Logger.log(lines.join('\n'));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

function outputFolder_() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  return folderNamed_(root, OUTPUT_FOLDER_NAME) || root.createFolder(OUTPUT_FOLDER_NAME);
}

function sheet_() {
  var folder = outputFolder_();
  var it = folder.getFilesByName(SHEET_NAME);
  var ss;
  if (it.hasNext()) {
    ss = SpreadsheetApp.open(it.next());
  } else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    var file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    var sheet = ss.getActiveSheet();
    // Column A holds lesson ids like 1-1 and 2-4, every one of which Sheets
    // would otherwise read as a month-day date. Forcing plain text keeps the
    // written value and the read value the same string.
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.appendRow(HEADER);
  }
  return ss.getActiveSheet();
}

/**
 * Read a lesson id back from the sheet as the string it was written as.
 *
 * THIS IS THE BUG THAT RE-CONVERTED EVERYTHING. Every lesson id in Units 1
 * and 2 is also a valid month-day: 1-1 is January 1, 2-4 is February 4, and
 * so on for all nine. Google Sheets parses those on write, so appendRow's
 * '1-1' is stored as a Date and getValues() hands back a Date object. The
 * resume key then read "Thu Jan 01 2026 00:00:00 GMT-0500|1|STUDENT" and
 * never matched the "1-1|1|STUDENT" built from Drive.
 *
 * Nothing errored. alreadyDone_ returned a full set of keys, none of which
 * matched anything, so every run believed all 70 decks were both already done
 * AND still to do, and converted all 70 again. The giveaway was the work-list
 * line reading "70 to convert, 70 already done, 70 total", which cannot be
 * true at once.
 *
 * Two defences, because either alone is not enough. sheet_() now formats
 * column A as plain text so new sheets never coerce, and this recovers the
 * id from a Date for sheets already written the old way: month and day map
 * straight back to unit and lesson.
 */
function normLesson_(v) {
  if (v instanceof Date) return (v.getMonth() + 1) + '-' + v.getDate();
  return String(v).trim();
}

/**
 * Remove previous non-OK rows for the decks about to be retried.
 *
 * Rows were only ever appended, and alreadyDone_ tracks OK rows alone, so a
 * failed run left its rows behind and the next attempt appended a fresh set
 * next to them. The first real run did exactly that: seventy failures, then
 * seventy more, one hundred and forty rows describing seventy decks. The
 * generator survives it (a non-OK row simply is not converted) but every
 * retry doubles the noise, and a sheet that grows on failure is a sheet
 * nobody trusts.
 *
 * OK rows are never touched. Only rows for decks in this run's work list are
 * touched, so an unrelated failure recorded earlier stays visible.
 */
function clearStaleRows_(sh, todo) {
  var last = sh.getLastRow();
  if (last < 2 || !todo.length) return 0;

  var wanted = {};
  for (var t = 0; t < todo.length; t++) {
    wanted[todo[t].lesson + '|' + todo[t].day + '|' + todo[t].variant] = true;
  }

  var rows = sh.getRange(2, 1, last - 1, HEADER.length).getValues();
  var removed = 0;
  // Bottom up: deleting a row shifts everything below it, so walking upward
  // means the indices of the rows still to inspect never move.
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][6]).trim() === 'OK') continue;
    var key = normLesson_(rows[i][0]) + '|' + rows[i][1] + '|' + String(rows[i][2]).toUpperCase();
    if (!wanted[key]) continue;
    sh.deleteRow(i + 2);      // +2: one for the header, one for 1-based rows
    removed++;
  }
  return removed;
}

/** lesson|day|variant -> true, for every row already recorded OK. */
function alreadyDone_(sh) {
  var done = {};
  var last = sh.getLastRow();
  if (last < 2) return done;
  var rows = sh.getRange(2, 1, last - 1, HEADER.length).getValues();
  rows.forEach(function (r) {
    if (String(r[6]).trim() === 'OK') {
      done[normLesson_(r[0]) + '|' + r[1] + '|' + String(r[2]).toUpperCase()] = true;
    }
  });
  return done;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Copy one .pptx into Google Slides format, share it, return its id.
 * Conversion is the copy itself: asking Drive for a copy whose mimeType is
 * Slides is what performs it.
 */
function convertOne_(deck, destFolderId) {
  var copied = Drive.Files.copy(
    {
      name: 'AP-CYBER_' + deck.lesson + '_Day' + deck.day + '_Deck_' + deck.variant,
      mimeType: MimeType.GOOGLE_SLIDES,
      parents: [destFolderId]
    },
    deck.fileId
  );

  // The operation Claude cannot perform. VIEW, not EDIT: the link is going to
  // be handed to teachers, and a writable link would let any holder change the
  // deck every other teacher sees.
  //
  // copyRequiresWriterPermission is left alone on purpose, so File > Make a
  // copy stays available. It is the only editable path for these decks.
  DriveApp.getFileById(copied.id).setSharing(
    DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return copied.id;
}

function embedUrl_(id) {
  return 'https://docs.google.com/presentation/d/' + id + '/embed?start=false&loop=false';
}

/** Convert everything not yet done, resuming automatically if time runs out. */
function start() {
  // Before anything is created or written. A setup failure must not leave a
  // folder, a sheet and seventy rows of identical errors behind it.
  preflight_();

  var began = new Date().getTime();
  var sh = sheet_();
  var dest = outputFolder_().getId();

  var found = enumerateDecks_();
  var done = alreadyDone_(sh);
  var todo = found.decks.filter(function (d) {
    return !done[d.lesson + '|' + d.day + '|' + d.variant];
  });

  // Always emit the work list first. During the CSP build a pasted log claimed
  // "converted OK: 224" one minute after "nothing recorded yet", with no work
  // list line above it. That line is what makes such a log checkable.
  Logger.log('work list: ' + todo.length + ' deck(s) to convert, '
    + Object.keys(done).length + ' already done, ' + found.decks.length + ' total');

  var cleared = clearStaleRows_(sh, todo);
  if (cleared) {
    Logger.log('cleared ' + cleared + ' row(s) from an earlier failed attempt at these decks');
  }

  if (!todo.length) {
    removeTriggers_();
    Logger.log('nothing left to do.');
    return;
  }

  var converted = 0, failed = 0;
  for (var i = 0; i < todo.length; i++) {
    if (new Date().getTime() - began > TIME_BUDGET_MS) {
      scheduleContinue_();
      Logger.log('time budget reached after ' + converted + ' deck(s). '
        + 'A continuation trigger will pick up the remaining ' + (todo.length - i) + '.');
      return;
    }

    var d = todo[i];
    try {
      var id = convertOne_(d, dest);
      sh.appendRow([d.lesson, d.day, d.variant, d.fileName, id, embedUrl_(id), 'OK']);
      converted++;
    } catch (e) {
      // Recorded rather than thrown: one bad deck must not abandon the other
      // 69. The generator treats a non-OK row as "not converted", which is a
      // survivable state.
      sh.appendRow([d.lesson, d.day, d.variant, d.fileName, '', '', 'FAILED: ' + e]);
      failed++;
    }
  }

  removeTriggers_();
  Logger.log('run complete. converted ' + converted + ', failed ' + failed + '.');
  Logger.log('Now: File > Download > CSV on the sheet, then in the repo run');
  Logger.log('  node scripts/cyber-slide-embeds-from-csv.js <export.csv>');
  Logger.log('and re-run with --write once it reports no refusals.');
}

// ---------------------------------------------------------------------------
// Continuation and housekeeping
// ---------------------------------------------------------------------------

function scheduleContinue_() {
  removeTriggers_();
  ScriptApp.newTrigger('start').timeBased().after(60 * 1000).create();
}

function removeTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'start') ScriptApp.deleteTrigger(t);
  });
}

/** What the sheet currently holds. Not a substitute for checking Drive. */
function report() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) { Logger.log('sheet is empty.'); return; }

  var rows = sh.getRange(2, 1, last - 1, HEADER.length).getValues();
  var okRows = rows.filter(function (r) { return String(r[6]).trim() === 'OK'; });
  var ids = {};
  var dupes = 0;
  okRows.forEach(function (r) {
    if (ids[r[4]]) dupes++;
    ids[r[4]] = true;
  });

  Logger.log('rows      : ' + rows.length);
  Logger.log('OK        : ' + okRows.length);
  Logger.log('failed    : ' + (rows.length - okRows.length));
  Logger.log('unique ids: ' + Object.keys(ids).length + (dupes ? '  <-- ' + dupes + ' DUPLICATE ID(S)' : ''));
  Logger.log('');
  Logger.log('This is the script reporting on itself. It is not evidence.');
  Logger.log('Confirm against Drive and against a credential-free fetch of an');
  Logger.log('embed URL before treating the conversion as done.');
}

function reset() {
  removeTriggers_();
  Logger.log('continuation triggers removed. Converted files and the sheet are untouched.');
  Logger.log('The sheet is the progress record, so start() will still skip what is already OK.');
  Logger.log('To genuinely start over, delete the sheet rows you want re-converted.');
}
