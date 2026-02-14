import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/lib/hn-rate-limit";

describe("hn-rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit("sess-a", "write");
    expect(result.allowed).toBe(true);
  });

  it("blocks writes after 10 in a minute", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("sess-b", "write").allowed).toBe(true);
    }
    const blocked = checkRateLimit("sess-b", "write");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("blocks reads after 30 in a minute", () => {
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit("sess-c", "read").allowed).toBe(true);
    }
    expect(checkRateLimit("sess-c", "read").allowed).toBe(false);
  });

  it("allows requests again after the window expires", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("sess-d", "write");
    }
    expect(checkRateLimit("sess-d", "write").allowed).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("sess-d", "write").allowed).toBe(true);
  });

  it("isolates different session keys", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("sess-e", "write");
    }
    expect(checkRateLimit("sess-e", "write").allowed).toBe(false);
    expect(checkRateLimit("sess-f", "write").allowed).toBe(true);
  });

  it("isolates read and write buckets for the same session", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("sess-g", "write");
    }
    expect(checkRateLimit("sess-g", "write").allowed).toBe(false);
    expect(checkRateLimit("sess-g", "read").allowed).toBe(true);
  });
});
