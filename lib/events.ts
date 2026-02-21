import { _db, isDbAvailable, withTimeout, withWriteTimeout } from "@/lib/db";
import type { EventType, UserEvent } from "@/lib/types";

export const SESSION_START = Date.now();
export const EVENTS_CHANGED_EVENT = "hackertok:events-changed";

const notifyEventsChanged = () => {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(new Event(EVENTS_CHANGED_EVENT));
};

export const getEvents = (): Promise<UserEvent[]> => {
  if (typeof window === "undefined") {
    return Promise.resolve([]);
  }
  return withTimeout(_db.events.toArray(), []);
};

export const addEvent = async (event: Omit<UserEvent, "id">): Promise<void> => {
  if (!(await isDbAvailable())) {
    return;
  }
  await withWriteTimeout(_db.events.add(event as UserEvent));
  notifyEventsChanged();
};

export const getSeenPostIds = (): Promise<Set<number>> => {
  if (typeof window === "undefined") {
    return Promise.resolve(new Set());
  }
  return withTimeout(
    _db.events
      .orderBy("postId")
      .uniqueKeys()
      .then((ids) => new Set(ids as number[])),
    new Set<number>()
  );
};

export const removeEventsByTypeAndPost = async (
  type: EventType,
  postId: number
): Promise<void> => {
  if (!(await isDbAvailable())) {
    return;
  }
  await withWriteTimeout(
    _db.events.where("[type+postId]").equals([type, postId]).delete()
  );
  notifyEventsChanged();
};

export const removeEventsByTypeAndComment = async (
  type: EventType,
  commentId: number
): Promise<void> => {
  if (!(await isDbAvailable())) {
    return;
  }
  await withWriteTimeout(
    _db.events.where("[type+commentId]").equals([type, commentId]).delete()
  );
  notifyEventsChanged();
};

/** Get events of a specific type, sorted by timestamp descending. */
export const getEventsByType = (type: EventType): Promise<UserEvent[]> => {
  if (typeof window === "undefined") {
    return Promise.resolve([]);
  }
  return withTimeout(
    _db.events.where("type").equals(type).reverse().sortBy("timestamp"),
    []
  );
};

/** Get unique post IDs for a given post-level event type. */
export const getPostEventIdsByType = (
  type: "like" | "bookmark"
): Promise<Set<number>> => {
  if (typeof window === "undefined") {
    return Promise.resolve(new Set());
  }
  return withTimeout(
    _db.events
      .where("type")
      .equals(type)
      .toArray()
      .then((events) => {
        const ids = new Set<number>();
        for (const event of events) {
          ids.add(event.postId);
        }
        return ids;
      }),
    new Set<number>()
  );
};

/** Check if at least one event exists for a given type + postId. */
export const hasEventForPost = (
  type: EventType,
  postId: number
): Promise<boolean> => {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  return withTimeout(
    _db.events
      .where("[type+postId]")
      .equals([type, postId])
      .count()
      .then((count) => count > 0),
    false
  );
};

/** Check if at least one event exists for a given type + commentId. */
export const hasEventForComment = (
  type: EventType,
  commentId: number
): Promise<boolean> => {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  return withTimeout(
    _db.events
      .where("[type+commentId]")
      .equals([type, commentId])
      .count()
      .then((count) => count > 0),
    false
  );
};
