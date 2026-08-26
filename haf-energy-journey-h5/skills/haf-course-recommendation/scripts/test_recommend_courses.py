#!/usr/bin/env python3

import importlib.util
import json
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
    SKILLS_DIR / "haf-energy-synthesis" / "scripts" / "synthesize_daily_energy.py",
)
RECOMMENDER = load_module(
    "recommend_courses",
    Path(__file__).with_name("recommend_courses.py"),
)
CATALOG = json.loads(
    (SKILLS_DIR / "haf-course-recommendation" / "references" / "demo-courses.json").read_text(
        encoding="utf-8"
    )
)


def release_insight():
    numerology = NUMEROLOGY.calculate_profile("1990-10-12", "2020-03-16")
    chakra = CHAKRA.project(
        -0.62,
        -0.48,
        numerology["life_path"]["value"],
        numerology["personal_cycle"]["personal_day"],
    )
    result = SYNTHESIS.synthesize(numerology, chakra)
    result["source_compass"] = chakra["compass"]["four_poles"]
    return result


class CourseRecommendationTests(unittest.TestCase):
    def test_returns_exactly_three_unique_courses(self) -> None:
        result = RECOMMENDER.recommend(release_insight(), CATALOG)
        ids = [item["course"]["course_id"] for item in result["recommendations"]]
        self.assertEqual(len(ids), 3)
        self.assertEqual(len(set(ids)), 3)

    def test_top_course_matches_current_insight(self) -> None:
        insight = release_insight()
        result = RECOMMENDER.recommend(insight, CATALOG)
        top_course = result["recommendations"][0]["course"]
        self.assertIn(insight["primary_chakra"]["id"], top_course["chakra_tags"])
        self.assertIn(insight["keyword"]["id"], top_course["keyword_tags"])

    def test_every_course_matches_primary_chakra(self) -> None:
        insight = release_insight()
        result = RECOMMENDER.recommend(insight, CATALOG)
        for item in result["recommendations"]:
            self.assertIn(insight["primary_chakra"]["id"], item["course"]["chakra_tags"])

    def test_solar_plexus_never_falls_back_to_root_only_course(self) -> None:
        insight = release_insight()
        insight["primary_chakra"] = {"id": "solar_plexus", "zh": "太阳神经丛"}
        insight["secondary_chakra"] = {"id": "root", "zh": "海底轮"}
        result = RECOMMENDER.recommend(insight, CATALOG)
        for item in result["recommendations"]:
            self.assertIn("solar_plexus", item["course"]["chakra_tags"])

    def test_reasons_are_grounded_in_course_fit_statement(self) -> None:
        result = RECOMMENDER.recommend(release_insight(), CATALOG)
        for item in result["recommendations"]:
            self.assertIn(item["course"]["fit_statement"], item["fit_reason"])
            self.assertTrue(item["fit_evidence"])
            self.assertNotIn("这节课", item["fit_reason"])

    def test_recent_course_receives_lower_score(self) -> None:
        baseline = RECOMMENDER.recommend(release_insight(), CATALOG)
        first_id = baseline["recommendations"][0]["course"]["course_id"]
        with_recent = RECOMMENDER.recommend(release_insight(), CATALOG, {first_id})
        recent_candidate = next(
            (
                item
                for item in with_recent["recommendations"]
                if item["course"]["course_id"] == first_id
            ),
            None,
        )
        if recent_candidate is not None:
            self.assertEqual(recent_candidate["score_breakdown"]["recency"], 0.0)

    def test_excluded_course_is_never_returned(self) -> None:
        result = RECOMMENDER.recommend(
            release_insight(), CATALOG, exclude_course_ids={"release-ritual"}
        )
        ids = [item["course"]["course_id"] for item in result["recommendations"]]
        self.assertNotIn("release-ritual", ids)

    def test_invalid_insight_schema_is_rejected(self) -> None:
        insight = release_insight()
        insight["schema_version"] = "bad"
        with self.assertRaisesRegex(ValueError, "insight schema"):
            RECOMMENDER.recommend(insight, CATALOG)

    def test_no_price_is_present(self) -> None:
        result = RECOMMENDER.recommend(release_insight(), CATALOG)
        for item in result["recommendations"]:
            self.assertNotIn("price", item["course"])


if __name__ == "__main__":
    unittest.main()
