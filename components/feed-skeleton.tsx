import { Skeleton } from "@/components/ui/skeleton";

export const FeedSkeleton = () => (
  <>
    <header className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-5 w-12" />
      </div>
    </header>
    <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-scroll">
      <div className="mx-auto max-w-[80ch] px-4 pt-4 pb-24 md:pb-6">
        <div className="mb-6 block border-border border-b pb-4">
          <div className="flex items-center gap-2 pb-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="mb-2 h-7 w-full" />
          <Skeleton className="h-7 w-3/4" />
        </div>
        <ul className="m-0 p-0">
          {["a", "b", "c", "d"].map((id) => (
            <li className="comment-wrap" key={id}>
              <div className="comment">
                <div className="comment-toggle">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                </div>
                <div className="content">
                  <Skeleton className="mb-2 h-6 w-full" />
                  <Skeleton className="h-6 w-5/6" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  </>
);
