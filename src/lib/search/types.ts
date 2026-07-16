export type SearchResultKind = "lot" | "sale" | "feeding";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  counts: {
    lots: number;
    sales: number;
    feedings: number;
  };
}
