"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hackertok_recent_searches";
const MAX_ITEMS = 10;

const listeners = new Set<() => void>();

const notifyListeners = () => {
  cachedSnapshot = readStorage();
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (callback: () => void) => {
  if (listeners.size === 0) {
    cachedSnapshot = readStorage();
  }
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

const EMPTY_ARRAY: string[] = [];

const readStorage = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : EMPTY_ARRAY;
  } catch {
    return EMPTY_ARRAY;
  }
};

let cachedSnapshot = EMPTY_ARRAY;

const getSnapshot = (): string[] => cachedSnapshot;

const getServerSnapshot = (): string[] => EMPTY_ARRAY;

export const useSearchHistory = () => {
  const searches = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const current = readStorage();
    const filtered = current.filter((s) => s !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();
  }, []);

  const removeSearch = useCallback((query: string) => {
    const current = readStorage();
    const updated = current.filter((s) => s !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  }, []);

  return { searches, addSearch, removeSearch, clearHistory };
};
