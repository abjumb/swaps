import TextRecognition from "@react-native-ml-kit/text-recognition";

/**
 * On-device text recognition. Nothing leaves the phone.
 *
 * ML Kit is the pragmatic default: it works today on both platforms and needs
 * no native module of our own. Apple's Vision framework reads small curved
 * label type noticeably better, so the upgrade path is a thin native module
 * exposing VNRecognizeTextRequest and swapping it in behind this function —
 * which is why every caller goes through here rather than importing ML Kit.
 */
export async function readLabel(imageUri: string): Promise<string> {
  const result = await TextRecognition.recognize(imageUri);

  // Ingredient panels wrap mid-list, so joining blocks with a space (not a
  // newline) keeps "Sodium Laureth / Sulfate" as one ingredient. The engine
  // splits on commas, not lines.
  return result.blocks
    .map((b: { text: string }) => b.text.replace(/-\s*\n\s*/g, "").replace(/\s*\n\s*/g, " "))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ingredient panels usually announce themselves. When they do, everything
 * before the heading is marketing copy and only hurts matching.
 */
export function trimToIngredients(text: string): string {
  const m = text.match(/ingredients?\s*[:.]?\s*/i);
  return m && m.index !== undefined ? text.slice(m.index + m[0].length) : text;
}
