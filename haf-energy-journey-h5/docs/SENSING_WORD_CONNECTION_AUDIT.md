# Sensing Word Connection Audit

Date: 2026-08-27

## Evidence

- Before: `qa/word-connection-audit-2026-08-26/01-current-sensing.png`
- Active after: `qa/visual-refresh-2026-08-26/compass-active-implementation.png`
- Locked after: `qa/visual-refresh-2026-08-26/compass-implementation.png`
- Same-journey result: `qa/visual-refresh-2026-08-26/result-implementation.png`

## Finding

Both the former free-running chakra carousel and the later timed process vocabulary had the same trust problem: the visible word could change without the user moving, while the primary chakra was still inferred from hidden inward/outward/calm/active coordinates. The word therefore looked like atmosphere rather than an input, and a user could not explain why their chosen word led to a different chakra.

## Resolution

The active model reverses the relationship. The screen is a hidden 7 × 10 field containing 70 unique words—ten for each chakra. The seven families are interleaved across every row, so the field does not recreate visible chakra zones or the old four-direction semantics.

Time never advances the vocabulary. A word changes only when the pointer crosses into another field cell and exceeds a small jitter threshold. Releasing locks the word currently on screen, and that word's chakra becomes primary. The projection weights are selected word 70%, Life Path 20%, and Personal Day 10%; the latter two can shape relative scores and the supporting chakra but cannot overrule the user's choice.

`haf.energy-synthesis.v4` preserves the exact selected display word in the result. Its canonical `keyword_id` exists only as a bridge to course tags. Personal Day remains the separate `今日主旋律`, and none of the 70 words duplicates the ten canonical daily-theme display terms.

Course retrieval hard-gates on the word-determined primary chakra, then scores primary/secondary chakra, selected-word keyword bridge, numerology support, practice fit, and recency. This makes the recommendation path explainable as `我停在这个词 → 这个词属于这个脉轮 → 课程必须匹配这个脉轮`.

Ripples are now white, limited to five retained particles, throttled to one spawn per 420ms, and faded within 950ms. Canvas rendering is approximately 30fps only while touch or transient motion is active, then drops to roughly 4fps when visually idle. The colored field glow and short trail remain as lightweight feedback for the energy dimension.

## Health

1. Stationary touch — healthy: the same word remains on screen indefinitely; there is no slideshow timer.
2. Position change — healthy: crossing into another hidden cell reveals a new word; small jitter does not flicker the vocabulary.
3. Release and lock — healthy: the visible word itself is committed, with no post-release replacement.
4. Reverse projection — healthy: the selected word's declared chakra is always primary across all 70 cells.
5. Daily distinction — healthy: all sensing words differ visibly from every Personal Day theme.
6. Result and recommendation — healthy: the exact word is preserved in the title and reasons, and every returned course matches its chakra.

Screenshot evidence can confirm hierarchy and continuity. Canvas frame pacing and long-session battery behavior still require testing on representative physical iPhones before production release.
