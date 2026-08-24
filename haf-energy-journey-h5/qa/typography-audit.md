# HAF embedded journey typography audit

## Scope

- Surface: the full 700px H5 journey embedded inside the mobile mini-program frame.
- Device review size: 393 × 852 CSS pixels.
- Exception: typography inside the final recommendation course cards remains unchanged.

## Typography rules applied

- Maximum app-owned type size: 24px.
- Default readable body copy: 14px.
- Minimum app-owned type size outside recommendation course cards: 12px.
- Returning welcome line and daily greeting headline: both 24px.

## Flow review

1. Loading — healthy. Loading message remains 14px and centered without crowding.
2. Returning greeting — healthy. Date and labels are 12px, supporting copy is 14px, and the two main statements share the same 24px level.
3. First-time welcome — healthy. The former 33px headline is now 24px; privacy copy is readable at 12px.
4. Profile — healthy. Form labels and choice chips are at least 12px; explanatory copy is 14px and the 700px module still fits.
5. Compass — healthy. Axis labels are 12px and the live interpretation is 14px; controls remain visible without overlap.
6. Synthesis — healthy. Supporting signals are 12px and the main synthesis line stays restrained at 20px.
7. Result — healthy. Hero is capped at 24px, the energy summary is 14px, and the recommendation course-card typography is unchanged.
8. Saved experiences — healthy. Metadata is 12px, descriptive copy is 14px, and the screen continues to scroll naturally when needed.

## Copy change

- Previous: `欢迎回来 / 今天，也为自己留一点时间。`
- Current: `今天，也欢迎你回来 / 先把片刻留给自己，不必急着寻找答案。`
- Reason: it feels like a daily invitation rather than a system re-entry message and does not claim to know the user's current energy before the compass interaction.

## Evidence

- Before captures: `qa/typography-audit-before/`
- After captures: `qa/typography-audit-after/`
- After contact sheet: `qa/typography-audit-after-contact-sheet.png`

## Limits

This pass verifies visible hierarchy, fit, wrapping, and interaction at the iPhone preview size. Screen-reader announcements, operating-system dynamic type scaling, and measured contrast ratios require separate accessibility testing.
