#!/usr/bin/env python3
"""
Renders every catalogue demo in headless Chromium and reports what a viewer would actually see.

Checks, per item:
  gate       the press-play gate was dismissed (autostart patch still works on a hidden button)
  play       the Play button is not visible
  tel        the telemetry sidebar is not visible
  howto      the "how to answer" header is visible and carries real text
  stage      the question itself rendered something

Chromium is run with --dump-dom, so the probe writes its findings into <title> where they can be
read back out. Copies are used so the real files are never touched.
"""
import concurrent.futures
import pathlib
import re
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).parent
ITEMS = ROOT / "items"

CHROME = next(
    iter(
        sorted(
            pathlib.Path.home().glob(
                "Library/Caches/ms-playwright/chromium_headless_shell-*/"
                "chrome-headless-shell-mac-arm64/chrome-headless-shell"
            ),
            reverse=True,
        )
    ),
    None,
)

PROBE = """
<script>
(function () {
  function vis(el) {
    if (!el) return 'absent';
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || !el.offsetParent && s.position !== 'fixed') return 'hidden';
    return 'shown';
  }
  function text(el) { return el ? (el.innerText || el.textContent || '').trim().length : 0; }
  setTimeout(function () {
    var howto = document.getElementById('howto');
    var stage = document.getElementById('stagecard') || document.getElementById('stage') || document.getElementById('boards');
    document.title = 'PROBE'
      + '|gate=' + (document.documentElement.hasAttribute('data-gt-gate') ? 'UP' : 'dismissed')
      + '|play=' + vis(document.getElementById('play'))
      + '|tel=' + vis(document.getElementById('telemetry'))
      + '|howto=' + vis(howto) + ':' + text(howto)
      + '|stage=' + (stage ? (stage.children.length || (text(stage) ? 1 : 0)) : -1);
  }, 8000);
})();
</script>
"""


def run_one(src: pathlib.Path, workdir: pathlib.Path) -> tuple[str, dict]:
    dst = workdir / src.name
    t = src.read_text(encoding="utf-8", errors="replace")
    i = t.rfind("</body>")
    dst.write_text(t[:i] + PROBE + t[i:], encoding="utf-8")
    try:
        out = subprocess.run(
            [
                str(CHROME),
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--virtual-time-budget=9000",
                "--dump-dom",
                f"file://{dst}",
            ],
            capture_output=True,
            text=True,
            timeout=90,
        ).stdout
    except subprocess.TimeoutExpired:
        return src.stem, {"error": "timeout"}
    m = re.search(r"<title>(PROBE\|[^<]*)</title>", out)
    if not m:
        return src.stem, {"error": "no-probe"}
    d = {}
    for part in m.group(1).split("|")[1:]:
        k, _, v = part.partition("=")
        d[k] = v
    return src.stem, d


def main() -> None:
    if CHROME is None:
        raise SystemExit("chrome-headless-shell not found")
    files = sorted(ITEMS.glob("*.html"))
    work = pathlib.Path(tempfile.mkdtemp(prefix="gt-verify-"))
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            results = list(ex.map(lambda f: run_one(f, work), files))
    finally:
        shutil.rmtree(work, ignore_errors=True)

    bad = []
    for name, d in results:
        ok = (
            d.get("gate") == "dismissed"
            and d.get("play") in ("hidden", "absent")
            and d.get("tel") in ("hidden", "absent")
            and d.get("howto", "").startswith("shown:")
            and int(d.get("howto", "shown:0").split(":")[1] or 0) > 40
        )
        if not ok:
            bad.append((name, d))

    print(f"checked {len(results)} items, {len(results) - len(bad)} clean\n")
    if bad:
        print("needs a look:")
        for name, d in bad:
            print(f"  {name:26} {d}")
    else:
        print("all items: gate dismissed, play hidden, telemetry hidden, how-to visible")

    thin = [(n, d) for n, d in results if d.get("stage") in ("0", "-1")]
    if thin:
        print(f"\nstage rendered nothing ({len(thin)}) - worth an eyeball:")
        for name, d in thin:
            print(f"  {name:26} stage={d.get('stage')}")


if __name__ == "__main__":
    main()
