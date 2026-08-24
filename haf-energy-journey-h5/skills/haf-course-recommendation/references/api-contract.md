# Future API adapter contract

The real endpoint names, authorization method, pagination, and error codes will come from the user. Do not assume them. Map future API responses into the canonical objects below.

## Canonical course

```json
{
  "course_id": "stable-id",
  "title": "课程名称",
  "short_description": "课程简介",
  "fit_statement": "陪你……",
  "status": "published",
  "format": "audio",
  "format_label": "音频练习",
  "duration_min": 12,
  "difficulty": "beginner",
  "intensity": "low",
  "chakra_tags": ["heart", "third_eye"],
  "energy_poles": ["inward", "calm"],
  "keyword_tags": ["release", "care"],
  "intention_tags": ["emotion_awareness"],
  "cover_asset": "https://...",
  "content_version": "..."
}
```

Required for recommendation: `course_id`, `title`, `short_description`, `fit_statement`, `status`, `format`, `format_label`, `duration_min`, `intensity`, `chakra_tags`, `energy_poles`, and `keyword_tags`.

Price is intentionally absent from this result-page contract.

## Course-list adapter behavior

1. Fetch published or all courses from the supplied API.
2. Validate and normalize records server-side.
3. Reject or quarantine records missing required fields; do not guess tags silently.
4. Add a `catalog_version` derived from the API's version, ETag, update timestamp, or a stable content hash.
5. Cache normalized records with a bounded TTL and retain the last valid catalog for API outages.
6. Send only normalized records into the recommendation engine.

## Favorite state

Normalize favorite operations to these internal actions regardless of the future endpoint shape:

```text
listFavorites(userSession) -> course_id[]
saveFavorite(userSession, course_id, sourceContext, idempotencyKey)
removeFavorite(userSession, course_id, idempotencyKey)
```

`sourceContext` should include only:

```json
{
  "source": "daily_energy_result",
  "result_date": "YYYY-MM-DD",
  "recommendation_snapshot_id": "opaque-id"
}
```

## Favorite interaction requirements

- Use the mini-program or HAF backend session; never place a service secret in H5.
- Use idempotency when the API supports it, preventing repeated taps from creating duplicates.
- Allow optimistic bookmark animation, then roll back and show a quiet error if the API fails.
- A failed favorite request must not rerun the energy calculation or recommendation.
- Do not treat a favorite as a purchase, enrollment, or proof of preference across unrelated topics.
- Keep Demo mode in local state only and mark it clearly in code so it can be removed when the real API is connected.
