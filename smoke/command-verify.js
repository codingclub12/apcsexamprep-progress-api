'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: auto-verify refuses everything that is not evidence.
//
//  This code can mark work verified, which is the number the whole ledger is
//  for. So the tests are weighted towards REFUSAL: a false negative costs a
//  human ten seconds, a false positive puts a tick next to work nobody checked
//  and that is the failure the cookie-only rule existed to prevent.
//
//  Offline. The network is injected, so no test depends on a live page.
//
//  Run: npm run smoke:commandverify
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const { assess, judgePhrase, artifactUrl, verifyByEvidence, evidenceLine } = require('../lib/command-verify');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const DONE = {
  id: 1, status: 'done', verified: 0,
  artifact_url: 'https://progress.apcsexamprep.com/api/health',
};
const PHRASE = 'apcs-cyber-lesson-map';

// A stand-in for the network. Returns whatever the test says the page serves.
//  THE STUB MUST MATCH THE REAL SHAPE, OR IT TESTS THE ASSUMPTION AND NOT THE
//  CODE. Its first version invented `{found: true, layer: 'visible'}`. locate()
//  actually returns `{phrase, visible, comment, script, style, total_in_source}`
//  with no `found` at all, so the lib read undefined, could never verify
//  anything, and all 42 assertions here passed anyway because the stub agreed
//  with the bug. Pinned below against the real function so it cannot drift again.
const serving = (opts) => async (url, phrases) => Object.assign({
  url, final_url: url, status: 200, usable: true, auth_gated: false, bytes: 4096,
  phrases: phrases.map((p) => ({
    phrase: p, visible: true, comment: false, script: false, style: false,
    total_in_source: 1,
  })),
}, opts || {});

(async () => {
  console.log('\n1. The happy path, and what it records');
  {
    const r = await verifyByEvidence(DONE, PHRASE, { inspect: serving() });
    ok('  a phrase present in the live page verifies', r.verified, r.reason);
    ok('  the evidence names the layer', r.evidence && r.evidence.layer === 'visible');
    ok('  and carries a command anyone can re-run',
      /verify-artifact\.js .* --phrase/.test(r.evidence.rerun), r.evidence);
    const line = evidenceLine(r.evidence);
    ok('  the log line contains the url, the phrase and the re-run',
      line.includes(DONE.artifact_url) && line.includes(PHRASE) && line.includes('Re-run:'), line);
  }

  console.log('\n2. THE RULE THAT CARRIES THE WEIGHT: a trivial expectation is refused');
  {
    // Learned from the deploy gate's own first live check, which expected
    // "status":"ok" and was true before the deploy, during it, and if it had
    // never happened.
    //  These must all be AT OR OVER the length floor, or the length rule refuses
    //  them first and the stoplist is never reached. The first version of this
    //  test used 'ok', 'done', '200' and friends, all under eight characters, so
    //  disabling the stoplist entirely changed nothing and the rule that carries
    //  the most weight here had no test at all.
    for (const p of ['successful', 'completed', 'undefined', 'apcsexamprep', 'HEALTHY!']) {
      ok(`  the fixture ${JSON.stringify(p)} is long enough to reach the stoplist`,
        p.length >= 8, p.length);
      const r = await verifyByEvidence(DONE, p, { inspect: serving() });
      ok(`  ${JSON.stringify(p)} is refused even though the page serves it`, !r.verified, r);
    }
    //  ONLY the stoplist can catch these. They are long enough to clear the
    //  length floor, they have enough distinct characters, and their individual
    //  words are not all generic ('all' and 'no' are not in the set), so the
    //  word-based rule does not fire either. Without a fixture like this the
    //  stoplist looks tested and is not: every single-word entry is also caught
    //  by the all-generic-words rule, which reads the same set, so disabling the
    //  stoplist changed nothing and the battery reported a survivor.
    for (const p of ['all good', 'no errors', 'looks right', 'as expected']) {
      const r = await verifyByEvidence(DONE, p, { inspect: serving() });
      ok(`  ${JSON.stringify(p)} is refused, and only the stoplist can do it`,
        !r.verified && /true of almost any page/.test(r.reason), r.reason);
    }

    //  And the short ones are still refused, by the length rule.
    for (const p of ['ok', 'done', '200']) {
      const r = await verifyByEvidence(DONE, p, { inspect: serving() });
      ok(`  ${JSON.stringify(p)} is refused for being too short`,
        !r.verified && /under 8|characters/.test(r.reason), r.reason);
    }
    const r2 = await verifyByEvidence(DONE, 'ok true done', { inspect: serving() });
    ok('  a phrase of nothing but generic words is refused', !r2.verified, r2.reason);
    const r3 = await verifyByEvidence(DONE, 'aaaaaaaaaa', { inspect: serving() });
    ok('  a long phrase with no distinct characters is refused', !r3.verified, r3.reason);
    const r4 = await verifyByEvidence(DONE, 'short', { inspect: serving() });
    ok('  a phrase under the length floor is refused', !r4.verified, r4.reason);
    const r5 = await verifyByEvidence(DONE, '', { inspect: serving() });
    ok('  no expectation at all is refused', !r5.verified, r5.reason);
  }

  console.log('\n2b. The stub matches what locate() really returns');
  {
    const { layers, locate } = require('../scripts/verify-artifact');
    const html = '<html><body><p>' + PHRASE + ' is live</p></body></html>';
    const real = locate(html, layers(html), PHRASE);
    const stub = (await serving()('u', [PHRASE])).phrases[0];
    ok('  the real locate has no `found` field', !('found' in real), Object.keys(real));
    ok('  and the stub does not invent one', !('found' in stub), Object.keys(stub));
    ok('  their keys match exactly',
      Object.keys(real).sort().join() === Object.keys(stub).sort().join(),
      { real: Object.keys(real).sort(), stub: Object.keys(stub).sort() });
    ok('  and a real hit is what the lib treats as found', real.total_in_source > 0);
  }

  console.log('\n3. It goes and looks, so a phrase that is not there fails');
  {
    const r = await verifyByEvidence(DONE, PHRASE, {
      inspect: serving({ phrases: [{ phrase: PHRASE, visible: false, comment: false,
        script: false, style: false, total_in_source: 0 }] }),
    });
    ok('  a phrase absent from the live page is refused', !r.verified, r);
    ok('  and the message says the work is not live or the expectation is wrong',
      /not live|expectation is wrong/.test(r.reason), r.reason);
  }

  console.log('\n4. There is no parameter for "it worked"');
  {
    // The signature accepts a task and a phrase. Anything a caller passes that
    // looks like a verdict has to be ignored, or the whole design collapses back
    // into trusting a report.
    const lying = Object.assign({}, DONE, { verified_by_agent: true, result: 'success' });
    const r = await verifyByEvidence(lying, PHRASE, {
      inspect: serving({ phrases: [{ phrase: PHRASE, visible: false, comment: false,
        script: false, style: false, total_in_source: 0 }] }),
    });
    ok('  a task claiming its own success is still refused when the page disagrees', !r.verified, r);
  }

  console.log('\n5. Preconditions, refused before any request is made');
  {
    let called = 0;
    const counting = async (...a) => { called += 1; return serving()(...a); };

    const open = Object.assign({}, DONE, { status: 'open' });
    const r1 = await verifyByEvidence(open, PHRASE, { inspect: counting });
    ok('  an open task cannot be verified', !r1.verified && /only a closed task/.test(r1.reason), r1.reason);

    const already = Object.assign({}, DONE, { verified: 1 });
    const r2 = await verifyByEvidence(already, PHRASE, { inspect: counting });
    ok('  an already verified task is left alone', !r2.verified && /already verified/.test(r2.reason));

    const noArtifact = Object.assign({}, DONE, { artifact_url: null });
    const r3 = await verifyByEvidence(noArtifact, PHRASE, { inspect: counting });
    ok('  a task with no artifact needs a human',
      !r3.verified && /needs a human/.test(r3.reason), r3.reason);

    const note = Object.assign({}, DONE, { artifact_url: 'talked to the teacher, all good' });
    const r4 = await verifyByEvidence(note, PHRASE, { inspect: counting });
    ok('  an artifact that is a note, not a URL, needs a human',
      !r4.verified && /needs a human/.test(r4.reason), r4.reason);

    ok('  and none of those four touched the network', called === 0, called);
  }

  console.log('\n6. A page that cannot be read is never a pass');
  {
    const r1 = await verifyByEvidence(DONE, PHRASE, { inspect: serving({ error: 'ECONNRESET' }) });
    ok('  a fetch error is refused', !r1.verified && /could not fetch/.test(r1.reason), r1.reason);

    const r2 = await verifyByEvidence(DONE, PHRASE, {
      inspect: serving({ status: 404, usable: false }),
    });
    ok('  a 404 is refused', !r2.verified && /answered 404/.test(r2.reason), r2.reason);

    // A fail-closed endpoint answering 401 is the endpoint WORKING, and cannot
    // be told apart from a page that should be public and is not.
    const r3 = await verifyByEvidence(DONE, PHRASE, {
      inspect: serving({ status: 401, usable: false, auth_gated: true }),
    });
    ok('  an auth-gated endpoint is routed to a human, not failed and not passed',
      !r3.verified && /needs a human/.test(r3.reason), r3.reason);

    const thrower = async () => { throw new Error('DNS went away'); };
    const r4 = await verifyByEvidence(DONE, PHRASE, { inspect: thrower });
    ok('  a thrown inspector is caught and refused',
      !r4.verified && /DNS went away/.test(r4.reason), r4.reason);
  }

  console.log('\n7. The pure helpers');
  {
    ok('  artifactUrl takes the first http url out of a mixed note',
      artifactUrl({ artifact_url: 'see https://example.com/x and also notes' }) === 'https://example.com/x');
    ok('  artifactUrl returns null for a note', artifactUrl({ artifact_url: 'no url here' }) === null);
    ok('  judgePhrase passes a real one', judgePhrase('apcs-cyber-lesson-map') === null);
    ok('  judgePhrase explains itself when it refuses',
      typeof judgePhrase('ok') === 'string' && judgePhrase('ok').length > 20);
    ok('  assess refuses before it needs a network',
      assess({ status: 'done', artifact_url: 'https://x.test/a' }, 'ok').ok === false);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
