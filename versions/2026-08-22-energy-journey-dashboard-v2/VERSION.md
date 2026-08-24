# HAF Energy Journey + Dashboard V2

- Frozen on: 2026-08-22
- Status: preserved reference snapshot; do not edit in place
- Working H5: `/Users/yokichen/Documents/HAF_miniapp/haf-energy-journey-h5`
- Working dashboard: `/Users/yokichen/Documents/HAF_miniapp/haf-energy-dashboard`
- Snapshot: `/Users/yokichen/Documents/HAF_miniapp/versions/2026-08-22-energy-journey-dashboard-v2`

## Included

- Complete H5 source, protected mobile runtime, local Skills and production build
- Personal Day 1–9 returning greetings
- One-time profile, four-axis compass, synthesis and result flow
- Three grounded course recommendations and saved-experiences screen
- Fixed second-round re-sense behavior
- Minimal analytics events for unique visitors and successful favorites
- Standalone lightweight live dashboard and local event collector
- Product, algorithm, analytics, integration and next-iteration documentation

## Deliberately excluded

- `node_modules`
- Local dashboard test events in `data/events.jsonl`
- Secrets and API keys

Dependencies can be restored from the lockfile. The dashboard uses only Node.js built-ins.

## Verification at freeze

- Mobile runtime integrity check passed for all 28 protected files
- H5 TypeScript and production build passed
- Daily returning greeting rendered from Personal Day
- One H5 visitor produced one unique dashboard visitor
- One successful favorite produced one favorite user and one total favorite
- No H5 or dashboard console errors were present

All future UI/UX work must be made in the working copies or a new version folder. This snapshot is the V2 recovery point.

