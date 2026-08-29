import { strict as assert } from "node:assert";
import { test, describe } from "node:test";
import { Matcher, editDistance, normalize, ocrVariants, segment, verdictFor } from "../src/index.js";
import { LABELS, rules } from "./fixtures.js";

const matcher = new Matcher(rules);
const namesOf = (ms: { ingredient: { name: string } }[]) => ms.map((m) => m.ingredient.name);

describe("normalize", () => {
  test("strips leading punctuation left by a 'may contain' split", () => {
    assert.equal(normalize(": CI 15850"), "ci 15850");
  });

  test("collapses case, whitespace and trailing punctuation", () => {
    assert.equal(normalize("  Sodium   LAURETH Sulfate.  "), "sodium laureth sulfate");
  });
});

describe("ocrVariants", () => {
  test("preserves a trailing grade number", () => {
    // Rewriting the 1 and 0 here would break the family pattern.
    assert.ok(ocrVariants("p0lyquaternium-10").includes("polyquaternium-10"));
  });

  test("offers rn->m as an alternative, never as the only reading", () => {
    const vs = ocrVariants("polyquaternium");
    assert.ok(vs.includes("polyquaternium"), "correct spelling must survive");
    assert.ok(vs.includes("polyquatemium"), "the rn->m reading is offered too");
  });
});

describe("segment", () => {
  test("separates 'may contain' items from declared ingredients", () => {
    const segs = segment(LABELS.lipstickMayContain);
    assert.equal(segs.filter((s) => !s.mayContain).length, 5);
    assert.ok(segs.some((s) => s.mayContain && s.text === "ci 15850"));
  });
});

describe("editDistance", () => {
  test("gives up past the bound instead of scoring", () => {
    assert.equal(editDistance("talc", "triethanolamine"), Infinity);
  });
});

describe("verdicts", () => {
  test("an AVOID ingredient makes the product red", () => {
    const r = matcher.scan(LABELS.drugstoreShampoo);
    assert.equal(r.verdict, "red");
    assert.ok(namesOf(r.hits).includes("Propylparaben"));
  });

  test("caution-only ingredients cap at yellow", () => {
    const r = matcher.scan(LABELS.cleanFaceCream);
    assert.equal(r.verdict, "yellow");
    assert.deepEqual(namesOf(r.hits), ["Phenoxyethanol"]);
  });

  test("nothing on the list is green", () => {
    const r = matcher.scan(LABELS.simpleCleanser);
    assert.equal(r.verdict, "green");
    assert.equal(r.hits.length, 0);
  });

  test("a 'may contain' item is reported but never decides the verdict", () => {
    const r = matcher.scan(LABELS.lipstickMayContain);
    const lake = r.hits.find((h) => h.ingredient.name === "Lake Dyes");
    assert.ok(lake, "Lake Dyes should be reported");
    assert.equal(lake!.mayContain, true);
    // Red here comes from Talc, which is declared — not from the pigments.
    assert.equal(verdictFor(r.hits.filter((h) => h.mayContain)), "green");
  });
});

describe("matching stages", () => {
  test("finds an ingredient hidden behind a synonym", () => {
    // DMDM Hydantoin is not a row name; it is a synonym of Formaldehyde.
    const r = matcher.scan("Water, DMDM Hydantoin");
    assert.deepEqual(namesOf(r.hits), ["Formaldehyde"]);
    assert.equal(r.hits[0].kind, "exact");
  });

  test("matches ingredient families the label spells with a number", () => {
    const r = matcher.scan("Laureth-4, Polyquaternium-10, PEG-100 Stearate");
    assert.equal(r.hits.length, 3);
    assert.ok(r.hits.every((h) => h.kind === "family"));
  });

  test("reads a colour index number as a lake dye", () => {
    const r = matcher.scan("CI 19140");
    assert.deepEqual(namesOf(r.hits), ["Lake Dyes"]);
  });

  test("prefers the canonical row over a family pattern", () => {
    // "paraben$" would also match, but the row itself must win.
    const r = matcher.scan("Methylparaben");
    assert.deepEqual(namesOf(r.hits), ["Methylparaben"]);
    assert.equal(r.hits[0].kind, "exact");
  });
});

describe("fuzzy matching is never authoritative", () => {
  const r = matcher.scan(LABELS.shampooAsOcrReadIt);

  test("recovers OCR-mangled ingredients", () => {
    const recovered = namesOf(r.maybes);
    for (const expected of [
      "Sodium Lauroyl Sarcosinate",
      "Cocamidopropyl Betaine",
      "Phenoxyethanol",
      "Polyquaternium (7, 10, etc.)",
    ]) {
      assert.ok(recovered.includes(expected), `expected to recover ${expected}`);
    }
  });

  test("keeps every fuzzy match out of the hit list", () => {
    assert.ok(r.hits.every((h) => h.kind !== "fuzzy"));
    assert.ok(r.maybes.every((m) => m.kind === "fuzzy"));
  });

  test("a fuzzy AVOID match alone cannot turn a product red", () => {
    // "Triclosam" is one edit from Triclosan, which is an AVOID ingredient.
    const only = matcher.scan("Water, Glycerin, Triclosam");
    assert.equal(only.verdict, "green");
    assert.equal(only.maybes.length, 1);
    assert.equal(only.maybes[0].ingredient.name, "Triclosan");
  });

  test("short words are never fuzzy matched", () => {
    // "Tolueme" is one edit from Toluene, but below the length floor a single
    // character carries too much weight to guess from.
    const r = matcher.scan("Water, Tolueme");
    assert.equal(r.maybes.length, 0);
  });
});

describe("robustness", () => {
  test("an empty label is green, not a crash", () => {
    assert.equal(matcher.scan("").verdict, "green");
  });

  test("a malformed pattern in the data cannot throw", () => {
    const bad = new Matcher({
      generatedAt: "", placeholder: true,
      ingredients: [{ id: "x", name: "X", synonyms: [], pattern: "([", tier: "AVOID",
        healthConcerns: [], appliesTo: [], sources: [] }],
    });
    assert.equal(bad.scan("water, glycerin").verdict, "green");
  });

  test("every segment is accounted for in the trace", () => {
    const r = matcher.scan(LABELS.drugstoreShampoo);
    assert.equal(r.segments.length, 18);
  });
});
