/** The four tiers Rayna uses in Notion's "Level of Concern" column. */
export type Tier = "AVOID" | "CAUTION" | "LOW_CONCERN_NOT_PERFECT" | "LOW_CONCERN";

/** Only AVOID can drive a product to red. Everything else caps at yellow. */
export const RED_TIERS: readonly Tier[] = ["AVOID"];

export type Verdict = "green" | "yellow" | "red";

/** One row of the Toxic Ingredients database, as published by the sync. */
export interface Ingredient {
  /** Notion page id — stable across renames. */
  id: string;
  name: string;
  /** INCI and common synonyms, from "Other Names". */
  synonyms: string[];
  /** Regex source from "Match Pattern", for ingredient families. */
  pattern?: string;
  tier: Tier;
  healthConcerns: string[];
  /** Her own words. Required for anything that can produce a yellow. */
  herTake?: string;
  appliesTo: string[];
  sources: string[];
}

export interface RuleSet {
  /** ISO timestamp the sync produced this file. */
  generatedAt: string;
  /** True while any tier in the file is a stand-in rather than her judgment. */
  placeholder: boolean;
  ingredients: Ingredient[];
}

export type MatchKind = "exact" | "family" | "fuzzy";

export interface Match {
  ingredient: Ingredient;
  kind: MatchKind;
  /** The text on the label that produced this match. */
  foundAs: string;
  /** True when it came from a "may contain" / +/- section. */
  mayContain: boolean;
}

export interface ScanResult {
  verdict: Verdict;
  /** Confident matches. These decide the verdict. */
  hits: Match[];
  /** Fuzzy matches. Shown for confirmation; never decide the verdict. */
  maybes: Match[];
  /** Every parsed segment, in label order, with what it matched. */
  segments: { text: string; match: Match | null }[];
}
