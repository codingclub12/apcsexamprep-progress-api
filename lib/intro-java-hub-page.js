'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: COURSE LANDING PAGE AND UNIT HUBS.
//
//  The front door. Until this existed, 42 lesson pages and 41 help pages had no
//  parent: nothing linked them together, nothing described the course as a
//  whole, and the breadcrumbs on every lesson pointed at two URLs that did not
//  resolve. That is an internal-linking hole as much as a missing page.
//
//  ── THIS IS THE TEACHER-FACING SURFACE, AND THAT CHANGES THE COPY ───────────
//  A lesson page is read by a student who has already enrolled. THESE pages are
//  read by a teacher deciding whether to adopt a course, and by a student or
//  parent working out what it leads to. Different reader, different job,
//  different words.
//
//  So the AP relationship belongs HERE and nowhere else. A teacher searching for
//  a first-year course wants to know it feeds AP CSA; a fourteen-year-old three
//  lessons into Unit 4 does not need to hear about an exam they have not signed
//  up for. smoke/intro-java-content.js enforces that split in both directions:
//  forbidden on lesson and help pages, REQUIRED here.
//
//  ── ON THE WORDING, WHICH IS A DELIBERATE LEGAL CHOICE ──────────────────────
//  "Pre-AP" is a College Board trademark for a program schools license. Using it
//  as this course's NAME would imply an affiliation and an authorization that do
//  not exist, and the buyers here are schools and districts, which is exactly the
//  audience where that gets noticed.
//
//  So the headline framing describes the RELATIONSHIP, which is true and is
//  ordinary nominative use: "before AP Computer Science A", "prepares students
//  for AP CSA". The one descriptive mention of the pre-AP category sits in
//  PREAP_LINE below, isolated on purpose so it can be strengthened or deleted in
//  a single edit once someone has taken a view on it.
//
//  PREAP_LINE deliberately says "the pre-AP year", not "a pre-AP computer science
//  course". The first draft said the latter, and smoke check 12.8 rejected it:
//  "pre-AP" sitting directly against "computer science" reads as the program
//  name even in lower case. The check was kept strict and the sentence reworded,
//  because a guard that occasionally forces a rephrase is worth more than one
//  loose enough to let a brand claim through.
//
//  Theme constraints are the same ones lib/intro-java-page.js documents.
//  Zero PII. No em-dashes, per repo convention. ASCII only.
// ─────────────────────────────────────────────────────────────────────────────

const { esc, escAttr, SITE } = require('./intro-java-page');
const { handleFor } = require('./intro-java-page');
const { PROJECTS } = require('../seed/intro-java-projects-library');

const WRAP = 'ij-hub';

// ── WHY THE COURSE HUB LIVES ON A HANDLE THAT LOOKS WRONG ────────────────────
// This reads like a legacy slug because it is one. A page has sat here since
// 2025-09-15 carrying a library of Greenfoot project tutorials, and it has had
// a year to accumulate the links, age and ranking that a brand new `intro-java`
// handle would start with none of.
//
// So the course hub takes the handle over rather than competing with it. Same
// URL, same authority, and no redirect to leak through. The projects that were
// on it are not discarded: seed/intro-java-projects-library.js holds them and
// the hub renders them below, because a Matrixify import replaces a body rather
// than merging into it, and those video and starter-file links existed nowhere
// else.
//
// Changing this constant changes every internal link, every breadcrumb and every
// piece of structured data in one move, which is the only reason taking over a
// legacy slug is a one-line decision rather than a migration.
// Defined in lib/intro-java-page.js so all three renderers share one value.
const { COURSE_HANDLE } = require('./intro-java-page');

// The one sentence that uses the pre-AP phrasing, and it describes how the
// course is USED rather than claiming a College Board program. Isolated so the
// decision is a one-line change. Set to null to remove it entirely.
const PREAP_LINE =
  'Schools most often run this as the pre-AP year before AP Computer Science A, or as the '
  + 'first year of a two-year sequence that finishes with the AP course.';

// Unit hubs are NEW pages with no legacy slug to inherit, so they keep the
// clean prefix. They are deliberately not derived from COURSE_HANDLE: that
// would have turned every unit into
// `greenfoot-basics-beginner-greenfoot-projects-and-tutorials-unit-1`.
const COURSE_SLUG = 'intro-java';
const unitHandle = (unit) => `${COURSE_SLUG}-${unit}`;

function jsonForScript(value) {
  return JSON.stringify(value)
    .split('<').join('\\u003c')
    .split('>').join('\\u003e')
    .split('&').join('\\u0026');
}

function paras(text, cls) {
  return String(text || '').split('\n\n').map((t) => t.trim()).filter(Boolean)
    .map((t) => `<p${cls ? ` class="${cls}"` : ''}>${esc(t)}</p>`).join('\n');
}

function renderCss() {
  return `<style>
#${WRAP} { all: initial !important; display: block !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  color: #16202b !important; line-height: 1.65 !important; max-width: 880px !important;
  margin: 0 auto !important; padding: 8px 16px 72px !important; }
#${WRAP} * { box-sizing: border-box !important; }
#${WRAP} h1 { font-size: 38px !important; line-height: 1.12 !important; margin: 0 0 14px !important;
  color: #10306b !important; -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} h2 { font-size: 24px !important; margin: 44px 0 12px !important; color: #10306b !important;
  -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} h3 { font-size: 18px !important; margin: 0 0 6px !important; color: #16202b !important;
  -webkit-text-fill-color: #16202b !important; font-weight: 700 !important; }
#${WRAP} p, #${WRAP} li { font-size: 17px !important; color: #16202b !important;
  -webkit-text-fill-color: #16202b !important; }
#${WRAP} a { color: #0b5cd5 !important; -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} .ij-lede { font-size: 20px !important; line-height: 1.55 !important; color: #33414f !important;
  -webkit-text-fill-color: #33414f !important; }
#${WRAP} .ij-facts { display: flex !important; flex-wrap: wrap !important; gap: 10px !important;
  margin: 22px 0 0 !important; padding: 0 !important; list-style: none !important; }
#${WRAP} .ij-facts li { background: #eef4ff !important; border: 1px solid #c5d8fb !important;
  border-radius: 20px !important; padding: 6px 15px !important; font-size: 14.5px !important;
  color: #10306b !important; -webkit-text-fill-color: #10306b !important; font-weight: 600 !important; }
#${WRAP} .ij-units { list-style: none !important; padding: 0 !important; margin: 0 !important; }
#${WRAP} .ij-unit { border: 1px solid #e0e6ec !important; border-radius: 8px !important;
  padding: 18px 20px !important; margin: 0 0 14px !important; }
#${WRAP} .ij-unit-n { font-family: Menlo, Consolas, monospace !important; font-size: 11.5px !important;
  letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 4px !important; }
#${WRAP} .ij-unit p { margin: 6px 0 0 !important; color: #3d4b59 !important;
  -webkit-text-fill-color: #3d4b59 !important; }
#${WRAP} .ij-projs { list-style: none !important; padding: 0 !important; margin: 0 !important;
  display: grid !important; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
  gap: 14px !important; }
#${WRAP} .ij-proj { border: 1px solid #e0e6ec !important; border-left: 4px solid #1c7a4a !important;
  border-radius: 8px !important; padding: 16px 18px !important; }
#${WRAP} .ij-proj-pending { border-left-color: #b9c2cc !important; background: #f7f9fb !important; }
#${WRAP} .ij-proj-n { font-family: Menlo, Consolas, monospace !important; font-size: 11.5px !important;
  letter-spacing: 0.08em !important; text-transform: uppercase !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 4px !important; }
#${WRAP} .ij-proj p { margin: 6px 0 0 !important; color: #3d4b59 !important;
  -webkit-text-fill-color: #3d4b59 !important; font-size: 15.5px !important; }
#${WRAP} .ij-proj-links { display: flex !important; flex-wrap: wrap !important; gap: 8px !important;
  margin-top: 12px !important; }
#${WRAP} .ij-proj-link { background: #eef7f1 !important; border: 1px solid #c4e0d0 !important;
  border-radius: 5px !important; padding: 5px 11px !important; font-size: 14px !important;
  font-weight: 600 !important; text-decoration: none !important; }
#${WRAP} .ij-proj-soon { font-style: italic !important; color: #6b7683 !important;
  -webkit-text-fill-color: #6b7683 !important; font-size: 14.5px !important; }
#${WRAP} .ij-lessons { list-style: none !important; padding: 0 !important; margin: 14px 0 0 !important; }
#${WRAP} .ij-lessons li { padding: 7px 0 !important; border-bottom: 1px solid #eef1f4 !important; }
#${WRAP} .ij-lessons li:last-child { border-bottom: 0 !important; }
#${WRAP} .ij-lnum { font-family: Menlo, Consolas, monospace !important; font-size: 13px !important;
  color: #5a6672 !important; -webkit-text-fill-color: #5a6672 !important; margin-right: 10px !important; }
#${WRAP} .ij-mins { font-size: 13px !important; color: #7b8794 !important;
  -webkit-text-fill-color: #7b8794 !important; }
#${WRAP} .ij-callout { background: #f7faf8 !important; border: 1px solid #cfe3d6 !important;
  border-radius: 8px !important; padding: 4px 20px 18px !important; }
#${WRAP} .ij-grid2 { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
  gap: 18px !important; }
#${WRAP} .ij-card { border: 1px solid #e0e6ec !important; border-radius: 8px !important;
  padding: 16px 18px !important; }
#${WRAP} .ij-nav { display: flex !important; justify-content: space-between !important;
  gap: 16px !important; flex-wrap: wrap !important; margin-top: 44px !important;
  border-top: 1px solid #e0e6ec !important; padding-top: 18px !important; }
#${WRAP} a:focus-visible { outline: 3px solid #ffb020 !important; outline-offset: 2px !important; }
</style>`;
}

// ── Course landing page ──────────────────────────────────────────────────────

// Written for the person deciding whether to adopt the course.
const COURSE_SEO = {
  h1: 'Intro to Java with Greenfoot: the year before AP CSA',
  title: 'Intro to Java with Greenfoot | Before AP Computer Science A',
  description:
    'A full first-year Java course taught through Greenfoot games, from a first actor to 2D '
    + 'array tile maps. Built to lead into AP Computer Science A.',
  faq: [
    {
      q: 'What course should students take before AP Computer Science A?',
      a: 'A first-year Java course that covers objects, methods, conditionals, loops, arrays and '
        + '2D arrays. This course covers all of them through Greenfoot game projects, so students '
        + 'arrive at AP CSA already able to read and write the Java it assumes.',
    },
    {
      q: 'Do students need any programming experience to start?',
      a: 'None. Unit 1 assumes no coding, no IDE experience and no vocabulary, and nothing in the '
        + 'course asks a beginner to write code from a blank screen.',
    },
    {
      q: 'How much of the course grades itself?',
      a: 'Roughly 85 percent of the points. Concept checks, fill-in-the-code exercises and short '
        + 'quizzes are marked automatically; the six game projects are scored by the teacher '
        + 'against a rubric.',
    },
    {
      q: 'What software do students need?',
      a: 'Greenfoot, which is free, plus a browser for the lessons. There is nothing to install on '
        + 'the school network beyond Greenfoot itself.',
    },
    {
      q: 'How long is the course?',
      a: 'Six units and 42 lessons, plus six game projects. It is built to fill a full school year '
        + 'at roughly two lessons a week.',
    },
  ],
};

const HOW_IT_IS_TAUGHT = [
  {
    h: 'Every lesson is a build walkthrough',
    p: 'Numbered steps, each with a screenshot of the Greenfoot window, the code as text, and an '
      + 'explanation of what changed and why. Every step leaves a scenario that compiles and runs, '
      + 'so a student who stops halfway has a working game rather than a wall of errors.',
  },
  {
    h: 'Code arrives with holes in it, never blank',
    p: 'Students fill specific gaps in working code. It teaches the syntax without demanding a '
      + 'beginner produce a whole class from nothing, and it is marked instantly.',
  },
  {
    h: 'Wrong ideas are named, not just corrected',
    p: 'Every lesson has a block on the mistakes students actually make here: that act() runs once, '
      + 'that y grows upward, that a score declared in the wrong place will remember anything. '
      + 'Naming a wrong idea kills it faster than repeating the right one.',
  },
  {
    h: 'Getting stuck has its own pages',
    p: 'Forty-one reference pages covering compiler errors, runtime errors, and the silent problems '
      + 'that produce no error at all. Opening one is never counted against a student.',
  },
];

/** Human label for a unit key, so a project can say which unit it belongs to. */
function unitLabelOf(banks, unit) {
  const b = banks.find((x) => x.unit === unit);
  return b ? b.label : unit;
}

function renderCourseHub(banks, help) {
  const totalLessons = banks.reduce((n, b) => n + b.lessons.length, 0);
  const totalMinutes = banks.reduce(
    (n, b) => n + b.lessons.reduce((m, l) => m + Number(l.minutes || 0), 0), 0);

  const units = banks.map((b, i) => {
    const first = b.lessons[0];
    const last = b.lessons[b.lessons.length - 1];
    return `<li class="ij-unit">
<p class="ij-unit-n">Unit ${i + 1} &middot; ${b.lessons.length} lessons</p>
<h3><a href="${escAttr(`${SITE}/pages/${unitHandle(b.unit)}`)}">${esc(b.label)}</a></h3>
<p>${esc(first.title)} through ${esc(last.title)}.</p>
</li>`;
  }).join('\n');

  const taught = HOW_IT_IS_TAUGHT.map((t) => `<div class="ij-card">
<h3>${esc(t.h)}</h3>
<p>${esc(t.p)}</p>
</div>`).join('\n');

  const faqHtml = COURSE_SEO.faq.map((f) => `<div class="ij-card">
<h3>${esc(f.q)}</h3>
<p>${esc(f.a)}</p>
</div>`).join('\n');

  // The project library this page already carried. External links open in a new
  // tab with rel=noopener, which is what the previous version did and is right
  // for a link off to Drive or YouTube mid-lesson.
  const ext = (url, label) =>
    `<a class="ij-proj-link" href="${escAttr(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  const projectsHtml = PROJECTS.map((p) => {
    const links = [];
    if (p.files) links.push(ext(p.files, 'Starter files'));
    for (const v of p.videos) links.push(ext(v.url, `${v.label} video`));
    const linkRow = links.length
      ? `<p class="ij-proj-links">${links.join(' ')}</p>`
      : '<p class="ij-proj-links ij-proj-soon">Starter code and video coming soon</p>';
    return `<li class="ij-proj${p.comingSoon ? ' ij-proj-pending' : ''}">
<p class="ij-proj-n">Project ${p.n} &middot; ${esc(unitLabelOf(banks, p.unit))}</p>
<h3>${esc(p.title)}</h3>
<p>${esc(p.blurb)}</p>
${linkRow}
</li>`;
  }).join('\n');

  const course = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'Intro to Java with Greenfoot',
    description: COURSE_SEO.description,
    url: `${SITE}/pages/${COURSE_HANDLE}`,
    educationalLevel: 'Beginner',
    inLanguage: 'en',
    teaches: banks.map((b) => b.label),
    timeRequired: `PT${totalMinutes}M`,
    provider: { '@type': 'Organization', name: 'APCSExamPrep', url: SITE },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${totalMinutes}M`,
    },
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Units in Intro to Java with Greenfoot',
    itemListElement: banks.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.label,
      url: `${SITE}/pages/${unitHandle(b.unit)}`,
    })),
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: COURSE_SEO.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const body = [
    `<div id="${WRAP}" data-course="intro-java" data-page="course-hub">`,
    renderCss(),
    `<h1>${esc(COURSE_SEO.h1)}</h1>`,
    paras(
      'A complete first-year Java course, taught by building games in Greenfoot. It starts with a '
      + 'student who has never opened a code editor and finishes with one who can render and '
      + 'navigate a 2D array tile map, which is the work AP Computer Science A spends weeks on.',
      'ij-lede'),
    PREAP_LINE ? `<p>${esc(PREAP_LINE)}</p>` : '',
    `<ul class="ij-facts">
<li>${banks.length} units</li>
<li>${totalLessons} lessons</li>
<li>6 game projects</li>
<li>${PROJECTS.length} project tutorials</li>
<li>No experience needed</li>
<li>Greenfoot is free</li>
</ul>`,

    '<h2>What students can do by the end</h2>',
    paras(
      'Read and write the Java that AP Computer Science A assumes on day one: objects and methods, '
      + 'variables and conditionals, loops, arrays, and 2D arrays. They will have built six working '
      + 'games doing it, which is the part that keeps a first-year class in the room.'),

    '<h2>The six units</h2>',
    `<ul class="ij-units">\n${units}\n</ul>`,

    '<h2>How it is taught</h2>',
    `<div class="ij-grid2">\n${taught}\n</div>`,

    '<h2>What a teacher has to do</h2>',
    `<div class="ij-callout">
${paras('Roughly 85 percent of the points mark themselves. Concept checks, fill-in-the-code '
  + 'exercises and end-of-lesson quizzes are graded automatically and land in your gradebook.')}
${paras('What you score by hand is the six game projects, against a rubric. That is deliberate: a '
  + 'Greenfoot scenario is built on the desktop and cannot report itself, and a course that '
  + 'pretended otherwise would be marking a checkbox rather than a game.')}
</div>`,

    '<h2>Greenfoot project tutorials</h2>',
    paras(
      'Eleven build-along projects with starter files and video walkthroughs, filed under the unit '
      + 'whose material each one uses. They are optional and they are not graded: a Greenfoot '
      + 'scenario runs on the desktop and cannot report itself. Use them as the reward at the end '
      + 'of a unit, or as the thing a student who finishes early goes and does.'),
    `<ul class="ij-projs">\n${projectsHtml}\n</ul>`,

    '<h2>Common questions</h2>',
    `<div class="ij-grid2">\n${faqHtml}\n</div>`,

    `<nav class="ij-nav" aria-label="Course navigation">
<a href="${escAttr(`${SITE}/pages/${unitHandle(banks[0].unit)}`)}">Start with ${esc(banks[0].label)}</a>
</nav>`,

    [course, itemList, faq]
      .map((g) => `<script type="application/ld+json">${jsonForScript(g)}</script>`)
      .join('\n'),
    '</div>',
  ].filter(Boolean).join('\n');

  return {
    handle: COURSE_HANDLE,
    kind: 'course-hub',
    title: 'Intro to Java with Greenfoot',
    seoTitle: COURSE_SEO.title,
    seoDescription: COURSE_SEO.description,
    bodyHtml: body,
  };
}

// ── Unit hub ─────────────────────────────────────────────────────────────────

function renderUnitHub(bank, opts) {
  const o = opts || {};
  const help = o.help || { ALL: [] };
  const n = Number(String(bank.unit).split('-')[1]);
  const minutes = bank.lessons.reduce((m, l) => m + Number(l.minutes || 0), 0);

  const lessons = bank.lessons.map((l) => `<li>
<span class="ij-lnum">${esc(l.lesson)}</span>
<a href="${escAttr(`${SITE}/pages/${handleFor(l)}`)}">${esc(l.title)}</a>
<span class="ij-mins"> &middot; ${esc(String(l.minutes))} min</span>
</li>`).join('\n');

  // The help pages that become relevant during this unit. Useful to a teacher
  // scanning what support exists, and a real internal link from a hub to the
  // pages that would otherwise only be reachable from inside a lesson.
  const unitHelp = help.ALL.filter((h) => String(h.after).split('.')[0] === String(n));
  const helpHtml = unitHelp.length
    ? `<h2>Support pages for this unit</h2>
${paras('These cover the problems that come up during these lessons. Students can open them '
  + 'freely; doing so is not tracked and is never counted against them.')}
<ul class="ij-lessons">
${unitHelp.map((h) => `<li><a href="${escAttr(`${SITE}/pages/${h.handle}`)}">${esc(h.title)}</a></li>`).join('\n')}
</ul>`
    : '';

  const seoTitle = `${bank.label} | Intro to Java with Greenfoot`;
  const seoDescription = String(o.description);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: bank.label,
    itemListElement: bank.lessons.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${l.lesson} ${l.title}`,
      url: `${SITE}/pages/${handleFor(l)}`,
    })),
  };

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Intro to Java with Greenfoot', item: `${SITE}/pages/${COURSE_HANDLE}` },
      { '@type': 'ListItem', position: 2, name: bank.label, item: `${SITE}/pages/${unitHandle(bank.unit)}` },
    ],
  };

  const nav = [];
  if (o.prev) {
    nav.push(`<a rel="prev" href="${escAttr(`${SITE}/pages/${unitHandle(o.prev.unit)}`)}">`
      + `Previous: ${esc(o.prev.label)}</a>`);
  }
  nav.push(`<a href="${escAttr(`${SITE}/pages/${COURSE_HANDLE}`)}">All units</a>`);
  if (o.next) {
    nav.push(`<a rel="next" href="${escAttr(`${SITE}/pages/${unitHandle(o.next.unit)}`)}">`
      + `Next: ${esc(o.next.label)}</a>`);
  }

  const body = [
    `<div id="${WRAP}" data-course="intro-java" data-page="unit-hub" data-unit="${escAttr(bank.unit)}">`,
    renderCss(),
    `<p class="ij-unit-n"><a href="${escAttr(`${SITE}/pages/${COURSE_HANDLE}`)}">`
      + 'Intro to Java with Greenfoot</a></p>',
    `<h1>${esc(bank.label)}</h1>`,
    paras(o.blurb, 'ij-lede'),
    `<ul class="ij-facts">
<li>${bank.lessons.length} lessons</li>
<li>about ${Math.round(minutes / 60)} hours</li>
<li>Unit ${n} of 6</li>
</ul>`,
    '<h2>Lessons in this unit</h2>',
    `<ul class="ij-lessons">\n${lessons}\n</ul>`,
    helpHtml,
    `<nav class="ij-nav" aria-label="Unit navigation">\n${nav.join('\n')}\n</nav>`,
    [itemList, crumbs]
      .map((g) => `<script type="application/ld+json">${jsonForScript(g)}</script>`)
      .join('\n'),
    '</div>',
  ].filter(Boolean).join('\n');

  return {
    handle: unitHandle(bank.unit),
    kind: 'unit-hub',
    unit: bank.unit,
    title: bank.label,
    seoTitle: seoTitle.length <= 65 ? seoTitle : `${bank.label} | Intro to Java`,
    seoDescription,
    bodyHtml: body,
  };
}

// Per-unit copy. Written for someone deciding whether the unit covers what they
// need, so each says what a student can DO afterwards rather than listing topics.
const UNIT_COPY = {
  'unit-1': {
    blurb: 'The orientation unit. Students meet scenarios, worlds and actors, learn what a class '
      + 'and an object actually are, and write their first behaviour inside act(). Nothing here '
      + 'assumes any prior coding at all.',
    description: 'Greenfoot basics for absolute beginners: worlds, actors, classes and objects, '
      + 'method calls, and the act loop. Six lessons, no experience needed.',
  },
  'unit-2': {
    blurb: 'Where programs start making decisions. Variables and types, arithmetic and the integer '
      + 'division trap, boolean logic, if and else if chains, randomness, and moving a player with '
      + 'the arrow keys.',
    description: 'Java variables, operators, booleans, if and else if, randomness and keyboard '
      + 'input, taught by building a playable game. Seven beginner lessons.',
  },
  'unit-3': {
    blurb: 'The heaviest unit, and the one that buys the most later. Writing methods, parameters '
      + 'and return values, the World class, constructors, and instance variables, which is where '
      + 'a game finally learns to remember a score.',
    description: 'Java methods, parameters, return values, constructors and instance variables, '
      + 'taught through Greenfoot worlds. Nine lessons for beginners.',
  },
  'unit-4': {
    blurb: 'Repetition and groups. While and for loops, the loop patterns that count and total, '
      + 'collisions between actors, lists of actors, and spawning a whole wave of enemies with a '
      + 'single loop.',
    description: 'Java while and for loops, loop patterns, collision detection and lists of '
      + 'actors, building toward wave-based games. Seven lessons.',
  },
  'unit-5': {
    blurb: 'Arrays, and the one rule the rest of the course depends on: an array of length n has '
      + 'indexes 0 to n-1. Traversal, the five array algorithms, and using array data to drive a '
      + 'level rather than hardcoding it.',
    description: 'Java arrays for beginners: declaring, indexing, traversal, the five core array '
      + 'algorithms, and driving game levels from array data. Six lessons.',
  },
  'unit-6': {
    blurb: 'The destination. 2D arrays, row-major indexing, nested loops, converting grid positions '
      + 'to world coordinates, and rendering a tile map into a playable level. This is the work AP '
      + 'Computer Science A spends weeks on.',
    description: 'Java 2D arrays and tile maps: row-major indexing, nested loops, grid to world '
      + 'coordinates, and rendering a playable level from an array. Seven lessons.',
  },
};

function renderAllHubs(banks, help) {
  const out = [renderCourseHub(banks, help)];
  banks.forEach((b, i) => {
    const copy = UNIT_COPY[b.unit] || { blurb: b.label, description: b.label };
    out.push(renderUnitHub(b, {
      help,
      blurb: copy.blurb,
      description: copy.description,
      prev: banks[i - 1] || null,
      next: banks[i + 1] || null,
    }));
  });
  return out;
}

module.exports = {
  renderCourseHub, renderUnitHub, renderAllHubs,
  COURSE_HANDLE, unitHandle, UNIT_COPY, COURSE_SEO, PREAP_LINE, WRAP,
};
