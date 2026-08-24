---
name: haf-course-recommendation
description: Select exactly three published HAF courses from a normalized catalog using a validated daily-energy insight, deterministic chakra, compass, keyword, practice-fit, recency, and diversity scoring, with grounded fit reasons and a full score trace. Use for HAF demo recommendations, result-page course cards, QA fixtures, or future course API integration; do not invent course benefits, prices, availability, or content absent from the catalog.
---

# HAF Course Recommendation

Recommend from catalog data only. Use the bundled Demo catalog until the real course API is connected.

## Workflow

1. Generate an insight JSON with `$haf-energy-synthesis`.
2. Run:

```bash
python3 scripts/recommend_courses.py \
  --insight-file insight.json \
  --catalog-file references/demo-courses.json \
  --pretty
```

3. Return exactly three published courses when at least three eligible courses exist.
4. Display each card with cover, title, today's fit reason, duration/format, and bookmark state. Never display price in this flow.
5. Preserve recommendation version, catalog version, score breakdown, and evidence tags.

## Rules

- Score chakra match, continuous compass-pole match, keyword match, practice fit, and recency with the versioned weights.
- Apply a transparent diversity penalty so the final three do not all have the same modality or first chakra tag.
- Build reasons only from the locked energy insight and each course's `fit_statement` and tags.
- Never let a language model add an unsupported benefit or choose a course outside the eligible candidate set.
- Do not treat favorites as purchases. Bookmark state belongs to the favorite API adapter, not the scoring formula.
- Keep the local Demo catalog clearly marked as Demo and replace only the catalog adapter when real APIs arrive.

## References

- Read [references/recommendation-method.md](references/recommendation-method.md) before changing scores or diversity behavior.
- Read [references/api-contract.md](references/api-contract.md) before connecting the real course and favorite APIs.
- Use [references/demo-courses.json](references/demo-courses.json) only for prototype and QA.
- Run [scripts/test_recommend_courses.py](scripts/test_recommend_courses.py) after any change.

## Output Contract

Required fields:

- `schema_version`, `recommendation_version`, and `catalog_version`
- `source_insight`
- `recommendations[]` with exactly three entries
- Each entry: `course`, `fit_reason`, `fit_evidence`, `base_score`, `diversity_penalty`, `final_score`, and `score_breakdown`
- `candidate_count` and `disclaimer`
