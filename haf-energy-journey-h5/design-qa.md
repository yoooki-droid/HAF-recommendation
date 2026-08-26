# Design QA

- Source visual truth: `/Users/at_lp007/Documents/HAF_miniapp/ref/iPhone 16 - 5.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/iPhone 16 - 6.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/result-card-compact-ios-buffer.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/result-saved-spacing-rounded-card.png`, and Figma Octave node `10578:5067`.
- Implementation: local HAF mobile prototype at `http://127.0.0.1:4173/`.
- Intended viewport: full-screen app-owned 393 × 852 mobile view inside the protected iPhone runtime. Backgrounds paint behind the status bar and home indicator; readable controls keep safe-area clearance.
- Source pixels: primary screen references 786 × 1704; focused result references 718 × 536 and 760 × 690; Figma export 786 × 1704.
- Implementation screenshots: `qa/visual-refresh-2026-08-26/loading-implementation.png`, `welcome-implementation.png`, `profile-implementation.png`, `return-implementation.png`, `compass-implementation.png`, `synthesis-implementation.png`, `result-implementation.png`, and `favorites-implementation.png`, each 393 × 852 CSS pixels at device scale factor 1.
- State: the complete first-time journey, returning-user greeting, result actions, and saved-experiences route captured after the full-screen, compact-card, and shared-atmosphere revisions.

## Comparison passes

- Pass 1: normalized the old 700px embedded layout against the 393 × 852 sources. Found the former top/bottom bands, a harsh background crop, and a visible custom-cursor artifact in captures.
- Pass 2: converted every route to an edge-to-edge 393 × 852 module, added platform safe-area spacing, moved the source raster to the Figma-like blue/orange crop, and moved the screenshot pointer outside the phone.
- Pass 3: compared both supplied references, both implementation captures, and the compact-card screenshot together. Reduced recommendation cards from 330px to 285px and moved both result actions upward, leaving more than 70px below `重新感应` for iOS system actions.
- Pass 4: compared the focused compact-card reference with the revised 393 × 852 result capture. Added a softened, blurred image haze below the card copy, moved `已收藏` to the recommendation region's upper-right edge, renamed the profile action to `修改档案`, and verified five consecutive recommendation batches without a repeated course.
- Pass 5: compared the supplied saved-entry/card crop with the latest full result capture. Added balanced breathing room around `已收藏`, shifted the card and bottom actions down by 5px, and forced a 22px GPU-safe clip so both lower corners remain visibly rounded beneath the blur layer.
- Pass 6: compared the same result crop and latest result capture together. Replaced the separate saved text link with a 52px circular bookmark immediately left of a 278 × 52 `换一批` button, then aligned the three facet footers to an identical vertical position.
- Pass 7: compared both supplied full-screen references with all eight route captures together. Reused the same real red-blue-orange raster as two full-screen atmospheric layers on every route, added low-amplitude 25s/31s breathing motion, and retained contrast overlays where content density requires them. The motion is disabled by `prefers-reduced-motion`.

## Final findings

- No open P0, P1, or P2 visual findings.
- Profile: title, date/time/gender/city groups, back affordance, and primary CTA align to the supplied vertical rhythm. The full-bleed raster continues beneath the protected status and home-indicator chrome.
- Result: energy hierarchy, three glass facets, horizontal three-card rail, actions, and bottom safety buffer are complete. The card image uses the real selected course catalog cover rather than the static Figma demonstration photo; this is an intentional product-data constraint.
- Journey atmosphere: loading, welcome, profile, returning greeting, compass, synthesis, result, and favorites all render the same raster source without a hard rectangular boundary. The light field drifts and scales subtly rather than behaving like a looping decorative effect.
- Focused card region: metadata, title, and fit reason remain readable over the new soft-focus lower-image treatment; the haze has no hard asset boundary and stays clipped by the real card image.
- The protected runtime overlays live iOS status chrome and the home indicator, while the source PNGs omit those system elements. This is an intentional runtime difference, not an app-owned blank band.
- Three `ERR_CONNECTION_REFUSED` messages remain in the isolated visual capture because the optional local analytics/AI service on port 4174 was not running. Deterministic fallbacks completed the journey and all visible interactions; the errors do not affect layout or behavior.

## Verification

- Full-screen module: 393 × 852 — passed.
- Profile controls and primary CTA — passed.
- Exactly three catalog-backed course cards — passed.
- Horizontal carousel drag and favorite state — passed.
- `修改档案`, circular saved-experiences action, narrower `换一批`, and `重新感应` — passed.
- Recommendation novelty: 15 unique courses across five consecutive batches — passed.
- Compact card height: 285px — passed.
- Circular saved action: 52 × 52; refresh action: 278 × 52 — passed.
- Three facet footer tops: 485px / 485px / 485px — passed.
- Card top and bottom rounding: 22px clip — passed.
- Bottom action buffer: at least 70px — passed.
- Shared raster background: two instances of `energy-gradient.jpeg` on all eight route states — passed.
- Background motion transform changes during capture; reduced-motion override present — passed.
- Keyboard-aware city input and semantic button labels remain present.

final result: passed
