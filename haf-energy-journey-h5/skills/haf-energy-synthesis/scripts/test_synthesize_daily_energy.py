#!/usr/bin/env python3

import importlib.util
import unittest
from pathlib import Path


SKILLS_DIR = Path(__file__).resolve().parents[2]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


NUMEROLOGY = load_module(
    "calculate_numerology",
    SKILLS_DIR / "haf-numerology" / "scripts" / "calculate_numerology.py",
)
CHAKRA = load_module(
    "project_chakra_energy",
    SKILLS_DIR / "haf-chakra-energy" / "scripts" / "project_chakra_energy.py",
)
SYNTHESIS = load_module(
    "synthesize_daily_energy",
    Path(__file__).with_name("synthesize_daily_energy.py"),
)


class EnergySynthesisTests(unittest.TestCase):
    def build_release_example(self):
        numerology = NUMEROLOGY.calculate_profile("1990-10-12", "2020-03-16")
        chakra = CHAKRA.project(
            -0.62,
            -0.48,
            numerology["life_path"]["value"],
            numerology["personal_cycle"]["personal_day"],
        )
        return numerology, chakra

    def test_day_nine_is_background_while_inward_calm_selects_insight(self) -> None:
        numerology, chakra = self.build_release_example()
        result = SYNTHESIS.synthesize(numerology, chakra)
        self.assertEqual(result["keyword"]["display"], "照见")
        self.assertEqual(result["daily_theme"]["display"], "放下")
        self.assertEqual(result["composite_title"], "照见 · 放下")
        self.assertEqual(result["direction"]["horizontal"]["label"], "向内求索")
        self.assertEqual(result["direction"]["vertical"]["label"], "安静整合")
        self.assertIn("眉心轮", result["energy_summary"])

    def test_same_numerology_changes_keyword_across_compass(self) -> None:
        numerology = NUMEROLOGY.calculate_profile("1990-10-12", "2020-03-16")
        positions = {
            "inward_calm": (-0.88, -0.88),
            "outward_calm": (0.88, -0.88),
            "center": (0.0, 0.0),
            "inward_active": (-0.88, 0.88),
            "outward_active": (0.88, 0.88),
        }
        keywords = set()
        for x, y in positions.values():
            chakra = CHAKRA.project(
                x,
                y,
                numerology["life_path"]["value"],
                numerology["personal_cycle"]["personal_day"],
            )
            keywords.add(SYNTHESIS.synthesize(numerology, chakra)["keyword"]["display"])
        self.assertGreaterEqual(len(keywords), 4)

    def test_outward_active_strength_signals_select_strength_when_daily_theme_differs(self) -> None:
        numerology = NUMEROLOGY.calculate_profile("1990-08-12", "2026-08-22")
        numerology["life_path"]["value"] = 1
        numerology["personal_cycle"]["personal_day"] = 3
        chakra = CHAKRA.project(0.82, 0.78, 1, 3)
        result = SYNTHESIS.synthesize(numerology, chakra)
        self.assertEqual(result["keyword"]["display"], "力量")

    def test_moment_keyword_never_repeats_daily_theme(self) -> None:
        numerology = NUMEROLOGY.calculate_profile("1990-08-12", "2026-08-22")
        for personal_day in range(1, 10):
            numerology["life_path"]["value"] = 8
            numerology["personal_cycle"]["personal_day"] = personal_day
            chakra = CHAKRA.project(0.82, 0.78, 8, personal_day)
            result = SYNTHESIS.synthesize(numerology, chakra)
            self.assertNotEqual(result["keyword"]["id"], result["daily_theme"]["id"])
            self.assertEqual(result["selection_policy"], "moment_excludes_daily_theme")
            self.assertNotEqual(result["composite_title"].split(" · ")[0], result["composite_title"].split(" · ")[1])

    def test_input_mismatch_is_rejected(self) -> None:
        numerology, chakra = self.build_release_example()
        chakra["input"]["personal_day"] = 1
        with self.assertRaisesRegex(ValueError, "personal_day mismatch"):
            SYNTHESIS.synthesize(numerology, chakra)

    def test_trace_and_top_three_candidates_are_present(self) -> None:
        numerology, chakra = self.build_release_example()
        result = SYNTHESIS.synthesize(numerology, chakra)
        self.assertEqual(len(result["keyword_candidates"]), 3)
        self.assertIn(result["keyword"]["id"], result["keyword_trace"])
        scores = [item["score"] for item in result["keyword_candidates"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_copy_avoids_diagnostic_terms(self) -> None:
        numerology, chakra = self.build_release_example()
        result = SYNTHESIS.synthesize(numerology, chakra)
        combined = result["energy_summary"] + result["chakra_summary"]
        for forbidden in ["堵塞", "诊断", "治疗", "疾病"]:
            self.assertNotIn(forbidden, combined)


if __name__ == "__main__":
    unittest.main()
