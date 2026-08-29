# Design QA：结果页分阶段揭示

- Source visual truth: `qa/result-progressive-reveal-2026-08-29/source-reference.png`
- Implementation: `http://127.0.0.1:4173/`
- Final implementation screenshot: `qa/result-progressive-reveal-2026-08-29/04-final-phone-frame.jpg`
- Temporal evidence: `01-stage.jpg`, `02-stage.jpg`, `03-stage.jpg`
- Side-by-side comparison: `qa/result-progressive-reveal-2026-08-29/comparison-side-by-side.png`
- Source pixels: 708 × 1346, including the iPhone frame.
- Implementation pixels: 511 × 968 phone-frame capture; app screen verified at 393 × 852 CSS px and scale 1.
- Browser viewport: 1400 × 1200; iPhone runtime; normal motion preference.
- State: a newly synthesized result, from first frame through the fully interactive recommendation state.

## Findings

- No open P0, P1, or P2 findings.
- The final frame preserves the reference hierarchy, full-screen atmosphere, typography scale, three-card alignment, course-card proportions, carousel crop, and bottom safe-area buffer. Result text and course imagery differ only because both are generated from the current sensing result and catalog batch.
- The new temporal hierarchy is clear: the reflection appears alone, the three evidence facets follow, and the course rail plus actions appear last. Every section reserves its final layout space from the first frame, so the sequence creates no vertical shift.
- Course controls are `inert`, hidden from assistive technology, and ignore pointer events before the final reveal stage; they become interactive only with the course rail.

## Required fidelity surfaces

- Fonts and typography: unchanged from the approved result screen; weights, 28px hero scale, body line height and wrapping match the reference hierarchy.
- Spacing and layout rhythm: unchanged fixed 393 × 852 composition; the reveal uses opacity, blur and small vertical travel without inserting or removing layout blocks.
- Colors and visual tokens: unchanged red-blue-orange atmosphere and glass-card opacity; no new colors or gradients were introduced.
- Image quality and asset fidelity: existing real course images and raster atmosphere remain unchanged; no placeholder, CSS-drawn or generated replacement asset was added.
- Copy and content: existing deterministic result title, reflection, evidence labels and catalog-backed course copy remain unchanged.

## Comparison history

### Pass 1 — blocked

- Finding: P2 first-frame flash. Motion elements initially inherited their normal visible CSS state and began animating toward hidden, briefly showing all lower content before the intended sequence.
- Fix: added explicit hidden `initial` states to the reflection elements, each facet, recommendation rail and result actions.

### Pass 2 — passed

- Post-fix first-frame sampling: label, title, reflection, facets, courses and actions all measured opacity `0` at reveal stage `0`.
- `01-stage.jpg`: only the core reflection is visible; facets, courses and actions remain absent.
- `02-stage.jpg`: reflection is stable and the three evidence facets are visible; courses and actions remain absent.
- `03-stage.jpg`: course rail and bottom actions complete the composition and are interactive.
- Console check: no errors or warnings.

## Focused-region comparison

No separate static crop was needed because this pass does not change typography, card anatomy, imagery or spacing. The affected surface is temporal and spans the full result view; the three equal-frame stage captures provide the focused comparison.

## Follow-up polish

- P3: after device testing, the 0.9s and 1.58s stage boundaries can be adjusted by roughly ±0.15s if the reveal feels too ceremonial or too quick on a specific WebView.

final result: passed
