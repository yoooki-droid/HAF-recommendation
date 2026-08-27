# HAF daily-energy synthesis method

## Purpose

This Skill turns already-calculated symbolic signals into a coherent, restrained result-page message. It is a product-language algorithm, not a new spiritual doctrine.

## Required upstream data

- `$haf-numerology`: Life Path, Personal Day, symbolic number themes, and version IDs.
- `$haf-chakra-energy`: locked sensing word, hidden field cell, seven relative chakra scores, primary/secondary chakras, evidence IDs, and model version.

Reject input when the Life Path or Personal Day embedded in the chakra result differs from the numerology result. Never silently blend records from different users or dates.

## User-selected word synthesis v4

The sensing surface is a deterministic hidden 7 × 10 field. Every cell contains one unique word, and each of the seven chakra families owns exactly ten words. Position has no inward/outward/calm/active semantics. It only addresses a word.

The moment signal is direct:

```text
final released position → selected word → primary chakra
```

The selected word contributes 70% of the relative chakra projection, Life Path 20%, and Personal Day 10%. This guarantees that the chakra displayed on the result page agrees with what the user chose; numerology supplies only a supporting chakra and tone modifier.

Every word declares a canonical `keyword_id` for catalog matching, but the canonical family label never replaces the visible word. For example, `勇气` may bridge to the `strength` course tag while the interface and result continue to say `勇气`.

Personal Day remains the separate `今日主旋律`. The 70 sensing words exclude the ten canonical daily-theme display words, so the composite title is always a non-duplicated `{selected_word} · {daily_theme}` pair without rejecting a semantically related choice.

`keyword_candidates` begins with the selected word's canonical bridge, then adds distinct primary-chakra, secondary-chakra, and Life Path families. Preserve these sources in `keyword_trace` so recommendation evidence remains auditable.

## Copy construction

Use four pieces only:

1. The exact word the user selected.
2. The Personal Day as a quiet “today's numeric rhythm,” not the headline.
3. The selected word's primary chakra and numerology-supported secondary chakra.
4. The selected word's canonical family's short guidance and reflection question.

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
