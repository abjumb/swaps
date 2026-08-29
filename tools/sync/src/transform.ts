import type { Ingredient, Tier } from "@swaps/engine";
import {
  NotionPage, readMultiSelect, readSelect, readText, readTitle, readUrl,
} from "./notion.js";

/** Column names in the Toxic Ingredients database. */
export const COLUMN = {
  name: "Ingredient Name",
  synonyms: "Other Names",
  tier: "Level of Concern",
  healthConcerns: "Health Concerns",
  herTake: "Her Take",
  pattern: "Match Pattern",
  status: "Status",
  appliesTo: "Applies To",
  sources: "Sources",
  articleLink: "Article Links",
} as const;

/**
 * Her tier labels carry emoji. Match on the words so a cosmetic edit in
 * Notion — swapping an emoji, fixing capitalisation — never breaks the build.
 */
export function parseTier(labels: string[]): Tier | null {
  for (const raw of labels) {
    const s = raw.toUpperCase();
    if (s.includes("AVOID")) return "AVOID";
    if (s.includes("CAUTION")) return "CAUTION";
    if (s.includes("NOT PERFECT")) return "LOW_CONCERN_NOT_PERFECT";
    if (s.includes("LOW CONCERN")) return "LOW_CONCERN";
  }
  return null;
}

/** Only these tiers put an ingredient in front of a user with an opinion attached. */
export function needsHerTake(tier: Tier): boolean {
  return tier !== "LOW_CONCERN";
}

export function splitList(value: string): string[] {
  return value
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export interface Row {
  page: NotionPage;
  status: string | null;
  name: string;
  ingredient: Ingredient | null;
  /** Raw tier labels, kept so the validator can explain what it saw. */
  tierLabels: string[];
}

export function toRow(page: NotionPage): Row {
  const name = readTitle(page, COLUMN.name);
  const tierLabels = readMultiSelect(page, COLUMN.tier);
  const tier = parseTier(tierLabels);
  const status = readSelect(page, COLUMN.status);

  if (!name || !tier) return { page, status, name, ingredient: null, tierLabels };

  const pattern = readText(page, COLUMN.pattern);
  const herTake = readText(page, COLUMN.herTake);
  const sources = splitList(readText(page, COLUMN.sources));
  const link = readUrl(page, COLUMN.articleLink);
  if (link) sources.push(link);

  return {
    page,
    status,
    name,
    tierLabels,
    ingredient: {
      id: slugify(name) || page.id,
      name,
      synonyms: splitList(readText(page, COLUMN.synonyms)),
      ...(pattern ? { pattern } : {}),
      tier,
      healthConcerns: readMultiSelect(page, COLUMN.healthConcerns),
      ...(herTake ? { herTake } : {}),
      appliesTo: readMultiSelect(page, COLUMN.appliesTo),
      sources,
    },
  };
}
