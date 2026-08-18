'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CANVAS COURSE PACKAGE - the whole course as one .imscc a teacher imports.
//
//  WHAT PROBLEM THIS SOLVES
//  docs/canvas-export.md moves GRADES into Canvas. It works, and it has one
//  ugly step in the middle: Canvas asks the teacher to confirm every new
//  assignment and its points possible, one at a time, on the first import.
//  Fifty-three lessons of AP CSA is fifty-three confirmations, each of which is
//  a chance to typo a name and silently orphan a column. And a course with
//  multiple grading periods enabled will not create assignments from a CSV AT
//  ALL, so those teachers have to hand-build every assignment before their
//  first import or the file does nothing.
//
//  This builds the other half: a Canvas course package carrying the modules,
//  the lesson links and the assignments, already named and already worth 100
//  points each. Import it once and the gradebook CSV lands on assignments that
//  are already there.
//
//  THE ONE INVARIANT THAT MATTERS
//  A Canvas gradebook CSV import matches an existing assignment BY NAME. So
//  every assignment name here comes from canvasUnitColumns / canvasActivityColumns
//  in lib/export-format.js, which is the same call the CSV export makes for its
//  headers. Not a copy of the naming rule: the call. If those two strings ever
//  differ by a space, the import creates a second empty assignment beside the
//  real one and the teacher gets a gradebook with every column twice. The smoke
//  suite asserts header-for-header equality between the two files, because
//  reasoning about it is not the same as checking it.
//
//  Points possible is UNIT_POINTS (100) for the same reason: it is what the CSV
//  writes in its "Points Possible" row.
//
//  WHY THE ASSIGNMENTS TAKE NO SUBMISSION
//  The work happens on apcsexamprep.com, where it is auto-graded. A Canvas
//  assignment that accepted an upload would invite a second, ungraded copy of
//  the same work. So each one is submission_types=none: a place for the grade
//  to land, with a link in its description to the page that produces it.
//
//  ZERO PII
//  Nothing student-specific is in this package. It is course structure and
//  public page links, identical for every teacher of that course, and it is
//  built from the course config rather than from any class row. The class code
//  in the route is an ownership check and an entitlement gate, not an input.
//
//  WHAT IS DELIBERATELY NOT HERE
//    - Due dates. They are per-class and per-year, and a wrong one is worse
//      than none. Assignments import undated.
//    - Quiz content. The questions live on the storefront behind the bundle;
//      shipping them inside a cartridge is a copy a teacher could forward.
//    - An LTI tool or an OAuth push. Same reason as the CSV: a file a teacher
//      uploads needs no admin approval and no integration to maintain.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const { zipSync } = require('./zip');
const {
  canvasUnitColumns, canvasActivityColumns, selectedUnitIds, activityIncluded,
  UNIT_POINTS, CANVAS_COURSE_LABELS, shortUnit,
} = require('./export-format');
const { examsOf } = require('../utils');

// The storefront the lesson links point at. Overridable so a staging run does
// not hand a teacher production links, but the default is the real site because
// that is what a real teacher wants in the file.
const SITE = (process.env.STOREFRONT_BASE_URL || 'https://apcsexamprep.com').replace(/\/+$/, '');

// ── identifiers ──────────────────────────────────────────────────────────────
//  Canvas migration ids are opaque strings. Deriving each one from a stable key
//  rather than a counter means the same course exports to the same ids every
//  time, which is what makes the whole package byte-reproducible.
function id(...parts) {
  return 'i' + crypto.createHash('md5').update(parts.join('|')).digest('hex');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// A file name inside the zip. ASCII, lowercase, no spaces: a cartridge is
// unzipped on every operating system a school owns.
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
}

// ── WHERE A LESSON LIVES ─────────────────────────────────────────────────────
//  A course package without links is a gradebook skeleton. With them it is the
//  course. Handles are NOT derivable for every course, so this reads the same
//  authored sources the page builders use rather than guessing a URL that would
//  404 in a teacher's Canvas.
//
//  Both requires are lazy. seed/csa-exercises is 220 KB of authored Java and
//  routes/admin.js already loads it on demand for the same reason: an API box
//  with 1 GB does not pay that at boot for a route almost nobody calls.
function csaLinks() {
  const exercises = require('../seed/csa-exercises');
  const { UNIT_HUBS } = require('./csa-exercise-pages');
  const out = new Map();
  for (const x of exercises.all()) {
    out.set(x.lesson, {
      title: `${x.lesson} ${x.title}`,
      url: `${SITE}/pages/${x.handle}`,
      // Built by lib/csa-exercise-pages.js, one per lesson, all 53.
      exercise: { title: `${x.lesson} Coding Exercise: ${x.name}`, url: `${SITE}/pages/${x.handle}-exercise-1` },
    });
  }
  const hubs = new Map(Object.entries(UNIT_HUBS).map(([u, h]) => [u, `${SITE}/pages/${h}`]));
  return { lessons: out, hubs };
}

function cspLinks() {
  const { TOPICS, BIG_IDEAS } = require('./csp-course-pages');
  const out = new Map();
  for (const [slug, t] of TOPICS) {
    // The live handle rule, the same one utils.pageFromHandle reads back.
    const handle = `ap-csp-course-bi${t.bigIdea.n}-${slug}`;
    const words = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    out.set(slug, { title: `${t.topic} ${words}`, url: `${SITE}/pages/${handle}`, exercise: null });
  }
  const hubs = new Map(Object.entries(BIG_IDEAS).map(([u, b]) => [u, `${SITE}/pages/${b.hub}`]));
  return { lessons: out, hubs };
}

// A course with no link table still exports a real package: modules and named
// assignments, just no page links. That is strictly better than refusing, and
// it is why this returns empty maps rather than throwing.
const EMPTY_LINKS = { lessons: new Map(), hubs: new Map() };

function linksFor(course) {
  try {
    if (course === 'ap-csa') return csaLinks();
    if (course === 'ap-csp') return cspLinks();
  } catch (e) {
    // A missing generated file must not take the route down with it. The
    // package degrades to structure-only and says so in the summary.
    console.error(`[canvas-package] link table for ${course} unavailable:`, e.message);
  }
  return EMPTY_LINKS;
}

// ── the pieces of a Canvas cartridge ─────────────────────────────────────────
const NS = 'xmlns="http://canvas.instructure.com/xsd/cccv1p0"'
  + ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
  + ' xsi:schemaLocation="http://canvas.instructure.com/xsd/cccv1p0'
  + ' https://canvas.instructure.com/xsd/cccv1p0.xsd"';

// Element ORDER and element SET are both copied from a real Canvas course
// export (a CodeHS course, exported from bvusd.instructure.com, read field by
// field). Two differences from the first draft mattered: this carried a
// <quiz_identifierref/>, which a real non-quiz assignment does not have at all,
// and it had workflow_state before assignment_group_identifierref, which is the
// reverse of what Canvas writes. Neither was worth guessing about once a real
// file was available to copy.
function assignmentSettingsXml(a) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<assignment identifier="${a.id}" ${NS}>
  <title>${esc(a.name)}</title>
  <due_at/>
  <lock_at/>
  <unlock_at/>
  <module_locked>false</module_locked>
  <assignment_group_identifierref>${a.groupId}</assignment_group_identifierref>
  <workflow_state>published</workflow_state>
  <assignment_overrides>
  </assignment_overrides>
  <allowed_extensions></allowed_extensions>
  <has_group_category>false</has_group_category>
  <points_possible>${a.points}.0</points_possible>
  <grading_type>points</grading_type>
  <all_day>false</all_day>
  <submission_types>none</submission_types>
  <position>${a.position}</position>
  <turnitin_enabled>false</turnitin_enabled>
  <vericite_enabled>false</vericite_enabled>
  <peer_review_count>0</peer_review_count>
  <peer_reviews>false</peer_reviews>
  <automatic_peer_reviews>false</automatic_peer_reviews>
  <anonymous_peer_reviews>false</anonymous_peer_reviews>
  <grade_group_students_individually>false</grade_group_students_individually>
  <freeze_on_copy>false</freeze_on_copy>
  <omit_from_final_grade>false</omit_from_final_grade>
  <hide_in_gradebook>false</hide_in_gradebook>
  <intra_group_peer_reviews>false</intra_group_peer_reviews>
  <only_visible_to_overrides>false</only_visible_to_overrides>
  <post_to_sis>false</post_to_sis>
  <moderated_grading>false</moderated_grading>
  <grader_count>0</grader_count>
  <grader_comments_visible_to_graders>true</grader_comments_visible_to_graders>
  <anonymous_grading>false</anonymous_grading>
  <graders_anonymous_to_graders>false</graders_anonymous_to_graders>
  <grader_names_visible_to_final_grader>true</grader_names_visible_to_final_grader>
  <anonymous_instructor_annotations>false</anonymous_instructor_annotations>
  <post_policy>
    <post_manually>false</post_manually>
  </post_policy>
</assignment>`;
}

// The assignment's description. A teacher clicking it in Canvas, and a student
// clicking it from the modules page, both need to land on the work.
function assignmentBodyHtml(a) {
  const link = a.url
    ? `<p><a href="${esc(a.url)}">Open this activity on APCSExamPrep</a></p>`
    : '';
  return `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>${esc(a.name)}</title>
</head>
<body>
<p>${esc(a.blurb)}</p>
${link}
<p>This assignment holds the grade only. The work is completed and automatically
graded on APCSExamPrep, and the score arrives here through the teacher gradebook
export. Do not submit anything in Canvas.</p>
</body>
</html>`;
}

// Common Cartridge 1.1, because that is the version the manifest declares and
// the version Canvas itself exports. A 1.3 web link inside a 1.1 manifest is
// the kind of inconsistency an importer is entitled to reject.
function webLinkXml(w) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<webLink xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imswl_v1p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imswl_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imswl_v1p1.xsd">
  <title>${esc(w.title)}</title>
  <url href="${esc(w.url)}" target="_blank" windowFeatures="width=800,height=600"/>
</webLink>`;
}

function courseSettingsXml(c) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<course identifier="${c.id}" ${NS}>
  <title>${esc(c.title)}</title>
  <course_code>${esc(c.code)}</course_code>
  <is_public>false</is_public>
  <indexed>false</indexed>
  <grading_standard_enabled>false</grading_standard_enabled>
  <storage_quota>524288000</storage_quota>
  <restrict_enrollments_to_course_dates>false</restrict_enrollments_to_course_dates>
</course>`;
}

function assignmentGroupsXml(groups) {
  const body = groups.map((g) => `  <assignmentGroup identifier="${g.id}">
    <title>${esc(g.title)}</title>
    <position>${g.position}</position>
    <group_weight>0.0</group_weight>
  </assignmentGroup>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<assignmentGroups ${NS}>
${body}
</assignmentGroups>`;
}

function moduleMetaXml(modules) {
  const mods = modules.map((m) => {
    const items = m.items.map((it) => `      <item identifier="${it.id}">
        <content_type>${it.contentType}</content_type>
        <workflow_state>active</workflow_state>
        <title>${esc(it.title)}</title>
        <identifierref>${it.ref}</identifierref>${it.url ? `\n        <url>${esc(it.url)}</url>` : ''}
        <position>${it.position}</position>
        ${it.newTab ? '<new_tab>true</new_tab>' : '<new_tab/>'}
        <indent>${it.indent}</indent>
        <link_settings_json>null</link_settings_json>
      </item>`).join('\n');
    return `  <module identifier="${m.id}">
    <title>${esc(m.title)}</title>
    <workflow_state>active</workflow_state>
    <position>${m.position}</position>
    <require_sequential_progress>false</require_sequential_progress>
    <locked>false</locked>
    <items>
${items}
    </items>
  </module>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<modules ${NS}>
${mods}
</modules>`;
}

// The Canvas cartridge marker. Its PRESENCE is the whole signal: it is what
// tells Canvas to read course_settings/*.xml instead of importing the plain
// Common Cartridge organization tree twice.
const CANVAS_EXPORT_TXT = 'Q: What did the panda say when he was forced out of his natural habitat?\n'
  + 'A: This is un-BEAR-able\n';

// THE ORGANIZATION TREE AND module_meta SHARE IDENTIFIERS, DELIBERATELY.
//  A real Canvas export uses the SAME identifier for a module in both places,
//  and the same identifier for each item. The first draft here suffixed the
//  organization copies with "_o" to keep them unique, which is exactly the bug
//  that would have produced a course with every module and every assignment
//  twice: Canvas correlates the two files by identifier, and two identifiers
//  are two things.
function manifestXml({ manifestId, title, modules, resources }) {
  const org = modules.map((m) => {
    const items = m.items.map((it) =>
      `        <item identifier="${it.id}" identifierref="${it.ref}">
          <title>${esc(it.title)}</title>
        </item>`).join('\n');
    return `      <item identifier="${m.id}">
        <title>${esc(m.title)}</title>
${items}
      </item>`;
  }).join('\n');

  const res = resources.map((r) => {
    const files = r.files.map((f) => `      <file href="${esc(f)}"/>`).join('\n');
    const dep = (r.dependencies || []).map((d) => `      <dependency identifierref="${d}"/>`).join('\n');
    return `    <resource identifier="${r.id}" type="${r.type}"${r.href ? ` href="${esc(r.href)}"` : ''}>
${files}${dep ? '\n' + dep : ''}
    </resource>`;
  }).join('\n');

  // COMMON CARTRIDGE 1.1, NOT 1.3. Canvas exports 1.1 and this file is imported
  // as a "Canvas Course Export Package", so 1.1 is the dialect its importer is
  // built around. 1.3 is a newer valid cartridge and was the first guess here;
  // a real Canvas export settled it.
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}"
  xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"
  xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource"
  xmlns:lomimscc="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imscp_v1p2_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lommanifest_v1p0.xsd">
  <metadata>
    <schema>IMS Common Cartridge</schema>
    <schemaversion>1.1.0</schemaversion>
    <lomimscc:lom>
      <lomimscc:general>
        <lomimscc:title>
          <lomimscc:string>${esc(title)}</lomimscc:string>
        </lomimscc:title>
      </lomimscc:general>
      <lomimscc:lifeCycle>
        <lomimscc:contribute>
          <lomimscc:date>
            <lomimscc:dateTime>2026-01-01</lomimscc:dateTime>
          </lomimscc:date>
        </lomimscc:contribute>
      </lomimscc:lifeCycle>
    </lomimscc:lom>
  </metadata>
  <organizations>
    <organization identifier="org_1" structure="rooted-hierarchy">
      <item identifier="LearningModules">
${org}
      </item>
    </organization>
  </organizations>
  <resources>
${res}
  </resources>
</manifest>`;
}

// ── the build ────────────────────────────────────────────────────────────────
//  scope=unit      one assignment per unit, plus a link per lesson. The compact
//                  shape, and the default, exactly as the CSV export defaults.
//  scope=activity  one assignment per graded activity, matching the ~55 column
//                  CSV. The lesson link still ships, because a module of
//                  assignments with nothing to read is not a course.
function buildCanvasCoursePackage({ course, courseConfig, scope = 'unit', filter = null }) {
  if (!courseConfig) throw new Error(`unknown course ${course}`);
  if (scope !== 'unit' && scope !== 'activity') throw new Error("scope must be 'unit' or 'activity'");

  const prefix = CANVAS_COURSE_LABELS[course] || courseConfig.label || course;
  const courseTitle = courseConfig.label || prefix;
  const links = linksFor(course);
  const unitIds = selectedUnitIds(courseConfig, filter && filter.units);
  const include = filter && filter.include;

  // One assignment group, named for the course, so these land together and a
  // teacher can weight or delete them as a set.
  const group = { id: id(course, 'group'), title: `${prefix} (APCSExamPrep)`, position: 1 };

  const cols = scope === 'unit'
    ? canvasUnitColumns(course, courseConfig, filter)
    : canvasActivityColumns(course, courseConfig, filter);
  const colsByUnit = new Map(unitIds.map((u) => [u, []]));
  for (const c of cols) if (colsByUnit.has(c.unit)) colsByUnit.get(c.unit).push(c);

  const files = [];
  const resources = [];
  const modules = [];
  const assignments = [];
  let assignmentPosition = 0;

  // A resource that is a link out to the storefront.
  function addWebLink(key, title, url) {
    const rid = id(course, 'link', key);
    const href = `${rid}/${slugify(title)}.xml`;
    files.push({ name: href, data: webLinkXml({ title, url }) });
    resources.push({ id: rid, type: 'imswl_xmlv1p1', href, files: [href] });
    return rid;
  }

  // A resource that is a Canvas assignment: its description page and its
  // settings, in one folder named by the resource id.
  function addAssignment({ key, name, blurb, url }) {
    const rid = id(course, 'assignment', key);
    assignmentPosition++;
    const a = {
      id: rid, name, blurb, url, points: UNIT_POINTS,
      groupId: group.id, position: assignmentPosition,
    };
    const htmlHref = `${rid}/${slugify(name)}.html`;
    const xmlHref = `${rid}/assignment_settings.xml`;
    files.push({ name: htmlHref, data: assignmentBodyHtml(a) });
    files.push({ name: xmlHref, data: assignmentSettingsXml(a) });
    resources.push({
      id: rid,
      type: 'associatedcontent/imscc_xmlv1p1/learning-application-resource',
      href: htmlHref,
      files: [htmlHref, xmlHref],
    });
    assignments.push({ name, points: UNIT_POINTS, url: url || null });
    return rid;
  }

  let modPos = 0;
  for (const unitId of unitIds) {
    const u = courseConfig.units[unitId];
    modPos++;
    const items = [];
    let itemPos = 0;
    const push = (contentType, title, ref, url, indent) => {
      itemPos++;
      items.push({
        id: id(course, 'item', unitId, String(itemPos)),
        contentType, title, ref, url: url || null,
        position: itemPos, newTab: contentType === 'ExternalUrl', indent: indent || 0,
      });
    };

    const hub = links.hubs.get(unitId);
    if (hub) push('ExternalUrl', `${u.label || shortUnit(unitId)}: course hub`, addWebLink(`hub-${unitId}`, `${u.label || shortUnit(unitId)} hub`, hub), hub, 0);

    const unitCols = colsByUnit.get(unitId) || [];
    const byLesson = new Map();
    for (const c of unitCols) {
      if (!byLesson.has(c.lesson)) byLesson.set(c.lesson, []);
      byLesson.get(c.lesson).push(c);
    }

    for (const lesson of u.lessons) {
      const link = links.lessons.get(lesson);
      if (link) {
        push('ExternalUrl', link.title, addWebLink(`lesson-${lesson}`, link.title, link.url), link.url, 1);
        // The coding exercise is its own page. In activity scope the Exercise 1
        // assignment carries the link too, but a student reading the module in
        // order should not have to open an assignment to find the editor.
        if (link.exercise && activityIncluded(include, 'exercise-1') && (u.activities || []).includes('exercise-1')) {
          push('ExternalUrl', link.exercise.title,
            addWebLink(`exercise-${lesson}`, link.exercise.title, link.exercise.url), link.exercise.url, 2);
        }
      }
      for (const c of (byLesson.get(lesson) || [])) {
        const ref = addAssignment({
          key: `${unitId}|${lesson}|${c.activity}`,
          name: c.header,
          blurb: `${courseTitle}, ${u.label || shortUnit(unitId)}. Graded automatically on APCSExamPrep.`,
          url: link ? link.url : null,
        });
        push('Assignment', c.header, ref, null, 2);
      }
    }

    // Case files and unit exams hang off the unit, not off a lesson, so their
    // columns are not in byLesson and would otherwise be dropped silently.
    const lessonSet = new Set(u.lessons);
    for (const c of unitCols) {
      if (lessonSet.has(c.lesson)) continue;
      const ref = addAssignment({
        key: `${unitId}|${c.lesson}|${c.activity}`,
        name: c.header,
        blurb: `${courseTitle}, ${u.label || shortUnit(unitId)}. Graded automatically on APCSExamPrep.`,
        url: links.hubs.get(unitId) || null,
      });
      push('Assignment', c.header, ref, null, 1);
    }

    modules.push({
      id: id(course, 'module', unitId),
      title: u.label || shortUnit(unitId),
      position: modPos,
      items,
    });
  }

  // course_settings is one resource holding every Canvas-specific file. The
  // canvas_export.txt marker is what makes Canvas read the rest of them.
  // files_meta and media_tracks are empty here and Canvas writes them in every
  // export. context.xml and late_policy.xml are deliberately NOT written: the
  // first carries the source Canvas account and domain, which is meaningless in
  // a generated package, and the second would impose a late penalty policy on a
  // teacher who never asked for one.
  const settingsFiles = [
    'course_settings/course_settings.xml',
    'course_settings/module_meta.xml',
    'course_settings/assignment_groups.xml',
    'course_settings/files_meta.xml',
    'course_settings/media_tracks.xml',
    'course_settings/canvas_export.txt',
  ];
  files.push({ name: 'course_settings/course_settings.xml', data: courseSettingsXml({ id: id(course, 'course'), title: `${courseTitle} (APCSExamPrep)`, code: prefix }) });
  files.push({ name: 'course_settings/assignment_groups.xml', data: assignmentGroupsXml([group]) });
  files.push({ name: 'course_settings/module_meta.xml', data: moduleMetaXml(modules) });
  files.push({ name: 'course_settings/files_meta.xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<fileMeta ${NS}>
</fileMeta>` });
  files.push({ name: 'course_settings/media_tracks.xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<media_tracks ${NS}>
</media_tracks>` });
  files.push({ name: 'course_settings/canvas_export.txt', data: CANVAS_EXPORT_TXT });
  resources.push({
    id: id(course, 'settings'),
    type: 'associatedcontent/imscc_xmlv1p1/learning-application-resource',
    href: 'course_settings/canvas_export.txt',
    files: settingsFiles,
  });

  const manifestId = id(course, scope, 'manifest');
  files.unshift({ name: 'imsmanifest.xml', data: manifestXml({ manifestId, title: `${courseTitle} (APCSExamPrep)`, modules, resources }) });

  const buffer = zipSync(files);
  const filename = `${slugify(prefix)}-${scope}-apcsexamprep.imscc`;

  return {
    filename,
    buffer,
    summary: {
      course,
      course_title: courseTitle,
      scope,
      linked: links.lessons.size > 0,
      modules: modules.map((m) => ({ title: m.title, items: m.items.length })),
      assignment_count: assignments.length,
      assignments: assignments.map((a) => a.name),
      points_per_assignment: UNIT_POINTS,
      link_count: resources.filter((r) => r.type === 'imswl_xmlv1p1').length,
      files: files.length,
      bytes: buffer.length,
    },
  };
}

module.exports = { buildCanvasCoursePackage, SITE };
