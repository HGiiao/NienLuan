export default function PageHeader({ icon: Icon, title, desc, lastUpdated, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">{title}</h1>
          {desc && <p className="text-sm text-[var(--color-text-secondary)]">{desc}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {lastUpdated && (
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
            </span>
            {lastUpdated.toLocaleTimeString('vi-VN', { hour12: false })}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}
