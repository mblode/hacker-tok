import { Suspense } from "react";
import { FeedSkeleton } from "@/components/feed-skeleton";
import { PostViewer } from "@/components/post-viewer";
import { fetchFeed } from "@/lib/hn-live";

export const revalidate = 60;

export default function Home() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Feed />
    </Suspense>
  );
}

async function Feed() {
  const initial = await fetchFeed("news", 1);
  return <PostViewer initialCandidates={initial} originPath="/" />;
}
