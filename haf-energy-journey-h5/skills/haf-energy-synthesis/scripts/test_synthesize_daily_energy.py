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

    def test_selected_word_becomes_moment_and_primary_chakra(self) -> None:
        numerology, chakra = self.build_release_example()
        result = SYNTHESIS.synthesize(numerology, chakra)
        selected = chakra["interaction"]["selected_word"]
        self.assertEqual(result["keyword"]["display"], selected["display"])
        self.assertEqual(result["moment_keyword"]["word_id"], selected["id"])
        self.assertEqual(result["primary_chakra"]["id"], selected["chakra_id"])
        self.assertEqual(result["daily_theme"]["display"], "放下")
        self.assertEqual(result["composite_title"], f"{selected['display']} · 放下")
        self.assertEqual(result["selection_policy"], "user_selected_chakra_word")
        self.assertIn(selected["display"], result["energy_summary"])

    def test_same_numerology_changes_word_across_field_positions(self) -> None:
        numerology = NUMEROLOGY.calculate_profile("1990-10-12", "2020-03-16")
        words = set()
        for row in range(10):
            for column in range(7):
                x = (column + 0.5) / 7 * 2 - 1
                y = (row + 0.5) / 10 * 2 - 1
                chakra = CHAKRA.project(
                    x,
                    y,
                    numerology["life_path"]["value"],
                    numerology["personal_cycle"]["personal_day"],
                )
                words.add(SYNTHESIS.synthesize(numerology, chakra)["keyword"]["display"])
        self.assertEqual(len(words), 70)

    def test_daily_theme_word_is_not_in_sensing_word_bank(self) -> None:
        numerology = NUMEROLOGY.calculate_profile("1990-08-12", "2026-08-22")
        for personal_day in range(1, 10):
            numerology["life_path"]["value"] = 8
            numerology["personal_cycle"]["personal_day"] = personal_day
            chakra = CHAKRA.project(
                0.82,
                0.78,
                8,
                personal_day,
            )
            result = SYNTHESIS.synthesize(numerology, chakra)
            self.assertNotEqual(result["keyword"]["display"], result["daily_theme"]["display"])
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
