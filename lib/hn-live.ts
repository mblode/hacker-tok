import type { CandidateStory } from "@/lib/types";

const HN_API = "https://api.hackerwebapp.com";
const HTTP_URL = /^https?:\/\//;

interface HNApiStory {
  id: number;
  title: string;
  points: number;
  user: string;
  time: number;
  type: string;
  url: string;
  domain?: string;
  comments_count: number;
}

const toCandidate = (item: HNApiStory): CandidateStory => ({
  id: item.id,
  title: item.title,
  url: item.url && HTTP_URL.test(item.url) ? item.url : null,
  by: item.user,
  time: item.time,
  score: item.points ?? 0,
  descendants: item.comments_count,
});

export const fetchFeed = async (
  type: string,
  page: number
): Promise<CandidateStory[]> => {
  const res = await fetch(`${HN_API}/${type}?page=${page}`);
  if (!res.ok) {
    return [];
  }
  const items: HNApiStory[] = await res.json();
  return items.map(toCandidate);
};

export const deduplicateStories = (
  stories: CandidateStory[]
): CandidateStory[] => {
  const seen = new Set<number>();
  return stories.filter((s) => {
    if (seen.has(s.id)) {
      return false;
    }
    seen.add(s.id);
    return true;
  });
};
