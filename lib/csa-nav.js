'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA ACCORDION UNIT NAV (csanav).
//
//  WHY THIS EXISTS
//  AP Cybersecurity pages carry a fixed, top-of-viewport accordion strip
//  (#ucnav, see backup/ap-cyber-unit-1-lesson-2-lab.html lines 62-88 for the
//  CSS and 202-207 for the markup) that lists every lesson in the unit; click
//  a lesson to expand its activity steps (Lesson / Ex 1 / Ex 2 / Quiz) inline.
//  AP CSA pages only ever had a flat "Course > Unit > Lesson" breadcrumb, no
//  way to jump sideways to a sibling lesson or into an exercise without going
//  back through the hub. This module is the byte-for-byte-adapted CSA version
//  of that same component: same class names prefixed `csn-` instead of `ucn-`,
//  same fixed-position/accordion/lock behavior, same injection point (right
//  after the page's own scoped `</style>`, before its content wrapper div).
//
//  LOCK SEMANTICS (matches cyber's live precedent exactly, see the 1.3/1.4/1.5
//  entries in that same backup file): a lesson whose OWN page exists is always
//  a live, clickable accordion header, even if none of its activities beyond
//  the lesson itself are built yet. Only the individual STEP chips inside its
//  expanded row are locked (inert spans, opacity 0.4, cursor not-allowed) when
//  that specific activity page does not exist. Nothing is ever hidden; unbuilt
//  work is visibly present and visibly not-yet-available, same as cyber.
//
//  DATA SOURCE OF TRUTH
//  UNIT_1 and UNIT_4 below are a hand-verified snapshot of what is actually
//  live on Shopify as of 2026-08-21 (queried via the Admin GraphQL API, not
//  copied from course_manifest, which tracks gradable items server-side and
//  does not know what pages exist). Only 'lesson' and 'exercise-1' pages exist
//  for every Unit 1 lesson; Unit 4 additionally has 'exercise-2' but only for
//  the six lessons whose exercise content was rebuilt (4.6, 4.7, 4.13, 4.14,
//  4.15, 4.17). No CSA quiz page exists anywhere yet, so 'quiz' is always a
//  locked step for both units. If a quiz or a new exercise type ships later,
//  add its handle here and re-run the patch script; nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

const HUB_HREF = '/pages/ap-csa-course';

const STEP_LABELS = {
  lesson: 'Lesson',
  'exercise-1': 'Ex 1',
  'exercise-2': 'Ex 2',
  quiz: 'Quiz',
};

// title attr on the lesson header: short topic name, no "Lesson N.N:" prefix.
function shortTitle(fullTitle) {
  return String(fullTitle).replace(/^(Lesson\s+)?[\d.]+:?\s*/i, '').replace(/\s*\|\s*AP CSA\s*$/i, '').trim();
}

const UNIT_1 = {
  key: 'unit-1',
  badge: 'Unit 1',
  lessons: [
    ['1.1', 'ap-csa-lesson-1-1-intro-algorithms', 'Introduction to Algorithms, Programming, and Compilers'],
    ['1.2', 'ap-csa-lesson-1-2-variables-data-types', 'Variables and Data Types'],
    ['1.3', 'ap-csa-lesson-1-3-expressions-assignment', 'Expressions and Output'],
    ['1.4', 'ap-csa-lesson-1-4-assignment-statements-input', 'Assignment Statements and Input'],
    ['1.5', 'ap-csa-lesson-1-5-casting-range', 'Casting and Range of Variables'],
    ['1.6', 'ap-csa-lesson-1-6-compound-assignment', 'Compound Assignment Operators'],
    ['1.7', 'ap-csa-lesson-1-7-api-libraries', 'Application Program Interface (API) and Libraries'],
    ['1.8', 'ap-csa-lesson-1-8-documentation-comments', 'Documentation with Comments'],
    ['1.9', 'ap-csa-lesson-1-9-method-signatures', 'Method Signatures'],
    ['1.10', 'ap-csa-lesson-1-10-calling-class-methods', 'Calling Class Methods'],
    ['1.11', 'ap-csa-lesson-1-11-math-class', 'Math Class'],
    ['1.12', 'ap-csa-lesson-1-12-objects-instances', 'Objects: Instances of Classes'],
    ['1.13', 'ap-csa-lesson-1-13-object-creation', 'Object Creation and Storage (Instantiation)'],
    ['1.14', 'ap-csa-lesson-1-14-calling-instance-methods', 'Calling Instance Methods'],
    ['1.15', 'ap-csa-lesson-1-15-string-manipulation', 'String Manipulation'],
  ].map(([id, handle, title]) => ({
    id,
    title,
    lessonHandle: handle,
    built: { lesson: true, 'exercise-1': true, 'exercise-2': false, quiz: false },
  })),
};

const UNIT_4_BUILT = new Set(['4.6', '4.7', '4.13', '4.14', '4.15', '4.17']);

const UNIT_4 = {
  key: 'unit-4',
  badge: 'Unit 4',
  lessons: [
    ['4.1', 'ap-csa-lesson-4-1-ethical-social-issues-data-collection', 'Ethical and Social Issues Around Data Collection'],
    ['4.2', 'ap-csa-lesson-4-2-introduction-to-using-data-sets', 'Introduction to Using Data Sets'],
    ['4.3', 'ap-csa-lesson-4-3-array-creation-and-access', 'Array Creation and Access'],
    ['4.4', 'ap-csa-lesson-4-4-traversing-arrays', 'Traversing Arrays'],
    ['4.5', 'ap-csa-lesson-4-5-algorithms-with-arrays', 'Algorithms with Arrays'],
    ['4.6', 'ap-csa-lesson-4-6-using-text-files', 'Using Text Files'],
    ['4.7', 'ap-csa-lesson-4-7-wrapper-classes', 'Wrapper Classes'],
    ['4.8', 'ap-csa-lesson-4-8-arraylist-methods', 'ArrayList Methods'],
    ['4.9', 'ap-csa-lesson-4-9-traversing-arraylists', 'Traversing ArrayLists'],
    ['4.10', 'ap-csa-lesson-4-10-algorithms-with-arraylists', 'Algorithms with ArrayLists'],
    ['4.11', 'ap-csa-lesson-4-11-2d-array-creation-and-access', '2D Array Creation and Access'],
    ['4.12', 'ap-csa-lesson-4-12-traversing-2d-arrays', 'Traversing 2D Arrays'],
    ['4.13', 'ap-csa-lesson-4-13-implementing-2d-array-algorithms', 'Implementing 2D Array Algorithms'],
    ['4.14', 'ap-csa-lesson-4-14-searching-algorithms', 'Searching Algorithms'],
    ['4.15', 'ap-csa-lesson-4-15-sorting-algorithms', 'Sorting Algorithms'],
    ['4.16', 'ap-csa-lesson-4-16-recursion', 'Recursion'],
    ['4.17', 'ap-csa-lesson-4-17-recursive-searching-and-sorting', 'Recursive Searching and Sorting'],
  ].map(([id, handle, title]) => ({
    id,
    title,
    lessonHandle: handle,
    built: {
      lesson: true,
      'exercise-1': UNIT_4_BUILT.has(id),
      'exercise-2': UNIT_4_BUILT.has(id),
      quiz: false,
    },
  })),
};

const UNITS = { 'unit-1': UNIT_1, 'unit-4': UNIT_4 };

function activityHref(lesson, activity) {
  if (activity === 'lesson') return `/pages/${lesson.lessonHandle}`;
  return `/pages/${lesson.lessonHandle}-${activity}`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CSS = `
<style>
#csanav{position:fixed!important;left:50%!important;transform:translateX(-50%)!important;width:100%!important;max-width:980px!important;z-index:10000!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif!important;box-shadow:0 3px 18px rgba(0,0,0,.4)!important;background:#1a0840!important;margin:0!important;padding:0!important;border-radius:0 0 12px 12px!important;top:0!important;}
#csanav *{box-sizing:border-box!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif!important;-webkit-font-smoothing:antialiased!important;}
#csanav .csn-rail{display:flex!important;align-items:stretch!important;height:40px!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;background:#1a0840!important;border-bottom:2px solid rgba(109,40,217,.5)!important;border-radius:0 0 12px 12px!important;}
#csanav .csn-rail::-webkit-scrollbar{display:none!important;}
#csanav .csn-hub{display:inline-flex!important;align-items:center!important;padding:0 14px!important;height:40px!important;flex-shrink:0!important;font-size:12px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.8px!important;white-space:nowrap!important;text-decoration:none!important;background:#6d28d9!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border-right:2px solid rgba(167,139,250,.4)!important;transition:background .15s!important;}
#csanav .csn-hub:link,#csanav .csn-hub:visited,#csanav a.csn-hub,#csanav a.csn-hub:link,#csanav a.csn-hub:visited{color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;text-decoration:none!important;}
#csanav .csn-hub:hover{background:#5b21b6!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;}
#csanav .csn-badge{display:inline-flex!important;align-items:center!important;padding:0 12px 0 14px!important;flex-shrink:0!important;font-size:11px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:1.2px!important;color:#c4b5fd!important;-webkit-text-fill-color:#c4b5fd!important;border-right:1px solid rgba(167,139,250,.25)!important;white-space:nowrap!important;}
#csanav .csn-lesson{display:inline-flex!important;align-items:center!important;gap:6px!important;padding:0 14px!important;height:40px!important;flex-shrink:0!important;cursor:pointer!important;font-size:13px!important;font-weight:600!important;background:transparent!important;border:none!important;white-space:nowrap!important;border-right:1px solid rgba(255,255,255,.08)!important;transition:background .15s!important;text-decoration:none!important;color:#e2e0f0!important;-webkit-text-fill-color:#e2e0f0!important;}
#csanav .csn-lesson:link,#csanav .csn-lesson:visited,#csanav .csn-lesson:hover,#csanav .csn-lesson:active,#csanav a.csn-lesson,#csanav a.csn-lesson:link,#csanav a.csn-lesson:visited{color:#e2e0f0!important;-webkit-text-fill-color:#e2e0f0!important;text-decoration:none!important;}
#csanav .csn-lesson:hover{background:rgba(109,40,217,.25)!important;}
#csanav .csn-lesson.open{background:rgba(109,40,217,.4)!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border-bottom:2px solid #7c3aed!important;margin-bottom:-2px!important;}
#csanav .csn-lesson.open:link,#csanav .csn-lesson.open:visited{color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;}
#csanav .csn-chevron{font-size:9px!important;transition:transform .2s!important;color:#a78bfa!important;-webkit-text-fill-color:#a78bfa!important;display:inline-block!important;}
#csanav .csn-lesson.open .csn-chevron{transform:rotate(180deg)!important;}
#csanav .csn-steps{display:none!important;align-items:stretch!important;border-left:2px solid #7c3aed!important;flex-shrink:0!important;}
#csanav .csn-steps.open{display:inline-flex!important;}
#csanav .csn-step{display:inline-flex!important;align-items:center!important;gap:5px!important;padding:0 13px!important;height:40px!important;flex-shrink:0!important;font-size:12px!important;font-weight:500!important;white-space:nowrap!important;border-right:1px solid rgba(255,255,255,.07)!important;text-decoration:none!important;transition:background .12s,color .12s!important;color:#d4d0f0!important;-webkit-text-fill-color:#d4d0f0!important;background:rgba(109,40,217,.15)!important;}
#csanav .csn-step:link,#csanav .csn-step:visited,#csanav a.csn-step,#csanav a.csn-step:link,#csanav a.csn-step:visited{color:#d4d0f0!important;-webkit-text-fill-color:#d4d0f0!important;text-decoration:none!important;}
#csanav .csn-step:hover{background:rgba(109,40,217,.35)!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;}
#csanav .csn-step.current{background:rgba(109,40,217,.45)!important;color:#c4b5fd!important;-webkit-text-fill-color:#c4b5fd!important;font-weight:700!important;}
#csanav .csn-step.current:link,#csanav .csn-step.current:visited{color:#c4b5fd!important;-webkit-text-fill-color:#c4b5fd!important;}
@media(max-width:600px){#csanav .csn-badge{display:none!important;}}
</style>`.trim();

// currentLessonId: e.g. "4.6". currentActivity: 'lesson'|'exercise-1'|'exercise-2'|'quiz'.
function renderNav(unitKey, currentLessonId, currentActivity) {
  const unit = UNITS[unitKey];
  if (!unit) throw new Error(`csa-nav: unknown unit ${unitKey}`);

  const entries = unit.lessons.map((lesson) => {
    const isOpen = lesson.id === currentLessonId;
    const stepsHtml = ['lesson', 'exercise-1', 'exercise-2', 'quiz']
      .map((activity) => {
        const label = STEP_LABELS[activity];
        const isCurrent = isOpen && activity === currentActivity;
        if (!lesson.built[activity]) {
          return `<span class="csn-step" style="opacity:0.4!important;cursor:not-allowed!important;">${label}</span>`;
        }
        const cls = isCurrent ? 'csn-step current' : 'csn-step';
        if (isCurrent) return `<span class="${cls}">${label}</span>`;
        return `<a href="${esc(activityHref(lesson, activity))}" class="${cls}">${label}</a>`;
      })
      .join(' ');

    const lessonLink = `/pages/${lesson.lessonHandle}`;
    return (
      `<a href="${lessonLink}" class="csn-lesson${isOpen ? ' open' : ''}" id="csn-l${lesson.id.replace('.', '-')}" title="${esc(shortTitle(lesson.title))}">${esc(lesson.id)} <span class="csn-chevron">&#9660;</span></a> ` +
      `<span class="csn-steps${isOpen ? ' open' : ''}" id="csn-s${lesson.id.replace('.', '-')}"> ${stepsHtml} </span>`
    );
  });

  const html =
    `<div id="csanav">\n<div class="csn-rail" id="csn-rail">\n` +
    `<a href="${HUB_HREF}" class="csn-hub">AP CSA Hub</a> <span class="csn-badge">${esc(unit.badge)}</span> ` +
    entries.join(' ') +
    `\n</div>\n</div>`;

  const js = `
<script>
(function(){
  document.querySelectorAll('#csanav .csn-lesson').forEach(function(btn){
    btn.addEventListener('click',function(e){
      var stepsId='csn-s'+btn.id.replace('csn-l','');
      var steps=document.getElementById(stepsId);
      var isOpen=btn.classList.contains('open');
      if(!isOpen)e.preventDefault();
      document.querySelectorAll('#csanav .csn-lesson').forEach(function(b){b.classList.remove('open');});
      document.querySelectorAll('#csanav .csn-steps').forEach(function(s){s.classList.remove('open');});
      if(!isOpen&&steps){btn.classList.add('open');steps.classList.add('open');}
    });
  });
})();
</script>`.trim();

  return `<!-- CSANAV-START -->${CSS}\n${html}\n<p> </p>\n${js}<!-- CSANAV-END -->`;
}

// Insert (or replace, if already present) the nav block into a page body,
// right after the first </style> close tag, matching the injection point
// used by every csa lesson/exercise page template in this repo.
function injectNav(bodyHtml, unitKey, lessonId, activity) {
  const nav = renderNav(unitKey, lessonId, activity);
  const stripped = bodyHtml.replace(/<!-- CSANAV-START -->[\s\S]*?<!-- CSANAV-END -->\n?/, '');
  const idx = stripped.indexOf('</style>');
  if (idx === -1) throw new Error('csa-nav: no </style> found to anchor injection');
  const cut = idx + '</style>'.length;
  return stripped.slice(0, cut) + '\n' + nav + '\n' + stripped.slice(cut);
}

function lessonById(unitKey, lessonId) {
  const unit = UNITS[unitKey];
  if (!unit) return null;
  return unit.lessons.find((l) => l.id === lessonId) || null;
}

// Every (unitKey, lessonId, activity, handle) tuple that actually has a live
// page today, for the patch script to iterate over.
function allTargets() {
  const out = [];
  for (const unitKey of Object.keys(UNITS)) {
    for (const lesson of UNITS[unitKey].lessons) {
      for (const activity of ['lesson', 'exercise-1', 'exercise-2', 'quiz']) {
        if (!lesson.built[activity]) continue;
        const handle = activity === 'lesson' ? lesson.lessonHandle : `${lesson.lessonHandle}-${activity}`;
        out.push({ unitKey, lessonId: lesson.id, activity, handle });
      }
    }
  }
  return out;
}

module.exports = { renderNav, injectNav, lessonById, allTargets, UNITS, HUB_HREF };
