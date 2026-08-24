#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import unittest
from datetime import datetime
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("validate_course_recall.py")
SPEC = importlib.util.spec_from_file_location("validate_course_recall", MODULE_PATH)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


def session(begin_at: str, end_at: str) -> dict:
    return {"begin_at": begin_at, "end_at": end_at}


class CourseRecallValidationTests(unittest.TestCase):
    def test_parse_datetime_accepts_catalog_format(self) -> None:
        self.assertEqual(
            VALIDATOR.parse_datetime("2025-10-24 16:00:00"),
            datetime(2025, 10, 24, 16, 0, 0),
        )
        self.assertIsNone(VALIDATOR.parse_datetime("not-a-date"))
        self.assertIsNone(VALIDATOR.parse_datetime(None))

    def test_inventory_parsing_is_independent_from_datetime(self) -> None:
        self.assertEqual(VALIDATOR.parse_inventory("12"), 12)
        self.assertIsNone(VALIDATOR.parse_inventory(""))
        self.assertIsNone(VALIDATOR.parse_inventory(True))

    def test_event_availability_uses_dates_from_catalog(self) -> None:
        catalog = {
            "courses": [
                {
                    "session_count": 1,
                    "sessions": [session("2025-10-24 09:00:00", "2025-10-24 10:00:00")],
                },
                {
                    "session_count": 1,
                    "sessions": [session("2025-10-25 09:00:00", "2025-10-25 12:00:00")],
                },
            ]
        }
        rows = VALIDATOR.event_time_availability(catalog)
        self.assertEqual([row["as_of"] for row in rows], [
            "2025-10-24 08:00:00",
            "2025-10-24 18:00:00",
            "2025-10-25 08:00:00",
            "2025-10-25 18:00:00",
            "2025-10-25 23:59:59",
        ])
        self.assertEqual(rows[0]["available_course_concepts"], 2)
        self.assertEqual(rows[1]["available_course_concepts"], 1)
        self.assertEqual(rows[3]["available_course_concepts"], 0)

    def test_event_url_and_year_are_explicit(self) -> None:
        self.assertEqual(
            VALIDATOR.api_url_for_event("HAF 2026"),
            "https://api.tsaopaochee.net/organizer/suggestionList?eventId=HAF+2026",
        )
        self.assertEqual(VALIDATOR.catalog_year("HAF 2025"), "2025")
        with self.assertRaises(ValueError):
            VALIDATOR.catalog_year("HAF current")

    def test_catalog_label_can_be_recovered_from_normalized_data(self) -> None:
        catalog = {
            "courses": [
                {"source_event_ids": ["HAF 2025"]},
                {"source_event_ids": ["HAF 2025"]},
            ]
        }
        self.assertEqual(
            VALIDATOR.catalog_label_from_data(catalog, "fallback"), "HAF 2025"
        )


if __name__ == "__main__":
    unittest.main()
