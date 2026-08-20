'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LABS. Delivery for the interactive terminal labs.
//  Mount in server.js:  app.use(require('./routes/labs'));
//
//    GET /api/labs                      the index, one line per authored lab
//    GET /api/labs/:course/:item_id     the spec the player runs
//    GET /lab/:course/:item_id          the standalone player page
//    GET /lab-player.js                 the player, loadable cross origin
//
//  Public on purpose. A lab spec is author content: a brief, a pretend
//  filesystem and a list of checks. It carries no student data, and gating it
//  behind the student JWT would mean a teacher could not preview a lab and an
//  anonymous visitor could not try one, for no gain. The GRADE is what needs
//  auth, and that goes through POST /api/progress/attempt exactly like every
//  other reporter.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const express = require('express');
const router = express.Router();
const labs = require('../lib/lab-spec');

// Cross origin by design: the lesson pages are on the Shopify storefront and
// the specs are here. Read only, no credentials, so a wildcard is the whole
// story rather than a hole in one.
function cors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=300');
}

router.get('/api/labs', (req, res) => {
  cors(res);
  res.json({
    labs: labs.all().map(labs.summary),
    // A malformed spec is a broken lab. Say so here rather than 404ing a lab
    // that the author believes they shipped.
    spec_errors: labs.errors(),
  });
});

router.get('/api/labs/:course/:item_id', (req, res) => {
  const spec = labs.get(req.params.course, req.params.item_id);
  if (!spec) {
    res.set('Cache-Control', 'no-store');
    return res.status(404).json({ error: `No lab '${req.params.item_id}' for ${req.params.course}` });
  }
  cors(res);
  res.json(labs.forBrowser(spec));
});

// The standalone page. One HTML file for every lab; it reads the course and
// item out of its own URL and asks /api/labs for the rest.
router.get('/lab/:course/:item_id', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'lab.html'));
});

router.get('/lab-player.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'public', 'lab-player.js'));
});

module.exports = router;
