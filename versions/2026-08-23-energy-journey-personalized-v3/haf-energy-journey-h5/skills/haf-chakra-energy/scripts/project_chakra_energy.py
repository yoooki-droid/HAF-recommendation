#!/usr/bin/env python3
"""Project HAF compass and numerology inputs into relative chakra signals."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "haf.chakra-reflection.v1"
VALID_LIFE_PATHS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33}
VALID_PERSONAL_DAYS = set(range(1, 10))


def load_model() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "references" / "chakra-model.json"
    return json.loads(path.read_text(encoding="utf-8"))


def validate_inputs(x: float, y: float, life_path: int, personal_day: int) -> None:
    if not -1 <= x <= 1 or not -1 <= y <= 1:
        raise ValueError("x and y must each be between -1 and 1")
    if life_path not in VALID_LIFE_PATHS:
        raise ValueError("life_path must be 1-9, 11, 22, or 33")
    if personal_day not in VALID_PERSONAL_DAYS:
        raise ValueError("personal_day must be 1-9")


def four_poles(x: float, y: float) -> dict[str, float]:
    return {
        "inward": round((1 - x) / 2, 4),
        "outward": round((1 + x) / 2, 4),
        "calm": round((1 - y) / 2, 4),
        "active": round((1 + y) / 2, 4),
    }


def evidence_for_compass(poles: dict[str, float]) -> list[str]:
    ranked = sorted(poles.items(), key=lambda item: (-item[1], item[0]))
    return [f"COMPASS_{name.upper()}" for name, _ in ranked[:2]]


def project(x: float, y: float, life_path: int, personal_day: int) -> dict[str, Any]:
    validate_inputs(x, y, life_path, personal_day)
    model = load_model()
    weights = model["weights"]
    sigma = model["sigma"]
    floor = model["score"]["floor"]
    span = model["score"]["span"]
    poles = four_poles(x, y)
    intensity = min(1.0, math.sqrt(x * x + y * y))

    projected: list[dict[str, Any]] = []
    for chakra_id, chakra in model["chakras"].items():
        anchor = chakra["anchor"]
        distance_squared = (x - anchor["x"]) ** 2 + (y - anchor["y"]) ** 2
        compass_affinity = math.exp(-distance_squared / (2 * sigma * sigma))
        life_affinity = model["number_affinity"][str(life_path)][chakra_id]
        day_affinity = model["number_affinity"][str(personal_day)][chakra_id]
        contributions = {
            "compass": weights["compass"] * compass_affinity,
            "life_path": weights["life_path"] * life_affinity,
            "personal_day": weights["personal_day"] * day_affinity,
        }
        raw_affinity = sum(contributions.values())
        score = round(min(100, max(0, floor + span * raw_affinity)))
        projected.append(
            {
                "id": chakra_id,
                "zh": chakra["zh"],
                "sanskrit": chakra["sanskrit"],
                "score": score,
                "raw_affinity": round(raw_affinity, 6),
                "themes": chakra["themes"],
                "contributions": {
                    key: round(value, 6) for key, value in contributions.items()
                },
            }
        )

    projected.sort(key=lambda item: (-item["score"], -item["raw_affinity"], item["id"]))
    for rank, chakra in enumerate(projected, start=1):
        chakra["rank"] = rank

    primary = projected[0]
    secondary = projected[1]
    evidence_ids = evidence_for_compass(poles) + [
        f"LIFE_PATH_{life_path}_{primary['id'].upper()}",
        f"PERSONAL_DAY_{personal_day}_{secondary['id'].upper()}",
        f"PRIMARY_{primary['id'].upper()}",
        f"SECONDARY_{secondary['id'].upper()}",
    ]

    return {
        "schema_version": SCHEMA_VERSION,
        "model_version": model["model_version"],
        "input": {
            "x": x,
            "y": y,
            "life_path": life_path,
            "personal_day": personal_day,
        },
        "compass": {
            "four_poles": poles,
            "intensity": round(intensity, 4),
        },
        "chakras": projected,
        "primary_chakra": {
            "id": primary["id"],
            "zh": primary["zh"],
            "score": primary["score"],
            "themes": primary["themes"],
        },
        "secondary_chakra": {
            "id": secondary["id"],
            "zh": secondary["zh"],
            "score": secondary["score"],
            "themes": secondary["themes"],
        },
        "evidence_ids": evidence_ids,
        "disclaimer": "HAF 自我觉察模型生成的相对信号，不是传统公式、生理测量、诊断或治疗建议。",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--x", type=float, required=True)
    parser.add_argument("--y", type=float, required=True)
    parser.add_argument("--life-path", type=int, required=True)
    parser.add_argument("--personal-day", type=int, required=True)
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    try:
        result = project(args.x, args.y, args.life_path, args.personal_day)
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
