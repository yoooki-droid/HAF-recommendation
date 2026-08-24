# Sources and adopted method

## Scope

Numerology is an occult or symbolic practice, not a scientifically validated measurement of personality or future events. HAF uses it only as a reflective narrative framework. The arithmetic can be deterministic even though the meanings remain interpretive.

## Source hierarchy

1. **Practice method:** Hans Decoz / World Numerology, “Life Path Number — Calculator, Meanings & Guide.” It documents the component-reduction method: reduce birth month, day, and year separately; preserve 11, 22, and 33; add and reduce again.  
   https://www.worldnumerology.com/numerology-life-path/
2. **Daily calculation:** Numerology.com, “Calculating Your Personal Day Number.” It reduces birth month, birth day, and the current calendar date to a single-digit daily number and provides a worked example.  
   https://www.numerology.com/articles/about-numerology/calculate-personal-day-number/
3. **Terminology boundary:** Merriam-Webster defines numerology as the study of the occult significance of numbers.  
   https://www.merriam-webster.com/dictionary/numerology

These are sources for a contemporary Western practice, not evidence that the method predicts real-world outcomes.

## HAF v1 formulas

Let `reduce(n, preserve_master)` repeatedly sum decimal digits until the result is one digit, except that 11, 22, and 33 stop reduction when `preserve_master=true`.

### Life Path

```text
month_part = reduce(birth_month, true)
day_part   = reduce(birth_day, true)
year_part  = reduce(birth_year, true)
life_path  = reduce(month_part + day_part + year_part, true)
```

Example documented by World Numerology:

```text
1990-08-12
month: 8
day:   12 → 3
year:  1990 → 19 → 10 → 1
total: 8 + 3 + 1 = 12 → 3
```

Master numbers carry a base digit for downstream blending: 11→2, 22→4, 33→6. Preserve both values rather than replacing the master number.

### Daily cycle

Version 1 uses 1-9 for daily rhythms:

```text
personal_year  = reduce(birth_month + birth_day + digits(target_year), false)
personal_month = reduce(personal_year + target_month, false)
personal_day   = reduce(personal_month + target_day, false)
```

This is digital-root equivalent to adding the reduced birth month, birth day, current month, current day, and current year as shown in the Numerology.com example.

### Versioning decision

Different practitioners preserve master numbers at different intermediate stages. HAF v1 preserves them only in Life Path. If product research later chooses another convention, create `haf.numerology.v2`; never change old stored results in place.

## Interpretation constraints

- Present themes as “a lens,” “a reminder,” or “today's rhythm.”
- Prefer possibility language: “may invite,” “can notice,” “perhaps.”
- Do not say a number proves a personality trait or predicts an event.
- Do not combine unrelated systems and claim the combination is traditional.
- Keep the calculation trace visible for QA and available for an optional “how this was formed” explanation.
