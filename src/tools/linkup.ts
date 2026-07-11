/** Minimal Linkup Search client used by the Local Scout. */

export interface LinkupSearchResult {
  name?: string;
  url?: string;
  content?: string;
}

export interface LinkupSearch {
  search(query: string, depth?: "fast" | "standard" | "deep"): Promise<LinkupSearchResult[]>;
}

type Fetcher = typeof fetch;

/**
 * Uses Linkup's public Search API rather than exposing the secret in a URL.
 * The same `LINKUP_API_KEY` also configures the supplied Linkup MCP server.
 */
export class LinkupSearchClient implements LinkupSearch {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly endpoint = "https://api.linkup.so/v1/search",
  ) {}

  async search(query: string, depth: "fast" | "standard" | "deep" = "fast"): Promise<LinkupSearchResult[]> {
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        depth,
        outputType: "searchResults",
        maxResults: 8,
      }),
    });
    if (!response.ok) {
      throw new Error(`Linkup search failed (${response.status})`);
    }

    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !Array.isArray((body as { results?: unknown }).results)) {
      throw new Error("Linkup search returned an invalid response");
    }
    return (body as { results: unknown[] }).results.flatMap((result) => {
      if (!result || typeof result !== "object") return [];
      const value = result as Record<string, unknown>;
      return [{
        name: typeof value.name === "string" ? value.name : undefined,
        url: typeof value.url === "string" ? value.url : undefined,
        content: typeof value.content === "string" ? value.content : undefined,
      }];
    });
  }
}

export function createLinkupSearch(): LinkupSearch | null {
  const apiKey = process.env.LINKUP_API_KEY?.trim();
  return apiKey ? new LinkupSearchClient(apiKey) : null;
}
