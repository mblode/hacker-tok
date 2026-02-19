import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/feed-skeleton";
import { PostViewer } from "@/components/post-viewer";
import { fetchFeed } from "@/lib/hn-live";

export const metadata: Metadata = {
  title: "For you",
  description: "Stories ranked by your reading habits.",
};

export const revalidate = 60;

export default function ForYouPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Feed />
    </Suspense>
  );
}

async function Feed() {
  const initial = await fetchFeed("news", 1);
  return <PostViewer initialCandidates={initial} originPath="/for-you" />;
}
