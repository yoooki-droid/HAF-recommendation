# Design QA

- Source visual truth: `/Users/at_lp007/Documents/HAF_miniapp/ref/iPhone 16 - 5.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/iPhone 16 - 6.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/result-card-compact-ios-buffer.png`, `/Users/at_lp007/Documents/HAF_miniapp/ref/result-saved-spacing-rounded-card.png`, Figma Octave node `10578:5067`, the accepted sensing baseline `qa/word-resonance-v4-2026-08-27/01-position-selected-word.png`, the user-marked orb crop `qa/word-resonance-v4-2026-08-27/04-orb-color-before.png`, the user-marked premature-word state `qa/word-resonance-v4-2026-08-27/07-word-visible-before-release.png`, and the 2026-08-27 sound/motion reference `/var/folders/89/fds7znkd68s8x6flwhhmsymm0000gn/T/TemporaryItems/NSIRD_screencaptureui_DVhdzX/截屏2026-08-27 10.18.20.png`.
- Implementation: local HAF mobile prototype at `http://127.0.0.1:4173/`.
- Intended viewport: full-screen app-owned 393 × 852 mobile view inside the protected iPhone runtime. Backgrounds paint behind the status bar and home indicator; readable controls keep safe-area clearance.
- Source pixels: primary screen references 786 × 1704; focused result references 718 × 536 and 760 × 690; Figma export 786 × 1704.
- Implementation screenshots: `qa/visual-refresh-2026-08-26/loading-implementation.png`, `welcome-implementation.png`, `profile-implementation.png`, `return-implementation.png`, `compass-implementation.png`, `synthesis-implementation.png`, `result-implementation.png`, and `favorites-implementation.png`, each 393 × 852 CSS pixels at device scale factor 1.
- State: the complete first-time journey, returning-user greeting, sensing-word emergence and locked state, result actions, and saved-experiences route captured after the full-screen, compact-card, shared-atmosphere, and word-resonance revisions.

## Comparison passes

- Pass 1: normalized the old 700px embedded layout against the 393 × 852 sources. Found the former top/bottom bands, a harsh background crop, and a visible custom-cursor artifact in captures.
- Pass 2: converted every route to an edge-to-edge 393 × 852 module, added platform safe-area spacing, moved the source raster to the Figma-like blue/orange crop, and moved the screenshot pointer outside the phone.
- Pass 3: compared both supplied references, both implementation captures, and the compact-card screenshot together. Reduced recommendation cards from 330px to 285px and moved both result actions upward, leaving more than 70px below `重新感应` for iOS system actions.
- Pass 4: compared the focused compact-card reference with the revised 393 × 852 result capture. Added a softened, blurred image haze below the card copy, moved `已收藏` to the recommendation region's upper-right edge, renamed the profile action to `修改档案`, and verified five consecutive recommendation batches without a repeated course.
- Pass 5: compared the supplied saved-entry/card crop with the latest full result capture. Added balanced breathing room around `已收藏`, shifted the card and bottom actions down by 5px, and forced a 22px GPU-safe clip so both lower corners remain visibly rounded beneath the blur layer.
- Pass 6: compared the same result crop and latest result capture together. Replaced the separate saved text link with a 52px circular bookmark immediately left of a 278 × 52 `换一批` button, then aligned the three facet footers to an identical vertical position.
- Pass 7: compared both supplied full-screen references with all eight route captures together. Reused the same real red-blue-orange raster as two full-screen atmospheric layers on every route, added low-amplitude 25s/31s breathing motion, and retained contrast overlays where content density requires them. The motion is disabled by `prefers-reduced-motion`.
- Pass 8: replayed the reported `太阳神经丛` result as a recommendation regression fixture. All five three-course batches stayed inside the seven-course primary-chakra pool, exhausted every matching course before recycling, and never repeated a course from the immediately previous batch. A course tagged only for `海底轮` is no longer eligible in this state.
- Pass 9: replaced exact birth-clock values with four time-of-day intervals (`早上`, `中午`, `下午`, `晚上`) plus `不确定`. Verified the full cycle and automatic migration of a legacy `23:23` value to `不确定`.
- Pass 10: compared the accepted sensing baseline and the revised in-app Browser capture `qa/word-resonance-v4-2026-08-27/02-slow-word-emergence.png` together. The settled composition, typography, background, orb, and lower copy remain unchanged. Live computed-style sampling confirmed the selected word progresses from partial opacity/blur/scale to fully resolved over roughly 1.1 seconds; outgoing words clear in 0.24 seconds without a waiting queue, and `完成感应` now waits for the word to resolve. The browser captures are both 594 × 757 pixels at the same in-app Browser canvas size; the previously approved 393 × 852 app-viewport captures remain the 1:1 layout evidence. No focused still-image crop was needed because this pass changed only temporal easing, and the full-view comparison kept the complete affected region legible.
- Pass 11: compared the 182 × 176 user-marked orb crop with the 184 × 184 focused implementation crop `qa/word-resonance-v4-2026-08-27/06-paler-sensing-orb-crop.jpg` in one visual input, then checked the full in-app Browser view `qa/word-resonance-v4-2026-08-27/05-paler-sensing-orb-full.jpg`. The orb keeps the same real raster asset, 68px CSS size, pointer position, and responsive scale. Saturation is reduced to .76, contrast to .94, and both halo alpha values are softened; the blue-orange reading remains visible but no longer competes with the background. Typography, spacing/layout rhythm, surrounding color field, source image sharpness, and copy are unchanged. No P0/P1/P2 regression was found.
- Pass 12: the user-marked 422 × 308 crop showed a sensing-bank word before release, which was treated as a P1 interaction-timing mismatch. Removed all visible and assistive-technology exposure of candidate words during the pressed/moving phase, changed the interim copy to `回应正在汇聚`, and made pointer-up robust even if the browser releases pointer capture before the React handler runs. Compared the source, the 594 × 757 in-app Browser sensing capture `qa/word-resonance-v4-2026-08-27/08-sensing-before-release.jpg`, and the matching released capture `qa/word-resonance-v4-2026-08-27/09-word-after-release.jpg` in one visual input. Before release there is no word, chakra, or theme disclosure; 150ms after release the locked word is present while `完成感应` is still withheld, and at 1.45s the completed reveal plus action are visible. The white pointer disc in the sensing capture is Browser test instrumentation, not app UI. Typography, layout rhythm, colors, real raster assets, and all unchanged copy retain the approved baseline. The P1 is fixed and no open P0/P1/P2 finding remains.
- Pass 13: compared the new full-phone sound/motion source with `qa/sensing-audio-motion-2026-08-27/01-idle-sound-on.png`, `02-mid-slow-emergence.png`, and `03-settled-white-point.png`. The layout and full-bleed raster stay aligned with the approved composition. After release the word remains at 0 opacity/18px blur at 220ms, reaches about 0.51 opacity/8.67px blur around 1.7s, and settles only near 3.9s; `完成感应` remains absent through the middle state. The moving pastel orb contracts over 0.95s into an 8px white core with a restrained halo. A 19-second low-amplitude loop animates the real raster without adding a video payload, and reduced-motion still disables the loop. The 34px glass sound control toggled between `关闭声音` and `开启声音` with correct pressed state. No open P0/P1/P2 finding remains.

## Final findings

- No open P0, P1, or P2 visual findings.
- Profile: title, date/time/gender/city groups, back affordance, and primary CTA align to the supplied vertical rhythm. The full-bleed raster continues beneath the protected status and home-indicator chrome.
- Result: energy hierarchy, three glass facets, horizontal three-card rail, actions, and bottom safety buffer are complete. The card image uses the real selected course catalog cover rather than the static Figma demonstration photo; this is an intentional product-data constraint.
- Journey atmosphere: loading, welcome, profile, returning greeting, compass, synthesis, result, and favorites all render real raster sources without a hard rectangular boundary. The sensing field uses a subtle 19-second raster drift rather than a generated video payload; a paid Seedance loop remains intentionally deferred pending explicit approval.
- Sensing word and sound: a 0.55-second pause, 18px blur, and 2.8-3.1-second convergence create the requested slow emergence. The CTA waits 3.85 seconds. The first user touch starts a quiet procedural ambient bed and optional Mandarin guidance; the bed ducks beneath speech, the selected word is narrated near the end of its reveal, and a visible sound toggle is always available. Rapid position changes replace the pending word instead of queuing older words; reduced-motion users receive an immediate fade and action.
- Focused card region: metadata, title, and fit reason remain readable over the new soft-focus lower-image treatment; the haze has no hard asset boundary and stays clipped by the real card image.
- The protected runtime overlays live iOS status chrome and the home indicator, while the source PNGs omit those system elements. This is an intentional runtime difference, not an app-owned blank band.
- Three `ERR_CONNECTION_REFUSED` messages remain in the isolated visual capture because the optional local analytics/AI service on port 4174 was not running. Deterministic fallbacks completed the journey and all visible interactions; the errors do not affect layout or behavior.

## Verification

- Full-screen module: 393 × 852 — passed.
- Profile controls and primary CTA — passed.
- Exactly three catalog-backed course cards — passed.
- Horizontal carousel drag and favorite state — passed.
- `修改档案`, circular saved-experiences action, narrower `换一批`, and `重新感应` — passed.
- Recommendation relevance: every returned course includes the displayed primary chakra — passed.
- Solar-plexus refresh regression: all 7 matching courses exhausted across five batches; no consecutive-batch repeats — passed.
- Compact card height: 285px — passed.
- Circular saved action: 52 × 52; refresh action: 278 × 52 — passed.
- Three facet footer tops: 485px / 485px / 485px — passed.
- Card top and bottom rounding: 22px clip — passed.
- Bottom action buffer: at least 70px — passed.
- Shared raster background: two instances of `energy-gradient.jpeg` on all eight route states — passed.
- Background motion transform changes during capture; reduced-motion override present — passed.
- Keyboard-aware city input and semantic button labels remain present.
- Birth-time intervals and legacy exact-time migration — passed.
- Sensing word reveal: sampled at 0 opacity / 17.99px blur at 220ms, 0.51 opacity / 8.67px blur near 1.7s, and 1 opacity / 0px blur after settling — passed.
- Locked action reveal waits 3.85 seconds so it follows the word and narration instead of interrupting them — passed.
- Sensing orb transformation: pastel blue-orange core while moving, then a 0.95-second contraction into an approximately 8px white point after release — passed.
- Sound control: first-touch start, ambient ducking under narration, route cleanup, and explicit on/off pressed states — passed.
- Sensing background: real raster animated on a 19-second GPU loop with reduced-motion override and no paid video request — passed.
- Release-gated word reveal: no candidate word or chakra is visible/announced while pressed; the final word appears only after pointer-up, followed by `完成感应` — passed.

final result: passed
