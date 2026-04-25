import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-surface/80", className)} />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl border border-border bg-surface/40 p-5", className)}>
      <div className="h-4 w-1/3 rounded bg-surface" />
      <div className="mt-3 h-8 w-2/3 rounded bg-surface" />
      <div className="mt-2 h-3 w-1/2 rounded bg-surface" />
    </div>
  );
}

export function SkeletonContentCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
      <div className="aspect-video w-full animate-pulse bg-surface" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
      </div>
    </div>
  );
}
