import type { NotionPage } from "../src/notion.js";

/** Build a Notion page shaped exactly as the REST API returns one. */
export function page(fields: {
  id?: string;
  name?: string;
  tier?: string[];
  status?: string | null;
  herTake?: string;
  synonyms?: string;
  pattern?: string;
  appliesTo?: string[];
  healthConcerns?: string[];
}): NotionPage {
  const text = (s?: string) => (s ? [{ plain_text: s }] : []);
  const opts = (v?: string[]) => (v ?? []).map((name) => ({ name }));
  return {
    id: fields.id ?? "11111111-1111-1111-1111-111111111111",
    properties: {
      "Ingredient Name": { title: text(fields.name) },
      "Other Names": { rich_text: text(fields.synonyms) },
      "Level of Concern": { multi_select: opts(fields.tier) },
      "Health Concerns": { multi_select: opts(fields.healthConcerns) },
      "Her Take": { rich_text: text(fields.herTake) },
      "Match Pattern": { rich_text: text(fields.pattern) },
      "Status": { select: fields.status === undefined ? null : fields.status ? { name: fields.status } : null },
      "Applies To": { multi_select: opts(fields.appliesTo) },
      "Sources": { rich_text: [] },
      "Article Links": { url: null },
    },
  };
}
