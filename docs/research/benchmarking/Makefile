# Build the benchmarking methodology report.
#
#   make            regenerate numbers and build main.pdf (local LaTeX)
#   make docker     same, in a TeX Live container (no local LaTeX needed)
#   make numbers    run the self-test and regenerate generated/
#   make check      validate the statistics library and macro consistency
#   make clean      remove build artefacts (keeps generated/ and the PDF)
#   make distclean  also remove generated/ and the PDF

SHELL     := /bin/bash
PYTHON    ?= python3
MAIN      := main
TEXENGINE ?= pdflatex
DOCKERIMG ?= texlive/texlive:latest-small

GENERATED := generated/numbers.tex
SCRIPTS   := scripts/statlib.py scripts/compute.py
SOURCES   := $(MAIN).tex appendices.tex preamble.tex

.PHONY: all numbers check pdf docker clean distclean help

all: pdf

# ---------------------------------------------------------------------------
# Numbers. Nothing is built until the statistics library passes its own tests.
# ---------------------------------------------------------------------------
$(GENERATED): $(SCRIPTS) scripts/selftest.py
	cd scripts && $(PYTHON) selftest.py
	cd scripts && $(PYTHON) compute.py

numbers: $(GENERATED)

check: numbers
	cd scripts && $(PYTHON) selftest.py
	$(PYTHON) scripts/check_macros.py

# ---------------------------------------------------------------------------
# PDF. Three passes: labels, table of contents, cross-references.
# ---------------------------------------------------------------------------
pdf: $(MAIN).pdf

$(MAIN).pdf: $(SOURCES) $(GENERATED)
	@command -v $(TEXENGINE) >/dev/null 2>&1 || { \
	  echo ""; \
	  echo "  $(TEXENGINE) not found."; \
	  echo "  Run 'make docker' to build in a container instead,"; \
	  echo "  or install TeX Live / MacTeX."; \
	  echo ""; exit 1; }
	$(TEXENGINE) -interaction=nonstopmode -halt-on-error $(MAIN).tex
	$(TEXENGINE) -interaction=nonstopmode -halt-on-error $(MAIN).tex
	$(TEXENGINE) -interaction=nonstopmode -halt-on-error $(MAIN).tex
	@echo "built $(MAIN).pdf"

# ---------------------------------------------------------------------------
# Containerised build, for machines without a TeX installation.
# Runs as the invoking user so the PDF is not left owned by root.
# ---------------------------------------------------------------------------
docker: numbers
	docker run --rm \
	  --user "$$(id -u):$$(id -g)" \
	  -v "$$(pwd)":/work -w /work \
	  -e HOME=/tmp \
	  $(DOCKERIMG) \
	  /bin/sh -c 'for i in 1 2 3; do pdflatex -interaction=nonstopmode -halt-on-error $(MAIN).tex || exit 1; done'
	@echo "built $(MAIN).pdf via $(DOCKERIMG)"

clean:
	rm -f $(MAIN).aux $(MAIN).log $(MAIN).out $(MAIN).toc $(MAIN).fls \
	      $(MAIN).fdb_latexmk $(MAIN).synctex.gz

distclean: clean
	rm -f $(MAIN).pdf
	rm -rf generated

help:
	@sed -n '1,12p' Makefile
