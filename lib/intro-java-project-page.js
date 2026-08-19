'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ONE PAGE PER GREENFOOT PROJECT, WITH THE VIDEO ON IT.
//
//  ── WHY THESE PAGES EXIST ───────────────────────────────────────────────────
//  The course hub listed each project as a bare link to YouTube. Every student
//  who wanted a tutorial left the site to get it, which is the worst possible
//  trade: the watch time goes to YouTube, the dwell time goes to YouTube, and
//  the student loses the one thing a page can give them that a video cannot,
//  which is a list they can read while the video plays.
//
//  Embedding does not cost the YouTube revenue. Embedded playback still counts
//  and still monetises, so this is additive rather than a swap.
//
//  ── WHAT GOES UNDER THE VIDEO, AND WHY IT GOES THERE ────────────────────────
//  The method list. It is the reason to stay on the page rather than a
//  decoration: a student following a build wants to see the calls written down
//  while they watch, and scrubbing a timeline to re-hear a method name is the
//  single most annoying thing about learning from video.
//
//  Each method carries the lesson that teaches it, so a student who has not got
//  there yet can see exactly what they are missing rather than feeling stupid.
//  The `untaught` list is the honest half: calls the project needs that the
//  course never covers anywhere. Saying so on the page is better than a student
//  hitting one alone at 11pm and assuming they forgot a lesson.
//
//  ── THE HANDLE IS DELIBERATELY NOT A LESSON HANDLE ──────────────────────────
//  `intro-java-project-N-slug` returns null from pageFromHandle, which is
//  checked in smoke. If it parsed as a lesson, every visit to a project page
//  would be written to the progress tracker as lesson progress and quietly
//  inflate completion for work that is not graded and cannot be.
//
//  ── PRIVACY ─────────────────────────────────────────────────────────────────
//  youtube-nocookie.com is used rather than youtube.com. It defers tracking
//  cookies until playback starts, which matters because these pages are read by
//  minors and the zero-PII posture of this project should not stop at the API.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { esc, escAttr, SITE, COURSE_URL } = require('./intro-java-page');
const { METHODS } = require('../seed/intro-java-project-methods');

const WRAP = 'ij-proj';

/**
 * Pulls the video id out of any of the three YouTube URL shapes in the library.
 *
 * @param {string} url a youtu.be or youtube.com/watch link
 * @return {string|null} the eleven character id, or null if it does not match
 */
function videoId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function handleFor(project) {
  const meta = METHODS[project.n];
  return `intro-java-project-${project.n}-${meta.slug}`;
}

/**
 * Cuts a string to a length without splitting the last word.
 *
 * @param {string} s the text
 * @param {number} max the ceiling, inclusive
 * @return {string} s unchanged, or trimmed back to the last space before max
 */
function clamp(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > 40 ? cut.slice(0, space) : cut).replace(/[ ,.]+$/, '') + '.';
}

function renderCss() {
  return `<style>
#${WRAP} { all: initial !important; display: block !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  color: #16202b !important; line-height: 1.65 !important; max-width: 820px !important;
  margin: 0 auto !important; padding: 8px 16px 64px !important; }
#${WRAP} * { box-sizing: border-box !important; }
#${WRAP} h1 { font-size: 34px !important; line-height: 1.15 !important; margin: 0 0 10px !important;
  color: #10306b !important; -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} h2 { font-size: 23px !important; margin: 36px 0 12px !important; color: #10306b !important;
  -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} p, #${WRAP} li, #${WRAP} td, #${WRAP} th { font-size: 17px !important; color: #16202b !important;
  -webkit-text-fill-color: #16202b !important; }
#${WRAP} a { color: #0b5cd5 !important; -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} .ij-meta { font-size: 14px !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 18px !important; }
#${WRAP} .ij-vid { position: relative !important; width: 100% !important;
  padding-bottom: 56.25% !important; height: 0 !important; margin: 0 0 10px !important;
  background: #10202f !important; border-radius: 8px !important; overflow: hidden !important; }
#${WRAP} .ij-vid iframe { position: absolute !important; top: 0 !important; left: 0 !important;
  width: 100% !important; height: 100% !important; border: 0 !important; }
#${WRAP} .ij-vid-label { font-size: 14px !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 26px !important; }
#${WRAP} .ij-setup { background: #eef4ff !important; border: 1px solid #c5d8fb !important;
  padding: 12px 14px !important; border-radius: 6px !important; margin: 0 0 22px !important; }
#${WRAP} table { border-collapse: collapse !important; width: 100% !important; margin: 0 0 18px !important; }
#${WRAP} th { text-align: left !important; font-size: 13px !important; letter-spacing: 0.06em !important;
  text-transform: uppercase !important; color: #3d4b59 !important;
  -webkit-text-fill-color: #3d4b59 !important; border-bottom: 2px solid #e0e6ec !important;
  padding: 8px 10px 8px 0 !important; }
#${WRAP} td { border-bottom: 1px solid #eef1f4 !important; padding: 10px 10px 10px 0 !important;
  vertical-align: top !important; }
#${WRAP} code { font-family: Menlo, Consolas, monospace !important; font-size: 14.5px !important;
  background: #f2f5f8 !important; color: #10202f !important; -webkit-text-fill-color: #10202f !important;
  padding: 2px 6px !important; border-radius: 4px !important; }
#${WRAP} .ij-at { display: inline-block !important; font-size: 12px !important; font-weight: 700 !important;
  background: #e2f4ea !important; color: #14603c !important; -webkit-text-fill-color: #14603c !important;
  padding: 2px 8px !important; border-radius: 3px !important; white-space: nowrap !important; }
#${WRAP} .ij-gap { background: #fbf7ec !important; border: 1px solid #ecdfc0 !important;
  border-radius: 6px !important; padding: 4px 18px 18px !important; margin: 0 0 22px !important; }
#${WRAP} .ij-gap .ij-at { background: #fde8e6 !important; color: #96261b !important;
  -webkit-text-fill-color: #96261b !important; }
#${WRAP} .ij-files { margin: 0 0 26px !important; }
#${WRAP} .ij-btn { display: inline-block !important; background: #0b5cd5 !important;
  color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; text-decoration: none !important;
  padding: 11px 20px !important; border-radius: 6px !important; font-weight: 600 !important; }
#${WRAP} .ij-nav { display: flex !important; justify-content: space-between !important;
  gap: 16px !important; flex-wrap: wrap !important; margin-top: 40px !important;
  border-top: 1px solid #e0e6ec !important; padding-top: 18px !important; }
</style>`;
}

function renderJsonLd(project, meta) {
  const ids = (project.videos || []).map((v) => videoId(v.url)).filter(Boolean);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `${project.title} - Greenfoot project`,
    description: project.blurb,
    url: `${SITE}/pages/${handleFor(project)}`,
    learningResourceType: 'Project',
    educationalLevel: 'Beginner',
    teaches: meta.uses.map((u) => u.call),
    inLanguage: 'en',
    isPartOf: {
      '@type': 'Course',
      name: 'Intro to Java with Greenfoot',
      url: COURSE_URL,
      provider: { '@type': 'Organization', name: 'APCSExamPrep', url: SITE },
    },
  };
  if (ids.length) {
    data.video = ids.map((id) => ({
      '@type': 'VideoObject',
      name: `${project.title} tutorial`,
      description: project.blurb,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      uploadDate: '2025-09-15',
    }));
  }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

/**
 * Builds one project page.
 *
 * @param {object} project an entry from seed/intro-java-projects-library.js
 * @param {object} opts { prev, next } neighbouring projects, either may be null
 * @return {object} { kind, handle, title, seoTitle, seoDescription, bodyHtml }
 */
function renderProject(project, opts) {
  const o = opts || {};
  const meta = METHODS[project.n];
  if (!meta) throw new Error(`no method list for project ${project.n} (${project.title})`);

  const videos = (project.videos || [])
    .map((v) => ({ label: v.label, id: videoId(v.url) }))
    .filter((v) => v.id);

  const player = videos.length
    ? videos.map((v) => `<div class="ij-vid">
<iframe src="${escAttr(`https://www.youtube-nocookie.com/embed/${v.id}?rel=0`)}"
 title="${escAttr(`${project.title} ${v.label}`)}" loading="lazy" allowfullscreen
 allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
</div>
<p class="ij-vid-label">${esc(v.label)}. Put this window on one side of your screen and Greenfoot on the other, then build along with it.</p>`).join('\n')
    : '<p class="ij-setup">No video for this one yet. The starter files and the method list below are all you need.</p>';

  const files = project.files
    ? `<p class="ij-files"><a class="ij-btn" href="${escAttr(project.files)}">Get the starter files</a></p>`
    : '';

  const uses = `<h2>Methods you will use</h2>
<p>Every one of these appears in the build. The lesson number is where the
course teaches it, so if a row looks unfamiliar you have not missed anything,
you just have not got there yet.</p>
<table>
<thead><tr><th>Method</th><th>Taught in</th><th>What it does here</th></tr></thead>
<tbody>
${meta.uses.map((u) => `<tr><td><code>${esc(u.call)}</code></td>`
    + `<td><span class="ij-at">${esc(u.at)}</span></td>`
    + `<td>${esc(u.why)}</td></tr>`).join('\n')}
</tbody>
</table>`;

  const gaps = meta.untaught.length
    ? `<div class="ij-gap">
<h2>Not covered by the course</h2>
<p>This project uses these, and the lessons never get to them. That is not a
gap in your knowledge. Copy them from the video, or ask.</p>
<table>
<thead><tr><th>Method</th><th>Why it is here</th></tr></thead>
<tbody>
${meta.untaught.map((u) => `<tr><td><code>${esc(u.call)}</code></td><td>${esc(u.why)}</td></tr>`).join('\n')}
</tbody>
</table>
</div>`
    : '';

  const nav = [
    o.prev ? `<a href="${escAttr(`${SITE}/pages/${handleFor(o.prev)}`)}">Previous: ${esc(o.prev.title)}</a>` : '<span></span>',
    o.next ? `<a href="${escAttr(`${SITE}/pages/${handleFor(o.next)}`)}">Next: ${esc(o.next.title)}</a>` : '<span></span>',
  ].join('\n');

  const title = `${project.title}: a Greenfoot project`;

  const body = [
    `<div id="${WRAP}" data-project="${escAttr(String(project.n))}">`,
    renderCss(),
    `<h1>${esc(project.title)}</h1>`,
    `<p class="ij-meta">Greenfoot project ${esc(String(project.n))} &middot; `
      + `part of <a href="${escAttr(COURSE_URL)}">Intro to Java with Greenfoot</a> &middot; `
      + `not graded, and not tracked as progress</p>`,
    `<p>${esc(project.blurb)}</p>`,
    `<p class="ij-setup"><strong>Before you start:</strong> finish lesson ${esc(meta.needs)}. `
      + 'That is the last thing this project needs. Starting earlier is allowed and you will '
      + 'hit a method nobody has shown you yet.</p>',
    player,
    files,
    uses,
    gaps,
    `<nav class="ij-nav">${nav}</nav>`,
    renderJsonLd(project, meta),
    '</div>',
  ].filter(Boolean).join('\n');

  return {
    kind: 'project',
    handle: handleFor(project),
    title,
    seoTitle: title.length <= 60 ? title : `${project.title} | Greenfoot project`,
    // Parenthesised on purpose. Without the brackets `.slice` binds to the
    // second template literal alone and the cap silently does nothing, which is
    // exactly what happened the first time: descriptions came out at 198 chars
    // against a 160 ceiling and every page would have failed the SEO gate.
    // Trimmed at a space so the tail is never a half word.
    seoDescription: clamp(
      `${project.blurb} Video walkthrough, starter files, and every method the `
      + 'build uses with the lesson that teaches it.', 158),
    bodyHtml: body,
  };
}

module.exports = { renderProject, handleFor, videoId, WRAP };
