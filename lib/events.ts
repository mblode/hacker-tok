import type { UserEvent } from "@/lib/types";

const STORAGE_KEY = "hackertok-events";

let cache: UserEvent[] | null = null;

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
    cache = JSON.parse(raw) as UserEvent[];
    return cache;
  } catch {
    cache = [];
    return cache;
  }
};

export const addEvent = (event: UserEvent): void => {
  const events = getEvents();
  events.push(event);
  cache = events;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};
