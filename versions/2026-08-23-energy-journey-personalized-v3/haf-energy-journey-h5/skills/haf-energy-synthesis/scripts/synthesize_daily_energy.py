#!/usr/bin/env python3
"""Create an offline-safe HAF daily keyword and reflection from two Skill outputs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "haf.daily-energy-insight.v2"


def load_model() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "references" / "synthesis-model.json"
    return json.loads(path.read_text(encoding="utf-8"))


def load_json(path: str) -> dict[str, Any]:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read valid JSON from {path}") from error


def validate_inputs(numerology: dict[str, Any], chakra: dict[str, Any]) -> None:
    required_numerology = "haf.numerology-profile.v1"
    required_chakra = "haf.chakra-reflection.v1"
    if numerology.get("schema_version") != required_numerology:
        raise ValueError(f"numerology schema must be {required_numerology}")
    if chakra.get("schema_version") != required_chakra:
        raise ValueError(f"chakra schema must be {required_chakra}")

    life_path = numerology.get("life_path", {}).get("value")
    personal_day = numerology.get("personal_cycle", {}).get("personal_day")
    chakra_input = chakra.get("input", {})
    if chakra_input.get("life_path") != life_path:
        raise ValueError("life_path mismatch between numerology and chakra results")
    if chakra_input.get("personal_day") != personal_day:
        raise ValueError("personal_day mismatch between numerology and chakra results")

    poles = chakra.get("compass", {}).get("four_poles", {})
    if set(poles) != {"inward", "outward", "calm", "active"}:
        raise ValueError("chakra result must contain all four compass poles")
    if len(chakra.get("chakras", [])) != 7:
        raise ValueError("chakra result must contain seven ranked chakras")


def add_signal(
    scores: dict[str, float],
    trace: dict[str, list[dict[str, Any]]],
    keyword_id: str,
    source: str,
    contribution: float,
) -> None:
    scores[keyword_id] = scores.get(keyword_id, 0.0) + contribution
    trace.setdefault(keyword_id, []).append(
        {"source": source, "contribution": round(contribution, 6)}
    )


def add_compass_grid_signals(
    scores: dict[str, float],
    trace: dict[str, list[dict[str, Any]]],
    model: dict[str, Any],
    poles: dict[str, float],
) -> None:
    """Turn one continuous point into softly blended 3x3 moment semantics."""
    x = float(poles["outward"]) - float(poles["inward"])
    y = float(poles["active"]) - float(poles["calm"])
    horizontal = {
        "inward": max(0.0, -x),
        "center": max(0.0, 1.0 - abs(x)),
        "outward": max(0.0, x),
    }
    vertical = {
        "calm": max(0.0, -y),
        "center": max(0.0, 1.0 - abs(y)),
        "active": max(0.0, y),
    }
    power = float(model["compass_response_power"])
    cells = {
        f"{horizontal_id}_{vertical_id}": (horizontal_value * vertical_value) ** power
        for horizontal_id, horizontal_value in horizontal.items()
        for vertical_id, vertical_value in vertical.items()
        if horizontal_value > 0 and vertical_value > 0
    }
    cell_total = sum(cells.values()) or 1.0
    for cell, value in cells.items():
        add_signal(
            scores,
            trace,
            model["compass_grid_keyword"][cell],
            f"compass_grid:{cell}",
            model["weights"]["compass_total"] * value / cell_total,
        )


def synthesize(numerology: dict[str, Any], chakra: dict[str, Any]) -> dict[str, Any]:
    validate_inputs(numerology, chakra)
    model = load_model()
    weights = model["weights"]
    life_path = numerology["life_path"]["value"]
    personal_day = numerology["personal_cycle"]["personal_day"]
    primary = chakra["primary_chakra"]
    secondary = chakra["secondary_chakra"]
    poles = chakra["compass"]["four_poles"]

    scores: dict[str, float] = {}
    trace: dict[str, list[dict[str, Any]]] = {}
    add_signal(
        scores,
        trace,
        model["number_keyword"][str(personal_day)],
        f"personal_day:{personal_day}",
        weights["personal_day"],
    )
    add_signal(
        scores,
        trace,
        model["number_keyword"][str(life_path)],
        f"life_path:{life_path}",
        weights["life_path"],
    )
    add_signal(
        scores,
        trace,
        model["chakra_keyword"][primary["id"]],
        f"primary_chakra:{primary['id']}",
        weights["primary_chakra"],
    )
    add_signal(
        scores,
        trace,
        model["chakra_keyword"][secondary["id"]],
        f"secondary_chakra:{secondary['id']}",
        weights["secondary_chakra"],
    )

    add_compass_grid_signals(scores, trace, model, poles)

    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    chosen_id, chosen_score = ranked[0]
    chosen = model["keywords"][chosen_id]
    daily_theme_id = model["number_keyword"][str(personal_day)]
    daily_theme = model["keywords"][daily_theme_id]
    signals_align = daily_theme_id == chosen_id
    composite_title = (
        daily_theme["display"]
        if signals_align
        else f"{chosen['display']} · {daily_theme['display']}"
    )
    composite_line = (
        "今天的主旋律，也正是你此刻最需要靠近的方向。"
        if signals_align
        else f"以{chosen['display']}的方式，靠近今天的{daily_theme['display']}。"
    )

    horizontal = "inward" if poles["inward"] >= poles["outward"] else "outward"
    vertical = "calm" if poles["calm"] >= poles["active"] else "active"
    horizontal_label = model["compass_labels"][horizontal]
    vertical_label = model["compass_labels"][vertical]
    primary_themes = primary.get("themes", [])
    secondary_themes = secondary.get("themes", [])
    primary_theme_text = "与".join(primary_themes[:2]) or "当下感受"
    secondary_theme_text = secondary_themes[0] if secondary_themes else "另一种可能"

    energy_summary = (
        f"今天的主旋律是“{daily_theme['display']}”，此刻更适合从“{chosen['display']}”靠近。"
        f"{primary['zh']}与{secondary['zh']}提醒你，把注意放在{primary_theme_text}上。"
    )
    chakra_summary = (
        f"{primary['zh']}是今天较清晰的线索，邀请你留意{primary_theme_text}；"
        f"{secondary['zh']}在一旁提醒你，也为{secondary_theme_text}留一点空间。"
    )

    candidates = [
        {
            "id": keyword_id,
            "display": model["keywords"][keyword_id]["display"],
            "score": round(score, 6),
        }
        for keyword_id, score in ranked[:3]
    ]
    evidence_ids = list(dict.fromkeys(chakra.get("evidence_ids", []))) + [
        f"KEYWORD_{chosen_id.upper()}",
        f"SYNTHESIS_{model['synthesis_version'].upper().replace('.', '_')}",
    ]

    return {
        "schema_version": SCHEMA_VERSION,
        "synthesis_version": model["synthesis_version"],
        "upstream_versions": {
            "numerology_schema": numerology["schema_version"],
            "numerology_method": numerology["method_version"],
            "numerology_themes": numerology["theme_version"],
            "chakra_schema": chakra["schema_version"],
            "chakra_model": chakra["model_version"],
        },
        "keyword": {"id": chosen_id, "display": chosen["display"], "score": round(chosen_score, 6)},
        "daily_theme": {"id": daily_theme_id, "display": daily_theme["display"]},
        "moment_keyword": {"id": chosen_id, "display": chosen["display"]},
        "composite_title": composite_title,
        "composite_line": composite_line,
        "keyword_candidates": candidates,
        "keyword_trace": trace,
        "visible_meta": f"数字 {personal_day} · {primary['zh']} · {horizontal_label}",
        "direction": {
            "horizontal": {"id": horizontal, "label": horizontal_label},
            "vertical": {"id": vertical, "label": vertical_label},
            "intensity": chakra["compass"]["intensity"],
        },
        "source_compass": poles,
        "primary_chakra": primary,
        "secondary_chakra": secondary,
        "energy_summary": energy_summary,
        "chakra_summary": chakra_summary,
        "reflection_prompt": chosen["reflection_prompt"],
        "evidence_ids": evidence_ids,
        "llm_payload": {
            "locked_keyword": chosen["display"],
            "locked_daily_theme": daily_theme["display"],
            "locked_primary_chakra": primary["zh"],
            "locked_secondary_chakra": secondary["zh"],
            "facts": {
                "personal_day": personal_day,
                "life_path": life_path,
                "horizontal_direction": horizontal_label,
                "vertical_direction": vertical_label,
                "primary_themes": primary_themes,
                "secondary_themes": secondary_themes,
            },
            "source_copy": {
                "energy_summary": energy_summary,
                "chakra_summary": chakra_summary,
            },
            "constraints": [
                "不得改变锁定关键词和主次脉轮",
                "不得增加疾病、诊断、创伤、因果、命运或未来预测",
                "不得把相对信号描述为客观能量测量",
                "不得虚构用户没有提供的经历",
            ],
        },
        "disclaimer": "这是一份用于自我觉察的当日提示，不是对你的定义、诊断或未来预测。",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--numerology-file", required=True)
    parser.add_argument("--chakra-file", required=True)
    parser.add_argument("--pretty", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    try:
        result = synthesize(
            load_json(args.numerology_file),
            load_json(args.chakra_file),
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
