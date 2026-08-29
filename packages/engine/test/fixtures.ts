import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RuleSet } from "../src/types.js";

/** Walk up to the repo root so this resolves from src and from dist-test alike. */
function findFixture(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "data", "ingredients.sample.json");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error("data/ingredients.sample.json not found — run the sync or generator first");
}

export const rules: RuleSet = JSON.parse(readFileSync(findFixture(), "utf8"));

/**
 * Representative ingredient lists. These are typical formulations, not any
 * named product's actual formula — the real corpus in Phase 01 is 50 real
 * labels photographed on a shelf with their text typed out by hand.
 */
export const LABELS = {
  drugstoreShampoo:
    "Water (Aqua), Sodium Laureth Sulfate, Cocamidopropyl Betaine, Sodium Chloride, " +
    "Glycol Distearate, Fragrance (Parfum), Dimethicone, Sodium Benzoate, " +
    "Guar Hydroxypropyltrimonium Chloride, Citric Acid, Methylparaben, Propylparaben, " +
    "Tetrasodium EDTA, Polyquaternium-10, Laureth-4, DMDM Hydantoin, Yellow 5, Red 33",

  cleanFaceCream:
    "Water, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Squalane, " +
    "Niacinamide, Sodium Hyaluronate, Phenoxyethanol, Tocopherol, Xanthan Gum, " +
    "Citric Acid, Ethylhexylglycerin",

  simpleCleanser:
    "Water, Coco-Glucoside, Glycerin, Sodium Citrate, Citric Acid, " +
    "Aloe Barbadensis Leaf Juice, Tocopherol, Lactic Acid",

  lipstickMayContain:
    "Ricinus Communis Seed Oil, Cera Alba, Candelilla Wax, Tocopherol, Silica Powder, " +
    "May Contain: CI 15850, CI 45370, Mica, Titanium Dioxide",

  shampooAsOcrReadIt:
    "S0DIUM LAUR0YL SARC0SINATE, C0CAMIDOPROPYL BETAINE, PHEN0XYETHAN0L, " +
    "FRAGRANCE (PARFUM), METHYLPARABEN, P0LYQUATERNIUM-10",
};
