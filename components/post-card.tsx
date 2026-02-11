"use client";

import { CommentThread } from "@/components/comment-thread";
import { Dot } from "@/components/dot";
import type { CandidateStory } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

interface PostCardProps {
  story: CandidateStory;
  onLinkClick?: () => void;
  hasNextPost?: boolean;
  onNextPost?: () => void;
}

const WWW_PREFIX = /^www\./;

const extractDomain = (url: string | null): string | null => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).hostname.replace(WWW_PREFIX, "");
  } catch {
    return null;
  }
};

export const PostCard = ({
  story,
  onLinkClick,
  hasNextPost = false,
  onNextPost,
}: PostCardProps) => {
  const domain = extractDomain(story.url);

  return (
    <article>
      <div className="mb-6 block border-border border-b pb-4">
        <div className="block w-full pb-2 text-sm">
          <a
            className="username"
            href={`https://news.ycombinator.com/user?id=${story.by}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {story.by}
          </a>
          <Dot />
          <span className="inline-block text-muted-foreground text-sm">
            {relativeTime(story.time)}
          </span>
          <Dot />
          <span className="inline-block text-muted-foreground text-sm">
            {story.descendants.toLocaleString()} comment
            {story.descendants !== 1 ? "s" : ""}
          </span>
        </div>
        <h2 className="block pb-2 text-foreground text-xl leading-[1.2]">
          {story.url ? (
            <>
              <a
                className="post-link mr-1 break-words pr-1 hover:underline"
                href={story.url}
                onClick={onLinkClick}
                rel="noopener noreferrer"
                target="_blank"
              >
                {story.title}
              </a>
              {domain && (
                <a
                  className="list-url align-middle text-muted-foreground text-sm hover:text-foreground hover:underline"
                  href={story.url}
                  onClick={onLinkClick}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {domain}
                </a>
              )}
            </>
          ) : (
            story.title
          )}
        </h2>
      </div>

      <div>
        <CommentThread
          hasNextPost={hasNextPost}
          onNextPost={onNextPost}
          postId={story.id}
          postTitle={story.title}
          postUser={story.by}
        />
      </div>
    </article>
  );
};
