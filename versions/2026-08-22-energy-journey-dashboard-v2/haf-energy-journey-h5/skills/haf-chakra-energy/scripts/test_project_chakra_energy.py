#!/usr/bin/env python3

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("project_chakra_energy.py")
SPEC = importlib.util.spec_from_file_location("project_chakra_energy", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ChakraProjectionTests(unittest.TestCase):
    def test_inward_calm_with_seven_centers_third_eye(self) -> None:
        result = MODULE.project(-0.80, -0.75, 7, 7)
        self.assertEqual(result["primary_chakra"]["id"], "third_eye")

    def test_outward_active_with_one_centers_solar_plexus(self) -> None:
        result = MODULE.project(0.80, 0.80, 1, 8)
        self.assertEqual(result["primary_chakra"]["id"], "solar_plexus")

    def test_center_with_six_centers_heart(self) -> None:
        result = MODULE.project(0.0, 0.0, 6, 2)
        self.assertEqual(result["primary_chakra"]["id"], "heart")

    def test_output_contains_all_seven_ranked_chakras(self) -> None:
        result = MODULE.project(-0.30, 0.25, 9, 4)
        self.assertEqual(len(result["chakras"]), 7)
        self.assertEqual([item["rank"] for item in result["chakras"]], list(range(1, 8)))
        self.assertTrue(all(0 <= item["score"] <= 100 for item in result["chakras"]))

    def test_coordinate_bounds_are_enforced(self) -> None:
        with self.assertRaisesRegex(ValueError, "between -1 and 1"):
            MODULE.project(1.2, 0.0, 9, 4)

    def test_invalid_personal_day_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "personal_day"):
            MODULE.project(0.0, 0.0, 9, 11)


if __name__ == "__main__":
    unittest.main()
