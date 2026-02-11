import { afterEach, describe, expect, it, vi } from "vitest";
import { searchStories } from "@/lib/hn-algolia";

const makeHit = (overrides: Record<string, unknown> = {}) => ({
  objectID: "123",
  title: "Test Story",
  url: "https://example.com",
  author: "testuser",
  points: 42,
  num_comments: 5,
  created_at_i: 1_700_000_000,
  _tags: ["story"],
  ...overrides,
});

const mockResponse = (body: unknown) => Response.json(body);

describe("searchStories", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps Algolia hits to CandidateStory", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse({
        hits: [makeHit()],
        nbHits: 1,
        nbPages: 1,
        page: 0,
        hitsPerPage: 20,
      })
    );

    const result = await searchStories({ query: "test" });

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]).toEqual({
      id: 123,
      title: "Test Story",
      url: "https://example.com",
      by: "testuser",
      time: 1_700_000_000,
      score: 42,
      descendants: 5,
    });
  });

  it("uses search endpoint for relevance sort", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse({
        hits: [],
        nbHits: 0,
        nbPages: 0,
        page: 0,
        hitsPerPage: 20,
      })
    );

    await searchStories({ query: "rust", sort: "relevance" });

    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/v1/search");
    expect(url.searchParams.get("query")).toBe("rust");
    expect(url.searchParams.get("tags")).toBe("story");
  });

  it("uses search_by_date endpoint for date sort", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse({
        hits: [],
        nbHits: 0,
        nbPages: 0,
        page: 0,
        hitsPerPage: 20,
      })
    );

    await searchStories({ query: "rust", sort: "date" });

    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/v1/search_by_date");
  });

  it("returns empty result on fetch error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 })
    );

    const result = await searchStories({ query: "fail" });

    expect(result.hits).toEqual([]);
    expect(result.nbHits).toBe(0);
  });

  it("filters hits with missing title or invalid ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse({
        hits: [
          makeHit({ objectID: "abc", title: "" }),
          makeHit({ objectID: "0", title: "Valid" }),
          makeHit({ objectID: "456", title: "Good Story" }),
        ],
        nbHits: 3,
        nbPages: 1,
        page: 0,
        hitsPerPage: 20,
      })
    );

    const result = await searchStories({ query: "test" });

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].id).toBe(456);
  });

  it("handles null points and num_comments", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse({
        hits: [makeHit({ points: null, num_comments: null })],
        nbHits: 1,
        nbPages: 1,
        page: 0,
        hitsPerPage: 20,
      })
    );

    const result = await searchStories({ query: "test" });

    expect(result.hits[0].score).toBe(0);
    expect(result.hits[0].descendants).toBe(0);
  });
});
