export function SkeletonCard() {
  return <div className="h-[120px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
}

export function SkeletonList({ count = 3 }) {
  return <div className="space-y-3">{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}</div>
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

export function SkeletonChart() {
  return <div className="h-[300px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
}
