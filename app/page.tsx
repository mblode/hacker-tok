import { PostViewer } from "@/components/post-viewer";
import { deduplicateStories, fetchFeed } from "@/lib/hn-live";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [news, best] = await Promise.all([
    fetchFeed("news", 1),
    fetchFeed("best", 1),
  ]);

  const initial = deduplicateStories([...news, ...best]);

  return <PostViewer initialCandidates={initial} />;
}
