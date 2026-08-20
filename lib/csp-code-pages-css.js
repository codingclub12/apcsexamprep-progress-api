'use strict';
// The coding-practice stylesheet, copied verbatim from the live Topic 3.16 page
// so the two new pages are visually indistinguishable from the sixteen that
// already exist. Do not restyle here: if this needs to change, it changes on all
// eighteen at once, which is a different job with a different blast radius.
module.exports = [
'.page-title,.article__title,.page__title,.template-page main h1:first-of-type{display:none!important;visibility:hidden!important}',
'#apcsp-code{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:880px!important;margin:0 auto!important;padding:8px 16px 56px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;line-height:1.55!important;font-size:16px!important;background:#fff!important}',
'#apcsp-code *,#apcsp-code *::before,#apcsp-code *::after{box-sizing:border-box!important}',
'#apcsp-code .hero{background:linear-gradient(135deg,#065F46,#10B981)!important;border-radius:16px!important;padding:24px!important;margin:8px 0 22px!important}',
'#apcsp-code .hero .eyebrow{font-size:13px!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#D1FAE5!important;-webkit-text-fill-color:#D1FAE5!important;margin:0 0 8px!important}',
'#apcsp-code h1{font-size:26px!important;margin:0!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:800!important}',
'#apcsp-code .hero .sub{font-size:15px!important;margin:10px 0 0!important;color:#ECFDF5!important;-webkit-text-fill-color:#ECFDF5!important}',
'#apcsp-code .prob{border:1px solid #BBE5D2!important;border-radius:14px!important;padding:16px 18px!important;margin:16px 0!important;background:#fff!important}',
'#apcsp-code .pn{font-size:12px!important;font-weight:800!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;margin:0 0 6px!important}',
'#apcsp-code .prompt{font-size:16px!important;margin:0 0 10px!important}',
'#apcsp-code code{font-family:Consolas,Menlo,monospace!important;background:#F0F7F4!important;padding:1px 5px!important;border-radius:4px!important;font-size:14px!important}',
'#apcsp-code details.ref{margin:8px 0!important}',
'#apcsp-code details.ref summary{cursor:pointer!important;font-weight:700!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;font-size:14px!important}',
'#apcsp-code pre.ps{font-family:Consolas,Menlo,monospace!important;background:#F0F7F4!important;border:1px solid #BBE5D2!important;border-radius:8px!important;padding:10px 12px!important;white-space:pre!important;overflow-x:auto!important;font-size:13px!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;margin:6px 0!important}',
'#apcsp-code .toolbar{display:flex!important;align-items:center!important;gap:8px!important;margin:6px 0!important;flex-wrap:wrap!important}',
'#apcsp-code .toolbar label{font-size:13px!important;color:#5B7268!important;-webkit-text-fill-color:#5B7268!important}',
'#apcsp-code select.lang{font-family:inherit!important;font-size:14px!important;padding:5px 8px!important;border:1px solid #BBE5D2!important;border-radius:8px!important;background:#fff!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important}',
'#apcsp-code textarea.ed{width:100%!important;min-height:130px!important;font-family:Consolas,Menlo,monospace!important;font-size:14px!important;line-height:1.5!important;background:#022C22!important;color:#D1FAE5!important;-webkit-text-fill-color:#D1FAE5!important;border:1px solid #0B3B2E!important;border-radius:10px!important;padding:12px!important;resize:vertical!important;white-space:pre!important;tab-size:4!important}',
'#apcsp-code button.run,#apcsp-code button.hint{font-family:inherit!important;font-weight:700!important;font-size:14px!important;border:0!important;border-radius:9px!important;padding:9px 16px!important;cursor:pointer!important;margin:8px 8px 0 0!important}',
'#apcsp-code button.run{background:#10B981!important;color:#fff!important;-webkit-text-fill-color:#fff!important}',
'#apcsp-code button.hint{background:#ECFDF5!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;border:1px solid #BBE5D2!important}',
'#apcsp-code .result{margin-top:10px!important;border-radius:9px!important;padding:10px 12px!important;font-family:Consolas,Menlo,monospace!important;font-size:13px!important;white-space:pre-wrap!important;display:none!important}',
'#apcsp-code .result.pass{background:#DCFCE7!important;border:1px solid #16A34A!important;color:#14532D!important;-webkit-text-fill-color:#14532D!important;display:block!important}',
'#apcsp-code .result.fail{background:#FEF2F2!important;border:1px solid #DC2626!important;color:#7F1D1D!important;-webkit-text-fill-color:#7F1D1D!important;display:block!important}',
'#apcsp-code .result.wait{background:#F0F7F4!important;border:1px solid #BBE5D2!important;color:#5B7268!important;-webkit-text-fill-color:#5B7268!important;display:block!important}',
'#apcsp-code .hintbox{margin-top:8px!important;background:#FFFBEB!important;border-left:4px solid #F59E0B!important;padding:8px 12px!important;font-size:14px!important;display:none!important}',
'#apcsp-code .hintbox.show{display:block!important}',
'#apcsp-code .flow{background:#ECFDF5!important;border:1px solid #BBE5D2!important;border-left:5px solid #10B981!important;border-radius:0 12px 12px 0!important;padding:12px 16px!important;margin:0 0 18px!important;font-size:15px!important}',
'#apcsp-code .flow b{color:#065F46!important;-webkit-text-fill-color:#065F46!important}',
'#apcsp-code .muted{color:#5B7268!important;-webkit-text-fill-color:#5B7268!important;font-size:13px!important}',
].join('\n');
