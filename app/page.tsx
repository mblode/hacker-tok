import { PostViewer } from "@/components/post-viewer";
import candidates from "@/lib/candidates.json";
import type { CandidateStory } from "@/lib/types";

export default function Home() {
  return <PostViewer initialCandidates={candidates as CandidateStory[]} />;
}
