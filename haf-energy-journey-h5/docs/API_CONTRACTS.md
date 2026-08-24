# HAF 探索本心：接口契约

版本：v3.0 Demo  
日期：2026-08-23

## 1. 通用规则

- 所有生产接口必须使用 HTTPS。
- H5 不得持有 DeepSeek Key。
- AI 接口不接收生日、性别、城市或出生时间。
- 所有写接口需要身份认证、请求幂等键和服务端时间。
- 当前本地 Demo 使用匿名用户键；正式环境改为 HAF 用户身份或不可逆映射 ID。

## 2. 每日问候

`POST /api/daily-greeting`

请求示例：

```json
{
  "user_key": "anonymous-uuid",
  "date_key": "2026-08-23",
  "personal_day_number": 1,
  "personal_day_theme": "新的开始",
  "life_path_number": 7,
  "daily_angle": "行动",
  "recent_greetings": ["今天，先让一个真实的念头被看见。"]
}
```

成功响应：

```json
{
  "ok": true,
  "greeting": "今天，为真正想做的事迈出第一步。",
  "source": "deepseek"
}
```

`source` 可为 `deepseek` 或 `cache`。前端只接受 14–30 个字符；否则使用本地问候。

缓存签名必须包含：用户、日期、Personal Day、Life Path、每日表达切面和提示词版本。

## 3. 能量解读

`POST /api/energy-reading`

请求示例：

```json
{
  "user_key": "anonymous-uuid",
  "date_key": "2026-08-23",
  "personal_day": 1,
  "daily_theme": "开始",
  "moment_keyword": "照见",
  "compass": {
    "horizontal": "向内求索",
    "vertical": "安静整合",
    "intensity": "清晰"
  },
  "chakras": {
    "primary": {"name": "眉心轮", "themes": ["洞察", "辨识"]},
    "secondary": {"name": "顶轮", "themes": ["意义", "空间"]}
  },
  "fallback": "先让外界安静一点，真正重要的线索会留下来。"
}
```

成功响应：

```json
{
  "ok": true,
  "reading": "你真正想说的，不是答案，而是希望自己的感受被认真听见。",
  "source": "deepseek"
}
```

前端只接受 18–50 个字符；否则使用请求中的本地规则结果。

## 4. 埋点

`POST /api/events`

当前只支持：

```json
{
  "event_id": "uuid",
  "event_name": "energy_module_viewed",
  "user_id": "anonymous-uuid",
  "event_time": "2026-08-23T10:00:00.000Z",
  "source": "energy_journey"
}
```

```json
{
  "event_id": "uuid",
  "event_name": "energy_course_favorited",
  "user_id": "anonymous-uuid",
  "course_id": "course_001",
  "course_title": "与情绪好好相处",
  "event_time": "2026-08-23T10:03:00.000Z",
  "source": "energy_journey"
}
```

## 5. 数据摘要

`GET /api/summary?days=7`

返回：访问用户数、收藏用户数、收藏总量、收藏转化率、每日趋势和课程收藏明细。

## 6. 正式课程接口（待提供）

至少需要：

```json
{
  "course_id": "stable-id",
  "title": "课程名称",
  "cover_asset": "https://...",
  "duration_min": 20,
  "format_label": "音频练习",
  "short_description": "真实课程介绍",
  "status": "published",
  "content_version": "2026-08-23"
}
```

推荐索引还需要由内容团队或离线模型产生 `chakra_tags`、`energy_poles`、`keyword_tags`、`intensity` 和安全字段。最终契合理由不能作为静态课程字段返回。

## 7. 正式收藏接口（待提供）

请求至少包含用户 ID、课程 ID、来源和幂等请求 ID。只有服务端确认成功后，前端才显示“已收藏”并记录收藏事件。

