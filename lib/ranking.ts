import type { CandidateStory, UserEvent } from "@/lib/types";

export const rankCandidates = (
  candidates: CandidateStory[],
  events: UserEvent[]
): CandidateStory[] => {
  const likes = events.filter((e) => e.type === "like");

  if (likes.length === 0) {
    return candidates.toSorted((a, b) => b.score - a.score);
  }

  const avgLikedScore =
    likes.reduce((sum, e) => sum + e.score, 0) / likes.length;

  const likedPostIds = new Set(likes.map((e) => e.postId));
  const likedAuthors = new Set(
    candidates.filter((c) => likedPostIds.has(c.id)).map((c) => c.by)
  );

  const computeWeight = (story: CandidateStory): number => {
    let weight = story.score;

    const lowerBound = avgLikedScore * 0.5;
    const upperBound = avgLikedScore * 1.5;
    if (story.score >= lowerBound && story.score <= upperBound) {
      weight += story.score * 0.3;
    }

    if (likedAuthors.has(story.by)) {
      weight += story.score * 0.5;
    }

    return weight;
  };

  return candidates.toSorted((a, b) => computeWeight(b) - computeWeight(a));
};
