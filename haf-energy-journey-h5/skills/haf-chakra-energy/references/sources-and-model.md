# Sources and HAF model boundary

## What comes from historical and modern sources

1. **Historical reference:** Arthur Avalon (Sir John Woodroffe), *The Serpent Power* (1919), translates and comments on the *Ṣaṭ-Cakra-Nirūpaṇa* and *Pādukā-Pañcaka*. The title of the first text itself concerns six centers; Sahasrāra is presented above them.  
   Archive description: https://www.hermetikon.com/library/books/avalon_serpent_power  
   Smithsonian library record: https://siris-libraries.si.edu/ipac20/ipac.jsp?profile=liball&source=~%21silibraries&uri=full%3D3100001~%21882825~%210
2. **History of the modern Western synthesis:** Kurt Leland, “The Rainbow Body: How the Western Chakra System Came to Be,” describes how the now-familiar rainbow and psychological correspondence system developed through modern Western esoteric synthesis rather than appearing as one fixed ancient system.  
   https://www.theosophical.org/publications/quest-magazine/the-rainbow-body-how-the-western-chakra-system-came-to-be-2
3. **Modern reflective vocabulary and caution:** Cleveland Clinic summarizes a common modern seven-chakra model—grounding, creativity, agency, compassion, expression, intuition, and connectedness—and explicitly notes that chakras are not recognized as scientific measurements.  
   https://health.clevelandclinic.org/chakras

## What does not come from those sources

No accepted traditional or scientific formula converts a two-dimensional touch coordinate, birthday, or numerology value into seven chakra scores. The anchors, 0-100 values, and weights below are an original HAF product model for reflective interaction.

Do not describe the HAF formula as ancient, Vedic, Tantric, medical, biometric, or objectively measured.

## Current HAF word-resonance model v0.2

The current sensing experience reverses the earlier inference direction. A normalized touch position addresses one cell in a hidden 7-column × 10-row field. Every cell contains one unique user-facing word, each chakra owns exactly ten words, and the field interleaves chakra families so no visible region represents a chakra or four-pole direction. Field v2 applies a seeded toroidal row/column shift plus optional axis mirroring for each sensing attempt. This keeps all 70 cells bijective while preventing any absolute screen coordinate—including the center—from permanently identifying one word.

The opaque field seed is generated as a sensing gesture begins, remains fixed until release, and is preserved with the structured result. Words change only after the finger crosses into another cell. Time, pressure, movement speed, and background animation may affect visual feedback, but they do not rotate words or change the selected chakra. Releasing the finger locks the visible word; that word's declared chakra is always the primary result.

```text
raw_affinity =
  0.70 × selected_word_affinity
  + 0.20 × life_path_affinity
  + 0.10 × personal_day_affinity

display_score = round(20 + 75 × raw_affinity)
```

The selected-word weight intentionally dominates so the result agrees with the user's conscious resonance. Numerology remains a soft supporting prior rather than silently overruling the word.

## Superseded HAF compass model v0.1

The following model is retained for historical audit only and is no longer used by the active sensing experience.

Coordinate convention:

```text
x = -1  向内求索
x = +1  向外连接
y = -1  安静整合
y = +1  唤醒行动
```

Four-pole display weights:

```text
inward  = (1 - x) / 2
outward = (1 + x) / 2
calm    = (1 - y) / 2
active  = (1 + y) / 2
intensity = min(1, sqrt(x² + y²))
```

Each chakra has a compass anchor `(cx, cy)`. Its compass affinity uses a radial-basis function:

```text
distance² = (x - cx)² + (y - cy)²
compass_affinity = exp(-distance² / (2 × sigma²))
```

The seven anchors intentionally express this product hypothesis:

- Root: inward embodiment plus moderate action
- Sacral: flow, experience, and relational/creative motion
- Solar plexus: outward agency and decisive action
- Heart: bridge and integration near the center
- Throat: outward expression with relative clarity/calm
- Third eye: inward inquiry and calm attention
- Crown: spacious inward orientation with low action

## Numerology affinity

The number-to-chakra matrix is also HAF-authored. It translates the symbolic keywords in `$haf-numerology` into a soft prior; it is not a historical claim that a number “belongs” to a chakra.

```text
raw_affinity =
  0.45 × compass_affinity
  + 0.35 × life_path_affinity
  + 0.20 × personal_day_affinity

display_score = round(20 + 75 × raw_affinity)
```

The nonzero floor prevents the interface from presenting any chakra as absent or broken. Scores are for relative ranking within one reflection, not comparisons between people.

## Interpretation constraints

- Say “today's primary reflective theme,” not “your chakra is blocked.”
- Say “relative light level,” not “measured energy.”
- Keep the top two as primary and supporting signals; do not over-explain decimal differences.
- Allow users to reject or ignore the result.
- Use professional medical or psychological support for health concerns; do not substitute this model.
