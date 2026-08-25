'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE PRACTICE INDEX: one answer to "what can a student practise in this
//  course, and where does each piece live?"
//
//  ── WHY THIS EXISTS ────────────────────────────────────────────────────────
//  Four Device Security Analysis sets shipped as Shopify pages with zero
//  inbound links from anywhere on the site. They were reachable only by typing
//  the URL. That was not an oversight in one import; it is what happens by
//  default, because nothing in the pipeline ever knew that a practice page was
//  meant to appear in a list next to its siblings.
//
//  So the fix is not "add four links". It is this: a single place that can
//  answer, from the specs themselves, what practice exists for a course. A hub
//  built on this cannot fall behind the specs, because there is no second list
//  to forget to update. Add config/frq/dsa-five.json and it is in the index,
//  on the hub, and in the sibling strip on the other four pages.
//
//  ── COURSE AGNOSTIC ON PURPOSE ─────────────────────────────────────────────
//  Cyber is the course with the problem today, but ap-networking has six labs
//  with the same shape and CSA will want the same treatment. Nothing below
//  branches on the course name. A course that has no FRQ sets gets an empty
//  frq group, not a special case, in the same spirit as the gradebook contract
//  in docs/gradebook-contract.md: one shape, and the view never asks which
//  course it is looking at.
//
//  ── WHAT IT DELIBERATELY DOES NOT DO ───────────────────────────────────────
//  It reads no student data and takes no auth. A practice index is a table of
//  contents, not progress. Nothing here touches the attempts table, so this
//  route can never become a second, disagreeing source of truth about what a
//  student has done.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const frq = require('./frq-spec');
const labs = require('./lab-spec');

// A storefront page handle becomes a link only if a page was actually created
// for it. A spec with no page_handle is still real practice and still gets
// listed, it just points at the standalone player on this API instead.
const STOREFRONT = 'https://www.apcsexamprep.com';

function pageUrl(handle) {
  return handle ? `${STOREFRONT}/pages/${handle}` : null;
}

/**
 * Everything practisable in one course, grouped by kind.
 *
 * Sorting is stable and meaningful rather than alphabetical: FRQ sets by the
 * `order` their authors gave them, because "start here" is a real claim about
 * which set to open first; labs by unit then lesson, because that is the order
 * a class meets them.
 */
function forCourse(course) {
  const frqSets = frq.all()
    .filter((s) => s.course === course)
    .map(frq.summary)
    .sort((a, b) => a.order - b.order || a.set_id.localeCompare(b.set_id))
    .map((s) => Object.assign({}, s, { page_url: pageUrl(s.page_handle) }));

  // Labs carry no `blurb` of their own. Rather than add a field that would say
  // the same thing twice, the card falls back to the lab's seo_description,
  // which is already one honest sentence about what the lab asks you to do. If
  // a lab ever wants different card copy it can declare `blurb` and win.
  const labList = labs.all()
    .filter((s) => s.course === course)
    .map((spec) => Object.assign({}, labs.summary(spec), {
      blurb: spec.blurb || spec.seo_description || null,
      page_url: pageUrl(spec.page_handle),
    }))
    .sort((a, b) => String(a.unit).localeCompare(String(b.unit))
      || String(a.lesson_id).localeCompare(String(b.lesson_id), undefined, { numeric: true }));

  return {
    course,
    frq: frqSets,
    labs: labList,
    counts: {
      frq: frqSets.length,
      labs: labList.length,
      // How many of each are actually reachable from the storefront. This is
      // the number that was silently zero for FRQ before this work, so it is
      // reported rather than left to be rediscovered.
      frq_linkable: frqSets.filter((s) => s.page_url).length,
      labs_linkable: labList.filter((s) => s.page_url).length,
    },
    // A broken spec is missing practice, not absent practice. Surfaced here for
    // the same reason /api/frq surfaces it: so a hub that is quietly one card
    // short says why.
    spec_errors: frq.errors().concat(labs.errors()),
  };
}

/** Every course that has at least one piece of practice authored for it. */
function courses() {
  const seen = new Set();
  for (const s of frq.all()) seen.add(s.course);
  for (const s of labs.all()) seen.add(s.course);
  return Array.from(seen).sort();
}

module.exports = { forCourse, courses, pageUrl, STOREFRONT };
