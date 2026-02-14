import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostViewer } from "@/components/post-viewer";
import { fetchItem } from "@/lib/hn-api";
import { fetchFeed } from "@/lib/hn-live";
import type { CandidateStory } from "@/lib/types";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

const HTTP_URL = /^https?:\/\//;

const toCandidateStory = (item: {
  id: number;
  title: string;
  url: string;
  user: string;
  time: number;
  points: number;
  comments_count: number;
}): CandidateStory => ({
  id: item.id,
  title: item.title,
  url: item.url && HTTP_URL.test(item.url) ? item.url : null,
  by: item.user,
  time: item.time,
  score: item.points ?? 0,
  descendants: item.comments_count,
});

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const numId = Number.parseInt(id, 10);
  if (Number.isNaN(numId)) {
    return {};
  }
  const item = await fetchItem(numId);
  if (!item) {
    return {};
  }
  return {
    title: item.title,
    openGraph: {
      title: item.title,
      url: `/post/${id}`,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const numId = Number.parseInt(id, 10);
  if (Number.isNaN(numId)) {
    notFound();
  }

  const [item, feedStories] = await Promise.all([
    fetchItem(numId),
    fetchFeed("news", 1),
  ]);
  if (!item) {
    notFound();
  }

  const candidate = toCandidateStory(item);
  const rest = feedStories.filter((s) => s.id !== numId);
  return (
    <PostViewer
      initialCandidates={[candidate, ...rest]}
      originPath="/"
      pinnedId={numId}
    />
  );
}
