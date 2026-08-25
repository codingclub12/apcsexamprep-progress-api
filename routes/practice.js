'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PRACTICE INDEX delivery.  Mount:  app.use(require('./routes/practice'));
//
//    GET /api/practice              which courses have practice authored
//    GET /api/practice/:course      the index a hub page renders
//    GET /practice-hub.js           the progressive refresher, cross origin
//
//  Public and read only. See lib/practice-index.js for why this exists at all
//  and why nothing here branches on the course.
//
//  ── WHY THE HUB IS BOTH STATIC AND DYNAMIC ─────────────────────────────────
//  The hub pages ship with their cards as real HTML, generated from these same
//  specs at sheet-build time, because a page that needs JavaScript to show its
//  content is a page a crawler sees as empty, and the FRQ hub has to rank.
//  /practice-hub.js then re-renders the same list from this route on load, so a
//  fifth set authored tomorrow appears without another Matrixify import. Static
//  for the crawler, live for the student, one source of truth for both.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const express = require('express');
const router = express.Router();
const practice = require('../lib/practice-index');

function cors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=300');
}

router.get('/api/practice', (req, res) => {
  cors(res);
  res.json({ courses: practice.courses() });
});

router.get('/api/practice/:course', (req, res) => {
  const index = practice.forCourse(req.params.course);
  // An unknown course and a course with nothing authored are the same fact to a
  // caller, and neither is an error: a hub for a course you have not written
  // practice for yet should render "nothing here yet", not a 404 page.
  cors(res);
  res.json(index);
});

router.get('/practice-hub.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'public', 'practice-hub.js'));
});

module.exports = router;
