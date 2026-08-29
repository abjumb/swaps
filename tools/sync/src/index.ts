import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { RuleSet } from "@swaps/engine";
import { fetchAllRows } from "./notion.js";
import { toRow } from "./transform.js";
import { formatReport, validate } from "./validate.js";

/**
 * Reads the Toxic Ingredients database, validates it, and writes the file the
 * app fetches. Exits non-zero if anything marked Live is incomplete, so a
 * half-finished row can never reach a phone.
 *
 *   npm run sync            validate and write, failing on problems
 *   npm run report          print progress only, never fails, never writes
 */
async function main(): Promise<void> {
  const reportOnly = process.argv.includes("--report");

  const token = process.env.NOTION_TOKEN;
  const sourceId = process.env.NOTION_SOURCE_ID;
  if (!token || !sourceId) {
    console.error("Set NOTION_TOKEN and NOTION_SOURCE_ID. See tools/sync/README.md.");
    process.exit(2);
  }

  const out = resolve(process.env.SYNC_OUT ?? "data/ingredients.json");

  const rows = (await fetchAllRows({
    token,
    sourceId,
    sourceKind: (process.env.NOTION_SOURCE_KIND as "database" | "data_source") ?? "database",
    notionVersion: process.env.NOTION_VERSION,
  })).map(toRow);

  const result = validate(rows);
  console.log(formatReport(result));

  if (reportOnly) return;

  if (result.errors.length > 0) {
    console.error(
      `\nNot publishing. ${result.errors.length} live ` +
      `${result.errors.length === 1 ? "row is" : "rows are"} incomplete.`,
    );
    process.exit(1);
  }

  if (result.publishable.length === 0) {
    console.error("\nNot publishing: no rows are marked Live yet.");
    process.exit(1);
  }

  const ruleSet: RuleSet = {
    generatedAt: new Date().toISOString(),
    placeholder: false,
    ingredients: result.publishable.sort((a, b) => a.name.localeCompare(b.name)),
  };

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(ruleSet, null, 2) + "\n");
  console.log(`\nWrote ${result.publishable.length} ingredients to ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
