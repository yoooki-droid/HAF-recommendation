# HAF course recommendation method

## Goal

Return three relevant but not repetitive courses. Course metadata is the source of truth. The energy insight supplies only the user's current reflective context.

## Eligibility v2

Include a course only when:

- `status` is `published`;
- required display fields exist;
- it is not explicitly excluded by the caller.
- its `chakra_tags` include the insight's primary chakra.

Primary-chakra relevance is a contextual hard gate, not a soft score. Freshness and diversity may reorder courses only inside that relevant pool; they may never introduce a course tagged only for another chakra. Favorites remain eligible. A user may want to revisit a saved course. Recently shown courses receive a novelty reduction but are not automatically removed.

For `换一批`, exhaust primary-matching courses not yet shown in the current result session first, even if they appeared in an older reading. If fewer than three session-unseen courses remain, recycle the oldest primary-matching courses while excluding the immediately previous batch whenever the matching pool is large enough. Relevance outranks novelty.

The result-page refresh control is finite. Derive its batch limit from the eligible primary-chakra pool (`ceil(pool / 3)`), capped at four batches. After the final useful batch, replace `换一批` with the primary action `重新感应` and hide the duplicate secondary re-sensing action. This prevents endless recycling while keeping exactly three cards in every displayed batch.

## Base score v3

```text
50% chakra match
20% keyword match
10% numerology support
10% duration and intensity fit
10% recency
```

### Chakra match

```text
0.7 × primary-chakra tag match
+ 0.3 × secondary-chakra tag match
```

### Keyword match

- Locked keyword match: 1.0
- Second candidate keyword match: 0.5
- Third candidate keyword match: 0.25
- No match: 0

Use the highest matching value.

The locked visible word keeps its own display text while its declared canonical `keyword_id` bridges to the catalog tags.

### Numerology support

A course receives this support when its keyword tags include the separate Personal Day theme. Numerology never changes the primary chakra chosen by the user's word.

### Practice fit

Infer only a gentle target practice intensity from the selected primary chakra:

- root, third eye, or crown: low
- sacral, heart, or throat: medium
- solar plexus: high

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
3. user-selected word resonance;
4. general practice fit.

Append only the course's own `fit_statement`. Do not claim healing, guaranteed change, or outcomes missing from the catalog.

## Future model use

A language model may smooth a fit reason after deterministic selection, but it must receive only the final candidate's catalog record and evidence tags. It may not add courses, change IDs, or invent benefits.
