#!/usr/bin/env python3
"""Validate HAF course recall against a versioned live or normalized catalog.

This is an offline QA tool. Content-recall coverage uses every course returned
by a successful catalog request. A separate event-time simulation verifies that
ended sessions are removed while a course remains eligible if it has another
ongoing or future session. It never changes the production H5 or frozen V3.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import importlib.util
import json
import math
import re
import ssl
import statistics
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Iterable


DEFAULT_EVENT_ID = "HAF 2026"
DEFAULT_API_BASE = "https://api.tsaopaochee.net/organizer/suggestionList"
DEFAULT_HEADERS = {"appId": "at_one_festival", "lang": "zh"}
VALIDATION_VERSION = "haf.course-recall-validation.v1"
TAGGING_VERSION = "haf.course-auto-tags.zh.v1"
SCORING_WEIGHTS = {
    "chakra": 0.35,
    "connection": 0.25,
    "numerology": 0.20,
    "practice_fit": 0.10,
    "freshness": 0.10,
}


CHAKRA_RULES: dict[str, tuple[str, ...]] = {
    "root": (
        "身体", "体式", "瑜伽", "养生", "功法", "太极", "八段锦", "武术",
        "行走", "跑步", "运动", "体能", "稳定", "安定", "落地", "根基",
        "睡眠", "自然", "草木", "按摩", "经络", "骨盆", "脊柱",
    ),
    "sacral": (
        "舞动", "舞蹈", "流动", "水", "五感", "感官", "色彩", "绘画",
        "艺术", "创造", "创作", "手作", "愉悦", "女性", "亲密", "感受",
        "芳香", "香气", "茶", "花艺",
    ),
    "solar_plexus": (
        "力量", "自信", "边界", "行动", "领导", "决策", "勇气", "目标",
        "核心", "意志", "潜能", "突破", "成长", "执行", "蜕变", "挑战",
    ),
    "heart": (
        "爱", "关系", "连接", "慈悲", "感恩", "接纳", "情绪", "亲子",
        "家庭", "共情", "陪伴", "关怀", "关照", "沟通", "疗愈", "和谐",
        "拥抱", "信任", "团体",
    ),
    "throat": (
        "声音", "吟唱", "歌唱", "唱诵", "颂钵", "铜锣", "音乐", "音疗",
        "表达", "沟通", "倾听", "朗读", "诗词", "诵读", "声波", "声乐",
        "语言", "演讲", "分享", "对话",
    ),
    "third_eye": (
        "冥想", "觉察", "潜意识", "梦", "洞察", "直觉", "正念", "内观",
        "催眠", "意象", "曼陀罗", "书写", "自我探索", "辨识", "专注",
        "心理", "认知", "看见", "观照",
    ),
    "crown": (
        "禅", "灵性", "意义", "宇宙", "道", "经典", "哲学", "意识",
        "放下", "静心", "智慧", "祈祷", "宗教", "文化", "非遗", "东方",
        "生命", "整体", "传统", "国学",
    ),
}


NUMEROLOGY_RULES: dict[int, tuple[str, ...]] = {
    1: ("开始", "自我", "独立", "行动", "创新", "勇气", "开创", "突破", "专注"),
    2: ("连接", "关系", "协作", "倾听", "接纳", "亲密", "对话", "信任", "陪伴"),
    3: ("表达", "声音", "艺术", "创作", "创造", "舞蹈", "音乐", "绘画", "分享"),
    4: ("稳定", "安定", "根基", "身体", "秩序", "传统", "文化", "功法", "落地"),
    5: ("流动", "探索", "变化", "自由", "五感", "体验", "旅行", "感官", "蜕变"),
    6: ("关怀", "关照", "家庭", "亲子", "爱", "和谐", "照顾", "疗愈", "责任"),
    7: ("冥想", "内观", "潜意识", "洞察", "灵性", "哲学", "静心", "觉察", "智慧"),
    8: ("力量", "领导", "边界", "决策", "自信", "丰盛", "目标", "实现", "潜能"),
    9: ("放下", "完成", "整合", "慈悲", "公益", "整体", "生命", "圆满", "传承"),
}


POLE_RULES: dict[str, tuple[str, ...]] = {
    "inward": (
        "冥想", "正念", "内观", "内在", "自我", "潜意识", "梦", "觉察",
        "书写", "静心", "独处", "观照", "洞察", "深度", "放松",
    ),
    "outward": (
        "关系", "亲子", "团体", "连接", "沟通", "社群", "合唱", "舞会",
        "对话", "分享", "协作", "家庭", "伙伴", "互动", "共创", "表达",
    ),
    "calm": (
        "呼吸", "静", "冥想", "茶", "香", "音乐", "颂钵", "放松", "睡眠",
        "书写", "正念", "内观", "禅", "慢", "沉浸", "倾听", "舒缓",
    ),
    "active": (
        "舞动", "舞蹈", "运动", "瑜伽", "功法", "太极", "行走", "动作",
        "表演", "唱", "手作", "创作", "练习", "体验", "互动", "游戏",
        "训练", "工作坊",
    ),
}


MODALITY_RULES: dict[str, tuple[str, ...]] = {
    "meditation": ("冥想", "静心", "正念", "内观", "观照", "禅"),
    "sound": ("声音", "音乐", "吟唱", "歌唱", "唱诵", "颂钵", "铜锣", "声波", "音疗"),
    "movement": ("舞动", "舞蹈", "运动", "瑜伽", "太极", "八段锦", "功法", "行走", "武术"),
    "breathwork": ("呼吸", "吐纳", "气息"),
    "creative": ("绘画", "艺术", "创作", "创造", "手作", "花艺", "色彩", "曼陀罗"),
    "dialogue": ("对话", "沟通", "分享", "沙龙", "关系", "家庭", "亲子"),
    "culture": ("文化", "非遗", "传统", "经典", "诗词", "国学", "茶", "香"),
    "lecture": ("讲座", "教学", "课程", "课堂", "知识", "方法", "理论"),
}


API_TAG_SEEDS: dict[str, dict[str, tuple[Any, ...]]] = {
    "五感苏醒": {
        "chakra": ("sacral",), "numerology": (5, 3), "poles": ("outward", "active")
    },
    "身心共振": {
        "chakra": ("heart", "root"), "numerology": (6, 2), "poles": ("inward", "calm")
    },
    "呼吸之间": {
        "chakra": ("root", "throat"), "numerology": (4, 7), "poles": ("inward", "calm")
    },
    "情绪密码": {
        "chakra": ("heart", "sacral"), "numerology": (2, 6), "poles": ("inward", "calm")
    },
    "文化复兴": {
        "chakra": ("crown", "root"), "numerology": (4, 9), "poles": ("inward", "calm")
    },
    "潜意识解密": {
        "chakra": ("third_eye", "crown"), "numerology": (7, 9), "poles": ("inward", "calm")
    },
    "亲子": {
        "chakra": ("heart", "sacral"), "numerology": (2, 6), "poles": ("outward", "calm")
    },
}


CHAKRA_ZH = {
    "root": "海底轮",
    "sacral": "生殖轮",
    "solar_plexus": "太阳神经丛",
    "heart": "心轮",
    "throat": "喉轮",
    "third_eye": "眉心轮",
    "crown": "顶轮",
}
POLE_ZH = {"inward": "向内", "outward": "向外", "calm": "安静", "active": "行动"}


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def strip_markup(value: Any) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[\u200b-\u200d\ufeff]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def normalized_title(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "", value).lower()


def parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError):
        return None


def parse_inventory(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return max(0, int(value))
    text = str(value or "").strip()
    if re.fullmatch(r"\d+", text):
        return int(text)
    return None


def api_url_for_event(event_id: str) -> str:
    return f"{DEFAULT_API_BASE}?{urllib.parse.urlencode({'eventId': event_id})}"


def catalog_label_from_data(catalog: dict[str, Any], fallback: str) -> str:
    labels = {
        str(event_id).strip()
        for course in catalog.get("courses", [])
        for event_id in course.get("source_event_ids", [])
        if str(event_id).strip()
    }
    return next(iter(labels)) if len(labels) == 1 else fallback


def catalog_year(label: str) -> str:
    match = re.search(r"\b(20\d{2})\b", label)
    if not match:
        raise ValueError(f"catalog label must contain a four-digit year: {label!r}")
    return match.group(1)


def fetch_catalog(url: str, timeout: float) -> dict[str, Any]:
    request = urllib.request.Request(url, headers=DEFAULT_HEADERS)
    context = ssl.create_default_context()
    try:
        import certifi  # type: ignore

        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            payload = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"catalog request failed: {error}") from error
    if payload.get("status") != 0 or not isinstance(payload.get("data", {}).get("suggestion"), list):
        raise RuntimeError("catalog response is not a successful complete list")
    return payload


def score_terms(text_parts: tuple[str, str, str], rules: dict[Any, tuple[str, ...]]) -> tuple[dict[Any, float], dict[Any, list[str]]]:
    title, api_tags, description = text_parts
    scores: dict[Any, float] = defaultdict(float)
    evidence: dict[Any, list[str]] = defaultdict(list)
    for label, terms in rules.items():
        for term in terms:
            hit = False
            if term in title:
                scores[label] += 3.0
                hit = True
            if term in api_tags:
                scores[label] += 2.0
                hit = True
            if term in description:
                scores[label] += 1.0
                hit = True
            if hit and term not in evidence[label]:
                evidence[label].append(term)
    return dict(scores), dict(evidence)


def add_seed_scores(
    scores: dict[Any, float], evidence: dict[Any, list[str]], api_tags: list[str], dimension: str
) -> None:
    for api_tag in api_tags:
        seed = API_TAG_SEEDS.get(api_tag, {}).get(dimension, ())
        for rank, label in enumerate(seed):
            scores[label] = scores.get(label, 0.0) + (2.0 if rank == 0 else 1.0)
            evidence.setdefault(label, []).append(f"栏目:{api_tag}")


def ranked_labels(scores: dict[Any, float], limit: int) -> list[Any]:
    return [label for label, _ in sorted(scores.items(), key=lambda item: (-item[1], str(item[0])))[:limit]]


def choose_poles(scores: dict[str, float]) -> list[str]:
    horizontal = max(("inward", "outward"), key=lambda key: (scores.get(key, 0.0), key == "inward"))
    vertical = max(("calm", "active"), key=lambda key: (scores.get(key, 0.0), key == "calm"))
    return [horizontal, vertical]


def classify_course(concept: dict[str, Any]) -> dict[str, Any]:
    title = concept["title"]
    description = concept["short_description"]
    api_tags = concept["api_tags"]
    parts = (title, " ".join(api_tags), description)

    chakra_scores, chakra_evidence = score_terms(parts, CHAKRA_RULES)
    number_scores, number_evidence = score_terms(parts, NUMEROLOGY_RULES)
    pole_scores, pole_evidence = score_terms(parts, POLE_RULES)
    modality_scores, modality_evidence = score_terms(parts, MODALITY_RULES)
    lexical_signal = {
        "chakra": max(chakra_scores.values(), default=0.0),
        "numerology": max(number_scores.values(), default=0.0),
        "poles": max(pole_scores.values(), default=0.0),
    }
    add_seed_scores(chakra_scores, chakra_evidence, api_tags, "chakra")
    add_seed_scores(number_scores, number_evidence, api_tags, "numerology")
    add_seed_scores(pole_scores, pole_evidence, api_tags, "poles")

    modality = ranked_labels(modality_scores, 1)
    if not modality:
        modality = ["guided_practice" if "工作坊" in description else "lecture"]

    if not chakra_scores:
        chakra_scores["heart"] = 0.5
        chakra_evidence["heart"] = ["低置信默认:通用觉察"]
    if not number_scores:
        number_scores[2] = 0.5
        number_evidence[2] = ["低置信默认:通用连接"]
    if not pole_scores:
        pole_scores.update({"inward": 0.5, "calm": 0.5})
        pole_evidence.update({"inward": ["低置信默认"], "calm": ["低置信默认"]})

    chakra_tags = ranked_labels(chakra_scores, 2)
    numerology_tags = ranked_labels(number_scores, 3)
    energy_poles = choose_poles(pole_scores)
    top_chakra_score = max(chakra_scores.values())
    top_number_score = max(number_scores.values())
    top_pole_score = max(pole_scores.values())
    auto_confidence = min(1.0, (top_chakra_score + top_number_score + top_pole_score) / 12)
    low_signal_dimensions = sum(
        score < 1.0 for score in (top_chakra_score, top_number_score, top_pole_score)
    )
    seed_only_dimensions = sum(score == 0.0 for score in lexical_signal.values())
    review_required = (
        low_signal_dimensions >= 2
        or seed_only_dimensions >= 2
        or auto_confidence < 0.25
    )

    duration = max(1, int(round(concept["duration_min"])))
    active_score = pole_scores.get("active", 0.0)
    calm_score = pole_scores.get("calm", 0.0)
    if active_score >= calm_score + 3 or duration >= 100:
        intensity = "high"
    elif active_score > calm_score or duration >= 60:
        intensity = "medium"
    else:
        intensity = "low"

    return {
        **concept,
        "status": "published",
        "availability_basis": "present_in_successful_validation_snapshot",
        "format": modality[0],
        "format_label": {
            "meditation": "冥想练习", "sound": "声音体验", "movement": "身体练习",
            "breathwork": "呼吸练习", "creative": "创作体验", "dialogue": "对话体验",
            "culture": "文化体验", "lecture": "主题课程", "guided_practice": "引导练习",
        }[modality[0]],
        "intensity": intensity,
        "chakra_tags": chakra_tags,
        "numerology_tags": numerology_tags,
        "energy_poles": energy_poles,
        "auto_tag_confidence": round(auto_confidence, 3),
        "review_required": review_required,
        "tag_evidence": {
            "chakras": {str(key): chakra_evidence.get(key, [])[:6] for key in chakra_tags},
            "numerology": {str(key): number_evidence.get(key, [])[:6] for key in numerology_tags},
            "poles": {str(key): pole_evidence.get(key, [])[:6] for key in energy_poles},
            "modality": modality_evidence.get(modality[0], [])[:6],
        },
        "tagging_version": TAGGING_VERSION,
    }


def normalize_catalog(payload: dict[str, Any], label: str) -> dict[str, Any]:
    year = catalog_year(label)
    records = payload["data"]["suggestion"]
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        title = strip_markup(record.get("title"))
        if not title:
            continue
        groups[normalized_title(title)].append(record)

    courses: list[dict[str, Any]] = []
    for key, sessions in sorted(groups.items()):
        representative = sessions[0]
        descriptions = [strip_markup(item.get("desc")) for item in sessions]
        description = max(descriptions, key=len, default="")
        durations = []
        normalized_sessions = []
        api_tags: set[str] = set()
        for item in sessions:
            begin = parse_datetime(item.get("beginDatetime"))
            end = parse_datetime(item.get("endDatetime"))
            duration = max(1.0, (end - begin).total_seconds() / 60) if begin and end and end > begin else 60.0
            durations.append(duration)
            for tag in item.get("tagInfo") or []:
                name = strip_markup(tag.get("tagName"))
                if name and name != "全部":
                    api_tags.add(name)
            ticket_info = item.get("ticketInfo") or {}
            inventory = parse_inventory(item.get("inventory"))
            sale_title = strip_markup(ticket_info.get("title"))
            sale_link = str(ticket_info.get("link") or "")
            if ticket_info.get("isShow") is False:
                sale_state = "hidden"
            elif inventory == 0:
                sale_state = "sold_out"
            elif sale_title == "购买课程" and not sale_link:
                sale_state = "paid_course_missing_link"
            elif sale_title == "购买课程":
                sale_state = "paid_course_link_available"
            else:
                sale_state = "event_ticket_required"
            normalized_sessions.append(
                {
                    "session_id": str(item.get("elementId") or ""),
                    "begin_at": str(item.get("beginDatetime") or ""),
                    "end_at": str(item.get("endDatetime") or ""),
                    "location": strip_markup((item.get("location") or {}).get("name")),
                    "source_event_id": str(item.get("eventId") or ""),
                    "sale_state": sale_state,
                    "sale_visible": bool(ticket_info.get("isShow")),
                    "sale_link": sale_link,
                    "inventory": inventory,
                    "inventory_raw": item.get("inventory"),
                    "goods_id": item.get("goodsId"),
                }
            )
        concept_id = f"haf-{year}-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]
        concept = {
            "course_id": concept_id,
            "title": strip_markup(representative.get("title")),
            "short_description": description,
            "cover_asset": str(representative.get("coverImage") or ""),
            "duration_min": round(statistics.median(durations)),
            "api_tags": sorted(api_tags),
            "session_count": len(normalized_sessions),
            "sessions": normalized_sessions,
            "source_event_ids": sorted({item["source_event_id"] for item in normalized_sessions}),
        }
        courses.append(classify_course(concept))

    content_hash = hashlib.sha256(
        json.dumps(courses, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:16]
    return {
        "catalog_version": f"haf-{year}-api-{content_hash}",
        "catalog_label": label,
        "validation_mode": True,
        "availability_rule": "present_in_successful_complete_api_response",
        "source_record_count": len(records),
        "course_concept_count": len(courses),
        "courses": courses,
    }


def eligible_sessions(course: dict[str, Any], as_of: datetime) -> list[dict[str, Any]]:
    result = []
    for session in course["sessions"]:
        end = parse_datetime(session.get("end_at"))
        if end is not None and end > as_of:
            result.append(session)
    return sorted(result, key=lambda item: item["begin_at"])


def event_checkpoints(catalog: dict[str, Any]) -> list[datetime]:
    event_days = sorted({
        parsed.date()
        for course in catalog.get("courses", [])
        for session in course.get("sessions", [])
        if (parsed := parse_datetime(session.get("begin_at"))) is not None
    })
    checkpoints: list[datetime] = []
    for event_day in event_days:
        checkpoints.extend((
            datetime.combine(event_day, datetime.min.time()).replace(hour=8),
            datetime.combine(event_day, datetime.min.time()).replace(hour=18),
        ))
    if event_days:
        checkpoints.append(
            datetime.combine(event_days[-1], datetime.min.time()).replace(
                hour=23, minute=59, second=59
            )
        )
    return checkpoints


def event_time_availability(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    output = []
    for as_of in event_checkpoints(catalog):
        available_courses = 0
        available_sessions = 0
        expired_sessions = 0
        for course in catalog["courses"]:
            sessions = eligible_sessions(course, as_of)
            if sessions:
                available_courses += 1
                available_sessions += len(sessions)
            expired_sessions += course["session_count"] - len(sessions)
        output.append(
            {
                "as_of": as_of.strftime("%Y-%m-%d %H:%M:%S"),
                "available_course_concepts": available_courses,
                "available_sessions": available_sessions,
                "expired_sessions_excluded": expired_sessions,
            }
        )
    return output


def sale_data_summary(catalog: dict[str, Any]) -> dict[str, Any]:
    states: Counter[str] = Counter()
    inventory_known = 0
    inventory_unknown = 0
    for course in catalog["courses"]:
        for session in course["sessions"]:
            states[session["sale_state"]] += 1
            if session["inventory"] is None:
                inventory_unknown += 1
            else:
                inventory_known += 1
    return {
        "sale_state_counts": dict(states),
        "inventory_known": inventory_known,
        "inventory_unknown": inventory_unknown,
        "detail_endpoint": "/organizer/suggestionInfo?elementId={elementId}",
        "detail_missing_status": 1103,
    }


def find_life_path_birth_dates(numerology: Any) -> dict[int, str]:
    found: dict[int, str] = {}
    cursor = date(1980, 1, 1)
    while cursor <= date(1999, 12, 31) and len(found) < 9:
        birth = cursor.isoformat()
        profile = numerology.calculate_profile(birth, "2026-08-24")
        base_digit = int(profile["life_path"]["base_digit"])
        if 1 <= base_digit <= 9:
            found.setdefault(base_digit, birth)
        cursor += timedelta(days=1)
    if len(found) != 9:
        raise RuntimeError("could not create Life Path fixtures 1-9")
    return found


def find_target_dates(numerology: Any, birth: str) -> dict[int, str]:
    found: dict[int, str] = {}
    cursor = date(2026, 8, 1)
    while cursor <= date(2026, 10, 31) and len(found) < 9:
        target = cursor.isoformat()
        profile = numerology.calculate_profile(birth, target)
        personal_day = int(profile["personal_cycle"]["personal_day"])
        found.setdefault(personal_day, target)
        cursor += timedelta(days=1)
    if len(found) != 9:
        raise RuntimeError(f"could not create Personal Day fixtures 1-9 for {birth}")
    return found


def build_scenarios(project_root: Path) -> list[dict[str, Any]]:
    skills_dir = project_root / "skills"
    numerology = load_module(
        "validation_numerology", skills_dir / "haf-numerology" / "scripts" / "calculate_numerology.py"
    )
    chakra = load_module(
        "validation_chakra", skills_dir / "haf-chakra-energy" / "scripts" / "project_chakra_energy.py"
    )
    synthesis = load_module(
        "validation_synthesis", skills_dir / "haf-energy-synthesis" / "scripts" / "synthesize_daily_energy.py"
    )
    coords = (-0.85, -0.42, 0.0, 0.42, 0.85)
    scenarios: list[dict[str, Any]] = []
    for life_path, birth in sorted(find_life_path_birth_dates(numerology).items()):
        for personal_day, target in sorted(find_target_dates(numerology, birth).items()):
            profile = numerology.calculate_profile(birth, target)
            for x in coords:
                for y in coords:
                    chakra_result = chakra.project(
                        x, y, profile["life_path"]["value"], profile["personal_cycle"]["personal_day"]
                    )
                    insight = synthesis.synthesize(profile, chakra_result)
                    insight["source_compass"] = chakra_result["compass"]["four_poles"]
                    scenarios.append(
                        {
                            "id": f"lp{life_path}-pd{personal_day}-x{x:+.2f}-y{y:+.2f}",
                            "life_path": life_path,
                            "personal_day": personal_day,
                            "x": x,
                            "y": y,
                            "insight": insight,
                        }
                    )
    return scenarios


def target_intensity(poles: dict[str, float]) -> str:
    if poles["active"] > 0.75 and poles["outward"] > 0.65:
        return "high"
    if poles["active"] > poles["calm"]:
        return "medium"
    return "low"


def practice_fit(course: dict[str, Any], target: str) -> float:
    indices = {"low": 0, "medium": 1, "high": 2}
    intensity_score = 1 - abs(indices[course["intensity"]] - indices[target]) / 2
    target_duration = {"low": 30, "medium": 60, "high": 90}[target]
    duration_score = max(0.0, 1 - abs(course["duration_min"] - target_duration) / 120)
    return 0.6 * intensity_score + 0.4 * duration_score


def score_course(scenario: dict[str, Any], course: dict[str, Any]) -> dict[str, Any]:
    insight = scenario["insight"]
    primary = insight["primary_chakra"]["id"]
    secondary = insight["secondary_chakra"]["id"]
    chakra_score = 0.7 * (primary in course["chakra_tags"]) + 0.3 * (secondary in course["chakra_tags"])
    poles = insight["source_compass"]
    connection_score = sum(float(poles[pole]) for pole in course["energy_poles"]) / len(course["energy_poles"])
    numerology_score = (
        0.75 * (scenario["personal_day"] in course["numerology_tags"])
        + 0.25 * (scenario["life_path"] in course["numerology_tags"])
    )
    practice_score = practice_fit(course, target_intensity(poles))
    breakdown = {
        "chakra": float(chakra_score),
        "connection": connection_score,
        "numerology": float(numerology_score),
        "practice_fit": practice_score,
        "freshness": 1.0,
    }
    weighted = {key: breakdown[key] * SCORING_WEIGHTS[key] for key in SCORING_WEIGHTS}
    return {
        "course": course,
        "score": sum(weighted.values()),
        "breakdown": breakdown,
    }


def diversity_penalty(candidate: dict[str, Any], selected: list[dict[str, Any]]) -> float:
    penalty = 0.0
    course = candidate["course"]
    for previous in selected:
        other = previous["course"]
        if course["format"] == other["format"]:
            penalty += 0.08
        if course["chakra_tags"][0] == other["chakra_tags"][0]:
            penalty += 0.04
    return penalty


def select_accuracy(candidates: list[dict[str, Any]], count: int = 3) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    remaining = candidates[:]
    while len(selected) < count:
        chosen = max(
            remaining,
            key=lambda item: (
                item["score"] - diversity_penalty(item, selected),
                item["score"],
                item["course"]["course_id"],
            ),
        )
        selected.append(chosen)
        remaining.remove(chosen)
    return selected


def select_balanced(
    candidates: list[dict[str, Any]], exposure: Counter[str], scenario_id: str
) -> list[dict[str, Any]]:
    accuracy = select_accuracy(candidates, 2)
    selected_ids = {item["course"]["course_id"] for item in accuracy}
    best_score = max(item["score"] for item in candidates)
    qualified = [
        item
        for item in candidates
        if item["course"]["course_id"] not in selected_ids
        and item["score"] >= max(0.36, best_score - 0.24)
    ]
    if not qualified:
        return select_accuracy(candidates, 3)

    def exploration_key(item: dict[str, Any]) -> tuple[Any, ...]:
        course_id = item["course"]["course_id"]
        stable_tie = hashlib.sha1(f"{scenario_id}:{course_id}".encode("utf-8")).hexdigest()
        return (
            exposure[course_id],
            -round(item["score"], 6),
            diversity_penalty(item, accuracy),
            stable_tie,
        )

    third = min(qualified, key=exploration_key)
    return accuracy + [third]


def gini(values: Iterable[int]) -> float:
    data = sorted(float(value) for value in values)
    if not data or sum(data) == 0:
        return 0.0
    total = 0.0
    for i, value in enumerate(data, 1):
        total += (2 * i - len(data) - 1) * value
    return total / (len(data) * sum(data))


def strategy_metrics(
    name: str,
    selections: list[list[dict[str, Any]]],
    courses: list[dict[str, Any]],
    candidate_reach: Counter[str],
) -> dict[str, Any]:
    exposure = Counter(
        item["course"]["course_id"] for selection in selections for item in selection
    )
    all_ids = [course["course_id"] for course in courses]
    counts = [exposure[course_id] for course_id in all_ids]
    total = sum(counts)
    top10_share = sum(sorted(counts, reverse=True)[:10]) / total if total else 0.0
    scores = [item["score"] for selection in selections for item in selection]
    modality_diversity = [len({item["course"]["format"] for item in selection}) for selection in selections]
    return {
        "strategy": name,
        "course_count": len(all_ids),
        "reached_in_top3": sum(1 for value in counts if value > 0),
        "top3_coverage_rate": round(sum(1 for value in counts if value > 0) / len(all_ids), 4),
        "reachable_in_top15": sum(1 for course_id in all_ids if candidate_reach[course_id] > 0),
        "top15_reachability_rate": round(
            sum(1 for course_id in all_ids if candidate_reach[course_id] > 0) / len(all_ids), 4
        ),
        "mean_selected_score": round(statistics.fmean(scores), 4),
        "p10_selected_score": round(sorted(scores)[max(0, math.floor(len(scores) * 0.10) - 1)], 4),
        "mean_unique_modalities_per_result": round(statistics.fmean(modality_diversity), 3),
        "exposure_gini": round(gini(counts), 4),
        "top10_exposure_share": round(top10_share, 4),
        "never_selected_ids": [course_id for course_id in all_ids if exposure[course_id] == 0],
        "top_exposed": exposure.most_common(15),
    }


def validate_recall(
    catalog: dict[str, Any], project_root: Path, label: str
) -> dict[str, Any]:
    courses = catalog["courses"]
    scenarios = build_scenarios(project_root)
    accuracy_selections: list[list[dict[str, Any]]] = []
    balanced_selections: list[list[dict[str, Any]]] = []
    candidate_reach: Counter[str] = Counter()
    balanced_exposure: Counter[str] = Counter()
    dimension_counts = {
        "chakras": Counter(), "numerology": Counter(), "poles": Counter(), "formats": Counter()
    }
    for course in courses:
        dimension_counts["chakras"].update(course["chakra_tags"])
        dimension_counts["numerology"].update(course["numerology_tags"])
        dimension_counts["poles"].update(course["energy_poles"])
        dimension_counts["formats"].update([course["format"]])

    for scenario in scenarios:
        candidates = [score_course(scenario, course) for course in courses]
        candidates.sort(key=lambda item: (-item["score"], item["course"]["course_id"]))
        candidate_reach.update(item["course"]["course_id"] for item in candidates[:15])
        accuracy = select_accuracy(candidates)
        balanced = select_balanced(candidates, balanced_exposure, scenario["id"])
        accuracy_selections.append(accuracy)
        balanced_selections.append(balanced)
        balanced_exposure.update(item["course"]["course_id"] for item in balanced)

    return {
        "validation_version": VALIDATION_VERSION,
        "catalog_label": label,
        "catalog_version": catalog["catalog_version"],
        "availability_assumption": (
            "Catalog presence controls delisting. During an active event, only sessions whose end "
            "time is later than the request time are eligible. Content coverage uses the full "
            "selected historical catalog so relevance can still be measured."
        ),
        "event_time_availability": event_time_availability(catalog),
        "sale_data_summary": sale_data_summary(catalog),
        "scenario_count": len(scenarios),
        "scenario_grid": {
            "life_path": "1-9",
            "personal_day": "1-9",
            "compass": "5 x 5 continuous coordinate grid",
        },
        "tag_distribution": {key: dict(value) for key, value in dimension_counts.items()},
        "review_required_count": sum(course["review_required"] for course in courses),
        "accuracy_only": strategy_metrics(
            "accuracy_only", accuracy_selections, courses, candidate_reach
        ),
        "balanced_three_slots": strategy_metrics(
            "two_accuracy_plus_one_qualified_exploration",
            balanced_selections,
            courses,
            candidate_reach,
        ),
    }


def write_tag_csv(path: Path, courses: list[dict[str, Any]]) -> None:
    fields = [
        "course_id", "title", "session_count", "duration_min", "format", "intensity",
        "api_tags", "numerology_tags", "chakra_tags", "energy_poles", "auto_tag_confidence",
        "review_required", "source_event_ids",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for course in courses:
            writer.writerow(
                {
                    key: " | ".join(map(str, course[key])) if isinstance(course[key], list) else course[key]
                    for key in fields
                }
            )


def write_review_csv(path: Path, courses: list[dict[str, Any]]) -> None:
    fields = [
        "course_id", "title", "api_tags", "auto_tag_confidence", "numerology_tags",
        "chakra_tags", "energy_poles", "reason",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for course in courses:
            if not course["review_required"]:
                continue
            writer.writerow(
                {
                    "course_id": course["course_id"],
                    "title": course["title"],
                    "api_tags": " | ".join(course["api_tags"]),
                    "auto_tag_confidence": course["auto_tag_confidence"],
                    "numerology_tags": " | ".join(map(str, course["numerology_tags"])),
                    "chakra_tags": " | ".join(course["chakra_tags"]),
                    "energy_poles": " | ".join(course["energy_poles"]),
                    "reason": "自动文本证据不足，需要人工确认",
                }
            )


def report_markdown(
    catalog: dict[str, Any], result: dict[str, Any], label: str, source_description: str
) -> str:
    accuracy = result["accuracy_only"]
    balanced = result["balanced_three_slots"]
    courses_by_id = {course["course_id"]: course for course in catalog["courses"]}
    top_rows = []
    for course_id, count in balanced["top_exposed"][:10]:
        top_rows.append(f"| {courses_by_id[course_id]['title']} | {count} |")
    availability_rows = []
    for item in result["event_time_availability"]:
        availability_rows.append(
            f"| {item['as_of']} | {item['available_course_concepts']} | "
            f"{item['available_sessions']} | {item['expired_sessions_excluded']} |"
        )
    sale_summary = result["sale_data_summary"]
    year = catalog_year(label)
    return f"""# {label} 课程召回验证报告

生成方式：{source_description}，按课程名称合并重复场次，再用项目现有灵数、七脉轮与连续罗盘模型遍历测试。

## 本轮口径

- 年份不决定上下架；课程日期决定具体场次此刻是否还能推荐。
- 内容覆盖率使用完整 {year} 历史课程，避免今天运行时因全部过期而无法验证匹配逻辑。
- 只有接口成功返回完整列表、且课程从列表中消失时，才视为下架。
- 接口失败时沿用上一份成功目录，不能把全部课程误判为下架。
- 活动进行中，已经结束的场次退出；同一课程若还有未结束场次，课程仍可推荐最近场次。
- 本报告只验证目录可用性、标签与召回；是否接入活跃 H5 由版本说明单独记录。

## 数据概况

- API 场次记录：{catalog['source_record_count']}
- 合并后的课程：{catalog['course_concept_count']}
- 重复场次：{catalog['source_record_count'] - catalog['course_concept_count']}
- 测试能量组合：{result['scenario_count']}
- 自动标签需要人工复核：{result['review_required_count']}

## 售卖与库存字段检查

- 可按课程 ID 查询详情：`/organizer/suggestionInfo?elementId={{elementId}}`
- 不存在的课程返回业务状态码 `1103`，可作为明确下架信号。
- 有课程购买链接的场次：{sale_summary['sale_state_counts'].get('paid_course_link_available', 0)}
- 标记为购买课程但缺少链接的场次：{sale_summary['sale_state_counts'].get('paid_course_missing_link', 0)}
- 需凭活动门票参加的场次：{sale_summary['sale_state_counts'].get('event_ticket_required', 0)}
- 有明确库存数的场次：{sale_summary['inventory_known']}
- 库存字段为空、状态未知的场次：{sale_summary['inventory_unknown']}

空库存字段不是库存为 0。本轮不会误判售罄；正式接口需要提供明确的库存数或 `soldOut` 状态，才能严格执行“无库存不推荐”。

当前 MVP 中，以上售卖与库存字段仅作观察，不参与过滤。实际硬条件只有“仍在最新成功列表中”和“至少有一个未结束场次”。

## 活动时段场次过滤模拟

| 模拟时刻 | 仍可推荐的课程 | 仍可推荐的场次 | 已排除的过期场次 |
| --- | ---: | ---: | ---: |
{chr(10).join(availability_rows)}

## 两种召回策略对比

| 指标 | 只按准确度前三 | 2 个准确位 + 1 个合格探索位 |
| --- | ---: | ---: |
| 进入前三的课程数 | {accuracy['reached_in_top3']} | {balanced['reached_in_top3']} |
| 前三覆盖率 | {accuracy['top3_coverage_rate']:.1%} | {balanced['top3_coverage_rate']:.1%} |
| 至少进入过前 15 的课程数 | {accuracy['reachable_in_top15']} | {balanced['reachable_in_top15']} |
| 前 15 可召回率 | {accuracy['top15_reachability_rate']:.1%} | {balanced['top15_reachability_rate']:.1%} |
| 平均推荐匹配分 | {accuracy['mean_selected_score']:.3f} | {balanced['mean_selected_score']:.3f} |
| 低位 10% 匹配分 | {accuracy['p10_selected_score']:.3f} | {balanced['p10_selected_score']:.3f} |
| 每组三张平均练习形式数 | {accuracy['mean_unique_modalities_per_result']:.2f} | {balanced['mean_unique_modalities_per_result']:.2f} |
| 曝光集中度 Gini（越低越均衡） | {accuracy['exposure_gini']:.3f} | {balanced['exposure_gini']:.3f} |
| 曝光最高 10 门课占比 | {accuracy['top10_exposure_share']:.1%} | {balanced['top10_exposure_share']:.1%} |

## 建议采用的正式三卡结构

1. 第一张：当下匹配最高，保证用户直观觉得“说得准”。
2. 第二张：仍以相关性为先，但避开与第一张相同的主要脉轮和练习形式。
3. 第三张：只在匹配分达标的候选里照顾低曝光课程，不能用随机课程换覆盖率。

这能把“准确性”和“课程都获得机会”拆开处理。覆盖公平只影响第三张，不污染第一张的准确度。

## 当前平衡策略曝光最高的课程

| 课程 | 测试曝光次数 |
| --- | ---: |
{chr(10).join(top_rows)}

## 仍需人工完成

- 打开 `course-tag-map.csv` 抽查自动标签；优先处理 `courses-needing-review.csv`。
- 由课程编辑确认每门课程最多 3 个灵数、2 个脉轮、1 组罗盘倾向。
- 正式上线前，用目标活动的最新完整课程目录重新跑同一报告；通过后再接入 H5 实时推荐。
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", help="Override the course-list endpoint")
    parser.add_argument("--event-id", default=DEFAULT_EVENT_ID)
    parser.add_argument(
        "--catalog-file",
        type=Path,
        help="Reuse an existing normalized catalog instead of fetching the API",
    )
    parser.add_argument(
        "--catalog-label",
        help="Label containing the catalog year, for example 'HAF 2025'",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument(
        "--output-dir",
        help="Output directory relative to the active H5 project; defaults by catalog year",
    )
    args = parser.parse_args()
    project_root = Path(__file__).resolve().parents[1]

    if args.catalog_file:
        catalog_file = args.catalog_file.expanduser().resolve()
        catalog = json.loads(catalog_file.read_text(encoding="utf-8"))
        label = args.catalog_label or catalog_label_from_data(catalog, args.event_id)
        source_description = f"从已有标准化目录 `{catalog_file.name}` 离线复算"
        default_output_dir = catalog_file.parent
    else:
        label = args.catalog_label or args.event_id
        payload = fetch_catalog(args.api_url or api_url_for_event(args.event_id), args.timeout)
        catalog = normalize_catalog(payload, label)
        source_description = "从课程接口实时取得完整列表"
        default_output_dir = project_root / f"qa/course-recall-{catalog_year(label)}"

    output_dir = (
        (project_root / args.output_dir).resolve()
        if args.output_dir
        else default_output_dir.resolve()
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    result = validate_recall(catalog, project_root, label)

    if not args.catalog_file:
        (output_dir / "catalog-normalized.json").write_text(
            json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    (output_dir / "recall-report.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_tag_csv(output_dir / "course-tag-map.csv", catalog["courses"])
    write_review_csv(output_dir / "courses-needing-review.csv", catalog["courses"])
    (output_dir / "RECALL_VALIDATION_REPORT.md").write_text(
        report_markdown(catalog, result, label, source_description), encoding="utf-8"
    )
    print(output_dir)
    print(json.dumps({
        "catalog": catalog["catalog_version"],
        "sessions": catalog["source_record_count"],
        "courses": catalog["course_concept_count"],
        "scenarios": result["scenario_count"],
        "review_required": result["review_required_count"],
        "accuracy_top3_coverage": result["accuracy_only"]["top3_coverage_rate"],
        "balanced_top3_coverage": result["balanced_three_slots"]["top3_coverage_rate"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
