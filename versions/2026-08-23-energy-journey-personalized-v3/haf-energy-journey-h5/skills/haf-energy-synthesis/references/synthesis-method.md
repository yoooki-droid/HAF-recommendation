# HAF daily-energy synthesis method

## Purpose

This Skill turns already-calculated symbolic signals into a coherent, restrained result-page message. It is a product-language algorithm, not a new spiritual doctrine.

## Required upstream data

- `$haf-numerology`: Life Path, Personal Day, symbolic number themes, and version IDs.
- `$haf-chakra-energy`: four compass weights, seven relative chakra scores, primary/secondary chakras, evidence IDs, and model version.

Reject input when the Life Path or Personal Day embedded in the chakra result differs from the numerology result. Never silently blend records from different users or dates.

## Keyword scoring v2

Each input is mapped to a semantic keyword family:

```text
Personal Day     12%
Life Path         5%
Primary chakra   22%
Secondary chakra  6%
Compass position 55%
```

Numerology provides the day's symbolic background. The headline describes the present moment, so the compass position and compass-influenced chakra projection together carry more weight.

The compass contribution uses a continuous 3 × 3 semantic grid. For the horizontal axis, compute `inward=max(0,-x)`, `center=1-abs(x)`, and `outward=max(0,x)`. Compute `calm`, `center`, and `active` the same way on the vertical axis. Multiply the horizontal and vertical memberships, sharpen them with the configured response power, normalize, then add the configured compass weight to the mapped keyword families.

This produces gentle transitions instead of hard quadrant switches:

```text
照见    整合    表达
关照    整合    连接
安定    流动    力量
```

Signals that map to the same family add together. For example:

```text
Personal Day 9       → release
Crown chakra         → release
Inward + calm        → insight
Outward + active     → strength
Near the center      → integrate
```

Aligned numerology and chakra signals still influence the ranking, but Personal Day alone can no longer keep the headline fixed while the user moves across the compass. The ranked trace preserves the background and present-moment contributions separately.

Sort by total score descending, then stable keyword ID ascending. Preserve every contribution in `keyword_trace` so product and content teams can understand the choice.

## Copy construction

Use four pieces only:

1. The dominant horizontal pole and dominant vertical pole.
2. The Personal Day as a quiet “today's numeric rhythm,” not the headline.
3. The primary and secondary chakra names.
4. The chosen keyword's short guidance and reflection question.

Keep the result warm, short, and non-diagnostic. A valid summary describes a possibility and offers a gentle next step; it does not define the user.

## Future language-model boundary

The deterministic output includes `llm_payload` for a later single model call. A model may:

- improve rhythm and naturalness;
- remove repetition;
- adapt copy length within UI limits.

A model may not:

- change the locked keyword or primary/secondary chakra;
- add biographical, medical, psychological, karmic, or predictive facts;
- claim the result is objective measurement;
- recommend a course before the course-retrieval engine supplies grounded candidates.

The H5 must remain able to display the deterministic summaries when the model API is unavailable.
