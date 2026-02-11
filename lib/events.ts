import type { UserEvent } from "@/lib/types";

const STORAGE_KEY = "hackertok-events";
const MAX_EVENTS = 2000;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const SESSION_START = Date.now();

let cache: UserEvent[] | null = null;

const pruneEvents = (events: UserEvent[]): UserEvent[] => {
  const cutoff = Date.now() - TTL_MS;
  let pruned = events.filter((e) => e.timestamp >= cutoff);
  if (pruned.length > MAX_EVENTS) {
    pruned = pruned.slice(pruned.length - MAX_EVENTS);
  }
  return pruned;
};

export const getEvents = (): UserEvent[] => {
  if (typeof window === "undefined") {
    return [];
  }

  if (cache) {
    return cache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = [];
      return cache;
    }
    let events = JSON.parse(raw) as UserEvent[];
    const before = events.length;
    events = pruneEvents(events);
    if (events.length !== before) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
    cache = events;
    return cache;
  } catch {
    cache = [];
    return cache;
  }
};

export const getSeenPostIds = (): Set<number> => {
  return new Set(getEvents().map((e) => e.postId));
};

export const addEvent = (event: UserEvent): void => {
  let events = getEvents();
  events.push(event);
  if (events.length % 50 === 0) {
    events = pruneEvents(events);
  }
  cache = events;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};
