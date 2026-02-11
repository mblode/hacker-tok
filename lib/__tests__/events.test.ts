import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  addEvent,
  getEvents,
  getSeenPostIds,
  removeEventsByTypeAndComment,
  removeEventsByTypeAndPost,
} from "@/lib/events";
import type { UserEvent } from "@/lib/types";

vi.stubGlobal("window", {});

const makeEvent = (
  overrides: Partial<UserEvent> = {}
): Omit<UserEvent, "id"> => ({
  type: "like",
  postId: Math.floor(Math.random() * 100_000),
  timestamp: Date.now(),
  score: 100,
  ...overrides,
});

beforeEach(async () => {
  await db.events.clear();
});

describe("events (Dexie)", () => {
  describe("basic storage", () => {
    it("addEvent then getEvents returns the event", async () => {
      await addEvent(makeEvent({ postId: 42 }));
      const events = await getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].postId).toBe(42);
    });

    it("multiple addEvents accumulate", async () => {
      await addEvent(makeEvent({ postId: 1 }));
      await addEvent(makeEvent({ postId: 2 }));
      await addEvent(makeEvent({ postId: 3 }));
      const events = await getEvents();
      expect(events).toHaveLength(3);
    });

    it("events persist without limit", async () => {
      for (let i = 0; i < 100; i++) {
        await addEvent(makeEvent({ postId: i }));
      }
      const events = await getEvents();
      expect(events).toHaveLength(100);
    });
  });

  describe("getSeenPostIds", () => {
    it("returns unique postIds from all events", async () => {
      await addEvent(makeEvent({ postId: 10 }));
      await addEvent(makeEvent({ postId: 20 }));
      await addEvent(makeEvent({ postId: 10, type: "click" }));
      const seen = await getSeenPostIds();
      expect(seen).toEqual(new Set([10, 20]));
    });
  });

  describe("removeEventsByTypeAndPost", () => {
    it("removes only matching type+postId events", async () => {
      await addEvent(makeEvent({ postId: 1, type: "like" }));
      await addEvent(makeEvent({ postId: 1, type: "click" }));
      await addEvent(makeEvent({ postId: 2, type: "like" }));
      await removeEventsByTypeAndPost("like", 1);
      const events = await getEvents();
      expect(events).toHaveLength(2);
      expect(
        events.find((e) => e.type === "like" && e.postId === 1)
      ).toBeUndefined();
      expect(
        events.find((e) => e.type === "click" && e.postId === 1)
      ).toBeDefined();
      expect(
        events.find((e) => e.type === "like" && e.postId === 2)
      ).toBeDefined();
    });
  });

  describe("bookmark toggle", () => {
    it("add then remove bookmark", async () => {
      await addEvent(makeEvent({ postId: 99, type: "bookmark" }));
      let events = await getEvents();
      expect(events.filter((e) => e.type === "bookmark")).toHaveLength(1);

      await removeEventsByTypeAndPost("bookmark", 99);
      events = await getEvents();
      expect(events.filter((e) => e.type === "bookmark")).toHaveLength(0);
    });
  });

  describe("comment bookmark toggle", () => {
    it("add then remove comment bookmark", async () => {
      await addEvent(
        makeEvent({
          postId: 50,
          type: "comment_bookmark",
          commentId: 123,
          commentUser: "alice",
          commentContent: "Great comment",
          commentTime: 1_700_000_000,
        })
      );
      let events = await getEvents();
      expect(events.filter((e) => e.type === "comment_bookmark")).toHaveLength(
        1
      );

      await removeEventsByTypeAndComment("comment_bookmark", 123);
      events = await getEvents();
      expect(events.filter((e) => e.type === "comment_bookmark")).toHaveLength(
        0
      );
    });
  });
});
