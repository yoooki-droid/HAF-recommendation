#!/usr/bin/env python3

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("calculate_numerology.py")
SPEC = importlib.util.spec_from_file_location("calculate_numerology", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class NumerologyTests(unittest.TestCase):
    def test_world_numerology_life_path_example(self) -> None:
        result = MODULE.calculate_profile("1990-08-12", "2026-08-22")
        self.assertEqual(result["life_path"]["value"], 3)
        self.assertEqual(result["life_path"]["trace"]["component_values"], [8, 3, 1])

    def test_world_numerology_master_components_example(self) -> None:
        result = MODULE.calculate_profile("1983-11-22", "2026-08-22")
        self.assertEqual(result["life_path"]["value"], 9)
        self.assertEqual(result["life_path"]["trace"]["component_values"], [11, 22, 3])

    def test_numerology_com_personal_day_example(self) -> None:
        result = MODULE.calculate_profile("1990-10-12", "2020-03-16")
        self.assertEqual(result["personal_cycle"]["personal_day"], 9)

    def test_final_master_number_is_preserved(self) -> None:
        result = MODULE.calculate_profile("1980-01-01", "2026-08-22")
        self.assertEqual(result["life_path"]["value"], 11)
        self.assertEqual(result["life_path"]["base_digit"], 2)
        self.assertTrue(result["life_path"]["is_master_number"])

    def test_invalid_date_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "valid YYYY-MM-DD"):
            MODULE.calculate_profile("1990-02-30", "2026-08-22")


if __name__ == "__main__":
    unittest.main()
