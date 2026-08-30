# Swaps roadmap

Where the product goes from here. Phases follow the numbering already used in
the codebase (the README calls barcode "Phase 03"). Nothing below is allowed to
weaken the two invariants in [CLAUDE.md](CLAUDE.md): only AVOID makes red, and
a fuzzy match never decides a verdict.

## Phase 01 — Scanner MVP ✅ (shipped)

Camera → on-device OCR → engine verdict → result screen, with a type-the-list
fallback. Rules pipeline: Notion → validated sync → GitHub Pages → cached on
device, offline-first. Running on the iOS simulator today.

## Phase 02 — Real data & the swap catalog (in progress / next)

The app works; the content doesn't exist yet. This phase is mostly Rayna's,
with tooling support:

- **Fill Level of Concern in Notion.** All 88 rows are empty, so the published
  file is placeholder (`"placeholder": true`). The sync already refuses to
  publish until Live rows are complete — the gate is built, the data isn't.
  Tooling: keep `npm run report` useful as her progress dashboard.
- **Swap catalog.** The "HER SWAP" slot on ResultScreen is a stub. Needs her
  product-recommendation database made readable (second Notion DB → same
  sync/validate/publish pattern as ingredients), a category → product mapping,
  and the paid-link disclosure that's already designed into the UI.
- **Surface `placeholder: true` in the app.** While the rules are stand-ins,
  the verdict UI should say so rather than presenting placeholder tiers as her
  judgment.

## Phase 03 — Barcode scanning (planned)

Scan the front-of-pack barcode instead of (or before) OCR: look the product up
in an ingredients API (e.g. Open Beauty Facts), fall back to label OCR when
the product is unknown. The engine already accepts pasted/API text — `segment()`
was written for three input sources from day one — so this is mostly an app
feature plus an offline-tolerant lookup layer.

## Phase 04 — Better OCR & build hygiene (planned)

- **Apple Vision OCR module.** Vision reads small curved label type noticeably
  better than ML Kit. The seam already exists — every caller goes through
  `readLabel()` in `app/src/lib/ocr.ts` — so this is a thin native module
  exposing `VNRecognizeTextRequest`, swapped in behind that function. Also
  removes the ML-Kit-has-no-arm64-simulator-slice problem entirely.
- **Expo config plugin for the ios/ hand edits.** The generated `app/ios/`
  carries manual patches (SceneDelegate, Info.plist scene manifest, Podfile
  clamps) that `expo prebuild --clean` destroys. Porting them into a config
  plugin makes the native project reproducible from source.

## Recommended additions (Claude's five)

Suggested by Claude after reading the codebase — ordered by value-for-effort,
not priority-decided. Each one builds on a seam that already exists.

1. **Category-aware verdicts.** `appliesTo` is synced and validated but never
   used: the validator even warns "this will fire on every product type". Ask
   the product category once (the ResultScreen already has the "What kind of
   product is this?" prompt for swaps) and filter or annotate matches with it.
   Small engine change, big precision win — and it's the same category signal
   the swap catalog needs anyway.

2. **Confirm-a-maybe flow.** Fuzzy matches rightly never decide the verdict,
   but today they dead-end at "check the label". Let the user tap a possible
   match to confirm "yes, the label says this", then recompute the verdict
   with it as a confirmed hit. Keeps the invariant (a human decided, not the
   algorithm) while making the maybes actionable.

3. **Scan history.** On-device only, consistent with "nothing is uploaded":
   store past scans (label text, verdict, hits) so someone can check what they
   found in the shop last week. Natural extension of the existing
   `expo-file-system` cache; no backend, no privacy change.

4. **Shareable result card.** Render a verdict as an image (product verdict,
   the ingredients on her list, her take) for sharing to stories/messages.
   This is the growth loop — Rayna's audience is the distribution channel —
   and it's pure UI over the existing `ScanResult`.

5. **Android release.** The engine is platform-neutral, Expo targets both
   platforms, and ML Kit's simulator problem is iOS-only — Android is mostly
   build/QA work plus a Play listing. Doubles the reachable audience for one
   codebase; sequence it after Phase 02 so it launches with real data.

## Explicitly not planned

- Any server that sees user scans. On-device OCR and matching is a product
  promise ("nothing is uploaded and nothing is stored"), not an implementation
  detail.
- Algorithmic severity. Tiers come from Rayna, per ingredient, in Notion.
