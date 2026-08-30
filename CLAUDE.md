# Swaps — agent context

Read this before touching anything. It's the map; the README is the tour.

Swaps is an ingredient scanner built on Rayna's research. Point the iOS app at
a product's back label, it OCRs the ingredient list on-device, matches it
against her Notion database, and returns green / yellow / red — in her words.

## The two invariants everything protects

1. **Only the `AVOID` tier can make a product red.** Every other tier caps at
   yellow. `RED_TIERS` in `packages/engine/src/types.ts` is the single source
   of truth. This keeps "red" a bar Rayna sets per ingredient, not one the
   algorithm sets for her.
2. **A fuzzy match never decides a verdict.** Fuzzy hits go to `maybes` and are
   shown for user confirmation only. Telling someone their moisturiser contains
   a carcinogen because OCR dropped a character is the failure that ends the
   app's credibility.

If a change would weaken either invariant, stop and ask.

## Monorepo layout (npm workspaces)

| Path | Package | What it is |
|---|---|---|
| `packages/engine` | `@swaps/engine` | Zero-dependency matching engine. Shared by app and sync. |
| `tools/sync` | `@swaps/sync` | Notion → validated `data/ingredients.json`. The quality gate. |
| `app` | — | Expo / React Native iOS app. Camera, OCR, two screens. |
| `data` | — | Generated rule files. `ingredients.sample.json` is placeholder. |

TypeScript throughout, ESM with explicit `.js` import suffixes in `packages/`
and `tools/`. The engine has no runtime dependencies — keep it that way; it
runs identically in Node (sync/CI) and Hermes (app).

## Data flow

```
Notion "Toxic Ingredients" DB
  → tools/sync (fetch → transform → validate; exits 1 if a Live row is incomplete)
  → data/ingredients.json → GitHub Pages (nightly Action, .github/workflows/sync.yml)
  → app fetches https://abjumb.github.io/swaps/ingredients.json in the background
  → device cache, falling back to the copy bundled at app/assets/ingredients.json
  → Matcher.scan(labelText) → verdict
```

A scan never waits on the network. `app/src/lib/rules.ts` loads cache-then-
bundle instantly and refreshes the cache quietly for next launch.

## Engine mechanics (`packages/engine/src`)

- `normalize.ts` — all label text (OCR, paste, future product API) passes
  through here first. `segment()` splits the list and marks "may contain" /
  `+/-` sections; those matches are reported but never decide the verdict.
  `ocrVariants()` encodes hard-won OCR rules (digit substitutions hold back
  trailing grade numbers like Laureth-4; `rn→m` is a separate variant, never
  chained).
- `match.ts` — `Matcher` matches each segment in strict order: **exact →
  family regex (`pattern`) → fuzzy** (bounded edit distance ≤ 2, only on
  strings ≥ 8 chars). First hit wins; earlier stages are more trustworthy.
  `verdictFor()` implements invariant #1.
- `types.ts` — `Ingredient`, `RuleSet`, `ScanResult`. A `RuleSet` with
  `placeholder: true` means the tiers are stand-ins, not Rayna's judgment.

## Sync gate (`tools/sync/src`)

A Notion row with `Status = Live` must have exactly one Level of Concern, Her
Take (unless tier is LOW CONCERN), a compiling Match Pattern if set, and a
non-colliding name — or `npm run sync` exits non-zero and nothing publishes.
Draft rows are her working space: reported, never published. `npm run report`
prints progress and never fails. Column names live in `COLUMN` in
`transform.ts`; tier labels are matched on words, not emoji.

## App structure (`app/`)

No navigation library — `App.tsx` is a tiny state machine: `ScanScreen`
(camera or type-the-list fallback) → `ResultScreen`. All OCR goes through
`readLabel()` in `src/lib/ocr.ts` so ML Kit can later be swapped for Apple's
Vision framework without touching callers. Styling comes from `src/theme.ts`.
Point the app at a different rules file with `EXPO_PUBLIC_RULES_URL`.

## Commands

```sh
npm install
npm test                        # engine + sync test suites (node:test)
npm run sync                    # needs NOTION_TOKEN + NOTION_SOURCE_ID
npm run report -w @swaps/sync   # progress only, never fails
```

## iOS build — read before building

The README's `npx expo run:ios` does **not** work on this machine. The working
recipe (xcodebuild against `app/ios/Swaps.xcworkspace`, then `simctl install`)
lives in Claude's project memory (`swaps-ios-build.md`). Repo-level truths:

- **ML Kit is excluded from iOS simulator builds** via
  `app/react-native.config.js` — Google ships no arm64-simulator slice.
  ScanScreen degrades to "type the list instead" in the sim. Delete that
  config before a real-device build to restore OCR.
- **The generated `app/ios/` directory (gitignored) carries hand edits** that
  `expo prebuild --clean` destroys: Podfile deployment-target clamp,
  Info.plist `UIApplicationSceneManifest`, and a SceneDelegate in
  AppDelegate.mm (iOS 27 hard-requires the UIScene lifecycle). Re-apply after
  any prebuild, or better: port them into a config plugin (see ROADMAP.md).
- Root `overrides` pin react / react-native / expo. If versions drift:
  `rm -rf node_modules package-lock.json && npm install`.

## Known state / current gaps

- `data/ingredients.sample.json` and the bundled `app/assets/ingredients.json`
  are **placeholder data** (`"placeholder": true`) — Level of Concern is empty
  in all Notion rows, so the real sync refuses to publish until Rayna fills it.
- The "HER SWAP" slot on ResultScreen is a stub; there is no swap catalog yet.
- No barcode scanning yet (Phase 03 — see ROADMAP.md).
- `appliesTo` is synced and validated but the app never asks the product
  category, so every rule fires on every product type.
