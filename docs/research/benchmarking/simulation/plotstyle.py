"""Shared typography, palette and labelling for every figure.

Three rules are enforced here rather than left to each figure:

  1. EVERY figure carries a visible SYNTHETIC DATA banner. Not a footnote, not a
     caption the LaTeX might drop -- a mark burned into the image, so a figure that
     escapes into a slide deck still says what it is.
  2. Colour never carries information on its own. Every series is also separated by
     marker, hatch, or line style, so the figures survive greyscale printing and
     colour-vision deficiency. The palette is Okabe-Ito.
  3. Figures are written with deterministic metadata so a rerun from the same seed
     produces a byte-identical file. Matplotlib stamps a creation date into PDF and
     PNG by default, which would defeat the reproducibility check.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402

import params as P  # noqa: E402

C = P.PALETTE

#: Where figures are written, relative to this file: ../figures/
FIGURE_DIR = Path(__file__).resolve().parent.parent / "figures"


def apply_style() -> None:
    plt.rcParams.update(
        {
            "figure.dpi": 110,
            "savefig.dpi": 200,
            "font.family": "sans-serif",
            "font.sans-serif": ["DejaVu Sans"],
            "font.size": 9,
            "axes.titlesize": 10,
            "axes.titleweight": "bold",
            "axes.labelsize": 9,
            "axes.edgecolor": "#333333",
            "axes.linewidth": 0.8,
            "axes.grid": True,
            "axes.axisbelow": True,
            "grid.color": "#DDDDDD",
            "grid.linewidth": 0.6,
            "legend.fontsize": 8,
            "legend.frameon": False,
            "xtick.labelsize": 8,
            "ytick.labelsize": 8,
            "xtick.color": "#333333",
            "ytick.color": "#333333",
            "figure.facecolor": "white",
            "savefig.facecolor": "white",
            "pdf.fonttype": 42,  # embed TrueType, so the PDF is text-searchable
            "ps.fonttype": 42,
            "svg.hashsalt": "gt-benchmarking",  # deterministic element ids
        }
    )


def strip_spines(ax, keep=("left", "bottom")) -> None:
    for side, spine in ax.spines.items():
        spine.set_visible(side in keep)


def synthetic_banner(fig, extra: str = "") -> None:
    """The mandatory mark. Top-right of the figure, always present, never subtle."""
    text = "SYNTHETIC DATA — SIMULATED COHORT, NOT AN EMPIRICAL RESULT"
    if extra:
        text = f"{text}  ·  {extra}"
    fig.text(
        0.995,
        0.995,
        text,
        ha="right",
        va="top",
        fontsize=7,
        fontweight="bold",
        color="#8A1C1C",
        bbox=dict(boxstyle="round,pad=0.32", facecolor="#FBEAEA", edgecolor="#C86A6A", linewidth=0.7),
    )


def projection_banner(fig, what: str) -> None:
    """A second mark, for figures that depend on data that has not been collected.

    Used on every panel involving the CogAT-like comparator: GT has committed to
    supplying CogAT and MAP records for its on-campus students (E-100) but none are in
    hand, so those panels are the DESIGN of a future study, not an analysis of it.
    """
    fig.text(
        0.005,
        0.995,
        f"PROJECTED STUDY DESIGN — {what}",
        ha="left",
        va="top",
        fontsize=7,
        fontweight="bold",
        color="#1F3A63",
        bbox=dict(boxstyle="round,pad=0.32", facecolor="#E8EFF8", edgecolor="#7592BC", linewidth=0.7),
    )


def parameter_box(ax, lines: list[str], loc: str = "lower right", alpha: float = 0.94) -> None:
    """Print the assumed parameters a panel depends on, onto the panel.

    The audience includes someone actively trying to find the flaw. Making them open a
    source file to learn which assumption drives a curve is a way of losing that
    argument slowly.
    """
    positions = {
        "lower right": (0.98, 0.03, "right", "bottom"),
        "lower left": (0.02, 0.03, "left", "bottom"),
        "upper left": (0.02, 0.97, "left", "top"),
        "upper right": (0.98, 0.97, "right", "top"),
    }
    x, y, ha, va = positions[loc]
    ax.text(
        x,
        y,
        "\n".join(lines),
        transform=ax.transAxes,
        ha=ha,
        va=va,
        fontsize=6.8,
        color="#333333",
        linespacing=1.35,
        bbox=dict(boxstyle="round,pad=0.35", facecolor="white", edgecolor="#CCCCCC",
                  linewidth=0.6, alpha=alpha),
    )


def conclusion_strip(fig, text: str, y: float = 0.012) -> None:
    """The sentence the reader should leave with, printed under the figure.

    The LaTeX caption will say this too. It is repeated in the image so that the figure
    cannot be lifted out of the paper and reused without it.
    """
    fig.text(
        0.5,
        y,
        text,
        ha="center",
        va="bottom",
        fontsize=8.2,
        color="#111111",
        wrap=True,
        bbox=dict(boxstyle="round,pad=0.45", facecolor="#F4F4F2", edgecolor="#BBBBBB", linewidth=0.7),
    )


def panel_tag(ax, letter: str, title: str) -> None:
    ax.set_title(f"({letter})  {title}", loc="left", pad=7)


def save(fig, name: str) -> list[Path]:
    """Write a figure as PDF (for LaTeX) and PNG (for review), with fixed metadata."""
    FIGURE_DIR.mkdir(parents=True, exist_ok=True)
    written = []
    pdf = FIGURE_DIR / f"{name}.pdf"
    png = FIGURE_DIR / f"{name}.png"
    # Blank metadata keeps reruns byte-identical; matplotlib otherwise stamps a date.
    fig.savefig(pdf, format="pdf", metadata={"Creator": None, "Producer": None, "CreationDate": None})
    fig.savefig(png, format="png", metadata={"Software": None})
    written.extend([pdf, png])
    plt.close(fig)
    return written
