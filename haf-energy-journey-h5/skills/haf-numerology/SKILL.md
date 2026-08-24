---
name: haf-numerology
description: Calculate HAF life-path and daily numerology profiles from a birth date and target date with deterministic Pythagorean-style reduction, explicit master-number handling, symbolic themes, and a complete calculation trace. Use when an HAF journey, test fixture, daily-energy result, or recommendation workflow needs reproducible numerology inputs; do not use it for scientific, medical, psychological, or deterministic future claims.
---

# HAF Numerology

Use the bundled deterministic calculator. Do not ask a language model to perform the arithmetic.

## Workflow

1. Require an ISO birth date and an explicit ISO target date (`YYYY-MM-DD`). Resolve “today” in the product's timezone before invoking the script.
2. Run:

```bash
python3 scripts/calculate_numerology.py \
  --birth-date 1990-08-12 \
  --target-date 2026-08-22 \
  --pretty
```

3. Preserve `schema_version`, `method_version`, and every calculation trace in downstream records.
4. Use `life_path` as a stable symbolic baseline and `personal_day` as the changing daily rhythm.
5. Treat themes as prompts for reflection, not facts about personality or predictions.

## Rules

- Calculate Life Path by reducing month, day, and year separately, preserving 11, 22, and 33, then reducing their sum while preserving the same master numbers.
- Calculate Personal Year, Personal Month, and Personal Day as single digits 1-9. Version 1 intentionally does not preserve master numbers in daily cycles.
- Do not require gender, birth time, name, or location. They are not inputs to this method.
- Never silently switch to a different numerology school. Add a new method version instead.
- Never infer illness, trauma, compatibility, fate, financial outcomes, or future events.

## References

- Read [references/sources-and-method.md](references/sources-and-method.md) before changing formulas or interpreting source authority.
- Read [references/number-themes.json](references/number-themes.json) before changing symbolic themes.
- Run [scripts/test_calculate_numerology.py](scripts/test_calculate_numerology.py) after any change.

## Output Contract

Return only structured data when another engine consumes the result. The required fields are:

- `schema_version`
- `method_version`
- `birth_date` and `target_date`
- `life_path.value`, `life_path.base_digit`, and `life_path.trace`
- `personal_cycle.personal_year`, `personal_month`, `personal_day`, and `trace`
- `themes.life_path` and `themes.personal_day`
- `disclaimer`
