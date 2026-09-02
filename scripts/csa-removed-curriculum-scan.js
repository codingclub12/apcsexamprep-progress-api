// ─────────────────────────────────────────────────────────────────────────────
//  WHICH CSA DAILY-PRACTICE ARTICLES DRILL REMOVED CURRICULUM.
//
//  The 2025-2026 CED restructured AP CSA into four units and removed
//  inheritance, polymorphism, extends, super, interfaces and WRITING recursive
//  methods. Recursion TRACING was added, so "recursion" alone is not a marker.
//
//  /pages/ap-csa-ced-explained tells students, in those words: "Not tested on
//  the 2025-2026 exam. Trap: Skip entirely." The daily-practice articles below
//  serve the same material as "Advanced Practice Question", difficulty "Hard".
//  A teacher who reads both pages catches the site contradicting itself.
//
//  WHY THIS READS THE BODY AND NOT THE TITLE
//  A title is a guess. "Inheritance Access" contains no `extends` and is still
//  removed content; "Object Class" might be either. Scope measured off titles
//  alone was 22 articles. Measured off live bodies it is 49.
//
//  SCRIPTS AND STYLES ARE STRIPPED FIRST. On this storefront the word "removed"
//  appears seven times inside cart strings, a code-editor indent routine and an
//  ad-loading comment. Reading those as caveat text is a mistake this repo has
//  already made once, on 2026-09-02, and it nearly cleared a real defect.
//
//  Input: one handle per line, and the fetched pages in csa/<handle>.html.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const handles = fs.readFileSync('csa-handles.txt', 'utf8').trim().split('\n');

const REMOVED = /\b(extends|super\s*\(|super\.|implements|@Override|polymorphi|inheritance|subclass|superclass|parent class)\b/gi;
const CAVEAT = /(not tested on the 2025|removed from the 2025|no longer tested|not on the 2025-2026|skip entirely)/i;
const GRADED = /(Advanced Practice|Practice Question|Difficulty|Harder|Hard\b)/i;

const rows = [];
for (const h of handles) {
  const raw = fs.readFileSync('csa/' + h + '.html', 'utf8');
  // Everything a reader can actually see.
  const visible = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
  REMOVED.lastIndex = 0;
  const hits = visible.match(REMOVED) || [];
  const kinds = [...new Set(hits.map((x) => x.toLowerCase().replace(/\s*\($/, '(')))];
  rows.push({
    handle: h,
    removedHits: hits.length,
    kinds: kinds.slice(0, 5).join(','),
    hasCaveat: CAVEAT.test(visible),
    looksGraded: GRADED.test(visible),
  });
}

const affected = rows.filter((r) => r.removedHits > 0 && !r.hasCaveat);
const alreadyOk = rows.filter((r) => r.hasCaveat);
const clean = rows.filter((r) => r.removedHits === 0 && !r.hasCaveat);

console.log('candidates checked      :', rows.length);
console.log('AFFECTED, no caveat     :', affected.length);
console.log('already carry a caveat  :', alreadyOk.length);
console.log('no removed content seen :', clean.length);
console.log();
console.log('AFFECTED:');
for (const r of affected) {
  console.log('  %s  hits=%-3s graded=%-5s  %s',
    r.handle.padEnd(52), r.removedHits, r.looksGraded, r.kinds);
}
if (alreadyOk.length) { console.log('\nALREADY CAVEATED:'); alreadyOk.forEach((r) => console.log('  ' + r.handle)); }
if (clean.length) { console.log('\nTITLE SAID YES, BODY SAID NO:'); clean.forEach((r) => console.log('  ' + r.handle)); }
fs.writeFileSync('csa-affected.json', JSON.stringify(affected.map((r) => r.handle), null, 1));
