'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  RUN BOTH LEADERBOARD RENDERERS AGAINST A HOSTILE NAME AND WATCH WHAT LANDS.
//
//  Asserting that the string 'esc(e.name' is gone proves the edit happened. It
//  does not prove the page is safe, and those are different claims. So this
//  takes the row builder as it stands on a live page and as it stands in the
//  generated sheet, runs both through a DOM shim with a player name that is an
//  attack, and asks what reached the document.
//
//  The old block must FAIL here. A run where both pass means the harness is
//  hollow and is itself the defect.
//
//  Run: node smoke/leaderboard-xss.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

//  The smallest DOM that can tell markup from text. innerHTML keeps whatever it
//  is handed, as a browser's parser would; textContent is stored as inert text
//  and can never become a node.
function makeDom() {
  const mk = (tag) => ({
    tag, className: '', children: [], _html: null, _text: null,
    set innerHTML(v) { this._html = String(v); this._text = null; },
    get innerHTML() { return this._html; },
    set textContent(v) { this._text = String(v); this._html = null; },
    get textContent() { return this._text; },
    appendChild(c) { this.children.push(c); return c; },
  });
  return { mk };
}

//  Everything the renderer reaches that is not the row list.
function harness(dom) {
  const rows = dom.mk('div');
  const youEl = dom.mk('div');
  return {
    rows, youEl,
    root: { querySelector: (s) => (s === '#lb-rows' ? rows : youEl) },
    document: { createElement: (t) => dom.mk(t) },
    fmt: (v) => v,
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&', '<': '<', '>': '>', '"': '"' }[c])),
  };
}

//  Walk whatever the renderer produced and report every place the name landed.
function landed(node, out = { asMarkup: [], asText: [] }) {
  if (node._html !== null && node._html !== undefined) out.asMarkup.push(node._html);
  if (node._text !== null && node._text !== undefined) out.asText.push(node._text);
  for (const c of node.children) landed(c, out);
  return out;
}

function run(blockSrc, entries) {
  const dom = makeDom();
  const h = harness(dom);
  const fn = new Function('root', 'document', 'fmt', 'esc', 'entries', 'you',
    'var rows = root.querySelector("#lb-rows");\n' + blockSrc + '\nreturn rows;');
  const rows = fn(h.root, h.document, h.fmt, h.esc, entries, null);
  return landed(rows);
}

//  16 characters is the server's cap on one name, so the payload is split the
//  way an attacker would have to split it: the markup between two rows falls
//  inside the comment opened by the first.
const PAYLOAD = [{ name: '<svg onload="/*', value: 10 }, { name: '*/alert(1)">', value: 9 }];

const OLD = `
      rows.innerHTML = entries.map(function(e,i){
        var rk = e.rank||i+1; var me = you && you.rank===rk && e.name===you.name;
        return '<div class="lb-row'+(rk===1?' top1':'')+(me?' me':'')+'"><div class="rk">'+(rk===1?'T':rk)+'</div>'+
               '<div class="nm">'+esc(e.name||'anon')+'</div><div class="vl">'+fmt(e.value)+'</div></div>';
      }).join('');
`;

const NEW = `
      rows.innerHTML = '';
      entries.forEach(function(e,i){
        var rk = e.rank||i+1; var me = you && you.rank===rk && e.name===you.name;
        var row = document.createElement('div');
        row.className = 'lb-row'+(rk===1?' top1':'')+(me?' me':'');
        var rkEl = document.createElement('div'); rkEl.className = 'rk';
        rkEl.textContent = rk===1 ? 'T' : String(rk);
        var nmEl = document.createElement('div'); nmEl.className = 'nm';
        nmEl.textContent = e.name || 'anon';
        var vlEl = document.createElement('div'); vlEl.className = 'vl';
        vlEl.textContent = String(fmt(e.value));
        row.appendChild(rkEl); row.appendChild(nmEl); row.appendChild(vlEl);
        rows.appendChild(row);
      });
`;

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); };

const oldOut = run(OLD, PAYLOAD);
const oldMarkup = oldOut.asMarkup.join('');
check('the old builder puts the name into innerHTML as markup',
  /<svg onload=/.test(oldMarkup), oldMarkup.slice(0, 120));
check('the old builder never stores the name as inert text',
  oldOut.asText.length === 0, 'asText=' + oldOut.asText.length);

const newOut = run(NEW, PAYLOAD);
const newMarkup = newOut.asMarkup.join('');
check('the new builder emits no markup carrying the payload',
  !/<svg|onload/.test(newMarkup), JSON.stringify(newMarkup).slice(0, 80));
check('the new builder stores both hostile names as text',
  PAYLOAD.every((p) => newOut.asText.includes(p.name)), JSON.stringify(newOut.asText));

//  The shim must be able to tell the two apart, or it proves nothing.
check('the harness distinguishes the two renderers',
  /<svg onload=/.test(oldMarkup) && !/<svg onload=/.test(newMarkup), '');

//  And the escaper the old builder leaned on really is a no-op, which is the
//  reason the old builder is exploitable at all.
const h = harness(makeDom());
check('esc() as it stands live returns its input unchanged',
  h.esc('<b>&"') === '<b>&"', JSON.stringify(h.esc('<b>&"')));

let bad = 0;
for (const r of results) {
  if (!r.ok) bad++;
  console.log((r.ok ? '  ok   ' : '  FAIL ') + r.name + (r.ok ? '' : '   <- ' + r.detail));
}
console.log('\n  ' + (results.length - bad) + '/' + results.length + ' assertions passed.');
if (bad) process.exit(1);
