#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ARCHITECTURE REPORT, AS A PAGE.
//
//  Reads the JSON from scripts/link-graph-report.js and writes one HTML file:
//  what the link graph IS, what it should be, and the difference stated as work.
//
//  Generated rather than hand-written so it can be re-run against a later crawl
//  and produce a comparable page. Every number on it comes out of the report.
//
//    node scripts/link-architecture-html.js --report report.json --out arch.html
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const REPORT = opt('report', '');
const RESOLVED = opt('resolved', '');
const GSC = opt('gsc', '');
const OUT = opt('out', 'architecture.html');

const e = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (x) => Number(x || 0).toLocaleString('en-US');

const COURSE_LABEL = {
  'ap-csa': 'AP CSA', 'ap-csp': 'AP CSP', 'ap-cyber': 'AP Cybersecurity',
  'ap-networking': 'AP Networking', 'intro-java': 'Intro to Java', site: 'Site-wide',
};

function main() {
  if (!REPORT) { console.error('need --report'); process.exit(1); }
  const r = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const resolved = RESOLVED && fs.existsSync(RESOLVED) ? JSON.parse(fs.readFileSync(RESOLVED, 'utf8')) : [];
  const gsc = GSC && fs.existsSync(GSC) ? JSON.parse(fs.readFileSync(GSC, 'utf8')) : null;
  const t = r.totals;

  const redirects = resolved.filter((x) => x.status >= 300 && x.status < 400)
    .sort((a, b) => b.inbound - a.inbound);
  const broken404 = resolved.filter((x) => x.status === 404).sort((a, b) => b.inbound - a.inbound);
  const brokenAssets = broken404.filter((x) => /^\/cdn\/|\.(docx|pdf|pptx|xlsx|zip)$/i.test(x.path));
  const brokenPages = broken404.filter((x) => !brokenAssets.includes(x));
  const corrupted = brokenPages.filter((x) => /%0[Aa]|%0[Dd]/.test(x.path));
  const redirectLinkTotal = redirects.reduce((sum, x) => sum + x.inbound, 0);

  const orphanPct = t.live ? Math.round((t.orphans / t.live) * 100) : 0;
  const reachable = Object.entries(r.depthHistogram)
    .filter(([k]) => k !== 'unreachable').reduce((s, [, v]) => s + v, 0);
  const unreachable = r.depthHistogram.unreachable || 0;

  // ── the course table ──
  const courseRows = (r.byCourse || []).map((c) => {
    const pct = c.pages ? Math.round((c.orphans / c.pages) * 100) : 0;
    return `<tr>
      <th scope="row">${e(COURSE_LABEL[c.course] || c.course)}</th>
      <td class="num">${n(c.pages)}</td>
      <td class="num">${n(c.orphans)}</td>
      <td><div class="bar" role="img" aria-label="${pct} percent orphaned"><span style="width:${Math.max(pct, 1)}%"></span></div><span class="pct">${pct}%</span></td>
    </tr>`;
  }).join('\n');

  const roleRows = (r.byRole || []).filter((x) => x.pages >= 5).slice(0, 12).map((x) => `<tr>
      <th scope="row"><code>${e(x.role)}</code></th>
      <td class="num">${n(x.pages)}</td>
      <td class="num">${n(x.orphans)}</td>
      <td class="num">${x.avgIn}</td>
    </tr>`).join('\n');

  const missingHubRows = (r.missingHubs || []).slice(0, 20).map((c) => `<tr>
      <th scope="row"><code>${e(c.family)}</code></th>
      <td class="num">${n(c.size)}</td>
      <td class="num${c.orphans ? ' bad' : ''}">${n(c.orphans)}</td>
      <td><code class="prop">/pages/${e(c.family)}</code></td>
    </tr>`).join('\n');

  const courseHubRows = (r.missingCourseHubs || []).map((c) => `<tr>
      <th scope="row">${e(COURSE_LABEL[c.course] || c.course)}</th>
      <td class="num">${n(c.pages)}</td>
      <td><code class="prop">/pages/${e(c.course)}</code></td>
    </tr>`).join('\n');

  const brokenRows = (r.brokenClusters || []).slice(0, 15).map((c) => `<tr>
      <th scope="row"><code>${e(c.family)}</code></th>
      <td class="num">${n(c.size)}</td>
      <td class="num bad">${n(c.orphans)}</td>
      <td>${c.hub ? `<code>${e(c.hub)}</code>` : '<span class="muted">none</span>'}</td>
    </tr>`).join('\n');

  const redirectRows = redirects.slice(0, 14).map((x) => `<tr>
      <th scope="row"><code>${e(x.path)}</code></th>
      <td class="num">${n(x.inbound)}</td>
      <td><code class="ok">${e(x.location || '')}</code></td>
    </tr>`).join('\n');

  const corruptedRows = corrupted.map((x) => `<tr>
      <th scope="row"><code>${e(x.path)}</code></th>
      <td><code class="muted">${e((x.from || [])[0] || '')}</code></td>
    </tr>`).join('\n');
  const assetSample = brokenAssets.slice(0, 8).map((x) => `<li><code>${e(x.path)}</code></li>`).join('\n');
  const brokenLinkRows = brokenPages.slice(0, 14).map((x) => `<tr>
      <th scope="row"><code>${e(x.path)}</code></th>
      <td class="num">${n(x.inbound)}</td>
      <td class="muted">${e((x.from || []).slice(0, 2).join(', '))}</td>
    </tr>`).join('\n');

  const twinRows = (r.twins || []).map((g) => g.pages.map((x, i) => `<tr>
      <th scope="row"><code>${e(x.path)}</code></th>
      <td class="num${i === 0 ? '' : ' bad'}">${n(x.in)}</td>
      <td>${i === 0 ? '<span class="keep">most linked</span>' : '<span class="muted">candidate to fold in</span>'}</td>
    </tr>`).join('\n')).join('\n');

  const orphanSample = (r.orphans || []).slice(0, 40).map((o) => `<tr>
      <th scope="row"><code>${e(o.path)}</code></th>
      <td>${e(o.title || o.h1 || '')}</td>
      <td class="num muted">${n(o.inChrome)}</td>
    </tr>`).join('\n');

  const hubRows = (r.hubs || []).slice(0, 14).map((h) => `<tr>
      <th scope="row"><code>${e(h.path)}</code></th>
      <td class="num">${n(h.out)}</td>
      <td class="num">${n(h.in)}</td>
      <td>${e(COURSE_LABEL[h.course] || h.course || '')}</td>
    </tr>`).join('\n');

  const homeReach = Object.entries(r.homeDepthHistogram || {})
    .filter(([k]) => k !== 'unreachable').reduce((s, [, v]) => s + v, 0);
  const depthRows = Object.keys(r.depthHistogram).sort((a, b) => {
    if (a === 'unreachable') return 1;
    if (b === 'unreachable') return -1;
    return Number(a) - Number(b);
  }).map((k) => {
    const v = r.depthHistogram[k];
    const pct = t.live ? (v / t.live) * 100 : 0;
    const bad = k === 'unreachable';
    return `<tr>
      <th scope="row">${k === 'unreachable' ? 'No path at all' : `${k} click${k === '1' ? '' : 's'}`}</th>
      <td class="num">${n(v)}</td>
      <td><div class="bar${bad ? ' bar-bad' : ''}"><span style="width:${Math.max(pct, 0.6)}%"></span></div></td>
    </tr>`;
  }).join('\n');

  const html = `<title>Link Architecture Teardown</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{
  --ground:#EEF2F7; --surface:#FFFFFF; --surface-2:#F7F9FC;
  --ink:#0C131B; --muted:#5B6C7E; --line:#D8E0EA; --line-soft:#E7EDF4;
  --accent:#2F6FED; --accent-soft:#E4ECFD;
  --orphan:#C2410C; --orphan-soft:#FDEDE3;
  --broken:#B42318; --ok:#0E7C66; --ok-soft:#E2F2EE;
  --shadow:0 1px 2px rgba(12,19,27,.06),0 8px 24px -12px rgba(12,19,27,.18);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#0A1017; --surface:#131C26; --surface-2:#18222E;
    --ink:#E7EEF6; --muted:#93A4B7; --line:#26333F; --line-soft:#1E2A36;
    --accent:#6FA0FF; --accent-soft:#17263F;
    --orphan:#F59156; --orphan-soft:#2E1C11;
    --broken:#F97066; --ok:#4CC5A8; --ok-soft:#102A24;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 12px 32px -16px rgba(0,0,0,.7);
  }
}
:root[data-theme="dark"]{
  --ground:#0A1017; --surface:#131C26; --surface-2:#18222E;
  --ink:#E7EEF6; --muted:#93A4B7; --line:#26333F; --line-soft:#1E2A36;
  --accent:#6FA0FF; --accent-soft:#17263F;
  --orphan:#F59156; --orphan-soft:#2E1C11;
  --broken:#F97066; --ok:#4CC5A8; --ok-soft:#102A24;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 12px 32px -16px rgba(0,0,0,.7);
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font-family:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:16px; line-height:1.65; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1120px; margin:0 auto; padding:0 24px 96px}
code{font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace; font-size:.86em}

/* ── masthead ── */
.mast{padding:64px 0 40px; border-bottom:1px solid var(--line)}
.eyebrow{
  font-family:"IBM Plex Mono",monospace; font-size:12px; font-weight:500;
  letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin:0 0 18px;
}
h1{
  font-family:"Bricolage Grotesque","IBM Plex Sans",sans-serif;
  font-weight:800; font-size:clamp(34px,5.4vw,60px); line-height:1.03;
  letter-spacing:-.025em; margin:0 0 20px; text-wrap:balance; max-width:19ch;
}
.standfirst{font-size:clamp(17px,2vw,20px); color:var(--muted); max-width:64ch; margin:0}
.meta{
  margin-top:28px; display:flex; flex-wrap:wrap; gap:10px 28px;
  font-family:"IBM Plex Mono",monospace; font-size:12.5px; color:var(--muted);
}
.meta b{color:var(--ink); font-weight:500}

/* ── the number ── */
.headline-stat{
  display:grid; grid-template-columns:auto 1fr; gap:0 32px; align-items:center;
  margin:40px 0 8px; padding:32px; border-radius:16px;
  background:var(--orphan-soft); border:1px solid var(--orphan);
}
.headline-stat .big{
  font-family:"Bricolage Grotesque",sans-serif; font-weight:800;
  font-size:clamp(56px,11vw,104px); line-height:.85; color:var(--orphan);
  font-variant-numeric:tabular-nums; letter-spacing:-.03em;
}
.headline-stat p{margin:0; font-size:17px; max-width:52ch}
.headline-stat strong{color:var(--orphan)}
@media(max-width:640px){.headline-stat{grid-template-columns:1fr; gap:16px}}

/* ── sections ── */
section{padding-top:72px}
h2{
  font-family:"Bricolage Grotesque",sans-serif; font-weight:700;
  font-size:clamp(24px,3.4vw,34px); letter-spacing:-.02em; line-height:1.15;
  margin:0 0 8px; text-wrap:balance;
}
h3{
  font-family:"Bricolage Grotesque",sans-serif; font-weight:600; font-size:19px;
  letter-spacing:-.01em; margin:36px 0 10px;
}
.lede{color:var(--muted); max-width:68ch; margin:0 0 28px; font-size:16.5px}
p{max-width:68ch}
.sec-num{
  font-family:"IBM Plex Mono",monospace; font-size:12px; letter-spacing:.14em;
  color:var(--accent); text-transform:uppercase; display:block; margin-bottom:10px;
}

/* ── stat row ── */
.stats{display:grid; grid-template-columns:repeat(auto-fit,minmax(158px,1fr)); gap:1px;
  background:var(--line); border:1px solid var(--line); border-radius:14px; overflow:hidden; margin:0 0 8px}
.stat{background:var(--surface); padding:20px 22px}
.stat .v{font-family:"Bricolage Grotesque",sans-serif; font-weight:700; font-size:30px;
  line-height:1.05; font-variant-numeric:tabular-nums; letter-spacing:-.02em}
.stat .k{font-size:12.5px; color:var(--muted); margin-top:5px; line-height:1.35}
.stat.is-bad .v{color:var(--orphan)}
.stat.is-ok .v{color:var(--ok)}

/* ── tables ── */
.tbl-wrap{overflow-x:auto; border:1px solid var(--line); border-radius:14px;
  background:var(--surface); box-shadow:var(--shadow); margin:22px 0}
table{border-collapse:collapse; width:100%; font-size:14px; min-width:520px}
caption{
  text-align:left; padding:16px 20px 12px; font-size:13px; color:var(--muted);
  border-bottom:1px solid var(--line-soft);
}
caption b{color:var(--ink); font-weight:600; font-size:14px; display:block; margin-bottom:2px;
  font-family:"Bricolage Grotesque",sans-serif}
th,td{padding:9px 20px; text-align:left; border-bottom:1px solid var(--line-soft); vertical-align:middle}
thead th{
  font-family:"IBM Plex Mono",monospace; font-size:11px; font-weight:500; color:var(--muted);
  letter-spacing:.08em; text-transform:uppercase; background:var(--surface-2);
}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:none}
tbody th{font-weight:500}
.num{text-align:right; font-variant-numeric:tabular-nums; font-family:"IBM Plex Mono",monospace}
.num.bad{color:var(--orphan); font-weight:600}
.muted{color:var(--muted)}
code.ok{color:var(--ok)}
code.prop{color:var(--accent)}
.keep{color:var(--ok); font-weight:500}
.pct{font-family:"IBM Plex Mono",monospace; font-size:12px; color:var(--muted); margin-left:10px}
.bar{display:inline-block; width:120px; height:7px; border-radius:4px; background:var(--line); overflow:hidden; vertical-align:middle}
.bar span{display:block; height:100%; background:var(--accent); border-radius:4px}
.bar-bad span{background:var(--orphan)}

/* ── callouts ── */
.note{
  border-left:3px solid var(--accent); background:var(--surface); padding:18px 22px;
  border-radius:0 12px 12px 0; margin:26px 0; font-size:15px; box-shadow:var(--shadow);
}
.note.warn{border-left-color:var(--orphan)}
.note.stop{border-left-color:var(--broken)}
.note b{font-family:"Bricolage Grotesque",sans-serif}
.note p{margin:0 0 10px} .note p:last-child{margin:0}

/* ── figure ── */
figure{margin:32px 0; padding:26px 22px; background:var(--surface);
  border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow); overflow-x:auto}
figure svg{display:block; max-width:100%; height:auto; margin:0 auto; color:var(--ink)}
figcaption{margin-top:20px; font-size:13.5px; color:var(--muted); max-width:70ch}
figcaption b{color:var(--ink)}

/* ── build list ── */
.builds{display:grid; gap:1px; background:var(--line); border:1px solid var(--line);
  border-radius:14px; overflow:hidden; margin:24px 0}
.build{background:var(--surface); padding:18px 22px; display:grid;
  grid-template-columns:auto 1fr auto; gap:4px 18px; align-items:baseline}
.build .tag{font-family:"IBM Plex Mono",monospace; font-size:10.5px; letter-spacing:.09em;
  text-transform:uppercase; padding:3px 9px; border-radius:20px; white-space:nowrap}
.tag-new{background:var(--accent-soft); color:var(--accent)}
.tag-fix{background:var(--orphan-soft); color:var(--orphan)}
.tag-cut{background:var(--ok-soft); color:var(--ok)}
.build .why{grid-column:2/-1; font-size:14px; color:var(--muted); margin-top:2px}
.build code{font-size:13.5px}
@media(max-width:640px){.build{grid-template-columns:1fr}.build .why{grid-column:1}}

footer{margin-top:88px; padding-top:26px; border-top:1px solid var(--line);
  font-size:13px; color:var(--muted)}
a{color:var(--accent)}
a:focus-visible,summary:focus-visible{outline:2px solid var(--accent); outline-offset:3px; border-radius:3px}
details{margin:18px 0}
summary{cursor:pointer; font-size:14px; color:var(--accent); font-weight:500}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="wrap">

<header class="mast">
  <p class="eyebrow">apcsexamprep.com &middot; internal link audit</p>
  <h1>What links to what, and what nothing links to at all</h1>
  <p class="standfirst">A full crawl of every URL the sitemap advertises, with navigation chrome separated from real content links. The difference between those two is the whole finding.</p>
  <div class="meta">
    <span><b>${n(t.crawled)}</b> URLs crawled</span>
    <span><b>${n(t.bodyEdges)}</b> content links</span>
    <span><b>${n(t.chromeTargets)}</b> chrome targets excluded</span>
    <span>${e(new Date(r.generated).toISOString().slice(0, 10))}</span>
  </div>
</header>

<div class="headline-stat">
  <div class="big">${n(t.orphans)}</div>
  <p><strong>live pages have no inbound content link.</strong> That is ${orphanPct}% of the site. They are reachable from the sitemap and from the nav dropdown, and from nowhere a reader would actually find them.</p>
</div>

<section id="method">
  <span class="sec-num">01 &middot; Method</span>
  <h2>Why counting anchors gives the wrong answer</h2>
  <p class="lede">Every page on this storefront renders roughly 135 <code>apcs-dropdown-link</code> anchors before its content begins. Count anchors naively and all ${n(t.crawled)} URLs come back richly interlinked, including every page nobody can reach.</p>

  <p>So each link is placed in one of two zones, and only one of them is architecture:</p>

  <div class="builds">
    <div class="build"><span class="tag tag-cut">chrome</span><code>header, nav, footer, mega-menu</code>
      <span class="why">Identical on every render. Present on the page that is well connected and on the page that is not, so it distinguishes nothing.</span></div>
    <div class="build"><span class="tag tag-new">body</span><code>an anchor an author put in the content</code>
      <span class="why">This is the graph. Everything below counts these and only these.</span></div>
  </div>

  <p>Zone is decided twice and the stricter answer wins: <b>structurally</b>, by the element the anchor sits inside, and by <b>ubiquity</b>, where any target linked from more than 35% of pages is boilerplate whatever markup wraps it. Ubiquity is the half that survives a theme change.</p>

  <div class="note">
    <p><b>Not a shard.</b> The nightly crawl covers one seventh of the site per night. This one covered all of it in a single pass, because a page cannot be called unlinked while a seventh of its possible linkers went unfetched. One request per second, backoff on throttling, stop after five.</p>
  </div>
</section>

<section id="current">
  <span class="sec-num">02 &middot; As measured</span>
  <h2>The current architecture</h2>
  <p class="lede">Two hub-and-spoke systems are running at once. One is the navigation, which reaches everything and means nothing. The other is the content graph, which is where readers and crawlers actually travel, and it has holes.</p>

  <div class="stats">
    <div class="stat"><div class="v">${n(t.live)}</div><div class="k">live pages</div></div>
    <div class="stat is-bad"><div class="v">${n(t.orphans)}</div><div class="k">no inbound content link</div></div>
    <div class="stat"><div class="v">${n(t.nearOrphans)}</div><div class="k">exactly one inbound</div></div>
    <div class="stat is-bad"><div class="v">${n(t.deadEnds)}</div><div class="k">no outbound content link</div></div>
    <div class="stat is-bad"><div class="v">${n(unreachable)}</div><div class="k">no path from home</div></div>
    <div class="stat"><div class="v">${n(t.dangling)}</div><div class="k">link targets off-sitemap</div></div>
  </div>

  ${figureCurrent(t, unreachable, reachable)}

  <div class="tbl-wrap"><table>
    <caption><b>Content clicks from the nav frontier</b>Seeded from the homepage plus every page the navigation reaches, since all of those are one click from anywhere. Following content links only from there.</caption>
    <thead><tr><th>Depth</th><th class="num">Pages</th><th>Share of site</th></tr></thead>
    <tbody>${depthRows}</tbody>
  </table></div>

  <div class="note">
    <p><b>Why the seed set is the navigation and not just the homepage.</b> Measured from the homepage alone, only ${n(homeReach)} pages are reachable and ${n((r.homeDepthHistogram || {}).unreachable || 0)} are not. That number is an artefact: the homepage does link its course hubs in its own body, but those URLs also sit in the mega-menu on all ${n(t.crawled)} pages, so they count as chrome and the walk refuses to pass through the site's own hubs. The gap between ${n(homeReach)} and ${n(t.live - unreachable)} is the site's dependence on its navigation.</p>
  </div>

  <div class="tbl-wrap"><table>
    <caption><b>Orphans by course</b>A page with zero inbound content links, counted against that course's live pages.</caption>
    <thead><tr><th>Course</th><th class="num">Pages</th><th class="num">Orphaned</th><th>Rate</th></tr></thead>
    <tbody>${courseRows}</tbody>
  </table></div>

  <div class="tbl-wrap"><table>
    <caption><b>Orphans by page role</b>Where the linking actually breaks down. Roles are derived from the handle, which on this site is the taxonomy.</caption>
    <thead><tr><th>Role</th><th class="num">Pages</th><th class="num">Orphaned</th><th class="num">Avg inbound</th></tr></thead>
    <tbody>${roleRows}</tbody>
  </table></div>

  <h3>The pages doing the most work</h3>
  <div class="tbl-wrap"><table>
    <caption><b>Top hubs by outbound content links</b>These already behave like hubs. The proposal below leans on them rather than replacing them.</caption>
    <thead><tr><th>Page</th><th class="num">Out</th><th class="num">In</th><th>Course</th></tr></thead>
    <tbody>${hubRows}</tbody>
  </table></div>

  ${brokenRows ? `<h3>Clusters where most members are unreachable</h3>
  <div class="tbl-wrap"><table>
    <caption><b>Half or more of the cluster is orphaned</b>A hub may exist and simply not link its own spokes.</caption>
    <thead><tr><th>Family</th><th class="num">Pages</th><th class="num">Orphaned</th><th>Hub</th></tr></thead>
    <tbody>${brokenRows}</tbody>
  </table></div>` : ''}

  ${orphanSample ? `<details>
    <summary>Sample of orphaned pages (first 40 of ${n(t.orphans)})</summary>
    <div class="tbl-wrap"><table>
      <caption><b>Orphaned pages</b>The chrome column is how many nav links point at each one, which is why they look fine in a naive audit.</caption>
      <thead><tr><th>Path</th><th>Title</th><th class="num">Chrome links</th></tr></thead>
      <tbody>${orphanSample}</tbody>
    </table></div>
  </details>` : ''}
</section>

<section id="rot">
  <span class="sec-num">03 &middot; Link rot</span>
  <h2>Links that land somewhere other than where they point</h2>
  <p class="lede">Every link target outside the sitemap was resolved once, most-linked first. Three outcomes, and they need different fixes.</p>

  <div class="stats">
    <div class="stat is-bad"><div class="v">${n(redirectLinkTotal)}</div><div class="k">internal links pointing at a redirect</div></div>
    <div class="stat is-bad"><div class="v">${n(brokenAssets.length)}</div><div class="k">broken file downloads</div></div>
    <div class="stat is-bad"><div class="v">${n(brokenPages.length)}</div><div class="k">links to pages that 404</div></div>
  </div>

  ${redirectRows ? `<div class="tbl-wrap"><table>
    <caption><b>Internal links pointing at a redirect</b>The link works. It spends a hop and passes its equity through a 301. Point the link at the destination instead.</caption>
    <thead><tr><th>Linked URL</th><th class="num">Pages linking it</th><th>Actually serves</th></tr></thead>
    <tbody>${redirectRows}</tbody>
  </table></div>` : '<p class="muted">No redirect targets resolved in this run.</p>'}

  ${brokenLinkRows ? `<div class="tbl-wrap"><table>
    <caption><b>Internal links to pages that do not exist</b>404s a reader can click today.</caption>
    <thead><tr><th>Linked URL</th><th class="num">Pages linking it</th><th>Linked from</th></tr></thead>
    <tbody>${brokenLinkRows}</tbody>
  </table></div>` : ''}

  ${corruptedRows ? `<h3>Two links carry a newline inside the handle</h3>
  <div class="tbl-wrap"><table>
    <caption><b>Percent-encoded line breaks in an href</b>Verified against the live page. <code>%0A</code> is a newline that has been encoded into the middle of the handle, so the URL cannot resolve. Both sit in the accordion navigation on the same lesson page.</caption>
    <thead><tr><th>Linked URL</th><th>Emitted by</th></tr></thead>
    <tbody>${corruptedRows}</tbody>
  </table></div>` : ''}

  ${assetSample ? `<h3>${n(brokenAssets.length)} worksheet downloads return 404</h3>
  <p>Student and teacher <code>.docx</code> files linked from CSP lesson pages. These are the download buttons on the lesson, so this is a reader-facing break rather than a crawl concern.</p>
  <div class="note warn"><ul style="margin:0;padding-left:20px">${assetSample}</ul>
  <p style="margin-top:10px" class="muted">First 8 of ${n(brokenAssets.length)}. Full list in the report JSON.</p></div>` : ''}
</section>

<section id="gsc">
  <span class="sec-num">04 &middot; Search data</span>
  <h2>What the crawl could not know</h2>
  ${gsc ? `<p class="lede">Search Console, ${e(gsc.window)}. This section exists because the link graph got the most important question backwards, and only this data could say so.</p>

  <div class="headline-stat">
    <div class="big">${Math.round((gsc.internal.partition.nav / gsc.internal.partition.total) * 100)}%</div>
    <p><strong>of the site's search clicks land on just ${n(63)} pages, and what those pages have in common is the navigation menu.</strong> Everything the content graph adds on top of the nav accounts for ${Math.round((gsc.internal.partition.mid / gsc.internal.partition.total) * 100)}% of clicks.</p>
  </div>

  <div class="note warn">
    <p><b>A correction to an earlier version of this page.</b> This section first led with "${Math.round(gsc.orphanEarners.share)}% of search clicks land on pages nothing links to", counting the ${n(gsc.orphanEarners.count)} orphans that earn traffic. That number is right by the content-link definition used throughout this report and <em>wrong as a statement about discoverability</em>, because Google's own internal-link export says those same pages carry roughly 1,480 links each. They are in the mega-menu. They are linked; they are just not linked from anything relevant.</p>
    <p>The honest version is the partition below. The genuinely unlinked pages carry ${Math.round((gsc.internal.partition.zero / gsc.internal.partition.total) * 100)}% of clicks, not ${Math.round(gsc.orphanEarners.share)}%.</p>
  </div>

  <div class="tbl-wrap"><table>
    <caption><b>Where the clicks actually sit</b>Google's internal-link count per page against 16 months of clicks. A page at 1,300+ links is in the mega-menu.</caption>
    <thead><tr><th>Internal-link status</th><th class="num">Clicks</th><th class="num">Share</th></tr></thead>
    <tbody>
      <tr><th scope="row">In the nav (1,300+ links), 63 pages</th><td class="num">${n(gsc.internal.partition.nav)}</td><td class="num">${Math.round((gsc.internal.partition.nav / gsc.internal.partition.total) * 100)}%</td></tr>
      <tr><th scope="row">Linked, but not from the nav</th><td class="num">${n(gsc.internal.partition.mid)}</td><td class="num">${Math.round((gsc.internal.partition.mid / gsc.internal.partition.total) * 100)}%</td></tr>
      <tr><th scope="row">No internal links at all, ${n(gsc.internal.partition.zeroPages)} pages</th><td class="num bad">${n(gsc.internal.partition.zero)}</td><td class="num bad">${Math.round((gsc.internal.partition.zero / gsc.internal.partition.total) * 100)}%</td></tr>
    </tbody>
  </table></div>

  <p><b>Google's export independently confirms the method.</b> Sixty-three pages sit in a tight band between about 1,380 and 1,500 internal links. That band is the mega-menu, measured by a different crawler with no knowledge of this analysis, and it is exactly the boilerplate this report separates out. It also confirms the two counts are not in conflict: <code>ap-computer-science-principles-full-practice-exam-70-mcq</code> has 1,483 internal links by Google's count and zero by this one, and both are correct.</p>

  <h3>Pages that earn, with no internal links at all</h3>
  <p class="lede">These rank, so they are indexed for certain, which makes a zero here a real zero rather than a page Google has not got to. This is the list the linking pass should reach first.</p>
  <div class="tbl-wrap"><table>
    <caption><b>Zero internal links, real search traffic</b>${n(gsc.internal.partition.zeroPages)} pages carry ${n(gsc.internal.partition.zero)} clicks between them.</caption>
    <thead><tr><th>Page</th><th class="num">Clicks</th><th class="num">Impressions</th></tr></thead>
    <tbody>${gsc.internal.zeroLinked.slice(0, 14).map((x) => `<tr>
      <th scope="row"><code>${e(x.path)}</code></th>
      <td class="num">${n(x.clicks)}</td><td class="num muted">${n(x.impr)}</td></tr>`).join('\n')}</tbody>
  </table></div>

  <p>The two at the top, <code>ap-csp-written-response-guide</code> and <code>ap-csp-create-task-guide</code>, draw 91,861 impressions between them from no internal links whatsoever. Neither appeared in the contested-URL list, because nothing in the crawl suggested they mattered.</p>

  <div class="tbl-wrap"><table>
    <caption><b>Orphaned pages that earn search traffic</b>Zero inbound content links, ranked by clicks over 16 months.</caption>
    <thead><tr><th>Page</th><th class="num">Clicks</th><th class="num">Impressions</th></tr></thead>
    <tbody>${gsc.orphanEarners.top.map((x) => `<tr>
      <th scope="row"><code>${e(x.path)}</code></th>
      <td class="num">${n(x.clicks)}</td><td class="num muted">${n(x.impr)}</td></tr>`).join('\n')}</tbody>
  </table></div>

  <div class="note warn">
    <p><b>A prediction this report got wrong, corrected by the data.</b> Before these exports arrived, inbound content links were used as a stand-in for whether a page mattered, and four pages were called likely-dead on that basis. Two of them are among the biggest earners in their cluster: <code>ap-cybersecurity-study-guide</code> has zero inbound content links and ${n(gsc.clusters['AP Cybersecurity - overview intent'].find((x) => /study-guide/.test(x.path)).clicks)} clicks, and <code>ap-cybersecurity-complete-course-guide</code> has ${n(gsc.clusters['AP Cybersecurity - overview intent'].find((x) => /complete-course/.test(x.path)).clicks)}. Internal links measure browsability. They do not measure demand, and the two are not correlated here.</p>
  </div>

  <h3>The proposed canonical is wrong for three courses</h3>
  <p>Section 05 proposes <code>/pages/ap-{course}</code> as the URL that owns each head term. Those URLs exist. They have almost no search equity, and two of them are the empty pages noted below.</p>

  <div class="tbl-wrap"><table>
    <caption><b>Head-term URL against the URL that actually earns</b>Consolidating the earner into the bare handle would redirect away the traffic.</caption>
    <thead><tr><th>Course</th><th>Proposed canonical</th><th class="num">Clicks</th><th>Earns instead</th><th class="num">Clicks</th></tr></thead>
    <tbody>
      <tr><th scope="row">AP CSA</th><td><code>/pages/ap-csa</code></td><td class="num bad">1</td><td><code>/pages/ap-csa-exam-prep-hub</code></td><td class="num">2,470</td></tr>
      <tr><th scope="row">AP CSP</th><td><code>/pages/ap-csp</code></td><td class="num bad">2</td><td><code>/pages/ap-csp-topics</code></td><td class="num">323</td></tr>
      <tr><th scope="row">AP Cyber</th><td><code>/pages/ap-cybersecurity</code></td><td class="num bad">4</td><td><code>/pages/ap-cybersecurity-study-guide</code></td><td class="num">982</td></tr>
    </tbody>
  </table></div>

  <h3>Folds the data now supports</h3>
  <p class="lede">Each of these is a near-zero URL against a clear earner in the same intent. Absent means below the export cutoff: zero clicks and under about 260 impressions in 16 months.</p>
  <div class="builds">
    <div class="build"><span class="tag tag-cut">fold</span><code>ap-cybersecurity-practice</code><span class="num muted">absent</span>
      <span class="why">into <code>ap-cybersecurity-practice-exam</code>, 1,524 clicks.</span></div>
    <div class="build"><span class="tag tag-cut">fold</span><code>ap-cybersecurity-exam-format-scoring</code><span class="num muted">4 clicks</span>
      <span class="why">into <code>ap-cybersecurity-exam-format</code>, 355 clicks. Same page under two URLs, per the August audit.</span></div>
    <div class="build"><span class="tag tag-cut">fold</span><code>ap-csa-practice-test-hub</code><span class="num muted">absent</span>
      <span class="why">into <code>ap-csa-practice-tests-by-topic</code>, 81 clicks.</span></div>
    <div class="build"><span class="tag tag-cut">fold</span><code>ap-csa-primitives-and-casting-practice-test</code><span class="num muted">absent</span>
      <span class="why">into <code>ap-csa-practice-test-primitives-casting</code>, 16 clicks. Third twin <code>ap-csa-primitives-casting-practice-test</code> has 4 and folds the same way.</span></div>
  </div>

  <h3>Do not fold, on this evidence</h3>
  <div class="builds">
    <div class="build"><span class="tag tag-fix">keep both</span><code>constructors twins</code><span class="num muted">19 vs 25 clicks</span>
      <span class="why"><code>constructors-in-ap-csa</code> earns 19 clicks on 4,130 impressions; <code>ap-csa-constructors</code> earns 25 on 1,560. Neither dominates and they convert differently. Picking one here is still a guess; separate them by query first.</span></div>
    <div class="build"><span class="tag tag-fix">keep all three</span><code>cyber overview trio</code><span class="num muted">982 / 571 / 469</span>
      <span class="why"><code>-study-guide</code>, <code>-complete-course-guide</code> and <code>-curriculum</code> are three substantial pages, not duplicates. The August audit counted eight URLs on this intent; five of them are near-zero and can go, these three cannot.</span></div>
  </div>

  <h3>A larger prize than any of the linking</h3>
  <p>Two pages rank well and are almost never clicked. This is a title and description problem, not an architecture one, and it is worth more than most of the work above.</p>
  <div class="tbl-wrap"><table>
    <caption><b>High impressions, near-zero click-through</b>Pages over 20,000 impressions, worst CTR first.</caption>
    <thead><tr><th>Page</th><th class="num">Clicks</th><th class="num">Impressions</th><th class="num">CTR</th></tr></thead>
    <tbody>${gsc.ctrLosers.map((x) => `<tr>
      <th scope="row"><code>${e(x.path)}</code></th>
      <td class="num">${n(x.clicks)}</td><td class="num">${n(x.impr)}</td>
      <td class="num bad">${x.ctr}%</td></tr>`).join('\n')}</tbody>
  </table></div>
  <p><code>ap-csp-score-calculator</code> alone draws 180,721 impressions at position 7.8 and converts 0.74% of them. Moving those two calculators to a 3% CTR is roughly 8,000 additional clicks a year, from a title rewrite.</p>

  <div class="note">
    <p><b>Dead ends leak the traffic they earn.</b> ${n(gsc.deadEndEarners.count)} pages with no outbound content link carry ${n(gsc.deadEndEarners.clicks)} clicks between them, led by <code>ap-csp-vocabulary-list</code> at 1,598 and <code>ap-csa-score-calculator</code> at 1,531. A student lands from search and the page offers nowhere to go next.</p>
  </div>` : '<p class="lede">No Search Console export was supplied to this run.</p>'}
</section>

<section id="ideal">
  <span class="sec-num">05 &middot; Proposed</span>
  <h2>The architecture it should have</h2>
  <p class="lede">One template, applied identically to all five courses, so no page's position has to be remembered. This follows the shape already proposed in <code>docs/site-audit-2026-08-positioning.md</code> rather than competing with it.</p>

  ${figureIdeal()}

  <p>The rule that makes it hold: <b>every page links up to its hub, and every hub links down to all of its spokes.</b> The second half is the one that is missing today. It is also the cheap half, because one hub edit rescues every spoke under it at once.</p>

  <div class="note">
    <p><b>Hub-down, not orphan-up.</b> Adding "back to hub" to an orphan edits one page and rescues one page, and the orphan stays invisible to anyone browsing the hub. Adding the missing spokes to the hub edits one page, rescues up to a dozen, and makes them browsable. That is what an inbound link is for.</p>
  </div>
</section>

<section id="gaps">
  <span class="sec-num">06 &middot; Gaps</span>
  <h2>Hubs the taxonomy implies and the site does not have</h2>
  <p class="lede">A cluster is a set of pages whose handles already agree they belong together. Where three or more of them exist with no page at the family root, the hub is missing rather than merely unlinked.</p>

  ${courseHubRows ? `<div class="tbl-wrap"><table>
    <caption><b>Courses with no course page at all</b>Every topic cluster inside can be perfectly hubbed and the course still has no root to land on.</caption>
    <thead><tr><th>Course</th><th class="num">Live pages</th><th>Placeholder to create</th></tr></thead>
    <tbody>${courseHubRows}</tbody>
  </table></div>` : ''}

  ${missingHubRows ? `<div class="tbl-wrap"><table>
    <caption><b>Topic clusters with no hub page</b>Checked against five live naming irregularities first, so nothing here is a page that already exists under a different spelling. Each was then confirmed against the sitemap by hand.</caption>
    <thead><tr><th>Family</th><th class="num">Pages</th><th class="num">Orphaned</th><th>Placeholder to create</th></tr></thead>
    <tbody>${missingHubRows}</tbody>
  </table></div>` : '<p class="muted">Every cluster of three or more resolved to a hub.</p>'}

  <h3>The placeholder set, in priority order</h3>
  <p class="lede">Ranked by how many live pages each one would rescue from having no parent.</p>

  <div class="builds">
    <div class="build"><span class="tag tag-new">build</span><code>/pages/intro-java</code><span class="num muted">109 pages</span>
      <span class="why">Intro to Java has six unit pages, 52 lessons, 41 help pages and ten projects, and no page that is the course. Every other course has one. This is the single largest structural gap on the site.</span></div>
    <div class="build"><span class="tag tag-new">build</span><code>/pages/intro-java-help</code><span class="num muted">41 pages</span>
      <span class="why">An index for the help library, which currently has no entry point. CSA already has <code>ap-csa-java-errors-hub</code> doing exactly this job, so the pattern exists and is not being applied here.</span></div>
    <div class="build"><span class="tag tag-fix">404</span><code>/pages/ap-csp-exam-prep-hub</code><span class="num muted">linked, missing</span>
      <span class="why">Linked from <code>ap-csp-course-big-idea-5-impact</code> and returns 404. CSA has <code>ap-csa-exam-prep-hub</code>; CSP's counterpart was linked before it was built.</span></div>
    <div class="build"><span class="tag tag-new">build</span><code>/pages/ap-csp-create-task</code><span class="num muted">3 pages, all orphaned</span>
      <span class="why">Create Task is a scored component of the CSP exam. Its three pages (practice, rescue kit, ultimate guide) have no hub and no inbound content link between them.</span></div>
    <div class="build"><span class="tag tag-new">build</span><code>/pages/for-teachers</code><span class="num muted">cross-course</span>
      <span class="why">Proposed in the August positioning audit and still absent. The buyer is a teacher and no page addresses one. Parent for the four Command Centers, which currently hang off nothing.</span></div>
    <div class="build"><span class="tag tag-new">build</span><code>/pages/for-students</code><span class="num muted">cross-course</span>
      <span class="why">Self-study entry: join a class, my progress, practice. Same audit.</span></div>
  </div>

  <h3>Spokes that exist but hang off nothing</h3>
  <div class="builds">
    <div class="build"><span class="tag tag-fix">wire</span><code>every -exercise page</code><span class="num muted">18 of 18</span>
      <span class="why">Every exercise page on the site has zero inbound content links, an average inbound degree of 0.0. They are graded activities reachable only from the nav. This is the cleanest hub-down fix available: their lesson pages already exist.</span></div>
    <div class="build"><span class="tag tag-fix">wire</span><code>AP Networking</code><span class="num muted">35 of 67</span>
      <span class="why">52% orphaned, the worst rate of any course with a hub. Launching as an invite-only pilot this year.</span></div>
    <div class="build"><span class="tag tag-fix">wire</span><code>course hub pages themselves</code><span class="num muted">9 of 14</span>
      <span class="why">Nine of the fourteen pages that behave as course hubs have no inbound content link of their own. The tops of the trees are orphans.</span></div>
  </div>
</section>

<section id="wired">
  <span class="sec-num">07 &middot; Executed</span>
  <h2>The linking pass</h2>
  <p class="lede">Six Matrixify sheets, hub-down first. Nothing was imported: a sheet is reviewable before it lands and re-runnable in MERGE mode after a partial import, which is the path this repo's conventions require for every page change.</p>

  <div class="stats">
    <div class="stat is-ok"><div class="v">1,211</div><div class="k">pages wired</div></div>
    <div class="stat is-ok"><div class="v">6,228</div><div class="k">links added</div></div>
    <div class="stat"><div class="v">0</div><div class="k">refusals remaining</div></div>
    <div class="stat is-ok"><div class="v">6/6</div><div class="k">sheets independently verified</div></div>
  </div>

  <div class="tbl-wrap"><table>
    <caption><b>The sheets</b>Import <code>links-orphan-rescue.csv</code> first: it is the smallest and carries the highest-value change.</caption>
    <thead><tr><th>Sheet</th><th class="num">Pages</th><th class="num">Links</th><th>Status</th></tr></thead>
    <tbody>
      <tr><th scope="row"><code>links-orphan-rescue.csv</code></th><td class="num">52</td><td class="num">233</td><td><span class="keep">verified</span></td></tr>
      <tr><th scope="row"><code>links-ap-csa.csv</code></th><td class="num">538</td><td class="num">3,057</td><td><span class="keep">verified</span></td></tr>
      <tr><th scope="row"><code>links-ap-csp.csv</code></th><td class="num">316</td><td class="num">1,634</td><td><span class="keep">verified</span></td></tr>
      <tr><th scope="row"><code>links-ap-cyber.csv</code></th><td class="num">220</td><td class="num">1,219</td><td><span class="keep">verified</span></td></tr>
      <tr><th scope="row"><code>links-ap-networking.csv</code></th><td class="num">67</td><td class="num">170</td><td><span class="keep">verified</span></td></tr>
      <tr><th scope="row"><code>links-intro-java.csv</code></th><td class="num">70</td><td class="num">148</td><td><span class="keep">verified</span></td></tr>
    </tbody>
  </table></div>

  <div class="note">
    <p><b>Every insertion is fenced.</b> HTML comments around the block, CSS comments around the rules. Stripping the fences returns the body the page started as, byte for byte, so verification reverses the edit rather than measuring how similar the result looks. The same fences make the pass idempotent: running it twice is the same as running it once.</p>
  </div>

  <div class="note warn">
    <p><b>Two pages could not be wired and are a content gap, not a linking one.</b> <code>/pages/ap-csa</code> and <code>/pages/ap-csp</code> store no body at all. They render the theme's heading and the contact block and nothing else, while carrying authored meta descriptions promising a full course. Under the architecture above these two URLs are the canonical course hubs, which makes them the highest-value pages to build on the whole site.</p>
  </div>
</section>

<section id="cuts">
  <span class="sec-num">08 &middot; Consolidation</span>
  <h2>Pages that compete with each other</h2>
  <p class="lede">The audit on 26 August found one intent spread across many URLs, so no single URL accumulates authority. Those findings stand and are not re-derived here.</p>

  ${twinRows ? `<h3>Same page, two or three URLs</h3>
  <p>Found by comparing handles as token sets rather than strings, with numbers bound to the word in front of them. This is a mechanical check, and it independently rediscovered the case the August audit had named by hand.</p>
  <div class="tbl-wrap"><table>
    <caption><b>Handle twins</b>Each block is one intent spread across several live URLs. Inbound counts are content links only.</caption>
    <thead><tr><th>URL</th><th class="num">Inbound</th><th>Position</th></tr></thead>
    <tbody>${twinRows}</tbody>
  </table></div>` : ''}

  <p>Beyond these mechanical twins, the August audit recorded the larger clusters by intent: AP Cybersecurity has eight URLs competing on overview intent and three on practice intent, AP CSA has six competing surfaces and AP CSP six. Those findings stand and are not re-derived here.</p>

  ${gsc ? `<div class="note">
    <p><b>Partially unblocked.</b> The August audit blocked consolidation until Search Console data existed, because picking which URL to keep without click data can redirect away the page earning the traffic. That data is now in section 04, and it changed the answer: the four folds listed there are safe, and two clusters that looked like duplicates are not.</p>
    <p>What is still blocked is anything not in that list. The export is capped at the top 1,000 pages by clicks, so a URL absent from it is known to be small, not known to be zero, and the cyber overview cluster still needs query-level data before three real pages are merged into one.</p>
  </div>` : `<div class="note stop">
    <p><b>Do not execute these until Search Console is connected.</b> Consolidating a cannibalised cluster means picking one URL to keep and redirecting the others into it. Picking that URL without click and impression data is a guess, and a wrong guess redirects away the page that was actually earning the traffic.</p>
    <p>This section is therefore a list to rank once the data exists, not a list to action.</p>
  </div>`}
</section>

<footer>
  Generated from a full crawl of ${n(t.crawled)} URLs on ${e(new Date(r.generated).toISOString().slice(0, 10))}.
  Regenerate with <code>scripts/link-graph.js</code>, <code>scripts/link-graph-report.js</code> and <code>scripts/link-architecture-html.js</code>.
  Findings decay; method does not.
</footer>
</div>`;

  fs.writeFileSync(OUT, html);
  console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
}

// ── FIGURES ──────────────────────────────────────────────────────────────────
function figureCurrent(t, unreachable, reachable) {
  return `<figure>
<svg viewBox="0 0 880 340" role="img" aria-label="Navigation chrome reaches every page while content links reach only part of the site, leaving ${unreachable} pages with no path from the homepage.">
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
    <marker id="ar-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor" opacity=".3"/>
    </marker>
  </defs>

  <text x="0" y="16" font-size="12" font-weight="600" fill="currentColor" opacity=".55" letter-spacing="1.2">NAVIGATION CHROME</text>
  <text x="450" y="16" font-size="12" font-weight="600" fill="currentColor" opacity=".55" letter-spacing="1.2">CONTENT LINKS</text>
  <line x1="425" y1="30" x2="425" y2="330" stroke="currentColor" stroke-width="1" opacity=".18"/>

  <rect x="130" y="36" width="150" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="205" y="56" font-size="12" text-anchor="middle" fill="currentColor">every page's nav</text>

  <g opacity=".3" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#ar-g)">
    <line x1="205" y1="70" x2="60" y2="120"/><line x1="205" y1="70" x2="132" y2="120"/>
    <line x1="205" y1="70" x2="205" y2="120"/><line x1="205" y1="70" x2="278" y2="120"/>
    <line x1="205" y1="70" x2="350" y2="120"/>
  </g>
  <g fill="currentColor" opacity=".22">
    <rect x="30" y="126" width="60" height="17" rx="3"/><rect x="102" y="126" width="60" height="17" rx="3"/>
    <rect x="174" y="126" width="60" height="17" rx="3"/><rect x="246" y="126" width="60" height="17" rx="3"/>
    <rect x="318" y="126" width="60" height="17" rx="3"/>
  </g>
  <g fill="currentColor" opacity=".14">
    <rect x="30" y="152" width="60" height="17" rx="3"/><rect x="102" y="152" width="60" height="17" rx="3"/>
    <rect x="174" y="152" width="60" height="17" rx="3"/><rect x="246" y="152" width="60" height="17" rx="3"/>
    <rect x="318" y="152" width="60" height="17" rx="3"/>
    <rect x="30" y="178" width="60" height="17" rx="3"/><rect x="102" y="178" width="60" height="17" rx="3"/>
    <rect x="174" y="178" width="60" height="17" rx="3"/><rect x="246" y="178" width="60" height="17" rx="3"/>
    <rect x="318" y="178" width="60" height="17" rx="3"/>
  </g>
  <text x="205" y="228" font-size="12.5" text-anchor="middle" fill="currentColor" opacity=".75">reaches all ${n(t.live)} pages</text>
  <text x="205" y="248" font-size="12.5" text-anchor="middle" fill="currentColor" opacity=".75">identical on every render</text>
  <text x="205" y="276" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor">so it separates nothing</text>

  <circle cx="560" cy="52" r="9" fill="currentColor"/>
  <text x="578" y="56" font-size="12" fill="currentColor">homepage</text>

  <g stroke="currentColor" stroke-width="1.6" marker-end="url(#ar)">
    <line x1="560" y1="63" x2="510" y2="104"/><line x1="560" y1="63" x2="610" y2="104"/>
  </g>
  <rect x="452" y="108" width="112" height="26" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="508" y="125" font-size="11.5" text-anchor="middle" fill="currentColor">course hub</text>
  <rect x="580" y="108" width="112" height="26" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="636" y="125" font-size="11.5" text-anchor="middle" fill="currentColor">course hub</text>

  <g stroke="currentColor" stroke-width="1.4" marker-end="url(#ar)">
    <line x1="490" y1="138" x2="470" y2="172"/><line x1="520" y1="138" x2="530" y2="172"/>
    <line x1="620" y1="138" x2="606" y2="172"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1.3">
    <rect x="432" y="176" width="76" height="22" rx="4"/><rect x="500" y="176" width="76" height="22" rx="4"/>
    <rect x="572" y="176" width="76" height="22" rx="4"/>
  </g>
  <text x="470" y="191" font-size="10.5" text-anchor="middle" fill="currentColor">lessons</text>
  <text x="538" y="191" font-size="10.5" text-anchor="middle" fill="currentColor">lessons</text>
  <text x="610" y="191" font-size="10.5" text-anchor="middle" fill="currentColor">lessons</text>
  <text x="540" y="222" font-size="12.5" text-anchor="middle" fill="currentColor" opacity=".75">${n(reachable)} pages reachable</text>

  <rect x="700" y="150" width="160" height="120" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity=".8"/>
  <text x="780" y="176" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">${n(unreachable)}</text>
  <text x="780" y="196" font-size="11.5" text-anchor="middle" fill="currentColor" opacity=".8">pages with no</text>
  <text x="780" y="212" font-size="11.5" text-anchor="middle" fill="currentColor" opacity=".8">content-link path</text>
  <text x="780" y="228" font-size="11.5" text-anchor="middle" fill="currentColor" opacity=".8">from the homepage</text>
  <text x="780" y="252" font-size="11" text-anchor="middle" fill="currentColor" opacity=".55">no edge reaches this box</text>

  <text x="450" y="316" font-size="11.5" fill="currentColor" opacity=".6">dashed = chrome, ignored &middot; solid = content link, counted</text>
</svg>
<figcaption><b>The same site under two link systems.</b> The navigation reaches every page, which is why a naive anchor count reports the site as fully connected. Following only links an author placed in content, ${n(unreachable)} pages have no path from the homepage at all: nothing points into the dashed box.</figcaption>
</figure>`;
}

function figureIdeal() {
  return `<figure>
<svg viewBox="0 0 880 400" role="img" aria-label="Proposed hub and spoke architecture: homepage to audience hub to course hub to four intent spokes, then units, lessons and activities, with every level linking back up to its hub.">
  <defs>
    <marker id="d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
    <marker id="u" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#2F6FED"/>
    </marker>
  </defs>

  <rect x="368" y="14" width="144" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.8"/>
  <text x="440" y="34" font-size="12.5" text-anchor="middle" fill="currentColor">homepage</text>

  <line x1="440" y1="44" x2="252" y2="70" stroke="currentColor" stroke-width="1.5" marker-end="url(#d)"/>
  <line x1="440" y1="44" x2="628" y2="70" stroke="currentColor" stroke-width="1.5" marker-end="url(#d)"/>
  <rect x="168" y="74" width="168" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="252" y="93" font-size="11.5" text-anchor="middle" fill="currentColor">/pages/for-teachers</text>
  <rect x="544" y="74" width="168" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="628" y="93" font-size="11.5" text-anchor="middle" fill="currentColor">/pages/for-students</text>
  <text x="440" y="93" font-size="10.5" text-anchor="middle" fill="currentColor" opacity=".55">dashed = to build</text>

  <line x1="252" y1="102" x2="415" y2="128" stroke="currentColor" stroke-width="1.5" marker-end="url(#d)"/>
  <line x1="628" y1="102" x2="465" y2="128" stroke="currentColor" stroke-width="1.5" marker-end="url(#d)"/>
  <rect x="352" y="132" width="176" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/>
  <text x="440" y="153" font-size="12.5" text-anchor="middle" font-weight="600" fill="currentColor">/pages/ap-{course}</text>
  <text x="440" y="178" font-size="10.5" text-anchor="middle" fill="currentColor" opacity=".6">canonical for the head term</text>

  <g stroke="currentColor" stroke-width="1.4" marker-end="url(#d)">
    <line x1="380" y1="164" x2="108" y2="204"/><line x1="410" y1="164" x2="300" y2="204"/>
    <line x1="470" y1="164" x2="580" y2="204"/><line x1="500" y1="164" x2="772" y2="204"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1.4">
    <rect x="20" y="208" width="176" height="28" rx="5"/><rect x="212" y="208" width="176" height="28" rx="5"/>
    <rect x="492" y="208" width="176" height="28" rx="5"/><rect x="684" y="208" width="176" height="28" rx="5"/>
  </g>
  <text x="108" y="227" font-size="11" text-anchor="middle" fill="currentColor">-curriculum</text>
  <text x="300" y="227" font-size="11" text-anchor="middle" fill="currentColor">-course</text>
  <text x="580" y="227" font-size="11" text-anchor="middle" fill="currentColor">-practice</text>
  <text x="772" y="227" font-size="11" text-anchor="middle" fill="currentColor">-exam-format</text>
  <text x="108" y="250" font-size="10" text-anchor="middle" fill="currentColor" opacity=".55">teacher intent</text>
  <text x="300" y="250" font-size="10" text-anchor="middle" fill="currentColor" opacity=".55">student intent</text>
  <text x="580" y="250" font-size="10" text-anchor="middle" fill="currentColor" opacity=".55">practice intent</text>
  <text x="772" y="250" font-size="10" text-anchor="middle" fill="currentColor" opacity=".55">exam intent</text>

  <line x1="300" y1="236" x2="360" y2="278" stroke="currentColor" stroke-width="1.4" marker-end="url(#d)"/>
  <rect x="300" y="282" width="150" height="26" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
  <text x="375" y="299" font-size="11" text-anchor="middle" fill="currentColor">unit hub</text>
  <line x1="375" y1="308" x2="375" y2="332" stroke="currentColor" stroke-width="1.4" marker-end="url(#d)"/>
  <rect x="300" y="336" width="150" height="26" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
  <text x="375" y="353" font-size="11" text-anchor="middle" fill="currentColor">lesson</text>

  <line x1="450" y1="349" x2="530" y2="349" stroke="currentColor" stroke-width="1.4" marker-end="url(#d)"/>
  <rect x="534" y="336" width="180" height="26" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
  <text x="624" y="353" font-size="11" text-anchor="middle" fill="currentColor">exercise / quiz / lab</text>

  <path d="M300 349 Q 190 349 190 300 Q 190 250 250 226" fill="none" stroke="#2F6FED" stroke-width="1.6" marker-end="url(#u)"/>
  <path d="M300 295 Q 240 295 236 250" fill="none" stroke="#2F6FED" stroke-width="1.6" marker-end="url(#u)"/>
  <text x="150" y="288" font-size="10.5" fill="#2F6FED" font-weight="600">links back up</text>

  <text x="20" y="392" font-size="11.5" fill="currentColor" opacity=".6">solid = exists &middot; dashed = placeholder to create &middot; blue = the return link that is missing today</text>
</svg>
<figcaption><b>One template for all five courses.</b> A course hub owns the head term; four spokes split it by intent so no two URLs compete for the same query. Below that the ladder is units to lessons to activities. The blue arrows are the half that is missing today: a spoke that cannot get back to its hub is a dead end, and a hub that does not list its spokes leaves them orphaned.</figcaption>
</figure>`;
}

main();
