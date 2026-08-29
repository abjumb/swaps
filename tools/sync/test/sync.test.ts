import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { Matcher } from "@swaps/engine";
import { parseTier, slugify, splitList, toRow } from "../src/transform.js";
import { validate } from "../src/validate.js";
import { page } from "./fixtures.js";

const complete = {
  name: "Propylparaben",
  tier: ["🔴 AVOID"],
  status: "Live",
  herTake: "I skip these entirely.",
  appliesTo: ["Beauty & Skincare"],
};

describe("parseTier", () => {
  test("reads her emoji labels by their words", () => {
    assert.equal(parseTier(["🔴 AVOID"]), "AVOID");
    assert.equal(parseTier(["🟠 CAUTION"]), "CAUTION");
    assert.equal(parseTier(["🟡 LOW-CONCERN BUT NOT PERFECT"]), "LOW_CONCERN_NOT_PERFECT");
    assert.equal(parseTier(["🟢 LOW CONCERN"]), "LOW_CONCERN");
  });

  test("survives an emoji change in Notion", () => {
    assert.equal(parseTier(["avoid"]), "AVOID");
  });

  test("returns null when nothing is set", () => {
    assert.equal(parseTier([]), null);
  });
});

describe("splitList", () => {
  test("handles the trailing comma her synonym lists often have", () => {
    assert.deepEqual(splitList("DEHP, DBP, Euxyl K 400,"), ["DEHP", "DBP", "Euxyl K 400"]);
  });
});

describe("slugify", () => {
  test("gives family rows a stable id", () => {
    assert.equal(slugify("Laureth (4, 6, 9, etc.)"), "laureth-4-6-9-etc");
  });
});

describe("validation gate", () => {
  test("passes a complete live row", () => {
    const v = validate([toRow(page(complete))]);
    assert.equal(v.errors.length, 0);
    assert.equal(v.publishable.length, 1);
  });

  test("blocks a live row with no level of concern", () => {
    const v = validate([toRow(page({ ...complete, tier: [] }))]);
    assert.equal(v.publishable.length, 0);
    assert.match(v.errors[0].message, /no level of concern/);
  });

  test("blocks a live AVOID row with no her-take", () => {
    const v = validate([toRow(page({ ...complete, herTake: "" }))]);
    assert.equal(v.publishable.length, 0);
    assert.match(v.errors[0].message, /her take is required/);
  });

  test("allows a LOW CONCERN row without a her-take", () => {
    const v = validate([toRow(page({ ...complete, tier: ["🟢 LOW CONCERN"], herTake: "" }))]);
    assert.equal(v.errors.length, 0);
    assert.equal(v.publishable.length, 1);
  });

  test("blocks more than one level of concern", () => {
    const v = validate([toRow(page({ ...complete, tier: ["🔴 AVOID", "🟠 CAUTION"] }))]);
    assert.match(v.errors[0].message, /pick one/);
  });

  test("blocks a match pattern that does not compile", () => {
    const v = validate([toRow(page({ ...complete, pattern: "^laureth([0-9+$" }))]);
    assert.equal(v.publishable.length, 0);
    assert.match(v.errors[0].message, /not a valid regular expression/);
  });

  test("blocks two rows that reduce to the same id", () => {
    const v = validate([
      toRow(page({ ...complete, id: "a" })),
      toRow(page({ ...complete, id: "b", name: "propylparaben!" })),
    ]);
    assert.match(v.errors[0].message, /duplicate/);
  });

  test("an incomplete draft row is a to-do, not a blocker", () => {
    const v = validate([toRow(page({ ...complete, status: "Draft", tier: [], herTake: "" }))]);
    assert.equal(v.errors.length, 0);
    assert.ok(v.warnings.length > 0);
    assert.equal(v.publishable.length, 0);
  });

  test("counts progress across statuses", () => {
    const v = validate([
      toRow(page(complete)),
      toRow(page({ ...complete, id: "b", name: "Talc", status: "Draft" })),
      toRow(page({ ...complete, id: "c", name: "Toluene", status: null })),
    ]);
    assert.deepEqual(v.counts, { total: 3, live: 1, draft: 1, unset: 1 });
  });

  test("warns when a live row has no product categories", () => {
    const v = validate([toRow(page({ ...complete, appliesTo: [] }))]);
    assert.equal(v.errors.length, 0);
    assert.match(v.warnings[0].message, /no product categories/);
  });
});

describe("end to end", () => {
  test("published rows drive a real verdict", () => {
    const v = validate([
      toRow(page(complete)),
      toRow(page({
        id: "b", name: "Laureth (4, 6, 9, etc.)", tier: ["🟠 CAUTION"], status: "Live",
        herTake: "Ethoxylates carry a contamination risk.", pattern: "^laureth[- ]?\\d+$",
        appliesTo: ["Hair"],
      })),
    ]);
    assert.equal(v.errors.length, 0);

    const matcher = new Matcher({
      generatedAt: new Date().toISOString(), placeholder: false, ingredients: v.publishable,
    });

    assert.equal(matcher.scan("Water, Laureth-4").verdict, "yellow");
    assert.equal(matcher.scan("Water, Propylparaben").verdict, "red");
    assert.equal(matcher.scan("Water, Glycerin").verdict, "green");
  });
});
