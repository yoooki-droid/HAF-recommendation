#!/usr/bin/env python3
"""Deterministic HAF numerology calculator.

This implements a documented symbolic practice. It does not make scientific,
medical, psychological, or predictive claims.
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

MASTER_NUMBERS = {11, 22, 33}
SCHEMA_VERSION = "haf.numerology-profile.v1"
METHOD_VERSION = "haf.pythagorean-date.v1"


def digit_sum(value: int) -> int:
    return sum(int(character) for character in str(abs(value)))


def reduce_number(value: int, preserve_masters: bool) -> tuple[int, list[int]]:
    if value < 0:
        raise ValueError("value must be non-negative")
    trace = [value]
    while value > 9 and not (preserve_masters and value in MASTER_NUMBERS):
        value = digit_sum(value)
        trace.append(value)
    return value, trace


def base_digit(value: int) -> int:
    reduced, _ = reduce_number(value, preserve_masters=False)
    return reduced


def load_themes() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "references" / "number-themes.json"
    return json.loads(path.read_text(encoding="utf-8"))


def parse_iso_date(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"{field} must be a valid YYYY-MM-DD date") from error


def calculate_profile(birth_date: str, target_date: str) -> dict[str, Any]:
    birth = parse_iso_date(birth_date, "birth_date")
    target = parse_iso_date(target_date, "target_date")
    themes = load_themes()

    month_value, month_trace = reduce_number(birth.month, preserve_masters=True)
    day_value, day_trace = reduce_number(birth.day, preserve_masters=True)
    year_value, year_trace = reduce_number(birth.year, preserve_masters=True)
    life_sum = month_value + day_value + year_value
    life_value, life_total_trace = reduce_number(life_sum, preserve_masters=True)

    personal_year_seed = birth.month + birth.day + digit_sum(target.year)
    personal_year, personal_year_trace = reduce_number(
        personal_year_seed, preserve_masters=False
    )
    personal_month_seed = personal_year + target.month
    personal_month, personal_month_trace = reduce_number(
        personal_month_seed, preserve_masters=False
    )
    personal_day_seed = personal_month + target.day
    personal_day, personal_day_trace = reduce_number(
        personal_day_seed, preserve_masters=False
    )

    life_theme = themes["numbers"][str(life_value)]
    day_theme = themes["numbers"][str(personal_day)]

    return {
        "schema_version": SCHEMA_VERSION,
        "method_version": METHOD_VERSION,
        "theme_version": themes["theme_version"],
        "birth_date": birth.isoformat(),
        "target_date": target.isoformat(),
        "life_path": {
            "value": life_value,
            "base_digit": base_digit(life_value),
            "is_master_number": life_value in MASTER_NUMBERS,
            "trace": {
                "month": month_trace,
                "day": day_trace,
                "year": year_trace,
                "component_values": [month_value, day_value, year_value],
                "component_sum": life_sum,
                "total_reduction": life_total_trace,
            },
        },
        "personal_cycle": {
            "personal_year": personal_year,
            "personal_month": personal_month,
            "personal_day": personal_day,
            "trace": {
                "personal_year": personal_year_trace,
                "personal_month": personal_month_trace,
                "personal_day": personal_day_trace,
                "target_year_digit_sum": digit_sum(target.year),
            },
        },
        "themes": {
            "life_path": life_theme,
            "personal_day": day_theme,
        },
        "disclaimer": "用于自我觉察的象征性数字框架，不是科学测量、诊断或未来预测。",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--birth-date", required=True, help="ISO date: YYYY-MM-DD")
    parser.add_argument("--target-date", required=True, help="ISO date: YYYY-MM-DD")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    try:
        result = calculate_profile(args.birth_date, args.target_date)
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
