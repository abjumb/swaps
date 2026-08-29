/**
 * Label text arrives from three places — OCR, a paste, or a product API — and
 * all three are messy in different ways. Everything downstream assumes text
 * has been through here first.
 */

/** Lowercase, strip decoration, collapse whitespace. Lossless for matching. */
export function normalize(input: string): string {
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[‘’“”]/g, "")
    .replace(/^[\s.,;:*±-]+/, "")
    .replace(/[\s.,;:*±]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Candidate spellings for a segment that OCR may have mangled.
 *
 * Two rules earn their place here, both learned the hard way:
 *
 * 1. A trailing grade number (Laureth-4, Polyquaternium-10) is held back
 *    before substitution. Those digits are real; rewriting 1 to l turns
 *    "polyquaternium-10" into "polyquaternium-lo" and the family match dies.
 *
 * 2. rn -> m is applied as a *separate variant*, never chained onto the
 *    others. Applied blindly it corrupts correctly-spelled words —
 *    "polyquaternium" contains "rn" and becomes "polyquatemium".
 */
export function ocrVariants(segment: string): string[] {
  const m = segment.match(/^(.*?)([- ]?\d+)$/);
  const head = m ? m[1] : segment;
  const tail = m ? m[2] : "";

  const digits = head.replace(/0/g, "o").replace(/1/g, "l").replace(/5/g, "s");
  const withRn = digits.replace(/rn/g, "m");

  return digits === withRn ? [digits + tail] : [digits + tail, withRn + tail];
}

export interface Segment {
  text: string;
  /**
   * From a "may contain" or +/- section. These ingredients are permitted in
   * the product line but may not be in the specific unit someone is holding,
   * so they are reported but never decide the verdict.
   */
  mayContain: boolean;
}

/** Split a raw ingredient list into individual ingredient segments. */
export function segment(raw: string): Segment[] {
  const parts = raw.split(/may contain|\+\/-|±/i);
  const declared = parts[0] ?? "";
  const conditional = parts.length > 1 ? parts.slice(1).join(" ") : "";

  const split = (text: string): string[] =>
    text
      .split(/[,;\n•·]+/)
      .map(normalize)
      .filter((s) => s.length > 1);

  return [
    ...split(declared).map((text) => ({ text, mayContain: false })),
    ...split(conditional).map((text) => ({ text, mayContain: true })),
  ];
}

/**
 * A segment can name an ingredient more than one way: "Water (Aqua)" should
 * try the whole string, the outer name, and the parenthetical.
 */
export function candidates(text: string): string[] {
  const out = [text];
  const m = text.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (m) {
    if (m[1]) out.push(m[1].trim());
    if (m[2]) out.push(m[2].trim());
  }
  return out.filter(Boolean);
}
