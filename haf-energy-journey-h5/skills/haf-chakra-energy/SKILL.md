---
name: haf-chakra-energy
description: Map an HAF sensing-field position to one of 70 user-facing resonance words, then let the released word determine the primary chakra while numerology supplies a light secondary prior. Use when an HAF daily-energy journey, visualization, test fixture, or course-recommendation workflow needs a reproducible word-to-chakra model; never present the result as a traditional formula, biological measurement, diagnosis, or treatment.
---

# HAF Chakra Energy

Use the bundled deterministic word-resonance script. Describe it as the HAF reflective model, not as a traditional chakra calculation.

## Workflow

1. Obtain the final normalized sensing position after the user releases their finger. The position is only an address in a hidden 7 × 10 word field; it has no inward/outward/calm/active meaning.
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

- Keep exactly ten unique resonance words for each of the seven chakra families.
- Change the visible word only after the pointer enters another field cell; time alone must never rotate words.
- Release locks the visible word, and that word's chakra is always primary.
- Combine selected-word evidence (70%), Life Path affinity (20%), and Personal Day affinity (10%) for relative display scores and the supporting chakra.
- Treat all seven scores as relative reflective signals, not measured energy.
- Return a primary and secondary chakra. Avoid “blocked,” “damaged,” “healed,” or diagnostic language.
- Do not claim that the hidden word field or the 0-100 scale appears in Tantric source texts.
- Change anchors or weights only by creating a new model version and new golden tests.

## References

- Read [references/sources-and-model.md](references/sources-and-model.md) before changing the model or describing its historical basis.
- Read [references/chakra-word-model.json](references/chakra-word-model.json) before changing words, field mapping, affinities, labels, or weights. `chakra-model.json` is retained only as the superseded four-pole model.
- Run [scripts/test_project_chakra_energy.py](scripts/test_project_chakra_energy.py) after any change.

## Output Contract

Required fields:

- `schema_version` and `model_version`
- `input`
- `interaction.cell`, `interaction.selected_word`, and `interaction.selection_policy`
- `chakras[]` with `score`, `rank`, and weighted `contributions`
- `primary_chakra`, `secondary_chakra`, and `evidence_ids`
- `disclaimer`
