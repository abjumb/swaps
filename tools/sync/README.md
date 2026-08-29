# @swaps/sync

Reads the **Toxic Ingredients** database in Notion, validates it, and writes
`data/ingredients.json` — the file the app fetches on launch.

## Setup

1. Create an internal integration at <https://www.notion.so/my-integrations>
   and copy its secret.
2. Open the *Ingredients to Avoid* page in Notion → `···` → **Connections** →
   add the integration. Without this the API returns 404, not 403.
3. Copy the database id from the URL of the inline database.

```sh
export NOTION_TOKEN=secret_xxx
export NOTION_SOURCE_ID=fd3e92a7bd138354bbaf01fa553f6674

npm run report   # what's still missing — never fails, never writes
npm run sync     # validate and write, exits 1 if a Live row is incomplete
```

On the 2025-09-03 API version, databases are addressed through data sources:

```sh
export NOTION_VERSION=2025-09-03
export NOTION_SOURCE_KIND=data_source
export NOTION_SOURCE_ID=7a8e92a7-bd13-83a2-9f8a-87090ee9be4a
```

## What blocks a publish

A row marked `Status = Live` must have:

- exactly one **Level of Concern**
- **Her Take** written, unless the tier is `LOW CONCERN`
- a **Match Pattern** that compiles, if one is set
- a name that doesn't collide with another row

Draft rows are her working space: they're reported as "still to do" and left
out of the published file. That's the mechanism that lets her research inside
the same database the app reads.
