import { SearchResults } from "@/components/search-results";
import type { SearchSort } from "@/lib/hn-algolia";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    sort?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const sort: SearchSort = params.sort === "date" ? "date" : "relevance";

  return <SearchResults query={query} sort={sort} />;
}
