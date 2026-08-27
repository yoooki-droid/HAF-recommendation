#!/usr/bin/env python3

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("project_chakra_energy.py")
SPEC = importlib.util.spec_from_file_location("project_chakra_energy", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ChakraWordProjectionTests(unittest.TestCase):
    @staticmethod
    def point_for_cell(column: int, row: int) -> tuple[float, float]:
        return ((column + 0.5) / 7 * 2 - 1, (row + 0.5) / 10 * 2 - 1)

    def test_all_seventy_cells_select_a_unique_word_and_its_chakra(self) -> None:
        seen_words: set[str] = set()
        seen_displays: set[str] = set()
        chakra_counts: dict[str, int] = {}
        for row in range(10):
            for column in range(7):
                x, y = self.point_for_cell(column, row)
                result = MODULE.project(x, y, 7, 4)
                selected = result["interaction"]["selected_word"]
                self.assertEqual(result["primary_chakra"]["id"], selected["chakra_id"])
                seen_words.add(selected["id"])
                seen_displays.add(selected["display"])
                chakra_counts[selected["chakra_id"]] = chakra_counts.get(selected["chakra_id"], 0) + 1
        self.assertEqual(len(seen_words), 70)
        self.assertEqual(len(seen_displays), 70)
        self.assertTrue(seen_displays.isdisjoint({"开始", "连接", "表达", "安定", "流动", "关照", "照见", "力量", "放下", "整合"}))
        self.assertEqual(set(chakra_counts.values()), {10})

    def test_same_cell_is_stable(self) -> None:
        first = MODULE.project(-0.42, -0.24, 9, 6)
        second = MODULE.project(-0.42, -0.24, 9, 6)
        self.assertEqual(first["interaction"], second["interaction"])

    def test_position_change_crossing_a_cell_changes_the_word(self) -> None:
        first = MODULE.project(-0.42, -0.24, 9, 6)
        second = MODULE.project(0.42, 0.24, 9, 6)
        self.assertNotEqual(first["interaction"]["selected_word"]["id"], second["interaction"]["selected_word"]["id"])

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
