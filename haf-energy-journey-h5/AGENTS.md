# Mobile Prototype Agent Guide

## Frozen Snapshot

- The approved 2026-08-23 personalized baseline is frozen at `/Users/yokichen/Documents/HAF_miniapp/versions/2026-08-23-energy-journey-personalized-v3`.
- It includes the first-time introduction, profile-aware AI greeting cache, Loading-prefetched AI copy, six-second fallback contract, refined result layout, domain Skills and lightweight dashboard. Do not edit it in place.
- The 2026-08-22 baseline containing the Personal Day greeting, complete energy journey, favorites screen, analytics events, and lightweight live dashboard is frozen at `/Users/yokichen/Documents/HAF_miniapp/versions/2026-08-22-energy-journey-dashboard-v2`.
- Do not edit that snapshot in place. Continue UI/UX iterations only in the working `haf-energy-journey-h5` and `haf-energy-dashboard` folders, or create a new version snapshot.

## HAF Energy Journey Decisions

- This project is a new standalone H5 prototype and must not overwrite `haf-numerology-h5` or the archived V1 under `versions/`.
- The experience now uses the full mini-program viewport. App-owned H5 backgrounds must paint edge to edge behind the status bar and home-indicator areas, while controls and readable content preserve the device safe areas.
- The core flow is spiritual loading -> one-time profile -> draggable four-axis energy compass -> synthesis -> daily keyword and three course recommendations.
- Before the first profile, explain the experience in three concise steps: `天生线索`, `此刻感应`, and `今日回响`. Promise only the outputs the product actually provides: a daily keyword, one energy interpretation, and three fitting practices.
- First-time profile data is stored locally and skipped on later visits; users can reset it from the result screen.
- On second and later visits, loading leads to a short, text-led returning ritual and one clear “开始今日感应” action before the compass. Do not use an energy orb on this returning greeting, and do not repeat the birthday/profile form unless the user resets it.
- The returning greeting changes with the user's Personal Day for the current natural date. Before the compass it may express only the known daily theme; it must not claim to know the user's present direction, chakra, or mood yet. The live greeting is prepared during the opening Loading and has a deterministic local fallback.
- Numerology, chakra reflection, and the user's compass point are peer inputs. The number is secondary to the emotional keyword and is never presented as deterministic fact.
- Result synthesis uses three distinct layers instead of forcing all signals to compete for one word: Personal Day supplies `今日主旋律`, the compass supplies `此刻入口`, and the primary chakra supplies `能量落点`. The hero may combine the first two as `{此刻入口} · {今日主旋律}`.
- Keep the selected result visual: elegant blue atmosphere, one blue-orange orb and flowing light, restrained white typography, translucent glass, and generous space.
- The 2026-08-26 visual-refresh branch uses the supplied `iPhone 16 - 5.png`, `iPhone 16 - 6.png`, and Figma Octave node `10578:5067` as the visual source for the profile and result screens. Preserve their 393 × 852 full-screen blurred blue-orange atmosphere, centered profile fields, three translucent result facets, image-led horizontal course cards, pill CTA, and restrained white type; keep the protected mobile runtime, deterministic energy facts, and catalog-backed course data unchanged.
- The energy orb must keep an opaque, saturated core. Motion should come from layered real-image halo and light passes rather than fading the entire orb; surrounding blue-orange light flow should feel slow, continuous, and luminous rather than like a floating background image.
- Never place a separately cropped opaque light-flow image behind the result orb; it creates a visible rectangular color mask. Result-page light must come from the full-module atmospheric layers, with no hard image boundary.
- The synthesis/loading transition must also avoid cropped light-flow images or any visible rectangular mask. Use the full-module atmosphere plus transparent orb/radial-light layers only.
- The H5 module spans the full phone viewport with square app-owned edges and no top or bottom blank bands. Do not add a floating rounded outer frame or gutters around the whole module; rounded corners remain appropriate for internal cards and controls.
- Result-page readability takes priority over extra negative space: `灵数 · 脉轮 · 方向`, course fit copy, duration/type, and bookmark labels must remain comfortably readable at the 365px embedded H5 width. Include a concise interpretation below the three source facets.
- On the approved result layout, the orb occupies only the title corner. The leading guidance sentence has the full content width and uses balanced wrapping so a single Chinese character is not orphaned on a new line.
- Match the host mini-program’s compact PingFang-style hierarchy. In the full-screen visual refresh, primary result headings may reach 28px, section/course titles are approximately 17-18px, normal body copy is 14px, and non-course-card captions are no smaller than 12px. Prefer regular-to-semibold weights (400-650); avoid oversized heavy display type that makes the H5 feel like a separate product.
- For the current full-screen typography pass, all app-owned text outside the final recommendation course cards must be at least 12px and normal body copy uses 14px. The returning-screen welcome line and its daily greeting headline share the same 24px size.
- The returning ritual now omits the separate top welcome block; its small label is the current date, followed directly by the Personal Day greeting. The birth picker must support the real number of days in the selected month, including leap-year February 29. City is free text through the protected mobile keyboard input rather than a short fixed city list.
- On the result page, separate the short interpretation from the three source facets with a tapered, softly glowing light trace rather than a rigid full-width border; do not add a redundant heading. The interpretation must add judgment rather than restate visible labels and must stay within 50 Chinese characters. In the profile form, city is a full-width standalone row below gender rather than sharing a two-column row.
- Keep the three result facets semantically independent: numerology is the daily theme, the compass is the current inward/outward and calm/active position, and the chakra card is the projected energy landing. Do not repeat a synthesized keyword across these source cards.
- The recommender still returns exactly three catalog records in a horizontal carousel, but the visible narrative introduces them as `此刻与你契合的体验`, not `3 节课`. Every card includes a small real image, course name, current-energy fit reason, duration/format, and a bookmark action. Use natural modality phrases such as `这段冥想练习` or `这场声音体验` in reasons; do not show price or purchase pressure.
- In the full-screen iOS result layout, keep recommendation cards compact enough that `换一批` and `重新感应` sit above the bottom system-action region; the full-bleed background may continue behind the reserved buffer.
- The result action is labeled `修改档案`; the `已收藏` entry belongs at the upper-right edge of the recommendation area rather than beside the energy heading. Course-card copy sits over a soft blurred image haze, and `换一批` must exhaust unseen catalog courses before recycling older results.
- Keep visible breathing room above and below the recommendation-level `已收藏` entry. Recommendation cards must retain rounded top and bottom corners even when blurred copy layers use GPU compositing; bottom actions may shift slightly lower to protect this spacing.
- On real-course cards, the small eyebrow displays the course date and the metadata line displays the session start-end time plus format; do not label the card body `今日契合点` or substitute duration for the real schedule. The three fit reasons should deliberately use different grounded lenses—daily numerology, chakra evidence, and compass direction—so the cards do not repeat one template.
- Keep the timing semantics distinct: numerology and the upper result are the user's `今日能量`, while course reasons express `此刻契合`. Never imply that a recommended course must be taken today or will stop fitting tomorrow; the user may save or purchase it now and enter the experience later.
- The active working H5 currently uses the normalized HAF 2025 API catalog as a clearly labeled historical recall test; the frozen V3 snapshot remains untouched. In this test, user numerology still uses the current natural date, while course availability is evaluated at the 2025 event-opening checkpoint so the historical catalog remains playable. Current MVP availability requires only presence in the latest successful complete list and at least one session whose end time has not passed; inventory, goods ID, and purchase link are observed but do not filter recommendations yet.
- When the real course API is connected, treat its course ID, title, cover, duration, description, status, and other editorial metadata as facts. The displayed `fit_reason` remains reading-specific copy generated from the locked energy facts and those real course facts; it must not become a static sentence copied from the course API.
- DeepSeek is not part of deterministic numerology, compass, or chakra calculation. In production it is called only through the HAF backend, normally once per reading, to polish grounded energy copy and produce evidence-backed fit reasons for the final candidate courses. The local deterministic reason remains the required fallback.
- Daily variety has two layers: the returning greeting selects a stable date-and-profile-specific body variant, while the result signature includes natural date, Personal Day, compass quadrant, compass intensity, primary chakra, and secondary chakra. The same user/date/signature must remain stable; a different natural day or sensed state may produce new copy.
- The returning-screen headline is generated by the backend daily-greeting prompt from Personal Day, its locked theme, Life Path as a tone modifier, a stable daily angle, and up to 30 recent greetings. It must remain 14-30 Chinese characters and fall back to the local Personal Day headline without blocking the flow. Frontend and backend cache signatures must include anonymous user, natural day, Personal Day, Life Path and the daily angle; changing the profile must not reuse a greeting calculated from an old Life Path.
- Opening and synthesis Loading screens own the live AI requests. The H5 waits at most six seconds, validates the response, then stores either the valid AI copy or the deterministic fallback. Once the greeting or result screen is visible, its copy is immutable for that signature; never replace it with a late response or cause a layout jump.
- The H5 may send only derived energy facts and an anonymous local user key to the reading endpoint. Never send birth date, gender, city, or the DeepSeek API key to the browser. Cache a valid 18-50 character AI reading per user/date/signature and keep the local deterministic reading as the immediate fallback.
- DeepSeek may preprocess course descriptions in batch into structured tags and safe evidence fragments, but do not batch one static final fit reason per course. The displayed reason should still combine the user's daily theme, current compass/chakra evidence, and course facts at reading time.
- The first analytics dashboard is intentionally minimal: unique module visitors, unique users who favorited from this module, total successful favorite additions, the derived visitor-to-favoriter rate, a simple time trend, and per-course favorite counts. Do not add model experiments or deep funnel analysis until requested.
- The local prototype emits only `energy_module_viewed` and successful `energy_course_favorited` events to the lightweight dashboard collector. The analytics endpoint must remain configurable through `VITE_HAF_ANALYTICS_ENDPOINT`; analytics failures may never block the H5 journey or favorite interaction.
- The saved-count action opens a dedicated saved-experiences screen, and that screen must remain part of the flow.
- From the result screen, `重新感应` must pop back to the existing compass route instead of replacing the result with a second compass entry; this prevents stacked duplicate routes and second-round loops.

## Prototype Instructions

Before implementing the numerology, compass-to-chakra, energy-synthesis, or course-recommendation system, read `docs/ENERGY_RECOMMENDATION_ENGINE_PLAN.md`. Keep deterministic calculations and retrieval rules in versioned, testable runtime modules; use model APIs only behind the HAF backend for grounded language synthesis and candidate reranking. Never place third-party API keys in the H5, mini-program bundle, source control, logs, screenshots, or analytics.

## HAF Domain Skills

- For any HAF Life Path, Personal Year, Personal Month, or Personal Day calculation, load and follow `skills/haf-numerology/SKILL.md`; run its deterministic script instead of doing arithmetic in a language model.
- For any HAF compass-to-seven-chakra projection, chakra visualization data, or chakra-based recommendation signal, load and follow `skills/haf-chakra-energy/SKILL.md`; describe its scores as the versioned HAF reflective model, never as a traditional, medical, or scientifically measured formula.
- For any result-page keyword, daily energy summary, chakra summary, or reflection prompt, load and follow `skills/haf-energy-synthesis/SKILL.md`; require matching outputs from the two upstream Skills and preserve its ranked keyword evidence. Its deterministic copy is the offline fallback and remains the factual source even if a language model later polishes the wording.
- For any three-course result recommendation, course-card fit reason, Demo catalog use, or future course/favorite API mapping, load and follow `skills/haf-course-recommendation/SKILL.md`. Select only published catalog records, keep price out of this flow, return exactly three diverse cards, and never invent benefits outside course metadata.
- Treat the project-local skill folders as the canonical source. Reuse their JSON schemas, model versions, reference notes, and tests when production runtime modules are added so the prototype and backend cannot drift into separate formulas.

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.
