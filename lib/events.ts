import { _db, isDbAvailable, withTimeout, withWriteTimeout } from "@/lib/db";
import type { EventType, UserEvent } from "@/lib/types";

export const SESSION_START = Date.now();

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
