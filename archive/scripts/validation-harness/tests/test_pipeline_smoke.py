"""End-to-end smoke tests + born-synthetic guard tests.

Run from scripts/validation-harness/:
    python3 -m unittest discover -s tests -t .
"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from harness import config as config_mod  # noqa: E402
from harness import dataio, pipeline  # noqa: E402


class TestPipelineEndToEnd(unittest.TestCase):
    def test_generate_and_validate(self):
        cfg = config_mod.default_config()
        cfg["generation"]["n_students"] = 250  # small + fast
        with tempfile.TemporaryDirectory() as tmp:
            result = pipeline.run_end_to_end(cfg, out_dir=tmp)
            # report artifacts exist
            self.assertTrue(os.path.exists(result["reports"]["md"]))
            self.assertTrue(os.path.exists(result["reports"]["html"]))
            self.assertTrue(os.path.exists(result["reports"]["results"]))
            # manifest proves born-synthetic
            manifest_path = os.path.join(tmp, "synthetic_scores.manifest.json")
            with open(manifest_path) as fh:
                manifest = json.load(fh)
            self.assertIs(manifest["synthetic_only"], True)
            self.assertIs(manifest["validated"], False)
            self.assertIs(manifest["contains_real_data"], False)
            # results contain every analysis
            with open(result["reports"]["results"]) as fh:
                data = json.load(fh)
            for key in ("concurrent_validity", "classification_agreement",
                        "reliability", "ceiling_floor", "incremental_validity",
                        "dif", "equity_funnel", "differential_prediction"):
                self.assertIn(key, data["results"])

    def test_report_has_synthetic_banner(self):
        cfg = config_mod.default_config()
        cfg["generation"]["n_students"] = 200
        with tempfile.TemporaryDirectory() as tmp:
            result = pipeline.run_end_to_end(cfg, out_dir=tmp)
            with open(result["reports"]["md"]) as fh:
                md = fh.read()
            self.assertIn("synthetic_only=true", md)
            self.assertIn("validated=false", md)
            self.assertIn("SYNTHETIC DATA ONLY", md)

    def test_recovers_injected_dif(self):
        """The DIF machinery should flag the injected uniform-DIF items."""
        cfg = config_mod.default_config()
        cfg["generation"]["n_students"] = 800
        with tempfile.TemporaryDirectory() as tmp:
            gen = pipeline.generate_dataset(cfg, out_dir=tmp)
            val = pipeline.validate_dataset(gen["csv"], cfg, out_dir=tmp)
            with open(val["reports"]["results"]) as fh:
                data = json.load(fh)
            flagged = set(data["results"]["dif"]["summary_pass1"]["flagged_items"])
            injected = {f"nt_{i:02d}"
                        for i in [j + 1 for j in cfg["generation"]["dif"]["uniform_items"]]}
            # every injected uniform-DIF item is caught
            self.assertTrue(injected.issubset(flagged),
                            f"injected={injected} flagged={flagged}")


class TestBornSyntheticGuard(unittest.TestCase):
    def test_guard_blocks_non_synthetic(self):
        manifest = {"synthetic_only": False, "validated": False,
                    "source": "born-synthetic"}
        with self.assertRaises(dataio.BornSyntheticGuardError):
            dataio.assert_born_synthetic(manifest, "x.csv", verify_hash=False)

    def test_guard_blocks_validated_true(self):
        manifest = {"synthetic_only": True, "validated": True,
                    "source": "born-synthetic"}
        with self.assertRaises(dataio.BornSyntheticGuardError):
            dataio.assert_born_synthetic(manifest, "x.csv", verify_hash=False)

    def test_guard_blocks_real_data_flag(self):
        manifest = {"synthetic_only": True, "validated": False,
                    "contains_real_data": True, "source": "born-synthetic"}
        with self.assertRaises(dataio.BornSyntheticGuardError):
            dataio.assert_born_synthetic(manifest, "x.csv", verify_hash=False)

    def test_guard_blocks_missing_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = os.path.join(tmp, "orphan.csv")
            with open(csv_path, "w") as fh:
                fh.write("a,b\n1,2\n")
            with self.assertRaises(dataio.BornSyntheticGuardError):
                dataio.load_dataset(csv_path)

    def test_guard_detects_tampering(self):
        cfg = config_mod.default_config()
        cfg["generation"]["n_students"] = 100
        with tempfile.TemporaryDirectory() as tmp:
            gen = pipeline.generate_dataset(cfg, out_dir=tmp)
            # tamper with the CSV after the manifest committed its hash
            with open(gen["csv"], "a") as fh:
                fh.write("SYNTH-999999,5,120,210" + ",0" * 30 + ",5,55.0,focal,ELL,lower-income\n")
            with self.assertRaises(dataio.BornSyntheticGuardError):
                dataio.load_dataset(gen["csv"], verify_hash=True)


if __name__ == "__main__":
    unittest.main()
