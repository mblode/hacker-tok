import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserEvent } from "@/lib/types";

// Simple localStorage mock
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key: (_index: number) => null as string | null,
};

vi.stubGlobal("localStorage", localStorageMock);
// Stub window so the `typeof window === "undefined"` guard in events.ts passes
vi.stubGlobal("window", {});

const makeEvent = (overrides: Partial<UserEvent> = {}): UserEvent => ({
  type: "like",
  postId: Math.floor(Math.random() * 100_000),
  timestamp: Date.now(),
  score: 100,
  ...overrides,
});

// Helper to get a fresh module (clears cache)
const freshImport = async () => {
  vi.resetModules();
  return import("@/lib/events");
};

beforeEach(() => {
  store.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("events", () => {
  describe("basic storage", () => {
    it("addEvent then getEvents returns the event", async () => {
      const { addEvent, getEvents } = await freshImport();
      const event = makeEvent({ postId: 42 });
      addEvent(event);
      const events = getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].postId).toBe(42);
    });

    it("multiple addEvents accumulate", async () => {
      const { addEvent, getEvents } = await freshImport();
      addEvent(makeEvent({ postId: 1 }));
      addEvent(makeEvent({ postId: 2 }));
      addEvent(makeEvent({ postId: 3 }));
      expect(getEvents()).toHaveLength(3);
    });

    it("getSeenPostIds returns unique postIds from all events", async () => {
      const { addEvent, getSeenPostIds } = await freshImport();
      addEvent(makeEvent({ postId: 10 }));
      addEvent(makeEvent({ postId: 20 }));
      addEvent(makeEvent({ postId: 10 }));
      const seen = getSeenPostIds();
      expect(seen).toEqual(new Set([10, 20]));
    });
  });

  describe("pruning on load", () => {
    it("removes events older than 7 days on fresh load", async () => {
      const now = Date.now();
      const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      const oldEvents: UserEvent[] = [
        makeEvent({ postId: 1, timestamp: eightDaysAgo }),
        makeEvent({ postId: 2, timestamp: eightDaysAgo }),
      ];
      const recentEvents: UserEvent[] = [
        makeEvent({ postId: 3, timestamp: oneDayAgo }),
        makeEvent({ postId: 4, timestamp: now }),
      ];

      store.set(
        "hackertok-events",
        JSON.stringify([...oldEvents, ...recentEvents])
      );

      const { getEvents } = await freshImport();
      const events = getEvents();
      expect(events).toHaveLength(2);
      expect(events.map((e) => e.postId)).toEqual([3, 4]);

      // localStorage should be updated with pruned data
      const stored = JSON.parse(store.get("hackertok-events")!);
      expect(stored).toHaveLength(2);
    });
  });

  describe("pruning on 50th add", () => {
    it("prunes old events when count hits a multiple of 50", async () => {
      const { addEvent, getEvents } = await freshImport();
      const now = Date.now();
      const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;

      // Add 49 events with recent timestamps
      for (let i = 0; i < 49; i++) {
        addEvent(makeEvent({ postId: i, timestamp: now }));
      }

      // Manually inject an old event into the array so that pruning has something to remove
      const events = getEvents();
      events[0] = makeEvent({ postId: 9999, timestamp: eightDaysAgo });
      store.set("hackertok-events", JSON.stringify(events));

      // The 50th add triggers pruning (length % 50 === 0)
      addEvent(makeEvent({ postId: 50, timestamp: now }));

      const result = getEvents();
      // The old event (postId 9999) should have been pruned
      expect(result.find((e) => e.postId === 9999)).toBeUndefined();
      // The 50th event should be present
      expect(result.find((e) => e.postId === 50)).toBeDefined();
    });
  });

  describe("cache behavior", () => {
    it("getEvents() twice returns same array reference", async () => {
      const { getEvents } = await freshImport();
      const a = getEvents();
      const b = getEvents();
      expect(a).toBe(b);
    });

    it("after addEvent, getEvents includes new event", async () => {
      const { addEvent, getEvents } = await freshImport();
      addEvent(makeEvent({ postId: 77 }));
      const events = getEvents();
      expect(events.find((e) => e.postId === 77)).toBeDefined();
    });
  });

  describe("getSeenPostIds", () => {
    it("returns unique post IDs across all events", async () => {
      const { addEvent, getSeenPostIds } = await freshImport();
      addEvent(makeEvent({ postId: 1 }));
      addEvent(makeEvent({ postId: 2 }));
      addEvent(makeEvent({ postId: 3 }));
      addEvent(makeEvent({ postId: 1 }));
      addEvent(makeEvent({ postId: 2 }));
      const seen = getSeenPostIds();
      expect(seen).toEqual(new Set([1, 2, 3]));
    });
  });
});
