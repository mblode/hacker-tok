import { Suspense } from "react";
import { CollectionView } from "@/components/collection-view";

export const metadata = { title: "Bookmarks — HackerTok" };

export default function BookmarksPage() {
  return (
    <Suspense>
      <CollectionView
        emptyMessage="No bookmarked posts yet. Press B to bookmark a story."
        title="Bookmarks"
        type="bookmark"
      />
    </Suspense>
  );
}
