export default function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-4">
        {Icon && <Icon className="w-7 h-7 text-[var(--color-text-tertiary)]" />}
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">{title}</p>
      {desc && <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{desc}</p>}
      {action}
    </div>
  )
}
