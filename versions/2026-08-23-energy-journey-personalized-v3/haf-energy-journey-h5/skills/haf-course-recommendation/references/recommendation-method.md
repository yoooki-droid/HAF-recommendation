# HAF course recommendation method

## Goal

Return three relevant but not repetitive courses. Course metadata is the source of truth. The energy insight supplies only the user's current reflective context.

## Eligibility

Include a course only when:

- `status` is `published`;
- required display fields exist;
- it is not explicitly excluded by the caller.

Favorites remain eligible. A user may want to revisit a saved course. Recently shown courses receive a novelty reduction but are not automatically removed.

## Base score v1

```text
35% chakra match
25% compass-pole match
20% keyword match
10% duration and intensity fit
10% recency
```

### Chakra match

```text
0.7 × primary-chakra tag match
+ 0.3 × secondary-chakra tag match
```

### Compass match

Average the current continuous weights for all `energy_poles` attached to the course. A course tagged `inward` and `calm` therefore fits according to the actual two values rather than a hard quadrant.

### Keyword match

- Locked keyword match: 1.0
- Second candidate keyword match: 0.5
- Third candidate keyword match: 0.25
- No match: 0

Use the highest matching value.

### Practice fit

Infer only a gentle target practice intensity from the current active/calm mix:

- calm dominant: low
- active dominant: medium
- active > 0.75 and outward > 0.65: high

Combine intensity proximity with duration proximity. This is a product convenience hypothesis, not a health prescription.

### Recency

- Not in recent-course IDs: 1
- Recently shown: 0

## Diversity selection

Rank all eligible courses by base score. Select greedily. For each already-selected course, subtract:

- `0.08` for the same modality;
- `0.04` for the same first chakra tag.

Store the penalty separately. This keeps relevance visible while preventing three nearly identical cards.

## Fit reason

Choose the strongest grounded signal in this order:

1. locked keyword tag;
2. primary chakra tag;
3. dominant compass pole tag;
4. general practice fit.

Append only the course's own `fit_statement`. Do not claim healing, guaranteed change, or outcomes missing from the catalog.

## Future model use

A language model may smooth a fit reason after deterministic selection, but it must receive only the final candidate's catalog record and evidence tags. It may not add courses, change IDs, or invent benefits.
