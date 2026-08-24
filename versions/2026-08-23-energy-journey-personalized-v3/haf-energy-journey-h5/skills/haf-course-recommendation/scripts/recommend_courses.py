#!/usr/bin/env python3
"""Select three grounded and diverse HAF courses from a normalized catalog."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "haf.course-recommendations.v1"
RECOMMENDATION_VERSION = "haf.course-ranking.v1"
WEIGHTS = {
    "chakra": 0.35,
    "compass": 0.25,
    "keyword": 0.20,
    "practice_fit": 0.10,
    "recency": 0.10,
}
INTENSITY_INDEX = {"low": 0, "medium": 1, "high": 2}
REQUIRED_COURSE_FIELDS = {
    "course_id",
    "title",
    "short_description",
    "fit_statement",
    "status",
    "format",
    "format_label",
    "duration_min",
    "intensity",
    "chakra_tags",
    "energy_poles",
    "keyword_tags",
    "cover_asset",
}


def load_json(path: str) -> dict[str, Any]:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read valid JSON from {path}") from error


def validate_inputs(insight: dict[str, Any], catalog: dict[str, Any]) -> None:
    if insight.get("schema_version") != "haf.daily-energy-insight.v2":
        raise ValueError("insight schema must be haf.daily-energy-insight.v2")
    if not isinstance(catalog.get("catalog_version"), str):
        raise ValueError("catalog_version is required")
    courses = catalog.get("courses")
    if not isinstance(courses, list):
        raise ValueError("catalog courses must be a list")
    seen_ids: set[str] = set()
    for index, course in enumerate(courses):
        missing = REQUIRED_COURSE_FIELDS - set(course)
        if missing:
            raise ValueError(f"course {index} missing fields: {sorted(missing)}")
        if course["course_id"] in seen_ids:
            raise ValueError(f"duplicate course_id: {course['course_id']}")
        seen_ids.add(course["course_id"])
        if course["intensity"] not in INTENSITY_INDEX:
            raise ValueError(f"invalid intensity for {course['course_id']}")


def target_intensity(insight: dict[str, Any]) -> str:
    direction = insight["direction"]
    chakra_poles = insight.get("source_compass")
    if chakra_poles is not None:
        poles = chakra_poles
    else:
        horizontal = direction["horizontal"]["id"]
        vertical = direction["vertical"]["id"]
        intensity = float(direction["intensity"])
        poles = {
            "outward": 0.75 if horizontal == "outward" else 0.25,
            "inward": 0.75 if horizontal == "inward" else 0.25,
            "active": 0.75 if vertical == "active" else 0.25,
            "calm": 0.75 if vertical == "calm" else 0.25,
        }
        if intensity < 0.35:
            poles = {key: 0.5 for key in poles}
    if poles["active"] > 0.75 and poles["outward"] > 0.65:
        return "high"
    if poles["active"] > poles["calm"]:
        return "medium"
    return "low"


def recover_poles(insight: dict[str, Any]) -> dict[str, float]:
    if "source_compass" in insight:
        return {key: float(value) for key, value in insight["source_compass"].items()}
    horizontal = insight["direction"]["horizontal"]["id"]
    vertical = insight["direction"]["vertical"]["id"]
    intensity = float(insight["direction"]["intensity"])
    tilt = 0.5 + min(0.45, 0.45 * intensity)
    opposite = 1 - tilt
    return {
        "inward": tilt if horizontal == "inward" else opposite,
        "outward": tilt if horizontal == "outward" else opposite,
        "calm": tilt if vertical == "calm" else opposite,
        "active": tilt if vertical == "active" else opposite,
    }


def keyword_match(insight: dict[str, Any], course: dict[str, Any]) -> float:
    strengths = [1.0, 0.5, 0.25]
    result = 0.0
    for index, candidate in enumerate(insight["keyword_candidates"][:3]):
        if candidate["id"] in course["keyword_tags"]:
            result = max(result, strengths[index])
    return result


def practice_fit(course: dict[str, Any], target: str) -> float:
    course_index = INTENSITY_INDEX[course["intensity"]]
    target_index = INTENSITY_INDEX[target]
    intensity_score = 1 - abs(course_index - target_index) / 2
    target_duration = {"low": 12, "medium": 22, "high": 45}[target]
    duration_score = max(0.0, 1 - abs(float(course["duration_min"]) - target_duration) / 60)
    return 0.6 * intensity_score + 0.4 * duration_score


def score_course(
    insight: dict[str, Any],
    course: dict[str, Any],
    recent_course_ids: set[str],
) -> dict[str, Any]:
    primary_id = insight["primary_chakra"]["id"]
    secondary_id = insight["secondary_chakra"]["id"]
    chakra_score = (
        0.7 * (1.0 if primary_id in course["chakra_tags"] else 0.0)
        + 0.3 * (1.0 if secondary_id in course["chakra_tags"] else 0.0)
    )
    poles = recover_poles(insight)
    compass_score = sum(poles[pole] for pole in course["energy_poles"]) / len(
        course["energy_poles"]
    )
    keyword_score = keyword_match(insight, course)
    target = target_intensity(insight)
    practice_score = practice_fit(course, target)
    recency_score = 0.0 if course["course_id"] in recent_course_ids else 1.0
    breakdown = {
        "chakra": chakra_score,
        "compass": compass_score,
        "keyword": keyword_score,
        "practice_fit": practice_score,
        "recency": recency_score,
    }
    weighted = {key: value * WEIGHTS[key] for key, value in breakdown.items()}
    base_score = sum(weighted.values())
    return {
        "course": course,
        "base_score": base_score,
        "score_breakdown": {key: round(value, 6) for key, value in breakdown.items()},
        "weighted_score_breakdown": {key: round(value, 6) for key, value in weighted.items()},
        "target_intensity": target,
    }


def diversity_penalty(candidate: dict[str, Any], selected: list[dict[str, Any]]) -> float:
    penalty = 0.0
    course = candidate["course"]
    for item in selected:
        selected_course = item["course"]
        if course["format"] == selected_course["format"]:
            penalty += 0.08
        if course["chakra_tags"][0] == selected_course["chakra_tags"][0]:
            penalty += 0.04
    return penalty


def fit_reason(insight: dict[str, Any], course: dict[str, Any]) -> tuple[str, list[str]]:
    keyword = insight["keyword"]
    primary = insight["primary_chakra"]
    horizontal = insight["direction"]["horizontal"]
    vertical = insight["direction"]["vertical"]
    if keyword["id"] in course["keyword_tags"]:
        return (
            f"今天的“{keyword['display']}”适合从这里开始：{course['fit_statement']}。",
            [f"keyword:{keyword['id']}"],
        )
    if primary["id"] in course["chakra_tags"]:
        return (
            f"{primary['zh']}是今天的主要线索，这节课会{course['fit_statement']}。",
            [f"primary_chakra:{primary['id']}"],
        )
    for direction in (horizontal, vertical):
        if direction["id"] in course["energy_poles"]:
            return (
                f"你此刻更靠近{direction['label']}，这节课会{course['fit_statement']}。",
                [f"compass:{direction['id']}"],
            )
    return (
        f"顺着今天的能量节奏，这节课会{course['fit_statement']}。",
        ["practice_fit"],
    )


def recommend(
    insight: dict[str, Any],
    catalog: dict[str, Any],
    recent_course_ids: set[str] | None = None,
    exclude_course_ids: set[str] | None = None,
) -> dict[str, Any]:
    validate_inputs(insight, catalog)
    recent = recent_course_ids or set()
    excluded = exclude_course_ids or set()
    eligible = [
        course
        for course in catalog["courses"]
        if course["status"] == "published" and course["course_id"] not in excluded
    ]
    if len(eligible) < 3:
        raise ValueError("at least three eligible published courses are required")

    candidates = [score_course(insight, course, recent) for course in eligible]
    selected: list[dict[str, Any]] = []
    remaining = candidates[:]
    while len(selected) < 3:
        evaluated = []
        for candidate in remaining:
            penalty = diversity_penalty(candidate, selected)
            evaluated.append((candidate["base_score"] - penalty, candidate, penalty))
        final_score, chosen, penalty = max(
            evaluated,
            key=lambda item: (item[0], item[1]["base_score"], item[1]["course"]["course_id"]),
        )
        reason, evidence = fit_reason(insight, chosen["course"])
        selected.append(
            {
                **chosen,
                "base_score": round(chosen["base_score"], 6),
                "diversity_penalty": round(penalty, 6),
                "final_score": round(final_score, 6),
                "fit_reason": reason,
                "fit_evidence": evidence,
            }
        )
        remaining.remove(chosen)

    return {
        "schema_version": SCHEMA_VERSION,
        "recommendation_version": RECOMMENDATION_VERSION,
        "catalog_version": catalog["catalog_version"],
        "is_demo_catalog": bool(catalog.get("is_demo", False)),
        "source_insight": {
            "schema_version": insight["schema_version"],
            "synthesis_version": insight["synthesis_version"],
            "keyword": insight["keyword"],
            "primary_chakra": insight["primary_chakra"],
            "secondary_chakra": insight["secondary_chakra"],
            "direction": insight["direction"],
        },
        "recommendations": selected,
        "candidate_count": len(eligible),
        "disclaimer": "课程来自 Demo 目录，推荐理由仅基于课程元数据与当日自我觉察结果，不代表疗效或购买建议。",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--insight-file", required=True)
    parser.add_argument("--catalog-file", required=True)
    parser.add_argument("--recent-course-id", action="append", default=[])
    parser.add_argument("--exclude-course-id", action="append", default=[])
    parser.add_argument("--pretty", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    try:
        result = recommend(
            load_json(args.insight_file),
            load_json(args.catalog_file),
            set(args.recent_course_id),
            set(args.exclude_course_id),
        )
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2 if args.pretty else None,
            separators=None if args.pretty else (",", ":"),
        )
    )


if __name__ == "__main__":
    main()
