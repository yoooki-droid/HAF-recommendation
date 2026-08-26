# Design QA

- Source visual truth: `/Users/at_lp007/Documents/HAF_miniapp/ref/iPhone 16 - 5.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/iPhone 16 - 6.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/result-card-compact-ios-buffer.png`, and Figma Octave node `10578:5067`.
- Implementation: local HAF mobile prototype at `http://127.0.0.1:4173/`.
- Intended viewport: full-screen app-owned 393 × 852 mobile view inside the protected iPhone runtime. Backgrounds paint behind the status bar and home indicator; readable controls keep safe-area clearance.
- Source pixels: 786 × 1704 for each supplied PNG; Figma export 786 × 1704.
- Implementation screenshots: `qa/visual-refresh-2026-08-26/profile-implementation.png` and `qa/visual-refresh-2026-08-26/result-implementation.png`, each 393 × 852 CSS pixels at device scale factor 1.
- State: profile and result screens captured after the full-screen and compact-card revisions.

## Comparison passes

- Pass 1: normalized the old 700px embedded layout against the 393 × 852 sources. Found the former top/bottom bands, a harsh background crop, and a visible custom-cursor artifact in captures.
- Pass 2: converted every route to an edge-to-edge 393 × 852 module, added platform safe-area spacing, moved the source raster to the Figma-like blue/orange crop, and moved the screenshot pointer outside the phone.
- Pass 3: compared both supplied references, both implementation captures, and the compact-card screenshot together. Reduced recommendation cards from 330px to 285px and moved both result actions upward, leaving more than 70px below `重新感应` for iOS system actions.

## Final findings

- No open P0, P1, or P2 visual findings.
- Profile: title, date/time/gender/city groups, back affordance, and primary CTA align to the supplied vertical rhythm. The full-bleed raster continues beneath the protected status and home-indicator chrome.
- Result: energy hierarchy, three glass facets, horizontal three-card rail, actions, and bottom safety buffer are complete. The card image uses the real selected course catalog cover rather than the static Figma demonstration photo; this is an intentional product-data constraint.
- The protected runtime overlays live iOS status chrome and the home indicator, while the source PNGs omit those system elements. This is an intentional runtime difference, not an app-owned blank band.
- Three `ERR_CONNECTION_REFUSED` messages remain in the isolated visual capture because the optional local analytics/AI service on port 4174 was not running. Deterministic fallbacks completed the journey and all visible interactions; the errors do not affect layout or behavior.

## Verification

- Full-screen module: 393 × 852 — passed.
- Profile controls and primary CTA — passed.
- Exactly three catalog-backed course cards — passed.
- Horizontal carousel drag and favorite state — passed.
- `换一批`, `重新感应`, and `重新编辑` — passed.
- Compact card height: 285px — passed.
- Bottom action buffer: at least 70px — passed.
- Keyboard-aware city input and semantic button labels remain present.

final result: passed
