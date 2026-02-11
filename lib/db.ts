import Dexie from "dexie";
import type { UserEvent } from "@/lib/types";

const db = new Dexie("hackertok") as Dexie & {
  events: Dexie.Table<UserEvent, number>;
};

db.version(1).stores({
  events: "++id, type, postId, timestamp, [type+postId]",
});

db.version(2).stores({
  events:
    "++id, type, postId, commentId, timestamp, [type+postId], [type+commentId]",
});

export const READ_TIMEOUT = 3000;
export const WRITE_TIMEOUT = 5000;

/** Race a promise against a timeout. Resolves with the fallback on timeout or error. */
export function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = READ_TIMEOUT
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.catch(() => fallback).finally(() => clearTimeout(timer)),
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

/** Race a void promise against a timeout. Silently resolves on timeout or error. */
export function withWriteTimeout(
  promise: Promise<unknown>,
  ms = WRITE_TIMEOUT
): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => clearTimeout(timer)),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
}

let _dbAvailable: boolean | null = null;

/** Check if IndexedDB is responsive. Result is cached for the page lifetime. */
export async function isDbAvailable(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  if (_dbAvailable !== null) {
    return _dbAvailable;
  }

  try {
    _dbAvailable = await withTimeout(
      db.events.count().then(() => true),
      false,
      2000
    );
  } catch {
    _dbAvailable = false;
  }
  return _dbAvailable ?? false;
}

// Components should use functions from lib/events.ts, not db directly.
export { db as _db };
