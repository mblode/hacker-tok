import { extractDomain } from "@/lib/ranking";
import type { CandidateStory } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { Dot } from "./dot";

interface StoryListItemProps {
  story: CandidateStory;
  onSelect: () => void;
  children?: React.ReactNode;
}

export const StoryListItem = ({
  story,
  onSelect,
  children,
}: StoryListItemProps) => {
  const domain = extractDomain(story.url) ?? null;
  const timeAgo = relativeTime(story.time);

  return (
    <div className="mx-4 flex items-start gap-3 border-border border-b py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1 text-muted-foreground text-xs">
          {domain && (
            <>
              <a
                className="transition-colors hover:text-foreground hover:underline"
                href={story.url ?? undefined}
                onClick={(e) => e.stopPropagation()}
                rel="noopener noreferrer"
                target="_blank"
              >
                {domain}
              </a>
              <Dot />
            </>
          )}
          {story.by && (
            <>
              <a
                className="username transition-colors hover:text-foreground hover:underline"
                href={`https://news.ycombinator.com/user?id=${story.by}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {story.by}
              </a>
              <Dot />
            </>
          )}
          <span>{timeAgo}</span>
        </div>
        <button
          className="cursor-pointer text-left hover:underline"
          onClick={onSelect}
          type="button"
        >
          {story.title}
        </button>
        <button
          className="flex cursor-pointer items-center gap-x-3 pt-1 text-muted-foreground text-xs transition-colors hover:text-foreground hover:underline"
          onClick={onSelect}
          type="button"
        >
          {story.score > 0 && (
            <span>{story.score.toLocaleString()} points</span>
          )}
          {story.descendants > 0 && (
            <span>{story.descendants.toLocaleString()} comments</span>
          )}
        </button>
      </div>
      {children}
    </div>
  );
};
