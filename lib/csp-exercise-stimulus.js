'use strict';
// -----------------------------------------------------------------------------
//  CSP EXERCISE 1 STIMULUS: the Part A log from the student handout, inlined.
//
//  WHY THIS EXISTS
//  An Exercise 1 page mirrors Part B of its handout and leaves Part A on paper.
//  That was fine while the page asked nothing about Part A. It stopped being
//  fine the moment a graded check was authored from the answer key: the 1.2
//  check asks about "row 4's idle window", the 10:30 inventory message and the
//  "Surprise me" taps, all of which live ONLY in the handout's Part A log. A
//  student working online could see six graded questions about a table that
//  was nowhere on the site (report esc_75eed3a1756556a978585f39, 2026-09-22).
//  Exercise 2 never had the problem, because its cases ARE its mirror.
//
//  WHERE THE CONTENT COMES FROM
//  The `log` field on an entry in seed/csp-exercise-source.json, extracted from
//  the STUDENT handout named in that entry's `source`, never retyped. Heading,
//  lead paragraph, column headers, every cell and the attribution line are the
//  handout's own words with typography flattened to ASCII. Row order is the
//  handout's order, including where it is not chronological: the page has to
//  agree with the sheet the student is holding, and reordering it here would
//  make the two disagree about which row is "row 4".
//
//  An entry with no `log` renders nothing, so this is inert for every page
//  whose handout log has not been extracted yet.
//
//  Scoped under the page wrapper id, colours hardcoded with !important and
//  -webkit-text-fill-color, the table in its own horizontal scroller so a phone
//  never scrolls the page sideways. Pure ASCII, no em dashes.
// -----------------------------------------------------------------------------

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&#34;');
}

function stimulusCss(id) {
  const s = '#' + id;
  const ink = '#1e293b';
  const muted = '#475569';
  const rule = '#fde68a';
  return `<style>
${s} .log-scroll{display:block!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;margin:10px 0 6px!important}
${s} table.log{border-collapse:collapse!important;width:100%!important;min-width:560px!important;font-size:14px!important;line-height:1.45!important;background:#fff!important}
${s} table.log th,${s} table.log td{border:1px solid ${rule}!important;padding:8px 10px!important;text-align:left!important;vertical-align:top!important;color:${ink}!important;-webkit-text-fill-color:${ink}!important}
${s} table.log th{background:#fef3c7!important;font-weight:700!important;font-size:12px!important;letter-spacing:.04em!important;text-transform:uppercase!important}
${s} table.log td.row-id{font-weight:700!important;text-align:center!important;white-space:nowrap!important}
${s} table.log td.row-when{white-space:nowrap!important}
${s} .log-note{font-size:13px!important;color:${muted}!important;-webkit-text-fill-color:${muted}!important;margin:6px 0 0!important}
</style>`;
}

// The stimulus block for one source entry, ending in a newline so it can sit
// directly in front of the Part B heading, or '' when the entry carries no log,
// so a page without one is byte-identical to what it was before this existed.
function renderStimulus(src, id) {
  const log = src && src.log;
  if (!log) return '';
  if (!Array.isArray(log.columns) || !Array.isArray(log.rows) || !log.rows.length) {
    throw new Error(`${src.handle}: log has no columns or rows`);
  }
  for (const r of log.rows) {
    if (r.length !== log.columns.length) {
      throw new Error(`${src.handle}: log row ${r[0]} has ${r.length} cells for ${log.columns.length} columns`);
    }
  }
  const head = log.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('');
  const body = log.rows.map((r) => '          <tr>' + r.map((c, j) => {
    const cls = j === 0 ? ' class="row-id"' : j === 1 ? ' class="row-when"' : '';
    return `<td${cls}>${esc(c)}</td>`;
  }).join('') + '</tr>').join('\n');
  return `${stimulusCss(id)}
  <h2>${esc(log.heading)}<span class="tag local">From your handout</span></h2>
  <p>The same log as Part A of your handout, row for row. The questions below refer to these rows by number.</p>
      <div class="item paper">
        <div class="item-num">The log</div>
        <p class="item-text">${esc(log.lead)}</p>
        <div class="log-scroll">
        <table class="log">
          <thead><tr>${head}</tr></thead>
          <tbody>
${body}
          </tbody>
        </table>
        </div>
${log.note ? `        <p class="log-note">${esc(log.note)}</p>\n` : ''}      </div>
`;
}

module.exports = { renderStimulus };
