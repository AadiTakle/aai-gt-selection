"""Consistency check between generated/numbers.tex and the document sources.

Catches three failure modes:
  1. a stale generated/ directory (compute.py newer than its own output);
  2. macros that are generated but never used, which usually means a number was
     computed for a passage that has since been rewritten;
  3. document text calling a generated-looking macro that no longer exists,
     usually a passage left behind when compute.py was retuned.  LaTeX also
     catches this, but only after a full build and only for the first one.

Exits non-zero on staleness or on an undefined macro; unused macros are
reported as warnings only.
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GEN = os.path.join(ROOT, "generated", "numbers.tex")
SOURCES = ["main.tex", "appendices.tex", "preamble.tex"]

if not os.path.exists(GEN):
    sys.exit("generated/numbers.tex missing -- run compute.py first")

# 1. staleness
gen_mtime = os.path.getmtime(GEN)
stale = []
for script in ("compute.py", "statlib.py"):
    p = os.path.join(HERE, script)
    if os.path.getmtime(p) > gen_mtime:
        stale.append(script)
if stale:
    sys.exit("STALE: %s newer than generated/numbers.tex -- re-run compute.py"
             % ", ".join(stale))

# 2. defined vs used
defined = set(re.findall(r"\\newcommand\{\\([A-Za-z]+)\}", open(GEN).read()))

text = ""
for name in SOURCES:
    path = os.path.join(ROOT, name)
    if os.path.exists(path):
        text += open(path).read()

used = set(re.findall(r"\\([A-Za-z]+)", text))
unused = sorted(defined - used)

print("macros defined: %d" % len(defined))
print("macros used:    %d" % len(defined & used))
if unused:
    print("\nWARNING -- %d generated macro(s) never used:" % len(unused))
    for name in unused:
        print("  \\%s" % name)
else:
    print("every generated macro is referenced.")

# 3. every generated table is included somewhere
gendir = os.path.join(ROOT, "generated")
tables = [f[:-4] for f in os.listdir(gendir)
          if f.startswith("tab_") and f.endswith(".tex")]
missing = [t for t in tables if ("generated/" + t) not in text]
if missing:
    print("\nWARNING -- generated table(s) never included: %s" % ", ".join(missing))
else:
    print("every generated table is included.")

# 4. document text calling generated-looking macros that do not exist
#    Generated macros are CamelCase starting with an upper-case letter, which
#    distinguishes them from LaTeX and package commands.
KNOWN_LOCAL = set(re.findall(r"\\newcommand\{\\([A-Za-z]+)\}",
                             open(os.path.join(ROOT, "preamble.tex")).read()))
STANDARD = {"LaTeX", "TeX", "LaTeXe"}   # real commands that look generated
called = set(re.findall(r"\\([A-Z][A-Za-z]*)\{\}", text)) - STANDARD
undefined = sorted(called - defined - KNOWN_LOCAL)

if undefined:
    print("\nERROR -- %d macro(s) called but never generated:" % len(undefined))
    for name in undefined:
        print("  \\%s" % name)
    sys.exit(1)
print("no undefined generated macros.")

print("\nconsistency check complete.")
