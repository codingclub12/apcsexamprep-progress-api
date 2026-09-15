'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: scripts/build-cyber-reshare-gs.js
//
//  The generated .gs hands Drive file ids to a script whose whole job is to
//  change who can reach them. A wrong id there does not error: it re-shares
//  some other file and leaves the intended deck locked, and the run reports
//  success either way. So the suite is organised by consequence:
//
//    - the committed .gs must match the config it claims to be derived from
//    - a hand-edit must be REFUSED, not silently accepted
//    - every id in the .gs must be an id the server would actually serve
//    - the script must never ask Drive for EDIT, and must never copy anything
//
//  THE MUTATION CASES ARE THE POINT. A --check that passes on a file it never
//  really compared is worse than no check, which is the lesson this repo
//  learned twice on hollow guards. Each mutation below is applied on its own
//  and the check must go red for THAT mutation, not in aggregate. The .gs is
//  restored afterwards so a failed run cannot leave the repo holding a
//  corrupted repair script.
//
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cyberreshare
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'build-cyber-reshare-gs.js');
const GS = path.join(ROOT, 'scripts', 'cyber-slides-reshare.gs');

const embeds = require('../config/cyber-slide-embeds');
const manifest = require('../config/cyber-slide-manifest');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + String(x).slice(0, 300) : '')); }
};

/** Run the generator. Returns { code, out }. Never throws. */
function run(args) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT].concat(args || []), {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const ORIGINAL = fs.readFileSync(GS, 'utf8');

function restore() {
  fs.writeFileSync(GS, ORIGINAL);
}

console.log('\nSMOKE: cyber slides reshare generator\n');

// ---- 1. the committed file is the generated file --------------------------
console.log('the committed .gs matches its source');
{
  const r = run(['--check']);
  ok('--check passes against the committed .gs', r.code === 0, r.out);
}

// ---- 2. every id in the .gs is an id the server would serve ----------------
console.log('\nthe id list is the config, not a retyping');
{
  const want = new Map();
  for (const lessonId of manifest.LESSON_IDS) {
    for (let day = 1; day <= manifest.dayCount(lessonId); day++) {
      for (const variant of manifest.VARIANT_KEYS) {
        const id = embeds.slideId(lessonId, day, variant);
        if (id) want.set(id, `${lessonId} day${day} ${variant}`);
      }
    }
  }

  const rows = [...ORIGINAL.matchAll(/^ {2}\['([^']+)', '([^']+)'\],$/gm)]
    .map((m) => ({ label: m[1], id: m[2] }));

  ok('the .gs lists one row per configured deck',
    rows.length === want.size, `gs=${rows.length} config=${want.size}`);

  const unknown = rows.filter((r) => !want.has(r.id));
  ok('no id in the .gs is absent from the config',
    unknown.length === 0, unknown.slice(0, 3).map((u) => u.label).join(', '));

  const mislabeled = rows.filter((r) => want.has(r.id) && want.get(r.id) !== r.label);
  ok('every id sits under the slot the config gives it',
    mislabeled.length === 0,
    mislabeled.slice(0, 3).map((m) => `${m.label} should be ${want.get(m.id)}`).join('; '));

  const ids = rows.map((r) => r.id);
  ok('no id appears twice', new Set(ids).size === ids.length);

  ok('the count matches embeds.count()',
    rows.length === embeds.count(), `${rows.length} vs ${embeds.count()}`);
}

// ---- 3. the script asks for the right permission, and copies nothing -------
console.log('\nwhat the script would actually do to Drive');
{
  ok('it sets ANYONE_WITH_LINK with VIEW',
    /setSharing\(\s*\n?\s*DriveApp\.Access\.ANYONE_WITH_LINK,\s*DriveApp\.Permission\.VIEW\)/.test(ORIGINAL));

  ok('it never sets Permission.EDIT',
    !/setSharing\([^)]*Permission\.EDIT/.test(ORIGINAL));

  // The failure this whole script exists to prevent is a re-conversion that
  // mints new ids and invalidates the embeds config.
  ok('it never copies a file', !/Drive\.Files\.copy|makeCopy\(/.test(ORIGINAL));
  ok('it never trashes or deletes a file', !/setTrashed\(|removeFile\(/.test(ORIGINAL));

  // A write that is not read back is what produced the bug in the first place.
  ok('it reads the sharing state back after writing',
    /var after = sharingState_\(id\);/.test(ORIGINAL));

  ok('a writable link is not treated as already correct',
    /return 'writable';/.test(ORIGINAL));
}

// ---- 4. MUTATIONS. Each alone must turn --check red -----------------------
console.log('\nmutations: each must be REFUSED on its own');
const mutations = [
  {
    name: 'an id is altered by one character',
    apply: (s) => {
      const m = s.match(/^ {2}\['([^']+)', '([^']+)'\],$/m);
      const swapped = m[2].slice(0, -1) + (m[2].slice(-1) === 'A' ? 'B' : 'A');
      return s.replace(m[0], `  ['${m[1]}', '${swapped}'],`);
    },
  },
  {
    name: 'a deck row is deleted',
    apply: (s) => s.replace(/^ {2}\['[^']+', '[^']+'\],\n/m, ''),
  },
  {
    name: 'two rows have their ids swapped',
    apply: (s) => {
      const rows = [...s.matchAll(/^ {2}\['([^']+)', '([^']+)'\],$/gm)];
      const a = rows[0], b = rows[1];
      return s
        .replace(a[0], `  ['${a[1]}', '${b[2]}'],`)
        .replace(b[0], `  ['${b[1]}', '${a[2]}'],`);
    },
  },
  {
    name: 'the permission is downgraded to EDIT by hand',
    apply: (s) => s.replace('DriveApp.Permission.VIEW)', 'DriveApp.Permission.EDIT)'),
  },
  {
    name: 'the read-back is removed',
    apply: (s) => s.replace('var after = sharingState_(id);', 'var after = \'open\';'),
  },
];

for (const mut of mutations) {
  let applied;
  try {
    applied = mut.apply(ORIGINAL);
  } catch (e) {
    ok(mut.name + ' (could be applied)', false, e.message);
    continue;
  }
  if (applied === ORIGINAL) {
    ok(mut.name + ' (changed the file)', false, 'mutation was a no-op, so it proves nothing');
    continue;
  }
  fs.writeFileSync(GS, applied);
  const r = run(['--check']);
  restore();
  ok(mut.name + ' -> --check fails', r.code === 1, `exit ${r.code}`);
}

// ---- 5. a regenerate restores the committed file exactly ------------------
console.log('\nregenerating is safe');
{
  fs.writeFileSync(GS, '// clobbered\n');
  const r = run([]);
  const after = fs.readFileSync(GS, 'utf8');
  ok('regenerate rewrites the file', r.code === 0, r.out);
  ok('and reproduces the committed bytes exactly', after === ORIGINAL);
  restore();
}

// ---- 6. house rules -------------------------------------------------------
console.log('\nhouse rules');
{
  ok('the generated .gs is pure ASCII', !/[^\x00-\x7F]/.test(ORIGINAL));
  ok('no em-dash or en-dash', !/[—–]/.test(ORIGINAL));
  ok('it says it is generated', /GENERATED FILE\. Do not hand-edit\./.test(ORIGINAL));
  ok('it points at the independent check',
    /npm run verify:sharing ap-cybersecurity/.test(ORIGINAL));
}

restore();

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
