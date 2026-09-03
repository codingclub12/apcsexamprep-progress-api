// ─────────────────────────────────────────────────────────────────────────────
//  THE SAME CHECK AS tools/scan-inline-scripts.py, REACHED A DIFFERENT WAY.
//
//  The Python one shells out to `node --check` once per script block. This one
//  compiles every block with `new vm.Script()` inside a single process: no
//  subprocess, no temp file, no regex for the syntax half. Two implementations
//  that share no code and agree exactly (7 pages, 13 faults, block for block on
//  2026-09-03) are worth more than one implementation run twice.
//
//  It is also about 400 times faster, forty minutes against seconds over ~700
//  pages, so this is the one a nightly sweep should call and the Python one is
//  what proves it still tells the truth.
//
//  NOTE it does NOT do the ASI half. A split like `foo.getAtt\nribute()` PARSES,
//  so no syntax checker of any kind will see it. That check lives in the Python
//  script and has to stay a separate idea, not a stricter parser.
//
//  Usage: node tools/scan-inline-scripts.js <dir-of-saved-pages> [...]
//  Fetch pages through lib/storefront-fetch.js, which refuses a bot challenge.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs=require('fs'), path=require('path'), vm=require('vm');
const dirs = process.argv.slice(2);
if (!dirs.length) { console.error('usage: node tools/scan-inline-scripts.js <dir> [...]'); process.exit(2); }
let files=[]; for(const d of dirs){ try{ files=files.concat(fs.readdirSync(d).filter(f=>f.endsWith('.html')).map(f=>path.join(d,f))); }catch(e){} }
files.sort();
const RE=/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
let faults=0, blocks=0;
for(const p of files){
  const h=fs.readFileSync(p,'utf8');
  let m;
  RE.lastIndex=0;
  while((m=RE.exec(h))){
    if(/type\s*=\s*["'](?!text\/javascript|application\/javascript)/.test(m[1])) continue;
    const js=m[2];
    if(!js.trim()) continue;
    blocks++;
    try { new vm.Script(js, {filename:'x.js'}); }
    catch(e){ faults++; console.log('  SYNTAX  '+path.basename(p,'.html').padEnd(52)+' '+String(e.message).slice(0,70)); }
  }
}
console.log('\n  '+blocks+' inline script blocks across '+files.length+' live pages');
console.log('  blocks a browser cannot parse: '+faults);
