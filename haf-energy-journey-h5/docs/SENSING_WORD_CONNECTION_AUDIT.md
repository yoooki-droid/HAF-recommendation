# Sensing Word Connection Audit

Date: 2026-08-26

## Evidence

- Before: `qa/word-connection-audit-2026-08-26/01-current-sensing.png`
- Active after: `qa/visual-refresh-2026-08-26/compass-active-implementation.png`
- Locked after: `qa/visual-refresh-2026-08-26/compass-implementation.png`
- Same-journey result: `qa/visual-refresh-2026-08-26/result-implementation.png`

## Finding

The former 28-word chakra carousel was visually evocative but functionally disconnected. A user could stop on `行动`, `突破`, or `觉醒`, while the deterministic synthesis and recommendation engine continued using a different locked keyword family. This made the sensing word feel decorative and made the transition to numerology, chakra, and course recommendations difficult to trust.

The colored ring count also accumulated quickly. It competed with the generated flow field and created unnecessary Canvas work on a mobile device.

## Resolution

The sensing page now displays only the ten canonical `haf.energy-synthesis.v2` keyword families:

`开始 · 连接 · 表达 · 安定 · 流动 · 关照 · 照见 · 力量 · 放下 · 整合`

Every visible word is the current top-ranked synthesis result from:

- Personal Day: 12%
- Life Path: 5%
- primary chakra: 22%
- secondary chakra: 6%
- continuous gesture/compass field: 55%

Release commits the continuous point and locks the same deterministic word. The result title preserves it as `{感应词} · {今日主旋律}` when the two differ. The same keyword ID participates in the course score, and a card reason cites the word only when that course's normalized metadata contains the matching keyword evidence.

Ripples are now white, limited to five retained particles, throttled to one spawn per 420ms, and faded within 950ms. Canvas rendering is approximately 30fps only while touch or transient motion is active, then drops to roughly 4fps when visually idle. The colored field glow and short trail remain as lightweight feedback for the energy dimension.

## Health

1. Press and move — healthy: the live direction follows the pointer immediately; the synthesized word changes at a restrained cadence.
2. Release and lock — healthy: the final word settles before the completion action becomes available.
3. Result — healthy: the locked word is preserved in the result title and summary.
4. Recommendation — healthy: the locked keyword, chakra gate, compass poles, practice fit, and recency all participate in retrieval; unsupported keyword claims are never added to course copy.

Screenshot evidence can confirm hierarchy and continuity. Canvas frame pacing and long-session battery behavior still require testing on representative physical iPhones before production release.
