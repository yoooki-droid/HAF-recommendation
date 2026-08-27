#!/usr/bin/env python3
"""Create an offline-safe HAF insight from numerology and a selected chakra word."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "haf.daily-energy-insight.v3"


def load_model() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "references" / "synthesis-model.json"
    return json.loads(path.read_text(encoding="utf-8"))


def load_json(path: str) -> dict[str, Any]:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read valid JSON from {path}") from error


def validate_inputs(numerology: dict[str, Any], chakra: dict[str, Any]) -> None:
    if numerology.get("schema_version") != "haf.numerology-profile.v1":
        raise ValueError("numerology schema must be haf.numerology-profile.v1")
    if chakra.get("schema_version") != "haf.chakra-reflection.v2":
        raise ValueError("chakra schema must be haf.chakra-reflection.v2")
    life_path = numerology.get("life_path", {}).get("value")
    personal_day = numerology.get("personal_cycle", {}).get("personal_day")
    chakra_input = chakra.get("input", {})
    if chakra_input.get("life_path") != life_path:
        raise ValueError("life_path mismatch between numerology and chakra results")
    if chakra_input.get("personal_day") != personal_day:
        raise ValueError("personal_day mismatch between numerology and chakra results")
    selected_word = chakra.get("interaction", {}).get("selected_word", {})
    if not {"id", "display", "keyword_id", "chakra_id"}.issubset(selected_word):
        raise ValueError("chakra result must contain one selected word")
    if chakra.get("primary_chakra", {}).get("id") != selected_word.get("chakra_id"):
        raise ValueError("selected word chakra must equal primary chakra")
    if len(chakra.get("chakras", [])) != 7:
        raise ValueError("chakra result must contain seven ranked chakras")


def synthesize(numerology: dict[str, Any], chakra: dict[str, Any]) -> dict[str, Any]:
    validate_inputs(numerology, chakra)
    model = load_model()
    life_path = numerology["life_path"]["value"]
    personal_day = numerology["personal_cycle"]["personal_day"]
    primary = chakra["primary_chakra"]
    secondary = chakra["secondary_chakra"]
    selected = chakra["interaction"]["selected_word"]
    daily_theme_id = model["number_keyword"][str(personal_day)]
    daily_theme = model["keywords"][daily_theme_id]
    chosen_id = selected["keyword_id"]
    canonical = model["keywords"][chosen_id]

    ranked_sources = [
        (chosen_id, 1.0, f"selected_word:{selected['id']}"),
        (model["chakra_keyword"][primary["id"]], 0.70, f"primary_chakra:{primary['id']}"),
        (model["chakra_keyword"][secondary["id"]], 0.35, f"secondary_chakra:{secondary['id']}"),
        (model["number_keyword"][str(life_path)], 0.20, f"life_path:{life_path}"),
    ]
    candidates: list[dict[str, Any]] = []
    trace: dict[str, list[dict[str, Any]]] = {}
    for keyword_id, score, source in ranked_sources:
        trace.setdefault(keyword_id, []).append({"source": source, "contribution": score})
        if any(item["id"] == keyword_id for item in candidates):
            continue
        candidates.append({"id": keyword_id, "display": model["keywords"][keyword_id]["display"], "score": score})
    candidates = candidates[:3]

    primary_themes = primary.get("themes", [])
    secondary_themes = secondary.get("themes", [])
    primary_theme_text = "与".join(primary_themes[:2]) or "当下感受"
    secondary_theme_text = secondary_themes[0] if secondary_themes else "另一种可能"
    energy_summary = (
        f"今天的主旋律是“{daily_theme['display']}”，你亲手停在“{selected['display']}”；"
        f"这个选择让{primary['zh']}成为此刻最清晰的线索。"
    )
    chakra_summary = (
        f"“{selected['display']}”对应{primary['zh']}的{primary_theme_text}；"
        f"{secondary['zh']}作为数字线索，也提醒你为{secondary_theme_text}留一点空间。"
    )

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
            "word_field": chakra["field_version"],
        },
        "keyword": {"id": chosen_id, "display": selected["display"], "canonical_display": canonical["display"], "score": 1.0},
        "daily_theme": {"id": daily_theme_id, "display": daily_theme["display"]},
        "moment_keyword": {"id": chosen_id, "display": selected["display"], "word_id": selected["id"]},
        "selection_policy": "user_selected_chakra_word",
        "composite_title": f"{selected['display']} · {daily_theme['display']}",
        "composite_line": f"从你选中的“{selected['display']}”出发，靠近今天的“{daily_theme['display']}”。",
        "keyword_candidates": candidates,
        "keyword_trace": trace,
        "visible_meta": f"数字 {personal_day} · {primary['zh']} · {selected['display']}",
        "resonance": chakra["interaction"],
        "primary_chakra": primary,
        "secondary_chakra": secondary,
        "energy_summary": energy_summary,
        "chakra_summary": chakra_summary,
        "reflection_prompt": canonical["reflection_prompt"],
        "evidence_ids": evidence_ids,
        "llm_payload": {
            "locked_selected_word": selected["display"],
            "locked_daily_theme": daily_theme["display"],
            "locked_primary_chakra": primary["zh"],
            "locked_secondary_chakra": secondary["zh"],
            "facts": {
                "selected_word_id": selected["id"],
                "selected_word": selected["display"],
                "personal_day": personal_day,
                "life_path": life_path,
                "primary_themes": primary_themes,
                "secondary_themes": secondary_themes,
            },
            "source_copy": {"energy_summary": energy_summary, "chakra_summary": chakra_summary},
            "constraints": [
                "不得改变用户锁定词和主次脉轮",
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
        result = synthesize(load_json(args.numerology_file), load_json(args.chakra_file))
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None, separators=None if args.pretty else (",", ":")))


if __name__ == "__main__":
    main()
