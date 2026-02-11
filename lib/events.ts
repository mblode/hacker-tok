import { db } from "@/lib/db";
import type { EventType, UserEvent } from "@/lib/types";

export const SESSION_START = Date.now();

export const getEvents = (): Promise<UserEvent[]> => {
  if (typeof window === "undefined") {
    return Promise.resolve([]);
  }
  return db.events.toArray();
};

export const addEvent = async (event: Omit<UserEvent, "id">): Promise<void> => {
  await db.events.add(event as UserEvent);
};

export const getSeenPostIds = async (): Promise<Set<number>> => {
  if (typeof window === "undefined") {
    return new Set();
  }
  const postIds = await db.events.orderBy("postId").uniqueKeys();
  return new Set(postIds as number[]);
};

export const removeEventsByTypeAndPost = async (
  type: EventType,
  postId: number
): Promise<void> => {
  await db.events.where("[type+postId]").equals([type, postId]).delete();
};

export const removeEventsByTypeAndComment = async (
  type: EventType,
  commentId: number
): Promise<void> => {
  await db.events.where("[type+commentId]").equals([type, commentId]).delete();
};
