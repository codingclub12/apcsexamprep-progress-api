'use strict';
// Adds the full-year pacing view to /pages/cyber-command-center, plus the Unit 1
// unit-level asset links.
//
// The schedule is NOT embedded. It is derived in the page from the same UNITS
// array that drives the day plan, which is why the two can never disagree. That
// derivation was verified against the workbook: 144 of 144 lesson-days match in
// sequence, unit and type, and the block view is exactly a 2/2/1 pairing of the
// same sequence. Only the review block, the notes and a couple of labels are
// carried as data, about 2KB rather than the 20KB a full dump would cost.

const CSS_ANCHOR = '</style>\n<div id="actc-wrap">';

const CSS = `  /* ---- full-year pacing view ---- */
  #actc-wrap .pace{margin:26px 0 0;border:1px solid var(--line);border-radius:14px;background:var(--card);overflow:hidden;}
  #actc-wrap .pace-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line);background:#f8fafc;}
  #actc-wrap .pace-head h2{margin:0;font-size:17px;color:var(--navy)!important;-webkit-text-fill-color:var(--navy)!important;}
  #actc-wrap .pace-sub{font-size:12px;color:var(--muted)!important;-webkit-text-fill-color:var(--muted)!important;margin-top:3px;}
  #actc-wrap .pace-ctl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  #actc-wrap .pace-tab{font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--navy)!important;-webkit-text-fill-color:var(--navy)!important;border-radius:9px;padding:7px 12px;}
  #actc-wrap .pace-tab.on{background:var(--navy)!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:var(--navy);}
  #actc-wrap .pace-date{font:inherit;font-size:12px;border:1px solid var(--line);border-radius:9px;padding:6px 9px;color:var(--ink)!important;-webkit-text-fill-color:var(--ink)!important;background:#fff;}
  #actc-wrap .pace-body{max-height:560px;overflow:auto;}
  #actc-wrap .pace-wk{display:flex;align-items:center;gap:9px;padding:9px 18px;background:#f1f5f9;border-top:1px solid var(--line);font-size:12px;font-weight:700;color:var(--muted)!important;-webkit-text-fill-color:var(--muted)!important;position:sticky;top:0;}
  #actc-wrap .pace-row{display:flex;align-items:center;gap:11px;padding:9px 18px;border-top:1px solid #f1f5f9;font-size:13px;}
  #actc-wrap .pace-n{flex:0 0 34px;font-size:11px;font-weight:700;color:var(--lock)!important;-webkit-text-fill-color:var(--lock)!important;}
  #actc-wrap .pace-dt{flex:0 0 48px;font-size:11px;font-weight:700;color:var(--blue)!important;-webkit-text-fill-color:var(--blue)!important;}
  #actc-wrap .pace-txt{flex:1;color:var(--ink)!important;-webkit-text-fill-color:var(--ink)!important;}
  #actc-wrap .pace-txt a{color:var(--blue)!important;-webkit-text-fill-color:var(--blue)!important;text-decoration:none;font-weight:600;}
  #actc-wrap .pace-txt a:hover{text-decoration:underline;}
  #actc-wrap .pace-t{flex:0 0 auto;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:6px;padding:3px 7px;background:#f1f5f9;color:var(--muted)!important;-webkit-text-fill-color:var(--muted)!important;}
  #actc-wrap .pace-t.Teach{background:#eef2ff;color:var(--blue)!important;-webkit-text-fill-color:var(--blue)!important;}
  #actc-wrap .pace-t.QuizLab{background:#ecfdf5;color:var(--green)!important;-webkit-text-fill-color:var(--green)!important;}
  #actc-wrap .pace-t.Project{background:#fff7ed;color:var(--amber)!important;-webkit-text-fill-color:var(--amber)!important;}
  #actc-wrap .pace-t.Test,#actc-wrap .pace-t.Final{background:#fef2f2;color:var(--red)!important;-webkit-text-fill-color:var(--red)!important;}
  #actc-wrap .pace-res{font-size:10px;font-weight:700;color:var(--lock)!important;-webkit-text-fill-color:var(--lock)!important;border:1px dashed var(--line);border-radius:6px;padding:2px 6px;margin-left:7px;}
  #actc-wrap .pace-foot{padding:15px 18px;border-top:1px solid var(--line);background:#f8fafc;}
  #actc-wrap .pace-note{font-size:12px;color:var(--muted)!important;-webkit-text-fill-color:var(--muted)!important;margin:0 0 7px;line-height:1.55;}
  #actc-wrap .pace-note b{color:var(--navy)!important;-webkit-text-fill-color:var(--navy)!important;}
  #actc-wrap .uassets{display:flex;gap:8px;flex-wrap:wrap;margin:4px 2px 2px;}
  #actc-wrap .ua{font-size:12px;font-weight:700;border:1px solid var(--line);border-radius:9px;padding:8px 11px;text-decoration:none;background:#fff;color:var(--blue)!important;-webkit-text-fill-color:var(--blue)!important;}
  #actc-wrap .ua:hover{background:#f8fafc;}
  #actc-wrap .ua.lockd{color:var(--lock)!important;-webkit-text-fill-color:var(--lock)!important;background:#f8fafc;}
  @media(max-width:520px){#actc-wrap .pace-dt{display:none;}#actc-wrap .pace-row{gap:8px;padding:9px 12px;}}
`;

const MARKUP_ANCHOR = '    <div class="foot">';
const MARKUP = `    <div class="pace" id="actc-pace"></div>

`;

// Injected before renderUnits so the helpers exist when it runs.
const JS_ANCHOR = '  function renderUnits(){';

const JS = `  /* ============================================================================
     PACING  -  the full-year plan.
     The schedule is derived from UNITS rather than stored, so it cannot drift
     from the day counts above. Source: Full-Year Pacing Guide, teacher bundle.
     ---------------------------------------------------------------------------- */
  var PACING = {
    projectDays: 2,
    finalText: { 3: "Semester 1 Final (Units 1-3)" },
    // Units whose project page is live. The others are reserved days: hold them
    // as reteach until that project ships.
    liveProjects: { 1:1, 3:1 },
    review: [
      ["Diagnostic", "Full-length practice exam, then item analysis by unit", 5],
      ["Targeted reteach", "Reteach the units your practice exam flagged weakest", 8],
      ["Free response", "Device-analysis FRQ practice, 30 percent of the exam", 7],
      ["Final push", "Second practice exam, mixed review, Bluebook walkthrough", 6]
    ],
    notes: [
      ["No unit-review day", "Assign the unit study guide as homework and review in the period before the test. That buys a week of AP review."],
      ["FRQ practice", "Not scheduled separately. Fold device-analysis FRQ practice into the AP review block."],
      ["Capstone", "Run the Threat Defense Report after the AP exam, not before. It doubles as the second-semester final and is not counted in the 143."],
      ["Block schedule", "Each 90-minute block covers two lesson-days and the short period covers one. If your short period runs full length, treat it as two and the plan compresses about three weeks."],
      ["Reserved days", "Unit 2, 4 and 5 projects and the Semester 1 Final are reserved days, not yet delivered. Use them as reteach until they ship."]
    ]
  };
  var PACE_VIEW_KEY = "actc_pace_view_", PACE_DATE_KEY = "actc_pace_date_";

  // The whole year as a flat list of lesson-days, built from UNITS.
  function paceDays(){
    var out = [{ n:1, u:0, type:"Intro", text:"Course intro, syllabus, AP Cyber overview" }], n = 2;
    UNITS.forEach(function(u){
      u.lessons.forEach(function(l){
        for(var d=1; d<=l.days; d++)
          out.push({ n:n++, u:u.n, type:"Teach", text:l.id+" "+l.title+" - day "+d+" of "+l.days });
        if(l.act) out.push({ n:n++, u:u.n, type:"QuizLab", text:l.id+" Quiz + Lab" });
      });
      var proj = PACING.projectDays, lab = (u.labDays||0) - proj;
      for(var i=0;i<lab;i++) out.push({ n:n++, u:u.n, type:"Lab", text:"Unit "+u.n+" capstone lab" });
      for(var j=1;j<=proj;j++)
        out.push({ n:n++, u:u.n, type:"Project", text:"Unit "+u.n+" Project - day "+j+" of "+proj, res:!PACING.liveProjects[u.n] });
      out.push({ n:n++, u:u.n, type:"Test", text:"Unit "+u.n+" Test" });
      if((u.testDays||0) > 1 && PACING.finalText[u.n])
        out.push({ n:n++, u:u.n, type:"Final", text:PACING.finalText[u.n], res:true });
    });
    PACING.review.forEach(function(r){
      for(var i=1;i<=r[2];i++) out.push({ n:n++, u:0, type:"Review", text:"AP review: "+r[0]+(r[2]>1?" ("+i+" of "+r[2]+")":"")+" - "+r[1] });
    });
    return out;
  }

  function paceLink(r){
    if(r.type === "Test") return P+"ap-cyber-unit-"+r.u+"-exam";
    if(r.type === "Project" && !r.res) return P+"ap-cyber-unit-"+r.u+"-project";
    return "";
  }

  // Walks weekdays forward from the teacher's first day. Closures still have to
  // be adjusted by hand, same as the workbook's blank date column.
  function paceDates(rows, startISO){
    if(!startISO) return;
    var d = new Date(startISO+"T12:00:00");
    if(isNaN(d.getTime())) return;
    rows.forEach(function(r){
      while(d.getDay()===0 || d.getDay()===6) d.setDate(d.getDate()+1);
      r.date = (d.getMonth()+1)+"/"+d.getDate();
      d.setDate(d.getDate()+1);
    });
  }

  function paceRowHTML(r){
    var link = paceLink(r), unlocked = STATE.entitled || r.u === 1 || r.u === 0;
    var txt = esc(r.text);
    if(link && unlocked) txt = '<a href="'+link+'" target="_blank" rel="noopener">'+txt+' '+ARROW+'</a>';
    if(r.res) txt += '<span class="pace-res">RESERVED</span>';
    return '<div class="pace-row">'
      + '<span class="pace-n">'+r.n+'</span>'
      + '<span class="pace-dt">'+(r.date||"")+'</span>'
      + '<span class="pace-txt">'+txt+'</span>'
      + '<span class="pace-t '+r.type+'">'+r.type+'</span>'
      + '</div>';
  }

  function paceTraditional(rows){
    var out = "", wk = 0;
    for(var i=0;i<rows.length;i++){
      if(i % 5 === 0) out += '<div class="pace-wk">Week '+(++wk)+'</div>';
      out += paceRowHTML(rows[i]);
    }
    return out;
  }

  // Two 90-minute blocks then a short period: the same sequence, paired 2/2/1.
  function paceBlock(rows){
    var out = "", i = 0, wk = 0, sizes = [2,2,1], labels = ["Block 1 (90 min)","Block 2 (90 min)","Friday (short period)"];
    while(i < rows.length){
      out += '<div class="pace-wk">Week '+(++wk)+'</div>';
      for(var m=0;m<3 && i<rows.length;m++){
        var take = rows.slice(i, i+sizes[m]); i += sizes[m];
        var inner = take.map(function(r){
          var link = paceLink(r), unlocked = STATE.entitled || r.u === 1 || r.u === 0;
          var t = esc(r.text);
          if(link && unlocked) t = '<a href="'+link+'" target="_blank" rel="noopener">'+t+' '+ARROW+'</a>';
          if(r.res) t += '<span class="pace-res">RESERVED</span>';
          return t;
        }).join('<br>');
        out += '<div class="pace-row">'
          + '<span class="pace-n">'+take[0].n+(take.length>1?"-"+take[take.length-1].n:"")+'</span>'
          + '<span class="pace-dt">'+(take[0].date||"")+'</span>'
          + '<span class="pace-txt">'+inner+'</span>'
          + '<span class="pace-t '+take[0].type+'">'+labels[m].split(" ")[0]+'</span>'
          + '</div>';
      }
    }
    return out;
  }

  function renderPacing(){
    var host = el("actc-pace"); if(!host) return;
    var view = localStorage.getItem(PACE_VIEW_KEY+CFG.COURSE) || "trad";
    var start = localStorage.getItem(PACE_DATE_KEY+CFG.COURSE) || "";
    var rows = paceDays();
    paceDates(rows, start);
    var unitTotal = 0;
    UNITS.forEach(function(u){ unitTotal += unitDays(u); });

    host.innerHTML = ''
      + '<div class="pace-head">'
      +   '<div><h2>Full-year plan</h2><div class="pace-sub">'+unitTotal+' lesson-days across five units, plus '
      +     (rows.length-unitTotal-1)+' days of AP review. One lesson-day per class meeting.</div></div>'
      +   '<div class="pace-ctl">'
      +     '<button class="pace-tab'+(view==="trad"?" on":"")+'" data-pv="trad">Traditional 5-day</button>'
      +     '<button class="pace-tab'+(view==="block"?" on":"")+'" data-pv="block">Block</button>'
      +     '<input class="pace-date" type="date" id="actc-pace-date" value="'+esc(start)+'" title="Your first day of class">'
      +   '</div>'
      + '</div>'
      + '<div class="pace-body">'+(view==="block"?paceBlock(rows):paceTraditional(rows))+'</div>'
      + '<div class="pace-foot">'
      +   PACING.notes.map(function(n){ return '<p class="pace-note"><b>'+esc(n[0])+':</b> '+esc(n[1])+'</p>'; }).join("")
      +   '<p class="pace-note">Set your first day of class above and the dates fill in across weekdays. Adjust for your own closures, the same as the blank date column in the pacing workbook.</p>'
      + '</div>';

    host.querySelectorAll(".pace-tab").forEach(function(btn){
      btn.onclick = function(){
        localStorage.setItem(PACE_VIEW_KEY+CFG.COURSE, btn.getAttribute("data-pv"));
        renderPacing();
      };
    });
    var dt = el("actc-pace-date");
    if(dt) dt.onchange = function(){
      localStorage.setItem(PACE_DATE_KEY+CFG.COURSE, dt.value||"");
      renderPacing();
    };
  }

  // Unit-level assets: the exam, project and scenario practice pages that sit
  // outside any one lesson and so have no slot in the lesson rows.
  function unitAssets(u, unlocked){
    if(!u.unitSite) return "";
    var items = [["exam","Unit Exam","📝"],["project","Unit Project","🧪"],["scenario","Scenario Practice","🎯"]];
    var html = items.map(function(it){
      var href = u.unitSite[it[0]];
      if(!href) return "";
      return unlocked
        ? '<a class="ua" href="'+href+'" target="_blank" rel="noopener">'+it[2]+' '+it[1]+' '+ARROW+'</a>'
        : '<span class="ua lockd">🔒 '+it[1]+'</span>';
    }).join("");
    return html ? '<div class="mats-lbl">Unit assets</div><div class="uassets">'+html+'</div>' : "";
  }

`;

const BODY_ANCHOR = `      var body = noteHTML + lessons + wrap`;
const BODY_NEW = `      var body = noteHTML + lessons + wrap + unitAssets(u, unlocked)`;

const CALL_ANCHOR = `    el("actc-units").innerHTML=out;
    wireAccordions();`;
const CALL_NEW = `    el("actc-units").innerHTML=out;
    wireAccordions();
    renderPacing();`;

// Unit 1 is the only unit with all three assets live. Unit 3's project and
// scenario pages exist too but are deliberately held back for now.
const U1_ANCHOR = `    { n:1, name:"Introduction to Security", frqDays:0, labDays:2, testDays:1, lessons:[`;
const U1_NEW = `    { n:1, name:"Introduction to Security", frqDays:0, labDays:2, testDays:1,
      unitSite:{ exam:P+"ap-cyber-unit-1-exam", project:P+"ap-cyber-unit-1-project", scenario:P+"ap-cyber-unit-1-scenario-practice" },
      lessons:[`;

// The workbook's review block is 5+8+7+6 = 26 days; the page carried 12.
const ERD_ANCHOR = 'EXAM_REVIEW_DAYS: 12';
const ERD_NEW = 'EXAM_REVIEW_DAYS: 26';

const EDITS = [
  ['pacing CSS', CSS_ANCHOR, CSS + CSS_ANCHOR],
  ['pacing container', MARKUP_ANCHOR, MARKUP + MARKUP_ANCHOR],
  ['pacing JS', JS_ANCHOR, JS + JS_ANCHOR],
  ['unit assets in unit body', BODY_ANCHOR, BODY_NEW],
  ['renderPacing call', CALL_ANCHOR, CALL_NEW],
  ['unit 1 unitSite', U1_ANCHOR, U1_NEW],
  ['EXAM_REVIEW_DAYS 12 -> 26', ERD_ANCHOR, ERD_NEW],
];

function transformPacingView(body, notes) {
  let out = body;
  for (const [label, anchor, replacement] of EDITS) {
    const at = out.indexOf(anchor);
    if (at < 0) throw new Error(`anchor not found for ${label}`);
    if (out.indexOf(anchor, at + 1) >= 0) throw new Error(`anchor is not unique for ${label}`);
    out = out.slice(0, at) + replacement + out.slice(at + anchor.length);
    notes.push(label);
  }
  return out;
}

module.exports = { transformPacingView, EDITS, PACING_JS: JS };
