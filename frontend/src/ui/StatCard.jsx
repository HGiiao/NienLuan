export default function StatCard({ icon: Icon, label, value, sub, color = 'primary', className = '' }) {
  const dotColors = { primary: 'bg-primary-400', accent: 'bg-primary-400', emerald: 'bg-primary-400', amber: 'bg-primary-400', violet: 'bg-primary-400' }
  return (
    <div className={`bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${dotColors[color] || dotColors.primary}`}>
          {Icon && <Icon className="w-4 h-4 text-white" />}
        </div>
      </div>
      <p className="text-[11px] font-medium text-[var(--color-text-tertiary)] mb-0.5">{label}</p>
      <p className="text-lg font-bold text-[var(--color-text-primary)]">{value}</p>
      {sub && <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{sub}</p>}
    </div>
  )
}
