export function PostCardSkeleton({ showImage = false }: { showImage?: boolean }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border animate-pulse">
      {/* Author row */}
      <div className="flex gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-muted/40 shrink-0" />
        <div className="flex-1 pt-0.5 space-y-1.5">
          <div className="h-3.5 bg-muted/50 rounded w-28" />
          <div className="h-3 bg-muted/30 rounded w-20" />
        </div>
      </div>
      {/* Content lines */}
      <div className="space-y-2 mb-3">
        <div className="h-3.5 bg-muted/35 rounded w-full" />
        <div className="h-3.5 bg-muted/35 rounded w-5/6" />
        <div className="h-3.5 bg-muted/35 rounded w-3/4" />
      </div>
      {/* Optional image zone */}
      {showImage && <div className="h-44 bg-muted/20 rounded-xl mb-3" />}
      {/* Action bar */}
      <div className="flex gap-4 pt-1">
        <div className="h-3 bg-muted/25 rounded w-10" />
        <div className="h-3 bg-muted/25 rounded w-10" />
        <div className="h-3 bg-muted/25 rounded w-10" />
      </div>
    </div>
  );
}
