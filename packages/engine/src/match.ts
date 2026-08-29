import type { Ingredient, Match, RuleSet, ScanResult, Tier, Verdict } from "./types.js";
import { RED_TIERS } from "./types.js";
import { candidates, normalize, ocrVariants, segment } from "./normalize.js";

/** Bounded edit distance. Returns Infinity once the gap exceeds `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return Infinity;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  const d = prev[b.length];
  return d > max ? Infinity : d;
}

/** Fuzzy matching is only attempted on strings this long or longer. */
const MIN_FUZZY_LENGTH = 8;

export class Matcher {
  private readonly exact = new Map<string, Ingredient>();
  private readonly families: { ingredient: Ingredient; re: RegExp }[] = [];

  constructor(private readonly rules: RuleSet) {
    for (const ing of rules.ingredients) {
      this.exact.set(normalize(ing.name), ing);
      for (const syn of ing.synonyms) {
        const key = normalize(syn);
        // First writer wins: a canonical name must never be displaced by
        // another ingredient listing it as a synonym.
        if (key && !this.exact.has(key)) this.exact.set(key, ing);
      }
      if (ing.pattern) {
        try {
          this.families.push({ ingredient: ing, re: new RegExp(ing.pattern) });
        } catch {
          // A bad regex in Notion must never take the app down. The sync
          // validator rejects these before publish; this is belt and braces.
        }
      }
    }
  }

  /**
   * Match one segment. Strict order: exact, then family patterns, then fuzzy.
   * Returns the first hit — earlier stages are more trustworthy than later.
   */
  matchSegment(seg: { text: string; mayContain: boolean }): Match | null {
    const cands = candidates(seg.text);

    for (const c of cands) {
      const hit = this.exact.get(c);
      if (hit) return { ingredient: hit, kind: "exact", foundAs: c, mayContain: seg.mayContain };
    }

    for (const c of cands) {
      for (const { ingredient, re } of this.families) {
        if (re.test(c)) {
          return { ingredient, kind: "family", foundAs: c, mayContain: seg.mayContain };
        }
      }
    }

    for (const c of cands) {
      for (const variant of ocrVariants(c)) {
        if (variant.length < MIN_FUZZY_LENGTH) continue;

        const direct = this.exact.get(variant);
        if (direct) {
          return { ingredient: direct, kind: "fuzzy", foundAs: c, mayContain: seg.mayContain };
        }
        for (const { ingredient, re } of this.families) {
          if (re.test(variant)) {
            return { ingredient, kind: "fuzzy", foundAs: c, mayContain: seg.mayContain };
          }
        }
        let best: Ingredient | null = null;
        let bestDistance = 3;
        for (const [key, ing] of this.exact) {
          const d = editDistance(variant, key);
          if (d < bestDistance) {
            bestDistance = d;
            best = ing;
          }
        }
        if (best) {
          return { ingredient: best, kind: "fuzzy", foundAs: c, mayContain: seg.mayContain };
        }
      }
    }

    return null;
  }

  scan(rawLabel: string): ScanResult {
    const segments = segment(rawLabel);
    const hits: Match[] = [];
    const maybes: Match[] = [];
    const seen = new Set<string>();
    const trace: ScanResult["segments"] = [];

    for (const seg of segments) {
      const match = this.matchSegment(seg);
      trace.push({ text: seg.text, match });
      if (!match) continue;

      // A guess never counts toward a verdict. Someone being told their
      // moisturizer contains a carcinogen because OCR dropped a character
      // is the one failure that ends the app's credibility.
      if (match.kind === "fuzzy") {
        maybes.push(match);
        continue;
      }

      const key = `${match.ingredient.id}|${match.mayContain}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(match);
    }

    hits.sort(byMayContainThenTier);

    return { verdict: verdictFor(hits), hits, maybes, segments: trace };
  }
}

const TIER_ORDER: Record<Tier, number> = {
  AVOID: 0,
  CAUTION: 1,
  LOW_CONCERN_NOT_PERFECT: 2,
  LOW_CONCERN: 3,
};

function byMayContainThenTier(a: Match, b: Match): number {
  if (a.mayContain !== b.mayContain) return a.mayContain ? 1 : -1;
  return TIER_ORDER[a.ingredient.tier] - TIER_ORDER[b.ingredient.tier];
}

/**
 * Worst ingredient wins, with the severity tier doing the counting.
 *
 * This is the reconciliation of "red means several bad ingredients" with
 * "worst ingredient wins": only the AVOID tier can produce red, so AVOID
 * stays a deliberately high bar she sets per ingredient rather than one the
 * algorithm sets for her.
 */
export function verdictFor(hits: Match[]): Verdict {
  const deciding = hits.filter((h) => !h.mayContain);
  if (deciding.some((h) => RED_TIERS.includes(h.ingredient.tier))) return "red";
  return deciding.length > 0 ? "yellow" : "green";
}
