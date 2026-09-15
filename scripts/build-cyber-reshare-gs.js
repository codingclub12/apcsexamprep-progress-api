#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Build scripts/cyber-slides-reshare.gs from config/cyber-slide-embeds.js.
//
//    node scripts/build-cyber-reshare-gs.js            rewrite the .gs
//    node scripts/build-cyber-reshare-gs.js --check    refuse a hand-edit
//
//  WHY A GENERATOR AND NOT A HAND-WRITTEN SCRIPT. The repair script has to name
//  all 70 Drive file ids, and a file id IS access here: an id typed into the
//  wrong slot re-shares the wrong deck and leaves the intended one locked, and
//  nothing downstream would notice because every id in the list is real. The
//  same reasoning that keeps CED topic titles out of human hands applies with
//  more force to a credential. So the list is derived from the config the
//  server already serves, the same way verify-slide-sharing.js derives it:
//  walk the manifest, ask embeds.slideId() for each slot.
//
//  --check is the guard that makes that true over time. It regenerates into
//  memory and diffs, so a hand-edit to the .gs, or a config regenerated after
//  a re-conversion, fails the suite instead of silently shipping a stale id
//  list to the one script whose whole job is to fix access.
//
//  No em-dashes, per repo convention. Pure ASCII output.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const embeds = require('../config/cyber-slide-embeds');
const manifest = require('../config/cyber-slide-manifest');

const OUT = path.join(__dirname, 'cyber-slides-reshare.gs');

function collect() {
  const rows = [];
  const seen = new Map();
  for (const lessonId of manifest.LESSON_IDS) {
    for (let day = 1; day <= manifest.dayCount(lessonId); day++) {
      for (const variant of manifest.VARIANT_KEYS) {
        const id = embeds.slideId(lessonId, day, variant);
        if (!id) continue;
        // A duplicate id across two slots means the config itself is crossed,
        // and re-sharing from it would paper over that. Refuse rather than
        // emit a list that cannot be right.
        const label = lessonId + ' day' + day + ' ' + variant;
        if (seen.has(id)) {
          throw new Error(
            'duplicate slide id in config: ' + id + '\n' +
            '  used by ' + seen.get(id) + ' and ' + label + '\n' +
            'Fix config/cyber-slide-embeds.js before generating a repair script.');
        }
        seen.set(id, label);
        rows.push({ label, id });
      }
    }
  }
  return rows;
}

function render(rows) {
  const listing = rows
    .map((r) => "  ['" + r.label + "', '" + r.id + "'],")
    .join('\n');

  return `/**
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
 * On 2026-09-15 all ${rows.length} converted AP Cybersecurity decks answered 401 to an
 * anonymous fetch of their embed URL. AP CSP's 224 decks answered 200 the same
 * afternoon, from the same instrument, so this is not a network problem and not
 * a Google-wide policy: it is these files. A 401 renders as Google's "You need
 * access" page, so every entitled teacher who pressed a deck on a lesson page
 * was sent to Request access, and those requests went to Tanner's Drive rather
 * than to anything that could grant them. That is the symptom that surfaced it.
 *
 * WHY NOT JUST RE-RUN THE CONVERSION
 * Because it would do nothing. cyber-slides-conversion.gs skips any deck the
 * map sheet already records as OK, and all ${rows.length} are recorded OK: the copy
 * succeeded, it was the sharing that did not stick. start() there would log
 * "0 to convert, ${rows.length} already done" and exit green. Worse, forcing it by
 * clearing the sheet would mint ${rows.length} NEW file ids and invalidate
 * config/cyber-slide-embeds.js, turning a permission fix into a re-conversion
 * plus a config regeneration plus a deploy.
 *
 * So this script copies nothing and creates nothing. It sets one permission on
 * ${rows.length} existing files, by id, and reads each one back.
 *
 * THE READ-BACK IS THE POINT. The conversion script called setSharing and
 * moved on, and that is precisely how ${rows.length} decks came to be recorded OK while
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
 *   preview()    Reads the current sharing of all ${rows.length} decks and changes
 *                NOTHING. Tells you how many are already open and how many
 *                are not. Run it first; if it already reports ${rows.length} open,
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
 * It must print ${rows.length}/${rows.length} reachable. Anything less and the repair is not done,
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
${listing}
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
`;
}

function main() {
  const check = process.argv.includes('--check');
  const rows = collect();

  if (!rows.length) {
    console.error('No slide ids in config/cyber-slide-embeds.js. Nothing to generate.');
    console.error('That is a valid state only before the conversion has run. If decks');
    console.error('are live, the config is the problem, not this generator.');
    process.exit(2);
  }

  const out = render(rows);

  if (/[—–]/.test(out)) {
    console.error('Generated output contains an em-dash or en-dash. Refusing to write.');
    process.exit(2);
  }
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7F]/.test(out)) {
    console.error('Generated output is not pure ASCII. Refusing to write.');
    process.exit(2);
  }

  if (check) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (have === out) {
      console.log(`cyber-slides-reshare.gs is up to date (${rows.length} decks).`);
      return;
    }
    console.error('cyber-slides-reshare.gs does NOT match config/cyber-slide-embeds.js.');
    console.error('Either it was hand-edited or the embeds config changed.');
    console.error('Regenerate: node scripts/build-cyber-reshare-gs.js');
    process.exit(1);
  }

  fs.writeFileSync(OUT, out);
  console.log(`wrote scripts/cyber-slides-reshare.gs  (${rows.length} decks)`);
}

main();
