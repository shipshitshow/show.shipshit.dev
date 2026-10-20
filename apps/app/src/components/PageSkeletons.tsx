function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-surface-border bg-surface-card ${className}`}
    />
  );
}

export function AnalyticsContentSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}

/**
 * Shared by the episode rollup's Suspense fallback and its in-card refetch
 * state, so both spell the same table shape: one wide episode column followed by
 * the eight surface metrics.
 */
export function EpisodeRollupTableSkeleton() {
  return (
    <div className="divide-y divide-surface-border/50">
      {Array.from({ length: 6 }, (_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-4">
          <SkeletonBlock className="h-3 max-w-xs flex-1 rounded-md border-none bg-surface-elevated" />
          {Array.from({ length: 8 }, (_, cellIndex) => (
            <SkeletonBlock
              key={cellIndex}
              className="h-3 w-10 rounded-md border-none bg-surface-elevated"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EpisodeRollupContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-48 rounded-md border-none bg-surface-elevated" />
          <SkeletonBlock className="h-3 w-64 rounded-md border-none bg-surface-elevated" />
        </div>
        <SkeletonBlock className="h-9 w-10" />
      </div>
      <div className="rounded-xl border border-surface-border bg-surface-card">
        <EpisodeRollupTableSkeleton />
      </div>
    </div>
  );
}

export function LivestreamTopicContentSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1400px] gap-8 px-6 py-8">
      <main className="min-w-0 flex-1">
        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface/30">
          <div className="flex gap-2 border-b border-surface-border px-4 py-3">
            <SkeletonBlock className="h-8 w-28 rounded-md" />
            <SkeletonBlock className="h-8 w-24 rounded-md" />
          </div>
          <div className="space-y-4 p-5">
            <SkeletonBlock className="h-4 w-48 rounded-md" />
            <SkeletonBlock className="h-7 w-3/4 rounded-lg" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-4 w-32 rounded-md" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-4 w-40 rounded-md" />
            <SkeletonBlock className="h-20" />
          </div>
        </div>
      </main>
      <aside className="hidden w-[380px] shrink-0 lg:block">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
            <SkeletonBlock className="aspect-video w-full rounded-none border-none" />
            <div className="space-y-3 p-4">
              <SkeletonBlock className="h-5 w-3/4 rounded-md" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-5 w-14 rounded-full" />
                <SkeletonBlock className="h-5 w-24 rounded-md" />
              </div>
              <SkeletonBlock className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function YouTubeAuthContentSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <SkeletonBlock className="h-[420px] rounded-2xl" />
    </main>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <AnalyticsContentSkeleton />
    </main>
  );
}

export function YouTubeAuthPageSkeleton() {
  return <YouTubeAuthContentSkeleton />;
}
