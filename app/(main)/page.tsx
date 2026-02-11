import { PostViewer } from "@/components/post-viewer";
import { fetchFeed } from "@/lib/hn-live";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await fetchFeed("news", 1);

  return <PostViewer initialCandidates={initial} originPath="/" />;
}
