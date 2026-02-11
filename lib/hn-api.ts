import type { HNItem } from "@/lib/types";

const HN_API_BASE = "https://api.hackerwebapp.com";

export const fetchItem = async (id: number): Promise<HNItem | null> => {
  const response = await fetch(`${HN_API_BASE}/item/${id}`);
  if (!response.ok) {
    return null;
  }
  return response.json();
};
