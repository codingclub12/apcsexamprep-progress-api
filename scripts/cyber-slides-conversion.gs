/**
 * AP CYBERSECURITY: convert the Units 1-2 .pptx decks to Google Slides,
 * share them, and write a map sheet.
 *
 * WHY THIS IS AN APPS SCRIPT AND NOT PART OF THE REPO'S NODE TOOLING.
 * Two operations need Tanner's own Google credentials and cannot be done from
 * a Claude session. Both were tested rather than assumed during the AP CSP
 * build:
 *
 *   1. Sharing "anyone with the link". The Drive connector's share_file takes
 *      an email address and a reader/writer role; the `anyone` permission type
 *      is unreachable through it. share_file(emailAddress:"anyone") returns
 *      "Request contains an invalid argument" and changes nothing.
 *   2. Uploading. Files travel as base64 inside tool calls. CSP's 72.4 MB of
 *      decks worked out to roughly 25M tokens.
 *
 * So the split is deliberate: the agent does the parts needing judgement
 * (enumeration, validation, the config generator, the gate), and this script
 * does the parts needing the account.
 *
 * ---------------------------------------------------------------------------
 * SETUP
 *   1. script.google.com, new project, paste this file in.
 *   2. Services + > Drive API > v3 > Add.  (v3, not v2: this uses `name`.)
 *   3. Run preview() first and authorise when prompted.
 *
 * RUN ORDER, AND WHY PREVIEW IS NOT OPTIONAL
 *   preview()   Counts what it WOULD convert and writes nothing. Check the
 *               totals against the independent enumeration below before going
 *               further. If they disagree, stop: either Drive changed or the
 *               script is looking in the wrong place, and converting is the
 *               expensive way to find out.
 *   start()     Does the work. Safe to re-run: decks already recorded OK in
 *               the sheet are skipped, so an interrupted run resumes.
 *   report()    Prints what the sheet currently holds.
 *   reset()     Removes the continuation trigger. Does NOT delete converted
 *               files or the sheet, and does NOT forget progress: the SHEET is
 *               the progress record, which is why an interrupted run resumes
 *               correctly even if the script project is edited in between.
 *
 * EXPECTED TOTALS, enumerated from Drive on 2026-08-25 independently of this
 * script. preview() should match exactly:
 *
 *     Unit 1   5 lessons   14 days   28 decks
 *     Unit 2   4 lessons   21 days   42 decks
 *     TOTAL    9 lessons   35 days   70 decks
 *
 *   1.1: 2   1.2: 4   1.3: 4   1.4: 2   1.5: 2
 *   2.1: 8   2.2: 5   2.3: 4   2.4: 4
 *
 * UNITS 3, 4 AND 5 ARE DELIBERATELY EXCLUDED. Each of their 15 lessons holds
 * exactly one deck named Day1_Deck_*, which looks like a per-day set missing
 * its later days. It is not. Lesson 3.1's deck says "DAY 1 OF 1" on its title
 * slide, runs to "Slide 22 of 22" and covers all three of the topic's learning
 * objectives, while its Teacher_Guide.docx says six class periods and paces
 * those same 22 slides across them. Converting those now would put a 22-slide
 * whole-lesson deck on the site labelled "Day 1". They get converted once real
 * per-day decks exist; widen UNITS below at that point.
 *
 * WHAT THE SHARING SETTING MEANS. Converted decks are shared "anyone with the
 * link can view". That is not laziness: a paying teacher is gated on their
 * APCSExamPrep teacher token, not on a Google account, so Google itself cannot
 * do the gating. The consequence is that HOLDING THE FILE ID IS HOLDING
 * ACCESS. The ids are treated as credentials everywhere downstream:
 * routes/slides.js is the only thing that may disclose one, and never to an
 * unentitled caller. Do not paste the sheet anywhere public.
 *
 * copyRequiresWriterPermission is deliberately NOT set, so File > Make a copy
 * stays available. That is the only editable path a cyber teacher has, because
 * these decks are never uploaded to Shopify.
 * ---------------------------------------------------------------------------
 */

// The "AP Cybersecurity Course" folder.
var ROOT_FOLDER_ID = '1nVxjKSNwZLUVayeEl8qAGW21IWI8Xl0j';

// Only these units. See the header before adding 3, 4 or 5.
var UNITS = [1, 2];

var OUTPUT_FOLDER_NAME = 'AP Cyber Slides (converted)';
var SHEET_NAME = 'AP Cyber Slides Map';
var HEADER = ['lesson', 'day', 'variant', 'sourceName', 'slidesId', 'embedUrl', 'status'];

// Apps Script kills a run at 6 minutes. Stop well before that and schedule a
// continuation, so a long run finishes on its own rather than dying mid-deck.
var TIME_BUDGET_MS = 4.5 * 60 * 1000;

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
    var um = unitFolder.getName().match(/^Unit_(\d+)_/);
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
    ss.getActiveSheet().appendRow(HEADER);
  }
  return ss.getActiveSheet();
}

/** lesson|day|variant -> true, for every row already recorded OK. */
function alreadyDone_(sh) {
  var done = {};
  var last = sh.getLastRow();
  if (last < 2) return done;
  var rows = sh.getRange(2, 1, last - 1, HEADER.length).getValues();
  rows.forEach(function (r) {
    if (String(r[6]).trim() === 'OK') {
      done[r[0] + '|' + r[1] + '|' + String(r[2]).toUpperCase()] = true;
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
