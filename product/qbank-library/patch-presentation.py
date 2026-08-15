#!/usr/bin/env python3
"""
Strips the developer chrome from the catalogue copies of the demos so each page shows the
question and nothing else.

Two things were sitting around every question:

  #playgate   An unstyled div holding the Play button and the line "The board is ready. Press
              play when you are, and it starts then." Because it carries no CSS of its own it
              never left the layout when the gate was dismissed, so the button stayed parked at
              the bottom of all 52 pages.
  #telemetry  A 320px dark sidebar with the item id, difficulty meters and a live event log.
              Useful when building an item, noise when showing one.

Both are hidden rather than deleted. The pages' own scripts still write into these nodes, so
removing them from the DOM would throw; hiding them leaves that code untouched. The autostart
patch also still works, because `.click()` fires on a hidden button.

The "how to answer" text at the top is the demo's own `#howto` header, present and written in
all 52 files already. This only gives it a little more emphasis now that it is the first thing
a viewer reads.

Idempotent: it will not inject twice. Reversible: run with --revert.

    python3 patch-presentation.py
    python3 patch-presentation.py --revert
"""
import pathlib
import sys

ITEMS = pathlib.Path(__file__).parent / "items"
MARK = "gt-demo-presentation"

SNIPPET = f"""<style data-{MARK}="1">
/* Catalogue-only presentation pass. Not present in the live screener. */

/* The play button and its broken copy. Hidden, not removed: the page's start path still
   needs the button in the DOM for the autostart patch to click. */
#playgate {{ display: none !important; }}

/* Authoring instrumentation: item id, difficulty meters, event log. */
#telemetry {{ display: none !important; }}

/* body stays flex and #wrap keeps flex:1, so hiding the sidebar is enough to hand the
   question the full width. #wrap already centres its own children. */

/* #howto is now the viewer's only orientation, so lift it slightly off the page. */
#howto {{
  max-width: 720px !important;
  box-shadow: 0 10px 30px -20px #002a3a !important;
}}

/* Press t to bring the telemetry panel back mid-demo. */
html[data-{MARK}-tel] #telemetry {{ display: flex !important; }}
</style>
<script data-{MARK}="1">
/* Catalogue-only: `t` reveals the telemetry panel, for showing what the item measures. */
document.addEventListener('keydown', function (e) {{
  if (e.key !== 't' && e.key !== 'T') return;
  var tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
  var root = document.documentElement;
  var attr = 'data-{MARK}-tel';
  if (root.hasAttribute(attr)) root.removeAttribute(attr);
  else root.setAttribute(attr, '1');
}});
</script>
"""


def patch(path: pathlib.Path) -> str:
    t = path.read_text(encoding="utf-8", errors="replace")
    if MARK in t:
        return "already"
    i = t.rfind("</head>")
    if i == -1:
        return "no-head"
    path.write_text(t[:i] + SNIPPET + t[i:], encoding="utf-8")
    return "patched"


def revert(path: pathlib.Path) -> str:
    t = path.read_text(encoding="utf-8", errors="replace")
    if MARK not in t:
        return "clean"
    start = t.find(f'<style data-{MARK}="1">')
    if start == -1:
        return "manual"
    end = t.find("</script>\n", start)
    if end == -1:
        return "manual"
    end += len("</script>\n")
    path.write_text(t[:start] + t[end:], encoding="utf-8")
    return "reverted"


def main() -> None:
    doing_revert = "--revert" in sys.argv
    fn = revert if doing_revert else patch
    counts: dict[str, int] = {}
    for p in sorted(ITEMS.glob("*.html")):
        r = fn(p)
        counts[r] = counts.get(r, 0) + 1
    verb = "revert" if doing_revert else "patch"
    print(f"{verb}: " + ", ".join(f"{v} {k}" for k, v in sorted(counts.items())))


if __name__ == "__main__":
    main()
