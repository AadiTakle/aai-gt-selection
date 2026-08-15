#!/usr/bin/env python3
"""
Removes the "press play to start" gate from the catalogue copies of the demos.

These 52 files are demos rather than live assessment items, so the gate adds a click and a
piece of broken copy ("Press play when you are, and it starts then") between the viewer and
the question. This injects a small script that dismisses the gate automatically.

It does not reimplement any of the page's logic. Every demo already has a `#play` button whose
handler is the page's own start path, so this simply clicks it, which is exactly what a person
clicking it would do. The gate is watched rather than clicked once, because several demos
reopen it between rounds.

Idempotent: it will not inject twice. Reversible: run with --revert.

    python3 patch-autostart.py
    python3 patch-autostart.py --revert
"""
import pathlib
import sys

ITEMS = pathlib.Path(__file__).parent / "items"
MARK = "gt-demo-autostart"

SNIPPET = f"""
<script data-{MARK}="1">
/* Catalogue-only: dismiss the press-play gate so browsing is uninterrupted.
   Clicks the demo's own #play button rather than reimplementing its start logic.
   Not present in the live screener. */
(function () {{
  var root = document.documentElement;
  var tries = 0;
  function go() {{
    var btn = document.getElementById('play');
    if (!btn) return;
    if (!root.hasAttribute('data-gt-gate')) return;
    btn.click();
  }}
  // The gate reopens between rounds in several demos, so watch rather than fire once.
  if (window.MutationObserver) {{
    new MutationObserver(function () {{ go(); }})
      .observe(root, {{ attributes: true, attributeFilter: ['data-gt-gate'] }});
  }}
  // And catch the case where the gate is already up by the time this runs.
  var poll = setInterval(function () {{
    go();
    if (++tries > 40) clearInterval(poll);
  }}, 50);
  window.addEventListener('load', go);
}})();
</script>
"""


def patch(path: pathlib.Path) -> str:
    t = path.read_text(encoding="utf-8", errors="replace")
    if MARK in t:
        return "already"
    i = t.rfind("</body>")
    if i == -1:
        return "no-body"
    path.write_text(t[:i] + SNIPPET + t[i:], encoding="utf-8")
    return "patched"


def revert(path: pathlib.Path) -> str:
    t = path.read_text(encoding="utf-8", errors="replace")
    if MARK not in t:
        return "clean"
    start = t.find(f'\n<script data-{MARK}="1">')
    if start == -1:
        return "manual"
    end = t.find("</script>", start)
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
