---
name: haf-chakra-energy
description: Project an HAF four-pole compass point plus deterministic numerology values into seven relative chakra reflection scores, primary and secondary themes, four-pole weights, and auditable contribution evidence. Use when an HAF daily-energy journey, visualization, test fixture, or course-recommendation workflow needs a reproducible compass-to-chakra model; never present the result as a traditional formula, biological measurement, diagnosis, or treatment.
---

# HAF Chakra Energy

Use the bundled deterministic projection script. Describe it as the HAF reflective model, not as a traditional chakra calculation.

## Workflow

1. Obtain a confirmed compass coordinate where `x=-1` is inward, `x=1` is outward, `y=-1` is calm, and `y=1` is active.
2. Obtain `life_path` and `personal_day` from `$haf-numerology`.
3. Run:

```bash
python3 scripts/project_chakra_energy.py \
  --x -0.62 \
  --y -0.48 \
  --life-path 9 \
  --personal-day 7 \
  --pretty
```

4. Preserve `model_version`, scores, contributions, and evidence IDs.
5. Let downstream language generation paraphrase only the structured result. Do not let it change rankings or invent causes.

## Model Rules

- Use continuous coordinates; never reduce the compass to one of four hard labels.
- Combine compass projection (45%), Life Path affinity (35%), and Personal Day affinity (20%).
- Treat all seven scores as relative reflective signals, not measured energy.
- Return a primary and secondary chakra. Avoid “blocked,” “damaged,” “healed,” or diagnostic language.
- Do not claim that the compass mapping or the 0-100 scale appears in Tantric source texts.
- Change anchors or weights only by creating a new model version and new golden tests.

## References

- Read [references/sources-and-model.md](references/sources-and-model.md) before changing the model or describing its historical basis.
- Read [references/chakra-model.json](references/chakra-model.json) before changing anchors, affinities, labels, or weights.
- Run [scripts/test_project_chakra_energy.py](scripts/test_project_chakra_energy.py) after any change.

## Output Contract

Required fields:

- `schema_version` and `model_version`
- `input`
- `compass.four_poles` and `compass.intensity`
- `chakras[]` with `score`, `rank`, and weighted `contributions`
- `primary_chakra`, `secondary_chakra`, and `evidence_ids`
- `disclaimer`
