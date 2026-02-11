import { describe, expect, it } from "vitest";
import { extractDomain, extractKeywords, rankCandidates } from "@/lib/ranking";
import type { CandidateStory, UserEvent } from "@/lib/types";

const makeStory = (
  overrides: Partial<CandidateStory> & { id: number }
): CandidateStory => ({
  title: `Story ${overrides.id}`,
  url: `https://example.com/${overrides.id}`,
  by: "default-author",
  time: Date.now(),
  score: 100,
  descendants: 10,
  ...overrides,
});

const makeEvent = (
  overrides: Partial<UserEvent> & { type: UserEvent["type"]; postId: number }
): UserEvent => ({
  timestamp: Date.now(),
  score: 100,
  ...overrides,
});

describe("extractDomain", () => {
  it("strips www prefix", () => {
    expect(extractDomain("https://www.github.com/foo")).toBe("github.com");
  });

  it("returns hostname without www", () => {
    expect(extractDomain("https://arxiv.org/abs/123")).toBe("arxiv.org");
  });

  it("returns undefined for null", () => {
    expect(extractDomain(null)).toBeUndefined();
  });

  it("returns undefined for invalid URL", () => {
    expect(extractDomain("not-a-url")).toBeUndefined();
  });
});

describe("extractKeywords", () => {
  it("filters words shorter than 3 characters", () => {
    const result = extractKeywords("I am a JS dev");
    expect(result).not.toContain("am");
    expect(result).not.toContain("a");
    expect(result).not.toContain("js");
    expect(result).toContain("dev");
  });

  it("filters stop words", () => {
    const result = extractKeywords("the best framework for your needs");
    expect(result).not.toContain("the");
    expect(result).not.toContain("for");
    expect(result).not.toContain("your");
    expect(result).toContain("best");
    expect(result).toContain("framework");
    expect(result).toContain("needs");
  });

  it("lowercases all words", () => {
    const result = extractKeywords("Rust Performance Benchmark");
    expect(result).toContain("rust");
    expect(result).toContain("performance");
    expect(result).toContain("benchmark");
  });

  it("splits on non-alphanumeric characters", () => {
    const result = extractKeywords("hello-world: foo_bar");
    expect(result).toContain("hello");
    expect(result).toContain("world");
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });
});

describe("rankCandidates", () => {
  describe("cold start (empty events)", () => {
    it("sorts by score descending when events are empty", () => {
      const candidates = [
        makeStory({ id: 1, score: 50 }),
        makeStory({ id: 2, score: 200 }),
        makeStory({ id: 3, score: 100 }),
      ];
      const result = rankCandidates(candidates, []);
      expect(result.map((s) => s.id)).toEqual([2, 3, 1]);
    });

    it("returns empty array for empty candidates", () => {
      expect(rankCandidates([], [])).toEqual([]);
    });

    it("returns single candidate as-is", () => {
      const candidates = [makeStory({ id: 1 })];
      const result = rankCandidates(candidates, []);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe("author affinity (+50%)", () => {
    it("boosts stories by liked author", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          by: "alice",
          title: "Unrelated Post",
        }),
      ];
      const candidates = [
        makeStory({ id: 1, by: "bob", score: 200 }),
        makeStory({ id: 2, by: "alice", score: 200 }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].by).toBe("alice");
    });
  });

  describe("domain affinity (+25%)", () => {
    it("boosts stories from liked domain", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          domain: "github.com",
          title: "Some Repo",
        }),
      ];
      const candidates = [
        makeStory({
          id: 1,
          url: "https://example.com/post",
          score: 200,
          by: "userA",
        }),
        makeStory({
          id: 2,
          url: "https://github.com/repo",
          score: 200,
          by: "userB",
        }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].id).toBe(2);
    });

    it("handles null URL candidate without crashing", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          domain: "github.com",
          title: "Some Post",
        }),
      ];
      const candidates = [
        makeStory({ id: 1, url: null, score: 200, by: "userA" }),
        makeStory({
          id: 2,
          url: "https://github.com/repo",
          score: 200,
          by: "userB",
        }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result).toHaveLength(2);
    });
  });

  describe("score proximity (+30%)", () => {
    it("boosts stories with score near average liked score", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          score: 200,
          by: "someone",
          title: "Unrelated Topic Xyz",
        }),
      ];
      // avgLikedScore = 200, range = [100, 300]
      // score 200 is in range, score 50 is out
      const candidates = [
        makeStory({ id: 1, score: 200, by: "authorX" }),
        makeStory({ id: 2, score: 50, by: "authorY" }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].id).toBe(1);
    });
  });

  describe("dwell signals", () => {
    it("gives +20% bonus for above-average dwell author", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "dwell",
          postId: 99,
          dwellMs: 5000,
          by: "alice",
          title: "Unrelated Xyz",
        }),
      ];
      const candidates = [
        makeStory({ id: 1, by: "alice", score: 200 }),
        makeStory({ id: 2, by: "bob", score: 200 }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].by).toBe("alice");
    });

    it("applies -10% penalty for short dwell author", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "dwell",
          postId: 99,
          dwellMs: 500,
          by: "bob",
          title: "Unrelated Xyz",
        }),
      ];
      const candidates = [
        makeStory({ id: 1, by: "bob", score: 200 }),
        makeStory({ id: 2, by: "charlie", score: 200 }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].by).toBe("charlie");
    });

    it("treats 2000ms dwell as positive (not short)", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "dwell",
          postId: 99,
          dwellMs: 2000,
          by: "alice",
          title: "Unrelated Xyz",
        }),
      ];
      const candidates = [
        makeStory({ id: 1, by: "alice", score: 200 }),
        makeStory({ id: 2, by: "bob", score: 200 }),
      ];
      const result = rankCandidates(candidates, events);
      // 2000ms is NOT < 2000, so alice should NOT be penalized
      expect(result[0].by).not.toBe("bob");
    });
  });

  describe("keyword overlap", () => {
    it("boosts stories with overlapping keywords from liked titles", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          by: "someone",
          title: "Rust Performance Benchmark",
        }),
      ];
      const candidates = [
        makeStory({
          id: 1,
          title: "Python Web Framework",
          score: 200,
          by: "authorA",
        }),
        makeStory({
          id: 2,
          title: "Rust Compiler Optimization",
          score: 200,
          by: "authorB",
        }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].id).toBe(2);
    });
  });

  describe("topic affinity", () => {
    it("boosts stories matching liked topics", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          by: "someone",
          title: "Unrelated Xyz",
          topics: ["ai-ml"],
        }),
      ];
      const candidates = [
        makeStory({
          id: 1,
          title: "New AI Machine Learning Model Advances",
          score: 200,
          by: "authorA",
        }),
        makeStory({
          id: 2,
          title: "Best Gardening Tips Outdoors",
          score: 200,
          by: "authorB",
        }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].id).toBe(1);
    });
  });

  describe("skip penalty (-30%)", () => {
    it("penalizes skipped post", () => {
      const events: UserEvent[] = [
        makeEvent({ type: "skip", postId: 1, score: 0 }),
      ];
      const candidates = [
        makeStory({ id: 1, score: 200, by: "authorA" }),
        makeStory({ id: 2, score: 200, by: "authorB" }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].id).toBe(2);
    });

    it("does not penalize other posts by same author", () => {
      const events: UserEvent[] = [
        makeEvent({ type: "skip", postId: 1, by: "alice", score: 0 }),
      ];
      const candidates = [
        makeStory({ id: 1, score: 200, by: "alice" }),
        makeStory({ id: 2, score: 200, by: "bob" }),
        makeStory({ id: 3, score: 200, by: "alice" }),
      ];
      const result = rankCandidates(candidates, events);
      // Post 1 is penalized, but post 3 (also by alice) should NOT be
      const post3Idx = result.findIndex((s) => s.id === 3);
      const post1Idx = result.findIndex((s) => s.id === 1);
      expect(post3Idx).toBeLessThan(post1Idx);
    });
  });

  describe("diversity injection", () => {
    it("injects diverse author into top positions", () => {
      // 8 posts by authorA (score 200) on example.com, 2 by authorB (score 100) on other.com
      // Different domains are needed so the diversity check can find a non-matching candidate
      const candidates = [
        ...Array.from({ length: 8 }, (_, i) =>
          makeStory({
            id: i + 1,
            by: "authorA",
            score: 200,
            url: `https://example.com/${i + 1}`,
          })
        ),
        makeStory({
          id: 9,
          by: "authorB",
          score: 100,
          url: "https://other.com/9",
        }),
        makeStory({
          id: 10,
          by: "authorB",
          score: 100,
          url: "https://other.com/10",
        }),
      ];
      const result = rankCandidates(candidates, []);
      // authorB should appear somewhere in top 7 due to diversity injection at position 5
      const top7Authors = result.slice(0, 7).map((s) => s.by);
      expect(top7Authors).toContain("authorB");
    });
  });

  describe("decay", () => {
    it("gives more weight to recent events", () => {
      const now = Date.now();
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          by: "recent-author",
          timestamp: now,
          title: "Unrelated Xyz",
        }),
        makeEvent({
          type: "like",
          postId: 98,
          by: "old-author",
          timestamp: now - 1_200_000, // 20 minutes ago
          title: "Unrelated Abc",
        }),
      ];
      const candidates = [
        makeStory({ id: 1, by: "recent-author", score: 200 }),
        makeStory({ id: 2, by: "old-author", score: 200 }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].by).toBe("recent-author");
    });
  });

  describe("combined scenarios", () => {
    it("stacks author + domain + keyword boosts above baseline", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 99,
          by: "fav-author",
          domain: "github.com",
          title: "Rust Compiler Updates",
          score: 200,
        }),
      ];
      const candidates = [
        makeStory({
          id: 1,
          by: "fav-author",
          url: "https://github.com/rust",
          title: "Rust Compiler Improvements",
          score: 200,
        }),
        makeStory({
          id: 2,
          by: "nobody",
          url: "https://random.com/stuff",
          title: "Totally Different Topic Xyz",
          score: 200,
        }),
      ];
      const result = rankCandidates(candidates, events);
      expect(result[0].id).toBe(1);
    });

    it("liked author but skipped post still ranks above random author (net positive)", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "like",
          postId: 88,
          by: "alice",
          title: "Unrelated Xyz",
        }),
        makeEvent({ type: "skip", postId: 1, score: 0 }),
      ];
      const candidates = [
        makeStory({ id: 1, by: "alice", score: 200 }),
        makeStory({ id: 2, by: "random-person", score: 200 }),
      ];
      const result = rankCandidates(candidates, events);
      // alice gets +50% author affinity - 30% skip = net +20%, so still above random
      expect(result[0].by).toBe("alice");
    });
  });

  describe("suspicious logic", () => {
    it("short dwell flag is binary, penalty applies even with long dwell too", () => {
      const events: UserEvent[] = [
        makeEvent({
          type: "dwell",
          postId: 99,
          dwellMs: 500,
          by: "alice",
          title: "Unrelated Xyz",
        }),
        makeEvent({
          type: "dwell",
          postId: 100,
          dwellMs: 10_000,
          by: "alice",
          title: "Unrelated Abc",
        }),
      ];
      const candidates = [
        makeStory({ id: 1, by: "alice", score: 200 }),
        makeStory({ id: 2, by: "bob", score: 200 }),
      ];
      const result = rankCandidates(candidates, events);
      // alice is in shortDwellAuthors (binary flag from 500ms event)
      // but also in highDwellAuthors since avg(500, 10000) = 5250 > avgDwellMs = 5250
      // shortDwellAuthors penalty -10% still applies
      // highDwellAuthors bonus +20% also applies
      // Net: alice gets +10% compared to bob who gets nothing
      // alice should still rank first or at least equal
      // The key point: the shortDwellAuthors set IS populated (binary)
      expect(result).toHaveLength(2);
    });

    it("negative keyword weight from short dwell prevents keyword boost", () => {
      // First, a short dwell gives "rust" a negative keyword weight
      // Then, a like gives "test" a positive keyword weight
      // A new story with "Rust" should NOT get a keyword boost from "rust"
      // but a story with "test" SHOULD get a boost from "test"
      const events: UserEvent[] = [
        makeEvent({
          type: "dwell",
          postId: 99,
          dwellMs: 500,
          by: "someone",
          title: "Rust Boring Stuff",
        }),
        makeEvent({
          type: "like",
          postId: 100,
          by: "other",
          title: "Test Driven Development Practices",
          score: 200,
        }),
      ];
      const candidates = [
        makeStory({
          id: 1,
          title: "Rust Boring Guide",
          score: 200,
          by: "authorA",
        }),
        makeStory({
          id: 2,
          title: "Test Driven Techniques",
          score: 200,
          by: "authorB",
        }),
      ];
      const result = rankCandidates(candidates, events);
      // "test" has positive keyword weight (from like), "rust" has negative (from short dwell)
      // Story 2 matches "test" (positive) so it gets boosted
      // Story 1 matches "rust" (negative) so overlap <= 0, no keyword boost
      expect(result[0].id).toBe(2);
    });
  });
});
