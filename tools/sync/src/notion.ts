/**
 * Minimal Notion REST client. Deliberately dependency-free — this runs in CI
 * every night and the fewer moving parts between her edits and the app, the
 * better.
 */

const API = "https://api.notion.com/v1";

export interface NotionPage {
  id: string;
  properties: Record<string, any>;
  archived?: boolean;
  in_trash?: boolean;
}

export interface NotionConfig {
  token: string;
  /** Database id, or data source id when using the 2025-09-03 API. */
  sourceId: string;
  /**
   * "database" works with Notion-Version 2022-06-28 and queries
   * /databases/{id}/query. "data_source" is the 2025-09-03 shape.
   */
  sourceKind?: "database" | "data_source";
  notionVersion?: string;
}

export async function fetchAllRows(cfg: NotionConfig): Promise<NotionPage[]> {
  const kind = cfg.sourceKind ?? "database";
  const version = cfg.notionVersion ?? "2022-06-28";
  const path = kind === "data_source"
    ? `${API}/data_sources/${cfg.sourceId}/query`
    : `${API}/databases/${cfg.sourceId}/query`;

  const rows: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Notion-Version": version,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });

    if (!res.ok) {
      throw new Error(`Notion ${res.status} ${res.statusText}: ${await res.text()}`);
    }

    const body = (await res.json()) as { results: NotionPage[]; next_cursor: string | null; has_more: boolean };
    rows.push(...body.results.filter((p) => !p.archived && !p.in_trash));
    cursor = body.has_more && body.next_cursor ? body.next_cursor : undefined;
  } while (cursor);

  return rows;
}

/* ---- property readers ------------------------------------------------- */

export function readTitle(page: NotionPage, prop: string): string {
  const v = page.properties?.[prop];
  return (v?.title ?? []).map((t: any) => t.plain_text ?? "").join("").trim();
}

export function readText(page: NotionPage, prop: string): string {
  const v = page.properties?.[prop];
  return (v?.rich_text ?? []).map((t: any) => t.plain_text ?? "").join("").trim();
}

export function readMultiSelect(page: NotionPage, prop: string): string[] {
  const v = page.properties?.[prop];
  return (v?.multi_select ?? []).map((o: any) => String(o.name));
}

export function readSelect(page: NotionPage, prop: string): string | null {
  return page.properties?.[prop]?.select?.name ?? null;
}

export function readUrl(page: NotionPage, prop: string): string | null {
  return page.properties?.[prop]?.url ?? null;
}
