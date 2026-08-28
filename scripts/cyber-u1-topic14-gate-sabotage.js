#!/usr/bin/env node
// Prove every check in the 1.4 gate FAILS when it should.
//
//   node scripts/cyber-u1-topic14-gate-sabotage.js [snapshot.html|live.json]
//
// A gate exercised only in the passing direction is half tested. That is how
// the stayed_hidden check shipped inert on 1.1 in the morning: it printed its
// warning and still returned 0. It is also how the "Prediction:" marker in this
// gate shipped unmatchable, since \b between a colon and a space never matches.
// This suite caught that one before the sheet went out.
//
// Each entry breaks the built output in one specific way and asserts the gate
// says so. A MISSED line means the gate is blind, not that the page is fine.
const fs=require('fs'), cp=require('child_process');
const os=require('os'), path=require('path');
const LIVE=process.argv[2] || 'shopify/page-snapshots/ap-cybersecurity-unit-1-ai-driven-threats.before-ced-realignment.html';
const S=fs.mkdtempSync(path.join(os.tmpdir(),'t14-sabotage-'));
const raw=fs.readFileSync(LIVE,'utf8');
const live=raw.trimStart().startsWith('{') ? JSON.parse(raw)
  : { page: { id: 132157866199, handle: 'ap-cybersecurity-unit-1-ai-driven-threats',
              title: 'AP Cybersecurity 1.4: AI-Based Cybersecurity Attacks', body_html: raw } };
const mod=require('../lib/cyber-u1-topic14-ced');
const { gate }=require('./cyber-u1-topic14-ced-csv');
fs.writeFileSync(S+'/base.json', JSON.stringify(live));
const good=mod.applySplices(live.page.body_html).body;

const SABOTAGE={
  'hidden feedback box unhidden': b=>b.replace('<div class="cfu-feedback" id="cfu-5-feedback" style="display:none!important;">','<div class="cfu-feedback" id="cfu-5-feedback">'),
  'dtb chip renamed on one side only': b=>b.replace('data-val="a shared secret"','data-val="shared secret"'),
  'two dtb blanks share an answer': b=>b.replace('data-correct="urgency"','data-correct="voice model"'),
  'legacy term back in an Attack Type cell': b=>b.replace('<td>AI deepfake</td>','<td>Vishing with voice cloning</td>'),
  'AP Exam Signal column restored': b=>b.replace('<th>Also called</th>','<th>AP Exam Signal</th>'),
  'match key changed': b=>b.replace('id="mr-3-1" data-correct="C"','id="mr-3-1" data-correct="D"'),
  'sequence order key changed': b=>b.replace('data-correct-order="1,2,3,4,5"','data-correct-order="1,2,3,5,4"'),
  'MCQ key points at a missing option': b=>b.replace('id="cfu-10" data-answer="B"','id="cfu-10" data-answer="E"'),
  'script broken': b=>b.replace('function ucnToggle(num){','function ucnToggle(num){ if( ,'),
  'JSON-LD broken': b=>b.replace('"@context": "https://schema.org"','"@context" "https://schema.org"'),
  'div left unclosed': b=>b.replace('</table>\n\n  <div class="exam-tip">','\n\n  <div class="exam-tip">'),
  'arrow mapping to a legacy term': b=>b.replace('An AI assistant that performs an unexpected action after processing content\n      is prompt injection.','A convincing phone call \u2192 vishing with voice cloning.'),
  'classify-as mapping to a legacy term': b=>b.replace('For classification they are one attack type','On the exam, classify it as vishing when it is a phone call'),
  'worked example predicts a legacy label': b=>b.replace('Prediction: <strong>AI phishing</strong>','Prediction: <strong>AI-enhanced spear phishing</strong>'),
  'new non-ASCII introduced': b=>b.replace('Also called','Also cålled'),
};

// Drive the real gate by writing a temp live.json the script will read.
// The baseline runs the real CLI end to end, which the per-sabotage checks do
// not: they call gate() directly. Both levels are worth having, since a gate
// that works in isolation and a script that never reaches it look the same from
// the outside.
function run(body){
  const j={page:{...live.page, body_html:body}};
  fs.writeFileSync(S+'/gt.json', JSON.stringify(j));
  const r=cp.spawnSync('node',['scripts/cyber-u1-topic14-ced-csv.js',S+'/gt.csv','--live',S+'/gt.json','--show-changes'],
    {cwd:process.cwd(),encoding:'utf8'});
  const out=(r.stdout||'')+(r.stderr||'');
  const fails=out.split('\n').filter(l=>l.startsWith('FAIL')||l.includes('check(s) failed')||l.includes('anchor'));
  return {code:r.status, fails};
}

// Baseline: the real build must pass. Feed it the untouched live body.
const base=run(live.page.body_html);
console.log('baseline (real build)   exit=%d  %s', base.code, base.code===0?'PASS as expected':'UNEXPECTED FAILURE\n'+base.fails.join('\n'));
console.log('');

let bad=0;
for(const [name,fn] of Object.entries(SABOTAGE)){
  const broken=fn(good);
  if(broken===good){ console.log('  ' + name.padEnd(42) + 'SABOTAGE DID NOT APPLY (the test is wrong, not the gate)'); bad++; continue; }
  // Compare the real build against the sabotaged one through the same gate the
  // build itself calls.
  const res = gate(good, broken);
  const fails = res.fail;
  const caught=fails.length>0;
  if(!caught) bad++;
  console.log('  ' + name.padEnd(42) + (caught?'caught  ':'MISSED  ') + (caught?fails[0].slice(0,86):''));
}
console.log('');
console.log(bad===0 ? 'every sabotage was caught' : `${bad} sabotage(s) slipped through`);
fs.rmSync(S,{recursive:true,force:true});
process.exit(bad===0?0:1);
