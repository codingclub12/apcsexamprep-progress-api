'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DEVICE SECURITY ANALYSIS delivery. Mount:  app.use(require('./routes/frq'));
//
//    GET /api/frq                    the index, one line per authored set
//    GET /api/frq/:course/:set_id    the spec the player renders
//    GET /frq/:course/:set_id        the standalone page
//    GET /frq-player.js              the player, loadable cross origin
//
//  Public, and the sample responses ship with the spec. That is deliberate:
//  this is self-scored practice, so the student needs the sample to mark
//  against. There is nothing to gate, because there is no grade to protect.
//  Contrast routes/labs.js, where the lab ANSWER KEY is teacher-gated because
//  a lab does report a score.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const express = require('express');
const router = express.Router();
const frq = require('../lib/frq-spec');

function cors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=300');
}

router.get('/api/frq', (req, res) => {
  cors(res);
  res.json({
    sets: frq.all().map(frq.summary),
    spec_errors: frq.errors(),
  });
});

router.get('/api/frq/:course/:set_id', (req, res) => {
  const spec = frq.get(req.params.course, req.params.set_id);
  if (!spec) {
    res.set('Cache-Control', 'no-store');
    return res.status(404).json({ error: `No practice set '${req.params.set_id}' for ${req.params.course}` });
  }
  cors(res);
  res.json(frq.forBrowser(spec));
});

router.get('/frq/:course/:set_id', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'public', 'frq.html'));
});

router.get('/frq-player.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'public', 'frq-player.js'));
});

module.exports = router;
