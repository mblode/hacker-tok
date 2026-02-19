import type { Metadata } from "next";
import { NewsFeed } from "@/components/news-feed";
import type { FeedType } from "@/hooks/use-news-feed";

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

  return <NewsFeed type={type} />;
}
