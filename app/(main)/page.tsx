import type { Metadata } from "next";
import { NewsFeed } from "@/components/news-feed";
import type { FeedType } from "@/hooks/use-news-feed";
import { deduplicateStories, fetchFeed } from "@/lib/hn-live";
import type { CandidateStory } from "@/lib/types";

export const metadata: Metadata = {
  title: "News",
  description: "Browse the latest Hacker News stories.",
};

interface HomePageProps {
  searchParams: Promise<{ type?: string }>;
}

const VALID_TYPES = new Set<string>(["news", "newest", "show", "ask", "jobs"]);

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const type: FeedType = VALID_TYPES.has(params.type ?? "")
    ? (params.type as FeedType)
    : "news";
  let initialStories: CandidateStory[] = [];

  try {
    initialStories = deduplicateStories(await fetchFeed(type, 1));
  } catch {
    initialStories = [];
  }

  return <NewsFeed initialStories={initialStories} type={type} />;
}
