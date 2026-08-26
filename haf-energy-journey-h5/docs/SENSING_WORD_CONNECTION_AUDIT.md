# Sensing Word Connection Audit

Date: 2026-08-27

## Evidence

- Before: `qa/word-connection-audit-2026-08-26/01-current-sensing.png`
- Active after: `qa/visual-refresh-2026-08-26/compass-active-implementation.png`
- Locked after: `qa/visual-refresh-2026-08-26/compass-implementation.png`
- Same-journey result: `qa/visual-refresh-2026-08-26/result-implementation.png`

## Finding

The former 28-word chakra carousel was visually evocative but functionally disconnected. A user could stop on `行动`, `突破`, or `觉醒`, while the deterministic synthesis and recommendation engine continued using a different locked keyword family. This made the sensing word feel decorative and made the transition to numerology, chakra, and course recommendations difficult to trust.

The colored ring count also accumulated quickly. It competed with the generated flow field and created unnecessary Canvas work on a mobile device.

## Resolution

The sensing page now has two clearly labeled language layers instead of ending after a short ten-word carousel.

While the finger remains down, it draws from 80 process terms: two terms for each of four gesture modes (`slow`, `drift`, `wide`, and `forceful`) inside each of the ten canonical energy families. Terms avoid repeating within the current sensing session, appear about every 1.15 seconds, and are described only as clues that are “靠近” or “沿着动作浮现”. They are never presented as the computed result.

On release, `haf.energy-synthesis.v3` replaces the process term with one canonical moment keyword. The weighted evidence remains:

- Personal Day: 12%
- Life Path: 5%
- primary chakra: 22%
- secondary chakra: 6%
- continuous gesture/compass field: 55%

Personal Day has one explicit job: it supplies `今日主旋律`. Its family is removed from final moment candidates, so the sensing result cannot duplicate it. Release commits the continuous point and locks the highest-ranked remaining canonical word. The result title is therefore always the meaningful two-part expression `{此刻回应} · {今日主旋律}`. The same locked keyword ID participates in the course score, and a card reason cites it only when that course's normalized metadata contains matching keyword evidence.

Ripples are now white, limited to five retained particles, throttled to one spawn per 420ms, and faded within 950ms. Canvas rendering is approximately 30fps only while touch or transient motion is active, then drops to roughly 4fps when visually idle. The colored field glow and short trail remain as lightweight feedback for the energy dimension.

## Health

1. Press and move — healthy: the live direction follows the pointer immediately and action-shaped process terms continue appearing without a fixed end.
2. Gradual convergence — healthy: slow/center, drifting, wide, and forceful movement favor different vocabulary within the currently strongest energy family.
3. Release and lock — healthy: the process layer disappears and the final canonical word settles before the completion action becomes available.
4. Daily distinction — healthy: the final moment keyword is guaranteed to differ from the Personal Day theme.
5. Result — healthy: the locked word is preserved in the result title and summary.
6. Recommendation — healthy: the locked keyword, chakra gate, compass poles, practice fit, and recency all participate in retrieval; unsupported keyword claims are never added to course copy.

Screenshot evidence can confirm hierarchy and continuity. Canvas frame pacing and long-session battery behavior still require testing on representative physical iPhones before production release.
