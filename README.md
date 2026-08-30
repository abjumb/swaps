# Swaps

An ingredient scanner built on Rayna's own research. Point it at a product's
back label and it returns green, yellow or red — judged against her Notion
database, in her words.

```
packages/engine   the matching engine — shared by the app and the sync
tools/sync        Notion → validated ingredients.json
app               the iOS app (Expo)
data              generated rule files
```

New here? [CLAUDE.md](CLAUDE.md) is the agent/contributor context document;
[ROADMAP.md](ROADMAP.md) is where the product goes next.

## The rule that everything else protects

Only the **AVOID** tier can make a product red. Everything else caps at yellow.
That keeps AVOID a high bar Rayna sets per ingredient rather than one the
algorithm sets for her — and it stops every drugstore product coming back red.

And a fuzzy match **never** decides a verdict. It surfaces for confirmation.
Telling someone their moisturiser contains a carcinogen because OCR dropped a
character is the one failure that ends the app's credibility, and hers.

## Getting started

```sh
npm install
npm test          # 21 engine tests + 16 sync tests
```

### Sync from Notion

```sh
export NOTION_TOKEN=secret_xxx
export NOTION_SOURCE_ID=fd3e92a7bd138354bbaf01fa553f6674

npm run report -w @swaps/sync   # what's still missing — never fails
npm run sync                    # validate and write data/ingredients.json
```

`sync` exits non-zero if any row marked `Status = Live` is missing a Level of
Concern, is missing Her Take when the tier can produce a yellow, or has a Match
Pattern that doesn't compile. That's the quality gate, enforced by a machine
instead of by memory. Draft rows are her working space and are simply left out.

The nightly GitHub Action (`.github/workflows/sync.yml`) runs the engine tests,
runs the sync, and publishes the file to GitHub Pages. Set `NOTION_TOKEN` and
`NOTION_SOURCE_ID` as repository secrets and enable Pages.

### Run the app

Requires a Mac with Xcode. The camera and OCR need a native build — Expo Go
won't do.

```sh
cd app
npx expo install          # aligns versions with the installed Expo SDK
npx expo prebuild --clean
npx expo run:ios          # or open ios/ in Xcode
```

Point it at a different rules file with `EXPO_PUBLIC_RULES_URL`.

## Where the rules come from at runtime

1. the copy cached on the device from the last successful fetch
2. the copy bundled into the binary, so a fresh install works offline

A scan never waits on the network — a verdict has to be instant while someone
is standing in a shop. The refresh happens in the background for next launch.

## Known state

- **`data/ingredients.sample.json` is placeholder data.** `Level of Concern` is
  empty in all 88 Notion rows, so the tiers in it are stand-ins, not Rayna's
  judgment. The file is marked `"placeholder": true`. The real sync refuses to
  publish until she has filled the column in.
- **OCR uses ML Kit.** It works today on both platforms with no native module of
  our own. Apple's Vision framework reads small curved label type noticeably
  better; the upgrade is a thin native module behind `src/lib/ocr.ts`, which is
  why every caller goes through `readLabel()` rather than importing ML Kit.
- **No swap catalog.** The result screen shows the slot and the paid-link
  disclosure, but there's nothing behind it until her product database is
  readable.
- **No barcode yet.** Phase 03.
