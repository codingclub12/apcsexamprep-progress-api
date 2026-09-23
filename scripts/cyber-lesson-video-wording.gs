/**
 * AP CYBERSECURITY TEACHER BUNDLE: stop the decks promising a lesson video.
 *
 * There are no AP Cyber lesson videos. The deck generator nevertheless put
 * "Prefer self-paced? The lesson video covers this exact material, slide for
 * slide." on the Your Turn slide of almost every Unit 1-2 deck, and the
 * speaker notes repeat it. A teacher asked where the videos were on
 * 2026-09-23. Measured on 100 bundle .pptx files that day: 66 carry the
 * wording, 64 on the slide itself, so students read it too.
 *
 * WHY THIS IS AN APPS SCRIPT. Same reason as cyber-slides-conversion.gs and
 * slide-type-bump.gs: the decks live in Tanner's Drive and editing them needs
 * his credentials. The Drive connector a Claude session has can read files but
 * can only rename or move them.
 *
 * WHAT IT CHANGES. Exactly the sentences in REPLACEMENTS, and nothing else.
 * "video" also appears in these decks as lesson CONTENT (deepfake video calls,
 * video avatars, "scrapes the target's short videos"), and none of that is
 * touched, because nothing here matches a word: every find is a whole sentence.
 * Every lesson-video sentence found in the corpus sits inside one text run, so
 * a whole-sentence replace keeps each run's formatting.
 *
 * WHICH FILES. Found by content, not by a list of ids, so no deck id is written
 * into this public repository: every Google Slides file and every .pptx that
 * you own whose text contains one of the phrases in SEARCH_PHRASES. That
 * covers the Slides the site embeds, the .pptx copies in the bundle folders,
 * and any older copies lying around. A file matched by the search but
 * containing none of the exact sentences is reported and left alone.
 *
 * UNDO.
 *   Google Slides: File > Version history. Every edit is a new version.
 *   .pptx: before a file is replaced, its current revision is pinned with
 *   keepForever, so Drive does not age it out. Right click > Manage versions
 *   restores it. The pinned revision id is also written to the log sheet.
 *
 * SETUP
 *   1. script.google.com, new project, paste this file in.
 *   2. Services + > Drive API > v3 > Add. (Needed only for the .pptx half.)
 *   3. Run preview(). Authorise when prompted. It changes nothing.
 *   4. Read the sheet it writes. Then run start(). Re-running is safe: a file
 *      already done has no matching sentences left and is skipped.
 *
 * EXPECTED. scripts/check-lesson-video-wording.js ran this file's own
 * replaceInXml_ over 100 bundle .pptx decks on 2026-09-23: 64 decks change,
 * all 64 on a slide, 85 sentences in all (64 on slides, 21 in notes). Every
 * rebuilt deck opened, no markup moved, and every content use of "video" was
 * kept. preview() should report about 64 .pptx files, and about as many Google
 * Slides (the 70 converted Unit 1-2 decks less the six 1.3 decks that never had
 * the line). If it reports something very different, stop and look before
 * running start().
 *
 * No em-dashes, per repo convention. Pure ASCII.
 */

// ---------------------------------------------------------------------------
// The replacement table. Longest first, so a sentence that contains a shorter
// one is replaced whole. scripts/check-lesson-video-wording.js reads this
// block between the markers and applies it to a local corpus, so keep it JSON.
// ---------------------------------------------------------------------------
// BEGIN REPLACEMENTS
var REPLACEMENTS = [
  ["The lesson video walks today's material slide for slide if you want it again at your own pace.", "The lesson page covers today's material if you want it again at your own pace."],
  ["The lesson video covers both days slide for slide if you need a replay.", "The lesson page covers both days if you need a replay."],
  ["the lesson video walks through this exact material slide for slide.", "the lesson page covers this exact material."],
  ["The lesson video walks the material slide for slide if you want it again.", "The lesson page covers the material if you want it again."],
  ["The lesson video walks today's Xtensr application slide for slide.", "The lesson page covers today's Xtensr application."],
  ["The lesson video covers this exact material, slide for slide.", "The lesson page covers this exact material."],
  ["the lesson video walks the whole assessment slide for slide.", "the lesson page covers the whole assessment."],
  ["The lesson video covers today's material slide for slide.", "The lesson page covers today's material."],
  ["Keep your pencil moving throughout the video and lecture.", "Keep your pencil moving throughout the lecture."],
  ["the lesson video covers both days slide for slide.", "the lesson page covers both days."],
  ["the lesson video walks the risk method slide for slide.", "the lesson page covers the risk method."],
  ["the lesson video walks all of it slide for slide.", "the lesson page covers all of it."],
  ["the lesson video walks the material slide for slide.", "the lesson page covers the material."],
  ["The lesson video walks the material slide for slide.", "The lesson page covers the material."],
  ["the lesson video walks this material slide for slide.", "the lesson page covers this material."],
  ["the lesson video walks it slide for slide.", "the lesson page covers it."],
  ["the video walks it slide for slide.", "the lesson page covers it."]
];
// END REPLACEMENTS

// Discovery only. A file must also contain one of the exact sentences above
// before anything in it changes.
var SEARCH_PHRASES = ['lesson video', 'video and lecture', 'video walks'];

var SHEET_NAME = 'AP Cyber lesson-video wording (log)';
var PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
var SLIDES = 'application/vnd.google-apps.presentation';
var TIME_BUDGET_MS = 4.5 * 60 * 1000;

// Apostrophes arrive straight or curly depending on how a deck was authored,
// and escaped as &apos; inside .pptx XML. Every find is tried in each form.
function variants_(s) {
  var out = [s];
  if (s.indexOf("'") !== -1) out.push(s.replace(/'/g, '\u2019'));
  return out;
}
function xmlForms_(s) {
  var out = [];
  variants_(s).forEach(function (v) {
    out.push(v);
    if (v.indexOf("'") !== -1) out.push(v.replace(/'/g, '&apos;'));
  });
  return out;
}
function replacementFor_(find, form) {
  var repl = find[1];
  if (form.indexOf('&apos;') !== -1) return repl.replace(/'/g, '&apos;');
  if (form.indexOf('\u2019') !== -1) return repl.replace(/'/g, '\u2019');
  return repl;
}

function count_(hay, needle) {
  var n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

// ---------------------------------------------------------------------------
// Finding the files
// ---------------------------------------------------------------------------

function candidates_() {
  var seen = {}, out = [];
  SEARCH_PHRASES.forEach(function (ph) {
    [SLIDES, PPTX].forEach(function (mime) {
      var q = "fullText contains '" + ph + "' and mimeType = '" + mime + "' and 'me' in owners and trashed = false";
      var it = DriveApp.searchFiles(q);
      while (it.hasNext()) {
        var f = it.next();
        if (seen[f.getId()]) continue;
        seen[f.getId()] = true;
        out.push({ id: f.getId(), name: f.getName(), mime: mime });
      }
    });
  });
  out.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  return out;
}

// ---------------------------------------------------------------------------
// Google Slides
// ---------------------------------------------------------------------------

function textsOf_(elements, out) {
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i], type = el.getPageElementType();
    if (type === SlidesApp.PageElementType.SHAPE) out.push(el.asShape().getText());
    else if (type === SlidesApp.PageElementType.TABLE) {
      var t = el.asTable();
      for (var r = 0; r < t.getNumRows(); r++)
        for (var c = 0; c < t.getNumColumns(); c++) out.push(t.getCell(r, c).getText());
    } else if (type === SlidesApp.PageElementType.GROUP) textsOf_(el.asGroup().getChildren(), out);
  }
}

// Every text range on the slides and in the speaker notes, tagged by where.
function slidesRanges_(pres) {
  var out = [];
  pres.getSlides().forEach(function (s) {
    var onSlide = [];
    textsOf_(s.getPageElements(), onSlide);
    onSlide.forEach(function (t) { out.push({ where: 'slide', text: t }); });
    var notes = s.getNotesPage().getSpeakerNotesShape();
    if (notes) out.push({ where: 'notes', text: notes.getText() });
  });
  return out;
}

function planSlides_(id) {
  var pres = SlidesApp.openById(id);
  var tally = { slide: 0, notes: 0 };
  slidesRanges_(pres).forEach(function (r) {
    var s = r.text.asString();
    REPLACEMENTS.forEach(function (f) {
      variants_(f[0]).forEach(function (v) { tally[r.where] += count_(s, v); });
    });
  });
  return { pres: pres, tally: tally };
}

function applySlides_(pres) {
  var n = 0;
  slidesRanges_(pres).forEach(function (r) {
    REPLACEMENTS.forEach(function (f) {
      variants_(f[0]).forEach(function (v) {
        n += r.text.replaceAllText(v, replacementFor_(f, v), true);
      });
    });
  });
  pres.saveAndClose();
  return n;
}

// ---------------------------------------------------------------------------
// .pptx, edited as the zip of XML it is, so nothing is converted and the file
// keeps its id, name and sharing. Only slide and notes XML is touched.
// ---------------------------------------------------------------------------

var PPTX_TEXT_PART = /^ppt\/(slides|notesSlides)\/[^\/]+\.xml$/;

function planPptx_(id) {
  var parts = Utilities.unzip(DriveApp.getFileById(id).getBlob().setContentType('application/zip'));
  var tally = { slide: 0, notes: 0 };
  parts.forEach(function (p) {
    var name = p.getName();
    if (!PPTX_TEXT_PART.test(name)) return;
    var x = p.getDataAsString('UTF-8');
    var where = name.indexOf('notesSlides') !== -1 ? 'notes' : 'slide';
    REPLACEMENTS.forEach(function (f) {
      xmlForms_(f[0]).forEach(function (v) { tally[where] += count_(x, v); });
    });
  });
  return { parts: parts, tally: tally };
}

/**
 * The whole text change for one XML part, as a pure function so the offline
 * suite can run THIS code rather than a copy of it. Returns the new XML and
 * how many sentences it replaced.
 */
function replaceInXml_(x) {
  var n = 0;
  REPLACEMENTS.forEach(function (f) {
    xmlForms_(f[0]).forEach(function (v) {
      var k = count_(x, v);
      if (k) { x = x.split(v).join(replacementFor_(f, v)); n += k; }
    });
  });
  return { x: x, n: n };
}

function applyPptx_(id, parts) {
  var n = 0;
  var out = parts.map(function (p) {
    var name = p.getName();
    if (!PPTX_TEXT_PART.test(name)) return p;
    var r = replaceInXml_(p.getDataAsString('UTF-8'));
    if (!r.n) return p;
    n += r.n;
    return Utilities.newBlob(r.x, 'application/xml', name);
  });
  if (!n) return { n: 0, pinned: null };

  // Pin the current revision BEFORE replacing it, so the undo exists first.
  var revs = Drive.Revisions.list(id, { fields: 'revisions(id)' }).revisions || [];
  var head = revs.length ? revs[revs.length - 1].id : null;
  if (head) Drive.Revisions.update({ keepForever: true }, id, head);

  var file = DriveApp.getFileById(id);
  var zipped = Utilities.zip(out, file.getName()).setContentType(PPTX);
  Drive.Files.update({}, id, zipped);
  return { n: n, pinned: head };
}

// ---------------------------------------------------------------------------
// The log sheet
// ---------------------------------------------------------------------------

function sheet_() {
  var it = DriveApp.getFilesByName(SHEET_NAME);
  var ss = it.hasNext() ? SpreadsheetApp.open(it.next()) : SpreadsheetApp.create(SHEET_NAME);
  var sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(['when', 'phase', 'type', 'name', 'fileId', 'slide sentences', 'notes sentences', 'replaced', 'pinned revision', 'note']);
  }
  return sh;
}

function run_(apply) {
  var started = Date.now();
  var sh = sheet_();
  var files = candidates_();
  var totals = { files: 0, withWork: 0, slide: 0, notes: 0, replaced: 0 };
  for (var i = 0; i < files.length; i++) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      Logger.log('Stopping at the time budget after ' + i + ' of ' + files.length
        + ' files. Run ' + (apply ? 'start()' : 'preview()') + ' again: finished files have nothing left to match.');
      break;
    }
    var f = files[i];
    totals.files++;
    try {
      var isSlides = f.mime === SLIDES;
      var plan = isSlides ? planSlides_(f.id) : planPptx_(f.id);
      var t = plan.tally;
      if (!t.slide && !t.notes) {
        sh.appendRow([new Date(), apply ? 'start' : 'preview', isSlides ? 'slides' : 'pptx', f.name, f.id, 0, 0, 0, '', 'search matched, no exact sentence: left alone']);
        continue;
      }
      totals.withWork++; totals.slide += t.slide; totals.notes += t.notes;
      var replaced = '', pinned = '';
      if (apply) {
        if (isSlides) replaced = applySlides_(plan.pres);
        else { var r = applyPptx_(f.id, plan.parts); replaced = r.n; pinned = r.pinned || ''; }
        totals.replaced += replaced;
      }
      sh.appendRow([new Date(), apply ? 'start' : 'preview', isSlides ? 'slides' : 'pptx', f.name, f.id, t.slide, t.notes, replaced, pinned, '']);
    } catch (e) {
      sh.appendRow([new Date(), apply ? 'start' : 'preview', f.mime === SLIDES ? 'slides' : 'pptx', f.name, f.id, '', '', '', '', 'ERROR ' + e.message]);
    }
  }
  Logger.log(JSON.stringify(totals));
  Logger.log('Log sheet: ' + SHEET_NAME);
  return totals;
}

/** Counts what start() would change. Writes only to the log sheet. */
function preview() { return run_(false); }

/** Makes the change. Safe to re-run. */
function start() { return run_(true); }
