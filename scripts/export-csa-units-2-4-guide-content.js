//  Export the AP CSA Units 2-4 teacher-guide content from the theme repo's own
//  lesson specs into config/csa-units-2-4-guide-content.json.
//
//    node scripts/export-csa-units-2-4-guide-content.js [--theme <path>] [--check]
//
//  WHY THIS IS A SCRIPT AND NOT A ONE-OFF PASTE
//  The config it writes is the only thing the guide builder reads, and it is
//  checked in so a build does not need the theme tree present. Committing the
//  exporter is what lets the next session re-derive the config instead of
//  trusting it, the same reason config/cyber-topics.json ships beside its
//  builder.
//
//  --check is NOT a smoke suite and must not become one. It reads the theme
//  repo, which the CI runner does not have, so wiring it into package.json
//  would turn every build red for a missing directory. Run it by hand when
//  you have both trees.
//
//  THE JOIN IS ON THE PAGE HANDLE, NEVER ON THE TOPIC NUMBER
//  This is the whole reason the script exists in this shape. The first cut
//  joined the two trees on the topic number, and six Unit 4 guides came out
//  carrying another lesson's objectives, lesson page and independent practice.
//  Topic 4.6 is "Using Text Files" in the kit and "Arrays as Parameters and
//  Return Values" in the theme specs, and a teacher reading that objectives
//  table would reasonably believe College Board wrote it.
//
//  Measured against the live storefront on 2026-09-17, which is the authority:
//
//      4.6   theme ap-csa-lesson-4-6-arrays-as-parameters-and-return-values
//            301 -> ap-csa-lesson-4-6-using-text-files
//      4.7   theme ...-4-7-arraylist-introduction
//            301 -> ...-4-7-wrapper-classes
//      4.13  theme ...-4-13-searching-and-sorting
//            301 -> ...-4-14-searching-algorithms          (a DIFFERENT topic)
//      4.14  theme ...-4-14-reading-data-from-files
//            301 -> ...-4-14-searching-algorithms
//      4.15  theme ...-4-15-using-data-sets-with-arrays-and-arraylists
//            301 -> ...-4-15-sorting-algorithms
//      4.17  theme ...-4-17-informal-code-analysis
//            301 -> ...-4-17-recursive-searching-and-sorting
//
//  So the site renumbered Unit 4 onto the 2025 CED and those six specs were
//  left on the retired map. 4.13 is the clearest case: its theme handle
//  redirects to 4.14's page, so the number is not even off by a consistent
//  amount. There is no CED wording for those six in either repo, so they are
//  EXCLUDED here rather than approximated, and the guide builder leaves their
//  rows exactly as the kit wrote them.
//
//  3.6 is the one declared equivalence. Both trees call it "Methods: Passing
//  and Returning Object References" and the handles differ by two words:
//
//      kit    ap-csa-lesson-3-6-methods-passing-and-returning-object-references  404
//      theme  ap-csa-lesson-3-6-methods-passing-returning-object-references      200
//
//  Same lesson, and the kit's handle is the dead one, so the export carries the
//  theme's and the guide prints a URL that resolves.

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const OUT = path.join(ROOT, 'config', 'csa-units-2-4-guide-content.json');

//  Topics whose theme spec describes a retired lesson. Not a preference list:
//  build-csa-units-2-4-teacher-guides.py recomputes it from the handles and
//  refuses a build if this set and the handle comparison disagree, so it cannot
//  quietly go stale when somebody fixes a spec.
//
//  live_handle is the page this LESSON is served at, which the guide prints and
//  which build-csa-units-2-4-teacher-guides.py checks against the kit's own
//  handle, so a drift on either side fails a build rather than shipping a URL
//  nobody clicked. For five of the six it is also where the retired spec
//  redirects. 4.13 is the exception worth noticing: its spec handle redirects
//  to 4.14's lesson, so the two trees are not off by a consistent amount and
//  no arithmetic on the number could have repaired this.
const RETIRED_SPEC = {
  '4.6': { spec: 'ap-csa-lesson-4-6-arrays-as-parameters-and-return-values',
           redirects_to: 'ap-csa-lesson-4-6-using-text-files',
           live_handle: 'ap-csa-lesson-4-6-using-text-files' },
  '4.7': { spec: 'ap-csa-lesson-4-7-arraylist-introduction',
           redirects_to: 'ap-csa-lesson-4-7-wrapper-classes',
           live_handle: 'ap-csa-lesson-4-7-wrapper-classes' },
  '4.13': { spec: 'ap-csa-lesson-4-13-searching-and-sorting',
            redirects_to: 'ap-csa-lesson-4-14-searching-algorithms',
            live_handle: 'ap-csa-lesson-4-13-implementing-2d-array-algorithms' },
  '4.14': { spec: 'ap-csa-lesson-4-14-reading-data-from-files',
            redirects_to: 'ap-csa-lesson-4-14-searching-algorithms',
            live_handle: 'ap-csa-lesson-4-14-searching-algorithms' },
  '4.15': { spec: 'ap-csa-lesson-4-15-using-data-sets-with-arrays-and-arraylists',
            redirects_to: 'ap-csa-lesson-4-15-sorting-algorithms',
            live_handle: 'ap-csa-lesson-4-15-sorting-algorithms' },
  '4.17': { spec: 'ap-csa-lesson-4-17-informal-code-analysis',
            redirects_to: 'ap-csa-lesson-4-17-recursive-searching-and-sorting',
            live_handle: 'ap-csa-lesson-4-17-recursive-searching-and-sorting' },
};

//  topic -> the handle the storefront actually serves, where it is not the
//  handle the theme spec carries.
const LIVE_HANDLE = { '3.6': 'ap-csa-lesson-3-6-methods-passing-returning-object-references' };

//  The theme's voice pass left "out loud" in seven places. Everything else
//  comes over byte for byte; a fix belongs in the spec, not in the import.
const clean = (s) => String(s)
  .replace(/\s*out loud\b/g, '')
  .replace(/\s+([.,])/g, '$1')
  .trim();

function themeDir(arg) {
  const i = process.argv.indexOf('--theme');
  if (i > -1) return process.argv[i + 1];
  for (const c of ['/home/user/APCSExamPrep-theme', path.join(ROOT, '..', 'APCSExamPrep-theme')]) {
    if (fs.existsSync(path.join(c, 'teacher-bundle', 'specs'))) return c;
  }
  throw new Error('theme repo not found; pass --theme <path>');
}

function main() {
  const theme = themeDir();
  const data = {
    _provenance: {
      source: 'APCSExamPrep-theme teacher-bundle/specs/unit-{2,3,4}/<topic>.json',
      generator: 'scripts/export-csa-units-2-4-guide-content.js',
      fields: 'handle, title, objectives (CED code and wording), iCan, the online block as lesson_page, independent.text',
      join: 'the lesson page handle, never the topic number. See the header of the generator for the six Unit 4 specs this excludes and the live 301s that prove them retired.',
      excluded: RETIRED_SPEC,
      live_handle_override: LIVE_HANDLE,
      changed_on_import: 'the phrase "out loud" removed where the theme voice pass left it',
      captured: '2026-09-17',
    },
  };

  let n = 0, objs = 0, acts = 0, skipped = 0;
  for (const u of [2, 3, 4]) {
    const dir = path.join(theme, 'teacher-bundle', 'specs', `unit-${u}`);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (RETIRED_SPEC[s.topic]) { skipped++; continue; }
      const online = (s.days || []).map((d) => d.online).find((o) => o && (o.tasks || []).length);
      const indep = (s.days || []).map((d) => d.independent).find(Boolean);
      if (!online || !indep) throw new Error(`${s.topic}: missing online or independent`);
      data[s.topic] = {
        handle: LIVE_HANDLE[s.topic] || s.handle,
        title: s.title,
        objectives: s.objectives.map((o) => ({ code: o.code, text: clean(o.text) })),
        iCan: (s.iCan || []).map(clean),
        lesson_page: { intro: clean(online.intro), activities: online.tasks.map(clean) },
        independent: clean(indep.text),
      };
      n++; objs += s.objectives.length; acts += online.tasks.length;
    }
  }

  const text = JSON.stringify(data, null, 1) + '\n';
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (have !== text) {
      console.error('config/csa-units-2-4-guide-content.json is not what this '
        + 'exporter produces. Re-run without --check.');
      return 1;
    }
    console.log(`config matches the exporter: ${n} topics, ${skipped} excluded`);
    return 0;
  }
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${n} topics, ${objs} CED objectives, ${acts} lesson-page `
    + `activities; ${skipped} excluded as retired specs`);

  //  The voice rule, on the way out rather than after the fact. Differentiation
  //  is the one exemption Tanner named and none of these fields is that.
  const V = /\bin pairs\b|\bwith a partner\b|\bas a class\b|\bwhole-class\b|\bthe board\b|out loud|\bask students\b|\bhave students\b|\btell students\b|\b\d+\s*min(?:ute)?s?\b/gi;
  let hits = 0;
  for (const k of Object.keys(data)) {
    if (k.startsWith('_')) continue;
    const m = JSON.stringify(data[k]).match(V);
    if (m) { hits += m.length; console.log(`   ${k}: ${m.join(', ')}`); }
  }
  console.log(`directional hits in the imported content: ${hits}`);
  return hits ? 1 : 0;
}

process.exit(main());
