import type { CandidateStory } from "@/lib/types";

const ALGOLIA_API = "https://hn.algolia.com/api/v1";

export type SearchSort = "relevance" | "date";

export interface SearchParams {
  query: string;
  sort?: SearchSort;
  page?: number;
  hitsPerPage?: number;
}

export interface SearchResult {
  hits: CandidateStory[];
  nbHits: number;
  nbPages: number;
  page: number;
  hitsPerPage: number;
}

interface AlgoliaHit {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  _tags: string[];
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  nbPages: number;
  page: number;
  hitsPerPage: number;
}

const toCandidate = (hit: AlgoliaHit): CandidateStory => ({
  id: Number.parseInt(hit.objectID, 10),
  title: hit.title ?? "",
  url: hit.url || null,
  by: hit.author ?? "",
  time: hit.created_at_i,
  score: hit.points ?? 0,
  descendants: hit.num_comments ?? 0,
});

export const searchStories = async (
  params: SearchParams
): Promise<SearchResult> => {
  const { query, sort = "relevance", page = 0, hitsPerPage = 20 } = params;

  const endpoint = sort === "date" ? "search_by_date" : "search";
  const url = new URL(`${ALGOLIA_API}/${endpoint}`);
  url.searchParams.set("query", query);
  url.searchParams.set("tags", "story");
  url.searchParams.set("page", String(page));
  url.searchParams.set("hitsPerPage", String(hitsPerPage));

  const res = await fetch(url.toString());
  if (!res.ok) {
    return { hits: [], nbHits: 0, nbPages: 0, page: 0, hitsPerPage };
  }

  const data: AlgoliaResponse = await res.json();
  return {
    hits: data.hits.map(toCandidate).filter((h) => h.title && h.id > 0),
    nbHits: data.nbHits,
    nbPages: data.nbPages,
    page: data.page,
    hitsPerPage: data.hitsPerPage,
  };
};
