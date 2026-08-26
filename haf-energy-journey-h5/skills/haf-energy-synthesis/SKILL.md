---
name: haf-energy-synthesis
description: Combine validated HAF numerology and chakra-projection JSON into one deterministic daily keyword, concise energy summary, chakra summary, reflection prompt, ranked keyword candidates, and evidence trace. Use when an HAF result screen, content preview, QA fixture, or later course-recommendation workflow needs a grounded daily insight; require outputs from haf-numerology and haf-chakra-energy and never invent diagnoses, fate claims, or unsupported user facts.
---

# HAF Energy Synthesis

Combine the two upstream Skill outputs. Do not recalculate numerology or chakra scores here.

## Workflow

1. Generate a numerology JSON result with `$haf-numerology`.
2. Generate a chakra JSON result with `$haf-chakra-energy` using the same Life Path and Personal Day.
3. Save or pass both results and run:

```bash
python3 scripts/synthesize_daily_energy.py \
  --numerology-file numerology.json \
  --chakra-file chakra.json \
  --pretty
```

4. Preserve the chosen keyword, ranked candidates, evidence trace, and all upstream version IDs.
5. Use `energy_summary` and `chakra_summary` as the offline-safe copy. If a language model later polishes them, lock the keyword, facts, evidence, and forbidden claims in `llm_payload`.

## Rules

- Weight Personal Day, Life Path, primary chakra, secondary chakra, and all four compass poles according to the versioned synthesis model.
- Collapse semantically aligned signals into the same keyword family before ranking. This makes a keyword reflect agreement between systems instead of letting one input dominate invisibly.
- Reserve the Personal Day keyword for `今日主旋律`; the locked `moment_keyword` must be the highest-ranked different family so sensing always adds a second signal instead of repeating the numerology label.
- Use the four-pole values continuously; do not infer from a hard quadrant alone.
- Keep numerology visually secondary to the keyword and summary.
- Never output “blocked,” “damaged,” “diagnosed,” “healed,” or deterministic future language.
- Never call an external model in the deterministic baseline.
- Create a new synthesis version before changing weights, source maps, or copy templates.

## References

- Read [references/synthesis-method.md](references/synthesis-method.md) before changing logic or copy boundaries.
- Read [references/synthesis-model.json](references/synthesis-model.json) before changing weights or keyword families.
- Run [scripts/test_synthesize_daily_energy.py](scripts/test_synthesize_daily_energy.py) after any change.

## Output Contract

Required fields:

- `schema_version`, `synthesis_version`, and `upstream_versions`
- `keyword`, `keyword_candidates`, and `keyword_trace`
- `daily_theme`, `moment_keyword`, `composite_title`, and `composite_line`
- `selection_policy` set to `moment_excludes_daily_theme`
- `visible_meta`
- `energy_summary`, `chakra_summary`, and `reflection_prompt`
- `primary_chakra`, `secondary_chakra`, and `direction`
- `source_compass` with all four continuous pole values for downstream recommendation
- `evidence_ids` and `llm_payload`
- `disclaimer`
