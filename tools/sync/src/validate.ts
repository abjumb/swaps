import type { Ingredient } from "@swaps/engine";
import { COLUMN, needsHerTake, Row } from "./transform.js";

export interface Problem {
  row: string;
  column: string;
  message: string;
}

export interface Validation {
  publishable: Ingredient[];
  errors: Problem[];
  warnings: Problem[];
  /** Row counts by Status, for the progress report. */
  counts: { total: number; live: number; draft: number; unset: number };
}

/**
 * The gate. A row marked Live must be complete, because Live means it reaches
 * someone standing in a shop deciding what to buy. Draft rows are her working
 * space and are simply left out of the published file.
 */
export function validate(rows: Row[]): Validation {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const publishable: Ingredient[] = [];
  const counts = { total: rows.length, live: 0, draft: 0, unset: 0 };

  const seenName = new Map<string, string>();

  for (const row of rows) {
    const isLive = row.status === "Live";
    if (isLive) counts.live++;
    else if (row.status === "Draft") counts.draft++;
    else counts.unset++;

    const label = row.name || `(untitled ${row.page.id.slice(0, 8)})`;
    const report = isLive ? errors : warnings;

    if (!row.name) {
      report.push({ row: label, column: COLUMN.name, message: "row has no ingredient name" });
      continue;
    }
    if (row.tierLabels.length === 0) {
      report.push({ row: label, column: COLUMN.tier, message: "no level of concern set" });
    } else if (row.tierLabels.length > 1) {
      report.push({
        row: label, column: COLUMN.tier,
        message: `${row.tierLabels.length} levels selected (${row.tierLabels.join(", ")}) — pick one`,
      });
    }

    const ing = row.ingredient;
    if (!ing) continue;

    if (needsHerTake(ing.tier) && !ing.herTake) {
      report.push({
        row: label, column: COLUMN.herTake,
        message: `tier ${ing.tier} can put this in front of a user — her take is required`,
      });
    }

    if (ing.pattern) {
      try {
        new RegExp(ing.pattern);
      } catch (e) {
        report.push({
          row: label, column: COLUMN.pattern,
          message: `not a valid regular expression: ${(e as Error).message}`,
        });
      }
    }

    if (ing.appliesTo.length === 0) {
      warnings.push({
        row: label, column: COLUMN.appliesTo,
        message: "no product categories — this will fire on every product type",
      });
    }

    const prior = seenName.get(ing.id);
    if (prior) {
      report.push({
        row: label, column: COLUMN.name,
        message: `duplicate of "${prior}" — both reduce to id "${ing.id}"`,
      });
    } else {
      seenName.set(ing.id, ing.name);
    }

    if (isLive && !errors.some((e) => e.row === label)) publishable.push(ing);
  }

  return { publishable, errors, warnings, counts };
}

export function formatReport(v: Validation): string {
  const lines: string[] = [];
  const { counts } = v;
  lines.push(
    `${counts.total} rows — ${counts.live} live, ${counts.draft} draft, ${counts.unset} with no status`,
  );
  lines.push(`${v.publishable.length} ready to publish`);

  if (v.errors.length) {
    lines.push("", `BLOCKING (${v.errors.length}) — live rows that are not ready:`);
    for (const p of v.errors) lines.push(`  ${p.row} · ${p.column}: ${p.message}`);
  }
  if (v.warnings.length) {
    lines.push("", `Still to do (${v.warnings.length}) — draft rows, not blocking:`);
    for (const p of v.warnings.slice(0, 40)) lines.push(`  ${p.row} · ${p.column}: ${p.message}`);
    if (v.warnings.length > 40) lines.push(`  …and ${v.warnings.length - 40} more`);
  }
  return lines.join("\n");
}
