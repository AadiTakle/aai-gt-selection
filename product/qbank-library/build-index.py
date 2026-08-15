#!/usr/bin/env python3
"""
Regenerates index.html by reading the demo files themselves.

Run this after adding or removing anything in items/ so the index cannot drift out of
sync with what is actually on disk:

    python3 build-index.py
"""
import html
import pathlib
import re
from collections import defaultdict

HERE = pathlib.Path(__file__).parent
ITEMS = HERE / "items"

# Prefix to a human label and a one-line description of what that family probes.
AREAS = [
    ("VER", "Verbal reasoning", "Meaning, relations between words, and sense-making in language."),
    ("QUANT", "Quantitative reasoning", "Number sense, rules and relationships, several with no reading at all."),
    ("SPA", "Spatial reasoning", "Mental rotation, folding, perspective and cross-sections. No reading required."),
    ("FLU", "Fluid reasoning", "Working out a rule that was never taught, then applying it."),
    ("GB", "Interactive tasks", "Longer tasks where the process is observed, not just the answer."),
    ("WM", "Working memory", "How much a child can hold and manipulate at once."),
    ("CX", "Consistency check", "Serves the same problem twice to test whether an answer was stable."),
]
AREA_LABEL = {code: label for code, label, _ in AREAS}
AREA_DESC = {code: desc for code, _, desc in AREAS}

TITLE_RE = re.compile(r"<title>([^<]*)</title>", re.I)


def read_meta(path: pathlib.Path) -> dict:
    head = path.read_text(encoding="utf-8", errors="replace")[:4000]
    m = TITLE_RE.search(head)
    raw = html.unescape(m.group(1)).strip() if m else path.stem
    # Titles look like "SPA-TANGRAM-01 · Shape-Fill Form Board".
    code, _, name = raw.partition("·")
    code = code.strip() or path.stem
    name = name.strip() or code
    # Several source titles carry an authoring suffix, e.g. "Balance Lab (renderer)".
    name = re.sub(r"\s*\((?:renderer|standalone|demo|preview)\)\s*$", "", name, flags=re.I)
    prefix = code.split("-")[0].upper()
    return {
        "file": path.name,
        "code": code,
        "name": name,
        "area": prefix if prefix in AREA_LABEL else "OTHER",
        "kb": round(path.stat().st_size / 1024),
    }


def main() -> None:
    metas = sorted((read_meta(p) for p in ITEMS.glob("*.html")), key=lambda m: (m["area"], m["code"]))
    by_area = defaultdict(list)
    for m in metas:
        by_area[m["area"]].append(m)

    order = [c for c, _, _ in AREAS if by_area.get(c)] + (["OTHER"] if by_area.get("OTHER") else [])

    chips = "\n".join(
        f'      <button class="chip" data-area="{a}">{html.escape(AREA_LABEL.get(a, "Other"))}'
        f' <span class="n">{len(by_area[a])}</span></button>'
        for a in order
    )

    sections = []
    for a in order:
        cards = "\n".join(
            f'''        <button class="card" data-file="{m['file']}" data-code="{html.escape(m['code'])}"
                data-name="{html.escape(m['name'])}" data-area="{a}">
          <span class="name">{html.escape(m['name'])}</span>
          <span class="code">{html.escape(m['code'])}</span>
        </button>'''
            for m in by_area[a]
        )
        sections.append(
            f'''    <section class="area" data-area="{a}">
      <h2>{html.escape(AREA_LABEL.get(a, "Other"))} <span class="n">{len(by_area[a])}</span></h2>
      <p class="areadesc">{html.escape(AREA_DESC.get(a, ""))}</p>
      <div class="grid">
{cards}
      </div>
    </section>'''
        )

    counts = " &middot; ".join(f"{len(by_area[a])} {html.escape(AREA_LABEL.get(a, 'other').lower())}" for a in order)

    out = TEMPLATE.format(
        total=len(metas),
        areacount=len(order),
        counts=counts,
        chips=chips,
        sections="\n".join(sections),
    )
    (HERE / "index.html").write_text(out, encoding="utf-8")
    print(f"wrote index.html: {len(metas)} items across {len(order)} areas")
    for a in order:
        print(f"  {AREA_LABEL.get(a, 'Other'):<24} {len(by_area[a])}")


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Question library &middot; {total} item types</title>
<style>
  :root {{
    --ink:#12161c; --soft:#5c6673; --line:#e2e6ec; --bg:#f6f8fa; --card:#fff;
    --accent:#2c5f8a; --accent-soft:#eaf1f7; --radius:10px;
  }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
    font:15px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased; }}
  .wrap {{ max-width:1180px; margin:0 auto; padding:28px 22px 72px; }}

  header h1 {{ margin:0 0 6px; font-size:22px; letter-spacing:-0.01em; }}
  header .sub {{ margin:0; color:var(--soft); font-size:14px; max-width:74ch; }}
  .counts {{ margin:10px 0 0; color:var(--soft); font-size:13px; }}

  .controls {{ display:flex; gap:10px; align-items:center; flex-wrap:wrap;
    margin:22px 0 8px; position:sticky; top:0; background:var(--bg);
    padding:12px 0; border-bottom:1px solid var(--line); z-index:5; }}
  #q {{ flex:1; min-width:220px; border:1px solid var(--line); border-radius:var(--radius);
    padding:9px 12px; font:inherit; font-size:14px; background:var(--card); }}
  #q:focus {{ outline:2px solid var(--accent-soft); border-color:var(--accent); }}
  .chips {{ display:flex; gap:6px; flex-wrap:wrap; }}
  .chip {{ border:1px solid var(--line); background:var(--card); color:var(--soft);
    border-radius:999px; padding:6px 12px; font:inherit; font-size:13px; cursor:pointer; }}
  .chip:hover {{ color:var(--ink); }}
  .chip.on {{ background:var(--accent); border-color:var(--accent); color:#fff; }}
  .chip .n, h2 .n {{ opacity:.65; font-variant-numeric:tabular-nums; }}

  .area {{ margin-top:30px; }}
  .area h2 {{ margin:0 0 3px; font-size:16px; }}
  .areadesc {{ margin:0 0 14px; color:var(--soft); font-size:13px; max-width:80ch; }}
  .grid {{ display:grid; gap:10px; grid-template-columns:repeat(auto-fill,minmax(228px,1fr)); }}

  .card {{ display:flex; flex-direction:column; gap:5px; align-items:flex-start; text-align:left;
    background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
    padding:14px 15px; cursor:pointer; font:inherit; transition:border-color .12s,transform .12s; }}
  .card:hover {{ border-color:var(--accent); transform:translateY(-1px); }}
  .card .name {{ font-weight:600; font-size:14.5px; }}
  .card .code {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:11.5px; color:var(--soft); }}

  #empty {{ display:none; color:var(--soft); padding:26px 0; }}

  #overlay {{ position:fixed; inset:0; background:rgba(10,14,20,.62);
    display:none; align-items:center; justify-content:center; padding:20px; z-index:50; }}
  #overlay.on {{ display:flex; }}
  #panel {{ background:var(--card); border-radius:12px; width:min(1000px,100%);
    height:min(760px,100%); display:flex; flex-direction:column; overflow:hidden; }}
  #bar {{ display:flex; align-items:center; gap:12px; padding:11px 14px;
    border-bottom:1px solid var(--line); }}
  #bar .t {{ font-weight:600; font-size:14.5px; }}
  #bar .c {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:11.5px; color:var(--soft); }}
  #bar .sp {{ flex:1; }}
  #bar a, #bar button {{ border:1px solid var(--line); background:var(--card); color:var(--soft);
    border-radius:7px; padding:5px 11px; font:inherit; font-size:13px;
    cursor:pointer; text-decoration:none; }}
  #bar a:hover, #bar button:hover {{ color:var(--accent); border-color:var(--accent); }}
  #frame {{ flex:1; border:0; width:100%; background:#fff; }}
  #filenote {{ padding:10px 14px; font-size:12.5px; color:var(--soft);
    border-top:1px solid var(--line); display:none; }}

  footer {{ margin-top:40px; padding-top:16px; border-top:1px solid var(--line);
    color:var(--soft); font-size:12.5px; max-width:86ch; }}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Question library</h1>
    <p class="sub">{total} item types across {areacount} areas of reasoning. Every one is playable in
    the browser. Click any card to try it exactly as a child would see it.</p>
    <p class="counts">{counts}</p>
  </header>

  <div class="controls">
    <input id="q" type="search" placeholder="Search by name or code, e.g. fold, matrix, SPA" autocomplete="off">
    <div class="chips">
      <button class="chip on" data-area="all">All <span class="n">{total}</span></button>
{chips}
    </div>
  </div>

{sections}

  <p id="empty">Nothing matches that search.</p>

  <footer>
    Several of these families generate a fresh version of the question every time they run, so two
    children do not see the same item. What each family measures, how hard it is, and how well it
    behaves are properties of the item type rather than of any single question, and those are held
    in the screening engine rather than here. This page is the catalogue.
  </footer>
</div>

<div id="overlay">
  <div id="panel">
    <div id="bar">
      <span class="t"></span><span class="c"></span><span class="sp"></span>
      <a id="newtab" href="#" target="_blank" rel="noopener">Open in new tab</a>
      <button id="close">Close</button>
    </div>
    <iframe id="frame" title="Question preview"></iframe>
    <div id="filenote">If the preview is blank, the browser is blocking embedded local files.
      Use <strong>Open in new tab</strong>, or serve the folder with
      <code>python3 -m http.server 8000</code>.</div>
  </div>
</div>

<script>
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var q = document.getElementById('q');
  var empty = document.getElementById('empty');
  var area = 'all';

  function apply() {{
    var term = q.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (c) {{
      var okArea = area === 'all' || c.dataset.area === area;
      var hay = (c.dataset.name + ' ' + c.dataset.code).toLowerCase();
      var okTerm = !term || hay.indexOf(term) !== -1;
      var on = okArea && okTerm;
      c.style.display = on ? '' : 'none';
      if (on) shown++;
    }});
    document.querySelectorAll('.area').forEach(function (s) {{
      var any = Array.prototype.some.call(s.querySelectorAll('.card'), function (c) {{
        return c.style.display !== 'none';
      }});
      s.style.display = any ? '' : 'none';
    }});
    empty.style.display = shown ? 'none' : 'block';
  }}

  q.addEventListener('input', apply);
  chips.forEach(function (ch) {{
    ch.addEventListener('click', function () {{
      chips.forEach(function (o) {{ o.classList.remove('on'); }});
      ch.classList.add('on');
      area = ch.dataset.area;
      apply();
    }});
  }});

  var overlay = document.getElementById('overlay');
  var frame = document.getElementById('frame');
  var newtab = document.getElementById('newtab');
  var filenote = document.getElementById('filenote');

  cards.forEach(function (c) {{
    c.addEventListener('click', function () {{
      var src = 'items/' + c.dataset.file;
      document.querySelector('#bar .t').textContent = c.dataset.name;
      document.querySelector('#bar .c').textContent = c.dataset.code;
      newtab.href = src;
      frame.src = src;
      filenote.style.display = location.protocol === 'file:' ? 'block' : 'none';
      overlay.classList.add('on');
    }});
  }});

  function close() {{
    overlay.classList.remove('on');
    frame.src = 'about:blank';
  }}
  document.getElementById('close').addEventListener('click', close);
  overlay.addEventListener('click', function (e) {{ if (e.target === overlay) close(); }});
  document.addEventListener('keydown', function (e) {{ if (e.key === 'Escape') close(); }});
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
