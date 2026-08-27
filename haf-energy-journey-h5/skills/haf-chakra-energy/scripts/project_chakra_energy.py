#!/usr/bin/env python3
"""Project a user-selected HAF word into seven relative chakra signals."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "haf.chakra-reflection.v2"
VALID_LIFE_PATHS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33}
VALID_PERSONAL_DAYS = set(range(1, 10))


def load_model() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "references" / "chakra-word-model.json"
    return json.loads(path.read_text(encoding="utf-8"))


def validate_inputs(x: float, y: float, life_path: int, personal_day: int) -> None:
    if not -1 <= x <= 1 or not -1 <= y <= 1:
        raise ValueError("x and y must each be between -1 and 1")
    if life_path not in VALID_LIFE_PATHS:
        raise ValueError("life_path must be 1-9, 11, 22, or 33")
    if personal_day not in VALID_PERSONAL_DAYS:
        raise ValueError("personal_day must be 1-9")


def stable_index(seed: str, length: int) -> int:
    hash_value = 2166136261
    for character in seed:
        hash_value ^= ord(character)
        hash_value = (hash_value * 16777619) & 0xFFFFFFFF
    return hash_value % max(1, length)


def word_for_point(x: float, y: float, field_seed: str, model: dict[str, Any] | None = None) -> dict[str, Any]:
    source = model or load_model()
    field = source["field"]
    column = min(field["columns"] - 1, max(0, int(((x + 1) / 2) * field["columns"])))
    row = min(field["rows"] - 1, max(0, int(((y + 1) / 2) * field["rows"])))
    column_offset = stable_index(f"{field_seed}:column", field["columns"])
    row_offset = stable_index(f"{field_seed}:row", field["rows"])
    mirrored_column = field["columns"] - 1 - column if stable_index(f"{field_seed}:mirror-x", 2) == 1 else column
    mirrored_row = field["rows"] - 1 - row if stable_index(f"{field_seed}:mirror-y", 2) == 1 else row
    mapped_column = (mirrored_column + column_offset) % field["columns"]
    mapped_row = (mirrored_row + row_offset) % field["rows"]
    chakra_index = (mapped_column * field["chakra_stride"] + mapped_row * field["row_stride"]) % len(source["chakra_order"])
    chakra_id = source["chakra_order"][chakra_index]
    word = source["chakras"][chakra_id]["words"][mapped_row]
    return {
        "cell": {"column": column, "row": row},
        "mapped_cell": {"column": mapped_column, "row": mapped_row},
        "chakra_id": chakra_id,
        "word": word,
    }


def project(x: float, y: float, life_path: int, personal_day: int, field_seed: str = "haf-default-field") -> dict[str, Any]:
    validate_inputs(x, y, life_path, personal_day)
    model = load_model()
    selected = word_for_point(x, y, field_seed, model)
    weights = model["weights"]
    floor = model["score"]["floor"]
    span = model["score"]["span"]
    life_affinity = model["number_affinity"][str(life_path)]
    day_affinity = model["number_affinity"][str(personal_day)]

    projected: list[dict[str, Any]] = []
    for chakra_id in model["chakra_order"]:
        chakra = model["chakras"][chakra_id]
        contributions = {
            "selected_word": weights["selected_word"] * (1.0 if chakra_id == selected["chakra_id"] else 0.0),
            "life_path": weights["life_path"] * life_affinity[chakra_id],
            "personal_day": weights["personal_day"] * day_affinity[chakra_id],
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
                "contributions": {key: round(value, 6) for key, value in contributions.items()},
            }
        )

    projected.sort(key=lambda item: (-item["score"], -item["raw_affinity"], item["id"]))
    for rank, chakra in enumerate(projected, start=1):
        chakra["rank"] = rank

    primary = projected[0]
    secondary = projected[1]
    if primary["id"] != selected["chakra_id"]:
        raise ValueError("selected word must determine the primary chakra")

    return {
        "schema_version": SCHEMA_VERSION,
        "model_version": model["model_version"],
        "field_version": model["field_version"],
        "input": {"x": x, "y": y, "life_path": life_path, "personal_day": personal_day, "field_seed": field_seed},
        "interaction": {
            "cell": selected["cell"],
            "mapped_cell": selected["mapped_cell"],
            "selected_word": {**selected["word"], "chakra_id": selected["chakra_id"]},
            "selection_policy": "release_locks_word_then_word_selects_chakra",
        },
        "chakras": projected,
        "primary_chakra": {"id": primary["id"], "zh": primary["zh"], "score": primary["score"], "themes": primary["themes"]},
        "secondary_chakra": {"id": secondary["id"], "zh": secondary["zh"], "score": secondary["score"], "themes": secondary["themes"]},
        "evidence_ids": [
            f"WORD_{selected['word']['id'].upper()}",
            f"PRIMARY_{primary['id'].upper()}",
            f"SECONDARY_{secondary['id'].upper()}",
            f"LIFE_PATH_{life_path}",
            f"PERSONAL_DAY_{personal_day}",
        ],
        "disclaimer": "HAF 自我觉察模型根据用户亲手选中的词生成相对信号，不是传统公式、生理测量、诊断或治疗建议。",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--x", type=float, required=True)
    parser.add_argument("--y", type=float, required=True)
    parser.add_argument("--life-path", type=int, required=True)
    parser.add_argument("--personal-day", type=int, required=True)
    parser.add_argument("--field-seed", default="haf-default-field", help="Opaque seed that fixes one sensing-field layout")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    try:
        result = project(args.x, args.y, args.life_path, args.personal_day, args.field_seed)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None, separators=None if args.pretty else (",", ":")))


if __name__ == "__main__":
    main()
