#!/usr/bin/env python3
"""Generate a single self-contained explorer app (app.html) for the question-type catalog.

Reads catalog/master_types.jsonl + measurements.json (+ the two coverage reports for the
headline numbers), inlines everything into one HTML file so it opens by double-click, and
embeds each type's demo via an iframe. Run:  python3 build_app.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, "catalog")

AREAS = [
    ["fluid_reasoning", "Fluid / Nonverbal", "#4f46e5"],
    ["verbal", "Verbal", "#0d9488"],
    ["quantitative", "Quantitative", "#d97706"],
    ["spatial", "Spatial", "#db2777"],
    ["working_memory", "Working Memory / EF", "#7c3aed"],
    ["processing_speed", "Processing Speed", "#0891b2"],
    ["complementary", "Complementary", "#16a34a"],
    ["game_based", "Game-Based", "#ea580c"],
]
PREFIX = {"FLU": "fluid_reasoning", "VER": "verbal", "QUANT": "quantitative", "SPA": "spatial",
          "WM": "working_memory", "PS": "processing_speed", "CX": "complementary", "GB": "game_based"}


def load_jsonl(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]


def cov_from(path):
    if not os.path.exists(path):
        return {"n": 0, "total": 0, "pct": 0}
    txt = open(path, encoding="utf-8").read()
    m = re.search(r"(\d+)\s*/\s*(\d+).*?\(\*\*(\d+)%\*\*\)", txt)
    if m:
        return {"n": int(m.group(1)), "total": int(m.group(2)), "pct": int(m.group(3))}
    return {"n": 0, "total": 0, "pct": 0}


def main():
    types = load_jsonl(os.path.join(CAT, "master_types.jsonl"))
    for t in types:
        pre = str(t.get("type_id", "")).split("-")[0]
        t["section"] = PREFIX.get(pre, (t.get("areas") or ["game_based"])[0])
    types.sort(key=lambda t: (t["section"], t["type_id"]))
    meas = json.load(open(os.path.join(CAT.replace("catalog", ""), "measurements.json"), encoding="utf-8"))
    data = {
        "types": types,
        "meas": meas,
        "areas": AREAS,
        "coverage": {"topgt": cov_from(os.path.join(CAT, "COVERAGE_REPORT.md")),
                     "full": cov_from(os.path.join(CAT, "COVERAGE_REPORT_FULL.md"))},
    }
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = TEMPLATE.replace("/*DATA_PLACEHOLDER*/", blob)
    out = os.path.join(HERE, "app.html")
    open(out, "w", encoding="utf-8").write(html)
    print(f"wrote {out}  ({len(html)//1024} KB, {len(types)} types, {len(meas)} measurements)")


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Question-Type Explorer &mdash; K&ndash;8 Gifted Exam</title>
<style>
  :root{
    --paper:#f5f6f9; --panel:#ffffff; --ink:#141b30; --muted:#616b82; --line:#e5e8f0;
    --accent:#4f46e5; --accent-soft:#eef0fe; --ok:#16a34a;
    --sans:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{font-family:var(--sans);color:var(--ink);background:var(--paper);font-size:14.5px;line-height:1.5}
  a{color:var(--accent)}
  .spectrum{display:flex;height:5px}
  .spectrum i{flex:1}
  header{position:sticky;top:0;z-index:20;background:var(--panel);border-bottom:1px solid var(--line)}
  .bar{display:flex;align-items:center;gap:18px;padding:12px 20px;flex-wrap:wrap}
  .brand{display:flex;flex-direction:column;line-height:1.15}
  .brand b{font-size:19px;font-weight:800;letter-spacing:-.02em}
  .brand span{font-size:12px;color:var(--muted)}
  .stats{margin-left:auto;display:flex;gap:16px;font-family:var(--mono);font-size:12px;color:var(--muted)}
  .stats b{color:var(--ink);font-size:15px}
  .stats .ok{color:var(--ok)}
  .tabs{display:flex;gap:6px}
  .tabs button{font:inherit;font-weight:600;font-size:13px;border:1px solid var(--line);background:var(--panel);
    color:var(--muted);padding:7px 14px;border-radius:999px;cursor:pointer}
  .tabs button[aria-selected=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
  main{height:calc(100vh - 62px);overflow:hidden}
  /* ---- types view ---- */
  #types{display:grid;grid-template-columns:250px 350px 1fr;height:100%}
  .col{height:100%;overflow-y:auto;border-right:1px solid var(--line)}
  .filters{padding:16px}
  .filters h3{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:18px 0 8px}
  .filters h3:first-child{margin-top:0}
  #search{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font:inherit;background:var(--panel)}
  #search:focus{outline:2px solid var(--accent);border-color:transparent}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chip{font:inherit;font-size:12px;font-weight:600;border:1px solid var(--line);background:var(--panel);
    padding:5px 10px;border-radius:999px;cursor:pointer;display:flex;align-items:center;gap:6px;color:var(--ink)}
  .chip .dot{width:9px;height:9px;border-radius:50%}
  .chip[aria-pressed=true]{border-color:currentColor;box-shadow:inset 0 0 0 1px currentColor}
  .chip .n{font-family:var(--mono);color:var(--muted);font-size:11px}
  .shown{font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:14px}
  .banner{margin:10px 0 0;padding:8px 10px;background:var(--accent-soft);border-radius:8px;font-size:12.5px}
  .banner button{margin-left:6px;border:0;background:none;color:var(--accent);cursor:pointer;font:inherit;text-decoration:underline}
  /* list */
  #list{padding:10px}
  .item{padding:10px 12px;border:1px solid var(--line);border-left-width:4px;border-radius:9px;margin-bottom:8px;cursor:pointer;background:var(--panel)}
  .item:hover{border-color:var(--accent)}
  .item[aria-selected=true]{background:var(--accent-soft);border-color:var(--accent)}
  .item .id{font-family:var(--mono);font-size:11px;color:var(--muted)}
  .item .nm{font-weight:700;margin:1px 0 3px}
  .item .meta{font-size:11.5px;color:var(--muted)}
  .item .bands{font-family:var(--mono);font-size:10.5px}
  .groophdr{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);font-weight:700;
    padding:12px 4px 6px;position:sticky;top:0;background:var(--paper)}
  /* detail */
  #detail{padding:0}
  .empty{padding:60px 30px;color:var(--muted);text-align:center}
  .dhead{padding:20px 24px 14px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--panel);z-index:2}
  .dhead .row1{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .badge{font-size:11px;font-weight:700;color:#fff;padding:3px 9px;border-radius:999px}
  .dhead h2{margin:6px 0 3px;font-size:22px;font-weight:800;letter-spacing:-.02em}
  .dhead .tid{font-family:var(--mono);font-size:12px;color:var(--muted)}
  .dhead .one{margin:8px 0 0;font-size:15px}
  .dbody{padding:20px 24px 60px;max-width:900px}
  section.blk{margin:0 0 22px}
  section.blk>h4{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:0 0 8px;
    border-bottom:1px solid var(--line);padding-bottom:5px}
  .kv{display:grid;grid-template-columns:150px 1fr;gap:4px 14px;font-size:13.5px}
  .kv dt{color:var(--muted);font-weight:600}
  .kv dd{margin:0}
  .demoWrap{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}
  .demoWrap .dbar{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);
    background:#fafbfd;font-size:12px;color:var(--muted)}
  .demoWrap iframe{width:100%;height:460px;border:0;display:block;background:#fff}
  .demoWrap .dbar a{margin-left:auto;font-weight:600}
  table.ls{width:100%;border-collapse:collapse;font-size:13px}
  table.ls th,table.ls td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--line)}
  table.ls th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
  table.ls td.src{color:var(--muted);font-size:12px}
  .mchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
  .mchip{font-family:var(--mono);font-size:11.5px;font-weight:600;background:var(--accent-soft);color:var(--accent);
    border:0;padding:4px 9px;border-radius:7px;cursor:pointer}
  .mchip:hover{background:var(--accent);color:#fff}
  .rationale{background:#fafbfd;border:1px solid var(--line);border-radius:9px;padding:11px 13px;font-size:13.5px}
  .tags{display:flex;flex-wrap:wrap;gap:5px}
  .tag{font-size:11.5px;background:#eef1f6;border-radius:6px;padding:3px 8px;color:#3a4256}
  /* measurements + coverage views (shared table styling) */
  .viewpad{height:100%;overflow-y:auto;padding:24px 28px 60px}
  .viewpad h2{font-size:22px;font-weight:800;letter-spacing:-.02em;margin:0 0 4px}
  .viewpad p.lead{color:var(--muted);margin:0 0 20px;max-width:780px}
  table.grid{width:100%;border-collapse:collapse;font-size:13px;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
  table.grid th,table.grid td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--line)}
  table.grid th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#fafbfd;position:sticky;top:0}
  table.grid td.code{font-family:var(--mono);font-weight:700;color:var(--accent);cursor:pointer;white-space:nowrap}
  table.grid td.num{font-family:var(--mono);text-align:center}
  .heroes{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:26px}
  .hero{flex:1;min-width:230px;border:1px solid var(--line);border-radius:14px;padding:18px 20px;background:var(--panel)}
  .hero .lab{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
  .hero .big{font-size:40px;font-weight:800;letter-spacing:-.03em;color:var(--ok)}
  .hero .sub{font-family:var(--mono);font-size:12.5px;color:var(--muted)}
  .matrix td.area{font-weight:700}
  .swatch{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:middle}
  @media (max-width:1000px){#types{grid-template-columns:1fr;overflow-y:auto}.col{height:auto;max-height:none;border-right:0;border-bottom:1px solid var(--line)}#detail{min-height:60vh}}
  @media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style>
</head>
<body>
<div class="spectrum" id="spectrum"></div>
<header>
  <div class="bar">
    <div class="brand"><b>Question-Type Explorer</b><span>K&ndash;8 gifted-exam question types &middot; built from the qbank</span></div>
    <div class="tabs" role="tablist">
      <button role="tab" data-view="types" aria-selected="true">Question Types</button>
      <button role="tab" data-view="meas" aria-selected="false">Measurements</button>
      <button role="tab" data-view="cov" aria-selected="false">Coverage</button>
    </div>
    <div class="stats" id="hstats"></div>
  </div>
</header>
<main>
  <div id="types" role="tabpanel">
    <div class="col filters">
      <h3>Search</h3>
      <input id="search" type="search" placeholder="name, id, topic, technique&hellip;" autocomplete="off">
      <div id="mbanner"></div>
      <h3>Areas</h3><div class="chips" id="areaChips"></div>
      <h3>Age bands</h3><div class="chips" id="bandChips"></div>
      <div class="shown" id="shown"></div>
    </div>
    <div class="col" id="list"></div>
    <div class="col" id="detail"><div class="empty">Select a question type to see its design, measurements, and live demo.</div></div>
  </div>
  <div id="meas" role="tabpanel" class="viewpad" hidden></div>
  <div id="cov" role="tabpanel" class="viewpad" hidden></div>
</main>
<script>
const DATA = /*DATA_PLACEHOLDER*/;
const {types:TYPES, meas:MEAS, areas:AREAS, coverage:COV} = DATA;
const BANDS=["K-1","2-3","4-5","6-8"];
const AC={}, AL={}; AREAS.forEach(([k,l,c])=>{AC[k]=c;AL[k]=l;});
const MBYID={}; MEAS.forEach(m=>MBYID[m.id]=m);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const state={view:"types",sel:null,q:"",areas:new Set(),bands:new Set(),meas:null};

// header stats + spectrum
document.getElementById("spectrum").innerHTML=AREAS.map(([k,l,c])=>`<i style="background:${c}" title="${esc(l)}"></i>`).join("");
document.getElementById("hstats").innerHTML=
  `<span><b>${TYPES.length}</b> types</span><span><b>${MEAS.length}</b> measurements</span>`+
  `<span class="ok"><b>${COV.topgt.pct}%</b> top-GT</span><span class="ok"><b>${COV.full.pct}%</b> full qbank</span>`;

function usage(mid){return TYPES.filter(t=>(t.measurements||[]).includes(mid)).length;}
function matches(t){
  if(state.areas.size&&!state.areas.has(t.section))return false;
  if(state.bands.size&&!(t.age_bands||[]).some(b=>state.bands.has(b)))return false;
  if(state.meas&&!(t.measurements||[]).includes(state.meas))return false;
  if(state.q){const q=state.q.toLowerCase();
    const hay=[t.type_id,t.name,t.one_liner,(t.topics_techniques_covered||[]).join(" "),(t.areas||[]).join(" ")].join(" ").toLowerCase();
    if(!hay.includes(q))return false;}
  return true;
}
function renderChips(){
  document.getElementById("areaChips").innerHTML=AREAS.map(([k,l,c])=>{
    const n=TYPES.filter(t=>t.section===k).length;
    return `<button class="chip" style="color:${c}" data-area="${k}" aria-pressed="${state.areas.has(k)}"><span class="dot" style="background:${c}"></span>${esc(l)} <span class="n">${n}</span></button>`;
  }).join("");
  document.getElementById("bandChips").innerHTML=BANDS.map(b=>
    `<button class="chip" data-band="${b}" aria-pressed="${state.bands.has(b)}">${b}</button>`).join("");
}
function renderList(){
  const shown=TYPES.filter(matches);
  document.getElementById("shown").textContent=`showing ${shown.length} of ${TYPES.length}`;
  document.getElementById("mbanner").innerHTML=state.meas?
    `<div class="banner">Filtered by <b>${esc(state.meas)}</b> &mdash; ${esc((MBYID[state.meas]||{}).name||"")}<button id="clrM">clear</button></div>`:"";
  let html="",cur=null;
  shown.forEach(t=>{
    if(t.section!==cur){cur=t.section;html+=`<div class="groophdr"><span class="swatch" style="background:${AC[cur]}"></span>${esc(AL[cur]||cur)}</div>`;}
    html+=`<div class="item" data-id="${esc(t.type_id)}" aria-selected="${state.sel===t.type_id}" style="border-left-color:${AC[t.section]}" tabindex="0">
      <div class="id">${esc(t.type_id)}</div><div class="nm">${esc(t.name)}</div>
      <div class="meta">${esc((t.topics_techniques_covered||[]).slice(0,3).join(" &middot; ").replace(/&amp;/g,"&"))}</div>
      <div class="meta bands">${esc((t.age_bands||[]).join("  "))}</div></div>`;
  });
  document.getElementById("list").innerHTML=html||`<div class="empty">No types match.</div>`;
}
function kv(pairs){return `<dl class="kv">`+pairs.filter(p=>p[1]).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")+`</dl>`;}
function renderDetail(){
  const el=document.getElementById("detail");
  const t=TYPES.find(x=>x.type_id===state.sel);
  if(!t){el.innerHTML='<div class="empty">Select a question type to see its design, measurements, and live demo.</div>';return;}
  const ls=(t.learning_science||[]).map(x=>`<tr><td><b>${esc(x.principle)}</b></td><td>${esc(x.why)}</td><td>${esc(x.concrete_decision)}</td><td class="src">${esc(x.source)}</td></tr>`).join("");
  const ad=t.adaptive||{};
  const adHtml=typeof ad==="string"?esc(ad):kv([["Works well",ad.works_well],["Content range",ad.content_range],["Difficulty levers",ad.difficulty_levers],["AIG cloneable",ad.aig_cloneable],["Notes",ad.notes]]);
  const mchips=(t.measurements||[]).map(m=>`<button class="mchip" data-m="${esc(m)}" title="${esc((MBYID[m]||{}).name||"")}">${esc(m)}</button>`).join("");
  el.innerHTML=`
    <div class="dhead">
      <div class="row1"><span class="badge" style="background:${AC[t.section]}">${esc(AL[t.section]||t.section)}</span>
        <span class="tid">${esc(t.type_id)}</span></div>
      <h2>${esc(t.name)}</h2>
      <div class="tid">areas: ${esc((t.areas||[]).join(", "))} &middot; bands: ${esc((t.age_bands||[]).join(", "))}</div>
      <p class="one">${esc(t.one_liner)}</p>
    </div>
    <div class="dbody">
      <section class="blk"><h4>Live demo</h4>
        <div class="demoWrap"><div class="dbar">Interactive sample &mdash; wordless intro, warm-up, scored item, live telemetry
          <a href="${esc(t.demo_path)}" target="_blank" rel="noopener">Open in new tab &#8599;</a></div>
          <iframe src="${esc(t.demo_path)}" title="demo" loading="lazy"></iframe></div>
        <p style="font-size:12px;color:var(--muted);margin:8px 2px 0">If the demo is blank, your browser blocked the local iframe &mdash; use &ldquo;Open in new tab,&rdquo; or serve the folder (see README).</p>
      </section>
      <section class="blk"><h4>How a child answers</h4>${kv([["Interaction",t.interaction],["Self-teaches via",t.self_teach],["Engagement hook",t.engagement_hook]])}</section>
      <section class="blk"><h4>(a) Learning-science basis</h4>
        <table class="ls"><thead><tr><th>Principle</th><th>Why it applies</th><th>Concrete decision</th><th>Source</th></tr></thead><tbody>${ls||'<tr><td colspan=4>&mdash;</td></tr>'}</tbody></table></section>
      <section class="blk"><h4>(b) Measurements &amp; tail precision</h4>
        <div class="mchips">${mchips}</div>
        <div class="rationale">${esc(t.tail_precision_rationale)}</div></section>
      <section class="blk"><h4>(c) Ages &amp; who it fits</h4>${kv([["Age bands",(t.age_bands||[]).join(", ")],["Rationale",t.age_rationale]])}</section>
      <section class="blk"><h4>(d) Adaptive-testing fit</h4>${adHtml}</section>
      <section class="blk"><h4>Construct-irrelevant risks</h4><div class="rationale">${esc(t.construct_irrelevant_risks)}</div></section>
      <section class="blk"><h4>Topics / techniques covered</h4><div class="tags">${(t.topics_techniques_covered||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div></section>
    </div>`;
  el.scrollTop=0;
}
function renderMeas(){
  const el=document.getElementById("meas");
  const rows=MEAS.map(m=>`<tr><td class="code" data-m="${esc(m.id)}">${esc(m.id)}</td><td><b>${esc(m.name)}</b></td>
    <td>${esc(m.what)}</td><td>${esc(m.usefulness_tail)}</td><td>${esc(m.how_to_collect)}</td><td>${esc(m.how_much_to_collect)}</td>
    <td class="num">${usage(m.id)}</td></tr>`).join("");
  el.innerHTML=`<h2>Measurement registry</h2>
    <p class="lead">${MEAS.length} measurements the question types collect. Each is reused across many types (right column) to keep every signal densely sampled. Click an ID to see the types that collect it.</p>
    <table class="grid"><thead><tr><th>ID</th><th>Name</th><th>What</th><th>Tail-precision usefulness</th><th>How to collect</th><th>How much</th><th># types</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function renderCov(){
  const el=document.getElementById("cov");
  const cell=(area,band)=>TYPES.filter(t=>t.section===area&&((t.age_bands||[]).includes(band)||(t.age_bands||[]).includes("K-8"))).length;
  const rows=AREAS.map(([k,l,c])=>`<tr class="matrix"><td class="area"><span class="swatch" style="background:${c}"></span>${esc(l)}</td>`+
    BANDS.map(b=>`<td class="num">${cell(k,b)}</td>`).join("")+`<td class="num"><b>${TYPES.filter(t=>t.section===k).length}</b></td></tr>`).join("");
  el.innerHTML=`<h2>Coverage</h2>
    <p class="lead">Every top-GT-identifying qbank item &mdash; and in fact every non-meta qbank item &mdash; is representable by at least 3 distinct question types.</p>
    <div class="heroes">
      <div class="hero"><div class="lab">Top-GT items &ge;3 types</div><div class="big">${COV.topgt.pct}%</div><div class="sub">${COV.topgt.n} / ${COV.topgt.total} items</div></div>
      <div class="hero"><div class="lab">Full qbank items &ge;3 types</div><div class="big">${COV.full.pct}%</div><div class="sub">${COV.full.n} / ${COV.full.total} items</div></div>
      <div class="hero"><div class="lab">Catalog size</div><div class="big" style="color:var(--ink)">${TYPES.length}</div><div class="sub">question types &middot; ${MEAS.length} measurements</div></div>
    </div>
    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Question types per area &times; age band</h3>
    <table class="grid"><thead><tr><th>Area</th>${BANDS.map(b=>`<th>${b}</th>`).join("")}<th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="lead" style="margin-top:14px">Cells count how many types in each area apply to each band (a K&ndash;8 type counts for all). The 100% figures above are item-level coverage of the qbank, not these counts.</p>`;
}
function setView(v){
  state.view=v;
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute("aria-selected",b.dataset.view===v));
  document.getElementById("types").hidden=v!=="types";
  document.getElementById("meas").hidden=v!=="meas";
  document.getElementById("cov").hidden=v!=="cov";
  if(v==="meas")renderMeas(); if(v==="cov")renderCov();
}
// events
document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(b)setView(b.dataset.view);});
document.getElementById("search").addEventListener("input",e=>{state.q=e.target.value;renderList();});
document.getElementById("areaChips").addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;const a=b.dataset.area;state.areas.has(a)?state.areas.delete(a):state.areas.add(a);renderChips();renderList();});
document.getElementById("bandChips").addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;const k=b.dataset.band;state.bands.has(k)?state.bands.delete(k):state.bands.add(k);renderChips();renderList();});
document.getElementById("list").addEventListener("click",e=>{const it=e.target.closest(".item");if(!it)return;state.sel=it.dataset.id;renderList();renderDetail();});
document.getElementById("list").addEventListener("keydown",e=>{if(e.key==="Enter"){const it=e.target.closest(".item");if(it){state.sel=it.dataset.id;renderList();renderDetail();}}});
document.getElementById("detail").addEventListener("click",e=>{const m=e.target.closest(".mchip");if(m){state.meas=m.dataset.m;state.areas.clear();state.bands.clear();document.getElementById("search").value="";state.q="";setView("types");renderChips();renderList();}});
document.getElementById("meas").addEventListener("click",e=>{const c=e.target.closest("td.code");if(c){state.meas=c.dataset.m;state.areas.clear();state.bands.clear();document.getElementById("search").value="";state.q="";setView("types");renderChips();renderList();}});
document.getElementById("mbanner").addEventListener("click",e=>{if(e.target.id==="clrM"){state.meas=null;renderList();}});
// init
renderChips();renderList();
</script>
</body>
</html>"""


if __name__ == "__main__":
    main()
