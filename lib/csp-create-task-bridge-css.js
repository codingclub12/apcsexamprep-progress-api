'use strict';
// Delta stylesheet for the Create Task bridge page. It is appended to the
// eighteen-page coding stylesheet rather than replacing it, so the bridge reads
// as one more coding page and not as a different product. Everything here is
// scoped under the same #apcsp-code wrapper and carries !important plus an
// explicit -webkit-text-fill-color on every colour, per house rule.
//
// The only genuinely new furniture is the requirement chip row and the input
// box, because the bridge is the only coding page in the course that has either.
module.exports = [
'#apcsp-code .reqrow{display:flex!important;flex-wrap:wrap!important;gap:6px!important;margin:0 0 10px!important}',
'#apcsp-code .req{display:inline-block!important;font-size:12px!important;font-weight:700!important;letter-spacing:.03em!important;border-radius:999px!important;padding:3px 10px!important;border:1px solid #BBE5D2!important;background:#F0F7F4!important;color:#5B7268!important;-webkit-text-fill-color:#5B7268!important}',
'#apcsp-code .req.on{background:#DCFCE7!important;border-color:#16A34A!important;color:#14532D!important;-webkit-text-fill-color:#14532D!important}',
'#apcsp-code .req.off{background:#FEF2F2!important;border-color:#FCA5A5!important;color:#7F1D1D!important;-webkit-text-fill-color:#7F1D1D!important}',
'#apcsp-code .reqcount{font-size:12px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.05em!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;margin:0 0 6px!important}',
'#apcsp-code .inlabel{font-size:12px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.05em!important;color:#5B7268!important;-webkit-text-fill-color:#5B7268!important;margin:10px 0 4px!important}',
'#apcsp-code pre.stdin{font-family:Consolas,Menlo,monospace!important;background:#F0F7F4!important;border:1px dashed #BBE5D2!important;border-radius:8px!important;padding:8px 12px!important;white-space:pre!important;overflow-x:auto!important;font-size:13px!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;margin:0 0 6px!important}',
'#apcsp-code textarea.in{width:100%!important;min-height:56px!important;font-family:Consolas,Menlo,monospace!important;font-size:13px!important;line-height:1.5!important;background:#F0F7F4!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;border:1px solid #BBE5D2!important;border-radius:8px!important;padding:8px 12px!important;resize:vertical!important;white-space:pre!important;margin:0 0 6px!important}',
// The eighteen topic pages set a 130px editor, which fits their four-line
// starters and clips this page's. A Create Task program is longer than a
// topic exercise by definition, so the editor is taller here and nowhere else.
'#apcsp-code textarea.ed{min-height:220px!important}',
'#apcsp-code .handoff{background:#065F46!important;border-radius:14px!important;padding:20px 22px!important;margin:22px 0 10px!important}',
'#apcsp-code .handoff h2{font-size:20px!important;font-weight:800!important;margin:0 0 8px!important;color:#fff!important;-webkit-text-fill-color:#fff!important}',
'#apcsp-code .handoff p{font-size:15px!important;margin:0 0 14px!important;color:#D1FAE5!important;-webkit-text-fill-color:#D1FAE5!important}',
'#apcsp-code a.cta{display:inline-block!important;background:#fff!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;font-weight:800!important;font-size:15px!important;text-decoration:none!important;border-radius:9px!important;padding:11px 18px!important}',
].join('\n');
