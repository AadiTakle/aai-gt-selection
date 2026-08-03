"""GT Selection — exam validation & psychometrics harness (born-synthetic only).

STRUCTURE-AGNOSTIC validation pipeline for ANY cognitive test. Consumes a plain
per-student score table; makes no assumption that a test is adaptive, two-stage,
fixed-form, or otherwise. All data used here is synthetic (D-006, R9); the loader
fails closed unless a dataset is tagged ``synthetic_only=true``.
"""

__all__ = [
    "psychometrics",
    "synth",
    "dataio",
    "analyses",
    "report",
    "pipeline",
    "config",
]

SCHEMA_VERSION = "1"
